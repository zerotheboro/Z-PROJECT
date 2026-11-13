// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  GUEST_TRAINING_ACCESS_STORAGE_KEY,
  loadTrainingAccess,
  reserveTrainingAccess,
  TrainingAccessError
} from "./trainingAccess";

import type {
  User
} from "firebase/auth";
import { createTrainingDraft, validateTrainingDraft } from "../quiz/trainingProgress";

const DAY_ONE = new Date("2026-10-06T03:00:00.000Z");
const DAY_TWO = new Date("2026-10-07T03:00:00.000Z");

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: key => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

describe("Training access client", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
  });
  it("accepts the canonical 100-second method and preserves a guest's reservation on identical retry", async () => {
    const input = { sessionId: "delay-registration", mode: "manual" as const, methodIds: ["hundred-second-delay" as const] };
    const context = { storage, now: DAY_ONE, timeZone: "UTC" };
    await reserveTrainingAccess(null, input, context); await reserveTrainingAccess(null, input, context);
    expect(await loadTrainingAccess(null, context)).toMatchObject({ usage: { manualMethodsStarted: 1 } });
  });
  it.each(["post-sleep", "100-second-delay"])("rejects stale %s before requesting a token, writing quota, or changing an existing draft", async method => {
    const fetcher = vi.fn(), getIdToken = vi.fn();
    const existing = createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", selectedMethods: ["active-recall"], sessionId: "valid-existing-progress" });
    expect(validateTrainingDraft(existing)).toMatchObject({ valid: true });
    storage.setItem("edulience.training-progress.v1.guest", JSON.stringify(existing));
    const before = storage.getItem("edulience.training-progress.v1.guest");
    const input = { sessionId: "stale-registration", mode: "manual", methodIds: [method] };
    await expect(Reflect.apply(reserveTrainingAccess, undefined, [null, input, { storage, fetcher }])).rejects.toMatchObject({ code: "invalid_training_reservation" });
    await expect(Reflect.apply(reserveTrainingAccess, undefined, [{ getIdToken }, input, { storage, fetcher }])).rejects.toMatchObject({ code: "invalid_training_reservation" });
    expect(fetcher).not.toHaveBeenCalled(); expect(getIdToken).not.toHaveBeenCalled();
    expect(storage.getItem(GUEST_TRAINING_ACCESS_STORAGE_KEY)).toBeNull(); expect(storage.getItem("edulience.training-progress.v1.guest")).toBe(before);
  });

  it("starts guests with the free daily allowance", async () => {
    await expect(loadTrainingAccess(null, {
      storage,
      now: DAY_ONE,
      timeZone: "UTC"
    })).resolves.toMatchObject({
      plan: "free",
      usage: {
        testMeStarted: 0,
        manualMethodsStarted: 0
      },
      remaining: {
        testMe: 1,
        manualMethods: 3
      }
    });
  });

  it("uses the signed-in server's 2/4 limits without substituting the guest's 1/3 policy", async () => {
    const getIdToken = vi.fn().mockResolvedValue("synthetic-quota-token");
    const user = { getIdToken } as unknown as User;
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      plan: "free", planSource: "default", unlimited: false,
      limits: { testMePerDay: 2, manualMethodsPerDay: 4 },
      usage: { testMeStarted: 0, manualMethodsStarted: 0 },
      remaining: { testMe: 2, manualMethods: 4 },
      dayKey: "2026-10-06", timezone: "UTC"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    expect(await loadTrainingAccess(user, { storage, fetcher, timeZone: "UTC", apiBase: "http://127.0.0.1:18084" }))
      .toMatchObject({ limits: { testMePerDay: 2, manualMethodsPerDay: 4 }, remaining: { testMe: 2, manualMethods: 4 } });
    expect(getIdToken).toHaveBeenCalledOnce();
    expect(storage.getItem(GUEST_TRAINING_ACCESS_STORAGE_KEY)).toBeNull();
  });

  it("charges one guest Test Me once per session ID", async () => {
    const input = {
      sessionId: "session-0001",
      mode: "auto" as const,
      methodIds: []
    };
    const context = {
      storage,
      now: DAY_ONE,
      timeZone: "UTC"
    };

    await reserveTrainingAccess(null, input, context);
    await reserveTrainingAccess(null, input, context);

    await expect(
      loadTrainingAccess(null, context)
    ).resolves.toMatchObject({
      usage: { testMeStarted: 1 },
      remaining: { testMe: 0 }
    });
    await expect(reserveTrainingAccess(null, {
      ...input,
      sessionId: "session-0002"
    }, context)).rejects.toMatchObject({
      code: "training_quota_exceeded",
      quota: "test_me"
    });
  });

  it("charges guest manual quota by 1, 2, or 3 selected methods", async () => {
    const context = {
      storage,
      now: DAY_ONE,
      timeZone: "UTC"
    };

    await reserveTrainingAccess(null, {
      sessionId: "manual-0001",
      mode: "manual",
      methodIds: ["active-recall"]
    }, context);
    await reserveTrainingAccess(null, {
      sessionId: "manual-0002",
      mode: "manual",
      methodIds: ["feynman", "cornell"]
    }, context);

    await expect(
      loadTrainingAccess(null, context)
    ).resolves.toMatchObject({
      usage: { manualMethodsStarted: 3 },
      remaining: { manualMethods: 0 }
    });
    await expect(reserveTrainingAccess(null, {
      sessionId: "manual-0003",
      mode: "manual",
      methodIds: ["interleaving"]
    }, context)).rejects.toBeInstanceOf(
      TrainingAccessError
    );
  });

  it("does not refund a guest reservation when unrelated draft data is removed", async () => {
    const context = {
      storage,
      now: DAY_ONE,
      timeZone: "UTC"
    };
    await reserveTrainingAccess(null, {
      sessionId: "manual-0001",
      mode: "manual",
      methodIds: [
        "active-recall",
        "feynman",
        "cornell"
      ]
    }, context);

    storage.removeItem("edulience.training-progress.v1.guest");

    await expect(
      loadTrainingAccess(null, context)
    ).resolves.toMatchObject({
      usage: { manualMethodsStarted: 3 }
    });
    expect(storage.getItem(
      GUEST_TRAINING_ACCESS_STORAGE_KEY
    )).not.toBeNull();
  });

  it("keeps yesterday's session idempotent without using today's quota", async () => {
    await reserveTrainingAccess(null, {
      sessionId: "session-0001",
      mode: "auto",
      methodIds: []
    }, {
      storage,
      now: DAY_ONE,
      timeZone: "UTC"
    });

    await reserveTrainingAccess(null, {
      sessionId: "session-0001",
      mode: "auto",
      methodIds: []
    }, {
      storage,
      now: DAY_TWO,
      timeZone: "UTC"
    });

    await expect(loadTrainingAccess(null, {
      storage,
      now: DAY_TWO,
      timeZone: "UTC"
    })).resolves.toMatchObject({
      usage: { testMeStarted: 0 },
      remaining: { testMe: 1 }
    });
  });

  it("uses a Firebase token and propagates server quota denial", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("token-a")
    } as unknown as User;
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        error: "Daily training limit reached",
        code: "training_quota_exceeded",
        quota: "test_me"
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    ));

    await expect(reserveTrainingAccess(user, {
      sessionId: "session-0001",
      mode: "auto",
      methodIds: []
    }, {
      fetcher,
      now: DAY_ONE,
      timeZone: "UTC",
      apiBase: "https://api.example"
    })).rejects.toMatchObject({
      status: 403,
      code: "training_quota_exceeded",
      quota: "test_me"
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example/api/training/reserve",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-a"
        })
      })
    );
  });
});
