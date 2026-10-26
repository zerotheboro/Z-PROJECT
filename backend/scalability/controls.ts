import { parseJournalAnchor } from "./journal";
import { CONTRACT_LIMITS, bounded, hash, integer, nextRevision, object, requireContract, text, timestamp, typedHash } from "./values";

export type PublishedProfileStatus = Readonly<{
  generationId: string; revision: number; journalHash: string | null; nativeAcceptedCount: number;
  generationHash: string; aggregationVersion: string; executionVersion: string;
}>;
export type AccountRevisionControl = Readonly<{
  schemaVersion: 1; uid: string; lifecycleEpoch: number; lifecycle: "active" | "deleting";
  headRevision: number; headHash: string | null; nativeAcceptedCount: number;
  published: PublishedProfileStatus | null; desiredAggregationVersion: string; desiredExecutionVersion: string;
}>;
export type AggregationCheckpoint = Readonly<{
  schemaVersion: 1; uid: string; lifecycleEpoch: number; generationId: string;
  sourceRevision: number; sourceHeadHash: string | null; targetRevision: number;
  aggregationVersion: string; executionVersion: string;
  phase: "queued" | "building" | "verifying" | "ready" | "failed";
  lease: Readonly<{ workerId: string; fence: number; expiresAt: string }> | null;
  checkpointSequence: number; fencingToken: number;
  cursor: Readonly<{ stage: "journal" | "sources" | "artifacts"; afterKey: string | null; processedCount: number }>;
  manifestHash: string | null;
}>;
export function parsePublishedProfileStatus(value: unknown): PublishedProfileStatus {
  const data = object(value, ["generationId", "revision", "journalHash", "nativeAcceptedCount", "generationHash", "aggregationVersion", "executionVersion"]);
  hash(data.generationId); hash(data.generationHash); integer(data.revision); integer(data.nativeAcceptedCount);
  requireContract(data.nativeAcceptedCount <= data.revision);
  if (data.revision === 0) requireContract(data.journalHash === null); else hash(data.journalHash);
  text(data.aggregationVersion, 64); text(data.executionVersion, 64);
  return data as unknown as PublishedProfileStatus;
}
export function parseAccountRevisionControl(value: unknown): AccountRevisionControl {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "lifecycle", "headRevision", "headHash", "nativeAcceptedCount",
    "published", "desiredAggregationVersion", "desiredExecutionVersion"]);
  requireContract(data.schemaVersion === 1 && (data.lifecycle === "active" || data.lifecycle === "deleting"));
  parseJournalAnchor({ uid: data.uid, lifecycleEpoch: data.lifecycleEpoch, revision: data.headRevision, headHash: data.headHash });
  integer(data.nativeAcceptedCount); requireContract(data.nativeAcceptedCount <= Number(data.headRevision));
  text(data.desiredAggregationVersion, 64); text(data.desiredExecutionVersion, 64);
  if (data.published !== null) {
    const published = parsePublishedProfileStatus(data.published);
    requireContract(published.revision <= Number(data.headRevision) && published.nativeAcceptedCount <= data.nativeAcceptedCount &&
      (published.revision !== data.headRevision || published.journalHash === data.headHash && published.nativeAcceptedCount === data.nativeAcceptedCount), "invalid_publication_status");
    requireContract(published.generationId === typedHash("profile-generation-v1", {
      source: { uid: data.uid, lifecycleEpoch: data.lifecycleEpoch, revision: published.revision, headHash: published.journalHash },
      aggregationVersion: published.aggregationVersion, executionVersion: published.executionVersion }), "generation_identity_mismatch");
  }
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as AccountRevisionControl;
}
export function parseAggregationCheckpoint(value: unknown): AggregationCheckpoint {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "generationId", "sourceRevision", "sourceHeadHash", "targetRevision",
    "aggregationVersion", "executionVersion", "phase", "lease", "checkpointSequence", "fencingToken", "cursor", "manifestHash"]);
  requireContract(data.schemaVersion === 1);
  parseJournalAnchor({ uid: data.uid, lifecycleEpoch: data.lifecycleEpoch, revision: data.sourceRevision, headHash: data.sourceHeadHash });
  hash(data.generationId); integer(data.targetRevision); requireContract(data.targetRevision >= Number(data.sourceRevision));
  text(data.aggregationVersion, 64); text(data.executionVersion, 64); integer(data.checkpointSequence); integer(data.fencingToken);
  requireContract(typeof data.phase === "string" && ["queued", "building", "verifying", "ready", "failed"].includes(data.phase));
  const cursor = object(data.cursor, ["stage", "afterKey", "processedCount"]);
  requireContract(typeof cursor.stage === "string" && ["journal", "sources", "artifacts"].includes(cursor.stage)); integer(cursor.processedCount);
  if (cursor.afterKey !== null) text(cursor.afterKey, 512);
  if (data.lease !== null) {
    const lease = object(data.lease, ["workerId", "fence", "expiresAt"]);
    text(lease.workerId, 128); integer(lease.fence, 1); timestamp(lease.expiresAt);
    requireContract(lease.fence === data.fencingToken, "stale_worker_fence");
  }
  requireContract(data.phase === "queued" || data.phase === "failed" || data.lease !== null, "missing_lease");
  requireContract(data.phase !== "queued" || data.lease === null, "queued_job_has_lease");
  if (data.manifestHash !== null) hash(data.manifestHash);
  requireContract(data.phase !== "ready" || data.manifestHash !== null, "incomplete_checkpoint");
  requireContract(data.phase !== "ready" || cursor.stage === "artifacts", "incomplete_checkpoint");
  requireContract(data.generationId === typedHash("profile-generation-v1", {
    source: { uid: data.uid, lifecycleEpoch: data.lifecycleEpoch, revision: data.sourceRevision, headHash: data.sourceHeadHash },
    aggregationVersion: data.aggregationVersion, executionVersion: data.executionVersion }), "generation_identity_mismatch");
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as AggregationCheckpoint;
}
/** Pure proposal only; a future transaction must CAS against the previous
 * persisted token. The counter survives an absent or expired lease. */
export function proposeCheckpointLease(value: unknown, workerId: string, now: string, expiresAt: string): AggregationCheckpoint {
  const job = parseAggregationCheckpoint(value); text(workerId, 128); timestamp(now); timestamp(expiresAt);
  requireContract(now < expiresAt && (!job.lease || job.lease.expiresAt <= now) && job.phase !== "failed", "lease_unavailable");
  const fencingToken = nextRevision(job.fencingToken);
  return parseAggregationCheckpoint({ ...job, phase: job.phase === "queued" ? "building" : job.phase,
    fencingToken, checkpointSequence: nextRevision(job.checkpointSequence), lease: { workerId, fence: fencingToken, expiresAt } });
}
/** Caller supplies the trusted current checkpoint and clock; no lease acquisition
 * or write occurs. A later transaction must compare the same token/sequence. */
export function verifyCheckpointAdvance(previousValue: unknown, nextValue: unknown, now: string): AggregationCheckpoint {
  const previous = parseAggregationCheckpoint(previousValue), next = parseAggregationCheckpoint(nextValue); timestamp(now);
  requireContract(previous.uid === next.uid && previous.lifecycleEpoch === next.lifecycleEpoch &&
    previous.generationId === next.generationId && previous.sourceRevision === next.sourceRevision &&
    previous.sourceHeadHash === next.sourceHeadHash && previous.aggregationVersion === next.aggregationVersion &&
    previous.executionVersion === next.executionVersion, "checkpoint_scope_mismatch");
  requireContract(previous.lease !== null && next.lease !== null && previous.lease.fence === next.lease.fence &&
    previous.fencingToken === next.fencingToken && previous.lease.workerId === next.lease.workerId && previous.lease.expiresAt === next.lease.expiresAt &&
    now < previous.lease.expiresAt, "stale_worker_fence");
  const order = ["building", "verifying", "ready"];
  requireContract(order.includes(previous.phase) && order.includes(next.phase) &&
    order.indexOf(next.phase) >= order.indexOf(previous.phase) && order.indexOf(next.phase) <= order.indexOf(previous.phase) + 1 &&
    previous.checkpointSequence < Number.MAX_SAFE_INTEGER && next.checkpointSequence === previous.checkpointSequence + 1 &&
    next.targetRevision >= previous.targetRevision, "checkpoint_regression");
  const stages = ["journal", "sources", "artifacts"];
  const before = stages.indexOf(previous.cursor.stage), after = stages.indexOf(next.cursor.stage);
  // Each stage has its own cursor/count. A reset is permitted ONLY on entry to
  // the immediately following stage, at its untouched (null, 0) starting cursor.
  requireContract(before >= 0 && after >= 0 && after >= before && after <= before + 1 &&
    (after === before || next.cursor.afterKey === null && next.cursor.processedCount === 0) &&
    (next.cursor.stage !== previous.cursor.stage || next.cursor.processedCount >= previous.cursor.processedCount &&
      (previous.cursor.afterKey === null || next.cursor.afterKey !== null && next.cursor.afterKey >= previous.cursor.afterKey)), "cursor_regression");
  requireContract(previous.manifestHash === null || previous.manifestHash === next.manifestHash, "manifest_changed");
  return next;
}
export function publicationLag(value: unknown) {
  const control = parseAccountRevisionControl(value);
  return Object.freeze({ published: control.published !== null,
    pendingRevisions: control.headRevision - (control.published?.revision ?? 0),
    newlyAcceptedCompletionsPending: control.nativeAcceptedCount - (control.published?.nativeAcceptedCount ?? 0),
    // This count is NOT the number of new canonical sessions: aliases may merge.
    canonicalSessionIncrease: "unknown" as const });
}
