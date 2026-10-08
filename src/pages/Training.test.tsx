// @vitest-environment jsdom

import React from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes
} from "react-router-dom";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  createTrainingDraft
} from "../quiz/trainingProgress";

const draftMocks = vi.hoisted(() => ({
  state: {
    loading: false,
    user: null as { uid: string } | null,
    owner: { kind: "guest" } as
      | { kind: "guest" }
      | { kind: "user"; uid: string },
    validation: null as ReturnType<
      typeof import("../quiz/trainingProgress").validateTrainingDraft
    > | null,
    error: null as string | null,
    reload: vi.fn()
  },
  discard: vi.fn(),
  forceDiscard: vi.fn()
}));

const accessMocks = vi.hoisted(() => ({
  state: {
    loading: false,
    error: null as string | null,
    user: null as { uid: string } | null,
    plan: "free" as "free" | "premium",
    planSource: "default" as
      "default" | "manual" | "paddle",
    unlimited: false,
    testMeUsed: 0,
    testMeLimit: 1,
    testMeRemaining: 1 as number | null,
    manualMethodsUsed: 0,
    manualMethodsLimit: 3,
    manualMethodsRemaining: 3 as number | null,
    refreshAccess: vi.fn()
  },
  start: vi.fn()
}));

const aiAccessMocks = vi.hoisted(() => ({
  state: {
    loading: false,
    error: null as string | null,
    user: null as { uid: string } | null,
    access: {
      limit: 2,
      used: 0,
      remaining: 2,
      plan: "guest" as "guest" | "free" | "premium",
      dayKey: "2026-10-08",
      timezone: "UTC" as const
    },
    refreshAccess: vi.fn()
  }
}));

const billingMocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  open: vi.fn(),
  portal: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("../HEADER/header", () => ({
  default: () => <nav>Navigation</nav>
}));

vi.mock(
  "../components/LearningProfileStatus",
  () => ({
    default: () => (
      <section>Profile status</section>
    )
  })
);

vi.mock("../hooks/useTrainingStreak", () => ({
  useTrainingStreak: () => ({
    loading: false,
    error: null,
    currentStreak: 3,
    longestStreak: 5,
    lastCompletedDay: "2026-10-06",
    totalActiveDays: 8,
    completedToday: true,
    reload: vi.fn()
  })
}));

vi.mock("../hooks/useTrainingAccess", () => ({
  useTrainingAccess: () => accessMocks.state
}));

vi.mock("../hooks/useAIRecommendationAccess", () => ({
  useAIRecommendationAccess: () => aiAccessMocks.state
}));

vi.mock("../quiz/useAvailableTrainingDraft", () => ({
  useAvailableTrainingDraft: () => draftMocks.state
}));

vi.mock("../services/trainingProgress", () => ({
  discardTrainingDraft: draftMocks.discard,
  forceDiscardTrainingDraft: draftMocks.forceDiscard
}));

vi.mock("../services/startTrainingSession", () => ({
  startTrainingSession: accessMocks.start
}));

vi.mock("../services/billing", () => ({
  createCheckoutTransaction: billingMocks.checkout,
  openPaddleCheckout: billingMocks.open,
  createPortalSession: billingMocks.portal,
  redirectToBillingUrl: billingMocks.redirect
}));

import Training from "./Training";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  draftMocks.state.loading = false;
  draftMocks.state.user = null;
  draftMocks.state.owner = { kind: "guest" };
  draftMocks.state.validation = null;
  draftMocks.state.error = null;
  draftMocks.state.reload.mockReset();
  draftMocks.discard.mockReset();
  draftMocks.discard.mockResolvedValue(undefined);
  draftMocks.forceDiscard.mockReset();
  draftMocks.forceDiscard.mockResolvedValue(undefined);
  accessMocks.state.loading = false;
  accessMocks.state.error = null;
  accessMocks.state.user = null;
  accessMocks.state.plan = "free";
  accessMocks.state.planSource = "default";
  accessMocks.state.unlimited = false;
  accessMocks.state.testMeUsed = 0;
  accessMocks.state.testMeRemaining = 1;
  accessMocks.state.manualMethodsUsed = 0;
  accessMocks.state.manualMethodsRemaining = 3;
  accessMocks.state.refreshAccess.mockReset();
  aiAccessMocks.state.loading = false;
  aiAccessMocks.state.error = null;
  aiAccessMocks.state.user = null;
  aiAccessMocks.state.access.limit = 2;
  aiAccessMocks.state.access.used = 0;
  aiAccessMocks.state.access.remaining = 2;
  aiAccessMocks.state.access.plan = "guest";
  aiAccessMocks.state.refreshAccess.mockReset();
  accessMocks.start.mockReset();
  accessMocks.start.mockResolvedValue({
    sessionId: "session-0001"
  });
  billingMocks.checkout.mockReset();
  billingMocks.checkout.mockResolvedValue(
    "txn_test"
  );
  billingMocks.open.mockReset();
  billingMocks.open.mockResolvedValue(undefined);
  billingMocks.portal.mockReset();
  billingMocks.portal.mockResolvedValue(
    "https://customer-portal.paddle.com/test"
  );
  billingMocks.redirect.mockReset();
});

function renderTraining() {
  return render(
    <MemoryRouter
      initialEntries={["/training"]}
    >
      <Routes>
        <Route
          path="/training"
          element={<Training />}
        />
        <Route
          path="/training/assessment"
          element={<p>Assessment route</p>}
        />
        <Route
          path="/training/choose"
          element={<p>Choose route</p>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("training entry choices", () => {
  it("shows both training modes", () => {
    renderTraining();

    expect(
      screen.getByRole("heading", {
        name: "Test me"
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Choose my methods"
      })
    ).toBeTruthy();
  });

  it("shows persisted daily streak status", () => {
    renderTraining();

    expect(screen.getByRole("heading", {
      name: "🔥 3 day streak"
    })).toBeTruthy();
    expect(screen.getByText("You've trained today ✓"))
      .toBeTruthy();
  });

  it("routes Test me to the existing assessment", async () => {
    renderTraining();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start assessment"
      })
    );

    expect(
      await screen.findByText("Assessment route")
    ).toBeTruthy();
  });

  it("routes manual selection to the method picker", async () => {
    renderTraining();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Choose methods"
      })
    );

    expect(
      await screen.findByText("Choose route")
    ).toBeTruthy();
  });

  it("shows free daily usage and blocks Test Me after 1 of 1", () => {
    accessMocks.state.testMeUsed = 1;
    accessMocks.state.testMeRemaining = 0;
    accessMocks.state.manualMethodsUsed = 2;
    accessMocks.state.manualMethodsRemaining = 1;
    aiAccessMocks.state.access.limit = 7;
    aiAccessMocks.state.access.used = 3;
    aiAccessMocks.state.access.remaining = 4;
    aiAccessMocks.state.access.plan = "free";

    renderTraining();

    expect(screen.getByText("FREE PLAN")).toBeTruthy();
    expect(screen.getByText("1 / 1 used today"))
      .toBeTruthy();
    expect(screen.getByText("2 / 3 used today"))
      .toBeTruthy();
    expect(screen.getByText("3 / 7 used today"))
      .toBeTruthy();
    expect((screen.getByRole("button", {
      name: "Daily Test Me used"
    }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Come back tomorrow or upgrade."))
      .toBeTruthy();
  });

  it("shows Premium as unlimited", () => {
    accessMocks.state.plan = "premium";
    accessMocks.state.unlimited = true;
    accessMocks.state.testMeRemaining = null;
    accessMocks.state.manualMethodsRemaining = null;
    aiAccessMocks.state.access.limit = 16;
    aiAccessMocks.state.access.used = 5;
    aiAccessMocks.state.access.remaining = 11;
    aiAccessMocks.state.access.plan = "premium";

    renderTraining();

    expect(screen.getByText("PREMIUM")).toBeTruthy();
    expect(screen.getByText("Unlimited Training"))
      .toBeTruthy();
    expect(screen.getAllByText("Unlimited", {
      selector: "strong"
    })).toHaveLength(2);
    expect(screen.getByText("5 / 16 used today"))
      .toBeTruthy();
  });

  it("opens Paddle Checkout with a server-created transaction", async () => {
    const user = { uid: "user-a" };
    accessMocks.state.user = user;
    draftMocks.state.owner = {
      kind: "user",
      uid: "user-a"
    };
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Upgrade to Premium"
    }));

    expect(billingMocks.checkout)
      .toHaveBeenCalledWith(user);
    await vi.waitFor(() => {
      expect(billingMocks.open).toHaveBeenCalledWith(
        "txn_test",
        expect.objectContaining({
          onCompleted: expect.any(Function),
          onClosed: expect.any(Function),
          onError: expect.any(Function)
        })
      );
    });
    expect(billingMocks.redirect).not.toHaveBeenCalled();
  });

  it("disables duplicate Upgrade clicks while Checkout is loading", async () => {
    let resolveCheckout: (id: string) => void = () => undefined;
    billingMocks.checkout.mockReturnValue(
      new Promise<string>(resolve => {
        resolveCheckout = resolve;
      })
    );
    accessMocks.state.user = { uid: "user-a" };
    draftMocks.state.owner = {
      kind: "user",
      uid: "user-a"
    };
    renderTraining();

    const upgrade = screen.getByRole("button", {
      name: "Upgrade to Premium"
    });
    fireEvent.click(upgrade);
    fireEvent.click(upgrade);

    expect(billingMocks.checkout).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", {
      name: "Opening checkout..."
    }) as HTMLButtonElement).disabled).toBe(true);
    resolveCheckout("txn_test");
  });

  it("uses Paddle completion only to refresh authoritative access", async () => {
    let completeCheckout: () => void = () => undefined;
    billingMocks.open.mockImplementation(
      async (
        _transactionId: string,
        callbacks: { onCompleted: () => void }
      ) => {
        completeCheckout = callbacks.onCompleted;
      }
    );
    accessMocks.state.user = { uid: "user-a" };
    draftMocks.state.owner = {
      kind: "user",
      uid: "user-a"
    };
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Upgrade to Premium"
    }));
    await vi.waitFor(() => {
      expect(billingMocks.open).toHaveBeenCalled();
    });
    act(() => completeCheckout());

    expect(accessMocks.state.plan).toBe("free");
    expect(screen.getByText("FREE PLAN")).toBeTruthy();
    expect(screen.getByRole("status").textContent)
      .toContain("Confirming Premium");
    expect(accessMocks.state.refreshAccess)
      .toHaveBeenCalledTimes(1);
  });

  it("bounds Paddle entitlement confirmation to five access checks", async () => {
    vi.useFakeTimers();
    try {
      let completeCheckout: () => void = () => undefined;
      billingMocks.open.mockImplementation(
        async (
          _transactionId: string,
          callbacks: { onCompleted: () => void }
        ) => {
          completeCheckout = callbacks.onCompleted;
        }
      );
      accessMocks.state.user = { uid: "user-a" };
      draftMocks.state.owner = {
        kind: "user",
        uid: "user-a"
      };
      renderTraining();

      fireEvent.click(screen.getByRole("button", {
        name: "Upgrade to Premium"
      }));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      act(() => completeCheckout());

      for (let attempt = 1; attempt < 5; attempt += 1) {
        await act(async () => {
          vi.advanceTimersByTime(1_500);
          await Promise.resolve();
        });
      }
      expect(accessMocks.state.refreshAccess)
        .toHaveBeenCalledTimes(5);
      expect(screen.getByRole("status").textContent)
        .toContain("still being confirmed");

      await act(async () => {
        vi.advanceTimersByTime(10_000);
        await Promise.resolve();
      });
      expect(accessMocks.state.refreshAccess)
        .toHaveBeenCalledTimes(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("requires a guest to sign in instead of creating Checkout", () => {
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Sign in to upgrade"
    }));

    expect(screen.getByRole("alert").textContent)
      .toContain("Sign in to upgrade");
    expect(billingMocks.checkout).not.toHaveBeenCalled();
  });

  it("keeps a failed Checkout request on the Free plan", async () => {
    billingMocks.checkout.mockRejectedValue(
      new Error("Billing is temporarily unavailable")
    );
    accessMocks.state.user = { uid: "user-a" };
    draftMocks.state.owner = {
      kind: "user",
      uid: "user-a"
    };
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Upgrade to Premium"
    }));

    expect((await screen.findByRole("alert")).textContent)
      .toContain("Billing is temporarily unavailable");
    expect(screen.getByText("FREE PLAN")).toBeTruthy();
    expect(billingMocks.redirect).not.toHaveBeenCalled();
  });

  it("shows Manage subscription only for Paddle-derived billing", async () => {
    accessMocks.state.user = { uid: "user-a" };
    accessMocks.state.plan = "premium";
    accessMocks.state.planSource = "paddle";
    accessMocks.state.unlimited = true;
    draftMocks.state.owner = {
      kind: "user",
      uid: "user-a"
    };
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Manage subscription"
    }));

    expect(billingMocks.portal)
      .toHaveBeenCalledWith(accessMocks.state.user);
    await vi.waitFor(() => {
      expect(billingMocks.redirect).toHaveBeenCalledWith(
        "https://customer-portal.paddle.com/test"
      );
    });
  });

  it("does not show Paddle management for manual Premium", () => {
    accessMocks.state.user = { uid: "user-a" };
    accessMocks.state.plan = "premium";
    accessMocks.state.planSource = "manual";
    accessMocks.state.unlimited = true;
    draftMocks.state.owner = {
      kind: "user",
      uid: "user-a"
    };
    renderTraining();

    expect(screen.queryByRole("button", {
      name: "Manage subscription"
    })).toBeNull();
  });

  it("does not navigate when authoritative reservation fails", async () => {
    accessMocks.start.mockRejectedValue(
      new Error("Daily training limit reached")
    );
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Start assessment"
    }));

    expect((await screen.findByRole("alert")).textContent)
      .toContain("Daily training limit reached");
    expect(screen.queryByText("Assessment route"))
      .toBeNull();
  });

  it("reuses the pending session ID when automatic startup is retried", async () => {
    accessMocks.start
      .mockRejectedValueOnce(
        new Error("Network interrupted")
      )
      .mockResolvedValueOnce({
        sessionId: "session-0001"
      });
    renderTraining();

    fireEvent.click(screen.getByRole("button", {
      name: "Start assessment"
    }));
    await screen.findByText("Network interrupted");
    fireEvent.click(screen.getByRole("button", {
      name: "Start assessment"
    }));

    expect(await screen.findByText("Assessment route"))
      .toBeTruthy();
    expect(accessMocks.start).toHaveBeenCalledTimes(2);
    expect(accessMocks.start.mock.calls[1][0].sessionId)
      .toBe(accessMocks.start.mock.calls[0][0].sessionId);
  });

  it("shows an accurate resumable guest session and preserves it on Cancel", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["feynman"]
    });
    draft.phase = "lab";
    draft.section = 4;
    draft.currentMethod = "feynman";
    draftMocks.state.validation = {
      valid: true,
      draft
    };

    renderTraining();

    expect(
      screen.getByRole("heading", {
        name: "Continue training"
      })
    ).toBeTruthy();
    expect(
      screen.getByText("Current step 2 of 4")
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Progress saved on this browser."
      )
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Discard current training"
      })
    );
    expect(
      screen.getByRole("heading", {
        name: "Discard current training?"
      })
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel"
      })
    );
    expect(draftMocks.discard).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Resume" })
    ).toBeTruthy();
  });

  it("routes Resume to the matching saved assessment session", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["feynman"]
    });
    draft.phase = "lab";
    draft.section = 4;
    draft.currentMethod = "feynman";
    draftMocks.state.validation = {
      valid: true,
      draft
    };

    renderTraining();
    fireEvent.click(screen.getByRole("button", {
      name: "Resume"
    }));

    expect(screen.getByText("Assessment route"))
      .toBeTruthy();
  });
});
