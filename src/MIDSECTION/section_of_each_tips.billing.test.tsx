// @vitest-environment jsdom

import React from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const billingMocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  open: vi.fn(),
  refreshAccess: vi.fn(),
  user: null as { uid: string } | null
}));

vi.mock("./info_every_tips.jsx", () => ({
  Customize: () => null,
  get_list_of_tips: () => [],
  loadcustomized_user_list: () => []
}));

vi.mock("./SCROLL_function.jsx", () => ({
  default: vi.fn()
}));

vi.mock("./TABLE.jsx", () => ({
  default: () => null
}));

vi.mock("../HEADER/header.jsx", () => ({
  default: () => <nav>Navigation</nav>
}));

vi.mock("../footer.jsx", () => ({
  default: () => <footer>Footer</footer>
}));

vi.mock("./AIRecomendation.jsx", () => ({
  default: () => null
}));

vi.mock("../hooks/useTrainingAccess", () => ({
  useTrainingAccess: () => ({
    user: billingMocks.user,
    refreshAccess: billingMocks.refreshAccess
  })
}));

vi.mock("../services/billing", () => ({
  createCheckoutTransaction: billingMocks.checkout,
  openPaddleCheckout: billingMocks.open
}));

import Tips from "./section_of_each_tips.jsx";

function renderTips() {
  return render(
    <MemoryRouter>
      <Tips />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  billingMocks.user = null;
  billingMocks.checkout.mockReset();
  billingMocks.checkout.mockResolvedValue("txn_test");
  billingMocks.open.mockReset();
  billingMocks.open.mockResolvedValue(undefined);
  billingMocks.refreshAccess.mockReset();
});

describe("homepage Premium checkout", () => {
  it("uses provider-neutral public billing copy", () => {
    renderTips();

    expect(screen.getByText(
      "Cancel anytime. Taxes may vary by location."
    )).toBeTruthy();
    expect(screen.queryByText(/Merchant of Record/i))
      .toBeNull();
    expect(screen.queryByText(/powered by Paddle/i))
      .toBeNull();
  });

  it("asks signed-out visitors to sign in without creating Checkout", () => {
    renderTips();

    fireEvent.click(screen.getByRole("button", {
      name: "Get Edulience Premium"
    }));

    expect(screen.getByRole("alert").textContent)
      .toContain("Sign in to upgrade");
    expect(billingMocks.checkout).not.toHaveBeenCalled();
  });

  it("blocks duplicate clicks and refreshes access after completion", async () => {
    let resolveTransaction: (id: string) => void = () => undefined;
    let completeCheckout: () => void = () => undefined;

    billingMocks.user = { uid: "user-a" };
    billingMocks.checkout.mockReturnValue(
      new Promise<string>(resolve => {
        resolveTransaction = resolve;
      })
    );
    billingMocks.open.mockImplementation(
      async (
        _transactionId: string,
        callbacks: { onCompleted: () => void }
      ) => {
        completeCheckout = callbacks.onCompleted;
      }
    );

    renderTips();

    const upgrade = screen.getByRole("button", {
      name: "Get Edulience Premium"
    });
    fireEvent.click(upgrade);
    fireEvent.click(upgrade);

    expect(billingMocks.checkout).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", {
      name: "Opening checkout..."
    }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveTransaction("txn_test");
    });

    expect(billingMocks.open).toHaveBeenCalledWith(
      "txn_test",
      expect.objectContaining({
        onCompleted: expect.any(Function),
        onClosed: expect.any(Function),
        onError: expect.any(Function)
      })
    );

    act(() => completeCheckout());

    expect(billingMocks.refreshAccess).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", {
      name: "Get Edulience Premium"
    }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows checkout request errors", async () => {
    billingMocks.user = { uid: "user-a" };
    billingMocks.checkout.mockRejectedValue(
      new Error("Billing is temporarily unavailable")
    );
    renderTips();

    fireEvent.click(screen.getByRole("button", {
      name: "Get Edulience Premium"
    }));

    expect((await screen.findByRole("alert")).textContent)
      .toContain("Billing is temporarily unavailable");
    expect(billingMocks.open).not.toHaveBeenCalled();
  });

  it("shows errors reported by Paddle Checkout", async () => {
    let failCheckout: (message: string) => void = () => undefined;

    billingMocks.user = { uid: "user-a" };
    billingMocks.open.mockImplementation(
      async (
        _transactionId: string,
        callbacks: { onError?: (message: string) => void }
      ) => {
        failCheckout = callbacks.onError ?? (() => undefined);
      }
    );
    renderTips();

    fireEvent.click(screen.getByRole("button", {
      name: "Get Edulience Premium"
    }));

    await vi.waitFor(() => {
      expect(billingMocks.open).toHaveBeenCalled();
    });
    act(() => failCheckout("Paddle Checkout could not open."));

    expect(screen.getByRole("alert").textContent)
      .toContain("Paddle Checkout could not open.");
    expect((screen.getByRole("button", {
      name: "Get Edulience Premium"
    }) as HTMLButtonElement).disabled).toBe(false);
  });
});
