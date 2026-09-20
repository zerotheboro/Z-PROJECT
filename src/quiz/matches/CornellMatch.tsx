import {
  useRef,
  useState
} from "react";

import {
  cornellMatchData
} from "../methodMatchData";

import type {
  MethodMatchExperimentResult
} from "../type";

type Stage =
  | "organize"
  | "summary"
  | "test"
  | "confidence";

type Props = {
  originalScore: number | null;

  onComplete: (
    result: MethodMatchExperimentResult
  ) => void;
};

function CornellMatch({
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("organize");

  const [notes, setNotes] =
    useState("");

  const [cues, setCues] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const [
    answers,
    setAnswers
  ] =
    useState<Record<string, string>>({});

  const [
    questionIndex,
    setQuestionIndex
  ] = useState(0);

  const [
    confidence,
    setConfidence
  ] =
    useState<number | null>(null);

  const startTime =
    useRef(Date.now());

  const currentQuestion =
    cornellMatchData
      .questions[questionIndex];

  function nextQuestion() {

    if (
      questionIndex <
      cornellMatchData.questions.length - 1
    ) {

      setQuestionIndex(
        (prev) => prev + 1
      );

      return;
    }

    setStage("confidence");
  }

  function finish() {

    if (confidence === null) {
      return;
    }

    let correct = 0;

    cornellMatchData
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
      cornellMatchData.questions.length;

    const verificationScore =
      total === 0
        ? 0
        : correct / total;

    console.log(
      "CORNELL ROUND 2:",
      {
        notes,
        cues,
        summary
      }
    );

    onComplete({
      method: "cornell",

      firstScore:
        originalScore,

      verificationScore,

      confidence,

      timeSpentMs:
        Date.now() -
        startTime.current
    });
  }

  return (
    <section className="method-match-experiment">

      {/* ORGANIZE */}

      {stage === "organize" && (
        <div>

          <p>
            CORNELL NOTES · ROUND 2
          </p>

          <h2>
            {cornellMatchData.topic}
          </h2>

          <div className="study-content">

            <p>
              {cornellMatchData.content}
            </p>

          </div>

          <div className="cornell-layout">

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
                placeholder="Important words or questions..."
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
                placeholder="Organize the important information..."
              />

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

          <h2>
            Summarize the material.
          </h2>

          <textarea
            value={summary}
            onChange={(event) =>
              setSummary(
                event.target.value
              )
            }
            placeholder="Short summary..."
          />

          <button
            type="button"
            disabled={
              summary.trim().length < 20
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
            VERIFICATION TEST
          </p>

          <p>
            Question{" "}
            {questionIndex + 1}
            {" / "}
            {
              cornellMatchData
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
                        setAnswers(
                          (prev) => ({
                            ...prev,
                            [currentQuestion.id]:
                              option
                          })
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
            cornellMatchData
              .questions.length - 1
              ? "Finish test"
              : "Next question"}
          </button>

        </div>
      )}

      {/* CONFIDENCE */}

      {stage === "confidence" && (
        <div>

          <h2>
            How confident are you
            that Cornell helped you
            organize and understand
            the material?
          </h2>

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

          <button
            type="button"
            disabled={
              confidence === null
            }
            onClick={finish}
          >
            Complete verification
          </button>

        </div>
      )}

    </section>
  );
}

export default CornellMatch;