import {
  useRef,
  useState
} from "react";

import {
  interleavingExperiment
} from "../methodLabData";

import type {
  MethodExperimentResult
} from "../type";

type Stage =
  | "intro"
  | "learn"
  | "practice"
  | "test"
  | "reflection";

type Props = {
  onComplete: (
    result: MethodExperimentResult
  ) => void;
};

function InterleavingExperiment({
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

  const experimentStart =
    useRef<number | null>(null);

  const currentPractice =
    interleavingExperiment
      .practice[practiceIndex];

  const currentTest =
    interleavingExperiment
      .test[testIndex];

  function startExperiment() {
    experimentStart.current =
      Date.now();

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
      interleavingExperiment
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
      interleavingExperiment
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

    let correct = 0;

    interleavingExperiment
      .test
      .forEach((question) => {

        if (
          testAnswers[
            question.id
          ] === question.correct
        ) {
          correct += 1;
        }

      });

    const total =
      interleavingExperiment
        .test.length;

    const result:
      MethodExperimentResult = {

      method: "interleaving",

      category:
        "problem-solving",

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

      {/* INTRO */}

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB · PROBLEM SOLVING
          </p>

          <h2>
            Interleaving
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

          {interleavingExperiment
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
              interleavingExperiment
                .practice.length
            }
          </p>

          <h2>
            {
              currentPractice
                .question
            }
          </h2>

          <div className="option-grid">

            {
              currentPractice
                .options
                .map((option) => {

                  const selected =
                    practiceAnswers[
                      currentPractice.id
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
                        selectPracticeAnswer(
                          currentPractice.id,
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
              !practiceAnswers[
                currentPractice.id
              ]
            }
            onClick={
              nextPractice
            }
          >
            {practiceIndex ===
            interleavingExperiment
              .practice.length - 1
              ? "Finish practice"
              : "Next problem"}
          </button>

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
              interleavingExperiment
                .test.length
            }
          </p>

          <h2>
            {currentTest.question}
          </h2>

          <div className="option-grid">

            {
              currentTest
                .options
                .map((option) => {

                  const selected =
                    testAnswers[
                      currentTest.id
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
                        selectTestAnswer(
                          currentTest.id,
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
              !testAnswers[
                currentTest.id
              ]
            }
            onClick={
              nextTest
            }
          >
            {testIndex ===
            interleavingExperiment
              .test.length - 1
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
            How did switching between
            problem types feel?
          </h2>

          <h3>
            How confident were you?
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
            How easy was it?
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
            Would you use mixed
            practice yourself?
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

export default InterleavingExperiment;