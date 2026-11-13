import { useEffect, useRef, useState } from "react";
import { loadYouTubeApi } from "../engines/shared/YouTubeTrainingPlayer";
import type { YouTubePlayer } from "../engines/shared/YouTubeTrainingPlayer";
import { canPreviewEconomicsVideo } from "./videos";
import type { EconomicsVideo } from "./videos";
import { ownerVideoPreviewEnabled } from "./videoPreviewAccess";

export type VideoPlaybackProbe = {
  youtubeId: string; state: "not-tested" | "loading" | "ready" | "playing-2x" | "paused" | "wrong-speed" | "failed";
  PLAYBACK_VERIFIED: boolean; errorCode: number | null; reason: string; testedAt: string | null;
};
export const untestedVideo = (youtubeId: string): VideoPlaybackProbe => ({ youtubeId, state: "not-tested", PLAYBACK_VERIFIED: false,
  errorCode: null, reason: "No runtime playback test yet.", testedAt: null });

/** Separate from Training: never accepts progress/results or an onComplete.
 * Full-length candidates are allowed here only, with explicit local opt-in. */
export default function OwnerVideoPreviewPlayer({ video, onProbe, loadApi = loadYouTubeApi }: {
  video: EconomicsVideo; onProbe: (probe: VideoPlaybackProbe) => void; loadApi?: typeof loadYouTubeApi;
}) {
  const frame = useRef<HTMLIFrameElement>(null), report = useRef(onProbe); report.current = onProbe;
  const [attempt, setAttempt] = useState(0), [probe, setProbe] = useState(untestedVideo(video.youtubeId));
  const enabled = ownerVideoPreviewEnabled() && canPreviewEconomicsVideo(video);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, failed = false, playing = false, passed2x = false, previousTime: number | null = null;
    let player: YouTubePlayer | null = null, timer: number | undefined;
    const publish = (state: VideoPlaybackProbe["state"], reason: string, verified = false, errorCode: number | null = null) => {
      if (disposed) return;
      passed2x = verified;
      const value = { youtubeId: video.youtubeId, state, reason, PLAYBACK_VERIFIED: verified, errorCode, testedAt: new Date().toISOString() };
      setProbe(value); report.current(value);
    };
    const fail = (reason: string, code: number | null = null) => {
      if (disposed) return;
      failed = true; playing = false; previousTime = null; window.clearTimeout(timeout); player?.pauseVideo?.(); publish("failed", reason, false, code);
    };
    const sample = () => {
      if (disposed || failed || !player) return;
      if (!playing) return;
      const rate = player.getPlaybackRate?.(), time = player.getCurrentTime();
      if (rate !== 2) { previousTime = null; publish("wrong-speed", `Player reports ${rate ?? "unknown"}×, not 2×.`); return; }
      if (Number.isFinite(time) && previousTime !== null && time > previousTime + .05)
        publish("playing-2x", "Playback advanced while the player reported 2×. Content and clips remain unverified.", true);
      previousTime = Number.isFinite(time) ? time : null;
    };
    publish("loading", "Loading owner-approved candidate; playback has not been verified.");
    const timeout = window.setTimeout(() => fail("The YouTube player/API did not become ready. Retry or use the original link."), 15000);
    void loadApi().then(api => {
      if (disposed || failed || !frame.current) return;
      player = new api.Player(frame.current, { events: {
        onReady: event => {
          if (disposed || failed) return;
          window.clearTimeout(timeout); player = event.target;
          const rates = player.getAvailablePlaybackRates?.();
          if (!rates?.includes(2)) { publish("wrong-speed", "This player does not offer 2×. You may inspect it, but 2× is not verified."); }
          else { player.setPlaybackRate(2); publish("ready", "2× requested. Press Play; verification requires actual playback progress at 2×."); }
          timer = window.setInterval(sample, 300);
        },
        onStateChange: event => {
          if (disposed || failed) return;
          player = event.target; playing = event.data === api.PlayerState.PLAYING; previousTime = null;
          if (playing) sample();
          else {
            const retained = passed2x && event.target.getPlaybackRate?.() === 2;
            publish("paused", retained ? "Playback stopped after a successful 2× runtime check. This does not verify content or full viewing."
              : "Playback is stopped. Press Play at 2× to run a fresh check.", retained);
          }
        },
        onPlaybackRateChange: () => {
          if (disposed || failed) return;
          previousTime = null; publish("ready", "Playback rate changed; checking 2× again requires playback progress."); sample();
        },
        onError: event => fail(({ 2: "Invalid YouTube request", 5: "HTML5 playback failed", 100: "Video unavailable, removed or private",
          101: "Creator disallows embedding", 150: "Creator disallows embedding", 153: "YouTube rejected client/referrer identification" } as Record<number, string>)[event.data] ?? "YouTube playback failed", event.data)
      } });
    }).catch(() => fail("The YouTube API could not load. This is a technical failure, not a content-review decision."));
    return () => { disposed = true; window.clearTimeout(timeout); window.clearInterval(timer); player?.destroy(); };
  }, [enabled, video, loadApi, attempt]);
  if (!enabled) return <p role="alert">This video preview requires owner approval, development mode and the loopback launcher.</p>;
  const params = new URLSearchParams({ enablejsapi: "1", playsinline: "1", rel: "0", origin: window.location.origin });
  return <section className="economics-video-player" aria-label="Owner-only video player">
    <iframe key={attempt} ref={frame} title={`Local candidate preview: ${video.title}`}
      src={`https://www.youtube.com/embed/${video.youtubeId}?${params}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    <p role={probe.state === "failed" ? "alert" : "status"}>{probe.reason}</p>
    <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry playback test</button>
    <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">Open original video</a>
  </section>;
}
