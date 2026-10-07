import {
  useCallback,
  useEffect,
  useState
} from "react";

import type {
  User
} from "firebase/auth";

import {
  subscribeToAuth
} from "../services/auth";
import {
  loadTrainingAccess
} from "../services/trainingAccess";

import type {
  TrainingAccessStatus
} from "../services/trainingAccess";

type TrainingAccessHook = {
  loading: boolean;
  error: string | null;
  user: User | null;
  access: TrainingAccessStatus | null;
  plan: "free" | "premium";
  unlimited: boolean;
  testMeUsed: number;
  testMeLimit: number;
  testMeRemaining: number | null;
  manualMethodsUsed: number;
  manualMethodsLimit: number;
  manualMethodsRemaining: number | null;
  refreshAccess: () => void;
};

export function useTrainingAccess(): TrainingAccessHook {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    user: User | null;
    access: TrainingAccessStatus | null;
  }>({
    loading: true,
    error: null,
    user: null,
    access: null
  });

  useEffect(() => {
    let active = true;
    let loadSequence = 0;

    const unsubscribe = subscribeToAuth(user => {
      const sequence = loadSequence + 1;
      loadSequence = sequence;

      setState({
        loading: true,
        error: null,
        user,
        access: null
      });

      void loadTrainingAccess(user)
        .then(access => {
          if (!active || sequence !== loadSequence) {
            return;
          }
          setState({
            loading: false,
            error: null,
            user,
            access
          });
        })
        .catch(error => {
          if (!active || sequence !== loadSequence) {
            return;
          }
          setState({
            loading: false,
            error: error instanceof Error
              ? error.message
              : "Training access could not be loaded.",
            user,
            access: null
          });
        });
    });

    return () => {
      active = false;
      loadSequence += 1;
      unsubscribe();
    };
  }, [reloadKey]);

  const refreshAccess = useCallback(() => {
    setReloadKey(value => value + 1);
  }, []);
  const access = state.access;

  return {
    ...state,
    plan: access?.plan ?? "free",
    unlimited: access?.unlimited ?? false,
    testMeUsed: access?.usage.testMeStarted ?? 0,
    testMeLimit: access?.limits.testMePerDay ?? 1,
    testMeRemaining: access?.remaining.testMe ?? null,
    manualMethodsUsed:
      access?.usage.manualMethodsStarted ?? 0,
    manualMethodsLimit:
      access?.limits.manualMethodsPerDay ?? 3,
    manualMethodsRemaining:
      access?.remaining.manualMethods ?? null,
    refreshAccess
  };
}
