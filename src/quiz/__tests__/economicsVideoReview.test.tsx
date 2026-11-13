// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { economicsVideoRegistry, canPreviewEconomicsVideo, economicsVideoReviewBlockers, economicsVideoEligibilityGap, isReviewedEconomicsVideo, selectEconomicsVideo } from "../economics9708/videos";
import type { ReviewedEconomicsVideo } from "../economics9708/videos";
import { requireEconomicsPack, economicsCoverageManifest } from "../economics9708/packs";
import { economicsContentId } from "../economics9708/selection";
import { getTrainingContentSet } from "../economics9708/adapter";
import { trainingLabContentSets } from "../trainingContent";
import { learningObjectiveId } from "../economics9708/objectives";
import EconomicsYouTubePlayer from "../economics9708/EconomicsYouTubePlayer";
import TwoXVideoSpeedExperiment from "../experiments/TwoXVideoSpeedExperiment";
import type { YouTubeApi, YouTubePlayer, useResumableYouTubeProgress } from "../engines/shared/YouTubeTrainingPlayer";

afterEach(() => { cleanup(); vi.useRealTimers(); });
// Synthetic approval fixture only. These timestamps do not approve a real clip.
function reviewed(): ReviewedEconomicsVideo {
  return { topicId: "1.5", youtubeId: "IzccVWouIxM", title: "Synthetic reviewed clip", creator: "Test-only creator",
    OWNER_APPROVED: true, CONTENT_VERIFIED: true, PLAYBACK_VERIFIED: true, CLIP_REVIEWED: true,
    sourceUrl: "https://www.youtube.com/watch?v=IzccVWouIxM", status: "VERIFIED",
    objectiveIds: [1,2,3,4].map(n => learningObjectiveId(`1.5.${n}`)), clip: { startSeconds: 30, endSeconds: 90 },
    review: { reviewer: "TEST FIXTURE ONLY", accuracyReviewedAt: "2026-11-12T00:00:00.000Z",
      embeddingConfirmedAt: "2026-11-12T00:00:00.000Z", playback2xConfirmedAt: "2026-11-12T00:00:00.000Z" } };
}
it("owner-approves all twelve candidates for preview without inventing content, clips or playback verification", () => {
  expect(economicsVideoRegistry).toHaveLength(12);
  expect(new Set(economicsVideoRegistry.map(video => video.youtubeId)).size).toBe(12);
  for (const video of economicsVideoRegistry) {
    expect(video.status).toBe("UNVERIFIED"); expect(video.creator).toBeNull(); expect(video.clip).toBeNull(); expect(video.review).toBeNull();
    expect(video.OWNER_APPROVED).toBe(true); expect(canPreviewEconomicsVideo(video)).toBe(true);
    expect(video.CONTENT_VERIFIED).toBe(false); expect(video.PLAYBACK_VERIFIED).toBe(false); expect(video.CLIP_REVIEWED).toBe(false);
    expect(isReviewedEconomicsVideo(video)).toBe(false);
    expect(economicsVideoReviewBlockers(video)).toHaveLength(5);
    expect(economicsVideoReviewBlockers(video).join(" ")).toMatch(/Creator.*objective.*boundaries.*Embedding.*2×/s);
  }
});
it.each(economicsCoverageManifest.filter(t => t.status === "playable"))("matches $id legacy content identity using the owner-approved supplied video", topic => {
  const id = economicsContentId(topic.id, "lab-two-x-video-speed");
  const { data } = getTrainingContentSet(trainingLabContentSets["two-x-video-speed"], id);
  expect(economicsVideoRegistry.some(video => video.topicId === topic.id)).toBe(true);
  expect(selectEconomicsVideo(id, data.questions.map(q => q.id))).toMatchObject({ status: "ready", video: { OWNER_APPROVED: true, topicId: topic.id } });
});
it("validates assigned question identities and keeps review facts separate from owner approval", () => {
  const id = economicsContentId("1.5", "lab-two-x-video-speed"), ids = requireEconomicsPack("1.5").lab.slice(0, 2).map(q => q.id);
  const video = reviewed();
  expect(selectEconomicsVideo(id, ids, [video]).status).toBe("ready");
  expect(selectEconomicsVideo(id, [...ids, ids[0]], [video]).status).toBe("unavailable");
  expect(selectEconomicsVideo(id, ["unknown-question"], [video]).status).toBe("unavailable");
  expect(selectEconomicsVideo(id, ids, [{ ...video, OWNER_APPROVED: false }]).status).toBe("unavailable");
  expect(isReviewedEconomicsVideo({ ...video, creator: "" })).toBe(false);
  expect(isReviewedEconomicsVideo({ ...video, CONTENT_VERIFIED: false })).toBe(false);
  expect(isReviewedEconomicsVideo({ ...video, CLIP_REVIEWED: false })).toBe(false);
  expect(isReviewedEconomicsVideo({ ...video, PLAYBACK_VERIFIED: false })).toBe(false);
  expect(isReviewedEconomicsVideo({ ...video, clip: { startSeconds: 90, endSeconds: 30 } })).toBe(false);
  expect(isReviewedEconomicsVideo({ ...video, review: { ...video.review, playback2xConfirmedAt: "" } })).toBe(false);
  expect(selectEconomicsVideo(id, ids, [{ ...video, topicId: "2.2" }]).status).toBe("unavailable");
});
it("enables approved topic videos without requiring invented clip review", () => {
  const approved = reviewed(); // synthetic approval fixture, not a real review
  expect(economicsVideoEligibilityGap("1.5", [approved])).toBeNull();
  expect(economicsVideoEligibilityGap("2.2", [approved])).toMatch(/No approved video/);
  expect(economicsVideoEligibilityGap("1.5", [])).toMatch(/No approved video/);
  expect(economicsVideoEligibilityGap("1.5", [{ ...approved, OWNER_APPROVED: false }])).not.toBeNull();
  const pack = requireEconomicsPack("1.5");
  const id = economicsContentId("1.5", "match-two-x-video-speed-mapped1-q3");
  expect(selectEconomicsVideo(id, pack.verification.slice(3, 6).map(q => q.id), [approved]).status).toBe("ready");
  expect(selectEconomicsVideo(id, pack.lab.slice(3, 6).map(q => q.id), [approved]).status).toBe("unavailable");
});
it("embeds the approved mapped topic video without an unrelated legacy fallback", () => {
  const id = economicsContentId("1.5", "lab-two-x-video-speed"), done = vi.fn();
  const { data } = getTrainingContentSet(trainingLabContentSets["two-x-video-speed"], id);
  render(<TwoXVideoSpeedExperiment method="two-x-video-speed" category="understanding" name="2X Video" contentSetId={id} data={data} onComplete={done} />);
  fireEvent.click(screen.getByRole("button", { name: "Start 2x playback" }));
  expect(document.querySelector("iframe")?.src).toContain("IzccVWouIxM");
  expect(screen.getByRole("button", { name: "I finished at 2× · test comprehension" })).toHaveProperty("disabled", true);
  expect(done).not.toHaveBeenCalled(); expect(document.querySelector("canvas")).toBeNull();
});

function playerFixture(rates = [.5, 1, 1.5, 2]) {
  let events!: ConstructorParameters<YouTubeApi["Player"]>[1]["events"];
  let player!: YouTubePlayer;
  let rate = 1;
  let time = 42;
  const setPlaybackRate = vi.fn((next: number) => { rate = next; });
  const destroy = vi.fn(), pauseVideo = vi.fn();
  class Player implements YouTubePlayer {
    constructor(_element: HTMLIFrameElement, options: ConstructorParameters<YouTubeApi["Player"]>[1]) { events = options.events; player = this; }
    destroy = destroy; pauseVideo = pauseVideo; seekTo = vi.fn();
    getCurrentTime = () => time; getAvailablePlaybackRates = () => rates; getPlaybackRate = () => rate;
    setPlaybackRate = setPlaybackRate;
  }
  const api: YouTubeApi = { Player, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 } };
  const progress: ReturnType<typeof useResumableYouTubeProgress> = { progress: { currentTime: 0, started: false, completed: false }, attachPlayer: vi.fn(), record: vi.fn(), checkpoint: vi.fn() };
  const loadApi = vi.fn(async () => api);
  const confirmed = vi.fn();
  const mounted = render(<EconomicsYouTubePlayer video={reviewed()} progressController={progress} loadApi={loadApi} onPlaybackConfirmed={confirmed} />);
  return { mounted, progress, setPlaybackRate, destroy, pauseVideo, loadApi, confirmed,
    get events() { return events; }, get player() { return player; }, setRate: (next: number) => { rate = next; }, setTime: (next: number) => { time = next; } };
}
it("requires advancing PLAYING state at actual 2×, not just a request/readiness, and invalidates wrong-speed playback", async () => {
  vi.useFakeTimers(); const fixture = playerFixture(); await act(async () => { await Promise.resolve(); });
  const iframe = document.querySelector("iframe")!, url = new URL(iframe.src);
  expect(url.searchParams.get("start")).toBe("30"); expect(url.searchParams.get("end")).toBe("90"); expect(url.searchParams.get("origin")).toBe(window.location.origin);
  act(() => fixture.events.onReady({ target: fixture.player, data: 0 }));
  expect(fixture.setPlaybackRate).toHaveBeenCalledWith(2); expect(screen.getByRole("status").textContent).toMatch(/actual playback has not been confirmed/);
  expect(fixture.progress.record).not.toHaveBeenCalled();
  expect(fixture.confirmed).toHaveBeenLastCalledWith(false);
  act(() => fixture.events.onStateChange({ target: fixture.player, data: 1 }));
  act(() => { vi.advanceTimersByTime(250); });
  expect(fixture.confirmed).toHaveBeenLastCalledWith(false); // stalled time is not playback
  fixture.setTime(43); act(() => { vi.advanceTimersByTime(250); });
  expect(fixture.confirmed).toHaveBeenLastCalledWith(true);
  fixture.setRate(1); act(() => fixture.events.onPlaybackRateChange?.({ target: fixture.player, data: 1 }));
  expect(screen.getByRole("alert").textContent).toMatch(/another or unknown speed/);
  expect(fixture.confirmed).toHaveBeenLastCalledWith(false);
  act(() => fixture.events.onStateChange({ target: fixture.player, data: 0 }));
  expect(fixture.progress.record).not.toHaveBeenCalledWith(fixture.player, { completed: true });
});
it("never records a 2× completion from an ENDED event without actual verified playback", async () => {
  const fixture = playerFixture(); await waitFor(() => expect(fixture.player).toBeTruthy());
  act(() => fixture.events.onReady({ target: fixture.player, data: 0 }));
  fixture.setRate(1);
  act(() => fixture.events.onStateChange({ target: fixture.player, data: 0 }));
  expect(fixture.progress.record).not.toHaveBeenCalledWith(fixture.player, { completed: true });
  expect(fixture.confirmed).toHaveBeenLastCalledWith(false);
});
it("rejects unsupported speed without pretending the target was used", async () => {
  const fixture = playerFixture([1]); await waitFor(() => expect(fixture.player).toBeTruthy());
  act(() => fixture.events.onReady({ target: fixture.player, data: 0 }));
  expect(screen.getByRole("alert").textContent).toMatch(/does not support confirmed 2×/);
  expect(fixture.setPlaybackRate).not.toHaveBeenCalled(); expect(document.querySelector("iframe")).toBeNull();
  expect(fixture.confirmed).toHaveBeenLastCalledWith(false);
});
it.each([100, 101, 150, 153])("handles YouTube error %s with retry, attribution and a safe exit", async code => {
  const fixture = playerFixture(); await waitFor(() => expect(fixture.player).toBeTruthy());
  const stale = fixture.events;
  act(() => fixture.events.onError?.({ target: fixture.player, data: code }));
  expect(screen.getByRole("alert")).toBeTruthy(); expect(document.querySelector("iframe")).toBeNull();
  expect(screen.getByRole("link", { name: /Test-only creator/ }).getAttribute("rel")).toContain("noopener");
  fireEvent.click(screen.getByRole("button", { name: "Retry video" }));
  await waitFor(() => expect(fixture.loadApi).toHaveBeenCalledTimes(2));
  expect(fixture.destroy).toHaveBeenCalled();
  act(() => stale.onReady({ target: fixture.player, data: 0 }));
  expect(screen.getByRole("status").textContent).toMatch(/not confirmed/);
});
it("expires an API/ready timeout and rejects late callbacks after unmount", async () => {
  vi.useFakeTimers(); const fixture = playerFixture();
  await act(async () => { await Promise.resolve(); });
  const stale = fixture.events;
  act(() => { vi.advanceTimersByTime(12000); });
  expect(screen.getByRole("alert").textContent).toMatch(/did not become ready/);
  fixture.mounted.unmount(); act(() => stale.onReady({ target: fixture.player, data: 0 }));
  expect(fixture.setPlaybackRate).not.toHaveBeenCalled();
});
