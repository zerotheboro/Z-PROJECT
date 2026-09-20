import {
  useRef,
  useState
} from "react";

import {
  activeRecallMatchData
} from "../methodMatchData";

import type {
  MethodMatchExperimentResult
} from "../type";

type Stage =
  | "study"
  | "retrieve"
  | "test"
  | "confidence";

type Props = {
  originalScore: number | null;

  onComplete: (
    result: MethodMatchExperimentResult
  ) => void;
};

function ActiveRecallMatch({
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("study");

  const [
    retrievalText,
    setRetrievalText
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
    activeRecallMatchData
      .questions[questionIndex];

  function nextQuestion() {

    if (
      questionIndex <
      activeRecallMatchData.questions.length - 1
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

    activeRecallMatchData
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
      activeRecallMatchData
        .questions.length;

    const verificationScore =
      total === 0
        ? 0
        : correct / total;

    onComplete({
      method: "active-recall",

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
            ACTIVE RECALL · ROUND 2
          </p>

          <h2>
            {
              activeRecallMatchData
                .topic
            }
          </h2>

          <p>
            Study the information.
            You'll retrieve it from memory
            next.
          </p>

          <div className="study-content">

            {
              activeRecallMatchData
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
              setStage("retrieve")
            }
          >
            I'm ready
          </button>

        </div>
      )}

      {stage === "retrieve" && (
        <div>

          <p>
            RETRIEVE
          </p>

          <h2>
            Write everything you can
            remember without looking back.
          </h2>

          <textarea
            value={retrievalText}
            onChange={(event) =>
              setRetrievalText(
                event.target.value
              )
            }
            placeholder="What do you remember?"
          />

          <button
            type="button"
            disabled={
              retrievalText
                .trim()
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
            VERIFICATION TEST
          </p>

          <p>
            Question{" "}
            {questionIndex + 1}
            {" / "}
            {
              activeRecallMatchData
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
            activeRecallMatchData
              .questions.length - 1
              ? "Finish test"
              : "Next question"}
          </button>

        </div>
      )}

      {stage === "confidence" && (
        <div>

          <h2>
            How confident are you in
            what you remembered?
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

export default ActiveRecallMatch;