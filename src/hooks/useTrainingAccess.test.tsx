// @vitest-environment jsdom

import React from "react";

import {
  cleanup,
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

import type {
  User
} from "firebase/auth";

const mocks = vi.hoisted(() => ({
  authCallback: null as ((user: User | null) => void) | null,
  load: vi.fn()
}));

vi.mock("../services/auth", () => ({
  subscribeToAuth: (callback: (user: User | null) => void) => {
    mocks.authCallback = callback;
    return () => undefined;
  }
}));

vi.mock("../services/trainingAccess", () => ({
  loadTrainingAccess: mocks.load
}));

import {
  useTrainingAccess
} from "./useTrainingAccess";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(
    complete => {
      resolve = complete;
    }
  );
  return { promise, resolve };
}

function access(plan: "free" | "premium") {
  return {
    plan,
    planSource: "default" as const,
    limits: {
      testMePerDay: 1,
      manualMethodsPerDay: 3
    },
    usage: {
      testMeStarted: plan === "free" ? 1 : 8,
      manualMethodsStarted: 0
    },
    remaining: {
      testMe: plan === "free" ? 0 : null,
      manualMethods: plan === "free" ? 3 : null
    },
    unlimited: plan === "premium",
    dayKey: "2026-10-07",
    timezone: "Asia/Ho_Chi_Minh"
  };
}

function Probe() {
  const value = useTrainingAccess();
  return (
    <p>
      {value.loading
        ? "loading"
        : `${value.user?.uid ?? "guest"}:${value.plan}:${value.testMeUsed}`}
    </p>
  );
}

afterEach(() => {
  cleanup();
  mocks.authCallback = null;
  mocks.load.mockReset();
});

describe("useTrainingAccess identity isolation", () => {
  it("never exposes account A quota after account B signs in", async () => {
    const first = deferred<ReturnType<typeof access>>();
    const second = deferred<ReturnType<typeof access>>();
    mocks.load
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<Probe />);

    mocks.authCallback?.({ uid: "user-a" } as User);
    mocks.authCallback?.({ uid: "user-b" } as User);
    first.resolve(access("premium"));
    second.resolve(access("free"));

    await waitFor(() => {
      expect(screen.getByText("user-b:free:1"))
        .toBeTruthy();
    });
    expect(screen.queryByText("user-a:premium:8"))
      .toBeNull();
  });

  it("loads guest quota after sign-out", async () => {
    mocks.load
      .mockResolvedValueOnce(access("premium"))
      .mockResolvedValueOnce(access("free"));
    render(<Probe />);

    mocks.authCallback?.({ uid: "user-a" } as User);
    await screen.findByText("user-a:premium:8");
    mocks.authCallback?.(null);

    expect(await screen.findByText("guest:free:1"))
      .toBeTruthy();
  });
});
