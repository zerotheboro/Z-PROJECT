import {
  describe,
  expect,
  it
} from "vitest";

import {
  selectMethods
} from "../methodSelector";

import type {
  BaselineResult,
  LearningSituation,
  TrainingMethodId
} from "../type";

const addedMethods = [
  "active-blurting",
  "one-sentence",
  "note-taking-4x4",
  "leitner-system",
  "story-telling",
  "capture-create",
  "abbreviation",
  "header-first",
  "prime-question",
  "doodle-effect",
  "eighty-twenty-rule",
  "divide-steps",
  "derive-basics"
] as const satisfies readonly TrainingMethodId[];

function baseline(
  memoryScore: number,
  understandingScore: number
): BaselineResult {
  const task = (score: number) => ({
    score,
    correct: score < 0.7 ? 1 : 4,
    total: 4,
    confidence: 3,
    timeSpentMs: 1000
  });

  return {
    memory: task(memoryScore),
    understanding: task(
      understandingScore
    )
  };
}

function situation(
  difficulties: string[],
  contentTypes: string[]
): LearningSituation {
  return {
    goal: null,
    difficulties,
    contentTypes,
    currentApproach: null,
    sessionLength: null,
    learningContext: null
  };
}

describe("expanded method selection", () => {
  it.each([
    {
      method: "active-blurting",
      currentSituation: situation(
        ["forgetting"],
        ["facts"]
      ),
      currentBaseline: baseline(0.5, 1),
      expected: [
        "active-recall",
        "memory-palace",
        "active-blurting",
        "leitner-system"
      ]
    },
    {
      method: "one-sentence",
      currentSituation: situation(
        ["understanding"],
        ["concepts"]
      ),
      currentBaseline: baseline(1, 0.5),
      expected: [
        "feynman",
        "one-sentence",
        "cornell",
        "derive-basics"
      ]
    },
    {
      method: "note-taking-4x4",
      currentSituation: situation(
        ["prioritization"],
        ["reading", "essays"]
      ),
      currentBaseline: baseline(1, 1),
      expected: [
        "cornell",
        "note-taking-4x4",
        "eighty-twenty-rule",
        "feynman"
      ]
    },
    {
      method: "leitner-system",
      currentSituation: situation(
        [],
        ["facts"]
      ),
      currentBaseline: baseline(0.5, 1),
      expected: [
        "active-recall",
        "memory-palace",
        "leitner-system",
        "active-blurting"
      ]
    },
    {
      method: "story-telling",
      currentSituation: situation(
        ["forgetting"],
        ["reading"]
      ),
      currentBaseline: baseline(0.5, 1),
      expected: [
        "active-recall",
        "memory-palace",
        "story-telling",
        "cornell"
      ]
    },
    {
      method: "capture-create",
      currentSituation: situation(
        ["application"],
        ["concepts"]
      ),
      currentBaseline: baseline(1, 1),
      expected: [
        "interleaving",
        "capture-create",
        "feynman",
        "divide-steps"
      ]
    },
    {
      method: "abbreviation",
      currentSituation: situation(
        ["forgetting"],
        ["facts"]
      ),
      currentBaseline: baseline(1, 1),
      expected: [
        "active-recall",
        "memory-palace",
        "abbreviation",
        "active-blurting"
      ]
    },
    {
      method: "header-first",
      currentSituation: situation(
        ["prioritization"],
        ["reading"]
      ),
      currentBaseline: baseline(1, 1),
      expected: [
        "cornell",
        "note-taking-4x4",
        "eighty-twenty-rule",
        "header-first"
      ]
    },
    {
      method: "prime-question",
      currentSituation: situation(["understanding"], ["reading"]),
      currentBaseline: baseline(1, 1),
      expected: ["cornell", "feynman", "note-taking-4x4", "prime-question"]
    },
    {
      method: "doodle-effect",
      currentSituation: situation(["forgetting"], ["concepts"]),
      currentBaseline: baseline(1, 1),
      expected: ["active-recall", "memory-palace", "feynman", "doodle-effect"]
    },
    {
      method: "eighty-twenty-rule",
      currentSituation: situation(["prioritization"], []),
      currentBaseline: baseline(1, 1),
      expected: ["cornell", "note-taking-4x4", "eighty-twenty-rule", "active-recall"]
    },
    {
      method: "divide-steps",
      currentSituation: situation(["application"], ["problems"]),
      currentBaseline: baseline(1, 1),
      expected: ["interleaving", "divide-steps", "capture-create", "derive-basics"]
    },
    {
      method: "derive-basics",
      currentSituation: situation(["understanding", "application"], ["concepts"]),
      currentBaseline: baseline(1, 0.5),
      expected: ["feynman", "one-sentence", "derive-basics", "interleaving"]
    }
  ] as const)(
    "makes $method reachable for a related profile",
    ({
      method,
      currentSituation,
      currentBaseline,
      expected
    }) => {
      const selected = selectMethods(
        currentSituation,
        currentBaseline
      );

      expect(selected).toContain(method);
      expect(selected).toEqual(expected);
    }
  );

  it("does not select a new method for an unrelated profile", () => {
    const selected = selectMethods(
      situation([], []),
      baseline(1, 1)
    );

    expect(
      selected.filter((method) =>
        addedMethods.includes(
          method as (typeof addedMethods)[number]
        )
      )
    ).toEqual([]);
  });
});
