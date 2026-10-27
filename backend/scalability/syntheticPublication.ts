import { FieldPath } from "firebase-admin/firestore";
import type { DocumentSnapshot, Query, QuerySnapshot, Transaction } from "firebase-admin/firestore";
import { createStage2EmulatorTransport } from "./acceptanceTransport";
import { acceptanceReferences } from "./acceptanceState";
import { createSharedWriterGuard, assertWriterGuardContext } from "./writerGuard";
import type { WriterGuardContext } from "./writerGuard";
import { readSealParticipant } from "./sealingCoordination";
import { parseSealHandle, parseSealManifest, verifySealPages } from "./sealingContracts";
import { readProtectedTrainingState } from "./protectedTrainingPolicy";
import { createDevelopmentPublisher } from "./publication";
import { createShadowWorker } from "./shadowWorker";
import { createSyntheticPublicationBoundary, assertSyntheticPublicationEnvironment } from "./syntheticPublicationBoundary";
import { parseShadowJob } from "./shadowContracts";
import { parseReplayPacket } from "./shadowReplay";
import { parseAcceptanceBatch, parseAcceptanceCheckpoint, verifyAcceptanceCheckpoint } from "./acceptanceBatches";
import { journalIdentity } from "./journal";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { canonicalJSON, hash, integer, jsonBytes, requireContract, typedHash } from "./values";

export const SYNTHETIC_PUBLICATION_PROTOCOL = "synthetic-emulator-publication-stage4g-v1";
const key = (n: number) => String(n).padStart(16, "0");
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
const version = (r: DocumentSnapshot) => r.exists ? { seconds: r.updateTime!.seconds, nanoseconds: r.updateTime!.nanoseconds } : null;
const seed = (uid: string, generationId: string) => typedHash("synthetic-history-start-stage4g-v1", { uid, generationId });
const fold = (previous: string, index: number, row: unknown) => typedHash("synthetic-history-fold-stage4g-v1", { previous, index, row });
type Hook = "after-verification" | "before-commit" | "after-commit";

/** Synthetic success is a distinct protocol and namespace. It never sets
 * journalControl.published, admission, learningProfiles/cumulative, or a v1 receipt.
 * Full query reads in the final transaction close source/phantom races locally;
 * this is deliberately NOT a constant-cost production publication algorithm. */
export function createSyntheticPublicationService(options: { onEvent?: (event: Hook) => Promise<void> } = {}) {
  assertSyntheticPublicationEnvironment();
  const transport = createStage2EmulatorTransport(), guard = createSharedWriterGuard(transport);
  const db = () => { assertSyntheticPublicationEnvironment(); return transport.getFirestore(); };
  const refs = (uid: string, id?: string) => {
    const r = acceptanceReferences(db(), uid), profiles = r.user.collection("learningProfiles");
    return { ...r, pointer: profiles.doc("syntheticPublicationStage4g"),
      record: profiles.doc("syntheticGeneration-" + (id ?? "none")), job: profiles.doc("shadow-" + (id ?? "none")),
      worker: profiles.doc("shadowWorker") };
  };
  async function operation(token: string) {
    const boundary = createSyntheticPublicationBoundary(token, guard);
    try { return { boundary, principal: await boundary.principal() }; }
    catch (e) { await boundary.close(); throw e; }
  }
  async function checked(tx: Transaction, principal: Awaited<ReturnType<typeof guard.authenticate>>) {
    const p = await guard.read(tx, principal); guard.assertDevelopmentTrainingAccess(p, tx);
    const seal = await readSealParticipant(tx, p, "publication"), r = refs(principal.uid);
    const [admission, control, savedCheckpoint] = await tx.getAll(r.admission, r.control, r.checkpoint);
    const state = await readProtectedTrainingState(tx, p, seal, admission.data(), control.data());
    requireContract(savedCheckpoint.exists, "acceptance_checkpoint_invalid");
    const checkpoint = parseAcceptanceCheckpoint(savedCheckpoint.data());
    requireContract(checkpoint.uid === state.control.uid && checkpoint.lifecycleEpoch === state.control.lifecycleEpoch &&
      checkpoint.ordinal === state.control.nativeAcceptedCount && checkpoint.headRevision === state.control.headRevision &&
      checkpoint.headHash === state.control.headHash, "acceptance_checkpoint_invalid");
    // The mutable count is not an independent source of accepted sessions.
    // Reuse the bounded committed-tail verifier; this does not assert full
    // inventory/origin authority or rewrite any evidence, counter or receipt.
    if (checkpoint.ordinal === 0) {
      verifyAcceptanceCheckpoint(state.control, checkpoint);
      const [batches, journal] = await Promise.all([tx.get(r.batches.limit(1)), tx.get(r.journal.limit(1))]);
      requireContract(batches.empty && journal.empty, "acceptance_checkpoint_invalid");
    } else {
      const savedBatch = await tx.get(r.batches.doc(checkpoint.batchId!));
      requireContract(savedBatch.exists, "acceptance_checkpoint_invalid");
      const batch = parseAcceptanceBatch(savedBatch.data());
      const entries = Array.from({ length: batch.lastRevision - batch.firstRevision + 1 }, (_, offset) =>
        r.journal.doc(journalIdentity(batch, batch.firstRevision + offset)));
      const rows = await tx.getAll(...entries, ...(batch.previous.batchId === null ? [] : [r.batches.doc(batch.previous.batchId)]));
      requireContract(rows.every(row => row.exists), "acceptance_checkpoint_invalid");
      verifyAcceptanceCheckpoint(state.control, checkpoint, batch, rows.slice(0, entries.length).map(row => row.data()),
        batch.previous.batchId === null ? undefined : rows.at(-1)!.data());
    }
    if (seal!.control.phase === "sealed") {
      const attempt = await tx.get(seal!.ref.collection("attempts").doc(seal!.control.sealId!)), data = attempt.data();
      requireContract(data?.phase === "sealed", "synthetic_seal_metadata_invalid");
      const handle = parseSealHandle(data!.handle), manifest = parseSealManifest(data!.manifest, handle, data!.inventoryPin);
      assertWriterGuardContext(p.context, handle.pin.context);
      requireContract(handle.sealId === seal!.control.sealId && handle.pin.sourceRevision === seal!.control.sourceRevision &&
        handle.pin.revocationFence === seal!.control.revocationFence, "synthetic_seal_metadata_invalid");
      const pages = await tx.get(attempt.ref.collection("pages").orderBy(FieldPath.documentId()).limit(manifest.pageCount + 1));
      requireContract(pages.size === manifest.pageCount, "synthetic_seal_metadata_invalid");
      verifySealPages(handle, manifest, pages.docs.map(row => row.data()));
    }
    return { p, seal: seal!, state, r, checkpoint };
  }
  async function scan(tx: Transaction, query: Query, visit: (r: DocumentSnapshot) => void) {
    let after: string | null = null, count = 0;
    for (;;) {
      const q = query.orderBy(FieldPath.documentId());
      const page: QuerySnapshot = await tx.get((after ? q.startAfter(after) : q).limit(20));
      for (const row of page.docs) { requireContract(++count <= 12_000, "synthetic_publication_capacity"); visit(row); }
      if (page.size < 20) return;
      after = page.docs.at(-1)!.id;
    }
  }
  function validateRecord(raw: Record<string, unknown>, uid: string, context: WriterGuardContext) {
    const { publicationHash, ...body } = raw;
    requireContract(raw.schemaVersion === 1 && raw.protocol === SYNTHETIC_PUBLICATION_PROTOCOL && raw.status === "synthetic-published" &&
      raw.uid === uid && raw.authority === "NOT VERIFIED" && raw.productionPublication === false &&
      publicationHash === typedHash("synthetic-publication-record-stage4g-v1", body), "synthetic_publication_invalid");
    assertWriterGuardContext(context, raw.context); hash(raw.generationId); hash(raw.historyHash); hash(raw.profileHash);
    integer(raw.sessionCount, 1); integer(raw.pointerVersion, 1);
    return raw;
  }
  async function publish(token: string, generationId: string) {
    hash(generationId); const { boundary, principal } = await operation(token);
    const verifier = createDevelopmentPublisher({ syntheticOwnerToken: token });
    try {
      // A committed record is immutable and original-receipt recovery is valid
      // even after later acceptance. Fresh lifecycle checks still precede replay.
      const original = await guard.transaction(async tx => {
        const c = await checked(tx, principal), saved = await tx.get(refs(principal.uid, generationId).record);
        return saved.exists ? validateRecord(saved.data()!, principal.uid, c.p.context) : null;
      });
      if (original) return original;
      const candidate = await verifier.inspectSynthetic(generationId);
      let historyHash = seed(principal.uid, generationId);
      for (let i = 0; i < candidate.current.cp.ordinal; i++) {
        const packet = parseReplayPacket(candidate.artifacts.get("packet-" + key(i)), candidate.current.job.pin);
        historyHash = fold(historyHash, i, { id: (packet.batch as { receipt: { evidenceId: string } }).receipt.evidenceId, data: packet.row,
          details: packet.archive.payload });
      }
      await options.onEvent?.("after-verification"); await options.onEvent?.("before-commit");
      const receipt = await guard.transaction(async tx => {
        // Rechecked on EVERY SDK callback attempt, including external origin state.
        await boundary.principal(principal.uid);
        const c = await checked(tx, principal), r = refs(principal.uid, generationId);
        const [saved, pointer, ...metadata] = await tx.getAll(r.record, r.pointer,
          ...candidate.current.rows.map(row => row.ref));
        if (saved.exists) return validateRecord(saved.data()!, principal.uid, c.p.context);
        requireContract(metadata.every((row, i) => same(version(row), version(candidate.current.rows[i]))), "synthetic_publication_state_changed");
        requireContract(same(c.seal.control, candidate.current.coordination?.control), "synthetic_publication_seal_changed");
        // A ready job is no longer executing. Publication has its own fresh
        // guard/CAS and never uses an expired worker lease as a write capability.
        // Pointer/job versions above fence a takeover, including after a crash.
        requireContract(candidate.current.job.state === "ready", "publication_generation_not_ready");
        let totalBytes = 0;
        for (const [name, ids] of candidate.expected) {
          let count = 0;
          const q = name === "journal" ? r.journal : name === "archives" ? r.archives : name === "batches" ? r.batches : r.user.collection(name);
          await scan(tx, q, row => {
            requireContract(ids.has(row.id) && same(version(row), candidate.sourceVersions.get(row.ref.path)), "synthetic_publication_source_changed");
            totalBytes += assertCompletionDocumentBudget(row.ref.path, row.data()); count++;
          });
          requireContract(count === ids.size, "synthetic_publication_source_missing");
        }
        let artifacts = 0;
        await scan(tx, r.job.collection("artifacts"), row => {
          requireContract(candidate.artifactVersions.has(row.id) && same(version(row), candidate.artifactVersions.get(row.id)), "synthetic_publication_artifact_changed");
          totalBytes += jsonBytes(row.data()); artifacts++;
        });
        requireContract(artifacts === candidate.artifacts.size && totalBytes <= 6 * 1024 * 1024, "synthetic_publication_capacity");
        const previous = pointer.exists ? validateRecord(pointer.data()!, principal.uid, c.p.context) : null;
        requireContract(!previous || (previous.source as { revision: number }).revision < candidate.current.job.pin.source.revision, "synthetic_publication_rollback");
        const body = { schemaVersion: 1, protocol: SYNTHETIC_PUBLICATION_PROTOCOL, status: "synthetic-published", uid: principal.uid,
          context: c.p.context, source: candidate.current.job.pin.source, generationId, sessionCount: candidate.current.cp.ordinal,
          manifestHash: candidate.manifest.manifestHash, profileHash: candidate.manifest.profileHash, historyHash,
          inventoryDigest: candidate.report.inventoryDigest, artifactDigest: candidate.report.artifactDigest,
          workerFence: candidate.current.job.checkpoint.fencingToken, checkpointSequence: candidate.current.job.checkpoint.checkpointSequence,
          // Explicit snapshot seal binds Stage 4D coordination to this verified
          // source cutoff. It does NOT forge a Stage 4D trusted admission manifest.
          seal: { control: c.seal.control, enrollmentManifestHash: c.state.admission.manifestHash },
          pointerVersion: previous ? Number(previous.pointerVersion) + 1 : 1,
          publishedAt: c.p.root.readTime.toDate().toISOString(), authority: "NOT VERIFIED", productionPublication: false };
        const value = { ...body, publicationHash: typedHash("synthetic-publication-record-stage4g-v1", body) };
        assertCompletionDocumentBudget(r.record.path, value); assertCompletionDocumentBudget(r.pointer.path, value);
        tx.create(r.record, value); tx.set(r.pointer, value); return value;
      });
      await options.onEvent?.("after-commit"); return receipt;
    } finally { await verifier.close(); await boundary.close(); }
  }
  return Object.freeze({ publish,
    async aggregate(token: string) {
      const { boundary, principal } = await operation(token);
      const worker = createShadowWorker({ syntheticOwnerToken: token });
      try {
        const result = await worker.processOwner(principal.uid);
        if (result) return result;
        // Crash after aggregation/response loss must still allow publishing the
        // already-ready generation, without reclaiming or changing its fence.
        return await guard.transaction(async tx => {
          const c = await checked(tx, principal), pointer = await tx.get(c.r.worker);
          if (!pointer.exists) return null;
          const id = pointer.data()!.generationId; hash(id);
          const job = parseShadowJob((await tx.get(refs(principal.uid, String(id)).job)).data());
          if (job.state !== "ready" || job.pin.source.revision !== c.state.control.headRevision ||
            job.pin.source.headHash !== c.state.control.headHash) return null;
          return { handle: { generationId: String(id) }, job };
        });
      }
      finally { await worker.close(); await boundary.close(); }
    },
    async status(token: string) {
      const { boundary, principal } = await operation(token);
      try { return await guard.transaction(async tx => {
        const p = await guard.read(tx, principal); guard.assertDevelopmentTrainingAccess(p, tx);
        const r0 = refs(principal.uid), [admission, control, checkpoint] = await tx.getAll(r0.admission, r0.control, r0.checkpoint);
        if (!admission.exists && !control.exists) {
          requireContract(!checkpoint.exists, "acceptance_checkpoint_invalid");
          // An empty freshly provisioned synthetic student is not a missing
          // published generation. Partial/unindexed histories are never zeros.
          const histories = await Promise.all([r0.journal, r0.archives, r0.batches, ...["learningEvidence", "assessments", "learningEvidenceIdentityEvents",
            "learningEvidenceSourceIndex"].map(name => r0.user.collection(name))].map(q => tx.get(q.limit(1))));
          requireContract(histories.every(q => q.empty), "synthetic_history_unresolved");
          return { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid: principal.uid, authority: "NOT VERIFIED", accepted: { sessionCount: 0, revision: 0, headHash: null }, publication: null, profile: null };
        }
        const c = await checked(tx, principal), saved = await tx.get(c.r.pointer);
        const accepted = { sessionCount: c.checkpoint.ordinal, revision: c.checkpoint.headRevision, headHash: c.checkpoint.headHash };
        if (!saved.exists) return { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid: principal.uid, authority: "NOT VERIFIED", accepted, publication: null, profile: null };
        const publication = validateRecord(saved.data()!, principal.uid, c.p.context), r = refs(principal.uid, String(publication.generationId));
        requireContract((publication.source as { revision: number }).revision <= accepted.revision, "synthetic_publication_rollback");
        const profile = await tx.get(r.job.collection("artifacts").doc("profile-" + key(0)));
        requireContract(profile.exists && typedHash("shadow-profile-v1", profile.data()!.body) === publication.profileHash, "synthetic_publication_profile_changed");
        return { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid: principal.uid, authority: "NOT VERIFIED", accepted, publication, profile: profile.data()!.body };
      }); } finally { await boundary.close(); }
    },
    async history(token: string, generationId: string, after = 0, limit = 10) {
      hash(generationId); integer(after); integer(limit, 1); requireContract(limit <= 20, "synthetic_history_limit");
      const { boundary, principal } = await operation(token);
      try { return await guard.transaction(async tx => {
        const c = await checked(tx, principal), r = refs(principal.uid, generationId), saved = await tx.get(r.record);
        requireContract(saved.exists, "synthetic_publication_missing");
        const publication = validateRecord(saved.data()!, principal.uid, c.p.context), total = Number(publication.sessionCount);
        requireContract(after <= total, "synthetic_history_cursor");
        const job = parseShadowJob((await tx.get(r.job)).data());
        requireContract(job.checkpoint.generationId === generationId && same(job.pin.source, publication.source), "synthetic_history_pin_changed");
        const count = Math.min(limit, total - after);
        const pages = count ? await tx.getAll(...Array.from({ length: count }, (_, i) => r.job.collection("artifacts").doc("packet-" + key(after + i)))) : [];
        const rows = pages.map((row, i) => {
          requireContract(row.exists && row.data()!.bodyHash === typedHash("shadow-artifact-v1", row.data()!.body), "synthetic_history_changed");
          const p = parseReplayPacket(row.data()!.body, job.pin);
          requireContract(p.ordinal === after + i + 1, "synthetic_history_cursor");
          return { id: (p.batch as { receipt: { evidenceId: string } }).receipt.evidenceId, data: p.row, details: p.archive.payload };
        });
        return { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid: principal.uid, generationId, publicationHash: publication.publicationHash,
          offset: after, rows, next: after + count < total ? after + count : null, total };
      }); } finally { await boundary.close(); }
    },
    close: transport.close
  });
}
