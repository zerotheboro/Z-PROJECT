import { FieldPath, Timestamp } from "firebase-admin/firestore";
import type { DocumentSnapshot, Query, Transaction } from "firebase-admin/firestore";
import { createStage2EmulatorTransport, assertStage2Environment } from "./acceptanceTransport";
import { acceptanceReferences, checkAdmission } from "./acceptanceState";
import { createSharedWriterGuard } from "./writerGuard";
import type { WriterPrincipal } from "./writerGuard";
import { readSealParticipant } from "./sealingCoordination";
import { readProtectedTrainingState } from "./protectedTrainingPolicy";
import { createSyntheticPublicationBoundary } from "./syntheticPublicationBoundary";
import { initialAcceptanceCheckpoint, parseAcceptanceBatch, parseAcceptanceCheckpoint, checkpointForBatch,
  verifyAcceptanceCheckpoint, acceptanceBatchIdentity } from "./acceptanceBatches";
import { journalIdentity, verifyJournalContinuity } from "./journal";
import { parseShadowJob, SHADOW_LIMITS } from "./shadowContracts";
import { rebuildShadow, parseReplayPacket } from "./shadowReplay";
import type { ReplayPacket } from "./shadowReplay";
import { parseGenerationManifest, verifyGenerationStructure } from "./generations";
import { inventoryDigest } from "./inventory";
import { completionSourceIdentity, legacyAssessmentFingerprint } from "../trainingCompletion";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { CUMULATIVE_PROFILE_VERSION, CUMULATIVE_AGGREGATION_VERSION } from "../../src/quiz/cumulativeProfile";
import { canonicalJSON, hash, integer, jsonBytes, object, requireContract, typedHash } from "./values";
import { EVIDENCE_PROTOCOL, PUBLICATION_POLICY, PUBLICATION_PROTOCOL, parseDevelopmentPublication,
  assertPublicationArtifactCount, parsePublicationCoordinator, parsePublicationVerification, publicationAuthorityBlockers } from "./publicationContracts";

type Environment = Readonly<Record<string, string | undefined>>;
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
const key = (index: number) => String(index).padStart(16, "0");
const time = (value: Timestamp) => ({ seconds: value.seconds, nanoseconds: value.nanoseconds });
const version = (row: DocumentSnapshot) => row.exists ? time(row.updateTime!) : null;
export function assertPublicationEnvironment(env: Environment = process.env) {
  requireContract(env.TRAINING_PUBLICATION_STAGE3B === "emulator-only", "publication_disabled");
  assertStage2Environment(env);
}
export type PublicationEvent = "after-source-verification" | "before-cas" | "after-cas";

/** Separate development process. No database/auth/authority injection and no
 * production import. Only verified Emulator tokens select the owner path.
 * No pointer/coordinator/authorization write path is enabled in this stage. */
export function createDevelopmentPublisher(options: { syntheticOwnerToken?: string; onEvent?: (event: PublicationEvent) => Promise<void> } = {}) {
  assertPublicationEnvironment();
  const transport = createStage2EmulatorTransport();
  const writerGuard = createSharedWriterGuard(transport);
  const synthetic = options.syntheticOwnerToken === undefined ? null : createSyntheticPublicationBoundary(options.syntheticOwnerToken, writerGuard);
  // Principals are scoped to one authenticated operation, never cached by UID.
  // load() also serves immutable historical reads; protected writes remain
  // impossible even when called by the operator-side verification path.
  const metrics = { verificationReads: 0, verificationTransactions: 0, casReads: 0, casAttempts: 0,
    writes: 0, maxCasReads: 0, maxDocumentBytes: 0, maxArtifactJSONBytes: 0, peakRssBytes: 0, verificationMs: 0, casMs: 0 };
  const db = () => { assertPublicationEnvironment(); return transport.getFirestore(); };
  function refs(uid: string, generationId: string) {
    hash(generationId);
    const base = acceptanceReferences(db(), uid), profiles = base.user.collection("learningProfiles");
    const job = profiles.doc("shadow-" + generationId);
    return { ...base, job, artifacts: job.collection("artifacts"), worker: profiles.doc("shadowWorker"),
      publication: profiles.doc("developmentPublicationStage3b"), coordinator: profiles.doc("developmentPublicationCoordinatorStage3b") };
  }
  async function read<T>(callback: (tx: Transaction) => Promise<T>, at?: Timestamp): Promise<T> {
    metrics.peakRssBytes = Math.max(metrics.peakRssBytes, process.memoryUsage().rss);
    return writerGuard.transaction(callback, at ? { readOnly: true, readTime: at } : { readOnly: true }, () => {
      metrics.verificationTransactions++;
      return {
        afterRead(result) {
          db();
          metrics.verificationReads += Array.isArray(result) ? result.length : "docs" in result ? Math.max(1, result.size) : 1;
        },
        beforeWrite() { throw new Error("publication_verifier_is_read_only"); }
      };
    });
  }
  async function load(tx: Transaction, uid: string, generationId: string, principal: WriterPrincipal) {
    const r = refs(uid, generationId);
    const protection = await writerGuard.read(tx, principal), { root, fence } = protection;
    const coordination = await readSealParticipant(tx, protection, "publication");
    if (synthetic) writerGuard.assertDevelopmentTrainingAccess(protection, tx);
    else writerGuard.assertJournalAccess(protection, tx);
    const [control, admission, checkpoint, work, savedJob, worker, publication, coordinator] = await tx.getAll(
      r.control, r.admission, r.checkpoint, r.work, r.job, r.worker, r.publication, r.coordinator);
    const rows = [root, control, admission, fence, checkpoint, work, savedJob, worker, publication, coordinator];
    const checked = synthetic ? await readProtectedTrainingState(tx, protection, coordination, admission.data(), control.data())
      : checkAdmission(uid, admission.data(), fence.data(), control.data());
    const cp = parseAcceptanceCheckpoint(checkpoint.data()), job = parseShadowJob(savedJob.data());
    const pointer = object(worker.data(), ["schemaVersion", "uid", "lifecycleEpoch", "generationId", "fence"]);
    hash(pointer.generationId); integer(pointer.fence, 1);
    requireContract(pointer.generationId === generationId, "publication_stale_generation");
    requireContract(pointer.schemaVersion === 1 && pointer.uid === uid && pointer.lifecycleEpoch === 1 &&
      job.checkpoint.generationId === generationId && pointer.fence === job.checkpoint.fencingToken && job.pin.source.uid === uid &&
      job.pin.source.lifecycleEpoch === checked.control.lifecycleEpoch, "publication_worker_scope_invalid");
    requireContract(job.state === "ready" && job.verification !== null && job.checkpoint.phase === "ready", "publication_generation_not_ready");
    requireContract(job.pin.admissionDigest === typedHash("stage2-admission-v1", checked.admission) &&
      job.pin.bootstrapDigest === (checked.admission.bootstrap as Record<string, unknown>).bootstrapDigest, "publication_bootstrap_changed");
    requireContract(cp.uid === uid && cp.lifecycleEpoch === 1 && cp.ordinal === checked.control.nativeAcceptedCount &&
      cp.headRevision === checked.control.headRevision && cp.headHash === checked.control.headHash, "publication_checkpoint_mismatch");
    requireContract(checked.control.desiredAggregationVersion === CUMULATIVE_AGGREGATION_VERSION &&
      checked.control.desiredExecutionVersion === "full-generation-v1" && job.pin.aggregationVersion === checked.control.desiredAggregationVersion &&
      job.pin.executionVersion === checked.control.desiredExecutionVersion, "publication_version_mismatch");
    if (cp.ordinal > 0) requireContract(same(work.data(), { schemaVersion: 1, uid, lifecycleEpoch: 1, status: "pending",
      targetRevision: cp.headRevision, headHash: cp.headHash, aggregationVersion: job.pin.aggregationVersion,
      executionVersion: job.pin.executionVersion }), "publication_work_mismatch");
    else requireContract(!work.exists, "publication_work_mismatch");
    if (publication.exists) {
      const p = parseDevelopmentPublication(publication.data());
      requireContract((p.owner as Record<string, unknown>).uid === uid && p.lifecycleEpoch === 1, "publication_scope_invalid");
      requireContract(((p.source as Record<string, unknown>).revision as number) <= job.pin.source.revision, "publication_rollback");
    }
    if (coordinator.exists) {
      const c = parsePublicationCoordinator(coordinator.data());
      requireContract(c.uid === uid && c.lifecycleEpoch === 1 && c.lifecycle === "active", "publication_coordinator_invalid");
    }
    return { r, rows, root, checked, cp, job, coordinator, publication, coordination, protection, readTime: control.readTime };
  }
  function exactHead(current: Awaited<ReturnType<typeof load>>) {
    requireContract(same(current.cp, current.job.pin.checkpoint), "publication_head_advanced");
  }
  async function scan(query: Query, at: Timestamp, visit: (row: DocumentSnapshot) => void) {
    let after: string | null = null;
    for (;;) {
      const base = query.orderBy(FieldPath.documentId());
      const page = await read(tx => tx.get((after ? base.startAfter(after) : base).limit(20)), at);
      page.docs.forEach(visit);
      if (page.size < 20) return;
      after = page.docs.at(-1)!.id;
    }
  }
  async function structure(uid: string, generationId: string, principal: WriterPrincipal) {
    const current = await read(tx => load(tx, uid, generationId, principal)), job = current.job;
    const artifacts = new Map<string, unknown>(), artifactVersions = new Map<string, ReturnType<typeof version>>();
    let artifactDigest = typedHash("publication-artifacts-start-v1", { uid, generationId });
    await scan(current.r.artifacts, current.readTime, row => {
      const a = object(row.data(), ["schemaVersion", "uid", "lifecycleEpoch", "generationId", "pinHash", "kind", "index", "createdFence", "body", "bodyHash"]);
      integer(a.index); integer(a.createdFence, 1);
      requireContract(a.schemaVersion === 1 && a.uid === uid && a.lifecycleEpoch === 1 && a.generationId === generationId &&
        a.pinHash === typedHash("shadow-pin-v1", job.pin) && a.createdFence <= job.checkpoint.fencingToken &&
        ["packet", "profile", "manifest", "part", "references"].some(kind => kind === a.kind) &&
        row.id === a.kind + "-" + key(a.index) && a.bodyHash === typedHash("shadow-artifact-v1", a.body), "publication_artifact_invalid");
      const bytes = jsonBytes(a); requireContract(bytes <= SHADOW_LIMITS.pageBytes, "publication_artifact_capacity");
      metrics.maxArtifactJSONBytes = Math.max(metrics.maxArtifactJSONBytes, bytes);
      metrics.maxDocumentBytes = Math.max(metrics.maxDocumentBytes, assertCompletionDocumentBudget(row.ref.path, a));
      requireContract(!artifacts.has(row.id), "publication_duplicate_artifact"); artifacts.set(row.id, a.body); artifactVersions.set(row.id, version(row));
      artifactDigest = typedHash("publication-artifacts-fold-v1", { previous: artifactDigest, id: row.id, envelope: a });
    });
    const manifest = parseGenerationManifest(artifacts.get("manifest-" + key(0)));
    const parts = manifest.parts.map((_, index) => artifacts.get("part-" + key(index)));
    const pages = Array.from({ length: manifest.pageCount }, (_, index) => artifacts.get("references-" + key(index)));
    verifyGenerationStructure(manifest, parts, pages);
    requireContract(manifest.generationId === generationId && same(manifest.source, job.pin.source) &&
      manifest.nativeAcceptedCount === job.pin.checkpoint.ordinal && manifest.manifestHash === job.checkpoint.manifestHash &&
      manifest.manifestHash === job.verification!.manifestHash, "publication_manifest_scope_invalid");
    const profile = artifacts.get("profile-" + key(0)) as Record<string, unknown>;
    requireContract(profile?.schemaVersion === CUMULATIVE_PROFILE_VERSION && profile.aggregationVersion === job.pin.aggregationVersion &&
      typedHash("shadow-profile-v1", profile) === manifest.profileHash, "publication_profile_invalid");
    assertPublicationArtifactCount(job.pin.checkpoint.ordinal, parts.length, pages.length, artifacts.size);
    const expected = new Set(["profile-" + key(0), "manifest-" + key(0),
      ...Array.from({ length: job.pin.checkpoint.ordinal }, (_, index) => "packet-" + key(index)),
      ...parts.map((_, index) => "part-" + key(index)), ...pages.map((_, index) => "references-" + key(index))]);
    requireContract(expected.size === artifacts.size && [...expected].every(id => artifacts.has(id)), "publication_artifact_inventory_invalid");
    const report = parsePublicationVerification({ schemaVersion: 1, state: "STRUCTURALLY_VALID", publicationEligible: false,
      authority: "NOT VERIFIED", source: job.pin.source, generationId, manifestHash: manifest.manifestHash, profileHash: manifest.profileHash,
      inventoryDigest: null, artifactDigest, admissionDigest: job.pin.admissionDigest, bootstrapDigest: job.pin.bootstrapDigest,
      nativeAcceptedCount: job.pin.checkpoint.ordinal, profileSchemaVersion: CUMULATIVE_PROFILE_VERSION,
      aggregationVersion: job.pin.aggregationVersion, executionVersion: job.pin.executionVersion,
      verificationProtocol: PUBLICATION_PROTOCOL, evidenceProtocol: EVIDENCE_PROTOCOL, policy: PUBLICATION_POLICY,
      asOf: time(current.readTime), workerFence: job.checkpoint.fencingToken, checkpointSequence: job.checkpoint.checkpointSequence });
    return { current, artifacts, artifactVersions, report, manifest, parts, pages, profile };
  }
  async function packet(current: Awaited<ReturnType<typeof load>>, ordinal: number): Promise<ReplayPacket> {
    const { r, job, readTime } = current, pin = job.pin;
    return read(async tx => {
      const batchRow = await tx.get(r.batches.doc(acceptanceBatchIdentity(pin.source, ordinal)));
      const batch = parseAcceptanceBatch(batchRow.data());
      const entries = await tx.getAll(...Array.from({ length: batch.lastRevision - batch.firstRevision + 1 }, (_, offset) =>
        r.journal.doc(journalIdentity(pin.source, batch.firstRevision + offset))));
      requireContract(entries.every(row => row.exists), "publication_journal_missing");
      const ids = entries.slice(1).map(row => { const id = row.data()!.event?.decisionId; hash(id); return id; });
      const kinds = batch.receipt.mode === "auto" ? ["native", "legacy"] : ["native"];
      const sources = await tx.getAll(r.archives.doc(batch.receipt.evidenceId), r.user.collection("learningEvidence").doc(batch.receipt.evidenceId),
        ...ids.map(id => r.user.collection("learningEvidenceIdentityEvents").doc(id)),
        ...kinds.map(kind => r.user.collection("learningEvidenceSourceIndex").doc(completionSourceIdentity(kind as "native" | "legacy", batch.receipt.sessionId))),
        ...(batch.receipt.mode === "auto" ? [r.user.collection("assessments").doc(batch.receipt.sessionId)] : []));
      requireContract(sources.every(row => row.exists), "publication_source_missing");
      const row = (s: DocumentSnapshot) => ({ id: s.id, data: s.data()! });
      return parseReplayPacket({ schemaVersion: 1, ordinal, batch, entries: entries.map(s => s.data()), archive: sources[0].data(), row: sources[1].data(),
        decisions: sources.slice(2, 2 + ids.length).map(row), indexes: sources.slice(2 + ids.length, 2 + ids.length + kinds.length).map(row),
        legacyFingerprint: batch.receipt.mode === "auto" ? legacyAssessmentFingerprint(sources.at(-1)!.data()!) : null }, pin);
    }, readTime);
  }
  async function verify(uid: string, generationId: string, principal: WriterPrincipal) {
    const started = performance.now();
    try {
      const candidate = await structure(uid, generationId, principal), { current } = candidate;
      exactHead(current);
      const packets: ReplayPacket[] = [], expected = new Map<string, Set<string>>();
      for (const name of ["learningEvidence", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex", "assessments", "journal", "archives", "batches"])
        expected.set(name, new Set());
      let previous = initialAcceptanceCheckpoint(current.job.pin.source), predecessor: unknown;
      for (let ordinal = 1; ordinal <= current.cp.ordinal; ordinal++) {
        const p = await packet(current, ordinal), batch = parseAcceptanceBatch(p.batch);
        requireContract(same(p, candidate.artifacts.get("packet-" + key(ordinal - 1))), "publication_source_changed");
        requireContract(same(batch.previous, previous), "publication_batch_gap");
        previous = verifyAcceptanceCheckpoint({ ...current.checked.control, nativeAcceptedCount: ordinal,
          headRevision: batch.lastRevision, headHash: batch.headHash }, checkpointForBatch(batch), batch, p.entries, predecessor);
        predecessor = batch; packets.push(p);
        expected.get("learningEvidence")!.add(batch.receipt.evidenceId); expected.get("archives")!.add(batch.receipt.evidenceId);
        expected.get("batches")!.add(batch.batchId);
        if (batch.receipt.mode === "auto") expected.get("assessments")!.add(batch.receipt.sessionId);
        for (let revision = batch.firstRevision; revision <= batch.lastRevision; revision++) expected.get("journal")!.add(journalIdentity(batch, revision));
        p.decisions.forEach(row => expected.get("learningEvidenceIdentityEvents")!.add(row.id));
        p.indexes.forEach(row => expected.get("learningEvidenceSourceIndex")!.add(row.id));
      }
      requireContract(same(previous, current.cp), "publication_checkpoint_mismatch");
      const journal = verifyJournalContinuity({ uid, lifecycleEpoch: 1, revision: 0, headHash: null }, current.job.pin.source, packets.flatMap(p => p.entries));
      requireContract(journal.acceptedSessionIds.length === current.cp.ordinal, "publication_acceptance_count_invalid");
      const sourceVersions = new Map<string, ReturnType<typeof version>>();
      for (const [name, ids] of expected) {
        let count = 0;
        const query = name === "journal" ? current.r.journal : name === "archives" ? current.r.archives : name === "batches" ? current.r.batches : current.r.user.collection(name);
        await scan(query, current.readTime, row => { requireContract(ids.has(row.id), "publication_unjournaled_source"); sourceVersions.set(row.ref.path, version(row)); count++; });
        requireContract(count === ids.size, "publication_source_inventory_invalid");
      }
      // Do not silently reinterpret legacy-only metadata as a native empty
      // bootstrap. The only supported root snapshot is a matching journaled
      // automatic compatibility record. Auxiliary legacy state requires review.
      const root = current.root.data()!;
      if (root.learningProfile != null || root.latestAssessmentId != null || root.learningProfileUpdatedAt != null) {
        requireContract(typeof root.latestAssessmentId === "string" && expected.get("assessments")!.has(root.latestAssessmentId), "publication_unlinked_root_snapshot");
        const legacy = await read(tx => tx.get(current.r.user.collection("assessments").doc(root.latestAssessmentId)), current.readTime);
        requireContract(same(root.learningProfile, legacy.data()?.learningProfile), "publication_unlinked_root_snapshot");
      }
      for (const name of synthetic ? [] : ["trainingProgress", "trainingActivity", "trainingStats"]) {
        const legacy = await read(tx => tx.get(current.r.user.collection(name).limit(1)), current.readTime);
        requireContract(legacy.empty, "publication_legacy_auxiliary_history_unreconciled");
      }
      const rebuilt = rebuildShadow(current.job.pin, current.checked.admission.bootstrap, packets);
      requireContract(same(rebuilt.profile, candidate.profile) && same(rebuilt.manifest, candidate.manifest) &&
        rebuilt.pages.every((page, index) => same(page, candidate.pages[index])) && rebuilt.parts.every((part, index) => same(part, candidate.parts[index])),
      "publication_semantics_invalid");
      const digest = inventoryDigest(current.job.pin.source, rebuilt.inventory.sourceReferences);
      requireContract(current.job.verification!.inventoryDigest === digest, "publication_inventory_digest_invalid");
      return { ...candidate, expected, sourceVersions, report: parsePublicationVerification({ ...candidate.report, state: "SOURCE_VERIFIED", inventoryDigest: digest }) };
    } finally { metrics.verificationMs += Math.round(performance.now() - started); }
  }
  async function publish(token: string, generationId: string) {
    hash(generationId); const principal = await writerGuard.authenticate(token), uid = principal.uid;
    const candidate = await verify(uid, generationId, principal);
    await options.onEvent?.("after-source-verification"); await options.onEvent?.("before-cas");
    const start = performance.now();
    // Bounded final precondition transaction. No write is queued: the current
    // architecture cannot secure the gap against unfenced legacy/Admin writers.
    // There is intentionally no dormant "if marker.enabled then set" branch.
    const decision = await writerGuard.transaction(async tx => {
      const current = await load(tx, uid, generationId, principal);
      const outputs = await tx.getAll(current.r.artifacts.doc("manifest-" + key(0)), current.r.artifacts.doc("profile-" + key(0)));
      exactHead(current);
      requireContract(current.job.checkpoint.lease !== null && current.job.checkpoint.lease.expiresAt > current.readTime.toDate().toISOString(), "publication_worker_lease_expired");
      requireContract(current.rows.every((row, index) => same(version(row), version(candidate.current.rows[index]))), "publication_state_changed");
      for (const row of outputs) {
        const a = row.data(); requireContract(a && same(version(row), candidate.artifactVersions.get(row.id)) && same(a.body, candidate.artifacts.get(row.id)) &&
          a.bodyHash === typedHash("shadow-artifact-v1", a.body) && a.pinHash === typedHash("shadow-pin-v1", current.job.pin), "publication_artifact_changed");
      }
      const blockers = [...publicationAuthorityBlockers(), ...(!current.coordinator.exists ? ["publication_coordinator_missing"] : ["publication_coordinator_origin_unverified"])];
      return Object.freeze({ schemaVersion: 1 as const, status: "NOT_PUBLISHED" as const, code: "publication_authority_not_verified" as const,
        verification: candidate.report, blockers: Object.freeze(blockers), pointerWrites: 0 as const });
    }, { maxAttempts: 5 }, () => {
      metrics.casAttempts++; let reads = 0;
      return {
        afterRead(result) {
          db(); const count = Array.isArray(result) ? result.length : 1; reads += count; metrics.casReads += count;
          metrics.maxCasReads = Math.max(metrics.maxCasReads, reads);
        },
        beforeWrite() { throw new Error("publication_authority_not_verified"); }
      };
    });
    metrics.casMs += Math.round(performance.now() - start);
    await options.onEvent?.("after-cas"); return decision;
  }
  return Object.freeze({
    // Only the separate synthetic coordinator consumes this read-only result.
    // It is NOT an authority capability and cannot enable this publisher's CAS.
    async inspectSynthetic(generationId: string) {
      requireContract(synthetic !== null, "synthetic_publication_disabled");
      const principal = await synthetic.principal(); return verify(principal.uid, generationId, principal);
    },
    async verifyStructure(token: string, generationId: string) { hash(generationId); const principal = await writerGuard.authenticate(token); return (await structure(principal.uid, generationId, principal)).report; },
    async verify(token: string, generationId: string) { hash(generationId); const principal = await writerGuard.authenticate(token); return (await verify(principal.uid, generationId, principal)).report; },
    publish, metrics, close: async () => { await synthetic?.close(); await transport.close(); }
  });
}
