import { createHash } from "node:crypto";

import {
  FieldValue
} from "firebase-admin/firestore";

import {
  resolveTrainingPlan
} from "./trainingQuota.js";

export const GUEST_AI_DAILY_LIMIT = 2;
export const FREE_AI_DAILY_LIMIT = 7;
export const PREMIUM_AI_DAILY_LIMIT = 16;
export const AI_QUOTA_TIMEZONE = "UTC";
export const AI_DAILY_USAGE_COLLECTION =
  "aiRecommendationDailyUsage";

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

function safeAccess(plan, usedValue, dayKey) {
  const used = normalizeCount(usedValue);
  const limit = limitForPlan(plan);

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    plan,
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

export function createFirebaseAIRecommendationQuotaManager({
  now = Date.now,
  getFirestore
}) {
  if (typeof getFirestore !== "function") {
    throw new TypeError("getFirestore is required");
  }

  return {
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
        usage.exists
          ? usage.data()?.requestCount
          : 0,
        dayKey
      );
    },

    async consume(rawIdentity) {
      const identity = quotaIdentity(rawIdentity);
      const nowValue = now();
      const dayKey = utcDayKey(nowValue);
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
          const plan = planFromEntitlement(
            identity,
            entitlement,
            nowValue
          );
          const access = safeAccess(
            plan,
            usage.exists
              ? usage.data()?.requestCount
              : 0,
            dayKey
          );

          if (access.remaining === 0) {
            throw new AIRecommendationQuotaExceededError(
              access
            );
          }

          const nextAccess = safeAccess(
            plan,
            access.used + 1,
            dayKey
          );

          transaction.set(
            refs.usage,
            {
              utcDate: dayKey,
              requestCount: nextAccess.used,
              identityType: identity.kind,
              updatedAt: FieldValue.serverTimestamp()
            },
            { merge: true }
          );

          return nextAccess;
        }
      );
    }
  };
}
