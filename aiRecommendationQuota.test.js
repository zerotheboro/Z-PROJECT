import {
  describe,
  expect,
  it
} from "vitest";

import {
  AIRecommendationQuotaExceededError,
  AI_DAILY_USAGE_COLLECTION,
  createFirebaseAIRecommendationQuotaManager,
  FREE_AI_DAILY_LIMIT,
  GUEST_AI_DAILY_LIMIT,
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
  const manager =
    createFirebaseAIRecommendationQuotaManager({
      now: () => currentTime,
      getFirestore: () => firestore
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

  it("allows seven signed-in Free successes and blocks the eighth", async () => {
    const { manager } = setup();
    const identity = { uid: "free-user" };

    await consume(manager, identity, FREE_AI_DAILY_LIMIT);

    await expect(manager.getAccess(identity))
      .resolves.toMatchObject({
        plan: "free",
        limit: 7,
        used: 7,
        remaining: 0
      });
    await expect(manager.consume(identity))
      .rejects.toMatchObject({
        code: "ai_daily_quota_exceeded"
      });
  });

  it.each(["manual", "paddle"])(
    "allows sixteen %s Premium successes and blocks the seventeenth",
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
          limit: 16,
          used: 16,
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
      limit: 7,
      used: 0,
      remaining: 7
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
        remaining: 7
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
});
