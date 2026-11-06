import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { createTrainingDraft } from "../quiz/trainingProgress";
import { readProgressPilot, resetProgressPilot } from "./economicsProgressPilotSession";

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null },
  config: { projectId: "demo-edulience-phase2a" } as { projectId: string } | null,
  assertEnvironment: vi.fn(), reserve: vi.fn(), save: vi.fn(), readLocal: vi.fn() }));
vi.mock("../firebase", () => ({ auth: mocks.auth }));
vi.mock("./localTrainingCompletionConfig", () => ({ localCompletionConfig: () => mocks.config }));
vi.mock("./localCumulativeProfile", () => ({ assertLocalProfileEnvironment: mocks.assertEnvironment }));
vi.mock("./trainingAccess", () => ({ reserveTrainingAccess: mocks.reserve }));
vi.mock("./trainingProgress", () => ({ saveTrainingDraft: mocks.save, readLocalTrainingDraft: mocks.readLocal }));
import { progressPilotEnabled, prepareProgressPilot } from "./economicsProgressPilot";
import { startTrainingSession } from "./startTrainingSession";

const owner = { kind: "user" as const, uid: "pilot-owner" };
const draft = () => createTrainingDraft({ owner, mode: "auto", selectedMethods: [], sessionId: "pilot-gate-session", economicsTopicId: "1.5", economicsActivityVersion: "mapped-1" });
beforeEach(() => {
  vi.stubEnv("DEV", true); vi.stubEnv("VITE_ECONOMICS_PROGRESS_PILOT", "memory-only");
  vi.clearAllMocks(); resetProgressPilot(); mocks.auth.currentUser = { uid: owner.uid } as User;
  mocks.config = { projectId: "demo-edulience-phase2a" }; mocks.assertEnvironment.mockReset();
  mocks.reserve.mockReset(); mocks.save.mockReset(); mocks.readLocal.mockReset();
  mocks.reserve.mockResolvedValue(undefined); mocks.save.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); resetProgressPilot(); });
it("requires explicit development opt-in and a successfully checked actual Emulator SDK", () => {
  expect(progressPilotEnabled()).toBe(true); expect(mocks.assertEnvironment).toHaveBeenCalledOnce();
  vi.stubEnv("VITE_ECONOMICS_PROGRESS_PILOT", ""); expect(progressPilotEnabled()).toBe(false);
  vi.stubEnv("VITE_ECONOMICS_PROGRESS_PILOT", "memory-only"); vi.stubEnv("DEV", false); expect(progressPilotEnabled()).toBe(false);
});
it("fails closed for missing isolation or disagreeing SDK hosts/project/transport", () => {
  mocks.config = null; expect(progressPilotEnabled()).toBe(false);
  mocks.config = { projectId: "demo-edulience-phase2a" }; mocks.assertEnvironment.mockImplementation(() => { throw new Error("SDK disagreement"); });
  expect(progressPilotEnabled()).toBe(false);
  prepareProgressPilot(mocks.auth.currentUser, draft(), "1.5"); expect(readProgressPilot(mocks.auth.currentUser, "pilot-gate-session")).toBeNull();
});
it("requires the exact current authenticated owner and does not arm guest or other-topic sessions", () => {
  prepareProgressPilot({ uid: owner.uid } as User, draft(), "1.5"); expect(readProgressPilot(mocks.auth.currentUser, "pilot-gate-session")).toBeNull();
  prepareProgressPilot(null, draft(), "1.5"); expect(readProgressPilot(mocks.auth.currentUser, "pilot-gate-session")).toBeNull();
  prepareProgressPilot(mocks.auth.currentUser, draft(), "2.3"); expect(readProgressPilot(mocks.auth.currentUser, "pilot-gate-session")).toBeNull();
});
it.each(["auto", "manual"] as const)("arms %s only after the original reservation/save and adds no extra quota operation", async mode => {
  const d = await startTrainingSession({ user: mocks.auth.currentUser, owner, mode,
    methodIds: mode === "auto" ? [] : ["active-recall"], economicsTopicId: "1.5", sessionId: "pilot-start-session" });
  expect(mocks.reserve).toHaveBeenCalledExactlyOnceWith(mocks.auth.currentUser, { sessionId: d.sessionId, mode, methodIds: d.selectedMethods });
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(d, { allowCreate: true });
  expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)?.topicId).toBe("1.5");
  expect(mocks.save.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.reserve.mock.invocationCallOrder[0]);
});
it("does not create a marker on reservation failure or incomplete cloud/local save", async () => {
  mocks.reserve.mockRejectedValue(new Error("synthetic quota denial"));
  const input = { user: mocks.auth.currentUser, owner, mode: "auto" as const, methodIds: [], economicsTopicId: "1.5", sessionId: "pilot-start-session" };
  await expect(startTrainingSession(input)).rejects.toThrow("synthetic quota denial"); expect(mocks.save).not.toHaveBeenCalled();
  expect(readProgressPilot(mocks.auth.currentUser, input.sessionId)).toBeNull();
  mocks.reserve.mockResolvedValue(undefined); mocks.save.mockRejectedValue(new Error("synthetic storage failure"));
  await expect(startTrainingSession(input)).rejects.toThrow("synthetic storage failure");
  expect(readProgressPilot(mocks.auth.currentUser, input.sessionId)).toBeNull();
});
it("an unavailable optional pilot does not change successful Training startup", async () => {
  mocks.assertEnvironment.mockImplementation(() => { throw new Error("Emulator unavailable"); });
  const d = await startTrainingSession({ user: mocks.auth.currentUser, owner, mode: "auto", methodIds: [], economicsTopicId: "2.2" });
  expect(d.section).toBe(1); expect(mocks.reserve).toHaveBeenCalledOnce(); expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)).toBeNull();
});
