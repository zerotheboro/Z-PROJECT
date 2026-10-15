import {
  describe,
  expect,
  it
} from "vitest";

import {
  createAdaptiveDifficultyState,
  normalizeObjectivePerformance,
  optionsForDifficulty,
  recordAdaptivePerformance
} from "./adaptiveDifficulty";

import {
  scoreMultipleChoice
} from "./scoring";

import type {
  AdaptiveDifficultyState
} from "./adaptiveDifficulty";

function recordWindow(
  initial: AdaptiveDifficultyState,
  scores: readonly number[]
) {
  return scores.reduce(
    (state, score, index) =>
      recordAdaptivePerformance(
        state,
        `event-${index}`,
        { correct: score, total: 1 }
      ),
    initial
  );
}

describe("adaptive difficulty calculation", () => {
  it("starts new Training at medium", () => {
    expect(createAdaptiveDifficultyState())
      .toEqual({
        level: "medium",
        recentPerformance: [],
        processedEventIds: [],
        challengeLevels: {}
      });
  });

  it("moves medium to hard after three strong objective results", () => {
    const first = recordAdaptivePerformance(
      createAdaptiveDifficultyState(),
      "strong-1",
      { correct: 1, total: 1 }
    );
    const second = recordAdaptivePerformance(
      first,
      "strong-2",
      { correct: 1, total: 1 }
    );

    expect(first.level).toBe("medium");
    expect(second.level).toBe("medium");

    const third = recordAdaptivePerformance(
      second,
      "strong-3",
      { correct: 1, total: 1 }
    );

    expect(third.level).toBe("hard");
    expect(third.recentPerformance).toEqual([]);
  });

  it("keeps hard at its upper boundary after strong performance", () => {
    const state = {
      ...createAdaptiveDifficultyState(),
      level: "hard" as const
    };

    expect(recordWindow(state, [1, 1, 1]).level)
      .toBe("hard");
  });

  it("moves medium to easy after weak performance", () => {
    expect(recordWindow(
      createAdaptiveDifficultyState(),
      [0, 0, 1]
    ).level).toBe("easy");
  });

  it("keeps easy at its lower boundary after weak performance", () => {
    const state = {
      ...createAdaptiveDifficultyState(),
      level: "easy" as const
    };

    expect(recordWindow(state, [0, 0, 0]).level)
      .toBe("easy");
  });

  it("keeps the level after middle performance", () => {
    expect(recordWindow(
      createAdaptiveDifficultyState(),
      [1, 1, 0]
    ).level).toBe("medium");
  });

  it("normalizes objective result counts onto the existing 0..1 scale", () => {
    expect(normalizeObjectivePerformance({
      correct: 3,
      total: 4
    })).toBe(0.75);
    expect(normalizeObjectivePerformance({
      correct: 5,
      total: 4
    })).toBeNull();
  });

  it("does not apply the same committed event twice after Back or retry", () => {
    const once = recordAdaptivePerformance(
      createAdaptiveDifficultyState(),
      "lab:active-recall:set-1:q1",
      { correct: 1, total: 1 }
    );
    const repeated = recordAdaptivePerformance(
      once,
      "lab:active-recall:set-1:q1",
      { correct: 0, total: 1 }
    );

    expect(repeated).toBe(once);
    expect(repeated.recentPerformance)
      .toEqual([1]);
    expect(repeated.processedEventIds)
      .toEqual([
        "lab:active-recall:set-1:q1"
      ]);
  });

  it("uses only authored options and keeps the correct answer at every level", () => {
    const options = [
      "Distractor three",
      "Correct",
      "Distractor one",
      "Distractor two"
    ];

    expect(optionsForDifficulty(
      options,
      "Correct",
      "easy"
    )).toEqual([
      "Distractor three",
      "Correct"
    ]);
    expect(optionsForDifficulty(
      options,
      "Correct",
      "medium"
    )).toHaveLength(3);
    expect(optionsForDifficulty(
      options,
      "Correct",
      "hard"
    )).toEqual(options);
    expect(options).toHaveLength(4);
  });

  it("keeps score assembly independent from displayed difficulty", () => {
    const question = {
      id: "score-independence",
      question: "Choose the correct answer.",
      options: [
        "Correct",
        "Wrong one",
        "Wrong two",
        "Wrong three"
      ],
      correct: "Correct"
    };

    expect(optionsForDifficulty(
      question.options,
      question.correct,
      "easy"
    )).toHaveLength(2);
    expect(scoreMultipleChoice(
      [question],
      { [question.id]: "Correct" }
    )).toEqual({
      correct: 1,
      total: 1,
      score: 1
    });
  });
});
