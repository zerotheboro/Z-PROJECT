import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { completionFixture } from "../completionFixtures.mjs";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";
import { createTrainingCompletionService } from "../../dist-backend/backend/trainingCompletion.js";

assert.equal(process.versions.node.split(".")[0], "24");
assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
Object.assign(process.env, { TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_AUTHORITY_STAGE4A: "emulator-only" });
const bundled = await build({ stdin: { resolveDir: process.cwd(), loader: "ts", contents:
  ['authority', 'authorityContracts', 'acceptanceTransport', 'acceptance', 'acceptanceState'].map(name => `export * from "./backend/scalability/${name}";`).join("\n") +
  '\nexport { encodeFirestoreTrainingDraft, decodeFirestoreTrainingDraft } from "./src/services/trainingDraftFirestoreCodec";' },
  bundle: true, write: false, platform: "node", target: "node24", format: "esm", packages: "external" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/authority-test-api.mjs", bundled.outputFiles[0].text);
const api = await import("../../dist-stage2/authority-test-api.mjs");
const tools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment, assertFails, assertSucceeds } = tools("@firebase/rules-unit-testing"), web = tools("firebase/firestore");
const apps = tools("firebase/app"), authentication = tools("firebase/auth"), browserResources = [];
web.setLogLevel("silent");
let transport, db, service, rules;
const now = Date.parse("2026-10-24T10:00:00.000Z");
before(async () => {
  const config = JSON.parse(await readFile("firebase.stage4a-emulator.json", "utf8"));
  assert.equal(config.emulators.firestore.host, "127.0.0.1"); assert.equal(config.emulators.firestore.port, 18787);
  assert.equal(config.emulators.auth.host, "127.0.0.1"); assert.equal(config.emulators.auth.port, 9099);
  assert.equal(config.firestore.rules, "test-support/firestore/stage4a-demo.rules");
  transport = api.createStage2EmulatorTransport(); db = transport.getFirestore(); service = api.createAuthorityPrototype();
  rules = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile(config.firestore.rules, "utf8") } });
});
after(async () => {
  await service?.close(); await transport?.close(); await rules?.cleanup();
  // Do not leave prototype rules installed in the shared LOCAL Emulator.
  const restored = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile("test-support/firestore/owner-supplied.rules", "utf8") } }); await restored.cleanup();
});
afterEach(async () => {
  for (const item of browserResources.splice(0)) {
    await authentication.signOut(item.auth); await web.terminate(item.client); await apps.deleteApp(item.app);
  }
});
async function identity(customUID) {
  const app = apps.initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-stage4a-only", authDomain: "localhost" }, "stage4a-" + crypto.randomUUID());
  const auth = authentication.getAuth(app); authentication.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const client = web.getFirestore(app); web.connectFirestoreEmulator(client, "127.0.0.1", 18787);
  browserResources.push({ app, auth, client });
  let credentials;
  if (customUID === undefined) credentials = await authentication.createUserWithEmailAndPassword(auth,
    "stage4a-" + crypto.randomUUID() + "@example.test", "synthetic-emulator-password");
  else {
    // Auxiliary Auth client is explicit, credential-free and demo-only, like the
    // guarded service transport. No ADC/default app or production fallback.
    const adminApp = initializeAdminApp({ projectId: "demo-edulience-phase2a",
      credential: { getAccessToken: async () => ({ access_token: "owner", expires_in: 3600 }) } }, "stage4a-uid-" + crypto.randomUUID());
    try {
      const admin = getAdminAuth(adminApp); await admin.createUser({ uid: customUID });
      credentials = await authentication.signInWithCustomToken(auth, await admin.createCustomToken(customUID));
    } finally { await deleteAdminApp(adminApp); }
  }
  const uid = credentials.user.uid, token = await credentials.user.getIdToken();
  return { uid, token, client };
}
async function account(protectedOwner = true, customUID) {
  const { uid, token, client } = await identity(customUID);
  const root = db.doc(`users/${uid}`), life = db.collection(api.LIFECYCLE_COLLECTION).doc(uid);
  const owner = { uid, token, root, life, client };
  if (protectedOwner) await service.protectSyntheticOwner(owner.token);
  return owner;
}
async function snapshot(o) {
  const result = [];
  async function walk(ref) {
    const row = await ref.get(); result.push([ref.path, row.data() ?? null]);
    for (const group of await ref.listCollections()) for (const child of await group.listDocuments()) await walk(child);
  }
  await walk(o.root); await walk(o.life); return result.sort((a, b) => a[0].localeCompare(b[0]));
}
async function denied(o, operation) {
  const before = await snapshot(o); await assertFails(operation()); assert.deepEqual(await snapshot(o), before);
}
async function rejected(o, operation, predicate) {
  const before = await snapshot(o); await assert.rejects(operation(), predicate); assert.deepEqual(await snapshot(o), before);
}
const context = async o => api.writerContext(await service.read(o.token));
const probe = (id = "safe-evidence", kind = "evidence-probe") => ({ id, kind, payload: { description: "Synthetic coordination exercise 🧠", score: 0.75 } });
async function reserve(o, input) {
  return createFirebaseTrainingQuotaManager({ now: () => now, getFirestore: () => db }).reserve(o.uid,
    { sessionId: input.sessionId, mode: input.mode, methodIds: input.mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
}

test("new synthetic protection has a genuine root creation binding but NEVER bootstrap/publication authority", async () => {
  const o = await account(), life = await service.read(o.token), root = await o.root.get();
  assert.equal(life.admissionEligibility, "NOT VERIFIED");
  assert.deepEqual(life.rootCreatedAt, { seconds: root.createTime.seconds, nanoseconds: root.createTime.nanoseconds });
  const assessment = await service.assessFreshAuthority(o.token);
  assert.equal(assessment.authority, "NOT VERIFIED"); assert.equal(assessment.publicationEligible, false);
  assert.ok(assessment.classifications.some(row => row.namespace === "quizAttempts"));
  assert.ok(assessment.reasons.includes("pre_lifecycle_history_unverifiable"));
  assert.equal((await o.root.collection("learningEvidence").get()).size, 0);
  assert.equal((await o.root.collection("learningProfiles").doc("developmentPublicationStage3b").get()).exists, false);
});
test("missing lifecycle and an already existing empty root never establish freshness", async () => {
  const o = await account(false); await rejected(o, () => service.read(o.token));
  assert.equal((await service.assessFreshAuthority(o.token)).authority, "NOT VERIFIED");
  await o.root.set({ learningProfile: null });
  await rejected(o, () => service.protectSyntheticOwner(o.token), error => error.code === "authority_root_origin_unverifiable");
});
for (const namespace of ["assessments", "quizAttempts", "learningEvidence", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex", "trainingProgress", "trainingActivity", "trainingStats", "learningProfiles"]) {
  test(`existing ${namespace} is preserved and prevents fresh protection`, async () => {
    const o = await account(false); if (namespace === "quizAttempts") await o.root.set({ learningProfile: null });
    await o.root.collection(namespace).doc("legacy-record").set({ historical: true });
    await rejected(o, () => service.protectSyntheticOwner(o.token), error => error.code === "authority_existing_history_requires_review");
    const assessment = await service.assessFreshAuthority(o.token); assert.equal(assessment.authority, "NOT VERIFIED");
    assert.ok(assessment.reasons.includes("observed_history_requires_review"));
  });
}
for (const orphan of ["learningProfiles/journalControl/journal/old-entry", "learningProfiles/journalControl/completionArchives/old-archive",
  "learningProfiles/journalControl/acceptanceBatches/old-batch", "learningProfiles/shadow-old/artifacts/old-artifact", "unknownLearning/parent/records/old"]) {
  test(`missing parent/root does not hide orphan ${orphan}`, async () => {
    const o = await account(false); await db.doc(`${o.root.path}/${orphan}`).set({ orphaned: true });
    assert.equal((await o.root.get()).exists, false);
    await rejected(o, () => service.protectSyntheticOwner(o.token), error => error.code === "authority_existing_history_requires_review");
  });
}
test("orphan lifecycle events cannot be overwritten by a new protection record", async () => {
  const o = await account(false); await o.life.collection("events").doc("0000000000000001").set({ priorDeletion: true });
  await rejected(o, () => service.protectSyntheticOwner(o.token), error => error.code === "authority_orphan_lifecycle_history");
});
test("scan capacity is disclosed by failure, never treated as an empty inventory", async () => {
  const o = await account(false), batch = db.batch();
  for (let n = 0; n <= api.AUTHORITY_LIMITS.scanDocuments; n++) batch.create(o.root.collection("quizAttempts").doc(String(n)), { historical: true });
  await batch.commit(); await rejected(o, () => service.assessFreshAuthority(o.token), error => error.code === "authority_scan_incomplete");
});
test("root ordinary fields remain editable; all server profile/identity fields are protected", async () => {
  const o = await account();
  await assertSucceeds(web.updateDoc(web.doc(o.client, o.root.path), { name: "Demo student", photoURL: "", preferences: { compact: true } }));
  for (const field of ["learningProfile", "latestAssessmentId", "learningProfileUpdatedAt", "uid", "createdAt", "trainingLifecycleBinding"])
    await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { [field]: "forged" }));
  await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { trainingLifecycleBinding: web.deleteField() }));
  await denied(o, () => web.deleteDoc(web.doc(o.client, o.root.path)));
});
test("client recreation is denied; privileged same-binding root recreation is detected", async () => {
  const o = await account(), original = (await o.root.get()).data(), life = (await o.life.get()).data();
  await o.root.delete();
  const browserCopy = { ...original, createdAt: new web.Timestamp(original.createdAt.seconds, original.createdAt.nanoseconds) };
  await denied(o, () => web.setDoc(web.doc(o.client, o.root.path), browserCopy));
  await rejected(o, () => service.read(o.token), error => error.code === "authority_root_missing");
  await o.root.set(original);
  await rejected(o, () => service.read(o.token), error => error.code === "authority_root_recreated");
  assert.deepEqual((await o.life.get()).data(), life);
});
for (const suffix of ["learningEvidence/protected", "learningEvidenceIdentityEvents/protected", "learningEvidenceSourceIndex/protected",
  "learningProfiles/cumulative", "learningProfiles/journalControl/journal/protected", "learningProfiles/journalControl/acceptanceBatches/protected",
  "learningProfiles/acceptanceCheckpoint", "learningProfiles/shadow-fixture/artifacts/protected", "trainingReservations/protected", "trainingUsage/2026-10-24"]) {
  test(`catch-all cannot bypass create/update/delete denial at ${suffix}`, async () => {
    const o = await account(), ref = db.doc(`${o.root.path}/${suffix}`);
    if (!(await ref.get()).exists) await ref.set({ synthetic: true });
    await denied(o, () => web.updateDoc(web.doc(o.client, ref.path), { synthetic: false }));
    await denied(o, () => web.deleteDoc(web.doc(o.client, ref.path)));
    await denied(o, () => web.setDoc(web.doc(o.client, ref.path + "-new"), { synthetic: true }));
  });
}
test("legacy browser assessment/quiz sequences and root merges fail after protection", async () => {
  const o = await account();
  for (const namespace of ["assessments", "quizAttempts"]) {
    const ref = o.root.collection(namespace).doc("legacy-writer");
    await denied(o, () => web.setDoc(web.doc(o.client, ref.path), { status: "completed", learningProfile: {}, createdAt: web.serverTimestamp() }, { merge: true }));
    await denied(o, () => web.setDoc(web.doc(o.client, ref.path + "/nested/bypass"), { bypass: true }));
  }
  await denied(o, () => web.setDoc(web.doc(o.client, o.root.path), { learningProfile: {}, latestAssessmentId: "legacy-writer" }, { merge: true }));
});
test("non-protected legacy accounts retain existing root/assessment/quiz/profile permissions", async () => {
  const o = await account(false);
  await assertSucceeds(web.setDoc(web.doc(o.client, o.root.path), { uid: o.uid, learningProfile: null, preferences: {} }));
  for (const namespace of ["assessments", "quizAttempts"]) await assertSucceeds(web.setDoc(web.doc(o.client, `${o.root.path}/${namespace}/existing-contract`), { historical: true }));
  await assertSucceeds(web.updateDoc(web.doc(o.client, o.root.path), { learningProfile: { legacy: true } }));
  await assertSucceeds(web.deleteDoc(web.doc(o.client, o.root.path)));
});
test("cross-account and unauthenticated access cannot borrow lifecycle, evidence, root or source paths", async () => {
  const o = await account(), other = await account(); await o.root.collection("learningEvidence").doc("private").set({ private: true });
  for (const client of [other.client, rules.unauthenticatedContext().firestore()]) {
    for (const target of [o.root.path, `${o.root.path}/learningEvidence/private`, `${o.root.path}/learningProfiles/cumulative`, o.life.path]) {
      await assertFails(web.getDoc(web.doc(client, target))); await denied(o, () => web.setDoc(web.doc(client, target), { forged: true }));
    }
  }
  await assertFails(web.getDoc(web.doc(o.client, o.life.path))); await denied(o, () => web.setDoc(web.doc(o.client, o.life.path), { forged: true }));
  await rejected(o, () => service.read("invalid-token"));
  await rejected(other, async () => service.createImmutableProbe(other.token, await context(o), probe("cross-owner-context")));
});
test("real reserved drafts, Save & Exit updates and delete retain their existing format and methods", async () => {
  const o = await account(), input = completionFixture({ sessionId: "stage4a-draft-session", mode: "manual", count: 1 }); await reserve(o, input);
  const draft = { schemaVersion: 1, sessionId: input.sessionId, owner: { kind: "user", uid: o.uid }, mode: "manual", selectedMethods: input.selectedMethods,
    phase: "introduction", section: 3, completed: { baseline: null }, internalState: { options: api.encodeFirestoreTrainingDraft([["a", "b"], ["c", "d"]]) } };
  const ref = web.doc(o.client, `${o.root.path}/trainingProgress/active`);
  await assertSucceeds(web.setDoc(ref, draft));
  await assertSucceeds(web.updateDoc(ref, { section: 4, "completed.methodIntroduction": input.methodIntroduction }));
  assert.deepEqual(api.decodeFirestoreTrainingDraft((await web.getDoc(ref)).data().internalState.options), [["a", "b"], ["c", "d"]]);
  await assertSucceeds(web.deleteDoc(ref));
  await denied(o, () => web.setDoc(ref, { ...draft, sessionId: "unreserved-session" }));
  const automatic = completionFixture({ sessionId: "stage4a-auto-draft", mode: "auto", count: 3 }); await reserve(o, automatic);
  const quotaBeforeUpdates = (await o.root.collection("trainingUsage").get()).docs.map(row => row.data());
  await assertSucceeds(web.setDoc(ref, { ...draft, mode: "auto", phase: "situation", section: 1, sessionId: automatic.sessionId, selectedMethods: [] }));
  await assertSucceeds(web.updateDoc(ref, { phase: "introduction", section: 3, selectedMethods: automatic.selectedMethods }));
  await denied(o, () => web.updateDoc(ref, { selectedMethods: ["active-recall", "feynman", "cornell", "memory-palace"] }));
  await assertSucceeds(web.deleteDoc(ref));
  assert.deepEqual((await o.root.collection("trainingUsage").get()).docs.map(row => row.data()), quotaBeforeUpdates);
});
test("activity/streak transactions and Standard/Deep AI persistence remain permitted for active protected owners", async () => {
  const o = await account(), client = o.client;
  const daily = web.doc(client, `${o.root.path}/trainingActivity/2026-10-24`), stats = web.doc(client, `${o.root.path}/trainingStats/streak`);
  await assertSucceeds(web.runTransaction(client, async tx => {
    await tx.get(stats); await tx.get(daily);
    tx.set(daily, { dayKey: "2026-10-24", firstSessionId: "stage4a-activity", firstMode: "manual", methodIds: ["active-recall"], timezone: "UTC" });
    tx.set(stats, { currentStreak: 1, longestStreak: 1, lastCompletedDay: "2026-10-24", totalActiveDays: 1 });
  }));
  await assertSucceeds(web.updateDoc(stats, { longestStreak: 2 })); await denied(o, () => web.deleteDoc(daily));
  const recommendation = { schemaVersion: 1, inputs: { biggestProblem: "Synthetic study problem", methodQuestion: "Synthetic method question", extraContext: "" },
    result: { user_problem: "Synthetic", recommended_methods: [{ name: "Active recall", branch: "memory", reason: "Synthetic", warning: "Synthetic" }], study_plan: "Synthetic", final_note: "Synthetic" }, updatedAt: web.serverTimestamp() };
  for (const mode of ["standard", "deep"]) await assertSucceeds(web.setDoc(web.doc(client, `${o.root.path}/aiRecommendations/latest`), { ...recommendation, mode }));
  await assertSucceeds(web.getDoc(web.doc(client, `${o.root.path}/aiRecommendations/latest`)));
  await denied(o, () => web.setDoc(web.doc(client, `${o.root.path}/entitlements/current`), { plan: "premium" }));
});
test("coordinated immutable probes are quarantined, idempotent, conflicting-safe and tamper-evident", async () => {
  const o = await account(), first = await service.createImmutableProbe(o.token, await context(o), probe());
  assert.equal(first.acceptedTrainingEvidence, false);
  const before = await snapshot(o); assert.deepEqual(await service.createImmutableProbe(o.token, await context(o), probe()), first); assert.deepEqual(await snapshot(o), before);
  await rejected(o, async () => service.createImmutableProbe(o.token, await context(o), { ...probe(), payload: "conflict" }), error => error.code === "authority_immutable_conflict");
  await service.createImmutableProbe(o.token, await context(o), probe("safe-artifact", "artifact-probe"));
  const probes = await o.root.collection("learningProfiles").doc("authorityStage4a").collection("probes").get();
  await probes.docs[0].ref.update({ payload: "uncoordinated Admin tampering" }); // Admin BYPASSES rules; detection is not prevention.
  await rejected(o, () => service.read(o.token), error => error.code === "authority_uncoordinated_mutation");
  assert.equal((await service.assessFreshAuthority(o.token)).authority, "NOT VERIFIED");
});
test("missing coordination, stale epoch/context and malformed writer protocols reject before writes", async () => {
  const o = await account(), ctx = await context(o);
  for (const invalid of [undefined, { ...ctx, lifecycleEpoch: 2 }, { ...ctx, revision: 99 }, { ...ctx, writerProtocol: [api.AUTHORITY_PROTOCOL] }])
    await rejected(o, () => service.createImmutableProbe(o.token, invalid, probe()));
  const saved = (await o.life.get()).data(); await o.life.update({ writerProtocol: "incompatible" });
  await rejected(o, () => service.read(o.token));
  await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { name: "must not bypass malformed protection" }));
  await o.life.set({ ...saved, admissionEligibility: "VERIFIED" });
  assert.equal((await service.assessFreshAuthority(o.token)).authority, "NOT VERIFIED");
  await o.life.set({ ...saved, rootCreatedAt: { seconds: 1, nanoseconds: 0 } });
  await rejected(o, () => service.read(o.token), error => error.code === "authority_origin_invalid");
});
test("v1/v2 writers are fenced while an isolated coordinated probe commits; quota and actual evidence remain unchanged", async () => {
  const o = await account(), input = completionFixture({ sessionId: "stage4a-legacy-race", mode: "manual", count: 1 }); await reserve(o, input);
  const usage = (await o.root.collection("trainingUsage").get()).docs.map(row => row.data());
  const v1 = createTrainingCompletionService({ getFirestore: () => db }), v2 = api.createStage2AcceptanceService(transport);
  const ctx = await context(o);
  const results = await Promise.allSettled([v1.complete(o.uid, input), v2.accept(o.token, input), service.createImmutableProbe(o.token, ctx, probe())]);
  assert.deepEqual(results.map(result => result.status), ["rejected", "rejected", "fulfilled"]);
  assert.equal((await o.root.collection("learningEvidence").get()).size, 0); assert.equal((await o.root.collection("assessments").get()).size, 0);
  assert.deepEqual((await o.root.collection("trainingUsage").get()).docs.map(row => row.data()), usage);
});
test("a v1 completion prepared before protection cannot overwrite the new server fence", async () => {
  const o = await account(false), input = completionFixture({ sessionId: "stage4a-prepared-v1", mode: "manual", count: 1 }); await reserve(o, input);
  let release, prepared; const gate = new Promise(resolve => { release = resolve; }); const ready = new Promise(resolve => { prepared = resolve; });
  const v1 = createTrainingCompletionService({ getFirestore: () => db, onPrepared: async () => { prepared(); await gate; } });
  const pending = assert.rejects(v1.complete(o.uid, input)); await ready;
  try { await service.protectSyntheticOwner(o.token); } finally { release(); }
  await pending; assert.equal((await o.root.collection("learningEvidence").get()).size, 0);
  assert.equal((await o.root.collection("learningProfiles").doc("cumulative").get()).data().persistenceVersion, 3);
});
test("deletion racing coordinated acceptance either commits before deletion or rejects; tombstone survives root loss", async () => {
  const o = await account(), ctx = await context(o);
  const results = await Promise.allSettled([service.createImmutableProbe(o.token, ctx, probe()), service.transition(o.token, ctx, "deleting")]);
  assert.ok(results.some(row => row.status === "fulfilled"));
  let life = await service.read(o.token);
  if (life.state === "active") { await service.transition(o.token, api.writerContext(life), "deleting"); life = await service.read(o.token); }
  await rejected(o, () => service.createImmutableProbe(o.token, ctx, probe("too-late")));
  await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { name: "late-browser-write" }));
  await o.root.delete();
  await service.transition(o.token, api.writerContext(life), "deleted");
  const tombstone = (await o.life.get()).data(); assert.equal(tombstone.state, "deleted");
  assert.equal((await service.read(o.token)).state, "deleted");
  await denied(o, () => web.setDoc(web.doc(o.client, o.root.path), { learningProfile: null }));
  await denied(o, () => web.deleteDoc(web.doc(o.client, o.life.path)));
  await rejected(o, () => service.protectSyntheticOwner(o.token)); assert.deepEqual((await o.life.get()).data(), tombstone);
  const deleted = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=demo-stage4a-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: o.token }) });
  assert.equal(deleted.status, 200); await rejected(o, () => service.read(o.token));
  assert.deepEqual((await o.life.get()).data(), tombstone);
});

async function fillProbes(o, count) {
  for (let n = 0; n < count; n++) await service.createImmutableProbe(o.token, await context(o), probe("capacity-" + n));
}
async function ledger(o) {
  return (await o.life.collection("events").orderBy("__name__").get()).docs.map(row => ({ id: row.id, data: row.data() }));
}
async function coordinatedSnapshot(o) {
  // Read ALL persisted fields/IDs in the exact coordinator write set, using
  // bounded collection queries rather than a listCollections RPC per leaf.
  const profile = o.root.collection("learningProfiles").doc("authorityStage4a");
  const [root, life, fence, events, probes] = await Promise.all([o.root.get(), o.life.get(),
    o.root.collection("learningProfiles").doc("cumulative").get(), ledger(o), profile.collection("probes").orderBy("__name__").get()]);
  return { root: root.data() ?? null, life: life.data() ?? null, fence: fence.data() ?? null, events,
    probes: probes.docs.map(row => ({ id: row.id, data: row.data() })) };
}
async function rejectedCoordinated(o, operation, predicate) {
  const before = await coordinatedSnapshot(o); await assert.rejects(operation(), predicate);
  assert.deepEqual(await coordinatedSnapshot(o), before);
}
async function forcedRetry(operation) {
  const original = Firestore.prototype.runTransaction; let attempts = 0;
  Firestore.prototype.runTransaction = function(callback, options) {
    return original.call(this, async tx => {
      attempts++; const result = await callback(tx);
      if (attempts === 1) { const error = new Error("Synthetic retry before commit"); error.code = 10; throw error; }
      return result;
    }, options);
  };
  try { await operation(); assert.equal(attempts, 2); }
  finally { Firestore.prototype.runTransaction = original; }
}

test("repair: original 99-probe deletion completes at revision 101 without rewriting previous events", async () => {
  const o = await account(); await fillProbes(o, 99);
  const previous = await ledger(o); assert.equal(previous.length, 99);
  await service.transition(o.token, await context(o), "deleting");
  assert.equal((await service.read(o.token)).revision, 100);
  await service.transition(o.token, await context(o), "deleted");
  const life = await service.read(o.token), events = await ledger(o);
  assert.equal(life.state, "deleted"); assert.equal(life.revision, 101); assert.equal(life.fence, 3);
  assert.deepEqual(events.slice(0, 99), previous); assert.equal(events[99].data.kind, "deleting"); assert.equal(events[100].data.kind, "deleted");
  assert.equal((await service.assessFreshAuthority(o.token)).authority, "NOT VERIFIED");
});
test("repair: exhausted probes cannot consume deletion reserves; races, retries and failed commits preserve all events", async () => {
  const o = await account(); await fillProbes(o, api.AUTHORITY_LIMITS.probeEvents - 1);
  assert.equal((await service.read(o.token)).revision, 99);
  const lastProbeContext = await context(o);
  await forcedRetry(() => service.createImmutableProbe(o.token, lastProbeContext, probe("last-permitted-probe")));
  assert.equal((await service.read(o.token)).revision, 100);
  const originalEvents = await ledger(o); assert.equal(originalEvents.length, 100);
  await rejectedCoordinated(o, async () => service.createImmutableProbe(o.token, await context(o), probe("no-reserve-stealing")),
    error => error.code === "authority_prototype_capacity");

  // A real SDK transaction queues the deletion writes, then a storage failure is
  // injected before commit. No queued mutation may reach persisted state.
  const current = await context(o), originalTransaction = Firestore.prototype.runTransaction;
  Firestore.prototype.runTransaction = function(callback, options) {
    return originalTransaction.call(this, async tx => {
      await callback(tx); const error = new Error("Synthetic storage-size rejection"); error.code = "completion_document_limit"; throw error;
    }, options);
  };
  try { await rejectedCoordinated(o, () => service.transition(o.token, current, "deleting"), error => error.code === "completion_document_limit"); }
  finally { Firestore.prototype.runTransaction = originalTransaction; }
  assert.deepEqual(await ledger(o), originalEvents);

  const results = await Promise.allSettled([
    service.createImmutableProbe(o.token, current, probe("racing-full-probe")), service.transition(o.token, current, "deleting")
  ]);
  assert.deepEqual(results.map(row => row.status), ["rejected", "fulfilled"]);
  assert.equal((await service.read(o.token)).revision, 101);
  await rejectedCoordinated(o, async () => service.createImmutableProbe(o.token, await context(o), probe("during-deletion")));
  await rejectedCoordinated(o, async () => service.transition(o.token, await context(o), "deleting"));
  const deletionContext = await context(o);
  await forcedRetry(() => service.transition(o.token, deletionContext, "deleted"));
  const life = await service.read(o.token), events = await ledger(o);
  assert.equal(life.revision, 102); assert.equal(life.fence, 3); assert.equal(events.length, api.AUTHORITY_LIMITS.events);
  assert.deepEqual(events.slice(0, originalEvents.length), originalEvents);
  for (const target of ["deleting", "deleted"]) await rejectedCoordinated(o, async () => service.transition(o.token, await context(o), target));
  await rejectedCoordinated(o, async () => service.createImmutableProbe(o.token, await context(o), probe("after-deletion")));
  await rejectedCoordinated(o, () => service.protectSyntheticOwner(o.token));
  await o.root.delete(); assert.equal((await service.read(o.token)).state, "deleted");
  await rejectedCoordinated(o, () => web.setDoc(web.doc(o.client, o.root.path), { learningProfile: null }));
  assert.deepEqual(await ledger(o), events); assert.equal((await o.life.get()).data().state, "deleted");
});

const suffix = () => crypto.randomUUID().replaceAll("-", "").slice(0, 8);
for (const [name, makeUID] of [
  ["exact 50 Chinese + 8 ASCII", () => "\u754c".repeat(50) + suffix()],
  ["128 ASCII code units", () => "a".repeat(120) + suffix()],
  ["128 mixed multibyte code units", () => "\u754c".repeat(120) + suffix()],
  ["64 valid supplementary characters", () => "\u{1f9e0}".repeat(56) + Array.from(suffix(), char => String.fromCodePoint(0x1f600 + parseInt(char, 16))).join("")]
]) test(`repair: actual Firebase UID ${name} protects and round-trips without normalization`, async () => {
  const uid = makeUID(), o = await account(false, uid);
  assert.equal(await transport.verifyToken(o.token), uid);
  if (name.startsWith("exact")) { assert.equal(uid.length, 58); assert.equal(Buffer.byteLength(uid, "utf8"), 158); }
  const life = await service.protectSyntheticOwner(o.token), saved = (await o.life.get()).data();
  assert.equal(life.uid, uid); assert.equal(saved.uid, uid); assert.equal(Object.hasOwn(saved, "rootCreatedAt"), false);
  assert.deepEqual(api.parseStoredLifecycle(saved), saved); assert.equal((await service.read(o.token)).uid, uid);
  assert.deepEqual(life.rootCreatedAt, { seconds: (await o.root.get()).createTime.seconds, nanoseconds: (await o.root.get()).createTime.nanoseconds });
  await service.createImmutableProbe(o.token, await context(o), probe("unicode-owner-source"));
  assert.equal((await service.read(o.token)).revision, 1);
  assert.equal((await service.assessFreshAuthority(o.token)).authority, "NOT VERIFIED");
  await assertSucceeds(web.updateDoc(web.doc(o.client, o.root.path), { name: "Synthetic Unicode owner" }));
  await rejected(o, () => service.protectSyntheticOwner(o.token));
});
test("repair: rejected authenticated unsupported UIDs open zero write transactions and establish no lifecycle", async () => {
  const roots = async () => ({ users: (await db.collection("users").get()).docs.map(row => [row.id, row.data()]),
    lifecycles: (await db.collection(api.LIFECYCLE_COLLECTION).get()).docs.map(row => [row.id, row.data()]) });
  for (const uid of ["invalid/" + suffix(), "__unsupported-" + suffix() + "__", "bad-\ud800-" + suffix(), "bad-\udfff-" + suffix()]) {
    const previous = await roots(), original = Firestore.prototype.runTransaction; let writeTransactions = 0;
    Firestore.prototype.runTransaction = function(callback, options) {
      if (!options?.readOnly) writeTransactions++;
      return original.call(this, callback, options);
    };
    try {
      const person = await identity(uid);
      await assert.rejects(() => service.protectSyntheticOwner(person.token), error => error.code === "authentication_required");
      assert.equal(writeTransactions, 0);
    } finally { Firestore.prototype.runTransaction = original; }
    assert.deepEqual(await roots(), previous);
  }
});
test("repair: concurrent Unicode protection requests establish one original incarnation without partial state", async () => {
  const o = await account(false, "\u754c".repeat(50) + suffix());
  const results = await Promise.allSettled([service.protectSyntheticOwner(o.token), service.protectSyntheticOwner(o.token)]);
  assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
  const life = await service.read(o.token); assert.equal(life.revision, 0); assert.equal(life.fence, 1);
  assert.equal((await o.life.collection("events").get()).empty, true);
  assert.equal((await o.root.collection("learningProfiles").get()).size, 1);
  assert.equal((await o.root.get()).data().trainingLifecycleBinding, life.rootBinding);
  assert.equal(life.admissionEligibility, "NOT VERIFIED");
});
test("repair: pre-repair schema-1 Unicode lifecycle can be read without rewriting persisted state", async () => {
  const o = await account(false, "\u754c".repeat(50) + suffix()), binding = "c".repeat(64);
  // Exact OLD stored shape, deliberately not prepared through the repaired
  // constructor. Genuine creation metadata still comes from one transaction.
  const previous = { schemaVersion: 1, uid: o.uid, lifecycleEpoch: 1, state: "active", writerProtocol: api.AUTHORITY_PROTOCOL,
    writerIdentity: api.AUTHORITY_WRITER, namespaceVersion: api.SOURCE_NAMESPACE_VERSION, admissionEligibility: "NOT VERIFIED",
    rootBinding: binding, fence: 1, revision: 0, headHash: null };
  await db.runTransaction(async tx => {
    tx.create(o.root, { uid: o.uid, learningProfile: null, createdAt: FieldValue.serverTimestamp(), trainingLifecycleBinding: binding });
    tx.create(o.life, previous);
    tx.create(o.root.collection("learningProfiles").doc("cumulative"), { persistenceVersion: 3, writerProtocol: api.AUTHORITY_PROTOCOL,
      uid: o.uid, lifecycleEpoch: 1, rootBinding: binding });
  });
  const before = await snapshot(o);
  assert.equal((await service.read(o.token)).uid, o.uid);
  assert.equal((await service.assessFreshAuthority(o.token)).authority, "NOT VERIFIED");
  assert.deepEqual(await snapshot(o), before);
});
test("repair: supported Unicode owner identity is compatible with unchanged Stage 2 journal and evidence contracts", async () => {
  const o = await account(false, "\u754c".repeat(50) + suffix()); await o.root.set({ learningProfile: null });
  const v2 = api.createStage2AcceptanceService(transport), input = completionFixture({ sessionId: "stage4a-unicode-v2", mode: "manual", count: 1 });
  await reserve(o, input); await v2.admitFreshOwner(o.token); const receipt = await v2.accept(o.token, input);
  assert.equal(receipt.status, "accepted");
  assert.equal((await o.root.collection("learningEvidence").doc(receipt.evidenceId).get()).data().evidence.owner.uid, o.uid);
  assert.equal((await o.root.get()).data().learningProfile, null);
});
