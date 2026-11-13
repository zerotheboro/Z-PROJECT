// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activityKey, advanceCommitment, readLocalActivity, startCommitment, validCommitment, writeLocalActivity } from "./commitment";
import { useCommitment } from "./useCommitment";
import { TimedActivityIdentity } from "./TimedActivityIdentity";
import TenMinuteWallStareExperiment from "../experiments/TenMinuteWallStareExperiment";
import TenMinuteWallStareMatch from "../matches/TenMinuteWallStareMatch";
import { wallStareExperiment } from "../methodLabData";
import { wallStareMatchData } from "../methodMatchData";

const identity = { owner: "demo-a", project: "demo-test", sessionId: "reset-session" };
let visibility = "visible";
function visible(value: string) { visibility = value; act(() => document.dispatchEvent(new Event("visibilitychange"))); }
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(10_000); visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility as DocumentVisibilityState); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("counts distinct confirmed exits, ignores duplicate events and short interruptions, then invalidates without scoring", () => {
  let timer = startCommitment(100_000, 0);
  timer = advanceCommitment(timer, 100, true);
  timer = advanceCommitment(timer, 1000, true);
  timer = advanceCommitment(timer, 1400, false);
  expect(timer.exits).toBe(0);
  for (let i = 1; i <= 3; i++) {
    timer = advanceCommitment(timer, i * 3000, true);
    timer = advanceCommitment(timer, i * 3000 + 100, true);
    timer = advanceCommitment(timer, i * 3000 + 1600, false);
    expect(timer.exits).toBe(i);
    expect(timer.status).toBe(i === 3 ? "invalid" : "running");
  }
  const after = advanceCommitment(timer, 200_000, false);
  expect(after).toEqual(timer); expect(after).not.toHaveProperty("score");
});
it("expires using the original deadline while hidden, never counts pre-start or post-finish exits", () => {
  const start = startCommitment(100_000, 0);
  const hidden = advanceCommitment(start, 10_000, true);
  const expired = advanceCommitment(hidden, 150_000, false);
  expect([expired.status, expired.deadline, expired.exits]).toEqual(["finished", 100_000, 1]);
  expect(advanceCommitment(expired, 200_000, true)).toEqual(expired);
  expect(advanceCommitment(advanceCommitment(start, 99_000, true), 110_000, false).exits).toBe(0);
});
it("invalidates backward device-clock changes; explicit restart preserves the observation identity", () => {
  const first = advanceCommitment(startCommitment(600_000, 10_000), 5000, false);
  expect(first.status).toBe("invalid");
  const retry = startCommitment(600_000, 20_000, first);
  expect([retry.rootAttempt, retry.attempt, retry.deadline]).toEqual([first.rootAttempt, 2, 620_000]);
  expect(validCommitment(retry)).toBe(true);
});
it("supports a configurable grace period and rejects corrupted or mismatched timer durations", () => {
  const timer = startCommitment(100_000, 10_000);
  expect(advanceCommitment(advanceCommitment(timer, 10_100, true, 500), 10_700, false, 500).exits).toBe(1);
  expect(validCommitment({ ...timer, deadline: 123 })).toBe(false);
  expect(validCommitment({ ...timer, exits: 3 })).toBe(false);
  writeLocalActivity("timer:a", { version: 1, timer: startCommitment(600_000, 10_000), writer: "old", leaseUntil: 0 });
  render(<Timer />); expect(screen.getByRole("alert").textContent).toContain("does not match this activity");
});
function Timer({ enabled = true, owner = "a" }: { enabled?: boolean; owner?: string }) {
  const monitor = useCommitment(`timer:${owner}`, 100_000, enabled);
  return <><p>{monitor.timer?.status ?? "not started"} / {monitor.timer?.exits ?? 0} / {monitor.remaining}</p>
    {monitor.error && <p role="alert">{monitor.error}</p>}<button onClick={monitor.begin}>Begin</button><button onClick={monitor.confirmFinished}>Confirm</button></>;
}
it("installs monitoring only while enabled; one/two/three exits persist across refresh without extending time", () => {
  const first = render(<Timer />);
  visible("hidden"); act(() => vi.advanceTimersByTime(2000)); visible("visible");
  expect(screen.getByText("not started / 0 / 100")).toBeTruthy();
  fireEvent.click(screen.getByText("Begin"));
  for (let i = 1; i <= 2; i++) { visible("hidden"); act(() => vi.advanceTimersByTime(2000)); visible("visible"); expect(screen.getByText(`running / ${i} / ${100 - i * 2}`)).toBeTruthy(); }
  const deadline = JSON.parse(localStorage.getItem("timer:a")!).timer.deadline;
  first.unmount(); act(() => vi.advanceTimersByTime(6000)); render(<Timer />);
  expect(screen.getByText(/invalid \/ 3/)).toBeTruthy();
  expect(JSON.parse(localStorage.getItem("timer:a")!).timer.deadline).toBe(deadline);
});
it("recovers expiry after process reconstruction and rejects competing active pages", () => {
  const first = render(<Timer />); fireEvent.click(screen.getByText("Begin"));
  first.unmount(); act(() => vi.advanceTimersByTime(105_000)); render(<Timer />);
  expect(screen.getByText("finished / 1 / 0")).toBeTruthy(); cleanup(); localStorage.clear();
  render(<Timer />); fireEvent.click(screen.getByText("Begin")); render(<Timer />);
  expect(screen.getByRole("alert").textContent).toContain("active in another page");
});
it("fails closed on storage errors and leaves malformed existing evidence untouched", () => {
  const malformed = '{"version":99}'; localStorage.setItem("bad", malformed);
  expect(() => readLocalActivity("bad", validCommitment)).toThrow(); expect(localStorage.getItem("bad")).toBe(malformed);
  const saved = startCommitment(100_000, 10_000); writeLocalActivity("good", saved);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
  render(<Timer />); fireEvent.click(screen.getByText("Begin"));
  expect(screen.getByRole("alert").textContent).toContain("Storage unavailable");
  expect(localStorage.getItem("timer:a")).toBeNull(); spy.mockRestore();
  expect(readLocalActivity("good", validCommitment)).toEqual(saved);
});
it("never silently confirms a run after losing a visibility checkpoint to a storage failure", () => {
  render(<Timer />); fireEvent.click(screen.getByText("Begin"));
  const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
  visible("hidden"); act(() => vi.advanceTimersByTime(2000)); visible("visible");
  expect(screen.getByRole("alert")).toBeTruthy(); failure.mockRestore(); act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText(/invalid \/ 0/)).toBeTruthy();
  const saved = JSON.parse(localStorage.getItem("timer:a")!);
  expect(saved.timer.reason).toContain("cannot be confirmed"); expect(saved.timer.status).toBe("invalid");
});
it("does not install visibility monitoring for an inactive activity and isolates each activity key", () => {
  const listener = vi.spyOn(document, "addEventListener"); render(<Timer enabled={false} />);
  expect(listener.mock.calls.some(([event]) => event === "visibilitychange")).toBe(false);
  expect(activityKey(identity, "reset")).not.toBe(activityKey(identity, "post-sleep"));
  expect(activityKey(identity, "reset")).not.toBe(activityKey({ ...identity, owner: "b" }, "reset"));
});
it("clears timer state when the owner/session key changes without reusing another account's attempt", () => {
  const page = render(<Timer owner="a" />); fireEvent.click(screen.getByText("Begin"));
  act(() => vi.advanceTimersByTime(2000)); page.rerender(<Timer owner="b" />);
  expect(screen.getByText("not started / 0 / 100")).toBeTruthy();
  fireEvent.click(screen.getByText("Begin"));
  expect(JSON.parse(localStorage.getItem("timer:a")!).timer.deadline).not.toBe(JSON.parse(localStorage.getItem("timer:b")!).timer.deadline);
});
it.each(["lab", "match"])("keeps the real Reset %s blocked after invalidation and restarts at 600 seconds", stage => {
  const onComplete = vi.fn();
  render(<TimedActivityIdentity value={identity}>{stage === "lab"
    ? <TenMinuteWallStareExperiment method="ten-minute-wall-stare" category="focus" name="10-Minute Reset" data={wallStareExperiment} onComplete={onComplete} />
    : <TenMinuteWallStareMatch method="ten-minute-wall-stare" name="10-Minute Reset" data={wallStareMatchData} originalScore={1} onComplete={onComplete} />}</TimedActivityIdentity>);
  fireEvent.click(screen.getByRole("button", { name: "Begin 10-minute reset" }));
  for (let i = 0; i < 3; i++) { visible("hidden"); act(() => vi.advanceTimersByTime(2000)); visible("visible"); }
  expect(screen.queryByRole("button", { name: "Start studying" })).toBeNull(); expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Review material before restarting"));
  expect(screen.getByText(stage === "lab" ? wallStareExperiment.material : wallStareMatchData.material)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Restart 10-minute reset" }));
  expect(screen.getByLabelText("wall stare time remaining").textContent).toBe("10:00");
  act(() => vi.advanceTimersByTime(600_000)); fireEvent.click(screen.getByText("Start studying"));
  expect(screen.getByText("Continue to test")).toBeTruthy(); expect(onComplete).not.toHaveBeenCalled();
  const data = stage === "lab" ? wallStareExperiment : wallStareMatchData;
  fireEvent.click(screen.getByText("Continue to test"));
  data.questions.forEach((q, i) => { fireEvent.click(screen.getByRole("button", { name: q.correct }));
    fireEvent.click(screen.getByText(i === data.questions.length - 1 ? "Finish test" : "Next question")); });
  if (stage === "lab") {
    screen.getAllByRole("button", { name: "3" }).forEach(button => fireEvent.click(button));
    fireEvent.click(screen.getByText("Complete experiment"));
    expect(onComplete.mock.calls[0][0]).toMatchObject({ method: "ten-minute-wall-stare", correct: data.questions.length, total: data.questions.length, score: 1 });
  } else {
    fireEvent.click(screen.getByRole("button", { name: "3" })); fireEvent.click(screen.getByText("Complete verification"));
    expect(onComplete.mock.calls[0][0]).toMatchObject({ method: "ten-minute-wall-stare", firstScore: 1, verificationScore: 1 });
  }
  expect(onComplete).toHaveBeenCalledOnce();
});
