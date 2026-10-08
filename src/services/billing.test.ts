import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  BillingClientError,
  createCheckoutTransaction,
  createPortalSession
} from "./billing";

function user() {
  return {
    getIdToken: vi.fn().mockResolvedValue(
      "firebase-token"
    )
  } as never;
}

function response(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("billing client", () => {
  it("requests a Paddle transaction with only a Firebase bearer token", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({ transactionId: "txn_test" })
    );

    await expect(createCheckoutTransaction(user(), {
      fetcher,
      apiBase: "https://api.example"
    })).resolves.toBe("txn_test");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example/api/billing/create-checkout-transaction",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer firebase-token",
          "Content-Type": "application/json"
        },
        body: "{}"
      }
    );
  });

  it("uses the trusted portal endpoint without a customer ID", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        url: "https://customer-portal.paddle.com/test"
      })
    );

    await createPortalSession(user(), {
      fetcher,
      apiBase: "https://api.example/"
    });

    expect(fetcher.mock.calls[0][1].body).toBe("{}");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.example/api/billing/create-portal-session"
    );
  });

  it("preserves safe server billing errors", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        error: "A Paddle subscription already exists.",
        code: "paddle_subscription_exists"
      }, 409)
    );

    await expect(createCheckoutTransaction(user(), {
      fetcher
    })).rejects.toEqual(expect.objectContaining({
      name: "BillingClientError",
      message: "A Paddle subscription already exists.",
      code: "paddle_subscription_exists",
      status: 409
    } satisfies Partial<BillingClientError>));
  });

  it("rejects malformed billing responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({ transactionId: "not-a-transaction" })
    );

    await expect(createCheckoutTransaction(user(), {
      fetcher
    })).rejects.toThrow(
      "Billing returned an invalid response."
    );
  });
});
