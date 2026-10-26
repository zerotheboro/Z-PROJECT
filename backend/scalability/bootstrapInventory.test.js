import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { newInventoryMetrics, readBootstrapInventory } from "./bootstrapInventory";
import { BOOTSTRAP_LIMITS } from "./bootstrapContracts";

const uid = "inventory-budget-owner", at = { seconds: 1792886400, nanoseconds: 0 };
const pin = { uid, lifecycleEpoch: null, lifecycleRevision: null, lifecycleHead: null, lifecycleFence: null,
  writerProtocol: null, genesisHash: null, lifecycleState: null, journal: null, writerFenceHash: null,
  rootCreatedAt: null, scopeVersion: "all-user-descendants-stage4b1-v1", readTime: at };
function transport(exhaust = false) {
  let calls = 0;
  const db = { doc: path => ({ path }), runTransaction: async callback => callback({ getAll: async (...refs) =>
    refs.map(ref => ({ ref, exists: false, data: () => undefined, readTime: new Timestamp(at.seconds, at.nanoseconds) })) }) };
  return { getFirestore: () => db, count: () => calls,
    list: async (_kind, parent) => { calls++; return { rows: [], next: exhaust && parent === `users/${uid}` ? `next-${calls}` : null }; } };
}
describe("per-traversal inventory listing budget", () => {
  it("does not consume a new traversal's budget from cumulative telemetry", async () => {
    const metrics = newInventoryMetrics(), fake = transport(); metrics.listingCalls = BOOTSTRAP_LIMITS.listingCalls - 1;
    const first = await readBootstrapInventory(fake, pin, metrics), second = await readBootstrapInventory(fake, pin, metrics);
    expect(second).toEqual(first); expect(fake.count()).toBe(4);
    expect(metrics.listingCalls).toBe(BOOTSTRAP_LIMITS.listingCalls + 3);
  });
  it("gives concurrent traversals sharing telemetry independent resource budgets", async () => {
    const metrics = newInventoryMetrics(), fake = transport(); metrics.listingCalls = BOOTSTRAP_LIMITS.listingCalls;
    const results = await Promise.all([readBootstrapInventory(fake, pin, metrics), readBootstrapInventory(fake, pin, metrics)]);
    expect(results[0]).toEqual(results[1]); expect(metrics.listingCalls).toBe(BOOTSTRAP_LIMITS.listingCalls + 4);
  });
  it("still rejects actual exhaustion within one traversal before another listing RPC", async () => {
    // Offline transport: exercise the real 30,000-call loop without network or a large-history benchmark.
    const metrics = newInventoryMetrics(), fake = transport(true); metrics.listingCalls = 29990;
    await expect(readBootstrapInventory(fake, pin, metrics)).rejects.toThrow("bootstrap_listing_capacity");
    expect(fake.count()).toBe(BOOTSTRAP_LIMITS.listingCalls);
    expect(metrics.listingCalls).toBe(29990 + BOOTSTRAP_LIMITS.listingCalls + 1);
  });
});
