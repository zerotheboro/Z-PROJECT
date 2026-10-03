import {
  describe,
  expect,
  it
} from "vitest";

import {
  baselineConceptContentSets,
  baselineMemoryContentSets,
  learningSituationQuestions
} from "../assessmentData";
import {
  methodLabContentSets,
  methodMatchContentSets
} from "../methodContentSets";
import {
  getMethodDefinition
} from "../methodRegistry";
import {
  createTrainingDraft,
  validateTrainingDraft
} from "../trainingProgress";

import type {
  MultipleChoiceQuestion
} from "../methodEngineTypes";
import type {
  LearningSituation,
  MethodExperimentResult,
  MethodMatchExperimentResult,
  TrainingMethodId
} from "../type";
import type {
  TrainingDraft,
  TrainingPhase
} from "../trainingProgress";

const phaseBySection: Record<number, TrainingPhase> = {
  1: "situation",
  2: "baseline",
  3: "introduction",
  4: "lab",
  5: "match",
  6: "reflection"
};

function completeSituation(): LearningSituation {
  return Object.fromEntries(
    learningSituationQuestions.map(question => [
      question.id,
      question.type === "multi"
        ? [question.options[0].value]
        : question.options[0].value
    ])
  ) as LearningSituation;
}

function experimentResult(
  method: TrainingMethodId
): MethodExperimentResult {
  return {
    method,
    category: getMethodDefinition(method).category,
    score: 0,
    correct: 0,
    total: 1,
    confidence: 1,
    ease: 1,
    willingnessToUse: 1,
    timeSpentMs: 0
  };
}

function matchResult(
  method: TrainingMethodId
): MethodMatchExperimentResult {
  return {
    method,
    firstScore: 0,
    verificationScore: 0,
    confidence: 1,
    timeSpentMs: 0
  };
}

function makeDraft({
  section,
  mode = "auto",
  methods = ["active-recall"],
  finalSave = false
}: {
  section: number;
  mode?: "auto" | "manual";
  methods?: TrainingMethodId[];
  finalSave?: boolean;
}): TrainingDraft {
  const draft = createTrainingDraft({
    owner: { kind: "guest" },
    mode,
    selectedMethods: mode === "manual" ? methods : []
  });

  draft.section = section;
  draft.phase = finalSave
    ? "final-save"
    : phaseBySection[section];

  if (mode === "auto" && section >= 2) {
    draft.completed.learningSituation = completeSituation();
  }

  if (mode === "auto" && section >= 3) {
    draft.baselineContentSetIds = {
      memory: baselineMemoryContentSets[0].id,
      understanding: baselineConceptContentSets[0].id
    };
    draft.completed.baseline = {
      memory: {
        score: 0,
        correct: 0,
        total: 1,
        confidence: null,
        timeSpentMs: 0
      },
      understanding: {
        score: 0,
        correct: 0,
        total: 1,
        confidence: 1,
        timeSpentMs: 0
      }
    };
  }

  if (section >= 3) {
    draft.selectedMethods = [...methods];
    draft.currentMethod = methods[0];
    draft.currentMethodIndex = 0;
  }

  if (section >= 4) {
    draft.completed.methodIntroduction = {
      methods: [...methods],
      correct: 0,
      total: methods.length,
      score: 0
    };
  }

  if (section >= 5) {
    draft.labContentSetIds = methods.map(method =>
      getMethodDefinition(method).labContentSetIds[0]
    );
    draft.completed.methodLab = {
      experiments: methods.map(experimentResult)
    };
    draft.verificationMethodOrder = [methods[0]];
    draft.matchContentSetIds = [
      getMethodDefinition(methods[0]).matchContentSetIds[0]
    ];
  }

  if (section >= 6) {
    draft.completed.methodMatch = {
      methods: [matchResult(methods[0])]
    };
  }

  if (finalSave) {
    draft.completed.reflection = {
      preferredMethod: methods[0],
      priority: "performance",
      surprisedByResults: false,
      reflectionText: ""
    };

    if (mode === "auto") {
      draft.completed.learningProfile = {
        strongestVerifiedMethod: methods[0],
        preferredMethod: methods[0],
        recommendedMethods: [...methods],
        methodEvidence: methods.map(method => ({
          method,
          labScore: 0,
          verificationScore:
            method === methods[0] ? 0 : null,
          labConfidence: 1,
          verificationConfidence:
            method === methods[0] ? 1 : null,
          ease: 1,
          willingnessToUse: 1,
          evidenceScore: 0
        })),
        baseline: {
          memoryScore: 0,
          understandingScore: 0
        },
        methodKnowledgeScore: 0,
        priority: "performance"
      };
    }
  }

  return draft;
}

function expectValid(draft: TrainingDraft) {
  expect(validateTrainingDraft(draft)).toEqual({
    valid: true,
    draft
  });
}

function questionsFor(
  kind: "lab" | "match",
  method: TrainingMethodId,
  id: string
): readonly MultipleChoiceQuestion[] {
  const sets = kind === "lab"
    ? methodLabContentSets[method]
    : methodMatchContentSets[method];
  const data = sets.find(set => set.id === id)?.data as {
    questions: readonly MultipleChoiceQuestion[];
  };

  return data.questions;
}

describe("semantic training-draft validation", () => {
  it.each([
    [1, "situation"],
    [2, "baseline"],
    [3, "introduction"],
    [4, "lab"],
    [5, "match"],
    [6, "reflection"]
  ] as const)(
    "accepts an automatic draft at section %i (%s)",
    (section, _phase) => {
      expectValid(makeDraft({ section }));
    }
  );

  it("accepts automatic and manual final-save retry drafts", () => {
    expectValid(makeDraft({ section: 6, finalSave: true }));
    expectValid(makeDraft({
      section: 6,
      mode: "manual",
      finalSave: true
    }));
  });

  it.each([1, 2, 3])(
    "accepts a manual introduction draft with %i methods",
    count => {
      expectValid(makeDraft({
        section: 3,
        mode: "manual",
        methods: [
          "active-recall",
          "feynman",
          "cornell"
        ].slice(0, count) as TrainingMethodId[]
      }));
    }
  );

  it("accepts partial Lab work, unfinished writing, zero time, and a stored option order", () => {
    const draft = makeDraft({
      section: 4,
      mode: "manual"
    });
    const method = "active-recall";
    const contentId = getMethodDefinition(method)
      .labContentSetIds[0];
    const question = questionsFor(
      "lab",
      method,
      contentId
    )[0];

    draft.labContentSetIds = [contentId];
    draft.internalState = {
      "lab-controller": {
        slots: [0, [], [contentId]],
        named: {}
      },
      [`lab:${method}:${contentId}`]: {
        slots: [
          "retrieval",
          "unfinished written recall",
          {},
          0,
          null,
          null,
          null,
          { accumulatedMs: 0, running: true },
          null,
          0
        ],
        named: {
          "answer-option-orders": {
            [question.id]: [...question.options].reverse()
          }
        }
      }
    };

    expectValid(draft);
  });

  it("accepts partial Match work with its assigned content and stable option order", () => {
    const draft = makeDraft({
      section: 5,
      mode: "manual"
    });
    const method = "active-recall";
    const contentId = draft.matchContentSetIds[0];
    const question = questionsFor(
      "match",
      method,
      contentId
    )[0];

    draft.internalState = {
      "match-controller": {
        slots: [0, [], [contentId]],
        named: {}
      },
      [`match:${method}:${contentId}`]: {
        slots: [
          "retrieve",
          "unfinished verification recall",
          {},
          0,
          null,
          { accumulatedMs: 0, running: true }
        ],
        named: {
          "answer-option-orders": {
            [question.id]: [...question.options].reverse()
          }
        }
      }
    };

    expectValid(draft);
  });

  it("rejects corrupt content, evidence, interaction, and timer state", () => {
    const badContent = makeDraft({
      section: 4,
      mode: "manual"
    });
    badContent.labContentSetIds = ["missing-content"];
    expect(validateTrainingDraft(badContent).valid).toBe(false);

    const badMatchContent = makeDraft({ section: 5 });
    badMatchContent.matchContentSetIds = ["missing-content"];
    expect(validateTrainingDraft(badMatchContent).valid)
      .toBe(false);

    const badEvidence = makeDraft({ section: 5 });
    badEvidence.completed.methodLab!.experiments[0].score = 1;
    expect(validateTrainingDraft(badEvidence).valid).toBe(false);

    const badInternal = makeDraft({ section: 4 });
    badInternal.internalState = {
      unknown: { slots: [], named: {} }
    };
    expect(validateTrainingDraft(badInternal).valid).toBe(false);

    const nanTimer = makeDraft({
      section: 4,
      mode: "manual"
    });
    const contentId = getMethodDefinition("active-recall")
      .labContentSetIds[0];
    nanTimer.labContentSetIds = [contentId];
    nanTimer.internalState = {
      [`lab:active-recall:${contentId}`]: {
        slots: [
          "study",
          "",
          {},
          0,
          null,
          null,
          null,
          { accumulatedMs: Number.NaN, running: true }
        ],
        named: {}
      }
    };
    expect(validateTrainingDraft(nanTimer).valid).toBe(false);
  });

  it("rejects mismatched phases, indexes, modes, and verification membership", () => {
    const badPhase = makeDraft({ section: 4 });
    badPhase.phase = "match";
    expect(validateTrainingDraft(badPhase).valid).toBe(false);

    const badIndex = makeDraft({ section: 4 });
    badIndex.currentMethodIndex = 2;
    expect(validateTrainingDraft(badIndex).valid).toBe(false);

    const badManual = makeDraft({
      section: 3,
      mode: "manual"
    });
    badManual.completed.learningSituation = completeSituation();
    expect(validateTrainingDraft(badManual).valid).toBe(false);

    const badVerification = makeDraft({ section: 5 });
    badVerification.verificationMethodOrder = ["feynman"];
    expect(validateTrainingDraft(badVerification).valid).toBe(false);
  });

  it("rejects invalid stored answer permutations", () => {
    const draft = makeDraft({
      section: 4,
      mode: "manual"
    });
    const method = "active-recall";
    const contentId = getMethodDefinition(method)
      .labContentSetIds[0];
    const question = questionsFor(
      "lab",
      method,
      contentId
    )[0];

    draft.labContentSetIds = [contentId];
    draft.internalState = {
      [`lab:${method}:${contentId}`]: {
        slots: [
          "test",
          "unfinished",
          {},
          0,
          null,
          null,
          null,
          { accumulatedMs: 0, running: false }
        ],
        named: {
          "answer-option-orders": {
            [question.id]: [
              question.options[0],
              question.options[0],
              ...question.options.slice(2)
            ]
          }
        }
      }
    };

    expect(validateTrainingDraft(draft).valid).toBe(false);
  });
});
