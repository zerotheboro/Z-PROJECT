import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithCustomToken, signOut } from "firebase/auth";
import * as web from "firebase/firestore";
import { completionFixture } from "../backend/completionFixtures.mjs";

assert.equal(process.versions.node.split(".")[0], "24"); assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
for (const name of ["TRAINING_JOURNAL_STAGE2", "TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2", "TRAINING_SEAL_STAGE4D", "TRAINING_PROTECTED_STAGE4E"])
  process.env[name] = "emulator-only";
const backend = await build({ stdin: { resolveDir: process.cwd(), contents: 'export * from "./backend/scalability/protectedTrainingApp"; export * from "./backend/scalability/origin"; export * from "./backend/scalability/bootstrapTransport";' },
  bundle: true, packages: "external", platform: "node", target: "node24", format: "esm", write: false });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/stage4f-test-api.mjs", backend.outputFiles[0].text);
const api = await import("../dist-stage2/stage4f-test-api.mjs");
let operator, origin, backendApp, server, browserApp, auth, browser, uid, token, reader, base;
let pending = [];
let priorReader;
before(async () => {
  operator = api.createBootstrapTransport(); origin = api.createOriginPrototype();
  backendApp = api.createProtectedTrainingApp({ enabled: true }); server = backendApp.app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  const requestId = "stage4f-" + crypto.randomUUID(), prepared = await origin.prepare({ requestId, identityForm: "ascii" });
  browserApp = initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-local-only" }, requestId);
  auth = getAuth(browserApp); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithCustomToken(auth, prepared.customToken); uid = auth.currentUser.uid; token = await auth.currentUser.getIdToken();
  await origin.finalize(token, { requestId }); browser = web.getFirestore(browserApp); web.connectFirestoreEmulator(browser, "127.0.0.1", 18787);
  Object.assign(globalThis, { __stage4fAuth: auth, __stage4fDB: browser, __stage4fWeb: web, __stage4fPending: () => pending });
  const front = await build({ stdin: { resolveDir: process.cwd(), contents: 'export * from "./src/services/localCumulativeProfile";' },
    bundle: true, platform: "node", target: "node24", format: "esm", write: false,
    plugins: [{ name: "real-demo-browser-bindings", setup(b) {
      b.onResolve({ filter: /^\.\.\/firebase$/ }, () => ({ path: "binding", namespace: "stage4f" }));
      b.onResolve({ filter: /^\.\/localCumulativeProfileConfig$/ }, () => ({ path: "config", namespace: "stage4f" }));
      b.onResolve({ filter: /^\.\/localTrainingCompletion$/ }, () => ({ path: "pending", namespace: "stage4f" }));
      b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "sdk", namespace: "stage4f" }));
      b.onLoad({ filter: /.*/, namespace: "stage4f" }, ({ path }) => ({ loader: "js", contents: path === "binding"
        ? 'export const auth=globalThis.__stage4fAuth; export const db=globalThis.__stage4fDB;'
        : path === "config" ? 'export const localCumulativeProfileConfig=()=>({acceptedPreview:true,projectId:"demo-edulience-phase2a",authHost:"127.0.0.1",authPort:9099,firestoreHost:"127.0.0.1",firestorePort:18787});'
          : path === "pending" ? 'export const getLocalTrainingCompletionClient=()=>({list:async()=>globalThis.__stage4fPending()});'
            : ["collection", "doc", "getDocFromServer", "getDocsFromServer", "limit", "query"].map(key => `export const ${key}=(...args)=>globalThis.__stage4fWeb.${key}(...args);`).join("\n") }));
    } }] });
  reader = (await import(`data:text/javascript;base64,${Buffer.from(front.outputFiles[0].text).toString("base64")}`)).getLocalCumulativeProfileReader;
});
after(async () => {
  if (auth?.currentUser) await signOut(auth); if (browser) await web.terminate(browser); if (browserApp) await deleteApp(browserApp);
  if (server) await new Promise(resolve => server.close(resolve)); await backendApp?.close(); await origin?.close(); await operator?.close();
});
async function post(path, data) {
  const response = await fetch(base + path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(data) });
  const result = await response.json(); assert.equal(response.status, 200, result.code); return result;
}
test("real Stage 4E acceptance feeds all 3/4/1/3 shapes into owner-only browser reads without publication or UI writes", async () => {
  const receipts = [], inputs = [];
  for (const [mode, count] of [["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]]) {
    const input = completionFixture({ mode, count, sessionId: "stage4f-session-" + crypto.randomUUID() }); inputs.push(input);
    await post("/api/training/reserve", { sessionId: input.sessionId, mode, methodIds: mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
    receipts.push(await post("/api/development/training/complete-protected-v2", input));
    const view = await reader()(uid); assert.equal(view.summary.sessionCount, receipts.length); assert.equal(view.revision, null);
    assert.equal(view.preview.publication, "not-published"); assert.equal(view.preview.authority, "NOT VERIFIED"); assert.deepEqual(view.warnings, []);
    const entry = view.history.find(entry => entry.evidence.sessionId === input.sessionId);
    assert.equal(entry.evidence.observations.filter(o => o.phase === "lab").length, count);
    assert.deepEqual(Object.fromEntries(entry.evidence.observations.filter(o => o.phase === "lab").map(o => [o.methodId, o.performance.score])),
      Object.fromEntries(input.methodLab.experiments.map(o => [o.method, o.score])));
  }
  const root = operator.getFirestore().doc(`users/${uid}`), usage = (await root.collection("trainingUsage").get()).docs.map(doc => doc.data());
  pending = [{ sessionId: "unsent-demo", acknowledged: false, legacy: false }];
  assert.deepEqual(await post("/api/development/training/complete-protected-v2", inputs[0]), receipts[0]);
  const refreshed = await reader()(uid); assert.equal(refreshed.history.length, 4); assert.equal(refreshed.pending.length, 1);
  assert.equal(refreshed.automaticSessions, 2); assert.equal(refreshed.manualSessions, 2);
  assert.deepEqual((await root.collection("trainingUsage").get()).docs.map(doc => doc.data()), usage);
  assert.equal((await root.collection("learningProfiles").doc("journalControl").get()).data().published, null);
  await assert.rejects(web.getDocFromServer(web.doc(browser, "users", "another-owner", "learningProfiles", "cumulative")), e => e.code === "permission-denied");
  await assert.rejects(web.setDoc(web.doc(browser, "users", uid, "learningProfiles", "cumulative"), { forged: true }), e => e.code === "permission-denied");
});
test("cached real browser reader is unusable after logout", async () => {
  priorReader = reader(); await signOut(auth); await assert.rejects(priorReader(uid), /Sign-in changed/);
});
test("switching to another synthetic Auth owner cannot reuse the previous owner's evidence or cached reader", async () => {
  const requestId = "stage4f-switch-" + crypto.randomUUID(), prepared = await origin.prepare({ requestId, identityForm: "ascii" });
  await signInWithCustomToken(auth, prepared.customToken); const other = auth.currentUser;
  await origin.finalize(await other.getIdToken(), { requestId });
  await assert.rejects(priorReader(uid), /Sign-in changed/);
  await assert.rejects(reader()(uid), /Sign-in changed/);
  const view = await reader()(other.uid); assert.equal(view.summary.sessionCount, 0); assert.equal(view.history.length, 0);
  assert.equal(view.revision, null); assert.equal(view.preview.authority, "NOT VERIFIED");
});
