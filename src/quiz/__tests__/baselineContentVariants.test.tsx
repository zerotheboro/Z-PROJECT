// @vitest-environment jsdom

import React from "react";

import {
  act,
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

import {
  baselineConceptContentSets,
  baselineMemoryContentSets
} from "../assessmentData";

import {
  selectBaselineContent
} from "../baselineContentSelector";

import BaselineChallenge
  from "../sections/BaselineChallenge";

import type {
  BaselineMemoryContentSet
} from "../assessmentData";

import type {
  MultipleChoiceQuestion
} from "../methodEngineTypes";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function randomValueForIndex(
  index: number,
  length: number
) {
  return (index + 0.5) / length;
}

function renderBaseline(
  memoryIndex: number,
  conceptIndex: number,
  onComplete = vi.fn()
) {
  const randomValues = [
    randomValueForIndex(
      memoryIndex,
      baselineMemoryContentSets.length
    ),
    randomValueForIndex(
      conceptIndex,
      baselineConceptContentSets.length
    )
  ];

  const random = vi.fn(
    () => randomValues.shift() ?? 0
  );

  render(
    <BaselineChallenge
      onComplete={onComplete}
      random={random}
    />
  );

  return {
    onComplete,
    random
  };
}

function startMemoryStudy() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Start challenge"
    })
  );
}

function startCurrentTest() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "I'm ready"
    })
  );
}

function answerQuestions(
  questions:
    readonly MultipleChoiceQuestion[],
  finishLabel: string
) {
  questions.forEach(
    (question, index) => {
      expect(
        screen.getByRole("heading", {
          name: question.question
        })
      ).toBeTruthy();

      fireEvent.click(
        screen.getByRole("button", {
          name: question.correct
        })
      );
      fireEvent.click(
        screen.getByRole("button", {
          name:
            index === questions.length - 1
              ? finishLabel
              : "Next question"
        })
      );
    }
  );
}

function chooseConfidence(
  value: number,
  continueLabel: string
) {
  fireEvent.click(
    screen.getByRole("button", {
      name: String(value)
    })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: continueLabel
    })
  );
}

function advanceToConceptStudy(
  memoryContent:
    BaselineMemoryContentSet
) {
  startMemoryStudy();
  startCurrentTest();
  answerQuestions(
    memoryContent.questions,
    "Finish memory test"
  );
  chooseConfidence(3, "Continue");
}

describe("Baseline content variants", () => {
  it("exposes exactly three valid sets for each Baseline mechanic", () => {
    expect(
      baselineMemoryContentSets
    ).toHaveLength(3);
    expect(
      baselineConceptContentSets
    ).toHaveLength(3);

    [
      ...baselineMemoryContentSets,
      ...baselineConceptContentSets
    ].forEach(content => {
      expect(
        content.questions.length
      ).toBeGreaterThan(0);

      content.questions.forEach(
        question => {
          expect(question.options).toContain(
            question.correct
          );
        }
      );
    });
  });

  it.each(
    baselineMemoryContentSets.map(
      (content, index) => ({
        content,
        index
      })
    )
  )(
    "selects and displays matching memory set $content.id",
    ({ content, index }) => {
      expect(
        selectBaselineContent(
          baselineMemoryContentSets,
          () =>
            randomValueForIndex(
              index,
              baselineMemoryContentSets.length
            )
        )
      ).toBe(content);

      renderBaseline(index, 0);
      startMemoryStudy();

      expect(
        screen.getByRole("heading", {
          name: content.title
        })
      ).toBeTruthy();
      content.facts.forEach(fact => {
        expect(
          screen.getByText(fact)
        ).toBeTruthy();
      });

      startCurrentTest();
      answerQuestions(
        content.questions,
        "Finish memory test"
      );
    }
  );

  it.each(
    baselineConceptContentSets.map(
      (content, index) => ({
        content,
        index
      })
    )
  )(
    "selects and displays matching concept set $content.id",
    ({ content, index }) => {
      expect(
        selectBaselineContent(
          baselineConceptContentSets,
          () =>
            randomValueForIndex(
              index,
              baselineConceptContentSets.length
            )
        )
      ).toBe(content);

      const memoryContent =
        baselineMemoryContentSets[0];

      renderBaseline(0, index);
      advanceToConceptStudy(memoryContent);

      expect(
        screen.getByRole("heading", {
          name: content.title
        })
      ).toBeTruthy();
      expect(
        document.querySelector(
          ".study-content p"
        )?.textContent
      ).toBe(content.explanation);

      startCurrentTest();
      answerQuestions(
        content.questions,
        "Finish understanding test"
      );
    }
  );

  it("keeps both selected sets stable across timer and answer rerenders", () => {
    vi.useFakeTimers();

    const {
      random
    } = renderBaseline(2, 1);
    const memoryContent =
      baselineMemoryContentSets[2];

    startMemoryStudy();

    expect(
      screen.getByRole("heading", {
        name: memoryContent.title
      })
    ).toBeTruthy();
    expect(random).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      screen.getByRole("heading", {
        name: memoryContent.title
      })
    ).toBeTruthy();
    expect(random).toHaveBeenCalledTimes(2);

    startCurrentTest();
    fireEvent.click(
      screen.getByRole("button", {
        name:
          memoryContent.questions[0]
            .options[1]
      })
    );

    expect(
      screen.getByRole("heading", {
        name:
          memoryContent.questions[0]
            .question
      })
    ).toBeTruthy();
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("preserves Baseline scoring for the selected memory and concept sets", () => {
    const onComplete = vi.fn();
    const memoryContent =
      baselineMemoryContentSets[1];
    const conceptContent =
      baselineConceptContentSets[2];

    renderBaseline(1, 2, onComplete);
    advanceToConceptStudy(memoryContent);
    startCurrentTest();
    answerQuestions(
      conceptContent.questions,
      "Finish understanding test"
    );
    chooseConfidence(
      5,
      "Continue to Method Lab"
    );

    expect(onComplete).toHaveBeenCalledTimes(1);

    const result =
      onComplete.mock.calls[0][0];

    expect(result.memory).toMatchObject({
      score: 1,
      correct: 4,
      total: 4,
      confidence: 3
    });
    expect(
      result.understanding
    ).toMatchObject({
      score: 1,
      correct: 3,
      total: 3,
      confidence: 5
    });
  });

  it("continues to use shared answer-option shuffling", () => {
    vi.spyOn(
      Math,
      "random"
    ).mockReturnValue(0);

    const memoryContent =
      baselineMemoryContentSets[0];

    renderBaseline(0, 0);
    startMemoryStudy();
    startCurrentTest();

    const displayedOptions = Array.from(
      document.querySelectorAll(
        ".baseline-test .option-grid button"
      )
    ).map(option => option.textContent);

    expect(
      memoryContent.questions[0]
        .options.indexOf(
          memoryContent.questions[0]
            .correct
        )
    ).toBe(0);
    expect(
      displayedOptions.indexOf(
        memoryContent.questions[0]
          .correct
      )
    ).toBe(3);
  });
});
