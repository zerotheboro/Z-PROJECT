import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { Firestore } from "firebase-admin/firestore";
import { completionFixture } from "../completionFixtures.mjs";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";
assert.equal(process.versions.node.split(".")[0], "24"); assert.equal(process.env.NODE_ENV, "test");
assert.ok(process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"));
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787"); assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
Object.assign(process.env, { TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_AUTHORITY_STAGE4A: "emulator-only",
  TRAINING_BOOTSTRAP_STAGE4B1: "emulator-only", TRAINING_ORIGIN_STAGE4B2: "emulator-only", TRAINING_SHADOW_STAGE3A: "emulator-only", TRAINING_PUBLICATION_STAGE3B: "emulator-only" });
const bundled = await build({ stdin: { resolveDir: process.cwd(), loader: "ts", contents:
  ["writerGuard", "acceptance", "acceptanceTransport", "acceptanceState", "authority", "authorityContracts", "origin", "originContracts", "bootstrapTransport", "shadowWorker", "publication", "values"]
    .map(name => `export * from './backend/scalability/${name}';`).join("\n") }, bundle: true, write: false, platform: "node", target: "node24", format: "esm", packages: "external" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/writer-guard-test-api.mjs", bundled.outputFiles[0].text);
const api = await import("../../dist-stage2/writer-guard-test-api.mjs");
const resources = [], track = value => { resources.push(value); return value; }, id = () => crypto.randomUUID().replaceAll("-", "");
let transport, operator, db, guard, acceptance;
before(async () => {
  transport = api.createStage2EmulatorTransport(); operator = api.createBootstrapTransport(); db = transport.getFirestore();
  guard = api.createSharedWriterGuard(transport); acceptance = api.createStage2AcceptanceService(transport);
  await db.doc("stage4cGuardHealth/demo-only").get(); // Required real loopback RPC; no fallback/skip.
});
afterEach(async () => { for (const resource of resources.splice(0)) await resource.close(); });
after(async () => { await operator?.close(); await transport?.close(); });
async function login(customToken) {
  const r = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-stage4c-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
  assert.equal(r.ok, true); const result = await r.json(); assert.equal(typeof result.idToken, "string"); return result.idToken;
}
async function account(protectedAccount = false) {
  if (protectedAccount) {
    const origin = track(api.createOriginPrototype()), request = { requestId: "stage4c-" + id(), identityForm: "ascii" };
    const prepared = await origin.prepare(request), token = await login(prepared.customToken);
    assert.equal((await origin.finalize(token, { requestId: request.requestId })).state, "EXTERNAL_TRUST_NOT_ENFORCED");
    return { uid: prepared.uid, token, origin, root: db.doc(`users/${prepared.uid}`) };
  }
  const uid = "stage4c-" + id(); await operator.getAuthClient().createUser({ uid });
  const token = await login(await operator.getAuthClient().createCustomToken(uid)), root = db.doc(`users/${uid}`);
  await root.create({ uid, learningProfile: null }); return { uid, token, root };
}
async function state(o, expected, principal) {
  const p = principal ?? await guard.authenticate(o.token);
  return guard.transaction(tx => guard.read(tx, p, expected), { readOnly: true });
}
async function reserve(o, payload) {
  return createFirebaseTrainingQuotaManager({ now: () => Date.parse("2026-10-25T10:00:00.000Z"), getFirestore: () => db })
    .reserve(o.uid, { sessionId: payload.sessionId, mode: payload.mode, methodIds: payload.mode === "auto" ? [] : payload.selectedMethods, timezone: "UTC" });
}
async function rows(o, namespace) { return (await o.root.collection(namespace).orderBy("__name__").get()).docs.map(row => ({ id: row.id, data: row.data() })); }
async function snapshot(o) { return Promise.all(["learningEvidence", "assessments", "learningEvidenceSourceIndex", "learningEvidenceIdentityEvents", "trainingUsage", "trainingReservations", "learningProfiles"].map(name => rows(o, name))); }
async function denied(o, operation) { const before = await snapshot(o); await assert.rejects(operation); assert.deepEqual(await snapshot(o), before); }

test("shared guard validates exact server incarnation and still denies protected journal/publication authority", async () => {
  const o = await account(true), result = await state(o);
  assert.equal(result.context.protection, "protected"); assert.equal(result.context.uid, o.uid);
  assert.equal(result.authority, "NOT VERIFIED"); assert.equal(result.independentRevocation, "NOT VERIFIED");
  assert.equal(result.protectedAdmissionEligible, false); assert.equal(result.publicationEligible, false);
  assert.throws(() => guard.assertJournalAccess(result), /writer_guard_attempt_inactive/);
  const principal = await guard.authenticate(o.token);
  await assert.rejects(() => guard.transaction(async tx => {
    guard.assertJournalAccess(await guard.read(tx, principal), tx);
  }), /writer_protected_admission_not_verified/);
  const completion = completionFixture({ sessionId: "guard-protected-" + id(), mode: "manual", count: 1 }); await reserve(o, completion);
  const worker = track(api.createShadowWorker()), publisher = track(api.createDevelopmentPublisher());
  await denied(o, () => acceptance.admitFreshOwner(o.token)); await denied(o, () => acceptance.accept(o.token, completion));
  await denied(o, () => worker.claim(o.uid)); await denied(o, () => publisher.publish(o.token, "a".repeat(64)));
});
test("owner/token/principal substitution and account switching cannot borrow another owner's paths or reservation", async () => {
  const a = await account(), b = await account(), principal = await guard.authenticate(a.token);
  const scoped = await state(b, undefined, principal);
  assert.equal(scoped.context.uid, a.uid); assert.equal(scoped.root.ref.path, a.root.path);
  const [foreignRoot, foreignFence] = await db.getAll(b.root, b.root.collection("learningProfiles").doc("cumulative"));
  await assert.rejects(() => guard.transaction(tx => guard.read(tx, principal, { root: foreignRoot, fence: foreignFence })));
  await assert.rejects(() => state(a, undefined, { ...principal }), /writer_verified_principal_required/);
  await assert.rejects(() => guard.authenticate("invalid-token"));
  await acceptance.admitFreshOwner(a.token); await acceptance.admitFreshOwner(b.token);
  const payload = completionFixture({ sessionId: "guard-owner-" + id(), mode: "manual", count: 1 }); await reserve(a, payload);
  await denied(b, () => acceptance.accept(b.token, payload)); assert.equal((await rows(a, "learningEvidence")).length, 0);
});
test("a fabricated or previous-transaction guard result cannot authorize a write", async () => {
  const o = await account(), previous = await state(o), principal = await guard.authenticate(o.token);
  await assert.rejects(() => guard.transaction(async tx => { guard.assertJournalAccess(previous, tx); }), /writer_guard_transaction_required/);
  await assert.rejects(() => guard.transaction(async tx => { guard.assertJournalAccess({ context: previous.context }, tx); }), /writer_guard_transaction_required/);
  await guard.transaction(async tx => {
    guard.assertJournalAccess(await guard.read(tx, principal), tx);
  });
});
test("raw SDK transactions and fabricated facades cannot mint a guard capability", async () => {
  const o = await account(), principal = await guard.authenticate(o.token); let calls = 0;
  await assert.rejects(() => db.runTransaction(tx => guard.read(tx, principal)), /writer_guard_attempt_inactive/);
  await assert.rejects(() => guard.read({ get() { calls++; throw new Error("must not call"); } }, principal), /writer_guard_attempt_inactive/);
  await guard.transaction(async tx => {
    await assert.rejects(() => guard.read({ ...tx }, principal), /writer_guard_attempt_inactive/);
    guard.assertJournalAccess(await guard.read(tx, principal), tx);
  });
  assert.equal(calls, 0);
});
for (const exit of ["return", "throw"]) test(`attempt exit by ${exit} invalidates results, saved methods and write chaining`, async () => {
  const o = await account(), principal = await guard.authenticate(o.token), ref = o.root.collection("learningProfiles").doc("expired-" + id());
  let saved, txSaved, writeSaved;
  const operation = guard.transaction(async tx => {
    txSaved = tx; writeSaved = tx.create; saved = await guard.read(tx, principal); guard.assertJournalAccess(saved, tx);
    // An aborted chained write must not leak the raw reusable SDK Transaction.
    if (exit === "throw") { assert.equal(tx.create(ref, { acceptedTrainingEvidence: false }), tx); throw new Error("exit-probe"); }
    return saved;
  });
  if (exit === "throw") await assert.rejects(() => operation, /exit-probe/); else assert.equal(await operation, saved);
  assert.throws(() => guard.assertJournalAccess(saved, txSaved), /writer_guard_attempt_inactive/);
  assert.throws(() => writeSaved(ref, { acceptedTrainingEvidence: false }), /writer_guard_attempt_inactive/);
  await assert.rejects(() => txSaved.get(o.root), /writer_guard_attempt_inactive/);
  assert.equal((await ref.get()).exists, false);
});
test("original retry attack: same raw SDK object, real deleting transition, cached guard rejected and zero diagnostic writes", async () => {
  const o = await account(), principal = await guard.authenticate(o.token), coordinator = track(api.createAuthorityPrototype());
  const original = Firestore.prototype.runTransaction, rawAttempts = [], facades = [];
  const ref = o.root.collection("learningProfiles").doc("retry-repair-" + id()); let cached;
  Firestore.prototype.runTransaction = function(callback, options) {
    if (this !== db) return original.call(this, callback, options);
    return original.call(this, async raw => {
      rawAttempts.push(raw);
      if (rawAttempts.length === 2) {
        // The preceding callback has been rolled back, so these genuine
        // coordinator transactions cannot deadlock its earlier reads.
        await o.root.delete(); await coordinator.protectSyntheticOwner(o.token);
        await coordinator.transition(o.token, api.writerContext(await coordinator.read(o.token)), "deleting");
      }
      return callback(raw);
    }, options);
  };
  try {
    await assert.rejects(() => guard.transaction(async tx => {
      facades.push(tx);
      if (facades.length === 1) {
        cached = await guard.read(tx, principal); guard.assertJournalAccess(cached, tx);
        const error = new Error("original-reproduction-ABORTED"); error.code = 10; throw error;
      }
      assert.throws(() => guard.assertJournalAccess(cached, facades[0]), /writer_guard_attempt_inactive/);
      guard.assertJournalAccess(cached, tx); // MUST reject before the diagnostic write.
      tx.create(ref, { acceptedTrainingEvidence: false });
    }, { maxAttempts: 2 }), /writer_guard_transaction_required/);
  } finally { Firestore.prototype.runTransaction = original; }
  assert.equal(rawAttempts.length, 2); assert.equal(rawAttempts[0], rawAttempts[1]);
  assert.notEqual(facades[0], facades[1]); assert.equal((await coordinator.read(o.token)).state, "deleting");
  assert.equal((await ref.get()).exists, false); await assert.rejects(() => state(o), /writer_account_not_active/);
  assert.equal((await rows(o, "learningEvidence")).length, 0);
});
test("original snapshot attack: cached genuine snapshots cannot authorize an orphan write after root deletion", async () => {
  const o = await account(), principal = await guard.authenticate(o.token);
  const [root, fence] = await db.getAll(o.root, o.root.collection("learningProfiles").doc("cumulative"));
  await o.root.delete(); const ref = o.root.collection("learningProfiles").doc("snapshot-repair-" + id());
  await assert.rejects(() => guard.transaction(async tx => {
    const result = await guard.read(tx, principal, { root, fence }); // removed unsafe snapshot-input overload
    guard.assertJournalAccess(result, tx); tx.create(ref, { acceptedTrainingEvidence: false });
  }));
  await assert.rejects(() => guard.transaction(async tx => {
    const result = await guard.read(tx, principal); // actual fresh root read must reject too
    guard.assertJournalAccess(result, tx); tx.create(ref, { acceptedTrainingEvidence: false });
  }), /writer_account_not_active/);
  assert.equal((await o.root.get()).exists, false); assert.equal((await ref.get()).exists, false);
});
test("guard-owned read-only attempts cannot write or invoke write-budget hooks", async () => {
  const o = await account(), principal = await guard.authenticate(o.token); let hooks = 0;
  const ref = o.root.collection("learningProfiles").doc("readonly-" + id());
  await assert.rejects(() => guard.transaction(async tx => {
    guard.assertJournalAccess(await guard.read(tx, principal), tx); tx.create(ref, { acceptedTrainingEvidence: false });
  }, { readOnly: true }, () => ({ beforeWrite() { hooks++; } })), /writer_transaction_read_only/);
  assert.equal(hooks, 0); assert.equal((await ref.get()).exists, false);
});
for (const property of ["uid", "lifecycleEpoch", "rootBinding", "fence", "rootCreatedAt", "writerProtocol"]) test(`protected expected ${property} mismatch fails before writes`, async () => {
  const o = await account(true), current = (await state(o)).context;
  const value = property === "uid" ? "other-owner" : property === "rootBinding" ? "b".repeat(64) : property === "rootCreatedAt" ? { seconds: current.rootCreatedAt.seconds + 1, nanoseconds: 0 } : property === "writerProtocol" ? "other" : 2;
  await denied(o, () => state(o, { ...current, [property]: value }));
});
test("altered Auth incarnation claims and incompatible stored protocol fail closed", async () => {
  const o = await account(true), auth = operator.getAuthClient(), prior = await auth.getUser(o.uid);
  await auth.setCustomUserClaims(o.uid, { ...prior.customClaims, originStage4b2Incarnation: "e".repeat(64) });
  await denied(o, () => state(o));
  await auth.setCustomUserClaims(o.uid, { ...prior.customClaims, originStage4b2Incarnation: ["forged"] });
  await denied(o, () => state(o)); await auth.setCustomUserClaims(o.uid, prior.customClaims);
  await db.doc(`${api.LIFECYCLE_COLLECTION}/${o.uid}`).update({ writerProtocol: "incompatible" }); await denied(o, () => state(o));
});
test("disabled and actually revoked Firebase credentials reject authentication without touching evidence or quotas", async () => {
  const o = await account(); await acceptance.admitFreshOwner(o.token); const auth = operator.getAuthClient();
  await auth.updateUser(o.uid, { disabled: true }); await denied(o, () => acceptance.admitFreshOwner(o.token));
  await auth.updateUser(o.uid, { disabled: false });
  await new Promise(resolve => setTimeout(resolve, 1100)); await auth.revokeRefreshTokens(o.uid);
  await denied(o, () => guard.authenticate(o.token));
});
test("real lifecycle deletion serializes with a guarded quarantined transaction; stale context can never write afterward", async () => {
  const o = await account(true), coordinator = track(api.createAuthorityPrototype()), principal = await guard.authenticate(o.token);
  const context = (await state(o)).context, life = await coordinator.read(o.token);
  let started; const ready = new Promise(resolve => { started = resolve; });
  const ref = o.root.collection("learningProfiles").doc("guardStage4c").collection("probes").doc(id());
  // Harmless diagnostic only: no accepted Training evidence or authority. The
  // same tx reads the lifecycle that the real deletion transition must update.
  const write = guard.transaction(async tx => {
    const checked = await guard.read(tx, principal, context); started();
    assert.equal(checked.protectedAdmissionEligible, false); tx.create(ref, { acceptedTrainingEvidence: false, uid: o.uid });
  });
  await ready;
  const deleting = coordinator.transition(o.token, api.writerContext(life), "deleting");
  const results = await Promise.allSettled([write, deleting]); assert.equal(results[1].status, "fulfilled");
  assert.equal((await coordinator.read(o.token)).state, "deleting"); await denied(o, () => state(o, context));
  assert.equal((await rows(o, "learningEvidence")).length, 0);
});
test("a lifecycle appearing during prepared V2 completion forces retry and atomic rejection with no partial acceptance", async () => {
  const o = await account(); await acceptance.admitFreshOwner(o.token);
  const payload = completionFixture({ sessionId: "guard-delete-race-" + id(), mode: "manual", count: 1 }); await reserve(o, payload);
  const original = Firestore.prototype.runTransaction; let aborted = false, injected = false;
  // Deliberately emulate an uncoordinated Admin marker arriving after validation
  // but before commit. It is NOT claimed to be a genuine origin or migration.
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    if (aborted && !injected && !options?.readOnly && this.projectId === "demo-edulience-phase2a") {
      // The SDK has rolled back the first attempt. Mutate before this retry
      // acquires any document lock, then exercise the repeated guard read.
      injected = true;
      await operator.getFirestore().doc(`${api.LIFECYCLE_COLLECTION}/${o.uid}`).create({ revoked: true });
    }
    const value = await callback(tx);
    if (!aborted && !options?.readOnly && this.projectId === "demo-edulience-phase2a") {
      aborted = true;
      const error = new Error("Retry after lifecycle mutation"); error.code = 10;
      throw error;
    }
    return value;
  }, options); };
  try { await assert.rejects(() => acceptance.accept(o.token, payload)); } finally { Firestore.prototype.runTransaction = original; }
  assert.equal(injected, true); assert.equal((await rows(o, "learningEvidence")).length, 0);
  assert.equal((await rows(o, "learningEvidenceIdentityEvents")).length, 0);
  const cp = (await api.acceptanceReferences(db, o.uid).checkpoint.get()).data(); assert.equal(cp.ordinal, 0);
});
test("identical concurrent completion, conflicting retry and actual SDK retry preserve exactly one original receipt and quota charge", async () => {
  const o = await account(); await acceptance.admitFreshOwner(o.token);
  const payload = completionFixture({ sessionId: "guard-retry-" + id(), mode: "manual", count: 1 }); await reserve(o, payload);
  const quotas = await rows(o, "trainingUsage"), original = Firestore.prototype.runTransaction; let attempts = 0;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const value = await callback(tx); if (!options?.readOnly && ++attempts === 1) { const error = new Error("SDK ABORTED"); error.code = 10; throw error; } return value;
  }, options); };
  let receipt; try { receipt = await acceptance.accept(o.token, payload); } finally { Firestore.prototype.runTransaction = original; }
  assert.ok(attempts >= 2);
  const results = await Promise.all([acceptance.accept(o.token, payload), acceptance.accept(o.token, payload)]);
  assert.deepEqual(results, [receipt, receipt]); const before = await snapshot(o);
  await assert.rejects(() => acceptance.accept(o.token, { ...payload, reflection: { ...payload.reflection, reflectionText: "conflicting" } }));
  assert.deepEqual(await snapshot(o), before); assert.equal((await rows(o, "learningEvidence")).length, 1); assert.deepEqual(await rows(o, "trainingUsage"), quotas);
});
test("worker takeover and root recreation fence heartbeat AND error-handler writes without modifying original evidence", async () => {
  const o = await account(); await acceptance.admitFreshOwner(o.token);
  const payload = completionFixture({ sessionId: "guard-worker-" + id(), mode: "manual", count: 1 }); await reserve(o, payload); await acceptance.accept(o.token, payload);
  const a = track(api.createShadowWorker()), b = track(api.createShadowWorker()), old = await a.claim(o.uid), ref = api.shadowReferences(db, o.uid, old.generationId).job;
  const job = (await ref.get()).data(); await ref.update({ checkpoint: { ...job.checkpoint, lease: { ...job.checkpoint.lease, expiresAt: "2000-01-01T00:00:00.000Z" } } });
  const next = await b.claim(o.uid); assert.ok(next.fence > old.fence); await assert.rejects(() => a.heartbeat(old)); await b.heartbeat(next);
  const root = (await o.root.get()).data(); await o.root.delete(); await o.root.create(root);
  const before = await snapshot(o), saved = (await ref.get()).data();
  await assert.rejects(() => b.heartbeat(next), /writer_stale_context/); await assert.rejects(() => b.run(next));
  assert.deepEqual((await ref.get()).data(), saved); assert.deepEqual(await snapshot(o), before);
});
test("recorded independent-origin revocation never grants protected Training while atomic external trust is unavailable", async () => {
  const o = await account(true); await o.origin.revoke(o.token, { reason: "operator-demo" });
  assert.equal((await o.origin.recover(o.token)).state, "ORIGIN_REVOKED");
  // The projects cannot share a Firestore transaction. Do NOT pretend the local
  // lifecycle observation is an atomic independent-revocation witness.
  const result = await state(o); assert.equal(result.independentRevocation, "NOT VERIFIED");
  assert.throws(() => guard.assertJournalAccess(result));
  await denied(o, () => acceptance.admitFreshOwner(o.token));
});
