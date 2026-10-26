import {
  createCompletedSessionEvidence,
  EvidenceValidationError,
  isEvidenceMethodId,
  normalizeEvidenceTimestamp
} from "./learningEvidence";

import type { CompletedSessionEvidence, CompletedSessionInput, EvidenceRecordLimitation } from "./learningEvidence";
import type { ReflectionPriority } from "./type";

export type LegacyEvidenceAdaptation =
  | { readonly valid: true; readonly session: CompletedSessionEvidence; readonly warnings: readonly string[] }
  | { readonly valid: false; readonly reason: string };

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new EvidenceValidationError("Expected a stored assessment object.");
  }
  return value as Record<string, unknown>;
}

function numberOrUnknown(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number") throw new EvidenceValidationError("Invalid historical numeric value.");
  return value;
}

function methodId(value: unknown) {
  if (!isEvidenceMethodId(value)) throw new EvidenceValidationError("Unknown historical method ID.");
  return value;
}

// Do not import Firebase or call timestamp methods on untrusted objects.
function timestamp(value: unknown, warnings: EvidenceRecordLimitation[]): string | null {
  let milliseconds = Number.NaN;
  if (typeof value === "string") {
    try { return normalizeEvidenceTimestamp(value); }
    catch {
      warnings.push(/^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(value) && !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)
        ? "legacy-timestamp-ambiguous" : "legacy-timestamp-unreadable");
      return null;
    }
  }
  else if (value instanceof Date) milliseconds = value.getTime();
  else if (typeof value === "object" && value !== null && "seconds" in value &&
    typeof value.seconds === "number" && Number.isSafeInteger(value.seconds) &&
    "nanoseconds" in value && typeof value.nanoseconds === "number" &&
    Number.isInteger(value.nanoseconds) && value.nanoseconds >= 0 && value.nanoseconds < 1e9) {
    milliseconds = value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6);
  }
  if (Number.isFinite(milliseconds) && Math.abs(milliseconds) <= 8.64e15) return new Date(milliseconds).toISOString();
  if (value !== undefined && value !== null) warnings.push("legacy-timestamp-unreadable");
  return null;
}

/**
 * In-memory adaptation only. The caller supplies ownership from the record's
 * path. A document ID/createdAt alone never establishes session identity,
 * subject, difficulty, content version, or method completion time.
 */
export function adaptLegacyAutomaticAssessment({
  ownerUid,
  assessmentId,
  assessment,
  knownSessionId
}: {
  readonly ownerUid: string;
  readonly assessmentId: string;
  readonly assessment: unknown;
  // Only supply a separately established linkage, never guess from the ID.
  readonly knownSessionId?: string;
}): LegacyEvidenceAdaptation {
  try {
    const saved = record(assessment);
    if (!assessmentId.trim() || !ownerUid.trim()) {
      throw new EvidenceValidationError("Missing historical record identity/owner.");
    }
    if (saved.status !== undefined && saved.status !== "completed") {
      throw new EvidenceValidationError("The historical assessment is unfinished.");
    }
    const warnings: EvidenceRecordLimitation[] = [];
    if (saved.status === undefined) warnings.push("legacy-status-absent");
    const labs = record(saved.methodLab).experiments;
    if (!Array.isArray(labs) || labs.length === 0) {
      throw new EvidenceValidationError("No historical Lab observations are available.");
    }
    const methodLab: CompletedSessionInput["methodLab"] = {
      experiments: labs.map(value => {
        const item = record(value);
        return {
          method: methodId(item.method),
          score: numberOrUnknown(item.score),
          correct: numberOrUnknown(item.correct),
          total: numberOrUnknown(item.total),
          timeSpentMs: numberOrUnknown(item.timeSpentMs),
          confidence: numberOrUnknown(item.confidence),
          ease: numberOrUnknown(item.ease),
          willingnessToUse: numberOrUnknown(item.willingnessToUse)
        };
      })
    };
    const matches = saved.methodMatch === undefined || saved.methodMatch === null
      ? [] : record(saved.methodMatch).methods;
    if (!Array.isArray(matches)) throw new EvidenceValidationError("Invalid historical verification list.");
    if (matches.length === 0) warnings.push("legacy-verification-absent");
    const methodMatch: CompletedSessionInput["methodMatch"] = {
      methods: matches.map(value => {
        const item = record(value);
        return {
          method: methodId(item.method),
          verificationScore: numberOrUnknown(item.verificationScore),
          confidence: numberOrUnknown(item.confidence),
          timeSpentMs: numberOrUnknown(item.timeSpentMs)
        };
      })
    };
    let preference: CompletedSessionEvidence["preference"] = null;
    if (saved.reflection !== undefined && saved.reflection !== null) {
      const reflection = record(saved.reflection);
      const priority = reflection.priority;
      if (priority !== undefined && priority !== null &&
        !["performance", "ease", "confidence", "realistic-use"].includes(String(priority))) {
        throw new EvidenceValidationError("Invalid historical reflection priority.");
      }
      preference = {
        methodId: reflection.preferredMethod == null ? null : methodId(reflection.preferredMethod),
        priority: priority == null ? null : priority as ReflectionPriority
      };
    }
    const completedAt = timestamp(saved.completedAt, warnings);
    const recordedAt = timestamp(saved.createdAt, warnings);
    const session = createCompletedSessionEvidence({
      sessionId: knownSessionId ?? `legacy-assessment:${encodeURIComponent(assessmentId)}`,
      originalSessionId: knownSessionId ?? null,
      owner: { kind: "user", uid: ownerUid }, mode: "auto",
      provenance: { kind: "legacy-assessment", recordId: assessmentId },
      completedAt, recordedAt, methodLab, methodMatch, preference,
      selectionContext: { kind: "unknown", nominatedMethodIds: [] },
      limitations: [...new Set(warnings)].sort()
    });
    // No root learningProfile/evidenceScore, Baseline score, AI nomination,
    // or Match.firstScore is converted into an additional observation.
    return { valid: true, session, warnings: [...new Set(warnings)] };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : "Invalid historical assessment." };
  }
}
