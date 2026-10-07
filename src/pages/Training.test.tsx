// @vitest-environment jsdom

import React from "react";

import {
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
    user: null,
    owner: { kind: "guest" } as const,
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
    user: null,
    plan: "free" as "free" | "premium",
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
  accessMocks.state.unlimited = false;
  accessMocks.state.testMeUsed = 0;
  accessMocks.state.testMeRemaining = 1;
  accessMocks.state.manualMethodsUsed = 0;
  accessMocks.state.manualMethodsRemaining = 3;
  accessMocks.state.refreshAccess.mockReset();
  accessMocks.start.mockReset();
  accessMocks.start.mockResolvedValue({
    sessionId: "session-0001"
  });
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

    renderTraining();

    expect(screen.getByText("FREE PLAN")).toBeTruthy();
    expect(screen.getByText("1 / 1 used today"))
      .toBeTruthy();
    expect(screen.getByText("2 / 3 used today"))
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

    renderTraining();

    expect(screen.getByText("PREMIUM")).toBeTruthy();
    expect(screen.getByText("Unlimited Training"))
      .toBeTruthy();
    expect(screen.getAllByText("Unlimited", {
      selector: "strong"
    })).toHaveLength(2);
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
