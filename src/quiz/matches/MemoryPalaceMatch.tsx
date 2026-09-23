import {
  useState
} from "react";

import type {
  MatchEngineProps,
  SpatialMemoryEngineData
} from "../methodEngineTypes";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  TextResponse,
  useExperimentTimer,
  VerificationConfidence
} from "../engines/shared";

type Stage =
  | "encode"
  | "retrieve"
  | "test"
  | "confidence";

type Props = MatchEngineProps<SpatialMemoryEngineData>;

function MemoryPalaceMatch({
  method,
  data,
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

  const { elapsedMs } =
    useExperimentTimer({
      startImmediately: true
    });

  const currentQuestion =
    data
      .questions[questionIndex];

  function nextQuestion() {

    if (
      questionIndex <
      data
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

    const {
      score: verificationScore
    } = scoreMultipleChoice(
      data.questions,
      answers
    );

    console.log(
      "MEMORY PALACE ROUND 2 RECALL:",
      retrievalText
    );

    onComplete({
      method,

      firstScore:
        originalScore,

      verificationScore,

      confidence,

      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section className="method-match-experiment">

      {/* ENCODE */}

      {stage === "encode" && (
        <div>

          <p>
            {data.title.toUpperCase()}
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
              data
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

          <TextResponse
            value={retrievalText}
            onChange={setRetrievalText}
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
              data
                .questions.length
            }
          </p>

          <MultipleChoiceRunner
            question={currentQuestion}
            selectedAnswer={
              answers[currentQuestion.id]
            }
            onSelect={(option) =>
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: option
              }))
            }
            onNext={nextQuestion}
            nextLabel={
              questionIndex ===
              data.questions.length - 1
                ? "Finish test"
                : "Next question"
            }
          />

        </div>
      )}

      {/* CONFIDENCE */}

      {stage === "confidence" && (
        <div>

          <VerificationConfidence
            prompt={<>
              How confident were you
              retrieving the palace?
            </>}
            value={confidence}
            onChange={setConfidence}
            completeLabel="Complete verification"
            onComplete={finish}
          />

        </div>
      )}

    </section>
  );
}

export default MemoryPalaceMatch;
