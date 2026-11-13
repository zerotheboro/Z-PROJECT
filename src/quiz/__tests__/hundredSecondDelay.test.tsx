// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TrainingInternalState } from "../trainingProgress";
const mock = vi.hoisted(() => ({ start: vi.fn(), done: vi.fn(), remaining: 3, hidden: false, saved: {} as TrainingInternalState }));
vi.mock("../../firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("../../HEADER/header", () => ({ default: () => <nav>Existing navigation</nav> }));
vi.mock("../../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ loading: false, error: null, user: null, unlimited: false, manualMethodsRemaining: mock.remaining, refreshAccess: vi.fn() }) }));
// Exercise actual session creation, guest quota validation and browser draft
// persistence. Only observe the call; do not replace registration with success.
vi.mock("../../services/startTrainingSession", async original => {
  const module = await original<typeof import("../../services/startTrainingSession")>();
  return { ...module, startTrainingSession: async (...args: Parameters<typeof module.startTrainingSession>) => { mock.start(...args); return module.startTrainingSession(...args); } };
});
import ChooseMethods from "../ChooseMethods";
import MethodLab from "../sections/MethodLab";
import { getMethodDefinition } from "../methodRegistry";
import { TrainingProgressStateProvider } from "../trainingProgressState";
import { TimedActivityIdentity } from "../timedActivities/TimedActivityIdentity";
import { activityKey } from "../timedActivities/commitment";
import { economicsAssignments } from "../economics9708/allocation";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { economicsPacks } from "../economics9708/packs";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import { trainingAnswerBindings } from "../trainingDraftValidation";
import { loadTrainingAccess } from "../../services/trainingAccess";
import { readLocalTrainingDraft } from "../../services/trainingProgress";

const method = "hundred-second-delay", identity = { owner: "guest", project: "demo-delay", sessionId: "hundred-second-session" };
function LiveLab({ topic = "1.5", phase = "lab", owner = identity.owner, sessionId = identity.sessionId }: { topic?: string; phase?: "lab" | "match"; owner?: string; sessionId?: string }) {
  const [state, setState] = useState(mock.saved);
  const id = economicsAssignments([method], phase, topic, "mapped-1")[0];
  return <TimedActivityIdentity value={{ ...identity, owner, sessionId }}><TrainingProgressStateProvider state={state}
    onChange={next => { mock.saved = next; setState(next); }}>
    {phase === "lab" ? <MethodLab methods={[method]} economicsTopicId={topic} economicsActivityVersion="mapped-1" onComplete={mock.done} />
      : getMethodDefinition(method).renderMatch(id, .5, mock.done)}
  </TrainingProgressStateProvider></TimedActivityIdentity>;
}
function RegisteredLab() { const location = useLocation(); return <LiveLab sessionId={new URLSearchParams(location.search).get("resume")!} />; }
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const timerKey = (topic = "1.5", phase: "lab" | "match" = "lab") => activityKey(identity, `hundred-second-delay:${phase}:${method}:${economicsAssignments([method], phase, topic, "mapped-1")[0]}`);
const timer = () => JSON.parse(localStorage.getItem(timerKey())!).timer;
function visibility(hidden: boolean) { act(() => { mock.hidden = hidden; document.dispatchEvent(new Event("visibilitychange")); }); }
function wait(ms: number) { act(() => vi.advanceTimersByTime(ms)); }
function answers(topic = "1.5", phase: "lab" | "match" = "lab") {
  const id = economicsAssignments([method], phase, topic, "mapped-1")[0], questions = resolveEconomicsAssessment(id).scored;
  questions.forEach((q, index) => { click(q.correct); click(index < questions.length - 1 ? "Next question" : "Finish test"); });
  return questions;
}
function ratings() {
  for (const prompt of ["How confident were you?", "How manageable was the delay?", "Would you use 100-SECOND DELAY?"])
    fireEvent.click(within(screen.getByRole("heading", { name: prompt }).nextElementSibling as HTMLElement).getByRole("button", { name: "3" }));
  click("Complete experiment");
}
beforeEach(() => {
  localStorage.clear(); mock.saved = {}; mock.hidden = false; mock.remaining = 3; vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T10:00:00.000Z"));
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => mock.hidden ? "hidden" : "visible");
  mock.start.mockResolvedValue({ sessionId: identity.sessionId });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("selects 100-SECOND DELAY in the real Memory grid, uses normal allowance/startup and completes the ordinary Method Lab", async () => {
  render(<MemoryRouter initialEntries={["/training/choose?economics=1.5"]}><Routes>
    <Route path="/training/choose" element={<ChooseMethods />} />
    <Route path="/training/assessment" element={<RegisteredLab />} />
  </Routes></MemoryRouter>);
  const card = within(screen.getByRole("region", { name: "memory" })).getByRole("checkbox", { name: /100-SECOND DELAY/ });
  expect(card.className).toBe("method-picker-card"); expect(card.parentElement?.className).toBe("method-picker-grid");
  expect(screen.queryByText(/POST-SLEEP|OWNER PREVIEW|No saved delayed check/)).toBeNull();
  fireEvent.click(card); expect(card.getAttribute("aria-checked")).toBe("true"); expect(screen.getByText("1 / 3 selected")).toBeTruthy();
  await act(async () => { click("Start training"); await Promise.resolve(); });
  expect(mock.start).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ mode: "manual", methodIds: [method], economicsTopicId: "1.5" }));
  expect(readLocalTrainingDraft({ kind: "guest" })).toMatchObject({ valid: true, draft: { selectedMethods: [method] } });
  expect(await loadTrainingAccess(null)).toMatchObject({ usage: { manualMethodsStarted: 1 } });
  expect(document.querySelector("img")).not.toBeNull(); expect(document.querySelector(".study-content")?.textContent).toContain("opportunity");
  click("I'm ready"); expect(screen.getByRole("timer").textContent).toBe("1:40");
  expect(document.querySelector("img, .study-content, [data-supplemental-material]")).toBeNull();
  const questions = resolveEconomicsAssessment(economicsAssignments([method], "lab", "1.5", "mapped-1")[0]).scored;
  for (const q of questions) expect(document.body.textContent).not.toContain(q.question);
  wait(99_999); expect(screen.getByRole("timer").textContent).toBe("0:01"); expect(screen.queryByRole("button", { name: "Finish test" })).toBeNull();
  wait(1); expect(screen.queryByRole("timer")).toBeNull(); expect(screen.getByText(questions[0].question)).toBeTruthy();
  expect(document.querySelector("img, .study-content")).toBeNull(); answers(); ratings();
  expect(mock.done).toHaveBeenCalledExactlyOnceWith({ experiments: [expect.objectContaining({ method, category: "memory", correct: 3, total: 3, score: 1 })] });
  expect(await loadTrainingAccess(null)).toMatchObject({ usage: { manualMethodsStarted: 1 } });
});
it.each(economicsPacks)("uses the existing objective-matched Lab questions and illustration for $topicId", pack => {
  render(<LiveLab topic={pack.topicId} />); expect(document.querySelector("img")).not.toBeNull();
  click("I'm ready"); wait(100_000); answers(pack.topicId); ratings();
  expect(mock.done).toHaveBeenCalledWith({ experiments: [expect.objectContaining({ method, score: 1, correct: 3, total: 3 })] });
});
it("preserves independent Match content, original Lab score and the verification result contract", () => {
  render(<LiveLab phase="match" />); click("I'm ready"); wait(100_000); const match = answers("1.5", "match"); click("3"); click("Complete verification");
  const lab = resolveEconomicsAssessment(economicsAssignments([method], "lab", "1.5", "mapped-1")[0]).scored;
  expect(match.every(q => !lab.some(item => item.id === q.id))).toBe(true);
  expect(mock.done).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ method, firstScore: .5, verificationScore: 1 }));
});
it("enforces the normal selected-method allowance, including zero remaining tests", () => {
  mock.remaining = 0; render(<MemoryRouter><ChooseMethods /></MemoryRouter>);
  fireEvent.click(screen.getByRole("checkbox", { name: /100-SECOND DELAY/ }));
  expect(screen.getByRole("checkbox", { name: /100-SECOND DELAY/ }).getAttribute("aria-checked")).toBe("false");
  expect(screen.getByRole("button", { name: "Start training" })).toHaveProperty("disabled", true); expect(mock.start).not.toHaveBeenCalled();
});
it("applies the 1.5-second grace, both warnings and third-exit invalidation only during the wait, then restarts from study", () => {
  render(<LiveLab />); visibility(true); wait(2000); visibility(false);
  expect(localStorage.getItem(timerKey())).toBeNull(); expect(screen.queryByRole("alert")).toBeNull();
  click("I'm ready"); visibility(true); wait(1499); visibility(false); expect(timer().exits).toBe(0);
  visibility(true); wait(2000); visibility(false); expect(screen.getByRole("alert").textContent).toContain("First interruption");
  visibility(true); wait(2000); visibility(false); expect(screen.getByRole("alert").textContent).toContain("Final warning");
  visibility(true); wait(2000); visibility(false); expect(timer().status).toBe("invalid"); expect(timer().exits).toBe(3);
  const root = timer().rootAttempt; wait(100_000); expect(mock.done).not.toHaveBeenCalled(); expect(document.querySelector("img")).toBeNull();
  click("Restart from the study passage"); expect(document.querySelector("img")).not.toBeNull(); expect(screen.queryByRole("timer")).toBeNull();
  click("I'm ready"); expect(screen.getByRole("timer").textContent).toBe("1:40"); expect(timer()).toMatchObject({ attempt: 2, rootAttempt: root, exits: 0 });
  wait(100_000); answers(); ratings(); expect(mock.done).toHaveBeenCalledTimes(1);
});
it("expires at the original deadline while hidden, never reveals questions until return, and stops monitoring after the wait", () => {
  render(<LiveLab />); click("I'm ready"); const deadline = timer().deadline;
  visibility(true); wait(105_000); expect(timer()).toMatchObject({ deadline, endedAt: deadline, exits: 1, status: "finished" });
  expect(screen.getByRole("timer").textContent).toBe("0:00"); expect(screen.queryByRole("button", { name: "Next question" })).toBeNull();
  visibility(false); expect(screen.queryByRole("timer")).toBeNull();
  for (let i = 0; i < 3; i++) { visibility(true); wait(2000); visibility(false); }
  expect(timer().exits).toBe(1); answers(); ratings(); expect(mock.done).toHaveBeenCalledTimes(1);
});
it("recovers a refreshed draft without changing its deadline or exits and validates the new saved answer bindings", () => {
  const draft = createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", selectedMethods: [method], economicsTopicId: "1.5", economicsActivityVersion: "mapped-1", sessionId: identity.sessionId });
  const page = render(<LiveLab />); click("I'm ready"); const deadline = timer().deadline;
  page.unmount(); wait(6000); render(<LiveLab />);
  expect(screen.getByRole("timer").textContent).toBe("1:34"); expect(timer()).toMatchObject({ deadline, exits: 1 });
  expect(document.querySelector("img, .study-content")).toBeNull();
  draft.internalState = { ...draft.internalState, ...mock.saved };
  draft.section = 4; draft.phase = "lab"; draft.labContentSetIds = economicsAssignments([method], "lab", "1.5", "mapped-1");
  draft.completed.methodIntroduction = { methods: [method], correct: 1, total: 1, score: 1 };
  const validation = validateTrainingDraft(draft);
  expect(validation.valid, validation.valid ? "" : validation.reason).toBe(true);
  expect(trainingAnswerBindings(method, "lab")).toEqual([{ answerSlot: 1, role: "scored" }]);
  wait(94_000); answers(); ratings(); expect(mock.done).toHaveBeenCalledTimes(1);
});
it("recovers the interruption between timer start and draft-stage persistence without exposing study material or resetting time", () => {
  const page = render(<LiveLab />); click("I'm ready"); const deadline = timer().deadline;
  page.unmount(); wait(6000);
  const scope = `lab:${method}:${economicsAssignments([method], "lab", "1.5", "mapped-1")[0]}`;
  mock.saved = { ...mock.saved, [scope]: { ...mock.saved[scope], slots: mock.saved[scope].slots.map((value, index) => index === 0 ? "study" : value) } };
  render(<LiveLab />); expect(screen.getByRole("timer").textContent).toBe("1:34");
  expect(timer().deadline).toBe(deadline); expect(document.querySelector("img, .study-content, [data-supplemental-material]")).toBeNull();
});
it("rejects missing timer state instead of treating a restored waiting draft as completed", () => {
  const page = render(<LiveLab />); click("I'm ready"); page.unmount(); localStorage.removeItem(timerKey());
  render(<LiveLab />); expect(screen.getByRole("alert").textContent).toContain("unavailable");
  expect(document.querySelector("img, .study-content")).toBeNull(); expect(mock.done).not.toHaveBeenCalled();
  click("Restart from the study passage"); click("I'm ready"); expect(screen.getByRole("timer").textContent).toBe("1:40");
});
it("does not reuse another owner's countdown or reveal questions when the owner changes", () => {
  const page = render(<LiveLab />); click("I'm ready"); const deadline = timer().deadline;
  page.rerender(<LiveLab owner="another-student" />);
  expect(screen.getByRole("alert").textContent).toContain("unavailable");
  expect(document.querySelector("img, .study-content")).toBeNull(); expect(mock.done).not.toHaveBeenCalled();
  expect(timer().deadline).toBe(deadline);
});
