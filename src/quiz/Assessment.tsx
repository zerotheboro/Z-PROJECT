import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Navigate,
  useLocation,
  useNavigate
} from "react-router-dom";

import NAV from "../HEADER/header";
import TrainingCompletionRecovery from "../components/TrainingCompletionRecovery";
import { localCompletionConfig } from "../services/localTrainingCompletionConfig";
import { getLocalTrainingCompletionClient } from "../services/localTrainingCompletion";
import { CompletionOutboxError } from "../services/trainingCompletionOutbox";
import { saveAssessment } from "../services/assessment";
import { freezeManualTraining, restoreManualTraining, saveManualTraining } from "../services/manualTrainingHistory";
import { loadAIRecommendation } from "../services/aiRecommendationPersistence";
import type { SavedAIRecommendation } from "../services/aiRecommendationPersistence";
import {
  reserveTrainingAccess
} from "../services/trainingAccess";
import {
  recordTrainingCompletion
} from "../services/trainingStreak";
import {
  discardTrainingDraft,
  forceDiscardTrainingDraft,
  writeLocalTrainingDraft,
  saveTrainingDraft,
  TrainingDraftConflictError
} from "../services/trainingProgress";
import DiscardTrainingDialog from "./DiscardTrainingDialog";
import {
  AdaptiveDifficultyProvider
} from "./engines/shared/AdaptiveDifficultyProvider";
import {
  WritingJudgeProvider
} from "./engines/shared/WritingJudgeProvider";
import { selectMethods } from "./methodSelector";
import {
  getAIRecommendationCandidates,
  getAIRecommendationKey,
  getRelevantAIRecommendedMethods
} from "./aiRecommendationContext";
import { loadRecommendationWithin } from "./aiRecommendationLookup";
import { learningSituationQuestions } from "./assessmentData";
import { buildLearningProfile } from "./profileBuilder";
import BaselineChallenge from "./sections/BaselineChallenge";
import LearningSituation from "./sections/LearningSituation";
import MethodIntroduction from "./sections/MethodIntroduction";
import MethodLab from "./sections/MethodLab";
import MethodMatchChallenge from "./sections/MethodMatchChallenge";
import Reflection from "./sections/Reflection";
import {
  MANUAL_TRAINING_MODE,
  readManualTrainingMethods
} from "./trainingSession";
import {
  createSessionId,
  createTrainingDraft
} from "./trainingProgress";
import {
  TrainingProgressStateProvider,
  TrainingStateScope
} from "./trainingProgressState";
import { useAvailableTrainingDraft } from "./useAvailableTrainingDraft";

import type {
  User
} from "firebase/auth";
import type {
  TrainingDraft,
  TrainingDraftOwner,
  TrainingInternalState,
  TrainingPhase
} from "./trainingProgress";
import type {
  LearningProfile,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult,
  TrainingMethodId
} from "./type";

const AUTOSAVE_DEBOUNCE_MS = 1_200;
const TIMER_CHECKPOINT_MS = 15_000;

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "saved-local"
  | "failed"
  | "conflict";

function ownerKey(owner: TrainingDraftOwner): string {
  return owner.kind === "user"
    ? `user:${owner.uid}`
    : "guest";
}

function phaseForSection(section: number): TrainingPhase {
  return [
    "situation",
    "situation",
    "baseline",
    "introduction",
    "lab",
    "match",
    "reflection",
    "final-save"
  ][section] as TrainingPhase;
}

function LoadingAssessment() {
  return (
    <main className="assessment assessment-v2">
      <NAV />
      <section className="training-system-message">
        <h1>Restoring training...</h1>
        <p>
          Checking the correct saved session for this browser or account.
        </p>
      </section>
    </main>
  );
}

function AssessmentProblem({
  title,
  message,
  onDiscard,
  busy,
  error
}: {
  title: string;
  message: string;
  onDiscard?: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const navigate = useNavigate();

  return (
    <main className="assessment assessment-v2">
      <NAV />
      <section className="training-system-message">
        <h1>{title}</h1>
        <p>{message}</p>
        {error && <p role="alert">{error}</p>}
        <div className="training-dialog-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => navigate("/training")}
          >
            Back to training
          </button>
          {onDiscard && (
            <button
              type="button"
              disabled={busy}
              onClick={onDiscard}
            >
              Discard current training
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function NewAssessmentSession({
  user,
  owner,
  mode,
  methods
}: {
  user: User | null;
  owner: TrainingDraftOwner;
  mode: "auto" | "manual";
  methods: TrainingMethodId[];
}) {
  const [sessionId] = useState(createSessionId);
  const [draft] = useState(() =>
    createTrainingDraft({
      owner,
      mode,
      selectedMethods: methods,
      sessionId
    })
  );
  const [reservation, setReservation] = useState<
    "checking" | "allowed" | "denied"
  >("checking");
  const [reservationError, setReservationError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void reserveTrainingAccess(user, {
      sessionId,
      mode,
      methodIds: methods
    })
      .then(() => {
        if (active) {
          setReservation("allowed");
        }
      })
      .catch(error => {
        if (active) {
          setReservation("denied");
          setReservationError(
            error instanceof Error
              ? error.message
              : "Training access could not be reserved."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [methods, mode, sessionId, user]);

  if (reservation === "checking") {
    return <LoadingAssessment />;
  }

  if (reservation === "denied") {
    return (
      <AssessmentProblem
        title="Training could not start"
        message={reservationError ??
          "Training access could not be reserved."}
      />
    );
  }

  return (
    <AssessmentSession
      initialDraft={draft}
      isNewSession
    />
  );
}

function Assessment() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    loading,
    user,
    owner,
    validation,
    error: loadError,
    reload
  } = useAvailableTrainingDraft();
  const attemptOwner = useRef<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const parameters = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const resumeSessionId = parameters.get("resume");
  const isManualRequest =
    parameters.get("mode") === MANUAL_TRAINING_MODE;
  const manualMethods = useMemo(
    () => isManualRequest
      ? readManualTrainingMethods(location.state)
      : null,
    [isManualRequest, location.state]
  );

  function guardLocalRecovery(content: ReactElement, pendingSessionId?: string) {
    return localCompletionConfig() && owner?.kind === "user"
      ? <TrainingCompletionRecovery key={`${owner.uid}:${pendingSessionId ?? "pending"}`} uid={owner.uid} sessionId={pendingSessionId}>
          {content}
        </TrainingCompletionRecovery>
      : content;
  }

  if (loading || !owner) {
    return <LoadingAssessment />;
  }

  const currentOwnerKey = ownerKey(owner);
  if (attemptOwner.current === null) {
    attemptOwner.current = currentOwnerKey;
  }

  if (attemptOwner.current !== currentOwnerKey) {
    return (
      <AssessmentProblem
        title="Training paused"
        message="Your sign-in state changed during this attempt. Return to Training to resume the session belonging to the current account or browser."
      />
    );
  }

  const draft = validation?.valid ? validation.draft : null;

  async function discardExisting() {
    setDiscarding(true);
    setDiscardError(null);

    try {
      if (draft) {
        await discardTrainingDraft(owner!, draft.sessionId);
      } else {
        await forceDiscardTrainingDraft(owner!);
      }

      setShowReplaceDialog(false);
      reload();
    } catch {
      setDiscardError(
        "The saved session could not be deleted. Nothing permanent was changed; please retry."
      );
    } finally {
      setDiscarding(false);
    }
  }

  if (loadError) {
    return guardLocalRecovery(
      <AssessmentProblem
        title="Training progress is unavailable"
        message={loadError}
      />, resumeSessionId ?? undefined
    );
  }

  if (resumeSessionId) {
    if (draft && draft.sessionId === resumeSessionId) {
      return guardLocalRecovery(
        <AssessmentSession
          initialDraft={draft}
          isNewSession={false}
        />, resumeSessionId
      );
    }

    return guardLocalRecovery(
      <AssessmentProblem
        title="Saved training cannot be resumed"
        message={
          validation && !validation.valid
            ? validation.reason
            : "That unfinished training session is no longer available."
        }
        onDiscard={validation
          ? () => void discardExisting()
          : undefined}
        busy={discarding}
        error={discardError}
      />, resumeSessionId
    );
  }

  if (isManualRequest && !manualMethods) {
    return <Navigate to="/training/choose" replace />;
  }

  if (validation && !validation.valid) {
    return (
      <AssessmentProblem
        title="Saved training cannot be resumed"
        message={validation.reason}
        onDiscard={() => void discardExisting()}
        busy={discarding}
        error={discardError}
      />
    );
  }

  if (draft) {
    return (
      <main className="assessment assessment-v2">
        <NAV />
        <section className="training-system-message">
          <h1>You already have unfinished training</h1>
          <p>
            Resume it, or discard only that unfinished session before starting a new one.
          </p>
          <div className="training-dialog-actions">
            <button
              type="button"
              onClick={() => navigate(
                `/training/assessment?resume=${encodeURIComponent(draft.sessionId)}`,
                { replace: true }
              )}
            >
              Resume
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowReplaceDialog(true)}
            >
              Discard current training
            </button>
          </div>
        </section>

        {showReplaceDialog && (
          <DiscardTrainingDialog
            busy={discarding}
            error={discardError}
            onCancel={() => {
              setShowReplaceDialog(false);
              setDiscardError(null);
            }}
            onConfirm={() => void discardExisting()}
          />
        )}
      </main>
    );
  }

  return guardLocalRecovery(
    <NewAssessmentSession
      user={user}
      owner={owner}
      mode={isManualRequest ? "manual" : "auto"}
      methods={manualMethods ?? []}
    />
  );
}

function AssessmentSession({
  initialDraft,
  isNewSession
}: {
  initialDraft: TrainingDraft;
  isNewSession: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [manualRecovery] = useState(() => restoreManualTraining(initialDraft));
  const [draft, setDraft] = useState<TrainingDraft>(manualRecovery.draft);
  const draftRef = useRef(draft);
  const sessionActive = useRef(true);
  const mounted = useRef(true);
  const durableQueuedRef = useRef(false);
  const canCreateCloudDraft = useRef(isNewSession);
  const saveInFlight = useRef<Promise<boolean> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [finalSaveError, setFinalSaveError] = useState<string | null>(manualRecovery.error);
  const [streakFeedback, setStreakFeedback] = useState<string | null>(null);
  const [durableQueued, setDurableQueued] = useState(false);
  const [selectingMethods, setSelectingMethods] = useState(
    initialDraft.pendingAIConfirmation !== undefined
  );
  const [pendingAIContext, setPendingAIContext] = useState<
    SavedAIRecommendation | null
  >(null);
  const [aiContextNotice, setAIContextNotice] = useState<string | null>(null);
  const selectionInFlight = useRef(false);
  const finalSaveInFlight = useRef(false);
  const completionTime = useRef<string | null | undefined>(manualRecovery.draft !== initialDraft ? manualRecovery.completedAt : undefined);
  const checkpointRef = useRef<(() => void) | null>(null);

  draftRef.current = draft;

  const updateDraft = useCallback((
    update: (current: TrainingDraft) => TrainingDraft
  ) => {
    setDraft(current => ({
      ...update(current),
      updatedAt: new Date().toISOString(),
      revision: current.revision + 1
    }));
  }, []);

  const updateInternalState = useCallback((
    internalState: TrainingInternalState
  ) => {
    updateDraft(current => ({ ...current, internalState }));
  }, [updateDraft]);

  const updateAdaptiveDifficulty = useCallback((
    adaptiveDifficulty:
      TrainingDraft["adaptiveDifficulty"]
  ) => {
    updateDraft(current => ({
      ...current,
      adaptiveDifficulty
    }));
  }, [updateDraft]);

  const updateWritingJudgeResults = useCallback((
    writingJudgeResults:
      TrainingDraft["writingJudgeResults"]
  ) => {
    updateDraft(current => ({
      ...current,
      writingJudgeResults
    }));
  }, [updateDraft]);

  const persistDraft = useCallback(async (): Promise<boolean> => {
    if (!sessionActive.current) {
      return false;
    }

    if (saveInFlight.current) {
      await saveInFlight.current;

      if (!sessionActive.current) {
        return false;
      }

      return persistDraft();
    }

    setSaveStatus("saving");
    setSaveError(null);

    const operation = saveTrainingDraft(draftRef.current, {
      allowCreate: canCreateCloudDraft.current
    })
      .then(() => {
        canCreateCloudDraft.current = false;
        setSaveStatus(
          draftRef.current.owner.kind === "guest"
            ? "saved-local"
            : "saved"
        );
        return true;
      })
      .catch(error => {
        if (error instanceof TrainingDraftConflictError) {
          sessionActive.current = false;
          setSaveStatus("conflict");
          setSaveError(error.message);
        } else {
          console.error(
            "Training cloud save failed",
            error
          );
          setSaveStatus("failed");
          setSaveError(
            draftRef.current.owner.kind === "guest"
              ? "Progress could not be saved in this browser."
              : "Cloud save failed. A browser recovery copy was kept when possible."
          );
        }
        return false;
      })
      .finally(() => {
        saveInFlight.current = null;
      });

    saveInFlight.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    if (!sessionActive.current) {
      return;
    }

    const timeout = window.setTimeout(
      () => void persistDraft(),
      AUTOSAVE_DEBOUNCE_MS
    );
    return () => window.clearTimeout(timeout);
  }, [draft, persistDraft]);

  useEffect(() => {
    const checkpoint = window.setInterval(() => {
      if (sessionActive.current) {
        checkpointRef.current?.();
        queueMicrotask(() => {
          if (sessionActive.current) {
            void persistDraft();
          }
        });
      }
    }, TIMER_CHECKPOINT_MS);
    return () => window.clearInterval(checkpoint);
  }, [persistDraft]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; sessionActive.current = false; };
  }, []);

  const selectedMethods = draft.selectedMethods;

  function finishMethodSelection(
    result: NonNullable<TrainingDraft["completed"]["baseline"]>,
    aiRecommendedMethods: TrainingMethodId[]
  ) {
    if (!sessionActive.current || draftRef.current.selectedMethods.length > 0) {
      return;
    }

    const situation = draftRef.current.completed.learningSituation;
    if (!situation) {
      return;
    }

    const methods = selectMethods(situation, result, aiRecommendedMethods);
    updateDraft(current => {
      const { pendingAIConfirmation: _pending, ...withoutPending } = current;
      return {
        ...withoutPending,
        section: 3,
        phase: phaseForSection(3),
        selectedMethods: methods,
        currentMethod: methods[0],
        currentMethodIndex: 0,
        completed: {
          ...current.completed,
          baseline: result
        }
      };
    });
    setPendingAIContext(null);
    setSelectingMethods(false);
    selectionInFlight.current = false;
  }

  async function resolveAIConfirmation(
    result: NonNullable<TrainingDraft["completed"]["baseline"]>,
    expectedKey: string | null,
    resuming: boolean
  ) {
    const owner = draftRef.current.owner;
    const situation = draftRef.current.completed.learningSituation;
    if (owner.kind !== "user" || !situation) {
      finishMethodSelection(result, []);
      return;
    }

    const saved = await loadRecommendationWithin(() =>
      loadAIRecommendation(owner)
    );
    if (!sessionActive.current || draftRef.current.selectedMethods.length > 0) {
      selectionInFlight.current = false;
      return;
    }

    const key = saved && getAIRecommendationKey(saved);
    const candidates = getAIRecommendationCandidates(saved, situation, result);
    if (saved && key && key.length <= 4_000 && candidates.length > 0 &&
      (expectedKey === null || expectedKey === key)) {
      updateDraft(current => ({
        ...current,
        pendingAIConfirmation: { recommendationKey: key }
      }));
      setPendingAIContext(saved);
      setSelectingMethods(false);
      return;
    }

    if (resuming) {
      setAIContextNotice(
        "The previous AI recommendation is no longer available for this session. Your Baseline result was kept, and four methods were selected from your assessment answers."
      );
    }
    finishMethodSelection(result, []);
  }

  useEffect(() => {
    if (!initialDraft.pendingAIConfirmation ||
      !initialDraft.completed.baseline ||
      initialDraft.selectedMethods.length > 0 ||
      selectionInFlight.current) {
      return;
    }
    selectionInFlight.current = true;
    void resolveAIConfirmation(
      initialDraft.completed.baseline,
      initialDraft.pendingAIConfirmation.recommendationKey,
      true
    );
  // Only an initially restored pending draft needs this lookup.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeBaseline(result: TrainingDraft["completed"]["baseline"]) {
    if (selectionInFlight.current || !result) {
      return;
    }

    const situation = draftRef.current.completed.learningSituation;
    if (!situation) {
      return;
    }

    selectionInFlight.current = true;
    setSelectingMethods(true);

    // Guest localStorage has no reliable person/session ownership.
    if (draftRef.current.owner.kind === "guest") {
      finishMethodSelection(result, []);
      return;
    }

    // Commit the Baseline synchronously so the immediate save (including
    // the browser recovery copy) carries this session and pending decision.
    // A reload during lookup can safely retry without rerunning Baseline.
    const current = draftRef.current;
    const pendingDraft: TrainingDraft = {
      ...current,
      completed: { ...current.completed, baseline: result },
      pendingAIConfirmation: { recommendationKey: null },
      updatedAt: new Date().toISOString(),
      revision: current.revision + 1
    };
    draftRef.current = pendingDraft;
    setDraft(pendingDraft);
    void persistDraft();
    await resolveAIConfirmation(result, null, false);
  }

  const advance = useCallback((
    section: number,
    completed: Partial<TrainingDraft["completed"]>
  ) => {
    updateDraft(current => ({
      ...current,
      section,
      phase: phaseForSection(section),
      completed: {
        ...current.completed,
        ...completed
      }
    }));
  }, [updateDraft]);

  const recordBaselineContent = useCallback((content: {
    memory: string;
    understanding: string;
  }) => {
    updateDraft(current => ({
      ...current,
      baselineContentSetIds: content
    }));
  }, [updateDraft]);

  const recordIntroductionProgress = useCallback((progress: {
    method: TrainingMethodId;
    methodIndex: number;
  }) => {
    updateDraft(current => ({
      ...current,
      currentMethod: progress.method,
      currentMethodIndex: progress.methodIndex
    }));
  }, [updateDraft]);

  const recordLabProgress = useCallback((progress: {
    method: TrainingMethodId;
    methodIndex: number;
    contentSetIds: string[];
  }) => {
    updateDraft(current => ({
      ...current,
      currentMethod: progress.method,
      currentMethodIndex: progress.methodIndex,
      labContentSetIds: progress.contentSetIds
    }));
  }, [updateDraft]);

  const recordMatchProgress = useCallback((progress: {
    method: TrainingMethodId;
    methodIndex: number;
    methods: TrainingMethodId[];
    contentSetIds: string[];
  }) => {
    updateDraft(current => ({
      ...current,
      currentMethod: progress.method,
      currentMethodIndex: progress.methodIndex,
      verificationMethodOrder: progress.methods,
      matchContentSetIds: progress.contentSetIds
    }));
  }, [updateDraft]);

  async function saveAndExit() {
    if (durableQueued) {
      // The exact payload is already committed to IndexedDB. Recovery on the
      // landing page does not need to resubmit reflection or reserve a session.
      sessionActive.current = false;
      navigate("/training");
      return;
    }
    checkpointRef.current?.();
    await Promise.resolve();
    const saved = await persistDraft();
    if (saved) {
      sessionActive.current = false;
      navigate("/training");
    }
  }

  async function discardCurrent() {
    if (durableQueued || localCompletionConfig() && draft.phase === "final-save") {
      setSaveError("Completed work is durably queued. Save and exit or retry final save; it must not be discarded as unfinished work.");
      return;
    }
    setDiscarding(true);
    setSaveError(null);
    sessionActive.current = false;

    try {
      if (saveInFlight.current) {
        await saveInFlight.current;
      }

      await discardTrainingDraft(draft.owner, draft.sessionId);
      setShowDiscard(false);
      navigate("/training", { replace: true });
    } catch {
      sessionActive.current = true;
      setSaveError(
        "Cloud deletion failed. The unfinished session was not reported as discarded; please retry."
      );
    } finally {
      setDiscarding(false);
    }
  }

  async function finishDurably(completedDraft: TrainingDraft, completedAt: string | null): Promise<boolean> {
    const client = getLocalTrainingCompletionClient();
    if (completedDraft.owner.kind !== "user") return false;
    if (!client) {
      if (localCompletionConfig()) throw new CompletionOutboxError("completion_owner_changed",
        "Sign-in changed before completion could be queued. Keep this page and draft; sign back into the original account. No legacy save was attempted.");
      return false;
    }
    // Keep ordinary draft autosaves running until IndexedDB confirms the exact
    // final results and original timestamp are durable. No network lookup here.
    const entry = await client.prepare(completedDraft, completedAt);
    if (!entry) return false;
    sessionActive.current = false;
    durableQueuedRef.current = true;
    if (mounted.current) setDurableQueued(true);
    if (saveInFlight.current) await saveInFlight.current;
    if (mounted.current && !new URLSearchParams(location.search).get("resume")) {
      // Make refresh address the frozen session BEFORE any request can commit.
      // Its outbox can recover even if the draft was never saved successfully.
      navigate(`/training/assessment?resume=${encodeURIComponent(completedDraft.sessionId)}`, { replace: true });
      return true;
    }
    // The outbox is sufficient to recover the final result even if the existing
    // draft still points at Reflection. Do not rewrite a recovery pointer after
    // another tab/session has taken over; cleanup is session-conditional.
    const receipt = await client.resume(completedDraft.owner.uid, completedDraft.sessionId);
    if (mounted.current) {
      setStreakFeedback(receipt.status === "accepted"
        ? "Training complete. This session was durably accepted by the isolated backend; cumulative profile publication remains disabled."
        : "Training complete. Your completed work has been saved.");
      updateDraft(current => ({ ...current, section: 7, phase: "final-save", completed: completedDraft.completed }));
    }
    return true;
  }

  async function finishManual(result: ReflectionResult) {
    if (finalSaveInFlight.current) {
      return;
    }
    completionTime.current ??= draft.phase === "final-save" ? null : new Date().toISOString();
    const completedAt = completionTime.current;

    updateDraft(current => ({
      ...current,
      phase: "final-save",
      section: 6,
      completed: {
        ...current.completed,
        reflection: result
      }
    }));
    finalSaveInFlight.current = true;
    setFinalSaveError(null);

    try {
      const completedDraft: TrainingDraft = { ...draftRef.current, phase: "final-save", section: 6,
        completed: { ...draftRef.current.completed, reflection: result } };
      // Legacy Manual previously recorded only activity, then deleted all results.
      // Freeze complete results synchronously before entering any async saving path.
      const legacy = !localCompletionConfig() || draft.owner.kind === "guest"
        ? freezeManualTraining(completedDraft, completedAt) : null;
      if (legacy) writeLocalTrainingDraft(completedDraft);
      if (await finishDurably(completedDraft, completedAt)) return;
      if (draft.owner.kind === "user") {
        if (!legacy) throw new Error("Individual completion has no verified saving path. The draft was kept.");
        await saveManualTraining(draft.owner.uid, legacy);
      }
      const streak = await recordTrainingCompletion({
        owner: draft.owner,
        sessionId: draft.sessionId,
        mode: "manual",
        methodIds: selectedMethods
      }, legacy?.completedAt ? { now: new Date(legacy.completedAt) } : undefined);
      setStreakFeedback(current => current ?? (
        draft.owner.kind === "user"
          ? `Individual results saved to your account's practice history. Cumulative aggregation/publication was not performed. ${streak.wasNewDay ? `🔥 ${streak.currentStreak} day streak!` : "You've already kept your streak today."}`
          : "Guest results saved only on this browser. Clearing browser data or losing this device may remove them; they are not saved to an account."
      ));

      sessionActive.current = false;
      if (saveInFlight.current) {
        await saveInFlight.current;
      }
      await discardTrainingDraft(draft.owner, draft.sessionId);
      updateDraft(current => ({
        ...current,
        section: 7,
        completed: {
          ...current.completed,
          reflection: result
        }
      }));
    } catch (error) {
      if (localCompletionConfig() && !mounted.current) return;
      sessionActive.current = !durableQueuedRef.current && !(error instanceof CompletionOutboxError && error.code === "completion_owner_changed");
      setFinalSaveError(
        error instanceof Error ? error.message :
          "Individual results, daily activity or draft cleanup were not confirmed. Keep the draft and retry the same session."
      );
      if (sessionActive.current && mounted.current) void persistDraft();
    } finally {
      finalSaveInFlight.current = false;
    }
  }

  async function finishAutomatic(result?: ReflectionResult) {
    if (finalSaveInFlight.current) {
      return;
    }
    completionTime.current ??= draft.phase === "final-save" ? null : new Date().toISOString();
    const completedAt = completionTime.current;

    const reflection = result ?? draft.completed.reflection;
    const learningSituation = draft.completed.learningSituation;
    const baseline = draft.completed.baseline;
    const methodIntroduction = draft.completed.methodIntroduction;
    const methodLab = draft.completed.methodLab;
    const methodMatch = draft.completed.methodMatch;

    if (
      !reflection || !learningSituation || !baseline ||
      !methodIntroduction || !methodLab || !methodMatch
    ) {
      setFinalSaveError(
        "The completed assessment evidence is incomplete, so it was not saved."
      );
      return;
    }

    const learningProfile: LearningProfile =
      draft.completed.learningProfile ??
      buildLearningProfile({
        baseline,
        methodIntroduction,
        methodLab,
        methodMatch,
        reflection
      });

    updateDraft(current => ({
      ...current,
      phase: "final-save",
      section: 6,
      completed: {
        ...current.completed,
        reflection,
        learningProfile
      }
    }));
    finalSaveInFlight.current = true;
    setFinalSaveError(null);

    try {
      if (await finishDurably({ ...draftRef.current, phase: "final-save", section: 6,
        completed: { ...draftRef.current.completed, reflection, learningProfile } }, completedAt)) return;
      if (draft.owner.kind === "user") {
        await saveAssessment({
          userId: draft.owner.uid,
          sessionId: draft.sessionId,
          learningSituation,
          baseline,
          methodIntroduction,
          methodLab,
          methodMatch,
          reflection,
          learningProfile
        });
      }

      const streak = await recordTrainingCompletion({
        owner: draft.owner,
        sessionId: draft.sessionId,
        mode: "auto",
        methodIds: selectedMethods
      });
      setStreakFeedback(current => current ?? (
        streak.wasNewDay
          ? `🔥 ${streak.currentStreak} day streak! Today's training is complete.`
          : "Training complete. You've already kept your streak today."
      ));

      sessionActive.current = false;
      if (saveInFlight.current) {
        await saveInFlight.current;
      }
      await discardTrainingDraft(draft.owner, draft.sessionId);
      updateDraft(current => ({
        ...current,
        section: 7,
        completed: {
          ...current.completed,
          reflection,
          learningProfile
        }
      }));
    } catch (error) {
      if (localCompletionConfig() && !mounted.current) return;
      sessionActive.current = !durableQueuedRef.current && !(error instanceof CompletionOutboxError && error.code === "completion_owner_changed");
      console.error(
        "Assessment completion or streak recording failed:",
        error
      );
      setFinalSaveError(
        localCompletionConfig() && error instanceof Error ? error.message :
          "The completed assessment or its daily activity could not be saved, so the unfinished draft was kept. Retry safely when your connection is available."
      );
      if (localCompletionConfig() && sessionActive.current) void persistDraft();
    } finally {
      finalSaveInFlight.current = false;
    }
  }

  const section = draft.section;
  const isManualMode = draft.mode === "manual";

  return (
    <WritingJudgeProvider
      sessionId={draft.sessionId}
      state={draft.writingJudgeResults}
      onChange={updateWritingJudgeResults}
    >
      <AdaptiveDifficultyProvider
        state={draft.adaptiveDifficulty}
        onChange={updateAdaptiveDifficulty}
      >
        <TrainingProgressStateProvider
          state={draft.internalState}
          onChange={updateInternalState}
          checkpointRef={checkpointRef}
        >
        <main className="assessment assessment-v2">
        <NAV />

        {saveError && (
          <div className="training-save-error" role="alert">
            <p>{saveError}</p>
            {saveStatus === "failed" && (
              <button type="button" onClick={() => void persistDraft()}>
                Retry
              </button>
            )}
          </div>
        )}

        {aiContextNotice && (
          <p className="training-system-message" role="status">
            {aiContextNotice}
          </p>
        )}

        {section === 1 && (
          <TrainingStateScope name="situation">
            <LearningSituation
              onComplete={result => advance(2, { learningSituation: result })}
            />
          </TrainingStateScope>
        )}

        {section === 2 && selectingMethods && (
          <section className="training-system-message">
            <h1>Choosing your methods...</h1>
          </section>
        )}

        {section === 2 && pendingAIContext && !selectingMethods && (
          <section className="training-system-message">
            <h1>Use your recent AI Recommendation?</h1>
            <p>Previous study problem: {pendingAIContext.inputs.biggestProblem}</p>
            <p>Previous request: {pendingAIContext.inputs.methodQuestion}</p>
            {pendingAIContext.inputs.extraContext && (
              <p>Previous study context: {pendingAIContext.inputs.extraContext}</p>
            )}
            <p>Current learning goal: {
              learningSituationQuestions.find(question => question.id === "goal")
                ?.options.find(option => option.value === draft.completed.learningSituation?.goal)
                ?.label ?? draft.completed.learningSituation?.goal
            }</p>
            <p>Use this recommendation only if it concerns the same subject or topic and goal as this Test Me session.</p>
            <button type="button" onClick={() => {
              const situation = draftRef.current.completed.learningSituation;
              const baseline = draftRef.current.completed.baseline;
              if (!situation || !baseline || !pendingAIContext) return;
              const methods = getRelevantAIRecommendedMethods(
                pendingAIContext, situation, baseline, true
              );
              if (methods.length === 0) {
                setAIContextNotice(
                  "The previous AI recommendation is no longer available for this session. Four methods were selected from your assessment answers."
                );
              }
              finishMethodSelection(
                baseline,
                methods
              );
            }}>
              Use this recommendation
            </button>
            <button type="button" className="secondary-action" onClick={() => {
              const baseline = draftRef.current.completed.baseline;
              if (baseline) finishMethodSelection(baseline, []);
            }}>
              Use standard selection
            </button>
          </section>
        )}

        {section === 2 && !selectingMethods && !pendingAIContext && (
          <TrainingStateScope name="baseline">
            <BaselineChallenge
              onContentSelected={recordBaselineContent}
              onComplete={result => void completeBaseline(result)}
            />
          </TrainingStateScope>
        )}

        {section === 3 && selectedMethods.length > 0 && (
          <TrainingStateScope name="introduction">
            <MethodIntroduction
              methods={selectedMethods}
              mode={isManualMode ? "manual" : "auto"}
              learningSituation={draft.completed.learningSituation ?? undefined}
              baseline={draft.completed.baseline ?? undefined}
              onProgress={recordIntroductionProgress}
              onComplete={(result: MethodIntroductionResult) =>
                advance(4, { methodIntroduction: result })
              }
            />
          </TrainingStateScope>
        )}

        {section === 4 && selectedMethods.length > 0 && (
          <TrainingStateScope name="lab-controller">
            <MethodLab
              methods={selectedMethods}
              onProgress={recordLabProgress}
              onComplete={(result: MethodLabResult) =>
                advance(5, { methodLab: result })
              }
            />
          </TrainingStateScope>
        )}

        {section === 5 && draft.completed.methodLab && (
          <TrainingStateScope name="match-controller">
            <MethodMatchChallenge
              methodLab={draft.completed.methodLab}
              onProgress={recordMatchProgress}
              onComplete={(result: MethodMatchResult) =>
                advance(6, { methodMatch: result })
              }
            />
          </TrainingStateScope>
        )}

        {section === 6 && draft.completed.methodLab &&
          draft.completed.methodMatch && draft.phase !== "final-save" && (
            <TrainingStateScope name="reflection">
              <Reflection
                methodLab={draft.completed.methodLab}
                methodMatch={draft.completed.methodMatch}
                buildsProfile={!isManualMode}
                onComplete={result => {
                  if (isManualMode) {
                    void finishManual(result);
                  } else {
                    void finishAutomatic(result);
                  }
                }}
              />
            </TrainingStateScope>
          )}

        {section === 6 && draft.phase === "final-save" && (
          <section className="training-system-message">
            <h1>
              {isManualMode
                ? "Finish closing your training session"
                : "Finish saving your assessment"}
            </h1>
            <p>
              {localCompletionConfig()
                ? durableQueued
                  ? "A browser completion checkpoint was confirmed before submission. Final acknowledgment and cleanup still need verification."
                  : "A durable completion checkpoint has not been confirmed. Results remain on this page; keep it open and retry saving."
                : isManualMode
                ? "Saving is not complete. A browser checkpoint may be available, but account saving and cleanup are not confirmed. Keep this draft and retry the same session."
                : "Your completed work is still safely available as an unfinished draft."}
            </p>
            {localCompletionConfig() && <p>Clearing browser data, browser storage eviction, or losing this device may destroy unsent evidence. Browser storage is not a cloud backup.</p>}
            {finalSaveError && <p role="alert">{finalSaveError}</p>}
            <button
              type="button"
              onClick={() => {
                if (
                  isManualMode &&
                  draft.completed.reflection
                ) {
                  void finishManual(
                    draft.completed.reflection
                  );
                } else {
                  void finishAutomatic();
                }
              }}
            >
              Retry final save
            </button>
          </section>
        )}

        {finalSaveError && section === 6 && draft.phase !== "final-save" && (
          <p className="training-save-error" role="alert">
            {finalSaveError}
          </p>
        )}

        {section === 7 && isManualMode && (
          <section className="learning-profile">
            <p>TRAINING COMPLETE</p>
            <h1>Session complete</h1>
            <p>You finished the methods you selected.</p>
            {streakFeedback && (
              <p role="status">{streakFeedback}</p>
            )}
            {draft.owner.kind === "user" && <button type="button" onClick={() => navigate("/training/profile")}>
              View Learning Profile
            </button>}
            <button type="button" onClick={() => navigate("/training")}>
              Back to training
            </button>
          </section>
        )}

        {section === 7 && !isManualMode && draft.completed.learningProfile && (
          <section className="learning-profile">
            <p>ASSESSMENT COMPLETE</p>
            <h1>Your Learning Profile</h1>
            {streakFeedback && (
              <p role="status">{streakFeedback}</p>
            )}
            <button
              type="button"
              onClick={() => navigate("/training/profile")}
            >
              view RESULT
            </button>
          </section>
        )}
        <div className="training-save-toolbar">
          <span aria-live="polite">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "saved-local" && "Saved on this browser"}
            {saveStatus === "failed" && "Cloud save failed"}
            {saveStatus === "conflict" && "Training replaced elsewhere"}
          </span>
          <button
            type="button"
            className="secondary-action"
            disabled={selectingMethods || saveStatus === "saving" || saveStatus === "conflict"}
            onClick={() => void saveAndExit()}
          >
            Save and exit
          </button>
          <button
            type="button"
            className="secondary-action"
            disabled={durableQueued || Boolean(localCompletionConfig() && draft.phase === "final-save")}
            onClick={() => setShowDiscard(true)}
          >
            Discard current training
          </button>
        </div>
        {showDiscard && (
          <DiscardTrainingDialog
            busy={discarding}
            error={saveError}
            onCancel={() => {
              setShowDiscard(false);
              setSaveError(null);
            }}
            onConfirm={() => void discardCurrent()}
          />
        )}
        </main>
        </TrainingProgressStateProvider>
      </AdaptiveDifficultyProvider>
    </WritingJudgeProvider>
  );
}

export default Assessment;
