import { assertCompletedSessionEvidence, canonicalEvidence, normalizeEvidenceTimestamp } from "../learningEvidence";
import type { TrainingMethodId } from "../type";
import { buildEconomicsObjectiveHistory } from "./objectiveHistory";
import { mapTopicLearningContent } from "./objectives";
import type { LearningContentType, LearningObjective } from "./objectives";
import { requireEconomicsPack } from "./packs";
import { economicsFormats } from "./formats";
import { compileMappedEconomics, supportedEconomicsMethods } from "./runtime";
import { mapMethodLearningContent } from "./methodContentMapping";
import type { TopicPack } from "./types";

export type AcceptedObjectiveSource = { readonly id: string; readonly data: unknown };
export type StudyPurpose = "review-recorded-error" | "cover-unassessed-content" | "consolidate" | "future-retention-check";
export type StudyEvidenceReference = {
  readonly evidenceId: string; readonly sessionId: string; readonly contentSetId: string;
  readonly sequence: number; readonly stage: "baseline-post-study" | "method-lab" | "method-match";
  readonly methodId: string | null; readonly questionId: string; readonly objectiveIds: readonly string[];
  readonly role: "scored" | "practice" | "retest"; readonly correct: boolean;
  readonly completedAt: string | null; readonly sessionStartedAt: string | null;
  readonly priorMethodsInSession: readonly string[]; readonly earlierReportedMethodSessions: number;
};
export type StudyRecommendation = {
  readonly topicId: string; readonly objectiveId: string; readonly objectiveLabel: string;
  readonly methodId: TrainingMethodId; readonly purpose: StudyPurpose; readonly action: string; readonly explanation: string;
  readonly evidenceStrength: "repeated-recorded-errors" | "limited-recorded-answers" | "task-suitability-only";
  readonly methodBasis: "reviewed-task-suitability-not-personal-effectiveness";
  readonly evidenceReferences: readonly StudyEvidenceReference[];
  readonly evidenceReferenceCount: number; readonly referencesTruncated: boolean;
  readonly contentSuggestion: {
    readonly contentVersion: string; readonly mappingVersion: string; readonly activityVersion: "mapped-1";
    readonly contentSetId: string; readonly questionId: string; readonly materialId: string;
    readonly contentType: LearningContentType; readonly canonicalHow: readonly string[];
    readonly status: "planned-suggestion-not-session-allocation-or-observed-evidence";
  };
  readonly limitations: readonly string[];
};
export type StudyRecommendationResult = {
  readonly schemaVersion: 1; readonly policyVersion: "ec9708-study-actions-1";
  readonly ownerUid: string; readonly topicId: string;
} & ({ readonly status: "recommended"; readonly recommendation: StudyRecommendation } |
  { readonly status: "insufficient-evidence"; readonly reason: "invalid-owner-or-evidence" | "unsupported-topic" | "no-compatible-content" });

type History = ReturnType<typeof buildEconomicsObjectiveHistory>;
type Response = StudyEvidenceReference & { readonly hasDiagram: boolean; readonly priorObjectiveExposure: boolean };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const key = (r: StudyEvidenceReference) => canonicalEvidence([r.sessionId, r.sequence, r.questionId, r.role]);
const commonLimitations = ["client-reported-answers-not-proctored", "client-reported-timing", "available-history-partial-or-unknown",
  "outside-study-unknown", "no-topic-mastery-claim", "no-pre-study-knowledge-inference", "no-learning-gain-or-causal-method-claim",
  "personal-method-effectiveness-not-established", "advisory-does-not-change-training-selection"];

function responses(history: History, rows: readonly AcceptedObjectiveSource[], pack: TopicPack): Response[] {
  const sources = new Map<string, { id: string; requestHash: string; completedAt: string | null; startedAt: string | null }>();
  for (const row of rows) {
    const data = row.data as { evidence: unknown; requestHash: string; objectiveEvidence?: { sessionStartedAt: string | null } };
    assertCompletedSessionEvidence(data.evidence);
    // Phase 3 has already checked receipt, sidecar and ownership. Source IDs
    // still refer to the authenticated repository, never browser draft IDs.
    if (data.evidence.provenance.kind === "native") {
      const previous = sources.get(data.evidence.sessionId);
      if (previous && (previous.id !== row.id || previous.requestHash !== data.requestHash)) throw new Error("Conflicting accepted source identity.");
      sources.set(data.evidence.sessionId, { id: row.id, requestHash: data.requestHash,
        completedAt: normalizeEvidenceTimestamp(data.evidence.completedAt), startedAt: data.objectiveEvidence?.sessionStartedAt ?? null });
    }
  }
  const questions = new Map([...pack.baselineMemory, ...pack.baselineUnderstanding, ...pack.lab, ...pack.verification].map(q => [q.id, q]));
  return history.activities.flatMap(activity => activity.answers.flatMap(answer => {
    if (!questions.has(answer.questionId)) return []; // Another whole topic.
    const source = sources.get(activity.sessionId);
    if (!source) throw new Error("Accepted objective source missing.");
    return [{ evidenceId: source.id, sessionId: activity.sessionId, contentSetId: activity.contentSetId,
      sequence: activity.sequence, stage: activity.stage, methodId: activity.methodId,
      questionId: answer.questionId, objectiveIds: [...answer.objectiveIds], role: answer.role, correct: answer.correct,
      completedAt: source.completedAt, sessionStartedAt: source.startedAt, priorMethodsInSession: [...activity.priorMethodsInSession],
      earlierReportedMethodSessions: activity.earlierReportedMethodSessions, hasDiagram: Boolean(questions.get(answer.questionId)!.diagram),
      priorObjectiveExposure: activity.priorByObjective.some(p => answer.objectiveIds.includes(p.objectiveId) &&
        (p.earlierWithinSessionActivities > 0 || p.otherKnownSessionCount > 0)) }];
  })).sort((a, b) => compare(key(a), key(b)));
}

/** A later correct answer may end an immediate review prompt, but is never
 * converted into a learning gain. Tied, missing and overlapping clocks do not
 * establish order. Sequence applies only inside the same reported session. */
function unresolvedErrors(answers: readonly Response[]): Response[] {
  const correctStarts = new Map<string, string>(), correctSequences = new Map<string, number>();
  for (const a of answers) if (a.role === "scored" && a.correct) {
    if (a.sessionStartedAt && a.sessionStartedAt > (correctStarts.get(a.questionId) ?? "")) correctStarts.set(a.questionId, a.sessionStartedAt);
    const k = canonicalEvidence([a.sessionId, a.questionId]);
    correctSequences.set(k, Math.max(correctSequences.get(k) ?? -1, a.sequence));
  }
  return answers.filter(a => a.role === "scored" && !a.correct && a.objectiveIds.length === 1 &&
    !(a.completedAt && (correctStarts.get(a.questionId) ?? "") > a.completedAt) &&
    (correctSequences.get(canonicalEvidence([a.sessionId, a.questionId])) ?? -1) <= a.sequence);
}

const methodChoices: Partial<Record<LearningContentType, readonly TrainingMethodId[]>> = {
  recall: ["active-recall", "leitner-system", "memory-palace"],
  formula: ["active-recall", "leitner-system"],
  calculation: ["divide-steps"],
  "diagram-interpretation": ["feynman", "one-sentence"],
  "conceptual-explanation": ["feynman", "one-sentence"],
  "causal-explanation": ["feynman", "one-sentence"],
  relationship: ["feynman", "one-sentence"],
  application: ["capture-create", "kidlin-rule", "divide-steps"]
};
function focusType(objective: LearningObjective, errors: readonly Response[]): LearningContentType {
  if (errors.some(a => a.hasDiagram) && objective.contentTypes.includes("diagram-interpretation")) return "diagram-interpretation";
  return (["calculation", "recall", "application", "causal-explanation", "relationship", "conceptual-explanation", "formula", "diagram-interpretation"] as const)
    .find(type => objective.contentTypes.includes(type))!;
}
function compatibleAction(pack: TopicPack, objective: LearningObjective, facet: LearningContentType, answers: readonly Response[], errors: readonly Response[]) {
  const supported = new Set(supportedEconomicsMethods()), seenQuestions = new Set(answers.map(a => a.questionId));
  const used = new Set(answers.filter(a => a.objectiveIds.includes(objective.id)).map(a => a.methodId));
  // Alternate equally task-suitable procedures only to broaden practice, never
  // because sequential scores establish a personal winner or loser.
  const methods = [...(methodChoices[facet] ?? [])].sort((a, b) => Number(used.has(a)) - Number(used.has(b)));
  const errorsByQuestion = new Set(errors.map(a => a.questionId));
  const items = pack.lab.map((q, index) => ({ q, index })).filter(({ q }) => q.coverage.includes(objective.syllabusPointId) &&
    (facet !== "diagram-interpretation" || q.diagram)).sort((a, b) =>
      Number(errorsByQuestion.has(b.q.id)) - Number(errorsByQuestion.has(a.q.id)) ||
      Number(seenQuestions.has(a.q.id)) - Number(seenQuestions.has(b.q.id)) || a.index - b.index);
  for (const method of methods) {
    if (!supported.has(method)) continue;
    const [ordinary, practice, test] = economicsFormats[method].lab, width = ordinary + practice + test;
    for (const { q, index } of items) {
      const offset = Math.min(Math.max(0, index - practice), pack.lab.length - width);
      if (offset < 0 || index < offset + practice || index >= offset + practice + (ordinary || test)) continue;
      const form = { questions: ordinary ? pack.lab.slice(offset, offset + ordinary) : [],
        practice: pack.lab.slice(offset, offset + practice), test: test ? pack.lab.slice(offset + practice, offset + width) : [] };
      const plan = mapMethodLearningContent(pack, method, "lab", form);
      if (plan.status !== "supported" || !plan.primaryObjectiveIds.includes(objective.id)) continue;
      const id = `ec9708-${pack.topicId.replace(".", "_")}-${pack.version}-lab-${method}-mapped1${offset ? `-q${offset}` : ""}`;
      const runtime = compileMappedEconomics({ title: "" }, pack, method, "lab", form, id).runtime;
      const material = runtime.materials.find(m => m.objectiveIds.includes(objective.id) && m.id.endsWith(":note"));
      if (!material) continue;
      return { method, plan, id, q, material, previouslyUsed: used.has(method) };
    }
  }
  return null;
}

/** Pure advisory policy. The caller must obtain active, reconciled immutable
 * rows through an authenticated owner repository. This validates consistency,
 * not independent IAM/origin authority. No writes, UI or Training selection. */
export function recommendEconomicsStudy(ownerUid: string, topicId: string, rows: readonly AcceptedObjectiveSource[]): StudyRecommendationResult {
  const base = { schemaVersion: 1 as const, policyVersion: "ec9708-study-actions-1" as const, ownerUid, topicId };
  let pack: TopicPack;
  try { pack = requireEconomicsPack(topicId); } catch { return { ...base, status: "insufficient-evidence", reason: "unsupported-topic" }; }
  let history: History, answers: Response[];
  try {
    if (typeof ownerUid !== "string" || !ownerUid.trim() || !Array.isArray(rows)) throw new Error("Owner-scoped history required.");
    history = buildEconomicsObjectiveHistory(ownerUid, rows);
    answers = responses(history, rows, pack);
  } catch { return { ...base, status: "insufficient-evidence", reason: "invalid-owner-or-evidence" }; }
  const topic = mapTopicLearningContent(pack), errors = unresolvedErrors(answers);
  const topicActivities = history.activities.filter(a => a.contentSetId.startsWith(`ec9708-${pack.topicId.replace(".", "_")}-`));
  const scored = answers.filter(a => a.role === "scored"), assessed = new Set(scored.flatMap(a => a.objectiveIds));
  const forObjective = (id: string) => answers.filter(a => a.objectiveIds.includes(id));
  const errorObjectives = topic.objectives.filter(o => errors.some(a => a.objectiveIds.includes(o.id)))
    .sort((a, b) => new Set(errors.filter(r => r.objectiveIds.includes(b.id)).map(r => r.questionId)).size -
      new Set(errors.filter(r => r.objectiveIds.includes(a.id)).map(r => r.questionId)).size || a.noteIndex - b.noteIndex);
  const unassessed = topic.objectives.filter(o => !assessed.has(o.id));
  const other = topic.objectives.filter(o => !errorObjectives.includes(o) && !unassessed.includes(o)).sort((a, b) =>
    new Set(forObjective(a.id).filter(r => r.role === "scored").map(r => r.questionId)).size -
    new Set(forObjective(b.id).filter(r => r.role === "scored").map(r => r.questionId)).size || a.noteIndex - b.noteIndex);
  for (const objective of [...errorObjectives, ...unassessed, ...other]) {
    const refs = forObjective(objective.id), mistakes = errors.filter(a => a.objectiveIds.includes(objective.id));
    const mistakeKeys = new Set(mistakes.map(key));
    const facet = focusType(objective, mistakes), choice = compatibleAction(pack, objective, facet, answers, mistakes);
    if (!choice) continue;
    const purpose: StudyPurpose = mistakes.length ? "review-recorded-error" : !assessed.has(objective.id) ? "cover-unassessed-content"
      : refs.some(a => a.role === "scored" && !a.correct) ? "consolidate" : "future-retention-check";
    const distinctErrors = new Set(mistakes.map(a => a.questionId)).size;
    const explanation = purpose === "review-recorded-error" ? `Recorded answers include an incorrect response on ${distinctErrors} distinct question${distinctErrors === 1 ? "" : "s"} linked specifically to this objective. Review this task; this does not diagnose a lasting weakness.`
      : purpose === "cover-unassessed-content" ? "No scored question response for this objective appears in the available objective-linked history. This is a coverage suggestion, not a claim that you have never studied it."
      : purpose === "consolidate" ? "Available answers are mixed or include an earlier error followed by a later reported correct answer. Consolidate with a supported task; no learning gain is inferred."
      : "Recorded correct responses support trying a later retrieval check. They do not establish topic mastery or long-term retention.";
    const limits = [...commonLimitations];
    if (history.objectiveAssessmentUnavailableSessions.length) limits.push("historical-objective-context-unavailable");
    if (topicActivities.some(a => a.responseCoverage !== "complete")) limits.push("incomplete-answer-capture-in-supplied-history");
    if (topicActivities.some(a => a.materialExposureOnly.length)) limits.push("presentation-is-exposure-only");
    if (refs.some(a => a.stage === "baseline-post-study")) limits.push("baseline-is-post-study");
    if (refs.some(a => a.stage === "method-match")) limits.push("verification-is-top-two-selected");
    if (refs.some(a => a.priorMethodsInSession.length || a.earlierReportedMethodSessions || a.priorObjectiveExposure)) limits.push("prior-method-and-objective-exposure-carryover");
    if (new Set(refs.filter(a => a.role === "scored").map(a => a.questionId)).size < refs.filter(a => a.role === "scored").length) limits.push("repeated-questions-not-independent-corroboration");
    if (refs.some(a => !a.completedAt || !a.sessionStartedAt)) limits.push("completion-order-unknown");
    if (refs.some(a => a.role !== "scored")) limits.push("practice-and-retest-not-scored-assessment");
    if (refs.some(a => a.objectiveIds.length > 1)) limits.push("joint-question-cannot-localize-an-error");
    if (scored.some(a => !a.correct && a.objectiveIds.length > 1)) limits.push("unlocalized-joint-question-errors-in-history");
    if (refs.some(a => a.correct) && refs.some(a => !a.correct)) limits.push("mixed-recorded-results");
    const how = choice.plan.procedure.reviewedHow ?? choice.plan.procedure.trainingHow;
    return { ...base, status: "recommended", recommendation: { topicId, objectiveId: objective.id, objectiveLabel: objective.label,
      methodId: choice.method, purpose,
      action: `${purpose === "future-retention-check" ? "At a later study session, focus" : "Focus"} on “${objective.label}”. Use ${choice.plan.procedure.trainingName} with the reviewed topic note, following its canonical steps. Then attempt “${choice.q.question}” and check the reviewed answer.`,
      explanation: `${explanation} ${choice.plan.procedure.trainingName} is suggested for ${facet.replaceAll("-", " ")} by task suitability.${!choice.previouslyUsed && refs.some(a => a.methodId) ? " It offers another way to practise, not a proven better method for you." : " This is not a personal method-effectiveness ranking."}`,
      evidenceStrength: distinctErrors >= 2 ? "repeated-recorded-errors" : refs.some(a => a.role === "scored") ? "limited-recorded-answers" : "task-suitability-only",
      methodBasis: "reviewed-task-suitability-not-personal-effectiveness", evidenceReferenceCount: refs.length, referencesTruncated: refs.length > 16,
      evidenceReferences: [...refs].sort((a, b) => Number(mistakeKeys.has(key(b))) - Number(mistakeKeys.has(key(a))) || compare(key(a), key(b)))
        .slice(0, 16).map(({ hasDiagram: _diagram, priorObjectiveExposure: _exposure, ...ref }) => ref),
      contentSuggestion: { contentVersion: pack.version, mappingVersion: topic.mappingVersion, activityVersion: "mapped-1", contentSetId: choice.id,
        questionId: choice.q.id, materialId: choice.material.id, contentType: facet, canonicalHow: [...how], status: "planned-suggestion-not-session-allocation-or-observed-evidence" },
      limitations: limits } };
  }
  return { ...base, status: "insufficient-evidence", reason: "no-compatible-content" };
}
