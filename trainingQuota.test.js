import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import { once } from "node:events";
import { createRecommendationApp } from "./server.js";
import { TRAINING_METHOD_IDS } from "./trainingMethodIds.js";

import {
  createFirebaseTrainingQuotaManager,
  getServerDayKey,
  TrainingQuotaExceededError,
  TrainingQuotaValidationError
} from "./trainingQuota.js";

const NOW = Date.UTC(2026, 9, 6, 23, 30);
const TIMEZONE = "Asia/Ho_Chi_Minh";

class FakeSnapshot {
  constructor(data) {
    this.value = data;
    this.exists = data !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeReference {
  constructor(firestore, path) {
    this.firestore = firestore;
    this.path = path;
  }

  collection(name) {
    return new FakeCollection(
      this.firestore,
      `${this.path}/${name}`
    );
  }

  get() {
    return Promise.resolve(
      new FakeSnapshot(
        this.firestore.documents.get(this.path)
      )
    );
  }
}

class FakeCollection {
  constructor(firestore, path) {
    this.firestore = firestore;
    this.path = path;
  }

  doc(id) {
    return new FakeReference(
      this.firestore,
      `${this.path}/${id}`
    );
  }
}

class FakeFirestore {
  constructor() {
    this.documents = new Map();
    this.queue = Promise.resolve();
  }

  collection(name) {
    return new FakeCollection(this, name);
  }

  seed(path, data) {
    this.documents.set(path, data);
  }

  runTransaction(callback) {
    const operation = this.queue.then(async () => {
      const writes = [];
      const transaction = {
        get: reference => reference.get(),
        set: (reference, data) => {
          writes.push([reference.path, data]);
        }
      };
      const result = await callback(transaction);

      for (const [path, data] of writes) {
        this.documents.set(path, data);
      }
      return result;
    });

    this.queue = operation.catch(() => undefined);
    return operation;
  }
}

function setup() {
  const firestore = new FakeFirestore();
  const manager = createFirebaseTrainingQuotaManager({
    now: () => NOW,
    getFirestore: () => firestore
  });

  return { firestore, manager };
}

function reservation(overrides = {}) {
  return {
    sessionId: "session-0001",
    mode: "auto",
    methodIds: [],
    timezone: TIMEZONE,
    ...overrides
  };
}

function entitlementPath(uid = "user-a") {
  return `users/${uid}/entitlements/current`;
}

function usagePath(
  dayKey = "2026-10-07",
  uid = "user-a"
) {
  return `users/${uid}/trainingUsage/${dayKey}`;
}

describe("Training method registration", () => {
  it.each(TRAINING_METHOD_IDS)("accepts canonical %s through the real quota validator and charges one method exactly once", async method => {
    const { manager } = setup();
    const input = reservation({ mode: "manual", methodIds: [method] });
    expect(await manager.reserve("synthetic-registration", input)).toMatchObject({ allowed: true, idempotent: false });
    expect(await manager.reserve("synthetic-registration", input)).toMatchObject({ allowed: true, idempotent: true });
    expect(await manager.getAccess("synthetic-registration", TIMEZONE)).toMatchObject({ usage: { manualMethodsStarted: 1 } });
  });
  it.each(["100-second-delay", "post-sleep", "HundredSecondDelay"])("rejects stale/incorrect %s without changing quota or persisted progress", async method => {
    const { manager, firestore } = setup();
    await expect(manager.reserve("synthetic-registration", reservation({ mode: "manual", methodIds: [method] }))).rejects.toMatchObject({
      code: "invalid_training_reservation", message: "methodIds contains an unknown training method"
    });
    expect(firestore.documents.size).toBe(0);
  });
  it("accepts 100-second delay at the actual authenticated HTTP session-start route, retaining retry, conflict and auth protections", async () => {
    const { manager, firestore } = setup();
    const paidCall = vi.fn(() => { throw new Error("Paid calls are disabled in this test"); });
    const app = createRecommendationApp({ trainingQuotaManager: manager,
      openAIClient: { responses: { create: paidCall } },
      verifyFirebaseToken: async token => { if (token !== "synthetic-token") throw new Error("Invalid token"); return { uid: "synthetic-registration" }; },
      logger: { info() {}, warn() {}, error() {}, log() {} } });
    const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const input = reservation({ mode: "manual", methodIds: ["hundred-second-delay"] });
    const post = (body, token = "synthetic-token") => fetch(base + "/api/training/reserve", { method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    try {
      const first = await post(input); expect(first.status).toBe(200); expect(await first.json()).toMatchObject({ allowed: true, idempotent: false });
      const retry = await post(input); expect(retry.status).toBe(200); expect(await retry.json()).toMatchObject({ allowed: true, idempotent: true });
      const before = new Map(firestore.documents);
      expect((await post({ ...input, methodIds: ["post-sleep"] })).status).toBe(400);
      expect((await post({ ...input, methodIds: ["feynman"] })).status).toBe(409);
      expect((await post({ ...input, sessionId: "unauthenticated-registration" }, null)).status).toBe(401);
      expect(firestore.documents).toEqual(before);
      expect(await manager.getAccess("synthetic-registration", TIMEZONE)).toMatchObject({ usage: { manualMethodsStarted: 1 } });
      expect(paidCall).not.toHaveBeenCalled();
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
});

describe("server-authoritative Training quotas", () => {
  it("treats a missing entitlement as free", async () => {
    const { manager } = setup();

    await expect(
      manager.getAccess("user-a", TIMEZONE)
    ).resolves.toMatchObject({
      plan: "free",
      planSource: "default",
      unlimited: false,
      remaining: { testMe: 2, manualMethods: 4 }
    });
  });

  it("allows the first free Test Me reservation", async () => {
    const { manager } = setup();

    await expect(
      manager.reserve("user-a", reservation())
    ).resolves.toMatchObject({
      allowed: true,
      idempotent: false,
      plan: "free"
    });
  });

  it("denies a third new free Test Me reservation that day", async () => {
    const { manager } = setup();
    await manager.reserve("user-a", reservation());
    await manager.reserve("user-a", reservation({
      sessionId: "session-0002"
    }));

    await expect(manager.reserve("user-a", reservation({
      sessionId: "session-0003"
    }))).rejects.toMatchObject({
      code: "training_quota_exceeded",
      quota: "test_me"
    });
  });

  it("allows a free one-method manual reservation", async () => {
    const { manager } = setup();

    await manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: ["active-recall"]
    }));

    await expect(
      manager.getAccess("user-a", TIMEZONE)
    ).resolves.toMatchObject({
      usage: { manualMethodsStarted: 1 },
      remaining: { manualMethods: 3 }
    });
  });

  it("allows three manual methods when all three remain", async () => {
    const { manager } = setup();

    await expect(manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: [
        "active-recall",
        "feynman",
        "cornell"
      ]
    }))).resolves.toMatchObject({ allowed: true });
  });

  it("rejects a four-method manual request", async () => {
    const { manager } = setup();

    await expect(manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: [
        "active-recall",
        "feynman",
        "cornell",
        "interleaving"
      ]
    }))).rejects.toBeInstanceOf(
      TrainingQuotaValidationError
    );
  });

  it("denies two requested methods when only one remains", async () => {
    const { firestore, manager } = setup();
    firestore.seed(usagePath(), {
      dayKey: "2026-10-07",
      timezone: TIMEZONE,
      testMeStarted: 0,
      manualMethodsStarted: 3
    });

    await expect(manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: ["active-recall", "feynman"]
    }))).rejects.toBeInstanceOf(
      TrainingQuotaExceededError
    );
  });

  it("allows repeated premium Test Me reservations", async () => {
    const { firestore, manager } = setup();
    firestore.seed(entitlementPath(), {
      plan: "premium",
      source: "manual",
      validUntil: null
    });

    await manager.reserve("user-a", reservation());
    await expect(manager.reserve("user-a", reservation({
      sessionId: "session-0002"
    }))).resolves.toMatchObject({
      allowed: true,
      plan: "premium"
    });
  });

  it("allows premium manual usage beyond the free daily count", async () => {
    const { firestore, manager } = setup();
    firestore.seed(entitlementPath(), {
      plan: "premium"
    });

    await manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: [
        "active-recall",
        "feynman",
        "cornell"
      ]
    }));
    await expect(manager.reserve("user-a", reservation({
      sessionId: "session-0002",
      mode: "manual",
      methodIds: ["interleaving"]
    }))).resolves.toMatchObject({ allowed: true });
  });

  it("does not increment twice for the same session ID", async () => {
    const { manager } = setup();

    await manager.reserve("user-a", reservation());
    await expect(
      manager.reserve("user-a", reservation())
    ).resolves.toMatchObject({
      allowed: true,
      idempotent: true
    });
    await expect(
      manager.getAccess("user-a", TIMEZONE)
    ).resolves.toMatchObject({
      usage: { testMeStarted: 1 }
    });
  });

  it("keeps the same session idempotent after the user's day changes", async () => {
    const firestore = new FakeFirestore();
    let currentTime = NOW;
    const manager = createFirebaseTrainingQuotaManager({
      now: () => currentTime,
      getFirestore: () => firestore
    });

    await manager.reserve("user-a", reservation());
    currentTime = NOW + (24 * 60 * 60 * 1000);

    await expect(
      manager.reserve("user-a", reservation())
    ).resolves.toMatchObject({
      allowed: true,
      idempotent: true,
      dayKey: "2026-10-07"
    });
    await expect(
      manager.getAccess("user-a", TIMEZONE)
    ).resolves.toMatchObject({
      dayKey: "2026-10-08",
      usage: { testMeStarted: 0 },
      remaining: { testMe: 2 }
    });
  });

  it("serializes concurrent same-session reservations into one charge", async () => {
    const { manager } = setup();

    const results = await Promise.all([
      manager.reserve("user-a", reservation()),
      manager.reserve("user-a", reservation())
    ]);

    expect(results.filter(result => !result.idempotent))
      .toHaveLength(1);
    await expect(
      manager.getAccess("user-a", TIMEZONE)
    ).resolves.toMatchObject({
      usage: { testMeStarted: 1 }
    });
  });

  it("prevents concurrent different sessions from exceeding the quota", async () => {
    const { manager } = setup();

    const results = await Promise.allSettled([
      manager.reserve("user-a", reservation()),
      manager.reserve("user-a", reservation({
        sessionId: "session-0002"
      })),
      manager.reserve("user-a", reservation({
        sessionId: "session-0003"
      }))
    ]);

    expect(results.filter(result => result.status === "fulfilled"))
      .toHaveLength(2);
    expect(results.filter(result => result.status === "rejected"))
      .toHaveLength(1);
  });

  it("rejects malformed modes", async () => {
    const { manager } = setup();

    await expect(manager.reserve("user-a", reservation({
      mode: "assessment"
    }))).rejects.toBeInstanceOf(
      TrainingQuotaValidationError
    );
  });

  it("rejects unknown method IDs", async () => {
    const { manager } = setup();

    await expect(manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: ["made-up-method"]
    }))).rejects.toBeInstanceOf(
      TrainingQuotaValidationError
    );
  });

  it("rejects duplicate method IDs", async () => {
    const { manager } = setup();

    await expect(manager.reserve("user-a", reservation({
      mode: "manual",
      methodIds: ["feynman", "feynman"]
    }))).rejects.toBeInstanceOf(
      TrainingQuotaValidationError
    );
  });

  it("uses server time instead of a client clock field", async () => {
    const { manager } = setup();

    const result = await manager.reserve("user-a", {
      ...reservation(),
      clientNow: "1999-01-01T00:00:00.000Z"
    });

    expect(result.dayKey).toBe("2026-10-07");
  });

  it("calculates the day in a validated IANA timezone", () => {
    expect(getServerDayKey(
      Date.UTC(2026, 9, 6, 23, 30),
      "Asia/Ho_Chi_Minh"
    )).toBe("2026-10-07");
    expect(getServerDayKey(
      Date.UTC(2026, 9, 6, 23, 30),
      "America/New_York"
    )).toBe("2026-10-06");
  });

  it.each([undefined, "Not/A_Timezone", "x".repeat(65)])(
    "rejects a missing or invalid timezone: %s",
    async timezone => {
      const { manager } = setup();

      await expect(
        manager.getAccess("user-a", timezone)
      ).rejects.toBeInstanceOf(
        TrainingQuotaValidationError
      );
    }
  );

  it("treats expired premium as free", async () => {
    const { firestore, manager } = setup();
    firestore.seed(entitlementPath(), {
      plan: "premium",
      validUntil: new Date(NOW - 1)
    });

    await expect(
      manager.getAccess("user-a", TIMEZONE)
    ).resolves.toMatchObject({
      plan: "free",
      unlimited: false
    });
  });

  it("returns only the safe Paddle plan source", async () => {
    const { firestore, manager } = setup();
    firestore.seed(entitlementPath(), {
      plan: "premium",
      source: "paddle",
      paddleCustomerId: "must-not-leak",
      paddleSubscriptionId: "must-not-leak"
    });

    const access = await manager.getAccess(
      "user-a",
      TIMEZONE
    );

    expect(access).toMatchObject({
      plan: "premium",
      planSource: "paddle",
      unlimited: true
    });
    expect(JSON.stringify(access)).not.toContain(
      "must-not-leak"
    );
  });
});
