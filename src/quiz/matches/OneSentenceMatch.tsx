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
  | "refine"
  | "test"
  | "confidence";

type Props = MatchEngineProps<ExplanationEngineData>;

function isOneConciseSentence(
  value: string
) {
  const text = value.trim();
  const sentenceEndings =
    text.match(/[.!?]+/g) ?? [];

  return (
    text.length >= 10 &&
    text.length <= 240 &&
    !text.includes("\n") &&
    sentenceEndings.length === 1 &&
    /[.!?]$/.test(text)
  );
}

function OneSentenceMatch({
  method,
  data,
  originalScore,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("study");
  const [explanation, setExplanation] =
    useState("");
  const [refinedExplanation, setRefinedExplanation] =
    useState("");
  const [answers, setAnswers] =
    useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] =
    useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);

  const { elapsedMs } =
    useExperimentTimer({
      startImmediately: true
    });

  const currentQuestion =
    data.questions[questionIndex];

  function nextQuestion() {
    if (
      questionIndex <
      data.questions.length - 1
    ) {
      setQuestionIndex(
        (previous) => previous + 1
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
      "1 SENTENCE ROUND 2 EXPLANATION:",
      explanation
    );
    console.log(
      "1 SENTENCE ROUND 2 REFINEMENT:",
      refinedExplanation
    );

    onComplete({
      method,
      firstScore: originalScore,
      verificationScore,
      confidence,
      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section className="method-match-experiment">
      {stage === "study" && (
        <div>
          <p>{data.title.toUpperCase()}</p>
          <h2>{data.topic}</h2>
          <StudyPanel>
            <p>{data.explanation}</p>
          </StudyPanel>
          <button
            type="button"
            onClick={() => setStage("explain")}
          >
            I'm ready
          </button>
        </div>
      )}

      {stage === "explain" && (
        <div>
          <h2>
            Explain the central idea in
            exactly one concise sentence.
          </h2>
          <p>
            Keep it under 240 characters
            and end it with one sentence mark.
          </p>
          <TextResponse
            value={explanation}
            onChange={setExplanation}
            placeholder="Write one concise sentence..."
          />
          <button
            type="button"
            disabled={
              !isOneConciseSentence(explanation)
            }
            onClick={() => setStage("refine")}
          >
            Continue
          </button>
        </div>
      )}

      {stage === "refine" && (
        <div>
          <h2>
            Refine your sentence so it is
            clearer and more precise.
          </h2>
          <p>
            Keep it accurate and keep it
            to exactly one sentence.
          </p>
          <TextResponse
            value={refinedExplanation}
            onChange={setRefinedExplanation}
            placeholder="Refine your one sentence..."
          />
          <button
            type="button"
            disabled={
              !isOneConciseSentence(
                refinedExplanation
              )
            }
            onClick={() => setStage("test")}
          >
            Continue to test
          </button>
        </div>
      )}

      {stage === "test" && (
        <div>
          <p>VERIFICATION TEST</p>
          <p>
            Question {questionIndex + 1}
            {" / "}
            {data.questions.length}
          </p>
          <MultipleChoiceRunner
            question={currentQuestion}
            selectedAnswer={
              answers[currentQuestion.id]
            }
            onSelect={(option) =>
              setAnswers((previous) => ({
                ...previous,
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

export default OneSentenceMatch;
