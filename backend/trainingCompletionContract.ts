import { createHash } from "node:crypto";
import {
  canonicalEvidence, createCompletedSessionEvidence, evidenceBytes,
  normalizeEvidenceTimestamp, SCORE_ROUNDING_TOLERANCE
} from "../src/quiz/learningEvidence";
import type { CompletedSessionEvidence, ObservationMetadata } from "../src/quiz/learningEvidence";
import { selectMethodsForVerification } from "../src/quiz/methodMatchSelector";
import { buildLearningProfile } from "../src/quiz/profileBuilder";
import { isTrainingMethodId } from "../src/quiz/type";
import type {
  LearningSituation, BaselineResult, MethodIntroductionResult, MethodLabResult,
  MethodMatchResult, ReflectionResult, TrainingMethodId
} from "../src/quiz/type";

export const COMPLETION_VERSION = 1;
export const COMPLETION_BODY_BYTES = 64 * 1024;
export class CompletionError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export function requireCompletion(condition: unknown, code = "invalid_completion", status = 400): asserts condition {
  if (!condition) throw new CompletionError(status, code);
}
export function digest(value: unknown): string {
  return createHash("sha256").update(canonicalEvidence(value)).digest("hex");
}
type ObjectValue = Record<string, unknown>;
function object(value: unknown, keys: readonly string[]): ObjectValue {
  requireCompletion(typeof value === "object" && value !== null && !Array.isArray(value));
  const result = value as ObjectValue;
  requireCompletion(Object.keys(result).every(key => keys.includes(key)));
  return result;
}
function text(value: unknown, max = 256): void {
  requireCompletion(typeof value === "string" && new TextEncoder().encode(value).length <= max);
}
function rating(value: unknown, nullable = false): void {
  requireCompletion(nullable && value === null || typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5);
}
function number(value: unknown, nullable = false, maximum = Number.MAX_SAFE_INTEGER): void {
  requireCompletion(nullable && value === null || typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum);
}
function counts(value: ObjectValue, nullable = false): void {
  number(value.score, nullable, 1);
  requireCompletion(nullable && value.correct === null || Number.isSafeInteger(value.correct) && Number(value.correct) >= 0);
  requireCompletion(nullable && value.total === null || Number.isSafeInteger(value.total) && Number(value.total) > 0);
  if (value.correct !== null && value.total !== null) {
    requireCompletion(Number(value.correct) <= Number(value.total));
    if (value.score !== null) requireCompletion(Math.abs(Number(value.score) - Number(value.correct) / Number(value.total)) <= SCORE_ROUNDING_TOLERANCE);
  }
}
function methods(value: unknown, maximum = 4): TrainingMethodId[] {
  requireCompletion(Array.isArray(value) && value.length > 0 && value.length <= maximum && value.every(isTrainingMethodId));
  requireCompletion(new Set(value).size === value.length);
  return value as TrainingMethodId[];
}
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every(item => b.includes(item));
}
function boundedJSON(value: unknown): void {
  const pending = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const current = pending.pop()!;
    requireCompletion(++nodes <= 10000 && current.depth <= 16, "completion_structure_limit");
    requireCompletion(current.value === null || ["object", "string", "boolean", "number"].includes(typeof current.value), "invalid_completion_json");
    if (typeof current.value === "number") requireCompletion(Number.isFinite(current.value));
    if (current.value !== null && typeof current.value === "object") {
      requireCompletion(Array.isArray(current.value) || Object.getPrototypeOf(current.value) === Object.prototype || Object.getPrototypeOf(current.value) === null);
      for (const item of Object.values(current.value)) pending.push({ value: item, depth: current.depth + 1 });
    }
  }
}
export type CompletionRequest = {
  schemaVersion: 1; sessionId: string; mode: "auto" | "manual";
  selectedMethods: TrainingMethodId[];
  methodIntroduction: MethodIntroductionResult; methodLab: MethodLabResult;
  methodMatch: MethodMatchResult; reflection: ReflectionResult;
  learningSituation?: LearningSituation; baseline?: BaselineResult;
  metadata?: ObservationMetadata[]; completedAt?: string | null;
  selectionContext?: CompletedSessionEvidence["selectionContext"];
};
export type ValidatedCompletion = {
  request: CompletionRequest; requestHash: string; evidence: CompletedSessionEvidence;
  legacy: Record<string, unknown> | null;
};

/** Strict wire boundary. Ownership, scores and profile outputs are not accepted as claims. */
export function validateCompletion(uid: string, raw: unknown, recordedAt: string): ValidatedCompletion {
  requireCompletion(typeof uid === "string" && uid.length > 0 && uid.length <= 128 && !uid.includes("/"), "invalid_owner", 401);
  const root = object(raw, ["schemaVersion", "sessionId", "mode", "selectedMethods", "methodIntroduction", "methodLab", "methodMatch", "reflection", "learningSituation", "baseline", "metadata", "completedAt", "selectionContext"]);
  boundedJSON(root);
  requireCompletion(evidenceBytes(raw) <= COMPLETION_BODY_BYTES, "completion_too_large", 413);
  requireCompletion(root.schemaVersion === COMPLETION_VERSION, "unsupported_completion_version");
  requireCompletion(typeof root.sessionId === "string" && /^[A-Za-z0-9_-]{8,200}$/.test(root.sessionId));
  requireCompletion(root.mode === "auto" || root.mode === "manual");
  const selected = methods(root.selectedMethods);
  requireCompletion(root.mode === "manual" ? selected.length <= 3 : selected.length === 3 || selected.length === 4);
  const intro = object(root.methodIntroduction, ["methods", "correct", "total", "score"]);
  requireCompletion(sameSet(methods(intro.methods), selected) && intro.total === selected.length);
  counts(intro);
  const lab = object(root.methodLab, ["experiments"]);
  requireCompletion(Array.isArray(lab.experiments) && lab.experiments.length === selected.length);
  const labs = lab.experiments.map(item => {
    const result = object(item, ["method", "category", "score", "correct", "total", "confidence", "ease", "willingnessToUse", "timeSpentMs"]);
    requireCompletion(["memory", "understanding", "organization", "problem-solving", "focus"].includes(String(result.category)));
    counts(result, true);
    for (const key of ["confidence", "ease", "willingnessToUse"]) rating(result[key]);
    number(result.timeSpentMs);
    return result;
  });
  requireCompletion(sameSet(methods(labs.map(item => item.method)), selected));
  const match = object(root.methodMatch, ["methods"]);
  requireCompletion(Array.isArray(match.methods) && match.methods.length === Math.min(2, selected.length));
  const matches = match.methods.map(item => {
    const result = object(item, ["method", "firstScore", "verificationScore", "confidence", "timeSpentMs"]);
    number(result.firstScore, true, 1); number(result.verificationScore, true, 1);
    rating(result.confidence); number(result.timeSpentMs);
    const previous = labs.find(item => item.method === result.method);
    requireCompletion(previous && previous.score === result.firstScore, "match_lab_mismatch");
    return result;
  });
  // Reuse, never reimplement, the approved top-two performance selector.
  const typedLab = root.methodLab as MethodLabResult;
  requireCompletion(sameSet(methods(matches.map(item => item.method)), selectMethodsForVerification(typedLab.experiments)), "verification_methods_mismatch");
  const reflection = object(root.reflection, ["preferredMethod", "priority", "surprisedByResults", "reflectionText"]);
  requireCompletion(reflection.preferredMethod === null || selected.includes(reflection.preferredMethod as TrainingMethodId));
  requireCompletion(["performance", "ease", "confidence", "realistic-use"].includes(String(reflection.priority)));
  requireCompletion(reflection.surprisedByResults === null || typeof reflection.surprisedByResults === "boolean");
  text(reflection.reflectionText, 4000);
  if (root.mode === "auto") {
    const situation = object(root.learningSituation, ["goal", "difficulties", "contentTypes", "currentApproach", "sessionLength", "learningContext"]);
    for (const key of ["goal", "currentApproach", "sessionLength", "learningContext"]) if (situation[key] !== null) text(situation[key]);
    for (const key of ["difficulties", "contentTypes"]) {
      requireCompletion(Array.isArray(situation[key]) && situation[key].length <= 23);
      for (const item of situation[key]) text(item);
    }
    const baseline = object(root.baseline, ["memory", "understanding"]);
    for (const key of ["memory", "understanding"]) {
      const task = object(baseline[key], ["score", "correct", "total", "confidence", "timeSpentMs"]);
      counts(task); rating(task.confidence, true); number(task.timeSpentMs);
    }
  } else requireCompletion(root.learningSituation === undefined && root.baseline === undefined);
  if (root.metadata !== undefined) {
    requireCompletion(Array.isArray(root.metadata) && root.metadata.length <= 6);
    for (const item of root.metadata) {
      const metadata = object(item, ["methodId", "phase", "context", "protocol", "completedAt", "matchCounts"]);
      if (metadata.context !== undefined) object(metadata.context, ["subject", "topic", "exerciseTopic", "contentSetId", "contentVersion"]);
      if (metadata.protocol !== undefined) {
        const protocol = object(metadata.protocol, ["assessmentVersion", "scoringVersion", "questions"]);
        if (protocol.questions !== undefined && protocol.questions !== null) {
          requireCompletion(Array.isArray(protocol.questions) && protocol.questions.length <= 100);
          for (const value of protocol.questions) {
            const question = object(value, ["questionId", "difficulty", "offeredOptionCount", "offeredOptionIds"]);
            text(question.questionId, 160);
            requireCompletion(question.difficulty === null || ["easy", "medium", "hard"].includes(String(question.difficulty)));
            requireCompletion(question.offeredOptionCount === null || Number.isSafeInteger(question.offeredOptionCount) && Number(question.offeredOptionCount) >= 2 && Number(question.offeredOptionCount) <= 16);
            if (question.offeredOptionIds !== null) {
              requireCompletion(Array.isArray(question.offeredOptionIds) && question.offeredOptionIds.length >= 2 && question.offeredOptionIds.length <= 16);
              for (const id of question.offeredOptionIds) text(id, 256);
            }
          }
        }
      }
      if (metadata.matchCounts !== undefined) {
        requireCompletion(metadata.phase === "match");
        object(metadata.matchCounts, ["correct", "total"]);
      }
    }
  }
  if (root.selectionContext !== undefined) {
    const selection = object(root.selectionContext, ["kind", "nominatedMethodIds"]);
    requireCompletion(Array.isArray(selection.nominatedMethodIds) && selection.nominatedMethodIds.length <= 23 && selection.nominatedMethodIds.every(isTrainingMethodId));
    requireCompletion(new Set(selection.nominatedMethodIds).size === selection.nominatedMethodIds.length);
    requireCompletion(root.mode === "manual" ? selection.kind === "manual"
      : selected.length === 3 ? selection.kind === "ai-confirmed" : selection.kind === "traditional");
  } else requireCompletion(root.mode === "manual" || selected.length === 4, "three_methods_need_advisory_context");
  // Clone before the foundation freezes anything. Do not invent completion time.
  const request = JSON.parse(JSON.stringify(raw)) as CompletionRequest;
  try {
    request.completedAt = normalizeEvidenceTimestamp(request.completedAt ?? null);
    requireCompletion(request.completedAt === null || Date.parse(request.completedAt) <= Date.parse(recordedAt), "future_completion");
    for (const item of request.metadata ?? []) if (item.completedAt !== undefined) {
      (item as { completedAt: string | null }).completedAt = normalizeEvidenceTimestamp(item.completedAt);
      requireCompletion(item.completedAt === null || Date.parse(item.completedAt) <= Date.parse(recordedAt), "future_completion");
    }
    const evidence = createCompletedSessionEvidence({
      sessionId: request.sessionId, owner: { kind: "user", uid }, mode: request.mode,
      methodLab: request.methodLab, methodMatch: request.methodMatch, metadata: request.metadata,
      completedAt: request.completedAt, recordedAt,
      selectionContext: request.selectionContext ?? { kind: request.mode === "manual" ? "manual" : "traditional", nominatedMethodIds: [] },
      preference: { methodId: request.reflection.preferredMethod, priority: request.reflection.priority }
    });
    const legacy = request.mode === "manual" ? null : {
      status: "completed", learningSituation: request.learningSituation!, baseline: request.baseline!,
      methodIntroduction: request.methodIntroduction, methodLab: request.methodLab,
      methodMatch: request.methodMatch, reflection: request.reflection,
      learningProfile: buildLearningProfile({ baseline: request.baseline!, methodIntroduction: request.methodIntroduction,
        methodLab: request.methodLab, methodMatch: request.methodMatch, reflection: request.reflection })
    };
    return { request, evidence, legacy, requestHash: digest({ contract: "training-complete-v1", uid, request }) };
  } catch (error) {
    if (error instanceof CompletionError) throw error;
    throw new CompletionError(400, "invalid_completion_evidence");
  }
}
