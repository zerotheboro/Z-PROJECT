import { useEffect, useRef } from "react";
import { useQuestionAdvance, useQuestionCompletionFeedback } from "../AssessmentQuestionUX";

import {
  useTrainingState as useState,
  useTrainingProgressCheckpoint
} from "../trainingProgressState";

import {
  trainingMemoryContentSets as baselineMemoryContentSets,
  trainingUnderstandingContentSets as baselineConceptContentSets
} from "../trainingContent";
import { isEconomicsContentId } from "../economics9708/selection";

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
  contentIds?: { memory: string | null; understanding: string | null };
  onContentSelected?: (content: {
    memory: string;
    understanding: string;
  }) => void;
};

type AnswerMap = Record<string, string>;

function BaselineChallenge({
  onComplete,
  random = Math.random,
  onContentSelected,
  contentIds
}: Props) {
  const questionCompleted = useQuestionCompletionFeedback();

  const [stage, setStage] =
    useState<BaselineStage>("intro");

  const [memoryContentId] = useState(
    () =>
      contentIds?.memory ?? selectBaselineContent(
        baselineMemoryContentSets.filter(content => !isEconomicsContentId(content.id)),
        random
      ).id
  );

  const [conceptContentId] = useState(
    () =>
      contentIds?.understanding ?? selectBaselineContent(
        baselineConceptContentSets.filter(content => !isEconomicsContentId(content.id)),
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

  const studyEntry = stage === "memory-study"
    ? `memory:${memoryContentId}`
    : stage === "concept-study"
      ? `understanding:${conceptContentId}`
      : null;
  const studyDuration = stage === "memory-study"
    ? memoryContent.studyTime
    : conceptContent.studyTime;
  const countdown = useRef<{ entry: string; deadline: number } | null>(null);
  const timerState = useRef({
    secondsLeft, memoryTimerRunning, conceptTimerRunning,
    startMemoryTimer, startConceptTimer, setSecondsLeft, setStage
  });
  timerState.current = {
    secondsLeft, memoryTimerRunning, conceptTimerRunning,
    startMemoryTimer, startConceptTimer, setSecondsLeft, setStage
  };

  // Keep the existing saved slots. A study entry's own elapsed timer tells us
  // whether its remainder belongs to this entry or the previous one.
  useEffect(() => {
    if (studyEntry === null) return;
    const current = timerState.current;
    const memoryStudy = studyEntry.startsWith("memory:");
    const started = memoryStudy ? current.memoryTimerRunning : current.conceptTimerRunning;
    const duration = started ? current.secondsLeft : studyDuration;
    const active = { entry: studyEntry, deadline: Date.now() + duration * 1000 };
    countdown.current = active;
    if (!started) {
      if (memoryStudy) current.startMemoryTimer();
      else current.startConceptTimer();
    }
    let expired = false;
    const update = () => {
      if (countdown.current !== active || expired) return;
      const remaining = Math.max(0, Math.ceil((active.deadline - Date.now()) / 1000));
      timerState.current.setSecondsLeft(remaining);
      if (remaining === 0) {
        expired = true;
        timerState.current.setStage(memoryStudy ? "memory-test" : "concept-test");
      }
    };
    update();
    if (expired) return () => { countdown.current = null; };
    const interval = window.setInterval(update, 250);
    const timeout = window.setTimeout(update, duration * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      if (countdown.current === active) countdown.current = null;
    };
  }, [studyEntry, studyDuration]);

  useTrainingProgressCheckpoint(() => {
    const active = countdown.current;
    if (active?.entry === studyEntry) {
      setSecondsLeft(Math.max(0, Math.ceil((active.deadline - Date.now()) / 1000)));
    }
  });

  
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
    questionCompleted("baseline:memory-confidence");

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
    questionCompleted("baseline:concept-confidence");

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

  const confidenceAdvance = useQuestionAdvance(`baseline:${stage}`, () => {
    if (stage === "memory-confidence" && memoryConfidence !== null) {
      finishMemoryBaseline();
      return true;
    }
    if (stage === "concept-confidence" && conceptConfidence !== null && memoryResult !== null) {
      finishConceptBaseline();
      return true;
    }
    return false;
  });

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
            Entry Test
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

          <div className="timer training-timer-value" role="timer" aria-label="Study time remaining">
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
            progress={{ questions: memoryContent.questions, answers: memoryAnswers, id: "memoryAnswers", label: "Section 2 — Memory check" }}
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
            onBack={() =>
              setMemoryQuestionIndex(previous =>
                Math.max(0, previous - 1)
              )
            }
            backDisabled={
              memoryQuestionIndex === 0
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
                  onClick={() => {
                    if (confidenceAdvance.blocked()) return;
                    setMemoryConfidence(value);
                    confidenceAdvance.schedule();
                  }}
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
            onClick={() => confidenceAdvance.completeNow()}
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

          <div className="timer training-timer-value" role="timer" aria-label="Study time remaining">
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
            progress={{ questions: conceptContent.questions, answers: conceptAnswers, id: "conceptAnswers", label: "Section 2 — Understanding check" }}
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
            onBack={() =>
              setConceptQuestionIndex(previous =>
                Math.max(0, previous - 1)
              )
            }
            backDisabled={
              conceptQuestionIndex === 0
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
                  onClick={() => {
                    if (confidenceAdvance.blocked()) return;
                    setConceptConfidence(value);
                    confidenceAdvance.schedule();
                  }}
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
            onClick={() => confidenceAdvance.completeNow()}
          >
            Continue to Method Lab
          </button>

        </div>
      )}

    </section>
  );
}

export default BaselineChallenge;
