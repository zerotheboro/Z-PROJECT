import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { AUTHORITY_PROTOCOL, AUTHORITY_WRITER, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { assertWriterGuardContext, createSharedWriterGuard, parseWriterGuardContext, validateLifecycleSnapshots } from "./writerGuard";
const uid = "guard-unit-owner", binding = "a".repeat(64), at = new Timestamp(1792915200, 123456789);
const life = () => ({ schemaVersion: 1, uid, lifecycleEpoch: 1, state: "active", writerProtocol: AUTHORITY_PROTOCOL,
  writerIdentity: AUTHORITY_WRITER, namespaceVersion: SOURCE_NAMESPACE_VERSION, admissionEligibility: "NOT VERIFIED",
  rootBinding: binding, fence: 1, revision: 0, headHash: null });
const snap = (value, createdAt = at) => ({ exists: value !== undefined, createTime: createdAt, data: () => value });
const root = () => snap({ uid, trainingLifecycleBinding: binding });
const fence = () => snap({ persistenceVersion: 3, writerProtocol: AUTHORITY_PROTOCOL, uid, lifecycleEpoch: 1, rootBinding: binding });
const context = () => parseWriterGuardContext({ schemaVersion: 1, uid, protection: "protected", lifecycleEpoch: 1,
  rootBinding: binding, rootCreatedAt: { seconds: at.seconds, nanoseconds: at.nanoseconds }, fence: 1,
  writerProtocol: AUTHORITY_PROTOCOL, namespaceVersion: SOURCE_NAMESPACE_VERSION });
describe("shared writer protection contracts", () => {
  it("binds genuine root/lifecycle creation metadata and the exact writer fence", () => {
    expect(validateLifecycleSnapshots(uid, snap(life()), root(), fence()).rootCreatedAt.nanoseconds).toBe(123456789);
  });
  it.each(["uid", "lifecycleEpoch", "rootBinding", "writerProtocol", "admissionEligibility", "state", "fence"])("rejects malformed lifecycle %s", key => {
    expect(() => validateLifecycleSnapshots(uid, snap({ ...life(), [key]: "forged" }), root(), fence())).toThrow();
  });
  it.each(["owner", "binding", "root-time", "fence-time-field", "fence-owner", "missing-life", "missing-root"])("rejects source substitution %s", kind => {
    let r = root(), l = snap(life()), f = fence();
    if (kind === "owner") r = snap({ uid: "another", trainingLifecycleBinding: binding });
    if (kind === "binding") r = snap({ uid, trainingLifecycleBinding: "b".repeat(64) });
    if (kind === "root-time") r = snap(r.data(), new Timestamp(at.seconds + 1, 0));
    if (kind === "fence-time-field") l = snap({ ...life(), rootCreatedAt: { seconds: at.seconds, nanoseconds: at.nanoseconds } });
    if (kind === "fence-owner") f = snap({ ...f.data(), uid: "another" });
    if (kind === "missing-life") l = snap(undefined);
    if (kind === "missing-root") r = snap(undefined);
    expect(() => validateLifecycleSnapshots(uid, l, r, f)).toThrow();
  });
  it("allows missing root only for a known closed lifecycle observation, never an active write", () => {
    const closed = snap({ ...life(), state: "deleted", fence: 3, revision: 2, headHash: "b".repeat(64) });
    expect(validateLifecycleSnapshots(uid, closed, snap(undefined), fence(), true).state).toBe("deleted");
    expect(() => validateLifecycleSnapshots(uid, closed, snap(undefined), fence())).toThrow();
    expect(() => validateLifecycleSnapshots(uid, snap(life()), snap(undefined), fence(), true)).toThrow();
  });
  it.each(["uid", "lifecycleEpoch", "rootBinding", "fence", "rootCreatedAt"])("rejects stale expected context %s", key => {
    const expected = { ...context(), [key]: key === "uid" ? "other" : key === "rootCreatedAt" ? { seconds: at.seconds + 1, nanoseconds: 0 } : key === "rootBinding" ? "b".repeat(64) : 2 };
    expect(() => assertWriterGuardContext(context(), expected)).toThrow("writer_stale_context");
  });
  it("copies contexts and rejects coercive containers/accessors without calling them", () => {
    const input = { ...context() }, parsed = parseWriterGuardContext(input); input.uid = "changed";
    expect(parsed.uid).toBe(uid); expect(Object.isFrozen(input)).toBe(false); expect(Object.isFrozen(parsed.rootCreatedAt)).toBe(true);
    let calls = 0; const bad = { ...context() }; Object.defineProperty(bad, "uid", { enumerable: true, get() { calls++; return uid; } });
    expect(() => parseWriterGuardContext(bad)).toThrow(); expect(calls).toBe(0);
    expect(() => parseWriterGuardContext({ ...context(), protection: ["protected"] })).toThrow();
    expect(() => parseWriterGuardContext({ ...context(), writerProtocol: [AUTHORITY_PROTOCOL] })).toThrow();
    expect(() => createSharedWriterGuard({ getFirestore() {} })).toThrow("stage2_transport_required");
  });
  it("keeps legacy demo contexts distinct from protected admission", () => {
    const c = { ...context(), protection: "legacy-demo", lifecycleEpoch: null, rootBinding: null, fence: null, writerProtocol: null, namespaceVersion: null };
    expect(parseWriterGuardContext(c).protection).toBe("legacy-demo");
    expect(() => parseWriterGuardContext({ ...c, lifecycleEpoch: 1 })).toThrow();
    expect(() => assertWriterGuardContext(context(), c)).toThrow();
  });
});
