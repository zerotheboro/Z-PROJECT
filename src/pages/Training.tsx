import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import LearningProfileStatus
  from "../components/LearningProfileStatus";
import TrainingAccessCard
  from "../components/TrainingAccessCard";
import TrainingStreakCard
  from "../components/TrainingStreakCard";

import {
  useTrainingAccess
} from "../hooks/useTrainingAccess";
import {
  useTrainingStreak
} from "../hooks/useTrainingStreak";

import NAV from "../HEADER/header";

import DiscardTrainingDialog
  from "../quiz/DiscardTrainingDialog";
import {
  getMethodName
} from "../quiz/methodRegistry";
import {
  createSessionId,
  getTrainingProgressLabel
} from "../quiz/trainingProgress";
import {
  useAvailableTrainingDraft
} from "../quiz/useAvailableTrainingDraft";
import {
  createCheckoutTransaction,
  createPortalSession,
  openPaddleCheckout,
  redirectToBillingUrl
} from "../services/billing";
import {
  discardTrainingDraft,
  forceDiscardTrainingDraft
} from "../services/trainingProgress";
import {
  startTrainingSession
} from "../services/startTrainingSession";

function Training() {

  const navigate =
    useNavigate();

  const {
    loading,
    owner,
    validation,
    error: loadError,
    reload
  } = useAvailableTrainingDraft();
  const trainingStreak = useTrainingStreak();
  const trainingAccess = useTrainingAccess();
  const [showDiscard, setShowDiscard] =
    useState(false);
  const [discarding, setDiscarding] =
    useState(false);
  const [discardError, setDiscardError] =
    useState<string | null>(null);
  const [starting, setStarting] =
    useState(false);
  const [startError, setStartError] =
    useState<string | null>(null);
  const [billingBusy, setBillingBusy] =
    useState(false);
  const [billingError, setBillingError] =
    useState<string | null>(null);
  const [billingConfirmationAttempt,
    setBillingConfirmationAttempt] = useState(0);
  const pendingAutomaticSessionId =
    useRef<string | null>(null);

  const draft = validation?.valid
    ? validation.draft
    : null;
  const progress = draft
    ? getTrainingProgressLabel(draft)
    : null;
  const accessIdentityMatches = owner?.kind === "user"
    ? trainingAccess.user?.uid === owner.uid
    : trainingAccess.user === null;
  const billingConfirmationActive =
    billingConfirmationAttempt > 0;
  const billingMessage = billingConfirmationActive
    ? trainingAccess.plan === "premium"
      ? "Edulience Premium is active."
      : billingConfirmationAttempt < 5
        ? "Confirming Premium..."
        : "Payment is still being confirmed. Refresh shortly."
    : null;

  useEffect(() => {
    if (
      !billingConfirmationActive ||
      trainingAccess.plan === "premium" ||
      billingConfirmationAttempt >= 5
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setBillingConfirmationAttempt(value => value + 1);
      trainingAccess.refreshAccess();
    }, 1_500);

    return () => window.clearTimeout(timer);
  }, [
    billingConfirmationActive,
    billingConfirmationAttempt,
    trainingAccess.plan,
    trainingAccess.refreshAccess
  ]);

  async function clearExistingDraft(): Promise<boolean> {
    if (draft) {
      const replace = window.confirm(
        "Starting new training will discard your current unfinished session. Continue?"
      );

      if (!replace || !owner) {
        return false;
      }

      setDiscarding(true);
      setDiscardError(null);

      try {
        await discardTrainingDraft(
          owner,
          draft.sessionId
        );
      } catch {
        setDiscardError(
          "The current training could not be discarded. Please retry."
        );
        return false;
      } finally {
        setDiscarding(false);
      }
    }

    return true;
  }

  async function startAutomaticTraining() {
    if (
      !owner ||
      starting ||
      !accessIdentityMatches
    ) {
      return;
    }

    setStarting(true);
    setStartError(null);

    try {
      if (!await clearExistingDraft()) {
        return;
      }

      pendingAutomaticSessionId.current ??=
        createSessionId();

      const created = await startTrainingSession({
        user: trainingAccess.user,
        owner,
        mode: "auto",
        methodIds: [],
        sessionId: pendingAutomaticSessionId.current
      });
      trainingAccess.refreshAccess();
      navigate(
        `/training/assessment?resume=${encodeURIComponent(created.sessionId)}`
      );
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "Training could not be started."
      );
    } finally {
      setStarting(false);
    }
  }

  async function openMethodPicker() {
    if (!await clearExistingDraft()) {
      return;
    }
    navigate("/training/choose");
  }

  async function confirmDiscard() {
    if (!owner) {
      return;
    }

    setDiscarding(true);
    setDiscardError(null);

    try {
      if (draft) {
        await discardTrainingDraft(
          owner,
          draft.sessionId
        );
      } else {
        await forceDiscardTrainingDraft(owner);
      }

      setShowDiscard(false);
      reload();
    } catch {
      setDiscardError(
        "Cloud deletion failed. Your training was not reported as discarded; please retry."
      );
    } finally {
      setDiscarding(false);
    }
  }

  async function openUpgrade() {
    if (billingBusy) {
      return;
    }
    if (!trainingAccess.user) {
      setBillingError(
        "Sign in to upgrade to Edulience Premium."
      );
      return;
    }

    setBillingBusy(true);
    setBillingError(null);

    try {
      const transactionId =
        await createCheckoutTransaction(
          trainingAccess.user
        );
      await openPaddleCheckout(transactionId, {
        onCompleted: () => {
          setBillingBusy(false);
          setBillingConfirmationAttempt(1);
          trainingAccess.refreshAccess();
        },
        onClosed: () => setBillingBusy(false),
        onError: message => {
          setBillingBusy(false);
          setBillingError(message);
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Billing request failed", error);
      }
      setBillingError(
        error instanceof Error
          ? error.message
          : "Billing is temporarily unavailable."
      );
      setBillingBusy(false);
    }
  }

  async function openPortal() {
    if (billingBusy || !trainingAccess.user) {
      return;
    }

    setBillingBusy(true);
    setBillingError(null);
    try {
      const url = await createPortalSession(
        trainingAccess.user
      );
      redirectToBillingUrl(url);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Billing request failed", error);
      }
      setBillingError(
        error instanceof Error
          ? error.message
          : "Billing is temporarily unavailable."
      );
    } finally {
      setBillingBusy(false);
    }
  }

  return (
    <>
    <NAV/>
    <main className="training-page">

      <section className="training-hero">

        <p>
          EDULIENCE TRAINING
        </p>

        <h1>
          Train how you learn.
        </h1>

        <p>
          Test learning strategies,
          discover which approaches work
          for you, and build a learning
          profile that improves over time.
        </p>

      </section>

      <TrainingStreakCard {...trainingStreak} />

      <TrainingAccessCard
        loading={trainingAccess.loading}
        error={trainingAccess.error}
        plan={trainingAccess.plan}
        planSource={trainingAccess.planSource}
        signedIn={Boolean(trainingAccess.user)}
        unlimited={trainingAccess.unlimited}
        testMeUsed={trainingAccess.testMeUsed}
        testMeLimit={trainingAccess.testMeLimit}
        manualMethodsUsed={trainingAccess.manualMethodsUsed}
        manualMethodsLimit={trainingAccess.manualMethodsLimit}
        billingBusy={billingBusy}
        billingError={billingError}
        billingMessage={billingMessage}
        onUpgrade={() => void openUpgrade()}
        onManageSubscription={() => void openPortal()}
      />

      {!loading && draft && progress && (
        <section className="training-resume-card">

          <h2>Continue training</h2>

          <p>
            {draft.currentMethod
              ? `${getMethodName(draft.currentMethod)} · ${progress.title.split(" · ").at(-1)}`
              : progress.title}
          </p>

          <p>{progress.progress}</p>

          <p>
            Last saved {new Date(
              draft.updatedAt
            ).toLocaleString()}
          </p>

          {draft.owner.kind === "guest" && (
            <p>Progress saved on this browser.</p>
          )}

          <div className="training-resume-actions">
            <button
              type="button"
              onClick={() => navigate(
                `/training/assessment?resume=${encodeURIComponent(draft.sessionId)}`
              )}
            >
              Resume
            </button>

            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowDiscard(true)}
            >
              Discard current training
            </button>
          </div>
        </section>
      )}

      {!loading && validation && !validation.valid && (
        <section className="training-resume-card training-draft-error">
          <h2>Saved training cannot be resumed</h2>
          <p>{validation.reason}</p>
          <button
            type="button"
            onClick={() => setShowDiscard(true)}
          >
            Discard current training
          </button>
        </section>
      )}

      {loadError && (
        <p className="training-save-error" role="alert">
          {loadError}
        </p>
      )}

      {startError && (
        <p className="training-save-error" role="alert">
          {startError}
        </p>
      )}

      <section
        className="training-entry-options"
        aria-label="Choose how to start training"
      >
        <article className="training-entry-card">
          <p>
            EDULIENCE SELECTS
          </p>

          <h2>
            Test me
          </h2>

          <p>
            Let Edulience evaluate how you learn and choose suitable methods for you.
          </p>

          <button
            type="button"
            disabled={
              discarding ||
              starting ||
              trainingAccess.loading ||
              !accessIdentityMatches ||
              Boolean(trainingAccess.error) ||
              (!trainingAccess.unlimited &&
                trainingAccess.testMeRemaining === 0)
            }
            onClick={() => void startAutomaticTraining()}
          >
            {!trainingAccess.unlimited &&
            trainingAccess.testMeRemaining === 0
              ? "Daily Test Me used"
              : starting
                ? "Starting..."
                : "Start assessment"}
          </button>
          {!trainingAccess.unlimited &&
            trainingAccess.testMeRemaining === 0 && (
              <p>Come back tomorrow or upgrade.</p>
            )}
        </article>

        <article className="training-entry-card">
          <p>
            YOU SELECT
          </p>

          <h2>
            Choose my methods
          </h2>

          <p>
            Pick the learning methods you already know you want to practise.
          </p>

          <button
            type="button"
            disabled={discarding}
            onClick={() => void openMethodPicker()}
          >
            Choose methods
          </button>
        </article>
      </section>

      <LearningProfileStatus

        onLogin={() =>
          navigate("/login")
        }

        onStartAssessment={() =>
          navigate(
            "/training/assessment"
          )
        }

        onViewProfile={() =>
          navigate(
            "/training/profile"
          )
        }

      />

      {showDiscard && (
        <DiscardTrainingDialog
          busy={discarding}
          error={discardError}
          onCancel={() => {
            setShowDiscard(false);
            setDiscardError(null);
          }}
          onConfirm={() => void confirmDiscard()}
        />
      )}

    </main>
    </>
  );
}

export default Training;
