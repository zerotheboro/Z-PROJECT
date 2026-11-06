import type { TrainingDraft } from "../trainingProgress";
import { BASELINE_ANSWER_SLOTS, trainingAnswerBindings } from "../trainingDraftValidation";
import { readEconomicsActivityVersion, readEconomicsSelection } from "./selection";
import { resolveEconomicsAssessment } from "./assessmentEvidence";
import type { EconomicsResponses, EconomicsResponse } from "./assessmentEvidence";

/** Read only answers already captured by the existing activity. Neither an
 * allocated form nor a rendered note creates an assessed-objective claim. */
export function collectEconomicsResponses(draft: TrainingDraft): EconomicsResponses | undefined {
  if (!readEconomicsActivityVersion(draft.internalState)) return undefined;
  const pack = readEconomicsSelection(draft.internalState)!;
  const activities: EconomicsResponses["activities"] = [];
  const collect = (id: string | null, scopeName: string, bindings: readonly { answerSlot: number; role: EconomicsResponse["role"] }[]) => {
    if (!id) throw new Error("The completed Economics form identity is missing; the draft was kept.");
    const form = resolveEconomicsAssessment(id), scope = draft.internalState[scopeName];
    const orders = scope?.named["answer-option-orders"];
    const responses: EconomicsResponse[] = [];
    for (const binding of bindings) {
      const saved = scope?.slots[binding.answerSlot];
      if (saved === undefined) continue;
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Invalid saved assessment answers.");
      const pool = binding.role === "scored" ? form.scored : form.practice;
      for (const [id, answer] of Object.entries(saved)) {
        const q = pool.find(q => q.id === id);
        if (!q || typeof answer !== "string" || !q.options.includes(answer)) throw new Error("Saved Economics answer identity is invalid.");
        const order = orders && typeof orders === "object" && !Array.isArray(orders) ? (orders as Record<string, unknown>)[id] : null;
        const known = Array.isArray(order) && order.length === 4 && new Set(order).size === 4 && q.options.every(option => order.includes(option));
        responses.push({ questionId: id, answerOptionId: `${id}:option-${q.options.indexOf(answer)}`,
          offeredOptionIds: known ? order.map(option => `${id}:option-${q.options.indexOf(option)}`) : null, role: binding.role });
      }
    }
    activities.push({ contentSetId: id, responses });
  };
  if (draft.mode === "auto") {
    collect(draft.baselineContentSetIds.memory, "baseline", [{ answerSlot: BASELINE_ANSWER_SLOTS.memory, role: "scored" }]);
    collect(draft.baselineContentSetIds.understanding, "baseline", [{ answerSlot: BASELINE_ANSWER_SLOTS.understanding, role: "scored" }]);
  }
  draft.selectedMethods.forEach((method, i) => collect(draft.labContentSetIds[i], `lab:${method}:${draft.labContentSetIds[i]}`, trainingAnswerBindings(method, "lab")));
  for (const result of draft.completed.methodMatch?.methods ?? []) {
    const i = draft.verificationMethodOrder.findIndex(method => method === result.method), id = draft.matchContentSetIds[i];
    const method = draft.verificationMethodOrder[i];
    if (!method) throw new Error("Unknown completed verification identity.");
    collect(id, `match:${method}:${id}`, trainingAnswerBindings(method, "match"));
  }
  return { schemaVersion: 1, activityVersion: "mapped-1", topicId: pack.topicId, sessionStartedAt: draft.createdAt, activities };
}
