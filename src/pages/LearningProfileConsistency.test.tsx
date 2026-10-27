// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { ManualHistoryPage } from "../services/manualTrainingHistory";
import { savedProfileConsistencyFixture } from "../../test-support/savedProfileConsistencyFixture";

const mock = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, listener: null as ((user: User | null) => void) | null, profileRead: vi.fn(), historyRead: vi.fn() }));
vi.mock("../firebase", () => ({ auth: mock.auth, db: {} }));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: (_: unknown, listener: typeof mock.listener) => { mock.listener = listener; return () => {}; } }));
vi.mock("../services/user", () => ({ getLearningProfile: (uid: string) => mock.profileRead(uid) }));
vi.mock("../services/manualTrainingHistory", async original => ({ ...await original<typeof import("../services/manualTrainingHistory")>(), loadManualTrainingHistory: (...args: unknown[]) => mock.historyRead(...args) }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => null }));
vi.mock("../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock("../MIDSECTION/section_of_each_tips.jsx", () => ({ default: () => null }));
vi.mock("./Library", () => ({ default: () => null }));
vi.mock("./Training", () => ({ default: () => null }));
vi.mock("./Shorts", () => ({ default: () => null }));
vi.mock("../quiz/Assessment", () => ({ default: () => null }));
vi.mock("../quiz/ChooseMethods", () => ({ default: () => null }));
import AppRouter from "../AppRouter.jsx";

const fixture = () => savedProfileConsistencyFixture("consistency-student");
function signIn(uid: string | null) { act(() => { mock.auth.currentUser = uid ? { uid } as User : null; mock.listener!(mock.auth.currentUser); }); }
function mount() { window.history.replaceState({}, "", "/#/training/profile"); render(<AppRouter />); signIn("consistency-student"); }
function sections() {
  return { overview: within(screen.getByRole("region", { name: "Learning Overview" })), evidence: within(screen.getByRole("region", { name: "Study Method Evidence" })),
    history: within(screen.getByRole("region", { name: "Learning History" })), progress: within(screen.getByRole("region", { name: "Progress Over Time" })) };
}
function checkAllFour() {
  const s = sections();
  for (const [label, value] of [["Saved Test Me assessments (loaded)", "1"], ["Individual practice sessions (loaded)", "2"], ["Methods in latest Test Me snapshot", "4"], ["Task observations in loaded history", "10"]])
    expect(s.overview.getByText(label).nextElementSibling?.textContent).toBe(value);
  const recall = within(s.evidence.getByRole("article", { name: "Active Recall evidence" }));
  fireEvent.click(recall.getByText("2 saved individual practice sessions"));
  expect(recall.getByText("2 individual practice attempts · 2 saved sessions (loaded).")).toBeTruthy();
  const practice = within(recall.getByRole("region", { name: "Legacy individual practice results" }));
  expect(practice.getByText("4 recorded task observations. Practice and follow-up tasks stay separate.")).toBeTruthy();
  expect(practice.getAllByText("Legacy individual practice")).toHaveLength(2);
  expect(practice.getByText("25%")).toBeTruthy(); expect(practice.getByText("100%")).toBeTruthy();
  expect(practice.getByText("50%")).toBeTruthy(); expect(practice.getByText("75%")).toBeTruthy();
  expect(recall.getByText("Latest Test Me snapshot")).toBeTruthy();
  expect(recall.getByText("1 saved Test Me assessment record (loaded)")).toBeTruthy();
  const history = s.history.getByRole("region", { name: "Saved Training history" });
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(3);
  const historyKeys = new Set([...history.querySelectorAll(".cumulative-history > li")].map(row => row.getAttribute("data-history-key")));
  for (const row of practice.getAllByRole("listitem")) expect(historyKeys.has(row.getAttribute("data-history-key"))).toBe(true);
  expect(within(history).getByRole("heading", { name: /Individual Training · Oct 21, 2026/ })).toBeTruthy();
  expect(within(history).getByRole("heading", { name: /Individual Training · Oct 20, 2026/ })).toBeTruthy();
  expect(s.progress.getByText("Not enough comparable results yet.")).toBeTruthy();
  expect(s.progress.getByText("Your practice sessions are saved. As you complete more comparable assessments, your progress trends will appear here.")).toBeTruthy();
  expect(s.progress.getByText("10 observations recorded")).toBeTruthy();
  expect(s.progress.queryByText(/excluded from progress charts|scoring versions|question exposure/)).toBeNull();
  expect(s.progress.queryByRole("img")).toBeNull();
  expect(screen.queryByText(/PRIVATE consistency-student/)).toBeNull();
  return { s, recall, history };
}
beforeEach(() => {
  mock.auth.currentUser = null; mock.profileRead.mockReset().mockResolvedValue(fixture().profile); mock.historyRead.mockReset().mockResolvedValue(fixture().page);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(cleanup);

it("the actual HashRouter student profile uses one saved-session fixture consistently across all four sections", async () => {
  mount(); await screen.findByText("2 individual practice attempts · 2 saved sessions (loaded).");
  checkAllFour(); expect(window.location.hash).toBe("#/training/profile");
  expect(mock.profileRead).toHaveBeenCalledWith("consistency-student"); expect(mock.historyRead).toHaveBeenCalledWith("consistency-student");
});
it("refresh updates changed scores in both Method Evidence and History, clears Reflection, and never duplicates attempts", async () => {
  mount(); await screen.findByText("2 individual practice attempts · 2 saved sessions (loaded).");
  const { history } = checkAllFour(), details = history.querySelector("details")!; details.setAttribute("open", "");
  fireEvent.click(within(details).getByRole("button", { name: "Show private reflection" }));
  expect(screen.getByText("PRIVATE consistency-student practice 2")).toBeTruthy();
  const next = fixture(), payload = JSON.parse(next.records[1].payloadJSON);
  payload.methodLab.experiments[0].score = 0.5; payload.methodLab.experiments[0].correct = 2;
  payload.methodMatch.methods[0].firstScore = 0.5; payload.methodMatch.methods[0].verificationScore = 0.25;
  next.page.records[1] = { ...next.records[1], payloadJSON: JSON.stringify(payload) }; mock.historyRead.mockResolvedValue(next.page);
  fireEvent.click(within(history).getByRole("button", { name: "Refresh Training history" }));
  await waitFor(() => expect(sections().evidence.getByText("2 individual practice attempts · 2 saved sessions (loaded).")).toBeTruthy());
  const s = sections(), card = within(s.evidence.getByRole("article", { name: "Active Recall evidence" }));
  const practice = within(card.getByRole("region", { name: "Legacy individual practice results" })); expect(practice.queryByText("100%")).toBeNull(); expect(practice.getAllByText("50%")).toHaveLength(2);
  const updatedHistory = s.history.getByRole("region", { name: "Saved Training history" }); expect(updatedHistory.querySelectorAll(".cumulative-history > li")).toHaveLength(3);
  const first = updatedHistory.querySelector<HTMLDetailsElement>("li > details")!; first.setAttribute("open", ""); expect(within(first).getByText("50%")).toBeTruthy();
  expect(screen.queryByText("PRIVATE consistency-student practice 2")).toBeNull();
  expect(s.overview.getByText("Task observations in loaded history").nextElementSibling?.textContent).toBe("10");
  expect(s.progress.getByText("10 observations recorded")).toBeTruthy();
});
it("individual-only saved practice appears in Method Evidence even without a latest Test Me snapshot", async () => {
  const f = fixture(); mock.profileRead.mockResolvedValue(null); mock.historyRead.mockResolvedValue({ ...f.page, assessments: [] });
  mount(); await screen.findByText("2 individual practice attempts · 2 saved sessions (loaded).");
  const s = sections(); expect(s.evidence.getByRole("article", { name: "Active Recall evidence" })).toBeTruthy();
  expect(s.overview.getByText("Saved Test Me assessments (loaded)").nextElementSibling?.textContent).toBe("0");
  expect(s.overview.getByText("Methods in latest Test Me snapshot").nextElementSibling?.textContent).toBe("Not recorded");
  expect(s.history.getByRole("region", { name: "Saved Training history" }).querySelectorAll(".cumulative-history > li")).toHaveLength(2);
  expect(s.progress.getByText("4 observations recorded")).toBeTruthy();
});
it("account switching and logout fence pending history reads across every section", async () => {
  mount(); await screen.findByText("2 individual practice attempts · 2 saved sessions (loaded).");
  let finishA!: (page: ManualHistoryPage) => void;
  mock.historyRead.mockReturnValueOnce(new Promise<ManualHistoryPage>(resolve => { finishA = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh Training history" }));
  await waitFor(() => expect(mock.historyRead).toHaveBeenCalledTimes(2));
  mock.profileRead.mockResolvedValue(null); mock.historyRead.mockResolvedValue({ ...fixture().page, records: [], assessments: [] });
  signIn("student-b");
  expect(screen.queryByRole("article", { name: "Active Recall evidence" })).toBeNull(); expect(screen.queryByText(/Individual Training · Oct 2/)).toBeNull();
  await screen.findByRole("heading", { name: "You don't have a learning profile yet." });
  await act(async () => finishA(fixture().page)); expect(screen.queryByRole("article", { name: "Active Recall evidence" })).toBeNull();
  signIn(null); await screen.findByRole("heading", { name: "Sign in to view your learning profile" }); expect(screen.queryByText(/PRIVATE consistency-student/)).toBeNull();
});
