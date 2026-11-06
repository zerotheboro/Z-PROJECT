import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { useTrainingScopeName } from "./trainingProgressState";
import { createQuestionUXState } from "./questionUXState";
import { ASSESSMENT_PROGRESS_SOUND_SOURCE, createAssessmentProgressSound } from "./assessmentProgressSound";
import type { ProgressAudio } from "./assessmentProgressSound";

export const QUESTION_ADVANCE_DELAY_MS = 300;
export type QuestionInteractionControl = { pause: () => void; resume: () => void; clear: () => void; complete: (key: string) => void };
type InteractionContext = {
  register: (cancel: () => void) => () => void;
  blocked: () => boolean;
  complete: (key: string) => void;
  soundAvailable: boolean;
  soundEnabled: boolean;
  reducedStimulation: boolean;
  toggleSound: () => void;
  records: ReturnType<typeof createQuestionUXState>;
};
const QuestionUXContext = createContext<InteractionContext | null>(null);

export function AssessmentQuestionUXProvider({ children, controlRef, blocked = false,
  soundSource = ASSESSMENT_PROGRESS_SOUND_SOURCE, createAudio, storageKey, finished = false
}: { children: ReactNode; controlRef?: MutableRefObject<QuestionInteractionControl | null>;
  blocked?: boolean; soundSource?: string | null; createAudio?: (source: string) => ProgressAudio;
  storageKey?: string; finished?: boolean }) {
  const records = useMemo(() => createQuestionUXState(storageKey), [storageKey]);
  const cancellations = useRef(new Set<() => void>());
  const paused = useRef(false);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [reducedStimulation, setReducedStimulation] = useState(() =>
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const sound = useMemo(() => createAssessmentProgressSound(soundSource, createAudio), [soundSource, createAudio]);
  const soundPreference = useRef({ soundEnabled, reducedStimulation });
  soundPreference.current = { soundEnabled, reducedStimulation };
  const complete = useCallback((key: string) => {
    if (paused.current || blockedRef.current || records.get("completion", "sound", key) === true) return;
    records.set("completion", "sound", key, true);
    if (soundPreference.current.soundEnabled && !soundPreference.current.reducedStimulation) sound.play();
  }, [records, sound]);
  const cancelAll = useCallback(() => cancellations.current.forEach(cancel => cancel()), []);
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = { pause: () => { paused.current = true; cancelAll(); }, resume: () => { paused.current = false; }, clear: records.clear, complete };
    return () => { controlRef.current = null; cancelAll(); };
  }, [controlRef, cancelAll, records, complete]);
  useEffect(() => { if (finished) records.clear(); }, [finished, records]);
  useEffect(() => { if (blocked) cancelAll(); }, [blocked, cancelAll]);
  useEffect(() => () => sound.dispose(), [sound]);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedStimulation(preference.matches);
    preference.addEventListener?.("change", update);
    return () => preference.removeEventListener?.("change", update);
  }, []);
  const value = useMemo<InteractionContext>(() => ({
    register: cancel => { cancellations.current.add(cancel); return () => { cancellations.current.delete(cancel); }; },
    blocked: () => paused.current || blockedRef.current,
    complete,
    soundAvailable: Boolean(soundSource), soundEnabled, reducedStimulation,
    toggleSound: () => setSoundEnabled(enabled => !enabled), records
  }), [sound, soundEnabled, reducedStimulation, soundSource, records, complete]);
  return <QuestionUXContext.Provider value={value}>{children}</QuestionUXContext.Provider>;
}

export function useQuestionUXRecord<T>(name: string) {
  const ux = useContext(QuestionUXContext);
  const scope = useTrainingScopeName();
  const local = useRef(new Map<string, T>());
  return {
    get: (key: string) => ux ? ux.records.get(scope, name, key) as T | undefined : local.current.get(key),
    set: (key: string, value: T) => { if (ux) ux.records.set(scope, name, key, value); else local.current.set(key, value); }
  };
}

export function AssessmentSoundToggle() {
  const ux = useContext(QuestionUXContext);
  if (!ux?.soundAvailable) return null;
  return <button type="button" className="secondary-action" aria-pressed={ux.soundEnabled && !ux.reducedStimulation}
    disabled={ux.reducedStimulation} onClick={ux.toggleSound}>
    {ux.reducedStimulation ? "Completion sound off (reduced stimulation)" : `Completion sound: ${ux.soundEnabled ? "on" : "off"}`}
  </button>;
}

export function useQuestionCompletionFeedback() {
  const ux = useContext(QuestionUXContext);
  const completed = useQuestionUXRecord<boolean>("question-feedback");
  return (key: string) => {
    if (ux?.blocked() || completed.get(key) === true) return;
    completed.set(key, true);
    // Individual answers update display metadata only. Audio is dispatched
    // from validated section/activity completion callbacks instead.
  };
}

export function useAssessmentCompletionSound() {
  const ux = useContext(QuestionUXContext);
  return (key: string) => ux?.complete(key);
}

/** Interaction-triggered only: restored answers never schedule navigation. */
export function useQuestionAdvance(questionKey: string, onComplete: () => boolean) {
  const ux = useContext(QuestionUXContext);
  const uxRef = useRef(ux);
  uxRef.current = ux;
  const announceCompletion = useQuestionCompletionFeedback();
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const state = useRef({ key: questionKey, sequence: 0, timer: null as number | null, finished: false, mounted: true });
  const [pending, setPending] = useState(false);
  if (state.current.key !== questionKey) {
    if (state.current.timer !== null) window.clearTimeout(state.current.timer);
    state.current = { ...state.current, key: questionKey, timer: null, finished: false, sequence: state.current.sequence + 1 };
  }
  const cancel = useCallback(() => {
    const current = state.current;
    if (current.timer !== null) window.clearTimeout(current.timer);
    current.timer = null;
    current.sequence += 1;
    if (current.mounted) setPending(false);
  }, []);
  useEffect(() => { setPending(false); }, [questionKey]);
  useEffect(() => ux?.register(cancel), [ux, cancel]);
  useEffect(() => {
    state.current.mounted = true;
    return () => { state.current.mounted = false; cancel(); };
  }, [cancel]);

  function feedback() {
    announceCompletion(questionKey);
  }
  function completeNow() {
    const current = state.current;
    if (!current.mounted || current.key !== questionKey || current.finished || uxRef.current?.blocked()) return;
    cancel();
    current.finished = true;
    if (completeRef.current()) feedback();
    else current.finished = false;
  }
  function schedule() {
    const current = state.current;
    if (!current.mounted || current.finished || uxRef.current?.blocked()) return;
    cancel();
    const sequence = current.sequence;
    feedback();
    setPending(true);
    current.timer = window.setTimeout(() => {
      if (state.current.key === questionKey && state.current.sequence === sequence) completeNow();
    }, QUESTION_ADVANCE_DELAY_MS);
  }
  return { schedule, completeNow, cancel, pending, blocked: () => uxRef.current?.blocked() ?? false };
}

export function AssessmentSectionProgress({ label, completed, total, unit = "questions" }:
  { label: string; completed: number; total: number; unit?: string }) {
  if (total <= 0) return null;
  const count = Math.max(0, Math.min(total, completed));
  const percentage = Math.round(count / total * 100);
  return <div className="assessment-section-progress">
    <div className="assessment-progress"><strong>{label}</strong><span>{count} of {total} {unit} completed · {percentage}%</span></div>
    <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total}
      aria-valuenow={count} aria-valuetext={`${count} of ${total} ${unit} completed`}>
      <div className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  </div>;
}
