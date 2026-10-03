import {
  useRef
} from "react";

import {
  useTrainingProgressCheckpoint,
  useTrainingState
} from "../../trainingProgressState";

type Options = {
  startImmediately?: boolean;
};

export function useExperimentTimer({
  startImmediately = false
}: Options = {}) {
  const [timer, setTimer] = useTrainingState(
    () => ({
      accumulatedMs: 0,
      running: startImmediately
    })
  );
  const startedAt = useRef<number | null>(
    timer.running ? Date.now() : null
  );

  function start() {
    startedAt.current = Date.now();
    setTimer({
      accumulatedMs: 0,
      running: true
    });
  }

  function elapsedMs() {
    const active =
      timer.running && startedAt.current !== null
        ? Date.now() - startedAt.current
        : 0;

    return timer.accumulatedMs + active;
  }

  useTrainingProgressCheckpoint(() => {
    const started = startedAt.current;
    if (!timer.running || started === null) {
      return;
    }

    const now = Date.now();
    startedAt.current = now;
    setTimer(current => ({
      ...current,
      accumulatedMs:
        current.accumulatedMs +
        (now - started)
    }));
  });

  return {
    start,
    elapsedMs,
    isRunning: timer.running
  };
}
