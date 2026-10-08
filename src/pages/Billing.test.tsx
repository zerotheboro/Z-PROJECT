import {
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

import {
  openPaddleCheckout
} from "../services/billing";

describe("Paddle Checkout overlay", () => {
  beforeEach(() => {
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

  it("initializes Paddle sandbox once and opens server-created transactions", async () => {
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

  it("treats frontend completion only as a confirmation callback", async () => {
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
