import { describe, it, expect } from "vitest";
import { initialSealControl, parseSealControl, parseSealPin, makeSealHandle, parseSealHandle, sameSealPin, verifySealPages, admissionDecision,
  SEAL_PROTOCOL, SEAL_LIMITS, parseSealManifest } from "./sealingContracts";
import { createBootstrapInventory } from "./bootstrapContracts";
import { parseWriterGuardContext } from "./writerGuard";
import { AUTHORITY_PROTOCOL, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { typedHash } from "./values";
const context = () => parseWriterGuardContext({ schemaVersion: 1, uid: "b1_unit-owner", protection: "protected", lifecycleEpoch: 1,
  rootBinding: "a".repeat(64), rootCreatedAt: { seconds: 1792886400, nanoseconds: 1 }, fence: 1, writerProtocol: AUTHORITY_PROTOCOL, namespaceVersion: SOURCE_NAMESPACE_VERSION });
const pin = () => parseSealPin({ context: context(), lifecycleRevision: 0, lifecycleHead: null, genesisHash: null, journalCutoff: null,
  sourceRevision: 0, revocationFence: 1, participantsHash: initialSealControl(context()).participantsHash });
const inventoryPin = () => ({ uid: context().uid, lifecycleEpoch: 1, lifecycleRevision: 0, lifecycleHead: null, lifecycleFence: 1,
  writerProtocol: AUTHORITY_PROTOCOL, genesisHash: null, lifecycleState: "active", journal: null, writerFenceHash: "v2:" + "a".repeat(64),
  rootCreatedAt: context().rootCreatedAt, scopeVersion: "all-user-descendants-stage4b1-v1", readTime: context().rootCreatedAt });
const rows = () => Array.from({ length: 21 }, (_, i) => ({ path: `users/${context().uid}/trainingReservations/r${String(i).padStart(2,"0")}`,
  category: "preserved-reservation", exists: true, fingerprint: "v2:" + "b".repeat(64), createdAt: context().rootCreatedAt,
  updatedAt: context().rootCreatedAt, issues: [], links: [] }));
describe("isolated Stage 4D contracts", () => {
  it("pins the exact owner incarnation and retains absent journal/unknown genesis without inventing them", () => {
    const p = pin(), handle = makeSealHandle("request-1234", p); expect(parseSealHandle(handle)).toEqual(handle);
    expect(handle.pin.journalCutoff).toBeNull(); expect(handle.pin.genesisHash).toBeNull(); expect(handle.protocol).toBe(SEAL_PROTOCOL);
  });
  it.each(["uid", "lifecycleEpoch", "rootBinding", "fence", "rootCreatedAt"])("binds incarnation component %s", k => {
    const p = pin(), changed = { ...p, context: { ...p.context, [k]: k === "uid" ? "other-owner" : k === "rootBinding" ? "b".repeat(64) :
      k === "rootCreatedAt" ? { ...p.context.rootCreatedAt, nanoseconds: 2 } : 2 } };
    expect(sameSealPin(p, changed)).toBe(false);
    expect(() => parseSealHandle({ ...makeSealHandle("request-1234", p), pin: changed })).toThrow();
  });
  it.each(["sourceRevision", "revocationFence", "lifecycleRevision"])("rejects stale %s in a handle", k => {
    const p = pin(), changed = { ...p, [k]: 2, ...(k === "lifecycleRevision" ? { lifecycleHead: "a".repeat(64) } : {}) };
    expect(sameSealPin(p, changed)).toBe(false);
  });
  it("distinguishes absent journal from a known empty journal and enforces journal owner/epoch", () => {
    const p = pin(), known = { uid: p.context.uid, lifecycleEpoch: 1, revision: 0, headHash: null };
    expect(sameSealPin(p, { ...p, journalCutoff: known })).toBe(false);
    expect(() => parseSealPin({ ...p, journalCutoff: { ...known, uid: "other" } })).toThrow();
    expect(() => parseSealPin({ ...p, journalCutoff: { ...known, lifecycleEpoch: 2 } })).toThrow();
  });
  it.each([["sealing"], "unknown", {}, null])("rejects malformed phase %j", phase => {
    expect(() => parseSealControl({ ...initialSealControl(context()), phase })).toThrow();
  });
  it("bounds attempts independently of source revisions and rejects overflow", () => {
    expect(parseSealControl({ ...initialSealControl(context()), revision: 10000, sourceRevision: 9999, attemptCount: 100 }).attemptCount).toBe(100);
    expect(() => parseSealControl({ ...initialSealControl(context()), attemptCount: SEAL_LIMITS.attempts + 1 })).toThrow();
    expect(() => parseSealControl({ ...initialSealControl(context()), revision: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });
  it("rejects an array-valued phase even with a valid seal ID", () => {
    expect(() => parseSealControl({ ...initialSealControl(context()), phase: ["sealed"], sealId: "a".repeat(64) })).toThrow();
  });
  it("validates complete bounded pages without changing B1 hashes", () => {
    const inv = createBootstrapInventory(inventoryPin(), rows()), h = makeSealHandle("request-1234", pin());
    expect(inv.pages.length).toBe(2); expect(verifySealPages(h, inv.manifest, inv.pages).authority).toBe("NOT VERIFIED");
    expect(createBootstrapInventory(inventoryPin(), rows())).toEqual(inv);
  });
  it.each(["missing", "duplicate", "reordered", "sparse", "fabricated", "getter"])("rejects %s page inventories", kind => {
    const inv = createBootstrapInventory(inventoryPin(), rows()), h = makeSealHandle("request-1234", pin());
    let pages = [...inv.pages], calls = 0;
    if (kind === "missing") pages.pop(); if (kind === "duplicate") pages[1] = pages[0]; if (kind === "reordered") pages.reverse();
    if (kind === "sparse") pages = new Array(2); if (kind === "fabricated") pages = { length: 2, forEach() {} };
    if (kind === "getter") Object.defineProperty(pages, "0", { get() { calls++; return inv.pages[0]; } });
    expect(() => verifySealPages(h, inv.manifest, pages)).toThrow(); expect(calls).toBe(0);
  });
  it("never admits or authorizes publication, even when every caller-supplied fact claims success", () => {
    const result = admissionDecision({ lifecycle: true, inventory: true, coordination: true, revocationClear: true, origin: "trusted-by-caller" });
    expect(result.admission).toBe("NOT VERIFIED"); expect(result.admitted).toBe(false); expect(result.publicationEligible).toBe(false);
    expect(result.blockers).toContain("production_iam_unverified");
  });
  it("rejects inconsistent coordination counters", () => {
    const c = initialSealControl(context());
    for (const changed of [{ sourceRevision: 1 }, { attemptCount: 1 }, { revocationFence: 2 }])
      expect(() => parseSealControl({ ...c, ...changed })).toThrow("seal_revision_invalid");
  });
  it("copies and validates admission observations without invoking accessors", () => {
    const facts = { lifecycle: true, inventory: true, coordination: true, revocationClear: false, origin: "ORIGIN_UNAVAILABLE" };
    let calls = 0; const bad = { ...facts }; Object.defineProperty(bad, "origin", { enumerable: true, get() { calls++; return "trusted"; } });
    expect(() => admissionDecision(bad)).toThrow(); expect(calls).toBe(0);
    expect(() => admissionDecision({ ...facts, inventory: [true] })).toThrow();
    const result = admissionDecision(facts); facts.origin = "changed"; expect(result.facts.origin).toBe("ORIGIN_UNAVAILABLE");
  });
  it("rejects accessor-backed manifest fields without invoking getters", () => {
    const inv = createBootstrapInventory(inventoryPin(), rows()), bad = { ...inv.manifest }; let calls = 0;
    Object.defineProperty(bad, "pin", { enumerable: true, get() { calls++; return inv.manifest.pin; } });
    expect(() => verifySealPages(makeSealHandle("request-1234", pin()), bad, inv.pages)).toThrow(); expect(calls).toBe(0);
  });
  it("accepts the original immutable manifest, including its exact snapshot binding", () => {
    const inv = createBootstrapInventory(inventoryPin(), rows()), h = makeSealHandle("request-1234", pin());
    expect(parseSealManifest(inv.manifest, h, inventoryPin())).toEqual(inv.manifest);
  });
  it.each([null, {}, { schemaVersion: 1 }, { manifestHash: "bad" }])("rejects missing/malformed sealed manifest %j", value => {
    expect(() => parseSealManifest(value, makeSealHandle("request-1234", pin()), inventoryPin())).toThrow();
  });
  it("rejects a corrupt hash and a self-consistent rehash for a different snapshot", () => {
    const inv = createBootstrapInventory(inventoryPin(), rows()), h = makeSealHandle("request-1234", pin());
    expect(() => parseSealManifest({ ...inv.manifest, manifestHash: "a".repeat(64) }, h, inventoryPin())).toThrow();
    const { manifestHash: _old, ...body } = inv.manifest;
    const changed = { ...body, pin: { ...body.pin, readTime: { ...atForTest(), nanoseconds: 2 } } };
    const rehashed = { ...changed, manifestHash: typedHash("bootstrap-inventory-manifest-stage4b1-v1", changed) };
    expect(() => parseSealManifest(rehashed, h, inventoryPin())).toThrow("seal_manifest_binding_invalid");
  });
});
function atForTest() { return context().rootCreatedAt; }
