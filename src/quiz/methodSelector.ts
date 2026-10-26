import {
  matchesSelectionSignal,
  methodDefinitions
} from "./methodRegistry";

import type {
  BaselineResult,
  LearningSituation,
  TrainingMethodId
} from "./type";
import { isTrainingMethodId } from "./type";

// The current registry's largest attainable base score is 17 (Cornell).
// Fifteen points on a 0-100 scale are therefore 2.55 selector units.
export const AI_RECOMMENDATION_BONUS = 17 * 0.15;

export function rankMethodsForSelection(
  situation: LearningSituation,
  baseline: BaselineResult,
  aiRecommendedMethods: readonly TrainingMethodId[] = []
) {
  const recommended = new Set(
    aiRecommendedMethods.filter(isTrainingMethodId)
  );

  return methodDefinitions
    .map((definition) => {
      const signalScore =
        definition.selectionSignals.reduce(
          (score, signal) =>
            matchesSelectionSignal(
              signal,
              situation,
              baseline
            )
              ? score + signal.weight
              : score,
          0
        );

      const firstSelectionOrder =
        definition.selectionSignals
          .filter((signal) =>
            matchesSelectionSignal(
              signal,
              situation,
              baseline
            )
          )
          .reduce(
            (order, signal) =>
              Math.min(
                order,
                signal.selectionOrder
              ),
            definition.defaultSelectionOrder
          );

      return {
        method: definition.id,
        score:
          definition.defaultSelectionWeight +
          signalScore +
          (recommended.has(definition.id)
            ? AI_RECOMMENDATION_BONUS
            : 0),
        firstSelectionOrder
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.firstSelectionOrder -
          b.firstSelectionOrder
    );
}

export function selectMethods(
  situation: LearningSituation,
  baseline: BaselineResult,
  aiRecommendedMethods: readonly TrainingMethodId[] = []
): TrainingMethodId[] {
  const hasUsableAIContext =
    aiRecommendedMethods.some(isTrainingMethodId);

  return rankMethodsForSelection(
    situation,
    baseline,
    aiRecommendedMethods
  )
    .slice(0, hasUsableAIContext ? 3 : 4)
    .map(({ method }) => method);
}
