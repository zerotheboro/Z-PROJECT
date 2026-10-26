import { describe, expect, it } from "vitest";
import { canonicalJSON, copyJSON, jsonBytes, typedHash, utf8Bytes } from "./values.ts";
import { parseAcceptanceReceipt, requireIdenticalReceipt } from "./receipts.ts";
import { createJournalEntry, journalIdentity } from "./journal.ts";
import { parseAggregationCheckpoint, verifyCheckpointAdvance } from "./controls.ts";
import { assertPageCapacity, createGenerationPage, profilePublicationEligibility, verifyGenerationStructure } from "./generations.ts";
import { createInventoryBootstrap, inventoryDigest, inventorySourceReference, verifyInventoryProof } from "./inventory.ts";
import { adaptLegacyAutomaticAssessment } from "../../src/quiz/legacyAssessmentEvidence.ts";
import { legacyAssessment } from "../../src/quiz/__tests__/learningEvidenceFixtures.ts";
import { inventoryFixture, nativeSource, origin, publicationFixture, oldHash, UID, NOW } from "./repairFixtures.js";

describe("replay proof versus authoritative completeness", () => {
  it("binds owner, epoch, pinned cutoff/head, bootstrap and canonical complete source inventory", () => {
    const value = inventoryFixture(), before = JSON.stringify(value.inputs);
    const result = verifyInventoryProof(value.inputs, value.cutoff);
    expect(result).toMatchObject({ authority: "NOT VERIFIED", consistency: "verified", proof: {
      source: value.cutoff, bootstrapDigest: value.inputs.bootstrap.bootstrapDigest,
      inventoryDigest: inventoryDigest(value.cutoff, [value.reference]), sourceCount: 1, nativeAcceptedCount: 1 } });
    expect(Object.isFrozen(result.proof.source)).toBe(true);
    expect(JSON.stringify(value.inputs)).toBe(before); expect(Object.isFrozen(value.inputs)).toBe(false);
    expect(profilePublicationEligibility(publicationFixture(value))).toMatchObject({ eligible: false, structurallyEligible: true, authority: "NOT VERIFIED" });
  });
  it("reproduces the original missing-session attack: structural validity cannot authorize publication", () => {
    const value = inventoryFixture(), candidate = publicationFixture(value, []);
    expect(verifyGenerationStructure(candidate.manifest, candidate.parts, candidate.pages)).toEqual(candidate.manifest);
    const result = profilePublicationEligibility({ ...candidate, expectedReferences: candidate.pages[0].records });
    expect(result.eligible).toBe(false); expect(result.reasons).toContain("source_inventory_mismatch");
    expect(result.reasons).toContain("inventory_authority_not_verified");
    expect(profilePublicationEligibility({ ...candidate, inventoryInputs: undefined }).eligible).toBe(false);
  });
  it.each([undefined, null, { authority: "VERIFIED" }, { trusted: true }, { verifyOrigin: () => true }])("never admits a caller-generated authority claim %#", inputs => {
    expect(verifyInventoryProof(inputs, inventoryFixture().cutoff)).toMatchObject({ authority: "NOT VERIFIED", consistency: "not-verified" });
  });
  it("will not upgrade even a correct proof or a self-generated empty-account bootstrap to authority", () => {
    const value = inventoryFixture(), proof = verifyInventoryProof(value.inputs, value.cutoff).proof;
    expect(verifyInventoryProof({ ...value.inputs, claimedProof: proof }, value.cutoff)).toMatchObject({ authority: "NOT VERIFIED", consistency: "verified" });
    expect(verifyInventoryProof({ ...value.inputs, claimedProof: { ...proof, authority: "VERIFIED" } }, value.cutoff).reasons).toContain("inventory_proof_mismatch");
    const zero = origin(), empty = { bootstrap: createInventoryBootstrap(zero, []), bootstrapReferences: [], journalPrefix: [], sources: [] };
    expect(verifyInventoryProof(empty, zero)).toMatchObject({ authority: "NOT VERIFIED", consistency: "verified", proof: { sourceCount: 0 } });
  });
  it.each([
    ["missing prefix", value => { value.inputs.journalPrefix = []; }],
    ["duplicate revision", value => { value.inputs.journalPrefix.push(value.entry); }],
    ["missing source", value => { value.inputs.sources = []; }],
    ["duplicate source", value => { value.inputs.sources.push(value.source); }],
    ["wrong source ID", value => { value.inputs.sources = [{ ...value.source, id: "session-forged" }]; }],
    ["wrong owner", value => { value.inputs.sources = [{ ...value.source, uid: "other-user" }]; }],
    ["wrong nested owner", value => { const record = structuredClone(value.source); record.payload.evidence.owner.uid = "other-user"; value.inputs.sources = [record]; }],
    ["wrong epoch", value => { value.inputs.sources = [{ ...value.source, lifecycleEpoch: 2 }]; }],
    ["substituted private details", value => { const record = structuredClone(value.source); record.payload.completionDetails.reflection.reflectionText = "Changed"; value.inputs.sources = [record]; }],
    ["unreferenced source", value => { value.inputs.sources.push(nativeSource("different-session-0002").source); }],
    ["invented bootstrap", value => { value.inputs.bootstrap = { ...value.inputs.bootstrap, inventoryDigest: "f".repeat(64) }; }]
  ])("rejects %s without claiming authoritative completeness", (_name, mutate) => {
    const value = inventoryFixture(); mutate(value);
    expect(verifyInventoryProof(value.inputs, value.cutoff)).toMatchObject({ authority: "NOT VERIFIED", consistency: "not-verified", proof: null });
    expect(profilePublicationEligibility(publicationFixture(value)).eligible).toBe(false);
  });
  it("rejects cross-owner/cutoff/head proof reuse", () => {
    const value = inventoryFixture();
    for (const change of [{ uid: "other-user" }, { lifecycleEpoch: 2 }, { revision: 2 }, { headHash: "f".repeat(64) }]) {
      expect(verifyInventoryProof(value.inputs, { ...value.cutoff, ...change }).consistency).toBe("not-verified");
    }
  });
  it("preserves old v1 bootstrap receipts without allocating another acceptance revision", () => {
    const value = inventoryFixture(), old = nativeSource("old-session-0000", { version: 1 });
    const before = JSON.stringify(old.receipt), bootstrapReferences = [old.reference];
    const inputs = { ...value.inputs, bootstrap: createInventoryBootstrap(origin(), bootstrapReferences), bootstrapReferences,
      sources: [value.source, old.source] };
    const proof = verifyInventoryProof(inputs, value.cutoff);
    expect(proof.consistency).toBe("verified"); expect(proof.proof).toMatchObject({ sourceCount: 2, nativeAcceptedCount: 1 });
    expect(JSON.stringify(requireIdenticalReceipt(old.receipt, old.receipt))).toBe(before);
    expect(old.receipt.profileRevision).toBe(19); expect(old.receipt).not.toHaveProperty("acceptedRevision");
  });
  it("preserves unlinked historical identity/timing as unknown, not new native evidence", () => {
    const raw = legacyAssessment(); raw.createdAt = "2026-10-19 10:00";
    const adapted = adaptLegacyAutomaticAssessment({ ownerUid: UID, assessmentId: "legacy-old", assessment: raw });
    expect(adapted.valid).toBe(true);
    const scope = origin(), record = { schemaVersion: 1, uid: UID, lifecycleEpoch: 1, namespace: "learningEvidence",
      id: `legacy-${oldHash("legacy-old")}`, payload: { schemaVersion: 1, evidence: adapted.session } };
    const ref = inventorySourceReference(record, scope), bootstrap = createInventoryBootstrap(scope, [ref]);
    const proof = verifyInventoryProof({ bootstrap, bootstrapReferences: [ref], journalPrefix: [], sources: [record] }, scope);
    expect(proof).toMatchObject({ consistency: "verified", proof: { nativeAcceptedCount: 0 } });
    expect(adapted.session.originalSessionId).toBeNull(); expect(adapted.session.completedAt).toBeNull();
  });
  it("verifies actual identity decision IDs, fields, proof protocols and referenced evidence", () => {
    const value = inventoryFixture(), receipt = value.receipt;
    const decision = { schemaVersion: 1, sourceKind: "native", recordId: receipt.sessionId,
      sourceHash: oldHash(["training-source-v1", "native", receipt.sessionId]), fromEvidenceId: null,
      toEvidenceId: receipt.evidenceId, fingerprint: receipt.requestHash };
    const record = { schemaVersion: 1, uid: UID, lifecycleEpoch: 1, namespace: "learningEvidenceIdentityEvents", id: oldHash(decision), payload: decision };
    const entry = createJournalEntry(value.cutoff, { kind: "identity-decided", decisionId: record.id, sourceKind: "native", recordId: receipt.sessionId,
      fromEvidenceId: null, toEvidenceId: receipt.evidenceId, proof: { version: "request-v1", digest: receipt.requestHash }, linkage: "established" }, NOW);
    const cutoff = { ...value.cutoff, revision: 2, headHash: entry.entryHash };
    const inputs = { ...value.inputs, journalPrefix: [entry, value.entry], sources: [record, value.source] };
    const first = verifyInventoryProof(inputs, cutoff);
    expect(first).toMatchObject({ consistency: "verified", proof: { sourceCount: 2, nativeAcceptedCount: 1 } });
    expect(verifyInventoryProof({ ...inputs, sources: [...inputs.sources].reverse() }, cutoff)).toEqual(first);
    expect(verifyInventoryProof({ ...inputs, sources: [{ ...record, id: "a".repeat(64) }, value.source] }, cutoff).consistency).toBe("not-verified");
  });
});

describe("strict enums and monotonic stage cursors", () => {
  it.each([["building"], [["ready"]], { value: "building" }, null, 1])("rejects non-string phase %#", phase => {
    expect(() => parseAggregationCheckpoint({ ...publicationFixture().job, phase })).toThrow();
  });
  it.each([["journal"], [["artifacts"]], { value: "journal" }, null, 1])("rejects non-string cursor stage %#", stage => {
    expect(() => parseAggregationCheckpoint({ ...publicationFixture().job, phase: "building", cursor: { stage, afterKey: null, processedCount: 0 } })).toThrow();
  });
  it.each([["learningEvidence"], [["generation-artifact"]], { value: "learningEvidence" }, null, 1])("rejects non-string namespace %#", namespace => {
    expect(() => createGenerationPage(publicationFixture().manifest.generationId, 0, [{ namespace, id: "source", contentHash: "a".repeat(64) }])).toThrow();
  });
  it("eliminates the exact 99-to-0/z-to-a reproduction and string-valued variants", () => {
    const job = publicationFixture().job;
    for (const stage of [["journal"], "journal"]) {
      const before = { ...job, phase: "building", manifestHash: null, cursor: { stage, afterKey: "z", processedCount: 99 } };
      const after = { ...before, checkpointSequence: 2, cursor: { stage, afterKey: "a", processedCount: 0 } };
      expect(() => verifyCheckpointAdvance(before, after, NOW)).toThrow();
    }
  });
  it("permits monotonic same-stage work and only resets at entry to the next stage", () => {
    const before = { ...publicationFixture().job, phase: "building", manifestHash: null, cursor: { stage: "journal", afterKey: "z", processedCount: 99 } };
    const advance = cursor => ({ ...before, checkpointSequence: 2, cursor });
    expect(verifyCheckpointAdvance(before, advance({ stage: "journal", afterKey: "zz", processedCount: 100 }), NOW).cursor.processedCount).toBe(100);
    expect(verifyCheckpointAdvance(before, advance({ stage: "sources", afterKey: null, processedCount: 0 }), NOW).cursor.stage).toBe("sources");
    for (const cursor of [{ stage: "artifacts", afterKey: null, processedCount: 0 }, { stage: "sources", afterKey: "x", processedCount: 1 },
      { stage: "journal", afterKey: null, processedCount: 100 }, { stage: "journal", afterKey: "zz", processedCount: 98 }]) {
      expect(() => verifyCheckpointAdvance(before, advance(cursor), NOW)).toThrow("cursor_regression");
    }
  });
});

describe("UTF-16 integrity before persistence, hashing, identity and byte measurement", () => {
  it.each(["\ud800", "\udc00", "x\ud800y", "\ud800\ud800", "\udc00\ud800"])("rejects malformed text %# everywhere", bad => {
    const fixture = inventoryFixture();
    for (const action of [() => copyJSON({ nested: { [bad]: "value" } }), () => copyJSON({ nested: [bad] }),
      () => typedHash("test", bad), () => typedHash(bad, {}), () => canonicalJSON(bad), () => jsonBytes(bad), () => utf8Bytes(bad),
      () => journalIdentity(origin(bad), 1), () => parseAcceptanceReceipt({ ...fixture.receipt, sessionId: bad }),
      () => createGenerationPage(publicationFixture().manifest.generationId, 0, [{ namespace: "learningEvidence", id: bad, contentHash: "a".repeat(64) }])]) {
      expect(action).toThrow("invalid_unicode");
    }
  });
  it("preserves valid supplementary characters without normalization", () => {
    const text = "\ud83d\ude00\u00e9\u0000", value = { [text]: [text] };
    expect(canonicalJSON(copyJSON(value))).toBe(canonicalJSON(value));
    expect(jsonBytes(value)).toBe(Buffer.byteLength(JSON.stringify(value), "utf8"));
    expect(typedHash("test", "\u00e9")).not.toBe(typedHash("test", "e\u0301"));
  });
});

describe("strict capacity envelope and defensive access", () => {
  it.each(["abc", {}, { length: 1 }, new Set([1]), null, 1])("rejects non-array records container %#", records => {
    expect(() => assertPageCapacity({ records })).toThrow();
  });
  it("does not invoke getters, mutate or freeze caller-owned data", () => {
    let calls = 0;
    expect(() => assertPageCapacity({ get records() { calls++; return ["x"]; } })).toThrow("non_json_property");
    expect(calls).toBe(0);
    const input = { records: [{ data: "\ud83d\ude00" }] };
    expect(assertPageCapacity(input)).toBe(jsonBytes(input)); expect(Object.isFrozen(input.records[0])).toBe(false);
    input.records[0].data = "Still caller-owned";
    expect(() => assertPageCapacity(new (class { records = [1]; })())).toThrow();
  });
  it("rejects oversized, sparse and accessor-bearing containers", () => {
    expect(() => assertPageCapacity({ records: Array(51).fill("x") })).toThrow("page_count_limit");
    expect(() => assertPageCapacity({ records: ["\u0000".repeat(30_000)] })).toThrow("byte_limit");
    expect(() => assertPageCapacity({ records: new Array(1) })).toThrow("invalid_array");
    let calls = 0; const records = [];
    Object.defineProperty(records, "0", { enumerable: true, get() { calls++; return "x"; } });
    expect(() => assertPageCapacity({ records })).toThrow("invalid_array"); expect(calls).toBe(0);
  });
});
