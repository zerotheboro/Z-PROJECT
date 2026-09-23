import {
  useState
} from "react";

import type {
  ExplanationEngineData,
  LabEngineProps
} from "../methodEngineTypes";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer
} from "../engines/shared";

type Stage =
  | "intro"
  | "study"
  | "explain"
  | "refine"
  | "test"
  | "reflection";

type Props = LabEngineProps<ExplanationEngineData>;

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

function OneSentenceExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("intro");
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
  const [ease, setEase] =
    useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] =
    useState<number | null>(null);

  const {
    start: startTimer,
    elapsedMs
  } = useExperimentTimer();

  const currentQuestion =
    data.questions[questionIndex];

  function startExperiment() {
    startTimer();
    setStage("study");
  }

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

    console.log(
      "1 sentence explanation:",
      explanation
    );
    console.log(
      "Refined 1 sentence explanation:",
      refinedExplanation
    );

    onComplete({
      method,
      category,
      correct,
      total,
      score,
      confidence,
      ease,
      willingnessToUse,
      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section className="method-experiment">
      {stage === "intro" && (
        <div>
          <p>METHOD LAB · UNDERSTANDING</p>
          <h2>{name}</h2>
          <p>
            You'll learn a short concept,
            explain it in exactly one
            concise sentence, and then
            refine that sentence.
          </p>
          <button
            type="button"
            onClick={startExperiment}
          >
            Start experiment
          </button>
        </div>
      )}

      {stage === "study" && (
        <div>
          <p>STEP 1 · LEARN</p>
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
          <p>STEP 2 · ONE SENTENCE</p>
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
          <p>STEP 3 · REFINE</p>
          <h2>
            Refine your sentence so it is
            clearer and more precise.
          </h2>
          <p>
            Keep the central idea accurate
            while using exactly one sentence.
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
          <p>STEP 4 · COMPREHENSION CHECK</p>
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

      {stage === "reflection" && (
        <div>
          <p>STEP 5 · REFLECT</p>
          <h2>How did the {name} feel?</h2>
          <LabRatings
            confidence={{
              prompt: <>
                How confident are you that
                you understood the concept?
              </>,
              value: confidence,
              onChange: setConfidence
            }}
            ease={{
              prompt: <>
                How easy was this method
                to use?
              </>,
              value: ease,
              onChange: setEase
            }}
            willingnessToUse={{
              prompt: <>
                Would you use this while
                studying?
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

export default OneSentenceExperiment;
