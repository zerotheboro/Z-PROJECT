import {
  matchesSelectionSignal,
  methodDefinitions
} from "./methodRegistry";

import type {
  BaselineResult,
  LearningSituation,
  TrainingMethodId
} from "./type";

export function selectMethods(
  situation: LearningSituation,
  baseline: BaselineResult
): TrainingMethodId[] {
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
          signalScore,
        firstSelectionOrder
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.firstSelectionOrder -
          b.firstSelectionOrder
    )
    .slice(0, 4)
    .map(({ method }) => method);
}
