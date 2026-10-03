import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import LearningProfileStatus
  from "../components/LearningProfileStatus";

import NAV from "../HEADER/header";

import DiscardTrainingDialog
  from "../quiz/DiscardTrainingDialog";
import {
  getMethodName
} from "../quiz/methodRegistry";
import {
  getTrainingProgressLabel
} from "../quiz/trainingProgress";
import {
  useAvailableTrainingDraft
} from "../quiz/useAvailableTrainingDraft";
import {
  discardTrainingDraft,
  forceDiscardTrainingDraft
} from "../services/trainingProgress";

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
  const [showDiscard, setShowDiscard] =
    useState(false);
  const [discarding, setDiscarding] =
    useState(false);
  const [discardError, setDiscardError] =
    useState<string | null>(null);

  const draft = validation?.valid
    ? validation.draft
    : null;
  const progress = draft
    ? getTrainingProgressLabel(draft)
    : null;

  function start(path: string) {
    if (draft) {
      const replace = window.confirm(
        "Starting new training will discard your current unfinished session. Continue?"
      );

      if (!replace || !owner) {
        return;
      }

      setDiscarding(true);
      setDiscardError(null);
      void discardTrainingDraft(
        owner,
        draft.sessionId
      )
        .then(() => navigate(path))
        .catch(() => {
          setDiscardError(
            "The current training could not be discarded. Please retry."
          );
        })
        .finally(() => setDiscarding(false));
      return;
    }

    navigate(path);
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
            disabled={discarding}
            onClick={() => start(
              "/training/assessment"
            )}
          >
            Start assessment
          </button>
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
            onClick={() => start(
              "/training/choose"
            )}
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
