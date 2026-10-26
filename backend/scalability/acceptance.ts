import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { canonicalEvidence } from "../../src/quiz/learningEvidence";
import { CompletionError, digest, requireCompletion, validateCompletion } from "../trainingCompletionContract";
import { assertCompletionDocumentBudget, completionHistoryJSONBytes } from "../completionFirestoreValues";
import { canAdvanceLegacyProfile, checkCompletionReservation, completionSourceIdentity,
  legacyAssessmentFingerprint, mergeCompletionDocument, nativeCompletionIdentity, rebuildSourceIndex } from "../trainingCompletion";
import { acceptanceReferences, checkAdmission, initialAdmission, initialControl, writerFence } from "./acceptanceState";
import { assertStage2Transport } from "./acceptanceTransport";
import type { Stage2Transport } from "./acceptanceTransport";
import { createSharedWriterGuard } from "./writerGuard";
import { readSealParticipant, queueSealParticipant } from "./sealingCoordination";
import { createJournalEntry, journalIdentity, parseJournalEntry } from "./journal";
import { inventorySourceReference } from "./inventory";
import { parseAcceptanceReceipt, requireIdenticalReceipt } from "./receipts";
import type { AcceptanceReceipt, CompletionReceiptV2 } from "./receipts";
import { parseAccountRevisionControl } from "./controls";
import type { AccountRevisionControl } from "./controls";
import { checkpointForBatch, createAcceptanceBatch, initialAcceptanceCheckpoint, parseAcceptanceBatch,
  parseAcceptanceCheckpoint, verifyAcceptanceCheckpoint } from "./acceptanceBatches";
import type { AcceptanceCheckpoint } from "./acceptanceBatches";
import { copyJSON, jsonBytes, nextRevision, ScalabilityContractError, timestamp } from "./values";
import { assertProtectedTrainingEnvironment, readProtectedTrainingState, enrollProtectedTraining } from "./protectedTrainingPolicy";

type Data = Record<string, unknown>;
type Write = { ref: DocumentReference; data: Data; create: boolean; budgetData?: Data; merge?: boolean };
const failure = (condition: unknown, code: string) => requireCompletion(condition, code, 409);
const same = (a: unknown, b: unknown) => canonicalEvidence(a) === canonicalEvidence(b);
const historyNamespaces = ["learningEvidence", "assessments", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex", "learningProfiles",
  // Legacy Manual sessions could leave activity but no assessment/evidence.
  // Never turn that absence, or a pending v1 draft, into an empty-history claim.
  "trainingActivity", "trainingStats", "trainingProgress"];
export const ACCEPTANCE_LIMITS = Object.freeze({ recordBytes: 128 * 1024, transactionBytes: 2 * 1024 * 1024, maximumWrites: 15 });

function counterIntegrity<T>(check: () => T): T {
  try { return check(); }
  catch (error) {
    if (error instanceof ScalabilityContractError) throw new CompletionError(409, "stage2_counter_integrity");
    throw error;
  }
}
async function committedCheckpoint(tx: Transaction, refs: ReturnType<typeof acceptanceReferences>,
  control: AccountRevisionControl, checkpoint: AcceptanceCheckpoint): Promise<AcceptanceCheckpoint> {
  // Read only the current batch (2/3 journal entries) and its direct predecessor.
  // The full prefix remains a Stage 3 verification obligation.
  if (checkpoint.ordinal === 0) return counterIntegrity(() => verifyAcceptanceCheckpoint(control, checkpoint));
  const saved = await tx.get(refs.batches.doc(checkpoint.batchId!));
  const batch = counterIntegrity(() => parseAcceptanceBatch(saved.data()));
  const [entries, predecessor] = await Promise.all([
    Promise.all(Array.from({ length: batch.lastRevision - batch.firstRevision + 1 }, (_, offset) =>
      tx.get(refs.journal.doc(journalIdentity(batch, batch.firstRevision + offset))))),
    batch.previous.batchId === null ? undefined : tx.get(refs.batches.doc(batch.previous.batchId))
  ]);
  return counterIntegrity(() => verifyAcceptanceCheckpoint(control, checkpoint, batch,
    entries.map(entry => entry.data()), predecessor?.data()));
}

function decision(kind: "native" | "legacy", sessionId: string, evidenceId: string, fingerprint: string) {
  const data = { schemaVersion: 1, sourceKind: kind, recordId: sessionId,
    sourceHash: completionSourceIdentity(kind, sessionId), fromEvidenceId: null, toEvidenceId: evidenceId, fingerprint };
  const id = digest(data);
  const index = { schemaVersion: 1, sourceKind: kind, recordId: sessionId, evidenceId, fingerprint, decisionId: id };
  return { id, data, index };
}
function source(uid: string, id: string, payload: Data) {
  return { schemaVersion: 1, uid, lifecycleEpoch: 1, namespace: "learningEvidence" as const, id, payload };
}
function checkWrites(writes: readonly Write[], maximumWrites: number = ACCEPTANCE_LIMITS.maximumWrites): void {
  failure(writes.length <= maximumWrites, "stage2_write_limit");
  let bytes = 0;
  for (const write of writes) {
    bytes += assertCompletionDocumentBudget(write.ref.path, write.budgetData ?? write.data);
    // Root profile compatibility is checked using the actual recursive merge.
    if (!write.merge) failure(completionHistoryJSONBytes(write.data) <= ACCEPTANCE_LIMITS.recordBytes, "stage2_record_limit");
  }
  failure(bytes <= ACCEPTANCE_LIMITS.transactionBytes, "stage2_transaction_limit");
}
function persist(tx: Transaction, writes: readonly Write[]) {
  checkWrites(writes);
  for (const write of writes) {
    if (write.create) tx.create(write.ref, write.data);
    else if (write.merge) tx.set(write.ref, write.data, { merge: true });
    else tx.set(write.ref, write.data);
  }
}
async function previousDisplayEvidence(tx: Transaction, user: DocumentReference, previousId: unknown) {
  // Read a bounded pair of source identities, never query historical results.
  const sources = new Map<string, { schemaVersion: 1; sourceKind: "native" | "legacy"; recordId: string;
    evidenceId: string; fingerprint: string; decisionId: string }>();
  const rows: { id: string; data: Data }[] = [];
  if (typeof previousId !== "string" || !/^[A-Za-z0-9_-]{8,200}$/.test(previousId)) return { sources, rows };
  const snapshots = await Promise.all((["native", "legacy"] as const).map(kind => tx.get(user.collection("learningEvidenceSourceIndex").doc(completionSourceIdentity(kind, previousId)))));
  const events = [];
  for (const snapshot of snapshots) if (snapshot.exists) {
    const index = snapshot.data()!;
    failure(typeof index.decisionId === "string" && /^[a-f0-9]{64}$/.test(index.decisionId) &&
      typeof index.evidenceId === "string" && /^session-[a-f0-9]{64}$/.test(index.evidenceId), "stage2_identity_conflict");
    const saved = await tx.get(user.collection("learningEvidenceIdentityEvents").doc(index.decisionId));
    failure(saved.exists, "stage2_identity_conflict"); events.push({ id: saved.id, data: saved.data()! });
  }
  if (!events.length) return { sources, rows };
  const rebuilt = rebuildSourceIndex(events);
  for (const snapshot of snapshots) if (snapshot.exists) {
    failure(same(snapshot.data(), rebuilt.get(snapshot.id)), "stage2_identity_conflict");
    sources.set(snapshot.id, rebuilt.get(snapshot.id)!);
  }
  for (const id of new Set([...sources.values()].map(index => index.evidenceId))) {
    const saved = await tx.get(user.collection("learningEvidence").doc(id));
    failure(saved.exists, "stage2_identity_conflict");
    // Validates actual Phase 1 evidence/ownership and the original native ID.
    inventorySourceReference(source(user.id, id, saved.data()!), { uid: user.id, lifecycleEpoch: 1, revision: 0, headHash: null });
    rows.push({ id, data: saved.data()! });
  }
  return { sources, rows };
}

/** A separate backend-only service. Its only owner input is an Emulator-verified
 * token. No caller-supplied UID, client bootstrap, arbitrary DB or auth callback. */
export function createStage2AcceptanceService(transport: Stage2Transport, { now = Date.now, protectedDevelopment = false }:
  { now?: () => number; protectedDevelopment?: boolean } = {}) {
  assertStage2Transport(transport);
  if (protectedDevelopment) assertProtectedTrainingEnvironment();
  const writerGuard = createSharedWriterGuard(transport);
  function translate(error: unknown): never {
    if (error instanceof ScalabilityContractError) throw new CompletionError(409,
      error.code === "completion_conflict" ? "completion_conflict" : error.code === "writer_account_not_active" ? "stage2_account_not_active" : "stage2_state_invalid");
    throw error;
  }
  return {
    async enrollProtectedOwner(token: string, handle: unknown) {
      requireCompletion(protectedDevelopment, "protected_training_disabled", 503);
      return enrollProtectedTraining(writerGuard, await writerGuard.authenticate(token), handle);
    },
    /** Operator/test-harness admission only; deliberately NOT an HTTP endpoint.
     * A real serializable empty-history transaction plus the existing v1
     * coordinator fence is required. Existing histories need Stage 4 migration. */
    async admitFreshOwner(token: string) {
      const principal = await writerGuard.authenticate(token), uid = principal.uid, db = transport.getFirestore(), refs = acceptanceReferences(db, uid);
      const at = new Date(now()).toISOString(); timestamp(at);
      try {
        return await writerGuard.transaction(async tx => {
          transport.getFirestore();
          const protection = await writerGuard.read(tx, principal), { root: user, fence } = protection;
          await readSealParticipant(tx, protection, "v2-acceptance");
          writerGuard.assertJournalAccess(protection, tx);
          const [control, admission, savedCheckpoint] = await Promise.all([
            refs.control, refs.admission, refs.checkpoint].map(ref => tx.get(ref)));
          if (control.exists || admission.exists) {
            failure(control.exists && admission.exists && fence.exists && user.exists, "stage2_bootstrap_required");
            const checkpoint = counterIntegrity(() => parseAcceptanceCheckpoint(savedCheckpoint.data()));
            failure(control.data()!.nativeAcceptedCount === checkpoint.ordinal, "stage2_counter_integrity");
            const checked = checkAdmission(uid, admission.data(), fence.data(), control.data());
            await committedCheckpoint(tx, refs, checked.control, checkpoint); return admission.data()!;
          }
          const groups = await Promise.all([
            ...historyNamespaces.map(name => tx.get(refs.user.collection(name).limit(1))),
            // Firestore can retain nested documents after a parent is deleted.
            tx.get(refs.journal.limit(1)), tx.get(refs.archives.limit(1)), tx.get(refs.batches.limit(1))
          ]);
          const data = user.data();
          failure(user.exists && !fence.exists && groups.every(group => group.empty) && data?.learningProfile == null &&
            data?.latestAssessmentId == null && data?.learningProfileUpdatedAt == null, "stage2_bootstrap_required");
          const value = initialAdmission(uid, at);
          transport.getFirestore();
          persist(tx, [
            { ref: refs.admission, data: value as Data, create: true },
            { ref: refs.control, data: { ...initialControl(uid) }, create: true },
            { ref: refs.checkpoint, data: { ...initialAcceptanceCheckpoint({ uid, lifecycleEpoch: 1 }) }, create: true },
            // Existing v1 revision() rejects persistenceVersion != 1, including
            // a v1 request that prepared before this transaction committed.
            { ref: refs.fence, data: writerFence(uid, value), create: true }
          ]);
          return value;
        });
      } catch (error) { return translate(error); }
    },
    async accept(token: string, raw: unknown): Promise<AcceptanceReceipt> {
      const principal = await writerGuard.authenticate(token), uid = principal.uid;
      const recordedAt = new Date(now()).toISOString(); timestamp(recordedAt);
      // Strict Stage 1 copying rejects accessors and malformed Unicode BEFORE
      // existing v1 validation/hash logic. Request hash/identity protocol is v1.
      let input: ReturnType<typeof copyJSON>;
      try { input = copyJSON(raw); }
      catch { throw new CompletionError(400, "invalid_completion_json"); }
      requireCompletion(jsonBytes(input) <= 64 * 1024, "completion_too_large", 413);
      const { request, requestHash, evidence, legacy } = validateCompletion(uid, input, recordedAt);
      const db = transport.getFirestore(), refs = acceptanceReferences(db, uid);
      const evidenceId = nativeCompletionIdentity(request.sessionId);
      const evidenceRef = refs.user.collection("learningEvidence").doc(evidenceId);
      const archiveRef = refs.archives.doc(evidenceId);
      const legacyRef = refs.user.collection("assessments").doc(request.sessionId);
      const reservationRef = refs.user.collection("trainingReservations").doc(request.sessionId);
      const legacyData = legacy === null ? null : { ...legacy, createdAt: new Date(recordedAt) };
      const claims = [decision("native", request.sessionId, evidenceId, requestHash),
        ...(legacyData ? [decision("legacy", request.sessionId, evidenceId, legacyAssessmentFingerprint(legacyData))] : [])];
      try {
        return await writerGuard.transaction(async tx => {
          transport.getFirestore();
          const protection = await writerGuard.read(tx, principal), { root: user, fence } = protection;
          const sealCoordination = await readSealParticipant(tx, protection, "v2-acceptance");
          // Before BOTH original-receipt recovery and new acceptance. A valid
          // historical receipt cannot bypass current protection or deletion.
          const protectedOwner = protectedDevelopment && protection.context.protection === "protected";
          if (protectedDevelopment) failure(protectedOwner, "protected_training_owner_required");
          if (protectedOwner) { assertProtectedTrainingEnvironment(); writerGuard.assertDevelopmentTrainingAccess(protection, tx); }
          else writerGuard.assertJournalAccess(protection, tx);
          const admissionState = (admission: unknown, control: unknown) => protectedOwner
            ? readProtectedTrainingState(tx, protection, sealCoordination, admission, control)
            : checkAdmission(uid, admission, fence.data(), control);
          const [controlSnap, admission, completed] = await Promise.all([
            refs.control, refs.admission, evidenceRef].map(ref => tx.get(ref)));
          if (completed.exists) {
            const row = completed.data()!;
            inventorySourceReference(source(uid, evidenceId, row), { uid, lifecycleEpoch: 1, revision: 0, headHash: null });
            const receipt = requireIdenticalReceipt(row.receipt, { sessionId: request.sessionId, mode: request.mode, evidenceId, requestHash });
            if (receipt.schemaVersion === 1) return receipt; // original v1 receipt, no reinterpretation or write
            failure(controlSnap.exists && admission.exists && fence.exists, "stage2_bootstrap_required");
            const { control } = await admissionState(admission.data(), controlSnap.data());
            const [archive, journal] = await Promise.all([tx.get(archiveRef), tx.get(refs.journal.doc(journalIdentity({ uid, lifecycleEpoch: 1 }, receipt.acceptedRevision)))]);
            failure(archive.exists && journal.exists && control.headRevision >= receipt.acceptedRevision, "stage2_receipt_integrity");
            const archived = archive.data()!, entry = parseJournalEntry(journal.data());
            failure(entry.uid === uid && entry.lifecycleEpoch === 1 && entry.event.kind === "session-accepted" &&
              same(entry.event.receipt, receipt) && entry.event.evidenceHash === inventorySourceReference(source(uid, evidenceId, row), {
                uid, lifecycleEpoch: 1, revision: entry.revision, headHash: entry.entryHash }).contentHash &&
              archived.schemaVersion === 1 && archived.sessionId === request.sessionId && archived.evidenceId === evidenceId &&
              archived.archivedAt === receipt.recordedAt && same(archived.receipt, receipt) && archived.uid === uid &&
              archived.lifecycleEpoch === 1 && archived.requestHash === requestHash &&
              digest({ contract: "training-complete-v1", uid, request: archived.payload }) === requestHash,
            "stage2_receipt_integrity");
            return receipt;
          }
          failure(controlSnap.exists && admission.exists && fence.exists, "stage2_bootstrap_required");
          const savedCheckpoint = await tx.get(refs.checkpoint);
          const checkpoint = counterIntegrity(() => parseAcceptanceCheckpoint(savedCheckpoint.data()));
          failure(controlSnap.data()!.nativeAcceptedCount === checkpoint.ordinal, "stage2_counter_integrity");
          const { control } = await admissionState(admission.data(), controlSnap.data());
          const committed = await committedCheckpoint(tx, refs, control, checkpoint);
          const [reservation, target, work] = await Promise.all([tx.get(reservationRef), tx.get(legacyRef), tx.get(refs.work)]);
          checkCompletionReservation(reservation, request.sessionId, request.mode, request.selectedMethods);
          // Current reservations deliberately have no TTL. Previous-day or expired
          // Premium sessions remain valid. Unknown expiry/revocation extensions
          // must not be silently interpreted by this version of the writer.
          failure(!Object.hasOwn(reservation.data()!, "expiresAt") && !Object.hasOwn(reservation.data()!, "revokedAt"), "stage2_reservation_version");
          failure(!target.exists, "stage2_legacy_migration_required");
          if (control.headRevision > 0) {
            failure(work.exists && work.data()!.targetRevision === control.headRevision && work.data()!.headHash === control.headHash &&
              work.data()!.uid === uid && work.data()!.lifecycleEpoch === 1 && work.data()!.status === "pending", "stage2_work_mismatch");
          } else failure(!work.exists, "stage2_work_mismatch");
          for (const claim of claims) {
            const [index, event] = await Promise.all([
              tx.get(refs.user.collection("learningEvidenceSourceIndex").doc(claim.data.sourceHash)),
              tx.get(refs.user.collection("learningEvidenceIdentityEvents").doc(claim.id))]);
            failure(!index.exists && !event.exists, "stage2_identity_conflict");
          }
          const previous = legacy === null ? { sources: new Map(), rows: [] }
            : await previousDisplayEvidence(tx, refs.user, user.data()!.latestAssessmentId);
          const updateProfile = legacy !== null && (user.data()!.learningProfile == null ||
            canAdvanceLegacyProfile(user.data()!.latestAssessmentId, evidence, previous.sources, previous.rows));
          const receipt = parseAcceptanceReceipt({ schemaVersion: 2, status: "accepted", sessionId: request.sessionId,
            mode: request.mode, evidenceId, requestHash, lifecycleEpoch: 1, acceptedRevision: nextRevision(control.headRevision), recordedAt,
            legacyAssessmentId: legacy === null ? null : request.sessionId, legacyProfileUpdated: updateProfile }) as CompletionReceiptV2;
          const row = copyJSON({ schemaVersion: 1, evidence, requestHash, receipt,
            ...(request.mode === "manual" ? { completionDetails: { schemaVersion: 1, methodIntroduction: request.methodIntroduction, reflection: request.reflection } } : {}),
            resultAuthority: "client-reported", selectionContextAuthority: "client-advisory" }) as Data;
          const anchor = { uid, lifecycleEpoch: 1, revision: control.headRevision, headHash: control.headHash };
          const entries = [createJournalEntry(anchor, { kind: "session-accepted", receipt,
            evidenceHash: inventorySourceReference(source(uid, evidenceId, row), anchor).contentHash }, recordedAt)];
          for (const claim of claims) {
            const last = entries.at(-1)!;
            entries.push(createJournalEntry({ uid, lifecycleEpoch: 1, revision: last.revision, headHash: last.entryHash }, {
              kind: "identity-decided", decisionId: claim.id, sourceKind: claim.data.sourceKind, recordId: request.sessionId,
              fromEvidenceId: null, toEvidenceId: evidenceId, linkage: "established", proof: {
                version: claim.data.sourceKind === "native" ? "request-v1" : "v2", digest: claim.data.fingerprint.replace(/^v2:/, "") }
            }, recordedAt));
          }
          const head = entries.at(-1)!;
          const batch = counterIntegrity(() => createAcceptanceBatch(committed, entries));
          const nextCheckpoint = checkpointForBatch(batch);
          const nextControl = parseAccountRevisionControl({ ...control, headRevision: head.revision, headHash: head.entryHash,
            nativeAcceptedCount: batch.ordinal });
          const writes: Write[] = [
            { ref: evidenceRef, data: row, create: true },
            { ref: archiveRef, data: copyJSON({ schemaVersion: 1, uid, lifecycleEpoch: 1, sessionId: request.sessionId,
              evidenceId, requestHash, payload: request, receipt, archivedAt: recordedAt }) as Data, create: true },
            ...claims.flatMap(claim => [
              { ref: refs.user.collection("learningEvidenceIdentityEvents").doc(claim.id), data: claim.data, create: true },
              { ref: refs.user.collection("learningEvidenceSourceIndex").doc(claim.data.sourceHash), data: claim.index, create: true }
            ]),
            ...entries.map(entry => ({ ref: refs.journal.doc(entry.entryId), data: { ...entry }, create: true })),
            { ref: refs.batches.doc(batch.batchId), data: { ...batch }, create: true },
            { ref: refs.checkpoint, data: { ...nextCheckpoint }, create: false },
            { ref: refs.control, data: { ...nextControl }, create: false },
            { ref: refs.work, data: { schemaVersion: 1, uid, lifecycleEpoch: 1, status: "pending", targetRevision: head.revision,
              headHash: head.entryHash, aggregationVersion: control.desiredAggregationVersion, executionVersion: control.desiredExecutionVersion }, create: false }
          ];
          if (legacyData) writes.push({ ref: legacyRef, data: legacyData, create: true });
          if (updateProfile) {
            const update = { learningProfile: legacy!.learningProfile, latestAssessmentId: request.sessionId, learningProfileUpdatedAt: new Date(recordedAt) };
            writes.push({ ref: refs.user, data: update, budgetData: mergeCompletionDocument(user.data()!, update), create: false, merge: true });
          }
          // No non-Firestore I/O, clocks, quota calls, external hooks or
          // publication. All reads are above; deterministic write plans only.
          // Include the additional coordinated control document in the complete
          // protected write budget (at most 16 writes); legacy v2 keeps its 15.
          if (protectedOwner && sealCoordination) checkWrites([...writes,
            { ref: sealCoordination.ref, data: { ...sealCoordination.next }, create: false }], ACCEPTANCE_LIMITS.maximumWrites + 1);
          transport.getFirestore(); queueSealParticipant(tx, sealCoordination); persist(tx, writes); return receipt;
        });
      } catch (error) { return translate(error); }
    }
  };
}
