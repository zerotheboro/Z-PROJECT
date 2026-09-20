import {
  useRef,
  useState
} from "react";

import {
  interleavingMatchData
} from "../methodMatchData";

import type {
  MethodMatchExperimentResult
} from "../type";

type Stage =
  | "review"
  | "practice"
  | "test"
  | "confidence";

type Props = {
  originalScore: number | null;

  onComplete: (
    result: MethodMatchExperimentResult
  ) => void;
};

function InterleavingMatch({
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("review");

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

  const startTime =
    useRef(Date.now());

  const currentPractice =
    interleavingMatchData
      .practice[practiceIndex];

  const currentTest =
    interleavingMatchData
      .test[testIndex];

  function nextPractice() {

    if (
      practiceIndex <
      interleavingMatchData
        .practice.length - 1
    ) {

      setPracticeIndex(
        (prev) => prev + 1
      );

      return;
    }

    setStage("test");
  }

  function nextTest() {

    if (
      testIndex <
      interleavingMatchData
        .test.length - 1
    ) {

      setTestIndex(
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

    interleavingMatchData
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
      interleavingMatchData
        .test.length;

    const verificationScore =
      total === 0
        ? 0
        : correct / total;

    onComplete({
      method: "interleaving",

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

      {/* REVIEW */}

      {stage === "review" && (
        <div>

          <p>
            INTERLEAVING · ROUND 2
          </p>

          <h2>
            New mixed problem types
          </h2>

          <p>
            You'll switch between
            several types of problems
            again.
          </p>

          {
            interleavingMatchData
              .instructions
              .map((item) => (

                <div
                  key={item.type}
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

              ))
          }

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
            MIXED PRACTICE
          </p>

          <p>
            Problem{" "}
            {practiceIndex + 1}
            {" / "}
            {
              interleavingMatchData
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
                        setPracticeAnswers(
                          (prev) => ({
                            ...prev,
                            [currentPractice.id]:
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
              !practiceAnswers[
                currentPractice.id
              ]
            }
            onClick={
              nextPractice
            }
          >
            {practiceIndex ===
            interleavingMatchData
              .practice.length - 1
              ? "Finish practice"
              : "Next problem"}
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
            {testIndex + 1}
            {" / "}
            {
              interleavingMatchData
                .test.length
            }
          </p>

          <h2>
            {
              currentTest.question
            }
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
                        setTestAnswers(
                          (prev) => ({
                            ...prev,
                            [currentTest.id]:
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
              !testAnswers[
                currentTest.id
              ]
            }
            onClick={
              nextTest
            }
          >
            {testIndex ===
            interleavingMatchData
              .test.length - 1
              ? "Finish test"
              : "Next problem"}
          </button>

        </div>
      )}

      {/* CONFIDENCE */}

      {stage === "confidence" && (
        <div>

          <h2>
            How confident were you
            switching between the
            different problem types?
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

export default InterleavingMatch;