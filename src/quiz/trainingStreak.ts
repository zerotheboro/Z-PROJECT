export type TrainingCompletionMode = "auto" | "manual";

export type TrainingStreakStats = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDay: string | null;
  totalActiveDays: number;
};

export type TrainingStreakState = TrainingStreakStats & {
  completedToday: boolean;
};

export type NextStreakResult = {
  stats: TrainingStreakStats;
  isNewDay: boolean;
};

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CALENDAR_DAY_MS = 86_400_000;

export const EMPTY_TRAINING_STREAK: TrainingStreakStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDay: null,
  totalActiveDays: 0
};

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat()
      .resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getLocalDayKey(
  date = new Date(),
  timeZone = getBrowserTimeZone()
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function dayKeyAsUtc(dayKey: string): number {
  const match = DAY_KEY_PATTERN.exec(dayKey);

  if (!match) {
    throw new Error(`Invalid calendar day key: ${dayKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day);
  const parsed = new Date(value);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar day key: ${dayKey}`);
  }

  return value;
}

export function daysBetweenDayKeys(
  earlierDay: string,
  laterDay: string
): number {
  return (
    dayKeyAsUtc(laterDay) - dayKeyAsUtc(earlierDay)
  ) / CALENDAR_DAY_MS;
}

export function calculateNextStreak(
  previous: TrainingStreakStats,
  completedDay: string
): NextStreakResult {
  dayKeyAsUtc(completedDay);

  if (previous.lastCompletedDay === completedDay) {
    return {
      stats: { ...previous },
      isNewDay: false
    };
  }

  const consecutive = previous.lastCompletedDay !== null &&
    daysBetweenDayKeys(
      previous.lastCompletedDay,
      completedDay
    ) === 1;
  const currentStreak = consecutive
    ? previous.currentStreak + 1
    : 1;

  return {
    stats: {
      currentStreak,
      longestStreak: Math.max(
        previous.longestStreak,
        currentStreak
      ),
      lastCompletedDay: completedDay,
      totalActiveDays: previous.totalActiveDays + 1
    },
    isNewDay: true
  };
}

export function getEffectiveCurrentStreak(
  stats: TrainingStreakStats,
  today: string
): number {
  if (!stats.lastCompletedDay) {
    return 0;
  }

  const gap = daysBetweenDayKeys(
    stats.lastCompletedDay,
    today
  );

  return gap === 0 || gap === 1
    ? stats.currentStreak
    : 0;
}
