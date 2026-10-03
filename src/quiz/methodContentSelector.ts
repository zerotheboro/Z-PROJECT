export type MethodContentRandomSource =
  () => number;

export type MethodContentSet<Data> = {
  id: string;
  data: Data;
};

export function selectMethodContentSet<
  Data
>(
  contentSets:
    readonly MethodContentSet<Data>[],
  random: MethodContentRandomSource =
    Math.random
): MethodContentSet<Data> {
  if (contentSets.length === 0) {
    throw new Error(
      "Method content sets cannot be empty."
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

export function getMethodContentSet<
  Data
>(
  contentSets:
    readonly MethodContentSet<Data>[],
  contentSetId: string
): MethodContentSet<Data> {
  const contentSet = contentSets.find(
    ({ id }) => id === contentSetId
  );

  if (!contentSet) {
    throw new Error(
      `Unknown method content set: ${contentSetId}`
    );
  }

  return contentSet;
}
