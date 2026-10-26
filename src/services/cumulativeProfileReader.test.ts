import { afterEach, expect, it, vi } from "vitest";
import { createCumulativeProfileReader } from "./cumulativeProfileReader";
import { resolveLocalCumulativeProfileConfig } from "./localCumulativeProfileConfig";
import { completedSession, evidenceOwner } from "../quiz/__tests__/learningEvidenceFixtures";
import { savedEvidence, summaryFor } from "../quiz/__tests__/cumulativeProfileViewFixtures";

const uid = evidenceOwner.uid;
afterEach(() => vi.useRealTimers());
function repository() { const evidence = completedSession(); return { summary: vi.fn(async () => summaryFor([evidence]) as unknown),
  evidence: vi.fn(async () => [savedEvidence(evidence)]), legacy: vi.fn(async () => []),
  pending: vi.fn(async () => [{ sessionId: "unsent", acknowledged: false, legacy: false }]) }; }
it("keeps pending local work separate from cumulative totals and exposes storage uncertainty", async () => {
  const r = repository(), read = createCumulativeProfileReader(r, () => {});
  expect((await read(uid)).summary?.sessionCount).toBe(1); expect((await read(uid)).pending).toHaveLength(1);
  r.pending.mockRejectedValue(new Error("IndexedDB blocked"));
  const result = await read(uid); expect(result.browserStorageVerified).toBe(false); expect(result.summary?.sessionCount).toBe(1);
});
it("does not silently truncate history at its current local ceiling", async () => {
  const r = repository(); r.evidence.mockResolvedValue(Array(101).fill(savedEvidence(completedSession())));
  await expect(createCumulativeProfileReader(r, () => {})(uid)).rejects.toThrow("No partial history");
});
it("retries a snapshot changed by simultaneous completion before showing totals", async () => {
  const r = repository(), first = await r.summary(), second = { ...(first as object), revision: 2 };
  r.summary.mockResolvedValue(second).mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  expect((await createCumulativeProfileReader(r, () => {})(uid)).revision).toBe(2); expect(r.evidence).toHaveBeenCalledTimes(2);
});
it("does not return another account's data when ownership changes during reads", async () => {
  const r = repository(); let owner: string = uid;
  r.evidence.mockImplementation(async () => { owner = "other"; return [savedEvidence(completedSession())]; });
  await expect(createCumulativeProfileReader(r, id => { if (id !== owner) throw new Error("Owner changed"); })(uid)).rejects.toThrow("Owner changed");
});
it("propagates permission errors without substituting a legacy profile or zero totals", async () => {
  const r = repository(); r.summary.mockRejectedValue({ code: "permission-denied" });
  await expect(createCumulativeProfileReader(r, () => {})(uid)).rejects.toEqual({ code: "permission-denied" });
});
it("remains disabled by default and in production regardless of flag", () => {
  expect(resolveLocalCumulativeProfileConfig({ DEV: true }, "localhost")).toBeNull();
  expect(resolveLocalCumulativeProfileConfig({ DEV: false, VITE_CUMULATIVE_PROFILE_PHASE2C: "emulator-only" }, "localhost")).toBeNull();
});
it("requires separate explicit local completion isolation and rejects production addresses", () => {
  const env = { DEV: true, VITE_CUMULATIVE_PROFILE_PHASE2C: "emulator-only", VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only", VITE_API_BASE_URL: "http://127.0.0.1:3001" };
  expect(resolveLocalCumulativeProfileConfig(env, "localhost")?.projectId).toBe("demo-edulience-phase2a");
  expect(() => resolveLocalCumulativeProfileConfig({ ...env, VITE_TRAINING_COMPLETION_PHASE2B: "off" }, "localhost")).toThrow();
  expect(() => resolveLocalCumulativeProfileConfig(env, "edulience.space")).toThrow();
});
it("bounds a stalled read and ignores its late result", async () => {
  const r = repository(); let release!: (value: unknown) => void;
  r.summary.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  vi.useFakeTimers(); const pending = createCumulativeProfileReader(r, () => {})(uid);
  const rejected = expect(pending).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20_000); await rejected;
  release(null); await Promise.resolve();
});
