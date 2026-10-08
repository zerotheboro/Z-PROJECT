import {
  FieldValue
} from "firebase-admin/firestore";

import {
  TRAINING_METHOD_IDS
} from "./trainingMethodIds.js";

export const FREE_TEST_ME_DAILY_LIMIT = 1;
export const FREE_MANUAL_METHOD_DAILY_LIMIT = 3;
export const TRAINING_TIMEZONE_MAX_LENGTH = 64;
export const TRAINING_SESSION_ID_MAX_LENGTH = 200;

const TRAINING_METHOD_ID_SET = new Set(
  TRAINING_METHOD_IDS
);

export class TrainingQuotaValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "TrainingQuotaValidationError";
    this.code = "invalid_training_reservation";
    this.status = 400;
  }
}

export class TrainingQuotaExceededError extends Error {
  constructor(quota, access) {
    super("Daily training limit reached");
    this.name = "TrainingQuotaExceededError";
    this.code = "training_quota_exceeded";
    this.status = 403;
    this.quota = quota;
    this.access = access;
  }
}

export class TrainingReservationConflictError extends Error {
  constructor() {
    super("Session ID is already reserved for different training");
    this.name = "TrainingReservationConflictError";
    this.code = "training_reservation_conflict";
    this.status = 409;
  }
}

export function isValidTimeZone(timeZone) {
  if (
    typeof timeZone !== "string" ||
    !timeZone ||
    timeZone.length > TRAINING_TIMEZONE_MAX_LENGTH
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone
    }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function getServerDayKey(
  nowValue,
  timeZone
) {
  if (!isValidTimeZone(timeZone)) {
    throw new TrainingQuotaValidationError(
      "timezone must be a supported IANA timezone"
    );
  }

  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(new Date(nowValue));
  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function validUntilMillis(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value?.seconds === "number") {
    return value.seconds * 1000;
  }

  return Number.NaN;
}

export function resolveTrainingPlan(
  entitlement,
  nowValue
) {
  if (entitlement?.plan !== "premium") {
    return "free";
  }

  const validUntil = validUntilMillis(
    entitlement.validUntil
  );

  return validUntil === null || validUntil > nowValue
    ? "premium"
    : "free";
}

export function resolveTrainingPlanSource(entitlement) {
  return entitlement?.source === "manual" ||
    entitlement?.source === "paddle"
    ? entitlement.source
    : "default";
}

function accessResponse({
  plan,
  planSource,
  usage,
  dayKey,
  timeZone
}) {
  const testMeStarted = normalizeCount(
    usage?.testMeStarted
  );
  const manualMethodsStarted = normalizeCount(
    usage?.manualMethodsStarted
  );
  const unlimited = plan === "premium";

  return {
    plan,
    planSource,
    limits: {
      testMePerDay: FREE_TEST_ME_DAILY_LIMIT,
      manualMethodsPerDay:
        FREE_MANUAL_METHOD_DAILY_LIMIT
    },
    usage: {
      testMeStarted,
      manualMethodsStarted
    },
    remaining: {
      testMe: unlimited
        ? null
        : Math.max(
            0,
            FREE_TEST_ME_DAILY_LIMIT -
              testMeStarted
          ),
      manualMethods: unlimited
        ? null
        : Math.max(
            0,
            FREE_MANUAL_METHOD_DAILY_LIMIT -
              manualMethodsStarted
          )
    },
    unlimited,
    dayKey,
    timezone: timeZone
  };
}

export function validateTrainingReservation(
  value
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TrainingQuotaValidationError(
      "Training reservation body must be an object"
    );
  }

  const {
    sessionId,
    mode,
    timezone
  } = value;
  const methodIds = value.methodIds ?? [];

  if (
    typeof sessionId !== "string" ||
    sessionId.length < 8 ||
    sessionId.length > TRAINING_SESSION_ID_MAX_LENGTH ||
    sessionId.trim() !== sessionId ||
    !/^[A-Za-z0-9_-]+$/.test(sessionId)
  ) {
    throw new TrainingQuotaValidationError(
      "sessionId is invalid"
    );
  }

  if (mode !== "auto" && mode !== "manual") {
    throw new TrainingQuotaValidationError(
      "mode must be auto or manual"
    );
  }

  if (!isValidTimeZone(timezone)) {
    throw new TrainingQuotaValidationError(
      "timezone must be a supported IANA timezone"
    );
  }

  if (!Array.isArray(methodIds)) {
    throw new TrainingQuotaValidationError(
      "methodIds must be an array"
    );
  }

  if (mode === "auto" && methodIds.length !== 0) {
    throw new TrainingQuotaValidationError(
      "Automatic training must not include methodIds"
    );
  }

  if (
    mode === "manual" &&
    (methodIds.length < 1 || methodIds.length > 3)
  ) {
    throw new TrainingQuotaValidationError(
      "Manual training requires 1 to 3 methods"
    );
  }

  if (
    methodIds.some(method =>
      typeof method !== "string" ||
      !TRAINING_METHOD_ID_SET.has(method)
    )
  ) {
    throw new TrainingQuotaValidationError(
      "methodIds contains an unknown training method"
    );
  }

  if (new Set(methodIds).size !== methodIds.length) {
    throw new TrainingQuotaValidationError(
      "methodIds must be unique"
    );
  }

  return {
    sessionId,
    mode,
    methodIds: [...methodIds],
    timezone
  };
}

function references(
  firestore,
  uid,
  dayKey,
  sessionId
) {
  const user = firestore
    .collection("users")
    .doc(uid);
  const usage = user
    .collection("trainingUsage")
    .doc(dayKey);

  return {
    entitlement: user
      .collection("entitlements")
      .doc("current"),
    usage,
    dailyReservation: usage
      .collection("reservations")
      .doc(sessionId),
    reservationIndex: user
      .collection("trainingReservations")
      .doc(sessionId)
  };
}

function sameReservation(existing, input) {
  return (
    existing?.mode === input.mode &&
    Array.isArray(existing.methodIds) &&
    existing.methodIds.length === input.methodIds.length &&
    existing.methodIds.every(
      (method, index) =>
        method === input.methodIds[index]
    )
  );
}

export function createFirebaseTrainingQuotaManager({
  now = Date.now,
  getFirestore
}) {
  if (typeof getFirestore !== "function") {
    throw new TypeError("getFirestore is required");
  }

  return {
    async getAccess(uid, timeZone) {
      const nowValue = now();
      const dayKey = getServerDayKey(
        nowValue,
        timeZone
      );
      const firestore = getFirestore();
      const refs = references(
        firestore,
        uid,
        dayKey,
        "access-only"
      );
      const [entitlement, usage] = await Promise.all([
        refs.entitlement.get(),
        refs.usage.get()
      ]);

      return accessResponse({
        planSource: resolveTrainingPlanSource(
          entitlement.exists
            ? entitlement.data()
            : null
        ),
        plan: resolveTrainingPlan(
          entitlement.exists
            ? entitlement.data()
            : null,
          nowValue
        ),
        usage: usage.exists ? usage.data() : null,
        dayKey,
        timeZone
      });
    },

    async reserve(uid, rawInput) {
      const input = validateTrainingReservation(
        rawInput
      );
      const nowValue = now();
      const dayKey = getServerDayKey(
        nowValue,
        input.timezone
      );
      const firestore = getFirestore();
      const refs = references(
        firestore,
        uid,
        dayKey,
        input.sessionId
      );

      return firestore.runTransaction(
        async transaction => {
          const existing = await transaction.get(
            refs.reservationIndex
          );

          if (existing.exists) {
            const stored = existing.data();
            if (!sameReservation(stored, input)) {
              throw new TrainingReservationConflictError();
            }

            return {
              allowed: true,
              idempotent: true,
              sessionId: input.sessionId,
              dayKey: stored.dayKey,
              plan: stored.plan ?? "free",
              planSource: stored.planSource ?? "default"
            };
          }

          const entitlement = await transaction.get(
            refs.entitlement
          );
          const usageSnapshot = await transaction.get(
            refs.usage
          );
          const entitlementData = entitlement.exists
            ? entitlement.data()
            : null;
          const plan = resolveTrainingPlan(
            entitlementData,
            nowValue
          );
          const planSource = resolveTrainingPlanSource(
            entitlementData
          );
          const usage = usageSnapshot.exists
            ? usageSnapshot.data()
            : null;
          const access = accessResponse({
            plan,
            planSource,
            usage,
            dayKey,
            timeZone: input.timezone
          });
          const testMeStarted =
            access.usage.testMeStarted;
          const manualMethodsStarted =
            access.usage.manualMethodsStarted;
          const methodCount = input.mode === "manual"
            ? input.methodIds.length
            : 0;

          if (!access.unlimited) {
            if (
              input.mode === "auto" &&
              testMeStarted >=
                FREE_TEST_ME_DAILY_LIMIT
            ) {
              throw new TrainingQuotaExceededError(
                "test_me",
                access
              );
            }

            if (
              input.mode === "manual" &&
              manualMethodsStarted + methodCount >
                FREE_MANUAL_METHOD_DAILY_LIMIT
            ) {
              throw new TrainingQuotaExceededError(
                "manual_methods",
                access
              );
            }
          }

          const nextUsage = {
            dayKey,
            timezone: input.timezone,
            testMeStarted:
              testMeStarted +
              (input.mode === "auto" ? 1 : 0),
            manualMethodsStarted:
              manualMethodsStarted + methodCount,
            updatedAt: FieldValue.serverTimestamp()
          };
          const reservation = {
            sessionId: input.sessionId,
            mode: input.mode,
            methodIds: input.methodIds,
            methodCount,
            dayKey,
            timezone: input.timezone,
            plan,
            planSource,
            createdAt: FieldValue.serverTimestamp()
          };

          transaction.set(refs.usage, nextUsage);
          transaction.set(
            refs.dailyReservation,
            reservation
          );
          transaction.set(
            refs.reservationIndex,
            reservation
          );

          return {
            allowed: true,
            idempotent: false,
            sessionId: input.sessionId,
            dayKey,
            plan,
            planSource,
            access: accessResponse({
              plan,
              planSource,
              usage: nextUsage,
              dayKey,
              timeZone: input.timezone
            })
          };
        }
      );
    }
  };
}
