export type ContentRandomSource =
  () => number;

export function selectBaselineContent<T>(
  contentSets: readonly T[],
  random: ContentRandomSource = Math.random
): T {
  if (contentSets.length === 0) {
    throw new Error(
      "Baseline content sets cannot be empty."
    );
  }

  const randomValue = Math.min(
    Math.max(random(), 0),
    1 - Number.EPSILON
  );

  return contentSets[
    Math.floor(
      randomValue * contentSets.length
    )
  ];
}
