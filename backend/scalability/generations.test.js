import { describe, expect, it } from "vitest";
import { CONTRACT_LIMITS, jsonBytes, typedHash } from "./values.ts";
import { createJournalEntry } from "./journal.ts";
import { parseAccountRevisionControl, parseAggregationCheckpoint, parsePublishedProfileStatus, proposeCheckpointLease,
  publicationLag, verifyCheckpointAdvance } from "./controls.ts";
import { assertPageCapacity, createGenerationManifest, createGenerationPage, createManifestPart, generationIdentity,
  parseGenerationManifest, parseGenerationPage, parseManifestPart, profilePublicationEligibility, verifyGenerationManifest } from "./generations.ts";

const UID = "offline-generation-student", NOW = "2026-10-22T10:00:00.000Z", UNTIL = "2026-10-22T10:01:00.000Z";
const aggregationVersion = "exposure-separated-accuracy-v2", executionVersion = "full-generation-v1";
const zero = { uid: UID, lifecycleEpoch: 1, revision: 0, headHash: null };
const ref = (namespace, id) => ({ namespace, id, contentHash: typedHash("artifact-fixture", { namespace, id }) });
function fixture() {
  const entry = createJournalEntry(zero, { kind: "session-accepted", evidenceHash: "c".repeat(64), receipt: {
    schemaVersion: 2, status: "accepted", sessionId: "session-one", mode: "manual", evidenceId: "session-one",
    requestHash: "a".repeat(64), lifecycleEpoch: 1, acceptedRevision: 1, recordedAt: NOW, legacyAssessmentId: null, legacyProfileUpdated: false
  } }, NOW);
  const source = { ...zero, revision: 1, headHash: entry.entryHash };
  const generationId = generationIdentity(source, aggregationVersion, executionVersion);
  const profile = ref("generation-artifact", "profile");
  const pages = [createGenerationPage(generationId, 0, [ref("learningEvidence", "session-one"), profile]),
    createGenerationPage(generationId, 1, [ref("learningEvidenceIdentityEvents", "decision-one")])];
  const parts = pages.map((page, index) => createManifestPart(generationId, index, [page]));
  const manifest = createGenerationManifest({ generationId, source, aggregationVersion, executionVersion, nativeAcceptedCount: 1, profileHash: profile.contentHash }, parts);
  const control = { schemaVersion: 1, uid: UID, lifecycleEpoch: 1, lifecycle: "active", headRevision: 1, headHash: source.headHash,
    nativeAcceptedCount: 1, published: null, desiredAggregationVersion: aggregationVersion, desiredExecutionVersion: executionVersion };
  const job = { schemaVersion: 1, uid: UID, lifecycleEpoch: 1, generationId, sourceRevision: 1, sourceHeadHash: source.headHash,
    targetRevision: 1, aggregationVersion, executionVersion, phase: "ready", lease: { workerId: "worker-one", fence: 3, expiresAt: UNTIL },
    fencingToken: 3, checkpointSequence: 7, cursor: { stage: "artifacts", afterKey: "z", processedCount: 3 }, manifestHash: manifest.manifestHash };
  return { control, job, manifest, parts, pages, entry, source, expectedReferences: pages.flatMap(page => page.records) };
}
function input(value = fixture()) { return { ...value, journalTail: [], workerId: "worker-one", fence: 3, checkpointSequence: 7, now: NOW }; }
const published = value => ({ generationId: value.manifest.generationId, revision: value.source.revision, journalHash: value.source.headHash,
  nativeAcceptedCount: 1, generationHash: value.manifest.manifestHash, aggregationVersion, executionVersion });
const rehash = (value, field, domain) => { const { [field]: _, ...body } = value; return { ...body, [field]: typedHash(domain, body) }; };

describe("bounded generation pages and complete manifests", () => {
  it("verifies all parts/pages independent of retrieval order with stable generation identity", () => {
    const value = fixture();
    expect(verifyGenerationManifest(value.manifest, [...value.parts].reverse(), [...value.pages].reverse(), value.expectedReferences)).toEqual(value.manifest);
    expect(value.manifest.recordCount).toBe(3); expect(value.manifest.pageCount).toBe(2);
    expect(Object.isFrozen(value.manifest.parts[0])).toBe(true);
    expect(generationIdentity({ ...value.source, lifecycleEpoch: 2 }, aggregationVersion, executionVersion)).not.toBe(value.manifest.generationId);
    expect(generationIdentity(value.source, aggregationVersion, "other-execution")).not.toBe(value.manifest.generationId);
  });
  it.each(["missing-part", "missing-page", "extra-part", "extra-page", "duplicate-part", "duplicate-page"])("rejects incomplete/extraneous membership: %s", scenario => {
    const value = fixture(), { manifest } = value;
    const parts = [...value.parts], pages = [...value.pages];
    if (scenario === "missing-part") parts.pop(); if (scenario === "missing-page") pages.pop();
    if (scenario === "extra-part") parts.push(parts[0]); if (scenario === "extra-page") pages.push(pages[0]);
    if (scenario === "duplicate-part") parts[1] = parts[0]; if (scenario === "duplicate-page") pages[1] = pages[0];
    expect(() => verifyGenerationManifest(manifest, parts, pages, value.expectedReferences)).toThrow();
  });
  it("rejects hash corruption at every level and rehashed false descriptor counts/bytes", () => {
    const value = fixture();
    expect(() => parseGenerationPage({ ...value.pages[0], index: 3 })).toThrow("page_hash_mismatch");
    expect(() => parseManifestPart({ ...value.parts[0], index: 3 })).toThrow("part_hash_mismatch");
    expect(() => parseGenerationManifest({ ...value.manifest, nativeAcceptedCount: 0 })).toThrow("manifest_hash_mismatch");
    const changed = rehash({ ...value.parts[0], pages: value.parts[0].pages.map(row => ({ ...row, byteCount: row.byteCount + 1 })) }, "partHash", "manifest-part-v1");
    const parts = [changed, value.parts[1]];
    const manifest = createGenerationManifest(value.manifest, parts);
    expect(() => verifyGenerationManifest(manifest, parts, value.pages, value.expectedReferences)).toThrow("manifest_page_mismatch");
  });
  it("rejects duplicate references across pages even when all hashes/counts agree", () => {
    const value = fixture();
    const pages = [value.pages[0], createGenerationPage(value.manifest.generationId, 1, [value.pages[0].records[0]])];
    const parts = pages.map((page, index) => createManifestPart(value.manifest.generationId, index, [page]));
    const manifest = createGenerationManifest(value.manifest, parts);
    expect(() => verifyGenerationManifest(manifest, parts, pages, value.expectedReferences)).toThrow("duplicate_generation_reference");
    expect(() => createGenerationPage(value.manifest.generationId, 0, [ref("learningEvidence", "a"), ref("learningEvidence", "a")])).toThrow();
  });
  it("requires exactly one profile reference and its exact content hash", () => {
    const value = fixture();
    const wrong = createGenerationManifest({ ...value.manifest, profileHash: "b".repeat(64) }, value.parts);
    expect(() => verifyGenerationManifest(wrong, value.parts, value.pages, value.expectedReferences)).toThrow("profile_hash_mismatch");
    const pages = [createGenerationPage(value.manifest.generationId, 0, [ref("learningEvidence", "a")])];
    const parts = [createManifestPart(value.manifest.generationId, 0, pages)];
    expect(() => verifyGenerationManifest(createGenerationManifest(value.manifest, parts), parts, pages, pages.flatMap(page => page.records))).toThrow("profile_or_count_missing");
  });
  it("rejects a self-consistent rewritten manifest that silently omits pinned source inventory", () => {
    const value = fixture(), records = value.expectedReferences.filter(row => row.namespace !== "learningEvidence");
    const pages = [createGenerationPage(value.manifest.generationId, 0, records)];
    const parts = [createManifestPart(value.manifest.generationId, 0, pages)];
    const manifest = createGenerationManifest(value.manifest, parts);
    expect(() => verifyGenerationManifest(manifest, parts, pages, value.expectedReferences)).toThrow("reference_inventory_incomplete");
    expect(() => verifyGenerationManifest(value.manifest, value.parts, value.pages)).toThrow("expected_inventory_required");
    const changed = value.expectedReferences.map(row => ({ ...row, contentHash: "b".repeat(64) }));
    expect(() => verifyGenerationManifest(value.manifest, value.parts, value.pages, changed)).toThrow("reference_inventory_mismatch");
  });
  it("rejects pages/parts from another generation", () => {
    const value = fixture();
    const foreign = createGenerationPage("b".repeat(64), 0, value.pages[0].records);
    expect(() => createManifestPart(value.manifest.generationId, 0, [foreign])).toThrow("generation_mismatch");
    expect(() => parseGenerationManifest(rehash({ ...value.manifest, generationId: "b".repeat(64) }, "manifestHash", "generation-manifest-v1"))).toThrow("generation_identity_mismatch");
  });
  it("bounds record counts, descriptors and escaped UTF-8 envelope bytes", () => {
    const id = fixture().manifest.generationId;
    expect(createGenerationPage(id, 0, Array.from({ length: CONTRACT_LIMITS.pageRecords }, (_, i) => ref("learningEvidence", `row-${i}`))).records).toHaveLength(50);
    expect(() => createGenerationPage(id, 0, Array.from({ length: 51 }, (_, i) => ref("learningEvidence", `row-${i}`)))).toThrow("page_count_limit");
    expect(() => createGenerationPage(id, 0, [])).toThrow("page_count_limit");
    const envelope = { records: ["", "", ""] }, overhead = jsonBytes(envelope);
    const exact = { records: ["x".repeat(100_000), "x".repeat(100_000), "x".repeat(CONTRACT_LIMITS.pageBytes - overhead - 200_000)] };
    expect(assertPageCapacity(exact)).toBe(CONTRACT_LIMITS.pageBytes);
    expect(() => assertPageCapacity({ records: [...exact.records.slice(0, 2), `${exact.records[2]}x`] })).toThrow();
    expect(() => assertPageCapacity({ records: ["😀".repeat(32_768)] })).toThrow("byte_limit"); // quotes count too
    expect(() => assertPageCapacity({ records: ["\u0000".repeat(21_846)] })).toThrow("byte_limit");
    expect(() => createManifestPart(id, 0, Array.from({ length: 129 }, (_, i) => createGenerationPage(id, i, [ref("learningEvidence", `row-${i}`)])))).toThrow();
  });
});

describe("lifecycle, checkpoints and publication fencing", () => {
  it("keeps published generation and acceptance lag separate", () => {
    const value = fixture();
    expect(publicationLag(value.control)).toEqual({ published: false, pendingRevisions: 1, newlyAcceptedCompletionsPending: 1, canonicalSessionIncrease: "unknown" });
    expect(publicationLag({ ...value.control, published: published(value) }).newlyAcceptedCompletionsPending).toBe(0);
    expect(() => parsePublishedProfileStatus({ ...published(value), nativeAcceptedCount: 99 })).toThrow();
    expect(() => parseAccountRevisionControl({ ...value.control, nativeAcceptedCount: 2 })).toThrow();
  });
  it("does not treat a structurally valid candidate as authoritative publication", () => {
    const value = fixture(), before = JSON.stringify(value);
    expect(profilePublicationEligibility(input(value))).toMatchObject({ eligible: false, authority: "NOT VERIFIED",
      reasons: ["inventory_inputs_unavailable", "inventory_authority_not_verified"] });
    expect(JSON.stringify(value)).toBe(before); expect(Object.isFrozen(value.control)).toBe(false);
  });
  it.each([
    ["deleting", value => { value.control.lifecycle = "deleting"; }, "account_not_active"],
    ["epoch", value => { value.control.lifecycleEpoch = 2; }, "scope_mismatch"],
    ["owner", value => { value.control.uid = "another-student"; }, "scope_mismatch"],
    ["old worker", value => { value.fence = 2; }, "stale_worker_fence"],
    ["worker ID", value => { value.workerId = "another-worker"; }, "stale_worker_fence"],
    ["checkpoint", value => { value.checkpointSequence = 6; }, "stale_worker_fence"],
    ["expired", value => { value.now = UNTIL; }, "stale_worker_fence"],
    ["not ready", value => { value.job.phase = "verifying"; }, "job_not_verified"],
    ["wrong manifest", value => { value.job.manifestHash = "b".repeat(64); }, "job_not_verified"],
    ["changed algorithm", value => { value.control.desiredAggregationVersion = "different"; }, "version_mismatch"],
    ["already published", value => { value.control.published = published(value); }, "publication_not_advancing"]
  ])("rejects publication with %s", (_label, mutate, reason) => {
    const value = input(); mutate(value);
    expect(profilePublicationEligibility(value).reasons).toContain(reason);
  });
  it("allows an exact older generation while new journal events arrive, with explicit lag", () => {
    const value = fixture();
    const later = createJournalEntry(value.source, { kind: "identity-decided", decisionId: "d".repeat(64), sourceKind: "legacy", recordId: "old",
      fromEvidenceId: null, toEvidenceId: "legacy-old", linkage: "unresolved", proof: { version: "v2", digest: "e".repeat(64) } }, NOW);
    value.control.headRevision = 2; value.control.headHash = later.entryHash;
    const status = profilePublicationEligibility({ ...input(value), journalTail: [later] });
    expect(status.eligible).toBe(false);
    expect(status.reasons).not.toContain("acceptance_count_mismatch");
    expect(publicationLag({ ...value.control, published: published(value) })).toMatchObject({ pendingRevisions: 1, newlyAcceptedCompletionsPending: 0 });
    expect(() => profilePublicationEligibility(input(value))).toThrow("journal_incomplete");
    value.control.nativeAcceptedCount = 2;
    expect(profilePublicationEligibility({ ...input(value), journalTail: [later] }).reasons).toContain("acceptance_count_mismatch");
  });
  it("rejects a candidate older than the already published generation", () => {
    const value = fixture();
    const later = createJournalEntry(value.source, { kind: "historical-imported", recordId: "late-history", evidenceId: "legacy-late",
      originalSessionId: null, completedAt: null, proof: { version: "v2", digest: "d".repeat(64) } }, NOW);
    const newerPin = { ...value.source, revision: 2, headHash: later.entryHash };
    value.control.headRevision = 2; value.control.headHash = later.entryHash;
    value.control.published = { ...published(value), generationId: generationIdentity(newerPin, aggregationVersion, executionVersion),
      revision: 2, journalHash: later.entryHash };
    expect(profilePublicationEligibility({ ...input(value), journalTail: [later] }).reasons).toContain("publication_not_advancing");
  });
  it("permits a desired new execution generation at the same source pin without resetting published counters", () => {
    const value = fixture(), updatedExecution = "full-generation-v2";
    value.control.published = published(value); value.control.desiredExecutionVersion = updatedExecution;
    const generationId = generationIdentity(value.source, aggregationVersion, updatedExecution);
    const pages = value.pages.map(page => createGenerationPage(generationId, page.index, page.records));
    const parts = pages.map((page, index) => createManifestPart(generationId, index, [page]));
    const manifest = createGenerationManifest({ ...value.manifest, generationId, executionVersion: updatedExecution }, parts);
    const job = { ...value.job, generationId, executionVersion: updatedExecution, manifestHash: manifest.manifestHash };
    const status = profilePublicationEligibility({ ...input(value), pages, parts, manifest, job });
    expect(status.eligible).toBe(false); // No authority provider exists in Stage 1.
    expect(status.reasons).not.toContain("version_mismatch");
    expect(status.reasons).not.toContain("publication_not_advancing");
  });
  it("validates checkpoint advances, immutable pins and token/sequence/cursor regressions", () => {
    const { job } = fixture(), previous = { ...job, phase: "building", manifestHash: null };
    const next = { ...previous, checkpointSequence: 8, phase: "verifying" };
    expect(verifyCheckpointAdvance(previous, next, NOW)).toEqual(next);
    for (const change of [{ checkpointSequence: 7 }, { targetRevision: 0 }, { phase: "ready" },
      { fencingToken: 2 }, { cursor: { ...next.cursor, processedCount: 1 } }, { lease: { ...next.lease, fence: 2 } }]) {
      expect(() => verifyCheckpointAdvance(previous, { ...next, ...change }, NOW)).toThrow();
    }
    expect(() => verifyCheckpointAdvance(previous, next, UNTIL)).toThrow("stale_worker_fence");
    expect(() => parseAggregationCheckpoint({ ...job, manifestHash: null })).toThrow("incomplete_checkpoint");
    expect(() => parseAggregationCheckpoint({ ...job, generationId: "b".repeat(64) })).toThrow("generation_identity_mismatch");
  });
  it("reclaims expired work with a monotonic token; stale workers cannot advance or publish", () => {
    const { job } = fixture();
    expect(() => proposeCheckpointLease(job, "worker-two", NOW, UNTIL)).toThrow("lease_unavailable");
    const next = proposeCheckpointLease(job, "worker-two", UNTIL, "2026-10-22T10:02:00.000Z");
    expect(next.fencingToken).toBe(4); expect(next.checkpointSequence).toBe(8);
    expect(() => verifyCheckpointAdvance(next, { ...job, checkpointSequence: 9 }, UNTIL)).toThrow("stale_worker_fence");
    expect(profilePublicationEligibility({ ...input(), job: next, now: UNTIL }).reasons).toContain("stale_worker_fence");
    const queued = { ...job, phase: "queued", lease: null, manifestHash: null, fencingToken: 5 };
    expect(proposeCheckpointLease(queued, "worker-two", NOW, UNTIL).fencingToken).toBe(6);
  });
});
