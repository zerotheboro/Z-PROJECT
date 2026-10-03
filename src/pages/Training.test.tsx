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

vi.mock("../quiz/useAvailableTrainingDraft", () => ({
  useAvailableTrainingDraft: () => draftMocks.state
}));

vi.mock("../services/trainingProgress", () => ({
  discardTrainingDraft: draftMocks.discard,
  forceDiscardTrainingDraft: draftMocks.forceDiscard
}));

import Training from "./Training";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  draftMocks.state.loading = false;
  draftMocks.state.validation = null;
  draftMocks.state.error = null;
  draftMocks.state.reload.mockReset();
  draftMocks.discard.mockReset();
  draftMocks.discard.mockResolvedValue(undefined);
  draftMocks.forceDiscard.mockReset();
  draftMocks.forceDiscard.mockResolvedValue(undefined);
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

  it("routes Test me to the existing assessment", () => {
    renderTraining();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start assessment"
      })
    );

    expect(
      screen.getByText("Assessment route")
    ).toBeTruthy();
  });

  it("routes manual selection to the method picker", () => {
    renderTraining();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Choose methods"
      })
    );

    expect(
      screen.getByText("Choose route")
    ).toBeTruthy();
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
