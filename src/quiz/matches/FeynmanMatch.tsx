import {
  useRef,
  useState
} from "react";

import {
  feynmanMatchData
} from "../methodMatchData";

import type {
  MethodMatchExperimentResult
} from "../type";

type Stage =
  | "study"
  | "explain"
  | "test"
  | "confidence";

type Props = {
  originalScore: number | null;

  onComplete: (
    result: MethodMatchExperimentResult
  ) => void;
};

function FeynmanMatch({
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("study");

  const [
    explanation,
    setExplanation
  ] = useState("");

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
    feynmanMatchData
      .questions[questionIndex];

  function nextQuestion() {

    if (
      questionIndex <
      feynmanMatchData.questions.length - 1
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

    feynmanMatchData
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
      feynmanMatchData
        .questions.length;

    const verificationScore =
      total === 0
        ? 0
        : correct / total;

    console.log(
      "FEYNMAN ROUND 2 EXPLANATION:",
      explanation
    );

    onComplete({
      method: "feynman",

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

      {stage === "study" && (
        <div>

          <p>
            FEYNMAN · ROUND 2
          </p>

          <h2>
            {
              feynmanMatchData
                .topic
            }
          </h2>

          <div className="study-content">
            <p>
              {
                feynmanMatchData
                  .explanation
              }
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setStage("explain")
            }
          >
            I'm ready
          </button>

        </div>
      )}

      {stage === "explain" && (
        <div>

          <h2>
            Explain the concept in
            simple language.
          </h2>

          <textarea
            value={explanation}
            onChange={(event) =>
              setExplanation(
                event.target.value
              )
            }
            placeholder="Explain it simply..."
          />

          <button
            type="button"
            disabled={
              explanation
                .trim()
                .length < 20
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
            VERIFICATION TEST
          </p>

          <p>
            Question{" "}
            {questionIndex + 1}
            {" / "}
            {
              feynmanMatchData
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
            feynmanMatchData
              .questions.length - 1
              ? "Finish test"
              : "Next question"}
          </button>

        </div>
      )}

      {stage === "confidence" && (
        <div>

          <h2>
            How confident are you
            that you understood the
            concept?
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

export default FeynmanMatch;