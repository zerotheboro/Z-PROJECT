import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import NAV from "../HEADER/header";

import {
  methodDefinitions
} from "./methodRegistry";

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

  const [selectedMethods, setSelectedMethods] =
    useState<TrainingMethodId[]>([]);

  const [selectionMessage, setSelectionMessage] =
    useState("");

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
      selectedMethods.length >=
      MAX_SELECTED_METHODS
    ) {
      setSelectionMessage(
        "You can choose up to 3 methods."
      );
      return;
    }

    setSelectedMethods([
      ...selectedMethods,
      method
    ]);
    setSelectionMessage("");
  }

  function startTraining() {
    if (selectedMethods.length === 0) {
      return;
    }

    const state: ManualTrainingState = {
      selectedMethods
    };

    navigate(
      `/training/assessment?mode=${MANUAL_TRAINING_MODE}`,
      { state }
    );
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
                            <span className="method-picker-card-category">
                              {definition.category}
                            </span>

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
                selectedMethods.length === 0
              }
              onClick={startTraining}
            >
              Start training
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

export default ChooseMethods;
