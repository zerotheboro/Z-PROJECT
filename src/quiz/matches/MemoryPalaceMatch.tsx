import {
  useRef,
  useState
} from "react";

import {
  memoryPalaceMatchData
} from "../methodMatchData";

import type {
  MethodMatchExperimentResult
} from "../type";

type Stage =
  | "encode"
  | "retrieve"
  | "test"
  | "confidence";

type Props = {
  originalScore: number | null;

  onComplete: (
    result: MethodMatchExperimentResult
  ) => void;
};

function MemoryPalaceMatch({
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("encode");

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
    memoryPalaceMatchData
      .questions[questionIndex];

  function nextQuestion() {

    if (
      questionIndex <
      memoryPalaceMatchData
        .questions.length - 1
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

    memoryPalaceMatchData
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
      memoryPalaceMatchData
        .questions.length;

    const verificationScore =
      total === 0
        ? 0
        : correct / total;

    console.log(
      "MEMORY PALACE ROUND 2 RECALL:",
      retrievalText
    );

    onComplete({
      method: "memory-palace",

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

      {/* ENCODE */}

      {stage === "encode" && (
        <div>

          <p>
            MEMORY PALACE · ROUND 2
          </p>

          <h2>
            Build a new palace
          </h2>

          <p>
            Imagine these new locations
            and place each item there.
          </p>

          <div className="memory-palace-pairs">

            {
              memoryPalaceMatchData
                .pairings
                .map(
                  ({
                    location,
                    item
                  }) => (

                    <div
                      key={location}
                      className="memory-pair"
                    >

                      <strong>
                        {location}
                      </strong>

                      <span>
                        →
                      </span>

                      <strong>
                        {item}
                      </strong>

                    </div>

                  )
                )
            }

          </div>

          <p>
            Try to make each mental
            image exaggerated or strange.
          </p>

          <button
            type="button"
            onClick={() =>
              setStage("retrieve")
            }
          >
            I've pictured them
          </button>

        </div>
      )}

      {/* RETRIEVE */}

      {stage === "retrieve" && (
        <div>

          <p>
            RETRIEVE
          </p>

          <h2>
            Mentally walk through the
            palace.
          </h2>

          <p>
            Recall the items without
            looking back.
          </p>

          <textarea
            value={retrievalText}
            onChange={(event) =>
              setRetrievalText(
                event.target.value
              )
            }
            placeholder="Write the items you remember..."
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
              memoryPalaceMatchData
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
            memoryPalaceMatchData
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
            How confident were you
            retrieving the palace?
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

export default MemoryPalaceMatch;