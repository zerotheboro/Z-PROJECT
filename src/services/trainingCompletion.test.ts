import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateCompletion, digest } from "../../backend/trainingCompletionContract";
import type { CompletionReceipt } from "../../backend/trainingCompletion";
import { completionDraftFixture } from "../../test-support/completionDraftFixture";
import { completionFromDraft, createTrainingCompletionClient } from "./trainingCompletion";
import { createCompletionOutbox, completionPayloadJSON, CompletionOutboxError } from "./trainingCompletionOutbox";
import { resolveLocalCompletionConfig } from "./localTrainingCompletionConfig";
import type { CompletionEntry } from "./trainingCompletionOutbox";
import type { CompletionRequest } from "../../backend/trainingCompletionContract";

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(cleanup.splice(0).map(close => close())); vi.restoreAllMocks(); });
function setup() {
  const factory = new IDBFactory();
  const open = () => { const box = createCompletionOutbox("demo-completion-tests", factory); cleanup.push(box.close); return box; };
  const outbox = open(); let owner = "local-student";
  const receipts = new Map<string, CompletionReceipt>();
  const transport = vi.fn(async (uid: string, json: string): Promise<CompletionReceipt> => {
    const payload = JSON.parse(json);
    const value = validateCompletion(uid, payload, "2026-10-21T12:00:00Z");
    const previous = receipts.get(payload.sessionId);
    if (previous) { if (previous.requestHash !== value.requestHash) throw new CompletionOutboxError("completion_conflict", "Conflict; saved work retained."); return previous; }
    const receipt: CompletionReceipt = { schemaVersion: 1, status: "completed", sessionId: payload.sessionId, mode: payload.mode,
      evidenceId: `session-${digest(payload.sessionId)}`, requestHash: value.requestHash, profileRevision: receipts.size + 1,
      recordedAt: "2026-10-21T12:00:00.000Z", legacyAssessmentId: payload.mode === "auto" ? payload.sessionId : null, legacyProfileUpdated: payload.mode === "auto" };
    receipts.set(payload.sessionId, receipt); return receipt;
  });
  const deps = { outbox, assertOwner: (uid: string) => { if (owner !== uid) throw new CompletionOutboxError("completion_owner_changed", "Owner changed"); },
    hasReservation: vi.fn(async () => true), transport, recordActivity: vi.fn(async (_entry: CompletionEntry, _payload: CompletionRequest) => {}),
    clearDraft: vi.fn(async (_uid: string, _sessionId: string) => {}), timeZone: () => "Asia/Bangkok" };
  return { outbox, open, deps, receipts, client: createTrainingCompletionClient(deps), switchOwner: (uid: string) => { owner = uid; } };
}

describe("local-only completion activation", () => {
  it("is disabled by default and unconditionally disabled in production builds", () => {
    expect(resolveLocalCompletionConfig({ DEV: true }, "localhost")).toBeNull();
    expect(resolveLocalCompletionConfig({ DEV: false, VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only" }, "localhost")).toBeNull();
  });
  it.each([
    { hostname: "edulience.space", api: "http://127.0.0.1:3001", project: "demo-local" },
    { hostname: "localhost", api: "https://production.invalid", project: "demo-local" },
    { hostname: "localhost", api: "http://127.0.0.1:3001", project: "real-project" },
    { hostname: "localhost", api: "http://user:password@127.0.0.1:3001", project: "demo-local" }
  ])("rejects unsafe local configuration", value => {
    expect(() => resolveLocalCompletionConfig({ DEV: true, VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only",
      VITE_API_BASE_URL: value.api, VITE_TRAINING_COMPLETION_PROJECT_ID: value.project }, value.hostname)).toThrow();
  });
});

describe("durable owner-scoped completion outbox", () => {
  it.each([["auto", 3], ["auto", 4], ["manual", 1], ["manual", 2], ["manual", 3]] as const)("completes %s/%i through the real Phase 2A contract", async (mode, count) => {
    const h = setup(), draft = completionDraftFixture(mode, count);
    const before = JSON.stringify(draft);
    const entry = await h.client.prepare(draft); expect(entry).not.toBeNull();
    expect(JSON.stringify(draft)).toBe(before);
    const receipt = await h.client.resume("local-student", draft.sessionId);
    expect(receipt.mode).toBe(mode); expect(h.receipts.size).toBe(1);
    expect(h.deps.recordActivity).toHaveBeenCalledOnce(); expect(h.deps.clearDraft).toHaveBeenCalledOnce();
    expect((await h.outbox.get("local-student", draft.sessionId))?.finalized).toBe(true);
  });
  it("freezes the first payload, survives a fresh IDB connection, and never mutates caller data", async () => {
    const h = setup(), draft = completionDraftFixture(); const entry = await h.client.prepare(draft);
    draft.completed.reflection!.reflectionText = "Changed in another tab";
    await expect(h.client.prepare(draft)).rejects.toMatchObject({ code: "outbox_conflict" });
    expect((await h.open().get("local-student", draft.sessionId))?.payloadJSON).toBe(entry!.payloadJSON);
    expect(h.deps.transport).not.toHaveBeenCalled();
  });
  it("retains a genuinely observed completion time across retries, but never invents historical timing", async () => {
    const h = setup(), draft = completionDraftFixture();
    const first = await h.client.prepare(draft, "2026-10-20T17:00:00+07:00");
    const next = await h.client.prepare(draft, "2026-10-21T10:00:00.000Z");
    expect(next!.payloadJSON).toBe(first!.payloadJSON);
    expect(JSON.parse(next!.payloadJSON).completedAt).toBe("2026-10-20T10:00:00.000Z");
    expect(completionFromDraft(draft).completedAt).toBeNull();
  });
  it("captures and commits the caller's completed results before an asynchronous reservation lookup", async () => {
    const h = setup(), draft = completionDraftFixture(); let release!: (allowed: boolean) => void;
    h.deps.hasReservation.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const entry = await h.client.prepare(draft);
    expect(h.deps.hasReservation).not.toHaveBeenCalled();
    const pending = h.client.resume("local-student", draft.sessionId);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    draft.completed.reflection!.reflectionText = "Mutated after completion was requested";
    expect((await h.open().get("local-student", draft.sessionId))!.payloadJSON).toBe(entry!.payloadJSON);
    release(true); await pending;
    expect(JSON.parse(entry!.payloadJSON).reflection.reflectionText).toBe("Synthetic offline reflection");
  });
  it("atomically resolves conflicting simultaneous tab freezes without replacing either original record", async () => {
    const h = setup(), a = completionFromDraft(completionDraftFixture()), b = structuredClone(a); b.reflection.reflectionText = "Other results";
    const results = await Promise.allSettled([h.outbox.freeze("local-student", a, "UTC"), h.open().freeze("local-student", b, "UTC")]);
    expect(results.filter(item => item.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(item => item.status === "rejected")).toHaveLength(1);
  });
  it("recovers a lost successful response after refresh using byte-identical JSON and no new reservation", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    const real = h.deps.transport.getMockImplementation()!;
    h.deps.transport.mockImplementationOnce(async (uid, body) => { await real(uid, body); throw new Error("Response lost after commit"); });
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toThrow("Response lost");
    expect(h.deps.clearDraft).not.toHaveBeenCalled();
    const recovered = createTrainingCompletionClient({ ...h.deps, outbox: h.open() });
    await recovered.resume("local-student", draft.sessionId);
    expect(h.deps.transport.mock.calls[0][1]).toBe(h.deps.transport.mock.calls[1][1]);
    expect(h.receipts.size).toBe(1); expect(h.deps.hasReservation).toHaveBeenCalledOnce();
  });
  it("blocks a second tab while a submission is in flight", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
    const real = h.deps.transport.getMockImplementation()!;
    h.deps.transport.mockImplementation(async (uid, body) => { await wait; return real(uid, body); });
    const first = h.client.resume("local-student", draft.sessionId);
    await vi.waitFor(() => expect(h.deps.transport).toHaveBeenCalledOnce());
    await expect(createTrainingCompletionClient({ ...h.deps, outbox: h.open() }).resume("local-student", draft.sessionId)).rejects.toMatchObject({ code: "completion_busy" });
    release(); await first; expect(h.receipts.size).toBe(1);
  });
  it("expires a crashed tab lease while preventing its stale acknowledgments", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    await h.outbox.claim("local-student", draft.sessionId, "crashed", 0);
    await h.open().claim("local-student", draft.sessionId, "recovered", 60001);
    await expect(h.outbox.update("local-student", draft.sessionId, "crashed", { finalized: true })).rejects.toMatchObject({ code: "completion_busy" });
  });
  it("retains acknowledged evidence when activity fails, without resending completion", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    h.deps.recordActivity.mockRejectedValueOnce(new Error("Activity offline"));
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toThrow("Activity offline");
    expect((await h.outbox.get("local-student", draft.sessionId))?.receipt).not.toBeNull();
    expect(h.deps.clearDraft).not.toHaveBeenCalled();
    await h.client.resume("local-student", draft.sessionId); expect(h.deps.transport).toHaveBeenCalledOnce();
    const calls = h.deps.recordActivity.mock.calls;
    expect(calls[0][0].frozenAt).toBe(calls[1][0].frozenAt); expect(calls[0][0].timeZone).toBe("Asia/Bangkok");
  });
  it("retains acknowledgment and activity checkpoint after draft deletion failure", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    h.deps.clearDraft.mockRejectedValueOnce(new Error("Draft deletion offline"));
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toThrow("Draft deletion offline");
    await h.client.resume("local-student", draft.sessionId);
    expect(h.deps.transport).toHaveBeenCalledOnce(); expect(h.deps.recordActivity).toHaveBeenCalledOnce();
  });
  it("preserves pending evidence when local receipt persistence fails after server commit", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    const original = h.outbox.update; let first = true;
    h.outbox.update = (...args) => { if (first) { first = false; return Promise.reject(new Error("Storage full")); } return original(...args); };
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toThrow("Storage full");
    expect(h.deps.recordActivity).not.toHaveBeenCalled(); expect(h.deps.clearDraft).not.toHaveBeenCalled();
    await h.client.resume("local-student", draft.sessionId); expect(h.receipts.size).toBe(1);
  });
  it("never submits when durable storage is unavailable", async () => {
    const h = setup(), draft = completionDraftFixture();
    // Explicit factory whose open fails, independent of a browser's global IDB.
    const broken = { open: () => { throw new Error("Storage disabled"); } } as unknown as IDBFactory;
    await expect(createTrainingCompletionClient({ ...h.deps, outbox: createCompletionOutbox("demo-disabled", broken) }).prepare(draft)).rejects.toThrow();
    expect(h.deps.transport).not.toHaveBeenCalled(); expect(h.deps.clearDraft).not.toHaveBeenCalled();
  });

  it("can retry opening IndexedDB after storage permissions or capacity recover", async () => {
    const h = setup(), real = new IDBFactory(); let blocked = true;
    const factory = { open: (...args: Parameters<IDBFactory["open"]>) => {
      if (blocked) throw new Error("Storage disabled"); return real.open(...args);
    } } as IDBFactory;
    const box = createCompletionOutbox("demo-storage-retry", factory); cleanup.push(box.close);
    const client = createTrainingCompletionClient({ ...h.deps, outbox: box });
    await expect(client.prepare(completionDraftFixture())).rejects.toMatchObject({ code: "outbox_storage_failed" });
    expect(h.deps.hasReservation).not.toHaveBeenCalled(); blocked = false;
    expect(await client.prepare(completionDraftFixture())).not.toBeNull();
    await client.resume("local-student", "local-completion-session");
    expect(h.receipts.size).toBe(1);
  });
  it("does not mix accounts and stops after logout even if the response arrives late", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    const real = h.deps.transport.getMockImplementation()!;
    h.deps.transport.mockImplementation(async (uid, body) => { const receipt = await real(uid, body); h.switchOwner("another-student"); return receipt; });
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code: "completion_owner_changed" });
    expect(h.deps.recordActivity).not.toHaveBeenCalled(); expect(h.deps.clearDraft).not.toHaveBeenCalled();
    expect(await h.outbox.list("another-student")).toEqual([]);
    await expect(h.client.list("local-student")).rejects.toMatchObject({ code: "completion_owner_changed" });
    h.switchOwner("local-student"); h.deps.transport.mockImplementation(real);
    await h.client.resume("local-student", draft.sessionId); expect(h.receipts.size).toBe(1);
  });
  it.each(["unauthorized", "completion_conflict", "completion_capacity_exceeded", "completion_fingerprint_upgrade_required"])("retains work on %s without legacy fallback", async code => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    h.deps.transport.mockRejectedValue(new CompletionOutboxError(code, "Saved work retained"));
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code });
    expect(await h.outbox.list("local-student")).toHaveLength(1);
    expect(h.deps.recordActivity).not.toHaveBeenCalled(); expect(h.deps.clearDraft).not.toHaveBeenCalled();
  });
  it("checkpoints grandfathered drafts before selecting legacy without reserving retroactively; guests have no server outbox", async () => {
    const h = setup(), draft = completionDraftFixture(); h.deps.hasReservation.mockResolvedValue(false);
    expect(await h.client.prepare(draft)).not.toBeNull();
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code: "legacy_completion_required" });
    expect((await h.outbox.get("local-student", draft.sessionId))!.reservationStatus).toBe("legacy");
    draft.owner = { kind: "guest" }; expect(await h.client.prepare(draft)).toBeNull();
    expect(h.deps.transport).not.toHaveBeenCalled();
  });

  it("recovers old v1 outbox records without rechecking or changing their verified reservation", async () => {
    const h = setup(), draft = completionDraftFixture();
    await h.outbox.freeze("local-student", completionFromDraft(draft), "UTC");
    h.deps.hasReservation.mockRejectedValue(new Error("A legacy outbox must not depend on reservation lookup"));
    await h.client.resume("local-student", draft.sessionId);
    expect(h.deps.hasReservation).not.toHaveBeenCalled(); expect(h.receipts.size).toBe(1);
  });
  it("rejects a mismatched receipt instead of clearing the draft", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    const real = h.deps.transport.getMockImplementation()!;
    h.deps.transport.mockImplementation(async (uid, body) => ({ ...await real(uid, body), requestHash: "0".repeat(64) }));
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code: "invalid_completion_receipt" });
    expect(h.deps.clearDraft).not.toHaveBeenCalled();
  });
  it("prevents a tab from replacing an original persisted receipt", async () => {
    const h = setup(), draft = completionDraftFixture(); await h.client.prepare(draft);
    h.deps.recordActivity.mockRejectedValueOnce(new Error("Activity offline"));
    await expect(h.client.resume("local-student", draft.sessionId)).rejects.toThrow("Activity offline");
    const original = (await h.outbox.get("local-student", draft.sessionId))!;
    await h.outbox.claim("local-student", draft.sessionId, "corrupt-fixture");
    await expect(h.outbox.update("local-student", draft.sessionId, "corrupt-fixture", { receipt: { ...original.receipt!, requestHash: "0".repeat(64) } })).rejects.toMatchObject({ code: "outbox_conflict" });
    await h.outbox.release("local-student", draft.sessionId, "corrupt-fixture");
    expect(h.deps.clearDraft).not.toHaveBeenCalled();
    await h.client.resume("local-student", draft.sessionId);
    expect(h.deps.transport).toHaveBeenCalledOnce();
  });
  it("bounds the exact escaped UTF-8 wire payload before any submission", () => {
    const payload = completionFromDraft(completionDraftFixture()); payload.reflection.reflectionText = "\ud83e\udde0\n\"".repeat(14000);
    expect(() => completionPayloadJSON(payload)).toThrow("submission limit");
  });
});
