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
  TrainingMethodId
} from "../../type";
import type {
  PersistedWritingJudgeResult,
  WritingJudgeResult,
  WritingJudgeState
} from "../../writingJudgeState";

type RootContextValue = {
  sessionId: string;
  state: WritingJudgeState;
  save: (
    eventId: string,
    record: PersistedWritingJudgeResult
  ) => void;
};

type ScopeContextValue = {
  name: string;
  methodId: TrainingMethodId;
};

const RootContext =
  createContext<RootContextValue | null>(null);
const ScopeContext =
  createContext<ScopeContextValue | null>(null);

export function WritingJudgeProvider({
  sessionId,
  state,
  onChange,
  children
}: {
  sessionId: string;
  state: WritingJudgeState;
  onChange: (state: WritingJudgeState) => void;
  children: ReactNode;
}) {
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);

  stateRef.current = state;
  onChangeRef.current = onChange;

  const save = useCallback<
    RootContextValue["save"]
  >((eventId, record) => {
    const next = {
      ...stateRef.current,
      [eventId]: record
    };

    stateRef.current = next;
    onChangeRef.current(next);
  }, []);

  const value = useMemo<RootContextValue>(
    () => ({ sessionId, state, save }),
    [sessionId, state, save]
  );

  return (
    <RootContext.Provider value={value}>
      {children}
    </RootContext.Provider>
  );
}

export function WritingJudgeScope({
  name,
  methodId,
  children
}: {
  name: string;
  methodId: TrainingMethodId;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ name, methodId }),
    [name, methodId]
  );

  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useWritingJudgeRecord(
  taskId: string,
  userWriting: string
): {
  available: boolean;
  sessionId: string | null;
  methodId: TrainingMethodId | null;
  result: WritingJudgeResult | null;
  save: (result: WritingJudgeResult) => void;
} {
  const root = useContext(RootContext);
  const scope = useContext(ScopeContext);
  const eventId = root && scope
    ? `${scope.name}:${taskId}`
    : null;
  const stored = eventId && root
    ? root.state[eventId]
    : undefined;
  const result =
    stored &&
    scope &&
    stored.methodId === scope.methodId &&
    stored.taskId === taskId &&
    stored.userWriting === userWriting
      ? stored.result
      : null;

  const save = useCallback((
    nextResult: WritingJudgeResult
  ) => {
    if (!root || !scope || !eventId) {
      return;
    }

    root.save(eventId, {
      methodId: scope.methodId,
      taskId,
      userWriting,
      result: nextResult
    });
  }, [eventId, root, scope, taskId, userWriting]);

  return {
    available: Boolean(root && scope && eventId),
    sessionId: root?.sessionId ?? null,
    methodId: scope?.methodId ?? null,
    result,
    save
  };
}
