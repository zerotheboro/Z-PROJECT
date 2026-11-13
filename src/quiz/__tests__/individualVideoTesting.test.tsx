// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { YouTubeApi, YouTubePlayer } from "../engines/shared/YouTubeTrainingPlayer";
const mock = vi.hoisted(() => ({ load: vi.fn(), start: vi.fn(), done: vi.fn() }));
vi.mock("../engines/shared/YouTubeTrainingPlayer", async original => ({ ...await original<object>(), loadYouTubeApi: mock.load }));
vi.mock("../../firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("../../HEADER/header", () => ({ default: () => <nav>Existing navigation</nav> }));
vi.mock("../../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ loading: false, error: null, user: null, unlimited: false, manualMethodsRemaining: 3, refreshAccess: () => {} }) }));
vi.mock("../../services/startTrainingSession", () => ({ startTrainingSession: mock.start }));
import ChooseMethods from "../ChooseMethods";
import MethodLab from "../sections/MethodLab";
import { economicsVideoRegistry, isReviewedEconomicsVideo, selectEconomicsVideo } from "../economics9708/videos";
import { economicsPacks, requireEconomicsPack } from "../economics9708/packs";
import { economicsAssignments } from "../economics9708/allocation";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { TrainingProgressStateProvider } from "../trainingProgressState";
import type { TrainingInternalState } from "../trainingProgress";
function fixture() {
  let events!: ConstructorParameters<YouTubeApi["Player"]>[1]["events"], player!: YouTubePlayer, time = 0, rate = 1;
  const destroy = vi.fn(), setPlaybackRate = vi.fn((value: number) => { rate = value; });
  class Player implements YouTubePlayer {
    constructor(_frame: HTMLIFrameElement, options: ConstructorParameters<YouTubeApi["Player"]>[1]) { events = options.events; player = this; }
    destroy = destroy; getCurrentTime = () => time; getPlaybackRate = () => rate; getAvailablePlaybackRates = () => [1, 2];
    setPlaybackRate = setPlaybackRate; seekTo = vi.fn(); pauseVideo = vi.fn();
  }
  mock.load.mockResolvedValue({ Player, PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 } });
  return { get events() { return events; }, get player() { return player; }, destroy, setPlaybackRate,
    advance: (seconds: number) => { time += seconds; }, rate: (value: number) => { rate = value; } };
}
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function LiveLab({ topic }: { topic: string }) {
  const [state, setState] = useState<TrainingInternalState>({});
  return <TrainingProgressStateProvider state={state} onChange={setState}>
    <MethodLab methods={["two-x-video-speed"]} economicsTopicId={topic} economicsActivityVersion="mapped-1" onComplete={mock.done} />
  </TrainingProgressStateProvider>;
}
function picker(topic = "2.2") { return render(<MemoryRouter initialEntries={["/training/choose?economics=" + topic]}><Routes>
  <Route path="/training/choose" element={<ChooseMethods />} />
  <Route path="/training/assessment" element={<LiveLab topic={topic} />} />
</Routes></MemoryRouter>); }
async function start(topic = "2.2") { picker(topic); fireEvent.click(screen.getByRole("checkbox", { name: /2X video speed/i })); click("Start training");
  await screen.findByText("Start 2x playback"); click("Start 2x playback"); await act(async () => { await Promise.resolve(); }); }
beforeEach(() => { vi.clearAllMocks(); mock.start.mockResolvedValue({ sessionId: "approved-video-session" }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it.each(economicsPacks)("restores normal selectable video cards and removes preview controls for $topicId", pack => {
  picker(pack.topicId); const card = screen.getByRole("checkbox", { name: /2X video speed/i });
  expect(card).toHaveProperty("disabled", false); expect(card.parentElement?.className).toBe("method-picker-grid");
  expect(card.querySelector(".method-availability-badge")).toBeNull();
  expect(screen.queryByText(/LOCAL TEST|Try 2? Video|awaiting review/)).toBeNull();
  fireEvent.click(card); expect(screen.getByText("1 / 3 selected")).toBeTruthy();
});
it("starts normal Individual Training with a large video-only study panel, short guidance, optional notes and no injected illustration/reference passage", async () => {
  fixture(); await start();
  expect(mock.start).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ mode: "manual", methodIds: ["two-x-video-speed"], economicsTopicId: "2.2" }));
  const frame = document.querySelector("iframe")!; expect(frame.src).toContain("nOlOf_KEnrw");
  expect(frame.closest(".study-content")).not.toBeNull();
  expect(document.querySelector("img, .economics-study-illustration, .two-x-economics-passage, [data-supplemental-material]")).toBeNull();
  expect(screen.queryByRole("heading", { name: /Topic notes|Topic reference/ })).toBeNull();
  for (const note of requireEconomicsPack("2.2").notes) expect(document.body.textContent).not.toContain(note);
  expect(screen.getByText(/Watch at 2× speed and focus on the key ideas/)).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Your notes" })).toBeTruthy(); expect(screen.getByRole("textbox")).toBeTruthy();
  expect(new URL(frame.src).searchParams.has("end")).toBe(false);
  expect(screen.getByRole("button", { name: "I finished at 2× · test comprehension" })).toHaveProperty("disabled", true);
});
it("allows a normal result only after actual 2× advancement, never merely a requested rate", async () => {
  const api = fixture(); await start(); vi.useFakeTimers(); act(() => api.events.onReady({ target: api.player, data: 0 }));
  expect(api.setPlaybackRate).toHaveBeenCalledWith(2);
  act(() => api.events.onStateChange({ target: api.player, data: 1 })); act(() => vi.advanceTimersByTime(250));
  expect(screen.getByRole("button", { name: "I finished at 2× · test comprehension" })).toHaveProperty("disabled", true);
  api.advance(1); act(() => vi.advanceTimersByTime(250)); click("I finished at 2× · test comprehension");
  const id = economicsAssignments(["two-x-video-speed"], "lab", "2.2", "mapped-1")[0], qs = resolveEconomicsAssessment(id).scored;
  qs.forEach((q, i) => { click(q.correct); click(i === qs.length - 1 ? "Finish test" : "Next question"); });
  for (const prompt of ["How confident were you?", "How manageable was 2x?", "Would you use 2X video speed?"])
    fireEvent.click(within(screen.getByRole("heading", { name: prompt }).nextElementSibling as HTMLElement).getByRole("button", { name: "3" }));
  click("Complete experiment"); expect(mock.done).toHaveBeenCalledExactlyOnceWith({ experiments: [expect.objectContaining({ method: "two-x-video-speed", score: 1, correct: 3, total: 3 })] });
});
it.each([100, 101, 153])("blocks progression after real player API error %i and offers retry", async code => {
  const api = fixture(); await start(); act(() => api.events.onError?.({ target: api.player, data: code }));
  expect(screen.getByRole("alert")).toBeTruthy(); expect(screen.getByRole("button", { name: "I finished at 2× · test comprehension" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Retry video" })).toBeTruthy(); expect(mock.done).not.toHaveBeenCalled();
});
it("chooses YED/XED from actual question context without inventing review or playback metadata", () => {
  const pack = requireEconomicsPack("2.2"), id = "ec9708-2_2-2026-v2-pilot-1-lab-two-x-video-speed-mapped1";
  for (const [term, videoId] of [["YED", "8eMn4h4JpqI"], ["XED", "5cW7xdanyd0"]]) {
    const q = pack.lab.find(q => q.question.includes(term))!;
    expect(selectEconomicsVideo(id, [q.id])).toMatchObject({ status: "ready", video: { youtubeId: videoId } });
  }
  expect(economicsVideoRegistry).toHaveLength(12); expect(economicsVideoRegistry.every(v => v.OWNER_APPROVED && !isReviewedEconomicsVideo(v) && !v.PLAYBACK_VERIFIED)).toBe(true);
});
