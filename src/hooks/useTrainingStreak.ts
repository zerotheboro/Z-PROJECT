import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  subscribeToAuth
} from "../services/auth";
import {
  loadTrainingStreak
} from "../services/trainingStreak";
import {
  EMPTY_TRAINING_STREAK
} from "../quiz/trainingStreak";

import type {
  TrainingStreakState
} from "../quiz/trainingStreak";

type HookState = TrainingStreakState & {
  loading: boolean;
  error: string | null;
};

const EMPTY_STATE: HookState = {
  ...EMPTY_TRAINING_STREAK,
  completedToday: false,
  loading: true,
  error: null
};

export function useTrainingStreak(): HookState & {
  reload: () => void;
} {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<HookState>(EMPTY_STATE);

  useEffect(() => {
    let active = true;
    let request = 0;

    const unsubscribe = subscribeToAuth(user => {
      const currentRequest = request + 1;
      request = currentRequest;
      const owner = user
        ? { kind: "user" as const, uid: user.uid }
        : { kind: "guest" as const };

      setState({ ...EMPTY_STATE, loading: true });

      void loadTrainingStreak(owner)
        .then(streak => {
          if (!active || request !== currentRequest) {
            return;
          }

          setState({
            ...streak,
            loading: false,
            error: null
          });
        })
        .catch(error => {
          if (!active || request !== currentRequest) {
            return;
          }

          setState({
            ...EMPTY_STATE,
            loading: false,
            error: error instanceof Error
              ? error.message
              : "Training streak could not be loaded."
          });
        });
    });

    return () => {
      active = false;
      request += 1;
      unsubscribe();
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setReloadKey(value => value + 1);
  }, []);

  return { ...state, reload };
}
