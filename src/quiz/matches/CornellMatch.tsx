import {
  useState
} from "react";

import type {
  MatchEngineProps,
  OrganizationEngineData
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
  | "organize"
  | "summary"
  | "test"
  | "confidence";

type Props = MatchEngineProps<OrganizationEngineData>;

function CornellMatch({
  method,
  name,
  shortName,
  data,
  originalScore,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("organize");

  const [notes, setNotes] =
    useState("");

  const [cues, setCues] =
    useState("");

  const [summary, setSummary] =
    useState("");

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
      "CORNELL ROUND 2:",
      {
        notes,
        cues,
        summary
      }
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

      {/* ORGANIZE */}

      {stage === "organize" && (
        <div>

          <p>
            {data.title.toUpperCase()}
          </p>

          <h2>
            {data.topic}
          </h2>

          <StudyPanel>

            <p>
              {data.content}
            </p>

          </StudyPanel>

          <div className="cornell-layout">

            <div>
              <h3>
                Cues / Questions
              </h3>
              <TextResponse
                value={cues}
                onChange={setCues}
                placeholder="Important words or questions..."
              />
            </div>

            <div>
              <h3>
                Main Notes
              </h3>
              <TextResponse
                value={notes}
                onChange={setNotes}
                placeholder="Organize the important information..."
              />
            </div>

          </div>

          <button
            type="button"
            disabled={
              notes.trim().length < 20 ||
              cues.trim().length < 5
            }
            onClick={() =>
              setStage("summary")
            }
          >
            Continue
          </button>

        </div>
      )}

      {/* SUMMARY */}

      {stage === "summary" && (
        <div>

          <h2>
            Summarize the material.
          </h2>

          <TextResponse
            value={summary}
            onChange={setSummary}
            placeholder="Short summary..."
          />

          <button
            type="button"
            disabled={
              summary.trim().length < 20
            }
            onClick={() =>
              setStage("test")
            }
          >
            Continue to test
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

      {/* CONFIDENCE */}

      {stage === "confidence" && (
        <div>

          <VerificationConfidence
            prompt={<>
              How confident are you
              that {shortName ?? name} helped you
              organize and understand
              the material?
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

export default CornellMatch;
