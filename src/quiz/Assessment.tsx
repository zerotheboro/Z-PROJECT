import {
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
import { saveAssessment } from "../services/assessment";
import {
  discardTrainingDraft,
  forceDiscardTrainingDraft,
  saveTrainingDraft,
  TrainingDraftConflictError
} from "../services/trainingProgress";
import DiscardTrainingDialog from "./DiscardTrainingDialog";
import { selectMethods } from "./methodSelector";
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
import { createTrainingDraft } from "./trainingProgress";
import {
  TrainingProgressStateProvider,
  TrainingStateScope
} from "./trainingProgressState";
import { useAvailableTrainingDraft } from "./useAvailableTrainingDraft";

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
  owner,
  mode,
  methods
}: {
  owner: TrainingDraftOwner;
  mode: "auto" | "manual";
  methods: TrainingMethodId[];
}) {
  const [draft] = useState(() =>
    createTrainingDraft({
      owner,
      mode,
      selectedMethods: methods
    })
  );

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
    return (
      <AssessmentProblem
        title="Training progress is unavailable"
        message={loadError}
      />
    );
  }

  if (resumeSessionId) {
    if (draft && draft.sessionId === resumeSessionId) {
      return (
        <AssessmentSession
          initialDraft={draft}
          isNewSession={false}
        />
      );
    }

    return (
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
      />
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

  return (
    <NewAssessmentSession
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
  const [draft, setDraft] = useState<TrainingDraft>(initialDraft);
  const draftRef = useRef(draft);
  const sessionActive = useRef(true);
  const canCreateCloudDraft = useRef(isNewSession);
  const saveInFlight = useRef<Promise<boolean> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [finalSaveError, setFinalSaveError] = useState<string | null>(null);
  const finalSaveInFlight = useRef(false);
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

  useEffect(() => () => {
    sessionActive.current = false;
  }, []);

  const selectedMethods = useMemo(() => {
    if (draft.selectedMethods.length > 0) {
      return draft.selectedMethods;
    }
    if (
      !draft.completed.learningSituation ||
      !draft.completed.baseline
    ) {
      return [];
    }
    return selectMethods(
      draft.completed.learningSituation,
      draft.completed.baseline
    );
  }, [
    draft.completed.baseline,
    draft.completed.learningSituation,
    draft.selectedMethods
  ]);

  useEffect(() => {
    if (
      draft.selectedMethods.length === 0 &&
      selectedMethods.length > 0
    ) {
      updateDraft(current => ({
        ...current,
        selectedMethods,
        currentMethod: selectedMethods[0],
        currentMethodIndex: 0
      }));
    }
  }, [draft.selectedMethods.length, selectedMethods, updateDraft]);

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
    checkpointRef.current?.();
    await Promise.resolve();
    const saved = await persistDraft();
    if (saved) {
      sessionActive.current = false;
      navigate("/training");
    }
  }

  async function discardCurrent() {
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

  async function finishManual(result: ReflectionResult) {
    updateDraft(current => ({
      ...current,
      phase: "final-save",
      section: 6,
      completed: {
        ...current.completed,
        reflection: result
      }
    }));

    try {
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
    } catch {
      sessionActive.current = true;
      setFinalSaveError(
        "Training is complete, but the active draft could not be cleared. Retry to avoid seeing it as unfinished."
      );
    }
  }

  async function finishAutomatic(result?: ReflectionResult) {
    if (finalSaveInFlight.current) {
      return;
    }

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
    } catch {
      sessionActive.current = true;
      setFinalSaveError(
        "The completed assessment could not be saved and its unfinished draft was kept. Retry when your connection is available."
      );
    } finally {
      finalSaveInFlight.current = false;
    }
  }

  const section = draft.section;
  const isManualMode = draft.mode === "manual";

  return (
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

        {section === 1 && (
          <TrainingStateScope name="situation">
            <LearningSituation
              onComplete={result => advance(2, { learningSituation: result })}
            />
          </TrainingStateScope>
        )}

        {section === 2 && (
          <TrainingStateScope name="baseline">
            <BaselineChallenge
              onContentSelected={recordBaselineContent}
              onComplete={result => advance(3, { baseline: result })}
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
              {isManualMode
                ? "Your completed manual session is still available until its active draft is cleared."
                : "Your completed work is still safely available as an unfinished draft."}
            </p>
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
            <button type="button" onClick={() => navigate("/training")}>
              Back to training
            </button>
          </section>
        )}

        {section === 7 && !isManualMode && draft.completed.learningProfile && (
          <section className="learning-profile">
            <p>ASSESSMENT COMPLETE</p>
            <h1>Your Learning Profile</h1>
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
            disabled={saveStatus === "saving" || saveStatus === "conflict"}
            onClick={() => void saveAndExit()}
          >
            Save and exit
          </button>
          <button
            type="button"
            className="secondary-action"
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
  );
}

export default Assessment;
