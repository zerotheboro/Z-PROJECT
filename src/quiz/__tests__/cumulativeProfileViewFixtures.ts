import { buildCumulativeProfileView } from "../cumulativeProfileView";
import type { ProfileRow } from "../cumulativeProfileView";
import { aggregateCompletedEvidence } from "../cumulativeProfile";
import type { CompletedSessionEvidence } from "../learningEvidence";
import { evidenceOwner } from "./learningEvidenceFixtures";

export function savedEvidence(evidence: CompletedSessionEvidence, details?: unknown): ProfileRow {
  const id = `row-${evidence.sessionId}`;
  return { id, data: { schemaVersion: 1, evidence, requestHash: "a".repeat(64),
    ...(details ? { completionDetails: details } : {}),
    ...(evidence.provenance.kind === "native" ? { receipt: { schemaVersion: 1, status: "completed", sessionId: evidence.sessionId,
      mode: evidence.mode, evidenceId: id, profileRevision: 1, requestHash: "a".repeat(64),
      legacyAssessmentId: evidence.mode === "auto" ? evidence.sessionId : null } } : {}) } };
}
export function summaryFor(sessions: CompletedSessionEvidence[]) {
  return { persistenceVersion: 1, revision: 1, profile: aggregateCompletedEvidence(evidenceOwner, sessions) };
}
export function profileView(sessions: CompletedSessionEvidence[]) {
  return buildCumulativeProfileView(evidenceOwner.uid, summaryFor(sessions), sessions.map(s => savedEvidence(s)), []);
}
