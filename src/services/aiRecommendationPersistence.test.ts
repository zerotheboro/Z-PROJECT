// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((...segments: unknown[]) =>
    segments.join("/")),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time")
}));

vi.mock("firebase/firestore", () => ({
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  setDoc: firestore.setDoc,
  serverTimestamp: firestore.serverTimestamp
}));

vi.mock("../firebase", () => ({
  db: "mock-db"
}));

import {
  AI_RECOMMENDATION_SCHEMA_VERSION,
  GUEST_AI_RECOMMENDATION_STORAGE_KEY,
  loadAIRecommendation,
  loadGuestAIRecommendation,
  saveAIRecommendation,
  validateRecommendationResult
} from "./aiRecommendationPersistence";

const inputs = {
  biggestProblem:
    "I forget important ideas after studying them.",
  methodQuestion:
    "Which methods should I use for science revision?",
  extraContext:
    "I usually study with textbooks and short videos."
};

const result = {
  user_problem: "You need stronger retrieval practice.",
  recommended_methods: [
    {
      name: "Active Recall",
      branch: "Memory",
      reason: "It makes retrieval deliberate.",
      warning: "Check answers after each attempt."
    }
  ],
  study_plan: "Study, retrieve, check, and repeat.",
  final_note: "Keep the practice short and consistent."
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
  firestore.doc.mockClear();
  firestore.getDoc.mockReset();
  firestore.setDoc.mockReset();
  firestore.serverTimestamp.mockClear();
});

describe("AI recommendation persistence", () => {
  it("stores a successful guest recommendation under the versioned key", async () => {
    await saveAIRecommendation(
      { kind: "guest" },
      inputs,
      result
    );

    const stored = JSON.parse(
      window.localStorage.getItem(
        GUEST_AI_RECOMMENDATION_STORAGE_KEY
      ) ?? "null"
    );

    expect(stored).toMatchObject({
      schemaVersion: AI_RECOMMENDATION_SCHEMA_VERSION,
      inputs,
      result
    });
    expect(Number.isFinite(
      Date.parse(stored.updatedAt)
    )).toBe(true);
  });

  it("restores a valid guest recommendation", async () => {
    await saveAIRecommendation(
      { kind: "guest" },
      inputs,
      result
    );

    await expect(loadAIRecommendation({
      kind: "guest"
    })).resolves.toMatchObject({
      inputs,
      result
    });
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it("fails safely for corrupt or malformed guest data", () => {
    window.localStorage.setItem(
      GUEST_AI_RECOMMENDATION_STORAGE_KEY,
      "{not-json"
    );
    expect(loadGuestAIRecommendation()).toBeNull();

    window.localStorage.setItem(
      GUEST_AI_RECOMMENDATION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        inputs,
        result: { unexpected: true },
        updatedAt: new Date().toISOString()
      })
    );
    expect(loadGuestAIRecommendation()).toBeNull();
  });

  it("replaces the previous guest recommendation only after a new save", async () => {
    await saveAIRecommendation(
      { kind: "guest" },
      inputs,
      result
    );

    const replacement = {
      ...result,
      user_problem: "A newer successful recommendation."
    };

    await saveAIRecommendation(
      { kind: "guest" },
      inputs,
      replacement
    );

    expect(loadGuestAIRecommendation()?.result)
      .toEqual(replacement);
  });

  it("writes a signed-in user's latest document with a server timestamp", async () => {
    firestore.setDoc.mockResolvedValue(undefined);

    await saveAIRecommendation(
      { kind: "user", uid: "user-a" },
      inputs,
      result
    );

    expect(firestore.doc).toHaveBeenCalledWith(
      "mock-db",
      "users",
      "user-a",
      "aiRecommendations",
      "latest"
    );
    expect(firestore.setDoc).toHaveBeenCalledWith(
      "mock-db/users/user-a/aiRecommendations/latest",
      {
        schemaVersion: 1,
        inputs,
        result,
        updatedAt: "server-time"
      }
    );
  });

  it("restores only the requested signed-in user's valid document", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        schemaVersion: 1,
        inputs,
        result,
        updatedAt: { seconds: 1, nanoseconds: 0 }
      })
    });

    await expect(loadAIRecommendation({
      kind: "user",
      uid: "user-b"
    })).resolves.toMatchObject({ inputs, result });

    expect(firestore.doc).toHaveBeenCalledWith(
      "mock-db",
      "users",
      "user-b",
      "aiRecommendations",
      "latest"
    );
  });

  it("does not fall back to guest data when a cloud read fails", async () => {
    window.localStorage.setItem(
      GUEST_AI_RECOMMENDATION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        inputs,
        result,
        updatedAt: new Date().toISOString()
      })
    );
    firestore.getDoc.mockRejectedValue(
      new Error("offline")
    );

    await expect(loadAIRecommendation({
      kind: "user",
      uid: "user-c"
    })).rejects.toThrow("offline");
  });

  it("ignores a malformed signed-in document", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        schemaVersion: 1,
        inputs,
        result,
        updatedAt: "not-a-firestore-timestamp"
      })
    });

    await expect(loadAIRecommendation({
      kind: "user",
      uid: "user-d"
    })).resolves.toBeNull();
  });

  it("rejects malformed API results before persistence", () => {
    expect(validateRecommendationResult({
      ...result,
      recommended_methods: []
    })).toBeNull();
    expect(validateRecommendationResult({
      ...result,
      study_plan: 42
    })).toBeNull();
  });
});
