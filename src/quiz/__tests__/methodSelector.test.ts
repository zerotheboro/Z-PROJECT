import {
  describe,
  expect,
  it
} from "vitest";

import {
  getMethodDefinition,
  matchesSelectionSignal,
  methodDefinitions
} from "../methodRegistry";
import {
  AI_RECOMMENDATION_BONUS,
  rankMethodsForSelection,
  selectMethods
} from "../methodSelector";
import { selectMethodsForVerification } from "../methodMatchSelector";
import { buildLearningProfile } from "../profileBuilder";

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

function traditionalFullSelection(
  situation: LearningSituation,
  currentBaseline: BaselineResult
): TrainingMethodId[] {
  return methodDefinitions.map(definition => {
    const matching = definition.selectionSignals.filter(signal =>
      matchesSelectionSignal(signal, situation, currentBaseline)
    );
    return {
      id: definition.id,
      score: definition.defaultSelectionWeight +
        matching.reduce((sum, signal) => sum + signal.weight, 0),
      order: matching.reduce(
        (order, signal) => Math.min(order, signal.selectionOrder),
        definition.defaultSelectionOrder
      )
    };
  }).sort((a, b) =>
    b.score - a.score || a.order - b.order
  ).slice(0, 4).map(item => item.id);
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
  const neutralSituation: LearningSituation = {
    goal: null,
    difficulties: [],
    contentTypes: [],
    currentApproach: null,
    sessionLength: null,
    learningContext: null
  };

  it("preserves the existing four-method ranking without usable AI context", () => {
    const currentBaseline = baseline(false, false);
    const traditional = traditionalFullSelection(
      neutralSituation, currentBaseline
    );

    expect(selectMethods(neutralSituation, currentBaseline))
      .toEqual(traditional);
    expect(selectMethods(neutralSituation, currentBaseline, []))
      .toEqual(traditional);
    expect(selectMethods(neutralSituation, currentBaseline, [
      "unsupported" as TrainingMethodId
    ])).toEqual(traditional);
  });

  it("adds exactly 15 normalized points inside the existing score calculation", () => {
    const currentBaseline = baseline(false, false);
    const unboosted = rankMethodsForSelection(
      neutralSituation, currentBaseline
    );
    const boosted = rankMethodsForSelection(
      neutralSituation, currentBaseline,
      ["one-sentence"]
    );
    const scoreOf = (
      list: typeof boosted,
      id: TrainingMethodId
    ) => list.find(item => item.method === id)?.score;

    expect(Math.max(...methodDefinitions.map(definition =>
      definition.defaultSelectionWeight +
      definition.selectionSignals.reduce(
        (sum, signal) => sum + signal.weight, 0
      )
    ))).toBe(17);
    expect(AI_RECOMMENDATION_BONUS).toBe(2.55);
    expect(scoreOf(boosted, "one-sentence")! -
      scoreOf(unboosted, "one-sentence")!)
      .toBe(AI_RECOMMENDATION_BONUS);
    expect(scoreOf(boosted, "active-recall"))
      .toBe(scoreOf(unboosted, "active-recall"));
    expect(boosted[0].method).toBe("one-sentence");
    expect(selectMethods(neutralSituation, currentBaseline,
      ["one-sentence"])).toHaveLength(3);
  });

  it("does not guarantee selection when another method has a higher base score", () => {
    const currentSituation = {
      ...neutralSituation,
      difficulties: ["forgetting", "focus"],
      contentTypes: ["facts"]
    };
    const selected = selectMethods(
      currentSituation,
      baseline(true, false),
      ["ten-minute-wall-stare"]
    );

    expect(selected).toHaveLength(3);
    expect(selected).not.toContain("ten-minute-wall-stare");
    expect(selected[0]).toBe("active-recall");
  });

  it("keeps the AI bonus out of Lab, top-two verification and Learning Profile", () => {
    const currentBaseline = baseline(false, false);
    const selected = selectMethods(
      neutralSituation,
      currentBaseline,
      ["one-sentence"]
    );
    expect(selected[0]).toBe("one-sentence");

    const methodLab = {
      experiments: selected.map((method, index) => ({
        method,
        category: getMethodDefinition(method).category,
        score: index === 0 ? 0.1 : index === 1 ? 0.9 : 0.8,
        correct: index === 0 ? 1 : index === 1 ? 9 : 8,
        total: 10,
        confidence: 3,
        ease: 3,
        willingnessToUse: 3,
        timeSpentMs: 1000
      }))
    };
    const verified = selectMethodsForVerification(
      methodLab.experiments
    );

    expect(verified).toEqual(selected.slice(1));

    const profile = buildLearningProfile({
      baseline: currentBaseline,
      methodIntroduction: {
        methods: selected,
        correct: 3,
        total: 3,
        score: 1
      },
      methodLab,
      methodMatch: {
        methods: verified.map(method => ({
          method,
          firstScore: methodLab.experiments.find(
            experiment => experiment.method === method
          )?.score ?? null,
          verificationScore: 0.8,
          confidence: 3,
          timeSpentMs: 1000
        }))
      },
      reflection: {
        preferredMethod: null,
        priority: "performance",
        surprisedByResults: null,
        reflectionText: ""
      }
    });

    expect(profile.recommendedMethods).toEqual(verified);
    expect(profile.methodEvidence.find(evidence =>
      evidence.method === "one-sentence"
    )?.labScore).toBe(0.1);
    expect(profile.strongestVerifiedMethod).toBe(verified[0]);
  });

  it("chooses the same two verification methods on equal Lab scores regardless of incoming order", () => {
    const methods = ["feynman", "active-recall", "cornell"] as const;
    const experiments = methods.map(method => ({
      method,
      category: getMethodDefinition(method).category,
      score: 0.75,
      correct: 3,
      total: 4,
      confidence: 3,
      ease: 3,
      willingnessToUse: 3,
      timeSpentMs: 1000
    }));
    expect(selectMethodsForVerification(experiments))
      .toEqual(["active-recall", "cornell"]);
    expect(selectMethodsForVerification([...experiments].reverse()))
      .toEqual(["active-recall", "cornell"]);
  });

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
            expect(selectMethods(situation, currentBaseline))
              .toEqual(traditionalFullSelection(
                situation, currentBaseline
              ));

            cases += 1;
          }
        }
      }
    }

    expect(cases).toBe(2048);
  });
});
