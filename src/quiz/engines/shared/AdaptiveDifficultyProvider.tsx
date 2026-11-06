import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef
} from "react";

import type {
  ReactNode
} from "react";

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
  legacyOptionDifficulty: AdaptiveDifficulty | null;
  commit: (
    performance: ObjectivePerformance
  ) => void;
} {
  const root = useContext(RootContext);
  const scope = useContext(ScopeContext);
  const eventId = root && scope
    ? `${scope}:${questionId}`
    : null;
  // Only assignments already present in a saved draft describe a previously
  // offered 2/3/4-choice question. New questions never create assignments.
  const legacyOptionDifficulty = eventId && root
    ? root.state.challengeLevels[eventId] ?? null
    : null;
  const difficulty = legacyOptionDifficulty ?? root?.state.level ?? null;
  // Retain the public callback and historical metadata contract. Performance
  // no longer adapts labels or alters any later question.
  const commit = useCallback((_performance: ObjectivePerformance) => {}, []);

  return {
    difficulty,
    legacyOptionDifficulty,
    commit
  };
}
