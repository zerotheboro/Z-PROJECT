import { requireEconomicsPack } from "./packs";
import { economicsFormats } from "./formats";
import { requireEconomicsMethods, compileMappedEconomics } from "./runtime";
import { learningObjectiveId, OBJECTIVE_MAPPING_VERSION } from "./objectives";
import { isTrainingMethodId } from "../type";
import type { TrainingMethodId } from "../type";
import { normalizeEvidenceTimestamp, SCORE_ROUNDING_TOLERANCE } from "../learningEvidence";
import type { ObservationMetadata } from "../learningEvidence";
import type { EconomicsQuestion } from "./types";
import { economicsMetadata } from "./selection";
import { assertMaterialPresentations } from "./presentationRecords";
import type { MaterialPresentations } from "./presentationRecords";

export type EconomicsResponse = { questionId: string; answerOptionId: string;
  offeredOptionIds: string[] | null; role: "scored" | "practice" | "retest" };
export type EconomicsResponses = { schemaVersion: 1; activityVersion: "mapped-1"; topicId: string;
  sessionStartedAt: string | null; activities: { contentSetId: string; responses: EconomicsResponse[] }[] };
type Counts = { score: number | null; correct: number | null; total: number | null };
export type ObjectiveCompletionInput = { mode: "auto" | "manual"; selectedMethods: readonly TrainingMethodId[];
  methodLab: { experiments: readonly ({ method: string } & Counts)[] };
  methodMatch: { methods: readonly { method: string; verificationScore: number | null }[] };
  baseline?: { memory: Counts; understanding: Counts }; metadata?: readonly ObservationMetadata[];
  completedAt?: string | null; economicsResponses?: EconomicsResponses; materialPresentations?: MaterialPresentations };
export function resolveEconomicsAssessment(id: string) {
  const match = /^ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(memory|understanding|lab|match)(?:-([a-z0-9-]+?)-mapped1(?:-q([1-9]\d*))?)?$/.exec(id);
  if (!match) throw new Error("Unknown objective assessment identity.");
  const pack = requireEconomicsPack(`${match[1]}.${match[2]}`), phase = match[3];
  if (phase === "memory" || phase === "understanding") {
    if (match[4] || match[5]) throw new Error("Invalid Baseline identity.");
    return { pack, methodId: null, phase, scored: phase === "memory" ? pack.baselineMemory : pack.baselineUnderstanding, practice: [] as readonly EconomicsQuestion[] };
  }
  if (!isTrainingMethodId(match[4])) throw new Error("Unknown objective method.");
  requireEconomicsMethods([match[4]]);
  const offset = Number(match[5] ?? 0), [ordinary, practice, test] = economicsFormats[match[4]][phase === "lab" ? "lab" : "match"];
  const pool = phase === "lab" ? pack.lab : pack.verification;
  if (!Number.isSafeInteger(offset) || offset + ordinary + practice + test > pool.length) throw new Error("Invalid objective question offset.");
  return { pack, methodId: match[4], phase, scored: pool.slice(offset + practice, offset + practice + (ordinary || test)), practice: pool.slice(offset, offset + practice) };
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => object(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const requireValue = (condition: unknown): void => { if (!condition) throw new Error("Invalid Economics answer evidence."); };
const contentId = (topic: string, suffix: string) => `ec9708-${topic.replace(".", "_")}-2026-v2-pilot-1-${suffix}`;

/** Backend derivation from canonical keys. It validates client reports; it
 * does not establish attention, independent invigilation or causal efficacy. */
export function deriveEconomicsObjectiveEvidence(input: ObjectiveCompletionInput) {
  const raw = input.economicsResponses;
  if (raw === undefined) return undefined;
  requireValue(exact(raw, ["schemaVersion", "activityVersion", "topicId", "sessionStartedAt", "activities"]));
  requireValue(raw.schemaVersion === 1 && raw.activityVersion === "mapped-1" && typeof raw.topicId === "string");
  const pack = requireEconomicsPack(raw.topicId);
  requireEconomicsMethods(input.selectedMethods);
  const start = normalizeEvidenceTimestamp(raw.sessionStartedAt);
  const completedAt = normalizeEvidenceTimestamp(input.completedAt ?? null);
  requireValue(start === raw.sessionStartedAt && (start === null || completedAt === null || start <= completedAt));
  requireValue(Array.isArray(raw.activities) && raw.activities.length <= 8 && new TextEncoder().encode(JSON.stringify(raw)).length <= 24 * 1024);
  const expected: { id: string; counts: Counts; phase: string; methodId: TrainingMethodId | null }[] = [];
  if (input.mode === "auto") {
    requireValue(input.baseline);
    expected.push({ id: contentId(pack.topicId, "memory"), counts: input.baseline!.memory, phase: "memory", methodId: null },
      { id: contentId(pack.topicId, "understanding"), counts: input.baseline!.understanding, phase: "understanding", methodId: null });
  }
  let offset = 0;
  for (const method of input.selectedMethods) {
    const result = input.methodLab.experiments.find(r => r.method === method);
    requireValue(result);
    expected.push({ id: contentId(pack.topicId, `lab-${method}-mapped1${offset ? `-q${offset}` : ""}`), counts: result!, phase: "lab", methodId: method });
    offset += economicsFormats[method].lab.reduce((a, b) => a + b, 0);
  }
  offset = 0;
  for (const result of input.methodMatch.methods) {
    requireValue(isTrainingMethodId(result.method));
    const method = result.method as TrainingMethodId;
    expected.push({ id: contentId(pack.topicId, `match-${method}-mapped1${offset ? `-q${offset}` : ""}`),
      counts: { score: result.verificationScore, correct: null, total: null }, phase: "match", methodId: method });
    offset += economicsFormats[method].match.reduce((a, b) => a + b, 0);
  }
  requireValue(raw.activities.length === expected.length);
  if (input.materialPresentations) {
    assertMaterialPresentations(input.materialPresentations);
    requireValue(input.materialPresentations.records.every(r => expected.some(a => a.id === r.contentSetId)));
  }
  let responseCount = 0;
  const activities = expected.map((activity, sequence) => {
    const submitted = raw.activities[sequence];
    requireValue(exact(submitted, ["contentSetId", "responses"]) && submitted.contentSetId === activity.id && Array.isArray(submitted.responses));
    const form = resolveEconomicsAssessment(activity.id);
    if (activity.methodId) {
      const context = economicsMetadata(activity.id)!;
      const metadata = input.metadata?.find(m => m.methodId === activity.methodId && m.phase === activity.phase);
      requireValue(metadata?.context && Object.entries(context).every(([key, value]) => metadata.context?.[key as keyof typeof context] === value) &&
        metadata.protocol?.assessmentVersion === `${pack.version}:${activity.phase}:${activity.methodId}:mapped-1` && metadata.protocol.scoringVersion == null);
      if (metadata?.protocol?.questions) requireValue(metadata.protocol.questions.length === form.scored.length &&
        new Set(metadata.protocol.questions.map(q => q.questionId)).size === form.scored.length &&
        metadata.protocol.questions.every(q => {
          const canonical = form.scored.find(expected => expected.id === q.questionId);
          return canonical && (q.offeredOptionCount === null || q.offeredOptionCount === 4) &&
            (q.offeredOptionIds === null || q.offeredOptionIds.length === 4 && new Set(q.offeredOptionIds).size === 4 &&
              canonical.options.every((_, i) => q.offeredOptionIds!.includes(`${canonical.id}:option-${i}`)));
        }));
      const reports = input.materialPresentations?.records.filter(r => r.contentSetId === activity.id) ?? [];
      if (reports.length) {
        const ordinary = economicsFormats[activity.methodId][activity.phase === "lab" ? "lab" : "match"][0] > 0;
        const materials = compileMappedEconomics({ title: "" }, pack, activity.methodId, activity.phase === "lab" ? "lab" : "match",
          { questions: ordinary ? form.scored : [], practice: form.practice, test: ordinary ? [] : form.scored }, activity.id).runtime.materials;
        requireValue(reports.every(r => materials.some(m => m.id === r.materialId && m.version === r.materialVersion && JSON.stringify(m.objectiveIds) === JSON.stringify(r.objectiveIds))));
      }
    }
    const seen = new Set<string>();
    const answers = submitted.responses.map(response => {
      requireValue(++responseCount <= 64 && exact(response, ["questionId", "answerOptionId", "offeredOptionIds", "role"]) &&
        typeof response.questionId === "string" && ["scored", "practice", "retest"].includes(response.role));
      const pool = response.role === "scored" ? form.scored : form.practice;
      const q = pool.find(q => q.id === response.questionId);
      requireValue(q && (response.role !== "retest" || form.methodId === "leitner-system"));
      const key = `${response.role}:${response.questionId}`;
      requireValue(!seen.has(key)); seen.add(key);
      const options = q!.options.map((_, i) => `${q!.id}:option-${i}`);
      requireValue(options.includes(response.answerOptionId));
      requireValue(response.offeredOptionIds === null || Array.isArray(response.offeredOptionIds) && response.offeredOptionIds.length === 4 &&
        new Set(response.offeredOptionIds).size === 4 && options.every(id => response.offeredOptionIds!.includes(id)));
      return { questionId: q!.id, objectiveIds: q!.coverage.map(learningObjectiveId), role: response.role,
        answerOptionId: response.answerOptionId, offeredOptionIds: response.offeredOptionIds === null ? null : [...response.offeredOptionIds],
        correct: q!.options[options.indexOf(response.answerOptionId)] === q!.correct };
    });
    const scored = answers.filter(a => a.role === "scored"), correct = scored.filter(a => a.correct).length;
    const complete = scored.length === form.scored.length;
    if (activity.counts.score !== null) requireValue(Math.abs(Math.round(activity.counts.score * form.scored.length) / form.scored.length - activity.counts.score) <= SCORE_ROUNDING_TOLERANCE);
    if (activity.counts.total !== null) requireValue(activity.counts.total === form.scored.length);
    if (activity.counts.correct !== null) requireValue(correct <= activity.counts.correct && scored.length - correct <= form.scored.length - activity.counts.correct && (!complete || correct === activity.counts.correct));
    if (complete && activity.counts.score !== null) requireValue(Math.abs(correct / form.scored.length - activity.counts.score) <= SCORE_ROUNDING_TOLERANCE);
    return { contentSetId: activity.id, sequence, methodId: activity.methodId,
      stage: activity.phase === "lab" ? "method-lab" as const : activity.phase === "match" ? "method-match" as const : "baseline-post-study" as const,
      verificationRole: activity.phase === "match" ? "top-two-verification" as const : null,
      completion: "client-reported-completed" as const, responseCoverage: complete ? "complete" as const : scored.length ? "partial" as const : "unavailable" as const,
      declaredPerformance: { score: activity.counts.score, correct: activity.counts.correct, total: activity.counts.total },
      answers, limitations: ["client-reported-answers", "no-causal-method-attribution", ...(!complete ? ["missing-answer-details"] : [])] };
  });
  return { schemaVersion: 1 as const, provenance: "server-validated-canonical-questions-and-client-answers" as const,
    topicId: pack.topicId, contentVersion: pack.version, mappingVersion: OBJECTIVE_MAPPING_VERSION, activityVersion: "mapped-1" as const,
    sessionStartedAt: start, timingAuthority: "client-reported" as const, sequenceAuthority: "validated-client-session-order" as const,
    baselineMeaning: "post-study-not-prior-knowledge" as const, outsideStudy: "unknown" as const, activities };
}
export type EconomicsObjectiveEvidence = NonNullable<ReturnType<typeof deriveEconomicsObjectiveEvidence>>;
