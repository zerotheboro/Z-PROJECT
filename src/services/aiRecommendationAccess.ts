import type { User } from "firebase/auth";

export const GUEST_AI_RECOMMENDATION_LIMIT = 2;
export const FREE_AI_RECOMMENDATION_LIMIT = 7;
export const PREMIUM_AI_RECOMMENDATION_LIMIT = 16;

const DEFAULT_API_BASE =
  "https://z-project-ba3t.onrender.com";

export type AIRecommendationPlan =
  | "guest"
  | "free"
  | "premium";

export type AIRecommendationAccess = {
  limit: number;
  used: number;
  remaining: number;
  plan: AIRecommendationPlan;
  dayKey: string;
  timezone: "UTC";
};

type AccessContext = {
  fetcher?: typeof fetch;
  apiBase?: string;
};

export class AIRecommendationAccessError extends Error {
  status: number;
  code: string | null;

  constructor(
    message: string,
    {
      status = 0,
      code = null
    }: {
      status?: number;
      code?: string | null;
    } = {}
  ) {
    super(message);
    this.name = "AIRecommendationAccessError";
    this.status = status;
    this.code = code;
  }
}

function apiBase(context: AccessContext): string {
  return (
    context.apiBase
    ?? import.meta.env.VITE_API_BASE_URL
    ?? DEFAULT_API_BASE
  ).replace(/\/$/, "");
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value)
    && (value as number) >= 0;
}

export function validateAIRecommendationAccess(
  value: unknown
): AIRecommendationAccess | null {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
  ) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const validPlan = candidate.plan === "guest"
    || candidate.plan === "free"
    || candidate.plan === "premium";

  if (
    !isNonNegativeInteger(candidate.limit)
    || !isNonNegativeInteger(candidate.used)
    || !isNonNegativeInteger(candidate.remaining)
    || candidate.remaining
      !== Math.max(
        0,
        candidate.limit - candidate.used
      )
    || !validPlan
    || typeof candidate.dayKey !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(
      candidate.dayKey
    )
    || candidate.timezone !== "UTC"
  ) {
    return null;
  }

  return {
    limit: candidate.limit,
    used: candidate.used,
    remaining: candidate.remaining,
    plan: candidate.plan as AIRecommendationPlan,
    dayKey: candidate.dayKey,
    timezone: "UTC"
  };
}

async function responseJson(response: Response) {
  try {
    return await response.json() as unknown;
  } catch {
    return null;
  }
}

export async function loadAIRecommendationAccess(
  user: User | null,
  context: AccessContext = {}
): Promise<AIRecommendationAccess> {
  const token = user
    ? await user.getIdToken()
    : null;
  const fetcher = context.fetcher ?? fetch;
  const response = await fetcher(
    `${apiBase(context)}/api/recommend/access`,
    {
      method: "GET",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {}
    }
  );
  const body = await responseJson(response);

  if (!response.ok) {
    const candidate = body
      && typeof body === "object"
      && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};

    throw new AIRecommendationAccessError(
      typeof candidate.error === "string"
        ? candidate.error
        : "AI recommendation access could not be loaded.",
      {
        status: response.status,
        code: typeof candidate.code === "string"
          ? candidate.code
          : null
      }
    );
  }

  const access = validateAIRecommendationAccess(body);

  if (!access) {
    throw new AIRecommendationAccessError(
      "AI recommendation access response was invalid.",
      { status: response.status }
    );
  }

  return access;
}
