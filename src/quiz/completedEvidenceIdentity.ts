import {
  assertCompletedSessionEvidence, canonicalEvidence, compareEvidenceIds,
  copyLearningObservation, evidenceOwnerKey, EvidenceValidationError,
  normalizeEvidenceTimestamp, observationIdFor, evidenceBytes
} from "./learningEvidence";
import type { CompletedSessionEvidence, EvidenceOwner } from "./learningEvidence";

/** Owner must come from a trusted caller/path. This key is not authorization. */
export function completedEvidenceSourceKey(session: CompletedSessionEvidence): string {
  return canonicalEvidence([evidenceOwnerKey(session.owner), session.provenance.kind,
    session.provenance.kind === "legacy-assessment" ? session.provenance.recordId : session.sessionId]);
}

function normalized(session: CompletedSessionEvidence): CompletedSessionEvidence {
  assertCompletedSessionEvidence(session);
  const observations = new Map(session.observations.map(item => [item.observationId, copyLearningObservation(item)]));
  return {
    schemaVersion: session.schemaVersion, status: session.status,
    sessionId: session.sessionId, originalSessionId: session.originalSessionId,
    owner: session.owner.kind === "user" ? { kind: "user", uid: session.owner.uid }
      : { kind: "guest", scopeId: session.owner.scopeId }, mode: session.mode,
    provenance: { kind: session.provenance.kind, recordId: session.provenance.recordId },
    completedAt: normalizeEvidenceTimestamp(session.completedAt),
    recordedAt: normalizeEvidenceTimestamp(session.recordedAt),
    selectionContext: { kind: session.selectionContext.kind,
      nominatedMethodIds: [...new Set(session.selectionContext.nominatedMethodIds)].sort(compareEvidenceIds) },
    preference: session.preference === null ? null : {
      methodId: session.preference.methodId, priority: session.preference.priority
    },
    limitations: [...new Set(session.limitations ?? [])].sort(compareEvidenceIds),
    observations: [...observations.values()].sort((a, b) => compareEvidenceIds(a.observationId, b.observationId))
  };
}

function historicalPayload(session: CompletedSessionEvidence): string {
  // Only identity fields may vary across aliases of the same source record.
  return canonicalEvidence({ ...session, sessionId: null, originalSessionId: null,
    observations: session.observations.map(item => ({ ...item, observationId: null, sessionId: null })) });
}

/** Resolve aliases before counters/exposures. Never chooses a conflicting input. */
export function normalizeCompletedEvidence(
  owner: EvidenceOwner, evidence: readonly CompletedSessionEvidence[]
): CompletedSessionEvidence[] {
  const ownerKey = evidenceOwnerKey(owner);
  const bySource = new Map<string, CompletedSessionEvidence>();
  for (const value of evidence) {
    const session = normalized(value);
    if (evidenceOwnerKey(session.owner) !== ownerKey) {
      throw new EvidenceValidationError("Cannot aggregate evidence belonging to another owner.");
    }
    const key = completedEvidenceSourceKey(session);
    const existing = bySource.get(key);
    if (!existing) { bySource.set(key, session); continue; }
    if (session.provenance.kind === "native") {
      if (canonicalEvidence(existing) !== canonicalEvidence(session)) {
        throw new EvidenceValidationError(`Conflicting completed session: ${session.sessionId}`);
      }
      continue;
    }
    if (historicalPayload(existing) !== historicalPayload(session)) {
      throw new EvidenceValidationError(`Conflicting historical source: ${session.provenance.recordId}`);
    }
    if (existing.originalSessionId !== null && session.originalSessionId !== null &&
      existing.originalSessionId !== session.originalSessionId) {
      throw new EvidenceValidationError(`Incompatible historical session linkage: ${session.provenance.recordId}`);
    }
    // Preserve separately established linkage regardless of import order.
    const sessionId = existing.originalSessionId ?? session.originalSessionId ?? existing.sessionId;
    bySource.set(key, { ...existing, sessionId,
      originalSessionId: existing.originalSessionId ?? session.originalSessionId,
      observations: existing.observations.map(item => ({ ...item, sessionId,
        observationId: observationIdFor(sessionId, item.phase, item.methodId) })) });
  }
  const claims = new Set<string>();
  for (const session of bySource.values()) {
    if (claims.has(session.sessionId)) {
      throw new EvidenceValidationError(`Different sources claim the same completed session: ${session.sessionId}`);
    }
    claims.add(session.sessionId);
    assertCompletedSessionEvidence(session);
  }
  return [...bySource.values()].sort((a, b) => compareEvidenceIds(completedEvidenceSourceKey(a), completedEvidenceSourceKey(b)));
}

export const EVIDENCE_HISTORY_LIMITS = Object.freeze({ defaultPageRecords: 10, pageRecords: 20, pageBytes: 256 * 1024 });

/** Offline pagination over the same immutable snapshot. No database reads/writes. */
export function pageCompletedEvidenceHistory(
  owner: EvidenceOwner, evidence: readonly CompletedSessionEvidence[],
  options: { readonly afterSourceKey?: string; readonly limit?: number } = {}
) {
  const limit = options.limit ?? EVIDENCE_HISTORY_LIMITS.defaultPageRecords;
  if (!Number.isInteger(limit) || limit < 1 || limit > EVIDENCE_HISTORY_LIMITS.pageRecords) {
    throw new EvidenceValidationError("Invalid history page limit.");
  }
  const all = normalizeCompletedEvidence(owner, evidence);
  const previous = options.afterSourceKey === undefined ? -1 : all.findIndex(session =>
    completedEvidenceSourceKey(session) === options.afterSourceKey);
  if (options.afterSourceKey !== undefined && previous < 0) {
    throw new EvidenceValidationError("History cursor does not belong to this owner's snapshot.");
  }
  const records: CompletedSessionEvidence[] = [];
  let index = previous + 1;
  const safeOwner: EvidenceOwner = owner.kind === "user" ? { kind: "user", uid: owner.uid }
    : { kind: "guest", scopeId: owner.scopeId };
  const result = () => ({ owner: safeOwner, records, totalRecordCount: all.length,
    nextSourceKey: index < all.length && records.length ? completedEvidenceSourceKey(records[records.length - 1]) : null });
  while (index < all.length && records.length < limit) {
    records.push(all[index++]);
    if (evidenceBytes(result()) > EVIDENCE_HISTORY_LIMITS.pageBytes) { records.pop(); index--; break; }
  }
  if (index < all.length && records.length === 0) throw new EvidenceValidationError("Evidence cannot fit in a history page.");
  return result();
}
