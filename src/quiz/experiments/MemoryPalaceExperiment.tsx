import {
  useRef,
  useState
} from "react";

import {
  memoryPalaceExperiment
} from "../methodLabData";

import type {
  MethodExperimentResult
} from "../type";

type Stage =
  | "intro"
  | "learn"
  | "encode"
  | "recall"
  | "test"
  | "reflection";

type Props = {
  onComplete: (
    result: MethodExperimentResult
  ) => void;
};

function MemoryPalaceExperiment({
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

  const experimentStart =
    useRef<number | null>(null);

  const currentQuestion =
    memoryPalaceExperiment
      .questions[questionIndex];

  function startExperiment() {
    experimentStart.current =
      Date.now();

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
      memoryPalaceExperiment
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

    memoryPalaceExperiment
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
      memoryPalaceExperiment
        .questions.length;

    const result:
      MethodExperimentResult = {

      method: "memory-palace",

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
            Memory Palace
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
            {memoryPalaceExperiment
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
              memoryPalaceExperiment
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

          <textarea
            value={recallText}
            onChange={(event) =>
              setRecallText(
                event.target.value
              )
            }
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
              memoryPalaceExperiment
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
            memoryPalaceExperiment
              .questions.length - 1
              ? "Finish test"
              : "Next question"}

          </button>

        </div>
      )}

      {/* REFLECTION */}

      {stage === "reflection" && (
        <div>

          <p>
            STEP 5 · REFLECT
          </p>

          <h2>
            How did Memory Palace feel?
          </h2>

          <h3>
            How confident were you
            remembering the locations?
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
            How easy was it to use?
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
            Would you use this method
            when studying?
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

export default MemoryPalaceExperiment;