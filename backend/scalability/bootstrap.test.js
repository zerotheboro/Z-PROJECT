import { describe, expect, it } from "vitest";
import { BOOTSTRAP_PROTOCOL, BOOTSTRAP_STATES, createBootstrapInventory, parseGenesis, verifyBootstrapInventory,
  parseInventoryPin, createBootstrapInventoryPage, parseBootstrapInventoryPage } from "./bootstrapContracts";
import { classifyInventoryPath, reconciliationPlan } from "./bootstrapInventory";
import { AUTHORITY_PROTOCOL, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { typedHash } from "./values";
import { completionSourceIdentity } from "../trainingCompletion";
import { digest } from "../trainingCompletionContract";
import { createInventoryBootstrap } from "./inventory";

const pin = () => ({ uid: "b1_unit-owner", lifecycleEpoch: 1, lifecycleRevision: 0, lifecycleHead: null, lifecycleFence: 1,
  lifecycleState: "active", journal: null, writerFenceHash: null, rootCreatedAt: { seconds: 1, nanoseconds: 123000 },
  writerProtocol: AUTHORITY_PROTOCOL, genesisHash: "b".repeat(64), scopeVersion: "all-user-descendants-stage4b1-v1",
  readTime: { seconds: 2, nanoseconds: 123000 } });
const row = (n = 0) => ({ path: `users/b1_unit-owner/assessments/session-${String(n).padStart(4, "0")}`, category: "legacy-assessment", exists: true,
  fingerprint: "v2:" + "a".repeat(64), createdAt: { seconds: 1, nanoseconds: 0 }, updatedAt: { seconds: 1, nanoseconds: 0 }, issues: [], links: [] });
const genesis = () => {
  const body = { schemaVersion: 1, protocol: BOOTSTRAP_PROTOCOL, uid: pin().uid, lifecycleEpoch: 1, writerProtocol: AUTHORITY_PROTOCOL,
    catalog: SOURCE_NAMESPACE_VERSION, requestId: "unit-request", rootBinding: "b".repeat(64), authCreatedAt: "2026-10-24T10:00:00.000Z",
    initialState: "active", initialFence: 1, initialRevision: 0,
    bootstrapDigest: createInventoryBootstrap({ uid: pin().uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []).bootstrapDigest };
  return { ...body, genesisHash: typedHash("bootstrap-genesis-stage4b1-v1", body) };
};
describe("Stage 4B1 commitments are not admission authority", () => {
  it("names all future states without emitting an admitted/publication capability", () => {
    expect(BOOTSTRAP_STATES).toEqual(["UNVERIFIED_ORIGIN", "ORIGIN_VERIFIED", "INVENTORY_VERIFIED", "WRITER_FENCING_VERIFIED", "ADMISSION_ELIGIBLE", "ADMITTED"]);
    const result = createBootstrapInventory(pin(), [row()]);
    expect(verifyBootstrapInventory(result.manifest, result.pages)).toMatchObject({ authority: "NOT VERIFIED", publicationEligible: false });
    expect(parseGenesis(genesis())).toEqual(genesis());
  });
  it.each([{ uid: "old-owner" }, { lifecycleEpoch: 2 }, { schemaVersion: [1] }, { writerProtocol: [AUTHORITY_PROTOCOL] },
    { initialFence: 0 }, { initialState: "deleting" }, { authCreatedAt: "yesterday" }, { admitted: true }, { genesisHash: "a".repeat(64) },
    { uid: "b1_bad-\ud800" }])("rejects malformed genesis %#", patch => expect(() => parseGenesis({ ...genesis(), ...patch })).toThrow());
  it("never mutates/freezes callers or invokes getters", () => {
    const source = row(); const result = createBootstrapInventory(pin(), [source]);
    expect(Object.isFrozen(source)).toBe(false); source.issues.push("caller-owned"); expect(result.pages[0].records[0].issues).toEqual([]);
    let called = false; const malicious = genesis(); Object.defineProperty(malicious, "uid", { enumerable: true, get() { called = true; return "b1_x"; } });
    expect(() => parseGenesis(malicious)).toThrow(); expect(called).toBe(false);
  });
  it("rejects a rehashed genesis carrying another owner's bootstrap digest", () => {
    const { genesisHash, ...body } = genesis(); body.bootstrapDigest = createInventoryBootstrap({ uid: "b1_another-owner", lifecycleEpoch: 1, revision: 0, headHash: null }, []).bootstrapDigest;
    expect(() => parseGenesis({ ...body, genesisHash: typedHash("bootstrap-genesis-stage4b1-v1", body) })).toThrow("bootstrap_genesis_scope");
  });
  it("validates owner/epoch/cutoff and rejects a cross-owner journal", () => {
    expect(() => parseInventoryPin({ ...pin(), journal: { uid: "someone-else", lifecycleEpoch: 1, revision: 0, headHash: null } })).toThrow();
    expect(() => createBootstrapInventory(pin(), [{ ...row(), path: "users/other/assessments/private" }])).toThrow();
    expect(() => parseInventoryPin({ ...pin(), lifecycleEpoch: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });
  it("is deterministic and rejects missing, reordered, duplicated, substituted or altered pages", () => {
    const rows = Array.from({ length: 55 }, (_, i) => row(i)); const result = createBootstrapInventory(pin(), rows);
    expect(createBootstrapInventory(pin(), rows.toReversed())).toEqual(result);
    for (const pages of [result.pages.slice(1), result.pages.toReversed(), [result.pages[0], ...result.pages],
      [{ ...result.pages[0], records: [row(1000)] }, ...result.pages.slice(1)]])
      expect(() => verifyBootstrapInventory(result.manifest, pages)).toThrow();
    expect(() => createBootstrapInventory(pin(), [...rows, rows[0]])).toThrow();
    const incomplete = createBootstrapInventory(pin(), rows.slice(1));
    expect(verifyBootstrapInventory(incomplete.manifest, incomplete.pages).authority).toBe("NOT VERIFIED");
  });
  it("bounds counts before allocating pages and rejects malformed keys and paths", () => {
    expect(() => createBootstrapInventory(pin(), Array.from({ length: 10001 }, () => row()))).toThrow();
    for (const path of ["users/b1_unit-owner/../x", "users/b1_unit-owner/x", "users/b1_unit-owner/a/\udfff"])
      expect(() => createBootstrapInventory(pin(), [{ ...row(), path }])).toThrow();
  });
  it.each(["native", "legacy"])("does not turn unresolved %s claims or pre-v2 hashes into reconciled identity", kind => {
    const data = [{ ...row(), category: "identity-event", issues: ["pre-v2-fingerprint-unverified"], links: [
      { kind: kind + "-claim", recordId: "source-record", target: "session-missing", fingerprint: "a".repeat(64) }] }];
    const report = reconciliationPlan(data);
    expect(report.migrationAuthorized).toBe(false); expect(report.warnings).toContain("identity-target-missing");
    expect(report.warnings).toContain("pre-v2-fingerprint-unverified");
  });
  it("reports conflicting aliases without choosing a winner or generating performance", () => {
    const data = ["target-a", "target-b"].map((target, i) => ({ ...row(i), links: [{ kind: "legacy-claim", recordId: "same-source", target, fingerprint: null }] }));
    const report = reconciliationPlan(data); expect(report.warnings).toContain("conflicting-historical-aliases");
    expect(report).not.toHaveProperty("score"); expect(report).not.toHaveProperty("profile");
  });
  it("preserves valid historical alias chains without falsely warning about two targets", () => {
    const fp = "v2:" + "c".repeat(64), from = "legacy-" + "a".repeat(64), to = "session-" + "b".repeat(64);
    const events = [null, from].map((previous, i) => {
      const d = { schemaVersion: 1, sourceKind: "legacy", recordId: "old-record", sourceHash: completionSourceIdentity("legacy", "old-record"),
        fromEvidenceId: previous, toEvidenceId: i ? to : from, fingerprint: fp };
      return { ...row(i), path: `users/${pin().uid}/learningEvidenceIdentityEvents/${digest(d)}`, category: "identity-event", links: [
        { kind: "legacy-claim", recordId: "old-record", target: d.toEvidenceId, fingerprint: fp },
        ...(previous ? [{ kind: "identity-predecessor", recordId: "old-record", target: previous, fingerprint: null }] : [])] };
    });
    expect(reconciliationPlan(events).warnings).not.toContain("conflicting-historical-aliases");
    expect(reconciliationPlan(events.toReversed())).toEqual(reconciliationPlan(events));
  });
  it("detects missing journal revisions against the actual pinned cutoff", () => {
    const d = { ...row(), category: "acceptance-journal", links: [{ kind: "journal-position", recordId: "2", target: "a".repeat(64), fingerprint: "b".repeat(64) }] };
    expect(reconciliationPlan([d], { ...pin(), journal: { uid: pin().uid, lifecycleEpoch: 1, revision: 2, headHash: "b".repeat(64) } }).warnings)
      .toContain("journal-prefix-gap-or-conflict");
  });
  it.each([
    ["learningEvidence/a", "native-or-frozen-performance"], ["assessments/a", "legacy-assessment"], ["quizAttempts/a", "legacy-unclassified-quiz"],
    ["learningProfiles/journalControl/completionArchives/a", "completion-archive-and-receipt"], ["learningProfiles/journalControl/journal/a", "acceptance-journal"],
    ["learningProfiles/journalControl/acceptanceBatches/a", "acceptance-batch"], ["learningProfiles/shadow-a/artifacts/a", "generation-artifact-and-manifest"],
    ["trainingProgress/active", "unfinished-draft"], ["trainingActivity/day", "activity-history"], ["trainingStats/streak", "streak-summary"],
    ["trainingUsage/day/reservations/id", "preserved-reservation"], ["aiRecommendations/latest", "selection-context-only"], ["unknown/a", "unsupported-namespace"]
  ])("classifies %s without adding auxiliary history to performance", (path, category) => expect(classifyInventoryPath(pin().uid, `users/${pin().uid}/${path}`)).toBe(category));
});

describe("Stage 4B1 inventory array repair", () => {
  const one = () => createBootstrapInventory(pin(), [row()]);
  const rehashManifest = body => ({ ...body, manifestHash: typedHash("bootstrap-inventory-manifest-stage4b1-v1", body) });
  const fakeEmptyManifest = () => {
    const { manifestHash, ...body } = createBootstrapInventory(pin(), []).manifest;
    return rehashManifest({ ...body, pageCount: 1 });
  };
  const boundaries = [
    ["pages", values => verifyBootstrapInventory(one().manifest, values), () => one().pages[0]],
    ["inventory records", values => createBootstrapInventory(pin(), values), () => row()],
    ["page records", values => createBootstrapInventoryPage(pin(), 0, null, values), () => row()]
  ];

  it("rejects the original rehashed one-page manifest with a sparse page array", () => {
    expect(() => verifyBootstrapInventory(fakeEmptyManifest(), new Array(1))).toThrow();
  });
  it("rejects the original fabricated page container without invoking forEach", () => {
    let called = false;
    expect(() => verifyBootstrapInventory(fakeEmptyManifest(), { length: 1, forEach() { called = true; } })).toThrow();
    expect(called).toBe(false);
  });
  it("rejects an overridden forEach that substitutes a valid page for the actual invalid page", () => {
    const valid = one(), values = [{ ...valid.pages[0], index: 99 }]; let called = false;
    Object.defineProperty(values, "forEach", { value(callback) { called = true; callback(valid.pages[0], 0); } });
    expect(() => verifyBootstrapInventory(valid.manifest, values)).toThrow();
    expect(called).toBe(false);
  });
  it.each(boundaries)("rejects sparse %s without skipping missing elements", (_name, run) => {
    expect(() => run(new Array(1))).toThrow();
  });
  it.each(boundaries)("rejects accessor-backed %s without invoking an index getter", (_name, run, value) => {
    let calls = 0; const values = [];
    Object.defineProperty(values, "0", { enumerable: true, get() { calls++; return value(); } });
    expect(() => run(values)).toThrow();
    expect(calls).toBe(0);
  });
  it.each(boundaries)("rejects fabricated %s without invoking length or iteration getters", (_name, run) => {
    let calls = 0; const values = {};
    for (const key of ["length", "map", "forEach", Symbol.iterator])
      Object.defineProperty(values, key, { get() { calls++; throw new Error("must not execute"); } });
    expect(() => run(values)).toThrow();
    expect(calls).toBe(0);
  });
  it.each(boundaries)("rejects inherited and non-enumerable indices in %s", (_name, run, value) => {
    const inherited = new Array(1); Object.setPrototypeOf(inherited, { 0: value() });
    expect(() => run(inherited)).toThrow();
    const hidden = []; Object.defineProperty(hidden, "0", { value: value() });
    expect(() => run(hidden)).toThrow();
  });
  for (const method of ["map", "forEach", "slice", "sort", "at", Symbol.iterator]) {
    it.each(boundaries)(`rejects an own ${String(method)} override on %s without executing it`, (_name, run, value) => {
      let called = false; const values = [value()];
      Object.defineProperty(values, method, { get() { called = true; throw new Error("must not execute"); } });
      expect(() => run(values)).toThrow();
      expect(called).toBe(false);
    });
  }
  it("rejects nested page record accessors without invoking them", () => {
    let called = false; const valid = one(), records = [];
    Object.defineProperty(records, "0", { enumerable: true, get() { called = true; return row(); } });
    expect(() => parseBootstrapInventoryPage({ ...valid.pages[0], records })).toThrow();
    expect(called).toBe(false);
  });
  it("bounds array counts before processing elements", () => {
    expect(() => createBootstrapInventory(pin(), new Array(10001))).toThrow();
    expect(() => createBootstrapInventoryPage(pin(), 0, null, Array.from({ length: 21 }, () => row()))).toThrow();
    expect(() => verifyBootstrapInventory(one().manifest, new Array(10001))).toThrow();
  });
  it("copies each page without freezing or retaining caller-owned records", () => {
    const input = [row()], page = createBootstrapInventoryPage(pin(), 0, null, input);
    expect(Object.isFrozen(input)).toBe(false); expect(Object.isFrozen(input[0])).toBe(false);
    input[0].issues.push("caller changed"); input.length = 0;
    expect(page.records).toHaveLength(1); expect(page.records[0].issues).toEqual([]);
    const pages = [page]; verifyBootstrapInventory(one().manifest, pages);
    expect(Object.isFrozen(pages)).toBe(false);
  });
  // Captured from the unchanged implementation BEFORE the array repair.
  it.each([
    [0, "158dc1bfa5a69d3d28690f4dfddf65f8d06091a99084874cc73bb313f5796bae", "84d978d14c29d5decd107aa46a1f4952777f1000457a82cd7736ec188a4e7faa"],
    [100, "e46fdbd547271a8d3738f66e1f823cf8b6fff18e87cda7b366e2564e5cc6a892", "961b08e1ab23e98f80958cfdfa2a5163eb288e556fb2df349c174eeb15b28b23"],
    [500, "9cd9defdc15ccbc78eb77e83e79e68db8893dd5f9ff0909aaa0240d15b160b64", "4c1c10d1c53abc8af60378099660daaf90df968ae75a91b2c5ac58b3f7719d72"],
    [1000, "169dc16639b5ac53d3876f5c771692e4bd23336729ce1e1b206d7b8a84546c9e", "e80d4266a6ee4c6a93d6f04c5094cf66d0ddc2ab2b16fa567504e73ef125cb1e"]
  ])("preserves original hashes and valid %i-record inventories", (count, manifestHash, inventoryDigest) => {
    const result = createBootstrapInventory(pin(), Array.from({ length: count }, (_, i) => row(i)));
    expect(result.manifest).toMatchObject({ manifestHash, inventoryDigest, recordCount: count, pageCount: Math.ceil(count / 20) });
    expect(verifyBootstrapInventory(result.manifest, result.pages)).toMatchObject({ authority: "NOT VERIFIED", publicationEligible: false });
    if (count) expect(result.pages[0].pageHash).toBe("2a89a5dc15ebbd5e0700f9620b1984ca6303aead2db45a3736aa814b084f8b67");
  });
  it("validates bounded pages separately when a legitimate history exceeds the whole-value JSON budget", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ ...row(i), issues: ["x".repeat(90), "é".repeat(40)] }));
    expect(Buffer.byteLength(JSON.stringify(rows))).toBeGreaterThan(256 * 1024);
    const result = createBootstrapInventory(pin(), rows);
    expect(result.manifest.recordCount).toBe(1000);
    expect(result.pages).toHaveLength(50);
    expect(result.pages.every(page => Buffer.byteLength(JSON.stringify(page)) <= 128 * 1024)).toBe(true);
    expect(verifyBootstrapInventory(result.manifest, result.pages).authority).toBe("NOT VERIFIED");
  });
});
