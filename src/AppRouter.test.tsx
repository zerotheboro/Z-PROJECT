// @vitest-environment jsdom

import React from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  Link,
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

vi.mock(
  "./MIDSECTION/section_of_each_tips.jsx",
  () => ({ default: () => <p>Home page</p> })
);
vi.mock(
  "./pages/Library",
  () => ({ default: () => <p>Library page</p> })
);
vi.mock(
  "./pages/LearningProfilePage",
  () => ({ default: () => <p>Profile page</p> })
);
vi.mock(
  "./pages/Training",
  () => ({ default: () => <p>Training page</p> })
);
vi.mock(
  "./pages/Shorts",
  () => ({ default: () => <p>Shorts page</p> })
);
vi.mock(
  "./quiz/Assessment",
  () => ({ default: () => <p>Assessment page</p> })
);
vi.mock(
  "./quiz/ChooseMethods",
  () => ({ default: () => <p>Choose page</p> })
);

import AppRouter, {
  AppRoutes,
  ScrollToTop
} from "./AppRouter.jsx";

const scrollTo = vi.fn();

beforeEach(() => {
  scrollTo.mockReset();
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: scrollTo
  });
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  cleanup();
});

describe("application routing", () => {
  it.each([
    ["/", "Home page"],
    ["/library", "Library page"],
    ["/training", "Training page"],
    ["/shorts", "Shorts page"],
    ["/training/choose", "Choose page"],
    ["/training/assessment", "Assessment page"],
    ["/training/profile", "Profile page"]
  ])("renders %s", (path, expected) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText(expected)).toBeTruthy();
  });

  it("keeps the wildcard fallback on the home route", () => {
    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText("Home page")).toBeTruthy();
  });

  it("resets scroll after normal and nested route navigation", () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <ScrollToTop />
        <nav>
          <Link to="/training">Training</Link>
          <Link to="/training/choose">Choose</Link>
        </nav>
        <Routes>
          <Route path="/library" element={<p>Library</p>} />
          <Route path="/training" element={<p>Training</p>} />
          <Route path="/training/choose" element={<p>Choose</p>} />
        </Routes>
      </MemoryRouter>
    );

    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("link", {
      name: "Training"
    }));
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      left: 0,
      behavior: "auto"
    });

    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("link", {
      name: "Choose"
    }));
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      left: 0,
      behavior: "auto"
    });
  });

  it("preserves intentional same-page document anchors", () => {
    const scrollIntoView = vi.fn();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
        <a href="#target-section">
          <span>Jump to section</span>
        </a>
        <div id="target-section" />
      </MemoryRouter>
    );
    const target = document.getElementById(
      "target-section"
    )!;
    Object.defineProperty(target, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });
    scrollTo.mockClear();

    fireEvent.click(screen.getByText("Jump to section"));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByText("Jump to section")).toBeTruthy();
  });

  it("loads a nested hash route under a physical deployment base path", () => {
    expect(import.meta.env.BASE_URL).toBe("/");
    window.history.replaceState(
      {},
      "",
      "/project-base/#/training/assessment"
    );

    render(<AppRouter />);

    expect(screen.getByText("Assessment page")).toBeTruthy();
    expect(window.location.pathname).toBe("/project-base/");
    expect(window.location.hash).toBe("#/training/assessment");
  });
});
