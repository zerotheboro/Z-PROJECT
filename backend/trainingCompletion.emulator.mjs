import assert from "node:assert/strict";
import { test, before, beforeEach, after } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { completionFixture, COMPLETION_TEST_UID as UID } from "./completionFixtures.mjs";

const PROJECT = "demo-edulience-phase2a";
const HOST = "127.0.0.1:18787";
assert.ok(process.env.GCLOUD_PROJECT === PROJECT, "Explicit demo project required");
assert.ok(process.env.FIREBASE_PROJECT_ID === PROJECT && process.env.FIRESTORE_EMULATOR_HOST === HOST, "Explicit loopback emulator required");
assert.ok(!("GITHUB_PAT_TOKEN" in process.env) && !("GOOGLE_APPLICATION_CREDENTIALS" in process.env) && !("DEBUG" in process.env), "Inherited credentials/debug rejected");
const requireTools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment, assertFails, assertSucceeds } = requireTools("@firebase/rules-unit-testing");
const web = requireTools("firebase/firestore");
web.setLogLevel("silent");
const { initializeApp, deleteApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const { createTrainingCompletionService, validateCompletion, rebuildPersistedProjection, COMPLETION_LIMITS } = await import("../dist-backend/backend/trainingCompletion.js");
const { createRecommendationApp } = await import("../server.js");
const NOW = Date.parse("2026-10-20T10:00:00Z");
const rules = readFileSync(new URL("../test-support/firestore/owner-supplied.rules", import.meta.url), "utf8");
let app;
let db;
let rulesEnv;
const user = uid => db.collection("users").doc(uid);
const getRows = async (uid, collection) => (await user(uid).collection(collection).get()).docs.map(doc => ({ id: doc.id, data: doc.data() }));
const service = options => createTrainingCompletionService({ getFirestore: () => db, now: () => NOW, ...options });
async function reserve(input, uid = UID) {
  await user(uid).collection("trainingReservations").doc(input.sessionId).set({
    sessionId: input.sessionId, mode: input.mode, methodIds: input.mode === "auto" ? [] : input.selectedMethods,
    dayKey: "2026-10-18", plan: "premium", methodCount: input.mode === "manual" ? input.selectedMethods.length : 0
  });
  await user(uid).collection("trainingUsage").doc("2026-10-18").set({ testMeStarted: 1, manualMethodsStarted: 3 });
}
async function complete(input = completionFixture(), options) { await reserve(input); return service(options).complete(UID, input); }
async function projection() { return (await user(UID).collection("learningProfiles").doc("cumulative").get()).data(); }
async function emptyCompletionState() {
  for (const name of ["learningEvidence", "learningProfiles", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex", "assessments"]) assert.equal((await getRows(UID, name)).length, 0, name);
}
async function http(completionService = service()) {
  const app = createRecommendationApp({ trainingCompletionEnabled: true, trainingCompletionService: completionService,
    openAIClient: { responses: { create: () => { throw new Error("No paid calls permitted"); } } },
    billingConfig: { available: false, missing: [] }, logger: { info() {}, warn() {}, error() {}, log() {} },
    verifyFirebaseToken: async token => {
      if (["expired", "revoked", "invalid"].includes(token)) throw Object.assign(new Error("Rejected fixture"), { code: `auth/id-token-${token}` });
      return { uid: token === "other" ? "other-student" : UID };
    }
  });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  return { post: (input, token = "valid") => fetch(`http://127.0.0.1:${server.address().port}/api/training/complete`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(input)
  }), close: () => new Promise(resolve => server.close(resolve)) };
}
before(async () => {
  app = initializeApp({ projectId: PROJECT }, "phase2a-emulator-test");
  db = getFirestore(app); db.settings({ host: HOST, ssl: false });
  rulesEnv = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: "127.0.0.1", port: 18787, rules } });
});
beforeEach(async () => { await rulesEnv.clearFirestore(); await user(UID).set({ name: "Safe fixture student", preferences: { unchanged: true } }); });
after(async () => { if (rulesEnv) await rulesEnv.cleanup(); if (db) await db.terminate(); if (app) await deleteApp(app); });

for (const count of [3, 4]) test(`automatic ${count}-method completion atomically stores native evidence, legacy/profile and identities`, async () => {
  const input = completionFixture({ count });
  const receipt = await complete(input);
  assert.equal(receipt.profileRevision, 1);
  assert.equal((await projection()).profile.observationCount, count + 2);
  assert.equal((await projection()).profile.methods.length, count);
  const legacy = (await user(UID).collection("assessments").doc(input.sessionId).get()).data();
  const expected = validateCompletion(UID, input, new Date(NOW).toISOString()).legacy;
  const { createdAt, ...body } = legacy;
  assert.deepEqual(body, expected);
  assert.equal(createdAt.toMillis(), NOW);
  assert.deepEqual((await user(UID).get()).data().learningProfile, expected.learningProfile);
  assert.equal((await getRows(UID, "learningEvidence")).length, 1);
  assert.equal((await getRows(UID, "learningEvidenceSourceIndex")).length, 2);
});
for (const count of [1, 2, 3]) test(`manual ${count}-method completion does not replace automatic legacy profile`, async () => {
  const original = { sentinel: "legacy-auto-profile" }; await user(UID).set({ learningProfile: original }, { merge: true });
  const receipt = await complete(completionFixture({ mode: "manual", count }));
  assert.equal(receipt.legacyAssessmentId, null); assert.equal(receipt.legacyProfileUpdated, false);
  assert.deepEqual((await user(UID).get()).data().learningProfile, original);
  assert.equal((await getRows(UID, "assessments")).length, 0);
  assert.equal((await projection()).profile.observationCount, count + Math.min(2, count));
});
test("missing/invalid/expired/revoked authentication and forged UID/path fail before writes", async () => {
  const input = completionFixture(); await reserve(input); const endpoint = await http();
  try {
    for (const token of [null, "invalid", "expired", "revoked"]) assert.equal((await endpoint.post(input, token)).status, 401);
    for (const key of ["uid", "owner", "documentPath", "receipt", "quota"]) assert.equal((await endpoint.post({ ...input, [key]: UID })).status, 400);
    await emptyCompletionState();
  } finally { await endpoint.close(); }
});
test("another user's authenticated request cannot use the owner's reservation", async () => {
  const input = completionFixture(); await reserve(input); const endpoint = await http();
  try { assert.equal((await endpoint.post(input, "other")).status, 403); await emptyCompletionState(); }
  finally { await endpoint.close(); }
});
test("valid authenticated route completes using Admin-backed Emulator persistence", async () => {
  const input = completionFixture(); await reserve(input); const endpoint = await http();
  try { assert.equal((await endpoint.post(input)).status, 200); assert.equal((await projection()).revision, 1); }
  finally { await endpoint.close(); }
});
test("missing reservation and mismatched mode/method order reject without partial writes", async () => {
  const input = completionFixture();
  await assert.rejects(service().complete(UID, input), error => error.status === 403);
  await reserve(input);
  await user(UID).collection("trainingReservations").doc(input.sessionId).update({ mode: "manual" });
  await assert.rejects(service().complete(UID, input), error => error.status === 409);
  const manual = completionFixture({ mode: "manual", count: 2 }); await reserve(manual);
  await user(UID).collection("trainingReservations").doc(manual.sessionId).update({ methodIds: [...manual.selectedMethods].reverse() });
  await assert.rejects(service().complete(UID, manual), error => error.status === 409);
  await emptyCompletionState();
});
test("identical retry returns exact original receipt after a newer revision and lost response", async () => {
  const input = completionFixture(); const first = await complete(input);
  await complete(completionFixture({ sessionId: "session-phase2a-002", mode: "manual", count: 1 }));
  const retried = await service({ now: () => NOW + 86400000 }).complete(UID, input);
  assert.deepEqual(retried, first); assert.equal((await projection()).revision, 2);
  assert.equal((await getRows(UID, "learningEvidence")).length, 2);
});
test("conflicting same-session request gets 409 and leaves immutable data unchanged", async () => {
  const input = completionFixture(); const first = await complete(input);
  const changed = structuredClone(input); changed.reflection.reflectionText = "Different completed payload";
  await assert.rejects(service().complete(UID, changed), error => error.status === 409);
  assert.deepEqual(await service().complete(UID, input), first); assert.equal((await projection()).revision, 1);
});
test("simultaneous same-session completions produce one receipt/evidence/revision", async () => {
  const input = completionFixture(); await reserve(input);
  const results = await Promise.all([service().complete(UID, input), service().complete(UID, input)]);
  assert.deepEqual(results[0], results[1]); assert.equal((await projection()).revision, 1);
  assert.equal((await getRows(UID, "learningEvidence")).length, 1);
});
test("simultaneous different sessions rebuild after revision conflict without losing evidence", async () => {
  const a = completionFixture(); const b = completionFixture({ sessionId: "session-phase2a-002", mode: "manual", count: 1 });
  await reserve(a); await reserve(b);
  const receipts = await Promise.all([service().complete(UID, a), service().complete(UID, b)]);
  assert.deepEqual(receipts.map(x => x.profileRevision).sort(), [1, 2]);
  assert.equal((await projection()).profile.sessionCount, 2);
});
test("forced Firestore callback retry is deterministic and has no external callback side effects", async () => {
  const input = completionFixture(); await reserve(input); let callbackCount = 0;
  const wrapped = { collection: name => db.collection(name), runTransaction: callback => db.runTransaction(async tx => {
    callbackCount++; const result = await callback(tx);
    if (callbackCount === 1) throw Object.assign(new Error("Forced retry"), { code: 10 });
    return result;
  }) };
  const receipt = await service({ getFirestore: () => wrapped }).complete(UID, input);
  assert.ok(callbackCount >= 2); assert.equal(receipt.profileRevision, 1);
  assert.equal((await getRows(UID, "learningEvidence")).length, 1);
});
test("legacy source inserted between preparation/transaction forces full repreparation", async () => {
  const input = completionFixture(); let prepared = 0;
  const legacy = validateCompletion(UID, completionFixture({ sessionId: "legacy-other-session" }), new Date(NOW).toISOString()).legacy;
  const receipt = await complete(input, { onPrepared: async () => {
    if (prepared++ === 0) await user(UID).collection("assessments").doc("historical-id").set({ ...legacy, createdAt: new Date(NOW - 86400000) });
  } });
  assert.equal(receipt.profileRevision, 1); assert.ok(prepared >= 2); assert.equal((await projection()).profile.sessionCount, 2);
});
test("persistent source changes exhaust preparation safely with no published partial evidence", async () => {
  const input = completionFixture(); let generation = 0;
  const legacy = validateCompletion(UID, input, new Date(NOW).toISOString()).legacy;
  await reserve(input);
  await assert.rejects(service({ onPrepared: async () => {
    await user(UID).collection("assessments").doc("moving-legacy").set({ ...legacy, createdAt: new Date(NOW + generation++) });
  } }).complete(UID, input), error => error.code === "completion_contention");
  for (const name of ["learningEvidence", "learningProfiles", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex"]) assert.equal((await getRows(UID, name)).length, 0);
});
test("late earlier completion cannot overwrite a newer known automatic legacy profile", async () => {
  const newer = completionFixture({ date: "2026-10-19T12:00:00Z" }); await complete(newer);
  const older = completionFixture({ sessionId: "session-older-0001", date: "2026-10-19T09:00:00Z", score: 0.5 });
  const receipt = await complete(older);
  assert.equal(receipt.legacyProfileUpdated, false);
  assert.equal((await user(UID).get()).data().latestAssessmentId, newer.sessionId);
  assert.equal((await projection()).profile.sessionCount, 2);
});
test("same-session legacy snapshot is preserved and never double-counted", async () => {
  const input = completionFixture(); const legacy = validateCompletion(UID, input, new Date(NOW).toISOString()).legacy;
  const ref = user(UID).collection("assessments").doc(input.sessionId);
  await ref.set({ ...legacy, createdAt: new Date(NOW - 1000) }); const original = (await ref.get()).data();
  await complete(input);
  assert.deepEqual((await ref.get()).data(), original); assert.equal((await projection()).profile.sessionCount, 1);
});
test("frozen legacy identity can be linked to native without overwriting or counting both", async () => {
  const input = completionFixture(); const legacy = validateCompletion(UID, input, new Date(NOW).toISOString()).legacy;
  await user(UID).collection("assessments").doc(input.sessionId).set({ ...legacy, createdAt: new Date(NOW - 1000) });
  await complete(completionFixture({ sessionId: "session-manual-other", mode: "manual", count: 1 }));
  assert.equal((await projection()).profile.sessionCount, 2);
  await complete(input);
  assert.equal((await projection()).profile.sessionCount, 2);
  assert.equal((await getRows(UID, "learningEvidence")).length, 3); // Superseded immutable legacy source retained.
});
test("conflicting legacy snapshot/identity claims fail closed without replacing evidence", async () => {
  const input = completionFixture(); const legacy = validateCompletion(UID, input, new Date(NOW).toISOString()).legacy;
  await user(UID).collection("assessments").doc(input.sessionId).set({ ...legacy, reflection: { ...input.reflection, reflectionText: "Conflicting stored reflection" } });
  await reserve(input);
  await assert.rejects(service().complete(UID, input), error => error.status === 409);
  assert.equal((await getRows(UID, "learningEvidence")).length, 0);
});
test("deleting a legacy snapshot later cannot delete its immutable completed evidence", async () => {
  const first = completionFixture(); await complete(first);
  await user(UID).collection("assessments").doc(first.sessionId).delete();
  await complete(completionFixture({ sessionId: "session-second-manual", mode: "manual", count: 1 }));
  assert.equal((await projection()).profile.sessionCount, 2);
});
test("failed commit after queued writes leaves zero partial database state", async () => {
  const input = completionFixture(); await reserve(input);
  const failed = { collection: name => db.collection(name), runTransaction: callback => db.runTransaction(async tx => {
    await callback(tx); throw new Error("Injected failure before commit");
  }) };
  await assert.rejects(service({ getFirestore: () => failed }).complete(UID, input)); await emptyCompletionState();
});
test("offline Firestore fails closed, then retry succeeds with the same reservation", async () => {
  const input = completionFixture(); await reserve(input);
  await assert.rejects(service({ getFirestore: () => { throw new Error("Unavailable"); } }).complete(UID, input));
  await emptyCompletionState(); await service().complete(UID, input);
});
test("midnight, expired entitlement, Save/Exit and completion retries do not charge/refund quota", async () => {
  const input = completionFixture(); await reserve(input);
  await user(UID).collection("entitlements").doc("current").set({ plan: "premium", expiresAt: new Date(NOW - 1000) });
  const before = (await user(UID).collection("trainingUsage").doc("2026-10-18").get()).data();
  await service().complete(UID, input);
  await service({ now: () => NOW + 86400000 }).complete(UID, input);
  assert.deepEqual((await user(UID).collection("trainingUsage").doc("2026-10-18").get()).data(), before);
  assert.equal((await user(UID).collection("trainingUsage").get()).size, 1);
});
test("source/history limits reject safely instead of publishing an approximation", async () => {
  const input = completionFixture(); await reserve(input);
  const batch = db.batch();
  for (let i = 0; i <= COMPLETION_LIMITS.historyDocuments; i++) batch.set(user(UID).collection("assessments").doc(`legacy-${i}`), { marker: "bounded-input-fixture" });
  await batch.commit();
  await assert.rejects(service().complete(UID, input), error => error.code === "completion_preparation_limit");
  assert.equal((await getRows(UID, "learningEvidence")).length, 0);
});
test("exact 64-KiB valid payload accepted; one byte beyond the limit rejected", async () => {
  const input = completionFixture();
  for (const metadata of input.metadata) metadata.protocol = {
    assessmentVersion: "fixture-v1", scoringVersion: "fixture-accuracy-v1",
    questions: [1, 2, 3, 4].map(i => ({ questionId: `q${i}`, difficulty: "medium", offeredOptionCount: 16,
      offeredOptionIds: Array.from({ length: 16 }, (_, index) => `${index}-`) }))
  };
  let remaining = 65536 - Buffer.byteLength(JSON.stringify(input));
  for (const metadata of input.metadata) for (const question of metadata.protocol.questions) {
    for (let i = 0; i < question.offeredOptionIds.length; i++) {
      const grow = Math.min(remaining, 256 - question.offeredOptionIds[i].length);
      question.offeredOptionIds[i] += "x".repeat(grow); remaining -= grow;
    }
  }
  assert.equal(remaining, 0); assert.equal(Buffer.byteLength(JSON.stringify(input)), 65536);
  await reserve(input); const endpoint = await http();
  try {
    assert.equal((await endpoint.post(input)).status, 200);
    input.reflection.reflectionText += "x";
    assert.equal((await endpoint.post(input)).status, 413);
    assert.equal((await projection()).revision, 1);
  } finally { await endpoint.close(); }
});
test("oversized historical source bytes fail before any completion is published", async () => {
  const input = completionFixture(); await reserve(input);
  const legacy = validateCompletion(UID, input, new Date(NOW).toISOString()).legacy;
  const batch = db.batch();
  for (let i = 0; i < 5; i++) batch.set(user(UID).collection("assessments").doc(`large-${i}`), { ...legacy, padding: "x".repeat(700000) });
  await batch.commit();
  await assert.rejects(service().complete(UID, input), error => error.code === "completion_preparation_limit");
  assert.equal((await getRows(UID, "learningEvidence")).length, 0);
  assert.equal((await getRows(UID, "learningProfiles")).length, 0);
});
test("inconsistent observation timestamps rejected; equivalent UTC offsets accepted", async () => {
  const input = completionFixture({ date: "2026-10-19T09:00:00Z" });
  for (const metadata of input.metadata) metadata.completedAt = "2026-10-19T10:00:00Z";
  await reserve(input);
  await assert.rejects(service().complete(UID, input), error => error.status === 400);
  await emptyCompletionState();
  input.completedAt = "2026-10-19T12:00:00+02:00";
  await service().complete(UID, input); assert.equal((await projection()).revision, 1);
});
test("historical ambiguous timestamps and partial counts stay unknown without dropping observations", async () => {
  const legacy = validateCompletion(UID, completionFixture(), new Date(NOW).toISOString()).legacy;
  delete legacy.methodLab.experiments[0].correct;
  await user(UID).collection("assessments").doc("ambiguous-history").set({ ...legacy, completedAt: "2026-10-18T09:00:00", createdAt: "2026-10-18T09:00:00" });
  await complete(completionFixture({ mode: "manual", count: 1 }));
  const stored = (await getRows(UID, "learningEvidence")).find(row => row.data.evidence.provenance.kind === "legacy-assessment").data.evidence;
  assert.equal(stored.completedAt, null); assert.equal(stored.recordedAt, null);
  assert.equal(stored.observations.find(item => item.methodId === "active-recall" && item.phase === "lab").performance.correct, null);
  assert.equal((await projection()).profile.observationCount, 7);
});
test("editing an already frozen legacy source is a conflict, not an evidence rewrite", async () => {
  const input = completionFixture(); await complete(input);
  const ref = user(UID).collection("assessments").doc(input.sessionId);
  await ref.update({ "reflection.reflectionText": "Changed old snapshot" });
  const later = completionFixture({ sessionId: "session-later-manual", mode: "manual", count: 1 }); await reserve(later);
  await assert.rejects(service().complete(UID, later), error => error.code === "legacy_source_conflict");
  assert.equal((await projection()).revision, 1); assert.equal((await getRows(UID, "learningEvidence")).length, 1);
});
test("legacy save retry changing only createdAt does not block future sessions or rewrite evidence", async () => {
  const input = completionFixture(); await complete(input);
  const original = await getRows(UID, "learningEvidence");
  await user(UID).collection("assessments").doc(input.sessionId).update({ createdAt: new Date(NOW + 1000) });
  await complete(completionFixture({ sessionId: "session-after-save-retry", mode: "manual", count: 1 }));
  assert.equal((await projection()).profile.sessionCount, 2);
  assert.deepEqual((await getRows(UID, "learningEvidence")).find(row => row.id === original[0].id), original[0]);
});
test("timestamp-shaped legacy maps cannot hide changed performance from source fingerprints", async () => {
  const legacy = validateCompletion(UID, completionFixture(), new Date(NOW).toISOString()).legacy;
  legacy.methodLab.seconds = 123; legacy.methodLab.nanoseconds = 0;
  const ref = user(UID).collection("assessments").doc("timestamp-looking-map"); await ref.set(legacy);
  await complete(completionFixture({ mode: "manual", count: 1 }));
  legacy.methodLab.experiments[0].score = 0.5; legacy.methodLab.experiments[0].correct = 2;
  await ref.update({ methodLab: legacy.methodLab });
  const later = completionFixture({ sessionId: "session-after-map-tamper", mode: "manual", count: 1 }); await reserve(later);
  await assert.rejects(service().complete(UID, later), error => error.code === "legacy_source_conflict");
  assert.equal((await projection()).revision, 1);
});
test("full history and source index rebuild deterministically under shuffled inputs", async () => {
  await complete(completionFixture());
  await complete(completionFixture({ sessionId: "session-second-manual", mode: "manual", count: 1, score: 0.5 }));
  const evidence = await getRows(UID, "learningEvidence"); const sources = await getRows(UID, "learningEvidenceSourceIndex"); const events = await getRows(UID, "learningEvidenceIdentityEvents");
  const rebuilt = rebuildPersistedProjection(UID, evidence, sources, events).profile;
  assert.deepEqual(rebuilt, (await projection()).profile);
  assert.deepEqual(rebuilt, rebuildPersistedProjection(UID, evidence.reverse(), sources.reverse(), events.reverse()).profile);
  assert.ok(Buffer.byteLength(JSON.stringify(await projection())) <= 200 * 1024);
});
test("browser cannot tamper with backend evidence/profile/identity/index or cross-account reads", async () => {
  const receipt = await complete(); const own = rulesEnv.authenticatedContext(UID).firestore(); const other = rulesEnv.authenticatedContext("other").firestore();
  for (const [collection, id] of [["learningEvidence", receipt.evidenceId], ["learningProfiles", "cumulative"]]) {
    const fullPath = `users/${UID}/${collection}/${id}`;
    await assertSucceeds(web.getDoc(web.doc(own, fullPath)));
    await assertFails(web.setDoc(web.doc(own, fullPath), { forged: true }));
    await assertFails(web.deleteDoc(web.doc(own, fullPath)));
    await assertFails(web.getDoc(web.doc(other, fullPath)));
  }
  for (const name of ["learningEvidenceIdentityEvents", "learningEvidenceSourceIndex"]) {
    const [{ id }] = await getRows(UID, name);
    await assertFails(web.getDoc(web.doc(own, `users/${UID}/${name}/${id}`)));
    await assertFails(web.setDoc(web.doc(own, `users/${UID}/${name}/${id}`), { forged: true }));
  }
});
