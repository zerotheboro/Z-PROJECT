import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  PaddleEventData
} from "@paddle/paddle-js";

const paddleMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  open: vi.fn(),
  eventCallback: null as
    | ((event: PaddleEventData) => void)
    | null
}));

vi.mock("@paddle/paddle-js", () => ({
  initializePaddle: paddleMocks.initialize
}));

describe("Paddle Checkout overlay", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv(
      "VITE_PADDLE_CLIENT_TOKEN",
      "test_client_token"
    );
    vi.stubEnv("VITE_PADDLE_ENVIRONMENT", "sandbox");
    paddleMocks.open.mockReset();
    paddleMocks.initialize.mockImplementation(
      async options => {
        paddleMocks.eventCallback =
          options.eventCallback ?? null;
        return {
          Checkout: {
            open: paddleMocks.open
          }
        };
      }
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes Paddle sandbox once and opens server-created transactions", async () => {
    const { openPaddleCheckout } = await import(
      "../services/billing"
    );
    const firstCompleted = vi.fn();
    const secondCompleted = vi.fn();

    await openPaddleCheckout(
      "txn_first",
      { onCompleted: firstCompleted }
    );
    await openPaddleCheckout(
      "txn_second",
      { onCompleted: secondCompleted }
    );

    expect(paddleMocks.initialize).toHaveBeenCalledTimes(1);
    expect(paddleMocks.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "test_client_token",
        environment: "sandbox",
        eventCallback: expect.any(Function)
      })
    );
    expect(paddleMocks.open).toHaveBeenNthCalledWith(
      1,
      { transactionId: "txn_first" }
    );
    expect(paddleMocks.open).toHaveBeenNthCalledWith(
      2,
      { transactionId: "txn_second" }
    );
  });

  it("initializes Paddle production with a live client token", async () => {
    vi.stubEnv(
      "VITE_PADDLE_CLIENT_TOKEN",
      "live_client_token"
    );
    vi.stubEnv(
      "VITE_PADDLE_ENVIRONMENT",
      "production"
    );
    const { openPaddleCheckout } = await import(
      "../services/billing"
    );

    await openPaddleCheckout(
      "txn_production",
      { onCompleted: vi.fn() }
    );

    expect(paddleMocks.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "live_client_token",
        environment: "production",
        eventCallback: expect.any(Function)
      })
    );
  });

  it.each([
    ["live_client_token", "sandbox"],
    ["test_client_token", "production"]
  ])(
    "rejects token %s in the %s environment",
    async (token, environment) => {
      vi.stubEnv("VITE_PADDLE_CLIENT_TOKEN", token);
      vi.stubEnv("VITE_PADDLE_ENVIRONMENT", environment);
      const { openPaddleCheckout } = await import(
        "../services/billing"
      );

      await expect(openPaddleCheckout(
        "txn_mismatch",
        { onCompleted: vi.fn() }
      )).rejects.toMatchObject({
        name: "BillingClientError"
      });
      expect(paddleMocks.initialize)
        .not.toHaveBeenCalled();
    }
  );

  it("treats frontend completion only as a confirmation callback", async () => {
    const { openPaddleCheckout } = await import(
      "../services/billing"
    );
    const onCompleted = vi.fn();

    await openPaddleCheckout(
      "txn_confirm",
      { onCompleted }
    );
    paddleMocks.eventCallback?.({
      name: "checkout.completed"
    } as PaddleEventData);

    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
