import {
  useEffect,
  useRef
} from "react";

import {
  useTrainingState as useState
} from "../../trainingProgressState";

type Options = {
  durationSeconds?: number;
  active: boolean;
  onExpire: () => void;
};

export function useStageCountdown({
  durationSeconds,
  active,
  onExpire
}: Options) {
  const [remainingSeconds, setRemainingSeconds] =
    useState<number | null>(null);
  const onExpireRef = useRef(onExpire);

  onExpireRef.current = onExpire;

  useEffect(() => {
    if (
      !active ||
      durationSeconds === undefined
    ) {
      setRemainingSeconds(null);
      return;
    }

    const safeDuration = Math.max(
      0,
      remainingSeconds ?? durationSeconds
    );
    const deadline =
      Date.now() + safeDuration * 1000;
    let expired = false;

    const updateRemaining = () => {
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil(
            (deadline - Date.now()) / 1000
          )
        )
      );
    };

    const expire = () => {
      if (expired) {
        return;
      }

      expired = true;
      setRemainingSeconds(0);
      onExpireRef.current();
    };

    updateRemaining();

    const intervalId = window.setInterval(
      updateRemaining,
      250
    );
    const timeoutId = window.setTimeout(
      expire,
      safeDuration * 1000
    );

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [active, durationSeconds]);

  return remainingSeconds;
}
