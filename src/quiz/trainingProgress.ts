import {
  TRAINING_METHOD_IDS,
  isTrainingMethodId
} from "./type";
import {
  baselineConceptContentSets,
  baselineMemoryContentSets
} from "./assessmentData";
import {
  getMethodDefinition
} from "./methodRegistry";
import {
  validateTrainingDraftSemantics
} from "./trainingDraftValidation";

import type {
  BaselineResult,
  LearningProfile,
  LearningSituation,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult,
  TrainingMethodId
} from "./type";

export const TRAINING_DRAFT_SCHEMA_VERSION = 1;
export const TRAINING_DRAFT_LOCAL_PREFIX =
  "edulience.training-progress.v1";

export type TrainingMode = "auto" | "manual";

export type TrainingPhase =
  | "situation"
  | "baseline"
  | "introduction"
  | "lab"
  | "match"
  | "reflection"
  | "final-save";

export type TrainingDraftOwner =
  | {
      kind: "guest";
    }
  | {
      kind: "user";
      uid: string;
    };

export type ResumableScopeState = {
  slots: unknown[];
  named: Record<string, unknown>;
};

export type TrainingInternalState =
  Record<string, ResumableScopeState>;

export type TrainingDraft = {
  schemaVersion: typeof TRAINING_DRAFT_SCHEMA_VERSION;
  sessionId: string;
  owner: TrainingDraftOwner;
  mode: TrainingMode;
  phase: TrainingPhase;
  section: number;
  selectedMethods: TrainingMethodId[];
  currentMethod: TrainingMethodId | null;
  currentMethodIndex: number | null;
  baselineContentSetIds: {
    memory: string | null;
    understanding: string | null;
  };
  labContentSetIds: string[];
  matchContentSetIds: string[];
  verificationMethodOrder: TrainingMethodId[];
  completed: {
    learningSituation: LearningSituation | null;
    baseline: BaselineResult | null;
    methodIntroduction: MethodIntroductionResult | null;
    methodLab: MethodLabResult | null;
    methodMatch: MethodMatchResult | null;
    reflection: ReflectionResult | null;
    learningProfile: LearningProfile | null;
  };
  internalState: TrainingInternalState;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type DraftValidation =
  | {
      valid: true;
      draft: TrainingDraft;
    }
  | {
      valid: false;
      reason: string;
    };

const VALID_PHASES: readonly TrainingPhase[] = [
  "situation",
  "baseline",
  "introduction",
  "lab",
  "match",
  "reflection",
  "final-save"
];

export function createSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2)
  ].join("-");
}

export function createTrainingDraft({
  owner,
  mode,
  selectedMethods = []
}: {
  owner: TrainingDraftOwner;
  mode: TrainingMode;
  selectedMethods?: TrainingMethodId[];
}): TrainingDraft {
  const now = new Date().toISOString();

  return {
    schemaVersion: TRAINING_DRAFT_SCHEMA_VERSION,
    sessionId: createSessionId(),
    owner,
    mode,
    phase: mode === "manual"
      ? "introduction"
      : "situation",
    section: mode === "manual" ? 3 : 1,
    selectedMethods: [...selectedMethods],
    currentMethod: selectedMethods[0] ?? null,
    currentMethodIndex:
      selectedMethods.length > 0 ? 0 : null,
    baselineContentSetIds: {
      memory: null,
      understanding: null
    },
    labContentSetIds: [],
    matchContentSetIds: [],
    verificationMethodOrder: [],
    completed: {
      learningSituation: null,
      baseline: null,
      methodIntroduction: null,
      methodLab: null,
      methodMatch: null,
      reflection: null,
      learningProfile: null
    },
    internalState: {},
    createdAt: now,
    updatedAt: now,
    revision: 0
  };
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isOwner(
  value: unknown
): value is TrainingDraftOwner {
  if (!isRecord(value)) {
    return false;
  }

  if (value.kind === "guest") {
    return Object.keys(value).length === 1;
  }

  return (
    value.kind === "user" &&
    typeof value.uid === "string" &&
    value.uid.length > 0 &&
    value.uid.length <= 128 &&
    Object.keys(value).length === 2
  );
}

function hasKnownMethods(
  value: unknown,
  maximum = TRAINING_METHOD_IDS.length
): value is TrainingMethodId[] {
  return (
    Array.isArray(value) &&
    value.length <= maximum &&
    value.every(isTrainingMethodId) &&
    new Set(value).size === value.length
  );
}

export function validateTrainingDraft(
  value: unknown,
  expectedOwner?: TrainingDraftOwner
): DraftValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      reason: "The saved training data is not readable."
    };
  }

  if (
    value.schemaVersion !==
    TRAINING_DRAFT_SCHEMA_VERSION
  ) {
    return {
      valid: false,
      reason:
        "This saved training session was created by an incompatible version of Edulience."
    };
  }

  if (
    typeof value.sessionId !== "string" ||
    value.sessionId.length < 8 ||
    value.sessionId.length > 200 ||
    value.sessionId.trim() !== value.sessionId ||
    !isOwner(value.owner)
  ) {
    return {
      valid: false,
      reason: "The saved training session is missing its identity."
    };
  }

  if (expectedOwner) {
    const sameOwner =
      value.owner.kind === expectedOwner.kind &&
      (value.owner.kind === "guest" ||
        (expectedOwner.kind === "user" &&
          value.owner.uid === expectedOwner.uid));

    if (!sameOwner) {
      return {
        valid: false,
        reason:
          "This saved training session belongs to a different account."
      };
    }
  }

  if (
    value.mode !== "auto" &&
    value.mode !== "manual"
  ) {
    return {
      valid: false,
      reason: "The saved training mode is invalid."
    };
  }

  if (
    !VALID_PHASES.includes(
      value.phase as TrainingPhase
    ) ||
    typeof value.section !== "number" ||
    !Number.isInteger(value.section) ||
    value.section < 1 ||
    value.section > 6
  ) {
    return {
      valid: false,
      reason: "The saved training phase is invalid."
    };
  }

  if (
    !hasKnownMethods(value.selectedMethods) ||
    (value.mode === "manual" &&
      (value.selectedMethods.length < 1 ||
        value.selectedMethods.length > 3)) ||
    !hasKnownMethods(value.verificationMethodOrder)
  ) {
    return {
      valid: false,
      reason:
        "The saved session contains an unknown or invalid learning method."
    };
  }

  if (
    value.currentMethod !== null &&
    !isTrainingMethodId(value.currentMethod)
  ) {
    return {
      valid: false,
      reason: "The current saved method is no longer available."
    };
  }

  if (
    value.currentMethodIndex !== null &&
    (!Number.isInteger(value.currentMethodIndex) ||
      (value.currentMethodIndex as number) < 0)
  ) {
    return {
      valid: false,
      reason: "The saved method position is invalid."
    };
  }

  if (
    !isRecord(value.baselineContentSetIds) ||
    Object.keys(value.baselineContentSetIds).length !== 2 ||
    !("memory" in value.baselineContentSetIds) ||
    !("understanding" in value.baselineContentSetIds) ||
    !Array.isArray(value.labContentSetIds) ||
    !value.labContentSetIds.every(
      item => typeof item === "string"
    ) ||
    !Array.isArray(value.matchContentSetIds) ||
    !value.matchContentSetIds.every(
      item => typeof item === "string"
    ) ||
    !isRecord(value.completed) ||
    !isRecord(value.internalState) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    return {
      valid: false,
      reason: "The saved training data is incomplete."
    };
  }

  const baselineIds = value.baselineContentSetIds;
  const validBaselineId = (
    candidate: unknown,
    available: readonly { id: string }[]
  ) => candidate === null || (
    typeof candidate === "string" &&
    available.some(({ id }) => id === candidate)
  );

  if (
    !validBaselineId(
      baselineIds.memory,
      baselineMemoryContentSets
    ) ||
    !validBaselineId(
      baselineIds.understanding,
      baselineConceptContentSets
    )
  ) {
    return {
      valid: false,
      reason:
        "The saved Baseline material is no longer available."
    };
  }

  const selectedMethods = value.selectedMethods;
  const labIds = value.labContentSetIds;
  if (
    labIds.length > 0 &&
    (labIds.length !== selectedMethods.length ||
      labIds.some((id, index) =>
        !getMethodDefinition(
          selectedMethods[index]
        ).labContentSetIds.includes(id)
      ))
  ) {
    return {
      valid: false,
      reason:
        "The saved Method Lab material is no longer available."
    };
  }

  const verificationMethods =
    value.verificationMethodOrder;
  const matchIds = value.matchContentSetIds;
  if (
    matchIds.length > 0 &&
    (matchIds.length !== verificationMethods.length ||
      matchIds.some((id, index) =>
        !getMethodDefinition(
          verificationMethods[index]
        ).matchContentSetIds.includes(id)
      ))
  ) {
    return {
      valid: false,
      reason:
        "The saved Method Match material is no longer available."
    };
  }

  const semanticError =
    validateTrainingDraftSemantics(value);

  if (semanticError) {
    return {
      valid: false,
      reason: semanticError
    };
  }

  return {
    valid: true,
    draft: value as TrainingDraft
  };
}

export function getTrainingProgressLabel(
  draft: TrainingDraft
): {
  title: string;
  progress: string;
} {
  const automaticPhases = [
    "situation",
    "baseline",
    "introduction",
    "lab",
    "match",
    "reflection"
  ] as const;
  const manualPhases = [
    "introduction",
    "lab",
    "match",
    "reflection"
  ] as const;
  const phases = draft.mode === "manual"
    ? manualPhases
    : automaticPhases;
  const phaseIndex = Math.max(
    0,
    (phases as readonly string[]).indexOf(
      draft.phase === "final-save"
        ? "reflection"
        : draft.phase
    )
  );
  const phaseNames: Record<TrainingPhase, string> = {
    situation: "Learning Situation",
    baseline: "Baseline",
    introduction: "Method Introduction",
    lab: "Method Lab",
    match: "Method Match",
    reflection: "Reflection",
    "final-save": "Saving completed assessment"
  };

  return {
    title: draft.currentMethod
      ? `${draft.currentMethod} · ${phaseNames[draft.phase]}`
      : phaseNames[draft.phase],
    progress:
      `Current step ${phaseIndex + 1} of ${phases.length}`
  };
}

export function getGuestDraftStorageKey(): string {
  return `${TRAINING_DRAFT_LOCAL_PREFIX}.guest`;
}

export function getUserRecoveryStorageKey(
  uid: string,
  sessionId = "active"
): string {
  return `${TRAINING_DRAFT_LOCAL_PREFIX}.user.${uid}.${sessionId}`;
}
