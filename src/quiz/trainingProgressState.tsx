import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState as useReactState
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction
} from "react";

import type {
  ResumableScopeState,
  TrainingInternalState
} from "./trainingProgress";

type RootContextValue = {
  getScopeState: (
    scope: string
  ) => ResumableScopeState | undefined;
  setValue: (
    scope: string,
    slot: number,
    value: unknown
  ) => void;
  setNamedValue: (
    scope: string,
    key: string,
    value: unknown
  ) => void;
  registerCheckpoint: (
    checkpoint: () => void
  ) => () => void;
};

type ScopeContextValue = {
  scope: string;
  allocateSlot: () => number;
};

const RootContext =
  createContext<RootContextValue | null>(null);
const ScopeContext =
  createContext<ScopeContextValue | null>(null);

export function TrainingProgressStateProvider({
  state,
  onChange,
  checkpointRef,
  children
}: {
  state: TrainingInternalState;
  onChange: (state: TrainingInternalState) => void;
  checkpointRef?: MutableRefObject<
    (() => void) | null
  >;
  children: ReactNode;
}) {
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);
  const checkpoints = useRef(
    new Set<() => void>()
  );

  stateRef.current = state;
  onChangeRef.current = onChange;

  const updateScope = useCallback((
    scope: string,
    update: (
      current: ResumableScopeState
    ) => ResumableScopeState
  ) => {
    const current = stateRef.current[scope] ?? {
      slots: [],
      named: {}
    };
    const next = {
      ...stateRef.current,
      [scope]: update(current)
    };

    stateRef.current = next;
    onChangeRef.current(next);
  }, []);

  const value = useMemo<RootContextValue>(
    () => ({
      getScopeState: scope =>
        stateRef.current[scope],
      setValue: (scope, slot, nextValue) => {
        updateScope(scope, current => {
          const slots = [...current.slots];
          slots[slot] = nextValue;
          return {
            ...current,
            slots
          };
        });
      },
      setNamedValue: (scope, key, nextValue) => {
        updateScope(scope, current => ({
          ...current,
          named: {
            ...current.named,
            [key]: nextValue
          }
        }));
      },
      registerCheckpoint: checkpoint => {
        checkpoints.current.add(checkpoint);
        return () => {
          checkpoints.current.delete(checkpoint);
        };
      }
    }),
    [updateScope]
  );

  useEffect(() => {
    if (!checkpointRef) {
      return;
    }

    checkpointRef.current = () => {
      checkpoints.current.forEach(
        checkpoint => checkpoint()
      );
    };

    return () => {
      checkpointRef.current = null;
    };
  }, [checkpointRef]);

  return (
    <RootContext.Provider value={value}>
      {children}
    </RootContext.Provider>
  );
}

export function useTrainingProgressCheckpoint(
  checkpoint: () => void
): void {
  const root = useContext(RootContext);
  const checkpointRef = useRef(checkpoint);

  checkpointRef.current = checkpoint;

  useEffect(() => {
    if (!root) {
      return;
    }

    return root.registerCheckpoint(
      () => checkpointRef.current()
    );
  }, [root]);
}

export function TrainingStateScope({
  name,
  children
}: {
  name: string;
  children: ReactNode;
}) {
  const nextSlot = useRef(0);
  const value = useMemo<ScopeContextValue>(
    () => ({
      scope: name,
      allocateSlot: () => {
        const slot = nextSlot.current;
        nextSlot.current += 1;
        return slot;
      }
    }),
    [name]
  );

  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useTrainingState<T>(
  initialState: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const root = useContext(RootContext);
  const scope = useContext(ScopeContext);
  const slotRef = useRef<number | null>(null);

  if (scope && slotRef.current === null) {
    slotRef.current = scope.allocateSlot();
  }

  const slot = slotRef.current;
  const savedValue =
    root && scope && slot !== null
      ? root.getScopeState(
          scope.scope
        )?.slots[slot]
      : undefined;
  const [value, setValue] = useReactState<T>(() => {
    if (savedValue !== undefined) {
      return savedValue as T;
    }

    return typeof initialState === "function"
      ? (initialState as () => T)()
      : initialState;
  });

  useEffect(() => {
    if (
      root &&
      scope &&
      slot !== null &&
      savedValue === undefined
    ) {
      root.setValue(scope.scope, slot, value);
    }
  }, [root, savedValue, scope, slot, value]);

  const setResumableValue = useCallback<
    Dispatch<SetStateAction<T>>
  >(
    action => {
      setValue(previous => {
        const next = typeof action === "function"
          ? (action as (value: T) => T)(previous)
          : action;

        if (Object.is(previous, next)) {
          return previous;
        }

        if (root && scope && slot !== null) {
          root.setValue(scope.scope, slot, next);
        }

        return next;
      });
    },
    [root, scope, slot]
  );

  return [value, setResumableValue];
}

export function useResumableNamedRecord<T>(
  key: string
): {
  get: (itemKey: string) => T | undefined;
  set: (itemKey: string, value: T) => void;
} {
  const root = useContext(RootContext);
  const scope = useContext(ScopeContext);
  const local = useRef<Record<string, T>>(
    root && scope
      ? (root.getScopeState(
          scope.scope
        )?.named[key] as
          Record<string, T> | undefined) ?? {}
      : {}
  );
  const syncQueued = useRef(false);

  return {
    get: itemKey => local.current[itemKey],
    set: (itemKey, value) => {
      local.current = {
        ...local.current,
        [itemKey]: value
      };

      if (root && scope) {
        if (!syncQueued.current) {
          syncQueued.current = true;
          queueMicrotask(() => {
            syncQueued.current = false;
            root.setNamedValue(
              scope.scope,
              key,
              local.current
            );
          });
        }
      }
    }
  };
}
