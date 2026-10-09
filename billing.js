import { randomUUID } from "node:crypto";
import process from "node:process";
import {
  FieldValue
} from "firebase-admin/firestore";

export const PADDLE_PREMIUM_STATUSES = Object.freeze([
  "active",
  "trialing"
]);

const PREMIUM_STATUS_SET = new Set(
  PADDLE_PREMIUM_STATUSES
);
const BLOCKING_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing"
];
const SUBSCRIPTION_EVENT_TYPES = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.trialing",
  "subscription.updated",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled"
]);
const TRANSACTION_COMPLETED = "transaction.completed";
const CREATION_LOCK_MS = 60_000;
const PENDING_TRANSACTION_MS = 24 * 60 * 60 * 1000;

export class BillingConfigurationError extends Error {
  constructor(message = "Billing is unavailable") {
    super(message);
    this.name = "BillingConfigurationError";
    this.code = "billing_configuration_unavailable";
    this.status = 503;
  }
}

export class BillingRequestError extends Error {
  constructor(message, {
    code = "billing_request_failed",
    status = 502
  } = {}) {
    super(message);
    this.name = "BillingRequestError";
    this.code = code;
    this.status = status;
  }
}

export class BillingMappingError extends Error {
  constructor(message = "Paddle billing mapping mismatch") {
    super(message);
    this.name = "BillingMappingError";
    this.code = "billing_mapping_mismatch";
    this.status = 500;
  }
}

function trimmed(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function resolvePaddleConfiguration(
  env = process.env
) {
  const apiKey = trimmed(env.PADDLE_API_KEY);
  const webhookSecret = trimmed(
    env.PADDLE_WEBHOOK_SECRET
  );
  const premiumPriceId = trimmed(
    env.PADDLE_PREMIUM_PRICE_ID
  );
  const environment = trimmed(
    env.PADDLE_ENVIRONMENT
  ).toLowerCase();
  const missing = [];
  const apiKeyPrefix = environment === "sandbox"
    ? "pdl_sdbx_apikey_"
    : environment === "production"
      ? "pdl_live_apikey_"
      : null;

  if (!apiKeyPrefix || !apiKey.startsWith(apiKeyPrefix)) {
    missing.push("PADDLE_API_KEY");
  }
  if (!webhookSecret.startsWith("pdl_ntfset_")) {
    missing.push("PADDLE_WEBHOOK_SECRET");
  }
  if (!premiumPriceId.startsWith("pri_")) {
    missing.push("PADDLE_PREMIUM_PRICE_ID");
  }
  if (
    environment !== "sandbox" &&
    environment !== "production"
  ) {
    missing.push("PADDLE_ENVIRONMENT");
  }

  return {
    available: missing.length === 0,
    missing,
    apiKey,
    webhookSecret,
    premiumPriceId,
    environment
  };
}

function snapshotData(snapshot) {
  return snapshot.exists
    ? snapshot.data()
    : null;
}

function references(firestore, uid, customerId) {
  return {
    billingAccount: firestore
      .collection("billingAccounts")
      .doc(uid),
    customer: customerId
      ? firestore
          .collection("paddleCustomers")
          .doc(customerId)
      : null,
    entitlement: firestore
      .collection("users")
      .doc(uid)
      .collection("entitlements")
      .doc("current")
  };
}

function millis(value) {
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
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function isValidManualPremiumOverride(
  entitlement,
  nowValue
) {
  if (
    entitlement?.plan !== "premium" ||
    entitlement?.source !== "manual"
  ) {
    return false;
  }

  const validUntil = millis(entitlement.validUntil);
  return validUntil === null || validUntil > nowValue;
}

function lockIsCurrent(startedAt, nowValue) {
  const startedAtMillis = millis(startedAt);
  return Number.isFinite(startedAtMillis) &&
    startedAtMillis > nowValue - CREATION_LOCK_MS;
}

function pendingIsCurrent(createdAt, nowValue) {
  const createdAtMillis = millis(createdAt);
  return Number.isFinite(createdAtMillis) &&
    createdAtMillis > nowValue - PENDING_TRANSACTION_MS;
}

export function createFirebaseBillingRepository({
  getFirestore
}) {
  return {
    async getBillingAccount(uid) {
      const snapshot = await getFirestore()
        .collection("billingAccounts")
        .doc(uid)
        .get();
      return snapshotData(snapshot);
    },

    async getCustomerMapping(customerId) {
      const snapshot = await getFirestore()
        .collection("paddleCustomers")
        .doc(customerId)
        .get();
      return snapshotData(snapshot);
    },

    async claimCustomerCreation(uid, token, nowValue) {
      const firestore = getFirestore();
      const reference = firestore
        .collection("billingAccounts")
        .doc(uid);

      return firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        const account = snapshotData(snapshot);

        if (account?.paddleCustomerId) {
          return {
            customerId: account.paddleCustomerId,
            claimed: false
          };
        }
        if (lockIsCurrent(
          account?.customerProvisioningStartedAt,
          nowValue
        )) {
          return { busy: true, claimed: false };
        }

        transaction.set(reference, {
          firebaseUid: uid,
          provider: "paddle",
          customerProvisioningToken: token,
          customerProvisioningStartedAt: new Date(nowValue),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { claimed: true, token };
      });
    },

    async saveCustomerMapping(uid, customerId, token) {
      const firestore = getFirestore();
      const refs = references(firestore, uid, customerId);

      return firestore.runTransaction(async transaction => {
        const [accountSnapshot, mappingSnapshot] =
          await Promise.all([
            transaction.get(refs.billingAccount),
            transaction.get(refs.customer)
          ]);
        const account = snapshotData(accountSnapshot);
        const mapping = snapshotData(mappingSnapshot);

        if (
          account?.paddleCustomerId &&
          account.paddleCustomerId !== customerId
        ) {
          throw new BillingMappingError();
        }
        if (
          mapping?.firebaseUid &&
          mapping.firebaseUid !== uid
        ) {
          throw new BillingMappingError();
        }
        if (
          !account?.paddleCustomerId &&
          account?.customerProvisioningToken !== token
        ) {
          throw new BillingMappingError(
            "Paddle customer provisioning lock mismatch"
          );
        }

        transaction.set(refs.billingAccount, {
          firebaseUid: uid,
          provider: "paddle",
          paddleCustomerId: customerId,
          customerProvisioningToken: FieldValue.delete(),
          customerProvisioningStartedAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        transaction.set(refs.customer, {
          firebaseUid: uid,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return {
          ...(account ?? {}),
          firebaseUid: uid,
          provider: "paddle",
          paddleCustomerId: customerId
        };
      });
    },

    async releaseCustomerCreation(uid, token) {
      const firestore = getFirestore();
      const reference = firestore
        .collection("billingAccounts")
        .doc(uid);
      await firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        const account = snapshotData(snapshot);
        if (account?.customerProvisioningToken !== token) {
          return;
        }
        transaction.set(reference, {
          customerProvisioningToken: FieldValue.delete(),
          customerProvisioningStartedAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      });
    },

    async claimTransactionCreation(uid, token, nowValue) {
      const firestore = getFirestore();
      const reference = firestore
        .collection("billingAccounts")
        .doc(uid);
      return firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        const account = snapshotData(snapshot);

        if (!account?.paddleCustomerId) {
          throw new BillingMappingError();
        }
        if (
          account.pendingTransactionId &&
          pendingIsCurrent(
            account.pendingTransactionCreatedAt,
            nowValue
          )
        ) {
          return {
            transactionId: account.pendingTransactionId,
            claimed: false
          };
        }
        if (lockIsCurrent(
          account.transactionProvisioningStartedAt,
          nowValue
        )) {
          return { busy: true, claimed: false };
        }

        transaction.set(reference, {
          transactionProvisioningToken: token,
          transactionProvisioningStartedAt: new Date(nowValue),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        return { claimed: true, token };
      });
    },

    async savePendingTransaction(
      uid,
      customerId,
      transactionId,
      token,
      nowValue
    ) {
      const firestore = getFirestore();
      const reference = firestore
        .collection("billingAccounts")
        .doc(uid);
      await firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        const account = snapshotData(snapshot);
        if (
          account?.paddleCustomerId !== customerId ||
          account?.transactionProvisioningToken !== token
        ) {
          throw new BillingMappingError();
        }
        transaction.set(reference, {
          pendingTransactionId: transactionId,
          pendingTransactionCreatedAt: new Date(nowValue),
          transactionProvisioningToken: FieldValue.delete(),
          transactionProvisioningStartedAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      });
    },

    async releaseTransactionCreation(uid, token) {
      const firestore = getFirestore();
      const reference = firestore
        .collection("billingAccounts")
        .doc(uid);
      await firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        const account = snapshotData(snapshot);
        if (account?.transactionProvisioningToken !== token) {
          return;
        }
        transaction.set(reference, {
          transactionProvisioningToken: FieldValue.delete(),
          transactionProvisioningStartedAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      });
    },

    async getWebhookEvent(eventId) {
      const snapshot = await getFirestore()
        .collection("paddleWebhookEvents")
        .doc(eventId)
        .get();
      return snapshotData(snapshot);
    },

    async markWebhookEventComplete(event) {
      await getFirestore()
        .collection("paddleWebhookEvents")
        .doc(event.eventId)
        .set({
          eventId: event.eventId,
          type: event.eventType,
          completed: true,
          processedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    },

    async applySubscriptionSync({
      uid,
      customerId,
      billingState,
      entitlement,
      nowValue
    }) {
      const firestore = getFirestore();
      const refs = references(firestore, uid, customerId);

      return firestore.runTransaction(async transaction => {
        const [accountSnapshot, entitlementSnapshot] =
          await Promise.all([
            transaction.get(refs.billingAccount),
            transaction.get(refs.entitlement)
          ]);
        const account = snapshotData(accountSnapshot);
        const currentEntitlement = snapshotData(
          entitlementSnapshot
        );

        if (
          account?.paddleCustomerId !== customerId ||
          account?.firebaseUid !== uid
        ) {
          throw new BillingMappingError();
        }

        const manualOverridePreserved =
          isValidManualPremiumOverride(
            currentEntitlement,
            nowValue
          );

        transaction.set(refs.billingAccount, {
          ...billingState,
          firebaseUid: uid,
          provider: "paddle",
          paddleCustomerId: customerId,
          pendingTransactionId: FieldValue.delete(),
          pendingTransactionCreatedAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        if (!manualOverridePreserved) {
          transaction.set(refs.entitlement, {
            ...entitlement,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }

        return { manualOverridePreserved };
      });
    }
  };
}

function billingLog(logger, now, level, event, fields) {
  const entry = JSON.stringify({
    timestamp: new Date(now()).toISOString(),
    event,
    ...fields
  });
  const output = logger[level] ?? logger.log;
  output.call(logger, entry);
}

function requireBillingConfiguration(config, paddle) {
  if (!config.available || !paddle) {
    throw new BillingConfigurationError();
  }
}

function priceMatches(items, premiumPriceId) {
  return items?.some(
    item => item?.price?.id === premiumPriceId
  ) ?? false;
}

function eventSubscriptionId(event) {
  if (event.eventType === TRANSACTION_COMPLETED) {
    return event.data?.subscriptionId ?? null;
  }
  return event.data?.id ?? null;
}

function asDate(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

export function isPaddlePremiumStatus(status) {
  return PREMIUM_STATUS_SET.has(status);
}

async function firstPage(collection) {
  return collection.next();
}

export function createPaddleBillingService({
  paddle,
  repository,
  config,
  logger = console,
  now = Date.now,
  createToken = randomUUID
}) {
  async function ensureCustomer({ uid, email }) {
    const account = await repository.getBillingAccount(uid);

    if (account?.paddleCustomerId) {
      const mapping = await repository.getCustomerMapping(
        account.paddleCustomerId
      );
      if (mapping?.firebaseUid !== uid) {
        throw new BillingMappingError();
      }
      billingLog(
        logger,
        now,
        "info",
        "paddle_customer_reused",
        {
          firebase_uid: uid,
          paddle_customer_id: account.paddleCustomerId
        }
      );
      return account.paddleCustomerId;
    }

    if (!email) {
      throw new BillingRequestError(
        "A verified account email is required for Paddle Checkout.",
        {
          code: "firebase_email_required",
          status: 400
        }
      );
    }

    const token = createToken();
    const claim = await repository.claimCustomerCreation(
      uid,
      token,
      now()
    );
    if (claim.customerId) {
      const mapping = await repository.getCustomerMapping(
        claim.customerId
      );
      if (mapping?.firebaseUid !== uid) {
        throw new BillingMappingError();
      }
      return claim.customerId;
    }
    if (claim.busy) {
      throw new BillingRequestError(
        "Billing setup is already in progress. Try again shortly.",
        { code: "billing_in_progress", status: 409 }
      );
    }

    try {
      const customers = await firstPage(
        paddle.customers.list({
          email: [email],
          status: ["active"],
          perPage: 10
        })
      );
      let customer = customers.find(candidate =>
        candidate?.customData?.firebaseUid === uid
      );

      if (!customer) {
        customer = await paddle.customers.create({
          email,
          customData: { firebaseUid: uid }
        });
      }

      const saved = await repository.saveCustomerMapping(
        uid,
        customer.id,
        token
      );
      billingLog(
        logger,
        now,
        "info",
        customers.includes(customer)
          ? "paddle_customer_recovered"
          : "paddle_customer_created",
        {
          firebase_uid: uid,
          paddle_customer_id: saved.paddleCustomerId
        }
      );
      return saved.paddleCustomerId;
    } catch (error) {
      await repository.releaseCustomerCreation(uid, token);
      throw error;
    }
  }

  async function syncPaddleSubscription(
    subscriptionId,
    { eventId = null } = {}
  ) {
    requireBillingConfiguration(config, paddle);
    const subscription = await paddle.subscriptions.get(
      subscriptionId
    );
    const customerId = subscription?.customerId;
    const mapping = customerId
      ? await repository.getCustomerMapping(customerId)
      : null;
    const uid = mapping?.firebaseUid;
    const account = uid
      ? await repository.getBillingAccount(uid)
      : null;
    const metadataUid = subscription?.customData?.firebaseUid;

    if (
      !customerId ||
      !uid ||
      !account ||
      account.firebaseUid !== uid ||
      account.paddleCustomerId !== customerId ||
      (metadataUid && metadataUid !== uid)
    ) {
      billingLog(
        logger,
        now,
        "error",
        "paddle_mapping_mismatch",
        {
          severity: "high",
          paddle_event_id: eventId,
          paddle_customer_id: customerId ?? null,
          paddle_subscription_id: subscriptionId,
          firebase_uid: uid ?? null
        }
      );
      throw new BillingMappingError();
    }

    const hasPremiumPrice = priceMatches(
      subscription.items,
      config.premiumPriceId
    );
    const eligible = hasPremiumPrice &&
      isPaddlePremiumStatus(subscription.status);
    const currentBillingPeriodEnd = asDate(
      subscription.currentBillingPeriod?.endsAt
    );
    const result = await repository.applySubscriptionSync({
      uid,
      customerId,
      nowValue: now(),
      billingState: {
        paddleSubscriptionId: subscription.id,
        paddlePriceId: hasPremiumPrice
          ? config.premiumPriceId
          : subscription.items?.[0]?.price?.id ?? null,
        subscriptionStatus: subscription.status,
        scheduledChange: subscription.scheduledChange
          ? {
              action: subscription.scheduledChange.action,
              effectiveAt: asDate(
                subscription.scheduledChange.effectiveAt
              ),
              resumeAt: asDate(
                subscription.scheduledChange.resumeAt
              )
            }
          : null,
        currentBillingPeriodEnd,
        lastPaddleEventId: eventId
      },
      entitlement: eligible
        ? {
            plan: "premium",
            source: "paddle",
            validUntil: null
          }
        : {
            plan: "free",
            source: "paddle",
            validUntil: null
          }
    });

    billingLog(
      logger,
      now,
      "info",
      "paddle_subscription_synced",
      {
        firebase_uid: uid,
        paddle_event_id: eventId,
        paddle_customer_id: customerId,
        paddle_subscription_id: subscription.id,
        subscription_status: subscription.status,
        scheduled_change_action:
          subscription.scheduledChange?.action ?? null,
        premium_eligible: eligible,
        manual_override_preserved:
          result.manualOverridePreserved
      }
    );

    if (!result.manualOverridePreserved) {
      billingLog(
        logger,
        now,
        "info",
        eligible
          ? "paddle_entitlement_activated"
          : "paddle_entitlement_downgraded",
        {
          firebase_uid: uid,
          paddle_subscription_id: subscription.id
        }
      );
    }

    return {
      uid,
      eligible,
      manualOverridePreserved:
        result.manualOverridePreserved
    };
  }

  async function findBlockingSubscription(customerId) {
    const subscriptions = await firstPage(
      paddle.subscriptions.list({
        customerId: [customerId],
        priceId: [config.premiumPriceId],
        status: BLOCKING_SUBSCRIPTION_STATUSES,
        perPage: 10
      })
    );
    return subscriptions.find(subscription =>
      priceMatches(subscription.items, config.premiumPriceId)
    ) ?? null;
  }

  async function findReusableTransaction(customerId, uid) {
    const transactions = await firstPage(
      paddle.transactions.list({
        customerId: [customerId],
        status: ["draft", "ready"],
        origin: ["api"],
        orderBy: "created_at[DESC]",
        perPage: 10
      })
    );
    return transactions.find(transaction =>
      transaction?.customData?.firebaseUid === uid &&
      transaction?.customData?.billingPurpose ===
        "premium-upgrade" &&
      priceMatches(transaction.items, config.premiumPriceId) &&
      pendingIsCurrent(transaction.createdAt, now())
    ) ?? null;
  }

  return {
    async constructWebhookEvent(rawBody, signature) {
      requireBillingConfiguration(config, paddle);
      if (!signature) {
        throw new BillingRequestError(
          "Paddle signature is required",
          {
            code: "invalid_paddle_signature",
            status: 400
          }
        );
      }
      return paddle.webhooks.unmarshal(
        rawBody,
        config.webhookSecret,
        signature
      );
    },

    async createCheckoutTransaction(identity) {
      requireBillingConfiguration(config, paddle);
      const { uid } = identity;
      const account = await repository.getBillingAccount(uid);

      if (account?.paddleSubscriptionId) {
        const subscription = await paddle.subscriptions.get(
          account.paddleSubscriptionId
        );
        if (
          isPaddlePremiumStatus(subscription.status) &&
          priceMatches(
            subscription.items,
            config.premiumPriceId
          )
        ) {
          throw new BillingRequestError(
            "A Paddle subscription already exists. Use Manage subscription.",
            {
              code: "paddle_subscription_exists",
              status: 409
            }
          );
        }
      }

      const customerId = await ensureCustomer(identity);
      const existingSubscription =
        await findBlockingSubscription(customerId);
      if (existingSubscription) {
        await syncPaddleSubscription(
          existingSubscription.id
        );
        throw new BillingRequestError(
          "A Paddle subscription already exists. Use Manage subscription.",
          {
            code: "paddle_subscription_exists",
            status: 409
          }
        );
      }

      const token = createToken();
      const claim = await repository.claimTransactionCreation(
        uid,
        token,
        now()
      );
      if (claim.transactionId) {
        return { transactionId: claim.transactionId };
      }
      if (claim.busy) {
        throw new BillingRequestError(
          "Checkout creation is already in progress. Try again shortly.",
          { code: "billing_in_progress", status: 409 }
        );
      }

      try {
        let transaction = await findReusableTransaction(
          customerId,
          uid
        );
        if (!transaction) {
          transaction = await paddle.transactions.create({
            items: [{
              priceId: config.premiumPriceId,
              quantity: 1
            }],
            customerId,
            collectionMode: "automatic",
            customData: {
              firebaseUid: uid,
              billingPurpose: "premium-upgrade"
            }
          });
        }
        await repository.savePendingTransaction(
          uid,
          customerId,
          transaction.id,
          token,
          now()
        );
        billingLog(
          logger,
          now,
          "info",
          "paddle_checkout_transaction_created",
          {
            firebase_uid: uid,
            paddle_customer_id: customerId,
            paddle_transaction_id: transaction.id
          }
        );
        return { transactionId: transaction.id };
      } catch (error) {
        await repository.releaseTransactionCreation(uid, token);
        throw error;
      }
    },

    async createPortalSession(uid) {
      requireBillingConfiguration(config, paddle);
      const account = await repository.getBillingAccount(uid);
      if (
        !account?.paddleCustomerId ||
        !account?.paddleSubscriptionId
      ) {
        throw new BillingRequestError(
          "No Paddle subscription is available to manage.",
          {
            code: "paddle_subscription_missing",
            status: 404
          }
        );
      }
      const mapping = await repository.getCustomerMapping(
        account.paddleCustomerId
      );
      if (mapping?.firebaseUid !== uid) {
        throw new BillingMappingError();
      }

      const session =
        await paddle.customerPortalSessions.create(
          account.paddleCustomerId,
          [account.paddleSubscriptionId]
        );
      const url = session?.urls?.general?.overview;
      if (!url) {
        throw new BillingRequestError(
          "Paddle did not return a Customer Portal URL"
        );
      }
      billingLog(
        logger,
        now,
        "info",
        "paddle_portal_created",
        {
          firebase_uid: uid,
          paddle_customer_id: account.paddleCustomerId,
          paddle_subscription_id:
            account.paddleSubscriptionId
        }
      );
      return { url };
    },

    async handleWebhookEvent(event) {
      requireBillingConfiguration(config, paddle);
      const processed = await repository.getWebhookEvent(
        event.eventId
      );
      if (processed?.completed) {
        return { duplicate: true };
      }

      if (
        event.eventType !== TRANSACTION_COMPLETED &&
        !SUBSCRIPTION_EVENT_TYPES.has(event.eventType)
      ) {
        await repository.markWebhookEventComplete(event);
        return { ignored: true };
      }

      const subscriptionId = eventSubscriptionId(event);
      if (!subscriptionId) {
        if (event.eventType === TRANSACTION_COMPLETED) {
          billingLog(
            logger,
            now,
            "info",
            "paddle_transaction_awaiting_subscription",
            {
              paddle_event_id: event.eventId,
              paddle_transaction_id: event.data?.id ?? null
            }
          );
          await repository.markWebhookEventComplete(event);
          return { awaitingSubscription: true };
        }
        throw new BillingRequestError(
          "Paddle event did not contain a subscription",
          {
            code: "paddle_subscription_missing",
            status: 400
          }
        );
      }

      const result = await syncPaddleSubscription(
        subscriptionId,
        { eventId: event.eventId }
      );
      await repository.markWebhookEventComplete(event);
      return result;
    },

    syncPaddleSubscription
  };
}
