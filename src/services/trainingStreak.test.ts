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
  collection: vi.fn((...segments: unknown[]) => segments.join("/")),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  snapshotEqual: vi.fn((left, right) => JSON.stringify(left.exists() ? left.data() : null) === JSON.stringify(right.exists() ? right.data() : null)),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "server-timestamp")
}));

vi.mock("firebase/firestore", () => ({
  doc: firestore.doc,
  collection: firestore.collection,
  getDoc: firestore.getDoc,
  getDocFromServer: firestore.getDoc,
  getDocsFromServer: firestore.getDocs,
  snapshotEqual: firestore.snapshotEqual,
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
  firestore.getDoc.mockReset().mockResolvedValue({ exists: () => false });
  firestore.getDocs.mockReset().mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: [] });
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
    const stats = { currentStreak: 3, longestStreak: 5, lastCompletedDay: "2026-10-06", totalActiveDays: 9 };
    // Complete day history, not just a synthetic summary count. Its prior
    // longest streak has five days; Oct 4-6 supply the current run of three.
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-10", "2026-10-04", "2026-10-05", "2026-10-06"];
    firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => stats });
    firestore.getDocs.mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: days.map(id => ({ id, data: () => ({ dayKey: id }) })) });
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

  it("rebuilds a late Oct 19 completion after Oct 20/21 without rolling the latest day backward", async () => {
    const summary = { exists: () => true, data: () => ({ currentStreak: 2, longestStreak: 2, lastCompletedDay: "2026-10-21", totalActiveDays: 2 }) };
    firestore.getDoc.mockResolvedValue(summary);
    firestore.getDocs.mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: ["2026-10-21", "2026-10-20"].map(id => ({ id, data: () => ({ dayKey: id }) })) });
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce(summary), set: vi.fn() };
    firestore.runTransaction.mockImplementation(async (_db, callback) => callback(tx));
    const result = await recordTrainingCompletion({ owner: { kind: "user", uid: "user-a" }, sessionId: "late-oct-19", mode: "manual", methodIds: ["feynman"] }, { now: new Date("2026-10-19T12:00:00Z"), timeZone: "UTC" });
    expect(result).toMatchObject({ currentStreak: 3, longestStreak: 3, totalActiveDays: 3, lastCompletedDay: "2026-10-21" });
  });

  it("reprepares history when another device updates the summary between query and transaction", async () => {
    const empty = { exists: () => false };
    const newer = { exists: () => true, data: () => ({ currentStreak: 1, longestStreak: 1, totalActiveDays: 1, lastCompletedDay: "2026-10-21" }) };
    firestore.getDoc.mockResolvedValueOnce(empty).mockResolvedValue(newer);
    firestore.getDocs.mockResolvedValueOnce({ metadata: { hasPendingWrites: false }, docs: [] }).mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: [{ id: "2026-10-21", data: () => ({ dayKey: "2026-10-21" }) }] });
    const tx = { get: vi.fn().mockImplementation(async ref => String(ref).endsWith("/streak") ? newer : empty), set: vi.fn() };
    firestore.runTransaction.mockImplementation(async (_db, callback) => callback(tx));
    const result = await recordTrainingCompletion({ owner: { kind: "user", uid: "user-a" }, sessionId: "late-oct-20", mode: "auto", methodIds: ["feynman"] }, { now: new Date("2026-10-20T12:00:00Z"), timeZone: "UTC" });
    expect(firestore.getDocs).toHaveBeenCalledTimes(2);
    expect(tx.set).toHaveBeenCalledTimes(2); // no writes from discarded preparation
    expect(result).toMatchObject({ currentStreak: 2, lastCompletedDay: "2026-10-21", totalActiveDays: 2 });
  });

  it("never publishes a streak reconstructed from partial cached or uncommitted history", async () => {
    firestore.getDocs.mockResolvedValue({ metadata: { fromCache: true, hasPendingWrites: false }, docs: [] });
    firestore.runTransaction.mockClear();
    await expect(recordTrainingCompletion({ owner: { kind: "user", uid: "user-a" }, sessionId: "offline-history", mode: "manual", methodIds: ["feynman"] }, context)).rejects.toThrow("not confirmed by the server");
    expect(firestore.runTransaction).not.toHaveBeenCalled();
  });
});
