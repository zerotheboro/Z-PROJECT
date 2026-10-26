import { describe, expect, it, vi, afterEach } from "vitest";
import { once } from "node:events";
import { completionFixture, COMPLETION_TEST_UID as UID } from "./completionFixtures.mjs";
import { validateCompletion, rebuildSourceIndex } from "../dist-backend/backend/trainingCompletion.js";
import { createRecommendationApp } from "../server.js";
import { FirebaseAdminConfigurationError } from "../firebaseAdmin.js";

const NOW = "2026-10-20T10:00:00.000Z";
const validate = input => validateCompletion(UID, input, NOW);
const servers = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve)))); });
async function http(options = {}) {
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), log: vi.fn() };
  const service = { complete: vi.fn().mockResolvedValue({ schemaVersion: 1, status: "completed" }) };
  const app = createRecommendationApp({ openAIClient: { responses: { create: vi.fn(() => { throw new Error("No paid calls"); }) } },
    billingConfig: { available: false, missing: [] }, logger, trainingCompletionService: service,
    verifyFirebaseToken: vi.fn(async () => ({ uid: UID })), ...options });
  const server = app.listen(0, "127.0.0.1"); servers.push(server); await once(server, "listening");
  return { logger, service, post: (payload, token = "Bearer safe-test-token") => fetch(`http://127.0.0.1:${server.address().port}/api/training/complete`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: token } : {}) }, body: JSON.stringify(payload)
  }) };
}
function emulatorFlag() { vi.stubEnv("FIREBASE_PROJECT_ID", "demo-phase2a-http"); vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:18787"); }

describe("Phase 2A completion wire contract", () => {
  it.each([3, 4])("accepts %i-method automatic evidence and ignores AI in performance", count => {
    const value = validate(completionFixture({ count }));
    expect(value.evidence.observations).toHaveLength(count + 2);
    expect(value.evidence.observations.find(x => x.phase === "lab").performance.score).toBe(0.75);
    expect(value.legacy.learningProfile.methodEvidence).toHaveLength(count);
  });
  it.each([1, 2, 3])("accepts manual %i-method completion without a legacy profile", count => {
    expect(validate(completionFixture({ mode: "manual", count })).legacy).toBeNull();
  });
  it.each(["uid", "owner", "userId", "path", "documentPath", "receipt", "cumulativeProfile", "completionDetails", "quota", "plan"])("rejects forged %s", key => {
    expect(() => validate({ ...completionFixture(), [key]: "forged" })).toThrow();
  });
  it("canonicalizes object property order and explicit time offsets without freezing caller objects", () => {
    const original = completionFixture();
    const reversed = JSON.parse(JSON.stringify(original, null, 2));
    reversed.completedAt = "2026-10-19T12:00:00+02:00";
    const ordered = Object.fromEntries(Object.entries(reversed).reverse());
    expect(validate(original).requestHash).toBe(validate(ordered).requestHash);
    expect(Object.isFrozen(original.metadata[0].context)).toBe(false);
    original.reflection.reflectionText = "Still caller owned";
  });
  it("hash is owner- and session-scoped; server recording time is excluded", () => {
    const input = completionFixture();
    expect(validate(input).requestHash).not.toBe(validateCompletion("another-user", input, NOW).requestHash);
    expect(validate(input).requestHash).toBe(validateCompletion(UID, input, "2026-10-21T10:00:00Z").requestHash);
  });
  it.each([
    input => { input.schemaVersion = 2; },
    input => { input.methodLab.experiments[0].score = 1; },
    input => { input.methodLab.experiments[0].correct = 10; },
    input => { input.methodMatch.methods[0].firstScore = 0; },
    input => { input.methodMatch.methods[0].method = "feynman"; },
    input => { input.completedAt = "2026-10-19T10:00:00"; },
    input => { input.metadata[0].completedAt = "2026-10-19T11:00:00Z"; },
    input => { input.metadata[0].protocol.questions[0].offeredOptionCount = 2; },
    input => { input.metadata[0].protocol.questions[0].offeredOptionIds = "abc"; },
    input => { input.metadata.at(-1).matchCounts.score = 1; },
    input => { input.reflection.preferredMethod = "stopwatch"; },
    input => { input.selectedMethods[0] = "unknown"; },
    input => { delete input.selectionContext; }
  ])("rejects invalid scores/counts/timing/conditions/result combinations", mutate => {
    const input = completionFixture(); mutate(input); expect(() => validate(input)).toThrow();
  });
  it("rejects oversized UTF-8/escaped payloads and unknown nested ownership", () => {
    const input = completionFixture(); input.reflection.reflectionText = "😀\u0000".repeat(15000);
    expect(() => validate(input)).toThrow();
    const nested = completionFixture(); nested.metadata[0].context.uid = "forged";
    expect(() => validate(nested)).toThrow();
  });
  it("does not manufacture missing provenance or timestamps", () => {
    const input = completionFixture(); delete input.metadata; delete input.completedAt;
    const value = validate(input);
    expect(value.evidence.completedAt).toBeNull();
    expect(value.evidence.observations.every(x => x.context.topic === null && x.protocol.questions === null)).toBe(true);
  });
  it("bounds deeply nested JSON before serialization", () => {
    const input = completionFixture(); let deep = {};
    for (let i = 0; i < 30; i++) deep = { nested: deep };
    input.metadata[0].context.topic = deep;
    expect(() => validate(input)).toThrow("completion_structure_limit");
  });
  it("rejects corrupt identity decisions instead of choosing an order", () => {
    expect(() => rebuildSourceIndex([{ id: "forged", data: { schemaVersion: 1 } }])).toThrow();
  });
});
describe("inactive authenticated completion route", () => {
  it("is disabled by default, even when the body requests activation", async () => {
    const test = await http(); const response = await test.post({ enabled: true });
    expect(response.status).toBe(404); expect(test.service.complete).not.toHaveBeenCalled();
  });
  it("cannot activate against production even with the explicit Phase 2A flag", async () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "edulience-920ba");
    const test = await http({ trainingCompletionEnabled: true });
    expect((await test.post(completionFixture())).status).toBe(503);
    expect(test.service.complete).not.toHaveBeenCalled();
  });
  it("requires auth and passes only verified UID to the service", async () => {
    emulatorFlag(); const test = await http({ trainingCompletionEnabled: true });
    expect((await test.post(completionFixture(), null)).status).toBe(401);
    expect((await test.post(completionFixture())).status).toBe(200);
    expect(test.service.complete.mock.calls[0][0]).toBe(UID);
  });
  it.each(["auth/id-token-expired", "auth/id-token-revoked", "auth/argument-error"])("rejects %s before persistence", async code => {
    emulatorFlag(); const test = await http({ trainingCompletionEnabled: true, verifyFirebaseToken: vi.fn().mockRejectedValue({ code }) });
    expect((await test.post(completionFixture())).status).toBe(401);
    expect(test.service.complete).not.toHaveBeenCalled();
  });
  it("fails closed for unavailable Admin and never logs raw completion contents", async () => {
    emulatorFlag(); const unavailable = await http({ trainingCompletionEnabled: true, verifyFirebaseToken: vi.fn().mockRejectedValue(new FirebaseAdminConfigurationError("test", "Unavailable")) });
    expect((await unavailable.post(completionFixture())).status).toBe(503);
    const test = await http({ trainingCompletionEnabled: true, trainingCompletionService: { complete: vi.fn().mockRejectedValue(new Error("Sensitive reflection must not be logged")) } });
    expect((await test.post(completionFixture())).status).toBe(503);
    expect(JSON.stringify(test.logger.warn.mock.calls)).not.toContain("Sensitive reflection");
  });
  it("bounds request size and limits repeated completion attempts without using quota manager", async () => {
    emulatorFlag(); const quota = { reserve: vi.fn(), getAccess: vi.fn() };
    const test = await http({ trainingCompletionEnabled: true, trainingQuotaManager: quota });
    expect((await test.post({ extra: "x".repeat(66000) })).status).toBe(413);
    for (let i = 0; i < 5; i++) await test.post(completionFixture());
    expect((await test.post(completionFixture())).status).toBe(429);
    expect(quota.reserve).not.toHaveBeenCalled();
  });
});
