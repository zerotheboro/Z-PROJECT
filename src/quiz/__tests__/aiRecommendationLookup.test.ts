import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRecommendationWithin } from "../aiRecommendationLookup";

afterEach(() => vi.useRealTimers());

describe("bounded AI recommendation lookup", () => {
  it("returns a timely result", async () => {
    await expect(loadRecommendationWithin(async () => "saved", 100))
      .resolves.toBe("saved");
  });

  it("falls back on timeout and observes a late rejection", async () => {
    vi.useFakeTimers();
    let reject!: (error: Error) => void;
    const pending = loadRecommendationWithin(
      () => new Promise<string>((_resolve, rejectPromise) => {
        reject = rejectPromise;
      }),
      2000
    );
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toBeNull();
    reject(new Error("late Firestore failure"));
    await Promise.resolve();
  });
});
