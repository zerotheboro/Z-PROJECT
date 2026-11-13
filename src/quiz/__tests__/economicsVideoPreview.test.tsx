// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { YouTubeApi, YouTubePlayer } from "../engines/shared/YouTubeTrainingPlayer";
const mock = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("../engines/shared/YouTubeTrainingPlayer", () => ({ loadYouTubeApi: mock.load }));
import VideoMethodPreview from "../economics9708/VideoMethodPreview";
import { ownerVideoPreviewEnabled } from "../economics9708/videoPreviewAccess";
import { canPreviewEconomicsVideo, economicsVideoRegistry, isReviewedEconomicsVideo } from "../economics9708/videos";

beforeEach(() => { vi.stubEnv("VITE_ECONOMICS_VIDEO_PREVIEW", "owner-approved"); mock.load.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function playerFixture() {
  let events!: ConstructorParameters<YouTubeApi["Player"]>[1]["events"], player!: YouTubePlayer, time = 10, rate = 1;
  const destroy = vi.fn(), setPlaybackRate = vi.fn((value: number) => { rate = value; });
  class Player implements YouTubePlayer {
    constructor(_frame: HTMLIFrameElement, options: ConstructorParameters<YouTubeApi["Player"]>[1]) { events = options.events; player = this; }
    destroy = destroy; seekTo = vi.fn(); pauseVideo = vi.fn(); getCurrentTime = () => time;
    getAvailablePlaybackRates = () => [1, 1.5, 2]; getPlaybackRate = () => rate; setPlaybackRate = setPlaybackRate;
  }
  mock.load.mockResolvedValue({ Player, PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 } });
  return { destroy, setPlaybackRate, get player() { return player; }, get events() { return events; }, time: (value: number) => { time = value; }, rate: (value: number) => { rate = value; } };
}
const flag = (name: string) => screen.getByText(name, { selector: "dt" }).nextElementSibling!.textContent;

it("keeps the separate developer preview gated without inventing independent review facts", () => {
  const env = { ...import.meta.env, DEV: true, VITE_ECONOMICS_VIDEO_PREVIEW: "owner-approved" };
  expect(ownerVideoPreviewEnabled(env, { hostname: "127.0.0.1", protocol: "http:" })).toBe(true);
  expect(ownerVideoPreviewEnabled({ ...env, DEV: false }, { hostname: "127.0.0.1", protocol: "http:" })).toBe(false);
  expect(ownerVideoPreviewEnabled({ ...env, VITE_ECONOMICS_VIDEO_PREVIEW: "" }, { hostname: "127.0.0.1", protocol: "http:" })).toBe(false);
  expect(ownerVideoPreviewEnabled(env, { hostname: "edulience.space", protocol: "https:" })).toBe(false);
  expect(ownerVideoPreviewEnabled(env, { hostname: "127.0.0.1.evil.example", protocol: "http:" })).toBe(false);
  for (const video of economicsVideoRegistry) {
    expect(canPreviewEconomicsVideo(video)).toBe(true); expect(isReviewedEconomicsVideo(video)).toBe(false);
    expect(canPreviewEconomicsVideo({ ...video, OWNER_APPROVED: false })).toBe(false);
  }
});
it("renders a disabled page without iframe/API access outside the explicit preview", () => {
  vi.stubEnv("VITE_ECONOMICS_VIDEO_PREVIEW", ""); render(<VideoMethodPreview />);
  expect(screen.getByRole("heading", { name: "Local video preview disabled" })).toBeTruthy();
  expect(document.querySelector("iframe")).toBeNull(); expect(mock.load).not.toHaveBeenCalled();
});
it("makes all twelve owner-approved full videos selectable without fabricating clips or Training results", async () => {
  const fixture = playerFixture(); render(<VideoMethodPreview />);
  const picker = screen.getByLabelText("Video candidate");
  expect(within(picker).getAllByRole("option")).toHaveLength(12);
  expect(flag("OWNER_APPROVED")).toMatch(/Yes/); expect(flag("CONTENT_VERIFIED")).toBe("No");
  expect(flag("CLIP_REVIEWED")).toMatch(/No/); expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/);
  for (const video of economicsVideoRegistry) {
    fireEvent.change(picker, { target: { value: video.youtubeId } });
    const frame = document.querySelector("iframe")!;
    expect(frame.src).toContain(`/embed/${video.youtubeId}?`);
    expect(new URL(frame.src).searchParams.has("start")).toBe(false);
    expect(new URL(frame.src).searchParams.has("end")).toBe(false);
    expect(screen.queryByRole("button", { name: /Complete experiment|Continue to comprehension/ })).toBeNull();
  }
  await waitFor(() => expect(fixture.player).toBeTruthy());
  expect(economicsVideoRegistry.every(video => !video.CONTENT_VERIFIED && !video.CLIP_REVIEWED && !video.PLAYBACK_VERIFIED)).toBe(true);
});
it("sets runtime PLAYBACK_VERIFIED only after advancing actual 2× PLAYING, then revokes it on wrong speed", async () => {
  vi.useFakeTimers(); const fixture = playerFixture(); render(<VideoMethodPreview />);
  await act(async () => { await Promise.resolve(); });
  act(() => fixture.events.onReady({ target: fixture.player, data: 0 }));
  expect(fixture.setPlaybackRate).toHaveBeenCalledWith(2); expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/);
  act(() => fixture.events.onStateChange({ target: fixture.player, data: 1 }));
  act(() => { vi.advanceTimersByTime(300); }); expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/);
  fixture.time(11); act(() => { vi.advanceTimersByTime(300); }); expect(flag("PLAYBACK_VERIFIED")).toMatch(/Yes/);
  act(() => fixture.events.onStateChange({ target: fixture.player, data: 2 }));
  expect(flag("PLAYBACK_VERIFIED")).toMatch(/Yes/); // a successful check remains recorded when paused
  act(() => fixture.events.onStateChange({ target: fixture.player, data: 1 }));
  fixture.rate(1); act(() => fixture.events.onPlaybackRateChange?.({ target: fixture.player, data: 1 }));
  expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/); expect(screen.getByRole("status").textContent).toMatch(/not 2×/);
  expect(flag("CONTENT_VERIFIED")).toBe("No"); expect(flag("CLIP_REVIEWED")).toMatch(/No/);
});
it("retains the exact failed-video reason when another candidate is selected", async () => {
  const fixture = playerFixture(); render(<VideoMethodPreview />);
  await waitFor(() => expect(fixture.player).toBeTruthy());
  act(() => fixture.events.onError?.({ target: fixture.player, data: 153 }));
  fireEvent.change(screen.getByLabelText("Video candidate"), { target: { value: "IzccVWouIxM" } });
  const row = within(screen.getByRole("table")).getByText("Price Elasticity of Demand").closest("tr")!;
  expect(row.textContent).toContain("failed"); expect(row.textContent).toContain("client/referrer identification");
});
it.each([2, 5, 100, 101, 150, 153])("reports real API error %i with no success and safely retries", async code => {
  const fixture = playerFixture(); render(<VideoMethodPreview />);
  await waitFor(() => expect(fixture.player).toBeTruthy());
  const stale = fixture.events;
  act(() => stale.onError?.({ target: fixture.player, data: code }));
  expect(screen.getByRole("alert")).toBeTruthy(); expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/);
  fireEvent.click(screen.getByRole("button", { name: "Retry playback test" }));
  await waitFor(() => expect(mock.load).toHaveBeenCalledTimes(2));
  act(() => stale.onStateChange({ target: fixture.player, data: 1 }));
  expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/); expect(fixture.destroy).toHaveBeenCalled();
});
it("downloads all twelve explicit statuses and owner feedback without turning feedback into verification", async () => {
  playerFixture(); render(<VideoMethodPreview />);
  fireEvent.change(screen.getByLabelText("Notes and defective sections"), { target: { value: "Please check the PED explanation." } });
  const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL"), originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  let exported: Blob | undefined;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (value: Blob) => { exported = value; return "blob:local-owner-review"; } });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  try {
    fireEvent.click(screen.getByRole("button", { name: "Download review report" }));
    expect(click).toHaveBeenCalledTimes(1); expect(exported).toBeTruthy();
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(exported!);
    });
    const report = JSON.parse(text);
    expect(report.scoredEvidence).toBe(false); expect(report.videos).toHaveLength(12);
    expect(report.videos.every((row: { OWNER_APPROVED: boolean; CONTENT_VERIFIED: boolean; CLIP_REVIEWED: boolean; PLAYBACK_VERIFIED: boolean }) =>
      row.OWNER_APPROVED && !row.CONTENT_VERIFIED && !row.CLIP_REVIEWED && !row.PLAYBACK_VERIFIED)).toBe(true);
    expect(report.videos.find((row: { youtubeId: string }) => row.youtubeId === "nOlOf_KEnrw").ownerFeedback.notes).toBe("Please check the PED explanation.");
  } finally {
    if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate); else Reflect.deleteProperty(URL, "createObjectURL");
    if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke); else Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});
it("reports an API timeout as a technical failure without inventing a playback pass", async () => {
  vi.useFakeTimers(); mock.load.mockReturnValue(new Promise(() => {})); render(<VideoMethodPreview />);
  act(() => { vi.advanceTimersByTime(15000); });
  expect(screen.getByRole("alert").textContent).toMatch(/did not become ready/);
  expect(flag("PLAYBACK_VERIFIED")).toMatch(/No/);
});
it("keeps notes per video, fences switched-video callbacks, and feedback never approves clips/content", async () => {
  const fixture = playerFixture(); render(<VideoMethodPreview />);
  await waitFor(() => expect(fixture.player).toBeTruthy()); const stale = fixture.events;
  fireEvent.change(screen.getByLabelText("Notes and defective sections"), { target: { value: "Check the explanation at 3:10." } });
  fireEvent.change(screen.getByLabelText("Your review"), { target: { value: "appears-suitable" } });
  fireEvent.change(screen.getByLabelText("Video candidate"), { target: { value: "IzccVWouIxM" } });
  expect(screen.getByLabelText("Notes and defective sections")).toHaveProperty("value", "");
  act(() => stale.onError?.({ target: fixture.player, data: 100 })); expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.change(screen.getByLabelText("Video candidate"), { target: { value: "nOlOf_KEnrw" } });
  expect(screen.getByLabelText("Notes and defective sections")).toHaveProperty("value", "Check the explanation at 3:10.");
  expect(flag("CONTENT_VERIFIED")).toBe("No"); expect(flag("CLIP_REVIEWED")).toMatch(/No/);
  expect(screen.getByRole("button", { name: "Download review report" })).toBeTruthy();
});
