import { describe, expect, it } from "vitest";
import { AUTHORITY_LIMITS, AUTHORITY_PROTOCOL, AUTHORITY_WRITER, SOURCE_NAMESPACE_VERSION,
  advanceLifecycle, ownerUID, parseLifecycle, parseStoredLifecycle, parseWriterContext, writerContext } from "./authorityContracts";
import { journalIdentity, parseJournalAnchor } from "./journal";
import { canonicalJSON, jsonBytes, text, typedHash } from "./values";

const head = "a".repeat(64);
const initial = (uid = "previous-valid-owner") => ({ schemaVersion: 1, uid, lifecycleEpoch: 1, state: "active",
  writerProtocol: AUTHORITY_PROTOCOL, writerIdentity: AUTHORITY_WRITER, namespaceVersion: SOURCE_NAMESPACE_VERSION,
  admissionEligibility: "NOT VERIFIED", rootBinding: "b".repeat(64), fence: 1, revision: 0, headHash: null });
const wire = stored => parseLifecycle({ ...stored, rootCreatedAt: { seconds: 1, nanoseconds: 123000 } });

describe("authority repair: independently reserved lifecycle capacity", () => {
  it("preserves 100 probe slots and two slots unavailable to ordinary probes", () => {
    expect(AUTHORITY_LIMITS.probeEvents).toBe(100);
    expect(AUTHORITY_LIMITS.deletionEvents).toBe(2);
    expect(AUTHORITY_LIMITS.events).toBe(AUTHORITY_LIMITS.probeEvents + AUTHORITY_LIMITS.deletionEvents);
    let life = wire(initial());
    for (let n = 0; n < AUTHORITY_LIMITS.probeEvents; n++) life = wire(advanceLifecycle(life, "source", head));
    expect(life.revision).toBe(100); expect(life.fence).toBe(1);
    expect(() => advanceLifecycle(life, "source", head)).toThrow("authority_prototype_capacity");
    life = wire(advanceLifecycle(life, "deleting", head));
    expect(life.revision).toBe(101); expect(life.fence).toBe(2);
    expect(() => advanceLifecycle(life, "source", head)).toThrow("authority_transition_invalid");
    expect(() => advanceLifecycle(life, "deleting", head)).toThrow("authority_transition_invalid");
    life = wire(advanceLifecycle(life, "deleted", head));
    expect(life.revision).toBe(102); expect(life.fence).toBe(3);
    for (const kind of ["source", "deleting", "deleted", "active", ["deleted"]])
      expect(() => advanceLifecycle(life, kind, head)).toThrow("authority_transition_invalid");
  });
  it("fixes the exact previous 99 probes -> deleting/revision 100 -> deleted reproduction", () => {
    const old = wire({ ...initial(), revision: 99, headHash: head });
    const deleting = wire(advanceLifecycle(old, "deleting", head));
    expect(deleting.revision).toBe(100);
    expect(advanceLifecycle(deleting, "deleted", head)).toMatchObject({ revision: 101, state: "deleted", fence: 3 });
    expect(old).toMatchObject({ revision: 99, state: "active", fence: 1 });
  });
  it.each([
    ["active", 1, 0], ["active", 1, 1], ["active", 1, 99], ["active", 1, 100],
    ["deleting", 2, 1], ["deleting", 2, 100], ["deleted", 3, 2], ["deleted", 3, 100]
  ])("reads previous valid schema-1 lifecycle %s/%i/%i without migration", (state, fence, revision) => {
    const previous = { ...initial(), state, fence, revision, headHash: revision === 0 ? null : head };
    expect(parseStoredLifecycle(previous)).toEqual(previous);
    expect(wire(previous)).toEqual({ ...previous, rootCreatedAt: { seconds: 1, nanoseconds: 123000 } });
  });
  it.each([{ state: "active", fence: 1, revision: 101 }, { state: "deleting", fence: 2, revision: 102 },
    { state: "deleted", fence: 3, revision: 103 }, { state: "deleting", fence: 1, revision: 1 },
    { state: "deleted", fence: 2, revision: 2 }])("rejects a forged capacity/fencing state %#", patch => {
    expect(() => parseStoredLifecycle({ ...initial(), ...patch, headHash: head })).toThrow("authority_state_invalid");
  });
});

describe("authority repair: exact persisted owner identity and pre-write validation", () => {
  const accepted = ["a", "a".repeat(128), "\u754c".repeat(50) + "12345678", "\u754c".repeat(128),
    "\u{1f9e0}".repeat(64), "study-\u754c-\u{1f9e0}-e\u0301", " owner with spaces "];
  it.each(accepted)("round-trips supported UID %# across lifecycle, context, journal and hashes", uid => {
    expect(() => ownerUID(uid)).not.toThrow();
    const stored = parseStoredLifecycle(initial(uid));
    expect(stored.uid).toBe(uid); expect(Object.hasOwn(stored, "rootCreatedAt")).toBe(false);
    const life = wire(JSON.parse(canonicalJSON(stored)));
    expect(life.uid).toBe(uid); expect(parseWriterContext(writerContext(life)).uid).toBe(uid);
    const anchor = parseJournalAnchor({ uid, lifecycleEpoch: 1, revision: 0, headHash: null });
    expect(journalIdentity(anchor, 1)).toBe(journalIdentity({ uid: life.uid, lifecycleEpoch: 1 }, 1));
    expect(typedHash("authority-probe-id-v1", { uid, kind: "evidence-probe", id: "probe" })).toBe(
      typedHash("authority-probe-id-v1", { uid: life.uid, kind: "evidence-probe", id: "probe" }));
    expect(jsonBytes(stored)).toBe(Buffer.byteLength(canonicalJSON(stored), "utf8"));
  });
  it("does not normalize distinct Unicode identities or change generic string byte rules", () => {
    expect(typedHash("authority-probe-id-v1", { uid: "\u00e9" })).not.toBe(typedHash("authority-probe-id-v1", { uid: "e\u0301" }));
    const uid = "\u754c".repeat(50) + "12345678";
    expect(uid.length).toBe(58); expect(Buffer.byteLength(uid)).toBe(158);
    expect(() => text(uid, 128)).toThrow("invalid_text"); // Generic byte limits were NOT broadened.
  });
  it.each(["", "   ", "a".repeat(129), "\u{1f9e0}".repeat(65), ".", "..", "__reserved__", "other/owner",
    "bad-\ud800", "bad-\udfff", null, 1, ["owner"], { uid: "owner" }])("rejects unsupported UID before persistence %#", uid => {
    expect(() => ownerUID(uid)).toThrow();
    expect(() => parseStoredLifecycle(initial(uid))).toThrow();
  });
  it.each([{ schemaVersion: 2 }, { lifecycleEpoch: 0 }, { state: ["active"] }, { writerProtocol: "wrong" },
    { writerIdentity: "browser" }, { namespaceVersion: "wrong" }, { admissionEligibility: "VERIFIED" },
    { rootBinding: "not-a-hash" }, { fence: 0 }, { revision: -1 }, { headHash: head }, { rootCreatedAt: { seconds: 1 } }])(
    "validates every stored lifecycle field before opening initial write transaction %#", patch => {
      expect(() => parseStoredLifecycle({ ...initial(), ...patch })).toThrow();
    });
  it("copies/freezes stored fields without mutating input, invoking accessors or storing fake metadata", () => {
    const input = initial(); const output = parseStoredLifecycle(input); input.uid = "changed";
    expect(output.uid).toBe("previous-valid-owner"); expect(Object.isFrozen(output)).toBe(true); expect(Object.isFrozen(input)).toBe(false);
    let invoked = false;
    Object.defineProperty(input, "uid", { enumerable: true, get() { invoked = true; return "owner"; } });
    expect(() => parseStoredLifecycle(input)).toThrow(); expect(invoked).toBe(false);
  });
});
