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

import type { User } from "firebase/auth";

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

vi.mock("../services/aiRecommendationAccess", () => ({
  loadAIRecommendationAccess: mocks.load
}));

import {
  useAIRecommendationAccess
} from "./useAIRecommendationAccess";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function access(plan: "guest" | "free" | "premium") {
  const limit = plan === "guest"
    ? 2
    : plan === "premium"
      ? 16
      : 7;

  return {
    plan,
    limit,
    used: 1,
    remaining: limit - 1,
    dayKey: "2026-10-08",
    timezone: "UTC" as const
  };
}

function Probe() {
  const state = useAIRecommendationAccess();

  return (
    <p>
      {state.loading
        ? "loading"
        : `${state.user?.uid ?? "guest"}:${state.access?.plan ?? "error"}:${state.access?.limit ?? 0}`}
    </p>
  );
}

afterEach(() => {
  cleanup();
  mocks.authCallback = null;
  mocks.load.mockReset();
});

describe("useAIRecommendationAccess identity isolation", () => {
  it("ignores stale quota after the authenticated user changes", async () => {
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
      expect(screen.getByText("user-b:free:7"))
        .toBeTruthy();
    });
    expect(screen.queryByText("user-a:premium:16"))
      .toBeNull();
  });

  it("loads authoritative guest access after sign-out", async () => {
    mocks.load
      .mockResolvedValueOnce(access("premium"))
      .mockResolvedValueOnce(access("guest"));
    render(<Probe />);

    mocks.authCallback?.({ uid: "user-a" } as User);
    await screen.findByText("user-a:premium:16");
    mocks.authCallback?.(null);

    expect(await screen.findByText("guest:guest:2"))
      .toBeTruthy();
  });
});
