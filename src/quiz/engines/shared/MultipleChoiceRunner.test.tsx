// @vitest-environment jsdom

import React, {
  useState
} from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";

import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import MultipleChoiceRunner
  from "./MultipleChoiceRunner";

import {
  scoreMultipleChoice
} from "./scoring";

import {
  shuffleOptions
} from "./shuffleOptions";

import type {
  MultipleChoiceQuestion
} from "../../methodEngineTypes";

import {
  activeRecallExperiment
} from "../../methodLabData";

import {
  activeRecallMatchData
} from "../../methodMatchData";

const question = {
  id: "shuffle-test",
  question: "Which answer is correct?",
  options: [
    "Correct answer",
    "Distractor one",
    "Distractor two",
    "Distractor three"
  ],
  correct: "Correct answer"
} as const satisfies MultipleChoiceQuestion;

const keepOrder = () => 0.999;
const reverseOrder = () => 0;

const secondQuestion = {
  ...question,
  id: "shuffle-test-two",
  question: "Where does the correct answer move?"
} as const satisfies MultipleChoiceQuestion;

afterEach(() => {
  cleanup();
});

function renderedOptionOrder() {
  return Array.from(
    document.querySelectorAll(
      ".option-grid button"
    )
  ).map(option => option.textContent);
}

function RunnerHarness({
  random,
  onFinish = () => undefined
}: {
  random: () => number;
  onFinish?: (
    selectedAnswer: string
  ) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] =
    useState<string>();

  return (
    <MultipleChoiceRunner
      question={question}
      selectedAnswer={selectedAnswer}
      onSelect={setSelectedAnswer}
      onNext={() => {
        if (selectedAnswer) {
          onFinish(selectedAnswer);
        }
      }}
      nextLabel="Finish"
      random={random}
    />
  );
}

function QuestionSequenceHarness({
  random
}: {
  random: () => number;
}) {
  const questions = [
    question,
    secondQuestion
  ];

  const [questionIndex, setQuestionIndex] =
    useState(0);
  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const currentQuestion =
    questions[questionIndex];

  return (
    <MultipleChoiceRunner
      question={currentQuestion}
      selectedAnswer={
        answers[currentQuestion.id]
      }
      onSelect={option =>
        setAnswers(previous => ({
          ...previous,
          [currentQuestion.id]: option
        }))
      }
      onNext={() =>
        setQuestionIndex(previous =>
          previous + 1
        )
      }
      nextLabel="Next question"
      random={random}
    />
  );
}

describe("multiple-choice option shuffling", () => {
  it("preserves correct-answer identity while moving it to different indices", () => {
    const firstPosition =
      shuffleOptions(
        question.options,
        keepOrder
      ).indexOf(question.correct);

    const lastPosition =
      shuffleOptions(
        question.options,
        reverseOrder
      ).indexOf(question.correct);

    expect(firstPosition).toBe(0);
    expect(lastPosition).toBe(3);
    expect(
      shuffleOptions(
        question.options,
        reverseOrder
      )
    ).toContain(question.correct);
  });

  it("keeps scoring based on answer identity after shuffling", () => {
    const onScore = vi.fn();

    render(
      <RunnerHarness
        random={reverseOrder}
        onFinish={selectedAnswer =>
          onScore(
            scoreMultipleChoice(
              [question],
              {
                [question.id]:
                  selectedAnswer
              }
            )
          )
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: question.correct
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Finish"
      })
    );

    expect(onScore).toHaveBeenCalledWith({
      correct: 1,
      total: 1,
      score: 1
    });
  });

  it("scores a shuffled incorrect answer as incorrect", () => {
    const onScore = vi.fn();

    render(
      <RunnerHarness
        random={reverseOrder}
        onFinish={selectedAnswer =>
          onScore(
            scoreMultipleChoice(
              [question],
              {
                [question.id]:
                  selectedAnswer
              }
            )
          )
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Distractor two"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Finish"
      })
    );

    expect(onScore).toHaveBeenCalledWith({
      correct: 0,
      total: 1,
      score: 0
    });
  });

  it("keeps option positions stable while answering one question", () => {
    const random = vi.fn(reverseOrder);

    render(
      <RunnerHarness random={random} />
    );

    const initialOrder =
      renderedOptionOrder();
    const initialRandomCalls =
      random.mock.calls.length;

    fireEvent.click(
      screen.getByRole("button", {
        name: "Distractor one"
      })
    );

    expect(renderedOptionOrder()).toEqual(
      initialOrder
    );
    expect(random).toHaveBeenCalledTimes(
      initialRandomCalls
    );
  });

  it("does not mutate the source option array", () => {
    const originalOptions =
      [...question.options];

    shuffleOptions(
      question.options,
      reverseOrder
    );

    expect(question.options).toEqual(
      originalOptions
    );
  });

  it("creates and retains an independent order for the next question", () => {
    const randomValues = [
      0.999,
      0.999,
      0.999,
      0,
      0,
      0
    ];
    const random = vi.fn(
      () => randomValues.shift() ?? 0
    );

    render(
      <QuestionSequenceHarness
        random={random}
      />
    );

    const firstOrder =
      renderedOptionOrder();

    fireEvent.click(
      screen.getByRole("button", {
        name: question.correct
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Next question"
      })
    );

    const secondOrder =
      renderedOptionOrder();
    const authoredCorrectIndex =
      secondQuestion.options.indexOf(
        secondQuestion.correct
      );
    const displayedCorrectIndex =
      secondOrder.indexOf(
        secondQuestion.correct
      );

    expect(firstOrder).toEqual([
      ...question.options
    ]);
    expect(secondOrder).not.toEqual(
      firstOrder
    );
    expect(authoredCorrectIndex).toBe(0);
    expect(displayedCorrectIndex).toBe(3);
    expect(random).toHaveBeenCalledTimes(6);
  });

  it("keeps existing Lab and Match score assembly unchanged", () => {
    const labAnswers = Object.fromEntries(
      activeRecallExperiment.questions.map(
        item => [item.id, item.correct]
      )
    );
    const matchAnswers = Object.fromEntries(
      activeRecallMatchData.questions.map(
        item => [item.id, item.correct]
      )
    );

    expect(
      scoreMultipleChoice(
        activeRecallExperiment.questions,
        labAnswers
      )
    ).toEqual({
      correct:
        activeRecallExperiment
          .questions.length,
      total:
        activeRecallExperiment
          .questions.length,
      score: 1
    });

    expect(
      scoreMultipleChoice(
        activeRecallMatchData.questions,
        matchAnswers
      )
    ).toEqual({
      correct:
        activeRecallMatchData
          .questions.length,
      total:
        activeRecallMatchData
          .questions.length,
      score: 1
    });
  });
});
