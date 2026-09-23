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
  | "simplify"
  | "test"
  | "reflection";

type Props = LabEngineProps<ExplanationEngineData>;

function FeynmanExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("intro");

  const [
    explanation,
    setExplanation
  ] = useState("");

  const [
    simplifiedExplanation,
    setSimplifiedExplanation
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

  const [
    ease,
    setEase
  ] =
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
      data.questions.length - 1
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

    /*
      We aren't adding the written explanation
      to MethodExperimentResult yet.

      Later we'll expand the type so Firestore
      can save it and AI can analyse it.
    */

    console.log(
      "Feynman explanation:",
      explanation
    );

    console.log(
      "Simplified explanation:",
      simplifiedExplanation
    );

    onComplete(result);
  }

  return (
    <section className="method-experiment">

      {/* INTRO */}

      {stage === "intro" && (
        <div>

          <p>
            METHOD LAB · UNDERSTANDING
          </p>

          <h2>
            {name}
          </h2>

          <p>
            You'll learn a short concept,
            explain it in your own words,
            and then simplify your explanation.
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

      {/* STUDY */}

      {stage === "study" && (
        <div>

          <p>
            STEP 1 · LEARN
          </p>

          <h2>
            {data.topic}
          </h2>

          <StudyPanel>

            <p>
              {
                data
                  .explanation
              }
            </p>

          </StudyPanel>

          <button
            type="button"
            onClick={() =>
              setStage("explain")
            }
          >
            I'm ready
          </button>

        </div>
      )}

      {/* EXPLAIN */}

      {stage === "explain" && (
        <div>

          <p>
            STEP 2 · EXPLAIN
          </p>

          <h2>
            Explain the idea in your
            own words.
          </h2>

          <p>
            Imagine you're explaining
            it to someone who has never
            studied the topic.
          </p>

          <TextResponse
            value={explanation}
            onChange={setExplanation}
            placeholder="Explain the concept..."
          />

          <button
            type="button"
            disabled={
              explanation.trim().length < 20
            }
            onClick={() =>
              setStage("simplify")
            }
          >
            Continue
          </button>

        </div>
      )}

      {/* SIMPLIFY */}

      {stage === "simplify" && (
        <div>

          <p>
            STEP 3 · SIMPLIFY
          </p>

          <h2>
            Now make your explanation
            even simpler.
          </h2>

          <p>
            Try to explain it as if you
            were teaching a younger student.
          </p>

          <TextResponse
            value={
              simplifiedExplanation
            }
            onChange={setSimplifiedExplanation}
            placeholder="Explain it simply..."
          />

          <button
            type="button"
            disabled={
              simplifiedExplanation
                .trim().length < 15
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
            STEP 4 · UNDERSTANDING CHECK
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
            STEP 5 · REFLECT
          </p>

          <h2>
            How did the {name} feel?
          </h2>

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

export default FeynmanExperiment;
