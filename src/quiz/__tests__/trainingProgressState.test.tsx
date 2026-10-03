// @vitest-environment jsdom

import React from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";

import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  useExperimentTimer,
  useShuffledOptions
} from "../engines/shared";
import TenMinuteWallStareExperiment
  from "../experiments/TenMinuteWallStareExperiment";
import {
  wallStareExperiment
} from "../methodLabData";
import {
  TrainingProgressStateProvider,
  TrainingStateScope,
  useTrainingState
} from "../trainingProgressState";

import type {
  TrainingInternalState
} from "../trainingProgress";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ResumableWork({
  random
}: {
  random: () => number;
}) {
  const [stage, setStage] =
    useTrainingState("write");
  const [response, setResponse] =
    useTrainingState("");
  const options = useShuffledOptions(
    ["correct", "second", "third"],
    "question-1",
    random
  );

  return (
    <div>
      <p>{stage}</p>
      <input
        aria-label="written response"
        value={response}
        onChange={event =>
          setResponse(event.target.value)
        }
      />
      <button
        type="button"
        onClick={() => setStage("test")}
      >
        Advance
      </button>
      <ol>
        {options.map(option => (
          <li key={option}>{option}</li>
        ))}
      </ol>
    </div>
  );
}

function renderWork(
  initialState: TrainingInternalState,
  onChange: (state: TrainingInternalState) => void,
  random: () => number
) {
  return render(
    <TrainingProgressStateProvider
      state={initialState}
      onChange={onChange}
    >
      <TrainingStateScope name="lab:test">
        <ResumableWork random={random} />
      </TrainingStateScope>
    </TrainingProgressStateProvider>
  );
}

function TimerProbe({
  onRead
}: {
  onRead: (elapsed: number) => void;
}) {
  const { elapsedMs } = useExperimentTimer({
    startImmediately: true
  });

  return (
    <button
      type="button"
      onClick={() => onRead(elapsedMs())}
    >
      Read elapsed
    </button>
  );
}

describe("scoped resumable component state", () => {
  it("restores stage, written work, and answer order", async () => {
    let snapshot: TrainingInternalState = {};
    const firstRandom = vi.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    const first = renderWork(
      snapshot,
      state => {
        snapshot = state;
      },
      firstRandom
    );

    fireEvent.change(
      screen.getByLabelText("written response"),
      { target: { value: "unfinished explanation" } }
    );
    fireEvent.click(screen.getByText("Advance"));

    await waitFor(() => {
      expect(snapshot["lab:test"]?.slots)
        .toEqual(["test", "unfinished explanation"]);
      expect(
        snapshot["lab:test"]?.named[
          "answer-option-orders"
        ]
      ).toBeTruthy();
    });

    const firstOrder = screen
      .getAllByRole("listitem")
      .map(item => item.textContent);
    first.unmount();

    const secondRandom = vi.fn(() => {
      throw new Error("restoration must not reshuffle");
    });
    renderWork(
      snapshot,
      state => {
        snapshot = state;
      },
      secondRandom
    );

    expect(screen.getByText("test")).toBeTruthy();
    expect(
      (screen.getByLabelText(
        "written response"
      ) as HTMLInputElement).value
    ).toBe("unfinished explanation");
    expect(
      screen.getAllByRole("listitem")
        .map(item => item.textContent)
    ).toEqual(firstOrder);
    expect(secondRandom).not.toHaveBeenCalled();
  });

  it("does not count time spent away as active practice", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const state: TrainingInternalState = {
      timer: {
        slots: [{
          accumulatedMs: 5_000,
          running: true
        }],
        named: {}
      }
    };
    const onRead = vi.fn();
    const first = render(
      <TrainingProgressStateProvider
        state={state}
        onChange={() => undefined}
      >
        <TrainingStateScope name="timer">
          <TimerProbe onRead={onRead} />
        </TrainingStateScope>
      </TrainingProgressStateProvider>
    );
    first.unmount();

    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    render(
      <TrainingProgressStateProvider
        state={state}
        onChange={() => undefined}
      >
        <TrainingStateScope name="timer">
          <TimerProbe onRead={onRead} />
        </TrainingStateScope>
      </TrainingProgressStateProvider>
    );

    fireEvent.click(screen.getByText("Read elapsed"));
    expect(onRead).toHaveBeenLastCalledWith(5_000);

    vi.advanceTimersByTime(2_000);
    fireEvent.click(screen.getByText("Read elapsed"));
    expect(onRead).toHaveBeenLastCalledWith(7_000);
  });

  it("does not finish the wall-stare timer while the app is closed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const scope = "lab:ten-minute-wall-stare:timer-test";
    let snapshot: TrainingInternalState = {};
    const renderWallStare = () => render(
      <TrainingProgressStateProvider
        state={snapshot}
        onChange={state => {
          snapshot = state;
        }}
      >
        <TrainingStateScope name={scope}>
          <TenMinuteWallStareExperiment
            method="ten-minute-wall-stare"
            category="focus"
            name="10 min wall stare"
            data={wallStareExperiment}
            onComplete={vi.fn()}
          />
        </TrainingStateScope>
      </TrainingProgressStateProvider>
    );

    const first = renderWallStare();
    fireEvent.click(screen.getByRole("button", {
      name: "Begin 10-minute reset"
    }));
    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(
      screen.getByLabelText("wall stare time remaining")
        .textContent
    ).toBe("9:57");
    expect(snapshot[scope]?.slots[1]).toBe(597);
    first.unmount();

    vi.setSystemTime(new Date("2026-01-01T00:10:03Z"));
    renderWallStare();

    expect(
      screen.getByLabelText("wall stare time remaining")
        .textContent
    ).toBe("9:57");
    expect(
      (screen.getByRole("button", {
        name: "Start studying"
      }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
