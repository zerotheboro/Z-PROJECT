import {
  useState
} from "react";

import type {
  LabEngineProps,
  OrganizationEngineData
} from "../methodEngineTypes";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  TextResponse,
  useExperimentTimer
} from "../engines/shared";

type Stage =
  | "intro"
  | "notes"
  | "summary"
  | "test"
  | "reflection";

type Props = LabEngineProps<OrganizationEngineData>;

function CornellExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("intro");

  const [notes, setNotes] =
    useState("");

  const [cues, setCues] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [
    questionIndex,
    setQuestionIndex
  ] = useState(0);

  const [
    confidence,
    setConfidence
  ] = useState<number | null>(null);

  const [
    ease,
    setEase
  ] = useState<number | null>(null);

  const [
    willingnessToUse,
    setWillingnessToUse
  ] = useState<number | null>(null);

  const {
    start: startTimer,
    elapsedMs
  } = useExperimentTimer();

  const currentQuestion =
    data
      .questions[questionIndex];

  function startExperiment() {
    startTimer();

    setStage("notes");
  }

  function selectAnswer(
    questionId: string,
    answer: string
  ) {

    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  }

  function nextQuestion() {

    if (
      questionIndex <
      data
        .questions.length - 1
    ) {

      setQuestionIndex(
        (prev) => prev + 1
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

    const result = {

      method,

      category,

      correct,

      total,

      score,

      confidence,

      ease,

      willingnessToUse,

      timeSpentMs: elapsedMs()
    };

    console.log(
      "CORNELL NOTES:",
      {
        notes,
        cues,
        summary
      }
    );

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {/* INTRO */}

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB · ORGANIZATION
          </p>

          <h2>
            {name}
          </h2>

          <p>
            You'll organize information
            into three parts:
          </p>

          <ul>
            <li>Main notes</li>
            <li>Cues / key questions</li>
            <li>A short summary</li>
          </ul>

          <button
            type="button"
            onClick={
              startExperiment
            }
          >
            Start experiment
          </button>

        </div>
      )}

      {/* NOTES */}

      {stage === "notes" && (
        <div>

          <p>
            STEP 1 · ORGANIZE
          </p>

          <h2>
            {data.topic}
          </h2>

          <div className="cornell-layout">

            <div className="cornell-source">

              <h3>
                Learning material
              </h3>

              <p>
                {
                  data
                    .content
                }
              </p>

            </div>

            <div className="cornell-notes">

              <div>
                <h3>
                  Cues / Questions
                </h3>
                <TextResponse
                  value={cues}
                  onChange={setCues}
                  placeholder="Key words, questions, important ideas..."
                />
              </div>

              <div>
                <h3>
                  Main Notes
                </h3>
                <TextResponse
                  value={notes}
                  onChange={setNotes}
                  placeholder="Write the important information here..."
                />
              </div>

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

          <p>
            STEP 2 · SUMMARIZE
          </p>

          <h2>
            Summarize the main idea.
          </h2>

          <p>
            Try to capture the whole
            process in a few sentences.
          </p>

          <TextResponse
            value={summary}
            onChange={setSummary}
            placeholder="Your summary..."
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
            STEP 3 · CHECK
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
              selectAnswer(
                currentQuestion.id,
                option
              )
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

      {/* REFLECTION */}

      {stage === "reflection" && (
        <div>

          <p>
            STEP 4 · REFLECT
          </p>

          <h2>
            How did {name} feel?
          </h2>

          <LabRatings
            confidence={{
              prompt: <>
                How confident are you
                that you understood and
                organized the material?
              </>,
              value: confidence,
              onChange: setConfidence
            }}
            ease={{
              prompt: "How easy was the method?",
              value: ease,
              onChange: setEase
            }}
            willingnessToUse={{
              prompt: <>
                Would you use {name}
                while studying?
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

export default CornellExperiment;
