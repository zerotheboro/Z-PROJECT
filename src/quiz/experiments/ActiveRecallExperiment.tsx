import {
  useRef,
  useState
} from "react";

import {
  activeRecallExperiment
} from "../methodLabData";

import type {
  MethodExperimentResult
} from "../type";

type Stage =
  | "intro"
  | "study"
  | "retrieval"
  | "test"
  | "reflection";

type Props = {
  onComplete: (
    result: MethodExperimentResult
  ) => void;
};

function ActiveRecallExperiment({
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("intro");

  const [retrievalText, setRetrievalText] =
    useState("");

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [questionIndex, setQuestionIndex] =
    useState(0);

  const [confidence, setConfidence] =
    useState<number | null>(null);

  const [ease, setEase] =
    useState<number | null>(null);

  const [
    willingnessToUse,
    setWillingnessToUse
  ] =
    useState<number | null>(null);

  const experimentStart =
    useRef<number | null>(null);

  const currentQuestion =
    activeRecallExperiment
      .questions[questionIndex];

  function startExperiment() {

    experimentStart.current =
      Date.now();

    setStage("study");
  }

  function selectAnswer(
    questionId: string,
    option: string
  ) {

    setAnswers((prev) => ({
      ...prev,
      [questionId]: option
    }));
  }

  function nextQuestion() {

    if (
      questionIndex <
      activeRecallExperiment
        .questions.length - 1
    ) {

      setQuestionIndex(
        (prev) => prev + 1
      );

      return;
    }

    setStage("reflection");
  }

  function finishExperiment() {

    if (
      confidence === null ||
      ease === null ||
      willingnessToUse === null
    ) {
      return;
    }

    let correct = 0;

    activeRecallExperiment
      .questions
      .forEach((question) => {

        if (
          answers[question.id] ===
          question.correct
        ) {
          correct += 1;
        }

      });

    const total =
      activeRecallExperiment
        .questions.length;

    const result:
      MethodExperimentResult = {

      method: "active-recall",

      category: "memory",

      correct,

      total,

      score:
        total === 0
          ? 0
          : correct / total,

      confidence,

      ease,

      willingnessToUse,

      timeSpentMs:
        experimentStart.current
          ? Date.now() -
            experimentStart.current
          : 0
    };

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB
          </p>

          <h2>
            Active Recall
          </h2>

          <p>
            You'll first study a small
            amount of information.
          </p>

          <p>
            Then we'll remove it and ask
            you to retrieve everything you
            can remember before taking a
            short test.
          </p>

          <button
            type="button"
            onClick={
              startExperiment
            }
          >
            Start experiment
          </button>

        </div>
      )}

      {stage === "study" && (
        <div>

          <p>
            STEP 1 · STUDY
          </p>

          <h2>
            {
              activeRecallExperiment
                .topic
            }
          </h2>

          <p>
            Read these facts carefully.
          </p>

          <div className="study-content">

            {
              activeRecallExperiment
                .facts.map(
                  (fact, index) => (

                    <p key={index}>
                      {fact}
                    </p>

                  )
                )
            }

          </div>

          <button
            type="button"
            onClick={() =>
              setStage("retrieval")
            }
          >
            I'm ready
          </button>

        </div>
      )}

      {stage === "retrieval" && (
        <div>

          <p>
            STEP 2 · RETRIEVE
          </p>

          <h2>
            Without looking back,
            write everything you
            remember.
          </h2>

          <textarea
            value={retrievalText}
            onChange={(event) =>
              setRetrievalText(
                event.target.value
              )
            }
            placeholder="Write what you remember..."
          />

          <button
            type="button"
            disabled={
              retrievalText.trim()
                .length === 0
            }
            onClick={() =>
              setStage("test")
            }
          >
            Continue
          </button>

        </div>
      )}

      {stage === "test" && (
        <div>

          <p>
            STEP 3 · QUICK TEST
          </p>

          <p>
            Question{" "}
            {questionIndex + 1}
            {" / "}
            {
              activeRecallExperiment
                .questions.length
            }
          </p>

          <h2>
            {
              currentQuestion
                .question
            }
          </h2>

          <div className="option-grid">

            {
              currentQuestion
                .options
                .map((option) => {

                  const selected =
                    answers[
                      currentQuestion.id
                    ] === option;

                  return (
                    <button
                      type="button"
                      key={option}
                      className={
                        selected
                          ? "assessment-option selected"
                          : "assessment-option"
                      }
                      onClick={() =>
                        selectAnswer(
                          currentQuestion.id,
                          option
                        )
                      }
                    >
                      {option}
                    </button>
                  );
                })
            }

          </div>

          <button
            type="button"
            disabled={
              !answers[
                currentQuestion.id
              ]
            }
            onClick={
              nextQuestion
            }
          >
            {questionIndex ===
            activeRecallExperiment
              .questions.length -
              1
              ? "Finish test"
              : "Next question"}
          </button>

        </div>
      )}

      {stage === "reflection" && (
        <div>

          <p>
            STEP 4 · REFLECT
          </p>

          <h2>
            How did Active Recall
            feel?
          </h2>

          <h3>
            Confidence
          </h3>

          <div>
            {[1,2,3,4,5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setConfidence(value)
                  }
                >
                  {value}
                </button>
              )
            )}
          </div>

          <h3>
            How easy was it to use?
          </h3>

          <div>
            {[1,2,3,4,5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setEase(value)
                  }
                >
                  {value}
                </button>
              )
            )}
          </div>

          <h3>
            Would you actually use
            this while studying?
          </h3>

          <div>
            {[1,2,3,4,5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setWillingnessToUse(
                      value
                    )
                  }
                >
                  {value}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            disabled={
              confidence === null ||
              ease === null ||
              willingnessToUse ===
                null
            }
            onClick={
              finishExperiment
            }
          >
            Complete experiment
          </button>

        </div>
      )}

    </section>
  );
}

export default ActiveRecallExperiment;