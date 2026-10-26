import { randomUUID } from "node:crypto";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import type { DocumentReference, DocumentSnapshot, Transaction, Query } from "firebase-admin/firestore";
import { createShadowEmulatorTransport } from "./shadowTransport";
import { acceptanceReferences, checkAdmission } from "./acceptanceState";
import { acceptanceBatchIdentity, checkpointForBatch, parseAcceptanceBatch, parseAcceptanceCheckpoint,
  initialAcceptanceCheckpoint, verifyAcceptanceCheckpoint } from "./acceptanceBatches";
import { parseJournalAnchor, journalIdentity } from "./journal";
import { parseAggregationCheckpoint, proposeCheckpointLease, verifyCheckpointAdvance } from "./controls";
import { generationIdentity } from "./generations";
import { inventoryDigest } from "./inventory";
import { canonicalJSON, copyJSON, hash, integer, jsonBytes, nextRevision, object, requireContract, ScalabilityContractError, text, typedHash } from "./values";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { legacyAssessmentFingerprint, completionSourceIdentity } from "../trainingCompletion";
import { parseShadowJob, newShadowJob, shadowPin, SHADOW_LIMITS, classifyShadowFailureCode } from "./shadowContracts";
import type { ShadowJob, ShadowPin } from "./shadowContracts";
import { parseReplayPacket, rebuildShadow } from "./shadowReplay";
import type { ReplayPacket } from "./shadowReplay";
import { assertWriterGuardContext, createSharedWriterGuard } from "./writerGuard";
import type { WriterGuardContext } from "./writerGuard";
import { readSealParticipant, queueSealParticipant } from "./sealingCoordination";
import { readProtectedTrainingState } from "./protectedTrainingPolicy";
import { createSyntheticPublicationBoundary } from "./syntheticPublicationBoundary";

type Data = Record<string, unknown>;
type Handle = Readonly<{ uid: string; generationId: string; fence: number; workerId: string; writerContext: WriterGuardContext }>;
type Event = "claimed" | "before-page" | "after-page" | "before-verification" | "verification-page" | "after-verification"
  | "before-reschedule" | "after-reschedule";
type Options = { workerId?: string; leaseMs?: number; syntheticOwnerToken?: string; onEvent?: (event: Event, handle: Handle, ordinal?: number) => Promise<void> };
type Artifact = { schemaVersion: 1; uid: string; lifecycleEpoch: number; generationId: string; pinHash: string;
  kind: string; index: number; createdFence: number; body: unknown; bodyHash: string };
/** Test orchestration for an abrupt process loss; a real crash never reaches a
 * catch block. Ordinary unexpected errors must instead leave a blocked record. */
export class ShadowWorkerInterruption extends Error {}
// Not exported or constructible from a caller-supplied error code. Created only
// AFTER full source verification and the fenced durable scheduling transaction.
class VerifiedHeadGrowth extends ScalabilityContractError {
  constructor() { super("shadow_head_changed_retry"); }
}
const key = (value: number) => String(value).padStart(16, "0");
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
// Histories are NOT documents: apply defensive byte budgets per bounded record,
// never serialize a whole history through the Stage 1 document-size validator.
const sameRecords = (left: readonly unknown[], right: readonly unknown[]) =>
  left.length === right.length && left.every((value, index) => same(value, right[index]));
const timeJSON = (time: Timestamp) => ({ seconds: time.seconds, nanoseconds: time.nanoseconds });
const atTime = (time: ShadowPin["readTime"]) => new Timestamp(time.seconds, time.nanoseconds);
export function shadowReferences(db: ReturnType<ReturnType<typeof createShadowEmulatorTransport>["getFirestore"]>, uid: string, generationId?: string) {
  parseJournalAnchor({ uid, lifecycleEpoch: 1, revision: 0, headHash: null });
  if (generationId !== undefined) hash(generationId);
  const refs = acceptanceReferences(db, uid), pointer = refs.user.collection("learningProfiles").doc("shadowWorker");
  const job = refs.user.collection("learningProfiles").doc("shadow-" + (generationId ?? "none"));
  return { ...refs, pointer, job, artifacts: job.collection("artifacts") };
}

/** Separate trusted development process, not an HTTP/client authority provider.
 * Every RPC obtains the dedicated guarded Emulator client again. */
export function createShadowWorker(options: Options = {}) {
  const workerId = options.workerId ?? randomUUID(); text(workerId, 128);
  const leaseMs = options.leaseMs ?? SHADOW_LIMITS.leaseMs;
  integer(leaseMs, 1_000); requireContract(leaseMs <= 600_000, "invalid_lease_duration");
  const transport = createShadowEmulatorTransport();
  const writerGuard = createSharedWriterGuard(transport.writerTransport);
  const synthetic = options.syntheticOwnerToken === undefined ? null : createSyntheticPublicationBoundary(options.syntheticOwnerToken, writerGuard);
  const metrics = { reads: 0, writes: 0, transactions: 0, maxTransactionReads: 0, maxTransactionWrites: 0,
    maxTransactionBytes: 0, maxDocumentBytes: 0, journalEntries: 0, sourceDocuments: 0, inventorySources: 0,
    sessions: 0, pages: 0, artifactDocuments: 0, manifestParts: 0, leaseRecoveries: 0, durationMs: 0, peakRssBytes: 0 };
  const db = () => transport.getFirestore();
  function sampleMemory() { metrics.peakRssBytes = Math.max(metrics.peakRssBytes, process.memoryUsage().rss); }
  async function transaction<T>(callback: (tx: Transaction) => Promise<T>, readTime?: ShadowPin["readTime"]): Promise<T> {
    sampleMemory();
    return writerGuard.transaction(callback, readTime ? { readOnly: true, readTime: atTime(readTime) } : { maxAttempts: 5 }, () => {
      metrics.transactions++; let reads = 0, writes = 0, bytes = 0;
      return {
        beforeRead() { requireContract(writes === 0, "shadow_read_after_write"); db(); },
        afterRead(result) {
          const count = Array.isArray(result) ? result.length : "docs" in result ? Math.max(1, result.docs.length) : 1;
          reads += count; metrics.reads += count; metrics.maxTransactionReads = Math.max(metrics.maxTransactionReads, reads);
        },
        beforeWrite(method, ref, value) {
          requireContract(method === "create" || method === "set", "shadow_transaction_method_unsupported");
          const data = value as Data;
          db(); const size = assertCompletionDocumentBudget(ref.path, data);
          requireContract(jsonBytes(data) <= SHADOW_LIMITS.pageBytes, "shadow_document_capacity");
          bytes += size; writes++;
          requireContract(writes <= SHADOW_LIMITS.transactionWrites && bytes <= SHADOW_LIMITS.transactionBytes, "shadow_transaction_capacity");
          metrics.writes++; metrics.maxTransactionWrites = Math.max(metrics.maxTransactionWrites, writes);
          metrics.maxTransactionBytes = Math.max(metrics.maxTransactionBytes, bytes); metrics.maxDocumentBytes = Math.max(metrics.maxDocumentBytes, size);
        }
      };
    });
  }
  async function controls(tx: Transaction, uid: string) {
    const refs = shadowReferences(db(), uid);
    const protection = await writerGuard.read(tx, synthetic ? await synthetic.principal(uid) : writerGuard.worker(uid)), { root, fence } = protection;
    const sealCoordination = await readSealParticipant(tx, protection, "shadow-worker");
    if (synthetic) writerGuard.assertDevelopmentTrainingAccess(protection, tx);
    else writerGuard.assertJournalAccess(protection, tx);
    const [control, admission, checkpoint, work] = await tx.getAll(refs.control, refs.admission, refs.checkpoint, refs.work);
    requireContract(control.exists && admission.exists && fence.exists && checkpoint.exists, "shadow_migration_required");
    const checked = synthetic ? await readProtectedTrainingState(tx, protection, sealCoordination, admission.data(), control.data())
      : checkAdmission(uid, admission.data(), fence.data(), control.data());
    const cp = parseAcceptanceCheckpoint(checkpoint.data());
    requireContract(cp.ordinal === checked.control.nativeAcceptedCount && cp.headRevision === checked.control.headRevision &&
      cp.headHash === checked.control.headHash && cp.uid === uid && cp.lifecycleEpoch === checked.control.lifecycleEpoch, "shadow_checkpoint_mismatch");
    requireContract(checked.control.desiredAggregationVersion === "exposure-separated-accuracy-v2" &&
      checked.control.desiredExecutionVersion === "full-generation-v1", "shadow_unsupported_version");
    if (cp.ordinal === 0) requireContract(!work.exists, "shadow_work_mismatch");
    else requireContract(same(work.data(), { schemaVersion: 1, uid, lifecycleEpoch: cp.lifecycleEpoch, status: "pending",
      targetRevision: cp.headRevision, headHash: cp.headHash, aggregationVersion: checked.control.desiredAggregationVersion,
      executionVersion: checked.control.desiredExecutionVersion }), "shadow_work_mismatch");
    return { refs, ...checked, cp, protection, sealCoordination, readTime: control.readTime, controlData: control.data()!, admissionData: admission.data()! };
  }
  function pointer(value: unknown) {
    const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "generationId", "fence"]);
    requireContract(data.schemaVersion === 1 && data.lifecycleEpoch === 1, "shadow_pointer_invalid");
    integer(data.fence, 1); text(data.uid, 128); hash(data.generationId); return data;
  }
  async function owned(tx: Transaction, handle: Handle) {
    const current = await controls(tx, handle.uid);
    // The claim captures actual server root incarnation; no job/receipt schema
    // changes. Restarting a worker must reclaim and obtain a fresh scoped handle.
    assertWriterGuardContext(current.protection.context, handle.writerContext);
    const refs = shadowReferences(db(), handle.uid, handle.generationId);
    const [savedPointer, savedJob] = await tx.getAll(refs.pointer, refs.job);
    const p = pointer(savedPointer.data()), job = parseShadowJob(savedJob.data()), cp = job.checkpoint;
    requireContract(p.uid === handle.uid && p.generationId === handle.generationId && p.fence === handle.fence &&
      cp.generationId === handle.generationId && cp.fencingToken === handle.fence && cp.lease?.workerId === handle.workerId &&
      cp.lease.fence === handle.fence && cp.lease.expiresAt > current.readTime.toDate().toISOString(), "stale_worker_fence");
    requireContract(job.state === "working" && same(job.pin.source, { uid: handle.uid, lifecycleEpoch: 1,
      revision: cp.sourceRevision, headHash: cp.sourceHeadHash }) && current.control.headRevision >= job.pin.source.revision &&
      typedHash("stage2-admission-v1", current.admission) === job.pin.admissionDigest &&
      (current.admission.bootstrap as Record<string, unknown>).bootstrapDigest === job.pin.bootstrapDigest, "shadow_pin_mismatch");
    return { ...current, refs, job };
  }
  async function claim(uid: string): Promise<Handle | null> {
    const handle = await transaction(async tx => {
      const current = await controls(tx, uid), pointerSnap = await tx.get(current.refs.pointer);
      const previousPointer = pointerSnap.exists ? pointer(pointerSnap.data()) : null;
      if (previousPointer) requireContract(previousPointer.uid === uid, "shadow_pointer_invalid");
      const pin = shadowPin(current.control, current.cp, current.admission, timeJSON(current.readTime));
      const targetId = generationIdentity(pin.source, pin.aggregationVersion, pin.executionVersion);
      const previousRef = previousPointer ? shadowReferences(db(), uid, String(previousPointer.generationId)).job : null;
      const previousSnap = previousRef ? await tx.get(previousRef) : null;
      let job: ShadowJob;
      const now = current.readTime.toDate().toISOString();
      if (previousPointer) {
        requireContract(previousSnap?.exists, "shadow_job_missing");
        const previous = parseShadowJob(previousSnap.data());
        requireContract(previous.checkpoint.generationId === previousPointer.generationId && previous.checkpoint.fencingToken === previousPointer.fence, "shadow_pointer_invalid");
        requireContract(previous.pin.source.uid === uid && previous.pin.source.lifecycleEpoch === current.control.lifecycleEpoch &&
          previous.pin.admissionDigest === pin.admissionDigest && previous.pin.bootstrapDigest === pin.bootstrapDigest, "shadow_pin_mismatch");
        if (previous.state === "blocked") throw new ScalabilityContractError("shadow_job_blocked");
        if (previous.state === "ready" || previous.state === "reschedule") {
          if (previous.retryAt && previous.retryAt > now) return null;
          if (previous.state === "reschedule") requireContract(current.cp.ordinal > previous.pin.checkpoint.ordinal &&
            current.cp.headRevision > previous.pin.source.revision, "shadow_head_not_advancing");
          if (previous.checkpoint.generationId === targetId) return null;
          const existing = await tx.get(shadowReferences(db(), uid, targetId).job);
          requireContract(!existing.exists, "shadow_generation_already_exists");
          job = newShadowJob(pin, Number(previousPointer.fence));
        } else {
          if (previous.checkpoint.lease && previous.checkpoint.lease.expiresAt > now) return null;
          if (previous.retryAt && previous.retryAt > now) return null;
          requireContract(previous.attempts < SHADOW_LIMITS.attempts, "shadow_attempts_exhausted");
          job = parseShadowJob({ ...previous, state: "working", error: null, retryAt: null });
        }
      } else {
        const existing = await tx.get(shadowReferences(db(), uid, targetId).job);
        requireContract(!existing.exists, "shadow_generation_already_exists"); job = newShadowJob(pin, 0);
      }
      const cp = proposeCheckpointLease(job.checkpoint, workerId, now, new Date(current.readTime.toMillis() + leaseMs).toISOString());
      const updated = parseShadowJob({ ...job, checkpoint: cp });
      const refs = shadowReferences(db(), uid, cp.generationId);
      queueSealParticipant(tx, current.sealCoordination); tx.set(refs.job, updated as unknown as Data);
      tx.set(refs.pointer, { schemaVersion: 1, uid, lifecycleEpoch: cp.lifecycleEpoch, generationId: cp.generationId, fence: cp.fencingToken });
      return Object.freeze({ uid, generationId: cp.generationId, fence: cp.fencingToken, workerId, writerContext: current.protection.context });
    });
    if (handle) await options.onEvent?.("claimed", handle); return handle;
  }
  async function heartbeat(handle: Handle, verifiedCount?: number) {
    return transaction(async tx => {
      const current = await owned(tx, handle), cp = current.job.checkpoint;
      let cursor = cp.cursor;
      if (verifiedCount !== undefined) {
        integer(verifiedCount); requireContract(cp.cursor.stage === "sources" && verifiedCount <= current.job.pin.checkpoint.ordinal, "shadow_cursor_invalid");
        // A restarted verification always rereads from zero, but does not erase
        // durable progress or treat an earlier partial pass as complete.
        if (verifiedCount > cursor.processedCount) cursor = { stage: "sources", processedCount: verifiedCount, afterKey: key(verifiedCount) };
      }
      const advanced = verifyCheckpointAdvance(cp, { ...cp, cursor, checkpointSequence: nextRevision(cp.checkpointSequence) }, current.readTime.toDate().toISOString());
      const checkpoint = parseAggregationCheckpoint({ ...advanced,
        lease: { ...cp.lease!, expiresAt: new Date(current.readTime.toMillis() + leaseMs).toISOString() } });
      const job = parseShadowJob({ ...current.job, checkpoint }); queueSealParticipant(tx, current.sealCoordination); tx.set(current.refs.job, job as unknown as Data); return job;
    });
  }
  function artifact(job: ShadowJob, kind: string, index: number, body: unknown): Artifact {
    return copyJSON({ schemaVersion: 1, uid: job.pin.source.uid, lifecycleEpoch: job.pin.source.lifecycleEpoch,
      generationId: job.checkpoint.generationId, pinHash: typedHash("shadow-pin-v1", job.pin), kind, index,
      createdFence: job.checkpoint.fencingToken, body, bodyHash: typedHash("shadow-artifact-v1", body) }) as unknown as Artifact;
  }
  function parseArtifact(value: unknown, job: ShadowJob, kind: string, index: number): Artifact {
    const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "generationId", "pinHash", "kind", "index", "createdFence", "body", "bodyHash"]);
    requireContract(data.schemaVersion === 1 && data.uid === job.pin.source.uid && data.lifecycleEpoch === job.pin.source.lifecycleEpoch &&
      data.generationId === job.checkpoint.generationId && data.pinHash === typedHash("shadow-pin-v1", job.pin) && data.kind === kind &&
      data.index === index && data.bodyHash === typedHash("shadow-artifact-v1", data.body), "shadow_artifact_corrupt");
    integer(data.createdFence, 1); requireContract(data.createdFence <= job.checkpoint.fencingToken, "shadow_artifact_fence");
    requireContract(jsonBytes(data) <= SHADOW_LIMITS.pageBytes, "shadow_document_capacity");
    return data as unknown as Artifact;
  }
  async function store(handle: Handle, kind: string, index: number, body: unknown, cursor?: { stage: "journal" | "sources" | "artifacts"; afterKey: string | null; processedCount: number }, phase?: "building" | "verifying") {
    await transaction(async tx => {
      const current = await owned(tx, handle), ref = current.refs.artifacts.doc(kind + "-" + key(index)), saved = await tx.get(ref);
      if (saved.exists) requireContract(same(parseArtifact(saved.data(), current.job, kind, index).body, body), "shadow_artifact_conflict");
      const cp = current.job.checkpoint;
      const checkpoint = verifyCheckpointAdvance(cp, { ...cp, checkpointSequence: nextRevision(cp.checkpointSequence),
        ...(cursor ? { cursor } : {}), ...(phase ? { phase } : {}) }, current.readTime.toDate().toISOString());
      const job = parseShadowJob({ ...current.job, checkpoint });
      queueSealParticipant(tx, current.sealCoordination);
      if (!saved.exists) tx.create(ref, artifact(job, kind, index, body) as unknown as Data);
      tx.set(current.refs.job, job as unknown as Data);
    });
  }
  async function readPacket(pin: ShadowPin, ordinal: number): Promise<ReplayPacket> {
    const refs = shadowReferences(db(), pin.source.uid);
    return transaction(async tx => {
      const batchSnap = await tx.get(refs.batches.doc(acceptanceBatchIdentity(pin.source, ordinal)));
      requireContract(batchSnap.exists, "shadow_batch_missing"); const batch = parseAcceptanceBatch(batchSnap.data());
      const journalRefs = Array.from({ length: batch.lastRevision - batch.firstRevision + 1 }, (_, offset) =>
        refs.journal.doc(journalIdentity(pin.source, batch.firstRevision + offset)));
      const entries = await tx.getAll(...journalRefs);
      requireContract(entries.every(row => row.exists), "shadow_journal_missing");
      const ids = entries.slice(1).map(row => {
        const event = row.data()!.event;
        requireContract(event.kind === "identity-decided" && typeof event.decisionId === "string" && /^[a-f0-9]{64}$/.test(event.decisionId), "shadow_decision_invalid");
        return event.decisionId as string;
      });
      const kinds: ("native" | "legacy")[] = batch.receipt.mode === "auto" ? ["native", "legacy"] : ["native"];
      const expected = [refs.archives.doc(batch.receipt.evidenceId), refs.user.collection("learningEvidence").doc(batch.receipt.evidenceId),
        ...ids.map(id => refs.user.collection("learningEvidenceIdentityEvents").doc(id)),
        ...kinds.map(kind => refs.user.collection("learningEvidenceSourceIndex").doc(completionSourceIdentity(kind, batch.receipt.sessionId))),
        ...(batch.receipt.mode === "auto" ? [refs.user.collection("assessments").doc(batch.receipt.sessionId)] : [])];
      const rows = await tx.getAll(...expected); requireContract(rows.every(row => row.exists), "shadow_source_missing");
      const row = (snapshot: DocumentSnapshot) => ({ id: snapshot.id, data: snapshot.data()! });
      return parseReplayPacket({ schemaVersion: 1, ordinal, batch, entries: entries.map(row => row.data()),
        archive: rows[0].data(), row: rows[1].data(), decisions: rows.slice(2, 2 + ids.length).map(row),
        indexes: rows.slice(2 + ids.length, 2 + ids.length + kinds.length).map(row),
        legacyFingerprint: batch.receipt.mode === "auto" ? legacyAssessmentFingerprint(rows.at(-1)!.data()!) : null }, pin);
    }, pin.readTime);
  }
  async function readArtifacts(job: ShadowJob, kind: string, count: number) {
    const refs = shadowReferences(db(), job.pin.source.uid, job.checkpoint.generationId), result: unknown[] = [];
    for (let offset = 0; offset < count; offset += SHADOW_LIMITS.pageRecords) {
      const snapshots = await transaction(tx => tx.getAll(...Array.from({ length: Math.min(SHADOW_LIMITS.pageRecords, count - offset) },
        (_, index) => refs.artifacts.doc(kind + "-" + key(offset + index)))));
      snapshots.forEach((snapshot, index) => { requireContract(snapshot.exists, "shadow_artifact_missing");
        result.push(parseArtifact(snapshot.data(), job, kind, offset + index).body); });
    }
    return result;
  }
  async function scan(query: Query, readTime: ShadowPin["readTime"], visit: (row: DocumentSnapshot) => void) {
    let after: string | null = null;
    for (;;) {
      const base = query.orderBy(FieldPath.documentId());
      const page = await transaction(tx => tx.get((after ? base.startAfter(after) : base).limit(SHADOW_LIMITS.pageRecords)), readTime);
      for (const row of page.docs) visit(row);
      if (page.size < SHADOW_LIMITS.pageRecords) return;
      after = page.docs.at(-1)!.id;
    }
  }
  /** Completeness against an independently fetched server snapshot, not a supplied
   * expected list. Includes orphan/late legacy rows, indexes, archives and batches. */
  async function verifyCoverage(job: ShadowJob, packets: readonly ReplayPacket[], current: Awaited<ReturnType<typeof controls>>, writerContext: WriterGuardContext) {
    assertWriterGuardContext(current.protection.context, writerContext);
    const pin = shadowPin(current.control, current.cp, current.admission, timeJSON(current.readTime));
    const expected = new Map<string, Set<string>>();
    for (const name of ["learningEvidence", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex", "assessments", "journal", "completionArchives", "acceptanceBatches"]) expected.set(name, new Set());
    const add = (packet: ReplayPacket) => {
      const batch = parseAcceptanceBatch(packet.batch), receipt = batch.receipt;
      expected.get("learningEvidence")!.add(receipt.evidenceId); expected.get("completionArchives")!.add(receipt.evidenceId);
      expected.get("acceptanceBatches")!.add(batch.batchId);
      if (receipt.mode === "auto") expected.get("assessments")!.add(receipt.sessionId);
      for (let revision = batch.firstRevision; revision <= batch.lastRevision; revision++) expected.get("journal")!.add(journalIdentity(pin.source, revision));
      for (const row of packet.decisions) expected.get("learningEvidenceIdentityEvents")!.add(row.id);
      for (const row of packet.indexes) expected.get("learningEvidenceSourceIndex")!.add(row.id);
    };
    let previous = initialAcceptanceCheckpoint(pin.source), predecessor: unknown;
    for (let ordinal = 1; ordinal <= pin.checkpoint.ordinal; ordinal++) {
      // Reread ALL pinned original payloads at one fresh, consistent readTime.
      // Later acceptances are verified for coverage, never added to this profile.
      const packet = await readPacket(pin, ordinal), batch = parseAcceptanceBatch(packet.batch);
      if (ordinal <= job.pin.checkpoint.ordinal) requireContract(same(packet, packets[ordinal - 1]), "shadow_source_changed");
      requireContract(same(batch.previous, previous), "shadow_batch_gap");
      previous = verifyAcceptanceCheckpoint({ ...current.control, nativeAcceptedCount: ordinal, headRevision: batch.lastRevision, headHash: batch.headHash },
        checkpointForBatch(batch), batch, packet.entries, predecessor); predecessor = batch; add(packet);
      if (ordinal === job.pin.checkpoint.ordinal) requireContract(same(previous, job.pin.checkpoint), "shadow_pin_ancestry");
      if (ordinal % 20 === 0 || ordinal === pin.checkpoint.ordinal) {
        const handle = { uid: job.pin.source.uid, generationId: job.checkpoint.generationId, fence: job.checkpoint.fencingToken, workerId, writerContext };
        await heartbeat(handle, Math.min(ordinal, job.pin.checkpoint.ordinal));
        await options.onEvent?.("verification-page", handle, ordinal);
      }
    }
    requireContract(same(previous, pin.checkpoint), "shadow_checkpoint_mismatch");
    for (const [name, ids] of expected) {
      let count = 0;
      const query = name === "journal" ? current.refs.journal : name === "completionArchives" ? current.refs.archives
        : name === "acceptanceBatches" ? current.refs.batches : current.refs.user.collection(name);
      await scan(query, pin.readTime, row => { requireContract(ids.has(row.id), "shadow_unjournaled_source_migration_required"); count++; });
      requireContract(count === ids.size, "shadow_source_coverage");
      await heartbeat({ uid: job.pin.source.uid, generationId: job.checkpoint.generationId, fence: job.checkpoint.fencingToken, workerId, writerContext });
    }
    return current;
  }
  async function rescheduleGrowth(handle: Handle, job: ShadowJob, packets: readonly ReplayPacket[], before: Awaited<ReturnType<typeof controls>>) {
    const observed = await transaction(tx => controls(tx, handle.uid));
    const { headRevision: _revision, headHash: _hash, nativeAcceptedCount: _count, ...oldSettings } = before.control;
    const { headRevision: _newRevision, headHash: _newHash, nativeAcceptedCount: _newCount, ...newSettings } = observed.control;
    requireContract(same(oldSettings, newSettings) && observed.cp.ordinal > before.cp.ordinal &&
      observed.cp.headRevision > before.cp.headRevision, "shadow_control_changed");
    // A changed counter alone is not growth. Recheck ALL sources and the entire
    // journal through an authoritative new snapshot, including the original pin.
    // Any corruption here follows the ordinary fail-closed error path.
    await verifyCoverage(job, packets, observed, handle.writerContext);
    await options.onEvent?.("before-reschedule", handle);
    await transaction(async tx => {
      const current = await owned(tx, handle);
      requireContract(current.cp.ordinal >= observed.cp.ordinal && current.cp.headRevision >= observed.cp.headRevision,
        "shadow_checkpoint_mismatch");
      // Acceptance can continue during verification. Validate the latest stored
      // tail/checkpoint and retain the previously verified cutoff commitment.
      // This is scheduling only, NOT full-source attestation of that newer tail.
      const savedBatch = await tx.get(current.refs.batches.doc(current.cp.batchId!));
      const batch = parseAcceptanceBatch(savedBatch.data());
      const entries = await tx.getAll(...Array.from({ length: batch.lastRevision - batch.firstRevision + 1 }, (_, offset) =>
        current.refs.journal.doc(journalIdentity(batch, batch.firstRevision + offset))));
      const predecessor = batch.previous.batchId === null ? undefined : await tx.get(current.refs.batches.doc(batch.previous.batchId));
      verifyAcceptanceCheckpoint(current.control, current.cp, batch, entries.map(row => row.data()), predecessor?.data());
      const anchor = batch.ordinal === observed.cp.ordinal ? batch :
        parseAcceptanceBatch((await tx.get(current.refs.batches.doc(observed.cp.batchId!))).data());
      requireContract(same(checkpointForBatch(anchor), observed.cp), "shadow_checkpoint_mismatch");
      const previous = current.job;
      const deferred = parseShadowJob({ ...previous, state: "reschedule", error: "shadow_head_changed_retry",
        retryAt: new Date(current.readTime.toMillis() + SHADOW_LIMITS.headChangeBackoffMs).toISOString(),
        checkpoint: { ...previous.checkpoint, phase: "queued", lease: null,
          checkpointSequence: nextRevision(previous.checkpoint.checkpointSequence) } });
      // Never touch journalWork, sources, artifacts or a newer generation pointer.
      // attempts is unchanged: valid growth is not an integrity/RPC failure.
      queueSealParticipant(tx, current.sealCoordination); tx.set(current.refs.job, deferred as unknown as Data);
    });
    await options.onEvent?.("after-reschedule", handle);
    throw new VerifiedHeadGrowth();
  }
  async function run(handle: Handle) {
    const started = performance.now();
    try {
      let job = await heartbeat(handle);
      // The journal pin never changes. A restarted worker may use a fresh
      // consistent database snapshot to retrieve that SAME immutable prefix;
      // original journal/evidence hashes and final coverage still must match.
      // Do not make durable recovery depend on a weeks-old Firestore readTime.
      const replayState = await transaction(tx => controls(tx, handle.uid));
      const replayPin = { ...job.pin, readTime: timeJSON(replayState.readTime) };
      if (job.checkpoint.cursor.stage === "journal") {
        for (let ordinal = job.checkpoint.cursor.processedCount + 1; ordinal <= job.pin.checkpoint.ordinal; ordinal++) {
          await options.onEvent?.("before-page", handle, ordinal);
          const packet = await readPacket(replayPin, ordinal);
          await store(handle, "packet", ordinal - 1, packet, { stage: "journal", afterKey: key(ordinal), processedCount: ordinal });
          await options.onEvent?.("after-page", handle, ordinal);
          if (ordinal % 20 === 0) job = await heartbeat(handle);
        }
      }
      job = await heartbeat(handle);
      const packets = await readArtifacts(job, "packet", job.pin.checkpoint.ordinal) as ReplayPacket[];
      const bootstrap = (await transaction(tx => controls(tx, handle.uid))).admission.bootstrap;
      const rebuilt = rebuildShadow(job.pin, bootstrap, packets);
      metrics.sessions = packets.length; metrics.journalEntries = rebuilt.entries.length; metrics.inventorySources = rebuilt.sourceCount;
      metrics.sourceDocuments = packets.reduce((count, packet) => count + 3 + packet.entries.length + packet.decisions.length + packet.indexes.length +
        Number(packet.legacyFingerprint !== null), 0); // batch + archive + evidence + journal + decisions + indexes + optional legacy
      metrics.pages = packets.length + rebuilt.pages.length; metrics.manifestParts = rebuilt.parts.length;
      metrics.artifactDocuments = metrics.pages + rebuilt.parts.length + 2; sampleMemory();
      await store(handle, "profile", 0, rebuilt.profile);
      for (const page of rebuilt.pages) await store(handle, "references", page.index, page);
      for (const part of rebuilt.parts) await store(handle, "part", part.index, part);
      await store(handle, "manifest", 0, rebuilt.manifest,
        job.checkpoint.cursor.stage === "journal" ? { stage: "sources", afterKey: null, processedCount: 0 } : undefined, "verifying");
      await options.onEvent?.("before-verification", handle);
      job = await heartbeat(handle);
      const current = await transaction(tx => controls(tx, handle.uid));
      await verifyCoverage(job, packets, current, handle.writerContext);
      // Reread every persisted output, including raw packets. Hash and semantic
      // equality is independently checked against a rebuild, not an input manifest.
      requireContract(sameRecords(await readArtifacts(job, "packet", packets.length), packets), "shadow_packet_changed");
      requireContract(same((await readArtifacts(job, "profile", 1))[0], rebuilt.profile), "shadow_profile_changed");
      requireContract(sameRecords(await readArtifacts(job, "references", rebuilt.pages.length), rebuilt.pages), "shadow_pages_changed");
      requireContract(sameRecords(await readArtifacts(job, "part", rebuilt.parts.length), rebuilt.parts), "shadow_parts_changed");
      requireContract(same((await readArtifacts(job, "manifest", 1))[0], rebuilt.manifest), "shadow_manifest_changed");
      const expectedArtifacts = new Set(["profile-" + key(0), "manifest-" + key(0),
        ...packets.map((_, index) => "packet-" + key(index)), ...rebuilt.pages.map(page => "references-" + key(page.index)),
        ...rebuilt.parts.map(part => "part-" + key(part.index))]);
      const artifactRead = await transaction(tx => tx.get(shadowReferences(db(), handle.uid, handle.generationId).job));
      let artifactCount = 0;
      await scan(shadowReferences(db(), handle.uid, handle.generationId).artifacts, timeJSON(artifactRead.readTime), row => {
        requireContract(expectedArtifacts.has(row.id), "shadow_unexpected_artifact"); artifactCount++;
      });
      requireContract(artifactCount === expectedArtifacts.size, "shadow_artifact_missing");
      await options.onEvent?.("after-verification", handle);
      const finished = await transaction(async tx => {
        const checked = await owned(tx, handle), cp = checked.job.checkpoint;
        if (!same(checked.controlData, current.controlData) || !same(checked.cp, current.cp)) return false;
        const checkpoint = verifyCheckpointAdvance(cp, { ...cp, phase: "ready", checkpointSequence: nextRevision(cp.checkpointSequence),
          cursor: { stage: "artifacts", afterKey: null, processedCount: 0 }, manifestHash: rebuilt.manifest.manifestHash }, checked.readTime.toDate().toISOString());
        const ready = parseShadowJob({ ...checked.job, checkpoint, state: "ready", verification: {
          status: "trusted-source-shadow-verified", asOf: timeJSON(current.readTime), inventoryDigest: inventoryDigest(job.pin.source, rebuilt.inventory.sourceReferences),
          manifestHash: rebuilt.manifest.manifestHash, nativeAcceptedCount: packets.length,
          publicationAuthorized: false, stage1Authority: "NOT VERIFIED" } });
        queueSealParticipant(tx, checked.sealCoordination); tx.set(checked.refs.job, ready as unknown as Data);
        return true;
      });
      if (!finished) await rescheduleGrowth(handle, job, packets, current);
      metrics.durationMs += Math.round(performance.now() - started); return parseShadowJob((await transaction(tx => tx.get(shadowReferences(db(), handle.uid, handle.generationId).job))).data());
    } catch (error) {
      metrics.durationMs += Math.round(performance.now() - started);
      // A crash/event hook is not translated into success. Preserve the existing
      // lease/checkpoint, or an already committed reschedule, for later recovery.
      if (error instanceof ShadowWorkerInterruption || error instanceof VerifiedHeadGrowth) throw error;
      const failureCode = error && typeof error === "object" && "code" in error ? error.code : null;
      const raw = typeof failureCode === "string" || typeof failureCode === "number" ? String(failureCode) : "shadow_worker_error";
      const transient = classifyShadowFailureCode(failureCode) === "transient";
      const code = /^[a-z0-9_-]{1,100}$/.test(raw) ? raw : "shadow_worker_error";
      try {
        await transaction(async tx => {
          // A damaged source/checkpoint must still leave an explicit blocked job.
          // Do not require that damaged source to validate a second time. Scope,
          // root existence, actual pointer, live lease and fence remain mandatory.
          const refs = shadowReferences(db(), handle.uid, handle.generationId);
          const protection = await writerGuard.read(tx, synthetic ? await synthetic.principal(handle.uid) : writerGuard.worker(handle.uid), handle.writerContext);
          const sealCoordination = await readSealParticipant(tx, protection, "shadow-worker");
          if (synthetic) writerGuard.assertDevelopmentTrainingAccess(protection, tx);
          else writerGuard.assertJournalAccess(protection, tx);
          const [control, savedPointer, savedJob] = await tx.getAll(refs.control, refs.pointer, refs.job);
          requireContract(control.data()?.uid === handle.uid && control.data()?.lifecycleEpoch === 1 &&
            control.data()?.lifecycle === "active", "shadow_account_not_active");
          const p = pointer(savedPointer.data()), previous = parseShadowJob(savedJob.data());
          requireContract(p.uid === handle.uid && p.generationId === handle.generationId && p.fence === handle.fence &&
            previous.checkpoint.fencingToken === handle.fence && previous.checkpoint.lease?.workerId === handle.workerId &&
            previous.checkpoint.lease.expiresAt > savedJob.readTime.toDate().toISOString() && previous.state === "working", "stale_worker_fence");
          const current = { job: previous, refs, readTime: savedJob.readTime }, attempts = nextRevision(previous.attempts);
          const retry = transient && attempts < SHADOW_LIMITS.attempts;
          const job = parseShadowJob({ ...current.job, state: retry ? "retry" : "blocked", error: code, attempts,
            retryAt: retry ? new Date(current.readTime.toMillis() + 1_000 * 2 ** attempts).toISOString() : null,
            checkpoint: { ...current.job.checkpoint, lease: null, phase: retry ? "queued" : "failed",
              checkpointSequence: nextRevision(current.job.checkpoint.checkpointSequence) } });
          queueSealParticipant(tx, sealCoordination); tx.set(current.refs.job, job as unknown as Data);
        });
      } catch { /* Lost fence/deletion: NEVER modify the replacement job. */ }
      throw error;
    }
  }
  async function observePendingPage(limit = 10, afterPath: string | null = null) {
      integer(limit, 1); requireContract(limit <= 20, "shadow_observation_limit");
      if (afterPath !== null) requireContract(/^users\/[^/]+\/learningProfiles\/journalWork$/.test(afterPath), "shadow_observation_cursor");
      const query = db().collectionGroup("learningProfiles").where("status", "==", "pending").orderBy(FieldPath.documentId());
      const page = await (afterPath ? query.startAfter(afterPath) : query).limit(limit).get();
      metrics.reads += Math.max(1, page.size);
      const uids = page.docs.filter(row => row.id === "journalWork" && row.ref.parent.parent?.parent.id === "users")
        .map(row => { const uid = row.ref.parent.parent!.id; parseJournalAnchor({ uid, lifecycleEpoch: 1, revision: 0, headHash: null }); return uid; });
      return { uids, afterPath: page.size < limit ? null : page.docs.at(-1)!.ref.path };
  }
  /** A suspended process can outlive its lease. NEVER renew the stale handle:
   * re-enter the server-time claim transaction and obtain a NEW fence. A live
   * replacement makes claim return null; the supervisor cannot steal its work. */
  async function processOwner(uid: string) {
    for (let attempt = 0; attempt < SHADOW_LIMITS.attempts; attempt++) {
      const handle = await claim(uid);
      if (!handle) return null;
      try { return { handle, job: await run(handle) }; }
      catch (error) {
        if (error instanceof ShadowWorkerInterruption) throw error;
        // One durable reschedule per owner per sweep. A later sweep respects
        // server-time retryAt and coalesces all accepted work into a fresh pin.
        if (error instanceof VerifiedHeadGrowth) return null;
        const code = error && typeof error === "object" && "code" in error ? error.code : null;
        if (code === "stale_worker_fence") { metrics.leaseRecoveries++; continue; }
        if (classifyShadowFailureCode(code) === "transient") {
          // No unbounded busy loop; the durable job still enforces its own
          // server-time retryAt/attempt limit on the next claim.
          await new Promise(resolve => setTimeout(resolve, 4_000)); continue;
        }
        throw error;
      }
    }
    throw new ScalabilityContractError("shadow_supervisor_retry_limit");
  }
  return Object.freeze({ claim, run, processOwner, heartbeat, metrics, observePendingPage,
    async observePending(limit = 10) { return (await observePendingPage(limit)).uids; }, close: async () => { await synthetic?.close(); await transport.close(); } });
}
