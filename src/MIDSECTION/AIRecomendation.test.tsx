// @vitest-environment jsdom

import React, {
  type ComponentType
} from "react";
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
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

type TestUser = {
  uid: string;
  getIdToken: () => Promise<string>;
};

const authMocks = vi.hoisted(() => ({
  currentUser: null as TestUser | null,
  listener: null as ((user: TestUser | null) => void) | null,
  subscribeToAuth: vi.fn(),
  unsubscribe: vi.fn()
}));

const firestore = vi.hoisted(() => ({
  doc: vi.fn((...segments: unknown[]) =>
    segments.join("/")),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time")
}));

vi.mock("../firebase", () => ({
  auth: {
    get currentUser() {
      return authMocks.currentUser;
    }
  },
  db: "mock-db"
}));

vi.mock("../services/auth", () => ({
  subscribeToAuth: authMocks.subscribeToAuth
}));

vi.mock("firebase/firestore", () => ({
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  setDoc: firestore.setDoc,
  serverTimestamp: firestore.serverTimestamp
}));

const inputValues = {
  biggestProblem:
    "I forget important details after I study them.",
  methodQuestion:
    "Which study method should I try for science?",
  extraContext:
    "I study with textbooks and videos."
};

const recommendation = {
  user_problem: "You need stronger retrieval practice.",
  recommended_methods: [
    {
      name: "Active Recall",
      branch: "Memory",
      reason: "It makes retrieval deliberate.",
      warning: "Check your answers after each attempt."
    }
  ],
  study_plan: "Study, retrieve, check, and repeat.",
  final_note: "Keep each practice session focused."
};

function savedRecommendation(
  result = recommendation
) {
  return {
    schemaVersion: 1,
    mode: "standard",
    inputs: inputValues,
    result,
    updatedAt: { seconds: 1, nanoseconds: 0 }
  };
}

function existingSnapshot(
  value = savedRecommendation()
) {
  return {
    exists: () => true,
    data: () => value
  };
}

function missingSnapshot() {
  return {
    exists: () => false,
    data: () => undefined
  };
}

function user(uid: string): TestUser {
  return {
    uid,
    getIdToken: vi.fn(async () => `token-${uid}`)
  };
}

async function emitAuth(currentUser: TestUser | null) {
  await act(async () => {
    authMocks.currentUser = currentUser;
    authMocks.listener?.(currentUser);
  });
}

function successfulResponse(
  value: unknown = recommendation
) {
  return {
    ok: true,
    json: vi.fn(async () => value)
  };
}

async function reachFinalQuestion() {
  fireEvent.click(screen.getByRole("button", {
    name: "Start →"
  }));
  fireEvent.change(screen.getByPlaceholderText(
    "I get distracted easily and forget what I study..."
  ), {
    target: { value: inputValues.biggestProblem }
  });
  fireEvent.click(screen.getByRole("button", {
    name: "Continue →"
  }));
  fireEvent.change(screen.getByPlaceholderText(
    "Which study methods would work best for me?"
  ), {
    target: { value: inputValues.methodQuestion }
  });
  fireEvent.click(screen.getByRole("button", {
    name: "Continue →"
  }));
  fireEvent.change(screen.getByPlaceholderText(
    "I mainly study from textbooks and videos..."
  ), {
    target: { value: inputValues.extraContext }
  });
}

async function completeForm() {
  await reachFinalQuestion();
  fireEvent.click(screen.getByRole("button", {
    name: "Get my Recommendation"
  }));
}

function quotaResponse(
  plan: "guest" | "free" | "premium",
  remaining: number,
  deepRemaining = plan === "premium" ? 1 : 0
) {
  const limit = plan === "guest"
    ? 2
    : plan === "premium"
      ? 10
      : 4;

  return new Response(JSON.stringify({
    limit,
    used: limit - remaining,
    reserved: 0,
    remaining,
    plan,
    deep: {
      limit: plan === "premium" ? 1 : 0,
      used: plan === "premium"
        ? 1 - deepRemaining
        : 0,
      reserved: 0,
      remaining: deepRemaining,
      available: plan === "premium"
        && remaining > 0
        && deepRemaining > 0
    },
    dayKey: "2026-10-08",
    timezone: "UTC"
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

let AIRecommendation: ComponentType;

beforeAll(async () => {
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
  vi.stubGlobal("React", React);
  AIRecommendation = (
    await import("./AIRecomendation.jsx")
  ).default;
});

beforeEach(() => {
  vi.stubGlobal("React", React);
  window.localStorage.clear();

  authMocks.currentUser = null;
  authMocks.listener = null;
  authMocks.unsubscribe.mockReset();
  authMocks.subscribeToAuth.mockReset();
  authMocks.subscribeToAuth.mockImplementation(
    (callback: (currentUser: TestUser | null) => void) => {
      authMocks.listener = callback;
      return authMocks.unsubscribe;
    }
  );

  firestore.doc.mockClear();
  firestore.getDoc.mockReset();
  firestore.getDoc.mockResolvedValue(missingSnapshot());
  firestore.setDoc.mockReset();
  firestore.setDoc.mockResolvedValue(undefined);
  firestore.serverTimestamp.mockClear();

  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AIRecommendation persistence", () => {
  it("persists a signed-in user's successful recommendation", async () => {
    vi.mocked(fetch).mockResolvedValue(
      successfulResponse() as unknown as Response
    );
    render(<AIRecommendation />);
    await emitAuth(user("user-a"));

    await completeForm();

    await screen.findByText(recommendation.user_problem);
    await waitFor(() => {
      expect(firestore.setDoc).toHaveBeenCalledWith(
        "mock-db/users/user-a/aiRecommendations/latest",
        expect.objectContaining({
          inputs: inputValues,
          result: recommendation
        })
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-user-a"
        })
      })
    );
  });

  it("persists a guest's successful recommendation locally", async () => {
    vi.mocked(fetch).mockResolvedValue(
      successfulResponse() as unknown as Response
    );
    render(<AIRecommendation />);
    await emitAuth(null);

    await completeForm();

    await screen.findByText(recommendation.user_problem);
    const stored = JSON.parse(
      window.localStorage.getItem(
        "edulience.aiRecommendation.latest.v1"
      ) ?? "null"
    );
    expect(stored).toMatchObject({
      inputs: inputValues,
      result: recommendation
    });
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("restores a signed-in saved recommendation on mount", async () => {
    firestore.getDoc.mockResolvedValue(
      existingSnapshot()
    );
    render(<AIRecommendation />);

    await emitAuth(user("user-a"));

    expect(await screen.findByText(
      recommendation.user_problem
    )).toBeTruthy();
    expect(firestore.doc).toHaveBeenCalledWith(
      "mock-db",
      "users",
      "user-a",
      "aiRecommendations",
      "latest"
    );
  });

  it("restores a guest saved recommendation on mount", async () => {
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      JSON.stringify({
        ...savedRecommendation(),
        updatedAt: new Date().toISOString()
      })
    );
    render(<AIRecommendation />);

    await emitAuth(null);

    expect(await screen.findByText(
      recommendation.user_problem
    )).toBeTruthy();
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it("clears only UI state when Start Again is pressed", async () => {
    const raw = JSON.stringify({
      ...savedRecommendation(),
      updatedAt: new Date().toISOString()
    });
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      raw
    );
    render(<AIRecommendation />);
    await emitAuth(null);
    await screen.findByText(recommendation.user_problem);

    fireEvent.click(screen.getByRole("button", {
      name: "Start Again"
    }));

    expect(screen.getByText("Find your study methods"))
      .toBeTruthy();
    expect(window.localStorage.getItem(
      "edulience.aiRecommendation.latest.v1"
    )).toBe(raw);
    expect(vi.mocked(fetch).mock.calls.some(
      ([url, init]) =>
        String(url).endsWith("/api/recommend")
        && init?.method === "POST"
    )).toBe(false);
  });

  it("does not overwrite the previous save after a failed request", async () => {
    const oldResult = {
      ...recommendation,
      user_problem: "The previous successful result."
    };
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      JSON.stringify({
        ...savedRecommendation(oldResult),
        updatedAt: new Date().toISOString()
      })
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn()
    } as unknown as Response);
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AIRecommendation />);
    await emitAuth(null);
    await screen.findByText(oldResult.user_problem);

    fireEvent.click(screen.getByRole("button", {
      name: "Start Again"
    }));
    await completeForm();

    expect(await screen.findByText(
      "Could not get an AI recommendation."
    )).toBeTruthy();
    const stored = JSON.parse(
      window.localStorage.getItem(
        "edulience.aiRecommendation.latest.v1"
      ) ?? "null"
    );
    expect(stored.result).toEqual(oldResult);
  });

  it("still displays a valid result when its Firestore save fails", async () => {
    firestore.setDoc.mockRejectedValue(
      new Error("permission denied")
    );
    vi.mocked(fetch).mockResolvedValue(
      successfulResponse() as unknown as Response
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AIRecommendation />);
    await emitAuth(user("user-a"));

    await completeForm();

    expect(await screen.findByText(
      recommendation.user_problem
    )).toBeTruthy();
    expect(screen.queryByText(
      "Could not get an AI recommendation."
    )).toBeNull();
  });

  it("restores without posting a new recommendation or consuming quota", async () => {
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      JSON.stringify({
        ...savedRecommendation(),
        updatedAt: new Date().toISOString()
      })
    );
    vi.mocked(fetch).mockResolvedValue(
      quotaResponse("guest", 1)
    );
    render(<AIRecommendation />);

    await emitAuth(null);

    await screen.findByText(recommendation.user_problem);
    expect(vi.mocked(fetch).mock.calls.some(
      ([url, init]) =>
        String(url).endsWith("/api/recommend")
        && init?.method === "POST"
    )).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("waits for Firebase auth before loading guest state", async () => {
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      JSON.stringify({
        ...savedRecommendation(),
        updatedAt: new Date().toISOString()
      })
    );
    render(<AIRecommendation />);

    expect(screen.queryByText(
      recommendation.user_problem
    )).toBeNull();
    expect(firestore.getDoc).not.toHaveBeenCalled();

    await emitAuth(null);
    expect(await screen.findByText(
      recommendation.user_problem
    )).toBeTruthy();
  });

  it("ignores malformed guest storage without crashing the Library section", async () => {
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      "{malformed-json"
    );
    render(<AIRecommendation />);

    await emitAuth(null);

    expect(screen.getByText("Find your study methods"))
      .toBeTruthy();
    expect(screen.queryByText(
      recommendation.user_problem
    )).toBeNull();
  });

  it("ignores a stale user load after the authenticated user changes", async () => {
    let resolveUserA: ((value: unknown) => void) | null = null;
    const userAResult = {
      ...recommendation,
      user_problem: "Private result for user A."
    };
    const userBResult = {
      ...recommendation,
      user_problem: "Private result for user B."
    };

    firestore.getDoc.mockImplementation(
      (reference: string) => {
        if (reference.includes("user-a")) {
          return new Promise(resolve => {
            resolveUserA = resolve;
          });
        }

        return Promise.resolve(existingSnapshot(
          savedRecommendation(userBResult)
        ));
      }
    );
    render(<AIRecommendation />);

    await emitAuth(user("user-a"));
    await emitAuth(user("user-b"));
    expect(await screen.findByText(
      userBResult.user_problem
    )).toBeTruthy();

    await act(async () => {
      resolveUserA?.(existingSnapshot(
        savedRecommendation(userAResult)
      ));
    });

    expect(screen.queryByText(userAResult.user_problem))
      .toBeNull();
    expect(screen.getByText(userBResult.user_problem))
      .toBeTruthy();
  });

  it("handles a Firestore restore failure without showing guest data", async () => {
    window.localStorage.setItem(
      "edulience.aiRecommendation.latest.v1",
      JSON.stringify({
        ...savedRecommendation(),
        updatedAt: new Date().toISOString()
      })
    );
    firestore.getDoc.mockRejectedValue(
      new Error("offline")
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AIRecommendation />);

    await emitAuth(user("user-a"));

    await waitFor(() => {
      expect(firestore.getDoc).toHaveBeenCalled();
    });
    expect(screen.getByText("Find your study methods"))
      .toBeTruthy();
    expect(screen.queryByText(
      recommendation.user_problem
    )).toBeNull();
  });

  it("does not persist a malformed successful API response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      successfulResponse({
        ...recommendation,
        recommended_methods: []
      }) as unknown as Response
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AIRecommendation />);
    await emitAuth(null);

    await completeForm();

    expect(await screen.findByText(
      "Could not get an AI recommendation."
    )).toBeTruthy();
    expect(window.localStorage.getItem(
      "edulience.aiRecommendation.latest.v1"
    )).toBeNull();
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("cannot increase signed-in quota by editing legacy localStorage credits", async () => {
    window.localStorage.setItem("AI_credits", "999999");
    vi.mocked(fetch).mockResolvedValue(
      quotaResponse("free", 0)
    );
    render(<AIRecommendation />);
    await emitAuth(user("user-a"));

    fireEvent.click(screen.getByRole("button", {
      name: /Start/
    }));
    fireEvent.change(screen.getByPlaceholderText(
      "I get distracted easily and forget what I study..."
    ), {
      target: { value: inputValues.biggestProblem }
    });
    fireEvent.click(screen.getByRole("button", {
      name: /Continue/
    }));
    fireEvent.change(screen.getByPlaceholderText(
      "Which study methods would work best for me?"
    ), {
      target: { value: inputValues.methodQuestion }
    });
    fireEvent.click(screen.getByRole("button", {
      name: /Continue/
    }));

    await waitFor(() => {
      expect((screen.getByRole("button", {
        name: "Get my Recommendation"
      }) as HTMLButtonElement).disabled).toBe(true);
    });
    expect(vi.mocked(fetch).mock.calls.some(
      ([url, init]) =>
        String(url).endsWith("/api/recommend")
        && init?.method === "POST"
    )).toBe(false);
  });
});

describe("Premium recommendation modes", () => {
  function mockRecommendationApi(
    plan: "guest" | "free" | "premium",
    remaining: number,
    deepRemaining = plan === "premium" ? 1 : 0
  ) {
    vi.mocked(fetch).mockImplementation(
      async (url, init) => {
        if (
          String(url).endsWith("/api/recommend/access")
        ) {
          return quotaResponse(
            plan,
            remaining,
            deepRemaining
          );
        }

        if (
          String(url).endsWith("/api/recommend")
          && init?.method === "POST"
        ) {
          return successfulResponse() as unknown as Response;
        }

        throw new Error(`Unexpected request: ${url}`);
      }
    );
  }

  it("defaults Premium to Standard and persists a selected Deep result", async () => {
    mockRecommendationApi("premium", 10, 1);
    render(<AIRecommendation />);
    await emitAuth(user("premium-user"));
    await reachFinalQuestion();

    const standard = await screen.findByRole(
      "radio",
      { name: /Standard Recommendation/ }
    ) as HTMLInputElement;
    const deep = screen.getByRole(
      "radio",
      { name: /Deep Recommendation/ }
    ) as HTMLInputElement;

    expect(standard.checked).toBe(true);
    expect(deep.checked).toBe(false);
    expect(deep.disabled).toBe(false);
    expect(screen.getByText(
      "1 Deep Recommendation remaining today"
    )).toBeTruthy();

    expect(screen.getByRole("button", {
      name: "Get my Recommendation"
    })).toBeTruthy();
    fireEvent.click(deep);
    fireEvent.click(screen.getByRole("button", {
      name: "Get my Deep Recommendation"
    }));

    expect(await screen.findByText(
      "YOUR DEEP EDULIENCE PLAN"
    )).toBeTruthy();
    const postCall = vi.mocked(fetch).mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/api/recommend")
        && init?.method === "POST"
    );
    expect(JSON.parse(String(postCall?.[1]?.body)))
      .toMatchObject({ mode: "deep" });
    await waitFor(() => {
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ mode: "deep" })
      );
    });
  });

  it("disables Deep with a server-authoritative explanation when used", async () => {
    mockRecommendationApi("premium", 9, 0);
    render(<AIRecommendation />);
    await emitAuth(user("premium-user"));
    await reachFinalQuestion();

    const deep = await screen.findByRole(
      "radio",
      { name: /Deep Recommendation/ }
    ) as HTMLInputElement;
    expect(deep.disabled).toBe(true);
    expect(screen.getByText(
      "0 Deep Recommendations remaining today",
      { exact: false }
    )).toBeTruthy();
    expect(screen.getByText(
      /Unavailable because today's Deep Recommendation has been used/
    )).toBeTruthy();
  });

  it("applies a server-authoritative Deep denial from a concurrent request", async () => {
    let postCount = 0;

    vi.mocked(fetch).mockImplementation(
      async (url, init) => {
        if (
          String(url).endsWith("/api/recommend/access")
        ) {
          return quotaResponse("premium", 10, 1);
        }

        if (
          String(url).endsWith("/api/recommend")
          && init?.method === "POST"
        ) {
          postCount += 1;
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: "Daily Deep Recommendation limit reached",
              code: "ai_deep_daily_quota_exceeded",
              limit: 10,
              used: 1,
              reserved: 0,
              remaining: 9,
              plan: "premium",
              deep: {
                limit: 1,
                used: 1,
                reserved: 0,
                remaining: 0,
                available: false
              },
              dayKey: "2026-10-15",
              timezone: "UTC"
            })
          } as Response;
        }

        throw new Error(`Unexpected request: ${url}`);
      }
    );
    render(<AIRecommendation />);
    await emitAuth(user("premium-user"));
    await reachFinalQuestion();

    fireEvent.click(await screen.findByRole(
      "radio",
      { name: /Deep Recommendation/ }
    ));
    const submit = screen.getByRole("button", {
      name: "Get my Deep Recommendation"
    }) as HTMLButtonElement;
    fireEvent.click(submit);

    expect(await screen.findByText(
      "Daily Deep Recommendation limit reached"
    )).toBeTruthy();
    expect((screen.getByRole(
      "radio",
      { name: /Deep Recommendation/ }
    ) as HTMLInputElement).disabled).toBe(true);
    expect(submit.disabled).toBe(true);

    fireEvent.click(submit);
    expect(postCount).toBe(1);
  });

  it("returns an entitlement-downgraded user to Standard after rejecting Deep", async () => {
    const postedModes: string[] = [];

    vi.mocked(fetch).mockImplementation(
      async (url, init) => {
        if (
          String(url).endsWith("/api/recommend/access")
        ) {
          return quotaResponse("premium", 10, 1);
        }

        if (
          String(url).endsWith("/api/recommend")
          && init?.method === "POST"
        ) {
          const body = JSON.parse(String(init.body));
          postedModes.push(body.mode);

          if (postedModes.length === 1) {
            return {
              ok: false,
              status: 403,
              json: async () => ({
                error: "Deep Recommendation requires Premium",
                code: "ai_deep_requires_premium",
                limit: 4,
                used: 0,
                reserved: 0,
                remaining: 4,
                plan: "free",
                deep: {
                  limit: 0,
                  used: 0,
                  reserved: 0,
                  remaining: 0,
                  available: false
                },
                dayKey: "2026-10-15",
                timezone: "UTC"
              })
            } as Response;
          }

          return successfulResponse() as unknown as Response;
        }

        throw new Error(`Unexpected request: ${url}`);
      }
    );
    render(<AIRecommendation />);
    await emitAuth(user("downgraded-user"));
    await reachFinalQuestion();

    fireEvent.click(await screen.findByRole(
      "radio",
      { name: /Deep Recommendation/ }
    ));
    fireEvent.click(screen.getByRole("button", {
      name: "Get my Deep Recommendation"
    }));

    expect(await screen.findByText(
      "Deep Recommendation requires Premium"
    )).toBeTruthy();
    expect(screen.queryByRole("group", {
      name: "Recommendation mode"
    })).toBeNull();

    fireEvent.click(screen.getByRole("button", {
      name: "Get my Recommendation"
    }));
    expect(await screen.findByText(
      recommendation.user_problem
    )).toBeTruthy();
    expect(postedModes).toEqual(["deep", "standard"]);
  });

  it.each(["guest", "free"] as const)(
    "keeps %s users on Standard without a mode selector",
    async plan => {
      mockRecommendationApi(
        plan,
        plan === "guest" ? 2 : 4
      );
      render(<AIRecommendation />);
      await emitAuth(
        plan === "guest" ? null : user("free-user")
      );
      await reachFinalQuestion();

      expect(screen.queryByRole("group", {
        name: "Recommendation mode"
      })).toBeNull();
      fireEvent.click(screen.getByRole("button", {
        name: "Get my Recommendation"
      }));
      await screen.findByText(
        recommendation.user_problem
      );
      const postCall = vi.mocked(fetch).mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/api/recommend")
          && init?.method === "POST"
      );
      expect(JSON.parse(String(postCall?.[1]?.body)))
        .toMatchObject({ mode: "standard" });
    }
  );

  it("restores the persisted Deep mode with its saved result", async () => {
    mockRecommendationApi("premium", 9, 0);
    firestore.getDoc.mockResolvedValue(
      existingSnapshot({
        ...savedRecommendation(),
        mode: "deep"
      })
    );
    render(<AIRecommendation />);

    await emitAuth(user("premium-user"));

    expect(await screen.findByText(
      "YOUR DEEP EDULIENCE PLAN"
    )).toBeTruthy();
  });
});
