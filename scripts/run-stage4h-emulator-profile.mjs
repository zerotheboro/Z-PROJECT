import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { createConnection } from "node:net";
import { AsyncLocalStorage } from "node:async_hooks";
import { Transaction } from "firebase-admin/firestore";
import { completionFixture } from "../backend/completionFixtures.mjs";
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a", GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", TRAINING_PUBLICATION_STAGE4G: "synthetic-emulator-only" });
for (const n of ["TRAINING_JOURNAL_STAGE2", "TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2",
  "TRAINING_SEAL_STAGE4D", "TRAINING_PROTECTED_STAGE4E", "TRAINING_SHADOW_STAGE3A", "TRAINING_PUBLICATION_STAGE3B"]) process.env[n] = "emulator-only";
for (const port of [18787, 9099]) await new Promise((resolve, reject) => {
  const socket = createConnection({ host: "127.0.0.1", port }); socket.setTimeout(2000);
  socket.once("connect", () => { socket.destroy(); resolve(); });
  socket.once("error", () => reject(new Error("Demo Emulator unavailable; no fallback.")));
  socket.once("timeout", () => { socket.destroy(); reject(new Error("Demo Emulator unavailable; no fallback.")); });
});
const compiled = await build({ stdin: { resolveDir: process.cwd(), contents: ["syntheticPublicationApp", "syntheticPublication", "origin", "bootstrapTransport"]
  .map(name => `export * from "./backend/scalability/${name}";`).concat('export * from "./src/services/syntheticPublishedProfile";',
    'export {default as Dashboard} from "./src/components/CumulativeProfileDashboard";', 'export {createElement} from "react";',
    'export {MemoryRouter} from "react-router-dom";', 'export {renderToStaticMarkup} from "react-dom/server";').join("\n") },
  bundle: true, packages: "external", platform: "node", target: "node24", format: "esm", jsx: "automatic", write: false,
  loader: { ".scss": "empty" }, define: { "import.meta.env": '{"DEV":false}' },
  plugins: [{ name: "no-frontend-firebase-client", setup(b) {
    b.onResolve({ filter: /(^|\/)firebase$/ }, () => ({ path: "no-client", namespace: "stage4h-ssr" }));
    b.onLoad({ filter: /.*/, namespace: "stage4h-ssr" }, () => ({ contents: 'export const auth=null,db=null,functions=null;', loader: "js" }));
  } }] });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/stage4h-emulator-profile.mjs", compiled.outputFiles[0].text);
const api = await import("../dist-stage2/stage4h-emulator-profile.mjs");
const operator = api.createBootstrapTransport(), origin = api.createOriginPrototype(), service = api.createSyntheticPublicationService();
const app = api.createSyntheticPublicationApp({ enabled: true }), server = app.app.listen(0, "127.0.0.1"); await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
// Count actual returned transactional snapshots, not inferred request costs or
// billable reads. Suppress nested SDK get -> getAll double counting.
const original = { get: Transaction.prototype.get, getAll: Transaction.prototype.getAll }, depth = new AsyncLocalStorage();
let measuring = false, reads = 0, operations = 0;
for (const name of ["get", "getAll"]) Transaction.prototype[name] = async function(...args) {
  const nesting = depth.getStore() ?? 0;
  return depth.run(nesting + 1, async () => {
    const result = await original[name].apply(this, args);
    if (measuring && nesting === 0) { operations++;
      reads += Array.isArray(result) ? result.filter(row => row.exists).length : "docs" in result ? result.docs.length : Number(result.exists);
    }
    return result;
  });
};
try {
  const requestId = `stage4h-journey-${crypto.randomUUID()}`, provisioned = await origin.prepare({ requestId, identityForm: "ascii" });
  const auth = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-stage4h-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: provisioned.customToken, returnSecureToken: true }) });
  assert.equal(auth.status, 200); const token = (await auth.json()).idToken; await origin.finalize(token, { requestId });
  const request = async (path, body) => {
    const response = await fetch(base + path, { method: body ? "POST" : "GET", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json(); assert.equal(response.status, 200, result.code); return result;
  };
  const accepted = [];
  for (const [mode, count] of [["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]]) {
    const input = completionFixture({ mode, count, sessionId: `stage4h-${crypto.randomUUID()}` });
    await request("/api/training/reserve", { sessionId: input.sessionId, mode, methodIds: mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
    const receipt = await request("/api/development/training/complete-protected-v2", input); accepted.push({ input, receipt });
    const pending = await service.status(token); assert.equal(pending.accepted.sessionCount, accepted.length);
  }
  const root = operator.getFirestore().doc(`users/${provisioned.uid}`), quota = (await root.collection("trainingUsage").get()).docs.map(row => row.data());
  const generation = await service.aggregate(token), published = await service.publish(token, generation.handle.generationId);
  for (const { input, receipt } of accepted) assert.deepEqual(await request("/api/development/training/complete-protected-v2", input), receipt);
  let requests = 0; reads = 0; operations = 0; measuring = true; const start = performance.now();
  const view = await api.createSyntheticPublishedProfileReader(path => { requests++; return request("/api/development/profile/" + path); },
    uid => assert.equal(uid, provisioned.uid), async () => [])(provisioned.uid);
  const elapsedMs = performance.now() - start; measuring = false;
  assert.equal(view.history.length, 4); assert.equal(view.automaticSessions, 2); assert.equal(view.manualSessions, 2); assert.deepEqual(view.warnings, []);
  assert.equal(view.publication.pendingSessions, 0); assert.equal(view.revision, null); assert.equal(view.publication.authority, "NOT VERIFIED");
  for (const { input } of accepted) {
    const saved = view.history.find(row => row.evidence.sessionId === input.sessionId);
    for (const result of input.methodLab.experiments)
      assert.equal(saved.evidence.observations.find(o => o.methodId === result.method && o.phase === "lab").performance.score, result.score);
  }
  const markup = api.renderToStaticMarkup(api.createElement(api.MemoryRouter, null, api.createElement(api.Dashboard, { data: view, refresh() {} })));
  for (const section of ["Learning Overview", "Study Method Evidence", "Learning History", "Progress Over Time"]) assert.ok(markup.includes(section));
  for (const { input } of accepted) if (input.reflection.reflectionText) assert.ok(!markup.includes(input.reflection.reflectionText));
  assert.equal((await root.collection("learningEvidence").get()).size, 4); assert.deepEqual((await root.collection("trainingUsage").get()).docs.map(row => row.data()), quota);
  assert.deepEqual(await service.publish(token, generation.handle.generationId), published);
  console.log(JSON.stringify({scope: "Real loopback demo Auth/Firestore and authenticated HTTP reader; synthetic four-journey account only",
    automaticMethods: [3, 4], manualMethods: [1, 3], sessions: 4, httpRequests: requests, initialReaderMs: Math.round(elapsedMs),
    transactionalReadOperations: operations, returnedFirestoreDocuments: reads, historyRecordsReturned: view.history.length,
    receiptsPreserved: true, duplicateEvidence: false, extraQuotaCharges: false, dashboardSectionsRendered: 4,
    exactMethodScores: true, privateReflectionHidden: true, productionAuthority: "NOT VERIFIED", billableReadEstimate: null }));
} finally {
  Transaction.prototype.get = original.get; Transaction.prototype.getAll = original.getAll;
  await new Promise(resolve => server.close(resolve)); await app.close(); await service.close(); await origin.close(); await operator.close();
}
