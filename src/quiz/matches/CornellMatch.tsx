import {
  useTrainingState as useState
} from "../trainingProgressState";

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

  const [title, setTitle] =
    useState("");

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
        title,
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

      {(stage === "organize" ||
        stage === "summary") && (
        <div>

          <p>
            {stage === "organize"
              ? data.title.toUpperCase()
              : "SUMMARIZE THE MATERIAL"}
          </p>

          <h2>
            {stage === "organize"
              ? data.topic
              : "Summarize the material."}
          </h2>

          <StudyPanel>

            <p>
              {data.content}
            </p>

          </StudyPanel>

          <div className="cornell-sheet">

            <div className="cornell-title">
              <label htmlFor="cornell-match-title">
                Short Title
              </label>
              <input
                id="cornell-match-title"
                type="text"
                maxLength={80}
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Topic or title..."
              />
            </div>

            <div className="cornell-columns">

            <div className="cornell-cues">
              <h3>
                Cues / Questions
              </h3>
              <TextResponse
                value={cues}
                onChange={setCues}
                placeholder="Important words or questions..."
              />
            </div>

            <div className="cornell-main-notes">
              <h3>
                Main Notes
              </h3>
              <TextResponse
                value={notes}
                onChange={setNotes}
                placeholder="Organize the important information..."
                judge={{
                  taskId: "main-notes",
                  sourceMaterial:
                    data.content
                }}
              />
            </div>

            </div>

            <div className="cornell-summary">
              <h3>
                Brief Summary
              </h3>
              <TextResponse
                value={summary}
                onChange={setSummary}
                placeholder="Short summary..."
                judge={{
                  taskId: "summary",
                  sourceMaterial:
                    data.content
                }}
              />
            </div>

          </div>

          <button
            type="button"
            disabled={stage === "organize"
              ? notes.trim().length < 20 ||
                cues.trim().length < 5
              : summary.trim().length < 20}
            onClick={() => setStage(
              stage === "organize"
                ? "summary"
                : "test"
            )}
          >
            {stage === "organize"
              ? "Continue"
              : "Continue to test"}
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
            onBack={() =>
              setQuestionIndex(previous =>
                Math.max(0, previous - 1)
              )
            }
            backDisabled={questionIndex === 0}
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
