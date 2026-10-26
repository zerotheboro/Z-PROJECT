import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { completionDraftFixture } from "../../test-support/completionDraftFixture";
import { digest, validateCompletion } from "../../backend/trainingCompletionContract";
import { createTrainingCompletionClient } from "./trainingCompletion";
import { createCompletionOutbox } from "./trainingCompletionOutbox";
import { validateClientCompletionReceipt } from "./trainingCompletionReceipt";
import { resolveLocalCompletionConfig } from "./localTrainingCompletionConfig";

const close: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(close.splice(0).map(fn => fn())); vi.unstubAllGlobals(); });
function setup() {
  vi.stubGlobal("crypto", webcrypto);
  const factory = new IDBFactory();
  const open = () => { const box = createCompletionOutbox("demo-v2-recovery", factory); close.push(box.close); return box; };
  const outbox = open(); let owner = "local-student";
  const draft = completionDraftFixture();
  const receipts = new Map();
  const transport = vi.fn(async (uid: string, body: string) => {
    const input = JSON.parse(body), valid = validateCompletion(uid, input, "2026-10-25T09:00:00Z");
    const original = receipts.get(input.sessionId); if (original) return original;
    const receipt = { schemaVersion: 2 as const, status: "accepted" as const, sessionId: input.sessionId, mode: input.mode,
      evidenceId: `session-${digest(input.sessionId)}`, requestHash: valid.requestHash, lifecycleEpoch: 1, acceptedRevision: 1,
      recordedAt: "2026-10-25T09:00:00.000Z", legacyAssessmentId: input.sessionId, legacyProfileUpdated: true };
    receipts.set(input.sessionId, receipt); return receipt;
  });
  const deps = { outbox, target: "protected-v2" as const, assertOwner: (uid: string) => { if (uid !== owner) throw new Error("owner changed"); },
    hasReservation: vi.fn(async () => true), transport, completeLegacy: vi.fn(async () => {}), recordActivity: vi.fn(async () => {}),
    clearDraft: vi.fn(async () => {}), timeZone: () => "UTC" };
  return { outbox, open, draft, deps, transport, receipts, client: createTrainingCompletionClient(deps), switchOwner: (uid: string) => { owner = uid; } };
}
it("keeps v2 accepted receipts distinct and recovers the original receipt after a lost response/refresh", async () => {
  const h = setup(), stored = await h.client.prepare(h.draft, "2026-10-25T08:00:00Z"), real = h.transport.getMockImplementation()!;
  h.transport.mockImplementationOnce(async (...args) => { await real(...args); throw new Error("lost response"); });
  await expect(h.client.resume("local-student", h.draft.sessionId)).rejects.toThrow("lost response");
  const refreshed = createTrainingCompletionClient({ ...h.deps, outbox: h.open() });
  const receipt = await refreshed.resume("local-student", h.draft.sessionId);
  expect(receipt).toMatchObject({ schemaVersion: 2, status: "accepted", acceptedRevision: 1 });
  expect(receipt).not.toHaveProperty("profileRevision"); expect(h.transport.mock.calls[1][1]).toBe(stored!.payloadJSON);
  expect(h.receipts.size).toBe(1); expect(h.deps.completeLegacy).not.toHaveBeenCalled(); expect(h.deps.hasReservation).toHaveBeenCalledOnce();
});
it("retains completed evidence with no legacy fallback when the reservation is absent", async () => {
  const h = setup(); h.deps.hasReservation.mockResolvedValue(false); await h.client.prepare(h.draft);
  await expect(h.client.resume("local-student", h.draft.sessionId)).rejects.toMatchObject({ code: "protected_reservation_required" });
  expect(h.deps.completeLegacy).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled(); expect(h.deps.clearDraft).not.toHaveBeenCalled();
  expect((await h.outbox.get("local-student", h.draft.sessionId))!.reservationStatus).toBe("pending");
});
it("cannot reroute a frozen v2 entry through a v1 client after flags change", async () => {
  const h = setup(); await h.client.prepare(h.draft);
  await expect(createTrainingCompletionClient({ ...h.deps, target: "v1" }).resume("local-student", h.draft.sessionId))
    .rejects.toMatchObject({ code: "completion_target_changed" });
  expect(h.deps.completeLegacy).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
});
it("rechecks the backend for cached v2 acknowledgment and preserves it if authority is revoked", async () => {
  const h = setup(); await h.client.prepare(h.draft); h.deps.recordActivity.mockRejectedValueOnce(new Error("activity offline"));
  await expect(h.client.resume("local-student", h.draft.sessionId)).rejects.toThrow("activity offline");
  const original = (await h.outbox.get("local-student", h.draft.sessionId))!.receipt;
  h.transport.mockRejectedValueOnce(new Error("authority revoked"));
  await expect(h.client.resume("local-student", h.draft.sessionId)).rejects.toThrow("authority revoked");
  expect((await h.outbox.get("local-student", h.draft.sessionId))!.receipt).toEqual(original); expect(h.deps.clearDraft).not.toHaveBeenCalled();
});
it("account switching fences late v2 responses and keeps evidence scoped to the original UID", async () => {
  const h = setup(), real = h.transport.getMockImplementation()!; await h.client.prepare(h.draft);
  h.transport.mockImplementationOnce(async (...args) => { const receipt = await real(...args); h.switchOwner("another-student"); return receipt; });
  await expect(h.client.resume("local-student", h.draft.sessionId)).rejects.toThrow("owner changed");
  expect(await h.outbox.list("another-student")).toEqual([]); expect(h.deps.clearDraft).not.toHaveBeenCalled();
  h.switchOwner("local-student"); await h.client.resume("local-student", h.draft.sessionId); expect(h.receipts.size).toBe(1);
});
it("failed V2 browser persistence cannot start eligibility, HTTP, cleanup or legacy writes", async () => {
  const h = setup(), before = structuredClone(h.draft);
  h.deps.outbox.freeze = async () => { throw new Error("browser storage full"); };
  await expect(h.client.prepare(h.draft)).rejects.toThrow("browser storage full");
  expect(h.deps.hasReservation).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  expect(h.deps.completeLegacy).not.toHaveBeenCalled(); expect(h.deps.clearDraft).not.toHaveBeenCalled(); expect(h.draft).toEqual(before);
});
it.each(["schemaVersion", "status", "profileRevision", "acceptedRevision", "lifecycleEpoch", "requestHash", "legacyAssessmentId"])("rejects incompatible/altered v2 receipt %s", async key => {
  const h = setup(); await h.client.prepare(h.draft); const body = (await h.outbox.get("local-student", h.draft.sessionId))!.payloadJSON;
  const receipt = await h.transport("local-student", body), expected = { sessionId: receipt.sessionId, mode: receipt.mode, evidenceId: receipt.evidenceId, requestHash: receipt.requestHash };
  const changed = { ...receipt, [key]: key === "status" ? "completed" : key === "schemaVersion" ? 1 : key === "requestHash" ? "f".repeat(64) : 0 };
  expect(() => validateClientCompletionReceipt(changed, expected, "protected-v2")).toThrow();
});
it("rejects receipt accessors without executing them", () => {
  let calls = 0; const receipt = { get schemaVersion() { calls++; return 2; } };
  expect(() => validateClientCompletionReceipt(receipt, { sessionId: "x", mode: "auto", evidenceId: "x", requestHash: "x" }, "protected-v2")).toThrow();
  expect(calls).toBe(0);
});
it("the v2 opt-in is still unconditionally disabled in production and rejects a different demo project", () => {
  const env = { DEV: false, VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only", VITE_TRAINING_PROTECTED_STAGE4E: "emulator-only",
    VITE_TRAINING_COMPLETION_PROJECT_ID: "demo-edulience-phase2a", VITE_API_BASE_URL: "http://127.0.0.1:18084" };
  expect(resolveLocalCompletionConfig(env, "localhost")).toBeNull();
  expect(resolveLocalCompletionConfig({ ...env, DEV: true }, "localhost")!.target).toBe("protected-v2");
  expect(() => resolveLocalCompletionConfig({ ...env, DEV: true, VITE_TRAINING_COMPLETION_PROJECT_ID: "demo-other" }, "localhost")).toThrow();
});
