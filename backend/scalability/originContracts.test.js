import { describe, expect, it } from "vitest";
import { ORIGIN_PROTOCOL, ORIGIN_REALM, ORIGIN_STATES, genesisForOrigin, makeOriginAttestation, makeOriginEvent, makeOriginIntent,
  originCommitment, originStatus, parseOriginAttestation, parseOriginEvent, parseOriginIntent, verifyOriginLedger } from "./originContracts";
import { typedHash } from "./values";

const intent = () => makeOriginIntent({ requestId: "unit-origin-request", identityForm: "ascii" }, "b1_" + "a".repeat(32), "b".repeat(64));
const at = "2026-10-25T08:00:00.000Z";
function fixture() {
  const i = intent(), sourceCreatedAt = { seconds: 1792915200, nanoseconds: 123000 };
  const c = originCommitment(i, { schemaVersion: 1, protocol: ORIGIN_PROTOCOL, uid: i.uid, lifecycleEpoch: 1, incarnationId: i.incarnationId,
    intentHash: i.intentHash, genesisHash: genesisForOrigin(i, at).genesisHash, rootBinding: i.rootBinding, authCreatedAt: at, sourceCreatedAt,
    rootIncarnationHash: typedHash("origin-root-incarnation-v1", { uid: i.uid, rootBinding: i.rootBinding, sourceCreatedAt }) });
  const attestation = makeOriginAttestation(i, c), events = [];
  for (const [kind, detail] of [["INTENT_RECORDED", {}], ["AUTH_CREATE_STARTED", { attemptId: "c".repeat(64) }],
    ["AUTH_CREATED", { authCreatedAt: at, incarnationId: i.incarnationId }], ["GENESIS_CREATE_STARTED", { attemptId: "d".repeat(64) }],
    ["GENESIS_COMMITTED", c], ["FINALIZED", { attestationHash: attestation.attestationHash }]]) events.push(makeOriginEvent(i, events.at(-1) ?? null, kind, detail));
  return { i, c, attestation, events };
}
describe("Stage 4B2 origin contracts never manufacture external authority", () => {
  it("names the required states but rejects either trusted success state", () => {
    expect(ORIGIN_STATES).toEqual(["PROVISIONING_PENDING", "ORIGIN_ATTESTED", "ORIGIN_RECOVERED", "ORIGIN_UNVERIFIED", "ORIGIN_REVOKED", "EXTERNAL_TRUST_NOT_ENFORCED"]);
    for (const state of ["ORIGIN_ATTESTED", "ORIGIN_RECOVERED", ["ORIGIN_RECOVERED"], "unknown"])
      expect(() => originStatus(intent().uid, state, "fake-proof")).toThrow("origin_external_trust_required");
    expect(originStatus(intent().uid, "EXTERNAL_TRUST_NOT_ENFORCED", "demo-only")).toMatchObject({ authority: "NOT VERIFIED", admissionEligible: false, publicationEligible: false });
  });
  it("rebuilds exact durable control and bindings deterministically", () => {
    const f = fixture(), a = verifyOriginLedger(f.i, f.events, f.attestation), b = verifyOriginLedger(structuredClone(f.i), structuredClone(f.events), structuredClone(f.attestation));
    expect(a).toEqual(b); expect(a.control).toMatchObject({ phase: "FINALIZED", sequence: 6, reviewRequired: false, attestationHash: f.attestation.attestationHash });
    expect(a.commitment).toEqual(f.c); expect(a.attestation.realm).toBe(ORIGIN_REALM);
  });
  it.each([{ uid: "other" }, { lifecycleEpoch: 2 }, { incarnationId: "c".repeat(64) }, { protocol: [ORIGIN_PROTOCOL] },
    { requestKey: "0".repeat(64) }, { rootBinding: "d".repeat(64) }, { originVerified: true }, { uid: "b1_\ud800" }])("rejects altered intent %#", patch => {
    expect(() => parseOriginIntent({ ...intent(), ...patch })).toThrow();
  });
  it("does not normalize a valid multibyte owner", () => {
    const uid = "b1_" + "界".repeat(50) + "abcde";
    const i = makeOriginIntent({ requestId: "unicode-origin", identityForm: "unicode58" }, uid, "b".repeat(64));
    expect(i.uid).toBe(uid); expect(Buffer.byteLength(i.uid)).toBe(158);
  });
  it.each(["uid", "lifecycleEpoch", "incarnationId", "intentHash", "rootBinding", "genesisHash", "rootIncarnationHash", "authCreatedAt"])("binds commitment field %s", key => {
    const f = fixture(); expect(() => originCommitment(f.i, { ...f.c, [key]: key === "lifecycleEpoch" ? 2 : "different" })).toThrow();
  });
  it("binds actual creation metadata rather than visible root fields alone", () => {
    const f = fixture(); expect(() => originCommitment(f.i, { ...f.c, sourceCreatedAt: { seconds: f.c.sourceCreatedAt.seconds + 1, nanoseconds: 0 } })).toThrow();
  });
  it("rejects self-claimed authority, altered realm and a substituted commitment", () => {
    const f = fixture();
    for (const patch of [{ trustBoundary: "VERIFIED" }, { realm: "application" }, { attestationHash: "0".repeat(64) }, { originVerified: true }, { commitment: { ...f.c, lifecycleEpoch: 2 } }])
      expect(() => parseOriginAttestation(f.i, { ...f.attestation, ...patch })).toThrow();
  });
  it.each(["missing", "duplicate", "reverse", "predecessor", "owner", "phase", "detail"])("rejects corrupted ledger %s", mode => {
    const f = fixture(), events = structuredClone(f.events);
    if (mode === "missing") events.splice(2, 1);
    if (mode === "duplicate") events.splice(2, 0, events[1]);
    if (mode === "reverse") events.reverse();
    if (mode === "predecessor") events[2].previousHash = "0".repeat(64);
    if (mode === "owner") events[1].uid = "other";
    if (mode === "phase") events[1].kind = ["AUTH_CREATE_STARTED"];
    if (mode === "detail") events[2].detail.incarnationId = "c".repeat(64);
    expect(() => verifyOriginLedger(f.i, events, f.attestation)).toThrow();
  });
  it("marks both ambiguous non-atomic boundaries for controlled recovery", () => {
    const f = fixture();
    for (const length of [2, 4]) expect(verifyOriginLedger(f.i, f.events.slice(0, length)).control.reviewRequired).toBe(true);
    for (const length of [1, 3, 5]) expect(verifyOriginLedger(f.i, f.events.slice(0, length)).control.reviewRequired).toBe(false);
  });
  it("requires the original attestation exactly at finalization", () => {
    const f = fixture(); expect(() => verifyOriginLedger(f.i, f.events)).toThrow();
    expect(() => verifyOriginLedger(f.i, f.events.slice(0, 5), f.attestation)).toThrow("origin_unexpected_attestation");
  });
  it.each([1, 2, 3, 4, 5, 6])("reserves a terminal revocation after phase %i", length => {
    const f = fixture(), prior = f.events.slice(0, length), revoked = makeOriginEvent(f.i, prior.at(-1), "REVOKED", { reason: "operator-demo" });
    const result = verifyOriginLedger(f.i, [...prior, revoked], length === 6 ? f.attestation : null);
    expect(result.control.phase).toBe("REVOKED"); expect(result.control.sequence).toBe(length + 1);
  });
  it("does not allow revival or replacement after revocation", () => {
    const f = fixture(), first = f.events[0], revoked = makeOriginEvent(f.i, first, "REVOKED", { reason: "operator-demo" });
    const revived = makeOriginEvent(f.i, revoked, "AUTH_CREATED", { authCreatedAt: at, incarnationId: f.i.incarnationId });
    expect(() => verifyOriginLedger(f.i, [first, revoked, revived])).toThrow();
  });
  it("copies input and rejects getters without interpreting them", () => {
    const f = fixture(), input = structuredClone(f.events), result = verifyOriginLedger(f.i, input, f.attestation);
    expect(Object.isFrozen(input)).toBe(false); input[0].detail.extra = "caller-owned"; expect(result.events[0].detail).toEqual({});
    let called = false; const d = { ...f.i }; Object.defineProperty(d, "uid", { enumerable: true, get() { called = true; return f.i.uid; } });
    expect(() => parseOriginIntent(d)).toThrow(); expect(called).toBe(false);
    expect(() => parseOriginEvent(d, f.events[0])).toThrow(); expect(called).toBe(false);
  });
});
