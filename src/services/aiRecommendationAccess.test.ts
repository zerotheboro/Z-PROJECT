import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type { User } from "firebase/auth";

import {
  AIRecommendationAccessError,
  loadAIRecommendationAccess,
  validateAIRecommendationAccess
} from "./aiRecommendationAccess";

function access(plan: "guest" | "free" | "premium") {
  const limit = plan === "guest"
    ? 2
    : plan === "premium"
      ? 16
      : 7;

  return {
    limit,
    used: 1,
    remaining: limit - 1,
    plan,
    dayKey: "2026-10-08",
    timezone: "UTC"
  } as const;
}

describe("AI recommendation access client", () => {
  it("loads authoritative guest access without browser quota data", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(access("guest")), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(loadAIRecommendationAccess(null, {
      fetcher,
      apiBase: "https://api.example"
    })).resolves.toEqual(access("guest"));

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example/api/recommend/access",
      {
        method: "GET",
        headers: {}
      }
    );
  });

  it("uses the current Firebase token for signed-in access", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("token-a")
    } as unknown as User;
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(access("free")), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await loadAIRecommendationAccess(user, {
      fetcher,
      apiBase: "https://api.example/"
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example/api/recommend/access",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token-a"
        }
      }
    );
  });

  it("rejects malformed or internally inconsistent access data", () => {
    expect(validateAIRecommendationAccess({
      ...access("free"),
      remaining: 7
    })).toBeNull();
    expect(validateAIRecommendationAccess({
      ...access("premium"),
      plan: "client-claimed-premium"
    })).toBeNull();
  });

  it("returns a typed error for quota access failures", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        error: "AI recommendation access is unavailable"
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(loadAIRecommendationAccess(null, {
      fetcher,
      apiBase: "https://api.example"
    })).rejects.toBeInstanceOf(
      AIRecommendationAccessError
    );
  });
});
