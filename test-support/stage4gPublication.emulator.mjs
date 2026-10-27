import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { Firestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithCustomToken, signOut } from "firebase/auth";
import * as web from "firebase/firestore";
import { completionFixture } from "../backend/completionFixtures.mjs";
assert.equal(process.versions.node.split(".")[0], "24"); assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787"); assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
for (const name of ["TRAINING_JOURNAL_STAGE2", "TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2", "TRAINING_SEAL_STAGE4D",
  "TRAINING_PROTECTED_STAGE4E", "TRAINING_SHADOW_STAGE3A", "TRAINING_PUBLICATION_STAGE3B"]) process.env[name] = "emulator-only";
process.env.TRAINING_PUBLICATION_STAGE4G = "synthetic-emulator-only";
const bundled = await build({ stdin: { resolveDir: process.cwd(), loader: "ts", contents: [
  'export * from "./backend/scalability/syntheticPublicationApp";', 'export * from "./backend/scalability/syntheticPublication";',
  'export * from "./backend/scalability/origin";', 'export * from "./backend/scalability/authority";', 'export * from "./backend/scalability/bootstrapTransport";',
  'export * from "./backend/scalability/publication";', 'export * from "./backend/scalability/shadowWorker";',
  'export * from "./backend/scalability/values";', 'export * from "./src/services/syntheticPublishedProfile";',
  'export * from "./backend/scalability/acceptance";', 'export * from "./backend/scalability/acceptanceTransport";',
  'export * from "./backend/scalability/journal";'
].join("\n") }, bundle: true, packages: "external", platform: "node", target: "node24", format: "esm", write: false });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/stage4g-test-api.mjs", bundled.outputFiles[0].text);
const api = await import("../dist-stage2/stage4g-test-api.mjs");
let operator, origin, authority, app, server, service, db, base;
const resources = [];
before(async () => {
  operator = api.createBootstrapTransport(); db = operator.getFirestore(); origin = api.createOriginPrototype(); authority = api.createAuthorityPrototype();
  service = api.createSyntheticPublicationService(); app = api.createSyntheticPublicationApp({ enabled: true });
  server = app.app.listen(0, "127.0.0.1"); await once(server, "listening"); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  for (const r of resources) await r.close();
  await new Promise(resolve => server.close(resolve)); await app.close(); await service.close(); await authority.close(); await origin.close(); await operator.close();
});
async function student(identityForm = "ascii") {
  const requestId = "stage4g-" + crypto.randomUUID(), p = await origin.prepare({ requestId, identityForm });
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-stage4g-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.customToken, returnSecureToken: true }) });
  assert.equal(response.status, 200); const token = (await response.json()).idToken;
  await origin.finalize(token, { requestId }); return { uid: p.uid, token, customToken: p.customToken, root: db.doc(`users/${p.uid}`) };
}
async function request(s, path, method = "GET", body) {
  const response = await fetch(base + path, { method, headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json(); assert.equal(response.status, 200, value.code); return value;
}
async function accept(s, mode = "manual", count = 1) {
  const input = completionFixture({ mode, count, sessionId: "g-" + crypto.randomUUID() });
  await request(s, "/api/training/reserve", "POST", { sessionId: input.sessionId, mode, methodIds: mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
  const receipt = await request(s, "/api/development/training/complete-protected-v2", "POST", input);
  return { input, receipt };
}
async function ready(s) { const result = await service.aggregate(s.token); assert.equal(result.job.state, "ready"); return result.handle.generationId; }
async function fixture() { const s = await student(); const accepted = await accept(s); return { ...s, accepted, generationId: await ready(s) }; }
const usage = async s => (await s.root.collection("trainingUsage").get()).docs.map(r => r.data());
const pointer = s => s.root.collection("learningProfiles").doc("syntheticPublicationStage4g");
const writerContext = life => ({ uid: life.uid, lifecycleEpoch: life.lifecycleEpoch, writerProtocol: life.writerProtocol,
  namespaceVersion: life.namespaceVersion, fence: life.fence, revision: life.revision });
function reader(s, check = () => {}) {
  return api.createSyntheticPublishedProfileReader(path => request(s, "/api/development/profile/" + path), check, async () => []);
}
test("Automatic 3/4 and Manual 1/3 full completed journeys accumulate through real acceptance, worker, publication and HTTP reader", async () => {
  const s = await student(), sessions = [];
  for (const [mode, count] of [["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]]) {
    sessions.push(await accept(s, mode, count));
    const before = await service.status(s.token); assert.equal(before.accepted.sessionCount, sessions.length);
    if (sessions.length === 1 || sessions.length === 4) {
      const generationId = await ready(s), quota = await usage(s);
      const receipt = await request(s, `/api/development/profile/publish?generationId=${generationId}`, "POST");
      assert.equal(receipt.status, "synthetic-published"); assert.equal(receipt.authority, "NOT VERIFIED");
      assert.deepEqual(await service.publish(s.token, generationId), receipt); assert.deepEqual(await usage(s), quota);
    }
    const view = await reader(s)(s.uid);
    assert.equal(view.publication.acceptedSessions, sessions.length);
    assert.equal(view.publication.publishedSessions, sessions.length === 4 ? 4 : 1);
    assert.equal(view.publication.pendingSessions, sessions.length === 4 ? 0 : sessions.length - 1);
    assert.equal(view.revision, null); assert.deepEqual(view.warnings, []);
  }
  const view = await reader(s)(s.uid); assert.equal(view.coverageComplete, true);
  assert.equal(view.automaticSessions, 2); assert.equal(view.manualSessions, 2); assert.equal(view.history.length, 4);
  for (const { input, receipt } of sessions) {
    const entry = view.history.find(e => e.evidence.sessionId === input.sessionId);
    assert.equal(entry.evidence.completedAt, input.completedAt);
    assert.deepEqual(Object.fromEntries(entry.evidence.observations.filter(o => o.phase === "lab").map(o => [o.methodId, o.performance.score])),
      Object.fromEntries(input.methodLab.experiments.map(e => [e.method, e.score])));
    assert.equal(entry.details.reflection.reflectionText, input.reflection.reflectionText);
    assert.deepEqual(await request(s, "/api/development/training/complete-protected-v2", "POST", input), receipt);
  }
  const first = await service.history(s.token, view.publication.generationId, 0, 2), second = await service.history(s.token, view.publication.generationId, first.next, 2);
  assert.equal(first.rows.length, 2); assert.equal(second.next, null); assert.equal(new Set([...first.rows, ...second.rows].map(r => r.id)).size, 4);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 4);
  assert.equal((await s.root.collection("learningProfiles").doc("journalControl").get()).data().published, null);
  assert.equal((await s.root.collection("learningProfiles").doc("journalAdmission").get()).data().admitted, false);
  const fence = (await s.root.collection("learningProfiles").doc("cumulative").get()).data();
  assert.equal(fence.persistenceVersion, 3); assert.equal(fence.profile, undefined);
  const published = (await pointer(s).get()).data(), quota = await usage(s);
  const conflicting = structuredClone(sessions[0].input); conflicting.reflection.reflectionText = "Conflicting retry";
  const conflict = await fetch(base + "/api/development/training/complete-protected-v2", { method: "POST",
    headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" }, body: JSON.stringify(conflicting) });
  assert.equal(conflict.status, 409); assert.equal((await conflict.json()).code, "completion_conflict");
  assert.deepEqual((await pointer(s).get()).data(), published); assert.deepEqual(await usage(s), quota);
});
test("simultaneous identical publishers and lost-response/backend reconstruction recover the original record", async () => {
  const s = await fixture(), second = api.createSyntheticPublicationService(); resources.push(second);
  const quota = await usage(s), values = await Promise.all([service.publish(s.token, s.generationId), second.publish(s.token, s.generationId)]);
  assert.deepEqual(values[0], values[1]);
  const lost = api.createSyntheticPublicationService({ onEvent: async event => { if (event === "after-commit") throw new Error("lost response"); } }); resources.push(lost);
  const t = await fixture(); await assert.rejects(lost.publish(t.token, t.generationId), /lost response/);
  assert.deepEqual(await second.publish(t.token, t.generationId), (await pointer(t).get()).data());
  assert.deepEqual(await usage(s), quota);
});
test("interruption before commit leaves no partial pointer or record; retry succeeds", async () => {
  const s = await fixture(), p = api.createSyntheticPublicationService({ onEvent: async e => { if (e === "before-commit") throw new Error("crash"); } }); resources.push(p);
  await assert.rejects(p.publish(s.token, s.generationId), /crash/); assert.equal((await pointer(s).get()).exists, false);
  assert.equal((await s.root.collection("learningProfiles").doc("syntheticGeneration-" + s.generationId).get()).exists, false);
  assert.equal((await service.publish(s.token, s.generationId)).sessionCount, 1);
});
test("concurrent acceptance invalidates stale generation without losing either session", async () => {
  const s = await fixture(); let newer;
  const p = api.createSyntheticPublicationService({ onEvent: async e => { if (e === "before-commit") newer = await accept(s); } }); resources.push(p);
  await assert.rejects(p.publish(s.token, s.generationId), /synthetic_publication_state_changed|seal_changed/);
  assert.equal((await pointer(s).get()).exists, false); assert.equal((await s.root.collection("learningEvidence").get()).size, 2);
  assert.equal((await service.publish(s.token, await ready(s))).sessionCount, 2); assert.ok(newer);
});
for (const mutation of ["evidence", "phantom", "artifact", "takeover", "seal"]) test(`source/artifact/authority race (${mutation}) rejects atomically`, async () => {
  const s = await fixture();
  const p = api.createSyntheticPublicationService({ onEvent: async e => {
    if (e !== "before-commit") return;
    if (mutation === "evidence") await s.root.collection("learningEvidence").doc(s.accepted.receipt.evidenceId).update({ resultAuthority: "tampered" });
    if (mutation === "phantom") await s.root.collection("assessments").doc("unjournaled").set({ unknown: true });
    if (mutation === "artifact") await s.root.collection("learningProfiles").doc("shadow-" + s.generationId).collection("artifacts").doc("profile-0000000000000000").update({ bodyHash: "0".repeat(64) });
    if (mutation === "takeover") await s.root.collection("learningProfiles").doc("shadowWorker").update({ fence: 99 });
    if (mutation === "seal") await db.doc(`trainingInventorySeals/${s.uid}`).update({ phase: "revoked" });
  } }); resources.push(p);
  await assert.rejects(p.publish(s.token, s.generationId)); assert.equal((await pointer(s).get()).exists, false);
  assert.equal((await s.root.collection("learningProfiles").doc("syntheticGeneration-" + s.generationId).get()).exists, false);
});
test("deletion during publication and replay after deletion are both fenced", async () => {
  const s = await fixture(), life = await authority.read(s.token);
  const p = api.createSyntheticPublicationService({ onEvent: async e => { if (e === "before-commit") await authority.transition(s.token, writerContext(life), "deleting"); } }); resources.push(p);
  await assert.rejects(p.publish(s.token, s.generationId)); assert.equal((await pointer(s).get()).exists, false);
  const t = await fixture(); await service.publish(t.token, t.generationId); const context = writerContext(await authority.read(t.token));
  await authority.transition(t.token, context, "deleting"); await assert.rejects(service.publish(t.token, t.generationId)); await assert.rejects(reader(t)(t.uid));
});
test("origin revocation and cross-account generation replay cannot publish/read", async () => {
  const s = await fixture(), other = await fixture();
  await assert.rejects(service.publish(other.token, s.generationId)); await assert.rejects(service.history(other.token, s.generationId));
  const p = api.createSyntheticPublicationService({ onEvent: async e => { if (e === "before-commit") await origin.revoke(s.token, { reason: "operator-demo" }); } }); resources.push(p);
  await assert.rejects(p.publish(s.token, s.generationId), /synthetic_origin_required/); assert.equal((await pointer(s).get()).exists, false);
});
test("reader fences a delayed response on account switch, and verifies immutable history hashes", async () => {
  const s = await fixture(); await service.publish(s.token, s.generationId);
  let owner = s.uid;
  const delayed = api.createSyntheticPublishedProfileReader(async path => { const value = await request(s, "/api/development/profile/" + path); owner = "other"; return value; },
    uid => assert.equal(uid, owner, "owner changed"), async () => []);
  await assert.rejects(delayed(s.uid), /owner changed/);
  const corrupt = api.createSyntheticPublishedProfileReader(async path => {
    const value = await request(s, "/api/development/profile/" + path);
    if (path.startsWith("history")) value.rows[0].details.reflection.reflectionText = "altered private text";
    return value;
  }, () => {}, async () => []);
  await assert.rejects(corrupt(s.uid), /could not be verified/);
});
test("default publisher still cannot publish, and absent flag fails before SDK access", async () => {
  const s = await fixture(), ordinary = api.createDevelopmentPublisher(); resources.push(ordinary);
  await assert.rejects(ordinary.publish(s.token, s.generationId), /writer_protected_admission_not_verified/);
  delete process.env.TRAINING_PUBLICATION_STAGE4G;
  assert.throws(() => api.createSyntheticPublicationService(), /synthetic_publication_disabled/);
  process.env.TRAINING_PUBLICATION_STAGE4G = "synthetic-emulator-only";
});
test("a ready generation survives lease expiry and repeated aggregation without rewriting its artifacts", async () => {
  const s = await fixture(), ref = s.root.collection("learningProfiles").doc("shadow-" + s.generationId);
  const job = (await ref.get()).data();
  await ref.update({ "checkpoint.lease.expiresAt": "2026-01-01T00:00:00.000Z" });
  assert.equal((await service.aggregate(s.token)).handle.generationId, s.generationId);
  const receipt = await service.publish(s.token, s.generationId); assert.equal(receipt.workerFence, job.checkpoint.fencingToken);
  assert.deepEqual(await service.publish(s.token, s.generationId), receipt);
});
for (const deleting of [false, true]) test(`real SDK ABORTED retries ${deleting ? "reject a concurrent deletion" : "retain exactly one original publication"}`, async () => {
  const s = await fixture(), context = writerContext(await authority.read(s.token)), quota = await usage(s);
  const original = Firestore.prototype.runTransaction; let aborted = false, transitioned = false, retries = 0;
  Firestore.prototype.runTransaction = function(callback, options) {
    return original.call(this, async raw => {
      if (aborted && !transitioned) {
        transitioned = true;
        if (deleting) await authority.transition(s.token, context, "deleting");
      }
      const result = await callback(raw);
      if (result?.status === "synthetic-published" && !aborted) {
        aborted = true; const error = new Error("injected SDK ABORTED"); error.code = 10; throw error;
      }
      if (aborted && result?.status === "synthetic-published") retries++;
      return result;
    }, options);
  };
  try {
    if (deleting) { await assert.rejects(service.publish(s.token, s.generationId)); assert.equal((await pointer(s).get()).exists, false); }
    else { const receipt = await service.publish(s.token, s.generationId); assert.ok(retries >= 1); assert.deepEqual(await service.publish(s.token, s.generationId), receipt); }
    assert.equal(aborted, true); assert.deepEqual(await usage(s), quota);
  } finally { Firestore.prototype.runTransaction = original; }
});
test("fresh synthetic students have a genuine empty state before the first completion", async () => {
  const s = await student(), result = await reader(s)(s.uid);
  assert.equal(result.summary, null); assert.equal(result.publication.acceptedSessions, 0);
  assert.equal(result.publication.publication, "not-published"); assert.deepEqual(result.history, []);
});
test("real browser Auth/Firestore configuration reads the published HTTP generation and fences logout/account switching", async () => {
  const s = await fixture(); await service.publish(s.token, s.generationId);
  const app = initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-local-only" }, "stage4g-web-" + crypto.randomUUID());
  const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const browser = web.getFirestore(app); web.connectFirestoreEmulator(browser, "127.0.0.1", 18787);
  Object.assign(globalThis, { __stage4gAuth: auth, __stage4gDB: browser, __stage4gWeb: web, __stage4gBase: base });
  try {
    await signInWithCustomToken(auth, s.customToken);
    const front = await build({ stdin: { resolveDir: process.cwd(), contents: 'export * from "./src/services/localCumulativeProfile";' },
      bundle: true, platform: "node", target: "node24", format: "esm", write: false,
      plugins: [{ name: "real-demo-browser-bindings", setup(b) {
        b.onResolve({ filter: /^\.\.\/firebase$/ }, () => ({ path: "binding", namespace: "stage4g" }));
        b.onResolve({ filter: /^\.\/localCumulativeProfileConfig$/ }, () => ({ path: "config", namespace: "stage4g" }));
        b.onResolve({ filter: /^\.\/localTrainingCompletion$/ }, () => ({ path: "pending", namespace: "stage4g" }));
        b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "sdk", namespace: "stage4g" }));
        b.onLoad({ filter: /.*/, namespace: "stage4g" }, ({ path }) => ({ loader: "js", contents: path === "binding"
          ? 'export const auth=globalThis.__stage4gAuth; export const db=globalThis.__stage4gDB;'
          : path === "config" ? 'export const localCumulativeProfileConfig=()=>({syntheticPublished:true,apiBase:globalThis.__stage4gBase,projectId:"demo-edulience-phase2a",authHost:"127.0.0.1",authPort:9099,firestoreHost:"127.0.0.1",firestorePort:18787});'
            : path === "pending" ? 'export const getLocalTrainingCompletionClient=()=>({list:async()=>[]});'
              : ["collection", "doc", "getDocFromServer", "getDocsFromServer", "limit", "query"].map(key => `export const ${key}=(...args)=>globalThis.__stage4gWeb.${key}(...args);`).join("\n") }));
      } }] });
    const { getLocalCumulativeProfileReader } = await import(`data:text/javascript;base64,${Buffer.from(front.outputFiles[0].text).toString("base64")}`);
    const first = getLocalCumulativeProfileReader(), view = await first(s.uid);
    assert.equal(view.publication.publication, "published"); assert.equal(view.summary.sessionCount, 1); assert.equal(view.revision, null);
    assert.deepEqual(await getLocalCumulativeProfileReader()(s.uid), view);
    await signOut(auth); await assert.rejects(first(s.uid), /Sign-in changed/);
    const other = await student(); await signInWithCustomToken(auth, other.customToken);
    await assert.rejects(first(s.uid), /Sign-in changed/); await assert.rejects(getLocalCumulativeProfileReader()(s.uid), /Sign-in changed/);
    assert.equal((await getLocalCumulativeProfileReader()(other.uid)).publication.acceptedSessions, 0);
    await assert.rejects(web.getDocFromServer(web.doc(browser, "users", s.uid, "learningProfiles", "syntheticPublicationStage4g")), e => e.code === "permission-denied");
  } finally { await signOut(auth); await web.terminate(browser); await deleteApp(app); }
});
test("an otherwise valid Emulator account without synthetic origin provenance cannot enter the successful branch", async () => {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-stage4g-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) });
  assert.equal(response.status, 200); const user = await response.json(), root = db.doc(`users/${user.localId}`);
  assert.equal((await root.get()).exists, false);
  await assert.rejects(service.status(user.idToken), /synthetic_origin_required/);
  await assert.rejects(service.publish(user.idToken, "0".repeat(64)), /synthetic_origin_required/);
  assert.equal((await root.get()).exists, false); assert.equal((await root.collection("learningProfiles").get()).empty, true);
});
test("repair: original unicode58 aggregation and publication preserve exact identity, evidence and quotas", async () => {
  const s = await student("unicode58"), completed = await accept(s), quota = await usage(s);
  assert.equal(s.uid.length, 58); assert.equal(Buffer.byteLength(s.uid), 158);
  const evidence = s.root.collection("learningEvidence").doc(completed.receipt.evidenceId), original = (await evidence.get()).data();
  const fingerprint = api.typedHash("stage4g-repair-evidence-check-v1", original);
  const generationId = await ready(s), published = await service.publish(s.token, generationId);
  assert.equal(published.uid, s.uid); assert.equal(published.context.uid, s.uid); assert.equal(published.source.uid, s.uid);
  assert.equal((await service.aggregate(s.token)).handle.generationId, generationId);
  assert.deepEqual(await service.publish(s.token, generationId), published);
  assert.deepEqual(await request(s, "/api/development/training/complete-protected-v2", "POST", completed.input), completed.receipt);
  assert.equal(api.typedHash("stage4g-repair-evidence-check-v1", (await evidence.get()).data()), fingerprint);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await usage(s), quota);
  const view = await reader(s)(s.uid); assert.equal(view.history[0].evidence.owner.uid, s.uid);
  assert.deepEqual(view.publication, { kind: "synthetic-emulator-publication", authority: "NOT VERIFIED", publication: "published",
    generationId, acceptedSessions: 1, publishedSessions: 1, pendingSessions: 0, publishedAt: published.publishedAt });
});
test("repair: original control-counter drift cannot produce false accepted or pending counts", async () => {
  const s = await fixture(); await service.publish(s.token, s.generationId);
  const control = s.root.collection("learningProfiles").doc("journalControl"), before = (await control.get()).data();
  assert.equal(before.nativeAcceptedCount, 1); assert.equal(before.headRevision, 2);
  const quota = await usage(s), published = (await pointer(s).get()).data();
  try {
    await control.update({ nativeAcceptedCount: 2 });
    await assert.rejects(service.status(s.token), /acceptance_checkpoint/);
    await assert.rejects(reader(s)(s.uid));
    await assert.rejects(service.history(s.token, s.generationId), /acceptance_checkpoint/);
    await assert.rejects(service.publish(s.token, s.generationId), /acceptance_checkpoint/);
    assert.deepEqual((await pointer(s).get()).data(), published); assert.deepEqual(await usage(s), quota);
    assert.equal((await s.root.collection("learningEvidence").get()).size, 1);
  } finally { await control.set(before); }
  const restored = await reader(s)(s.uid);
  assert.deepEqual([restored.publication.acceptedSessions, restored.publication.publishedSessions, restored.publication.pendingSessions], [1, 1, 0]);
});
test("repair: unicode128 origin survives the complete pipeline without changing any owner text", async () => {
  const s = await student("unicode128"), completed = await accept(s);
  assert.equal(s.uid.length, 128); assert.equal(Buffer.byteLength(s.uid), 378);
  const quota = await usage(s), original = (await s.root.collection("learningEvidence").doc(completed.receipt.evidenceId).get()).data();
  const generationId = await ready(s), record = await service.publish(s.token, generationId), view = await reader(s)(s.uid);
  assert.equal(record.uid, s.uid); assert.equal(view.history[0].evidence.owner.uid, s.uid);
  assert.deepEqual((await s.root.collection("learningEvidence").doc(completed.receipt.evidenceId).get()).data(), original);
  assert.deepEqual(await usage(s), quota); assert.equal(view.publication.pendingSessions, 0);
});
test("repair: established ASCII, BMP and supplementary UID boundaries pass the actual worker pointer flow", async () => {
  const random = crypto.randomUUID().replaceAll("-", "");
  const owners = ["a".repeat(96) + random,
    Array.from({ length: 128 }, (_, i) => String.fromCharCode(0x4e00 + parseInt(random[i % 32], 16))).join(""),
    Array.from({ length: 64 }, (_, i) => String.fromCodePoint(0x1f300 + parseInt(random[i % 32], 16))).join("")];
  assert.deepEqual(owners.map(uid => [uid.length, Buffer.byteLength(uid)]), [[128, 128], [128, 384], [128, 256]]);
  for (const uid of owners) {
    await operator.getAuthClient().createUser({ uid });
    const customToken = await operator.getAuthClient().createCustomToken(uid);
    const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-stage4g-only", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
    assert.equal(response.status, 200); const token = (await response.json()).idToken;
    const root = db.doc(`users/${uid}`); await root.set({ uid, learningProfile: null });
    const transport = api.createStage2EmulatorTransport(); resources.push(transport);
    await api.createStage2AcceptanceService(transport).admitFreshOwner(token);
    const worker = api.createShadowWorker(); resources.push(worker);
    const result = await worker.processOwner(uid); assert.equal(result.job.state, "ready");
    assert.equal(result.job.pin.source.uid, uid);
    const saved = (await root.collection("learningProfiles").doc("shadowWorker").get()).data();
    assert.equal(saved.uid, uid); assert.equal(await worker.processOwner(uid), null);
    assert.equal((await root.collection("learningEvidence").get()).size, 0);
    assert.equal((await root.collection("trainingUsage").get()).size, 0);
  }
  // The UTF-16 bound limits well-formed UIDs to at most 384 UTF-8 bytes;
  // there is no legitimate 512-byte / <=128-code-unit UID to fabricate.
});
test("repair: invalid owner identities reject before a worker pointer or job can be written", async () => {
  const worker = api.createShadowWorker(); resources.push(worker);
  for (const uid of ["", "   ", "a".repeat(129), "a".repeat(513), "\u754c".repeat(171), "\u{1f9e0}".repeat(65),
    ".", "..", "__reserved__", "other/owner", "bad-\ud800", "bad-\udfff", null, 42, ["owner"]]) {
    await assert.rejects(worker.claim(uid));
  }
  assert.equal(worker.metrics.writes, 0); assert.equal(worker.metrics.reads, 0);
});
test("repair: a previously committed Unicode working job resumes with a fresh worker fence and no migration", async () => {
  const s = await student("unicode58"), completed = await accept(s), quota = await usage(s);
  const original = (await s.root.collection("learningEvidence").doc(completed.receipt.evidenceId).get()).data();
  let oldHandle;
  const oldWorker = api.createShadowWorker({ syntheticOwnerToken: s.token, leaseMs: 1_000,
    onEvent: async (event, handle) => { if (event === "claimed") { oldHandle = handle; throw new api.ShadowWorkerInterruption("process stopped after claim"); } } });
  resources.push(oldWorker);
  await assert.rejects(oldWorker.claim(s.uid), /process stopped after claim/);
  const jobRef = s.root.collection("learningProfiles").doc("shadow-" + oldHandle.generationId), saved = (await jobRef.get()).data();
  assert.equal(saved.state, "working"); assert.equal(saved.checkpoint.cursor.processedCount, 0);
  // This is the same durable state left by the old pointer-parser failure.
  // Allow the short test lease to expire naturally; do not rewrite the job.
  await new Promise(resolve => setTimeout(resolve, 1_100));
  const reconstructed = api.createShadowWorker({ syntheticOwnerToken: s.token }); resources.push(reconstructed);
  const resumed = await reconstructed.processOwner(s.uid);
  assert.equal(resumed.job.state, "ready"); assert.equal(resumed.handle.generationId, oldHandle.generationId);
  assert.ok(resumed.handle.fence > oldHandle.fence); assert.deepEqual(resumed.job.pin, saved.pin);
  await assert.rejects(oldWorker.heartbeat(oldHandle), /stale_worker_fence/);
  const published = await service.publish(s.token, resumed.handle.generationId);
  assert.deepEqual(await service.publish(s.token, resumed.handle.generationId), published);
  assert.deepEqual(await request(s, "/api/development/training/complete-protected-v2", "POST", completed.input), completed.receipt);
  assert.deepEqual((await s.root.collection("learningEvidence").doc(completed.receipt.evidenceId).get()).data(), original);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await usage(s), quota);
});
test("repair: valid pending/publication counts stay generation-pinned across concurrent acceptance and repeated reads", async () => {
  const s = await student(), first = await accept(s);
  let view = await reader(s)(s.uid);
  assert.deepEqual([view.publication.acceptedSessions, view.publication.publishedSessions, view.publication.pendingSessions], [1, 0, 1]);
  const originalGeneration = await ready(s), originalRecord = await service.publish(s.token, originalGeneration);
  assert.deepEqual(await request(s, "/api/development/training/complete-protected-v2", "POST", first.input), first.receipt);
  await accept(s, "auto", 4); const quota = await usage(s);
  view = await reader(s)(s.uid);
  assert.deepEqual([view.publication.acceptedSessions, view.publication.publishedSessions, view.publication.pendingSessions], [2, 1, 1]);
  const pinned = api.createSyntheticPublishedProfileReader(async path => {
    const response = await request(s, "/api/development/profile/" + path);
    if (path === "status") await service.publish(s.token, await ready(s));
    return response;
  }, uid => assert.equal(uid, s.uid), async () => []);
  const oldView = await pinned(s.uid);
  assert.equal(oldView.publication.generationId, originalGeneration); assert.equal(oldView.history.length, 1);
  assert.deepEqual([oldView.publication.acceptedSessions, oldView.publication.publishedSessions, oldView.publication.pendingSessions], [2, 1, 1]);
  for (let i = 0; i < 3; i++) {
    const current = await reader(s)(s.uid);
    assert.deepEqual([current.publication.acceptedSessions, current.publication.publishedSessions, current.publication.pendingSessions], [2, 2, 0]);
    assert.equal(current.history.length, 2); assert.deepEqual(current.warnings, []);
  }
  const latest = (await pointer(s).get()).data();
  assert.deepEqual(await service.publish(s.token, originalGeneration), originalRecord);
  assert.deepEqual((await pointer(s).get()).data(), latest); assert.deepEqual(await usage(s), quota);
});
test("repair: malformed checkpoints, heads, committed batches and journal tails fail closed without rewriting evidence", async () => {
  const s = await student(); await accept(s); await accept(s, "auto", 3);
  const generationId = await ready(s); await service.publish(s.token, generationId);
  const profiles = s.root.collection("learningProfiles"), controlRef = profiles.doc("journalControl"), checkpointRef = profiles.doc("acceptanceCheckpoint");
  const control = (await controlRef.get()).data(), checkpoint = (await checkpointRef.get()).data();
  const batchRef = controlRef.collection("acceptanceBatches").doc(checkpoint.batchId), batch = (await batchRef.get()).data();
  const predecessorRef = controlRef.collection("acceptanceBatches").doc(batch.previous.batchId), predecessor = (await predecessorRef.get()).data();
  const entryRef = controlRef.collection("journal").doc(api.journalIdentity(batch, batch.firstRevision)), entry = (await entryRef.get()).data();
  const originals = new Map([[controlRef, control], [checkpointRef, checkpoint], [batchRef, batch], [predecessorRef, predecessor], [entryRef, entry]]);
  const quota = await usage(s), published = (await pointer(s).get()).data();
  const evidence = (await s.root.collection("learningEvidence").orderBy("__name__").get()).docs.map(row => row.data());
  const variants = [
    [controlRef, { ...control, nativeAcceptedCount: 0 }], [controlRef, { ...control, nativeAcceptedCount: 3 }],
    [controlRef, { ...control, headRevision: control.headRevision + 1 }], [controlRef, { ...control, headHash: "f".repeat(64) }],
    [checkpointRef, { ...checkpoint, ordinal: 1 }], [checkpointRef, { ...checkpoint, headRevision: checkpoint.headRevision + 1 }],
    [checkpointRef, { ...checkpoint, headHash: "f".repeat(64) }], [checkpointRef, { ...checkpoint, uid: "different-owner" }],
    [checkpointRef, { ...checkpoint, lifecycleEpoch: 2 }], [checkpointRef, null], [batchRef, null],
    [batchRef, { ...batch, batchHash: "f".repeat(64) }], [entryRef, null], [entryRef, { ...entry, entryHash: "f".repeat(64) }],
    [predecessorRef, null], [predecessorRef, { ...predecessor, batchHash: "f".repeat(64) }]
  ];
  for (const [ref, value] of variants) {
    try {
      if (value === null) await ref.delete(); else await ref.set(value);
      await assert.rejects(service.status(s.token));
    } finally { await ref.set(originals.get(ref)); }
    assert.equal((await service.status(s.token)).accepted.sessionCount, 2);
    assert.deepEqual((await pointer(s).get()).data(), published);
  }
  assert.deepEqual((await s.root.collection("learningEvidence").orderBy("__name__").get()).docs.map(row => row.data()), evidence);
  assert.deepEqual(await usage(s), quota);
});
test("repair: a stranded acceptance checkpoint cannot masquerade as an empty account", async () => {
  const s = await student(), ref = s.root.collection("learningProfiles").doc("acceptanceCheckpoint");
  await ref.set({ schemaVersion: 1, uid: s.uid, lifecycleEpoch: 1, ordinal: 0, batchId: null, batchHash: null, headRevision: 0, headHash: null });
  await assert.rejects(service.status(s.token), /acceptance_checkpoint_invalid/);
});
test("repair: a jointly reset control and checkpoint cannot hide a committed unpublished batch", async () => {
  const s = await student(); await accept(s);
  const controlRef = s.root.collection("learningProfiles").doc("journalControl"), checkpointRef = s.root.collection("learningProfiles").doc("acceptanceCheckpoint");
  const control = (await controlRef.get()).data(), checkpoint = (await checkpointRef.get()).data();
  try {
    await controlRef.set({ ...control, nativeAcceptedCount: 0, headRevision: 0, headHash: null });
    await checkpointRef.set({ ...checkpoint, ordinal: 0, headRevision: 0, headHash: null, batchId: null, batchHash: null });
    await assert.rejects(service.status(s.token), /acceptance_checkpoint_invalid/);
  } finally { await controlRef.set(control); await checkpointRef.set(checkpoint); }
  const view = await reader(s)(s.uid);
  assert.deepEqual([view.publication.acceptedSessions, view.publication.publishedSessions, view.publication.pendingSessions], [1, 0, 1]);
});
