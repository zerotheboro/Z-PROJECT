import {
  useState
} from "react";

import type {
  LabEngineProps,
  RecallEngineData
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
  | "blurt"
  | "compare"
  | "test"
  | "reflection";

type Props = LabEngineProps<RecallEngineData>;

function ActiveBlurtingExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("intro");
  const [retrievalText, setRetrievalText] =
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
          <p>METHOD LAB</p>
          <h2>{name}</h2>
          <p>
            You'll first study a small
            amount of information.
          </p>
          <p>
            Then you'll blurt everything
            you remember, check the gaps,
            and take a short test.
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
          <p>STEP 1 · STUDY</p>
          <h2>{data.topic}</h2>
          <p>Read these facts carefully.</p>
          <StudyPanel>
            {data.facts.map((fact, index) => (
              <p key={index}>{fact}</p>
            ))}
          </StudyPanel>
          <button
            type="button"
            onClick={() => setStage("blurt")}
          >
            I'm ready
          </button>
        </div>
      )}

      {stage === "blurt" && (
        <div>
          <p>STEP 2 · BLURT</p>
          <h2>
            Without looking back, blurt
            out everything you remember
            in writing.
          </h2>
          <TextResponse
            value={retrievalText}
            onChange={setRetrievalText}
            placeholder="Blurt everything you remember..."
          />
          <button
            type="button"
            disabled={
              retrievalText.trim().length === 0
            }
            onClick={() => setStage("compare")}
          >
            Continue
          </button>
        </div>
      )}

      {stage === "compare" && (
        <div>
          <p>STEP 3 · CHECK GAPS</p>
          <h2>
            Compare your blurt with the
            original material.
          </h2>
          <p>
            Notice what you remembered,
            what was incomplete, and what
            you missed.
          </p>
          <StudyPanel>
            {data.facts.map((fact, index) => (
              <p key={index}>{fact}</p>
            ))}
          </StudyPanel>
          <button
            type="button"
            onClick={() => setStage("test")}
          >
            Continue to test
          </button>
        </div>
      )}

      {stage === "test" && (
        <div>
          <p>STEP 4 · FINAL TEST</p>
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
          <h2>How did {name} feel?</h2>
          <LabRatings
            confidence={{
              prompt: "Confidence",
              value: confidence,
              onChange: setConfidence,
              highlightSelection: false
            }}
            ease={{
              prompt: "How easy was it to use?",
              value: ease,
              onChange: setEase,
              highlightSelection: false
            }}
            willingnessToUse={{
              prompt: <>
                Would you actually use
                this while studying?
              </>,
              value: willingnessToUse,
              onChange: setWillingnessToUse,
              highlightSelection: false
            }}
            completeLabel="Complete experiment"
            onComplete={finishExperiment}
          />
        </div>
      )}
    </section>
  );
}

export default ActiveBlurtingExperiment;
