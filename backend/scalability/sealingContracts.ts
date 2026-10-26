import { parseWriterGuardContext } from "./writerGuard";
import type { WriterGuardContext } from "./writerGuard";
import { parseJournalAnchor } from "./journal";
import type { JournalAnchor } from "./journal";
import { BOOTSTRAP_LIMITS, verifyBootstrapInventory, parseInventoryPin } from "./bootstrapContracts";
import type { BootstrapInventoryManifest } from "./bootstrapContracts";
import { bounded, canonicalJSON, hash, integer, object, requireContract, text, typedHash } from "./values";

export const SEAL_PROTOCOL = "coordinated-inventory-stage4d-v1" as const;
export const SEAL_COLLECTION = "trainingInventorySeals";
export const SEAL_PARTICIPANTS = Object.freeze(["v2-acceptance", "stage4a-probe", "shadow-worker", "publication"] as const);
export const SEAL_LIMITS = Object.freeze({ pageBytes: 128 * 1024, controlBytes: 16 * 1024, attempts: 100, transactionBytes: 256 * 1024,
  pages: Math.ceil(BOOTSTRAP_LIMITS.records / BOOTSTRAP_LIMITS.pageRecords) });
export type SealControl = Readonly<{ schemaVersion: 1; protocol: typeof SEAL_PROTOCOL; context: WriterGuardContext;
  revision: number; sourceRevision: number; attemptCount: number; revocationFence: number; phase: "open" | "sealing" | "sealed" | "invalidated" | "revoked";
  sealId: string | null; participantsHash: string }>;
export const participantsHash = () => typedHash("seal-participants-stage4d-v1", SEAL_PARTICIPANTS);
export function parseSealControl(value: unknown): SealControl {
  const d = object(value, ["schemaVersion", "protocol", "context", "revision", "sourceRevision", "attemptCount", "revocationFence", "phase", "sealId", "participantsHash"]);
  const context = parseWriterGuardContext(d.context);
  requireContract(context.protection === "protected" && d.schemaVersion === 1 && d.protocol === SEAL_PROTOCOL &&
    d.participantsHash === participantsHash(), "seal_protocol_invalid");
  integer(d.revision); integer(d.sourceRevision); integer(d.revocationFence, 1);
  integer(d.attemptCount); requireContract(d.attemptCount <= SEAL_LIMITS.attempts, "seal_attempt_capacity");
  requireContract(d.sourceRevision <= d.revision && d.attemptCount <= d.revision && d.revocationFence - 1 <= d.revision,
    "seal_revision_invalid");
  requireContract(["open", "sealing", "sealed", "invalidated", "revoked"].some(p => d.phase === p), "seal_phase_invalid");
  if (d.sealId !== null) hash(d.sealId);
  requireContract(d.phase !== "sealing" && d.phase !== "sealed" || d.sealId !== null, "seal_phase_invalid");
  requireContract(d.phase !== "open" || d.sealId === null, "seal_phase_invalid");
  return bounded(d, SEAL_LIMITS.controlBytes) as unknown as SealControl;
}
export function initialSealControl(context: WriterGuardContext): SealControl {
  return parseSealControl({ schemaVersion: 1, protocol: SEAL_PROTOCOL, context, revision: 0, sourceRevision: 0, attemptCount: 0,
    revocationFence: 1, phase: "open", sealId: null, participantsHash: participantsHash() });
}
export type SealPin = Readonly<{ context: WriterGuardContext; lifecycleRevision: number; lifecycleHead: string | null;
  genesisHash: string | null; journalCutoff: JournalAnchor | null; sourceRevision: number; revocationFence: number; participantsHash: string }>;
export function parseSealPin(value: unknown): SealPin {
  const d = object(value, ["context", "lifecycleRevision", "lifecycleHead", "genesisHash", "journalCutoff", "sourceRevision", "revocationFence", "participantsHash"]);
  const context = parseWriterGuardContext(d.context); integer(d.lifecycleRevision); integer(d.sourceRevision); integer(d.revocationFence, 1);
  requireContract(context.protection === "protected" && d.participantsHash === participantsHash(), "seal_scope_invalid");
  if (d.lifecycleRevision === 0) requireContract(d.lifecycleHead === null, "seal_scope_invalid"); else hash(d.lifecycleHead);
  if (d.genesisHash !== null) hash(d.genesisHash);
  if (d.journalCutoff !== null) {
    const j = parseJournalAnchor(d.journalCutoff);
    requireContract(j.uid === context.uid && j.lifecycleEpoch === context.lifecycleEpoch, "seal_scope_invalid");
  }
  return bounded(d, SEAL_LIMITS.controlBytes) as unknown as SealPin;
}
export type SealHandle = Readonly<{ schemaVersion: 1; protocol: typeof SEAL_PROTOCOL; uid: string; requestId: string; sealId: string; pin: SealPin }>;
export function parseSealHandle(value: unknown): SealHandle {
  const d = object(value, ["schemaVersion", "protocol", "uid", "requestId", "sealId", "pin"]), pin = parseSealPin(d.pin);
  text(d.requestId, 100); hash(d.sealId);
  requireContract(/^[A-Za-z0-9_-]{8,100}$/.test(d.requestId) && d.schemaVersion === 1 && d.protocol === SEAL_PROTOCOL && d.uid === pin.context.uid &&
    d.sealId === typedHash("seal-identity-stage4d-v1", { uid: d.uid, requestId: d.requestId, pin }), "seal_handle_invalid");
  return d as unknown as SealHandle;
}
export function makeSealHandle(requestId: string, pin: SealPin): SealHandle {
  pin = parseSealPin(pin); const uid = pin.context.uid;
  return parseSealHandle({ schemaVersion: 1, protocol: SEAL_PROTOCOL, uid, requestId, pin,
    sealId: typedHash("seal-identity-stage4d-v1", { uid, requestId, pin }) });
}
/** Equality includes creation metadata, epoch/fence, local revocation and the
 * real journal cutoff. Coordination revisions never imply learning chronology. */
export function sameSealPin(a: SealPin, b: SealPin) { return canonicalJSON(parseSealPin(a)) === canonicalJSON(parseSealPin(b)); }
export function verifySealInventoryPin(handle: SealHandle, pinValue: unknown) {
  handle = parseSealHandle(handle);
  const p = parseInventoryPin(pinValue), pin = handle.pin, c = pin.context;
  requireContract(p.uid === handle.uid && p.lifecycleEpoch === c.lifecycleEpoch && p.lifecycleFence === c.fence &&
    p.lifecycleRevision === pin.lifecycleRevision && p.lifecycleHead === pin.lifecycleHead && p.lifecycleState === "active" &&
    p.writerProtocol === c.writerProtocol && p.genesisHash === pin.genesisHash &&
    canonicalJSON(p.rootCreatedAt) === canonicalJSON(c.rootCreatedAt) && canonicalJSON(p.journal) === canonicalJSON(pin.journalCutoff), "seal_inventory_scope");
  return p;
}
/** Validate persisted metadata before treating an attempt as sealed. Complete
 * page verification remains mandatory later; a self-consistent hash is not authority. */
export function parseSealManifest(value: unknown, handle: SealHandle, inventoryPinValue: unknown): BootstrapInventoryManifest {
  const m = object(value, ["schemaVersion", "pin", "pageCount", "recordCount", "inventoryDigest", "manifestHash"]);
  const pin = verifySealInventoryPin(handle, m.pin), inventoryPin = verifySealInventoryPin(handle, inventoryPinValue);
  integer(m.pageCount); integer(m.recordCount); hash(m.inventoryDigest); hash(m.manifestHash);
  requireContract(m.schemaVersion === 1 && m.pageCount <= SEAL_LIMITS.pages && m.recordCount <= BOOTSTRAP_LIMITS.records &&
    (m.pageCount === 0 ? m.recordCount === 0 : m.pageCount <= m.recordCount && m.recordCount <= m.pageCount * BOOTSTRAP_LIMITS.pageRecords),
    "seal_manifest_invalid");
  const { manifestHash, ...body } = m;
  requireContract(manifestHash === typedHash("bootstrap-inventory-manifest-stage4b1-v1", body), "seal_manifest_invalid");
  requireContract(canonicalJSON(pin) === canonicalJSON(inventoryPin), "seal_manifest_binding_invalid");
  if (m.pageCount === 0) requireContract(m.inventoryDigest === typedHash("bootstrap-empty-inventory-stage4b1-v1", pin), "seal_manifest_invalid");
  return bounded(m, SEAL_LIMITS.controlBytes) as unknown as BootstrapInventoryManifest;
}
export function verifySealPages(handle: SealHandle, manifest: BootstrapInventoryManifest, pages: readonly unknown[]) {
  const m = object(manifest, ["schemaVersion", "pin", "pageCount", "recordCount", "inventoryDigest", "manifestHash"]);
  parseSealManifest(m, handle, m.pin); verifyBootstrapInventory(m, pages);
  return Object.freeze({ consistency: "STRUCTURALLY_VALID" as const, authority: "NOT VERIFIED" as const });
}
export function admissionDecision(facts: { lifecycle: boolean; inventory: boolean; coordination: boolean; revocationClear: boolean; origin: string }) {
  const checked = object(facts, ["lifecycle", "inventory", "coordination", "revocationClear", "origin"]);
  for (const field of ["lifecycle", "inventory", "coordination", "revocationClear"]) requireContract(typeof checked[field] === "boolean", "seal_fact_invalid");
  text(checked.origin, 100); facts = checked as unknown as typeof facts;
  return Object.freeze({ schemaVersion: 1, protocol: SEAL_PROTOCOL, admission: "NOT VERIFIED" as const,
    admitted: false as const, publicationEligible: false as const, facts: Object.freeze({ ...facts }),
    blockers: Object.freeze(["independent_origin_provenance_unverified", "inventory_provenance_unverified", "production_iam_unverified", "external_revocation_not_transactional",
      "legacy_admin_writers_unfenced", ...(!facts.lifecycle ? ["lifecycle_invalid"] : []), ...(!facts.inventory ? ["inventory_not_verified"] : []),
      ...(!facts.coordination ? ["writer_coordination_invalid"] : []), ...(!facts.revocationClear ? ["revocation_clearance_unverified"] : [])]) });
}
