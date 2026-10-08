import {
  useCallback,
  useEffect,
  useState
} from "react";

import type { User } from "firebase/auth";

import {
  subscribeToAuth
} from "../services/auth";
import {
  loadAIRecommendationAccess
} from "../services/aiRecommendationAccess";

import type {
  AIRecommendationAccess
} from "../services/aiRecommendationAccess";

type State = {
  loading: boolean;
  error: string | null;
  user: User | null;
  access: AIRecommendationAccess | null;
};

export function useAIRecommendationAccess(): State & {
  refreshAccess: () => void;
} {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({
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

      void loadAIRecommendationAccess(user)
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
              : "AI recommendation access could not be loaded.",
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

  return {
    ...state,
    refreshAccess: useCallback(() => {
      setReloadKey(value => value + 1);
    }, [])
  };
}
