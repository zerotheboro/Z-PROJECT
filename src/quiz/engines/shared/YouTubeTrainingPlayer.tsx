import {
  useCallback,
  useEffect,
  useMemo,
  useRef
} from "react";

import {
  useTrainingProgressCheckpoint,
  useTrainingState
} from "../../trainingProgressState";

export type ResumableYouTubeProgress = {
  currentTime: number;
  started: boolean;
  completed: boolean;
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (
    seconds: number,
    allowSeekAhead: boolean
  ) => void;
  setPlaybackRate: (rate: number) => void;
};

type PlayerEvent = {
  target: YouTubePlayer;
  data: number;
};

type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: PlayerEvent) => void;
        onStateChange: (
          event: PlayerEvent
        ) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
  };
};

type WindowWithYouTube = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  const youtubeWindow =
    window as WindowWithYouTube;

  if (youtubeWindow.YT?.Player) {
    return Promise.resolve(youtubeWindow.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve, reject) => {
    const previousReady =
      youtubeWindow.onYouTubeIframeAPIReady;

    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (youtubeWindow.YT?.Player) {
        resolve(youtubeWindow.YT);
      } else {
        apiPromise = null;
        reject(new Error(
          "YouTube player API did not initialize."
        ));
      }
    };

    let script = document.querySelector<
      HTMLScriptElement
    >("script[data-edulience-youtube-api]");

    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.edulienceYoutubeApi = "true";
      document.head.appendChild(script);
    }

    script.addEventListener("error", () => {
      apiPromise = null;
      reject(new Error(
        "YouTube player API could not be loaded."
      ));
    }, { once: true });
  });

  return apiPromise;
}

export function useResumableYouTubeProgress() {
  const [progress, setProgress] =
    useTrainingState<ResumableYouTubeProgress>({
      currentTime: 0,
      started: false,
      completed: false
    });
  const playerRef =
    useRef<YouTubePlayer | null>(null);

  const record = useCallback((
    player: YouTubePlayer,
    flags: {
      started?: boolean;
      completed?: boolean;
    } = {}
  ) => {
    const reportedTime = player.getCurrentTime();
    const currentTime = Number.isFinite(reportedTime)
      ? Math.max(0, reportedTime)
      : 0;

    setProgress(current => {
      const started = current.started ||
        flags.started === true ||
        currentTime > 0;
      const completed = current.completed ||
        flags.completed === true;

      if (
        Math.abs(
          current.currentTime - currentTime
        ) < 0.05 &&
        current.started === started &&
        current.completed === completed
      ) {
        return current;
      }

      return { currentTime, started, completed };
    });
  }, [setProgress]);

  const attachPlayer = useCallback((
    player: YouTubePlayer | null
  ) => {
    playerRef.current = player;
  }, []);

  const checkpoint = useCallback(() => {
    if (playerRef.current) {
      record(playerRef.current);
    }
  }, [record]);

  useTrainingProgressCheckpoint(checkpoint);

  return {
    progress,
    attachPlayer,
    record,
    checkpoint
  };
}

type ProgressController = ReturnType<
  typeof useResumableYouTubeProgress
>;

type Props = {
  youtubeId: string;
  title: string;
  channel: string;
  playbackRate: number;
  progressController: ProgressController;
};

function YouTubeTrainingPlayer({
  youtubeId,
  title,
  channel,
  playbackRate,
  progressController
}: Props) {
  const iframeRef =
    useRef<HTMLIFrameElement | null>(null);
  const initialTime = useRef(
    progressController.progress.currentTime
  );
  const {
    attachPlayer,
    record
  } = progressController;

  const embedUrl = useMemo(() => {
    const parameters = new URLSearchParams({
      enablejsapi: "1",
      playsinline: "1",
      rel: "0"
    });
    parameters.set("origin", window.location.origin);

    const start = Math.floor(initialTime.current);
    if (start > 0) {
      parameters.set("start", String(start));
    }

    return `https://www.youtube.com/embed/${youtubeId}?${parameters.toString()}`;
  }, [youtubeId]);

  useEffect(() => {
    let disposed = false;
    let player: YouTubePlayer | null = null;

    void loadYouTubeApi()
      .then(api => {
        if (disposed || !iframeRef.current) {
          return;
        }

        player = new api.Player(iframeRef.current, {
          events: {
            onReady: event => {
              player = event.target;
              attachPlayer(event.target);

              if (initialTime.current > 0) {
                event.target.seekTo(
                  initialTime.current,
                  true
                );
              }

              event.target.setPlaybackRate(
                playbackRate
              );
            },
            onStateChange: event => {
              if (
                event.data ===
                api.PlayerState.PLAYING
              ) {
                event.target.setPlaybackRate(
                  playbackRate
                );
                record(event.target, {
                  started: true
                });
              } else if (
                event.data ===
                api.PlayerState.ENDED
              ) {
                record(event.target, {
                  started: true,
                  completed: true
                });
              } else if (
                event.data ===
                api.PlayerState.PAUSED
              ) {
                record(event.target);
              }
            }
          }
        });
      })
      .catch(() => {
        // The standard embed remains usable without API control.
      });

    return () => {
      disposed = true;

      if (player) {
        record(player);
        attachPlayer(null);
        player.destroy();
      }
    };
  }, [
    attachPlayer,
    playbackRate,
    record,
    youtubeId
  ]);

  return (
    <div className="two-x-video-player">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={`${title} by ${channel}`}
        data-video-id={youtubeId}
        data-playback-speed={playbackRate}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
      <p className="two-x-video-status">
        Playback target: {playbackRate}×. If YouTube
        does not apply it automatically, choose 2× in
        the player settings.
      </p>
    </div>
  );
}

export default YouTubeTrainingPlayer;
