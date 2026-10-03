import {
  useResumableNamedRecord
} from "../../trainingProgressState";

export type RandomSource =
  () => number;

export function shuffleOptions<T>(
  options: readonly T[],
  random: RandomSource = Math.random
): T[] {
  const shuffled = [...options];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = Math.floor(
      random() * (index + 1)
    );

    [
      shuffled[index],
      shuffled[swapIndex]
    ] = [
      shuffled[swapIndex],
      shuffled[index]
    ];
  }

  return shuffled;
}

export function useShuffledOptions<T>(
  options: readonly T[],
  questionKey: string,
  random: RandomSource = Math.random
): T[] {
  const optionOrders =
    useResumableNamedRecord<T[]>(
      "answer-option-orders"
    );

  const existingOrder =
    optionOrders.get(questionKey);

  if (existingOrder) {
    return existingOrder;
  }

  const shuffled = shuffleOptions(
    options,
    random
  );

  optionOrders.set(questionKey, shuffled);

  return shuffled;
}
