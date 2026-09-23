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
  | "retrieve"
  | "test"
  | "confidence";

type Props = MatchEngineProps<RecallEngineData>;

function ActiveRecallMatch({
  method,
  data,
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("study");

  const [
    retrievalText,
    setRetrievalText
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

          <p>
            Study the information.
            You'll retrieve it from memory
            next.
          </p>

          <StudyPanel>

            {
              data
                .facts.map(
                  (fact, index) => (
                    <p key={index}>
                      {fact}
                    </p>
                  )
                )
            }

          </StudyPanel>

          <button
            type="button"
            onClick={() =>
              setStage("retrieve")
            }
          >
            I'm ready
          </button>

        </div>
      )}

      {stage === "retrieve" && (
        <div>

          <p>
            RETRIEVE
          </p>

          <h2>
            Write everything you can
            remember without looking back.
          </h2>

          <TextResponse
            value={retrievalText}
            onChange={setRetrievalText}
            placeholder="What do you remember?"
          />

          <button
            type="button"
            disabled={
              retrievalText
                .trim()
                .length === 0
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

export default ActiveRecallMatch;
