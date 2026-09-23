import {
  useState
} from "react";

import type {
  MatchEngineProps,
  RecallEngineData
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
  | "blurt"
  | "compare"
  | "test"
  | "confidence";

type Props = MatchEngineProps<RecallEngineData>;

function ActiveBlurtingMatch({
  method,
  data,
  originalScore,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("study");
  const [retrievalText, setRetrievalText] =
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
          <p>
            Study the information. You'll
            blurt it from memory next.
          </p>
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
          <p>BLURT</p>
          <h2>
            Blurt everything you can
            remember without looking back.
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
          <p>CHECK GAPS</p>
          <h2>
            Compare your blurt with the
            source material.
          </h2>
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
              How confident are you in
              what you remembered?
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

export default ActiveBlurtingMatch;
