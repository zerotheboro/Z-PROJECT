import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import { build } from "esbuild";
import { once } from "node:events";
import { completionFixture } from "../completionFixtures.mjs";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";
import { createTrainingCompletionService } from "../../dist-backend/backend/trainingCompletion.js";

assert.equal(process.versions.node.split(".")[0], "24");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
for (const key of ["GITHUB_TOKEN", "GH_TOKEN", "GITHUB_PAT_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON", "DEBUG"])
  assert.equal(Object.hasOwn(process.env, key), false);
process.env.TRAINING_JOURNAL_STAGE2 = "emulator-only";
const bundled = await build({ stdin: { contents: 'export * from "./backend/scalability/acceptance"; export * from "./backend/scalability/acceptanceTransport"; export * from "./backend/scalability/acceptanceState"; export * as batches from "./backend/scalability/acceptanceBatches"; export * as journal from "./backend/scalability/journal"; export * as inventory from "./backend/scalability/inventory"; export * as values from "./backend/scalability/values"; export * from "./backend/scalability/acceptanceApp"; export { digest, validateCompletion } from "./backend/trainingCompletionContract";', resolveDir: process.cwd(), loader: "ts" },
  write: false, bundle: true, packages: "external", platform: "node", target: "node24", format: "esm" });
// External package resolution needs a real module URL; build to an ignored local
// artifact in the dedicated opt-in bundle, never the active backend bundle.
const { writeFile, mkdir } = await import("node:fs/promises");
await mkdir("dist-stage2", { recursive: true });
await writeFile("dist-stage2/emulator-api.mjs", bundled.outputFiles[0].text);
const api = await import("../../dist-stage2/emulator-api.mjs");
let transport, db, service, uid, token;
const NOW = Date.parse("2026-10-22T12:00:00.000Z");
const refs = () => api.acceptanceReferences(db, uid);
const quota = clock => createFirebaseTrainingQuotaManager({ now: () => clock ?? NOW, getFirestore: () => db });
async function account() {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-stage2-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `stage2-${crypto.randomUUID()}@example.test`, password: "synthetic-emulator-password", returnSecureToken: true }) });
  assert.equal(response.status, 200); const value = await response.json();
  return { uid: value.localId, token: value.idToken };
}
async function reservation(input, clock) {
  await quota(clock).reserve(uid, { sessionId: input.sessionId, mode: input.mode,
    methodIds: input.mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
}
async function admit() { return service.admitFreshOwner(token); }
async function rows(namespace) { return (await refs().user.collection(namespace).get()).docs; }
async function state() {
  const r = refs();
  const names = ["learningEvidence", "assessments", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex"];
  return { groups: await Promise.all(names.map(async name => (await rows(name)).map(row => [row.id, row.data()]))),
    journal: (await r.journal.get()).docs.map(row => [row.id, row.data()]), archives: (await r.archives.get()).docs.map(row => [row.id, row.data()]),
    control: (await r.control.get()).data(), root: (await r.user.get()).data(), work: (await r.work.get()).data(),
    checkpoint: (await r.checkpoint.get()).data(), batches: (await r.batches.get()).docs.map(row => [row.id, row.data()]) };
}
async function verifyJournal() {
  const r = refs(), control = (await r.control.get()).data(), admission = (await r.admission.get()).data();
  const entries = (await r.journal.get()).docs.map(doc => doc.data());
  const end = { uid, lifecycleEpoch: 1, revision: control.headRevision, headHash: control.headHash };
  const sourceRows = [];
  for (const name of ["learningEvidence", "learningEvidenceIdentityEvents"]) for (const row of await rows(name))
    sourceRows.push({ schemaVersion: 1, uid, lifecycleEpoch: 1, namespace: name, id: row.id, payload: row.data() });
  const continuity = api.journal.verifyJournalContinuity(admission.bootstrap.source, end, entries);
  const proof = api.inventory.verifyInventoryProof({ bootstrap: admission.bootstrap, bootstrapReferences: [], journalPrefix: entries, sources: sourceRows }, end);
  assert.equal(proof.consistency, "verified"); assert.equal(proof.authority, "NOT VERIFIED");
  assert.equal(continuity.acceptedSessionIds.length, control.nativeAcceptedCount);
  const batches = (await r.batches.get()).docs.map(doc => {
    const batch = api.batches.parseAcceptanceBatch(doc.data()); assert.equal(batch.batchId, doc.id); return batch;
  }).sort((a, b) => a.ordinal - b.ordinal);
  assert.equal(batches.length, continuity.acceptedSessionIds.length);
  let checkpoint = api.batches.initialAcceptanceCheckpoint({ uid, lifecycleEpoch: 1 });
  batches.forEach((batch, index) => {
    assert.equal(batch.ordinal, index + 1); assert.deepEqual(batch.previous, checkpoint);
    checkpoint = api.batches.checkpointForBatch(batch);
    api.batches.verifyAcceptanceCheckpoint({ ...control, nativeAcceptedCount: batch.ordinal,
      headRevision: batch.lastRevision, headHash: batch.headHash }, checkpoint, batch,
      entries.filter(entry => entry.revision >= batch.firstRevision && entry.revision <= batch.lastRevision), batches[index - 1]);
  });
  assert.deepEqual((await r.checkpoint.get()).data(), checkpoint);
  return { control, entries, proof };
}
before(async () => {
  transport = api.createStage2EmulatorTransport(); db = transport.getFirestore();
  await db.doc("users/stage2-connectivity").get(); // unavailable Emulator fails, never skips
  service = api.createStage2AcceptanceService(transport, { now: () => NOW });
});
beforeEach(async () => {
  ({ uid, token } = await account());
  await refs().user.set({ displayName: "Stage 2 synthetic student", preferences: { unchanged: true } });
});
after(async () => { if (transport) await transport.close(); });

test("fresh owner admission is transaction-proven, idempotent, and fences unchanged v1 writes", async () => {
  const admission = await admit(); assert.deepEqual(await admit(), admission);
  assert.equal((await refs().fence.get()).data().persistenceVersion, 2);
  assert.equal(Object.hasOwn((await refs().fence.get()).data(), "profile"), false);
  const input = completionFixture(); await reservation(input);
  await assert.rejects(createTrainingCompletionService({ getFirestore: () => db, now: () => NOW }).complete(uid, input), e => e.code === "completion_history_invalid");
  assert.equal((await rows("learningEvidence")).length, 0);
});
for (const namespace of ["learningEvidence", "assessments", "learningEvidenceIdentityEvents", "learningEvidenceSourceIndex", "learningProfiles",
  "trainingActivity", "trainingStats", "trainingProgress"])
  test(`existing ${namespace} rejects empty-history admission`, async () => {
    await refs().user.collection(namespace).doc("preexisting").set({ preserved: true });
    await assert.rejects(admit(), e => e.code === "stage2_bootstrap_required");
    assert.equal((await refs().admission.get()).exists, false); assert.equal((await refs().fence.get()).exists, false);
  });
test("existing incompatible v1 history/control and unverified client bootstrap cannot be admitted", async () => {
  const input = completionFixture(); await reservation(input);
  await createTrainingCompletionService({ getFirestore: () => db, now: () => NOW }).complete(uid, input);
  const before = await state();
  await assert.rejects(admit(), e => e.code === "stage2_bootstrap_required");
  assert.deepEqual(await state(), before);
  const recovered = await service.accept(token, input); assert.equal(recovered.schemaVersion, 1); assert.equal(recovered.profileRevision, 1);
  await assert.rejects(service.accept(token, { ...input, bootstrap: { verified: true } }), e => e.status === 400);
});
test("orphaned nested archive/journal records prevent false empty-history admission", async () => {
  await refs().archives.doc("orphaned").set({ preserved: true });
  await assert.rejects(admit(), e => e.code === "stage2_bootstrap_required");
  assert.equal((await refs().control.get()).exists, false);
});
test("a v1 request prepared before admission is fenced before its commit", async () => {
  const input = completionFixture(); await reservation(input);
  const v1 = createTrainingCompletionService({ getFirestore: () => db, now: () => NOW, onPrepared: async () => { await admit(); } });
  await assert.rejects(v1.complete(uid, input), e => e.code === "completion_history_invalid");
  assert.equal((await rows("learningEvidence")).length, 0);
  const result = await service.accept(token, input); assert.equal(result.acceptedRevision, 1);
});
for (const [mode, count] of [["auto", 3], ["auto", 4], ["manual", 1], ["manual", 2], ["manual", 3]])
  test(`atomic ${mode}/${count} accepts evidence, full archive, source identities and journal but not a profile`, async () => {
    await admit(); const input = completionFixture({ mode, count }); await reservation(input);
    const usage = (await refs().user.collection("trainingUsage").get()).docs.map(doc => doc.data());
    const receipt = await service.accept(token, input);
    assert.equal(receipt.schemaVersion, 2); assert.equal(receipt.status, "accepted"); assert.equal(receipt.acceptedRevision, 1);
    assert.equal(Object.hasOwn(receipt, "profileRevision"), false);
    const verified = await verifyJournal(); assert.equal(verified.control.headRevision, mode === "auto" ? 3 : 2);
    assert.equal((await rows("assessments")).length, mode === "auto" ? 1 : 0);
    const archive = (await refs().archives.doc(receipt.evidenceId).get()).data();
    assert.deepEqual(archive.payload, api.validateCompletion(uid, input, new Date(NOW).toISOString()).request);
    assert.deepEqual(archive.receipt, receipt);
    assert.equal((await refs().work.get()).data().status, "pending");
    assert.equal(Object.hasOwn((await refs().fence.get()).data(), "profile"), false);
    assert.deepEqual((await refs().user.collection("trainingUsage").get()).docs.map(doc => doc.data()), usage);
    if (mode === "manual") {
      const saved = (await refs().user.collection("learningEvidence").doc(receipt.evidenceId).get()).data();
      assert.deepEqual(saved.completionDetails, { schemaVersion: 1, methodIntroduction: input.methodIntroduction, reflection: input.reflection });
      assert.equal((await refs().user.get()).data().learningProfile, undefined);
    }
  });
test("original receipt survives many retries, lost response, expired Premium and missing reservation after commit", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  const original = await service.accept(token, input), before = await state();
  await refs().user.collection("trainingReservations").doc(input.sessionId).delete();
  for (let n = 0; n < 8; n++) assert.equal(JSON.stringify(await service.accept(token, input)), JSON.stringify(original));
  assert.deepEqual(await state(), before);
  const conflict = structuredClone(input); conflict.reflection.reflectionText = "Conflicting final reflection";
  await assert.rejects(service.accept(token, conflict), e => e.code === "completion_conflict");
  assert.deepEqual(await state(), before);
});

test("counter-only corruption after two automatic acceptances rejects the third completion atomically", async () => {
  await admit();
  const originalInputs = [0, 1].map(n => completionFixture({ sessionId: `counter-original-auto-${n}` }));
  const receipts = [];
  for (const input of originalInputs) { await reservation(input); receipts.push(await service.accept(token, input)); }
  const control = (await refs().control.get()).data();
  assert.equal(control.headRevision, 6); assert.equal(control.nativeAcceptedCount, 2);
  const next = completionFixture({ sessionId: "counter-original-manual-third", mode: "manual", count: 1 });
  await reservation(next);
  await refs().control.update({ nativeAcceptedCount: 3 });
  const before = await state();
  const reservations = (await rows("trainingReservations")).map(doc => [doc.id, doc.data()]);
  const usage = (await rows("trainingUsage")).map(doc => [doc.id, doc.data()]);
  const run = db.runTransaction.bind(db); let queuedWrites = 0;
  db.runTransaction = callback => run(tx => callback(new Proxy(tx, { get(target, key) {
    const value = target[key];
    if (["create", "set"].includes(key)) return (...args) => { queuedWrites++; return value.apply(target, args); };
    return typeof value === "function" ? value.bind(target) : value;
  } })));
  try { await assert.rejects(service.accept(token, next), error => error.code === "stage2_counter_integrity"); }
  finally { db.runTransaction = run; }
  assert.equal(queuedWrites, 0);
  assert.deepEqual(await state(), before);
  assert.deepEqual((await rows("trainingReservations")).map(doc => [doc.id, doc.data()]), reservations);
  assert.deepEqual((await rows("trainingUsage")).map(doc => [doc.id, doc.data()]), usage);
  // A valid-shaped unrelated count mismatch cannot destroy original receipt
  // recovery. No new checkpoint/control is synthesized on this read-only path.
  for (let n = 0; n < originalInputs.length; n++)
    assert.equal(JSON.stringify(await service.accept(token, originalInputs[n])), JSON.stringify(receipts[n]));
  assert.deepEqual(await state(), before);
  await assert.rejects(admit(), error => error.code === "stage2_counter_integrity");
});

test("mixed 3/2/3-entry batches advance exact ordinals and immutable predecessor commitments", async () => {
  await admit(); const r = refs();
  assert.deepEqual((await r.checkpoint.get()).data(), api.batches.initialAcceptanceCheckpoint({ uid, lifecycleEpoch: 1 }));
  for (const [n, mode] of [[0, "auto"], [1, "manual"], [2, "auto"]]) {
    const input = completionFixture({ sessionId: `counter-mixed-${n}`, mode, count: mode === "auto" ? 3 : 1 });
    await reservation(input); await service.accept(token, input); await verifyJournal();
  }
  const batches = (await r.batches.get()).docs.map(row => row.data()).sort((a, b) => a.ordinal - b.ordinal);
  assert.deepEqual(batches.map(batch => batch.ordinal), [1, 2, 3]);
  assert.deepEqual(batches.map(batch => [batch.firstRevision, batch.lastRevision]), [[1, 3], [4, 5], [6, 8]]);
  assert.equal(batches[2].previous.batchHash, batches[1].batchHash);
  assert.equal((await r.control.get()).data().nativeAcceptedCount, 3);
});

for (const corruption of ["counter-99", "missing-checkpoint", "malformed-checkpoint", "cross-owner-checkpoint", "substituted-checkpoint",
  "missing-batch", "substituted-batch", "malformed-batch", "missing-predecessor", "missing-batch-first-entry", "corrupt-tail", "forged-checkpoint-and-counter"])
  test(`committed checkpoint rejects ${corruption} without writes, charges, or receipt replacement`, async () => {
    await admit(); const r = refs(), originals = [], inputs = [];
    for (let n = 0; n < 2; n++) {
      const input = completionFixture({ sessionId: `counter-damage-auto-${n}` }); inputs.push(input);
      await reservation(input); originals.push(await service.accept(token, input));
    }
    const checkpoint = (await r.checkpoint.get()).data(), batchRef = r.batches.doc(checkpoint.batchId), batch = (await batchRef.get()).data();
    if (corruption === "counter-99") await r.control.update({ nativeAcceptedCount: 99 });
    if (corruption === "missing-checkpoint") await r.checkpoint.delete();
    if (corruption === "malformed-checkpoint") await r.checkpoint.update({ ordinal: [2] });
    if (corruption === "cross-owner-checkpoint") await r.checkpoint.update({ uid: "another-emulator-owner" });
    if (corruption === "substituted-checkpoint") await r.checkpoint.set(batch.previous);
    if (corruption === "missing-batch") await batchRef.delete();
    if (corruption === "substituted-batch") await batchRef.set((await r.batches.doc(batch.previous.batchId).get()).data());
    if (corruption === "malformed-batch") await batchRef.update({ ordinal: [2] });
    if (corruption === "missing-predecessor") await r.batches.doc(batch.previous.batchId).delete();
    if (corruption === "missing-batch-first-entry") await r.journal.doc(api.journal.journalIdentity(batch, batch.firstRevision)).delete();
    if (corruption === "corrupt-tail") await r.journal.doc(api.journal.journalIdentity(batch, batch.lastRevision)).update({ entryHash: "0".repeat(64) });
    if (corruption === "forged-checkpoint-and-counter") {
      // Plausible caller-generated pointer + control is not a committed batch.
      await r.checkpoint.set({ ...checkpoint, ordinal: 3, batchId: api.batches.acceptanceBatchIdentity(checkpoint, 3) });
      await r.control.update({ nativeAcceptedCount: 3 });
    }
    const next = completionFixture({ sessionId: "counter-damage-manual-next", mode: "manual", count: 1 }); await reservation(next);
    const before = await state(), usage = (await rows("trainingUsage")).map(row => row.data());
    await assert.rejects(service.accept(token, next), error => error.code === "stage2_counter_integrity");
    assert.deepEqual(await state(), before); assert.deepEqual((await rows("trainingUsage")).map(row => row.data()), usage);
    // Checkpoint-only damage is unrelated to the original immutable receipt.
    if (["missing-checkpoint", "malformed-checkpoint", "missing-batch", "missing-predecessor"].includes(corruption)) {
      assert.deepEqual(await service.accept(token, inputs[0]), originals[0]); assert.deepEqual(await state(), before);
    }
  });

test("orphan immutable batch prevents empty-history bootstrap without rebuilding checkpoints", async () => {
  await refs().batches.doc("orphan-batch").set({ synthetic: true });
  await assert.rejects(admit(), error => error.code === "stage2_bootstrap_required");
  assert.equal((await refs().checkpoint.get()).exists, false);
});

test("deletion and epoch change still deny acceptance and receipt recovery without altering committed batches", async () => {
  await admit(); const input = completionFixture(); await reservation(input); await service.accept(token, input);
  const next = completionFixture({ sessionId: "counter-deletion-next", mode: "manual", count: 1 }); await reservation(next);
  const r = refs();
  for (const change of [{ lifecycle: "deleting" }, { lifecycle: "active", lifecycleEpoch: 2 }]) {
    await r.control.update(change); const before = await state();
    for (const request of [input, next]) await assert.rejects(service.accept(token, request), error => error.code === "stage2_account_not_active");
    assert.deepEqual(await state(), before);
  }
});

test("epoch transition before a retried transaction cannot commit an old checkpoint batch", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  const before = await state(), run = db.runTransaction.bind(db); let attempts = 0;
  db.runTransaction = callback => run(async tx => {
    attempts++;
    if (attempts === 2) await refs().control.update({ lifecycleEpoch: 2 });
    const result = await callback(tx);
    if (attempts === 1) throw Object.assign(new Error("Synthetic epoch-contention retry"), { code: 10 });
    return result;
  });
  try { await assert.rejects(service.accept(token, input), error => error.code === "stage2_account_not_active"); }
  finally { db.runTransaction = run; }
  assert.equal(attempts, 2); const after = await state();
  assert.deepEqual(after.checkpoint, before.checkpoint); assert.deepEqual(after.batches, before.batches);
  assert.deepEqual(after.journal, before.journal); assert.deepEqual(after.groups, before.groups);
});
test("concurrent identical and conflicting same-session submissions have exactly one acceptance", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  const same = await Promise.all([service.accept(token, input), service.accept(token, input)]); assert.deepEqual(same[0], same[1]);
  const newer = completionFixture({ sessionId: "stage2-concurrent-conflict" }); await reservation(newer);
  const altered = { ...newer, reflection: { ...newer.reflection, reflectionText: "Different immutable completion" } };
  const outcomes = await Promise.allSettled([service.accept(token, newer), service.accept(token, altered)]);
  assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 1);
  assert.equal(outcomes.find(x => x.status === "rejected").reason.code, "completion_conflict");
  const checked = await verifyJournal(); assert.equal(checked.control.nativeAcceptedCount, 2);
});
test("concurrent distinct sessions are contiguous; historical completion does not regress legacy display", async () => {
  await admit();
  const newer = completionFixture({ sessionId: "stage2-session-newer", date: "2026-10-21T10:00:00.000Z" });
  const older = completionFixture({ sessionId: "stage2-session-older", date: "2026-10-19T10:00:00.000Z" });
  await reservation(newer); await reservation(older);
  const run = db.runTransaction.bind(db); let attempts = 0;
  db.runTransaction = callback => run(tx => { attempts++; return callback(tx); });
  const started = performance.now(); let accepted;
  try { accepted = await Promise.all([service.accept(token, newer), service.accept(token, older)]); }
  finally { db.runTransaction = run; }
  console.log("STAGE2 CONCURRENT MEASUREMENTS", JSON.stringify({ sessions: 2, transactionAttempts: attempts, elapsedMs: Math.round(performance.now() - started) }));
  assert.deepEqual(accepted.map(x => x.acceptedRevision).sort((a, b) => a - b), [1, 4]);
  assert.equal((await refs().user.get()).data().latestAssessmentId, newer.sessionId);
  await verifyJournal();
});
test("manual and unknown/tied automatic completion timestamps preserve the previous legacy profile", async () => {
  await admit();
  const initial = completionFixture(); await reservation(initial); await service.accept(token, initial);
  const before = (await refs().user.get()).data().learningProfile;
  for (const [n, mode, date] of [[1, "auto", null], [2, "auto", initial.completedAt], [3, "manual", initial.completedAt]]) {
    const input = completionFixture({ sessionId: `stage2-preserve-${n}`, mode, count: mode === "manual" ? 1 : 3, date });
    if (date === null) { input.completedAt = null; input.metadata.forEach(row => { row.completedAt = null; }); }
    // Valid actual existing quota reservation on another day; no quota bypass.
    await reservation(input, NOW + n * 86_400_000);
    const result = await service.accept(token, input); assert.equal(result.legacyProfileUpdated, false);
    assert.deepEqual((await refs().user.get()).data().learningProfile, before);
  }
});
test("missing/wrong-owner reservations, unknown expiry extensions, and client-forged owners fail without writes", async () => {
  await admit(); const input = completionFixture();
  await assert.rejects(service.accept(token, input), e => e.code === "training_reservation_required");
  const other = await account();
  await db.doc(`users/${other.uid}/trainingReservations/${input.sessionId}`).set({ sessionId: input.sessionId, mode: "auto", methodIds: [] });
  await assert.rejects(service.accept(token, input), e => e.code === "training_reservation_required");
  await reservation(input);
  await refs().user.collection("trainingReservations").doc(input.sessionId).update({ expiresAt: new Date(NOW - 1) });
  await assert.rejects(service.accept(token, input), e => e.code === "stage2_reservation_version");
  for (const value of [{ ...input, uid }, { ...input, owner: { kind: "user", uid } }])
    await assert.rejects(service.accept(token, value), e => e.status === 400);
  assert.equal((await rows("learningEvidence")).length, 0);
});
test("previous-day reservation and expired Premium remain valid; completion cannot charge again", async () => {
  await admit(); const input = completionFixture(); await reservation(input, NOW - 3 * 86400000);
  await refs().user.collection("entitlements").doc("current").set({ plan: "premium", validUntil: new Date(NOW - 1) });
  const before = (await refs().user.collection("trainingUsage").get()).docs.map(doc => doc.data());
  await service.accept(token, input); await service.accept(token, input);
  assert.deepEqual((await refs().user.collection("trainingUsage").get()).docs.map(doc => doc.data()), before);
});
test("forced transaction retry and failure before commit are deterministic and atomic", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  const run = db.runTransaction.bind(db); let attempts = 0;
  db.runTransaction = callback => run(async tx => { attempts++; const result = await callback(tx);
    if (attempts === 1) throw Object.assign(new Error("Synthetic retry"), { code: 10 }); return result; });
  try { assert.equal((await service.accept(token, input)).acceptedRevision, 1); assert.ok(attempts >= 2);
    console.log("STAGE2 FORCED RETRY MEASUREMENTS", JSON.stringify({ committedSessions: 1, transactionAttempts: attempts })); }
  finally { db.runTransaction = run; }
  const next = completionFixture({ sessionId: "stage2-atomic-failure" }); await reservation(next); const before = await state();
  db.runTransaction = callback => run(async tx => { await callback(tx); throw new Error("Synthetic precommit interruption"); });
  try { await assert.rejects(service.accept(token, next), /Synthetic precommit/); }
  finally { db.runTransaction = run; }
  assert.deepEqual(await state(), before); await service.accept(token, next); await verifyJournal();
});
test("head corruption, revision disagreement, identity collision and deletion state fail closed", async () => {
  await admit(); const input = completionFixture(); await reservation(input); await service.accept(token, input);
  const next = completionFixture({ sessionId: "stage2-corruption-next" }); await reservation(next);
  const r = refs(), control = (await r.control.get()).data(), tailRef = r.journal.doc(api.journal.journalIdentity(control, control.headRevision));
  const original = (await tailRef.get()).data();
  await tailRef.update({ entryHash: "0".repeat(64) });
  await assert.rejects(service.accept(token, next), e => e.status === 409); await tailRef.set(original);
  await r.control.update({ headRevision: 999 });
  await assert.rejects(service.accept(token, next), e => e.code === "stage2_counter_integrity"); await r.control.set(control);
  const claim = api.digest(["training-source-v1", "native", next.sessionId]);
  const collision = r.user.collection("learningEvidenceSourceIndex").doc(claim); await collision.set({ collision: true });
  await assert.rejects(service.accept(token, next), e => e.code === "stage2_identity_conflict"); await collision.delete();
  await r.control.update({ lifecycle: "deleting" });
  await assert.rejects(service.accept(token, next), e => e.code === "stage2_account_not_active");
  assert.equal((await rows("learningEvidence")).length, 1);
});
test("lifecycle change between request validation and transaction rejects without partial acceptance", async () => {
  await admit(); const input = completionFixture(); await reservation(input); const before = await state();
  const run = db.runTransaction.bind(db);
  db.runTransaction = async callback => { await refs().control.update({ lifecycle: "deleting" }); return run(callback); };
  try { await assert.rejects(service.accept(token, input), e => e.code === "stage2_account_not_active"); }
  finally { db.runTransaction = run; }
  const after = await state(); assert.deepEqual(after.groups, before.groups); assert.deepEqual(after.journal, before.journal);
});
test("malformed Unicode rejects before Firestore writes; valid supplementary content is immutable", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  for (const bad of ["\ud800", "\udc00"]) await assert.rejects(service.accept(token, { ...input, reflection: { ...input.reflection, reflectionText: bad } }), e => e.status === 400);
  input.reflection.reflectionText = "Supplementary \ud83d\ude80\udbff\udfff";
  const result = await service.accept(token, input);
  assert.equal((await refs().archives.doc(result.evidenceId).get()).data().payload.reflection.reflectionText, input.reflection.reflectionText);
  await verifyJournal();
});
test("dedicated clients reject changed configuration and cached production clients before remote I/O", async () => {
  const { initializeApp, deleteApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  // Construct only: no operation is performed on this incompatible cached app.
  const cached = initializeApp({ projectId: "demo-incompatible-cached-app" }, "edulience-backend");
  const savedHost = process.env.FIRESTORE_EMULATOR_HOST;
  let cachedDb;
  try {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    cachedDb = getFirestore(cached); cachedDb.settings({ host: "remote.invalid:443", ssl: true });
  } finally { process.env.FIRESTORE_EMULATOR_HOST = savedHost; }
  const dedicated = api.createStage2EmulatorTransport();
  try { assert.notEqual(dedicated.getFirestore(), cachedDb); assert.equal(await dedicated.verifyToken(token), uid); }
  finally { await dedicated.close(); await cachedDb.terminate(); await deleteApp(cached); }
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  try { process.env.FIRESTORE_EMULATOR_HOST = "remote.example:443"; assert.throws(() => transport.getFirestore(), /stage2_emulator_only/); }
  finally { process.env.FIRESTORE_EMULATOR_HOST = host; }
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  try { process.env.FIREBASE_AUTH_EMULATOR_HOST = "remote.example:443"; await assert.rejects(transport.verifyToken(token), /stage2_emulator_only/); }
  finally { process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost; }
  const settings = db._settings;
  try { db._settings = undefined; assert.throws(() => transport.getFirestore()); }
  finally { db._settings = settings; }
  await assert.rejects(transport.verifyToken("not-a-token"), e => e.status === 401);
});
test("expired and cross-project Emulator tokens are rejected, and account switching cannot borrow a reservation", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  const [header, encoded] = token.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  for (const change of [{ exp: 1 }, { aud: "another-demo-project" }]) {
    const invalid = `${header}.${Buffer.from(JSON.stringify({ ...payload, ...change })).toString("base64url")}.`;
    await assert.rejects(service.accept(invalid, input), e => e.status === 401);
  }
  const other = await account(); await db.doc(`users/${other.uid}`).set({ displayName: "Other synthetic owner" });
  await service.admitFreshOwner(other.token);
  await assert.rejects(service.accept(other.token, input), e => e.code === "training_reservation_required");
  assert.equal((await rows("learningEvidence")).length, 0);
});
test("root deletion and epoch changes cannot accept new completions", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  await refs().control.update({ lifecycleEpoch: 2 });
  await assert.rejects(service.accept(token, input), e => e.code === "stage2_account_not_active");
  await refs().control.update({ lifecycleEpoch: 1 }); await refs().user.delete();
  await assert.rejects(service.accept(token, input), e => e.code === "stage2_account_not_active");
  assert.equal((await rows("learningEvidence")).length, 0);
});
test("simultaneous deletion transition and acceptance linearize without partial journal batches", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  const [result] = await Promise.allSettled([service.accept(token, input), refs().control.update({ lifecycle: "deleting" })]);
  const control = (await refs().control.get()).data();
  assert.equal(control.lifecycle, "deleting");
  const committed = result.status === "fulfilled";
  assert.equal(control.nativeAcceptedCount, committed ? 1 : 0);
  assert.equal((await rows("learningEvidence")).length, committed ? 1 : 0);
  assert.equal((await refs().archives.get()).size, committed ? 1 : 0);
  assert.equal((await refs().journal.get()).size, committed ? 3 : 0);
});
test("measured automatic and identical-retry work stays bounded and quota counters never change", async () => {
  await admit(); const inputs = [completionFixture({ sessionId: "stage2-measure-auto1" }), completionFixture({ sessionId: "stage2-measure-auto2", date: "2026-10-20T10:00:00.000Z" })];
  for (const input of inputs) await reservation(input);
  const before = (await refs().user.collection("trainingUsage").get()).docs.map(doc => doc.data());
  const run = db.runTransaction.bind(db), samples = [];
  db.runTransaction = callback => run(tx => {
    const sample = { reads: 0, writes: 0 }; samples.push(sample);
    return callback(new Proxy(tx, { get(target, key) { const value = target[key];
      if (key === "get") return ref => { assert.equal(sample.writes, 0); sample.reads++; return value.call(target, ref); };
      if (["create", "set"].includes(key)) return (...args) => { sample.writes++; return value.apply(target, args); };
      return typeof value === "function" ? value.bind(target) : value; } }));
  });
  try {
    for (const input of inputs) await service.accept(token, input);
    await service.accept(token, inputs[0]);
  } finally { db.runTransaction = run; }
  assert.ok(samples.slice(0, 2).every(row => row.reads <= 24 && row.writes === 15));
  assert.deepEqual(samples[2], { reads: 9, writes: 0 }); // lifecycle + persisted enrollment checks, including retries
  assert.deepEqual((await refs().user.collection("trainingUsage").get()).docs.map(doc => doc.data()), before);
  console.log("STAGE2 AUTOMATIC MEASUREMENTS", JSON.stringify({ first: samples[0], subsequent: samples[1], identicalRetry: samples[2] }));
});
test("Manual -> Automatic -> Manual has a bounded 18-read guarded final acceptance", async () => {
  await admit();
  const inputs = [completionFixture({ sessionId: "mixed-budget-manual-first", mode: "manual", count: 1 }),
    completionFixture({ sessionId: "mixed-budget-auto-middle" }),
    completionFixture({ sessionId: "mixed-budget-manual-last", mode: "manual", count: 1 })];
  for (const input of inputs) await reservation(input);
  const run = db.runTransaction.bind(db), samples = [];
  db.runTransaction = callback => run(tx => {
    const sample = { reads: 0, writes: 0 }; samples.push(sample);
    return callback(new Proxy(tx, { get(target, key) { const value = target[key];
      if (key === "get") return ref => { assert.equal(sample.writes, 0); sample.reads++; return value.call(target, ref); };
      if (["create", "set"].includes(key)) return (...args) => { sample.writes++; return value.apply(target, args); };
      return typeof value === "function" ? value.bind(target) : value; } }));
  });
  try { for (const input of inputs) await service.accept(token, input); }
  finally { db.runTransaction = run; }
  assert.equal(samples.at(-1).reads, 18); assert.equal(samples.at(-1).writes, 10);
  assert.ok(samples.every(sample => sample.reads <= 24 && sample.writes <= 15));
  console.log("STAGE2 MIXED READ BUDGET", JSON.stringify(samples));
});

test("oversized merged root fails before any acceptance writes, and a smaller retry remains usable", async () => {
  await admit(); const input = completionFixture(); await reservation(input);
  // Existing root remains under 1 MiB, but a legal compatibility merge would
  // exceed it. Retain the completion, never partially commit its other records.
  await refs().user.update({ padding: "x".repeat(1_047_900) });
  const before = await state();
  await assert.rejects(service.accept(token, input), e => e.code === "completion_document_limit");
  assert.deepEqual(await state(), before);
  await refs().user.update({ padding: "small" }); await service.accept(token, input);
  await verifyJournal();
});
test("separate HTTP entry is disabled by default and requires actual Emulator Auth, not body ownership", async () => {
  const disabled = api.createStage2AcceptanceApp(), disabledServer = disabled.app.listen(0, "127.0.0.1"); await once(disabledServer, "listening");
  const local = api.createStage2AcceptanceApp({ enabled: true }), server = local.app.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const input = completionFixture(); await reservation(input);
    const post = (server, body, authorization) => fetch(`http://127.0.0.1:${server.address().port}/api/development/training/accept-v2`, { method: "POST", headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) }, body: JSON.stringify(body) });
    assert.equal((await post(disabledServer, input)).status, 404);
    assert.equal((await post(server, input)).status, 401);
    assert.equal((await post(server, input, "Bearer invalid")).status, 401);
    assert.equal((await post(server, input, `Bearer ${token}`)).status, 409); // not auto-admitted
    await admit();
    assert.equal((await post(server, { ...input, uid: "forged" }, `Bearer ${token}`)).status, 400);
    const accepted = await post(server, input, `Bearer ${token}`); assert.equal(accepted.status, 200); assert.equal((await accepted.json()).status, "accepted");
  } finally { await new Promise(resolve => server.close(resolve)); await new Promise(resolve => disabledServer.close(resolve)); await local.close(); await disabled.close(); }
});
test("existing complete Emulator rules protect new journal, admission and private archive paths", async () => {
  await admit(); const input = completionFixture(); await reservation(input); const receipt = await service.accept(token, input);
  const other = await account();
  const request = (path, bearer, method = "GET") => fetch(`http://127.0.0.1:18787/v1/projects/demo-edulience-phase2a/databases/(default)/documents/users/${uid}/${path}`, {
    method, headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), "content-type": "application/json" },
    ...(method === "PATCH" ? { body: JSON.stringify({ fields: { synthetic: { booleanValue: true } } }) } : {})
  });
  assert.equal((await request(`learningEvidence/${receipt.evidenceId}`, token)).status, 200);
  assert.equal((await request(`learningEvidence/${receipt.evidenceId}`, other.token)).status, 403);
  assert.equal((await request(`learningEvidence/${receipt.evidenceId}`, null)).status, 403);
  const checkpoint = (await refs().checkpoint.get()).data();
  for (const path of ["learningProfiles/journalControl", "learningProfiles/journalAdmission", "learningProfiles/journalWork", "learningProfiles/acceptanceCheckpoint",
    `learningProfiles/journalControl/acceptanceBatches/${checkpoint.batchId}`,
    `learningProfiles/journalControl/completionArchives/${receipt.evidenceId}`,
    `learningProfiles/journalControl/journal/${api.journal.journalIdentity({ uid, lifecycleEpoch: 1 }, 1)}`,
    `learningEvidence/${receipt.evidenceId}`]) {
    assert.equal((await request(path, token, "PATCH")).status, 403);
    if (!path.startsWith("learningEvidence/")) assert.equal((await request(path, token)).status, 403);
  }
});
test("72-session quota-respecting lower-level acceptance stress has bounded per-transaction work", async () => {
  await admit(); const run = db.runTransaction.bind(db); const measurements = [];
  try {
    for (let n = 0; n < 72; n++) {
      const input = completionFixture({ sessionId: `stage2-stress-${String(n).padStart(4, "0")}`, mode: "manual", count: 1 });
      // Actual quota manager, four methods/day across 18 server-clock days. No
      // entitlement fabrication, extra quota allowance or endpoint rate bypass.
      db.runTransaction = run; await reservation(input, NOW + Math.floor(n / 4) * 86400000);
      const instrument = { attempts: 0, samples: [] };
      const measureRunner = callback => run(tx => {
        const sample = { reads: 0, writes: 0 }; instrument.attempts++; instrument.samples.push(sample);
        return callback(new Proxy(tx, { get(target, key) { const value = target[key];
          if (key === "get") return ref => { assert.equal(sample.writes, 0, "reads must precede writes"); sample.reads++; return value.call(target, ref); };
          if (["create", "set"].includes(key)) return (...args) => { sample.writes++; return value.apply(target, args); };
          return typeof value === "function" ? value.bind(target) : value; } }));
      });
      db.runTransaction = measureRunner;
      const started = performance.now(); await service.accept(token, input); instrument.ms = performance.now() - started;
      measurements.push(instrument);
    }
  } finally { db.runTransaction = run; }
  assert.equal((await rows("learningEvidence")).length, 72); assert.equal((await refs().archives.get()).size, 72);
  assert.equal((await refs().user.collection("trainingUsage").get()).size, 18);
  assert.ok((await refs().user.collection("trainingUsage").get()).docs.every(doc => doc.data().manualMethodsStarted === 4));
  const checked = await verifyJournal(); assert.equal(checked.control.headRevision, 144);
  const samples = measurements.flatMap(row => row.samples), times = measurements.map(row => row.ms).sort((a, b) => a - b);
  assert.ok(samples.every(row => row.reads <= 16 && row.writes === 10)); // one lifecycle read, no additional writes
  console.log("STAGE2 ACCEPTANCE MEASUREMENTS", JSON.stringify({ scope: "lower-level writer with real quota reservations, not HTTP throughput", sessions: 72,
    readRange: [Math.min(...samples.map(x => x.reads)), Math.max(...samples.map(x => x.reads))], writesPerCommit: 10,
    attempts: measurements.reduce((sum, x) => sum + x.attempts, 0), latencyMs: { min: Math.round(times[0]), median: Math.round(times[36]), p95: Math.round(times[68]), max: Math.round(times.at(-1)) } }));
});
test("72 automatic sessions exceed the old 400-source ceiling without rebuilding or exceeding daily quotas", async () => {
  await admit(); const timings = [];
  for (let n = 0; n < 72; n++) {
    const input = completionFixture({ sessionId: `stage2-auto-capacity-${String(n).padStart(4, "0")}` });
    // Two actual Free Test Me reservations/day, over 36 injected past server
    // days. This is a lower-level persistence test, not HTTP throughput.
    await reservation(input, NOW - (36 - Math.floor(n / 2)) * 86400000);
    const started = performance.now(); await service.accept(token, input); timings.push(performance.now() - started);
  }
  const counts = await Promise.all(["learningEvidence", "assessments", "learningEvidenceSourceIndex", "learningEvidenceIdentityEvents"].map(async name => (await rows(name)).length));
  assert.deepEqual(counts, [72, 72, 144, 144]); assert.equal(counts.reduce((a, b) => a + b), 432);
  const usage = (await refs().user.collection("trainingUsage").get()).docs;
  assert.equal(usage.length, 36); assert.ok(usage.every(doc => doc.data().testMeStarted === 2 && doc.data().manualMethodsStarted === 0));
  await assert.rejects(reservation(completionFixture({ sessionId: "stage2-quota-still-enforced" }), NOW - 36 * 86400000), e => e.code === "training_quota_exceeded");
  const checked = await verifyJournal(); assert.equal(checked.control.nativeAcceptedCount, 72); assert.equal(checked.control.headRevision, 216);
  assert.equal((await refs().archives.get()).size, 72);
  timings.sort((a, b) => a - b);
  console.log("STAGE2 AUTOMATIC CAPACITY MEASUREMENTS", JSON.stringify({ sessions: 72, oldHistoryNamespaceDocuments: 432,
    quotaDays: 36, journalEntries: 216, latencyMs: { min: Math.round(timings[0]), median: Math.round(timings[36]), p95: Math.round(timings[68]), max: Math.round(timings.at(-1)) } }));
});
