// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { createTrainingDraft } from "../trainingProgress";
import { economicsEvidenceFixture } from "../../../test-support/economicsEvidenceFixtures";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { BASELINE_ANSWER_SLOTS, trainingAnswerBindings } from "../trainingDraftValidation";
import { listPostSleep, postSleepKey, postSleepQuestions, preparePostSleep, savePostSleep, scorePostSleep, validPostSleepTask, preparePostSleepPreview } from "./postSleepModel";
import { activityKey } from "./commitment";
import { economicsAssignments } from "../economics9708/allocation";
import { economicsContentId } from "../economics9708/selection";
import { isTrainingMethodId } from "../type";
const mock = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, listener: null as ((u: User | null) => void) | null, isolated: true, remaining: 3, start: vi.fn() }));
vi.mock("../../firebase", () => ({ auth: mock.auth, db: {} }));
vi.mock("../../HEADER/header", () => ({ default: () => <nav>Existing navigation</nav> }));
vi.mock("../../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ user: mock.auth.currentUser, loading: false, error: null, unlimited: false, manualMethodsRemaining: mock.remaining, refreshAccess: vi.fn() }) }));
vi.mock("../../services/startTrainingSession", () => ({ startTrainingSession: mock.start }));
vi.mock("../../services/auth", () => ({ subscribeToAuth: (f: typeof mock.listener) => { mock.listener = f; return () => { mock.listener = null; }; } }));
vi.mock("../../services/localTrainingCompletionConfig", () => ({ localCompletionConfig: () => ({ projectId: "demo-post-sleep" }) }));
vi.mock("../../services/localCumulativeProfile", () => ({ assertLocalProfileEnvironment: () => { if (!mock.isolated) throw new Error("Not isolated"); } }));
import PostSleepPanel, { postSleepEnabled, PostSleepScheduler } from "./PostSleepPanel";
import PostSleepPage from "./PostSleepPage";
const time = "2026-11-05T10:00:00.000Z";
const identity = { owner: "post-sleep-a", project: "demo-post-sleep", sessionId: "post-sleep-session" };
function completed(topic = "1.5", mode: "auto" | "manual" = "manual", count = 1) {
  const methods = (["memory-palace", "feynman", "active-recall", "cornell"] as const).slice(0, count);
  const req = economicsEvidenceFixture({ topic, methods, mode, sessionId: identity.sessionId, completedAt: time });
  const draft = createTrainingDraft({ owner: { kind: "user", uid: identity.owner }, sessionId: identity.sessionId, mode, selectedMethods: methods,
    economicsTopicId: topic, economicsActivityVersion: "mapped-1" });
  draft.verificationMethodOrder = req.methodMatch.methods.map(m => m.method).filter(isTrainingMethodId);
  draft.labContentSetIds = economicsAssignments(methods, "lab", topic, "mapped-1");
  draft.matchContentSetIds = economicsAssignments(draft.verificationMethodOrder, "match", topic, "mapped-1");
  draft.completed.methodLab = req.methodLab; draft.completed.methodMatch = req.methodMatch; draft.completed.reflection = req.reflection; draft.section = 7;
  if (mode === "auto") draft.baselineContentSetIds = { memory: economicsContentId(topic, "memory"), understanding: economicsContentId(topic, "understanding") };
  for (const activity of req.economicsResponses!.activities) {
    const form = resolveEconomicsAssessment(activity.contentSetId);
    const lab = draft.labContentSetIds.indexOf(activity.contentSetId), match = draft.matchContentSetIds.indexOf(activity.contentSetId);
    const scope = lab >= 0 ? `lab:${methods[lab]}:${activity.contentSetId}` : match >= 0 ? `match:${draft.verificationMethodOrder[match]}:${activity.contentSetId}` : "baseline";
    const slots = draft.internalState[scope]?.slots ?? [];
    const bindings = lab >= 0 ? trainingAnswerBindings(methods[lab], "lab") : match >= 0 ? trainingAnswerBindings(draft.verificationMethodOrder[match], "match") :
      [{ answerSlot: activity.contentSetId === draft.baselineContentSetIds.memory ? BASELINE_ANSWER_SLOTS.memory : BASELINE_ANSWER_SLOTS.understanding, role: "scored" as const }];
    for (const binding of bindings) slots[binding.answerSlot] = Object.fromEntries((binding.role === "scored" ? form.scored : form.practice).map(q => [q.id, q.correct]));
    draft.internalState[scope] = { slots, named: {} };
  }
  return draft;
}
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(time)); vi.stubEnv("VITE_POST_SLEEP_PILOT", "local-only");
  mock.auth.currentUser = { uid: identity.owner } as User; mock.isolated = true;
  mock.remaining = 3; mock.start.mockReset();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible"); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it.each([["1.5", "manual", 1], ["2.2", "manual", 3], ["1.5", "auto", 3], ["2.2", "auto", 4]] as const)("prepares %s %s %i from actual answer bindings, preserving all Training results", (topic, mode, count) => {
  const draft = completed(topic, mode, count), before = structuredClone(draft), task = preparePostSleep(draft, time, identity);
  expect(validPostSleepTask(task)).toBe(true); expect(task.questionIds.length).toBeGreaterThanOrEqual(3); expect(task.questionIds.length).toBeLessThanOrEqual(5);
  expect(task.questionIds.every(id => !task.sourceQuestionIds.includes(id))).toBe(true);
  expect(task.objectiveIds.every(id => id.startsWith(`ec9708-objective-${topic}.`))).toBe(true);
  expect(task.sourceCompletedAt).toBe(time); expect(task.availableAt).toBeGreaterThanOrEqual(Date.parse(time) + 12 * 3600_000);
  expect(new Date(task.availableAt).getDate()).not.toBe(new Date(time).getDate()); expect(draft).toEqual(before);
  const answers = Object.fromEntries(postSleepQuestions(task).map(q => [q.id, q.correct]));
  const result = scorePostSleep({ ...task, answers }, task.availableAt, false);
  expect(result.result?.correct).toBe(task.questionIds.length); expect(result.result?.comparison).toBe("unavailable-unreviewed-forms");
  expect(result.result?.authority).toBe("local-browser-task-performance"); expect(result).not.toHaveProperty("profileRevision");
});
it("rejects incomplete/history-only sources, wrong owners and repeated source IDs without fabricating questions", () => {
  const draft = completed(), task = preparePostSleep(draft, time, identity);
  expect(() => preparePostSleep(draft, time, { ...identity, owner: "b" })).toThrow();
  expect(() => preparePostSleep({ ...draft, internalState: {} }, time, identity)).toThrow();
  expect(validPostSleepTask({ ...task, questionIds: [...task.questionIds.slice(1), task.sourceQuestionIds[0]] })).toBe(false);
  expect(() => savePostSleep({ ...identity, owner: "b" }, task)).toThrow();
});
function save() { const task = preparePostSleep(completed(), time, identity); savePostSleep(identity, task); return task; }
function hub() { return render(<PostSleepPanel ownerUid={identity.owner} />); }
function start() { const task = save(); vi.setSystemTime(task.availableAt); hub(); fireEvent.click(screen.getByText("Start optional Post-Sleep check")); return task; }
it("offers after completion, restores pending tasks on Training and blocks starting before the overnight interval", () => {
  const draft = completed(), page = render(<PostSleepPanel draft={draft} completedAt={time} />);
  expect(screen.getByRole("status").textContent).toContain("Pending"); page.unmount(); hub();
  expect((screen.getByText("Available after the overnight interval") as HTMLButtonElement).disabled).toBe(true);
  expect(listPostSleep({ ...identity, owner: "b" })).toEqual([]);
});
it("finishes 3–5 questions with the existing renderer, preserving source scores and storing descriptive delayed results only", () => {
  const task = start();
  expect(screen.getByRole("timer").textContent).toBe("1:40");
  postSleepQuestions(task).forEach((q, i, qs) => { fireEvent.click(screen.getByRole("button", { name: q.correct }));
    fireEvent.click(screen.getByText(i === qs.length - 1 ? "Finish delayed check" : "Next question")); });
  expect(screen.getByText(/Delayed task result:/).textContent).toContain(`${task.questionIds.length} / ${task.questionIds.length}`);
  expect(screen.getByText(/No numerical gain/)).toBeTruthy();
  const stored = listPostSleep(identity)[0]; expect(stored.immediateResults).toEqual(task.immediateResults);
  expect(stored.sourceCompletedAt).toBe(time); expect(stored.result?.expired).toBe(false);
});
it("retains selected answers and the exact deadline on refresh and expires incomplete attempts honestly", () => {
  const task = save(); vi.setSystemTime(task.availableAt); const page = hub(); fireEvent.click(screen.getByText("Start optional Post-Sleep check"));
  fireEvent.click(screen.getByRole("button", { name: postSleepQuestions(task)[0].correct }));
  const timerKey = activityKey(identity, `post-sleep-timer:${task.id}`), deadline = JSON.parse(localStorage.getItem(timerKey)!).timer.deadline;
  page.unmount(); act(() => vi.advanceTimersByTime(6000)); hub();
  expect(screen.getByRole("timer").textContent).toBe("1:34");
  expect(listPostSleep(identity)[0].answers).toEqual({ [task.questionIds[0]]: postSleepQuestions(task)[0].correct });
  expect(JSON.parse(localStorage.getItem(timerKey)!).timer.deadline).toBe(deadline);
  act(() => vi.advanceTimersByTime(94_000));
  expect(listPostSleep(identity)[0].result?.answered).toBe(1); expect(listPostSleep(identity)[0].result?.expired).toBe(true);
});
it("records the original assessment deadline separately from a much later recovery timestamp", () => {
  const task = save(); vi.setSystemTime(task.availableAt); const page = hub(); fireEvent.click(screen.getByText("Start optional Post-Sleep check"));
  page.unmount(); act(() => vi.advanceTimersByTime(24 * 3600_000)); hub();
  const saved = listPostSleep(identity)[0];
  expect(saved.result?.assessedAt).toBe(new Date(task.availableAt + 100_000).toISOString());
  expect(saved.result?.recordedAt).toBe(new Date(task.availableAt + 24 * 3600_000).toISOString());
  expect(saved.result?.elapsedIntervalMs).toBe(task.availableAt + 100_000 - Date.parse(time));
});
it("recovers a failed result write without changing an early completion timestamp or discarding saved answers", () => {
  const task = save(); vi.setSystemTime(task.availableAt); const page = hub(); fireEvent.click(screen.getByText("Start optional Post-Sleep check"));
  act(() => vi.advanceTimersByTime(5000));
  const original = Storage.prototype.setItem;
  const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
    if (value.includes('"result":{')) throw new Error("Result write failed");
    return original.call(this, key, value);
  });
  postSleepQuestions(task).forEach((q, i, qs) => { fireEvent.click(screen.getByRole("button", { name: q.correct }));
    fireEvent.click(screen.getByText(i === qs.length - 1 ? "Finish delayed check" : "Next question")); });
  expect(screen.getByText(/Result write failed/)).toBeTruthy(); expect(listPostSleep(identity)[0].result).toBeNull();
  page.unmount(); failure.mockRestore(); act(() => vi.advanceTimersByTime(24 * 3600_000)); hub();
  const result = listPostSleep(identity)[0].result!;
  expect(result.assessedAt).toBe(new Date(task.availableAt + 5000).toISOString());
  expect(result.expired).toBe(false); expect(result.correct).toBe(task.questionIds.length);
});
it("preserves completed local results and rejects changed sources, scores or malformed stored records", () => {
  const task = save(), scored = scorePostSleep({ ...task, startedAt: task.availableAt }, task.availableAt + 100_000, true);
  savePostSleep(identity, scored);
  const before = localStorage.getItem(postSleepKey(identity, task));
  expect(() => savePostSleep(identity, task)).toThrow("original activity was preserved");
  expect(() => savePostSleep(identity, { ...scored, sourceCompletedAt: "2026-11-04T10:00:00.000Z" })).toThrow();
  expect(validPostSleepTask({ ...scored, result: { ...scored.result, correct: 99 } })).toBe(false);
  expect(validPostSleepTask({ ...task, immediateResults: [null] })).toBe(false);
  expect(validPostSleepTask({ ...task, objectiveIds: ["invented-objective"] })).toBe(false);
  expect(localStorage.getItem(postSleepKey(identity, task))).toBe(before);
});
it("invalidates at the third exit without a zero result; reviews the same objectives and restarts at 100 seconds", () => {
  start();
  for (let i = 0; i < 3; i++) { vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden"); act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(2000)); vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible"); act(() => document.dispatchEvent(new Event("visibilitychange"))); }
  expect(listPostSleep(identity)[0].result).toBeNull(); expect(screen.queryByRole("timer")).toBeNull();
  fireEvent.click(screen.getByText("Review learning material before restarting")); fireEvent.click(screen.getByText("Restart 100-second check"));
  expect(screen.getByRole("timer").textContent).toBe("1:40");
  const saved = listPostSleep(identity)[0]; expect(saved.restudied).toBe(true); expect(saved.invalidAttempts).toHaveLength(1); expect(saved.sourceSessionId).toBe(identity.sessionId);
});
it("allows an explicitly separate untimed accommodation without visibility monitoring or a comparative claim", () => {
  const task = save(); vi.setSystemTime(task.availableAt); hub();
  fireEvent.change(screen.getByLabelText("Timing accommodation"), { target: { value: "untimed-accommodation" } });
  fireEvent.click(screen.getByText("Start optional Post-Sleep check")); expect(screen.queryByRole("timer")).toBeNull();
  act(() => vi.advanceTimersByTime(300_000)); expect(listPostSleep(identity)[0].result).toBeNull();
  expect(listPostSleep(identity)[0].mode).toBe("untimed-accommodation");
});
it("hides the previous account immediately, rejects stale handlers and needs no unrelated evidence-reader flag", () => {
  const task = start(); mock.auth.currentUser = { uid: "b" } as User;
  fireEvent.click(screen.getByRole("button", { name: postSleepQuestions(task)[0].correct }));
  act(() => mock.listener?.(mock.auth.currentUser)); expect(screen.queryByText(/Post-Sleep · delayed practice/)).toBeNull();
  expect(listPostSleep(identity)[0].answers).toEqual({});
  mock.isolated = false; expect(postSleepEnabled()).toBe(true);
  vi.stubEnv("PROD", true); vi.stubEnv("DEV", false); mock.isolated = true; expect(postSleepEnabled()).toBe(false);
});
it("reports auto-queue storage failure without claiming a saved check", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  render(<PostSleepPanel draft={completed()} completedAt={time} />);
  expect(screen.getByRole("alert").textContent).toContain("Quota exceeded"); expect(listPostSleep(identity)).toEqual([]);
  expect(screen.queryByText(/Pending ? available/)).toBeNull();
});


it("opens the existing 100-second assessment immediately for local owner preview without altering the real pending task", () => {
  const real = save(), before = localStorage.getItem(postSleepKey(identity, real));
  vi.stubEnv("VITE_POST_SLEEP_PILOT", ""); render(<PostSleepPanel ownerUid={identity.owner} previewOnly />);
  expect(screen.getByRole("region", { name: "Post-Sleep · 100 Seconds" })).toBeTruthy();
  expect(screen.getByRole("timer").textContent).toBe("1:40");
  act(() => vi.advanceTimersByTime(99_000)); expect(screen.getByRole("timer").textContent).toBe("0:01");
  act(() => vi.advanceTimersByTime(1000)); expect(screen.getByText(/Preview complete:/)).toBeTruthy();
  expect(localStorage.getItem(postSleepKey(identity, real))).toBe(before); expect(listPostSleep(identity)).toHaveLength(1);
  expect(listPostSleep(identity)[0].startedAt).toBeNull();
});
it("rejects preview records and results through the real delayed-task save contract", () => {
  const preview = preparePostSleepPreview("2.2", identity);
  expect(validPostSleepTask(preview)).toBe(false); expect(() => savePostSleep(identity, preview)).toThrow();
  expect(scorePostSleep(preview, Date.now() + 100_000, true).result?.authority).toBe("owner-preview-only");
  expect(postSleepQuestions(preview).every(q => q.id.includes("-memory-"))).toBe(true); expect(listPostSleep(identity)).toEqual([]);
});
it("allows the local owner preview while signed out without creating a student session", () => {
  mock.auth.currentUser = null; render(<PostSleepPanel previewOnly />);
  expect(screen.getByRole("timer").textContent).toBe("1:40"); expect(listPostSleep(identity)).toEqual([]);
});

function methodRoute(entry = "/training/choose?economics=1.5") {
  return render(<MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/training/post-sleep/preview" element={<PostSleepPage ownerPreview />} />
  </Routes></MemoryRouter>);
}
it("queues a qualifying check without rendering permanent completion panels or preview controls", () => {
  const page = render(<PostSleepScheduler draft={completed()} completedAt={time} />);
  expect(page.container.textContent).toBe(""); expect(listPostSleep(identity)).toHaveLength(1);
  expect(listPostSleep(identity)[0].sourceCompletedAt).toBe(time);
});
it("keeps immediate owner preview on its separate local route, with no delayed task or result writes", () => {
  methodRoute("/training/post-sleep/preview?economics=2.2");
  expect(screen.getByRole("heading", { name: "Owner preview · 100 Seconds" })).toBeTruthy();
  expect(screen.getByRole("timer").textContent).toBe("1:40"); expect(listPostSleep(identity)).toEqual([]); expect(mock.start).not.toHaveBeenCalled();
});
