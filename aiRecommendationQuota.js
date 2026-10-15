import {
  createHash,
  randomUUID
} from "node:crypto";

import {
  FieldValue
} from "firebase-admin/firestore";

import {
  resolveTrainingPlan
} from "./trainingQuota.js";

export const GUEST_AI_DAILY_LIMIT = 2;
export const FREE_AI_DAILY_LIMIT = 4;
export const PREMIUM_AI_DAILY_LIMIT = 10;
export const PREMIUM_DEEP_AI_DAILY_LIMIT = 1;
export const AI_QUOTA_TIMEZONE = "UTC";
export const AI_DAILY_USAGE_COLLECTION =
  "aiRecommendationDailyUsage";
export const AI_RECOMMENDATION_RESERVATION_TTL_MS =
  15 * 60 * 1000;

const AI_RECOMMENDATION_MODES = new Set([
  "standard",
  "deep"
]);

export class AIRecommendationQuotaExceededError
  extends Error {
  constructor(access) {
    super(
      `Daily AI recommendation limit of ${access.limit} reached for ${access.dayKey}`
    );
    this.name = "AIRecommendationQuotaExceededError";
    this.code = "ai_daily_quota_exceeded";
    this.status = 429;
    this.access = access;
  }
}

export class AIRecommendationDeepAccessError
  extends Error {
  constructor(access) {
    super("Deep Recommendation requires Premium");
    this.name = "AIRecommendationDeepAccessError";
    this.code = "ai_deep_requires_premium";
    this.status = 403;
    this.access = access;
  }
}

export class AIRecommendationDeepQuotaExceededError
  extends Error {
  constructor(access) {
    super("Daily Deep Recommendation limit reached");
    this.name = "AIRecommendationDeepQuotaExceededError";
    this.code = "ai_deep_daily_quota_exceeded";
    this.status = 429;
    this.access = access;
  }
}

export class AIRecommendationReservationError
  extends Error {
  constructor(message) {
    super(message);
    this.name = "AIRecommendationReservationError";
    this.code = "ai_recommendation_reservation_invalid";
    this.status = 503;
  }
}

function utcDayKey(nowValue) {
  return new Date(nowValue)
    .toISOString()
    .slice(0, 10);
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function validateMode(mode) {
  if (!AI_RECOMMENDATION_MODES.has(mode)) {
    throw new TypeError(
      "AI recommendation mode must be standard or deep"
    );
  }

  return mode;
}

function quotaIdentity({ uid, ip }) {
  if (typeof uid === "string" && uid) {
    return {
      kind: "user",
      uid,
      storageIdentity: uid
    };
  }

  if (typeof ip === "string" && ip) {
    return {
      kind: "guest",
      uid: null,
      storageIdentity: `guest-ip:${ip}`
    };
  }

  throw new TypeError(
    "AI quota identity requires a verified UID or client IP"
  );
}

function usageDocumentId(identity, dayKey) {
  const identityHash = createHash("sha256")
    .update(identity.storageIdentity)
    .digest("hex");

  return `${dayKey}_${identityHash}`;
}

function limitForPlan(plan) {
  if (plan === "guest") {
    return GUEST_AI_DAILY_LIMIT;
  }

  return plan === "premium"
    ? PREMIUM_AI_DAILY_LIMIT
    : FREE_AI_DAILY_LIMIT;
}

function normalizeReservations(value, nowValue) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, reservation]) =>
      reservation
      && typeof reservation === "object"
      && !Array.isArray(reservation)
      && AI_RECOMMENDATION_MODES.has(
        reservation.mode
      )
      && (
        reservation.state === "pending"
        || reservation.state === "completed"
      )
      && Number.isFinite(
        reservation.expiresAtMillis
      )
      && reservation.expiresAtMillis > nowValue
    )
  );
}

function safeAccess(
  plan,
  usageValue,
  dayKey,
  nowValue
) {
  const usage = usageValue
    && typeof usageValue === "object"
    ? usageValue
    : {};
  const used = normalizeCount(usage.requestCount);
  const deepUsed = normalizeCount(
    usage.deepRequestCount
  );
  const reservations = normalizeReservations(
    usage.reservations,
    nowValue
  );
  const pending = Object.values(reservations).filter(
    reservation => reservation.state === "pending"
  );
  const reserved = pending.length;
  const deepReserved = pending.filter(
    reservation => reservation.mode === "deep"
  ).length;
  const limit = limitForPlan(plan);
  const deepLimit = plan === "premium"
    ? PREMIUM_DEEP_AI_DAILY_LIMIT
    : 0;
  const remaining = Math.max(
    0,
    limit - used - reserved
  );
  const deepRemaining = Math.max(
    0,
    deepLimit - deepUsed - deepReserved
  );

  return {
    limit,
    used,
    reserved,
    remaining,
    plan,
    deep: {
      limit: deepLimit,
      used: deepUsed,
      reserved: deepReserved,
      remaining: deepRemaining,
      available:
        plan === "premium"
        && remaining > 0
        && deepRemaining > 0
    },
    dayKey,
    timezone: AI_QUOTA_TIMEZONE
  };
}

function references(
  firestore,
  identity,
  dayKey
) {
  const usage = firestore
    .collection(AI_DAILY_USAGE_COLLECTION)
    .doc(usageDocumentId(identity, dayKey));

  return {
    usage,
    entitlement: identity.kind === "user"
      ? firestore
          .collection("users")
          .doc(identity.uid)
          .collection("entitlements")
          .doc("current")
      : null
  };
}

function planFromEntitlement(
  identity,
  entitlement,
  nowValue
) {
  if (identity.kind === "guest") {
    return "guest";
  }

  return resolveTrainingPlan(
    entitlement?.exists
      ? entitlement.data()
      : null,
    nowValue
  );
}

function validateReservation(reservation) {
  if (
    !reservation
    || typeof reservation !== "object"
    || typeof reservation.id !== "string"
    || !reservation.id
    || reservation.id.length > 200
    || typeof reservation.dayKey !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(
      reservation.dayKey
    )
  ) {
    throw new AIRecommendationReservationError(
      "AI recommendation reservation is invalid"
    );
  }

  return reservation;
}

function usageData(
  identity,
  dayKey,
  access,
  reservations
) {
  return {
    utcDate: dayKey,
    requestCount: access.used,
    deepRequestCount: access.deep.used,
    reservations,
    identityType: identity.kind,
    updatedAt: FieldValue.serverTimestamp()
  };
}

export function createFirebaseAIRecommendationQuotaManager({
  now = Date.now,
  getFirestore,
  createReservationId = randomUUID
}) {
  if (typeof getFirestore !== "function") {
    throw new TypeError("getFirestore is required");
  }

  if (typeof createReservationId !== "function") {
    throw new TypeError("createReservationId must be a function");
  }

  const manager = {
    async getAccess(rawIdentity) {
      const identity = quotaIdentity(rawIdentity);
      const nowValue = now();
      const dayKey = utcDayKey(nowValue);
      const firestore = getFirestore();
      const refs = references(
        firestore,
        identity,
        dayKey
      );
      const [usage, entitlement] = await Promise.all([
        refs.usage.get(),
        refs.entitlement
          ? refs.entitlement.get()
          : Promise.resolve(null)
      ]);
      const plan = planFromEntitlement(
        identity,
        entitlement,
        nowValue
      );

      return safeAccess(
        plan,
        usage.exists ? usage.data() : null,
        dayKey,
        nowValue
      );
    },

    async reserve(rawIdentity, { mode = "standard" } = {}) {
      const identity = quotaIdentity(rawIdentity);
      const selectedMode = validateMode(mode);
      const nowValue = now();
      const dayKey = utcDayKey(nowValue);
      const reservationId = createReservationId();
      const firestore = getFirestore();
      const refs = references(
        firestore,
        identity,
        dayKey
      );

      return firestore.runTransaction(
        async transaction => {
          const entitlement = refs.entitlement
            ? await transaction.get(refs.entitlement)
            : null;
          const usage = await transaction.get(refs.usage);
          const usageValue = usage.exists
            ? usage.data()
            : {};
          const plan = planFromEntitlement(
            identity,
            entitlement,
            nowValue
          );
          const access = safeAccess(
            plan,
            usageValue,
            dayKey,
            nowValue
          );

          if (
            selectedMode === "deep"
            && plan !== "premium"
          ) {
            throw new AIRecommendationDeepAccessError(
              access
            );
          }

          if (access.remaining === 0) {
            throw new AIRecommendationQuotaExceededError(
              access
            );
          }

          if (
            selectedMode === "deep"
            && access.deep.remaining === 0
          ) {
            throw new AIRecommendationDeepQuotaExceededError(
              access
            );
          }

          const reservations = {
            ...normalizeReservations(
              usageValue.reservations,
              nowValue
            ),
            [reservationId]: {
              mode: selectedMode,
              state: "pending",
              expiresAtMillis:
                nowValue
                + AI_RECOMMENDATION_RESERVATION_TTL_MS
            }
          };
          const reservedAccess = safeAccess(
            plan,
            {
              ...usageValue,
              reservations
            },
            dayKey,
            nowValue
          );

          transaction.set(
            refs.usage,
            usageData(
              identity,
              dayKey,
              access,
              reservations
            ),
            { merge: true }
          );

          return {
            id: reservationId,
            dayKey,
            mode: selectedMode,
            access: reservedAccess
          };
        }
      );
    },

    async finalize(rawIdentity, rawReservation) {
      const identity = quotaIdentity(rawIdentity);
      const reservation = validateReservation(
        rawReservation
      );
      const nowValue = now();
      const firestore = getFirestore();
      const refs = references(
        firestore,
        identity,
        reservation.dayKey
      );

      return firestore.runTransaction(
        async transaction => {
          const entitlement = refs.entitlement
            ? await transaction.get(refs.entitlement)
            : null;
          const usage = await transaction.get(refs.usage);
          const usageValue = usage.exists
            ? usage.data()
            : {};
          const plan = planFromEntitlement(
            identity,
            entitlement,
            nowValue
          );
          const reservations = normalizeReservations(
            usageValue.reservations,
            nowValue
          );
          const stored = reservations[reservation.id];

          if (!stored) {
            throw new AIRecommendationReservationError(
              "AI recommendation reservation expired or was not found"
            );
          }

          if (stored.state === "completed") {
            return safeAccess(
              plan,
              usageValue,
              reservation.dayKey,
              nowValue
            );
          }

          const nextUsage = {
            ...usageValue,
            requestCount:
              normalizeCount(usageValue.requestCount) + 1,
            deepRequestCount:
              normalizeCount(
                usageValue.deepRequestCount
              ) + (stored.mode === "deep" ? 1 : 0),
            reservations: {
              ...reservations,
              [reservation.id]: {
                ...stored,
                state: "completed",
                expiresAtMillis:
                  nowValue
                  + AI_RECOMMENDATION_RESERVATION_TTL_MS
              }
            }
          };
          const nextAccess = safeAccess(
            plan,
            nextUsage,
            reservation.dayKey,
            nowValue
          );

          transaction.set(
            refs.usage,
            usageData(
              identity,
              reservation.dayKey,
              nextAccess,
              nextUsage.reservations
            ),
            { merge: true }
          );

          return nextAccess;
        }
      );
    },

    async release(rawIdentity, rawReservation) {
      const identity = quotaIdentity(rawIdentity);
      const reservation = validateReservation(
        rawReservation
      );
      const nowValue = now();
      const firestore = getFirestore();
      const refs = references(
        firestore,
        identity,
        reservation.dayKey
      );

      return firestore.runTransaction(
        async transaction => {
          const usage = await transaction.get(refs.usage);

          if (!usage.exists) {
            return;
          }

          const usageValue = usage.data();
          const reservations = normalizeReservations(
            usageValue.reservations,
            nowValue
          );
          const stored = reservations[reservation.id];

          if (!stored || stored.state === "completed") {
            return;
          }

          delete reservations[reservation.id];
          transaction.set(
            refs.usage,
            {
              reservations,
              updatedAt: FieldValue.serverTimestamp()
            },
            { merge: true }
          );
        }
      );
    },

    async consume(rawIdentity, mode = "standard") {
      const reservation = await manager.reserve(
        rawIdentity,
        { mode }
      );

      try {
        return await manager.finalize(
          rawIdentity,
          reservation
        );
      } catch (error) {
        await manager.release(
          rawIdentity,
          reservation
        );
        throw error;
      }
    }
  };

  return manager;
}
