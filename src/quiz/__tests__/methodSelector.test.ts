import {
  describe,
  expect,
  it
} from "vitest";

import {
  matchesSelectionSignal,
  methodDefinitions
} from "../methodRegistry";

import type {
  BaselineResult,
  LearningSituation,
  TrainingMethodId
} from "../type";

const methods = [
  "active-recall",
  "feynman",
  "cornell",
  "interleaving",
  "memory-palace"
] as const satisfies readonly TrainingMethodId[];

function selectExistingMethods(
  situation: LearningSituation,
  currentBaseline: BaselineResult
): TrainingMethodId[] {
  return methodDefinitions
    .filter((definition) =>
      methods.includes(
        definition.id as (typeof methods)[number]
      )
    )
    .map((definition) => {
      const matchingSignals =
        definition.selectionSignals.filter(
          (signal) =>
            matchesSelectionSignal(
              signal,
              situation,
              currentBaseline
            )
        );

      return {
        method: definition.id,
        score:
          definition.defaultSelectionWeight +
          matchingSignals.reduce(
            (score, signal) =>
              score + signal.weight,
            0
          ),
        firstSelectionOrder:
          matchingSignals.reduce(
            (order, signal) =>
              Math.min(
                order,
                signal.selectionOrder
              ),
            definition.defaultSelectionOrder
          )
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.firstSelectionOrder -
          b.firstSelectionOrder
    )
    .slice(0, 4)
    .map(({ method }) => method);
}

function legacySelectMethods(
  situation: LearningSituation,
  baseline: BaselineResult
): TrainingMethodId[] {
  const scores = new Map<
    TrainingMethodId,
    number
  >();

  const add = (
    method: TrainingMethodId,
    score: number
  ) => {
    scores.set(
      method,
      (scores.get(method) ?? 0) + score
    );
  };

  if (situation.difficulties.includes("forgetting")) {
    add("active-recall", 5);
    add("memory-palace", 4);
  }

  if (situation.difficulties.includes("understanding")) {
    add("feynman", 5);
    add("cornell", 2);
  }

  if (situation.difficulties.includes("prioritization")) {
    add("cornell", 5);
  }

  if (situation.difficulties.includes("application")) {
    add("interleaving", 5);
  }

  if (situation.contentTypes.includes("facts")) {
    add("active-recall", 4);
    add("memory-palace", 3);
  }

  if (situation.contentTypes.includes("concepts")) {
    add("feynman", 4);
  }

  if (situation.contentTypes.includes("reading")) {
    add("cornell", 4);
  }

  if (situation.contentTypes.includes("problems")) {
    add("interleaving", 5);
  }

  if (situation.contentTypes.includes("essays")) {
    add("cornell", 3);
    add("feynman", 2);
  }

  if (baseline.memory.score < 0.7) {
    add("active-recall", 4);
    add("memory-palace", 3);
  }

  if (baseline.understanding.score < 0.7) {
    add("feynman", 4);
    add("cornell", 2);
  }

  methods.forEach((method) => add(method, 1));

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([method]) => method);
}

function selectionsFromMask(
  values: readonly string[],
  mask: number
) {
  return values.filter(
    (_, index) =>
      (mask & (1 << index)) !== 0
  );
}

function baseline(
  memoryLow: boolean,
  understandingLow: boolean
): BaselineResult {
  const task = (score: number) => ({
    score,
    correct: score < 0.7 ? 1 : 4,
    total: 4,
    confidence: 3,
    timeSpentMs: 1000
  });

  return {
    memory: task(memoryLow ? 0.5 : 1),
    understanding: task(
      understandingLow ? 0.5 : 1
    )
  };
}

describe("selectMethods", () => {
  it("keeps the original five-method ranking equivalent across all 2,048 relevant input combinations", () => {
    const difficulties = [
      "forgetting",
      "understanding",
      "prioritization",
      "application"
    ] as const;
    const contentTypes = [
      "facts",
      "concepts",
      "reading",
      "problems",
      "essays"
    ] as const;

    let cases = 0;

    for (
      let difficultyMask = 0;
      difficultyMask < 2 ** difficulties.length;
      difficultyMask += 1
    ) {
      for (
        let contentMask = 0;
        contentMask < 2 ** contentTypes.length;
        contentMask += 1
      ) {
        for (const memoryLow of [false, true]) {
          for (
            const understandingLow of [false, true]
          ) {
            const situation: LearningSituation = {
              goal: null,
              difficulties: selectionsFromMask(
                difficulties,
                difficultyMask
              ),
              contentTypes: selectionsFromMask(
                contentTypes,
                contentMask
              ),
              currentApproach: null,
              sessionLength: null,
              learningContext: null
            };
            const currentBaseline = baseline(
              memoryLow,
              understandingLow
            );

            expect(
              selectExistingMethods(
                situation,
                currentBaseline
              )
            ).toEqual(
              legacySelectMethods(
                situation,
                currentBaseline
              )
            );

            cases += 1;
          }
        }
      }
    }

    expect(cases).toBe(2048);
  });
});
