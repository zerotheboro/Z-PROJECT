import {
  isTrainingMethodId
} from "./type";

import type {
  TrainingMethodId
} from "./type";

export type WritingJudgeVerdict =
  | "weak"
  | "okay"
  | "strong";

export type WritingJudgeResult = {
  score: number;
  accuracy: number;
  coverage: number;
  clarity: number;
  strengths: string[];
  missingPoints: string[];
  misconceptions: string[];
  verdict: WritingJudgeVerdict;
  nextAction: string;
};

export type PersistedWritingJudgeResult = {
  methodId: TrainingMethodId;
  taskId: string;
  userWriting: string;
  result: WritingJudgeResult;
};

export type WritingJudgeState = Record<
  string,
  PersistedWritingJudgeResult
>;

export const MAX_WRITING_JUDGE_RESULTS = 128;
export const MAX_WRITING_JUDGE_WRITING_LENGTH =
  4_000;
const MAX_TASK_ID_LENGTH = 200;
const MAX_EVENT_ID_LENGTH = 500;
const MAX_FEEDBACK_ITEMS = 5;
const MAX_FEEDBACK_ITEM_LENGTH = 240;
const MAX_NEXT_ACTION_LENGTH = 400;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every(key => key in value)
  );
}

function isScore(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 100
  );
}

function isBoundedText(
  value: unknown,
  maximum: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function isFeedbackList(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_FEEDBACK_ITEMS &&
    value.every(item =>
      isBoundedText(
        item,
        MAX_FEEDBACK_ITEM_LENGTH
      )
    )
  );
}

export function isWritingJudgeResult(
  value: unknown
): value is WritingJudgeResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasExactKeys(value, [
      "score",
      "accuracy",
      "coverage",
      "clarity",
      "strengths",
      "missingPoints",
      "misconceptions",
      "verdict",
      "nextAction"
    ]) &&
    isScore(value.score) &&
    isScore(value.accuracy) &&
    isScore(value.coverage) &&
    isScore(value.clarity) &&
    isFeedbackList(value.strengths) &&
    isFeedbackList(value.missingPoints) &&
    isFeedbackList(value.misconceptions) &&
    (
      value.verdict === "weak" ||
      value.verdict === "okay" ||
      value.verdict === "strong"
    ) &&
    isBoundedText(
      value.nextAction,
      MAX_NEXT_ACTION_LENGTH
    )
  );
}

export function isWritingJudgeState(
  value: unknown
): value is WritingJudgeState {
  if (!isRecord(value)) {
    return false;
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_WRITING_JUDGE_RESULTS) {
    return false;
  }

  return entries.every(([eventId, record]) => {
    if (
      !isBoundedText(eventId, MAX_EVENT_ID_LENGTH) ||
      !isRecord(record) ||
      !hasExactKeys(record, [
        "methodId",
        "taskId",
        "userWriting",
        "result"
      ])
    ) {
      return false;
    }

    return (
      isTrainingMethodId(record.methodId) &&
      isBoundedText(
        record.taskId,
        MAX_TASK_ID_LENGTH
      ) &&
      isBoundedText(
        record.userWriting,
        MAX_WRITING_JUDGE_WRITING_LENGTH
      ) &&
      isWritingJudgeResult(record.result)
    );
  });
}

export function createWritingJudgeState():
  WritingJudgeState {
  return {};
}
