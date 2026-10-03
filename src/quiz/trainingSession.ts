import {
  isTrainingMethodId
} from "./type";

import type {
  TrainingMethodId
} from "./type";

export const MANUAL_TRAINING_MODE =
  "manual";

export type ManualTrainingState = {
  selectedMethods: TrainingMethodId[];
};

export function readManualTrainingMethods(
  state: unknown
): TrainingMethodId[] | null {
  if (
    !state ||
    typeof state !== "object" ||
    !("selectedMethods" in state)
  ) {
    return null;
  }

  const selectedMethods =
    state.selectedMethods;

  if (
    !Array.isArray(selectedMethods) ||
    selectedMethods.length < 1 ||
    selectedMethods.length > 3 ||
    !selectedMethods.every(
      isTrainingMethodId
    ) ||
    new Set(selectedMethods).size !==
      selectedMethods.length
  ) {
    return null;
  }

  return selectedMethods;
}
