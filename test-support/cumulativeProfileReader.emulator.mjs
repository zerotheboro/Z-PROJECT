import assert from "node:assert/strict";
import { test, before, beforeEach, after, afterEach } from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, signOut } from "firebase/auth";
import * as web from "firebase/firestore";
import { createCompletionEmulatorFirestore, createTrainingCompletionService, validateCompletion } from "../dist-backend/backend/trainingCompletion.js";
import { completionFixture } from "../backend/completionFixtures.mjs";

const PROJECT = "demo-edulience-phase2a";
assert.equal(process.versions.node.split(".")[0], "24");
assert.equal(process.env.FIREBASE_PROJECT_ID, PROJECT);
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
for (const key of ["GITHUB_TOKEN", "GITHUB_PAT_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON"]) assert.equal(key in process.env, false);
const root = fileURLToPath(new URL("../", import.meta.url));
const tools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment } = tools("@firebase/rules-unit-testing");
const NOW = Date.parse("2026-10-22T12:00:00Z");
let rules, provider, db, app, auth, browser, uid, front;
const parent = () => db.collection("users").doc(uid);
before(async () => {
  provider = createCompletionEmulatorFirestore(); db = provider.getFirestore();
  rules = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: "127.0.0.1", port: 18787,
    rules: readFileSync(new URL("./firestore/owner-supplied.rules", import.meta.url), "utf8") } });
  const bundle = await build({ absWorkingDir: root, stdin: { contents: 'export * from "./src/services/localCumulativeProfile.ts";', resolveDir: root }, bundle: true,
    platform: "node", target: "node24", format: "esm", write: false,
    plugins: [{ name: "demo-profile-browser", setup(builder) {
      builder.onResolve({ filter: /^\.\.\/firebase$/ }, () => ({ path: "firebase", namespace: "demo-profile" }));
      builder.onResolve({ filter: /^\.\/localCumulativeProfileConfig$/ }, () => ({ path: "config", namespace: "demo-profile" }));
      builder.onResolve({ filter: /^\.\/localTrainingCompletion$/ }, () => ({ path: "outbox", namespace: "demo-profile" }));
      builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "sdk", namespace: "demo-profile" }));
      builder.onLoad({ filter: /.*/, namespace: "demo-profile" }, ({ path: name }) => ({ loader: "js", contents:
        name === "firebase" ? 'export const auth = globalThis.__phase2cAuth; export const db = globalThis.__phase2cDB;'
          : name === "config" ? `export const localCumulativeProfileConfig = () => ({ projectId: "${PROJECT}", authHost: "127.0.0.1", authPort: 9099, firestoreHost: "127.0.0.1", firestorePort: 18787 });`
            : name === "outbox" ? 'export const getLocalTrainingCompletionClient = () => ({list: async () => globalThis.__phase2cPending});'
              : ["collection", "doc", "getDocFromServer", "getDocsFromServer", "limit", "query"].map(key => `export const ${key}=(...args)=>globalThis.__phase2cSDK.${key}(...args);`).join("\n") }));
    } }] });
  globalThis.__phase2cBundle = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
});
beforeEach(async () => {
  await rules.clearFirestore();
  app = initializeApp({ projectId: PROJECT, apiKey: "demo-local-only" }, `phase2c-${crypto.randomUUID()}`);
  auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await createUserWithEmailAndPassword(auth, `phase2c-${crypto.randomUUID()}@example.test`, "synthetic-demo-password");
  uid = auth.currentUser.uid; browser = web.getFirestore(app); web.connectFirestoreEmulator(browser, "127.0.0.1", 18787);
  Object.assign(globalThis, { __phase2cAuth: auth, __phase2cDB: browser, __phase2cSDK: web, __phase2cPending: [] });
  front = await import(`${globalThis.__phase2cBundle}#${uid}`);
  await parent().set({ learningProfile: null });
});
afterEach(async () => { if (auth.currentUser) await deleteUser(auth.currentUser); await web.terminate(browser); await deleteApp(app); });
after(async () => { await rules.cleanup(); await provider.close(); });
const read = () => front.getLocalCumulativeProfileReader()(uid);
async function complete(options) {
  const input = completionFixture(options);
  await parent().collection("trainingReservations").doc(input.sessionId).set({ sessionId: input.sessionId, mode: input.mode,
    methodIds: input.mode === "auto" ? [] : input.selectedMethods });
  await createTrainingCompletionService({ getFirestore: provider.getFirestore, now: () => NOW }).complete(uid, input);
  return input;
}
test("Phase 2C actual demo Auth/Firestore reader: new account, automatic and Manual completion without writes from UI", async () => {
  assert.equal((await read()).summary, null);
  await complete({ count: 3, sessionId: "phase2c-automatic" });
  const manual = await complete({ mode: "manual", count: 1, sessionId: "phase2c-manual", date: "2026-10-20T10:00:00Z" });
  const before = (await parent().get()).data();
  const result = await read();
  assert.equal(result.summary.sessionCount, 2); assert.equal(result.automaticSessions, 1); assert.equal(result.manualSessions, 1);
  assert.equal(result.coverageComplete, true); assert.equal(result.history.length, 2);
  assert.equal(result.history[0].details.reflection.reflectionText, manual.reflection.reflectionText);
  assert.deepEqual((await parent().get()).data(), before);
  assert.equal((await parent().collection("trainingUsage").get()).size, 0);
});
test("Phase 2C native/legacy history appears once; unknown historical linkage remains explicitly separate", async () => {
  const old = validateCompletion(uid, completionFixture(), new Date(NOW).toISOString()).legacy;
  await parent().collection("assessments").doc("unlinked-historical-document").set(old);
  await complete({ sessionId: "phase2c-native-with-snapshot" });
  const result = await read();
  assert.equal(result.history.length, 2); assert.equal(result.summary.sessionCount, 2);
  assert.equal(result.history.filter(item => item.evidence.provenance.kind === "legacy-assessment")[0].evidence.originalSessionId, null);
  assert.equal(result.history.filter(item => item.evidence.provenance.kind === "native").length, 1);
  assert.equal(result.coverageComplete, true);
});
test("Phase 2C out-of-order reads preserve completion chronology and distinguish local checkpoints from acknowledgment", async () => {
  await complete({ mode: "manual", count: 1, sessionId: "phase2c-october-21", date: "2026-10-21T10:00:00Z" });
  await complete({ mode: "manual", count: 1, sessionId: "phase2c-october-19", date: "2026-10-19T10:00:00Z" });
  globalThis.__phase2cPending = [{ sessionId: "browser-unsent", acknowledged: false, legacy: false }, { sessionId: "browser-ack", acknowledged: true, legacy: false }];
  const result = await read();
  assert.equal(result.summary.sessionCount, 2); assert.equal(result.pending.length, 2);
  assert.deepEqual(result.history.map(item => item.evidence.sessionId), ["phase2c-october-21", "phase2c-october-19"]);
  assert.deepEqual(result.progress, []); // Today's drafts don't contain complete question/version metadata.
});
test("Phase 2C malformed details/history cause disclosed incomplete coverage, not invented totals", async () => {
  await complete({ mode: "manual", count: 1, sessionId: "phase2c-valid-record" });
  await parent().collection("learningEvidence").doc("bad-history").set({ schemaVersion: 99 });
  const result = await read(); assert.equal(result.summary.sessionCount, 1); assert.equal(result.coverageComplete, false);
  assert.equal(result.manualSessions, null); assert.equal(result.history.length, 1); assert.ok(result.warnings.length > 0);
});
test("Phase 2C owner-only reads, denied client writes, and logout invalidate cached readers", async () => {
  await complete({ mode: "manual", count: 1, sessionId: "phase2c-owner-only" });
  const foreign = rules.authenticatedContext("another-student").firestore();
  const foreignSDK = tools("firebase/firestore");
  await assert.rejects(foreignSDK.getDocFromServer(foreignSDK.doc(foreign, "users", uid, "learningProfiles", "cumulative")), e => e.code === "permission-denied");
  await assert.rejects(web.setDoc(web.doc(browser, "users", uid, "learningProfiles", "cumulative"), {}), e => e.code === "permission-denied");
  await assert.rejects(web.getDocsFromServer(web.collection(browser, "users", uid, "learningEvidenceSourceIndex")), e => e.code === "permission-denied");
  const cached = front.getLocalCumulativeProfileReader(); await signOut(auth);
  await assert.rejects(cached(uid), /Sign-in changed/);
});
