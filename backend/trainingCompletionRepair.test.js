import { afterEach, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import { Firestore, GeoPoint, Timestamp, getFirestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { createRecommendationApp } from "../server.js";
import { completionFixture } from "./completionFixtures.mjs";
import { assertCompletionEmulatorClient, completionEmulatorConfig, createCompletionEmulatorFirestore,
  fingerprintFirestoreSource, completionDocumentBytes, completionHistoryJSONBytes } from "../dist-backend/backend/trainingCompletion.js";

const cleanup = [];
const configure = (host = "127.0.0.1:18787") => {
  vi.stubEnv("FIREBASE_PROJECT_ID", "demo-completion-repair");
  vi.stubEnv("FIRESTORE_EMULATOR_HOST", host);
};
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(cleanup.splice(0).map(close => close())); vi.unstubAllEnvs(); });

describe("dedicated completion transport isolation", () => {
  it.each(["127.0.0.1:18787", "localhost:18787"])("initializes and verifies an isolated %s transport without RPCs", host => {
    configure(host); const provider = createCompletionEmulatorFirestore(); cleanup.push(provider.close);
    const db = provider.getFirestore();
    expect(db.projectId).toBe("demo-completion-repair");
    expect(() => assertCompletionEmulatorClient(db, completionEmulatorConfig())).not.toThrow();
    expect(() => db.settings({ host: "nonlocal.invalid:443" })).toThrow();
  });
  it.each([
    ["production-fixture", "127.0.0.1:18787"], ["demo-", "127.0.0.1:18787"],
    ["demo-valid", "nonlocal.invalid:443"], ["demo-valid", "http://127.0.0.1:18787"],
    ["demo-valid", "127.0.0.1:0"], ["demo-valid", "127.0.0.1:65536"], ["demo-valid", ""]
  ])("rejects invalid declared project/transport (%s, %s) before creating references", (projectId, host) => {
    expect(() => completionEmulatorConfig({ FIREBASE_PROJECT_ID: projectId, FIRESTORE_EMULATOR_HOST: host })).toThrow("completion_emulator_only");
  });
  it.each(["project", "host", "missing"])("fails closed if the %s declaration changes after initialization", kind => {
    configure(); const provider = createCompletionEmulatorFirestore(); cleanup.push(provider.close);
    if (kind === "project") vi.stubEnv("FIREBASE_PROJECT_ID", "demo-other");
    else vi.stubEnv("FIRESTORE_EMULATOR_HOST", kind === "missing" ? "" : "127.0.0.1:18786");
    expect(() => provider.getFirestore()).toThrow(/completion_emulator_/);
  });
  it.each([["projectId", "demo-other"], ["servicePath", "nonlocal.invalid"], ["port", 18786], ["ssl", true],
    ["apiEndpoint", "nonlocal.invalid"]])("checks initialized transport %s before returning a client", (key, value) => {
    configure(); const provider = createCompletionEmulatorFirestore(); cleanup.push(provider.close);
    const db = provider.getFirestore(); db._settings[key] = value;
    expect(() => provider.getFirestore()).toThrow("completion_emulator_client_mismatch");
  });
  it("rejects a real incompatible cached client and the default route never reuses it (original reproduction)", async () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
    const app = initializeApp({ projectId: "demo-cached-incompatible" }, "edulience-backend");
    const cached = getFirestore(app); cached.settings({ host: "nonlocal.invalid:443", ssl: true });
    cleanup.push(async () => { await cached.terminate(); await deleteApp(app); });
    configure();
    expect(() => assertCompletionEmulatorClient(cached, completionEmulatorConfig())).toThrow("completion_emulator_client_mismatch");
    const unsafe = vi.spyOn(cached, "collection").mockImplementation(() => { throw new Error("Unsafe cached client reached"); });
    const safe = vi.spyOn(Firestore.prototype, "collection").mockImplementation(function () {
      assertCompletionEmulatorClient(this, completionEmulatorConfig());
      throw new Error("Safe offline interception before any Firestore I/O");
    });
    const server = createRecommendationApp({ trainingCompletionEnabled: true,
      openAIClient: { responses: { create() { throw new Error("No AI calls"); } } },
      verifyFirebaseToken: async () => ({ uid: "synthetic-repair-student" }),
      billingConfig: { available: false, missing: [] }, logger: { info() {}, warn() {}, error() {} }
    }).listen(0, "127.0.0.1");
    cleanup.push(() => new Promise(resolve => server.close(resolve))); await once(server, "listening");
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/training/complete`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic" }, body: JSON.stringify(completionFixture()) });
    expect(response.status).toBe(503); expect(safe).toHaveBeenCalledOnce(); expect(unsafe).not.toHaveBeenCalled();
  });
});

describe("v2 type-tagged Firestore fingerprints", () => {
  const stamp = Timestamp.fromDate(new Date("2026-10-19T09:00:00Z"));
  it("distinguishes timestamps from both crafted map and crafted array encodings", () => {
    const maps = [{ timestampSeconds: stamp.seconds, timestampNanos: stamp.nanoseconds },
      { seconds: stamp.seconds, nanoseconds: stamp.nanoseconds }, ["timestamp", stamp.seconds, stamp.nanoseconds]];
    for (const value of maps) expect(fingerprintFirestoreSource({ deep: [stamp] })).not.toBe(fingerprintFirestoreSource({ deep: [value] }));
  });
  it("preserves map-order invariance, legitimate Date transport, nanoseconds and scalar identity", () => {
    expect(fingerprintFirestoreSource({ a: 1, b: stamp })).toBe(fingerprintFirestoreSource({ b: stamp.toDate(), a: 1 }));
    expect(fingerprintFirestoreSource(stamp)).not.toBe(fingerprintFirestoreSource(new Timestamp(stamp.seconds, 1)));
    const identities = [null, "null", false, 0, -0, "0", [], {}, [null]].map(fingerprintFirestoreSource);
    expect(new Set(identities).size).toBe(identities.length); expect(identities.every(item => item.startsWith("v2:"))).toBe(true);
  });
  it("tags accepted byte, reference and geographic values without accepting lookalike maps", () => {
    configure(); const provider = createCompletionEmulatorFirestore(); cleanup.push(provider.close);
    const ref = provider.getFirestore().doc("users/synthetic");
    for (const [value, fake] of [[Buffer.from([0, 255]), { bytes: "AP8=" }], [new GeoPoint(10, 20), { latitude: 10, longitude: 20 }],
      [ref, { referenceProject: "demo-completion-repair", referenceDatabase: "(default)", referencePath: ref.path }]]) {
      expect(fingerprintFirestoreSource(value)).not.toBe(fingerprintFirestoreSource(fake));
    }
    expect(fingerprintFirestoreSource(Buffer.from([0, 255]))).toBe(fingerprintFirestoreSource(new Uint8Array([0, 255])));
  });
  it("rejects unsupported values and pathological depth without serializing an error payload", () => {
    for (const value of [undefined, Number.NaN, Infinity, new Set([1]), () => 1]) expect(() => fingerprintFirestoreSource(value)).toThrow();
    let deep = null; for (let i = 0; i < 26; i++) deep = { deep };
    expect(() => fingerprintFirestoreSource(deep)).toThrow("completion_history_invalid");
  });
});

describe("actual persisted storage budgets", () => {
  it("returns an explicit capacity error without exposing completed work", async () => {
    configure();
    const server = createRecommendationApp({ trainingCompletionEnabled: true,
      trainingCompletionService: { complete: async () => { throw Object.assign(new Error("Private result"), { status: 409, code: "completion_capacity_exceeded" }); } },
      openAIClient: { responses: { create() { throw new Error("No AI calls"); } } }, verifyFirebaseToken: async () => ({ uid: "synthetic-capacity-student" }),
      billingConfig: { available: false, missing: [] }, logger: { info() {}, warn() {}, error() {} }
    }).listen(0, "127.0.0.1"); cleanup.push(() => new Promise(resolve => server.close(resolve))); await once(server, "listening");
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/training/complete`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic" }, body: JSON.stringify(completionFixture()) });
    const body = await response.json(); expect(response.status).toBe(409); expect(body.code).toBe("completion_capacity_exceeded");
    expect(body.error).toContain("no changes were saved"); expect(JSON.stringify(body)).not.toContain("Private result");
  });
  it("matches the documented 147-byte Firestore document example", () => {
    expect(completionDocumentBytes("users/jeff/tasks/my_task_id", { type: "Personal", done: false, priority: 1, description: "Learn Cloud Firestore" })).toBe(147);
  });
  it("accounts for escaped JSON/UTF-8 separately from stored field sizes", () => {
    const value = { text: "😀\u0000\"\\" };
    expect(completionHistoryJSONBytes(value)).toBe(Buffer.byteLength(JSON.stringify(value)));
    expect(completionHistoryJSONBytes({ t: new Date(0) })).toBe(completionHistoryJSONBytes({ t: Timestamp.fromMillis(0) }));
  });
  it("rejects a numeric array whose JSON fits but Firestore field size exceeds the limit", () => {
    const value = { numbers: Array(140000).fill(0) };
    expect(Buffer.byteLength(JSON.stringify(value))).toBeLessThan(1024 * 1024);
    expect(() => completionDocumentBytes("users/synthetic", value)).toThrow("completion_document_limit");
  });
});
