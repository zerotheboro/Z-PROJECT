import {
  once
} from "node:events";

import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  BillingConfigurationError,
  BillingRequestError
} from "./billing.js";
import {
  FirebaseAdminConfigurationError
} from "./firebaseAdmin.js";
import {
  createRecommendationApp
} from "./server.js";

const servers = new Set();

afterEach(async () => {
  await Promise.all(
    [...servers].map(server => new Promise(resolve => {
      server.close(resolve);
    }))
  );
  servers.clear();
});

function billingService() {
  return {
    constructWebhookEvent: vi.fn().mockResolvedValue({
      eventId: "evt_test",
      eventType: "subscription.updated",
      data: { id: "sub_test" }
    }),
    handleWebhookEvent: vi.fn().mockResolvedValue({
      eligible: true
    }),
    createCheckoutTransaction: vi.fn().mockResolvedValue({
      transactionId: "txn_test"
    }),
    createPortalSession: vi.fn().mockResolvedValue({
      url: "https://customer-portal.paddle.com/test"
    })
  };
}

function trainingQuotaManager() {
  return {
    getAccess: vi.fn().mockResolvedValue({
      plan: "free",
      planSource: "default",
      limits: {
        testMePerDay: 1,
        manualMethodsPerDay: 3
      },
      usage: {
        testMeStarted: 0,
        manualMethodsStarted: 0
      },
      remaining: {
        testMe: 1,
        manualMethods: 3
      },
      unlimited: false,
      dayKey: "2026-10-07",
      timezone: "UTC"
    }),
    reserve: vi.fn()
  };
}

function openAIClient() {
  return {
    responses: {
      create: vi.fn()
    }
  };
}

async function start(options = {}) {
  const app = createRecommendationApp({
    openAIClient: openAIClient(),
    trainingQuotaManager: trainingQuotaManager(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn()
    },
    ...options
  });
  const server = app.listen(0, "127.0.0.1");
  servers.add(server);
  await once(server, "listening");
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function authHeaders() {
  return {
    Authorization: "Bearer valid-token",
    "Content-Type": "application/json"
  };
}

describe("Paddle billing HTTP endpoints", () => {
  it("requires verified authentication for Checkout", async () => {
    const billing = billingService();
    const base = await start({ billingService: billing });

    const response = await fetch(
      `${base}/api/billing/create-checkout-transaction`,
      { method: "POST" }
    );

    expect(response.status).toBe(401);
    expect(billing.createCheckoutTransaction)
      .not.toHaveBeenCalled();
  });

  it("rejects an invalid Firebase bearer", async () => {
    const billing = billingService();
    const base = await start({
      billingService: billing,
      verifyFirebaseToken: vi.fn().mockRejectedValue(
        new Error("invalid")
      )
    });

    const response = await fetch(
      `${base}/api/billing/create-checkout-transaction`,
      {
        method: "POST",
        headers: authHeaders(),
        body: "{}"
      }
    );

    expect(response.status).toBe(401);
  });

  it("returns 503 when Firebase Admin authentication is unavailable", async () => {
    const billing = billingService();
    const base = await start({
      billingService: billing,
      verifyFirebaseToken: vi.fn().mockRejectedValue(
        new FirebaseAdminConfigurationError(
          "firebase_admin_credentials_missing",
          "missing"
        )
      )
    });

    const response = await fetch(
      `${base}/api/billing/create-checkout-transaction`,
      {
        method: "POST",
        headers: authHeaders(),
        body: "{}"
      }
    );

    expect(response.status).toBe(503);
    expect(billing.createCheckoutTransaction)
      .not.toHaveBeenCalled();
  });

  it("uses only the verified UID and email for Checkout", async () => {
    const billing = billingService();
    const base = await start({
      billingService: billing,
      verifyFirebaseToken: vi.fn().mockResolvedValue({
        uid: "verified-user",
        email: "verified@example.com"
      })
    });

    const response = await fetch(
      `${base}/api/billing/create-checkout-transaction`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          uid: "attacker",
          email: "attacker@example.com",
          priceId: "pri_attacker",
          customerId: "ctm_attacker",
          plan: "premium"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      transactionId: "txn_test"
    });
    expect(billing.createCheckoutTransaction)
      .toHaveBeenCalledWith({
        uid: "verified-user",
        email: "verified@example.com"
      });
  });

  it("returns 503 only for billing when Paddle is unconfigured", async () => {
    const billing = billingService();
    billing.createCheckoutTransaction.mockRejectedValue(
      new BillingConfigurationError()
    );
    const quota = trainingQuotaManager();
    const base = await start({
      billingService: billing,
      trainingQuotaManager: quota,
      verifyFirebaseToken: vi.fn().mockResolvedValue({
        uid: "verified-user",
        email: "verified@example.com"
      })
    });

    const billingResponse = await fetch(
      `${base}/api/billing/create-checkout-transaction`,
      {
        method: "POST",
        headers: authHeaders(),
        body: "{}"
      }
    );
    const accessResponse = await fetch(
      `${base}/api/training/access?timezone=UTC`,
      { headers: authHeaders() }
    );

    expect(billingResponse.status).toBe(503);
    expect(accessResponse.status).toBe(200);
  });

  it("requires verified authentication for the Customer Portal", async () => {
    const billing = billingService();
    const base = await start({ billingService: billing });

    const response = await fetch(
      `${base}/api/billing/create-portal-session`,
      { method: "POST" }
    );

    expect(response.status).toBe(401);
    expect(billing.createPortalSession)
      .not.toHaveBeenCalled();
  });

  it("resolves the portal customer only through the verified user", async () => {
    const billing = billingService();
    const base = await start({
      billingService: billing,
      verifyFirebaseToken: vi.fn().mockResolvedValue({
        uid: "verified-user"
      })
    });

    const response = await fetch(
      `${base}/api/billing/create-portal-session`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          customerId: "ctm_attacker"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(billing.createPortalSession)
      .toHaveBeenCalledWith("verified-user");
  });

  it("returns a safe portal error without altering entitlement", async () => {
    const billing = billingService();
    billing.createPortalSession.mockRejectedValue(
      new BillingRequestError(
        "No Paddle subscription is available to manage.",
        {
          code: "paddle_subscription_missing",
          status: 404
        }
      )
    );
    const base = await start({
      billingService: billing,
      verifyFirebaseToken: vi.fn().mockResolvedValue({
        uid: "verified-user"
      })
    });

    const response = await fetch(
      `${base}/api/billing/create-portal-session`,
      {
        method: "POST",
        headers: authHeaders(),
        body: "{}"
      }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "paddle_subscription_missing"
    });
  });

  it("verifies raw Paddle webhooks before normal JSON middleware", async () => {
    const billing = billingService();
    const quota = trainingQuotaManager();
    const rawBody = JSON.stringify({
      event_id: "evt_test",
      event_type: "subscription.updated",
      data: { id: "sub_test" }
    });
    const base = await start({
      billingService: billing,
      trainingQuotaManager: quota,
      verifyFirebaseToken: vi.fn().mockResolvedValue({
        uid: "verified-user"
      })
    });

    const webhookResponse = await fetch(
      `${base}/api/billing/paddle-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Paddle-Signature": "ts=1;h1=signed"
        },
        body: rawBody
      }
    );
    const accessResponse = await fetch(
      `${base}/api/training/access?timezone=UTC`,
      { headers: authHeaders() }
    );

    expect(webhookResponse.status).toBe(200);
    expect(billing.constructWebhookEvent)
      .toHaveBeenCalledWith(
        rawBody,
        "ts=1;h1=signed"
      );
    expect(billing.handleWebhookEvent)
      .toHaveBeenCalled();
    expect(accessResponse.status).toBe(200);
    expect(quota.getAccess)
      .toHaveBeenCalledWith("verified-user", "UTC");
  });

  it("rejects invalid or forged webhook signatures", async () => {
    const billing = billingService();
    billing.constructWebhookEvent.mockRejectedValue(
      new Error("invalid signature")
    );
    const base = await start({ billingService: billing });

    const response = await fetch(
      `${base}/api/billing/paddle-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_type: "subscription.activated",
          data: {
            id: "sub_forged",
            custom_data: {
              firebaseUid: "attacker"
            }
          }
        })
      }
    );

    expect(response.status).toBe(400);
    expect(billing.handleWebhookEvent)
      .not.toHaveBeenCalled();
  });
});
