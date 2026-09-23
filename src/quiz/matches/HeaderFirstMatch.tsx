import { useState } from "react";

import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer,
  VerificationConfidence
} from "../engines/shared";
import type {
  HeaderFirstEngineData,
  MatchEngineProps
} from "../methodEngineTypes";

type Stage =
  | "headers"
  | "predict"
  | "read"
  | "test"
  | "confidence";

type Props = MatchEngineProps<
  HeaderFirstEngineData
>;

function HeaderFirstMatch({
  method,
  data,
  originalScore,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("headers");
  const [prediction, setPrediction] =
    useState("");
  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});
  const [questionIndex, setQuestionIndex] =
    useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({
    startImmediately: true
  });

  const currentQuestion =
    data.questions[questionIndex];

  function finish() {
    if (confidence === null) {
      return;
    }

    const { score: verificationScore } =
      scoreMultipleChoice(
        data.questions,
        answers
      );

    console.log("HEADER FIRST ROUND 2:", {
      prediction
    });

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
      {stage === "headers" && (
        <div>
          <p>{data.title.toUpperCase()}</p>
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
          <p>VERIFICATION TEST</p>
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
                : setStage("confidence")
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

      {stage === "confidence" && (
        <div>
          <VerificationConfidence
            prompt="How confident are you that HEADER first helped you understand the material?"
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

export default HeaderFirstMatch;
