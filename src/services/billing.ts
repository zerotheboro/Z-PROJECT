import {
  initializePaddle
} from "@paddle/paddle-js";

import type {
  Paddle,
  PaddleEventData
} from "@paddle/paddle-js";
import type {
  User
} from "firebase/auth";

const DEFAULT_API_BASE =
  "https://z-project-ba3t.onrender.com";

type BillingRequestContext = {
  fetcher?: typeof fetch;
  apiBase?: string;
};

type PaddleCheckoutCallbacks = {
  onCompleted: () => void;
  onClosed?: () => void;
  onError?: (message: string) => void;
};

type ActiveCheckout = PaddleCheckoutCallbacks & {
  completed: boolean;
};

let paddlePromise: Promise<Paddle> | null = null;
let activeCheckout: ActiveCheckout | null = null;

export class BillingClientError extends Error {
  code: string | null;
  status: number;

  constructor(
    message: string,
    {
      code = null,
      status = 0
    }: {
      code?: string | null;
      status?: number;
    } = {}
  ) {
    super(message);
    this.name = "BillingClientError";
    this.code = code;
    this.status = status;
  }
}

function apiBase(context: BillingRequestContext) {
  return (
    context.apiBase ??
    import.meta.env.VITE_API_BASE_URL ??
    DEFAULT_API_BASE
  ).replace(/\/$/, "");
}

async function billingRequest(
  user: User,
  path: string,
  responseField: "transactionId" | "url",
  context: BillingRequestContext
): Promise<string> {
  const token = await user.getIdToken();
  const response = await (context.fetcher ?? fetch)(
    `${apiBase(context)}${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: "{}"
    }
  );
  let body: Record<string, unknown> = {};

  try {
    body = await response.json() as Record<
      string,
      unknown
    >;
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new BillingClientError(
      typeof body.error === "string"
        ? body.error
        : "Billing is temporarily unavailable.",
      {
        code: typeof body.code === "string"
          ? body.code
          : null,
        status: response.status
      }
    );
  }

  const value = body[responseField];
  if (
    typeof value !== "string" ||
    (responseField === "transactionId"
      ? !value.startsWith("txn_")
      : !value.startsWith("https://"))
  ) {
    throw new BillingClientError(
      "Billing returned an invalid response."
    );
  }

  return value;
}

export function createCheckoutTransaction(
  user: User,
  context: BillingRequestContext = {}
) {
  return billingRequest(
    user,
    "/api/billing/create-checkout-transaction",
    "transactionId",
    context
  );
}

export function createPortalSession(
  user: User,
  context: BillingRequestContext = {}
) {
  return billingRequest(
    user,
    "/api/billing/create-portal-session",
    "url",
    context
  );
}

function handlePaddleEvent(event: PaddleEventData) {
  if (!activeCheckout) {
    return;
  }

  if (
    event.name === "checkout.completed" &&
    !activeCheckout.completed
  ) {
    activeCheckout.completed = true;
    activeCheckout.onCompleted();
    return;
  }

  if (event.name === "checkout.closed") {
    if (!activeCheckout.completed) {
      activeCheckout.onClosed?.();
    }
    activeCheckout = null;
    return;
  }

  if (
    event.name === "checkout.error" ||
    event.name === "checkout.failed" ||
    event.name === "checkout.payment.error"
  ) {
    activeCheckout.onError?.(
      "Paddle Checkout could not be completed."
    );
  }
}

function getPaddle(): Promise<Paddle> {
  if (paddlePromise) {
    return paddlePromise;
  }

  const token =
    import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  const environment =
    import.meta.env.VITE_PADDLE_ENVIRONMENT?.trim();

  if (
    !token?.startsWith("test_") ||
    environment !== "sandbox"
  ) {
    throw new BillingClientError(
      "Paddle Checkout is not configured for sandbox."
    );
  }

  paddlePromise = initializePaddle({
    token,
    environment: "sandbox",
    eventCallback: handlePaddleEvent
  }).then(paddle => {
    if (!paddle) {
      paddlePromise = null;
      throw new BillingClientError(
        "Paddle Checkout could not be initialized."
      );
    }
    return paddle;
  }).catch(error => {
    paddlePromise = null;
    throw error;
  });

  return paddlePromise;
}

export async function openPaddleCheckout(
  transactionId: string,
  callbacks: PaddleCheckoutCallbacks
): Promise<void> {
  if (!transactionId.startsWith("txn_")) {
    throw new BillingClientError(
      "Paddle Checkout received an invalid transaction."
    );
  }

  activeCheckout = {
    ...callbacks,
    completed: false
  };

  try {
    const paddle = await getPaddle();
    paddle.Checkout.open({ transactionId });
  } catch (error) {
    activeCheckout = null;
    throw error;
  }
}

export function redirectToBillingUrl(url: string) {
  window.location.assign(url);
}
