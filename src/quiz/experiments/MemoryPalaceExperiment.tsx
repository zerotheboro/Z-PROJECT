import {
  useState
} from "react";

import type {
  LabEngineProps,
  SpatialMemoryEngineData
} from "../methodEngineTypes";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  TextResponse,
  useExperimentTimer
} from "../engines/shared";

type Stage =
  | "intro"
  | "learn"
  | "encode"
  | "recall"
  | "test"
  | "reflection";

type Props = LabEngineProps<SpatialMemoryEngineData>;

function MemoryPalaceExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("intro");

  const [
    recallText,
    setRecallText
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

  const [
    ease,
    setEase
  ] =
    useState<number | null>(null);

  const [
    willingnessToUse,
    setWillingnessToUse
  ] =
    useState<number | null>(null);

  const {
    start: startTimer,
    elapsedMs
  } = useExperimentTimer();

  const currentQuestion =
    data
      .questions[questionIndex];

  function startExperiment() {
    startTimer();

    setStage("learn");
  }

  function selectAnswer(
    id: string,
    answer: string
  ) {

    setAnswers((prev) => ({
      ...prev,
      [id]: answer
    }));
  }

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

    const {
      correct,
      total,
      score
    } = scoreMultipleChoice(
      data.questions,
      answers
    );

    const result = {

      method,

      category,

      correct,

      total,

      score,

      confidence,

      ease,

      willingnessToUse,

      timeSpentMs: elapsedMs()
    };

    console.log(
      "MEMORY PALACE RECALL:",
      recallText
    );

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {/* INTRO */}

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB · MEMORY
          </p>

          <h2>
            {name}
          </h2>

          <p>
            You'll attach information
            to familiar locations in an
            imagined room.
          </p>

          <p>
            Later, you'll mentally walk
            through those locations to
            retrieve the information.
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

      {/* LEARN */}

      {stage === "learn" && (
        <div>

          <p>
            STEP 1 · LEARN THE METHOD
          </p>

          <h2>
            Imagine a familiar room
          </h2>

          <p>
            We'll use five locations:
          </p>

          <ol>
            {data
              .locations
              .map(
                (location) => (
                  <li key={location}>
                    {location}
                  </li>
                )
              )}
          </ol>

          <p>
            Imagine walking through
            these locations in this
            exact order.
          </p>

          <button
            type="button"
            onClick={() =>
              setStage("encode")
            }
          >
            Continue
          </button>

        </div>
      )}

      {/* ENCODE */}

      {stage === "encode" && (
        <div>

          <p>
            STEP 2 · PLACE THE ITEMS
          </p>

          <h2>
            Build your Memory Palace
          </h2>

          <p>
            Imagine each object vividly
            at its location.
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
            Make the image exaggerated
            or strange if it helps.
          </p>

          <button
            type="button"
            onClick={() =>
              setStage("recall")
            }
          >
            I've pictured them
          </button>

        </div>
      )}

      {/* FREE RECALL */}

      {stage === "recall" && (
        <div>

          <p>
            STEP 3 · WALK THROUGH IT
          </p>

          <h2>
            Close the palace in your
            mind and recall the items.
          </h2>

          <p>
            Start at the front door
            and mentally move through
            each location.
          </p>

          <TextResponse
            value={recallText}
            onChange={setRecallText}
            placeholder="Write the items you remember, in order if possible..."
          />

          <button
            type="button"
            disabled={
              recallText
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
            STEP 4 · MEMORY CHECK
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
              selectAnswer(
                currentQuestion.id,
                option
              )
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

      {/* REFLECTION */}

      {stage === "reflection" && (
        <div>

          <p>
            STEP 5 · REFLECT
          </p>

          <h2>
            How did {name} feel?
          </h2>

          <LabRatings
            confidence={{
              prompt: <>
                How confident were you
                remembering the locations?
              </>,
              value: confidence,
              onChange: setConfidence
            }}
            ease={{
              prompt: "How easy was it to use?",
              value: ease,
              onChange: setEase
            }}
            willingnessToUse={{
              prompt: <>
                Would you use this method
                when studying?
              </>,
              value: willingnessToUse,
              onChange: setWillingnessToUse
            }}
            completeLabel="Complete experiment"
            onComplete={finishExperiment}
          />

        </div>
      )}

    </section>
  );
}

export default MemoryPalaceExperiment;
