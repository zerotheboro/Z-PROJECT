export type Option = {
  value: string;
  label: string;
};

export type SingleQuestion = {
  id: string;
  type: "single";
  question: string;
  options: Option[];
};

export type MultiQuestion = {
  id: string;
  type: "multi";
  question: string;
  options: Option[];
  maxSelections: number;
};

export type LearningSituationQuestion =
  | SingleQuestion
  | MultiQuestion;

export type LearningSituation = {
  goal: string | null;
  difficulties: string[];
  contentTypes: string[];
  currentApproach: string | null;
  sessionLength: string | null;
  learningContext: string | null;
};
export type BaselineTaskResult = {
  score: number;
  correct: number;
  total: number;
  confidence: number | null;
  timeSpentMs: number;
};

export type BaselineResult = {
  memory: BaselineTaskResult;
  understanding: BaselineTaskResult;
};

export const TRAINING_METHOD_IDS = [
  "active-recall",
  "feynman",
  "cornell",
  "interleaving",
  "memory-palace",
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
] as const;

export type TrainingMethodId =
  (typeof TRAINING_METHOD_IDS)[number];

// Pomodoro and stopwatch remain part of MethodId so previously saved
// assessment/profile data keeps the same compatible type surface.
export type MethodId =
  | TrainingMethodId
  | "pomodoro"
  | "stopwatch";

export function isTrainingMethodId(
  method: MethodId
): method is TrainingMethodId {
  return (
    TRAINING_METHOD_IDS as readonly MethodId[]
  ).includes(method);
}

export type MethodCategory =
  | "memory"
  | "understanding"
  | "organization"
  | "problem-solving"
  | "focus";

export type MethodExperimentResult = {
  method: MethodId;
  category: MethodCategory;

  score: number | null;
  correct: number | null;
  total: number | null;

  confidence: number;
  ease: number;
  willingnessToUse: number;

  timeSpentMs: number;
};

export type MethodLabResult = {
  experiments: MethodExperimentResult[];
};

export type MethodMatchExperimentResult = {
  method: MethodId;

  firstScore: number | null;
  verificationScore: number | null;

  confidence: number;

  timeSpentMs: number;
};

export type MethodMatchResult = {
  methods: MethodMatchExperimentResult[];
};

export type ReflectionPriority =
  | "performance"
  | "ease"
  | "confidence"
  | "realistic-use";

export type ReflectionResult = {
  preferredMethod: MethodId | null;

  priority: ReflectionPriority;

  surprisedByResults: boolean | null;

  reflectionText: string;
};

export type MethodIntroductionResult = {
  methods: MethodId[];

  correct: number;
  total: number;
  score: number;
};

export type MethodEvidence = {
  method: MethodId;

  labScore: number | null;
  verificationScore: number | null;

  labConfidence: number;
  verificationConfidence: number | null;

  ease: number;
  willingnessToUse: number;

  // Internal score used to compare methods.
  evidenceScore: number;
};

export type LearningProfile = {
  strongestVerifiedMethod: MethodId | null;

  preferredMethod: MethodId | null;

  recommendedMethods: MethodId[];

  methodEvidence: MethodEvidence[];

  baseline: {
    memoryScore: number;
    understandingScore: number;
  };

  methodKnowledgeScore: number;

  priority: ReflectionPriority;
};
