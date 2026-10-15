import {
  describe,
  expect,
  it
} from "vitest";

import {
  AIRecommendationDeepAccessError,
  AIRecommendationDeepQuotaExceededError,
  AIRecommendationQuotaExceededError,
  AI_RECOMMENDATION_RESERVATION_TTL_MS,
  AI_DAILY_USAGE_COLLECTION,
  createFirebaseAIRecommendationQuotaManager,
  FREE_AI_DAILY_LIMIT,
  GUEST_AI_DAILY_LIMIT,
  PREMIUM_DEEP_AI_DAILY_LIMIT,
  PREMIUM_AI_DAILY_LIMIT
} from "./aiRecommendationQuota.js";

const DAY_ONE = Date.parse(
  "2026-10-08T23:59:59.000Z"
);

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
  constructor(firestore, path, id) {
    this.firestore = firestore;
    this.path = path;
    this.id = id;
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
      `${this.path}/${id}`,
      id
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
        set: (reference, data, options = {}) => {
          writes.push({
            path: reference.path,
            data,
            merge: options.merge === true
          });
        }
      };
      const result = await callback(transaction);

      for (const write of writes) {
        const previous = this.documents.get(write.path);
        this.documents.set(
          write.path,
          write.merge
            ? { ...previous, ...write.data }
            : write.data
        );
      }

      return result;
    });

    this.queue = operation.catch(() => undefined);
    return operation;
  }
}

function setup(now = DAY_ONE) {
  const firestore = new FakeFirestore();
  let currentTime = now;
  let reservationSequence = 0;
  const manager =
    createFirebaseAIRecommendationQuotaManager({
      now: () => currentTime,
      getFirestore: () => firestore,
      createReservationId: () =>
        `reservation-${++reservationSequence}`
    });

  return {
    firestore,
    manager,
    setNow(value) {
      currentTime = value;
    }
  };
}

function entitlementPath(uid = "user-a") {
  return `users/${uid}/entitlements/current`;
}

async function consume(manager, identity, count) {
  for (let index = 0; index < count; index += 1) {
    await manager.consume(identity);
  }
}

describe("server-authoritative AI recommendation quota", () => {
  it("allows two guest successes and blocks the third per IP", async () => {
    const { manager } = setup();
    const identity = { ip: "203.0.113.10" };

    await consume(manager, identity, GUEST_AI_DAILY_LIMIT);

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        plan: "guest",
        limit: 2,
        used: 2,
        remaining: 0
      });
    await expect(manager.consume(identity))
      .rejects.toBeInstanceOf(
        AIRecommendationQuotaExceededError
      );
  });

  it("allows four signed-in Free successes and blocks the fifth", async () => {
    const { manager } = setup();
    const identity = { uid: "free-user" };

    await consume(manager, identity, FREE_AI_DAILY_LIMIT);

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        plan: "free",
        limit: 4,
        used: 4,
        remaining: 0
      });
    await expect(manager.consume(identity))
      .rejects.toMatchObject({
        code: "ai_daily_quota_exceeded"
      });
  });

  it.each(["manual", "paddle"])(
    "allows ten %s Premium successes and blocks the eleventh",
    async source => {
      const { firestore, manager } = setup();
      const uid = `${source}-premium-user`;
      const identity = { uid };
      firestore.seed(entitlementPath(uid), {
        plan: "premium",
        source,
        validUntil: null
      });

      await consume(
        manager,
        identity,
        PREMIUM_AI_DAILY_LIMIT
      );

      await expect(manager.getAccess(identity))
        .resolves.toMatchObject({
          plan: "premium",
          limit: 10,
          used: 10,
          remaining: 0
        });
      await expect(manager.consume(identity))
        .rejects.toBeInstanceOf(
          AIRecommendationQuotaExceededError
        );
    }
  );

  it("treats expired Premium as signed-in Free", async () => {
    const { firestore, manager } = setup();
    firestore.seed(entitlementPath("expired-user"), {
      plan: "premium",
      source: "paddle",
      validUntil: new Date(DAY_ONE - 1)
    });

    await expect(manager.getAccess({
      uid: "expired-user"
    })).resolves.toMatchObject({
      plan: "free",
      limit: 4,
      used: 0,
      remaining: 4
    });
  });

  it("resets usage at the next UTC day boundary", async () => {
    const { manager, setNow } = setup();
    const identity = { uid: "utc-user" };
    await manager.consume(identity);

    setNow(Date.parse("2026-10-09T00:00:00.000Z"));

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        dayKey: "2026-10-09",
        timezone: "UTC",
        used: 0,
        remaining: 4
      });
  });

  it("serializes concurrent guest requests without exceeding the daily limit", async () => {
    const { manager } = setup();
    const identity = { ip: "198.51.100.20" };

    const results = await Promise.allSettled([
      manager.consume(identity),
      manager.consume(identity),
      manager.consume(identity)
    ]);

    expect(results.filter(
      result => result.status === "fulfilled"
    )).toHaveLength(2);
    expect(results.filter(
      result => result.status === "rejected"
    )).toHaveLength(1);
  });

  it("stores only a hash of the guest IP in the usage document path", async () => {
    const { firestore, manager } = setup();
    const guestIp = "192.0.2.44";

    await manager.consume({ ip: guestIp });

    const [[path, data]] = [...firestore.documents];
    expect(path).toContain(
      `${AI_DAILY_USAGE_COLLECTION}/2026-10-08_`
    );
    expect(path).not.toContain(guestIp);
    expect(JSON.stringify(data)).not.toContain(guestIp);
  });

  it.each([
    ["guest", { ip: "203.0.113.80" }],
    ["free", { uid: "free-deep-user" }]
  ])(
    "rejects Deep access for %s without reserving capacity",
    async (plan, identity) => {
      const { manager } = setup();

      await expect(manager.reserve(
        identity,
        { mode: "deep" }
      )).rejects.toBeInstanceOf(
        AIRecommendationDeepAccessError
      );
      await expect(manager.getAccess(identity))
        .resolves.toMatchObject({
          plan,
          used: 0,
          reserved: 0,
          deep: {
            limit: 0,
            used: 0,
            reserved: 0,
            remaining: 0,
            available: false
          }
        });
    }
  );

  it("counts one Premium Deep success within the ten-request total", async () => {
    const { firestore, manager } = setup();
    const identity = { uid: "premium-deep-user" };
    firestore.seed(entitlementPath(identity.uid), {
      plan: "premium",
      source: "paddle",
      validUntil: null
    });

    await manager.consume(identity, "deep");

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        limit: PREMIUM_AI_DAILY_LIMIT,
        used: 1,
        remaining: 9,
        plan: "premium",
        deep: {
          limit: PREMIUM_DEEP_AI_DAILY_LIMIT,
          used: 1,
          remaining: 0,
          available: false
        }
      });
    await expect(manager.consume(identity, "deep"))
      .rejects.toBeInstanceOf(
        AIRecommendationDeepQuotaExceededError
      );

    await expect(manager.consume(identity, "standard"))
      .resolves.toMatchObject({
        used: 2,
        remaining: 8,
        deep: { used: 1, remaining: 0 }
      });
  });

  it("resets Premium Deep availability at midnight UTC", async () => {
    const { firestore, manager, setNow } = setup();
    const identity = { uid: "premium-midnight-user" };
    firestore.seed(entitlementPath(identity.uid), {
      plan: "premium",
      source: "manual",
      validUntil: null
    });
    await manager.consume(identity, "deep");

    setNow(Date.parse("2026-10-09T00:00:00.000Z"));

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        dayKey: "2026-10-09",
        used: 0,
        remaining: 10,
        deep: {
          used: 0,
          remaining: 1,
          available: true
        }
      });
  });

  it("serializes concurrent Premium Deep reservations", async () => {
    const { firestore, manager } = setup();
    const identity = { uid: "premium-concurrent-user" };
    firestore.seed(entitlementPath(identity.uid), {
      plan: "premium",
      source: "paddle",
      validUntil: null
    });

    const results = await Promise.allSettled([
      manager.reserve(identity, { mode: "deep" }),
      manager.reserve(identity, { mode: "deep" })
    ]);

    expect(results.filter(
      result => result.status === "fulfilled"
    )).toHaveLength(1);
    expect(results.filter(
      result => result.status === "rejected"
      && result.reason instanceof
        AIRecommendationDeepQuotaExceededError
    )).toHaveLength(1);
  });

  it("releases a failed request for a clean retry and finalizes idempotently", async () => {
    const { firestore, manager } = setup();
    const identity = { uid: "premium-retry-user" };
    firestore.seed(entitlementPath(identity.uid), {
      plan: "premium",
      source: "paddle",
      validUntil: null
    });

    const failedReservation = await manager.reserve(
      identity,
      { mode: "deep" }
    );
    await manager.release(identity, failedReservation);
    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        used: 0,
        reserved: 0,
        deep: {
          used: 0,
          reserved: 0,
          available: true
        }
      });

    const retryReservation = await manager.reserve(
      identity,
      { mode: "deep" }
    );
    await manager.finalize(identity, retryReservation);
    await manager.finalize(identity, retryReservation);

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        used: 1,
        reserved: 0,
        deep: {
          used: 1,
          reserved: 0
        }
      });
  });

  it("expires abandoned reservations without charging a success", async () => {
    const start = Date.parse(
      "2026-10-08T12:00:00.000Z"
    );
    const { firestore, manager, setNow } = setup(start);
    const identity = { uid: "premium-expiry-user" };
    firestore.seed(entitlementPath(identity.uid), {
      plan: "premium",
      source: "manual",
      validUntil: null
    });

    await manager.reserve(identity, { mode: "deep" });
    setNow(
      start
      + AI_RECOMMENDATION_RESERVATION_TTL_MS
      + 1
    );

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        used: 0,
        reserved: 0,
        deep: {
          used: 0,
          reserved: 0,
          available: true
        }
      });
  });
});
