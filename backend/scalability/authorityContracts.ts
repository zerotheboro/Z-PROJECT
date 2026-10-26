import { bounded, hash, integer, nextRevision, object, requireContract } from "./values";
import { trainingOwnerUID } from "./ownerUID";

export const AUTHORITY_PROTOCOL = "stage4a-protection-only-v1" as const;
export const AUTHORITY_WRITER = "stage4a-isolated-coordinator-v1" as const;
export const SOURCE_NAMESPACE_VERSION = "training-source-catalog-v1" as const;
export const LIFECYCLE_COLLECTION = "trainingLifecycleAuthorities" as const;
const PROBE_EVENTS = 100, DELETION_EVENTS = 2;
export const AUTHORITY_LIMITS = Object.freeze({ scanDocuments: 200, scanDepth: 12,
  probeEvents: PROBE_EVENTS, deletionEvents: DELETION_EVENTS, events: PROBE_EVENTS + DELETION_EVENTS, probeBytes: 32 * 1024 });
export const SOURCE_CATALOG = Object.freeze({
  assessments: "historical-performance", quizAttempts: "historical-unclassified-learning",
  learningEvidence: "immutable-performance", learningEvidenceIdentityEvents: "identity-history",
  learningEvidenceSourceIndex: "identity-index", learningProfiles: "profile-journal-archive-generation",
  trainingProgress: "unfinished-work", trainingActivity: "historical-activity", trainingStats: "historical-streak",
  trainingReservations: "preserved-reservations", trainingUsage: "preserved-quota",
  entitlements: "preserved-entitlements", aiRecommendations: "preserved-selection-context"
} as const);
export type Lifecycle = Readonly<{
  schemaVersion: 1; uid: string; lifecycleEpoch: number; state: "active" | "deleting" | "deleted";
  writerProtocol: typeof AUTHORITY_PROTOCOL; writerIdentity: typeof AUTHORITY_WRITER;
  namespaceVersion: typeof SOURCE_NAMESPACE_VERSION; admissionEligibility: "NOT VERIFIED";
  rootBinding: string; rootCreatedAt: { seconds: number; nanoseconds: number };
  fence: number; revision: number; headHash: string | null;
}>;
export type WriterContext = Pick<Lifecycle, "uid" | "lifecycleEpoch" | "writerProtocol" | "namespaceVersion" | "fence" | "revision">;
export type StoredLifecycle = Omit<Lifecycle, "rootCreatedAt">;
export type AuthorityEventKind = "source" | "deleting" | "deleted";
const STORED_KEYS = ["schemaVersion", "uid", "lifecycleEpoch", "state", "writerProtocol", "writerIdentity", "namespaceVersion",
  "admissionEligibility", "rootBinding", "fence", "revision", "headHash"] as const;
export function ownerUID(value: unknown): asserts value is string {
  trainingOwnerUID(value);
}
/** Persisted fields can and MUST be validated before initial protection starts
 * a write transaction. Creation metadata is deliberately not a stored field. */
export function parseStoredLifecycle(value: unknown): StoredLifecycle {
  const data = object(value, STORED_KEYS);
  ownerUID(data.uid); integer(data.lifecycleEpoch, 1); integer(data.fence, 1); integer(data.revision);
  hash(data.rootBinding);
  requireContract(data.schemaVersion === 1 && ["active", "deleting", "deleted"].some(state => state === data.state) &&
    data.writerProtocol === AUTHORITY_PROTOCOL && data.writerIdentity === AUTHORITY_WRITER &&
    data.namespaceVersion === SOURCE_NAMESPACE_VERSION && data.admissionEligibility === "NOT VERIFIED", "authority_protocol_invalid");
  const transitions = data.state === "active" ? 0 : data.state === "deleting" ? 1 : 2;
  requireContract(data.fence === 1 + transitions && data.revision >= transitions &&
    data.revision <= AUTHORITY_LIMITS.probeEvents + transitions, "authority_state_invalid");
  if (data.revision === 0) requireContract(data.headHash === null, "authority_state_invalid");
  else hash(data.headHash);
  return bounded(data, 16 * 1024) as unknown as StoredLifecycle;
}
export function parseLifecycle(value: unknown): Lifecycle {
  const data = object(value, [...STORED_KEYS, "rootCreatedAt"]);
  const { rootCreatedAt, ...stored } = data;
  const core = parseStoredLifecycle(stored);
  const at = object(rootCreatedAt, ["seconds", "nanoseconds"]); integer(at.seconds); integer(at.nanoseconds);
  requireContract(at.nanoseconds < 1_000_000_000, "authority_invalid_time");
  return bounded(Object.freeze({ ...core, rootCreatedAt: at }), 16 * 1024) as unknown as Lifecycle;
}
/** At most 100 immutable sources + exactly the two legal lifecycle events.
 * Probe writes cannot occupy either reserved slot, including during SDK retries.
 * Old valid <=100-event ledgers remain readable without rewriting any event. */
export function advanceLifecycle(value: Lifecycle, kind: AuthorityEventKind, eventHash: string): StoredLifecycle {
  const life = parseLifecycle(value); hash(eventHash);
  requireContract(kind === "source" || kind === "deleting" || kind === "deleted", "authority_transition_invalid");
  requireContract(kind === "deleted" ? life.state === "deleting" : life.state === "active", "authority_transition_invalid");
  const revision = nextRevision(life.revision);
  const maximum = kind === "source" ? AUTHORITY_LIMITS.probeEvents :
    kind === "deleting" ? AUTHORITY_LIMITS.probeEvents + 1 : AUTHORITY_LIMITS.events;
  requireContract(revision <= maximum, "authority_prototype_capacity");
  const { rootCreatedAt: _metadata, ...stored } = life;
  return parseStoredLifecycle({ ...stored, revision, headHash: eventHash,
    ...(kind === "source" ? {} : { state: kind, fence: nextRevision(life.fence) }) });
}
export function parseWriterContext(value: unknown): WriterContext {
  const data = object(value, ["uid", "lifecycleEpoch", "writerProtocol", "namespaceVersion", "fence", "revision"]);
  ownerUID(data.uid);
  integer(data.lifecycleEpoch, 1); integer(data.fence, 1); integer(data.revision);
  requireContract(data.writerProtocol === AUTHORITY_PROTOCOL && data.namespaceVersion === SOURCE_NAMESPACE_VERSION, "authority_writer_incompatible");
  return data as unknown as WriterContext;
}
export function writerContext(value: Lifecycle): WriterContext {
  return parseWriterContext({ uid: value.uid, lifecycleEpoch: value.lifecycleEpoch, writerProtocol: value.writerProtocol,
    namespaceVersion: value.namespaceVersion, fence: value.fence, revision: value.revision });
}
export function assertWriterContext(lifecycle: Lifecycle, value: unknown): void {
  const context = parseWriterContext(value);
  requireContract(context.uid === lifecycle.uid && context.lifecycleEpoch === lifecycle.lifecycleEpoch && context.fence === lifecycle.fence &&
    context.revision === lifecycle.revision, "authority_stale_writer");
}
export function probeInput(value: unknown) {
  const data = object(value, ["id", "kind", "payload"]);
  requireContract(typeof data.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(data.id) &&
    (data.kind === "evidence-probe" || data.kind === "artifact-probe"), "authority_probe_invalid");
  // Quarantined coordination exercises, never accepted Training evidence/profile inputs.
  return bounded(data, AUTHORITY_LIMITS.probeBytes);
}
