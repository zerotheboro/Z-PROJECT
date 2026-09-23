import {
  useState
} from "react";

import type {
  ExplanationEngineData,
  MatchEngineProps
} from "../methodEngineTypes";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer,
  VerificationConfidence
} from "../engines/shared";

type Stage =
  | "study"
  | "explain"
  | "test"
  | "confidence";

type Props = MatchEngineProps<ExplanationEngineData>;

function FeynmanMatch({
  method,
  data,
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
      data.questions.length - 1
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
      "FEYNMAN ROUND 2 EXPLANATION:",
      explanation
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

      {stage === "study" && (
        <div>

          <p>
            {data.title.toUpperCase()}
          </p>

          <h2>
            {
              data
                .topic
            }
          </h2>

          <StudyPanel>
            <p>
              {
                data
                  .explanation
              }
            </p>
          </StudyPanel>

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

          <TextResponse
            value={explanation}
            onChange={setExplanation}
            placeholder="Explain it simply..."
          />

          <button
            type="button"
            disabled={
              explanation.trim().length < 20
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

      {stage === "confidence" && (
        <div>

          <VerificationConfidence
            prompt={<>
              How confident are you
              that you understood the
              concept?
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

export default FeynmanMatch;
