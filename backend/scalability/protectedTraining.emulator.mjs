import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { Firestore } from "firebase-admin/firestore";
import { completionFixture } from "../completionFixtures.mjs";
assert.equal(process.versions.node.split(".")[0], "24"); assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787"); assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
for (const key of ["GITHUB_TOKEN", "GH_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON"]) assert.equal(Object.hasOwn(process.env, key), false);
for (const key of ["TRAINING_JOURNAL_STAGE2", "TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2", "TRAINING_SEAL_STAGE4D", "TRAINING_PROTECTED_STAGE4E"])
  process.env[key] = "emulator-only";
const bundled = await build({ stdin: { contents: [
  'export * from "./backend/scalability/protectedTrainingApp";', 'export * from "./backend/scalability/origin";',
  'export * from "./backend/scalability/authority";', 'export * from "./backend/scalability/bootstrapTransport";',
  'export * from "./backend/scalability/acceptanceTransport";', 'export * from "./backend/scalability/writerGuard";',
  'export * from "./backend/scalability/sealing";', 'export * from "./backend/scalability/sealingContracts";',
  'export { createTrainingRecoveryAttempt } from "./backend/scalability/protectedTrainingRecovery";',
  'export { protectedSealRequest } from "./backend/scalability/protectedTrainingPolicy";',
  'export * from "./src/services/trainingCompletion";', 'export * from "./src/services/trainingCompletionOutbox";'
].join("\n"), resolveDir: process.cwd(), loader: "ts" }, bundle: true, packages: "external", platform: "node", target: "node24", format: "esm", write: false });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/stage4e-test-api.mjs", bundled.outputFiles[0].text);
const api = await import("../../dist-stage2/stage4e-test-api.mjs");
globalThis.IDBKeyRange = IDBKeyRange;
let app, server, origin, authority, operator, db, base;
const boxes = []; const id = () => crypto.randomUUID().replaceAll("-", "");
before(async () => {
  operator = api.createBootstrapTransport(); db = operator.getFirestore(); await db.doc("stage4eHealth/demo-only").get();
  origin = api.createOriginPrototype(); authority = api.createAuthorityPrototype(); app = api.createProtectedTrainingApp({ enabled: true });
  server = app.app.listen(0, "127.0.0.1"); await once(server, "listening"); base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { for (const box of boxes.splice(0)) await box.close(); });
after(async () => { await new Promise(resolve => server.close(resolve)); await app.close(); await origin.close(); await authority.close(); await operator.close(); });
async function student() {
  const request = { requestId: "stage4e-" + id(), identityForm: "ascii" }, prepared = await origin.prepare(request);
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-stage4e-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: prepared.customToken, returnSecureToken: true }) });
  assert.equal(response.status, 200); const token = (await response.json()).idToken;
  await origin.finalize(token, { requestId: request.requestId });
  return { uid: prepared.uid, token, root: db.doc(`users/${prepared.uid}`), seal: db.doc(`trainingInventorySeals/${prepared.uid}`) };
}
async function reconstructBackend() {
  await new Promise(resolve => server.close(resolve)); await app.close(); app = api.createProtectedTrainingApp({ enabled: true });
  server = app.app.listen(0, "127.0.0.1"); await once(server, "listening"); base = `http://127.0.0.1:${server.address().port}`;
}
async function request(s, path, payload) {
  const response = await fetch(base + path, { method: payload === undefined ? "GET" : "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" },
    ...(payload === undefined ? {} : { body: typeof payload === "string" ? payload : JSON.stringify(payload) }) });
  return { status: response.status, body: await response.json() };
}
const complete = (s, payload) => request(s, "/api/development/training/complete-protected-v2", payload);
async function reserve(s, draft) {
  const r = await request(s, "/api/training/reserve", { sessionId: draft.sessionId, mode: draft.mode,
    methodIds: draft.mode === "auto" ? [] : draft.selectedMethods, timezone: "UTC" }); assert.equal(r.status, 200); return r.body;
}
const records = async collection => (await collection.orderBy("__name__").get()).docs.map(row => ({ id: row.id, data: row.data() }));
const quotas = s => records(s.root.collection("trainingUsage"));
function client(s, { factory = new IDBFactory(), lose = false, wait = null, owner = () => s.uid, reservation = null, activityFail = false } = {}) {
  const box = api.createCompletionOutbox("demo-edulience-phase2a", factory); boxes.push(box); const sent = []; let activity = 0, clears = 0, legacy = 0;
  const deps = { outbox: box, target: "protected-v2", timeZone: () => "UTC", assertOwner: uid => { if (owner() !== uid) throw new api.CompletionOutboxError("completion_owner_changed", "owner changed"); },
    hasReservation: reservation ?? (async draft => (await s.root.collection("trainingReservations").doc(draft.sessionId).get()).exists),
    transport: async (_uid, json) => { sent.push(json); if (wait) await wait;
      const r = await complete(s, json); if (r.status !== 200) throw new api.CompletionOutboxError(r.body.code, "local server rejected completed evidence");
      if (lose) { lose = false; throw new Error("successful response lost"); } return r.body; },
    completeLegacy: async () => { legacy++; throw new Error("must never invoke legacy"); },
    recordActivity: async () => { activity++; if (activityFail) { activityFail = false; throw new Error("activity offline"); } },
    clearDraft: async (_uid, sessionId) => { clears++; const ref = s.root.collection("trainingProgress").doc("active");
      await db.runTransaction(async tx => { const saved = await tx.get(ref); if (saved.data()?.sessionId === sessionId) tx.delete(ref); }); }
  };
  return { box, factory, service: api.createTrainingCompletionClient(deps), deps, sent, counts: () => ({ activity, clears, legacy }) };
}
function draft(s, mode = "auto", count = 3) {
  const input = completionFixture({ mode, count, sessionId: "stage4e-session-" + id() });
  return { schemaVersion: 1, owner: { kind: "user", uid: s.uid }, sessionId: input.sessionId, mode, phase: "final-save", section: 6,
    selectedMethods: input.selectedMethods, labContentSetIds: input.selectedMethods.map(id => id + "-lab"),
    verificationMethodOrder: input.methodMatch.methods.map(m => m.method), matchContentSetIds: input.methodMatch.methods.map(m => m.method + "-match"),
    completed: { methodIntroduction: input.methodIntroduction, methodLab: input.methodLab, methodMatch: input.methodMatch, reflection: input.reflection,
      baseline: input.baseline ?? null, learningSituation: input.learningSituation ?? null, learningProfile: null } };
}
for (const [mode, count] of [["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]])
  test(`protected ${mode}/${count}: complete frozen journey → real Auth/HTTP/Firestore → original v2 receipt`, async () => {
    const s = await student(), d = draft(s, mode, count); await reserve(s, d); const before = await quotas(s);
    await s.root.collection("trainingProgress").doc("active").create({ sessionId: d.sessionId, preserved: true });
    const h = client(s), frozen = await h.service.prepare(d, "2026-10-24T10:00:00.000Z"), receipt = await h.service.resume(s.uid, d.sessionId);
    assert.equal(receipt.schemaVersion, 2); assert.equal(receipt.status, "accepted"); assert.equal(Object.hasOwn(receipt, "profileRevision"), false);
    const rows = await records(s.root.collection("learningEvidence")); assert.equal(rows.length, 1); const row = rows[0].data;
    assert.deepEqual(row.receipt, receipt); assert.equal(row.evidence.observations.filter(o => o.phase === "lab").length, count);
    assert.equal(row.evidence.observations.filter(o => o.phase === "match").length, Math.min(2, count));
    assert.equal(JSON.parse(frozen.payloadJSON).methodIntroduction.methods.length, count);
    if (mode === "auto") {
      const legacy = await s.root.collection("assessments").doc(d.sessionId).get(); assert.equal(legacy.exists, true);
      assert.equal(legacy.data().learningProfile.methodEvidence.length, count); assert.deepEqual(JSON.parse(frozen.payloadJSON).baseline, d.completed.baseline);
    } else {
      assert.deepEqual(row.completionDetails.methodIntroduction, d.completed.methodIntroduction);
      assert.deepEqual(row.completionDetails.reflection, d.completed.reflection);
      assert.equal((await s.root.get()).data().learningProfile, null); assert.equal((await s.root.collection("assessments").get()).size, 0);
    }
    assert.deepEqual(await quotas(s), before); assert.deepEqual(h.counts(), { activity: 1, clears: 1, legacy: 0 });
    const admission = (await s.root.collection("learningProfiles").doc("journalAdmission").get()).data();
    assert.equal(admission.authority, "NOT VERIFIED"); assert.equal(admission.admitted, false); assert.equal(admission.publicationEligible, false);
    assert.equal((await s.root.collection("learningProfiles").doc("cumulative").get()).data().persistenceVersion, 3);
    assert.equal((await s.root.collection("learningProfiles").doc("journalControl").get()).data().published, null);
    assert.equal((await s.root.collection("learningProfiles").doc("developmentPublicationStage3b").get()).exists, false);
    assert.deepEqual((await complete(s, frozen.payloadJSON)).body, receipt);
    // Browser loss after acknowledgment cannot delete immutable Manual details.
    await h.box.close(); await new Promise((resolve, reject) => { const deleted = h.factory.deleteDatabase("edulience.training-completion.local.v1.demo-edulience-phase2a");
      deleted.onsuccess = resolve; deleted.onerror = reject; });
    assert.deepEqual((await s.root.collection("learningEvidence").doc(receipt.evidenceId).get()).data(), row);
  });
test("lost successful response, refresh, repeated retries and another completion preserve exact receipts and quota", async () => {
  const s = await student(), d = draft(s), factory = new IDBFactory(); await reserve(s, d); const before = await quotas(s);
  const h = client(s, { factory, lose: true }); const frozen = await h.service.prepare(d, "2026-10-24T11:00:00Z");
  await assert.rejects(h.service.resume(s.uid, d.sessionId), /response lost/); assert.equal(h.counts().clears, 0);
  const refreshed = client(s, { factory }), receipt = await refreshed.service.resume(s.uid, d.sessionId);
  assert.equal(h.sent[0], refreshed.sent[0]); assert.equal(h.sent[0], frozen.payloadJSON);
  const retries = await Promise.all(Array.from({ length: 8 }, () => complete(s, frozen.payloadJSON)));
  retries.forEach(r => { assert.equal(r.status, 200); assert.deepEqual(r.body, receipt); });
  const second = draft(s, "manual", 1); await reserve(s, second); const afterSecondReservation = await quotas(s);
  const next = client(s); await next.service.prepare(second); await next.service.resume(s.uid, second.sessionId);
  assert.deepEqual(await quotas(s), afterSecondReservation); assert.equal((await s.root.collection("learningEvidence").get()).size, 2);
  assert.equal(before[0].data.testMeStarted, afterSecondReservation[0].data.testMeStarted);
});
test("two tabs cannot replace an in-flight payload; direct simultaneous identical/conflicting retries are atomic", async () => {
  const s = await student(), d = draft(s, "manual", 1), factory = new IDBFactory(); await reserve(s, d); const before = await quotas(s);
  let release; const wait = new Promise(resolve => { release = resolve; }); const a = client(s, { factory, wait }), b = client(s, { factory });
  const frozen = await a.service.prepare(d); const first = a.service.resume(s.uid, d.sessionId);
  while (!a.sent.length) await new Promise(resolve => setTimeout(resolve, 5));
  await assert.rejects(b.service.resume(s.uid, d.sessionId), e => e.code === "completion_busy"); release(); const receipt = await first;
  const changed = JSON.parse(frozen.payloadJSON); changed.reflection.reflectionText = "Conflicting completed Reflection";
  const results = await Promise.all([complete(s, frozen.payloadJSON), complete(s, frozen.payloadJSON), complete(s, changed)]);
  assert.deepEqual(results.map(r => r.status), [200, 200, 409]); assert.deepEqual(results[0].body, receipt);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await quotas(s), before);
});
for (const conflicting of [false, true]) test(`simultaneous first HTTP completions (${conflicting ? "conflicting" : "identical"}) enroll and accept exactly once`, async () => {
  const s = await student(), d = draft(s, "manual", 1), h = client(s); await reserve(s, d); const before = await quotas(s);
  const frozen = await h.service.prepare(d), changed = JSON.parse(frozen.payloadJSON); changed.reflection.reflectionText = "Different final result";
  const results = await Promise.all([complete(s, frozen.payloadJSON), complete(s, conflicting ? changed : frozen.payloadJSON)]);
  assert.equal(results.filter(r => r.status === 200).length, conflicting ? 1 : 2);
  if (conflicting) assert.equal(results.filter(r => r.status === 409).length, 1); else assert.deepEqual(results[0].body, results[1].body);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await quotas(s), before);
});
test("a reconstructed backend recovers an original accepted receipt after commit and lost response", async () => {
  const s = await student(), d = draft(s, "manual", 1), factory = new IDBFactory(); await reserve(s, d); const before = await quotas(s);
  const h = client(s, { factory, lose: true }); const frozen = await h.service.prepare(d);
  await assert.rejects(h.service.resume(s.uid, d.sessionId), /response lost/);
  const saved = (await records(s.root.collection("learningEvidence")))[0].data.receipt;
  await reconstructBackend();
  const restored = client(s, { factory }); assert.deepEqual(await restored.service.resume(s.uid, d.sessionId), saved);
  assert.equal(restored.sent[0], frozen.payloadJSON); assert.deepEqual(await quotas(s), before);
});
test("refresh during reservation lookup preserves the exact full checkpoint and timestamp, without rerunning Baseline", async () => {
  const s = await student(), d = draft(s), factory = new IDBFactory(); await reserve(s, d); let lookup = false;
  const a = client(s, { factory, reservation: async () => { lookup = true; return new Promise(() => {}); } });
  const frozen = await a.service.prepare(d, "2026-10-25T08:23:45Z"); void a.service.resume(s.uid, d.sessionId);
  while (!lookup) await new Promise(resolve => setTimeout(resolve, 5));
  const b = client(s, { factory }); await b.box.claim(s.uid, d.sessionId, "refreshed", Date.now() + 60_001); await b.box.release(s.uid, d.sessionId, "refreshed");
  await b.service.resume(s.uid, d.sessionId); const stored = await b.box.get(s.uid, d.sessionId);
  assert.equal(stored.payloadJSON, frozen.payloadJSON); assert.equal(stored.draftJSON, frozen.draftJSON);
  assert.equal(JSON.parse(stored.payloadJSON).completedAt, "2026-10-25T08:23:45.000Z"); assert.equal(a.sent.length, 0);
});
test("account switching fences late acknowledgment; the other account cannot enumerate or complete the first session", async () => {
  const s = await student(), other = await student(), d = draft(s), factory = new IDBFactory(); await reserve(s, d);
  let owner = s.uid; const h = client(s, { factory, owner: () => owner }), frozen = await h.service.prepare(d);
  const real = h.deps.transport; h.deps.transport = async (...args) => { const receipt = await real(...args); owner = other.uid; return receipt; };
  // Factory captures dependencies by object reference, as the real client does.
  await assert.rejects(h.service.resume(s.uid, d.sessionId), /owner changed/); assert.equal(h.counts().clears, 0);
  assert.deepEqual(await h.box.list(other.uid), []); const wrong = await complete(other, frozen.payloadJSON); assert.notEqual(wrong.status, 200);
  assert.equal((await other.root.collection("learningEvidence").get()).size, 0);
  const restored = client(s, { factory }); await restored.service.resume(s.uid, d.sessionId); assert.equal((await s.root.collection("learningEvidence").get()).size, 1);
});
test("missing reservation keeps protected evidence pending without legacy writes or retroactive quota", async () => {
  const s = await student(), d = draft(s), h = client(s); await h.service.prepare(d);
  await assert.rejects(h.service.resume(s.uid, d.sessionId), e => e.code === "protected_reservation_required");
  assert.deepEqual(h.counts(), { activity: 0, clears: 0, legacy: 0 }); assert.deepEqual(await quotas(s), []);
  assert.equal((await h.box.get(s.uid, d.sessionId)).finalized, false);
});
test("origin revocation and expired Auth tokens reject receipt replay while preserving acknowledged evidence", async () => {
  const s = await student(), d = draft(s, "manual", 1); await reserve(s, d); const h = client(s, { activityFail: true }); await h.service.prepare(d);
  await assert.rejects(h.service.resume(s.uid, d.sessionId), /activity offline/); const before = await records(s.root.collection("learningEvidence"));
  const segments = s.token.split("."), body = JSON.parse(Buffer.from(segments[1], "base64url")); body.exp = Math.floor(Date.now() / 1000) - 60;
  const expired = { ...s, token: [segments[0], Buffer.from(JSON.stringify(body)).toString("base64url"), segments[2]].join(".") };
  assert.equal((await complete(expired, (await h.box.get(s.uid, d.sessionId)).payloadJSON)).status, 401);
  await origin.revoke(s.token, { reason: "operator-demo" }); await assert.rejects(h.service.resume(s.uid, d.sessionId));
  assert.deepEqual(await records(s.root.collection("learningEvidence")), before); assert.equal(h.counts().clears, 0);
  assert.equal((await h.box.get(s.uid, d.sessionId)).receipt.status, "accepted");
});
test("actual SDK ABORTED plus deletion before retry rejects atomically, retaining the browser completion and quotas", async () => {
  const s = await student(), d = draft(s, "manual", 1); await reserve(s, d); const h = client(s); await h.service.prepare(d); const before = await quotas(s);
  const life = await authority.read(s.token), context = { uid: life.uid, lifecycleEpoch: life.lifecycleEpoch, writerProtocol: life.writerProtocol,
    namespaceVersion: life.namespaceVersion, fence: life.fence, revision: life.revision };
  const original = Firestore.prototype.runTransaction; let abort = false, deleting = false;
  Firestore.prototype.runTransaction = function(callback, options) {
    return original.call(this, async raw => {
      if (abort && !deleting) { deleting = true; await authority.transition(s.token, context, "deleting"); }
      let evidenceWrite = false;
      const tx = new Proxy(raw, { get(target, key) { const value = target[key];
        if (key === "create") return (ref, ...args) => { if (ref.path.startsWith(`${s.root.path}/learningEvidence/`)) evidenceWrite = true; return value.call(target, ref, ...args); };
        return typeof value === "function" ? value.bind(target) : value; } });
      const value = await callback(tx);
      if (evidenceWrite && !abort) { abort = true; const error = new Error("injected SDK ABORTED"); error.code = 10; throw error; }
      return value;
    }, options);
  };
  try { await assert.rejects(h.service.resume(s.uid, d.sessionId)); }
  finally { Firestore.prototype.runTransaction = original; }
  assert.equal(abort, true); assert.equal(deleting, true); assert.equal((await authority.read(s.token)).state, "deleting");
  assert.equal((await s.root.collection("learningEvidence").get()).size, 0); assert.equal((await s.root.collection("assessments").get()).size, 0);
  assert.equal((await s.root.collection("learningProfiles").doc("journalControl").collection("journal").get()).size, 0);
  assert.deepEqual(await quotas(s), before); assert.equal((await h.box.get(s.uid, d.sessionId)).receipt, null);
});
test("disabled service is 404 and a non-loopback browser Origin is rejected without writes", async () => {
  const disabled = api.createProtectedTrainingApp(), local = disabled.app.listen(0, "127.0.0.1"); await once(local, "listening");
  try { const response = await fetch(`http://127.0.0.1:${local.address().port}/api/development/training/complete-protected-v2`, { method: "POST" }); assert.equal(response.status, 404); }
  finally { await new Promise(resolve => local.close(resolve)); await disabled.close(); }
  const remote = await fetch(base + "/api/training/access", { headers: { origin: "https://edulience.space" } }); assert.equal(remote.status, 403);
});
test("demo access never promotes trusted admission and cannot be borrowed by workers or another callback attempt", async () => {
  const s = await student(), transport = api.createStage2EmulatorTransport(), guard = api.createSharedWriterGuard(transport);
  try {
    const owner = await guard.authenticate(s.token); let cached;
    await guard.transaction(async tx => { cached = await guard.read(tx, owner);
      guard.assertDevelopmentTrainingAccess(cached, tx);
      assert.throws(() => guard.assertJournalAccess(cached, tx), /writer_protected_admission_not_verified/);
      assert.equal(cached.protectedAdmissionEligible, false); assert.equal(cached.publicationEligible, false);
    });
    await assert.rejects(guard.transaction(async tx => guard.assertDevelopmentTrainingAccess(cached, tx)), /writer_guard_transaction_required/);
    await assert.rejects(guard.transaction(async tx => { const worker = await guard.read(tx, guard.worker(s.uid)); guard.assertDevelopmentTrainingAccess(worker, tx); }), /writer_guard_transaction_required/);
  } finally { await transport.close(); }
});
test("disabled Firebase Auth account cannot submit frozen evidence or consume another quota", async () => {
  const s = await student(), d = draft(s), h = client(s); await reserve(s, d); await h.service.prepare(d); const before = await quotas(s);
  await operator.getAuthClient().updateUser(s.uid, { disabled: true });
  await assert.rejects(h.service.resume(s.uid, d.sessionId)); assert.deepEqual(await quotas(s), before);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 0); assert.equal((await h.box.get(s.uid, d.sessionId)).receipt, null);
});

/** Reproduce the audit failure AFTER a genuine SDK commit, not a mocked phase.
 * This loses the begin/page acknowledgment and reconstructs every app client. */
async function interruptedPreparation(s, d, point) {
  await reserve(s, d); const factory = new IDBFactory(), h = client(s, { factory });
  const frozen = await h.service.prepare(d, "2026-10-24T08:23:45.000Z"), before = await quotas(s);
  const original = Firestore.prototype.runTransaction; let interrupted = false;
  Firestore.prototype.runTransaction = async function(callback, options) {
    let committedPoint = false;
    const result = await original.call(this, raw => callback(new Proxy(raw, { get(target, key) {
      const value = target[key];
      if (key === "create" || key === "set") return (ref, data, ...args) => {
        if (point === "begin" ? ref.path === s.seal.path && data.phase === "sealing"
          : ref.path.startsWith(`${s.seal.path}/attempts/`) && ref.path.includes("/pages/")) committedPoint = true;
        return value.call(target, ref, data, ...args);
      };
      return typeof value === "function" ? value.bind(target) : value;
    } })), options);
    if (committedPoint && !interrupted) { interrupted = true; const error = new Error(`crash after actual ${point} commit`); error.code = 14; throw error; }
    return result;
  };
  try { await assert.rejects(h.service.resume(s.uid, d.sessionId)); }
  finally { Firestore.prototype.runTransaction = original; }
  assert.equal(interrupted, true);
  const control = await s.seal.get(); assert.equal(control.data().phase, "sealing");
  const saved = await s.seal.collection("attempts").doc(control.data().sealId).get();
  assert.equal(saved.data().manifest, null); const pages = (await saved.ref.collection("pages").get()).docs;
  assert.equal(pages.length, point === "page" ? 1 : 0);
  const pointer = (await s.seal.collection("trainingRecovery").doc("current").get()).data();
  const checkpoint = await s.seal.collection("trainingRecoveryAttempts").doc(pointer.attemptId).get();
  assert.equal(checkpoint.data().completion.sessionId, d.sessionId); assert.equal(checkpoint.data().sequence, 1);
  assert.equal(checkpoint.data().requestId, saved.data().handle.requestId);
  assert.equal((await h.box.get(s.uid, d.sessionId)).payloadJSON, frozen.payloadJSON);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 0); assert.deepEqual(await quotas(s), before);
  await reconstructBackend();
  return { factory, h, frozen, before, control, saved, pages, checkpoint };
}
for (const point of ["begin", "page"]) test(`recovery repair: crash after ${point}, reconstructed backend and refresh recover one exact completion`, async () => {
  const s = await student(), d = draft(s, point === "begin" ? "auto" : "manual", point === "begin" ? 3 : 1);
  const interrupted = await interruptedPreparation(s, d, point), restored = client(s, { factory: interrupted.factory });
  const receipt = await restored.service.resume(s.uid, d.sessionId);
  for (let i = 0; i < 3; i++) { const result = await complete(s, interrupted.frozen.payloadJSON); assert.equal(result.status, 200); assert.deepEqual(result.body, receipt); }
  const stored = await restored.box.get(s.uid, d.sessionId);
  assert.equal(stored.payloadJSON, interrupted.frozen.payloadJSON); assert.equal(stored.draftJSON, interrupted.frozen.draftJSON);
  assert.equal(JSON.parse(stored.payloadJSON).completedAt, "2026-10-24T08:23:45.000Z"); assert.equal(stored.finalized, true);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await quotas(s), interrupted.before);
  assert.deepEqual((await interrupted.checkpoint.ref.get()).data(), interrupted.checkpoint.data());
  assert.ok((await interrupted.checkpoint.ref.get()).updateTime.isEqual(interrupted.checkpoint.updateTime));
  for (const page of interrupted.pages) { const now = await page.ref.get(); assert.deepEqual(now.data(), page.data()); assert.ok(now.updateTime.isEqual(page.updateTime)); }
  assert.equal((await s.seal.collection("trainingRecoveryAttempts").get()).size, 1);
  assert.equal((await s.root.collection("learningProfiles").doc("journalAdmission").get()).data().seal.sealId, interrupted.saved.id);
  assert.equal(restored.counts().legacy, 0); assert.equal(receipt.status, "accepted"); assert.equal(Object.hasOwn(receipt, "profileRevision"), false);
});
for (const point of ["begin", "page"]) test(`recovery repair: cancellation after ${point} allocates a new durable round, retaining the frozen session`, async () => {
  const s = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, point);
  const sealer = api.createInventorySealer(); try { await sealer.cancel(s.token, old.saved.data().handle); } finally { await sealer.close(); }
  const current = client(s, { factory: old.factory }), receipt = await current.service.resume(s.uid, d.sessionId);
  const rounds = await records(s.seal.collection("trainingRecoveryAttempts")); assert.equal(rounds.length, 2);
  const next = rounds.find(row => row.id !== old.checkpoint.id).data;
  assert.equal(next.sequence, 2); assert.equal(next.previousAttemptId, old.checkpoint.id);
  assert.notEqual(next.requestId, old.checkpoint.data().requestId); assert.deepEqual(next.completion, old.checkpoint.data().completion);
  assert.equal(next.scope.sourceRevision, old.checkpoint.data().scope.sourceRevision + 1);
  assert.deepEqual((await old.saved.ref.get()).data(), old.saved.data()); assert.ok((await old.saved.ref.get()).updateTime.isEqual(old.saved.updateTime));
  for (const page of old.pages) assert.deepEqual((await page.ref.get()).data(), page.data());
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await quotas(s), old.before);
  assert.equal((await current.box.get(s.uid, d.sessionId)).payloadJSON, old.frozen.payloadJSON);
  for (let i = 0; i < 3; i++) assert.deepEqual((await complete(s, old.frozen.payloadJSON)).body, receipt);
});
test("recovery repair: conflicting payload and another owner's token cannot adopt the durable attempt", async () => {
  const s = await student(), other = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, "page");
  const conflicting = JSON.parse(old.frozen.payloadJSON); conflicting.reflection.reflectionText = "Different frozen result";
  const result = await complete(s, conflicting); assert.equal(result.status, 409); assert.equal(result.body.code, "completion_conflict");
  assert.deepEqual((await s.seal.get()).data(), old.control.data());
  const wrongOwner = await complete(other, old.frozen.payloadJSON); assert.notEqual(wrongOwner.status, 200);
  assert.deepEqual((await old.checkpoint.ref.get()).data(), old.checkpoint.data());
  assert.equal((await other.root.collection("learningEvidence").get()).size, 0);
  const restored = client(s, { factory: old.factory }); await restored.service.resume(s.uid, d.sessionId);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1); assert.deepEqual(await quotas(s), old.before);
});
for (const closed of ["deleting", "origin-revoked", "disabled-auth"]) test(`recovery repair: ${closed} before resumption rejects without evidence or checkpoint changes`, async () => {
  const s = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, "page");
  if (closed === "origin-revoked") await origin.revoke(s.token, { reason: "operator-demo" });
  else if (closed === "disabled-auth") await operator.getAuthClient().updateUser(s.uid, { disabled: true });
  else { const life = await authority.read(s.token); await authority.transition(s.token, { uid: life.uid, lifecycleEpoch: life.lifecycleEpoch,
    writerProtocol: life.writerProtocol, namespaceVersion: life.namespaceVersion, fence: life.fence, revision: life.revision }, "deleting"); }
  const restored = client(s, { factory: old.factory }); await assert.rejects(restored.service.resume(s.uid, d.sessionId));
  assert.equal((await s.root.collection("learningEvidence").get()).size, 0); assert.deepEqual(await quotas(s), old.before);
  assert.deepEqual((await old.checkpoint.ref.get()).data(), old.checkpoint.data());
  assert.equal((await restored.box.get(s.uid, d.sessionId)).payloadJSON, old.frozen.payloadJSON); assert.equal(restored.counts().legacy, 0); assert.equal(restored.counts().clears, 0);
});
test("recovery repair: account switching during interrupted recovery retains the original owner's browser evidence", async () => {
  const s = await student(), other = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, "begin");
  let currentOwner = other.uid; const switched = client(s, { factory: old.factory, owner: () => currentOwner });
  await assert.rejects(switched.service.resume(s.uid, d.sessionId), e => e.code === "completion_owner_changed");
  assert.deepEqual(await switched.box.list(other.uid), []); assert.equal(switched.sent.length, 0);
  currentOwner = s.uid; await switched.service.resume(s.uid, d.sessionId);
  assert.equal((await switched.box.get(s.uid, d.sessionId)).payloadJSON, old.frozen.payloadJSON); assert.deepEqual(await quotas(s), old.before);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1);
});
test("recovery repair: a lost acceptance response after resuming a page checkpoint returns the original receipt after another restart", async () => {
  const s = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, "page");
  const lost = client(s, { factory: old.factory, lose: true }); await assert.rejects(lost.service.resume(s.uid, d.sessionId), /response lost/);
  const saved = (await records(s.root.collection("learningEvidence")))[0].data;
  assert.equal((await lost.box.get(s.uid, d.sessionId)).receipt, null); assert.equal(lost.counts().clears, 0);
  await reconstructBackend(); const restored = client(s, { factory: old.factory });
  assert.deepEqual(await restored.service.resume(s.uid, d.sessionId), saved.receipt);
  assert.equal(restored.sent[0], old.frozen.payloadJSON); assert.equal((await s.root.collection("learningEvidence").get()).size, 1);
  assert.equal((await s.seal.collection("trainingRecoveryAttempts").get()).size, 1); assert.deepEqual(await quotas(s), old.before);
});
test("recovery repair: a correctly hashed but stale-epoch checkpoint cannot authorize resumption", async () => {
  const s = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, "begin"), data = old.checkpoint.data();
  const stale = api.createTrainingRecoveryAttempt({ ...data.context, lifecycleEpoch: data.context.lifecycleEpoch + 1 }, data.completion, data.scope);
  await s.seal.collection("trainingRecoveryAttempts").doc(stale.attemptId).create({ ...stale });
  const pointer = s.seal.collection("trainingRecovery").doc("current"); await pointer.update({ attemptId: stale.attemptId }); const corrupted = await pointer.get();
  const restored = client(s, { factory: old.factory }); await assert.rejects(restored.service.resume(s.uid, d.sessionId), e => e.code === "writer_stale_context");
  assert.deepEqual((await pointer.get()).data(), corrupted.data()); assert.deepEqual((await s.seal.get()).data(), old.control.data());
  assert.equal((await s.root.collection("learningEvidence").get()).size, 0); assert.deepEqual(await quotas(s), old.before);
  assert.equal((await restored.box.get(s.uid, d.sessionId)).payloadJSON, old.frozen.payloadJSON);
});
test("recovery repair: pre-repair unbound sealing is never adopted; explicit cancellation permits a fresh bound round", async () => {
  const s = await student(), d = draft(s, "manual", 1); await reserve(s, d); const h = client(s), frozen = await h.service.prepare(d), before = await quotas(s);
  const t = api.createStage2EmulatorTransport(), guard = api.createSharedWriterGuard(t), sealer = api.createInventorySealer();
  let handle;
  try {
    const principal = await guard.authenticate(s.token), context = (await guard.transaction(tx => guard.read(tx, principal))).context;
    handle = await sealer.begin(s.token, api.protectedSealRequest(context));
    await assert.rejects(h.service.resume(s.uid, d.sessionId), e => e.code === "protected_training_recovery_unbound");
    assert.equal((await s.seal.collection("trainingRecoveryAttempts").get()).size, 0);
    assert.equal((await s.root.collection("learningEvidence").get()).size, 0);
    await sealer.cancel(s.token, handle);
  } finally { await sealer.close(); await t.close(); }
  await reconstructBackend(); const receipt = await h.service.resume(s.uid, d.sessionId);
  const admission = (await s.root.collection("learningProfiles").doc("journalAdmission").get()).data();
  assert.notEqual(admission.seal.requestId, handle.requestId); assert.equal(receipt.status, "accepted");
  assert.equal((await h.box.get(s.uid, d.sessionId)).payloadJSON, frozen.payloadJSON); assert.deepEqual(await quotas(s), before);
  assert.equal((await s.root.collection("learningEvidence").get()).size, 1);
});
test("recovery repair: rolled-back seal counters cannot masquerade as a committed begin", async () => {
  const s = await student(), d = draft(s, "manual", 1), old = await interruptedPreparation(s, d, "begin");
  await s.seal.update({ revision: old.checkpoint.data().scope.sealRevision, attemptCount: 0 });
  const rolledBack = await s.seal.get(), restored = client(s, { factory: old.factory });
  await assert.rejects(restored.service.resume(s.uid, d.sessionId), e => e.code === "protected_training_recovery_cutoff_changed");
  assert.deepEqual((await s.seal.get()).data(), rolledBack.data()); assert.equal((await s.root.collection("learningEvidence").get()).size, 0);
  assert.equal((await restored.box.get(s.uid, d.sessionId)).payloadJSON, old.frozen.payloadJSON); assert.deepEqual(await quotas(s), old.before);
});
