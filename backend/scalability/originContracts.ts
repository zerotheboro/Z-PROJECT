import { AUTHORITY_PROTOCOL, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { BOOTSTRAP_PROTOCOL, parseGenesis } from "./bootstrapContracts";
import { createInventoryBootstrap } from "./inventory";
import { trainingOwnerUID } from "./ownerUID";
import { parseReadTime } from "./shadowContracts";
import { bounded, canonicalJSON, copyJSON, hash, integer, object, requireContract, text, timestamp, typedHash } from "./values";

export const ORIGIN_PROTOCOL = "durable-origin-stage4b2-v1" as const;
export const ORIGIN_REALM = "demo-edulience-origin-authority" as const;
export const ORIGIN_CLAIM = "originStage4b2Incarnation";
export const ORIGIN_STATES = Object.freeze(["PROVISIONING_PENDING", "ORIGIN_ATTESTED", "ORIGIN_RECOVERED", "ORIGIN_UNVERIFIED",
  "ORIGIN_REVOKED", "EXTERNAL_TRUST_NOT_ENFORCED"] as const);
export const ORIGIN_PHASES = Object.freeze(["INTENT_RECORDED", "AUTH_CREATE_STARTED", "AUTH_CREATED", "GENESIS_CREATE_STARTED",
  "GENESIS_COMMITTED", "FINALIZED"] as const);
export type OriginPhase = typeof ORIGIN_PHASES[number] | "REVOKED";
export const ORIGIN_LIMITS = Object.freeze({ events: 7, recordBytes: 16 * 1024, transactionBytes: 64 * 1024 });
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
export function originRequest(value: unknown) {
  const d = object(value, ["requestId", "identityForm"]); text(d.requestId, 100);
  requireContract(/^[A-Za-z0-9_-]{8,100}$/.test(d.requestId), "origin_request_invalid");
  requireContract(d.identityForm === "ascii" || d.identityForm === "unicode58" || d.identityForm === "unicode128", "origin_request_invalid");
  return d as unknown as Readonly<{ requestId: string; identityForm: "ascii" | "unicode58" | "unicode128" }>;
}
export const originRequestKey = (requestId: string) => { text(requestId, 100); return typedHash("origin-request-key-v1", requestId); };
export type OriginIntent = Readonly<{ schemaVersion: 1; protocol: typeof ORIGIN_PROTOCOL; uid: string; lifecycleEpoch: 1;
  incarnationId: string; rootBinding: string; request: ReturnType<typeof originRequest>; requestKey: string; intentHash: string }>;
export function parseOriginIntent(value: unknown): OriginIntent {
  const d = object(value, ["schemaVersion", "protocol", "uid", "lifecycleEpoch", "incarnationId", "rootBinding", "request", "requestKey", "intentHash"]);
  trainingOwnerUID(d.uid); hash(d.incarnationId); hash(d.rootBinding); hash(d.requestKey); hash(d.intentHash);
  const request = originRequest(d.request);
  requireContract(d.schemaVersion === 1 && d.protocol === ORIGIN_PROTOCOL && d.lifecycleEpoch === 1 && d.uid.startsWith("b1_") &&
    (request.identityForm === "ascii" ? /^b1_[a-f0-9]{32}$/.test(d.uid) : d.uid.length === (request.identityForm === "unicode58" ? 58 : 128)) &&
    d.requestKey === originRequestKey(request.requestId), "origin_intent_scope");
  requireContract(d.rootBinding === typedHash("origin-root-binding-v1", { uid: d.uid, lifecycleEpoch: 1, incarnationId: d.incarnationId }), "origin_intent_scope");
  const { intentHash, ...body } = d;
  requireContract(intentHash === typedHash("origin-intent-v1", body), "origin_intent_hash");
  return bounded(d, ORIGIN_LIMITS.recordBytes) as unknown as OriginIntent;
}
export function makeOriginIntent(requestValue: unknown, uid: string, incarnationId: string): OriginIntent {
  const request = originRequest(requestValue), body = { schemaVersion: 1, protocol: ORIGIN_PROTOCOL, uid, lifecycleEpoch: 1, incarnationId,
    rootBinding: typedHash("origin-root-binding-v1", { uid, lifecycleEpoch: 1, incarnationId }), request, requestKey: originRequestKey(request.requestId) };
  return parseOriginIntent({ ...body, intentHash: typedHash("origin-intent-v1", body) });
}
export function genesisForOrigin(intent: OriginIntent, authCreatedAt: string) {
  intent = parseOriginIntent(intent); timestamp(authCreatedAt);
  const body = { schemaVersion: 1, protocol: BOOTSTRAP_PROTOCOL, uid: intent.uid, lifecycleEpoch: 1, writerProtocol: AUTHORITY_PROTOCOL,
    catalog: SOURCE_NAMESPACE_VERSION, requestId: intent.request.requestId, rootBinding: intent.rootBinding, authCreatedAt,
    initialState: "active", initialFence: 1, initialRevision: 0,
    bootstrapDigest: createInventoryBootstrap({ uid: intent.uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []).bootstrapDigest };
  return parseGenesis({ ...body, genesisHash: typedHash("bootstrap-genesis-stage4b1-v1", body) });
}
export type OriginCommitment = Readonly<{ schemaVersion: 1; protocol: typeof ORIGIN_PROTOCOL; uid: string; lifecycleEpoch: 1;
  incarnationId: string; intentHash: string; genesisHash: string; rootBinding: string; authCreatedAt: string;
  sourceCreatedAt: { seconds: number; nanoseconds: number }; rootIncarnationHash: string }>;
export function originCommitment(intentValue: OriginIntent, value: unknown): OriginCommitment {
  const intent = parseOriginIntent(intentValue), d = object(value, ["schemaVersion", "protocol", "uid", "lifecycleEpoch", "incarnationId", "intentHash",
    "genesisHash", "rootBinding", "authCreatedAt", "sourceCreatedAt", "rootIncarnationHash"]);
  timestamp(d.authCreatedAt); parseReadTime(d.sourceCreatedAt); hash(d.genesisHash); hash(d.rootIncarnationHash);
  requireContract(d.schemaVersion === 1 && d.protocol === ORIGIN_PROTOCOL && d.uid === intent.uid && d.lifecycleEpoch === 1 &&
    d.incarnationId === intent.incarnationId && d.intentHash === intent.intentHash && d.rootBinding === intent.rootBinding &&
    d.genesisHash === genesisForOrigin(intent, d.authCreatedAt).genesisHash &&
    d.rootIncarnationHash === typedHash("origin-root-incarnation-v1", { uid: intent.uid, rootBinding: intent.rootBinding, sourceCreatedAt: d.sourceCreatedAt }), "origin_commitment_scope");
  return bounded(d, ORIGIN_LIMITS.recordBytes) as unknown as OriginCommitment;
}
export type OriginAttestation = Readonly<{ schemaVersion: 1; protocol: typeof ORIGIN_PROTOCOL; realm: typeof ORIGIN_REALM;
  trustBoundary: "EXTERNAL_TRUST_NOT_ENFORCED"; commitment: OriginCommitment; attestationHash: string }>;
/** Commitment factory ONLY. A hash or this Emulator record is NOT an authority capability. */
export function makeOriginAttestation(intent: OriginIntent, commitmentValue: unknown): OriginAttestation {
  const body = { schemaVersion: 1, protocol: ORIGIN_PROTOCOL, realm: ORIGIN_REALM, trustBoundary: "EXTERNAL_TRUST_NOT_ENFORCED",
    commitment: originCommitment(intent, commitmentValue) };
  return parseOriginAttestation(intent, { ...body, attestationHash: typedHash("origin-attestation-v1", body) });
}
export function parseOriginAttestation(intent: OriginIntent, value: unknown): OriginAttestation {
  const d = object(value, ["schemaVersion", "protocol", "realm", "trustBoundary", "commitment", "attestationHash"]);
  originCommitment(intent, d.commitment); hash(d.attestationHash);
  const { attestationHash, ...body } = d;
  requireContract(d.schemaVersion === 1 && d.protocol === ORIGIN_PROTOCOL && d.realm === ORIGIN_REALM && d.trustBoundary === "EXTERNAL_TRUST_NOT_ENFORCED" &&
    attestationHash === typedHash("origin-attestation-v1", body), "origin_attestation_invalid");
  return bounded(d, ORIGIN_LIMITS.recordBytes) as unknown as OriginAttestation;
}
export type OriginEvent = Readonly<{ schemaVersion: 1; uid: string; lifecycleEpoch: 1; incarnationId: string; intentHash: string;
  sequence: number; previousHash: string | null; kind: OriginPhase; detail: Record<string, unknown>; eventHash: string }>;
export type OriginControl = Readonly<{ schemaVersion: 1; uid: string; lifecycleEpoch: 1; incarnationId: string; requestKey: string;
  intentHash: string; phase: OriginPhase; sequence: number; headHash: string; reviewRequired: boolean; attestationHash: string | null }>;
export const originEventKey = (sequence: number) => { integer(sequence, 1); return String(sequence).padStart(16, "0"); };
export function parseOriginEvent(intent: OriginIntent, value: unknown): OriginEvent {
  intent = parseOriginIntent(intent);
  const d = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "incarnationId", "intentHash", "sequence", "previousHash", "kind", "detail", "eventHash"]);
  integer(d.sequence, 1); hash(d.eventHash); if (d.previousHash !== null) hash(d.previousHash);
  requireContract(d.schemaVersion === 1 && d.uid === intent.uid && d.lifecycleEpoch === 1 && d.incarnationId === intent.incarnationId &&
    d.intentHash === intent.intentHash && d.sequence <= ORIGIN_LIMITS.events && (d.kind === "REVOKED" || ORIGIN_PHASES.some(p => p === d.kind)), "origin_event_scope");
  if (d.kind === "INTENT_RECORDED") object(d.detail, []);
  else if (d.kind === "AUTH_CREATE_STARTED" || d.kind === "GENESIS_CREATE_STARTED") { const detail = object(d.detail, ["attemptId"]); hash(detail.attemptId); }
  else if (d.kind === "AUTH_CREATED") { const detail = object(d.detail, ["authCreatedAt", "incarnationId"]); timestamp(detail.authCreatedAt); requireContract(detail.incarnationId === intent.incarnationId, "origin_auth_binding"); }
  else if (d.kind === "GENESIS_COMMITTED") originCommitment(intent, d.detail);
  else if (d.kind === "FINALIZED") { const detail = object(d.detail, ["attestationHash"]); hash(detail.attestationHash); }
  else { const detail = object(d.detail, ["reason"]); requireContract(["operator-demo", "auth-incarnation-changed", "root-incarnation-changed", "lifecycle-closed", "epoch-changed"].some(r => r === detail.reason), "origin_revocation_reason"); }
  const { eventHash, ...body } = d;
  requireContract(eventHash === typedHash("origin-event-v1", body), "origin_event_hash");
  return bounded(d, ORIGIN_LIMITS.recordBytes) as unknown as OriginEvent;
}
export function makeOriginEvent(intent: OriginIntent, previous: OriginEvent | null, kind: OriginPhase, detail: Record<string, unknown>): OriginEvent {
  intent = parseOriginIntent(intent);
  if (previous !== null) previous = parseOriginEvent(intent, previous);
  const body = { schemaVersion: 1, uid: intent.uid, lifecycleEpoch: 1, incarnationId: intent.incarnationId, intentHash: intent.intentHash,
    sequence: (previous?.sequence ?? 0) + 1, previousHash: previous?.eventHash ?? null, kind, detail };
  return parseOriginEvent(intent, { ...body, eventHash: typedHash("origin-event-v1", body) });
}
/** Rebuild control from a complete bounded ledger; no current-state marker alone is proof. */
export function verifyOriginLedger(intentValue: unknown, eventValues: unknown, attestationValue: unknown = null) {
  const intent = parseOriginIntent(intentValue), copied = copyJSON(eventValues);
  requireContract(Array.isArray(copied) && copied.length >= 1 && copied.length <= ORIGIN_LIMITS.events, "origin_ledger_incomplete");
  const events = copied.map(value => parseOriginEvent(intent, value));
  let previous: OriginEvent | null = null, commitment: OriginCommitment | null = null, authCreatedAt: string | null = null;
  for (const event of events) {
    requireContract(event.sequence === (previous?.sequence ?? 0) + 1 && event.previousHash === (previous?.eventHash ?? null) &&
      previous?.kind !== "REVOKED", "origin_ledger_incomplete");
    const expected = ORIGIN_PHASES[(previous?.sequence ?? 0)];
    requireContract(event.kind === expected || previous !== null && event.kind === "REVOKED", "origin_transition_invalid");
    if (event.kind === "AUTH_CREATED") authCreatedAt = event.detail.authCreatedAt as string;
    if (event.kind === "GENESIS_COMMITTED") { commitment = originCommitment(intent, event.detail); requireContract(commitment.authCreatedAt === authCreatedAt, "origin_auth_binding"); }
    previous = event;
  }
  const last = events.at(-1)!; let attestation: OriginAttestation | null = null;
  const finalized = events.find(event => event.kind === "FINALIZED");
  if (finalized) {
    attestation = parseOriginAttestation(intent, attestationValue);
    requireContract(same(attestation.commitment, commitment) && attestation.attestationHash === finalized.detail.attestationHash, "origin_attestation_substituted");
  } else requireContract(attestationValue === null, "origin_unexpected_attestation");
  const control: OriginControl = Object.freeze({ schemaVersion: 1, uid: intent.uid, lifecycleEpoch: 1, incarnationId: intent.incarnationId,
    requestKey: intent.requestKey, intentHash: intent.intentHash, phase: last.kind, sequence: last.sequence, headHash: last.eventHash,
    reviewRequired: last.kind === "AUTH_CREATE_STARTED" || last.kind === "GENESIS_CREATE_STARTED", attestationHash: attestation?.attestationHash ?? null });
  return Object.freeze({ intent, events: Object.freeze(events), control, commitment, authCreatedAt, attestation });
}
export type OriginLedger = ReturnType<typeof verifyOriginLedger>;
export function originStatus(uid: string, state: typeof ORIGIN_STATES[number], reason: string, consistency = "UNVERIFIED") {
  trainingOwnerUID(uid); text(reason, 100); text(consistency, 100);
  requireContract(state === "PROVISIONING_PENDING" || state === "ORIGIN_UNVERIFIED" || state === "ORIGIN_REVOKED" || state === "EXTERNAL_TRUST_NOT_ENFORCED", "origin_external_trust_required");
  return Object.freeze({ schemaVersion: 1, uid, state, reason, consistency, authority: "NOT VERIFIED" as const,
    externalTrust: "NOT ENFORCED" as const, admissionEligible: false as const, publicationEligible: false as const });
}
