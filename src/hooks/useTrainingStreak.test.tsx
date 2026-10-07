// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const mocks = vi.hoisted(() => ({
  authListener: null as ((user: { uid: string } | null) => void) | null,
  load: vi.fn()
}));

vi.mock("../services/auth", () => ({
  subscribeToAuth: (
    listener: (user: { uid: string } | null) => void
  ) => {
    mocks.authListener = listener;
    return () => undefined;
  }
}));

vi.mock("../services/trainingStreak", () => ({
  loadTrainingStreak: mocks.load
}));

import {
  useTrainingStreak
} from "./useTrainingStreak";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

function Harness() {
  const streak = useTrainingStreak();

  return (
    <p>
      {streak.loading
        ? "loading"
        : `${streak.currentStreak}:${streak.lastCompletedDay}`}
    </p>
  );
}

beforeEach(() => {
  mocks.authListener = null;
  mocks.load.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("useTrainingStreak identity isolation", () => {
  it("does not surface the previous account after a different user signs in", async () => {
    const first = deferred<{
      currentStreak: number;
      longestStreak: number;
      lastCompletedDay: string;
      totalActiveDays: number;
      completedToday: boolean;
    }>();
    const second = deferred<{
      currentStreak: number;
      longestStreak: number;
      lastCompletedDay: string;
      totalActiveDays: number;
      completedToday: boolean;
    }>();
    mocks.load
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    render(<Harness />);
    mocks.authListener?.({ uid: "user-a" });
    mocks.authListener?.({ uid: "user-b" });

    first.resolve({
      currentStreak: 20,
      longestStreak: 20,
      lastCompletedDay: "2026-10-06",
      totalActiveDays: 20,
      completedToday: true
    });
    expect(screen.getByText("loading")).toBeTruthy();

    second.resolve({
      currentStreak: 2,
      longestStreak: 4,
      lastCompletedDay: "2026-10-05",
      totalActiveDays: 6,
      completedToday: false
    });

    expect(await screen.findByText("2:2026-10-05"))
      .toBeTruthy();
  });

  it("loads guest storage after sign-out instead of retaining cloud state", async () => {
    mocks.load
      .mockResolvedValueOnce({
        currentStreak: 7,
        longestStreak: 7,
        lastCompletedDay: "2026-10-06",
        totalActiveDays: 7,
        completedToday: true
      })
      .mockResolvedValueOnce({
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedDay: "2026-10-06",
        totalActiveDays: 1,
        completedToday: true
      });

    render(<Harness />);
    mocks.authListener?.({ uid: "user-a" });
    expect(await screen.findByText("7:2026-10-06"))
      .toBeTruthy();

    mocks.authListener?.(null);
    expect(await screen.findByText("1:2026-10-06"))
      .toBeTruthy();
    expect(mocks.load).toHaveBeenLastCalledWith({
      kind: "guest"
    });
  });
});
