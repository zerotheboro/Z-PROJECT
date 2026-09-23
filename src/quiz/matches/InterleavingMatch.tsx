import {
  useState
} from "react";

import type {
  ComparisonEngineData,
  MatchEngineProps
} from "../methodEngineTypes";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  useExperimentTimer,
  VerificationConfidence
} from "../engines/shared";

type Stage =
  | "review"
  | "practice"
  | "test"
  | "confidence";

type Props = MatchEngineProps<ComparisonEngineData>;

function InterleavingMatch({
  method,
  data,
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

  const { elapsedMs } =
    useExperimentTimer({
      startImmediately: true
    });

  const currentPractice =
    data
      .practice[practiceIndex];

  const currentTest =
    data
      .test[testIndex];

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

    setStage("confidence");
  }

  function finish() {

    if (confidence === null) {
      return;
    }

    const {
      score: verificationScore
    } = scoreMultipleChoice(
      data.test,
      testAnswers
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

      {/* REVIEW */}

      {stage === "review" && (
        <div>

          <p>
            {data.title.toUpperCase()}
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
            data
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
              setPracticeAnswers((prev) => ({
                ...prev,
                [currentPractice.id]: option
              }))
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
              setTestAnswers((prev) => ({
                ...prev,
                [currentTest.id]: option
              }))
            }
            onNext={nextTest}
            nextLabel={
              testIndex ===
              data.test.length - 1
                ? "Finish test"
                : "Next problem"
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
              switching between the
              different problem types?
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

export default InterleavingMatch;
