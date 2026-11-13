// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import type { TrainingDraft, DraftValidation } from "../quiz/trainingProgress";
import { createTrainingDraft } from "../quiz/trainingProgress";
import { economicsStrategyFixture } from "../../test-support/economicsStrategyUIFixtures";
import { followRecord, followProfile, laterFollowRecord } from "../../test-support/economicsFollowThroughFixtures";
import { resetStudyFollowThroughSession, getStudyComparison, rememberStudyMethodSuggestion } from "../services/studyFollowThroughSession";
import { recommendEconomicsStudy } from "../quiz/economics9708/studyRecommendations";
import type { TrainingMethodId } from "../quiz/type";

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, local: true,
  snapshot: null as CumulativeProfileSnapshot | null, read: vi.fn(), reserve: vi.fn(), save: vi.fn(), discard: vi.fn(),
  validation: null as DraftValidation | null, accessLoading: false, remaining: 3 }));
vi.mock("../firebase", () => ({ auth: mocks.auth, db: {} }));
vi.mock("../services/auth", () => ({ subscribeToAuth: (listener: (user: User | null) => void) => { listener(mocks.auth.currentUser); return () => {}; } }));
vi.mock("../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => mocks.local ? { acceptedPreview: true } : null }));
vi.mock("../services/localCumulativeProfile", () => ({ getLocalCumulativeProfileReader: () => (uid: string) => mocks.read(uid) }));
vi.mock("../services/localTrainingCompletionConfig", () => ({ localCompletionConfig: () => null }));
vi.mock("../hooks/useUserProfile", () => ({ useUserProfile: () => ({ user: mocks.auth.currentUser, loading: false, learningProfile: null }) }));
vi.mock("../hooks/useManualTrainingHistory", () => ({ useManualTrainingHistory: () => ({ records: [], assessments: [], loading: false, error: null, refresh: vi.fn() }) }));
vi.mock("../hooks/useCumulativeProfile", () => ({ useCumulativeProfile: () => ({ uid: mocks.auth.currentUser?.uid ?? null,
  data: mocks.snapshot, loading: false, signedOut: !mocks.auth.currentUser, error: null, refresh: vi.fn(), publishSynthetic: vi.fn() }) }));
vi.mock("../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ loading: mocks.accessLoading, user: mocks.accessLoading ? null : mocks.auth.currentUser, plan: "free", unlimited: false,
  testMeUsed: 0, testMeLimit: 1, testMeRemaining: 1, manualMethodsUsed: 0, manualMethodsLimit: 3, manualMethodsRemaining: mocks.remaining, refreshAccess: vi.fn() }) }));
vi.mock("../hooks/useAIRecommendationAccess", () => ({ useAIRecommendationAccess: () => ({ loading: false, access: null }) }));
vi.mock("../hooks/useTrainingStreak", () => ({ useTrainingStreak: () => ({ loading: false, currentStreak: 0, longestStreak: 0, totalActiveDays: 0 }) }));
vi.mock("../quiz/useAvailableTrainingDraft", () => ({ useAvailableTrainingDraft: () => ({ loading: false,
  owner: mocks.auth.currentUser ? { kind: "user", uid: mocks.auth.currentUser.uid } : { kind: "guest" }, validation: mocks.validation, error: null, reload: vi.fn() }) }));
vi.mock("../services/trainingAccess", () => ({ reserveTrainingAccess: (...args: unknown[]) => mocks.reserve(...args) }));
vi.mock("../services/trainingProgress", () => ({ saveTrainingDraft: (...args: unknown[]) => mocks.save(...args), readLocalTrainingDraft: vi.fn(),
  discardTrainingDraft: (...args: unknown[]) => mocks.discard(...args), forceDiscardTrainingDraft: vi.fn() }));
vi.mock("../components/LearningProfileStatus", () => ({ default: () => <p>Existing profile status</p> }));
vi.mock("../components/TrainingAccessCard", () => ({ default: () => <p>Existing quota access</p> }));
vi.mock("../components/TrainingStreakCard", () => ({ default: () => <p>Existing streak</p> }));
import LearningProfilePage from "./LearningProfilePage";
import Training from "./Training";
import ChooseMethods from "../quiz/ChooseMethods";
// Preload the lazy components; the actual page/route integration is still used.
import "../components/TrainingStudyGuidance";
import "../components/YourStudyStrategy";
import "./CumulativeLearningProfilePage";
import "../quiz/timedActivities/PostSleepPanel";
import { studyTrainingLink, studyTrainingTopic } from "../services/studyTrainingGuidance";

function Location() { const l = useLocation(); return <output data-testid="location">{l.pathname + l.search}</output>; }
function App({ entry = "/training/profile" }: { entry?: string }) {
  return <MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/training/profile" element={<LearningProfilePage />} />
    <Route path="/training" element={<><Training /><Link to="/training/profile">Back to profile</Link></>} />
    <Route path="/training/assessment" element={<p>Existing assessment route</p>} />
    <Route path="/training/choose" element={<><ChooseMethods /><p>Existing method selection route</p></>} />
  </Routes><Location /></MemoryRouter>;
}
const panel = () => within(screen.getByRole("region", { name: "A next step from your Learning Profile" }));
const strategy = () => within(screen.getByRole("region", { name: "Your Study Strategy" }));
const content = () => within(screen.getByRole("region", { name: "Study content options" }));
function deferred() { let resolve!: (v: CumulativeProfileSnapshot) => void, reject!: (e: unknown) => void;
  const promise = new Promise<CumulativeProfileSnapshot>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
beforeEach(() => {
  vi.stubEnv("DEV", true); vi.stubEnv("VITE_STUDY_TRAINING_GUIDANCE", "emulator-only");
  resetStudyFollowThroughSession(); mocks.local = true; mocks.validation = null;
  mocks.accessLoading = false; mocks.remaining = 3;
  mocks.auth.currentUser = { uid: "strategy-student-a" } as User;
  mocks.snapshot = economicsStrategyFixture().snapshot; mocks.read.mockReset(); mocks.read.mockImplementation(() => Promise.resolve(mocks.snapshot));
  mocks.reserve.mockReset(); mocks.save.mockReset(); mocks.discard.mockReset();
});
afterEach(() => { cleanup(); resetStudyFollowThroughSession(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("keeps delayed and owner-preview panels off the normal Training page", () => {
  render(<App entry="/training" />);
  expect(screen.queryByRole("region", { name: "Post-Sleep · 100 Seconds" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Owner preview · 100 Seconds" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Preview 100-second activity" })).toBeNull();
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
});

it.each(["1.5", "2.2"])("recomputes %s advice from accepted completion evidence at the actual Profile → Training entry, then starts normal Training", async topic => {
  const fixture = economicsStrategyFixture("strategy-student-a", topic), frozen = JSON.stringify(fixture.request);
  mocks.snapshot = fixture.snapshot;
  render(<App />); await screen.findByRole("region", { name: "Your Study Strategy" });
  fireEvent.change(strategy().getByLabelText("Economics topic"), { target: { value: topic } });
  expect(strategy().getByRole("link", { name: "Open Training" }).getAttribute("href")).toBe(`/training?studyTopic=${topic}`);
  fireEvent.click(strategy().getByRole("link", { name: "Open Training" }));
  await screen.findByRole("button", { name: "Use this topic" });
  expect(mocks.read).toHaveBeenLastCalledWith("strategy-student-a");
  expect(panel().getByRole("heading", { name: topic === "1.5" ? "Distinguish utilisation from capacity" : "Relate PED to expenditure" })).toBeTruthy();
  expect(panel().getByText(topic === "1.5" ? "Feynman Technique" : /^divide steps$/i)).toBeTruthy();
  expect(panel().getByText("Limited recorded answer evidence")).toBeTruthy();
  expect(content().getByLabelText("Training subject")).toHaveProperty("value", "general");
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  expect(content().getByLabelText("Economics topic")).toHaveProperty("value", topic);
  expect(mocks.reserve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));
  await screen.findByText("Existing assessment route");
  expect(mocks.reserve).toHaveBeenCalledTimes(1);
  expect(mocks.reserve).toHaveBeenCalledWith(mocks.auth.currentUser, expect.objectContaining({ mode: "auto", methodIds: [] }));
  const draft = mocks.save.mock.calls[0][0] as TrainingDraft;
  expect(draft.selectedMethods).toEqual([]); expect(draft.internalState.curriculum?.named.economics9708).toMatchObject({ topicId: topic, activityVersion: "mapped-1" });
  expect(JSON.stringify(fixture.request)).toBe(frozen);
  expect(getStudyComparison(mocks.auth.currentUser, topic)?.trainingOpenedAt).toBeTruthy();
});

it("dismisses without selecting a topic, reserving quota, or forcing a method, and preserves unrelated URL state", async () => {
  render(<App entry="/training?studyTopic=1.5&other=keep" />); await screen.findByRole("button", { name: "Use this topic" });
  fireEvent.click(panel().getByRole("button", { name: "Dismiss guidance" }));
  expect(screen.queryByRole("region", { name: "A next step from your Learning Profile" })).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/training?other=keep");
  expect(content().getByLabelText("Training subject")).toHaveProperty("value", "general");
  fireEvent.click(screen.getByRole("button", { name: "Choose methods" })); await screen.findByText("Existing method selection route");
  expect(screen.getByTestId("location").textContent).toBe("/training/choose");
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
});

it("passes only the accepted whole topic into the unchanged individual-method picker", async () => {
  render(<App entry="/training?studyTopic=2.2&method=derive-basics" />); await screen.findByRole("button", { name: "Use this topic" });
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose methods" })); await screen.findByText("Existing method selection route");
  expect(screen.getByTestId("location").textContent).toBe("/training/choose?economics=2.2");
  expect(mocks.reserve).not.toHaveBeenCalled();
});

it("lets the student change the suggested whole topic without altering method choice or claiming it is still selected", async () => {
  render(<App entry="/training?studyTopic=1.5" />); await screen.findByRole("button", { name: "Use this topic" });
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  fireEvent.change(content().getByLabelText("Economics topic"), { target: { value: "2.2" } });
  expect(panel().getByRole("button", { name: "Use this topic" })).toHaveProperty("disabled", false);
  fireEvent.click(screen.getByRole("button", { name: "Choose methods" })); await screen.findByText("Existing method selection route");
  expect(screen.getByTestId("location").textContent).toBe("/training/choose?economics=2.2");
  expect(mocks.reserve).not.toHaveBeenCalled();
});

it("uses newer accepted evidence arriving between the Profile suggestion and Training arrival", async () => {
  mocks.snapshot = followProfile([followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] })]);
  render(<App />); await screen.findByRole("region", { name: "Your Study Strategy" });
  expect(strategy().getByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeTruthy();
  mocks.snapshot = followProfile([followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] }), laterFollowRecord()]);
  fireEvent.click(strategy().getByRole("link", { name: "Open Training" })); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByRole("heading", { name: "Explain changes in productive capacity" })).toBeTruthy();
  expect(panel().queryByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeNull();
  expect(mocks.reserve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Back to profile" }));
  await screen.findByRole("region", { name: "Your Study Strategy" });
  expect(strategy().getByRole("heading", { name: "Explain changes in productive capacity" })).toBeTruthy();
});

it("refreshes by rereading current evidence, without restoring consent or a method from the URL", async () => {
  const page = render(<App entry="/training?studyTopic=1.5&method=derive-basics" />); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByText("Feynman Technique")).toBeTruthy();
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" })); page.unmount();
  mocks.snapshot = followProfile([followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] }), laterFollowRecord()]);
  render(<App entry="/training?studyTopic=1.5&method=derive-basics" />); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByRole("heading", { name: "Explain changes in productive capacity" })).toBeTruthy();
  expect(panel().queryByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeNull();
  expect(content().getByLabelText("Training subject")).toHaveProperty("value", "general"); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("keeps saved session identity, topic, methods and content unchanged when using advice or resuming", async () => {
  const draft = createTrainingDraft({ owner: { kind: "user", uid: "strategy-student-a" }, mode: "manual", selectedMethods: ["memory-palace"], economicsTopicId: "2.2", sessionId: "saved-guidance-0001" });
  mocks.validation = { valid: true, draft }; const frozen = JSON.stringify(draft);
  render(<App entry="/training?studyTopic=1.5" />); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByText(/saved session keeps its original topic and methods/)).toBeTruthy();
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  fireEvent.click(screen.getByRole("button", { name: "Resume" })); await screen.findByText("Existing assessment route");
  expect(screen.getByTestId("location").textContent).toContain("resume=saved-guidance-0001");
  expect(JSON.stringify(draft)).toBe(frozen); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.discard).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("offers an explicitly task-based no-history suggestion but never promotes legacy or pending-only evidence", async () => {
  mocks.snapshot = { ...mocks.snapshot!, strategyEvidence: { ownerUid: "strategy-student-a", rows: [], scope: "accepted-history", pendingAcceptedSessions: 0, legacyReportsExcluded: true } };
  const page = render(<App entry="/training?studyTopic=1.5" />); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByText("Task-based suggestion · not personalised performance evidence")).toBeTruthy();
  page.unmount(); mocks.snapshot = { ...mocks.snapshot!, strategyEvidence: undefined };
  render(<App entry="/training?studyTopic=1.5" />); await screen.findByText(/Accepted evidence for this guidance is unavailable/);
  expect(panel().queryByRole("button", { name: "Use this topic" })).toBeNull();
});

it("hides mismatched-owner and incompatible evidence rather than falling back to URL method claims", async () => {
  mocks.snapshot = economicsStrategyFixture("someone-else").snapshot;
  const page = render(<App entry="/training?studyTopic=1.5&method=feynman" />); await screen.findByText(/Accepted evidence for this guidance is unavailable/);
  expect(panel().queryByText("Feynman Technique")).toBeNull(); page.unmount();
  const f = economicsStrategyFixture();
  const data = f.row.data as { objectiveEvidence: { activities: { contentSetId: string }[] } };
  data.objectiveEvidence.activities[0].contentSetId = data.objectiveEvidence.activities[0].contentSetId.replace("memory-palace", "derive-basics"); mocks.snapshot = f.snapshot;
  render(<App entry="/training?studyTopic=1.5&method=derive-basics" />); await screen.findByText(/Accepted evidence for this guidance is unavailable/);
  expect(panel().queryByRole("button", { name: "Use this topic" })).toBeNull(); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("clears A's selected topic immediately on account change and fences old success/error callbacks", async () => {
  const oldA = deferred(), b = deferred(); mocks.read.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(b.promise);
  const page = render(<App entry="/training?studyTopic=1.5" />); await screen.findByText(/Checking your current accepted/);
  mocks.auth.currentUser = { uid: "strategy-student-b" } as User; page.rerender(<App entry="/training?studyTopic=1.5" />);
  await waitFor(() => expect(mocks.read).toHaveBeenCalledWith("strategy-student-b"));
  await act(async () => b.resolve(economicsStrategyFixture("strategy-student-b", "1.5", false).snapshot));
  expect(panel().getByText("Task-based suggestion · not personalised performance evidence")).toBeTruthy();
  await act(async () => oldA.resolve(economicsStrategyFixture().snapshot));
  expect(panel().queryByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeNull();
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  expect(content().getByLabelText("Economics topic")).toHaveProperty("value", "1.5");
  mocks.auth.currentUser = { uid: "strategy-student-a" } as User; const newA = deferred(); mocks.read.mockReturnValueOnce(newA.promise);
  page.rerender(<App entry="/training?studyTopic=1.5" />);
  expect(content().getByLabelText("Training subject")).toHaveProperty("value", "general");
  await act(async () => newA.reject(new Error("PRIVATE ERROR")));
  expect(panel().getByRole("alert").textContent).toContain("could not be checked safely");
  expect(screen.queryByText(/PRIVATE ERROR|PRIVATE SYNTHETIC REFLECTION/)).toBeNull();
  mocks.auth.currentUser = null; page.rerender(<App entry="/training?studyTopic=1.5" />);
  expect(screen.queryByRole("region", { name: "A next step from your Learning Profile" })).toBeNull();
  expect(mocks.reserve).not.toHaveBeenCalled();
});

it("withholds failed reads, supports retry, and recomputes from the successful response", async () => {
  mocks.read.mockRejectedValueOnce(new Error("PRIVATE READ")); render(<App entry="/training?studyTopic=2.2" />);
  await screen.findByRole("alert"); expect(panel().queryByRole("button", { name: "Use this topic" })).toBeNull();
  mocks.snapshot = economicsStrategyFixture("strategy-student-a", "2.2").snapshot;
  fireEvent.click(panel().getByRole("button", { name: "Retry guidance" })); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByRole("heading", { name: "Relate PED to expenditure" })).toBeTruthy();
});

it("ignores late read failures after another account loads and after the route unmounts", async () => {
  const old = deferred(); mocks.read.mockReturnValueOnce(old.promise);
  const page = render(<App entry="/training?studyTopic=2.2" />); await screen.findByText(/Checking your current accepted/);
  mocks.auth.currentUser = { uid: "strategy-student-b" } as User; mocks.snapshot = economicsStrategyFixture("strategy-student-b", "2.2").snapshot;
  page.rerender(<App entry="/training?studyTopic=2.2" />); await screen.findByRole("button", { name: "Use this topic" });
  await act(async () => old.reject(new Error("PRIVATE OLD ACCOUNT FAILURE")));
  expect(panel().queryByRole("alert")).toBeNull(); expect(panel().getByRole("heading", { name: "Relate PED to expenditure" })).toBeTruthy();
  page.unmount(); const unmounted = deferred(); mocks.read.mockReturnValueOnce(unmounted.promise);
  const next = render(<App entry="/training?studyTopic=2.2" />); await screen.findByText(/Checking your current accepted/); next.unmount();
  await act(async () => unmounted.reject(new Error("PRIVATE UNMOUNTED FAILURE")));
  expect(screen.queryByText(/PRIVATE/)).toBeNull(); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("keeps pending acceptance separate from advice based on an earlier synthetic publication", async () => {
  mocks.snapshot!.strategyEvidence!.scope = "published-generation"; mocks.snapshot!.strategyEvidence!.pendingAcceptedSessions = 2;
  render(<App entry="/training?studyTopic=1.5" />); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByText(/Newer accepted sessions awaiting profile preparation/)).toBeTruthy();
  expect(panel().getByText(/not a real-student publication/)).toBeTruthy();
});

it.each(["", "?studyTopic=unknown", "?studyTopic=1.5&studyTopic=2.2"])("does not read or interpret malformed/missing topic hints: %s", async search => {
  render(<App entry={`/training${search}`} />);
  await act(async () => {}); expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  expect(screen.queryByRole("region", { name: "A next step from your Learning Profile" })).toBeNull();
});

it("requires explicit development opt-in and an isolated reader configuration", async () => {
  vi.stubEnv("VITE_STUDY_TRAINING_GUIDANCE", ""); expect(studyTrainingLink("1.5")).toBe("/training");
  const page = render(<App entry="/training?studyTopic=1.5" />); await act(async () => {}); expect(mocks.read).not.toHaveBeenCalled(); page.unmount();
  vi.stubEnv("VITE_STUDY_TRAINING_GUIDANCE", "emulator-only"); mocks.local = false;
  const off = render(<App entry="/training?studyTopic=1.5" />); await act(async () => {}); expect(mocks.read).not.toHaveBeenCalled(); off.unmount();
  vi.stubEnv("DEV", false); mocks.local = true;
  const production = render(<App entry="/training?studyTopic=1.5" />); await act(async () => {}); expect(mocks.read).not.toHaveBeenCalled(); expect(studyTrainingLink("1.5")).toBe("/training");
  production.unmount(); rememberSuggestion(); render(<App entry="/training/choose?economics=1.5" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull(); expect(screen.getByText("0 / 3 selected")).toBeTruthy();
  expect(studyTrainingTopic("?studyTopic=1.5&method=invalid")).toBe("1.5");
});

it.each(["1.5", "2.2"])("marks the eligible %s method without preselecting, injecting or making another evidence request", async topic => {
  mocks.snapshot = economicsStrategyFixture("strategy-student-a", topic).snapshot;
  render(<App entry={`/training?studyTopic=${topic}`} />); await screen.findByRole("button", { name: "Use this topic" });
  expect(panel().getByText(/selects the whole topic only, not a method/)).toBeTruthy();
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  const reads = mocks.read.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Choose methods" })); await screen.findByRole("heading", { name: "Choose your methods" });
  const badge = screen.getByText("Suggested by your Learning Profile"), checkbox = badge.closest("button")!;
  expect(within(checkbox).getByText(topic === "1.5" ? "Feynman Technique" : /^divide steps$/i)).toBeTruthy();
  expect(checkbox.getAttribute("aria-checked")).toBe("false"); expect(checkbox.disabled).toBe(false);
  expect(screen.getByText("0 / 3 selected")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start training" })).toHaveProperty("disabled", true);
  expect(screen.getAllByRole("checkbox").every(option => option.getAttribute("aria-checked") === "false")).toBe(true);
  expect(mocks.read).toHaveBeenCalledTimes(reads); expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  // The student can choose a different method; the suggestion is never submitted.
  fireEvent.click(screen.getByRole("checkbox", { name: /Active Recall/i }));
  fireEvent.click(screen.getByRole("button", { name: "Start training" })); await screen.findByText("Existing assessment route");
  expect(mocks.reserve).toHaveBeenCalledTimes(1);
  expect(mocks.reserve).toHaveBeenCalledWith(mocks.auth.currentUser, expect.objectContaining({ mode: "manual", methodIds: ["active-recall"] }));
});

it("clears an accepted hint when dismissed, retaining the selected topic but not a suggested method", async () => {
  render(<App entry="/training?studyTopic=1.5" />); await screen.findByRole("button", { name: "Use this topic" });
  fireEvent.click(panel().getByRole("button", { name: "Use this topic" }));
  fireEvent.click(panel().getByRole("button", { name: "Dismiss guidance" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose methods" })); await screen.findByRole("heading", { name: "Choose your methods" });
  expect(content().getByLabelText("Economics topic")).toHaveProperty("value", "1.5");
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull(); expect(screen.getByText("0 / 3 selected")).toBeTruthy();
  expect(mocks.reserve).not.toHaveBeenCalled();
});

function rememberSuggestion(methodId: TrainingMethodId = "feynman") {
  const result = recommendEconomicsStudy("strategy-student-a", "1.5", mocks.snapshot!.strategyEvidence!.rows);
  if (result.status !== "recommended") throw new Error("Fixture must produce a recommendation.");
  rememberStudyMethodSuggestion(mocks.auth.currentUser!, "strategy-student-a", { ...result.recommendation, methodId });
}

it("omits unsupported and currently unaffordable suggestions without changing the options or selections", () => {
  rememberSuggestion("derive-basics");
  const first = render(<App entry="/training/choose?economics=1.5" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull();
  const unavailable = screen.getAllByRole("checkbox").find(option => option.textContent?.includes("derive basics"));
  expect(unavailable).toHaveProperty("disabled", true); expect(screen.getByText("0 / 3 selected")).toBeTruthy(); first.unmount();
  rememberSuggestion(); mocks.remaining = 0;
  render(<App entry="/training/choose?economics=1.5" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull(); expect(screen.getByText("0 / 3 selected")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start training" })).toHaveProperty("disabled", true); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("does not consume the owner-scoped hint while the method picker's access hook is initially loading", () => {
  rememberSuggestion(); mocks.accessLoading = true;
  const page = render(<App entry="/training/choose?economics=1.5" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull();
  mocks.accessLoading = false; page.rerender(<App entry="/training/choose?economics=1.5" />);
  expect(screen.getByText("Suggested by your Learning Profile")).toBeTruthy();
  expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("expires a stale hint and ignores a method supplied in the URL", () => {
  rememberSuggestion();
  const page = render(<App entry="/training/choose?economics=1.5&method=feynman" />);
  expect(screen.getByText("Suggested by your Learning Profile")).toBeTruthy();
  const later = Date.now() + 10 * 60 * 1000;
  vi.spyOn(Date, "now").mockReturnValue(later); page.rerender(<App entry="/training/choose?economics=1.5&method=feynman" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull(); expect(screen.getByText("0 / 3 selected")).toBeTruthy();
  expect(mocks.read).not.toHaveBeenCalled();
});

it("removes an expired badge while the method picker stays open", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-06T01:00:00.000Z"));
  rememberSuggestion(); render(<App entry="/training/choose?economics=1.5" />);
  expect(screen.getByText("Suggested by your Learning Profile")).toBeTruthy();
  act(() => { vi.advanceTimersByTime(10 * 60 * 1000); });
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull(); expect(screen.getByText("0 / 3 selected")).toBeTruthy();
  expect(mocks.reserve).not.toHaveBeenCalled();
});

it("drops hints on owner or topic change and does not resurrect them on return", () => {
  rememberSuggestion(); const page = render(<App entry="/training/choose?economics=1.5" />);
  expect(screen.getByText("Suggested by your Learning Profile")).toBeTruthy();
  mocks.auth.currentUser = { uid: "strategy-student-b" } as User; page.rerender(<App entry="/training/choose?economics=1.5" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull();
  mocks.auth.currentUser = { uid: "strategy-student-a" } as User; page.rerender(<App entry="/training/choose?economics=1.5" />);
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull();
  rememberSuggestion(); page.rerender(<App entry="/training/choose?economics=1.5" />);
  expect(screen.getByText("Suggested by your Learning Profile")).toBeTruthy();
  fireEvent.change(content().getByLabelText("Economics topic"), { target: { value: "2.2" } });
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull();
  fireEvent.change(content().getByLabelText("Economics topic"), { target: { value: "1.5" } });
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull(); expect(mocks.reserve).not.toHaveBeenCalled();
});

it("omits the indicator when other selected methods fill the remaining slots, without changing the student's selection", () => {
  rememberSuggestion(); mocks.remaining = 1;
  render(<App entry="/training/choose?economics=1.5" />); expect(screen.getByText("Suggested by your Learning Profile")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: /Active Recall/i }));
  expect(screen.queryByText("Suggested by your Learning Profile")).toBeNull();
  expect(screen.getByRole("checkbox", { name: /Active Recall/i }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("checkbox", { name: /Feynman Technique/i }).getAttribute("aria-checked")).toBe("false");
  expect(mocks.reserve).not.toHaveBeenCalled();
});
