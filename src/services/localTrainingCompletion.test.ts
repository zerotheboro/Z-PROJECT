// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { completionDraftFixture } from "../../test-support/completionDraftFixture";
import { validateCompletion, digest } from "../../backend/trainingCompletionContract";

const mocks = vi.hoisted(() => ({
  project: "demo-runtime",
  user: null as { uid: string; getIdToken: () => Promise<string> } | null,
  reservation: vi.fn(), activity: vi.fn(), discard: vi.fn(), fetch: vi.fn(), legacy: vi.fn()
}));
vi.mock("../firebase", () => ({ auth: { get currentUser() { return mocks.user; }, app: { options: { get projectId() { return mocks.project; } } } },
  db: { app: { options: { get projectId() { return mocks.project; } } } } }));
vi.mock("firebase/firestore", () => ({ doc: (...parts: unknown[]) => parts.slice(1).join("/"), getDocFromServer: mocks.reservation }));
vi.mock("./trainingStreak", () => ({ recordTrainingCompletion: mocks.activity }));
vi.mock("./trainingProgress", () => ({ discardTrainingDraft: mocks.discard }));
vi.mock("./assessment", () => ({ saveAssessment: mocks.legacy }));
import { getLocalTrainingCompletionClient } from "./localTrainingCompletion";

beforeEach(() => {
  mocks.project = "demo-runtime";
  vi.stubEnv("DEV", true); vi.stubEnv("VITE_TRAINING_COMPLETION_PHASE2B", "emulator-only");
  vi.stubEnv("VITE_TRAINING_COMPLETION_PROJECT_ID", "demo-runtime"); vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:3001");
  vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", mocks.fetch);
  mocks.user = { uid: "local-student", getIdToken: vi.fn(async () => "synthetic-emulator-token") };
  for (const mock of [mocks.reservation, mocks.activity, mocks.discard, mocks.fetch, mocks.legacy]) mock.mockReset();
  mocks.reservation.mockResolvedValue({ exists: () => true, data: () => ({ sessionId: "local-completion-session", mode: "auto", methodIds: [] }) });
  mocks.activity.mockResolvedValue(undefined); mocks.discard.mockResolvedValue(undefined);
  mocks.legacy.mockResolvedValue("local-completion-session");
  mocks.fetch.mockImplementation(async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(String(init.body)); const validated = validateCompletion("local-student", payload, new Date().toISOString());
    return new Response(JSON.stringify({ schemaVersion: 1, status: "completed", sessionId: payload.sessionId, mode: payload.mode,
      evidenceId: `session-${digest(payload.sessionId)}`, requestHash: validated.requestHash, profileRevision: 1,
      recordedAt: new Date().toISOString(), legacyAssessmentId: payload.sessionId, legacyProfileUpdated: true }), { status: 200 });
  });
});
it("Stage 4E uses the isolated V2 endpoint and pins its receipt/outbox protocol", async () => {
  mocks.project = "demo-edulience-phase2a";
  vi.stubEnv("VITE_TRAINING_COMPLETION_PROJECT_ID", mocks.project); vi.stubEnv("VITE_TRAINING_PROTECTED_STAGE4E", "emulator-only");
  mocks.fetch.mockImplementation(async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(String(init.body)), valid = validateCompletion("local-student", payload, new Date().toISOString());
    return new Response(JSON.stringify({ schemaVersion: 2, status: "accepted", sessionId: payload.sessionId, mode: payload.mode,
      evidenceId: `session-${digest(payload.sessionId)}`, requestHash: valid.requestHash, lifecycleEpoch: 1, acceptedRevision: 1,
      recordedAt: new Date().toISOString(), legacyAssessmentId: payload.sessionId, legacyProfileUpdated: true }), { status: 200 });
  });
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture();
  const entry = await client.prepare(draft), receipt = await client.resume("local-student", draft.sessionId);
  expect(entry!.target).toBe("protected-v2"); expect(receipt.status).toBe("accepted"); expect(receipt).not.toHaveProperty("profileRevision");
  expect(mocks.fetch.mock.calls[0][0]).toBe("http://127.0.0.1:3001/api/development/training/complete-protected-v2");
  expect(mocks.legacy).not.toHaveBeenCalled();
});
it("a protected root cannot use grandfathered legacy saving even with the Stage 4E flag off", async () => {
  mocks.reservation.mockResolvedValueOnce({ exists: () => false })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ trainingLifecycleBinding: "synthetic-binding" }) });
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture(); await client.prepare(draft);
  await expect(client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code: "protected_legacy_forbidden" });
  expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("uses only the loopback endpoint and current user's bearer token, then pins activity day/timezone", async () => {
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture();
  const entry = await client.prepare(draft); await client.resume("local-student", draft.sessionId);
  expect(mocks.fetch).toHaveBeenCalledWith("http://127.0.0.1:3001/api/training/complete", expect.objectContaining({
    body: entry!.payloadJSON, redirect: "error", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic-emulator-token" }
  }));
  expect(mocks.activity).toHaveBeenCalledWith(expect.objectContaining({ sessionId: draft.sessionId, mode: "auto" }),
    { now: new Date(entry!.frozenAt), timeZone: entry!.timeZone });
  expect(mocks.discard).toHaveBeenCalledWith({ kind: "user", uid: "local-student" }, draft.sessionId);
});
it("does not use cached missing reservations as a grandfathering signal", async () => {
  mocks.reservation.mockRejectedValue(new Error("Server unavailable"));
  const client = getLocalTrainingCompletionClient()!; await client.prepare(completionDraftFixture());
  await expect(client.resume("local-student", "local-completion-session")).rejects.toThrow("Server unavailable");
  expect((await client.get("local-student", "local-completion-session"))!.draftJSON).toBeTruthy();
  expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled();
});
it("durably checkpoints before checking an authoritative missing reservation", async () => {
  mocks.reservation.mockResolvedValue({ exists: () => false });
  const client = getLocalTrainingCompletionClient()!;
  expect(await client.prepare(completionDraftFixture())).not.toBeNull();
  expect(mocks.reservation).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it.each(["auto", "manual"] as const)("recovers a grandfathered %s session through its existing legacy flow exactly once", async mode => {
  mocks.reservation.mockResolvedValueOnce({ exists: () => false })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: "Synthetic legacy student" }) })
    .mockResolvedValueOnce({ exists: () => false });
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture(mode, mode === "auto" ? 4 : 1);
  await client.prepare(draft);
  expect(await client.resume("local-student", draft.sessionId)).toMatchObject({ status: "legacy-completed", sessionId: draft.sessionId });
  await client.resume("local-student", draft.sessionId);
  expect(mocks.legacy).toHaveBeenCalledTimes(mode === "auto" ? 1 : 0);
  if (mode === "auto") expect(mocks.legacy).toHaveBeenCalledWith(expect.objectContaining({ userId: "local-student", sessionId: draft.sessionId,
    learningProfile: draft.completed.learningProfile, reflection: draft.completed.reflection }));
  expect(mocks.activity).toHaveBeenCalledOnce(); expect(mocks.discard).toHaveBeenCalledOnce();
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect((await client.get("local-student", draft.sessionId))!.finalized).toBe(true);
});
it("a retained protected fence prevents legacy saving after the root has been deleted", async () => {
  mocks.reservation.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => false })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ persistenceVersion: 3 }) });
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture(); await client.prepare(draft);
  await expect(client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code: "protected_legacy_forbidden" });
  expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled();
});
it("stops before fetch when auth changes during token retrieval", async () => {
  let release!: (token: string) => void;
  mocks.user!.getIdToken = () => new Promise(resolve => { release = resolve; });
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture(); await client.prepare(draft);
  const saving = client.resume("local-student", draft.sessionId);
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  mocks.user = { uid: "other-student", getIdToken: async () => "different-synthetic-token" }; release("old-synthetic-token");
  await expect(saving).rejects.toMatchObject({ code: "completion_owner_changed" }); expect(mocks.fetch).not.toHaveBeenCalled();
});
it.each([[401, "authentication_required"], [409, "completion_conflict"], [409, "completion_capacity_exceeded"]] as const)("retains work and exposes %i / %s safely", async (status, code) => {
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ code }), { status }));
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture(); await client.prepare(draft);
  await expect(client.resume("local-student", draft.sessionId)).rejects.toMatchObject({ code });
  expect(await client.list("local-student")).toHaveLength(1); expect(mocks.discard).not.toHaveBeenCalled();
});
it("is disabled with a production bundle even if a local flag is present", () => {
  vi.stubEnv("DEV", false); expect(getLocalTrainingCompletionClient()).toBeNull();
});
it("bounds token retrieval and ignores its late promise without sending a request", async () => {
  let release!: (token: string) => void;
  mocks.user!.getIdToken = vi.fn(() => new Promise<string>(resolve => { release = resolve; }));
  const client = getLocalTrainingCompletionClient()!, draft = completionDraftFixture(); await client.prepare(draft);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const saving = client.resume("local-student", draft.sessionId);
  const rejected = expect(saving).rejects.toMatchObject({ code: "completion_timeout" });
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  await vi.advanceTimersByTimeAsync(20_000); await rejected;
  release("late-synthetic-token"); await Promise.resolve();
  expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled();
});
