import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate, useLocation
} from "react-router-dom";

import NAV from "../HEADER/header";
import EconomicsTopicPicker from "./economics9708/EconomicsTopicPicker";
import { economicsMethodGap } from "./economics9708/methodContentMapping";
import {
  useTrainingAccess
} from "../hooks/useTrainingAccess";
import {
  startTrainingSession
} from "../services/startTrainingSession";

import {
  methodDefinitions
} from "./methodRegistry";
import {
  createSessionId
} from "./trainingProgress";

import {
  MANUAL_TRAINING_MODE
} from "./trainingSession";

import type {
  ManualTrainingState
} from "./trainingSession";

import type {
  TrainingMethodId
} from "./type";
import { getStudyMethodSuggestion } from "../services/studyFollowThroughSession";
import { auth } from "../firebase";

const MAX_SELECTED_METHODS = 3;

type MethodDefinition = (typeof methodDefinitions)[number];

const methodGroups =
  methodDefinitions.reduce<
    Map<
      MethodDefinition["category"],
      MethodDefinition[]
    >
  >(
    (groups, definition) => {
      const methods =
        groups.get(
          definition.category
        ) ?? [];

      methods.push(definition);
      groups.set(
        definition.category,
        methods
      );

      return groups;
    },
    new Map()
  );

function ChooseMethods() {
  const navigate = useNavigate();
  const location = useLocation();
  const [economicsTopicId, setEconomicsTopicId] = useState(() => new URLSearchParams(location.search).get("economics") ?? "");
  const trainingAccess = useTrainingAccess();

  const [selectedMethods, setSelectedMethods] =
    useState<TrainingMethodId[]>([]);

  const [selectionMessage, setSelectionMessage] =
    useState("");
  const [starting, setStarting] = useState(false);
  const pendingSessionId =
    useRef<string | null>(null);

  const selectionLimit = trainingAccess.unlimited
    ? MAX_SELECTED_METHODS
    : Math.min(
        MAX_SELECTED_METHODS,
        trainingAccess.manualMethodsRemaining ?? 0
      );

  const [, expireSuggestion] = useState(0);
  const suggestion = import.meta.env.DEV && import.meta.env.VITE_STUDY_TRAINING_GUIDANCE === "emulator-only"
    ? getStudyMethodSuggestion(auth.currentUser, economicsTopicId) : null;
  useEffect(() => {
    if (!suggestion) return;
    const timer = window.setTimeout(() => expireSuggestion(value => value + 1), Math.max(0, suggestion.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [suggestion?.expiresAt, trainingAccess.user]);
  // Decoration only: use the actual visible, supported and currently selectable
  // options. Never add, reorder, select or submit a method from this hint.
  const suggestedMethod = suggestion && economicsTopicId && trainingAccess.user === auth.currentUser && !trainingAccess.loading && !trainingAccess.error && !starting &&
    !economicsMethodGap(suggestion.methodId, economicsTopicId) && methodDefinitions.some(method => method.id === suggestion.methodId) &&
    selectionLimit > 0 && (selectedMethods.includes(suggestion.methodId) || selectedMethods.length < selectionLimit)
    ? suggestion.methodId : null;

  function toggleMethod(
    method: TrainingMethodId
  ) {
    if (selectedMethods.includes(method)) {
      setSelectedMethods(
        selectedMethods.filter(
          selectedMethod =>
            selectedMethod !== method
        )
      );
      setSelectionMessage("");
      return;
    }

    if (
      selectedMethods.length >= selectionLimit
    ) {
      setSelectionMessage(
        selectionLimit < MAX_SELECTED_METHODS
          ? `You have ${selectionLimit} method test${selectionLimit === 1 ? "" : "s"} remaining today.`
          : "You can choose up to 3 methods."
      );
      return;
    }

    setSelectedMethods([
      ...selectedMethods,
      method
    ]);
    setSelectionMessage("");
  }

  async function startTraining() {
    if (
      selectedMethods.length === 0 ||
      selectedMethods.length > selectionLimit ||
      trainingAccess.loading ||
      starting
    ) {
      return;
    }

    setStarting(true);
    setSelectionMessage("");

    try {
      const owner = trainingAccess.user
        ? {
            kind: "user" as const,
            uid: trainingAccess.user.uid
          }
        : { kind: "guest" as const };
      pendingSessionId.current ??= createSessionId();
      const created = await startTrainingSession({
        user: trainingAccess.user,
        owner,
        mode: "manual",
        methodIds: selectedMethods,
        ...(economicsTopicId ? { economicsTopicId } : {}),
        sessionId: pendingSessionId.current
      });
      const state: ManualTrainingState = {
        selectedMethods
      };

      trainingAccess.refreshAccess();
      navigate(
        `/training/assessment?mode=${MANUAL_TRAINING_MODE}&resume=${encodeURIComponent(created.sessionId)}`,
        { state }
      );
    } catch (error) {
      setSelectionMessage(
        error instanceof Error
          ? error.message
          : "Training could not be started."
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <NAV />

      <main className="training-page method-picker-page">
        <EconomicsTopicPicker value={economicsTopicId} onChange={topic => {
          setEconomicsTopicId(topic);
          if (topic) setSelectedMethods(methods => methods.filter(method => !economicsMethodGap(method, topic)));
        }} disabled={starting} />
        <section className="training-hero">
          <p>
            EDULIENCE TRAINING
          </p>

          <h1>
            Choose your methods
          </h1>

          <p>
            Pick up to 3 learning methods you want to practise.
          </p>
          {!trainingAccess.loading &&
            !trainingAccess.unlimited && (
              <p>
                You have {trainingAccess.manualMethodsRemaining ?? 0}
                {" method test"}
                {trainingAccess.manualMethodsRemaining === 1 ? "" : "s"}
                {" remaining today."}
              </p>
            )}
        </section>

        <section className="method-picker">
          <div className="method-picker-heading">
            <h2>
              Train your way
            </h2>

            <p aria-live="polite">
              {selectedMethods.length}
              {" / "}
              {MAX_SELECTED_METHODS}
              {" selected"}
            </p>
          </div>

          {import.meta.env.DEV && suggestedMethod && <p>Profile suggestions are optional. Choose any available methods; none are selected for you.</p>}

          <div className="method-picker-groups">
            {Array.from(
              methodGroups.entries()
            ).map(([
              category,
              definitions
            ]) => {
              const headingId =
                `method-category-${category}`;

              return (
                <section
                  className="method-picker-group"
                  aria-labelledby={headingId}
                  key={category}
                >
                  <h3 id={headingId}>
                    {category}
                  </h3>

                  <div className="method-picker-grid">
                    {definitions.map(
                      definition => {
                        const selected = selectedMethods.includes(definition.id);
                        const gap = economicsTopicId ? economicsMethodGap(definition.id, economicsTopicId) : null;
                        const unsupported = Boolean(gap);

                        return (
                          <button
                            key={definition.id}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            disabled={
                              trainingAccess.loading ||
                              Boolean(trainingAccess.error) || unsupported
                            }
                            className={
                              (selected
                                ? "method-picker-card selected"
                                : "method-picker-card") + (unsupported ? " is-unavailable" : "")
                            }
                            onClick={() => toggleMethod(definition.id)}
                          >

                            <span className="method-picker-name"><strong>
                              {definition.name}
                            </strong>{unsupported && <span className="method-availability-badge">Unavailable</span>}</span>

                            {import.meta.env.DEV && suggestedMethod === definition.id && <span className="method-profile-suggestion">Suggested by your Learning Profile</span>}

                            <span className="method-picker-description">
                              {
                                definition
                                  .introduction
                                  .description
                              }
                            </span>
                            {unsupported && <span className="method-availability-message">Not available for this Economics topic yet.</span>}
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {selectionMessage && (
            <p
              className="method-picker-message"
              role="alert"
            >
              {selectionMessage}
            </p>
          )}

          {trainingAccess.error && (
            <p
              className="method-picker-message"
              role="alert"
            >
              {trainingAccess.error}
            </p>
          )}

          <div className="method-picker-actions">
            <button
              type="button"
              className="secondary-action"
              onClick={() =>
                navigate("/training")
              }
            >
              Back to training
            </button>

            <button
              type="button"
              disabled={
                selectedMethods.length === 0 ||
                selectedMethods.length > selectionLimit ||
                trainingAccess.loading ||
                Boolean(trainingAccess.error) ||
                starting
              }
              onClick={() => void startTraining()}
            >
              {starting ? "Starting..." : "Start training"}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

export default ChooseMethods;
