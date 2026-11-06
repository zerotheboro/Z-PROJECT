import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { followRecord, followProfile, FOLLOW_DISPLAY, FOLLOW_UID } from "../../test-support/economicsFollowThroughFixtures";
import { observeStudyRecommendation } from "../quiz/economics9708/recommendationFollowThrough";
import { getStudyComparison, rememberStudyComparison, resetStudyFollowThroughSession } from "./studyFollowThroughSession";
import { armProgressPilot, readProgressPilot, resetProgressPilot } from "./economicsProgressPilotSession";
import { createTrainingDraft } from "../quiz/trainingProgress";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "strategy-student-a" } },
  signIn: vi.fn(), signOut: vi.fn(), create: vi.fn(), unsubscribe: vi.fn(),
  listener: null as ((user: { uid: string } | null) => void) | null
}));
vi.mock("../firebase", () => ({ auth: mocks.auth }));
vi.mock("./user", () => ({ createUserIfNeeded: mocks.create }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {}, signInWithPopup: mocks.signIn, signOut: mocks.signOut,
  onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => { mocks.listener = listener; return mocks.unsubscribe; }
}));
import { getCurrentUser, loginWithGoogle, logoutUser, subscribeToAuth } from "./auth";

function seed() {
  const row = followRecord();
  const observation = observeStudyRecommendation(FOLLOW_UID, "1.5", [row], FOLLOW_DISPLAY, followProfile([row]).strategyEvidence?.acceptanceHead)!;
  rememberStudyComparison(mocks.auth.currentUser, observation);
  armProgressPilot(mocks.auth.currentUser, createTrainingDraft({ owner: { kind: "user", uid: FOLLOW_UID }, mode: "auto", selectedMethods: [],
    sessionId: "auth-pilot-session", economicsTopicId: "1.5", economicsActivityVersion: "mapped-1" }), "1.5");
}
beforeEach(() => {
  vi.stubEnv("DEV", true); vi.clearAllMocks(); resetStudyFollowThroughSession(); resetProgressPilot();
  mocks.auth.currentUser = { uid: FOLLOW_UID }; mocks.listener = null;
  mocks.signIn.mockReset(); mocks.signOut.mockReset(); mocks.create.mockReset();
  mocks.create.mockResolvedValue(undefined); mocks.signOut.mockResolvedValue(undefined); seed();
});
afterEach(() => { resetStudyFollowThroughSession(); resetProgressPilot(); vi.unstubAllEnvs(); });

it("clears the local comparison before an asynchronous sign-out settles", async () => {
  let finish = () => {};
  mocks.signOut.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  const request = logoutUser();
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
  expect(readProgressPilot(mocks.auth.currentUser, "auth-pilot-session")).toBeNull();
  expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth);
  finish(); await request;
});
it("does not resurrect local evidence when sign-out fails", async () => {
  mocks.signOut.mockRejectedValue(new Error("synthetic sign-out failure"));
  await expect(logoutUser()).rejects.toThrow("synthetic sign-out failure");
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
  expect(readProgressPilot(mocks.auth.currentUser, "auth-pilot-session")).toBeNull();
});
it("preserves the existing login and user-creation contract while clearing local state", async () => {
  const next = { uid: "student-b" }; mocks.signIn.mockResolvedValue({ user: next });
  expect(await loginWithGoogle()).toBe(next);
  expect(mocks.signIn).toHaveBeenCalledWith(mocks.auth, expect.anything());
  expect(mocks.create).toHaveBeenCalledExactlyOnceWith(next);
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
  expect(readProgressPilot(mocks.auth.currentUser, "auth-pilot-session")).toBeNull();
});
it("clears before a failed login and does not create an unauthenticated user", async () => {
  mocks.signIn.mockRejectedValue(new Error("synthetic login failure"));
  await expect(loginWithGoogle()).rejects.toThrow("synthetic login failure");
  expect(mocks.create).not.toHaveBeenCalled();
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
  expect(readProgressPilot(mocks.auth.currentUser, "auth-pilot-session")).toBeNull();
});
it("rotates account state before delivering the existing auth callback", () => {
  const callback = vi.fn(() => {
    expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
    expect(readProgressPilot(mocks.auth.currentUser, "auth-pilot-session")).toBeNull();
  });
  expect(subscribeToAuth(callback)).toBe(mocks.unsubscribe);
  mocks.listener!({ uid: "student-b" });
  expect(callback).toHaveBeenCalledExactlyOnceWith({ uid: "student-b" });
});
it("clears a new authentication instance for the same UID and logout notifications", () => {
  const callback = vi.fn(); subscribeToAuth(callback);
  mocks.listener!({ uid: FOLLOW_UID });
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
  seed(); mocks.listener!(null);
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBeNull();
  expect(callback).toHaveBeenLastCalledWith(null);
});
it("does not activate the development cache hooks in production mode", async () => {
  vi.stubEnv("DEV", false);
  const before = getStudyComparison(mocks.auth.currentUser, "1.5");
  const pilotBefore = readProgressPilot(mocks.auth.currentUser, "auth-pilot-session");
  expect(pilotBefore).not.toBeNull();
  mocks.signIn.mockResolvedValue({ user: mocks.auth.currentUser });
  await loginWithGoogle(); await logoutUser();
  const callback = vi.fn(); subscribeToAuth(callback); mocks.listener!(null);
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")).toBe(before);
  expect(readProgressPilot(mocks.auth.currentUser, "auth-pilot-session")).toBe(pilotBefore);
  expect(callback).toHaveBeenCalledExactlyOnceWith(null);
  expect(getCurrentUser()).toBe(mocks.auth.currentUser);
});
