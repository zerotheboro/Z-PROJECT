import { TRAINING_METHOD_IDS } from "../../trainingMethodIds.js";

import type {
  MethodId,
  ReflectionPriority,
  TrainingMethodId
} from "./type";

export const COMPLETED_SESSION_EVIDENCE_VERSION = 1 as const;

// UTF-8 limits, not a promise that a future persistence endpoint trusts clients.
export const EVIDENCE_LIMITS = Object.freeze({
  ownerBytes: 512, sessionIdBytes: 1024, recordIdBytes: 256,
  subjectBytes: 128, topicBytes: 256, contentIdBytes: 160, versionBytes: 64,
  questionIdBytes: 160, optionIdBytes: 256,
  observationsPerSession: 50, questionsPerObservation: 100, optionsPerQuestion: 16,
  sessionBytes: 128 * 1024
});
// Allow scores rounded to six decimal places; never replace an observed score.
export const SCORE_ROUNDING_TOLERANCE = 0.0000005 + Number.EPSILON;
export type EvidenceRecordLimitation =
  | "legacy-timestamp-ambiguous" | "legacy-timestamp-unreadable"
  | "legacy-status-absent" | "legacy-verification-absent";

export type EvidenceOwner =
  | { readonly kind: "user"; readonly uid: string }
  | { readonly kind: "guest"; readonly scopeId: string };

export type EvidenceSource = "test-me-lab" | "test-me-match" | "test-methods";
export type EvidencePhase = "lab" | "match";

export type QuestionCondition = {
  readonly questionId: string;
  readonly difficulty: "easy" | "medium" | "hard" | null;
  readonly offeredOptionCount: number | null;
  // Identities within the versioned question, not just a choice count.
  // Different retained distractors can make equal option counts incomparable.
  readonly offeredOptionIds: readonly string[] | null;
};

export type ObservationContext = {
  readonly subject: string | null;
  readonly topic: string | null;
  readonly exerciseTopic: string | null;
  readonly contentSetId: string | null;
  readonly contentVersion: string | null;
};

export type ObservationProtocol = {
  readonly assessmentVersion: string | null;
  readonly scoringVersion: string | null;
  // The actual presented conditions, not difficulty inferred from the score.
  readonly questions: readonly QuestionCondition[] | null;
};

export type LearningObservation = {
  readonly observationId: string;
  readonly sessionId: string;
  readonly methodId: MethodId;
  readonly source: EvidenceSource;
  readonly phase: EvidencePhase;
  readonly context: ObservationContext;
  readonly protocol: ObservationProtocol;
  readonly performance: {
    readonly score: number | null;
    readonly correct: number | null;
    readonly total: number | null;
    readonly timeSpentMs: number | null;
  };
  readonly selfReport: {
    readonly confidence: number | null;
    readonly ease: number | null;
    readonly willingnessToUse: number | null;
  };
  // Null unless the actual method completion time was captured.
  readonly completedAt: string | null;
};

export type CompletedSessionEvidence = {
  readonly schemaVersion: typeof COMPLETED_SESSION_EVIDENCE_VERSION;
  readonly status: "completed";
  readonly sessionId: string;
  // Legacy document identity is not proof of an original Training session ID.
  readonly originalSessionId: string | null;
  readonly owner: EvidenceOwner;
  readonly mode: "auto" | "manual";
  readonly provenance: {
    readonly kind: "native" | "legacy-assessment";
    readonly recordId: string | null;
  };
  readonly completedAt: string | null;
  // A historical createdAt is a save time, not a method completion time.
  readonly recordedAt: string | null;
  readonly selectionContext: {
    readonly kind: "ai-confirmed" | "traditional" | "manual" | "unknown";
    readonly nominatedMethodIds: readonly TrainingMethodId[];
  };
  readonly preference: {
    readonly methodId: MethodId | null;
    readonly priority: ReflectionPriority | null;
  } | null;
  readonly observations: readonly LearningObservation[];
  // Additive v1 field: omitted by older offline records, equivalent to [].
  readonly limitations?: readonly EvidenceRecordLimitation[];
};

export type ObservationMetadata = {
  readonly methodId: MethodId;
  readonly phase: EvidencePhase;
  readonly context?: Partial<ObservationContext>;
  readonly protocol?: Partial<ObservationProtocol>;
  readonly completedAt?: string | null;
  // Match results currently omit counts. Supply these only if captured.
  readonly matchCounts?: { readonly correct: number; readonly total: number };
};

export type CompletedSessionInput = {
  readonly sessionId: string;
  readonly owner: EvidenceOwner;
  readonly mode: "auto" | "manual";
  // Existing MethodLabResult/MethodMatchResult values are structurally
  // compatible; nullable historical ratings/counts remain representable.
  readonly methodLab: {
    readonly experiments: readonly ({ readonly method: MethodId } &
      LearningObservation["performance"] & LearningObservation["selfReport"])[];
  };
  readonly methodMatch: {
    readonly methods: readonly {
      readonly method: MethodId;
      readonly verificationScore: number | null;
      readonly confidence: number | null;
      readonly timeSpentMs: number | null;
    }[];
  };
  readonly metadata?: readonly ObservationMetadata[];
  readonly completedAt?: string | null;
  readonly recordedAt?: string | null;
  readonly selectionContext?: CompletedSessionEvidence["selectionContext"];
  readonly preference?: CompletedSessionEvidence["preference"];
  readonly provenance?: CompletedSessionEvidence["provenance"];
  readonly originalSessionId?: string | null;
  readonly limitations?: readonly EvidenceRecordLimitation[];
};

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceValidationError";
  }
}

export function compareEvidenceIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function evidenceOwnerKey(owner: EvidenceOwner): string {
  requireValid(owner.kind === "user"
    ? validText(owner.uid, EVIDENCE_LIMITS.ownerBytes)
    : owner.kind === "guest" && validText(owner.scopeId, EVIDENCE_LIMITS.ownerBytes), "Missing evidence owner.");
  return JSON.stringify(owner.kind === "user"
    ? ["user", owner.uid]
    : ["guest", owner.scopeId]);
}

export function observationIdFor(
  sessionId: string,
  phase: EvidencePhase,
  methodId: MethodId
): string {
  return `${encodeURIComponent(sessionId)}:${phase}:${methodId}`;
}

export function isEvidenceMethodId(value: unknown): value is MethodId {
  return value === "pomodoro" || value === "stopwatch" ||
    (TRAINING_METHOD_IDS as readonly unknown[]).includes(value);
}

function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new EvidenceValidationError(message);
}

export function evidenceBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function canonicalEvidence(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalEvidence).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort(compareEvidenceIds)
      .map(key => `${JSON.stringify(key)}:${canonicalEvidence(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 &&
    new TextEncoder().encode(value).length <= maximum;
}

function nullableText(value: unknown, maximum: number): boolean {
  return value === null || validText(value, maximum);
}

export function normalizeEvidenceTimestamp(value: string | null): string | null {
  if (value === null) return null;
  const parts = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  requireValid(parts, "Timestamp requires a valid explicit timezone.");
  const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  requireValid(month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] &&
    hour <= 23 && minute <= 59 && second <= 59 &&
    (parts[7] === "Z" || Number(parts[8]) <= 23 && Number(parts[9]) <= 59) &&
    Number.isFinite(Date.parse(value)), "Invalid timestamp.");
  return new Date(value).toISOString();
}

function isRecord(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableNumber(value: unknown, maximum = Number.MAX_SAFE_INTEGER): boolean {
  return value === null || typeof value === "number" &&
    Number.isFinite(value) && value >= 0 && value <= maximum;
}

function nullableRating(value: unknown): boolean {
  return value === null || Number.isInteger(value) &&
    typeof value === "number" && value >= 1 && value <= 5;
}

/** Runtime guard for this offline contract; it grants no persistence authority. */
export function assertCompletedSessionEvidence(value: unknown): asserts value is CompletedSessionEvidence {
  requireValid(isRecord(value), "Expected completed session evidence.");
  const session = value as CompletedSessionEvidence;
  requireValid(session.schemaVersion === COMPLETED_SESSION_EVIDENCE_VERSION &&
    session.status === "completed", "Unsupported or unfinished session evidence.");
  requireValid(validText(session.sessionId, EVIDENCE_LIMITS.sessionIdBytes) &&
    nullableText(session.originalSessionId, EVIDENCE_LIMITS.sessionIdBytes),
    "Missing session identity.");
  requireValid(session.originalSessionId === null || session.originalSessionId === session.sessionId,
    "A known original session must use its canonical session identity.");
  requireValid(isRecord(session.owner), "Missing evidence owner.");
  evidenceOwnerKey(session.owner);
  requireValid(session.mode === "auto" || session.mode === "manual", "Invalid session mode.");
  requireValid(isRecord(session.provenance) && (session.provenance.kind === "native"
    ? session.provenance.recordId === null && session.originalSessionId === session.sessionId
    : session.provenance.kind === "legacy-assessment" &&
      validText(session.provenance.recordId, EVIDENCE_LIMITS.recordIdBytes)),
  "Invalid session provenance.");
  if (session.provenance.kind === "legacy-assessment" && session.originalSessionId === null) {
    requireValid(session.sessionId === `legacy-assessment:${encodeURIComponent(session.provenance.recordId!)}`,
      "Unlinked historical evidence must use its stable legacy identity.");
  }
  const sessionCompletedAt = normalizeEvidenceTimestamp(session.completedAt);
  normalizeEvidenceTimestamp(session.recordedAt);
  requireValid(isRecord(session.selectionContext) && ["ai-confirmed", "traditional", "manual", "unknown"]
    .includes(session.selectionContext.kind) &&
    Array.isArray(session.selectionContext.nominatedMethodIds) &&
    session.selectionContext.nominatedMethodIds.length <= TRAINING_METHOD_IDS.length &&
    session.selectionContext.nominatedMethodIds.every(id =>
      (TRAINING_METHOD_IDS as readonly unknown[]).includes(id)),
  "Invalid selection context.");
  requireValid(session.mode === "manual"
    ? session.selectionContext.kind === "manual"
    : session.selectionContext.kind !== "manual", "Selection context disagrees with session mode.");
  if (session.preference !== null) {
    requireValid(isRecord(session.preference), "Invalid preference.");
    requireValid(session.preference.methodId === null || isEvidenceMethodId(session.preference.methodId),
      "Invalid method preference.");
    requireValid(session.preference.priority === null ||
      ["performance", "ease", "confidence", "realistic-use"].includes(session.preference.priority),
    "Invalid preference priority.");
  }
  requireValid(session.limitations === undefined || Array.isArray(session.limitations) &&
    session.limitations.length <= 4 && session.limitations.every(item =>
      ["legacy-timestamp-ambiguous", "legacy-timestamp-unreadable", "legacy-status-absent", "legacy-verification-absent"].includes(item)),
  "Invalid record limitations.");
  requireValid(Array.isArray(session.observations) && session.observations.length > 0 &&
    session.observations.length <= EVIDENCE_LIMITS.observationsPerSession,
  "Completed sessions need a bounded number of observations.");
  requireValid(session.observations.every(isRecord), "Invalid observation.");
  const labMethods = new Set(session.observations.filter(item => item.phase === "lab")
    .map(item => item.methodId));
  const identities = new Map<string, string>();
  for (const item of session.observations) {
    requireValid(isEvidenceMethodId(item.methodId) &&
      (item.phase === "lab" || item.phase === "match") &&
      item.sessionId === session.sessionId &&
      item.observationId === observationIdFor(session.sessionId, item.phase, item.methodId),
    "Invalid observation identity.");
    requireValid(item.source === (session.mode === "manual"
      ? "test-methods" : item.phase === "lab" ? "test-me-lab" : "test-me-match"),
    "Observation source disagrees with session mode/phase.");
    requireValid(item.phase !== "match" || labMethods.has(item.methodId),
      "Verification has no corresponding Lab observation.");
    requireValid(isRecord(item.context) && isRecord(item.protocol) &&
      nullableText(item.context.subject, EVIDENCE_LIMITS.subjectBytes) &&
      nullableText(item.context.topic, EVIDENCE_LIMITS.topicBytes) &&
      nullableText(item.context.exerciseTopic, EVIDENCE_LIMITS.topicBytes) &&
      nullableText(item.context.contentSetId, EVIDENCE_LIMITS.contentIdBytes) &&
      nullableText(item.context.contentVersion, EVIDENCE_LIMITS.versionBytes) &&
      nullableText(item.protocol.assessmentVersion, EVIDENCE_LIMITS.versionBytes) &&
      nullableText(item.protocol.scoringVersion, EVIDENCE_LIMITS.versionBytes),
    "Invalid observation context.");
    const questions = item.protocol.questions;
    if (questions !== null) {
      requireValid(Array.isArray(questions) && questions.length > 0 &&
        questions.length <= EVIDENCE_LIMITS.questionsPerObservation && questions.every(isRecord) &&
        new Set(questions.map(question => question.questionId)).size === questions.length &&
        questions.every(question => validText(question.questionId, EVIDENCE_LIMITS.questionIdBytes) &&
          (question.difficulty === null || ["easy", "medium", "hard"].includes(question.difficulty)) &&
          (question.offeredOptionCount === null || Number.isSafeInteger(question.offeredOptionCount) &&
            question.offeredOptionCount >= 2 && question.offeredOptionCount <= EVIDENCE_LIMITS.optionsPerQuestion) &&
          (question.offeredOptionIds === null || Array.isArray(question.offeredOptionIds) &&
            question.offeredOptionIds.length >= 2 && question.offeredOptionIds.length <= EVIDENCE_LIMITS.optionsPerQuestion &&
            question.offeredOptionIds.every((id: unknown) => validText(id, EVIDENCE_LIMITS.optionIdBytes)) &&
            new Set(question.offeredOptionIds).size === question.offeredOptionIds.length &&
            (question.offeredOptionCount === null ||
              question.offeredOptionIds.length === question.offeredOptionCount))),
      "Invalid question conditions.");
    }
    requireValid(isRecord(item.performance) && isRecord(item.selfReport), "Invalid observation results.");
    const { score, correct, total, timeSpentMs } = item.performance;
    requireValid(nullableNumber(score, 1) && nullableNumber(timeSpentMs), "Invalid performance value.");
    requireValid((correct === null || Number.isSafeInteger(correct) && correct >= 0) &&
      (total === null || Number.isSafeInteger(total) && total > 0) &&
      (correct === null || total === null || correct <= total),
    "Invalid question counts.");
    requireValid(score === null || correct === null || total === null ||
      Math.abs(score - correct / total) <= SCORE_ROUNDING_TOLERANCE, "Score disagrees with question counts.");
    requireValid(questions === null || total === null || questions.length === total,
      "Question conditions disagree with the scored question count.");
    requireValid([item.selfReport.confidence, item.selfReport.ease, item.selfReport.willingnessToUse]
      .every(nullableRating), "Invalid self-report rating.");
    const observationCompletedAt = normalizeEvidenceTimestamp(item.completedAt);
    requireValid(session.provenance.kind !== "native" || sessionCompletedAt === null ||
      observationCompletedAt === null || Date.parse(observationCompletedAt) <= Date.parse(sessionCompletedAt),
    "Observation completion exceeds session completion.");
    const signature = canonicalEvidence(copyLearningObservation(item));
    requireValid(!identities.has(item.observationId) || identities.get(item.observationId) === signature,
      `Conflicting observation: ${item.observationId}`);
    identities.set(item.observationId, signature);
  }
  requireValid(evidenceBytes(session) <= EVIDENCE_LIMITS.sessionBytes, "Completed evidence exceeds the session byte limit.");
}

/** Explicit whitelist also strips unrelated fields from stored/reconstructed data. */
export function copyLearningObservation(item: LearningObservation): LearningObservation {
  return {
    observationId: item.observationId, sessionId: item.sessionId,
    methodId: item.methodId, source: item.source, phase: item.phase,
    context: { subject: item.context.subject, topic: item.context.topic,
      exerciseTopic: item.context.exerciseTopic, contentSetId: item.context.contentSetId,
      contentVersion: item.context.contentVersion },
    protocol: { assessmentVersion: item.protocol.assessmentVersion, scoringVersion: item.protocol.scoringVersion,
      questions: item.protocol.questions === null ? null : item.protocol.questions.map(question => ({
        questionId: question.questionId, difficulty: question.difficulty, offeredOptionCount: question.offeredOptionCount,
        offeredOptionIds: question.offeredOptionIds === null ? null : [...question.offeredOptionIds]
      })).sort((a, b) => compareEvidenceIds(a.questionId, b.questionId)) },
    performance: { score: item.performance.score, correct: item.performance.correct,
      total: item.performance.total, timeSpentMs: item.performance.timeSpentMs },
    selfReport: { confidence: item.selfReport.confidence, ease: item.selfReport.ease,
      willingnessToUse: item.selfReport.willingnessToUse },
    completedAt: normalizeEvidenceTimestamp(item.completedAt)
  };
}

function freezeEvidence<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) freezeEvidence(item);
    Object.freeze(value);
  }
  return value;
}

/** Pure adapter shared by automatic and manual completion. Never reads services. */
export function createCompletedSessionEvidence(input: CompletedSessionInput): CompletedSessionEvidence {
  requireValid(Array.isArray(input?.methodLab?.experiments) && Array.isArray(input?.methodMatch?.methods) &&
    input.methodLab.experiments.length + input.methodMatch.methods.length <= EVIDENCE_LIMITS.observationsPerSession,
  "Invalid or oversized completion result lists.");
  requireValid(input.metadata === undefined || Array.isArray(input.metadata) &&
    input.metadata.length <= EVIDENCE_LIMITS.observationsPerSession, "Invalid or oversized observation metadata.");
  const metadata = new Map<string, ObservationMetadata>();
  const usedMetadata = new Set<string>();
  for (const item of input.metadata ?? []) {
    requireValid(isRecord(item) && (item.protocol?.questions == null ||
      Array.isArray(item.protocol.questions) && item.protocol.questions.length <= EVIDENCE_LIMITS.questionsPerObservation),
    "Invalid or oversized question metadata.");
    const key = observationIdFor(input.sessionId, item.phase, item.methodId);
    requireValid(!metadata.has(key), "Duplicate observation metadata.");
    metadata.set(key, item);
  }
  function observation(
    methodId: MethodId,
    phase: EvidencePhase,
    performance: LearningObservation["performance"],
    selfReport: LearningObservation["selfReport"]
  ): LearningObservation {
    const observationId = observationIdFor(input.sessionId, phase, methodId);
    const known = metadata.get(observationId);
    if (known) usedMetadata.add(observationId);
    requireValid(known?.matchCounts === undefined || isRecord(known.matchCounts), "Invalid Match counts.");
    return {
      observationId, sessionId: input.sessionId, methodId, phase,
      source: input.mode === "manual" ? "test-methods" :
        phase === "lab" ? "test-me-lab" : "test-me-match",
      context: {
        subject: known?.context?.subject ?? null,
        topic: known?.context?.topic ?? null,
        exerciseTopic: known?.context?.exerciseTopic ?? null,
        contentSetId: known?.context?.contentSetId ?? null,
        contentVersion: known?.context?.contentVersion ?? null
      },
      protocol: {
        assessmentVersion: known?.protocol?.assessmentVersion ?? null,
        scoringVersion: known?.protocol?.scoringVersion ?? null,
        questions: known?.protocol?.questions?.map(question => ({
          questionId: question.questionId, difficulty: question.difficulty,
          offeredOptionCount: question.offeredOptionCount,
          offeredOptionIds: question.offeredOptionIds === null ? null : [...question.offeredOptionIds]
        })) ?? null
      },
      performance: phase === "match" && known?.matchCounts
        ? { ...performance, correct: known.matchCounts.correct, total: known.matchCounts.total }
        : { ...performance },
      selfReport: { ...selfReport },
      completedAt: normalizeEvidenceTimestamp(known?.completedAt ?? null)
    };
  }
  const observations = [
    ...input.methodLab.experiments.map(result => observation(result.method, "lab", {
      score: result.score, correct: result.correct, total: result.total,
      timeSpentMs: result.timeSpentMs
    }, {
      confidence: result.confidence, ease: result.ease, willingnessToUse: result.willingnessToUse
    })),
    ...input.methodMatch.methods.map(result => observation(result.method, "match", {
      // firstScore repeats Lab and deliberately has no representation here.
      score: result.verificationScore, correct: null, total: null, timeSpentMs: result.timeSpentMs
    }, { confidence: result.confidence, ease: null, willingnessToUse: null }))
  ];
  requireValid(metadata.size === usedMetadata.size, "Metadata refers to an observation that was not completed.");
  const provenance = input.provenance ?? { kind: "native", recordId: null };
  const session: CompletedSessionEvidence = {
    schemaVersion: COMPLETED_SESSION_EVIDENCE_VERSION,
    status: "completed",
    sessionId: input.sessionId,
    originalSessionId: input.originalSessionId === undefined
      ? provenance.kind === "native" ? input.sessionId : null
      : input.originalSessionId,
    owner: input.owner.kind === "user" ? { kind: "user", uid: input.owner.uid }
      : { kind: "guest", scopeId: input.owner.scopeId },
    mode: input.mode, provenance: { kind: provenance.kind, recordId: provenance.recordId },
    completedAt: normalizeEvidenceTimestamp(input.completedAt ?? null),
    recordedAt: normalizeEvidenceTimestamp(input.recordedAt ?? null),
    selectionContext: input.selectionContext
      ? { kind: input.selectionContext.kind,
          nominatedMethodIds: [...input.selectionContext.nominatedMethodIds] }
      : { kind: input.mode === "manual" ? "manual" : "unknown", nominatedMethodIds: [] },
    preference: input.preference ? {
      methodId: input.preference.methodId, priority: input.preference.priority
    } : null,
    observations,
    limitations: [...new Set(input.limitations ?? [])].sort(compareEvidenceIds)
  };
  assertCompletedSessionEvidence(session);
  // Validation rejects conflicts before freezing; identical events collapse.
  const unique = new Map(observations.map(item => [item.observationId, copyLearningObservation(item)]));
  return freezeEvidence({ ...session, observations: [...unique.values()]
    .sort((a, b) => compareEvidenceIds(a.observationId, b.observationId)) });
}
