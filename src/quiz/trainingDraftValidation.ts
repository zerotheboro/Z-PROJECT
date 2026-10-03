import {
  baselineConceptContentSets,
  baselineMemoryContentSets,
  learningSituationQuestions
} from "./assessmentData";
import {
  methodLabContentSets,
  methodMatchContentSets
} from "./methodContentSets";
import {
  getMethodDefinition
} from "./methodRegistry";
import {
  isTrainingMethodId
} from "./type";

import type {
  MultipleChoiceQuestion
} from "./methodEngineTypes";
import type {
  MethodId,
  TrainingMethodId
} from "./type";

type UnknownRecord = Record<string, unknown>;
type QuestionGroup = "questions" | "practice" | "test";

type QuestionSlot = {
  answerSlot: number;
  indexSlot: number;
  group: QuestionGroup;
};

type MethodScopeRule = {
  stages: readonly string[];
  questions: readonly QuestionSlot[];
  ratingSlots: readonly number[];
  timerSlot: number;
  maximumSlots: number;
  countdownSlots?: readonly {
    slot: number;
    maximum: number;
  }[];
  counterSlot?: {
    slot: number;
    maximum: number;
  };
  stimulusSlot?: number;
  videoSlot?: number;
};

const PRIORITIES = [
  "performance",
  "ease",
  "confidence",
  "realistic-use"
] as const;

const CATEGORIES = [
  "memory",
  "understanding",
  "organization",
  "problem-solving",
  "focus"
] as const;

const simpleLab = (
  stages: readonly string[],
  answerSlot: number,
  indexSlot: number,
  ratingStart: number,
  timerSlot = ratingStart + 3,
  extras: Partial<MethodScopeRule> = {}
): MethodScopeRule => ({
  stages,
  questions: [{
    answerSlot,
    indexSlot,
    group: "questions"
  }],
  ratingSlots: [
    ratingStart,
    ratingStart + 1,
    ratingStart + 2
  ],
  timerSlot,
  maximumSlots: timerSlot + 1,
  ...extras
});

const simpleMatch = (
  stages: readonly string[],
  answerSlot: number,
  indexSlot: number,
  ratingSlot: number,
  timerSlot = ratingSlot + 1,
  extras: Partial<MethodScopeRule> = {}
): MethodScopeRule => ({
  stages,
  questions: [{
    answerSlot,
    indexSlot,
    group: "questions"
  }],
  ratingSlots: [ratingSlot],
  timerSlot,
  maximumSlots: timerSlot + 1,
  ...extras
});

const labRules: Record<TrainingMethodId, MethodScopeRule> = {
  "active-recall": simpleLab(
    ["intro", "study", "retrieval", "test", "reflection"],
    2, 3, 4, 7,
    {
      maximumSlots: 10,
      countdownSlots: [
        { slot: 8, maximum: 30 },
        { slot: 9, maximum: 30 }
      ]
    }
  ),
  feynman: simpleLab(
    ["intro", "study", "explain", "simplify", "test", "reflection"],
    3, 4, 5, 8,
    {
      maximumSlots: 10,
      countdownSlots: [
        { slot: 9, maximum: 35 }
      ]
    }
  ),
  cornell: simpleLab(
    ["intro", "notes", "summary", "test", "reflection"],
    4, 5, 6
  ),
  interleaving: {
    stages: ["intro", "learn", "practice", "test", "reflection"],
    questions: [
      { answerSlot: 2, indexSlot: 1, group: "practice" },
      { answerSlot: 4, indexSlot: 3, group: "test" }
    ],
    ratingSlots: [5, 6, 7],
    timerSlot: 8,
    maximumSlots: 9
  },
  "memory-palace": simpleLab(
    ["intro", "learn", "encode", "recall", "test", "reflection"],
    2, 3, 4
  ),
  "active-blurting": simpleLab(
    ["intro", "study", "blurt", "compare", "test", "reflection"],
    2, 3, 4
  ),
  "one-sentence": simpleLab(
    ["intro", "study", "explain", "refine", "test", "reflection"],
    3, 4, 5
  ),
  "note-taking-4x4": simpleLab(
    ["intro", "organize", "details", "test", "reflection"],
    3, 4, 5
  ),
  "leitner-system": {
    stages: ["intro", "study", "recall", "organize", "retest", "test", "reflection"],
    questions: [
      { answerSlot: 4, indexSlot: 1, group: "practice" },
      { answerSlot: 5, indexSlot: 2, group: "practice" },
      { answerSlot: 6, indexSlot: 3, group: "test" }
    ],
    ratingSlots: [7, 8, 9],
    timerSlot: 10,
    maximumSlots: 11
  },
  "story-telling": simpleLab(
    ["intro", "study", "story", "reconstruct", "test", "reflection"],
    3, 4, 5
  ),
  "capture-create": simpleLab(
    ["intro", "study", "capture", "create", "test", "reflection"],
    3, 4, 5
  ),
  abbreviation: simpleLab(
    ["intro", "study", "create", "recall", "test", "reflection"],
    3, 4, 5
  ),
  "header-first": simpleLab(
    ["intro", "headers", "predict", "read", "test", "reflection"],
    2, 3, 4
  ),
  "prime-question": simpleLab(
    ["intro", "prime", "study", "answer", "test", "reflection"],
    3, 4, 5
  ),
  "doodle-effect": simpleLab(
    ["intro", "study", "doodle", "reconstruct", "test", "reflection"],
    3, 4, 5
  ),
  "eighty-twenty-rule": simpleLab(
    ["intro", "inspect", "identify", "prioritize", "study", "test", "reflection"],
    3, 4, 5
  ),
  "divide-steps": simpleLab(
    ["intro", "inspect", "divide", "organize", "reconstruct", "test", "reflection"],
    4, 5, 6
  ),
  "derive-basics": simpleLab(
    ["intro", "inspect", "basics", "derive", "chain", "test", "reflection"],
    4, 5, 6
  ),
  "kidlin-rule": simpleLab(
    ["intro", "clarify", "ambiguity", "obstacle", "rewrite", "choice", "case", "deconstruct", "patterns", "root", "test", "reflection"],
    2, 3, 4
  ),
  "premack-principle": simpleLab(
    ["intro", "pair", "study", "test", "reflection"],
    3, 4, 5
  ),
  "ten-minute-wall-stare": simpleLab(
    ["intro", "reset", "study", "test", "reflection"],
    2, 3, 4, 7,
    { counterSlot: { slot: 1, maximum: 600 } }
  ),
  "strooper-effect": simpleLab(
    ["intro", "stroop", "study", "test", "reflection"],
    2, 3, 4, 7,
    {
      maximumSlots: 9,
      counterSlot: { slot: 1, maximum: 8 },
      stimulusSlot: 8
    }
  ),
  "two-x-video-speed": simpleLab(
    ["intro", "watch", "test", "reflection"],
    1, 2, 3, 6,
    {
      maximumSlots: 8,
      videoSlot: 7
    }
  )
};

const matchRules: Record<TrainingMethodId, MethodScopeRule> = {
  "active-recall": simpleMatch(
    ["study", "retrieve", "test", "confidence"],
    2, 3, 4
  ),
  feynman: simpleMatch(
    ["study", "explain", "test", "confidence"],
    2, 3, 4
  ),
  cornell: simpleMatch(
    ["organize", "summary", "test", "confidence"],
    4, 5, 6
  ),
  interleaving: {
    stages: ["review", "practice", "test", "confidence"],
    questions: [
      { answerSlot: 2, indexSlot: 1, group: "practice" },
      { answerSlot: 4, indexSlot: 3, group: "test" }
    ],
    ratingSlots: [5],
    timerSlot: 6,
    maximumSlots: 7
  },
  "memory-palace": simpleMatch(
    ["encode", "retrieve", "test", "confidence"],
    2, 3, 4
  ),
  "active-blurting": simpleMatch(
    ["study", "blurt", "compare", "test", "confidence"],
    2, 3, 4
  ),
  "one-sentence": simpleMatch(
    ["study", "explain", "refine", "test", "confidence"],
    3, 4, 5
  ),
  "note-taking-4x4": simpleMatch(
    ["organize", "details", "test", "confidence"],
    3, 4, 5
  ),
  "leitner-system": {
    stages: ["study", "recall", "organize", "retest", "test", "confidence"],
    questions: [
      { answerSlot: 4, indexSlot: 1, group: "practice" },
      { answerSlot: 5, indexSlot: 2, group: "practice" },
      { answerSlot: 6, indexSlot: 3, group: "test" }
    ],
    ratingSlots: [7],
    timerSlot: 8,
    maximumSlots: 9
  },
  "story-telling": simpleMatch(
    ["study", "story", "reconstruct", "test", "confidence"],
    3, 4, 5
  ),
  "capture-create": simpleMatch(
    ["study", "capture", "create", "test", "confidence"],
    3, 4, 5
  ),
  abbreviation: simpleMatch(
    ["study", "create", "recall", "test", "confidence"],
    3, 4, 5
  ),
  "header-first": simpleMatch(
    ["headers", "predict", "read", "test", "confidence"],
    2, 3, 4
  ),
  "prime-question": simpleMatch(
    ["prime", "study", "answer", "test", "confidence"],
    3, 4, 5
  ),
  "doodle-effect": simpleMatch(
    ["study", "doodle", "reconstruct", "test", "confidence"],
    3, 4, 5
  ),
  "eighty-twenty-rule": simpleMatch(
    ["inspect", "identify", "prioritize", "study", "test", "confidence"],
    3, 4, 5
  ),
  "divide-steps": simpleMatch(
    ["inspect", "divide", "organize", "reconstruct", "test", "confidence"],
    4, 5, 6
  ),
  "derive-basics": simpleMatch(
    ["inspect", "basics", "derive", "chain", "test", "confidence"],
    4, 5, 6
  ),
  "kidlin-rule": simpleMatch(
    ["clarify", "ambiguity", "obstacle", "rewrite", "choice", "case", "deconstruct", "patterns", "root", "test", "confidence"],
    2, 3, 4
  ),
  "premack-principle": simpleMatch(
    ["pair", "study", "test", "confidence"],
    3, 4, 5
  ),
  "ten-minute-wall-stare": simpleMatch(
    ["reset", "study", "test", "confidence"],
    2, 3, 4, 5,
    { counterSlot: { slot: 1, maximum: 600 } }
  ),
  "strooper-effect": simpleMatch(
    ["stroop", "study", "test", "confidence"],
    2, 3, 4, 5,
    {
      maximumSlots: 7,
      counterSlot: { slot: 1, maximum: 8 },
      stimulusSlot: 6
    }
  ),
  "two-x-video-speed": simpleMatch(
    ["watch", "test", "confidence"],
    1, 2, 3, 4,
    {
      maximumSlots: 6,
      videoSlot: 5
    }
  )
};

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isFiniteNonNegative(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
  );
}

function isRating(value: unknown): boolean {
  return value === null ||
    isIntegerInRange(value, 1, 5);
}

function isUnitScore(value: unknown): boolean {
  return isFiniteNonNegative(value) && value <= 1;
}

function isNullableScore(value: unknown): boolean {
  return value === null || isUnitScore(value);
}

function scoreMatchesCounts(
  score: unknown,
  correct: unknown,
  total: unknown
): boolean {
  return isUnitScore(score) &&
    isIntegerInRange(correct, 0, Number.MAX_SAFE_INTEGER) &&
    isIntegerInRange(total, 1, Number.MAX_SAFE_INTEGER) &&
    (correct as number) <= (total as number) &&
    Math.abs(
      (score as number) -
      (correct as number) / (total as number)
    ) < Number.EPSILON * 10;
}

function isMethodId(value: unknown): value is MethodId {
  return isTrainingMethodId(value) ||
    value === "pomodoro" ||
    value === "stopwatch";
}

function hasOnlyKeys(
  value: UnknownRecord,
  keys: readonly string[]
): boolean {
  return Object.keys(value).every(key =>
    keys.includes(key)
  );
}

function isTimer(value: unknown): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, ["accumulatedMs", "running"]) &&
    isFiniteNonNegative(value.accumulatedMs) &&
    typeof value.running === "boolean";
}

function isVideoProgress(value: unknown): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, ["currentTime", "started", "completed"]) &&
    isFiniteNonNegative(value.currentTime) &&
    typeof value.started === "boolean" &&
    typeof value.completed === "boolean";
}

function isStimulus(
  value: unknown,
  colorCount: number
): boolean {
  return value === null || (
    isRecord(value) &&
    hasOnlyKeys(value, ["inkIndex", "wordIndex"]) &&
    isIntegerInRange(value.inkIndex, 0, colorCount - 1) &&
    isIntegerInRange(value.wordIndex, 0, colorCount - 1) &&
    (colorCount < 2 || value.inkIndex !== value.wordIndex)
  );
}

function isSafeInternalValue(
  value: unknown,
  depth = 0
): boolean {
  if (depth > 8) {
    return false;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return isFiniteNonNegative(value);
  }

  if (Array.isArray(value)) {
    return value.length <= 100 &&
      value.every(item =>
        isSafeInternalValue(item, depth + 1)
      );
  }

  if (!isRecord(value)) {
    return false;
  }

  if (
    "accumulatedMs" in value ||
    "running" in value
  ) {
    return isTimer(value);
  }

  if (
    "currentTime" in value ||
    "started" in value ||
    "completed" in value
  ) {
    return isVideoProgress(value);
  }

  const entries = Object.entries(value);
  return entries.length <= 200 &&
    entries.every(([, item]) =>
      isSafeInternalValue(item, depth + 1)
    );
}

function questionsFromData(
  data: unknown,
  group: QuestionGroup
): readonly MultipleChoiceQuestion[] {
  if (!isRecord(data)) {
    return [];
  }

  const candidate = data[group];
  return Array.isArray(candidate)
    ? candidate as MultipleChoiceQuestion[]
    : [];
}

function contentSetFor(
  kind: "lab" | "match",
  method: TrainingMethodId,
  id: string
) {
  const sets = kind === "lab"
    ? methodLabContentSets[method]
    : methodMatchContentSets[method];

  return sets.find(set => set.id === id) ?? null;
}

function isAnswerMap(
  value: unknown,
  questions: readonly MultipleChoiceQuestion[]
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const byId = new Map(
    questions.map(question => [question.id, question])
  );

  return Object.entries(value).every(([id, answer]) => {
    const question = byId.get(id);
    return question !== undefined &&
      typeof answer === "string" &&
      question.options.includes(answer);
  });
}

function isExactPermutation(
  value: unknown,
  expected: readonly string[]
): boolean {
  return Array.isArray(value) &&
    value.length === expected.length &&
    value.every(item => typeof item === "string") &&
    new Set(value).size === value.length &&
    expected.every(item => value.includes(item));
}

function validateNamedOrders(
  named: UnknownRecord,
  questions: readonly MultipleChoiceQuestion[],
  introductionMethods?: readonly TrainingMethodId[]
): boolean {
  if (!hasOnlyKeys(named, ["answer-option-orders"])) {
    return false;
  }

  if (!("answer-option-orders" in named)) {
    return true;
  }

  const orders = named["answer-option-orders"];
  if (!isRecord(orders)) {
    return false;
  }

  const byId = new Map(
    questions.map(question => [question.id, question.options])
  );

  return Object.entries(orders).every(([id, order]) => {
    const expected = introductionMethods &&
      isTrainingMethodId(id)
        ? introductionMethods
        : byId.get(id);

    return expected !== undefined &&
      isExactPermutation(order, expected);
  });
}

function isBaselineTaskResult(value: unknown): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, [
      "score",
      "correct",
      "total",
      "confidence",
      "timeSpentMs"
    ]) &&
    scoreMatchesCounts(
      value.score,
      value.correct,
      value.total
    ) &&
    isRating(value.confidence) &&
    isFiniteNonNegative(value.timeSpentMs);
}

function isBaselineResult(value: unknown): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, ["memory", "understanding"]) &&
    isBaselineTaskResult(value.memory) &&
    isBaselineTaskResult(value.understanding);
}

function optionValues(questionId: string): string[] {
  return learningSituationQuestions
    .find(question => question.id === questionId)
    ?.options.map(option => option.value) ?? [];
}

function isLearningSituation(
  value: unknown,
  complete: boolean
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const singleKeys = [
    "goal",
    "currentApproach",
    "sessionLength",
    "learningContext"
  ];
  const multiKeys = ["difficulties", "contentTypes"];

  if (!hasOnlyKeys(value, [...singleKeys, ...multiKeys])) {
    return false;
  }

  const singlesValid = singleKeys.every(key => {
    const answer = value[key];
    return answer === null
      ? !complete
      : typeof answer === "string" &&
          optionValues(key).includes(answer);
  });
  const multisValid = multiKeys.every(key => {
    const answer = value[key];
    const question = learningSituationQuestions.find(
      item => item.id === key && item.type === "multi"
    );
    return Array.isArray(answer) &&
      question?.type === "multi" &&
      (!complete || answer.length > 0) &&
      answer.length <= question.maxSelections &&
      new Set(answer).size === answer.length &&
      answer.every(item =>
        typeof item === "string" &&
        optionValues(key).includes(item)
      );
  });

  return singlesValid && multisValid;
}

function isIntroductionResult(
  value: unknown,
  methods: readonly TrainingMethodId[]
): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, [
      "methods",
      "correct",
      "total",
      "score"
    ]) &&
    Array.isArray(value.methods) &&
    value.methods.length === methods.length &&
    value.methods.every((method, index) =>
      method === methods[index]
    ) &&
    value.total === methods.length &&
    scoreMatchesCounts(
      value.score,
      value.correct,
      value.total
    );
}

function isExperimentResult(
  value: unknown,
  method: TrainingMethodId
): boolean {
  if (!isRecord(value) || value.method !== method) {
    return false;
  }

  if (!hasOnlyKeys(value, [
    "method",
    "category",
    "score",
    "correct",
    "total",
    "confidence",
    "ease",
    "willingnessToUse",
    "timeSpentMs"
  ])) {
    return false;
  }

  const objectiveValid = value.score === null
    ? value.correct === null && value.total === null
    : scoreMatchesCounts(
        value.score,
        value.correct,
        value.total
      );

  return objectiveValid &&
    (CATEGORIES as readonly unknown[]).includes(value.category) &&
    value.category === getMethodDefinition(method).category &&
    isIntegerInRange(value.confidence, 1, 5) &&
    isIntegerInRange(value.ease, 1, 5) &&
    isIntegerInRange(value.willingnessToUse, 1, 5) &&
    isFiniteNonNegative(value.timeSpentMs);
}

function isLabResult(
  value: unknown,
  methods: readonly TrainingMethodId[],
  complete: boolean
): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["experiments"]) ||
    !Array.isArray(value.experiments)
  ) {
    return false;
  }

  if (
    value.experiments.length > methods.length ||
    (complete && value.experiments.length !== methods.length)
  ) {
    return false;
  }

  return value.experiments.every((result, index) =>
    isExperimentResult(result, methods[index])
  );
}

function isMatchExperimentResult(
  value: unknown,
  method: TrainingMethodId
): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, [
      "method",
      "firstScore",
      "verificationScore",
      "confidence",
      "timeSpentMs"
    ]) &&
    value.method === method &&
    isNullableScore(value.firstScore) &&
    isNullableScore(value.verificationScore) &&
    isIntegerInRange(value.confidence, 1, 5) &&
    isFiniteNonNegative(value.timeSpentMs);
}

function isMatchResult(
  value: unknown,
  methods: readonly TrainingMethodId[],
  complete: boolean
): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["methods"]) ||
    !Array.isArray(value.methods)
  ) {
    return false;
  }

  if (
    value.methods.length > methods.length ||
    (complete && value.methods.length !== methods.length)
  ) {
    return false;
  }

  return value.methods.every((result, index) =>
    isMatchExperimentResult(result, methods[index])
  );
}

function isReflectionResult(
  value: unknown,
  verifiedMethods: readonly TrainingMethodId[]
): boolean {
  return isRecord(value) &&
    hasOnlyKeys(value, [
      "preferredMethod",
      "priority",
      "surprisedByResults",
      "reflectionText"
    ]) &&
    (
      value.preferredMethod === null ||
      (
        isMethodId(value.preferredMethod) &&
        verifiedMethods.includes(
          value.preferredMethod as TrainingMethodId
        )
      )
    ) &&
    (PRIORITIES as readonly unknown[]).includes(value.priority) &&
    (
      value.surprisedByResults === null ||
      typeof value.surprisedByResults === "boolean"
    ) &&
    typeof value.reflectionText === "string";
}

function isLearningProfile(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "strongestVerifiedMethod",
      "preferredMethod",
      "recommendedMethods",
      "methodEvidence",
      "baseline",
      "methodKnowledgeScore",
      "priority"
    ]) ||
    !isRecord(value.baseline) ||
    !hasOnlyKeys(value.baseline, [
      "memoryScore",
      "understandingScore"
    ])
  ) {
    return false;
  }

  const validNullableMethod = (method: unknown) =>
    method === null || isMethodId(method);

  return validNullableMethod(value.strongestVerifiedMethod) &&
    validNullableMethod(value.preferredMethod) &&
    Array.isArray(value.recommendedMethods) &&
    value.recommendedMethods.every(isMethodId) &&
    new Set(value.recommendedMethods).size ===
      value.recommendedMethods.length &&
    Array.isArray(value.methodEvidence) &&
    value.methodEvidence.every(evidence =>
      isRecord(evidence) &&
      hasOnlyKeys(evidence, [
        "method",
        "labScore",
        "verificationScore",
        "labConfidence",
        "verificationConfidence",
        "ease",
        "willingnessToUse",
        "evidenceScore"
      ]) &&
      isMethodId(evidence.method) &&
      isNullableScore(evidence.labScore) &&
      isNullableScore(evidence.verificationScore) &&
      isIntegerInRange(evidence.labConfidence, 1, 5) &&
      isRating(evidence.verificationConfidence) &&
      isIntegerInRange(evidence.ease, 1, 5) &&
      isIntegerInRange(evidence.willingnessToUse, 1, 5) &&
      isFiniteNonNegative(evidence.evidenceScore)
    ) &&
    isUnitScore(value.baseline.memoryScore) &&
    isUnitScore(value.baseline.understandingScore) &&
    isUnitScore(value.methodKnowledgeScore) &&
    (PRIORITIES as readonly unknown[]).includes(value.priority);
}

function validateMethodScope(
  scope: string,
  state: UnknownRecord,
  kind: "lab" | "match",
  method: TrainingMethodId,
  contentSetId: string
): boolean {
  const slots = state.slots;
  const named = state.named;
  const rule = kind === "lab"
    ? labRules[method]
    : matchRules[method];
  const contentSet = contentSetFor(
    kind,
    method,
    contentSetId
  );

  if (
    !contentSet ||
    !Array.isArray(slots) ||
    slots.length > rule.maximumSlots ||
    !isRecord(named) ||
    !slots.every(item => isSafeInternalValue(item))
  ) {
    return false;
  }

  if (
    slots.length > 0 &&
    (
      typeof slots[0] !== "string" ||
      !rule.stages.includes(slots[0])
    )
  ) {
    return false;
  }

  const allQuestions = new Map<string, MultipleChoiceQuestion>();

  for (const questionSlot of rule.questions) {
    const questions = questionsFromData(
      contentSet.data,
      questionSlot.group
    );
    questions.forEach(question =>
      allQuestions.set(question.id, question)
    );

    if (
      questionSlot.answerSlot < slots.length &&
      !isAnswerMap(
        slots[questionSlot.answerSlot],
        questions
      )
    ) {
      return false;
    }

    if (
      questionSlot.indexSlot < slots.length &&
      !isIntegerInRange(
        slots[questionSlot.indexSlot],
        0,
        Math.max(questions.length - 1, 0)
      )
    ) {
      return false;
    }
  }

  if (
    !rule.ratingSlots.every(slot =>
      slot >= slots.length || isRating(slots[slot])
    ) ||
    (
      rule.timerSlot < slots.length &&
      !isTimer(slots[rule.timerSlot])
    )
  ) {
    return false;
  }

  if (
    rule.countdownSlots?.some(({ slot, maximum }) =>
      slot < slots.length &&
      slots[slot] !== null &&
      !isIntegerInRange(slots[slot], 0, maximum)
    )
  ) {
    return false;
  }

  if (
    rule.counterSlot &&
    rule.counterSlot.slot < slots.length &&
    !isIntegerInRange(
      slots[rule.counterSlot.slot],
      0,
      rule.counterSlot.maximum
    )
  ) {
    return false;
  }

  if (
    rule.stimulusSlot !== undefined &&
    rule.stimulusSlot < slots.length
  ) {
    const contentData: unknown = contentSet.data;
    const colors = isRecord(contentData) &&
      Array.isArray(contentData.colors)
        ? contentData.colors.length
        : 0;
    if (!isStimulus(slots[rule.stimulusSlot], colors)) {
      return false;
    }
  }

  if (
    rule.videoSlot !== undefined &&
    rule.videoSlot < slots.length &&
    !isVideoProgress(slots[rule.videoSlot])
  ) {
    return false;
  }

  return validateNamedOrders(
    named,
    [...allQuestions.values()]
  ) && scope === `${kind}:${method}:${contentSetId}`;
}

function validateInternalState(
  internalState: UnknownRecord,
  draft: UnknownRecord
): boolean {
  const section = draft.section as number;
  const mode = draft.mode;
  const selectedMethods =
    draft.selectedMethods as TrainingMethodId[];
  const verificationMethods =
    draft.verificationMethodOrder as TrainingMethodId[];
  const labIds = draft.labContentSetIds as string[];
  const matchIds = draft.matchContentSetIds as string[];
  const baselineIds = draft.baselineContentSetIds as UnknownRecord;

  for (const [scope, unknownState] of Object.entries(internalState)) {
    if (!isRecord(unknownState)) {
      return false;
    }

    const slots = unknownState.slots;
    const named = unknownState.named;
    if (
      !hasOnlyKeys(unknownState, ["slots", "named"]) ||
      !Array.isArray(slots) ||
      !isRecord(named)
    ) {
      return false;
    }

    if (scope === "situation") {
      if (
        mode !== "auto" ||
        section < 1 ||
        slots.length > 2 ||
        !slots.every(item => isSafeInternalValue(item)) ||
        (slots.length > 0 && !isIntegerInRange(
          slots[0],
          0,
          learningSituationQuestions.length - 1
        )) ||
        (slots.length > 1 && !isLearningSituation(slots[1], false)) ||
        !validateNamedOrders(named, [])
      ) {
        return false;
      }
      continue;
    }

    if (scope === "baseline") {
      const memory = baselineMemoryContentSets.find(
        content => content.id === baselineIds.memory
      );
      const concept = baselineConceptContentSets.find(
        content => content.id === baselineIds.understanding
      );
      const questions = [
        ...(memory?.questions ?? []),
        ...(concept?.questions ?? [])
      ];
      const stages = [
        "intro",
        "memory-study",
        "memory-test",
        "memory-confidence",
        "concept-study",
        "concept-test",
        "concept-confidence"
      ];
      const maxStudyTime = Math.max(
        memory?.studyTime ?? 0,
        concept?.studyTime ?? 0
      );

      if (
        mode !== "auto" ||
        section < 2 ||
        slots.length > 13 ||
        !slots.every(item => isSafeInternalValue(item)) ||
        (slots.length > 0 && !stages.includes(slots[0] as string)) ||
        (slots.length > 1 && slots[1] !== baselineIds.memory) ||
        (slots.length > 2 && slots[2] !== baselineIds.understanding) ||
        (slots.length > 3 && !isAnswerMap(slots[3], memory?.questions ?? [])) ||
        (slots.length > 4 && !isIntegerInRange(slots[4], 0, Math.max((memory?.questions.length ?? 1) - 1, 0))) ||
        (slots.length > 5 && !isRating(slots[5])) ||
        (slots.length > 6 && slots[6] !== null && !isBaselineTaskResult(slots[6])) ||
        (slots.length > 7 && !isAnswerMap(slots[7], concept?.questions ?? [])) ||
        (slots.length > 8 && !isIntegerInRange(slots[8], 0, Math.max((concept?.questions.length ?? 1) - 1, 0))) ||
        (slots.length > 9 && !isRating(slots[9])) ||
        (slots.length > 10 && !isIntegerInRange(slots[10], 0, maxStudyTime)) ||
        (slots.length > 11 && !isTimer(slots[11])) ||
        (slots.length > 12 && !isTimer(slots[12])) ||
        !validateNamedOrders(named, questions)
      ) {
        return false;
      }
      continue;
    }

    if (scope === "introduction") {
      if (
        section < 3 ||
        slots.length > 4 ||
        !slots.every(item => isSafeInternalValue(item)) ||
        (slots.length > 0 && !["methods", "knowledge"].includes(slots[0] as string)) ||
        (slots.length > 1 && !isIntegerInRange(slots[1], 0, selectedMethods.length - 1)) ||
        (slots.length > 2 && !isIntegerInRange(slots[2], 0, selectedMethods.length - 1)) ||
        (slots.length > 3 && (
          !isRecord(slots[3]) ||
          !Object.entries(slots[3]).every(([key, answer]) =>
            isTrainingMethodId(key) &&
            selectedMethods.includes(key) &&
            isTrainingMethodId(answer) &&
            selectedMethods.includes(answer)
          )
        )) ||
        !validateNamedOrders(named, [], selectedMethods)
      ) {
        return false;
      }
      continue;
    }

    if (scope === "lab-controller") {
      if (
        section < 4 ||
        slots.length > 3 ||
        !slots.every(item => isSafeInternalValue(item)) ||
        (slots.length > 0 && !isIntegerInRange(slots[0], 0, selectedMethods.length - 1)) ||
        (slots.length > 1 && !isLabResult({ experiments: slots[1] }, selectedMethods, false)) ||
        (slots.length > 2 && (
          !Array.isArray(slots[2]) ||
          slots[2].length !== labIds.length ||
          !slots[2].every((id, index) => id === labIds[index])
        )) ||
        !validateNamedOrders(named, [])
      ) {
        return false;
      }
      continue;
    }

    if (scope === "match-controller") {
      if (
        section < 5 ||
        slots.length > 3 ||
        !slots.every(item => isSafeInternalValue(item)) ||
        (slots.length > 0 && !isIntegerInRange(slots[0], 0, verificationMethods.length - 1)) ||
        (slots.length > 1 && !isMatchResult({ methods: slots[1] }, verificationMethods, false)) ||
        (slots.length > 2 && (
          !Array.isArray(slots[2]) ||
          slots[2].length !== matchIds.length ||
          !slots[2].every((id, index) => id === matchIds[index])
        )) ||
        !validateNamedOrders(named, [])
      ) {
        return false;
      }
      continue;
    }

    if (scope === "reflection") {
      if (
        section < 6 ||
        slots.length > 5 ||
        !slots.every(item => isSafeInternalValue(item)) ||
        (slots.length > 0 && slots[0] !== null && !verificationMethods.includes(slots[0] as TrainingMethodId)) ||
        (slots.length > 1 && typeof slots[1] !== "boolean") ||
        (slots.length > 2 && slots[2] !== null && !(PRIORITIES as readonly unknown[]).includes(slots[2])) ||
        (slots.length > 3 && slots[3] !== null && typeof slots[3] !== "boolean") ||
        (slots.length > 4 && typeof slots[4] !== "string") ||
        !validateNamedOrders(named, [])
      ) {
        return false;
      }
      continue;
    }

    const match = /^(lab|match):([^:]+):(.+)$/.exec(scope);
    if (!match || !isTrainingMethodId(match[2])) {
      return false;
    }

    const kind = match[1] as "lab" | "match";
    const method = match[2];
    const contentSetId = match[3];
    const methods = kind === "lab"
      ? selectedMethods
      : verificationMethods;
    const ids = kind === "lab" ? labIds : matchIds;
    const minimumSection = kind === "lab" ? 4 : 5;
    const index = methods.indexOf(method);

    if (
      section < minimumSection ||
      index < 0 ||
      ids[index] !== contentSetId ||
      !validateMethodScope(
        scope,
        unknownState,
        kind,
        method,
        contentSetId
      )
    ) {
      return false;
    }
  }

  return true;
}

export function validateTrainingDraftSemantics(
  draft: UnknownRecord
): string | null {
  const mode = draft.mode;
  const section = draft.section as number;
  const phase = draft.phase;
  const selectedMethods =
    draft.selectedMethods as TrainingMethodId[];
  const verificationMethods =
    draft.verificationMethodOrder as TrainingMethodId[];
  const labIds = draft.labContentSetIds as string[];
  const matchIds = draft.matchContentSetIds as string[];
  const baselineIds = draft.baselineContentSetIds as UnknownRecord;
  const completed = draft.completed as UnknownRecord;
  const internalState = draft.internalState as UnknownRecord;

  const expectedPhase = section === 6
    ? ["reflection", "final-save"]
    : [
        "",
        "situation",
        "baseline",
        "introduction",
        "lab",
        "match"
      ][section];

  if (
    section < 1 ||
    section > 6 ||
    !(
      Array.isArray(expectedPhase)
        ? expectedPhase.includes(phase as string)
        : phase === expectedPhase
    )
  ) {
    return "The saved training phase does not match its section.";
  }

  if (
    mode === "manual" && section < 3 ||
    mode === "auto" && section < 3 && selectedMethods.length > 0 ||
    section >= 3 && selectedMethods.length < 1
  ) {
    return "The saved training mode and selected methods are inconsistent.";
  }

  if (
    new Set(verificationMethods).size !== verificationMethods.length ||
    !verificationMethods.every(method =>
      selectedMethods.includes(method)
    )
  ) {
    return "The saved verification methods are inconsistent.";
  }

  const currentMethod = draft.currentMethod;
  const currentMethodIndex = draft.currentMethodIndex;
  const currentList =
    section >= 5 && verificationMethods.length > 0
      ? verificationMethods
      : selectedMethods;

  if (currentList.length === 0) {
    if (currentMethod !== null || currentMethodIndex !== null) {
      return "The saved current method is inconsistent.";
    }
  } else if (
    !isIntegerInRange(
      currentMethodIndex,
      0,
      currentList.length - 1
    ) ||
    currentMethod !== currentList[currentMethodIndex as number]
  ) {
    return "The saved current method position is invalid.";
  }

  const memoryId = baselineIds.memory;
  const understandingId = baselineIds.understanding;
  const hasMemoryId = typeof memoryId === "string";
  const hasUnderstandingId = typeof understandingId === "string";

  if (
    mode === "manual" &&
      (memoryId !== null || understandingId !== null) ||
    hasMemoryId !== hasUnderstandingId ||
    mode === "auto" && section >= 3 &&
      (!hasMemoryId || !hasUnderstandingId)
  ) {
    return "The saved Baseline material is inconsistent.";
  }

  if (
    labIds.length !== 0 && labIds.length !== selectedMethods.length ||
    section >= 5 && labIds.length !== selectedMethods.length ||
    matchIds.length !== 0 && matchIds.length !== verificationMethods.length ||
    section >= 6 && matchIds.length !== verificationMethods.length
  ) {
    return "The saved method content assignments are incomplete.";
  }

  if (!hasOnlyKeys(completed, [
    "learningSituation",
    "baseline",
    "methodIntroduction",
    "methodLab",
    "methodMatch",
    "reflection",
    "learningProfile"
  ])) {
    return "The saved completed evidence has an invalid shape.";
  }

  const situation = completed.learningSituation;
  const baseline = completed.baseline;
  const introduction = completed.methodIntroduction;
  const lab = completed.methodLab;
  const methodMatch = completed.methodMatch;
  const reflection = completed.reflection;
  const profile = completed.learningProfile;

  if (
    situation !== null && !isLearningSituation(situation, true) ||
    baseline !== null && !isBaselineResult(baseline) ||
    introduction !== null && !isIntroductionResult(introduction, selectedMethods) ||
    lab !== null && !isLabResult(lab, selectedMethods, true) ||
    methodMatch !== null && !isMatchResult(methodMatch, verificationMethods, true) ||
    reflection !== null && !isReflectionResult(reflection, verificationMethods) ||
    profile !== null && !isLearningProfile(profile)
  ) {
    return "The saved completed assessment evidence is invalid.";
  }

  if (
    lab !== null &&
    methodMatch !== null &&
    (methodMatch as { methods: UnknownRecord[] }).methods.some(
      result => {
        const source = (
          lab as { experiments: UnknownRecord[] }
        ).experiments.find(
          experiment => experiment.method === result.method
        );

        return !source ||
          source.score !== result.firstScore;
      }
    )
  ) {
    return "The saved verification evidence does not match its Lab result.";
  }

  if (mode === "manual") {
    if (
      situation !== null ||
      baseline !== null ||
      profile !== null
    ) {
      return "The manual training draft contains automatic-assessment evidence.";
    }
  } else if (
    section >= 2 && situation === null ||
    section >= 3 && baseline === null
  ) {
    return "The automatic assessment is missing required earlier evidence.";
  }

  if (
    section >= 4 && introduction === null ||
    section >= 5 && lab === null ||
    section >= 6 && methodMatch === null
  ) {
    return "The saved training is missing required earlier method evidence.";
  }

  if (
    section < 2 && situation !== null ||
    section < 3 && baseline !== null ||
    section < 4 && introduction !== null ||
    section < 5 && lab !== null ||
    section < 6 && (
      methodMatch !== null ||
      reflection !== null ||
      profile !== null
    )
  ) {
    return "The saved training contains evidence from a future section.";
  }

  if (
    phase === "final-save" && reflection === null ||
    mode === "auto" && phase === "final-save" && profile === null ||
    phase !== "final-save" && profile !== null
  ) {
    return "The final-save draft is incomplete or inconsistent.";
  }

  if (!validateInternalState(internalState, draft)) {
    return "The saved in-progress interaction state is invalid.";
  }

  return null;
}
