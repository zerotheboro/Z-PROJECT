import {
  describe,
  expect,
  it
} from "vitest";

import {
  getMethodName
} from "../methodRegistry";

describe("historical method display compatibility", () => {
  it("preserves the Pomodoro display name", () => {
    expect(getMethodName("pomodoro")).toBe(
      "Pomodoro"
    );
  });

  it("preserves the Stopwatch display name", () => {
    expect(getMethodName("stopwatch")).toBe(
      "Stopwatch"
    );
  });
});
