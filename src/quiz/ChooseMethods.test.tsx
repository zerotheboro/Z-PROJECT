// @vitest-environment jsdom

import React from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

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

import {
  methodDefinitions
} from "./methodRegistry";

import type {
  ManualTrainingState
} from "./trainingSession";

vi.mock("../HEADER/header", () => ({
  default: () => <nav>Navigation</nav>
}));

vi.mock("../hooks/useTrainingAccess", () => ({
  useTrainingAccess: () => accessMocks.state
}));

vi.mock("../services/startTrainingSession", () => ({
  startTrainingSession: accessMocks.start
}));

import ChooseMethods from "./ChooseMethods";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  accessMocks.state.loading = false;
  accessMocks.state.error = null;
  accessMocks.state.user = null;
  accessMocks.state.plan = "free";
  accessMocks.state.unlimited = false;
  accessMocks.state.manualMethodsRemaining = 3;
  accessMocks.state.refreshAccess.mockReset();
  accessMocks.start.mockReset();
  accessMocks.start.mockResolvedValue({
    sessionId: "session-0001"
  });
});

function AssessmentDestination() {
  const location = useLocation();
  const state =
    location.state as ManualTrainingState;

  return (
    <div>
      <p>Manual assessment route</p>
      <p>{location.search}</p>
      <p>
        {state.selectedMethods.join(",")}
      </p>
    </div>
  );
}

function renderPicker() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/training/choose"
      ]}
    >
      <Routes>
        <Route
          path="/training/choose"
          element={<ChooseMethods />}
        />
        <Route
          path="/training/assessment"
          element={
            <AssessmentDestination />
          }
        />
        <Route
          path="/training"
          element={<p>Training route</p>}
        />
      </Routes>
    </MemoryRouter>
  );
}

function methodCheckbox(name: string) {
  return screen.getByRole(
    "checkbox",
    { name: new RegExp(name, "i") }
  );
}

describe("manual method picker", () => {
  it("renders every registry method and starts disabled", () => {
    renderPicker();

    expect(
      screen.getAllByRole("checkbox")
    ).toHaveLength(
      methodDefinitions.length
    );
    expect(
      screen.getByText("0 / 3 selected")
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Start training"
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("groups methods by their existing registry categories", () => {
    renderPicker();

    const categories = Array.from(
      new Set(
        methodDefinitions.map(
          definition =>
            definition.category
        )
      )
    );

    categories.forEach(category => {
      expect(
        screen.getByRole("heading", {
          name: category
        })
      ).toBeTruthy();
    });

    const memoryGroup =
      screen
        .getByRole("heading", {
          name: "memory"
        })
        .closest("section");

    expect(memoryGroup).not.toBeNull();
    expect(
      within(
        memoryGroup as HTMLElement
      ).getByRole("checkbox", {
        name: /Active Recall/i
      })
    ).toBeTruthy();
  });

  it("selects one, two, or three methods, supports deselection, and blocks a fourth", () => {
    renderPicker();

    const activeRecall =
      methodCheckbox("Active Recall");
    const feynman =
      methodCheckbox("Feynman Technique");
    const cornell =
      methodCheckbox("Cornell Notes");
    const interleaving =
      methodCheckbox("Interleaving");

    fireEvent.click(activeRecall);
    expect(
      screen.getByText("1 / 3 selected")
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Start training"
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);

    fireEvent.click(feynman);
    expect(
      screen.getByText("2 / 3 selected")
    ).toBeTruthy();

    fireEvent.click(cornell);
    expect(
      screen.getByText("3 / 3 selected")
    ).toBeTruthy();

    fireEvent.click(interleaving);
    expect(
      screen.getByText(
        "You can choose up to 3 methods."
      )
    ).toBeTruthy();
    expect(
      interleaving.getAttribute(
        "aria-checked"
      )
    ).toBe("false");

    fireEvent.click(feynman);
    expect(
      screen.getByText("2 / 3 selected")
    ).toBeTruthy();
    expect(
      feynman.getAttribute("aria-checked")
    ).toBe("false");
  });

  it("passes the selected registry IDs into manual assessment state", async () => {
    renderPicker();

    fireEvent.click(
      methodCheckbox("Active Recall")
    );
    fireEvent.click(
      methodCheckbox("Cornell Notes")
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Start training"
      })
    );

    expect(
      await screen.findByText(
        "Manual assessment route"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "?mode=manual&resume=session-0001"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "active-recall,cornell"
      )
    ).toBeTruthy();
  });

  it("limits selection to the remaining daily method count", () => {
    accessMocks.state.manualMethodsRemaining = 1;
    renderPicker();

    fireEvent.click(methodCheckbox("Active Recall"));
    fireEvent.click(methodCheckbox("Feynman Technique"));

    expect(screen.getByRole("alert").textContent)
      .toBe("You have 1 method test remaining today.");
    expect(methodCheckbox("Active Recall").getAttribute(
      "aria-checked"
    )).toBe("true");
    expect(methodCheckbox("Feynman Technique").getAttribute(
      "aria-checked"
    )).toBe("false");
  });

  it("reuses the pending session ID when manual startup is retried", async () => {
    accessMocks.start
      .mockRejectedValueOnce(
        new Error("Network interrupted")
      )
      .mockResolvedValueOnce({
        sessionId: "session-0001"
      });
    renderPicker();

    fireEvent.click(methodCheckbox("Active Recall"));
    fireEvent.click(screen.getByRole("button", {
      name: "Start training"
    }));
    await screen.findByText("Network interrupted");
    fireEvent.click(screen.getByRole("button", {
      name: "Start training"
    }));

    expect(await screen.findByText("Manual assessment route"))
      .toBeTruthy();
    expect(accessMocks.start).toHaveBeenCalledTimes(2);
    expect(accessMocks.start.mock.calls[1][0].sessionId)
      .toBe(accessMocks.start.mock.calls[0][0].sessionId);
  });
});
