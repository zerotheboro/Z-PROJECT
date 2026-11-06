import { trainingLabContentSets, trainingMatchContentSets } from "../trainingContent";
import type { TrainingMethodId } from "../type";
import type { TrainingDraft } from "../trainingProgress";
import type { ObservationMetadata } from "../learningEvidence";
import { economicsMetadata, isEconomicsContentId } from "./selection";
import { getTrainingContentSet } from "./adapter";
import type { EconomicsTemplate } from "./adapter";

export function economicsObservationMetadata(draft: TrainingDraft, methodId: TrainingMethodId, phase: "lab" | "match", id: string | undefined): ObservationMetadata | null {
  if (!id || !isEconomicsContentId(id)) return null;
  const context = economicsMetadata(id)!;
  const sets = phase === "lab" ? trainingLabContentSets[methodId] : trainingMatchContentSets[methodId];
  const data = getTrainingContentSet<EconomicsTemplate>(sets, id).data;
  if (!data) throw new Error("Economics observation has an unknown content assignment.");
  // Interleaving/Leitner have unscored practice exposure. The current evidence
  // contract can describe scored questions only. Preserve unknown question
  // exposure for these methods instead of falsely asserting a fresh final test
  // in a history that cannot represent the earlier practice separately.
  const questions = data.test?.length ? data.test : data.questions ?? [];
  const scope = draft.internalState[`${phase}:${methodId}:${id}`];
  const orders = scope?.named["answer-option-orders"];
  return { methodId, phase, context,
    protocol: {
      assessmentVersion: `${context.contentVersion}:${phase}:${methodId}${data.runtime ? ":mapped-1" : ""}`,
      // No retrospective version is invented for the existing scoring engine.
      scoringVersion: null,
      questions: data.practice?.length ? null : questions.map(q => {
        const order = orders && typeof orders === "object" && !Array.isArray(orders)
          ? (orders as Record<string, unknown>)[q.id] : null;
        const known = Array.isArray(order) && order.length === 4 && new Set(order).size === 4 && q.options.every(o => order.includes(o));
        return { questionId: q.id, difficulty: null,
          offeredOptionCount: known ? 4 : null,
          offeredOptionIds: known ? q.options.map((_, i) => `${q.id}:option-${i}`) : null };
      })
    }
  };
}

