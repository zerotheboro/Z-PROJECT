import { useEffect, useRef, useState } from "react";
import { loadYouTubeApi } from "../engines/shared/YouTubeTrainingPlayer";
import type { YouTubePlayer, useResumableYouTubeProgress } from "../engines/shared/YouTubeTrainingPlayer";
import { canPreviewEconomicsVideo } from "./videos";
import type { EconomicsVideo } from "./videos";

export default function EconomicsYouTubePlayer({ video, progressController, loadApi = loadYouTubeApi, onPlaybackConfirmed }: {
  video: EconomicsVideo; progressController: ReturnType<typeof useResumableYouTubeProgress>; loadApi?: typeof loadYouTubeApi;
  onPlaybackConfirmed?: (confirmed: boolean) => void;
}) {
  const confirmation = useRef(onPlaybackConfirmed); confirmation.current = onPlaybackConfirmed;
  const iframe = useRef<HTMLIFrameElement>(null), initialTime = useRef(progressController.progress.currentTime);
  const [status, setStatus] = useState("Loading video…");
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const { attachPlayer, record } = progressController;
  const approved = canPreviewEconomicsVideo(video);
  const clipStart = video.clip?.startSeconds ?? 0, clipEnd = video.clip?.endSeconds ?? null;
  useEffect(() => {
    confirmation.current?.(false);
    if (!approved) return;
    let disposed = false, rejected = false, playing = false, observed2x = false, previousTime: number | null = null;
    let player: YouTubePlayer | null = null;
    let clipTimer: number | undefined;
    const fail = (message: string) => { if (!disposed) { rejected = true; window.clearTimeout(timeout); confirmation.current?.(false); setFailed(true); setStatus(message); player?.pauseVideo?.(); } };
    const timeout = window.setTimeout(() => fail("The video player did not become ready. 2× playback is unverified."), 12000);
    const confirm = (target: YouTubePlayer) => {
      if (disposed || rejected) return;
      const rates = target.getAvailablePlaybackRates?.();
      if (!Array.isArray(rates) || !rates.includes(2)) {
        fail("This player does not support confirmed 2× playback. Retry or return to Training."); return;
      }
      const rate = target.getPlaybackRate?.();
      if (playing && rate !== 2) { fail("Playback ran at another or unknown speed. Retry the video before continuing."); return; }
      confirmation.current?.(observed2x && rate === 2);
      setStatus(observed2x && rate === 2 ? "Playback advanced while the player reported 2×. This does not prove the full clip was watched."
        : rate === 2 ? "Player is set to 2×. Press Play; actual playback has not been confirmed yet."
        : "2× requested but not confirmed. Use the player speed control or retry.");
    };
    void loadApi().then(api => {
      if (disposed || !iframe.current) return;
      player = new api.Player(iframe.current, { events: {
        onReady: event => {
          if (disposed || rejected) return;
          window.clearTimeout(timeout); player = event.target; attachPlayer(player);
          const rates = player.getAvailablePlaybackRates?.();
          if (!Array.isArray(rates) || !rates.includes(2)) { confirm(player); return; }
          player.seekTo(attempt > 0 ? clipStart : Math.max(clipStart, Math.min(initialTime.current, clipEnd ?? Infinity)), true);
          player.setPlaybackRate(2); confirm(player);
          clipTimer = window.setInterval(() => {
            if (disposed || rejected || !player) return;
            const time = player.getCurrentTime();
            if (playing) {
              if (player.getPlaybackRate?.() !== 2) { confirm(player); return; }
              if (previousTime !== null && Number.isFinite(time) && time > previousTime + .05) observed2x = true;
              previousTime = Number.isFinite(time) ? time : null; confirm(player);
            }
            if (time < clipStart) player.seekTo(clipStart, true);
            else if (clipEnd !== null && time >= clipEnd) player.pauseVideo?.();
          }, 250);
        },
        onPlaybackRateChange: event => { if (!disposed && !rejected) confirm(event.target); },
        onStateChange: event => {
          if (disposed || rejected) return;
          if (event.data === api.PlayerState.PLAYING) {
            playing = true; previousTime = event.target.getCurrentTime(); confirm(event.target);
            if (!rejected) record(event.target, { started: true });
          } else {
            playing = false; previousTime = null;
            if (event.data === api.PlayerState.PAUSED) { confirm(event.target); record(event.target); }
            else if (event.data === api.PlayerState.ENDED) {
              if (observed2x && event.target.getPlaybackRate?.() === 2) record(event.target, { completed: true });
              else { confirmation.current?.(false); record(event.target); }
            }
          }
        },
        onError: event => fail([101, 150, 153].includes(event.data)
          ? "YouTube blocked this embed or its client identification. 2× playback was not confirmed."
          : "This educational video is unavailable or failed to load. 2× playback was not confirmed.")
      } });
    }).catch(() => fail("The YouTube API could not load. 2× playback is unverified."));
    return () => { disposed = true; window.clearTimeout(timeout); window.clearInterval(clipTimer); if (player) { record(player); attachPlayer(null); player.destroy(); } };
  }, [approved, video, loadApi, attachPlayer, record, attempt]);
  if (!approved) return <p role="alert">This video is not approved for this topic.</p>;
  const params = new URLSearchParams({ enablejsapi: "1", playsinline: "1", rel: "0", origin: window.location.origin,
    start: String(clipStart), ...(clipEnd !== null ? { end: String(clipEnd) } : {}) });
  return <div className="two-x-video-player economics-video-player">
    {!failed && <iframe key={attempt} ref={iframe} src={`https://www.youtube.com/embed/${video.youtubeId}?${params}`}
      title={video.creator ? `${video.title} by ${video.creator}` : video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin" />}
    <p role={failed ? "alert" : "status"}>{status}</p>
    <p><a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">{video.title}{video.creator ? ` — ${video.creator}` : ""} (original video)</a></p>
    <button type="button" onClick={() => { setFailed(false); setStatus("Retrying; 2× playback is not confirmed yet."); setAttempt(value => value + 1); }}>Retry video</button>
    <a href="#/training">Return to Training</a>
  </div>;
}
