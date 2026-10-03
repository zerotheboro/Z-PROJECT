import type {
  MethodCategory,
  MethodExperimentResult,
  MethodMatchExperimentResult,
  TrainingMethodId
} from "./type";

export type MultipleChoiceQuestion = {
  id: string;
  question: string;
  options: readonly string[];
  correct: string;
};

export type RecallEngineData = {
  title: string;
  topic: string;
  studyTime?: number;
  retrievalTime?: number;
  facts: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type ExplanationEngineData = {
  title: string;
  topic: string;
  studyTime?: number;
  explanation: string;
  questions: readonly MultipleChoiceQuestion[];
};

export type OrganizationEngineData = {
  title: string;
  topic: string;
  content: string;
  questions: readonly MultipleChoiceQuestion[];
};

export type ComparisonEngineData = {
  title: string;
  instructions: readonly {
    type: string;
    name: string;
    rule: string;
    example: string;
  }[];
  practice: readonly MultipleChoiceQuestion[];
  test: readonly MultipleChoiceQuestion[];
};

export type SpatialMemoryEngineData = {
  title: string;
  locations: readonly string[];
  pairings: readonly {
    location: string;
    item: string;
  }[];
  questions: readonly MultipleChoiceQuestion[];
};

export type LeitnerEngineData = {
  title: string;
  topic: string;
  cards: readonly {
    id: string;
    front: string;
    back: string;
  }[];
  practice: readonly MultipleChoiceQuestion[];
  test: readonly MultipleChoiceQuestion[];
};

export type StoryTellingEngineData = {
  title: string;
  topic: string;
  orderedItems: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type CaptureCreateEngineData = {
  title: string;
  topic: string;
  content: string;
  questions: readonly MultipleChoiceQuestion[];
};

export type AbbreviationEngineData = {
  title: string;
  topic: string;
  items: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type HeaderFirstEngineData = {
  title: string;
  topic: string;
  sections: readonly {
    heading: string;
    content: string;
  }[];
  questions: readonly MultipleChoiceQuestion[];
};

export type PrimeQuestionEngineData = {
  title: string;
  topic: string;
  guidingQuestion: string;
  material: string;
  questions: readonly MultipleChoiceQuestion[];
};

export type DoodleEffectEngineData = {
  title: string;
  topic: string;
  material: string;
  relationships: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type EightyTwentyEngineData = {
  title: string;
  topic: string;
  details: readonly string[];
  coreConcepts: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type DivideStepsEngineData = {
  title: string;
  topic: string;
  overview: string;
  referenceSteps: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type DeriveBasicsEngineData = {
  title: string;
  topic: string;
  prompt: string;
  source: string;
  basicPrinciples: readonly string[];
  questions: readonly MultipleChoiceQuestion[];
};

export type KidlinRuleEngineData = { title: string; topic: string; vagueProblem: string; context: string; questions: readonly MultipleChoiceQuestion[]; };
export type PremackPrincipleEngineData = { title: string; topic: string; task: string; material: string; preferredExamples: readonly string[]; questions: readonly MultipleChoiceQuestion[]; };
export type WallStareEngineData = { title: string; topic: string; material: string; questions: readonly MultipleChoiceQuestion[]; };
export type StrooperEngineData = { title: string; topic: string; material: string; colors: { name: string; hsla: string }[]; questions: readonly MultipleChoiceQuestion[]; };
export type TwoXVideoEngineData = { title: string; topic: string; mediaSrc: string; focusPoints: readonly string[]; questions: readonly MultipleChoiceQuestion[]; };

export type LabEngineProps<Data> = {
  method: TrainingMethodId;
  category: MethodCategory;
  name: string;
  data: Data;
  onComplete: (
    result: MethodExperimentResult
  ) => void;
};

export type MatchEngineProps<Data> = {
  method: TrainingMethodId;
  name: string;
  shortName?: string;
  data: Data;
  originalScore: number | null;
  onComplete: (
    result: MethodMatchExperimentResult
  ) => void;
};
