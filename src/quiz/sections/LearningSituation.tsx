import { useState } from "react";

import {
  learningSituationQuestions
} from "../assessmentData";

import type {
  LearningSituation as LearningSituationData
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

  const currentValue =
    answers[
      question.id as keyof LearningSituationData
    ];

  function handleSingle(value: string) {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value
    }));
  }

  function handleMulti(
    value: string,
    maxSelections: number
  ) {
    const key =
      question.id as
        | "difficulties"
        | "contentTypes";

    setAnswers((prev) => {
      const selected = prev[key];

      if (selected.includes(value)) {
        return {
          ...prev,
          [key]: selected.filter(
            (item) => item !== value
          )
        };
      }

      if (
        selected.length >= maxSelections
      ) {
        return prev;
      }

      return {
        ...prev,
        [key]: [
          ...selected,
          value
        ]
      };
    });
  }

  function isSelected(value: string) {
    if (Array.isArray(currentValue)) {
      return currentValue.includes(value);
    }

    return currentValue === value;
  }

  function hasAnswer() {
    if (Array.isArray(currentValue)) {
      return currentValue.length > 0;
    }

    return currentValue !== null;
  }

  function nextQuestion() {
    if (!hasAnswer()) return;

    if (
      currentIndex <
      learningSituationQuestions.length - 1
    ) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    onComplete(answers);
  }

  function previousQuestion() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  return (
    <section className="learning-situation">

      <div className="assessment-progress">

        <span>
          Section 1 of_
        </span>

        <span>
          {currentIndex + 1}/
          {learningSituationQuestions.length}
        </span>

      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width:
              `${
                ((currentIndex + 1) /
                  learningSituationQuestions.length)
                * 100
              }%`
          }}
        />
      </div>

      <div className="question-area">

        <p className="section-label">
          YOUR LEARNING SITUATION
        </p>

        <h2>
          {question.question}
        </h2>

        {question.type === "multi" && (
          <p className="selection-note">
            Choose up to{" "}
            {question.maxSelections}
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
          onClick={nextQuestion}
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