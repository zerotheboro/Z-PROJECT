import type {
  LearningSituation,
  BaselineResult,
  MethodId
} from "./type";

export function selectMethods(
  situation: LearningSituation,
  baseline: BaselineResult
): MethodId[] {

  const scores = new Map<MethodId, number>();

  function add(
    method: MethodId,
    score: number
  ) {
    scores.set(
      method,
      (scores.get(method) ?? 0) + score
    );
  }

  // =================================
  // SECTION 1: USER DIFFICULTIES
  // =================================

  if (
    situation.difficulties.includes(
      "forgetting"
    )
  ) {
    add("active-recall", 5);
    add("memory-palace", 4);
  }

  if (
    situation.difficulties.includes(
      "understanding"
    )
  ) {
    add("feynman", 5);
    add("cornell", 2);
  }

  if (
    situation.difficulties.includes(
      "prioritization"
    )
  ) {
    add("cornell", 5);
  }

  if (
    situation.difficulties.includes(
      "application"
    )
  ) {
    add("interleaving", 5);
  }

  // =================================
  // CONTENT TYPES
  // =================================

  if (
    situation.contentTypes.includes(
      "facts"
    )
  ) {
    add("active-recall", 4);
    add("memory-palace", 3);
  }

  if (
    situation.contentTypes.includes(
      "concepts"
    )
  ) {
    add("feynman", 4);
  }

  if (
    situation.contentTypes.includes(
      "reading"
    )
  ) {
    add("cornell", 4);
  }

  if (
    situation.contentTypes.includes(
      "problems"
    )
  ) {
    add("interleaving", 5);
  }

  if (
    situation.contentTypes.includes(
      "essays"
    )
  ) {
    add("cornell", 3);
    add("feynman", 2);
  }

  // =================================
  // BASELINE
  // =================================

  if (baseline.memory.score < 0.7) {
    add("active-recall", 4);
    add("memory-palace", 3);
  }

  if (
    baseline.understanding.score < 0.7
  ) {
    add("feynman", 4);
    add("cornell", 2);
  }

  // =================================
  // DEFAULT VARIETY
  // =================================

  add("active-recall", 1);
  add("feynman", 1);
  add("cornell", 1);
  add("interleaving", 1);
  add("memory-palace", 1);

  const ranked = [...scores.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([method]) => method
    );

  // Start with top methods
  const selected =
    ranked.slice(0, 4);

  return selected;
}