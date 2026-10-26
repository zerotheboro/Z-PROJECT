// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { LearningProfile, MethodId } from "../quiz/type";

const mocks = vi.hoisted(() => ({
  listener: null as ((user: User | null) => void | Promise<void>) | null,
  auth: { currentUser: null as User | null }, read: vi.fn(), unsubscribe: vi.fn()
}));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
  mocks.listener = listener; return mocks.unsubscribe;
} }));
vi.mock("../firebase", () => ({ auth: mocks.auth }));
vi.mock("../services/user", () => ({ getLearningProfile: (uid: string) => mocks.read(uid) }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => null }));
vi.mock("../HEADER/header", () => ({ default: () => <nav>Navigation</nav> }));
import LearningProfilePage from "./LearningProfilePage";

function deferred() {
  let resolve!: (profile: LearningProfile | null) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<LearningProfile | null>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function profile(preferredMethod: MethodId): LearningProfile {
  return { strongestVerifiedMethod: null, preferredMethod, recommendedMethods: [], methodEvidence: [],
    baseline: { memoryScore: 0.5, understandingScore: 0.75 }, methodKnowledgeScore: 1, priority: "performance" };
}
function signIn(uid: string | null) {
  const user = uid === null ? null : { uid } as User;
  act(() => { mocks.auth.currentUser = user; void mocks.listener!(user); });
}
const mount = () => render(<MemoryRouter initialEntries={["/training/profile?view=latest"]}><LearningProfilePage /></MemoryRouter>);
const aVisible = () => screen.queryByRole("heading", { name: "Active Recall" });
const bVisible = () => screen.queryByRole("heading", { name: "Feynman Technique" });
beforeEach(() => { mocks.read.mockReset(); mocks.unsubscribe.mockReset(); mocks.auth.currentUser = null; });
afterEach(cleanup);

it("removes A's actual latest snapshot immediately while B's profile read is pending", async () => {
  const b = deferred(); mocks.read.mockResolvedValueOnce(profile("active-recall")).mockReturnValueOnce(b.promise);
  mount(); signIn("student-a"); await screen.findByRole("heading", { name: "Active Recall" });
  signIn("student-b");
  expect(aVisible()).toBeNull(); expect(screen.getByText("Loading your learning profile...")).toBeTruthy();
  await act(async () => b.resolve(profile("feynman")));
  expect(bVisible()).toBeTruthy(); expect(aVisible()).toBeNull();
});

it("does not let A's late success replace B's displayed latest snapshot", async () => {
  const a = deferred(), b = deferred(); mocks.read.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  mount(); signIn("student-a"); signIn("student-b");
  await act(async () => b.resolve(profile("feynman")));
  expect(bVisible()).toBeTruthy();
  await act(async () => a.resolve(profile("active-recall")));
  expect(bVisible()).toBeTruthy(); expect(aVisible()).toBeNull();
});

it("fences stale error and finally callbacks without ending B's loading state or logging A's data", async () => {
  const a = deferred(), b = deferred(), log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.read.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  mount(); signIn("student-a"); signIn("student-b");
  await act(async () => a.reject({ privateDetails: "PRIVATE SYNTHETIC ERROR" }));
  expect(screen.getByText("Loading your learning profile...")).toBeTruthy(); expect(log).not.toHaveBeenCalled();
  await act(async () => b.resolve(profile("feynman"))); expect(bVisible()).toBeTruthy();
});

it("invalidates requests on logout, including logout followed by another account", async () => {
  const a = deferred(), b = deferred(); mocks.read.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  mount(); signIn("student-a"); signIn(null);
  expect(screen.getByRole("heading", { name: "Sign in to view your learning profile" })).toBeTruthy();
  signIn("student-b"); await act(async () => a.resolve(profile("active-recall")));
  expect(aVisible()).toBeNull(); expect(screen.getByText("Loading your learning profile...")).toBeTruthy();
  await act(async () => b.resolve(profile("feynman"))); expect(bVisible()).toBeTruthy();
  signIn(null); expect(bVisible()).toBeNull();
});

it("uses request generation as well as UID for rapid A/B/A changes", async () => {
  const oldA = deferred(), b = deferred(), newA = deferred();
  mocks.read.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(newA.promise);
  mount(); signIn("student-a"); signIn("student-b"); signIn("student-a");
  await act(async () => oldA.resolve(profile("feynman")));
  expect(screen.getByText("Loading your learning profile...")).toBeTruthy(); expect(bVisible()).toBeNull();
  await act(async () => newA.resolve(profile("active-recall"))); expect(aVisible()).toBeTruthy();
  await act(async () => b.resolve(profile("feynman"))); expect(aVisible()).toBeTruthy(); expect(bVisible()).toBeNull();
});

it("keeps a failed current read empty and never logs the private error payload", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.read.mockResolvedValueOnce(profile("active-recall")).mockRejectedValueOnce({ privateDetails: "PRIVATE SYNTHETIC ERROR" });
  mount(); signIn("student-a"); await screen.findByRole("heading", { name: "Active Recall" }); signIn("student-b");
  await screen.findByRole("heading", { name: "You don't have a learning profile yet." });
  expect(aVisible()).toBeNull(); expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE SYNTHETIC ERROR");
});

it("ignores auth callbacks and responses after unmount", async () => {
  const a = deferred(); mocks.read.mockReturnValueOnce(a.promise);
  const mounted = mount(); signIn("student-a"); const oldListener = mocks.listener!;
  mounted.unmount(); expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  act(() => { void oldListener({ uid: "student-b" } as User); });
  await act(async () => a.resolve(profile("active-recall")));
  expect(mocks.read).toHaveBeenCalledTimes(1); expect(aVisible()).toBeNull();
});

it("keeps the initial read loading and preserves a correct user's genuine empty snapshot", async () => {
  const empty = deferred(); mocks.read.mockReturnValueOnce(empty.promise);
  mount(); expect(screen.getByText("Loading your learning profile...")).toBeTruthy();
  signIn("new-student"); expect(screen.getByText("Loading your learning profile...")).toBeTruthy();
  await act(async () => empty.resolve(null));
  expect(screen.getByRole("heading", { name: "You don't have a learning profile yet." })).toBeTruthy();
});

it("checks the actual Firebase UID even before a changed-auth callback is delivered", async () => {
  const a = deferred(); mocks.read.mockReturnValueOnce(a.promise);
  mount(); signIn("student-a"); mocks.auth.currentUser = { uid: "student-b" } as User;
  await act(async () => a.resolve(profile("active-recall")));
  expect(aVisible()).toBeNull(); expect(screen.getByText("Loading your learning profile...")).toBeTruthy();
});
