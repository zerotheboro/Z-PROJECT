import assert from "node:assert/strict";
import { test, before, beforeEach, after, afterEach } from "node:test";
import { build } from "esbuild";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEmulatorTrainingCompletionService, createCompletionEmulatorFirestore } from "../dist-backend/backend/trainingCompletion.js";
import { createRecommendationApp } from "../server.js";
import { completionFixture } from "./completionFixtures.mjs";

const PROJECT = "demo-edulience-phase2a";
assert.equal(process.versions.node.split(".")[0], "24");
assert.equal(process.env.FIREBASE_PROJECT_ID, PROJECT);
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
for (const key of ["GITHUB_PAT_TOKEN", "GITHUB_TOKEN", "DEBUG", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON"]) assert.equal(Object.hasOwn(process.env, key), false);
const root = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({ stdin: { contents: 'export * from "./src/services/trainingCompletion.ts"; export * from "./src/services/trainingCompletionOutbox.ts"; export * from "./src/quiz/trainingStreak.ts"; export { recordTrainingCompletion } from "./src/services/trainingStreak.ts"; export { setStreakDatabase } from "phase2b:db";', resolveDir: root },
  bundle: true, platform: "node", target: "node24", format: "esm", write: false,
  plugins: [{ name: "inject-only-emulator-web-sdk", setup(builder) {
    builder.onResolve({ filter: /^(\.\.\/firebase|phase2b:db)$/ }, () => ({ path: "db", namespace: "phase2b" }));
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "sdk", namespace: "phase2b" }));
    builder.onLoad({ filter: /.*/, namespace: "phase2b" }, ({ path: name }) => ({ loader: "js", contents: name === "db"
      ? "export let db; export const setStreakDatabase = value => { db = value; };"
      : ["doc", "collection", "getDoc", "getDocFromServer", "getDocsFromServer", "runTransaction", "serverTimestamp", "snapshotEqual"].map(key => `export const ${key} = (...args) => globalThis.__phase2bWebFirestore.${key}(...args);`).join("\n") }));
  } }] });
const frontURL = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const front = await import(frontURL);
const requireTools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment } = requireTools("@firebase/rules-unit-testing");
const web = requireTools("firebase/firestore"); web.setLogLevel("silent");
globalThis.__phase2bWebFirestore = web;
globalThis.IDBKeyRange = IDBKeyRange;
let rules, provider, db, admin, server, completion, uid, token, browser, owner, outbox, activityCalls, draftClears;
const user = () => db.collection("users").doc(uid);
const copies = [];
before(async () => {
  provider = createCompletionEmulatorFirestore(); db = provider.getFirestore();
  admin = initializeApp({ projectId: PROJECT }, "phase2b-auth-emulator-only");
  rules = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: "127.0.0.1", port: 18787,
    rules: readFileSync(new URL("../test-support/firestore/owner-supplied.rules", import.meta.url), "utf8") } });
  completion = createEmulatorTrainingCompletionService();
  server = createRecommendationApp({ trainingCompletionEnabled: true, trainingCompletionService: completion,
    verifyFirebaseToken: value => getAuth(admin).verifyIdToken(value, true),
    openAIClient: { responses: { create() { throw new Error("No paid AI calls"); } } }, billingConfig: { available: false, missing: [] },
    logger: { info() {}, warn() {}, error() {} } }).listen(0, "127.0.0.1");
  await once(server, "listening");
});
beforeEach(async () => {
  await rules.clearFirestore();
  const response = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-local-only`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true,
      email: `phase2b-${crypto.randomUUID()}@example.test`, password: "synthetic-emulator-password" }) });
  assert.equal(response.status, 200); const account = await response.json(); uid = account.localId; token = account.idToken; owner = uid;
  browser = rules.authenticatedContext(uid).firestore(); activityCalls = 0; draftClears = 0;
  front.setStreakDatabase(browser);
  outbox = front.createCompletionOutbox(PROJECT, new IDBFactory()); copies.push(outbox);
  await user().set({ displayName: "Synthetic local Phase 2B student", learningProfile: null });
});
afterEach(async () => { await getAuth(admin).deleteUser(uid); });
after(async () => {
  await Promise.all(copies.map(item => item.close())); await new Promise(resolve => server.close(resolve));
  await completion.close(); await rules.cleanup(); await provider.close(); await deleteApp(admin);
});
function draft(input) {
  return { schemaVersion: 1, owner: { kind: "user", uid }, sessionId: input.sessionId, mode: input.mode,
    selectedMethods: input.selectedMethods, labContentSetIds: input.selectedMethods.map(id => `${id}-lab`),
    verificationMethodOrder: input.methodMatch.methods.map(item => item.method), matchContentSetIds: input.methodMatch.methods.map(item => `${item.method}-match`),
    completed: { methodIntroduction: input.methodIntroduction, methodLab: input.methodLab, methodMatch: input.methodMatch,
      reflection: input.reflection, baseline: input.baseline ?? null, learningSituation: input.learningSituation ?? null, learningProfile: null } };
}
async function seed(input) {
  if (input.mode === "manual") await user().set({ learningProfile: { legacy: true } }, { merge: true });
  await user().collection("trainingReservations").doc(input.sessionId).set({ sessionId: input.sessionId, mode: input.mode,
    methodIds: input.mode === "auto" ? [] : input.selectedMethods, dayKey: "2026-10-19" });
  await user().collection("trainingUsage").doc("2026-10-19").set({ testMeStarted: 1, manualMethodsStarted: 3 });
  await user().collection("trainingProgress").doc("active").set({ sessionId: input.sessionId });
}
function client({ box = outbox, loseResponse = false, delay = null } = {}) {
  let lost = false; const sent = [];
  const service = front.createTrainingCompletionClient({ outbox: box, timeZone: () => "UTC",
    assertOwner: expected => { if (owner !== expected) throw new Error("Authenticated identity changed"); },
    hasReservation: async value => (await user().collection("trainingReservations").doc(value.sessionId).get()).exists,
    transport: async (_uid, body) => {
      sent.push(body); if (delay) await delay;
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/training/complete`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body });
      const result = await response.json(); if (!response.ok) throw Object.assign(new Error("Local completion rejected"), result);
      if (loseResponse && !lost) { lost = true; throw new Error("Lost success response"); } return result;
    },
    recordActivity: async (entry, payload) => {
      activityCalls++;
      await front.recordTrainingCompletion({ owner: { kind: "user", uid: entry.uid }, sessionId: entry.sessionId,
        mode: payload.mode, methodIds: payload.selectedMethods }, { now: new Date(entry.frozenAt), timeZone: entry.timeZone });
    },
    clearDraft: async (_uid, sessionId) => {
      draftClears++; const ref = web.doc(browser, "users", uid, "trainingProgress", "active");
      await web.runTransaction(browser, async tx => { const value = await tx.get(ref); if (value.exists() && value.data().sessionId === sessionId) tx.delete(ref); });
    }
  });
  return { service, sent };
}
for (const [mode, count] of [["auto", 3], ["auto", 4], ["manual", 1], ["manual", 2], ["manual", 3]]) {
  test(`Phase 2B browser outbox -> verified Emulator Auth -> HTTP -> cumulative transaction: ${mode}/${count}`, async () => {
    const input = completionFixture({ mode, count }); await seed(input); const c = client();
    await c.service.prepare(draft(input), new Date().toISOString()); await c.service.resume(uid, input.sessionId);
    assert.equal((await user().collection("learningEvidence").get()).size, 1);
    assert.equal((await user().collection("assessments").get()).size, mode === "auto" ? 1 : 0);
    const profile = (await user().collection("learningProfiles").doc("cumulative").get()).data();
    assert.equal(profile.profile.methods.length, count); assert.equal(profile.profile.observationCount, count + Math.min(2, count));
    assert.equal((await user().collection("trainingProgress").doc("active").get()).exists, false);
    assert.equal((await user().collection("trainingActivity").get()).size, 1);
    assert.deepEqual((await user().collection("trainingUsage").doc("2026-10-19").get()).data(), { testMeStarted: 1, manualMethodsStarted: 3 });
    if (mode === "manual") assert.deepEqual((await user().get()).data().learningProfile, { legacy: true });
    assert.equal(activityCalls, 1); assert.equal(draftClears, 1);
  });
}
test("Phase 2B lost success response and refreshed client recover original receipt with unchanged quota", async () => {
  const input = completionFixture(); await seed(input); const c = client({ loseResponse: true });
  await c.service.prepare(draft(input)); await assert.rejects(c.service.resume(uid, input.sessionId), /Lost success/);
  assert.equal((await user().collection("trainingProgress").doc("active").get()).exists, true);
  assert.equal(activityCalls, 0);
  const next = client(); const receipt = await next.service.resume(uid, input.sessionId);
  assert.equal(c.sent[0], next.sent[0]); assert.equal(receipt.profileRevision, 1);
  assert.equal((await user().collection("learningEvidence").get()).size, 1);
  assert.equal((await user().collection("trainingActivity").get()).size, 1);
  assert.deepEqual((await user().collection("trainingUsage").doc("2026-10-19").get()).data(), { testMeStarted: 1, manualMethodsStarted: 3 });
});
test("Phase 2B concurrent tabs do not submit different payloads or duplicate completion/activity", async () => {
  const input = completionFixture(); await seed(input); let release;
  const pause = new Promise(resolve => { release = resolve; }); const a = client({ delay: pause }), b = client();
  await a.service.prepare(draft(input)); const first = a.service.resume(uid, input.sessionId);
  while (!a.sent.length) await new Promise(resolve => setTimeout(resolve, 5));
  await assert.rejects(b.service.resume(uid, input.sessionId), error => error.code === "completion_busy");
  release(); await first;
  assert.equal(b.sent.length, 0); assert.equal((await user().collection("learningEvidence").get()).size, 1); assert.equal(activityCalls, 1);
});
test("Phase 2B previous-day pending activity retries remain pinned to its first day", async () => {
  const input = completionFixture({ mode: "manual", count: 1 }); await seed(input);
  const payload = front.completionFromDraft(draft(input)); await outbox.freeze(uid, payload, "UTC", "2026-10-19T23:59:00Z");
  await client().service.resume(uid, input.sessionId);
  const days = (await user().collection("trainingActivity").get()).docs.map(doc => doc.id);
  assert.deepEqual(days, ["2026-10-19"]);
});
test("Phase 2B grandfathered draft is checkpointed without a completion write or retroactive reservation", async () => {
  const input = completionFixture(); const c = client();
  assert.ok(await c.service.prepare(draft(input)));
  await assert.rejects(c.service.resume(uid, input.sessionId), error => error.code === "legacy_completion_required");
  assert.equal(c.sent.length, 0);
  assert.equal((await user().collection("trainingReservations").get()).size, 0); assert.equal((await user().collection("learningEvidence").get()).size, 0);
});

test("acknowledged Manual Introduction and Reflection survive deletion of all browser completion storage", async () => {
  const input = completionFixture({ mode: "manual", count: 3 });
  input.reflection.reflectionText = "Synthetic manual reflection: preserve this exact text.";
  input.reflection.surprisedByResults = true;
  await seed(input); const c = client(); await c.service.prepare(draft(input));
  const receipt = await c.service.resume(uid, input.sessionId);
  await outbox.close();
  // A completely empty IndexedDB factory models browser storage deletion.
  outbox = front.createCompletionOutbox(PROJECT, new IDBFactory()); copies.push(outbox);
  assert.deepEqual(await outbox.list(uid), []);
  const saved = (await user().collection("learningEvidence").doc(receipt.evidenceId).get()).data();
  assert.deepEqual(saved.completionDetails, { schemaVersion: 1, methodIntroduction: input.methodIntroduction, reflection: input.reflection });
  assert.equal(saved.evidence.observations.length, 5);
  assert.ok(saved.evidence.observations.every(item => item.performance.score === 0.75 || item.performance.score === 0.5));
  const retry = await completion.complete(uid, JSON.parse(c.sent[0]));
  assert.deepEqual(retry, receipt);
  const changed = JSON.parse(c.sent[0]); changed.reflection.reflectionText += " conflicting retry";
  await assert.rejects(completion.complete(uid, changed), error => error.code === "completion_conflict");
  assert.deepEqual((await user().collection("learningEvidence").doc(receipt.evidenceId).get()).data().completionDetails, saved.completionDetails);
  assert.deepEqual((await user().get()).data().learningProfile, { legacy: true });
  assert.equal((await user().collection("assessments").get()).size, 0);
});

test("late Oct 19 activity reconstructs the Oct 20/21 streak and duplicate sessions do not count again", async () => {
  for (const day of ["2026-10-20", "2026-10-21", "2026-10-19", "2026-10-19"]) {
    await front.recordTrainingCompletion({ owner: { kind: "user", uid }, sessionId: `history-${day}`, mode: "manual", methodIds: ["feynman"] },
      { now: new Date(`${day}T12:00:00Z`), timeZone: "UTC" });
  }
  const stats = (await user().collection("trainingStats").doc("streak").get()).data();
  assert.equal(stats.currentStreak, 3); assert.equal(stats.longestStreak, 3);
  assert.equal(stats.totalActiveDays, 3); assert.equal(stats.lastCompletedDay, "2026-10-21");
  assert.equal((await user().collection("trainingActivity").get()).size, 3);
});

test("simultaneous activity from separate device clients reconstructs all days without lost updates", async () => {
  const other = await import(`${frontURL}#second-device`);
  other.setStreakDatabase(rules.authenticatedContext(uid).firestore());
  const input = day => [{ owner: { kind: "user", uid }, sessionId: `device-${day}`, mode: "auto", methodIds: ["feynman"] },
    { now: new Date(`${day}T12:00:00Z`), timeZone: "UTC" }];
  await Promise.all([front.recordTrainingCompletion(...input("2026-10-21")), other.recordTrainingCompletion(...input("2026-10-19"))]);
  await other.recordTrainingCompletion(...input("2026-10-20"));
  const stats = (await user().collection("trainingStats").doc("streak").get()).data();
  assert.equal(stats.currentStreak, 3); assert.equal(stats.lastCompletedDay, "2026-10-21"); assert.equal(stats.totalActiveDays, 3);
  assert.equal((await user().collection("trainingReservations").get()).size, 0);
  assert.equal((await user().collection("trainingUsage").get()).size, 0);
});
test("Phase 2B local launcher verifies Emulator bearer tokens without credentials or paid services", async () => {
  const preload = path.join(root, "test-support/no-dotenv.cjs");
  const child = spawn(process.execPath, ["--require", preload, path.join(root, "scripts/start-local-training.mjs")], {
    cwd: root, env: { ...process.env, NODE_OPTIONS: `--require "${preload.replaceAll("\\", "/")}"` }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Local-only launcher did not become ready")), 15000);
      child.stdout.on("data", chunk => { if (chunk.toString().includes("Isolated demo Training backend")) { clearTimeout(timeout); resolve(); } });
      child.once("exit", () => { clearTimeout(timeout); reject(new Error("Local-only launcher exited before readiness")); });
    });
    const access = await fetch("http://127.0.0.1:3001/api/training/access?timezone=UTC", { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(access.status, 200);
    const input = completionFixture({ mode: "manual", count: 1 }); await seed(input);
    const response = await fetch("http://127.0.0.1:3001/api/training/complete", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(front.completionFromDraft(draft(input))) });
    assert.equal(response.status, 200); assert.equal((await user().collection("learningEvidence").get()).size, 1);
    assert.equal((await fetch("http://127.0.0.1:3001/api/training/complete", { method: "POST" })).status, 401);
  } finally {
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  }
});
