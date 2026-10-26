import type { Transaction } from "firebase-admin/firestore";
import { assertStage2Environment } from "./acceptanceTransport";
import { acceptanceReferences, initialControl } from "./acceptanceState";
import { initialAcceptanceCheckpoint } from "./acceptanceBatches";
import { createInventoryBootstrap } from "./inventory";
import { parseAccountRevisionControl } from "./controls";
import { assertWriterGuardContext } from "./writerGuard";
import type { SharedWriterGuard, WriterPrincipal } from "./writerGuard";
import { readSealParticipant, queueSealParticipant } from "./sealingCoordination";
import { SEAL_COLLECTION, parseSealControl, parseSealHandle, parseSealManifest, verifySealPages, verifySealInventoryPin } from "./sealingContracts";
import type { SealHandle } from "./sealingContracts";
import { parseStoredLifecycle } from "./authorityContracts";
import { TRAINING_RECOVERY_PROTOCOL, parseFrozenCompletionIdentity, parseTrainingRecoveryAttempt, createTrainingRecoveryAttempt,
  assertRecoveryScopeAdvance, assertRecoveryHandle } from "./protectedTrainingRecovery";
import type { FrozenCompletionIdentity, TrainingRecoveryAttempt } from "./protectedTrainingRecovery";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { canonicalJSON, object, requireContract, timestamp, typedHash } from "./values";

export const PROTECTED_TRAINING_PROTOCOL = "quarantined-training-stage4e-v1";
type Protection = Awaited<ReturnType<SharedWriterGuard["read"]>>;
type Coordination = Awaited<ReturnType<typeof readSealParticipant>>;
const recoveryReferences = (p: Protection) => {
  const seal = p.root.ref.firestore.doc(`${SEAL_COLLECTION}/${p.context.uid}`);
  return { seal, pointer: seal.collection("trainingRecovery").doc("current"), attempts: seal.collection("trainingRecoveryAttempts") };
};
async function recoveryAttempt(tx: Transaction, p: Protection): Promise<TrainingRecoveryAttempt | null> {
  const r = recoveryReferences(p), pointer = await tx.get(r.pointer);
  if (!pointer.exists) return null;
  const data = object(pointer.data(), ["schemaVersion", "protocol", "uid", "attemptId"]);
  requireContract(data.schemaVersion === 1 && data.protocol === TRAINING_RECOVERY_PROTOCOL && data.uid === p.context.uid &&
    typeof data.attemptId === "string" && /^[a-f0-9]{64}$/.test(data.attemptId), "protected_training_recovery_invalid");
  const row = await tx.get(r.attempts.doc(data.attemptId));
  const attempt = parseTrainingRecoveryAttempt(row.data());
  requireContract(attempt.attemptId === row.id, "protected_training_recovery_identity_invalid");
  assertWriterGuardContext(p.context, attempt.context); return attempt;
}
export type ProtectedTrainingPreparation = Readonly<{ kind: "enrolled" } | { kind: "begin"; request: { requestId: string } }
  | { kind: "resume"; handle: SealHandle }>;

/** Guarded recovery inspection is not a source-writer permission. Checkpoints
 * live outside the inventory; only open accounts can allocate a new round.
 * Source writes still pass readSealParticipant in enrollment/acceptance. */
export async function prepareProtectedTraining(guard: SharedWriterGuard, principal: WriterPrincipal,
  completionValue: FrozenCompletionIdentity): Promise<ProtectedTrainingPreparation> {
  assertProtectedTrainingEnvironment(); const completion = parseFrozenCompletionIdentity(completionValue);
  return guard.transaction(async tx => {
    const p = await guard.read(tx, principal); guard.assertDevelopmentTrainingAccess(p, tx);
    const r = recoveryReferences(p), refs = acceptanceReferences(p.root.ref.firestore, principal.uid);
    const [savedControl, admission, journal] = await tx.getAll(r.seal, refs.admission, refs.control);
    const attempt = await recoveryAttempt(tx, p);
    if (attempt?.completion.sessionId === completion.sessionId)
      requireContract(attempt.completion.requestHash === completion.requestHash, "completion_conflict");
    if (admission.exists || journal.exists) {
      const coordination = await readSealParticipant(tx, p, "v2-acceptance");
      const state = await readProtectedTrainingState(tx, p, coordination, admission.data(), journal.data());
      if (attempt) assertRecoveryHandle(attempt, state.admission.seal);
      return { kind: "enrolled" };
    }
    if (attempt) requireContract(attempt.completion.sessionId === completion.sessionId, "protected_training_preparation_busy");
    const control = savedControl.exists ? parseSealControl(savedControl.data()) : null;
    if (control) assertWriterGuardContext(p.context, control.context);
    const life = parseStoredLifecycle(p.life.data());
    const scope = { sealRevision: control?.revision ?? 0, sourceRevision: control?.sourceRevision ?? 0,
      revocationFence: control?.revocationFence ?? 1, lifecycleRevision: life.revision, lifecycleHead: life.headHash };
    if (attempt) assertRecoveryScopeAdvance(attempt.scope, scope);
    const index = attempt ? await tx.get(r.seal.collection("requests").doc(typedHash("seal-request-stage4d-v1", { requestId: attempt.requestId }))) : null;
    if (control?.phase === "sealing" || control?.phase === "sealed") {
      requireContract(attempt !== null && index?.exists, "protected_training_recovery_unbound");
      const request = object(index.data(), ["schemaVersion", "requestId", "sealId"]);
      requireContract(request.schemaVersion === 1 && request.requestId === attempt.requestId && request.sealId === control.sealId,
        "protected_training_recovery_request_mismatch");
      const row = await tx.get(r.seal.collection("attempts").doc(control.sealId!));
      const data = object(row.data(), ["handle", "inventoryPin", "phase", "manifest"]);
      const handle = assertRecoveryHandle(attempt, data.handle); verifySealInventoryPin(handle, data.inventoryPin);
      requireContract(control.revision > attempt.scope.sealRevision && control.attemptCount > 0 &&
        handle.sealId === control.sealId && data.phase === control.phase &&
        handle.pin.sourceRevision === control.sourceRevision && handle.pin.revocationFence === control.revocationFence &&
        handle.pin.lifecycleRevision === life.revision && handle.pin.lifecycleHead === life.headHash,
        "protected_training_recovery_cutoff_changed");
      if (control.phase === "sealing") requireContract(data.manifest === null, "seal_attempt_manifest_invalid");
      else parseSealManifest(data.manifest, handle, data.inventoryPin);
      return { kind: "resume", handle };
    }
    requireContract(control === null || control.phase === "open", "protected_training_recovery_closed");
    // No begin committed yet: retain this round even if a cooperating writer
    // advanced the open account. Stage 4D captures the actual pin atomically.
    if (attempt && !index?.exists) return { kind: "begin", request: { requestId: attempt.requestId } };
    const next = createTrainingRecoveryAttempt(p.context, completion, scope, attempt);
    const pointer = { schemaVersion: 1, protocol: TRAINING_RECOVERY_PROTOCOL, uid: p.context.uid, attemptId: next.attemptId };
    assertCompletionDocumentBudget(r.attempts.doc(next.attemptId).path, next); assertCompletionDocumentBudget(r.pointer.path, pointer);
    tx.create(r.attempts.doc(next.attemptId), { ...next }); tx.set(r.pointer, pointer);
    return { kind: "begin", request: { requestId: next.requestId } };
  });
}
export function assertProtectedTrainingEnvironment() {
  assertStage2Environment();
  requireContract(process.versions.node.split(".")[0] === "24" && process.env.TRAINING_PROTECTED_STAGE4E === "emulator-only" &&
    ["TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2", "TRAINING_SEAL_STAGE4D"]
      .every(key => process.env[key] === "emulator-only"), "protected_training_disabled");
}
export function checkProtectedTraining(protection: Protection, coordination: Coordination, admissionValue: unknown, controlValue: unknown) {
  assertProtectedTrainingEnvironment();
  const a = object(admissionValue, ["schemaVersion", "protocol", "uid", "lifecycleEpoch", "context", "seal", "manifestHash",
    "revocationFence", "recordedAt", "bootstrap", "authority", "admitted", "publicationEligible"]);
  const { context } = protection; const seal = parseSealHandle(a.seal); timestamp(a.recordedAt);
  requireContract(coordination !== null && context.protection === "protected" && context.lifecycleEpoch === 1,
    "protected_training_coordination_required");
  assertWriterGuardContext(context, a.context); assertWriterGuardContext(context, seal.pin.context);
  requireContract(a.schemaVersion === 1 && a.protocol === PROTECTED_TRAINING_PROTOCOL && a.uid === context.uid && a.lifecycleEpoch === 1 &&
    a.authority === "NOT VERIFIED" && a.admitted === false && a.publicationEligible === false &&
    a.revocationFence === coordination.control.revocationFence && a.revocationFence === seal.pin.revocationFence &&
    typeof a.manifestHash === "string" && /^[a-f0-9]{64}$/.test(a.manifestHash), "protected_training_state_invalid");
  const expected = createInventoryBootstrap({ uid: context.uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []);
  requireContract(canonicalJSON(a.bootstrap) === canonicalJSON(expected), "protected_training_state_invalid");
  const control = parseAccountRevisionControl(controlValue);
  requireContract(control.uid === context.uid && control.lifecycleEpoch === 1 && control.lifecycle === "active" && control.published === null,
    "protected_training_state_invalid");
  return { admission: a, control };
}
export async function readProtectedTrainingState(tx: Transaction, p: Protection, c: Coordination, admission: unknown, control: unknown) {
  const checked = checkProtectedTraining(p, c, admission, control), seal = parseSealHandle(checked.admission.seal);
  const saved = await tx.get(c!.ref.collection("attempts").doc(seal.sealId)), row = saved.data();
  requireContract(row?.phase === "sealed" && canonicalJSON(row.handle) === canonicalJSON(seal), "protected_training_seal_required");
  const manifest = parseSealManifest(row.manifest, seal, row.inventoryPin);
  requireContract(manifest.manifestHash === checked.admission.manifestHash, "protected_training_seal_changed");
  return checked;
}

/** Only called by the separate Stage 4E service after a real Stage 4D run.
 * Its manifest is consistency evidence, NEVER independent inventory authority.
 * Keep the Stage 4A persistenceVersion=3 fence intact. No empty-history admission
 * record of the legacy Stage 2 protocol is created for a protected account. */
export async function enrollProtectedTraining(guard: SharedWriterGuard, principal: WriterPrincipal, handleValue: unknown) {
  assertProtectedTrainingEnvironment(); const handle = parseSealHandle(handleValue);
  requireContract(principal.uid === handle.uid, "seal_owner_mismatch");
  return guard.transaction(async (tx: Transaction) => {
    const p = await guard.read(tx, principal); guard.assertDevelopmentTrainingAccess(p, tx);
    const c = await readSealParticipant(tx, p, "v2-acceptance");
    const r = acceptanceReferences(p.root.ref.firestore, principal.uid);
    const [admission, control, checkpoint] = await tx.getAll(r.admission, r.control, r.checkpoint);
    const recovery = await recoveryAttempt(tx, p);
    if (admission.exists || control.exists || checkpoint.exists) {
      requireContract(admission.exists && control.exists && checkpoint.exists, "protected_training_state_invalid");
      return (await readProtectedTrainingState(tx, p, c, admission.data(), control.data())).admission;
    }
    requireContract(c !== null && c.control.phase === "sealed" && c.control.sealId === handle.sealId &&
      p.context.lifecycleEpoch === 1, "protected_training_seal_required");
    requireContract(recovery !== null, "protected_training_recovery_unbound"); assertRecoveryHandle(recovery, handle);
    assertWriterGuardContext(p.context, handle.pin.context);
    const attempt = await tx.get(c.ref.collection("attempts").doc(handle.sealId)), saved = attempt.data();
    requireContract(saved?.phase === "sealed" && canonicalJSON(saved.handle) === canonicalJSON(handle), "protected_training_seal_required");
    const manifest = parseSealManifest(saved.manifest, handle, saved.inventoryPin);
    // Explicit initial-enrollment budget; no truncated inventory is accepted.
    requireContract(manifest.pageCount <= 8, "protected_training_inventory_capacity");
    const pages = await tx.get(attempt.ref.collection("pages").orderBy("__name__").limit(9));
    requireContract(pages.size === manifest.pageCount && pages.docs.every((page, index) => page.id === String(index).padStart(8, "0")),
      "seal_page_missing");
    verifySealPages(handle, manifest, pages.docs.map(page => page.data()));
    const sources = await Promise.all([r.user.collection("learningEvidence"), r.user.collection("assessments"),
      r.user.collection("learningEvidenceIdentityEvents"), r.user.collection("learningEvidenceSourceIndex"), r.journal, r.archives, r.batches]
      .map(collection => tx.get(collection.limit(1))));
    requireContract(sources.every(query => query.empty) && p.root.data()!.learningProfile == null, "protected_training_history_unresolved");
    requireContract(c.control.sourceRevision === handle.pin.sourceRevision && c.control.revocationFence === handle.pin.revocationFence,
      "seal_cutoff_changed");
    const data = { schemaVersion: 1, protocol: PROTECTED_TRAINING_PROTOCOL, uid: principal.uid, lifecycleEpoch: 1,
      context: p.context, seal: handle, manifestHash: manifest.manifestHash, revocationFence: c.control.revocationFence,
      recordedAt: p.root.readTime.toDate().toISOString(),
      bootstrap: createInventoryBootstrap({ uid: principal.uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []),
      authority: "NOT VERIFIED", admitted: false, publicationEligible: false };
    const writes = [[r.admission, data], [r.control, initialControl(principal.uid)],
      [r.checkpoint, initialAcceptanceCheckpoint({ uid: principal.uid, lifecycleEpoch: 1 })]] as const;
    for (const [ref, value] of writes) assertCompletionDocumentBudget(ref.path, value);
    queueSealParticipant(tx, c); for (const [ref, value] of writes) tx.create(ref, { ...value });
    return data;
  });
}

export function protectedSealRequest(context: Protection["context"]) {
  return { requestId: `stage4e-${typedHash("protected-training-seal-stage4e-v1", context)}` };
}
