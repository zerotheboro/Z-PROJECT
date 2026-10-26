// @vitest-environment jsdom
import React from "react";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { validateCompletion, digest } from "../../../backend/trainingCompletionContract";
import { createCompletionOutbox } from "../../services/trainingCompletionOutbox";
import { createTrainingCompletionClient } from "../../services/trainingCompletion";
import type { TrainingCompletionClient } from "../../services/trainingCompletion";
import type { ClientCompletionReceipt } from "../../services/trainingCompletionReceipt";
import { completionDraftFixture } from "../../../test-support/completionDraftFixture";
import type { ReflectionResult } from "../type";

const mocks = vi.hoisted(() => ({
  enabled: true, uid: "local-student", client: null as TrainingCompletionClient | null,
  load: vi.fn(), save: vi.fn(), discard: vi.fn(), legacy: vi.fn(), streak: vi.fn(), reserve: vi.fn()
}));
vi.mock("../../HEADER/header", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("../../firebase", () => ({ auth: { currentUser: null } }));
vi.mock("../../services/localTrainingCompletionConfig", () => ({ localCompletionConfig: () => mocks.enabled ? { projectId: "demo-phase2b" } : null }));
vi.mock("../../services/localTrainingCompletion", () => ({ getLocalTrainingCompletionClient: () => mocks.enabled ? mocks.client : null }));
vi.mock("../../services/auth", () => ({ subscribeToAuth: (fn: (user: { uid: string } | null) => void) => { fn(mocks.uid ? { uid: mocks.uid } : null); return () => {}; } }));
vi.mock("../../services/trainingProgress", () => ({ TrainingDraftConflictError: class extends Error {},
  loadTrainingDraft: mocks.load, saveTrainingDraft: mocks.save, discardTrainingDraft: mocks.discard,
  forceDiscardTrainingDraft: vi.fn(), writeLocalTrainingDraft: vi.fn() }));
vi.mock("../../services/assessment", () => ({ saveAssessment: mocks.legacy }));
vi.mock("../../services/trainingStreak", () => ({ recordTrainingCompletion: mocks.streak }));
vi.mock("../../services/trainingAccess", () => ({ reserveTrainingAccess: mocks.reserve }));
vi.mock("../../services/aiRecommendationPersistence", () => ({ loadAIRecommendation: vi.fn() }));
vi.mock("../sections/Reflection", () => ({ default: ({ onComplete }: { onComplete: (result: ReflectionResult) => void }) =>
  <button onClick={() => onComplete({ preferredMethod: null, priority: "performance", surprisedByResults: false, reflectionText: "Synthetic offline reflection" })}>Complete reflection</button> }));
import Assessment from "../Assessment";
import TrainingCompletionRecovery from "../../components/TrainingCompletionRecovery";

let close: () => Promise<void>;
let identityGeneration = 0;
function setup(mode: "auto" | "manual" = "auto", count = 3, target: "v1" | "protected-v2" = "v1") {
  const generation = identityGeneration;
  const draft = completionDraftFixture(mode, count);
  draft.phase = "reflection"; draft.completed.reflection = null; draft.completed.learningProfile = null;
  mocks.load.mockResolvedValue({ valid: true, draft });
  const outbox = createCompletionOutbox("demo-phase2b-ui", new IDBFactory()); close = outbox.close;
  const receiptMap = new Map<string, ClientCompletionReceipt>();
  const transport = vi.fn(async (uid: string, json: string): Promise<ClientCompletionReceipt> => {
    const input = JSON.parse(json), valid = validateCompletion(uid, input, new Date().toISOString());
    const previous = receiptMap.get(input.sessionId); if (previous) return previous;
    const receipt: ClientCompletionReceipt = { ...(target === "v1" ? { schemaVersion: 1 as const, status: "completed" as const, profileRevision: 1 }
      : { schemaVersion: 2 as const, status: "accepted" as const, acceptedRevision: 1, lifecycleEpoch: 1 }), sessionId: input.sessionId, mode,
      evidenceId: `session-${digest(input.sessionId)}`, requestHash: valid.requestHash,
      recordedAt: new Date().toISOString(), legacyAssessmentId: mode === "auto" ? input.sessionId : null, legacyProfileUpdated: mode === "auto" };
    receiptMap.set(input.sessionId, receipt); return receipt;
  });
  const activity = vi.fn(async () => {});
  const hasReservation = vi.fn(async () => true);
  mocks.client = createTrainingCompletionClient({ outbox, target, assertOwner: uid => { if (uid !== mocks.uid || generation !== identityGeneration) throw new Error("Account changed"); },
    hasReservation, transport, completeLegacy: async (entry, payload) => {
      if (payload.mode === "auto") await mocks.legacy({ ...payload, userId: entry.uid });
    }, recordActivity: activity, clearDraft: mocks.discard, timeZone: () => "UTC" });
  const mount = () => render(<MemoryRouter initialEntries={[`/training/assessment?resume=${draft.sessionId}`]}><Routes>
    <Route path="/training/assessment" element={<Assessment />} /><Route path="/training" element={<p>Training landing</p>} />
  </Routes></MemoryRouter>);
  return { draft, outbox, transport, activity, hasReservation, mount, receiptMap };
}
beforeEach(() => {
  identityGeneration++;
  // IndexedDB + Web Crypto span several real tasks, not a synchronous mocked
  // final save. Await their checkpoint instead of a brittle one-second UI wait.
  configure({ asyncUtilTimeout: 10_000 });
  vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
  vi.stubGlobal("crypto", webcrypto); mocks.enabled = true; mocks.uid = "local-student";
  for (const mock of [mocks.load, mocks.save, mocks.discard, mocks.legacy, mocks.streak, mocks.reserve]) mock.mockReset();
  mocks.save.mockResolvedValue(undefined); mocks.discard.mockResolvedValue(undefined); mocks.legacy.mockResolvedValue(undefined);
  mocks.streak.mockResolvedValue({ wasNewDay: true, currentStreak: 1 });
});
afterEach(async () => { identityGeneration++; cleanup(); if (close) await close(); vi.unstubAllGlobals();
  configure({ asyncUtilTimeout: 1_000 }); vi.resetConfig(); });

it.each([["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]] as const)("connects Assessment %s/%i to the durable contract without a second legacy save", async (mode, count) => {
  const h = setup(mode, count); h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("heading", { name: mode === "auto" ? "Your Learning Profile" : "Session complete" });
  expect(h.transport).toHaveBeenCalledOnce(); expect(h.activity).toHaveBeenCalledOnce(); expect(mocks.discard).toHaveBeenCalledOnce();
  expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.streak).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  expect((await h.outbox.get(mocks.uid, h.draft.sessionId))?.finalized).toBe(true);
});
it.each([["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]] as const)("Stage 4E Assessment %s/%i acknowledges acceptance without claiming publication", async (mode, count) => {
  const h = setup(mode, count, "protected-v2"); h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("heading", { name: mode === "auto" ? "Your Learning Profile" : "Session complete" });
  expect(screen.getByText(/durably accepted by the isolated backend/)).toBeTruthy();
  expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  const stored = (await h.outbox.get(mocks.uid, h.draft.sessionId))!;
  expect(stored.receipt).toMatchObject({ schemaVersion: 2, status: "accepted" }); expect(stored.receipt).not.toHaveProperty("profileRevision");
  expect(JSON.parse(stored.payloadJSON).selectedMethods).toHaveLength(count);
});
it("Stage 4E recovery explicitly separates accepted evidence from profile publication", async () => {
  const h = setup("auto", 3, "protected-v2"), real = h.transport.getMockImplementation()!;
  h.transport.mockImplementationOnce(async (...args) => { await real(...args); throw new Error("V2 response lost"); });
  h.mount(); fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("alert"); cleanup(); h.mount();
  await screen.findByRole("heading", { name: "Training completion saved" });
  expect(screen.getByRole("status").textContent).toContain("acceptance does not mean a new profile is published");
  expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
});
it("recovers an unacknowledged completion after refresh without repeating Baseline, reflection, legacy saving or quota", async () => {
  const h = setup(); const real = h.transport.getMockImplementation()!;
  h.transport.mockImplementationOnce(async (uid, body) => { await real(uid, body); throw new Error("Response lost"); });
  h.mount(); fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("alert"); expect(mocks.discard).not.toHaveBeenCalled();
  cleanup(); h.mount();
  await screen.findByRole("heading", { name: "Training completion saved" });
  expect(screen.queryByRole("button", { name: "Complete reflection" })).toBeNull();
  expect(h.transport.mock.calls[0][1]).toBe(h.transport.mock.calls[1][1]);
  expect(h.receiptMap.size).toBe(1); expect(h.activity).toHaveBeenCalledOnce();
  expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
});
it("Save and Exit retains the queued payload and original Baseline after a temporary failure", async () => {
  const h = setup(); h.transport.mockRejectedValue(new Error("Network offline")); h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Save and exit" }));
  await screen.findByText("Training landing");
  const entry = await h.outbox.get(mocks.uid, h.draft.sessionId);
  expect(JSON.parse(entry!.payloadJSON).baseline).toEqual(h.draft.completed.baseline);
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled();
});
it("preserves the default production legacy path when the flag is off", async () => {
  const h = setup("auto", 4); mocks.enabled = false; h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("heading", { name: "Your Learning Profile" });
  expect(mocks.legacy).toHaveBeenCalledOnce(); expect(mocks.streak).toHaveBeenCalledOnce(); expect(h.transport).not.toHaveBeenCalled();
});
it("keeps a grandfathered draft without a reservation on the legacy path", async () => {
  const h = setup("auto", 4); h.hasReservation.mockResolvedValue(false); h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("heading", { name: "Your Learning Profile" });
  expect(mocks.legacy).toHaveBeenCalledOnce(); expect(h.transport).not.toHaveBeenCalled();
  expect(await h.outbox.list(mocks.uid)).toEqual([]); expect(mocks.reserve).not.toHaveBeenCalled();
  expect((await h.outbox.get(mocks.uid, h.draft.sessionId))!.legacySaved).toBe(true);
});

it("persists Reflection, the entire final draft and the original timestamp before a stalled reservation lookup; refresh recovers them", async () => {
  const h = setup();
  h.hasReservation.mockImplementationOnce(() => new Promise<boolean>(() => {}));
  h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await waitFor(() => expect(h.hasReservation).toHaveBeenCalledOnce());
  const stored = (await h.outbox.get(mocks.uid, h.draft.sessionId))!;
  expect(JSON.parse(stored.payloadJSON).reflection.reflectionText).toBe("Synthetic offline reflection");
  expect(JSON.parse(stored.draftJSON!).completed.reflection.reflectionText).toBe("Synthetic offline reflection");
  expect(JSON.parse(stored.draftJSON!).completed.baseline).toEqual(h.draft.completed.baseline);
  expect(JSON.parse(stored.payloadJSON).completedAt).toMatch(/Z$/);
  expect(h.transport).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled();
  // A closed tab releases no callbacks; its lease expires before a new tab
  // takes over. Do not let the abandoned asynchronous lookup finish the work.
  cleanup();
  await h.outbox.claim(mocks.uid, h.draft.sessionId, "refreshed-tab", Date.now() + 60_001);
  await h.outbox.release(mocks.uid, h.draft.sessionId, "refreshed-tab");
  h.mount(); await screen.findByRole("heading", { name: "Training completion saved" });
  const recovered = (await h.outbox.get(mocks.uid, h.draft.sessionId))!;
  expect(recovered.payloadJSON).toBe(stored.payloadJSON); expect(recovered.draftJSON).toBe(stored.draftJSON);
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.legacy).not.toHaveBeenCalled();
});

it("keeps autosaving the completed draft until a browser checkpoint commits and does not start a reservation lookup early", async () => {
  const h = setup();
  const freeze = h.outbox.freeze;
  let release!: () => void;
  h.outbox.freeze = async (...args) => { await new Promise<void>(resolve => { release = resolve; }); return freeze(...args); };
  h.mount(); fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await waitFor(() => expect(release).toBeTypeOf("function"));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ completed: expect.objectContaining({ reflection: expect.any(Object) }) }), expect.any(Object)));
  expect(h.hasReservation).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  release(); await screen.findByRole("heading", { name: "Your Learning Profile" });
});

it("reports unconfirmed browser storage honestly instead of claiming completed evidence is safe", async () => {
  const h = setup();
  const read = h.outbox.get;
  h.outbox.get = async () => { throw new Error("Browser storage is unavailable; recovery is not confirmed."); };
  render(<MemoryRouter><TrainingCompletionRecovery uid={mocks.uid} sessionId={h.draft.sessionId} /></MemoryRouter>);
  await screen.findByRole("alert");
  expect(screen.getByRole("status").textContent).toContain("not confirmed safely saved");
  expect(screen.getByText(/Clearing browser data/)).toBeTruthy();
  expect(h.transport).not.toHaveBeenCalled(); h.outbox.get = read;
});

it("keeps the completed draft and original timestamp on checkpoint failure and retries without replacing the session", async () => {
  const h = setup(); const prepare = vi.spyOn(mocks.client!, "prepare");
  vi.spyOn(h.outbox, "freeze").mockRejectedValueOnce(new Error("Completion is not safely saved: browser storage is full."));
  h.mount(); fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("alert");
  expect(h.transport).not.toHaveBeenCalled(); expect(h.hasReservation).not.toHaveBeenCalled();
  expect(screen.getByText(/A durable completion checkpoint has not been confirmed/)).toBeTruthy();
  expect(screen.queryByText("Your completed work is still safely available as an unfinished draft.")).toBeNull();
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ completed: expect.objectContaining({ reflection: expect.any(Object) }) }), expect.any(Object)));
  fireEvent.click(screen.getByRole("button", { name: "Retry final save" }));
  await screen.findByRole("heading", { name: "Your Learning Profile" });
  expect(prepare.mock.calls[0][1]).toBe(prepare.mock.calls[1][1]);
  expect(JSON.parse(h.transport.mock.calls[0][1]).completedAt).toBe(prepare.mock.calls[0][1]);
  expect(h.transport).toHaveBeenCalledOnce(); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("distinguishes a confirmed local checkpoint from backend acknowledgment", async () => {
  const h = setup(); await mocks.client!.prepare(completionDraftFixture());
  h.hasReservation.mockRejectedValue(new Error("Offline during reservation lookup"));
  render(<MemoryRouter><TrainingCompletionRecovery uid={mocks.uid} sessionId={h.draft.sessionId} /></MemoryRouter>);
  await screen.findByRole("alert");
  expect(screen.getByRole("status").textContent).toContain("saved in browser storage");
  expect(screen.getByRole("status").textContent).toContain("Backend acknowledgment is not yet confirmed");
  expect(h.transport).not.toHaveBeenCalled();
});

it("does not claim browser persistence if the checkpoint disappears during a failed submission", async () => {
  const h = setup(), entry = await mocks.client!.prepare(completionDraftFixture());
  vi.spyOn(mocks.client!, "get").mockResolvedValueOnce(entry).mockResolvedValueOnce(null);
  vi.spyOn(mocks.client!, "resume").mockRejectedValueOnce(new Error("Connection lost"));
  render(<MemoryRouter><TrainingCompletionRecovery uid={mocks.uid} sessionId={h.draft.sessionId} /></MemoryRouter>);
  await screen.findByRole("alert");
  expect(screen.getByRole("status").textContent).toContain("not confirmed safely saved");
});

it("shows a persisted backend acknowledgment separately from pending activity cleanup", async () => {
  const h = setup(); await mocks.client!.prepare(completionDraftFixture());
  h.activity.mockRejectedValue(new Error("Activity offline"));
  render(<MemoryRouter><TrainingCompletionRecovery uid={mocks.uid} sessionId={h.draft.sessionId} /></MemoryRouter>);
  await screen.findByRole("alert");
  expect(screen.getByRole("status").textContent).toContain("Completion acknowledgment is saved");
  expect(screen.getByRole("status").textContent).toContain("cleanup still needs retry");
  expect(h.transport).toHaveBeenCalledOnce(); expect(mocks.discard).not.toHaveBeenCalled();
});
it("retains durable acknowledgment after cleanup failure and retries cleanup without another completion or streak", async () => {
  const h = setup("manual", 1); mocks.discard.mockRejectedValueOnce(new Error("Cleanup offline")); h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("alert"); cleanup(); h.mount();
  await screen.findByRole("heading", { name: "Training completion saved" });
  expect(h.transport).toHaveBeenCalledOnce(); expect(h.activity).toHaveBeenCalledOnce(); expect(mocks.discard).toHaveBeenCalledTimes(2);
});
it("does not render or submit another account's pending entry", async () => {
  const h = setup(); h.transport.mockRejectedValueOnce(new Error("Offline")); h.mount();
  fireEvent.click(await screen.findByRole("button", { name: "Complete reflection" })); await screen.findByRole("alert"); cleanup();
  mocks.uid = "another-student"; mocks.load.mockResolvedValue(null); h.mount();
  await waitFor(() => expect(screen.getByRole("heading", { name: "Saved training cannot be resumed" })).toBeTruthy());
  expect(h.transport).toHaveBeenCalledOnce(); expect(await h.outbox.list(mocks.uid)).toEqual([]);
});
it("a conflicting pending session does not starve recovery of a different valid session", async () => {
  const h = setup(), blocked = completionDraftFixture("auto", 3, "aaa-conflicting-session"), valid = completionDraftFixture("auto", 3, "bbb-valid-session");
  await mocks.client!.prepare(blocked); await mocks.client!.prepare(valid);
  const real = h.transport.getMockImplementation()!;
  h.transport.mockImplementation((uid, body) => JSON.parse(body).sessionId === blocked.sessionId
    ? Promise.reject(new Error("Conflicting session retained for support")) : real(uid, body));
  render(<MemoryRouter><TrainingCompletionRecovery uid={mocks.uid} /></MemoryRouter>);
  await screen.findByRole("alert");
  expect((await h.outbox.get(mocks.uid, valid.sessionId))?.finalized).toBe(true);
  expect((await h.outbox.get(mocks.uid, blocked.sessionId))?.finalized).toBe(false);
  expect(h.activity).toHaveBeenCalledOnce(); expect(mocks.reserve).not.toHaveBeenCalled();
});
it.each(["missing", "unavailable"] as const)("recovers the outbox when its corresponding draft is %s, without reserving quota", async condition => {
  const h = setup(), completed = completionDraftFixture(); await mocks.client!.prepare(completed);
  if (condition === "missing") mocks.load.mockResolvedValue(null); else mocks.load.mockRejectedValue(new Error("Draft service offline"));
  h.mount(); await screen.findByRole("heading", { name: "Training completion saved" });
  expect(h.transport).toHaveBeenCalledOnce(); expect(mocks.reserve).not.toHaveBeenCalled();
  expect((await h.outbox.get(mocks.uid, completed.sessionId))?.finalized).toBe(true);
});
it("a direct assessment refresh recovers pending work before mounting any new-session reservation", async () => {
  const h = setup(); await mocks.client!.prepare(completionDraftFixture()); mocks.load.mockResolvedValue(null);
  function Location() { const value = useLocation(); return <span hidden data-testid="completion-location">{value.pathname + value.search}</span>; }
  render(<MemoryRouter initialEntries={["/training/assessment"]}><Location /><Routes>
    <Route path="/training/assessment" element={<Assessment />} /><Route path="/training" element={<p>Training landing</p>} />
  </Routes></MemoryRouter>);
  await screen.findByRole("heading", { name: "Training completion saved" });
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(h.transport).toHaveBeenCalledOnce();
  expect(screen.getByTestId("completion-location").textContent).toContain(`?resume=${h.draft.sessionId}`);
  cleanup(); h.mount(); await screen.findByRole("heading", { name: "Training completion saved" });
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(h.transport).toHaveBeenCalledOnce(); expect(h.activity).toHaveBeenCalledOnce();
});
