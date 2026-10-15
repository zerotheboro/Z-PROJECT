export const ADAPTIVE_DIFFICULTY_LEVELS = [
  "easy",
  "medium",
  "hard"
] as const;

export type AdaptiveDifficulty =
  (typeof ADAPTIVE_DIFFICULTY_LEVELS)[number];

export type AdaptiveDifficultyState = {
  level: AdaptiveDifficulty;
  recentPerformance: number[];
  processedEventIds: string[];
  challengeLevels: Record<
    string,
    AdaptiveDifficulty
  >;
};

export type ObjectivePerformance = {
  correct: number;
  total: number;
};

export const DEFAULT_ADAPTIVE_DIFFICULTY:
  AdaptiveDifficulty = "medium";
export const ADAPTIVE_PERFORMANCE_WINDOW_SIZE = 3;
export const STRONG_PERFORMANCE_THRESHOLD = 1;
export const WEAK_PERFORMANCE_THRESHOLD = 1 / 3;
export const MAX_ADAPTIVE_EVENTS = 512;

export function createAdaptiveDifficultyState():
  AdaptiveDifficultyState {
  return {
    level: DEFAULT_ADAPTIVE_DIFFICULTY,
    recentPerformance: [],
    processedEventIds: [],
    challengeLevels: {}
  };
}

export function isAdaptiveDifficulty(
  value: unknown
): value is AdaptiveDifficulty {
  return (
    ADAPTIVE_DIFFICULTY_LEVELS as
      readonly unknown[]
  ).includes(value);
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

function isValidEventId(value: unknown):
  value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 500
  );
}

export function isAdaptiveDifficultyState(
  value: unknown
): value is AdaptiveDifficultyState {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  const recentPerformance =
    value.recentPerformance;
  const processedEventIds =
    value.processedEventIds;
  const challengeLevels =
    value.challengeLevels;

  return (
    keys.length === 4 &&
    keys.every(key => [
      "level",
      "recentPerformance",
      "processedEventIds",
      "challengeLevels"
    ].includes(key)) &&
    isAdaptiveDifficulty(value.level) &&
    Array.isArray(recentPerformance) &&
    recentPerformance.length <
      ADAPTIVE_PERFORMANCE_WINDOW_SIZE &&
    recentPerformance.every(item =>
      typeof item === "number" &&
      Number.isFinite(item) &&
      item >= 0 &&
      item <= 1
    ) &&
    Array.isArray(processedEventIds) &&
    processedEventIds.length <=
      MAX_ADAPTIVE_EVENTS &&
    processedEventIds.every(isValidEventId) &&
    new Set(processedEventIds).size ===
      processedEventIds.length &&
    isRecord(challengeLevels) &&
    Object.keys(challengeLevels).length <=
      MAX_ADAPTIVE_EVENTS &&
    Object.entries(challengeLevels).every(
      ([eventId, level]) =>
        isValidEventId(eventId) &&
        isAdaptiveDifficulty(level)
    )
  );
}

export function normalizeObjectivePerformance({
  correct,
  total
}: ObjectivePerformance): number | null {
  if (
    !Number.isInteger(correct) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    correct < 0 ||
    correct > total
  ) {
    return null;
  }

  return correct / total;
}

function moveDifficulty(
  level: AdaptiveDifficulty,
  direction: -1 | 1
): AdaptiveDifficulty {
  const index =
    ADAPTIVE_DIFFICULTY_LEVELS.indexOf(level);
  const nextIndex = Math.min(
    ADAPTIVE_DIFFICULTY_LEVELS.length - 1,
    Math.max(0, index + direction)
  );

  return ADAPTIVE_DIFFICULTY_LEVELS[
    nextIndex
  ];
}

export function assignChallengeDifficulty(
  state: AdaptiveDifficultyState,
  eventId: string
): AdaptiveDifficultyState {
  if (
    state.challengeLevels[eventId] ||
    !isValidEventId(eventId) ||
    Object.keys(state.challengeLevels).length >=
      MAX_ADAPTIVE_EVENTS
  ) {
    return state;
  }

  return {
    ...state,
    challengeLevels: {
      ...state.challengeLevels,
      [eventId]: state.level
    }
  };
}

export function recordAdaptivePerformance(
  state: AdaptiveDifficultyState,
  eventId: string,
  performance: ObjectivePerformance
): AdaptiveDifficultyState {
  if (
    state.processedEventIds.includes(eventId) ||
    state.processedEventIds.length >=
      MAX_ADAPTIVE_EVENTS ||
    !isValidEventId(eventId)
  ) {
    return state;
  }

  const normalized =
    normalizeObjectivePerformance(performance);

  if (normalized === null) {
    return state;
  }

  const assigned = assignChallengeDifficulty(
    state,
    eventId
  );
  const recentPerformance = [
    ...assigned.recentPerformance,
    normalized
  ];
  const processedEventIds = [
    ...assigned.processedEventIds,
    eventId
  ];

  if (
    recentPerformance.length <
      ADAPTIVE_PERFORMANCE_WINDOW_SIZE
  ) {
    return {
      ...assigned,
      recentPerformance,
      processedEventIds
    };
  }

  const average =
    recentPerformance.reduce(
      (total, score) => total + score,
      0
    ) / recentPerformance.length;

  const level =
    average >= STRONG_PERFORMANCE_THRESHOLD
      ? moveDifficulty(assigned.level, 1)
      : average <= WEAK_PERFORMANCE_THRESHOLD
        ? moveDifficulty(assigned.level, -1)
        : assigned.level;

  return {
    ...assigned,
    level,
    recentPerformance: [],
    processedEventIds
  };
}

export function optionsForDifficulty(
  options: readonly string[],
  correctAnswer: string,
  difficulty: AdaptiveDifficulty | null
): string[] {
  if (difficulty === null) {
    return [...options];
  }

  const targetCount = difficulty === "easy"
    ? 2
    : difficulty === "medium"
      ? 3
      : options.length;

  if (
    targetCount >= options.length ||
    !options.includes(correctAnswer)
  ) {
    return [...options];
  }

  const retained = new Set([
    correctAnswer,
    ...options
      .filter(option => option !== correctAnswer)
      .slice(0, targetCount - 1)
  ]);

  return options.filter(option =>
    retained.has(option)
  );
}
