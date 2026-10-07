import type {
  User
} from "firebase/auth";

import {
  getBrowserTimeZone,
  getLocalDayKey
} from "../quiz/trainingStreak";

import type {
  TrainingMode
} from "../quiz/trainingProgress";
import type {
  TrainingMethodId
} from "../quiz/type";

export const GUEST_TRAINING_ACCESS_STORAGE_KEY =
  "edulience.training-access.v1.guest";
export const FREE_TEST_ME_LIMIT = 1;
export const FREE_MANUAL_METHOD_LIMIT = 3;

const DEFAULT_API_BASE =
  "https://z-project-ba3t.onrender.com";

export type TrainingPlan = "free" | "premium";

export type TrainingAccessStatus = {
  plan: TrainingPlan;
  limits: {
    testMePerDay: number;
    manualMethodsPerDay: number;
  };
  usage: {
    testMeStarted: number;
    manualMethodsStarted: number;
  };
  remaining: {
    testMe: number | null;
    manualMethods: number | null;
  };
  unlimited: boolean;
  dayKey: string;
  timezone: string;
};

export type TrainingReservationInput = {
  sessionId: string;
  mode: TrainingMode;
  methodIds: TrainingMethodId[];
};

type GuestReservation = TrainingReservationInput & {
  dayKey: string;
};

type GuestAccessRecord = {
  schemaVersion: 1;
  days: Record<string, {
    testMeStarted: number;
    manualMethodsStarted: number;
  }>;
  reservations: Record<string, GuestReservation>;
};

type AccessContext = {
  now?: Date;
  timeZone?: string;
  storage?: Storage | null;
  fetcher?: typeof fetch;
  apiBase?: string;
};

export class TrainingAccessError extends Error {
  code: string | null;
  quota: "test_me" | "manual_methods" | null;
  status: number;

  constructor(
    message: string,
    {
      code = null,
      quota = null,
      status = 0
    }: {
      code?: string | null;
      quota?: "test_me" | "manual_methods" | null;
      status?: number;
    } = {}
  ) {
    super(message);
    this.name = "TrainingAccessError";
    this.code = code;
    this.quota = quota;
    this.status = status;
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.localStorage;
  } catch {
    return null;
  }
}

function emptyGuestRecord(): GuestAccessRecord {
  return {
    schemaVersion: 1,
    days: {},
    reservations: {}
  };
}

function readGuestRecord(
  storage: Storage | null
): GuestAccessRecord {
  if (!storage) {
    return emptyGuestRecord();
  }

  try {
    const raw = storage.getItem(
      GUEST_TRAINING_ACCESS_STORAGE_KEY
    );
    if (!raw) {
      return emptyGuestRecord();
    }

    const value = JSON.parse(raw) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      (value as { schemaVersion?: unknown })
        .schemaVersion !== 1
    ) {
      return emptyGuestRecord();
    }

    const candidate = value as {
      days?: unknown;
      reservations?: unknown;
    };
    return {
      schemaVersion: 1,
      days:
        typeof candidate.days === "object" &&
        candidate.days !== null &&
        !Array.isArray(candidate.days)
          ? candidate.days as GuestAccessRecord["days"]
          : {},
      reservations:
        typeof candidate.reservations === "object" &&
        candidate.reservations !== null &&
        !Array.isArray(candidate.reservations)
          ? candidate.reservations as GuestAccessRecord["reservations"]
          : {}
    };
  } catch {
    return emptyGuestRecord();
  }
}

function calendar(context: AccessContext) {
  const timezone = context.timeZone ??
    getBrowserTimeZone();
  const dayKey = getLocalDayKey(
    context.now ?? new Date(),
    timezone
  );

  return { dayKey, timezone };
}

function guestAccess(
  record: GuestAccessRecord,
  dayKey: string,
  timezone: string
): TrainingAccessStatus {
  const usage = record.days[dayKey] ?? {
    testMeStarted: 0,
    manualMethodsStarted: 0
  };

  return {
    plan: "free",
    limits: {
      testMePerDay: FREE_TEST_ME_LIMIT,
      manualMethodsPerDay:
        FREE_MANUAL_METHOD_LIMIT
    },
    usage,
    remaining: {
      testMe: Math.max(
        0,
        FREE_TEST_ME_LIMIT - usage.testMeStarted
      ),
      manualMethods: Math.max(
        0,
        FREE_MANUAL_METHOD_LIMIT -
          usage.manualMethodsStarted
      )
    },
    unlimited: false,
    dayKey,
    timezone
  };
}

function apiBase(context: AccessContext): string {
  return (
    context.apiBase ??
    import.meta.env.VITE_API_BASE_URL ??
    DEFAULT_API_BASE
  ).replace(/\/$/, "");
}

async function responseJson(response: Response) {
  try {
    return await response.json() as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

async function authorizedRequest(
  user: User,
  path: string,
  init: RequestInit,
  context: AccessContext
) {
  const token = await user.getIdToken();
  const fetcher = context.fetcher ?? fetch;
  const response = await fetcher(
    `${apiBase(context)}${path}`,
    {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`
      }
    }
  );
  const body = await responseJson(response);

  if (!response.ok) {
    throw new TrainingAccessError(
      typeof body.error === "string"
        ? body.error
        : "Training access could not be verified.",
      {
        code: typeof body.code === "string"
          ? body.code
          : null,
        quota:
          body.quota === "test_me" ||
          body.quota === "manual_methods"
            ? body.quota
            : null,
        status: response.status
      }
    );
  }

  return body;
}

export async function loadTrainingAccess(
  user: User | null,
  context: AccessContext = {}
): Promise<TrainingAccessStatus> {
  const { dayKey, timezone } = calendar(context);

  if (!user) {
    return guestAccess(
      readGuestRecord(
        context.storage ?? getStorage()
      ),
      dayKey,
      timezone
    );
  }

  return authorizedRequest(
    user,
    `/api/training/access?timezone=${encodeURIComponent(timezone)}`,
    { method: "GET" },
    context
  ) as Promise<TrainingAccessStatus>;
}

export async function reserveTrainingAccess(
  user: User | null,
  input: TrainingReservationInput,
  context: AccessContext = {}
): Promise<void> {
  const { dayKey, timezone } = calendar(context);

  if (
    (input.mode === "auto" &&
      input.methodIds.length !== 0) ||
    (input.mode === "manual" &&
      (input.methodIds.length < 1 ||
        input.methodIds.length > 3)) ||
    new Set(input.methodIds).size !==
      input.methodIds.length
  ) {
    throw new TrainingAccessError(
      "Training reservation details are invalid.",
      {
        code: "invalid_training_reservation",
        status: 400
      }
    );
  }

  if (user) {
    await authorizedRequest(
      user,
      "/api/training/reserve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...input,
          timezone
        })
      },
      context
    );
    return;
  }

  const storage = context.storage ?? getStorage();
  if (!storage) {
    throw new TrainingAccessError(
      "Browser storage is unavailable."
    );
  }

  const record = readGuestRecord(storage);
  const existing = record.reservations[input.sessionId];
  if (existing) {
    const same =
      existing.mode === input.mode &&
      existing.methodIds.length === input.methodIds.length &&
      existing.methodIds.every(
        (method, index) =>
          method === input.methodIds[index]
      );
    if (!same) {
      throw new TrainingAccessError(
        "This session ID is already used by different training.",
        {
          code: "training_reservation_conflict",
          status: 409
        }
      );
    }
    return;
  }

  const access = guestAccess(
    record,
    dayKey,
    timezone
  );
  const methodCount = input.mode === "manual"
    ? input.methodIds.length
    : 0;

  if (
    input.mode === "auto" &&
    access.remaining.testMe === 0
  ) {
    throw new TrainingAccessError(
      "Daily Test Me used. Come back tomorrow or upgrade.",
      {
        code: "training_quota_exceeded",
        quota: "test_me",
        status: 403
      }
    );
  }

  if (
    input.mode === "manual" &&
    methodCount > (access.remaining.manualMethods ?? 0)
  ) {
    throw new TrainingAccessError(
      `You have ${access.remaining.manualMethods ?? 0} method test${access.remaining.manualMethods === 1 ? "" : "s"} remaining today.`,
      {
        code: "training_quota_exceeded",
        quota: "manual_methods",
        status: 403
      }
    );
  }

  record.days[dayKey] = {
    testMeStarted:
      access.usage.testMeStarted +
      (input.mode === "auto" ? 1 : 0),
    manualMethodsStarted:
      access.usage.manualMethodsStarted + methodCount
  };
  record.reservations[input.sessionId] = {
    ...input,
    methodIds: [...input.methodIds],
    dayKey
  };
  storage.setItem(
    GUEST_TRAINING_ACCESS_STORAGE_KEY,
    JSON.stringify(record)
  );
}
