import {
  useRef
} from "react";

type Options = {
  startImmediately?: boolean;
};

export function useExperimentTimer({
  startImmediately = false
}: Options = {}) {
  const startTime = useRef<number | null>(
    startImmediately ? Date.now() : null
  );

  function start() {
    startTime.current = Date.now();
  }

  function elapsedMs() {
    return startTime.current === null
      ? 0
      : Date.now() - startTime.current;
  }

  return {
    start,
    elapsedMs
  };
}
