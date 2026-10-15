import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from "react";

import type {
  ReactNode
} from "react";

import {
  assignChallengeDifficulty,
  recordAdaptivePerformance
} from "./adaptiveDifficulty";

import type {
  AdaptiveDifficulty,
  AdaptiveDifficultyState,
  ObjectivePerformance
} from "./adaptiveDifficulty";

type RootContextValue = {
  state: AdaptiveDifficultyState;
  update: (
    updater: (
      current: AdaptiveDifficultyState
    ) => AdaptiveDifficultyState
  ) => void;
};

const RootContext =
  createContext<RootContextValue | null>(null);
const ScopeContext =
  createContext<string | null>(null);

export function AdaptiveDifficultyProvider({
  state,
  onChange,
  children
}: {
  state: AdaptiveDifficultyState;
  onChange: (
    state: AdaptiveDifficultyState
  ) => void;
  children: ReactNode;
}) {
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);

  stateRef.current = state;
  onChangeRef.current = onChange;

  const update = useCallback<
    RootContextValue["update"]
  >(updater => {
    const current = stateRef.current;
    const next = updater(current);

    if (next === current) {
      return;
    }

    stateRef.current = next;
    onChangeRef.current(next);
  }, []);

  const value = useMemo<RootContextValue>(
    () => ({ state, update }),
    [state, update]
  );

  return (
    <RootContext.Provider value={value}>
      {children}
    </RootContext.Provider>
  );
}

export function AdaptiveDifficultyScope({
  name,
  children
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ScopeContext.Provider value={name}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useAdaptiveChallenge(
  questionId: string
): {
  difficulty: AdaptiveDifficulty | null;
  commit: (
    performance: ObjectivePerformance
  ) => void;
} {
  const root = useContext(RootContext);
  const scope = useContext(ScopeContext);
  const eventId = root && scope
    ? `${scope}:${questionId}`
    : null;
  const difficulty = eventId && root
    ? root.state.challengeLevels[eventId] ??
      root.state.level
    : null;

  useEffect(() => {
    if (!root || !eventId) {
      return;
    }

    root.update(current =>
      assignChallengeDifficulty(
        current,
        eventId
      )
    );
  }, [eventId, root]);

  const commit = useCallback((
    performance: ObjectivePerformance
  ) => {
    if (!root || !eventId) {
      return;
    }

    root.update(current =>
      recordAdaptivePerformance(
        current,
        eventId,
        performance
      )
    );
  }, [eventId, root]);

  return {
    difficulty,
    commit
  };
}
