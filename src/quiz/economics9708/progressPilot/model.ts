import { scoreMultipleChoice } from "../../engines/shared/scoring";
import { buildEconomicsObjectiveHistory } from "../objectiveHistory";
import type { StrategyEvidenceSnapshot } from "../../../services/cumulativeProfileReader";
import { isPilotFormUsable } from "./forms";
import type { PilotForm } from "./forms";
import type { TrainingDraft } from "../../trainingProgress";
import { collectEconomicsResponses } from "../collectAssessmentResponses";
import { resolveEconomicsAssessment } from "../assessmentEvidence";

export type ExposureState = "known-repeat" | "possible-repeat" | "no-repeat-in-available-records" | "unknown";
export type PilotHistory = { knownQuestions: ReadonlySet<string>; readable: boolean; previousTopicPractice: boolean | null };
export type PilotCheckResult = Readonly<{
  formId: string; formVersion: string; phase: "initial" | "subsequent";
  reviewStatus: PilotForm["status"]; correct: number; total: number; recordedAt: string;
  timing: "before-this-session-instruction-by-ui-placement" | "after-training-completion";
  authority: "unaccepted-browser-report"; persistence: "memory-only";
  measurementClaims: typeof PILOT_CLAIMS;
  answers: readonly Readonly<{ questionId: string; sourceQuestionId: string | null; answer: string; correct: boolean; exposure: ExposureState }>[];
}>;
export const PILOT_CLAIMS = Object.freeze({ learningGain: "unavailable", retention: "unavailable", methodEffect: "not-established" } as const);

/** Uses only the existing validated owner-scoped handoff. No draft/browser report
 * is promoted into accepted history, and absence is never proof of no exposure. */
export function pilotHistory(uid: string, topic: string, source?: StrategyEvidenceSnapshot): PilotHistory {
  const unknown = { knownQuestions: new Set<string>(), readable: false, previousTopicPractice: null };
  if (!source || source.ownerUid !== uid) return unknown;
  try {
    const history = buildEconomicsObjectiveHistory(uid, source.rows);
    const knownQuestions = new Set(history.activities.flatMap(a => a.answers.map(q => q.questionId)));
    return { knownQuestions, readable: true,
      previousTopicPractice: history.activities.some(a => a.contentSetId.startsWith(`ec9708-${topic.replace(".", "_")}-`)) };
  } catch { return unknown; }
}
export function formExposure(form: PilotForm, history: PilotHistory, currentAnswered: ReadonlySet<string> = new Set(),
  preparedForDisplay: ReadonlySet<string> = new Set(), currentAnswersComplete = true) {
  return Object.fromEntries(form.items.map(item => {
    const key = item.sourceQuestionId ?? item.question.id;
    return [item.question.id, history.knownQuestions.has(key) || currentAnswered.has(key) ? "known-repeat" as const :
      preparedForDisplay.has(key) ? "possible-repeat" as const :
      history.readable && currentAnswersComplete ? "no-repeat-in-available-records" as const : "unknown" as const];
  }));
}
/** A cached canonical option order is only a browser render-preparation trace.
 * It may come from an interrupted render. Never turn it into an answer, scored
 * assessment, accepted source or proof of attention. Allocations alone add none. */
export function currentPilotExposure(draft: TrainingDraft) {
  const answered = new Set<string>(), preparedForDisplay = new Set<string>();
  let answersComplete = false;
  const assignments: { id: string | null | undefined; scope: string }[] = [
    ...(draft.mode === "auto" ? [{ id: draft.baselineContentSetIds.memory, scope: "baseline" },
      { id: draft.baselineContentSetIds.understanding, scope: "baseline" }] : []),
    ...draft.selectedMethods.map((method, i) => ({ id: draft.labContentSetIds[i], scope: `lab:${method}:${draft.labContentSetIds[i]}` })),
    ...draft.verificationMethodOrder.map((method, i) => ({ id: draft.matchContentSetIds[i], scope: `match:${method}:${draft.matchContentSetIds[i]}` }))
  ];
  try {
    const report = collectEconomicsResponses(draft);
    for (const a of report?.activities ?? []) for (const answer of a.responses) answered.add(answer.questionId);
    answersComplete = Boolean(report && assignments.length > 0 && report.activities.length === assignments.length && assignments.every(({ id }) => {
      if (!id) return false;
      const a = report.activities.find(a => a.contentSetId === id), form = resolveEconomicsAssessment(id);
      return a && [...form.scored, ...form.practice].every(q => a.responses.some(r => r.questionId === q.id));
    }));
  } catch { /* Partial or corrupt answer slots cannot establish absence of exposure. */ }
  for (const { id, scope } of assignments) {
    if (!id) continue;
    try {
      const form = resolveEconomicsAssessment(id), orders = draft.internalState[scope]?.named["answer-option-orders"];
      if (!orders || typeof orders !== "object" || Array.isArray(orders)) continue;
      for (const q of [...form.scored, ...form.practice]) {
        if (!Object.hasOwn(orders, q.id)) continue;
        const order = (orders as Record<string, unknown>)[q.id];
        if (Array.isArray(order) && order.length === 4 && new Set(order).size === 4 && q.options.every(o => order.includes(o))) preparedForDisplay.add(q.id);
      }
    } catch { /* Unallocated identities and malformed traces add no exposure claim. */ }
  }
  return { answered, preparedForDisplay, answersComplete };
}
/** Existing correctness calculation, zero inputs to Training scoring/aggregation.
 * Even a future reviewed flag cannot grant accepted provenance or equivalence. */
export function recordPilotCheck(form: PilotForm, answers: Readonly<Record<string, string>>, exposure: Readonly<Record<string, ExposureState>>,
  recordedAt: string, instructionAlreadyOpened: boolean): PilotCheckResult {
  if (!isPilotFormUsable(form) || form.name === "C" || form.name === "A" && instructionAlreadyOpened || form.name === "B" && !instructionAlreadyOpened ||
    typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt)) || new Date(recordedAt).toISOString() !== recordedAt ||
    Object.keys(answers).length !== form.items.length || form.items.some(i => !i.question.options.includes(answers[i.question.id]) ||
      !["known-repeat", "possible-repeat", "no-repeat-in-available-records", "unknown"].includes(exposure[i.question.id]))) throw new Error("This prototype check is incomplete or unavailable.");
  const questions = form.items.map(i => i.question), { correct, total } = scoreMultipleChoice(questions, answers);
  return Object.freeze({ formId: form.id, formVersion: form.version, phase: form.name === "A" ? "initial" : "subsequent",
    reviewStatus: form.status, correct, total, recordedAt,
    timing: form.name === "A" ? "before-this-session-instruction-by-ui-placement" : "after-training-completion",
    authority: "unaccepted-browser-report", persistence: "memory-only", measurementClaims: PILOT_CLAIMS,
    answers: Object.freeze(form.items.map(i => Object.freeze({ questionId: i.question.id, sourceQuestionId: i.sourceQuestionId,
      answer: answers[i.question.id], correct: answers[i.question.id] === i.question.correct, exposure: exposure[i.question.id] }))) });
}
