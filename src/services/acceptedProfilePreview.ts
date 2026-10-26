import { aggregateCompletedEvidence } from "../quiz/cumulativeProfile";
import { assertCompletedSessionEvidence, canonicalEvidence } from "../quiz/learningEvidence";
import type { CompletedSessionEvidence } from "../quiz/learningEvidence";
import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";
import type { ProfileRow } from "../quiz/cumulativeProfileView";
import { validateClientCompletionReceipt } from "./trainingCompletionReceipt";

export type AcceptedPreviewStatus = {
  kind: "accepted-evidence-preview"; authority: "NOT VERIFIED";
  source: "emulator-evidence" | "synthetic-fixture";
  publication: "not-published"; aggregation: "pending" | "unavailable";
  acceptedSessions: number; completeReadableHistory: boolean;
};
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Local presentation adapter only. Never writes, creates receipts, infers a
 * generation or turns acceptance order into completion chronology. */
export function buildAcceptedProfilePreview(uid: string, evidenceRows: readonly ProfileRow[], legacyRows: readonly ProfileRow[]) {
  const rows = new Map<string, ProfileRow>(), sessions = new Map<string, CompletedSessionEvidence>();
  const revisions = new Set<number>(); let epoch: number | null = null, invalid = false;
  for (const row of evidenceRows) {
    try {
      if (!record(row.data) || row.data.schemaVersion !== 1) throw new Error();
      const evidence = row.data.evidence; assertCompletedSessionEvidence(evidence);
      if (evidence.owner.kind !== "user" || evidence.owner.uid !== uid || evidence.provenance.kind !== "native" ||
        evidence.originalSessionId !== evidence.sessionId || typeof row.data.requestHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(row.data.requestHash)) throw new Error();
      const receipt = validateClientCompletionReceipt(row.data.receipt, { sessionId: evidence.sessionId,
        mode: evidence.mode, evidenceId: row.id, requestHash: row.data.requestHash }, "protected-v2");
      if (receipt.schemaVersion !== 2) throw new Error();
      const previous = rows.get(evidence.sessionId);
      if (previous) {
        if (previous.id !== row.id || canonicalEvidence(previous.data) !== canonicalEvidence(row.data)) throw new Error("conflict");
        continue;
      }
      if (epoch !== null && epoch !== receipt.lifecycleEpoch || revisions.has(receipt.acceptedRevision)) throw new Error("conflict");
      epoch = receipt.lifecycleEpoch; revisions.add(receipt.acceptedRevision);
      rows.set(evidence.sessionId, row); sessions.set(evidence.sessionId, evidence);
    } catch { invalid = true; }
  }
  // Conflicting/partial inputs must not acquire a plausible reconstructed total.
  const projection = aggregateCompletedEvidence({ kind: "user", uid }, [...sessions.values()]);
  const view = buildCumulativeProfileView(uid, { kind: "local-accepted-evidence-preview", profile: projection },
    [...rows.values()], legacyRows, { acceptedPreview: true });
  if (invalid) {
    view.warnings.push("Some accepted records are missing, malformed or conflicting. Preview totals and progress are unavailable; readable records are retained below.");
    view.summary = null; view.revision = null; view.progress = []; view.coverageComplete = false;
    view.automaticSessions = null; view.manualSessions = null;
  }
  return { ...view, preview: { kind: "accepted-evidence-preview", source: "emulator-evidence", authority: "NOT VERIFIED", publication: "not-published",
    aggregation: invalid ? "unavailable" : "pending", acceptedSessions: rows.size,
    completeReadableHistory: !invalid && view.coverageComplete } satisfies AcceptedPreviewStatus };
}
