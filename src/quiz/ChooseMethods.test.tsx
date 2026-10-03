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
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  methodDefinitions
} from "./methodRegistry";

import type {
  ManualTrainingState
} from "./trainingSession";

vi.mock("../HEADER/header", () => ({
  default: () => <nav>Navigation</nav>
}));

import ChooseMethods from "./ChooseMethods";

afterEach(() => {
  cleanup();
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

  it("passes the selected registry IDs into manual assessment state", () => {
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
      screen.getByText(
        "Manual assessment route"
      )
    ).toBeTruthy();
    expect(
      screen.getByText("?mode=manual")
    ).toBeTruthy();
    expect(
      screen.getByText(
        "active-recall,cornell"
      )
    ).toBeTruthy();
  });
});
