import {
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import NAV from "../HEADER/header";
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

const MAX_SELECTED_METHODS = 3;

type MethodDefinition =
  (typeof methodDefinitions)[number];

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
                        const selected =
                          selectedMethods.includes(
                            definition.id
                          );

                        return (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            disabled={
                              trainingAccess.loading ||
                              Boolean(trainingAccess.error)
                            }
                            className={
                              selected
                                ? "method-picker-card selected"
                                : "method-picker-card"
                            }
                            key={definition.id}
                            onClick={() =>
                              toggleMethod(
                                definition.id
                              )
                            }
                          >

                            <strong>
                              {definition.name}
                            </strong>

                            <span>
                              {
                                definition
                                  .introduction
                                  .description
                              }
                            </span>
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
