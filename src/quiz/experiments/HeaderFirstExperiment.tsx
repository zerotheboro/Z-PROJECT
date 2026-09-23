import { useState } from "react";

import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer
} from "../engines/shared";
import type {
  HeaderFirstEngineData,
  LabEngineProps
} from "../methodEngineTypes";

type Stage =
  | "intro"
  | "headers"
  | "predict"
  | "read"
  | "test"
  | "reflection";

type Props = LabEngineProps<
  HeaderFirstEngineData
>;

function HeaderFirstExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("intro");
  const [prediction, setPrediction] =
    useState("");
  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});
  const [questionIndex, setQuestionIndex] =
    useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);
  const [ease, setEase] =
    useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] =
    useState<number | null>(null);
  const { start: startTimer, elapsedMs } =
    useExperimentTimer();

  const currentQuestion =
    data.questions[questionIndex];

  function finish() {
    if (
      confidence === null ||
      ease === null ||
      willingnessToUse === null
    ) {
      return;
    }

    const { correct, total, score } =
      scoreMultipleChoice(
        data.questions,
        answers
      );

    console.log("HEADER FIRST:", {
      prediction
    });

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
          <p>METHOD LAB · ORGANIZATION</p>
          <h2>{name}</h2>
          <p>
            You'll inspect the headings first,
            predict the structure, and then read
            the full material.
          </p>
          <button
            type="button"
            onClick={() => {
              startTimer();
              setStage("headers");
            }}
          >
            Start experiment
          </button>
        </div>
      )}

      {stage === "headers" && (
        <div>
          <p>STEP 1 · INSPECT THE HEADERS</p>
          <h2>{data.topic}</h2>
          <StudyPanel>
            <ol>
              {data.sections.map((section) => (
                <li key={section.heading}>
                  {section.heading}
                </li>
              ))}
            </ol>
          </StudyPanel>
          <button
            type="button"
            onClick={() => setStage("predict")}
          >
            Make a prediction
          </button>
        </div>
      )}

      {stage === "predict" && (
        <div>
          <p>STEP 2 · PREDICT</p>
          <h2>
            What organization and key ideas do
            these headings suggest?
          </h2>
          <TextResponse
            value={prediction}
            onChange={setPrediction}
            placeholder="Predict the organization and key ideas..."
          />
          <button
            type="button"
            disabled={
              prediction.trim().length < 20
            }
            onClick={() => setStage("read")}
          >
            Read the full material
          </button>
        </div>
      )}

      {stage === "read" && (
        <div>
          <p>STEP 3 · READ</p>
          <h2>{data.topic}</h2>
          <StudyPanel>
            {data.sections.map((section) => (
              <div key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.content}</p>
              </div>
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
          <p>STEP 4 · COMPREHENSION TEST</p>
          <p>
            Question {questionIndex + 1} /{" "}
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
            onNext={() =>
              questionIndex <
              data.questions.length - 1
                ? setQuestionIndex(
                    (value) => value + 1
                  )
                : setStage("reflection")
            }
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
              prompt: "How confident were you?",
              value: confidence,
              onChange: setConfidence
            }}
            ease={{
              prompt: "How easy was the method?",
              value: ease,
              onChange: setEase
            }}
            willingnessToUse={{
              prompt: (
                <>
                  Would you use {name} while
                  studying?
                </>
              ),
              value: willingnessToUse,
              onChange: setWillingnessToUse
            }}
            completeLabel="Complete experiment"
            onComplete={finish}
          />
        </div>
      )}
    </section>
  );
}

export default HeaderFirstExperiment;
