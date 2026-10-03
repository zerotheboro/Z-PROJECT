import {
  useCallback,
  useRef
} from "react";

import type {
  SyntheticEvent
} from "react";

import {
  useTrainingState
} from "../../trainingProgressState";

export type ResumableVideoProgress = {
  currentTime: number;
  started: boolean;
  completed: boolean;
};

export function useResumableVideoProgress(
  playbackRate: number
) {
  const [progress, setProgress] =
    useTrainingState<ResumableVideoProgress>({
      currentTime: 0,
      started: false,
      completed: false
    });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const restorePosition = useCallback((
    video: HTMLVideoElement
  ) => {
    video.playbackRate = playbackRate;

    const duration = Number.isFinite(video.duration)
      ? video.duration
      : progress.currentTime;
    const safeTime = Math.max(
      0,
      Math.min(progress.currentTime, duration)
    );

    if (safeTime > 0) {
      video.currentTime = safeTime;
    }
  }, [playbackRate, progress.currentTime]);

  const ref = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;

    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const savePosition = useCallback((
    video: HTMLVideoElement,
    completed = false
  ) => {
    const currentTime = Number.isFinite(video.currentTime)
      ? Math.max(0, video.currentTime)
      : 0;

    setProgress(current => {
      const started =
        current.started || currentTime > 0;
      const nextCompleted =
        current.completed || completed;

      if (
        Math.abs(
          current.currentTime - currentTime
        ) < 0.05 &&
        current.started === started &&
        current.completed === nextCompleted
      ) {
        return current;
      }

      return {
        currentTime,
        started,
        completed: nextCompleted
      };
    });
  }, [setProgress]);

  return {
    progress,
    checkpoint: () => {
      if (videoRef.current) {
        savePosition(videoRef.current);
      }
    },
    videoProps: {
      ref,
      onLoadedMetadata: (
        event: SyntheticEvent<HTMLVideoElement>
      ) => restorePosition(event.currentTarget),
      onPlay: (
        event: SyntheticEvent<HTMLVideoElement>
      ) => {
        setProgress(current => ({
          ...current,
          started: true
        }));
        savePosition(event.currentTarget);
      },
      onPause: (
        event: SyntheticEvent<HTMLVideoElement>
      ) => savePosition(event.currentTarget),
      onTimeUpdate: (
        event: SyntheticEvent<HTMLVideoElement>
      ) => savePosition(event.currentTarget),
      onEnded: (
        event: SyntheticEvent<HTMLVideoElement>
      ) => savePosition(event.currentTarget, true)
    }
  };
}
