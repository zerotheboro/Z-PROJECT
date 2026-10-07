import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";
import {
  calculateNextStreak,
  daysBetweenDayKeys,
  EMPTY_TRAINING_STREAK,
  getBrowserTimeZone,
  getEffectiveCurrentStreak,
  getLocalDayKey
} from "../quiz/trainingStreak";

import type {
  TrainingCompletionMode,
  TrainingStreakState,
  TrainingStreakStats
} from "../quiz/trainingStreak";
import type {
  TrainingDraftOwner
} from "../quiz/trainingProgress";
import type {
  TrainingMethodId
} from "../quiz/type";

export const GUEST_TRAINING_STREAK_STORAGE_KEY =
  "edulience.training-streak.v1.guest";
export const TRAINING_ACTIVITY_CLOUD_PATH =
  "users/{uid}/trainingActivity/{YYYY-MM-DD}";
export const TRAINING_STREAK_CLOUD_PATH =
  "users/{uid}/trainingStats/streak";

type CalendarContext = {
  now?: Date;
  timeZone?: string;
};

type CompletionInput = {
  owner: TrainingDraftOwner;
  sessionId: string;
  mode: TrainingCompletionMode;
  methodIds: TrainingMethodId[];
};

type ActivityRecord = {
  dayKey: string;
  firstSessionId: string;
  firstMode: TrainingCompletionMode;
  methodIds: TrainingMethodId[];
  timezone: string;
};

type GuestStreakRecord = {
  schemaVersion: 1;
  stats: TrainingStreakStats;
  activities: Record<string, ActivityRecord>;
};

export type TrainingStreakRecordResult =
  TrainingStreakState & {
    wasNewDay: boolean;
  };

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.localStorage;
  } catch {
    return null;
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function readStats(value: unknown): TrainingStreakStats {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return { ...EMPTY_TRAINING_STREAK };
  }

  const candidate = value as Record<string, unknown>;
  const lastCompletedDay =
    typeof candidate.lastCompletedDay === "string"
      ? candidate.lastCompletedDay
      : null;

  if (lastCompletedDay) {
    try {
      daysBetweenDayKeys(
        lastCompletedDay,
        lastCompletedDay
      );
    } catch {
      return { ...EMPTY_TRAINING_STREAK };
    }
  }

  if (
    !isNonNegativeInteger(candidate.currentStreak) ||
    !isNonNegativeInteger(candidate.longestStreak) ||
    !isNonNegativeInteger(candidate.totalActiveDays)
  ) {
    return { ...EMPTY_TRAINING_STREAK };
  }

  return {
    currentStreak: candidate.currentStreak,
    longestStreak: candidate.longestStreak,
    lastCompletedDay,
    totalActiveDays: candidate.totalActiveDays
  };
}

function emptyGuestRecord(): GuestStreakRecord {
  return {
    schemaVersion: 1,
    stats: { ...EMPTY_TRAINING_STREAK },
    activities: {}
  };
}

function readGuestRecord(
  storage: Storage | null
): GuestStreakRecord {
  if (!storage) {
    return emptyGuestRecord();
  }

  try {
    const raw = storage.getItem(
      GUEST_TRAINING_STREAK_STORAGE_KEY
    );
    if (!raw) {
      return emptyGuestRecord();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { schemaVersion?: unknown }).schemaVersion !== 1
    ) {
      return emptyGuestRecord();
    }

    const candidate = parsed as {
      stats?: unknown;
      activities?: unknown;
    };

    return {
      schemaVersion: 1,
      stats: readStats(candidate.stats),
      activities:
        typeof candidate.activities === "object" &&
        candidate.activities !== null &&
        !Array.isArray(candidate.activities)
          ? candidate.activities as Record<string, ActivityRecord>
          : {}
    };
  } catch {
    return emptyGuestRecord();
  }
}

function calendar(context: CalendarContext) {
  const timeZone = context.timeZone ?? getBrowserTimeZone();
  const dayKey = getLocalDayKey(
    context.now ?? new Date(),
    timeZone
  );

  return { dayKey, timeZone };
}

function activityRef(uid: string, dayKey: string) {
  return doc(
    db,
    "users",
    uid,
    "trainingActivity",
    dayKey
  );
}

function statsRef(uid: string) {
  return doc(
    db,
    "users",
    uid,
    "trainingStats",
    "streak"
  );
}

export async function loadTrainingStreak(
  owner: TrainingDraftOwner,
  context: CalendarContext = {}
): Promise<TrainingStreakState> {
  const { dayKey } = calendar(context);

  if (owner.kind === "guest") {
    const record = readGuestRecord(getStorage());

    return {
      ...record.stats,
      currentStreak: getEffectiveCurrentStreak(
        record.stats,
        dayKey
      ),
      completedToday:
        Object.hasOwn(record.activities, dayKey)
    };
  }

  const [activitySnapshot, statsSnapshot] =
    await Promise.all([
      getDoc(activityRef(owner.uid, dayKey)),
      getDoc(statsRef(owner.uid))
    ]);
  const storedStats = statsSnapshot.exists()
    ? readStats(statsSnapshot.data())
    : { ...EMPTY_TRAINING_STREAK };

  return {
    ...storedStats,
    currentStreak: getEffectiveCurrentStreak(
      storedStats,
      dayKey
    ),
    completedToday: activitySnapshot.exists()
  };
}

export async function recordTrainingCompletion(
  input: CompletionInput,
  context: CalendarContext = {}
): Promise<TrainingStreakRecordResult> {
  const { dayKey, timeZone } = calendar(context);
  const activity: ActivityRecord = {
    dayKey,
    firstSessionId: input.sessionId,
    firstMode: input.mode,
    methodIds: [...new Set(input.methodIds)],
    timezone: timeZone
  };

  if (input.owner.kind === "guest") {
    const storage = getStorage();
    if (!storage) {
      throw new Error("Browser storage is unavailable.");
    }

    const record = readGuestRecord(storage);
    if (Object.hasOwn(record.activities, dayKey)) {
      return {
        ...record.stats,
        currentStreak: getEffectiveCurrentStreak(
          record.stats,
          dayKey
        ),
        completedToday: true,
        wasNewDay: false
      };
    }

    const next = calculateNextStreak(record.stats, dayKey);
    const updated: GuestStreakRecord = {
      schemaVersion: 1,
      stats: next.stats,
      activities: {
        ...record.activities,
        [dayKey]: activity
      }
    };

    storage.setItem(
      GUEST_TRAINING_STREAK_STORAGE_KEY,
      JSON.stringify(updated)
    );

    return {
      ...next.stats,
      completedToday: true,
      wasNewDay: true
    };
  }

  const uid = input.owner.uid;

  return runTransaction(db, async transaction => {
    const dailyRef = activityRef(uid, dayKey);
    const summaryRef = statsRef(uid);
    const [dailySnapshot, summarySnapshot] =
      await Promise.all([
        transaction.get(dailyRef),
        transaction.get(summaryRef)
      ]);
    const storedStats = summarySnapshot.exists()
      ? readStats(summarySnapshot.data())
      : { ...EMPTY_TRAINING_STREAK };

    if (dailySnapshot.exists()) {
      return {
        ...storedStats,
        currentStreak: getEffectiveCurrentStreak(
          storedStats,
          dayKey
        ),
        completedToday: true,
        wasNewDay: false
      };
    }

    const next = calculateNextStreak(storedStats, dayKey);

    transaction.set(dailyRef, {
      ...activity,
      firstCompletedAt: serverTimestamp()
    });
    transaction.set(summaryRef, {
      ...next.stats,
      updatedAt: serverTimestamp()
    });

    return {
      ...next.stats,
      completedToday: true,
      wasNewDay: true
    };
  });
}
