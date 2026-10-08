import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase";

export const AI_RECOMMENDATION_SCHEMA_VERSION = 1;
export const GUEST_AI_RECOMMENDATION_STORAGE_KEY =
  "edulience.aiRecommendation.latest.v1";
export const AI_RECOMMENDATION_CLOUD_PATH =
  "users/{uid}/aiRecommendations/latest";

const INPUT_LIMITS = {
  biggestProblem: 300,
  methodQuestion: 300,
  extraContext: 1000
} as const;

const RESULT_LIMITS = {
  userProblem: 2000,
  methodName: 160,
  methodBranch: 160,
  methodReason: 2000,
  methodWarning: 2000,
  studyPlan: 5000,
  finalNote: 3000
} as const;

export type AIRecommendationOwner =
  | { kind: "guest" }
  | { kind: "user"; uid: string };

export type AIRecommendationInputs = {
  biggestProblem: string;
  methodQuestion: string;
  extraContext: string;
};

export type AIRecommendedMethod = {
  name: string;
  branch: string;
  reason: string;
  warning: string;
};

export type AIRecommendationResult = {
  user_problem: string;
  recommended_methods: AIRecommendedMethod[];
  study_plan: string;
  final_note: string;
};

export type SavedAIRecommendation = {
  schemaVersion: typeof AI_RECOMMENDATION_SCHEMA_VERSION;
  inputs: AIRecommendationInputs;
  result: AIRecommendationResult;
  updatedAt: unknown;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  maxLength: number
): value is string {
  return typeof value === "string"
    && value.length <= maxLength;
}

function isCloudTimestamp(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.seconds === "number"
    && typeof value.nanoseconds === "number";
}

export function validateRecommendationInputs(
  value: unknown
): AIRecommendationInputs | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    biggestProblem,
    methodQuestion,
    extraContext
  } = value;

  if (
    !boundedString(
      biggestProblem,
      INPUT_LIMITS.biggestProblem
    )
    || !boundedString(
      methodQuestion,
      INPUT_LIMITS.methodQuestion
    )
    || !boundedString(
      extraContext,
      INPUT_LIMITS.extraContext
    )
  ) {
    return null;
  }

  return {
    biggestProblem,
    methodQuestion,
    extraContext
  };
}

function validateRecommendedMethod(
  value: unknown
): AIRecommendedMethod | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    name,
    branch,
    reason,
    warning
  } = value;

  if (
    !boundedString(name, RESULT_LIMITS.methodName)
    || !boundedString(branch, RESULT_LIMITS.methodBranch)
    || !boundedString(reason, RESULT_LIMITS.methodReason)
    || !boundedString(warning, RESULT_LIMITS.methodWarning)
  ) {
    return null;
  }

  return { name, branch, reason, warning };
}

export function validateRecommendationResult(
  value: unknown
): AIRecommendationResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const methods = value.recommended_methods;

  if (
    !boundedString(
      value.user_problem,
      RESULT_LIMITS.userProblem
    )
    || !Array.isArray(methods)
    || methods.length < 1
    || methods.length > 3
    || !boundedString(
      value.study_plan,
      RESULT_LIMITS.studyPlan
    )
    || !boundedString(
      value.final_note,
      RESULT_LIMITS.finalNote
    )
  ) {
    return null;
  }

  const validatedMethods = methods.map(
    validateRecommendedMethod
  );

  if (validatedMethods.some(method => method === null)) {
    return null;
  }

  return {
    user_problem: value.user_problem,
    recommended_methods:
      validatedMethods as AIRecommendedMethod[],
    study_plan: value.study_plan,
    final_note: value.final_note
  };
}

function validateSavedRecommendation(
  value: unknown,
  source: "cloud" | "guest"
): SavedAIRecommendation | null {
  if (
    !isRecord(value)
    || value.schemaVersion
      !== AI_RECOMMENDATION_SCHEMA_VERSION
  ) {
    return null;
  }

  const inputs = validateRecommendationInputs(
    value.inputs
  );
  const result = validateRecommendationResult(
    value.result
  );
  const hasValidTimestamp = source === "guest"
    ? typeof value.updatedAt === "string"
      && Number.isFinite(Date.parse(value.updatedAt))
    : isCloudTimestamp(value.updatedAt);

  if (!inputs || !result || !hasValidTimestamp) {
    return null;
  }

  return {
    schemaVersion: AI_RECOMMENDATION_SCHEMA_VERSION,
    inputs,
    result,
    updatedAt: value.updatedAt
  };
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.localStorage;
  } catch {
    return null;
  }
}

function cloudRef(uid: string) {
  return doc(
    db,
    "users",
    uid,
    "aiRecommendations",
    "latest"
  );
}

export function loadGuestAIRecommendation():
  SavedAIRecommendation | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(
      GUEST_AI_RECOMMENDATION_STORAGE_KEY
    );

    return raw
      ? validateSavedRecommendation(
          JSON.parse(raw) as unknown,
          "guest"
        )
      : null;
  } catch {
    return null;
  }
}

export async function loadAIRecommendation(
  owner: AIRecommendationOwner
): Promise<SavedAIRecommendation | null> {
  if (owner.kind === "guest") {
    return loadGuestAIRecommendation();
  }

  const snapshot = await getDoc(cloudRef(owner.uid));

  if (!snapshot.exists()) {
    return null;
  }

  return validateSavedRecommendation(
    snapshot.data(),
    "cloud"
  );
}

export async function saveAIRecommendation(
  owner: AIRecommendationOwner,
  inputsValue: AIRecommendationInputs,
  resultValue: AIRecommendationResult
): Promise<void> {
  const inputs = validateRecommendationInputs(inputsValue);
  const result = validateRecommendationResult(resultValue);

  if (!inputs || !result) {
    throw new Error(
      "Invalid AI recommendation persistence payload."
    );
  }

  if (owner.kind === "guest") {
    const storage = getStorage();

    if (!storage) {
      throw new Error("Browser storage is unavailable.");
    }

    storage.setItem(
      GUEST_AI_RECOMMENDATION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: AI_RECOMMENDATION_SCHEMA_VERSION,
        inputs,
        result,
        updatedAt: new Date().toISOString()
      })
    );
    return;
  }

  await setDoc(cloudRef(owner.uid), {
    schemaVersion: AI_RECOMMENDATION_SCHEMA_VERSION,
    inputs,
    result,
    updatedAt: serverTimestamp()
  });
}
