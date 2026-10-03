import {
  useEffect,
  useState
} from "react";

import type { User } from "firebase/auth";

import {
  subscribeToAuth
} from "../services/auth";
import {
  loadTrainingDraft
} from "../services/trainingProgress";

import type {
  DraftValidation,
  TrainingDraftOwner
} from "./trainingProgress";

type AvailableDraftState = {
  loading: boolean;
  user: User | null;
  owner: TrainingDraftOwner | null;
  validation: DraftValidation | null;
  error: string | null;
};

export function useAvailableTrainingDraft():
  AvailableDraftState & {
    reload: () => void;
  } {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] =
    useState<AvailableDraftState>({
      loading: true,
      user: null,
      owner: null,
      validation: null,
      error: null
    });

  useEffect(() => {
    let active = true;
    let latestLoad = 0;
    let currentIdentity: string | null = null;

    const unsubscribe = subscribeToAuth(user => {
      const owner: TrainingDraftOwner = user
        ? {
            kind: "user",
            uid: user.uid
          }
        : {
            kind: "guest"
          };
      const identity = owner.kind === "user"
        ? `user:${owner.uid}`
        : "guest";
      const load = latestLoad + 1;

      latestLoad = load;
      currentIdentity = identity;

      setState(current => ({
        ...current,
        loading: true,
        user,
        owner,
        validation: null,
        error: null
      }));

      void loadTrainingDraft(owner)
        .then(validation => {
          if (
            !active ||
            load !== latestLoad ||
            identity !== currentIdentity
          ) {
            return;
          }

          setState({
            loading: false,
            user,
            owner,
            validation,
            error: null
          });
        })
        .catch(error => {
          if (
            !active ||
            load !== latestLoad ||
            identity !== currentIdentity
          ) {
            return;
          }

          setState({
            loading: false,
            user,
            owner,
            validation: null,
            error: error instanceof Error
              ? error.message
              : "Training progress could not be loaded."
          });
        });
    });

    return () => {
      active = false;
      latestLoad += 1;
      currentIdentity = null;
      unsubscribe();
    };
  }, [reloadKey]);

  return {
    ...state,
    reload: () =>
      setReloadKey(value => value + 1)
  };
}
