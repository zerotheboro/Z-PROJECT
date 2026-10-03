import { useEffect } from "react";

import {
  useTrainingState as useState
} from "../trainingProgressState";

import {
  baselineMemoryContentSets,
  baselineConceptContentSets
} from "../assessmentData";

import {
  selectBaselineContent
} from "../baselineContentSelector";

import type {
  ContentRandomSource
} from "../baselineContentSelector";

import {
  MultipleChoiceRunner,
  useExperimentTimer
} from "../engines/shared";

import type {
  BaselineResult,
  BaselineTaskResult
} from "../type";

type BaselineStage =
  | "intro"
  | "memory-study"
  | "memory-test"
  | "memory-confidence"
  | "concept-study"
  | "concept-test"
  | "concept-confidence";

type Props = {
  onComplete: (result: BaselineResult) => void;
  random?: ContentRandomSource;
  onContentSelected?: (content: {
    memory: string;
    understanding: string;
  }) => void;
};

type AnswerMap = Record<string, string>;

function BaselineChallenge({
  onComplete,
  random = Math.random,
  onContentSelected
}: Props) {

  const [stage, setStage] =
    useState<BaselineStage>("intro");

  const [memoryContentId] = useState(
    () =>
      selectBaselineContent(
        baselineMemoryContentSets,
        random
      ).id
  );

  const [conceptContentId] = useState(
    () =>
      selectBaselineContent(
        baselineConceptContentSets,
        random
      ).id
  );

  const memoryContent =
    baselineMemoryContentSets.find(
      content => content.id === memoryContentId
    ) ?? baselineMemoryContentSets[0];

  const conceptContent =
    baselineConceptContentSets.find(
      content => content.id === conceptContentId
    ) ?? baselineConceptContentSets[0];

  useEffect(() => {
    onContentSelected?.({
      memory: memoryContentId,
      understanding: conceptContentId
    });
  }, [
    conceptContentId,
    memoryContentId,
    onContentSelected
  ]);

  // -------------------------
  // MEMORY
  // -------------------------

  const [memoryAnswers, setMemoryAnswers] =
    useState<AnswerMap>({});

  const [memoryQuestionIndex, setMemoryQuestionIndex] =
    useState(0);

  const [memoryConfidence, setMemoryConfidence] =
    useState<number | null>(null);

  const [memoryResult, setMemoryResult] =
    useState<BaselineTaskResult | null>(null);

  // -------------------------
  // CONCEPT
  // -------------------------

  const [conceptAnswers, setConceptAnswers] =
    useState<AnswerMap>({});

  const [conceptQuestionIndex, setConceptQuestionIndex] =
    useState(0);

  const [conceptConfidence, setConceptConfidence] =
    useState<number | null>(null);

  // -------------------------
  // TIMER
  // -------------------------

  const [secondsLeft, setSecondsLeft] =
    useState(0);

  const {
    start: startMemoryTimer,
    elapsedMs: memoryElapsedMs,
    isRunning: memoryTimerRunning
  } = useExperimentTimer();
  const {
    start: startConceptTimer,
    elapsedMs: conceptElapsedMs,
    isRunning: conceptTimerRunning
  } = useExperimentTimer();

  // Whenever a study stage begins,
  // configure its countdown.

  useEffect(() => {
  if (
    stage !== "memory-study" &&
    stage !== "concept-study"
  ) {
    return;
  }

  const studyTime =
    stage === "memory-study"
      ? memoryContent.studyTime
      : conceptContent.studyTime;

  setSecondsLeft(previous =>
    previous > 0 ? previous : studyTime
  );

  if (
    stage === "memory-study" &&
    !memoryTimerRunning
  ) {
    startMemoryTimer();
  }

  if (
    stage === "concept-study" &&
    !conceptTimerRunning
  ) {
    startConceptTimer();
  }

  const timer = window.setInterval(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        window.clearInterval(timer);

        if (stage === "memory-study") {
          setStage("memory-test");
        } else {
          setStage("concept-test");
        }

        return 0;
      }

      return prev - 1;
    });
  }, 1000);

  return () => {
    window.clearInterval(timer);
  };
}, [
  stage,
  memoryContent.studyTime,
  conceptContent.studyTime,
  memoryTimerRunning,
  conceptTimerRunning,
  startMemoryTimer,
  startConceptTimer
]);

  
  // -------------------------
  // HELPERS
  // -------------------------

  function calculateScore(
    questions: readonly {
      id: string;
      correct: string;
    }[],
    answers: AnswerMap
  ) {

    let correct = 0;

    questions.forEach((question) => {
      if (
        answers[question.id] ===
        question.correct
      ) {
        correct += 1;
      }
    });

    return {
      correct,
      total: questions.length,
      score:
        questions.length === 0
          ? 0
          : correct / questions.length
    };
  }

  // -------------------------
  // MEMORY
  // -------------------------

  function selectMemoryAnswer(
    questionId: string,
    answer: string
  ) {
    setMemoryAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  }

  function nextMemoryQuestion() {

    if (
      memoryQuestionIndex <
      memoryContent.questions.length - 1
    ) {
      setMemoryQuestionIndex(
        (prev) => prev + 1
      );

      return;
    }

    setStage("memory-confidence");
  }

  function finishMemoryBaseline() {

    if (memoryConfidence === null) {
      return;
    }

    const scored =
      calculateScore(
        memoryContent.questions,
        memoryAnswers
      );

    const result:
      BaselineTaskResult = {

      score: scored.score,
      correct: scored.correct,
      total: scored.total,
      confidence: memoryConfidence,
      timeSpentMs: memoryElapsedMs()
    };

    setMemoryResult(result);

    setStage("concept-study");
  }

  // -------------------------
  // CONCEPT
  // -------------------------

  function selectConceptAnswer(
    questionId: string,
    answer: string
  ) {
    setConceptAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  }

  function nextConceptQuestion() {

    if (
      conceptQuestionIndex <
      conceptContent.questions.length - 1
    ) {

      setConceptQuestionIndex(
        (prev) => prev + 1
      );

      return;
    }

    setStage("concept-confidence");
  }

  function finishConceptBaseline() {

    if (
      conceptConfidence === null ||
      memoryResult === null
    ) {
      return;
    }

    const scored =
      calculateScore(
        conceptContent.questions,
        conceptAnswers
      );

    const conceptResult:
      BaselineTaskResult = {

      score: scored.score,
      correct: scored.correct,
      total: scored.total,
      confidence:
        conceptConfidence,
      timeSpentMs:
        conceptElapsedMs()
    };

    const result: BaselineResult = {
      memory: memoryResult,
      understanding:
        conceptResult
    };

    console.log(
      "FULL BASELINE:",
      result
    );

    onComplete(result);
  }

  // -------------------------
  // CURRENT QUESTIONS
  // -------------------------

  const currentMemoryQuestion =
    memoryContent.questions[
      memoryQuestionIndex
    ];

  const currentConceptQuestion =
    conceptContent.questions[
      conceptQuestionIndex
    ];

  // =========================
  // UI
  // =========================

  return (
    <section className="baseline-challenge">

      {/* INTRO */}

      {stage === "intro" && (
        <div className="baseline-intro">

          <p className="section-label">
            SECTION 2 OF 6
          </p>

          <h2>
            Baseline Challenge
          </h2>

          <p>
            Before Edulience shows you any
            learning methods, we want to see
            how you naturally learn.
          </p>

          <p>
            Don't intentionally use a special
            technique. Just learn the material
            the way you normally would.
          </p>

          <button
            type="button"
            onClick={() => 
              setStage("memory-study")
            }
          >
            Start challenge
          </button>

        </div>
      )}

      {/* ===================== */}
      {/* MEMORY STUDY */}
      {/* ===================== */}

      {stage === "memory-study" && (
        <div className="baseline-study">

          <p className="section-label">
            BASELINE 1 / 2 · MEMORY
          </p>

          <div className="timer">
            {secondsLeft}s
          </div>

          <h2>
            {memoryContent.title}
          </h2>

          <p>
            Study these facts naturally.
          </p>
          

          <div className="study-content">

            {memoryContent.facts.map(
              (fact, index) => (
                <p key={index}>
                  {fact}
                </p>
              )
            )}

          </div>

          <button
            type="button"
            onClick={() =>{
              setStage("memory-test")
              console.log(stage)
            }}
          >
            I'm ready
          </button>

        </div>
      )}

      {/* ===================== */}
      {/* MEMORY TEST */}
      {/* ===================== */}

      {stage === "memory-test" && (
        <div className="baseline-test">

          <p className="section-label">
            MEMORY CHECK
          </p>

          <p>
            Question{" "}
            {memoryQuestionIndex + 1}
            {" / "}
            {
              memoryContent
                .questions.length
            }
          </p>

          <MultipleChoiceRunner
            question={currentMemoryQuestion}
            selectedAnswer={
              memoryAnswers[
                currentMemoryQuestion.id
              ]
            }
            onSelect={option =>
              selectMemoryAnswer(
                currentMemoryQuestion.id,
                option
              )
            }
            onNext={nextMemoryQuestion}
            nextLabel={
              memoryQuestionIndex ===
              memoryContent
                .questions.length - 1
                ? "Finish memory test"
                : "Next question"
            }
          />

        </div>
      )}

      {/* ===================== */}
      {/* MEMORY CONFIDENCE */}
      {/* ===================== */}

      {stage ===
        "memory-confidence" && (
        <div className="confidence-stage">

          <p className="section-label">
            QUICK REFLECTION
          </p>

          <h2>
            How confident are you that
            you remembered the information
            accurately?
          </h2>

          <div className="confidence-scale">

            {[1, 2, 3, 4, 5].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    memoryConfidence ===
                    value
                      ? "confidence selected"
                      : "confidence"
                  }
                  onClick={() =>
                    setMemoryConfidence(
                      value
                    )
                  }
                >
                  {value}
                </button>
              )
            )}

          </div>

          <div className="scale-labels">
            <span>Not confident</span>
            <span>Very confident</span>
          </div>

          <button
            type="button"
            disabled={
              memoryConfidence === null
            }
            onClick={
              finishMemoryBaseline
            }
          >
            Continue
          </button>

        </div>
      )}

      {/* ===================== */}
      {/* CONCEPT STUDY */}
      {/* ===================== */}

      {stage === "concept-study" && (
        <div className="baseline-study">

          <p className="section-label">
            BASELINE 2 / 2 · UNDERSTANDING
          </p>

          <div className="timer">
            {secondsLeft}s
          </div>

          <h2>
            {
              conceptContent
                .title
            }
          </h2>

          <p>
            Read and understand the idea
            naturally.
          </p>

          <div className="study-content">

            <p>
              {
                conceptContent
                  .explanation
              }
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setStage("concept-test")
            }
          >
            I'm ready
          </button>

        </div>
      )}

      {/* ===================== */}
      {/* CONCEPT TEST */}
      {/* ===================== */}

      {stage === "concept-test" && (
        <div className="baseline-test">

          <p className="section-label">
            UNDERSTANDING CHECK
          </p>

          <p>
            Question{" "}
            {conceptQuestionIndex + 1}
            {" / "}
            {
              conceptContent
                .questions.length
            }
          </p>

          <MultipleChoiceRunner
            question={currentConceptQuestion}
            selectedAnswer={
              conceptAnswers[
                currentConceptQuestion.id
              ]
            }
            onSelect={option =>
              selectConceptAnswer(
                currentConceptQuestion.id,
                option
              )
            }
            onNext={nextConceptQuestion}
            nextLabel={
              conceptQuestionIndex ===
              conceptContent
                .questions.length - 1
                ? "Finish understanding test"
                : "Next question"
            }
          />

        </div>
      )}

      {/* ===================== */}
      {/* CONCEPT CONFIDENCE */}
      {/* ===================== */}

      {stage ===
        "concept-confidence" && (
        <div className="confidence-stage">

          <p className="section-label">
            QUICK REFLECTION
          </p>

          <h2>
            How confident are you that
            you understood the idea?
          </h2>

          <div className="confidence-scale">

            {[1, 2, 3, 4, 5].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    conceptConfidence ===
                    value
                      ? "confidence selected"
                      : "confidence"
                  }
                  onClick={() =>
                    setConceptConfidence(
                      value
                    )
                  }
                >
                  {value}
                </button>
              )
            )}

          </div>

          <div className="scale-labels">
            <span>Not confident</span>
            <span>Very confident</span>
          </div>

          <button
            type="button"
            disabled={
              conceptConfidence === null
            }
            onClick={
              finishConceptBaseline
            }
          >
            Continue to Method Lab
          </button>

        </div>
      )}

    </section>
  );
}

export default BaselineChallenge;
