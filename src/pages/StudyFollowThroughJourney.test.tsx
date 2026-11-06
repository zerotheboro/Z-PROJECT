// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import { followRecord, laterFollowRecord, followProfile, FOLLOW_DISPLAY, FOLLOW_UID } from "../../test-support/economicsFollowThroughFixtures";
import { getStudyComparison, resetStudyFollowThroughSession } from "../services/studyFollowThroughSession";

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, latest: null as CumulativeProfileSnapshot | null, start: vi.fn() }));
vi.mock("../firebase", () => ({ auth: mocks.auth, db: {} }));
vi.mock("../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => ({ acceptedPreview: true }) }));
vi.mock("../services/localTrainingCompletionConfig", () => ({ localCompletionConfig: () => null }));
vi.mock("../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ loading: false, user: mocks.auth.currentUser, plan: "free", planSource: "default", unlimited: false,
  testMeUsed: 0, testMeLimit: 1, testMeRemaining: 1, manualMethodsUsed: 0, manualMethodsLimit: 3, manualMethodsRemaining: 3, refreshAccess: vi.fn() }) }));
vi.mock("../hooks/useAIRecommendationAccess", () => ({ useAIRecommendationAccess: () => ({ loading: false, access: null, refreshAccess: vi.fn() }) }));
vi.mock("../hooks/useTrainingStreak", () => ({ useTrainingStreak: () => ({ loading: false, currentStreak: 1, longestStreak: 1, totalActiveDays: 1 }) }));
vi.mock("../quiz/useAvailableTrainingDraft", () => ({ useAvailableTrainingDraft: () => ({ loading: false,
  owner: { kind: "user", uid: mocks.auth.currentUser?.uid }, validation: null, error: null, reload: vi.fn() }) }));
vi.mock("../services/startTrainingSession", () => ({ startTrainingSession: (...args: unknown[]) => mocks.start(...args) }));
vi.mock("../components/LearningProfileStatus", () => ({ default: () => <p>Existing profile status</p> }));
vi.mock("../components/TrainingAccessCard", () => ({ default: () => <p>Existing quota access</p> }));
vi.mock("../components/TrainingStreakCard", () => ({ default: () => <p>Existing streak</p> }));
import YourStudyStrategy from "../components/YourStudyStrategy";
import Training from "./Training";

function Profile() {
  const [data, setData] = useState(mocks.latest!);
  return <main className="cumulative-profile"><YourStudyStrategy ownerUid={mocks.auth.currentUser!.uid} snapshot={data} refresh={() => setData(mocks.latest!)} /></main>;
}
function App() { return <MemoryRouter initialEntries={["/training/profile"]}><Routes>
  <Route path="/training/profile" element={<Profile />} /><Route path="/training" element={<><Training /><Link to="/training/profile">Return to profile</Link></>} />
</Routes></MemoryRouter>; }
const panel = () => within(screen.getByRole("region", { name: "Your Study Strategy" }));
const report = () => within(screen.getByRole("complementary", { name: "Recommendation follow-through" }));
beforeEach(() => { vi.stubEnv("DEV", true); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(FOLLOW_DISPLAY);
  resetStudyFollowThroughSession(); mocks.auth.currentUser = { uid: FOLLOW_UID } as User; mocks.start.mockReset();
  mocks.latest = followProfile([followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] })]); });
afterEach(() => { cleanup(); resetStudyFollowThroughSession(); vi.useRealTimers(); vi.unstubAllEnvs(); });

it("observes the actual Training route but never infers an attempt or reserves quota merely from opening it", async () => {
  render(<App />); await screen.findByRole("complementary", { name: "Recommendation follow-through" });
  expect(report().getByText(/Training page opened: not observed here/)).toBeTruthy();
  fireEvent.click(panel().getByRole("link", { name: "Open Training" }));
  expect(screen.getByRole("heading", { name: "Train how you learn." })).toBeTruthy(); expect(mocks.start).not.toHaveBeenCalled();
  expect(getStudyComparison(mocks.auth.currentUser, "1.5")?.trainingOpenedAt).toBe(FOLLOW_DISPLAY);
  fireEvent.click(screen.getByRole("link", { name: "Return to profile" }));
  await screen.findByRole("complementary", { name: "Recommendation follow-through" });
  expect(report().getByText(/Training page opened: observed/)).toBeTruthy();
  expect(report().getByText(/No newly visible accepted Training evidence/)).toBeTruthy();
});
it("updates advice after accepted Feynman evidence and clearly separates new performance from improvement and causality", async () => {
  render(<App />); await screen.findByRole("complementary", { name: "Recommendation follow-through" });
  const old = followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] }); mocks.latest = followProfile([old, laterFollowRecord()]);
  fireEvent.click(panel().getByRole("button", { name: "Refresh study strategy" }));
  expect(panel().getByRole("heading", { name: "Explain changes in productive capacity" })).toBeTruthy();
  expect(report().getByText(/1 accepted session record is newly visible/)).toBeTruthy();
  expect(report().getByText(/consistent with the suggestion, not proof it was followed or caused a change/)).toBeTruthy();
  expect(report().getByText(/Familiar questions were repeated/)).toBeTruthy();
  expect(report().getByText(/Outside study and the student's intent remain unknown/)).toBeTruthy();
  expect(mocks.start).not.toHaveBeenCalled();
});
it("handles another method and duplicate accepted snapshots without mislabeling the student's choice as ignored advice", async () => {
  render(<App />); await screen.findByRole("complementary", { name: "Recommendation follow-through" });
  const old = followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] }); mocks.latest = followProfile([old, laterFollowRecord({ methods: ["active-recall"] })]);
  fireEvent.click(panel().getByRole("button", { name: "Refresh study strategy" }));
  expect(report().getByText(/Suggested method attempt: not established/)).toBeTruthy();
  expect(report().getByText(/does not mean the suggestion was ignored/)).toBeTruthy();
  const text = report().getByText(/1 accepted session record is newly visible/).textContent;
  mocks.latest = { ...mocks.latest }; fireEvent.click(panel().getByRole("button", { name: "Refresh study strategy" }));
  expect(report().getByText(/1 accepted session record is newly visible/).textContent).toBe(text);
});
it("does not preserve local recommendation observations as durable receipts after a session-memory reset", async () => {
  const page = render(<App />); await screen.findByRole("complementary", { name: "Recommendation follow-through" });
  page.unmount(); resetStudyFollowThroughSession();
  mocks.latest = followProfile([followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] }), laterFollowRecord()]);
  render(<App />); await screen.findByRole("complementary", { name: "Recommendation follow-through" });
  expect(report().getByText(/No newly visible accepted Training evidence/)).toBeTruthy();
  expect(report().getByText(/Reloading, closing the tab or signing out resets it/)).toBeTruthy();
});
