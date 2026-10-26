import { describe, expect, it } from "vitest";
import { initialAdmission, initialControl } from "./acceptanceState";
import { initialAcceptanceCheckpoint } from "./acceptanceBatches";
import { newShadowJob, parseShadowJob, parseReadTime, shadowPin, classifyShadowFailureCode } from "./shadowContracts";
import { assertShadowEnvironment } from "./shadowTransport";

const uid = "offline-shadow-contract-owner", control = initialControl(uid);
const admission = initialAdmission(uid, "2026-10-23T00:00:00.000Z");
const pin = () => shadowPin(control, initialAcceptanceCheckpoint({ uid, lifecycleEpoch: 1 }), admission,
  { seconds: 1_790_000_000, nanoseconds: 123_456_789 });
describe("offline Stage 3A shadow contracts", () => {
  it("is separate opt-in, never a production authority provider", () => {
    expect(() => assertShadowEnvironment({})).toThrow("shadow_worker_disabled");
    const job = newShadowJob(pin(), 0);
    expect(job.state).toBe("working"); expect(job.verification).toBeNull();
    expect(job.checkpoint.phase).toBe("queued"); expect(job.checkpoint.sourceRevision).toBe(0);
  });
  it("copies inputs and strictly scopes pin and checkpoint", () => {
    const value = structuredClone(pin()), job = newShadowJob(value, 0);
    value.source.uid = "other"; expect(job.pin.source.uid).toBe(uid);
    for (const change of [{ uid: "other" }, { lifecycleEpoch: 2 }, { sourceRevision: 1 }])
      expect(() => parseShadowJob({ ...job, checkpoint: { ...job.checkpoint, ...change } })).toThrow();
  });
  it.each([{ seconds: -1, nanoseconds: 0 }, { seconds: 1, nanoseconds: 1_000_000_000 },
    { seconds: 1, nanoseconds: -1 }, { seconds: "1", nanoseconds: 0 }, { seconds: 1, nanoseconds: 0, extra: true }])("rejects invalid read time %#", value => {
    expect(() => parseReadTime(value)).toThrow();
  });
  it.each([{ state: ["ready"] }, { schemaVersion: 2 }, { attempts: -1 }, { error: "Private student reflection text" },
    { retryAt: "ambiguous date" }, { state: "ready" }, { verification: { publicationAuthorized: true } }])("rejects invalid job %#", change => {
    expect(() => parseShadowJob({ ...newShadowJob(pin(), 0), ...change })).toThrow();
  });
  it("rejects accessors, malformed Unicode and invented verification", () => {
    let accessed = false;
    const job = structuredClone(newShadowJob(pin(), 0));
    Object.defineProperty(job, "state", { enumerable: true, get() { accessed = true; return "ready"; } });
    expect(() => parseShadowJob(job)).toThrow(); expect(accessed).toBe(false);
    expect(() => newShadowJob({ ...pin(), source: { ...pin().source, uid: "bad-\ud800" } }, 0)).toThrow("invalid_unicode");
    expect(() => parseShadowJob({ ...newShadowJob(pin(), 0), state: "ready", verification: {
      status: "trusted-source-shadow-verified", asOf: pin().readTime, inventoryDigest: "a".repeat(64), manifestHash: "b".repeat(64),
      nativeAcceptedCount: 0, publicationAuthorized: true, stage1Authority: "VERIFIED" } })).toThrow();
    const original = newShadowJob(pin(), 0);
    expect(() => parseShadowJob({ ...original, checkpoint: { ...original.checkpoint,
      cursor: { stage: "journal", afterKey: "0000000000000001", processedCount: 1 } } })).toThrow("shadow_cursor_invalid");
  });
  it("requires an explicit unverified, unleased, delayed reschedule envelope", () => {
    const job = { ...newShadowJob(pin(), 0), state: "reschedule", error: "shadow_head_changed_retry",
      retryAt: "2026-10-23T00:00:04.000Z" };
    expect(parseShadowJob(job).attempts).toBe(0);
    for (const change of [{ retryAt: null }, { error: "shadow_source_changed" }, { verification: {} },
      { checkpoint: { ...job.checkpoint, phase: "failed" } }])
      expect(() => parseShadowJob({ ...job, ...change })).toThrow();
  });
  it("does not trust a head-change error string as authority or conflate fencing with RPC failure", () => {
    expect(classifyShadowFailureCode("shadow_head_changed_retry")).toBe("integrity");
    expect(classifyShadowFailureCode("stale_worker_fence")).toBe("fenced");
    for (const code of [4, 8, 10, 13, 14, "14"]) expect(classifyShadowFailureCode(code)).toBe("transient");
    for (const code of [undefined, null, [14], "shadow_source_changed", "shadow_checkpoint_mismatch"])
      expect(classifyShadowFailureCode(code)).toBe("integrity");
  });
});
