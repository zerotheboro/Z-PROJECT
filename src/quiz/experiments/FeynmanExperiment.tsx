import {
  useRef,
  useState
} from "react";

import {
  feynmanExperiment
} from "../methodLabData";

import type {
  MethodExperimentResult
} from "../type";

type Stage =
  | "intro"
  | "study"
  | "explain"
  | "simplify"
  | "test"
  | "reflection";

type Props = {
  onComplete: (
    result: MethodExperimentResult
  ) => void;
};

function FeynmanExperiment({
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

  const experimentStart =
    useRef<number | null>(null);

  const currentQuestion =
    feynmanExperiment
      .questions[questionIndex];

  function startExperiment() {

    experimentStart.current =
      Date.now();

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
      feynmanExperiment.questions.length - 1
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

    let correct = 0;

    feynmanExperiment
      .questions
      .forEach((question) => {

        if (
          answers[question.id] ===
          question.correct
        ) {
          correct += 1;
        }

      });

    const total =
      feynmanExperiment.questions.length;

    const result:
      MethodExperimentResult = {

      method: "feynman",

      category: "understanding",

      correct,

      total,

      score:
        total === 0
          ? 0
          : correct / total,

      confidence,

      ease,

      willingnessToUse,

      timeSpentMs:
        experimentStart.current
          ? Date.now() -
            experimentStart.current
          : 0
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
            Feynman Technique
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
            {feynmanExperiment.topic}
          </h2>

          <div className="study-content">

            <p>
              {
                feynmanExperiment
                  .explanation
              }
            </p>

          </div>

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

          <textarea
            value={explanation}
            onChange={(event) =>
              setExplanation(
                event.target.value
              )
            }
            placeholder="Explain the concept..."
          />

          <button
            type="button"
            disabled={
              explanation.trim().length <
              20
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

          <textarea
            value={
              simplifiedExplanation
            }
            onChange={(event) =>
              setSimplifiedExplanation(
                event.target.value
              )
            }
            placeholder="Explain it simply..."
          />

          <button
            type="button"
            disabled={
              simplifiedExplanation
                .trim()
                .length < 15
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
              feynmanExperiment
                .questions.length
            }
          </p>

          <h2>
            {
              currentQuestion
                .question
            }
          </h2>

          <div className="option-grid">

            {
              currentQuestion
                .options
                .map((option) => {

                  const selected =
                    answers[
                      currentQuestion.id
                    ] === option;

                  return (
                    <button
                      type="button"
                      key={option}
                      className={
                        selected
                          ? "assessment-option selected"
                          : "assessment-option"
                      }
                      onClick={() =>
                        selectAnswer(
                          currentQuestion.id,
                          option
                        )
                      }
                    >
                      {option}
                    </button>
                  );
                })
            }

          </div>

          <button
            type="button"
            disabled={
              !answers[
                currentQuestion.id
              ]
            }
            onClick={
              nextQuestion
            }
          >
            {questionIndex ===
            feynmanExperiment
              .questions.length -
              1
              ? "Finish test"
              : "Next question"}
          </button>

        </div>
      )}

      {/* REFLECTION */}

      {stage === "reflection" && (
        <div>

          <p>
            STEP 5 · REFLECT
          </p>

          <h2>
            How did the Feynman
            Technique feel?
          </h2>

          <h3>
            How confident are you that
            you understood the concept?
          </h3>

          <div>
            {[1, 2, 3, 4, 5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    confidence === value
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setConfidence(value)
                  }
                >
                  {value}
                </button>
              )
            )}
          </div>

          <h3>
            How easy was this method
            to use?
          </h3>

          <div>
            {[1, 2, 3, 4, 5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    ease === value
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setEase(value)
                  }
                >
                  {value}
                </button>
              )
            )}
          </div>

          <h3>
            Would you use this while
            studying?
          </h3>

          <div>
            {[1, 2, 3, 4, 5].map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    willingnessToUse ===
                    value
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setWillingnessToUse(
                      value
                    )
                  }
                >
                  {value}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            disabled={
              confidence === null ||
              ease === null ||
              willingnessToUse ===
                null
            }
            onClick={
              finishExperiment
            }
          >
            Complete experiment
          </button>

        </div>
      )}

    </section>
  );
}

export default FeynmanExperiment;