import type { TrainingDraft } from "../trainingProgress";
import { collectEconomicsResponses } from "../economics9708/collectAssessmentResponses";
import { currentPilotExposure } from "../economics9708/progressPilot/model";
import { requireEconomicsPack } from "../economics9708/packs";
import { mapTopicLearningContent } from "../economics9708/objectives";
import { canonicalEvidence } from "../learningEvidence";
import type { MultipleChoiceQuestion } from "../methodEngineTypes";
import { activityKey, activityPrefix, readLocalActivity, writeLocalActivity } from "./commitment";
import type { LocalActivityIdentity } from "./commitment";
import { isTrainingMethodId } from "../type";

export type PostSleepTask = {
  version: 1; id: string; owner: string; project: string; sourceSessionId: string; sourceCompletedAt: string;
  topicId: string; contentVersion: string; methods: string[]; objectiveIds: string[]; questionIds: string[];
  sourceQuestionIds: string[]; sourceAuthority: "browser-completed-training-not-new-accepted-evidence" | "owner-preview-only";
  immediateResults: { method: string; correct: number | null; total: number | null }[];
  availableAt: number; answers: Record<string, string>; index: number; startedAt: number | null;
  mode: "timed-100" | "untimed-accommodation"; restudied: boolean; sleepReport: "not-provided" | "slept" | "did-not-sleep";
  invalidAttempts: { attempt: number; answers: Record<string, string>; endedAt: number }[];
  result: null | { correct: number; total: number; answered: number; assessedAt: string; recordedAt: string; elapsedIntervalMs: number;
    expired: boolean; comparison: "unavailable-unreviewed-forms"; authority: "local-browser-task-performance" | "owner-preview-only" };
};
const fingerprint = (q: MultipleChoiceQuestion) => canonicalEvidence([q.question.replace(/\s+/g, " ").trim().toLowerCase(), [...q.options].sort()]);
export function postSleepQuestions(task: PostSleepTask) {
  const pack = requireEconomicsPack(task.topicId);
  if (pack.version !== task.contentVersion) throw new Error("The saved question version is unavailable.");
  const pool = task.sourceAuthority === "owner-preview-only" ? pack.baselineMemory : [...pack.lab, ...pack.verification];
  const questions = task.questionIds.map(id => pool.find(q => q.id === id));
  if (questions.length < 3 || questions.length > 5 || questions.some(q => !q) || new Set(task.questionIds).size !== questions.length ||
    task.questionIds.some(id => task.sourceQuestionIds.includes(id))) throw new Error("The saved delayed form is invalid or repeats source questions.");
  return questions as NonNullable<typeof questions[number]>[];
}
export function validPostSleepTask(value: unknown): value is PostSleepTask {
  try {
    const v = value as PostSleepTask;
    if (!v || v.version !== 1 || typeof v.owner !== "string" || typeof v.project !== "string" || typeof v.sourceSessionId !== "string" ||
      v.id !== `post-sleep:${v.sourceSessionId}` || !Number.isFinite(Date.parse(v.sourceCompletedAt)) || !Number.isSafeInteger(v.availableAt) ||
      !Array.isArray(v.methods) || !v.methods.length || !v.methods.every(isTrainingMethodId) || new Set(v.methods).size !== v.methods.length || !Array.isArray(v.objectiveIds) ||
      !v.objectiveIds.length || !v.objectiveIds.every(id => typeof id === "string") || !Array.isArray(v.sourceQuestionIds) || !v.sourceQuestionIds.every(id => typeof id === "string") ||
      !v.answers || typeof v.answers !== "object" || Array.isArray(v.answers) || v.availableAt < Date.parse(v.sourceCompletedAt) + 12 * 3600_000 ||
      !Number.isSafeInteger(v.index) || v.index < 0 || !["timed-100", "untimed-accommodation"].includes(v.mode) ||
      v.sourceAuthority !== "browser-completed-training-not-new-accepted-evidence") return false;
    const questions = postSleepQuestions(v);
    const objectiveIds = [...new Set(questions.flatMap(q => q.coverage.map(id => `ec9708-objective-${id}`)))];
    if (canonicalEvidence(v.objectiveIds) !== canonicalEvidence(objectiveIds)) return false;
    const answersValid = (answers: Record<string, string>) => answers && typeof answers === "object" && !Array.isArray(answers) &&
      Object.entries(answers).every(([id, answer]) => questions.some(q => q.id === id && q.options.includes(answer)));
    const count = (n: number | null) => n === null || Number.isSafeInteger(n) && n >= 0;
    return v.index < questions.length && answersValid(v.answers) &&
      (v.startedAt === null || Number.isSafeInteger(v.startedAt) && v.startedAt >= v.availableAt) && typeof v.restudied === "boolean" &&
      ["not-provided", "slept", "did-not-sleep"].includes(v.sleepReport) && Array.isArray(v.immediateResults) &&
      v.immediateResults.every(r => r && v.methods.includes(r.method) && count(r.correct) && count(r.total) && (r.correct === null || r.total === null || r.correct <= r.total)) &&
      Array.isArray(v.invalidAttempts) && v.invalidAttempts.length <= 10 && v.invalidAttempts.every(a => a && Number.isSafeInteger(a.attempt) && a.attempt >= 0 &&
        Number.isSafeInteger(a.endedAt) && answersValid(a.answers)) &&
      (v.result === null || v.result.authority === "local-browser-task-performance" && v.result.comparison === "unavailable-unreviewed-forms" &&
        v.startedAt !== null && v.result.total === questions.length && v.result.correct === questions.filter(q => v.answers[q.id] === q.correct).length &&
        v.result.answered === Object.keys(v.answers).length && typeof v.result.expired === "boolean" && Number.isFinite(Date.parse(v.result.assessedAt)) &&
        Date.parse(v.result.assessedAt) >= v.startedAt && Date.parse(v.result.recordedAt) >= Date.parse(v.result.assessedAt) &&
        v.result.elapsedIntervalMs === Date.parse(v.result.assessedAt) - Date.parse(v.sourceCompletedAt));
  } catch { return false; }
}
export function preparePostSleep(draft: TrainingDraft, completedAt: string, identity: LocalActivityIdentity): PostSleepTask {
  if (draft.section !== 7 || !draft.completed.reflection || draft.owner.kind !== "user" || identity.owner !== draft.owner.uid ||
    identity.sessionId !== draft.sessionId || !Number.isFinite(Date.parse(completedAt))) throw new Error("A completed current-owner session with its original completion time is required.");
  const report = collectEconomicsResponses(draft), exposure = currentPilotExposure(draft);
  if (!report || !exposure.answersComplete) throw new Error("Complete source-session question detail is needed to choose different delayed questions.");
  const pack = requireEconomicsPack(report.topicId), mapping = mapTopicLearningContent(pack);
  const seen = new Set([...exposure.answered, ...exposure.preparedForDisplay]);
  const all = [...pack.baselineMemory, ...pack.baselineUnderstanding, ...pack.lab, ...pack.verification];
  const usedText = new Set(all.filter(q => seen.has(q.id)).map(fingerprint));
  // Include previously offered local delayed forms. Never promise no outside
  // exposure, and never infer learning from display alone.
  for (const old of listPostSleep(identity)) old.questionIds.forEach(id => seen.add(id));
  const studied = new Set(mapping.questions.filter(q => exposure.answered.has(q.questionId)).flatMap(q => q.objectiveIds));
  const chosen = [...pack.lab, ...pack.verification].filter(q => !seen.has(q.id) && !usedText.has(fingerprint(q)) &&
    q.coverage.every(id => studied.has(`ec9708-objective-${id}`))).slice(0, 4);
  if (chosen.length < 3) throw new Error("Fewer than three different questions remain for the studied objectives. No delayed form was fabricated.");
  const sourceTime = Date.parse(completedAt), nextDay = new Date(sourceTime); nextDay.setDate(nextDay.getDate() + 1); nextDay.setHours(0, 0, 0, 0);
  return { version: 1, id: `post-sleep:${draft.sessionId}`, owner: identity.owner, project: identity.project, sourceSessionId: draft.sessionId,
    sourceCompletedAt: completedAt, topicId: pack.topicId, contentVersion: pack.version, methods: [...draft.selectedMethods],
    objectiveIds: [...new Set(chosen.flatMap(q => q.coverage.map(id => `ec9708-objective-${id}`)))], questionIds: chosen.map(q => q.id), sourceQuestionIds: [...seen],
    sourceAuthority: "browser-completed-training-not-new-accepted-evidence", immediateResults: draft.completed.methodLab!.experiments.map(r => ({ method: r.method, correct: r.correct, total: r.total })),
    availableAt: Math.max(sourceTime + 12 * 60 * 60 * 1000, nextDay.getTime()), answers: {}, index: 0, startedAt: null, mode: "timed-100", restudied: false, sleepReport: "not-provided", invalidAttempts: [], result: null };
}
export const postSleepKey = (identity: LocalActivityIdentity, task: PostSleepTask) => activityKey({ ...identity, sessionId: task.sourceSessionId }, task.id);
export function savePostSleep(identity: LocalActivityIdentity, task: PostSleepTask) {
  if (task.owner !== identity.owner || task.project !== identity.project || !validPostSleepTask(task)) throw new Error("The delayed task does not belong to this owner or is invalid.");
  const key = postSleepKey(identity, task), previous = readLocalActivity(key, validPostSleepTask);
  const source = (t: PostSleepTask) => [t.id, t.owner, t.project, t.sourceSessionId, t.sourceCompletedAt, t.topicId, t.contentVersion,
    t.methods, t.objectiveIds, t.questionIds, t.sourceQuestionIds, t.sourceAuthority, t.immediateResults, t.availableAt];
  if (previous && (canonicalEvidence(source(previous)) !== canonicalEvidence(source(task)) || previous.result && canonicalEvidence(previous) !== canonicalEvidence(task)))
    throw new Error("The saved source or completed result changed. The original activity was preserved.");
  writeLocalActivity(key, task);
}
export function listPostSleep(identity: LocalActivityIdentity): PostSleepTask[] {
  const tasks: PostSleepTask[] = [], prefix = activityPrefix(identity);
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(prefix) || !key.includes('"post-sleep:')) continue;
    const task = readLocalActivity(key, validPostSleepTask);
    if (task && task.owner === identity.owner && task.project === identity.project) tasks.push(task);
  }
  if (tasks.length > 100) throw new Error("The local delayed-task capacity was reached. Review existing results; none was discarded.");
  return tasks.sort((a, b) => a.availableAt - b.availableAt);
}
export function scorePostSleep(task: PostSleepTask, now: number, expired: boolean, recordedAt = now): PostSleepTask {
  const questions = postSleepQuestions(task), answered = questions.filter(q => task.answers[q.id] !== undefined);
  return { ...task, result: { correct: answered.filter(q => task.answers[q.id] === q.correct).length, total: questions.length, answered: answered.length,
    assessedAt: new Date(now).toISOString(), recordedAt: new Date(recordedAt).toISOString(), elapsedIntervalMs: now - Date.parse(task.sourceCompletedAt), expired,
    comparison: "unavailable-unreviewed-forms", authority: task.sourceAuthority === "owner-preview-only" ? "owner-preview-only" : "local-browser-task-performance" } };
}

/** Public sample questions for the local owner preview, NOT a completed student
 * session. Reuses the same renderer/timer. The persisted-task validator above
 * deliberately rejects this authority, even if it is accidentally passed to save. */
export function preparePostSleepPreview(topicId: string, identity: LocalActivityIdentity): PostSleepTask {
  // Use the separate public Baseline sample pool, not a queued delayed form.
  const pack = requireEconomicsPack(topicId), questions = pack.baselineMemory.slice(0, 4), now = Date.now();
  const sourceSessionId = `owner-preview-${crypto.randomUUID()}`;
  return { version: 1, id: `post-sleep:${sourceSessionId}`, owner: identity.owner, project: identity.project, sourceSessionId,
    sourceCompletedAt: new Date(now).toISOString(), topicId: pack.topicId, contentVersion: pack.version, methods: [],
    objectiveIds: [...new Set(questions.flatMap(q => q.coverage.map(id => `ec9708-objective-${id}`)))], questionIds: questions.map(q => q.id),
    sourceQuestionIds: [], sourceAuthority: "owner-preview-only", immediateResults: [], availableAt: now, answers: {}, index: 0,
    startedAt: now, mode: "timed-100", restudied: false, sleepReport: "not-provided", invalidAttempts: [], result: null };
}
