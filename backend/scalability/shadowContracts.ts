import { parseAggregationCheckpoint } from "./controls";
import type { AggregationCheckpoint, AccountRevisionControl } from "./controls";
import { parseAcceptanceCheckpoint } from "./acceptanceBatches";
import type { AcceptanceCheckpoint } from "./acceptanceBatches";
import { parseJournalAnchor } from "./journal";
import type { JournalAnchor } from "./journal";
import { generationIdentity } from "./generations";
import { bounded, hash, integer, object, requireContract, timestamp, typedHash } from "./values";

export const SHADOW_LIMITS = Object.freeze({ pageRecords: 20, pageBytes: 256 * 1024,
  transactionBytes: 2 * 1024 * 1024, transactionWrites: 12, attempts: 3,
  leaseMs: 120_000, headChangeBackoffMs: 4_000 });
export type ShadowPin = Readonly<{ source: JournalAnchor; checkpoint: AcceptanceCheckpoint;
  admissionDigest: string; bootstrapDigest: string; readTime: { seconds: number; nanoseconds: number };
  aggregationVersion: string; executionVersion: string }>;
export type ShadowJob = Readonly<{ schemaVersion: 1; pin: ShadowPin; checkpoint: AggregationCheckpoint;
  state: "working" | "ready" | "blocked" | "retry" | "reschedule"; error: string | null; attempts: number;
  retryAt: string | null; verification: null | { status: "trusted-source-shadow-verified";
    asOf: { seconds: number; nanoseconds: number }; inventoryDigest: string; manifestHash: string;
    nativeAcceptedCount: number; publicationAuthorized: false; stage1Authority: "NOT VERIFIED" } }>;

export function parseReadTime(value: unknown): { seconds: number; nanoseconds: number } {
  const data = object(value, ["seconds", "nanoseconds"]);
  integer(data.seconds); integer(data.nanoseconds);
  requireContract(data.nanoseconds < 1_000_000_000, "invalid_read_time");
  return data as { seconds: number; nanoseconds: number };
}
export function parseShadowPin(value: unknown): ShadowPin {
  const data = object(value, ["source", "checkpoint", "admissionDigest", "bootstrapDigest", "readTime", "aggregationVersion", "executionVersion"]);
  const source = parseJournalAnchor(data.source), checkpoint = parseAcceptanceCheckpoint(data.checkpoint);
  requireContract(source.uid === checkpoint.uid && source.lifecycleEpoch === checkpoint.lifecycleEpoch &&
    source.revision === checkpoint.headRevision && source.headHash === checkpoint.headHash, "shadow_pin_mismatch");
  hash(data.admissionDigest); hash(data.bootstrapDigest); parseReadTime(data.readTime);
  generationIdentity(source, data.aggregationVersion as string, data.executionVersion as string);
  return data as unknown as ShadowPin;
}
export function parseShadowJob(value: unknown): ShadowJob {
  const data = object(value, ["schemaVersion", "pin", "checkpoint", "state", "error", "attempts", "retryAt", "verification"]);
  const pin = parseShadowPin(data.pin), checkpoint = parseAggregationCheckpoint(data.checkpoint);
  requireContract(data.schemaVersion === 1 && ["working", "ready", "blocked", "retry", "reschedule"].some(state => state === data.state), "invalid_shadow_job");
  requireContract(checkpoint.uid === pin.source.uid && checkpoint.lifecycleEpoch === pin.source.lifecycleEpoch &&
    checkpoint.sourceRevision === pin.source.revision && checkpoint.sourceHeadHash === pin.source.headHash &&
    checkpoint.aggregationVersion === pin.aggregationVersion && checkpoint.executionVersion === pin.executionVersion, "shadow_pin_mismatch");
  if (checkpoint.cursor.stage === "journal") requireContract(checkpoint.cursor.processedCount <= pin.checkpoint.ordinal &&
    checkpoint.cursor.afterKey === (checkpoint.cursor.processedCount === 0 ? null : String(checkpoint.cursor.processedCount).padStart(16, "0")), "shadow_cursor_invalid");
  integer(data.attempts);
  if (data.error !== null) requireContract(typeof data.error === "string" && /^[a-z0-9_-]{1,100}$/.test(data.error), "invalid_shadow_error");
  if (data.retryAt !== null) timestamp(data.retryAt);
  // A scheduling outcome is never a verified generation or an integrity retry.
  // The unchanged pin/artifacts are retained; only a later claim creates a new pin.
  if (data.state === "reschedule") requireContract(data.error === "shadow_head_changed_retry" &&
    data.retryAt !== null && data.verification === null && checkpoint.phase === "queued" &&
    checkpoint.lease === null, "invalid_shadow_reschedule");
  if (data.verification !== null) {
    const verified = object(data.verification, ["status", "asOf", "inventoryDigest", "manifestHash", "nativeAcceptedCount", "publicationAuthorized", "stage1Authority"]);
    parseReadTime(verified.asOf); hash(verified.inventoryDigest); hash(verified.manifestHash); integer(verified.nativeAcceptedCount);
    requireContract(verified.status === "trusted-source-shadow-verified" && verified.publicationAuthorized === false &&
      verified.stage1Authority === "NOT VERIFIED" && verified.nativeAcceptedCount === pin.checkpoint.ordinal &&
      verified.manifestHash === checkpoint.manifestHash && checkpoint.phase === "ready" && data.state === "ready", "invalid_shadow_verification");
  }
  requireContract(data.state !== "ready" || data.verification !== null, "shadow_not_verified");
  return bounded(data, SHADOW_LIMITS.pageBytes) as unknown as ShadowJob;
}

/** A string claiming head growth is NOT proof. Only the worker's private,
 * server-verified scheduling outcome can bypass the failure-attempt budget. */
export function classifyShadowFailureCode(code: unknown): "transient" | "fenced" | "integrity" {
  if (code === "stale_worker_fence") return "fenced";
  return [4, 8, 10, 13, 14, "4", "8", "10", "13", "14"].some(value => value === code) ? "transient" : "integrity";
}
export function newShadowJob(pinValue: ShadowPin, fence: number): ShadowJob {
  const pin = parseShadowPin(pinValue);
  return parseShadowJob({ schemaVersion: 1, pin, state: "working", error: null, attempts: 0, retryAt: null, verification: null,
    checkpoint: { schemaVersion: 1, uid: pin.source.uid, lifecycleEpoch: pin.source.lifecycleEpoch,
      generationId: generationIdentity(pin.source, pin.aggregationVersion, pin.executionVersion),
      sourceRevision: pin.source.revision, sourceHeadHash: pin.source.headHash, targetRevision: pin.source.revision,
      aggregationVersion: pin.aggregationVersion, executionVersion: pin.executionVersion,
      phase: "queued", lease: null, checkpointSequence: 0, fencingToken: fence,
      cursor: { stage: "journal", afterKey: null, processedCount: 0 }, manifestHash: null } });
}
export function shadowPin(control: AccountRevisionControl, checkpoint: unknown, admission: Record<string, unknown>, readTime: unknown): ShadowPin {
  return parseShadowPin({ source: { uid: control.uid, lifecycleEpoch: control.lifecycleEpoch,
    revision: control.headRevision, headHash: control.headHash }, checkpoint,
    admissionDigest: typedHash("stage2-admission-v1", admission), bootstrapDigest: (admission.bootstrap as Record<string, unknown>).bootstrapDigest,
    readTime, aggregationVersion: control.desiredAggregationVersion, executionVersion: control.desiredExecutionVersion });
}
