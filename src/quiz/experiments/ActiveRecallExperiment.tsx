import {
  useRef
} from "react";

import {
  useTrainingState as useState
} from "../trainingProgressState";

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
  useExperimentTimer,
  useStageCountdown
} from "../engines/shared";

type Stage =
  | "intro"
  | "study"
  | "retrieval"
  | "test"
  | "reflection";

type Props = LabEngineProps<RecallEngineData>;

function ActiveRecallExperiment({
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

  const [
    willingnessToUse,
    setWillingnessToUse
  ] =
    useState<number | null>(null);

  const {
    start: startTimer,
    elapsedMs
  } = useExperimentTimer();

  const studyAdvancedRef = useRef(false);
  const retrievalAdvancedRef = useRef(false);

  function finishStudy() {
    if (studyAdvancedRef.current) {
      return;
    }

    studyAdvancedRef.current = true;
    setStage("retrieval");
  }

  function finishRetrieval() {
    if (
      retrievalAdvancedRef.current ||
      retrievalText.trim().length === 0
    ) {
      return;
    }

    retrievalAdvancedRef.current = true;
    setStage("test");
  }

  const studySecondsRemaining =
    useStageCountdown({
      durationSeconds: data.studyTime,
      active: stage === "study",
      onExpire: finishStudy
    });

  const retrievalSecondsRemaining =
    useStageCountdown({
      durationSeconds: data.retrievalTime,
      active: stage === "retrieval",
      onExpire: finishRetrieval
    });

  const currentQuestion =
    data
      .questions[questionIndex];

  function startExperiment() {

    startTimer();

    setStage("study");
  }

  function selectAnswer(
    questionId: string,
    option: string
  ) {

    setAnswers((prev) => ({
      ...prev,
      [questionId]: option
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

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB
          </p>

          <h2>
            {name}
          </h2>

          <p>
            You'll first study a small
            amount of information.
          </p>

          <p>
            Then we'll remove it and ask
            you to retrieve everything you
            can remember before taking a
            short test.
          </p>

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

      {stage === "study" && (
        <div>

          <p>
            STEP 1 · STUDY
          </p>

          <h2>
            {
              data
                .topic
            }
          </h2>

          <p>
            Read these facts carefully.
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

          {studySecondsRemaining !== null && (
            <p role="timer">
              Time remaining:{" "}
              {studySecondsRemaining}s
            </p>
          )}

          <button
            type="button"
            onClick={finishStudy}
          >
            I'm ready
          </button>

        </div>
      )}

      {stage === "retrieval" && (
        <div>

          <p>
            STEP 2 · RETRIEVE
          </p>

          <h2>
            Without looking back,
            write everything you
            remember.
          </h2>

          <TextResponse
            value={retrievalText}
            onChange={setRetrievalText}
            placeholder="Write what you remember..."
          />

          {retrievalSecondsRemaining !== null && (
            <p role="timer">
              Time remaining:{" "}
              {retrievalSecondsRemaining}s
            </p>
          )}

          <button
            type="button"
            disabled={
              retrievalText.trim()
                .length === 0
            }
            onClick={finishRetrieval}
          >
            Continue
          </button>

        </div>
      )}

      {stage === "test" && (
        <div>

          <p>
            STEP 3 · QUICK TEST
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

      {stage === "reflection" && (
        <div>

          <p>
            STEP 4 · REFLECT
          </p>

          <h2>
            How did {name}
            feel?
          </h2>

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

export default ActiveRecallExperiment;
