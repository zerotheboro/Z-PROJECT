import { useEffect, useRef } from "react";
import {
  useTrainingState as useState
} from "../trainingProgressState";
import { AssessmentSectionProgress, useQuestionAdvance, useQuestionUXRecord } from "../AssessmentQuestionUX";

import {
  learningSituationQuestions
} from "../assessmentData";

import type {
  LearningSituation as LearningSituationData,
  LearningSituationQuestion
} from "../type";

type Props = {
  onComplete: (
    result: LearningSituationData
  ) => void;
};

const initialAnswers: LearningSituationData = {
  goal: null,
  difficulties: [],
  contentTypes: [],
  currentApproach: null,
  sessionLength: null,
  learningContext: null
};

function LearningSituation({
  onComplete
}: Props) {

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [answers, setAnswers] =
    useState<LearningSituationData>(
      initialAnswers
    );

  const question =
    learningSituationQuestions[currentIndex];
  const confirmed = useQuestionUXRecord<string[]>("confirmed-multi-select");
  const initialIndex = useRef(currentIndex);
  function validAnswer(item: LearningSituationQuestion) {
    const value = answers[item.id as keyof LearningSituationData];
    return item.type === "single"
      ? typeof value === "string" && item.options.some(option => option.value === value)
      : Array.isArray(value) && value.length > 0 && value.length <= item.maxSelections
        && value.every(answer => item.options.some(option => option.value === answer));
  }
  // Legacy drafts reached earlier multi-selects only through their Continue action.
  // The optional display cache is separate from the strictly validated draft.
  useEffect(() => {
    learningSituationQuestions.forEach((item, index) => {
      if (item.type === "multi" && index < initialIndex.current && validAnswer(item) && confirmed.get(item.id) === undefined) {
        confirmed.set(item.id, [...answers[item.id as "difficulties" | "contentTypes"]]);
      }
    });
  });
  const completedCount = learningSituationQuestions.filter((item, index) => {
    if (!validAnswer(item)) return false;
    if (item.type === "single") return true;
    const stored = confirmed.get(item.id);
    const value = answers[item.id as "difficulties" | "contentTypes"];
    return Array.isArray(stored) ? stored.length === value.length && value.every(answer => stored.includes(answer))
      : index < initialIndex.current;
  }).length;
  const navigation = useQuestionAdvance(question.id, nextQuestion);

  const currentValue =
    answers[
      question.id as keyof LearningSituationData
    ];

  function handleSingle(value: string) {
    if (navigation.blocked()) return;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value
    }));
    navigation.schedule();
  }

  function handleMulti(
    value: string,
    maxSelections: number
  ) {
    if (navigation.blocked()) return;
    const key =
      question.id as
        | "difficulties"
        | "contentTypes";

    const selected = answers[key];
    const removing = selected.includes(value);
    if (!removing && selected.length >= maxSelections) return;

    // Only this fresh interaction can start a transition. Restored answers and
    // renders never schedule one; reducing the selection cancels a pending one.
    navigation.cancel();
    const next = removing
      ? selected.filter(item => item !== value)
      : [...selected, value];
    setAnswers(prev => ({ ...prev, [key]: next }));
    if (!removing && next.length === maxSelections) navigation.schedule();
  }

  function isSelected(value: string) {
    if (Array.isArray(currentValue)) {
      return currentValue.includes(value);
    }

    return currentValue === value;
  }

  function hasAnswer() {
    return validAnswer(question);
  }

  function nextQuestion() {
    if (!hasAnswer()) return false;
    if (question.type === "multi" && Array.isArray(currentValue)) confirmed.set(question.id, [...currentValue]);

    if (
      currentIndex <
      learningSituationQuestions.length - 1
    ) {
      setCurrentIndex((prev) => prev + 1);
      return true;
    }

    onComplete(answers);
    return true;
  }

  function previousQuestion() {
    navigation.cancel();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  return (
    <section className="learning-situation">

      <AssessmentSectionProgress label="Section 1 — Your learning situation" completed={completedCount} total={learningSituationQuestions.length} />
      <p>Question {currentIndex + 1} of {learningSituationQuestions.length}</p>

      <div className="question-area">

        <p className="section-label">
          YOUR LEARNING SITUATION
        </p>

        <h2 aria-live="polite">
          {question.question}
        </h2>

        {question.type === "multi" && (
          <p className="selection-note">
            <strong>Choose up to{" "}{question.maxSelections}</strong>
          </p>
        )}

        <div className="option-grid">

          {question.options.map(
            (option) => {

              const selected =
                isSelected(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  className={
                    selected
                      ? "assessment-option selected"
                      : "assessment-option"
                  }
                  onClick={() => {

                    if (
                      question.type ===
                      "single"
                    ) {
                      handleSingle(
                        option.value
                      );
                    } else {
                      handleMulti(
                        option.value,
                        question.maxSelections
                      );
                    }

                  }}
                >
                  {option.label}
                </button>
              );
            }
          )}

        </div>

      </div>

      <div className="assessment-navigation">

        <button
          type="button"
          onClick={previousQuestion}
          disabled={currentIndex === 0}
        >
          Back
        </button>

        <button
          type="button"
          onClick={event => { if (event.detail < 2) navigation.completeNow(); }}
          disabled={!hasAnswer()}
        >
          {currentIndex ===
          learningSituationQuestions.length -
            1
            ? "Continue to Baseline"
            : "Continue"}
        </button>

      </div>

    </section>
  );
}

export default LearningSituation;
