import {
  useRef,
  useState
} from "react";

import {
  cornellExperiment
} from "../methodLabData";

import type {
  MethodExperimentResult
} from "../type";

type Stage =
  | "intro"
  | "notes"
  | "summary"
  | "test"
  | "reflection";

type Props = {
  onComplete: (
    result: MethodExperimentResult
  ) => void;
};

function CornellExperiment({
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("intro");

  const [notes, setNotes] =
    useState("");

  const [cues, setCues] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [
    questionIndex,
    setQuestionIndex
  ] = useState(0);

  const [
    confidence,
    setConfidence
  ] = useState<number | null>(null);

  const [
    ease,
    setEase
  ] = useState<number | null>(null);

  const [
    willingnessToUse,
    setWillingnessToUse
  ] = useState<number | null>(null);

  const experimentStart =
    useRef<number | null>(null);

  const currentQuestion =
    cornellExperiment
      .questions[questionIndex];

  function startExperiment() {
    experimentStart.current =
      Date.now();

    setStage("notes");
  }

  function selectAnswer(
    questionId: string,
    answer: string
  ) {

    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  }

  function nextQuestion() {

    if (
      questionIndex <
      cornellExperiment
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

    cornellExperiment
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
      cornellExperiment
        .questions.length;

    const result:
      MethodExperimentResult = {

      method: "cornell",

      category: "organization",

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

    console.log(
      "CORNELL NOTES:",
      {
        notes,
        cues,
        summary
      }
    );

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {/* INTRO */}

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB · ORGANIZATION
          </p>

          <h2>
            Cornell Notes
          </h2>

          <p>
            You'll organize information
            into three parts:
          </p>

          <ul>
            <li>Main notes</li>
            <li>Cues / key questions</li>
            <li>A short summary</li>
          </ul>

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

      {/* NOTES */}

      {stage === "notes" && (
        <div>

          <p>
            STEP 1 · ORGANIZE
          </p>

          <h2>
            {cornellExperiment.topic}
          </h2>

          <div className="cornell-layout">

            <div className="cornell-source">

              <h3>
                Learning material
              </h3>

              <p>
                {
                  cornellExperiment
                    .content
                }
              </p>

            </div>

            <div className="cornell-notes">

              <div>
                <h3>
                  Cues / Questions
                </h3>

                <textarea
                  value={cues}
                  onChange={(event) =>
                    setCues(
                      event.target.value
                    )
                  }
                  placeholder="Key words, questions, important ideas..."
                />
              </div>

              <div>
                <h3>
                  Main Notes
                </h3>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Write the important information here..."
                />
              </div>

            </div>

          </div>

          <button
            type="button"
            disabled={
              notes.trim().length < 20 ||
              cues.trim().length < 5
            }
            onClick={() =>
              setStage("summary")
            }
          >
            Continue
          </button>

        </div>
      )}

      {/* SUMMARY */}

      {stage === "summary" && (
        <div>

          <p>
            STEP 2 · SUMMARIZE
          </p>

          <h2>
            Summarize the main idea.
          </h2>

          <p>
            Try to capture the whole
            process in a few sentences.
          </p>

          <textarea
            value={summary}
            onChange={(event) =>
              setSummary(
                event.target.value
              )
            }
            placeholder="Your summary..."
          />

          <button
            type="button"
            disabled={
              summary.trim().length <
              20
            }
            onClick={() =>
              setStage("test")
            }
          >
            Continue to test
          </button>

        </div>
      )}

      {/* TEST */}

      {stage === "test" && (
        <div>

          <p>
            STEP 3 · CHECK
          </p>

          <p>
            Question{" "}
            {questionIndex + 1}
            {" / "}
            {
              cornellExperiment
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
            cornellExperiment
              .questions.length -
              1
              ? "Finish test"
              : "Next question"}

          </button>

        </div>
      )}

      {/* REFLECTION */}

      {stage === "reflection" && (
        <div>

          <p>
            STEP 4 · REFLECT
          </p>

          <h2>
            How did Cornell Notes
            feel?
          </h2>

          <h3>
            How confident are you
            that you understood and
            organized the material?
          </h3>

          <div>
            {[1,2,3,4,5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    confidence === value
                      ? "selected"
                      : ""
                  }
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
            How easy was the method?
          </h3>

          <div>
            {[1,2,3,4,5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    ease === value
                      ? "selected"
                      : ""
                  }
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
            Would you use Cornell
            Notes while studying?
          </h3>

          <div>
            {[1,2,3,4,5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    willingnessToUse ===
                    value
                      ? "selected"
                      : ""
                  }
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

export default CornellExperiment;