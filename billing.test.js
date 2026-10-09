import {
  createHmac
} from "node:crypto";

import {
  Environment,
  Paddle
} from "@paddle/paddle-node-sdk";
import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  BillingMappingError,
  BillingRequestError,
  createFirebaseBillingRepository,
  createPaddleBillingService,
  isPaddlePremiumStatus,
  isValidManualPremiumOverride,
  resolvePaddleConfiguration
} from "./billing.js";

const NOW = Date.UTC(2026, 9, 7, 0, 0);
const PRICE_ID = "pri_01m4b4yepsh970g4z40hf525ng";
const CUSTOMER_ID = "ctm_customer";
const SUBSCRIPTION_ID = "sub_subscription";

function config() {
  return {
    available: true,
    missing: [],
    apiKey: "pdl_sdbx_apikey_test",
    webhookSecret: "pdl_ntfset_test",
    premiumPriceId: PRICE_ID,
    environment: "sandbox"
  };
}

function page(items = []) {
  return {
    next: vi.fn().mockResolvedValue(items)
  };
}

function subscription(overrides = {}) {
  return {
    id: SUBSCRIPTION_ID,
    status: "active",
    customerId: CUSTOMER_ID,
    customData: { firebaseUid: "user-a" },
    currentBillingPeriod: {
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: "2026-11-01T00:00:00.000Z"
    },
    scheduledChange: null,
    items: [{
      price: { id: PRICE_ID },
      quantity: 1
    }],
    ...overrides
  };
}

function paddle(overrides = {}) {
  return {
    customers: {
      list: vi.fn(() => page()),
      create: vi.fn().mockResolvedValue({
        id: CUSTOMER_ID,
        customData: { firebaseUid: "user-a" }
      })
    },
    subscriptions: {
      get: vi.fn().mockResolvedValue(subscription()),
      list: vi.fn(() => page())
    },
    transactions: {
      list: vi.fn(() => page()),
      create: vi.fn().mockResolvedValue({
        id: "txn_created",
        createdAt: new Date(NOW).toISOString(),
        customData: {
          firebaseUid: "user-a",
          billingPurpose: "premium-upgrade"
        },
        items: [{ price: { id: PRICE_ID } }]
      })
    },
    customerPortalSessions: {
      create: vi.fn().mockResolvedValue({
        urls: {
          general: {
            overview:
              "https://customer-portal.paddle.com/test"
          }
        }
      })
    },
    webhooks: {
      unmarshal: vi.fn()
    },
    ...overrides
  };
}

function repository(overrides = {}) {
  const account = {
    firebaseUid: "user-a",
    provider: "paddle",
    paddleCustomerId: CUSTOMER_ID
  };

  return {
    getBillingAccount: vi.fn().mockResolvedValue(account),
    getCustomerMapping: vi.fn().mockResolvedValue({
      firebaseUid: "user-a"
    }),
    claimCustomerCreation: vi.fn().mockResolvedValue({
      claimed: true,
      token: "lock-token"
    }),
    saveCustomerMapping: vi.fn().mockResolvedValue(account),
    releaseCustomerCreation: vi.fn().mockResolvedValue(undefined),
    claimTransactionCreation: vi.fn().mockResolvedValue({
      claimed: true,
      token: "lock-token"
    }),
    savePendingTransaction: vi.fn().mockResolvedValue(undefined),
    releaseTransactionCreation: vi.fn().mockResolvedValue(undefined),
    getWebhookEvent: vi.fn().mockResolvedValue(null),
    markWebhookEventComplete: vi.fn().mockResolvedValue(undefined),
    applySubscriptionSync: vi.fn().mockResolvedValue({
      manualOverridePreserved: false
    }),
    ...overrides
  };
}

function service(options = {}) {
  const paddleClient = options.paddle ?? paddle();
  const billingRepository =
    options.repository ?? repository();
  return {
    paddle: paddleClient,
    repository: billingRepository,
    billing: createPaddleBillingService({
      paddle: paddleClient,
      repository: billingRepository,
      config: options.config ?? config(),
      logger: options.logger ?? {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn()
      },
      now: options.now ?? (() => NOW),
      createToken: () => "lock-token"
    })
  };
}

function webhook(
  eventType,
  data,
  eventId = "evt_test"
) {
  return {
    eventId,
    eventType,
    occurredAt: new Date(NOW).toISOString(),
    data
  };
}

describe("Paddle billing configuration", () => {
  it("accepts matching sandbox server configuration", () => {
    expect(resolvePaddleConfiguration({
      PADDLE_API_KEY:
        "pdl_sdbx_apikey_01234567890123456789012345_secret",
      PADDLE_WEBHOOK_SECRET:
        "pdl_ntfset_01234567890123456789012345_secret",
      PADDLE_PREMIUM_PRICE_ID: PRICE_ID,
      PADDLE_ENVIRONMENT: "sandbox"
    })).toMatchObject({
      available: true,
      environment: "sandbox"
    });
  });

  it("accepts matching production server configuration", () => {
    expect(resolvePaddleConfiguration({
      PADDLE_API_KEY:
        "pdl_live_apikey_01234567890123456789012345_secret",
      PADDLE_WEBHOOK_SECRET:
        "pdl_ntfset_01234567890123456789012345_secret",
      PADDLE_PREMIUM_PRICE_ID: PRICE_ID,
      PADDLE_ENVIRONMENT: "production"
    })).toMatchObject({
      available: true,
      environment: "production"
    });
  });

  it.each([
    ["pdl_live_apikey_secret", "sandbox"],
    ["pdl_sdbx_apikey_secret", "production"]
  ])(
    "rejects a %s key in the %s environment",
    (apiKey, environment) => {
      expect(resolvePaddleConfiguration({
        PADDLE_API_KEY: apiKey,
        PADDLE_WEBHOOK_SECRET: "pdl_ntfset_secret",
        PADDLE_PREMIUM_PRICE_ID: PRICE_ID,
        PADDLE_ENVIRONMENT: environment
      })).toMatchObject({
        available: false,
        missing: ["PADDLE_API_KEY"]
      });
    }
  );

  it("uses an explicit Premium status allowlist", () => {
    expect(isPaddlePremiumStatus("active")).toBe(true);
    expect(isPaddlePremiumStatus("trialing")).toBe(true);
    for (const status of [
      "past_due",
      "paused",
      "canceled",
      "unknown"
    ]) {
      expect(isPaddlePremiumStatus(status)).toBe(false);
    }
  });

  it("verifies Paddle signatures with the official SDK", async () => {
    const rawBody = JSON.stringify({
      event_id: "evt_official",
      event_type: "transaction.completed",
      occurred_at: "2026-10-07T00:00:00.000Z",
      notification_id: "ntf_official",
      data: {
        id: "txn_official",
        status: "completed",
        customer_id: CUSTOMER_ID,
        subscription_id: null,
        custom_data: { firebaseUid: "user-a" },
        items: [],
        payments: []
      }
    });
    const secret = "pdl_ntfset_test_secret";
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", secret)
      .update(`${timestamp}:${rawBody}`)
      .digest("hex");
    const officialPaddle = new Paddle(
      "pdl_sdbx_apikey_test",
      { environment: Environment.sandbox }
    );
    const { billing } = service({
      paddle: officialPaddle,
      config: {
        ...config(),
        webhookSecret: secret
      }
    });

    await expect(billing.constructWebhookEvent(
      rawBody,
      `ts=${timestamp};h1=${digest}`
    )).resolves.toMatchObject({
      eventId: "evt_official",
      eventType: "transaction.completed"
    });
  });
});

describe("Paddle Checkout transaction creation", () => {
  it("reuses a mapped customer and uses the configured price", async () => {
    const setup = service();

    await expect(setup.billing.createCheckoutTransaction({
      uid: "user-a",
      email: "user@example.com"
    })).resolves.toEqual({
      transactionId: "txn_created"
    });

    expect(setup.paddle.customers.create)
      .not.toHaveBeenCalled();
    expect(setup.paddle.transactions.create)
      .toHaveBeenCalledWith({
        items: [{ priceId: PRICE_ID, quantity: 1 }],
        customerId: CUSTOMER_ID,
        collectionMode: "automatic",
        customData: {
          firebaseUid: "user-a",
          billingPurpose: "premium-upgrade"
        }
      });
  });

  it("creates and persists a customer using verified identity", async () => {
    const repo = repository({
      getBillingAccount: vi.fn().mockResolvedValue(null)
    });
    const setup = service({ repository: repo });

    await setup.billing.createCheckoutTransaction({
      uid: "user-a",
      email: "verified@example.com"
    });

    expect(setup.paddle.customers.create)
      .toHaveBeenCalledWith({
        email: "verified@example.com",
        customData: { firebaseUid: "user-a" }
      });
    expect(repo.claimCustomerCreation)
      .toHaveBeenCalledWith(
        "user-a",
        "lock-token",
        NOW
      );
    expect(repo.saveCustomerMapping)
      .toHaveBeenCalledWith(
        "user-a",
        CUSTOMER_ID,
        "lock-token"
      );
  });

  it("rejects a concurrent customer creation claim", async () => {
    const repo = repository({
      getBillingAccount: vi.fn().mockResolvedValue(null),
      claimCustomerCreation: vi.fn().mockResolvedValue({
        busy: true,
        claimed: false
      })
    });
    const setup = service({ repository: repo });

    await expect(
      setup.billing.createCheckoutTransaction({
        uid: "user-a",
        email: "verified@example.com"
      })
    ).rejects.toMatchObject({
      code: "billing_in_progress",
      status: 409
    });
    expect(setup.paddle.customers.create)
      .not.toHaveBeenCalled();
  });

  it("recovers a matching existing customer after an ambiguous retry", async () => {
    const recovered = {
      id: CUSTOMER_ID,
      customData: { firebaseUid: "user-a" }
    };
    const paddleClient = paddle({
      customers: {
        list: vi.fn(() => page([recovered])),
        create: vi.fn()
      }
    });
    const repo = repository({
      getBillingAccount: vi.fn().mockResolvedValue(null)
    });
    const setup = service({
      paddle: paddleClient,
      repository: repo
    });

    await setup.billing.createCheckoutTransaction({
      uid: "user-a",
      email: "verified@example.com"
    });

    expect(paddleClient.customers.create)
      .not.toHaveBeenCalled();
    expect(repo.saveCustomerMapping)
      .toHaveBeenCalledWith(
        "user-a",
        CUSTOMER_ID,
        "lock-token"
      );
  });

  it("reuses a pending transaction instead of creating another", async () => {
    const repo = repository({
      claimTransactionCreation: vi.fn().mockResolvedValue({
        transactionId: "txn_pending",
        claimed: false
      })
    });
    const setup = service({ repository: repo });

    await expect(setup.billing.createCheckoutTransaction({
      uid: "user-a",
      email: "verified@example.com"
    })).resolves.toEqual({
      transactionId: "txn_pending"
    });
    expect(setup.paddle.transactions.create)
      .not.toHaveBeenCalled();
  });

  it.each(["active", "trialing"])(
    "blocks duplicate purchase for a %s subscription",
    async status => {
      const paddleClient = paddle();
      paddleClient.subscriptions.list.mockReturnValue(
        page([subscription({ status })])
      );
      const setup = service({ paddle: paddleClient });

      await expect(
        setup.billing.createCheckoutTransaction({
          uid: "user-a",
          email: "verified@example.com"
        })
      ).rejects.toMatchObject({
        code: "paddle_subscription_exists",
        status: 409
      });
      expect(paddleClient.transactions.create)
        .not.toHaveBeenCalled();
    }
  );

  it("does not persist entitlement when transaction creation fails", async () => {
    const paddleClient = paddle();
    paddleClient.transactions.create.mockRejectedValue(
      new Error("Paddle unavailable")
    );
    const setup = service({ paddle: paddleClient });

    await expect(
      setup.billing.createCheckoutTransaction({
        uid: "user-a",
        email: "verified@example.com"
      })
    ).rejects.toThrow("Paddle unavailable");
    expect(setup.repository.applySubscriptionSync)
      .not.toHaveBeenCalled();
    expect(setup.repository.releaseTransactionCreation)
      .toHaveBeenCalled();
  });
});

describe("Paddle subscription reconciliation", () => {
  it.each([
    ["active", true],
    ["trialing", true],
    ["past_due", false],
    ["paused", false],
    ["canceled", false],
    ["unknown", false]
  ])("maps %s to Premium=%s", async (status, eligible) => {
    const paddleClient = paddle();
    paddleClient.subscriptions.get.mockResolvedValue(
      subscription({ status })
    );
    const setup = service({ paddle: paddleClient });

    await expect(
      setup.billing.syncPaddleSubscription(
        SUBSCRIPTION_ID
      )
    ).resolves.toMatchObject({ eligible });
    expect(setup.repository.applySubscriptionSync)
      .toHaveBeenCalledWith(expect.objectContaining({
        entitlement: {
          plan: eligible ? "premium" : "free",
          source: "paddle",
          validUntil: null
        }
      }));
  });

  it.each(["cancel", "pause"])(
    "keeps active Premium while a future %s is scheduled",
    async action => {
      const paddleClient = paddle();
      paddleClient.subscriptions.get.mockResolvedValue(
        subscription({
          status: "active",
          scheduledChange: {
            action,
            effectiveAt:
              "2026-11-01T00:00:00.000Z",
            resumeAt: null
          }
        })
      );
      const setup = service({ paddle: paddleClient });

      await expect(
        setup.billing.syncPaddleSubscription(
          SUBSCRIPTION_ID
        )
      ).resolves.toMatchObject({ eligible: true });
      expect(setup.repository.applySubscriptionSync)
        .toHaveBeenCalledWith(expect.objectContaining({
          entitlement: expect.objectContaining({
            plan: "premium"
          }),
          billingState: expect.objectContaining({
            scheduledChange: expect.objectContaining({
              action
            })
          })
        }));
    }
  );

  it("uses current Paddle state instead of stale event state", async () => {
    const paddleClient = paddle();
    paddleClient.subscriptions.get.mockResolvedValue(
      subscription({ status: "canceled" })
    );
    const setup = service({ paddle: paddleClient });

    await setup.billing.handleWebhookEvent(webhook(
      "subscription.updated",
      {
        id: SUBSCRIPTION_ID,
        status: "active"
      }
    ));

    expect(setup.repository.applySubscriptionSync)
      .toHaveBeenCalledWith(expect.objectContaining({
        entitlement: expect.objectContaining({
          plan: "free"
        })
      }));
  });

  it("retrieves the subscription after completed transaction when available", async () => {
    const setup = service();

    await setup.billing.handleWebhookEvent(webhook(
      "transaction.completed",
      {
        id: "txn_completed",
        subscriptionId: SUBSCRIPTION_ID
      }
    ));

    expect(setup.paddle.subscriptions.get)
      .toHaveBeenCalledWith(SUBSCRIPTION_ID);
  });

  it("does not grant Premium from transaction completion alone", async () => {
    const setup = service();

    await expect(
      setup.billing.handleWebhookEvent(webhook(
        "transaction.completed",
        {
          id: "txn_completed",
          subscriptionId: null,
          customData: { firebaseUid: "attacker" }
        }
      ))
    ).resolves.toEqual({
      awaitingSubscription: true
    });
    expect(setup.repository.applySubscriptionSync)
      .not.toHaveBeenCalled();
    expect(setup.repository.markWebhookEventComplete)
      .toHaveBeenCalled();
  });

  it("treats a repeated event as idempotent", async () => {
    const event = webhook(
      "subscription.updated",
      { id: SUBSCRIPTION_ID }
    );
    const repo = repository({
      getWebhookEvent: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ completed: true })
    });
    const setup = service({ repository: repo });

    await setup.billing.handleWebhookEvent(event);
    await expect(
      setup.billing.handleWebhookEvent(event)
    ).resolves.toEqual({ duplicate: true });
    expect(setup.paddle.subscriptions.get)
      .toHaveBeenCalledTimes(1);
  });

  it("does not mark failed synchronization complete", async () => {
    const paddleClient = paddle();
    paddleClient.subscriptions.get.mockRejectedValue(
      new Error("temporary failure")
    );
    const setup = service({ paddle: paddleClient });

    await expect(
      setup.billing.handleWebhookEvent(webhook(
        "subscription.updated",
        { id: SUBSCRIPTION_ID }
      ))
    ).rejects.toThrow("temporary failure");
    expect(setup.repository.markWebhookEventComplete)
      .not.toHaveBeenCalled();
  });

  it("rejects customer, account, or custom-data mismatch", async () => {
    const paddleClient = paddle();
    paddleClient.subscriptions.get.mockResolvedValue(
      subscription({
        customData: { firebaseUid: "attacker" }
      })
    );
    const setup = service({ paddle: paddleClient });

    await expect(
      setup.billing.syncPaddleSubscription(
        SUBSCRIPTION_ID
      )
    ).rejects.toBeInstanceOf(BillingMappingError);
    expect(setup.repository.applySubscriptionSync)
      .not.toHaveBeenCalled();
  });

  it("requires the configured Premium price", async () => {
    const paddleClient = paddle();
    paddleClient.subscriptions.get.mockResolvedValue(
      subscription({
        items: [{ price: { id: "pri_other" } }]
      })
    );
    const setup = service({ paddle: paddleClient });

    await setup.billing.syncPaddleSubscription(
      SUBSCRIPTION_ID
    );

    expect(setup.repository.applySubscriptionSync)
      .toHaveBeenCalledWith(expect.objectContaining({
        entitlement: expect.objectContaining({
          plan: "free"
        })
      }));
  });

  it("safely ignores unrelated events", async () => {
    const setup = service();

    await expect(
      setup.billing.handleWebhookEvent(webhook(
        "customer.updated",
        { id: CUSTOMER_ID }
      ))
    ).resolves.toEqual({ ignored: true });
    expect(setup.repository.markWebhookEventComplete)
      .toHaveBeenCalled();
  });
});

describe("Paddle Customer Portal", () => {
  it("uses only the trusted customer and does not persist the URL", async () => {
    const setup = service({
      repository: repository({
        getBillingAccount:
          vi.fn().mockResolvedValue({
            firebaseUid: "user-a",
            paddleCustomerId: CUSTOMER_ID,
            paddleSubscriptionId: SUBSCRIPTION_ID
          })
      })
    });

    await expect(
      setup.billing.createPortalSession("user-a")
    ).resolves.toEqual({
      url: "https://customer-portal.paddle.com/test"
    });
    expect(
      setup.paddle.customerPortalSessions.create
    ).toHaveBeenCalledWith(
      CUSTOMER_ID,
      [SUBSCRIPTION_ID]
    );
    expect(setup.repository.savePendingTransaction)
      .not.toHaveBeenCalled();
    expect(setup.repository.applySubscriptionSync)
      .not.toHaveBeenCalled();
  });

  it("returns a safe error when no subscription can be managed", async () => {
    const setup = service({
      repository: repository({
        getBillingAccount:
          vi.fn().mockResolvedValue({
            firebaseUid: "user-a",
            paddleCustomerId: CUSTOMER_ID
          })
      })
    });

    await expect(
      setup.billing.createPortalSession("user-a")
    ).rejects.toBeInstanceOf(BillingRequestError);
  });
});

describe("manual Premium override safety", () => {
  it("recognizes only a still-valid manual override", () => {
    expect(isValidManualPremiumOverride({
      plan: "premium",
      source: "manual",
      validUntil: null
    }, NOW)).toBe(true);
    expect(isValidManualPremiumOverride({
      plan: "premium",
      source: "manual",
      validUntil: new Date(NOW - 1)
    }, NOW)).toBe(false);
    expect(isValidManualPremiumOverride({
      plan: "premium",
      source: "paddle",
      validUntil: null
    }, NOW)).toBe(false);
  });

  it("keeps an active manual entitlement during Paddle downgrade", async () => {
    const firestore = new FakeFirestore();
    firestore.seed("billingAccounts/user-a", {
      firebaseUid: "user-a",
      paddleCustomerId: CUSTOMER_ID
    });
    firestore.seed(
      "users/user-a/entitlements/current",
      {
        plan: "premium",
        source: "manual",
        validUntil: null
      }
    );
    const repo = createFirebaseBillingRepository({
      getFirestore: () => firestore
    });

    await repo.applySubscriptionSync({
      uid: "user-a",
      customerId: CUSTOMER_ID,
      nowValue: NOW,
      billingState: {
        paddleSubscriptionId: SUBSCRIPTION_ID,
        subscriptionStatus: "canceled"
      },
      entitlement: {
        plan: "free",
        source: "paddle",
        validUntil: null
      }
    });

    expect(firestore.read(
      "users/user-a/entitlements/current"
    )).toMatchObject({
      plan: "premium",
      source: "manual"
    });
  });
});

class FakeSnapshot {
  constructor(value) {
    this.value = value;
    this.exists = value !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeReference {
  constructor(firestore, path) {
    this.firestore = firestore;
    this.path = path;
  }

  collection(name) {
    return new FakeCollection(
      this.firestore,
      `${this.path}/${name}`
    );
  }

  get() {
    return Promise.resolve(new FakeSnapshot(
      this.firestore.read(this.path)
    ));
  }
}

class FakeCollection {
  constructor(firestore, path) {
    this.firestore = firestore;
    this.path = path;
  }

  doc(id) {
    return new FakeReference(
      this.firestore,
      `${this.path}/${id}`
    );
  }
}

class FakeFirestore {
  constructor() {
    this.documents = new Map();
  }

  collection(name) {
    return new FakeCollection(this, name);
  }

  seed(path, value) {
    this.documents.set(path, value);
  }

  read(path) {
    return this.documents.get(path);
  }

  runTransaction(callback) {
    const writes = [];
    const transaction = {
      get: reference => reference.get(),
      set: (reference, data, options) => {
        writes.push({ reference, data, options });
      }
    };

    return Promise.resolve(callback(transaction)).then(result => {
      for (const { reference, data, options } of writes) {
        const current = options?.merge
          ? this.read(reference.path) ?? {}
          : {};
        this.documents.set(reference.path, {
          ...current,
          ...data
        });
      }
      return result;
    });
  }
}
