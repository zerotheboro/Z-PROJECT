// @vitest-environment jsdom

import React from "react";
import {
  StrictMode
} from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";

import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import ActiveRecallExperiment
  from "../experiments/ActiveRecallExperiment";
import FeynmanExperiment
  from "../experiments/FeynmanExperiment";
import ActiveBlurtingExperiment
  from "../experiments/ActiveBlurtingExperiment";
import {
  activeBlurtingExperiment,
  activeRecallExperiment,
  feynmanExperiment
} from "../methodLabData";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("configured method-stage timers", () => {
  it("auto-advances Active Recall study and retrieval at their deadlines", () => {
    vi.useFakeTimers();

    render(
      <ActiveRecallExperiment
        method="active-recall"
        category="memory"
        name="Active Recall"
        data={activeRecallExperiment}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("timer")
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    expect(screen.getByRole("timer").textContent)
      .toContain("30s");

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(
      screen.getByRole("heading", {
        name: /Without looking back/
      })
    ).toBeTruthy();
    expect(screen.getByRole("timer").textContent)
      .toContain("30s");

    fireEvent.change(
      screen.getByPlaceholderText(
        "Write what you remember..."
      ),
      {
        target: {
          value: "The response is retained."
        }
      }
    );

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(
      screen.getByRole("heading", {
        name:
          activeRecallExperiment.questions[0]
            .question
      })
    ).toBeTruthy();
  });

  it("cleans the Active Recall study timer after an early continue", () => {
    vi.useFakeTimers();

    render(
      <ActiveRecallExperiment
        method="active-recall"
        category="memory"
        name="Active Recall"
        data={activeRecallExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );

    act(() => {
      vi.advanceTimersByTime(29999);
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(
      screen.getByRole("heading", {
        name: /Without looking back/
      })
    ).toBeTruthy();
    expect(screen.getByRole("timer").textContent)
      .toContain("30s");
  });

  it("auto-advances Feynman study at its configured deadline", () => {
    vi.useFakeTimers();

    render(
      <FeynmanExperiment
        method="feynman"
        category="understanding"
        name="Feynman Technique"
        data={feynmanExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    expect(screen.getByRole("timer").textContent)
      .toContain("35s");

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(
      screen.getByRole("heading", {
        name: /Explain the idea in your own words/
      })
    ).toBeTruthy();
  });

  it("preserves retrieval validation when the countdown expires empty", () => {
    vi.useFakeTimers();

    render(
      <ActiveRecallExperiment
        method="active-recall"
        category="memory"
        name="Active Recall"
        data={activeRecallExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(
      screen.getByRole("heading", {
        name: /Without looking back/
      })
    ).toBeTruthy();
    expect(screen.getByRole("timer").textContent)
      .toContain("0s");
    expect(
      (
        screen.getByRole("button", {
          name: "Continue"
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("does not add a countdown to an untimed method", () => {
    render(
      <ActiveBlurtingExperiment
        method="active-blurting"
        category="memory"
        name="Active Blurting"
        data={activeBlurtingExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );

    expect(
      screen.queryByRole("timer")
    ).toBeNull();
  });

  it("cleans timers and advances once under StrictMode", () => {
    vi.useFakeTimers();

    const timedData = {
      ...feynmanExperiment,
      studyTime: 2
    };
    const renderTimedExperiment = () => (
      <StrictMode>
        <FeynmanExperiment
          method="feynman"
          category="understanding"
          name="Feynman Technique"
          data={timedData}
          onComplete={vi.fn()}
        />
      </StrictMode>
    );
    const { rerender, unmount } = render(
      renderTimedExperiment()
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(renderTimedExperiment());
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      screen.getByRole("heading", {
        name: /Explain the idea in your own words/
      })
    ).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
