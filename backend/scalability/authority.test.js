import { describe, expect, it } from "vitest";
import { assertAuthorityEnvironment } from "./authority";
import { AUTHORITY_PROTOCOL, AUTHORITY_WRITER, SOURCE_NAMESPACE_VERSION, SOURCE_CATALOG,
  parseLifecycle, parseWriterContext, writerContext, assertWriterContext, probeInput } from "./authorityContracts";
const base = () => ({ schemaVersion: 1, uid: "synthetic-owner", lifecycleEpoch: 1, state: "active", writerProtocol: AUTHORITY_PROTOCOL,
  writerIdentity: AUTHORITY_WRITER, namespaceVersion: SOURCE_NAMESPACE_VERSION, admissionEligibility: "NOT VERIFIED",
  rootBinding: "a".repeat(64), rootCreatedAt: { seconds: 1, nanoseconds: 2 }, fence: 1, revision: 0, headHash: null });
describe("Stage 4A protection does not manufacture bootstrap authority", () => {
  it("requires a separate opt-in and only credential-free loopback demo transports", () => {
    const safe = { NODE_ENV: "test", TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_AUTHORITY_STAGE4A: "emulator-only",
      FIREBASE_PROJECT_ID: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
    expect(() => assertAuthorityEnvironment(safe)).not.toThrow();
    for (const patch of [{ TRAINING_AUTHORITY_STAGE4A: undefined }, { NODE_ENV: "production" }, { FIREBASE_PROJECT_ID: "production" },
      { FIRESTORE_EMULATOR_HOST: "remote.invalid:443" }, { GITHUB_TOKEN: "synthetic-forbidden" }]) expect(() => assertAuthorityEnvironment({ ...safe, ...patch })).toThrow();
  });
  it("copies/freeze contracts, not caller objects, and includes the legacy quiz namespace", () => {
    const input = base(), output = parseLifecycle(input); input.rootCreatedAt.seconds = 99;
    expect(output.rootCreatedAt.seconds).toBe(1); expect(Object.isFrozen(output)).toBe(true); expect(Object.isFrozen(input)).toBe(false);
    expect(SOURCE_CATALOG.quizAttempts).toBe("historical-unclassified-learning");
    expect(() => assertWriterContext(output, writerContext(output))).not.toThrow();
  });
  it.each([{ schemaVersion: 2 }, { uid: "other/owner" }, { state: ["active"] }, { state: "published" },
    { writerProtocol: [AUTHORITY_PROTOCOL] }, { writerIdentity: "browser" }, { namespaceVersion: "unknown" },
    { admissionEligibility: "VERIFIED" }, { lifecycleEpoch: 0 }, { lifecycleEpoch: Number.MAX_SAFE_INTEGER + 1 },
    { rootCreatedAt: { seconds: 1, nanoseconds: 1e9 } }, { fence: 0 }, { revision: -1 }, { rootBinding: "bad" }, { extra: true }])("rejects malformed/forged lifecycle %#", patch => {
    expect(() => parseLifecycle({ ...base(), ...patch })).toThrow();
  });
  it("rejects stale epoch/fence/revision and incompatible writer protocols", () => {
    const life = parseLifecycle(base()), context = writerContext(life);
    for (const patch of [{ lifecycleEpoch: 2 }, { fence: 2 }, { revision: 1 }]) expect(() => assertWriterContext(life, { ...context, ...patch })).toThrow("authority_stale_writer");
    expect(() => parseWriterContext({ ...context, writerProtocol: "journal-v2" })).toThrow("authority_writer_incompatible");
  });
  it("rejects accessors, malformed Unicode, arbitrary source paths and oversized probes", () => {
    let called = false; const value = base(); Object.defineProperty(value, "state", { enumerable: true, get() { called = true; return "active"; } });
    expect(() => parseLifecycle(value)).toThrow(); expect(called).toBe(false);
    expect(() => parseLifecycle({ ...base(), uid: "bad-\ud800" })).toThrow();
    expect(() => probeInput({ id: "../evidence", kind: "evidence-probe", payload: null })).toThrow();
    expect(() => probeInput({ id: "probe", kind: "learningEvidence", payload: null })).toThrow();
    expect(() => probeInput({ id: "probe", kind: "evidence-probe", payload: "界".repeat(20_000) })).toThrow();
    expect(probeInput({ id: "probe", kind: "evidence-probe", payload: { emoji: "🧠" } }).kind).toBe("evidence-probe");
  });
});
