// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((...segments: unknown[]) => segments.join("/")),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "server-timestamp")
}));

vi.mock("firebase/firestore", () => ({
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  runTransaction: firestore.runTransaction,
  serverTimestamp: firestore.serverTimestamp
}));

vi.mock("../firebase", () => ({
  db: "mock-db"
}));

import {
  GUEST_TRAINING_STREAK_STORAGE_KEY,
  loadTrainingStreak,
  recordTrainingCompletion
} from "./trainingStreak";

const context = {
  now: new Date("2026-10-06T04:00:00.000Z"),
  timeZone: "Asia/Ho_Chi_Minh"
};

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => {
        values.set(key, value);
      }
    }
  });
});

describe("Training streak persistence", () => {
  it("stores a guest streak locally and keeps repeated callbacks idempotent", async () => {
    const input = {
      owner: { kind: "guest" as const },
      sessionId: "guest-session-1",
      mode: "manual" as const,
      methodIds: ["active-recall" as const]
    };

    const first = await recordTrainingCompletion(input, context);
    const repeated = await recordTrainingCompletion(input, context);
    const stored = JSON.parse(
      window.localStorage.getItem(
        GUEST_TRAINING_STREAK_STORAGE_KEY
      ) ?? "null"
    );

    expect(first).toMatchObject({
      currentStreak: 1,
      totalActiveDays: 1,
      wasNewDay: true
    });
    expect(repeated).toMatchObject({
      currentStreak: 1,
      totalActiveDays: 1,
      wasNewDay: false
    });
    expect(stored.activities["2026-10-06"])
      .toMatchObject({
        firstSessionId: "guest-session-1",
        firstMode: "manual",
        methodIds: ["active-recall"],
        timezone: "Asia/Ho_Chi_Minh"
      });
  });

  it("records a multi-method session as one guest active day", async () => {
    const result = await recordTrainingCompletion({
      owner: { kind: "guest" },
      sessionId: "guest-session-many",
      mode: "manual",
      methodIds: [
        "active-recall",
        "feynman",
        "interleaving"
      ]
    }, context);

    expect(result.totalActiveDays).toBe(1);
    expect(Object.keys(JSON.parse(
      window.localStorage.getItem(
        GUEST_TRAINING_STREAK_STORAGE_KEY
      ) ?? "null"
    ).activities)).toEqual(["2026-10-06"]);
  });

  it("loads the persisted guest status without a Firestore read", async () => {
    await recordTrainingCompletion({
      owner: { kind: "guest" },
      sessionId: "guest-session-1",
      mode: "auto",
      methodIds: ["active-recall"]
    }, context);

    await expect(loadTrainingStreak(
      { kind: "guest" },
      context
    )).resolves.toMatchObject({
      currentStreak: 1,
      completedToday: true
    });
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it("uses the signed-in user's Firestore paths instead of guest storage", async () => {
    window.localStorage.setItem(
      GUEST_TRAINING_STREAK_STORAGE_KEY,
      JSON.stringify({ guest: "must-not-be-used" })
    );
    const transaction = {
      get: vi.fn()
        .mockResolvedValueOnce({ exists: () => false })
        .mockResolvedValueOnce({ exists: () => false }),
      set: vi.fn()
    };
    firestore.runTransaction.mockImplementation(
      async (_db, callback) => callback(transaction)
    );

    const result = await recordTrainingCompletion({
      owner: { kind: "user", uid: "user-a" },
      sessionId: "signed-session-1",
      mode: "auto",
      methodIds: ["feynman"]
    }, context);

    expect(result.wasNewDay).toBe(true);
    expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
    expect(transaction.set).toHaveBeenCalledWith(
      "mock-db/users/user-a/trainingActivity/2026-10-06",
      expect.objectContaining({
        dayKey: "2026-10-06",
        firstSessionId: "signed-session-1",
        firstMode: "auto"
      })
    );
    expect(transaction.set).toHaveBeenCalledWith(
      "mock-db/users/user-a/trainingStats/streak",
      expect.objectContaining({
        currentStreak: 1,
        longestStreak: 1,
        totalActiveDays: 1
      })
    );
    expect(window.localStorage.getItem(
      GUEST_TRAINING_STREAK_STORAGE_KEY
    )).toBe(JSON.stringify({ guest: "must-not-be-used" }));
  });

  it("does not write either Firestore document when today's activity exists", async () => {
    const transaction = {
      get: vi.fn()
        .mockResolvedValueOnce({ exists: () => true })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            currentStreak: 3,
            longestStreak: 5,
            lastCompletedDay: "2026-10-06",
            totalActiveDays: 9
          })
        }),
      set: vi.fn()
    };
    firestore.runTransaction.mockImplementation(
      async (_db, callback) => callback(transaction)
    );

    const result = await recordTrainingCompletion({
      owner: { kind: "user", uid: "user-a" },
      sessionId: "another-session",
      mode: "manual",
      methodIds: ["cornell"]
    }, context);

    expect(result).toMatchObject({
      currentStreak: 3,
      totalActiveDays: 9,
      wasNewDay: false
    });
    expect(transaction.set).not.toHaveBeenCalled();
  });
});
