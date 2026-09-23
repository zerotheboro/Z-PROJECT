import {
  useState
} from "react";

import type {
  ComparisonEngineData,
  LabEngineProps
} from "../methodEngineTypes";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  useExperimentTimer
} from "../engines/shared";

type Stage =
  | "intro"
  | "learn"
  | "practice"
  | "test"
  | "reflection";

type Props = LabEngineProps<ComparisonEngineData>;

function InterleavingExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("intro");

  const [
    practiceIndex,
    setPracticeIndex
  ] = useState(0);

  const [
    practiceAnswers,
    setPracticeAnswers
  ] =
    useState<Record<string, string>>({});

  const [
    testIndex,
    setTestIndex
  ] = useState(0);

  const [
    testAnswers,
    setTestAnswers
  ] =
    useState<Record<string, string>>({});

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

  const currentPractice =
    data
      .practice[practiceIndex];

  const currentTest =
    data
      .test[testIndex];

  function startExperiment() {
    startTimer();

    setStage("learn");
  }

  function selectPracticeAnswer(
    id: string,
    answer: string
  ) {

    setPracticeAnswers(
      (prev) => ({
        ...prev,
        [id]: answer
      })
    );
  }

  function nextPractice() {

    if (
      practiceIndex <
      data
        .practice.length - 1
    ) {

      setPracticeIndex(
        (prev) => prev + 1
      );

      return;
    }

    setStage("test");
  }

  function selectTestAnswer(
    id: string,
    answer: string
  ) {

    setTestAnswers(
      (prev) => ({
        ...prev,
        [id]: answer
      })
    );
  }

  function nextTest() {

    if (
      testIndex <
      data
        .test.length - 1
    ) {

      setTestIndex(
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
      data.test,
      testAnswers
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

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {/* INTRO */}

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB · PROBLEM SOLVING
          </p>

          <h2>
            {name}
          </h2>

          <p>
            Instead of practising one
            type of problem repeatedly,
            you'll switch between
            different problem types.
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
            STEP 1 · LEARN THE TYPES
          </p>

          <h2>
            Three problem types
          </h2>

          {data
            .instructions.map(
              (item) => (

                <div
                  key={item.type}
                  className="problem-rule"
                >

                  <h3>
                    {item.name}
                  </h3>

                  <p>
                    {item.rule}
                  </p>

                  <p>
                    Example:{" "}
                    {item.example}
                  </p>

                </div>

              )
            )}

          <button
            type="button"
            onClick={() =>
              setStage("practice")
            }
          >
            Start mixed practice
          </button>

        </div>
      )}

      {/* PRACTICE */}

      {stage === "practice" && (
        <div>

          <p>
            STEP 2 · MIXED PRACTICE
          </p>

          <p>
            Problem{" "}
            {practiceIndex + 1}
            {" / "}
            {
              data
                .practice.length
            }
          </p>

          <MultipleChoiceRunner
            question={currentPractice}
            selectedAnswer={
              practiceAnswers[
                currentPractice.id
              ]
            }
            onSelect={(option) =>
              selectPracticeAnswer(
                currentPractice.id,
                option
              )
            }
            onNext={nextPractice}
            nextLabel={
              practiceIndex ===
              data.practice.length - 1
                ? "Finish practice"
                : "Next problem"
            }
          />

        </div>
      )}

      {/* FINAL TEST */}

      {stage === "test" && (
        <div>

          <p>
            STEP 3 · NEW PROBLEMS
          </p>

          <p>
            Question{" "}
            {testIndex + 1}
            {" / "}
            {
              data
                .test.length
            }
          </p>

          <MultipleChoiceRunner
            question={currentTest}
            selectedAnswer={
              testAnswers[currentTest.id]
            }
            onSelect={(option) =>
              selectTestAnswer(
                currentTest.id,
                option
              )
            }
            onNext={nextTest}
            nextLabel={
              testIndex ===
              data.test.length - 1
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
            STEP 4 · REFLECT
          </p>

          <h2>
            How did switching between
            problem types feel?
          </h2>

          <LabRatings
            confidence={{
              prompt: "How confident were you?",
              value: confidence,
              onChange: setConfidence
            }}
            ease={{
              prompt: "How easy was it?",
              value: ease,
              onChange: setEase
            }}
            willingnessToUse={{
              prompt: <>
                Would you use mixed
                practice yourself?
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

export default InterleavingExperiment;
