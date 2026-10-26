import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { fork } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { Firestore } from "firebase-admin/firestore";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";
import { completionFixture } from "../completionFixtures.mjs";
import { createEmulatorTrainingCompletionService } from "../../dist-backend/backend/trainingCompletion.js";

assert.equal(process.versions.node.split(".")[0], "24"); assert.equal(process.env.NODE_ENV, "test");
assert.ok(process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"));
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787"); assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
Object.assign(process.env, { TRAINING_ORIGIN_STAGE4B2: "emulator-only", TRAINING_BOOTSTRAP_STAGE4B1: "emulator-only",
  TRAINING_AUTHORITY_STAGE4A: "emulator-only", TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_SHADOW_STAGE3A: "emulator-only" });
const bundled = await build({ stdin: { resolveDir: process.cwd(), loader: "ts", contents: ["origin", "originContracts", "originTransport", "originStore",
  "authority", "authorityContracts", "acceptance", "acceptanceTransport", "shadowWorker", "bootstrapContracts", "values"].map(name => `export * from './backend/scalability/${name}';`).join("\n") },
  bundle: true, write: false, platform: "node", target: "node24", format: "esm", packages: "external" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/origin-test-api.mjs", bundled.outputFiles[0].text);
const api = await import("../../dist-stage2/origin-test-api.mjs");
const tools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = tools("@firebase/rules-unit-testing");
const web = tools("firebase/firestore"), auth = tools("firebase/auth"), apps = tools("firebase/app"); web.setLogLevel("silent");
const services = [], clients = [], unique = () => crypto.randomUUID().replaceAll("-", "");
const input = form => ({ requestId: "origin-test-" + unique(), identityForm: form ?? "ascii" });
const service = options => { const s = api.createOriginPrototype(options); services.push(s); return s; };
let appRules, authorityRules, transport, db, authority, store;
before(async () => {
  const config = JSON.parse(await readFile("firebase.stage4b2-emulator.json", "utf8"));
  assert.equal(config.emulators.firestore.host, "127.0.0.1"); assert.equal(config.emulators.firestore.port, 18787);
  assert.equal(config.emulators.auth.host, "127.0.0.1"); assert.equal(config.emulators.auth.port, 9099);
  appRules = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile(config.firestore.rules, "utf8") } });
  authorityRules = await initializeTestEnvironment({ projectId: api.ORIGIN_REALM, firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile("test-support/firestore/stage4b2-authority-demo.rules", "utf8") } });
  transport = api.createOriginTransport(); db = transport.application.getFirestore(); authority = transport.authorityFirestore(); store = api.createOriginStore(transport);
});
afterEach(async () => { for (const s of services.splice(0)) await s.close(); for (const c of clients.splice(0)) { await auth.signOut(c.a); await web.terminate(c.client); await apps.deleteApp(c.app); } });
after(async () => {
  await transport?.close(); await appRules?.cleanup(); await authorityRules?.cleanup();
  const restored = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile("test-support/firestore/owner-supplied.rules", "utf8") } }); await restored.cleanup();
});
async function login(customToken) {
  const app = apps.initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-origin-only", authDomain: "localhost" }, unique());
  const a = auth.getAuth(app); auth.connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
  const client = web.getFirestore(app); web.connectFirestoreEmulator(client, "127.0.0.1", 18787); clients.push({ app, a, client });
  const user = (await auth.signInWithCustomToken(a, customToken)).user;
  return { uid: user.uid, token: await user.getIdToken(), client };
}
async function owner(s = service(), form = "ascii") {
  const request = input(form), prepared = await s.prepare(request), o = { ...await login(prepared.customToken), s, request };
  assert.equal(o.uid, prepared.uid); const result = await s.finalize(o.token, { requestId: request.requestId });
  assert.equal(result.state, "EXTERNAL_TRUST_NOT_ENFORCED"); assert.equal(result.admissionEligible, false); return o;
}
async function snapshot(o) {
  const rows = [], point = t => t ? { seconds: t.seconds, nanoseconds: t.nanoseconds } : null;
  async function walk(ref, realm) { const s = await ref.get(); rows.push([realm, ref.path, s.data() ?? null, point(s.createTime), point(s.updateTime)]);
    for (const c of await ref.listCollections()) for (const d of await c.listDocuments()) await walk(d, realm); }
  for (const ref of [db.doc(`users/${o.uid}`), db.doc(`${api.LIFECYCLE_COLLECTION}/${o.uid}`), db.doc(`trainingBootstrapOrigins/${o.uid}`)]) await walk(ref, "application");
  for (const ref of [authority.doc(`originProvisioningRequests/${api.originRequestKey(o.request.requestId)}`), authority.doc(`originOwners/${o.uid}`), authority.doc(`originAttestations/${o.uid}`)]) await walk(ref, "authority");
  return rows.sort((a, b) => JSON.stringify(a.slice(0, 2)) < JSON.stringify(b.slice(0, 2)) ? -1 : 1);
}
async function rejected(o, operation, code) {
  const before = await snapshot(o); await assert.rejects(operation, error => !code || error.code === code); assert.deepEqual(await snapshot(o), before);
}
async function child(request, expectedExit = 0) {
  const worker = fork("test-support/origin-process-fixture.mjs", [], { execPath: process.execPath,
    execArgv: ["--require", "./test-support/no-dotenv.cjs"], env: process.env, stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true });
  return new Promise((resolve, reject) => {
    let result;
    const timer = setTimeout(() => { worker.kill(); reject(new Error("Origin child timed out")); }, 60000);
    worker.on("message", message => { result = message; }); worker.once("error", reject);
    worker.once("exit", code => { clearTimeout(timer); if (code !== expectedExit) reject(new Error(`Origin child exit ${code}; code ${result?.code ?? "none"}`)); else resolve(result); });
    worker.send(request);
  });
}

test("fixed two-realm transports reject disabled/production/mutated configuration without remote fallback", async () => {
  for (const [key, value] of [["TRAINING_ORIGIN_STAGE4B2", "disabled"], ["NODE_ENV", "production"], ["FIREBASE_PROJECT_ID", "production-project"]]) {
    const old = process.env[key]; process.env[key] = value;
    try { assert.throws(() => api.createOriginPrototype()); } finally { process.env[key] = old; }
  }
  const old = process.env.FIRESTORE_EMULATOR_HOST; process.env.FIRESTORE_EMULATOR_HOST = "remote.invalid:443";
  try { assert.throws(() => transport.authorityFirestore()); } finally { process.env.FIRESTORE_EMULATOR_HOST = old; }
  assert.notEqual(db.projectId, authority.projectId); assert.equal(authority.projectId, api.ORIGIN_REALM);
  assert.throws(() => api.createOriginStore({ authorityFirestore() { throw new Error("must not use injection"); } }));
});
test("durable genesis and attestation bind the actual verified UID, epoch, nonce and source creation metadata", async () => {
  const o = await owner(), ledger = await store.read(o.uid), root = await db.doc(`users/${o.uid}`).get();
  assert.equal(ledger.control.sequence, 6); assert.equal(ledger.control.phase, "FINALIZED");
  assert.equal(ledger.attestation.commitment.uid, o.uid); assert.equal(ledger.attestation.commitment.lifecycleEpoch, 1);
  assert.deepEqual(ledger.commitment.sourceCreatedAt, { seconds: root.createTime.seconds, nanoseconds: root.createTime.nanoseconds });
  assert.equal((await db.doc(`users/${o.uid}/learningProfiles/cumulative`).get()).data().persistenceVersion, 3);
  assert.equal((await db.collection(`users/${o.uid}/learningEvidence`).get()).size, 0);
  assert.equal((await db.collection(`users/${o.uid}/assessments`).get()).size, 0);
  assert.equal((await o.s.recover(o.token)).authority, "NOT VERIFIED");
});
for (const crashAt of ["before-intent", "intent-recorded", "auth-started", "auth-created-before-claims", "auth-before-checkpoint", "auth-created"]) {
  test(`real process termination at ${crashAt} preserves exact intent/identity or requires controlled recovery`, async () => {
    const request = input(), failure = await child({ operation: "prepare", input: request, crashAt }, 71);
    assert.equal(failure.event, "boundary"); const saved = await store.byRequest(request.requestId), s = service();
    if (crashAt === "before-intent") {
      assert.equal(saved, null); await assert.rejects(() => transport.application.getAuthClient().getUser(failure.uid));
      const prepared = await s.prepare(request); assert.notEqual(prepared.uid, failure.uid); return;
    }
    assert.equal(saved.intent.uid, failure.uid);
    const o = { uid: saved.intent.uid, request }, before = await snapshot(o);
    if (crashAt === "auth-started" || crashAt === "auth-created-before-claims" || crashAt === "auth-before-checkpoint") {
      assert.equal(saved.control.phase, "AUTH_CREATE_STARTED"); assert.equal(saved.control.reviewRequired, true);
      await rejected(o, () => s.prepare(request), "origin_controlled_recovery_required");
      if (crashAt === "auth-started") await assert.rejects(() => transport.application.getAuthClient().getUser(o.uid));
      else assert.equal((await transport.application.getAuthClient().getUser(o.uid)).uid, o.uid);
      assert.deepEqual(await snapshot(o), before); return;
    }
    const resumed = await child({ operation: "prepare", input: request }); assert.equal(resumed.value.uid, saved.intent.uid);
    const logged = await login(resumed.value.customToken), final = await child({ operation: "finalize", token: logged.token, input: { requestId: request.requestId } });
    assert.equal(final.value.state, "EXTERNAL_TRUST_NOT_ENFORCED"); assert.equal(final.value.consistency, "FINALIZED_COMMITMENTS_MATCH");
  });
}
for (const crashAt of ["genesis-started", "genesis-before-checkpoint", "genesis-recorded", "finalized"]) {
  test(`real process termination at ${crashAt} never infers an unconfirmed genesis or duplicates a committed origin`, async () => {
    const request = input(), prepared = await service().prepare(request), logged = await login(prepared.customToken), o = { ...logged, request };
    await child({ operation: "finalize", token: o.token, input: { requestId: request.requestId }, crashAt }, 71);
    const saved = await store.read(o.uid), before = await snapshot(o), root = await db.doc(`users/${o.uid}`).get();
    if (crashAt === "genesis-started" || crashAt === "genesis-before-checkpoint") {
      assert.equal(saved.control.phase, "GENESIS_CREATE_STARTED"); assert.equal(root.exists, crashAt === "genesis-before-checkpoint");
      const s = service(); await rejected(o, () => s.finalize(o.token, { requestId: request.requestId }), "origin_controlled_recovery_required");
      assert.equal((await s.recover(o.token)).state, "PROVISIONING_PENDING"); assert.deepEqual(await snapshot(o), before); return;
    }
    const originalHash = saved.attestation?.attestationHash;
    const resumed = await child({ operation: "finalize", token: o.token, input: { requestId: request.requestId } });
    assert.equal(resumed.value.state, "EXTERNAL_TRUST_NOT_ENFORCED");
    const recovered = await child({ operation: "recover", token: o.token });
    assert.equal(recovered.value.consistency, "FINALIZED_COMMITMENTS_MATCH");
    assert.equal(recovered.value.incarnationId, saved.intent.incarnationId);
    if (originalHash) { assert.equal(recovered.value.attestation.attestationHash, originalHash); assert.deepEqual(await snapshot(o), before); }
    assert.equal((await store.read(o.uid)).events.length, 6);
  });
}
test("same-request concurrency and identical retries retain one identity; conflicting inputs and owner spoofing leave state unchanged", async () => {
  const request = input(), a = service(), b = service();
  const results = await Promise.allSettled([a.prepare(request), b.prepare(request)]);
  const success = results.find(r => r.status === "fulfilled"); assert.ok(success);
  const prepared = success.value, o = { ...await login(prepared.customToken), request };
  assert.equal((await a.prepare(request)).uid, prepared.uid);
  const final = await a.finalize(o.token, { requestId: request.requestId }), before = await snapshot(o);
  assert.equal((await b.finalize(o.token, { requestId: request.requestId })).attestation.attestationHash, final.attestation.attestationHash);
  await rejected(o, () => b.prepare({ ...request, identityForm: "unicode58" }), "origin_request_conflict");
  await rejected(o, () => b.finalize(o.token, { requestId: "not-my-request" }), "origin_request_owner_mismatch");
  await rejected(o, () => b.finalize(o.token, { requestId: request.requestId, uid: "forged" }));
  assert.deepEqual(await snapshot(o), before);
});
test("an actual Firestore transaction retry commits one intent, one Auth identity and one original chain", async () => {
  const original = Firestore.prototype.runTransaction; let attempts = 0;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const result = await callback(tx);
    if (this.projectId === api.ORIGIN_REALM && !options?.readOnly && ++attempts === 1) { const error = new Error("Injected ABORTED"); error.code = 10; throw error; }
    return result;
  }, options); };
  let o; try { o = await owner(); } finally { Firestore.prototype.runTransaction = original; }
  assert.ok(attempts >= 2); const saved = await store.read(o.uid); assert.equal(saved.events.length, 6); assert.equal(saved.control.sequence, 6);
});
test("transaction failure before intent commit leaves no authority records or Auth identity", async () => {
  const request = input(), original = Firestore.prototype.runTransaction; let uid;
  const s = service({ onBoundary: async (name, observed) => { if (name === "before-intent") uid = observed; } });
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const result = await callback(tx); if (this.projectId === api.ORIGIN_REALM && !options?.readOnly) { const error = new Error("Injected rejection"); error.code = "origin_test_failure"; throw error; } return result;
  }, options); };
  try { await assert.rejects(() => s.prepare(request)); } finally { Firestore.prototype.runTransaction = original; }
  assert.equal(await store.byRequest(request.requestId), null); assert.equal((await authority.doc(`originOwners/${uid}`).get()).exists, false);
  await assert.rejects(() => transport.application.getAuthClient().getUser(uid));
});
test("failed attestation transaction leaves the original committed genesis and ledger intact", async () => {
  const request = input(), s = service({ onBoundary: async name => { if (name === "genesis-recorded") throw new Error("Pause before finalization"); } });
  const prepared = await s.prepare(request), o = { ...await login(prepared.customToken), request };
  await assert.rejects(() => s.finalize(o.token, { requestId: request.requestId }));
  assert.equal((await store.read(o.uid)).control.phase, "GENESIS_COMMITTED"); const before = await snapshot(o);
  const original = Firestore.prototype.runTransaction;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const value = await callback(tx);
    if (this.projectId === api.ORIGIN_REALM && !options?.readOnly) { const error = new Error("Finalization aborted"); error.code = "origin_test_failure"; throw error; }
    return value;
  }, options); };
  try { await assert.rejects(() => service().finalize(o.token, { requestId: request.requestId })); }
  finally { Firestore.prototype.runTransaction = original; }
  assert.deepEqual(await snapshot(o), before); assert.equal((await authority.doc(`originAttestations/${o.uid}`).get()).exists, false);
  assert.equal((await service().finalize(o.token, { requestId: request.requestId })).state, "EXTERNAL_TRUST_NOT_ENFORCED");
  assert.equal((await store.read(o.uid)).events.length, 6);
});
test("invalid and different-account tokens cannot finalize another origin or choose its UID", async () => {
  const a = await owner(), b = await owner();
  await rejected(a, () => a.s.finalize("invalid-demo-token", { requestId: a.request.requestId }));
  await rejected(a, () => a.s.finalize(b.token, { requestId: a.request.requestId }), "origin_request_owner_mismatch");
  await rejected(a, () => a.s.recover("invalid-demo-token"));
});
test("same UID imported with original creation time but missing incarnation claim is durably revoked", async () => {
  const o = await owner(), a = transport.application.getAuthClient(), prior = await a.getUser(o.uid), oldHash = (await store.read(o.uid)).attestation.attestationHash;
  await a.deleteUser(o.uid); assert.equal((await a.importUsers([{ uid: o.uid, metadata: { creationTime: prior.metadata.creationTime } }])).successCount, 1);
  const logged = await login(await a.createCustomToken(o.uid)); assert.equal((await service().recover(logged.token)).state, "ORIGIN_REVOKED");
  await a.setCustomUserClaims(o.uid, prior.customClaims);
  const again = await login(await a.createCustomToken(o.uid)); assert.equal((await service().recover(again.token)).state, "ORIGIN_REVOKED");
  assert.equal((await store.read(o.uid)).attestation.attestationHash, oldHash);
  await rejected({ ...again, request: o.request }, () => service().prepare(o.request), "origin_revoked");
});
test("privileged Auth import restoring BOTH metadata and claims remains indistinguishable and explicitly UNTRUSTED", async () => {
  const o = await owner(), a = transport.application.getAuthClient(), old = await a.getUser(o.uid);
  await a.deleteUser(o.uid); assert.equal((await a.importUsers([{ uid: o.uid, metadata: { creationTime: old.metadata.creationTime }, customClaims: old.customClaims }])).successCount, 1);
  const logged = await login(await a.createCustomToken(o.uid)), result = await service().recover(logged.token);
  assert.equal(result.consistency, "FINALIZED_COMMITMENTS_MATCH"); assert.equal(result.state, "EXTERNAL_TRUST_NOT_ENFORCED");
  assert.equal(result.authority, "NOT VERIFIED"); assert.equal(result.publicationEligible, false);
});
test("wrong-account attestation and epoch mismatch fail closed without manufacturing a replacement", async () => {
  const a = await owner(), b = await owner(), original = (await authority.doc(`originAttestations/${a.uid}`).get()).data();
  await authority.doc(`originAttestations/${b.uid}`).set(original); const before = await snapshot(b);
  assert.equal((await b.s.recover(b.token)).state, "ORIGIN_UNVERIFIED"); assert.deepEqual(await snapshot(b), before);
  await db.doc(`${api.LIFECYCLE_COLLECTION}/${a.uid}`).update({ lifecycleEpoch: 2 });
  assert.equal((await a.s.recover(a.token)).state, "ORIGIN_REVOKED"); assert.equal((await store.read(a.uid)).control.phase, "REVOKED");
});
test("root deletion/recreation with identical fields is rejected and monotonic revocation survives restart", async () => {
  const o = await owner(), root = db.doc(`users/${o.uid}`), data = (await root.get()).data(); await root.delete(); await root.set(data);
  assert.equal((await service().recover(o.token)).state, "ORIGIN_REVOKED");
  assert.equal((await child({ operation: "recover", token: o.token })).value.state, "ORIGIN_REVOKED");
  await rejected(o, () => service().finalize(o.token, { requestId: o.request.requestId }), "origin_revoked");
});
for (const kind of ["deleting", "deleted", "missing"]) test(`observed lifecycle ${kind} permanently closes the origin API without deleting an attestation`, async () => {
  const o = await owner(), c = api.createAuthorityPrototype(); services.push(c); const original = (await db.doc(`${api.LIFECYCLE_COLLECTION}/${o.uid}`).get()).data();
  const hash = (await store.read(o.uid)).attestation.attestationHash;
  if (kind === "missing") await db.doc(`${api.LIFECYCLE_COLLECTION}/${o.uid}`).delete();
  else { await c.transition(o.token, api.writerContext(await c.read(o.token)), "deleting"); if (kind === "deleted") await c.transition(o.token, api.writerContext(await c.read(o.token)), "deleted"); }
  assert.equal((await o.s.recover(o.token)).state, "ORIGIN_REVOKED");
  if (kind === "missing") await db.doc(`${api.LIFECYCLE_COLLECTION}/${o.uid}`).set(original);
  assert.equal((await service().recover(o.token)).state, "ORIGIN_REVOKED"); assert.equal((await store.read(o.uid)).attestation.attestationHash, hash);
});
test("explicit revocation is idempotent, terminal and preserved during concurrent finalization", async () => {
  const request = input(), s = service(), p = await s.prepare(request), o = { ...await login(p.customToken), request };
  await Promise.allSettled([s.finalize(o.token, { requestId: request.requestId }), s.revoke(o.token, { reason: "operator-demo" })]);
  assert.equal((await s.recover(o.token)).state, "ORIGIN_REVOKED"); const before = await snapshot(o);
  await s.revoke(o.token, { reason: "operator-demo" }); assert.deepEqual(await snapshot(o), before);
  await rejected(o, () => service().prepare(request), "origin_revoked");
});
test("missing independent records and forged/altered attestations never fall back to application genesis", async () => {
  const o = await owner(); await authority.doc(`originAttestations/${o.uid}`).delete(); const before = await snapshot(o);
  await db.doc(`originAttestations/${o.uid}`).set({ originVerified: true });
  assert.equal((await o.s.recover(o.token)).state, "ORIGIN_UNVERIFIED");
  const after = await snapshot(o); assert.deepEqual(after, before); // Root-scoped snapshot excludes the deliberate wrong-realm marker.
  const other = await owner(); await authority.doc(`originAttestations/${other.uid}`).update({ trustBoundary: "VERIFIED" });
  const altered = await snapshot(other); assert.equal((await other.s.recover(other.token)).state, "ORIGIN_UNVERIFIED"); assert.deepEqual(await snapshot(other), altered);
});
test("Admin bypass can replace identical authority bytes: separate project and hashes do NOT authenticate historical provenance", async () => {
  const o = await owner(), ref = authority.doc(`originAttestations/${o.uid}`), original = (await ref.get()).data();
  await ref.delete(); await ref.create(original); const result = await service().recover(o.token);
  assert.equal(result.state, "EXTERNAL_TRUST_NOT_ENFORCED"); assert.equal(result.admissionEligible, false); assert.equal(result.publicationEligible, false);
});
test("unrestricted Admin can roll back a revocation, so structural recovery never becomes trusted authority", async () => {
  const o = await owner(), old = await store.read(o.uid); await o.s.revoke(o.token, { reason: "operator-demo" });
  assert.equal((await service().recover(o.token)).state, "ORIGIN_REVOKED");
  // Adversary bypasses the append-only API. No production credentials or IAM
  // are involved. This is deliberately NOT asserted to be an enforced deny.
  await authority.runTransaction(async tx => {
    tx.set(authority.doc(`originOwners/${o.uid}`), { ...old.control });
    tx.delete(authority.doc(`originOwners/${o.uid}/events/${api.originEventKey(7)}`));
  });
  const result = await service().recover(o.token);
  assert.equal(result.consistency, "FINALIZED_COMMITMENTS_MATCH"); assert.equal(result.state, "EXTERNAL_TRUST_NOT_ENFORCED");
  assert.equal(result.authority, "NOT VERIFIED"); assert.equal(result.admissionEligible, false); assert.equal(result.publicationEligible, false);
});
test("browser rules deny all authority writes/reads and preserve active drafts, streaks, recommendations and user fields", async () => {
  const o = await owner(), other = await owner();
  for (const context of [authorityRules.authenticatedContext(o.uid, { originVerified: true }), authorityRules.authenticatedContext(other.uid), authorityRules.unauthenticatedContext()]) {
    for (const target of [`originProvisioningRequests/${api.originRequestKey(o.request.requestId)}`, `originAttestations/${o.uid}`, `originOwners/${o.uid}`, `originOwners/${o.uid}/events/0000000000000001`]) {
      const ref = web.doc(context.firestore(), target); await assertFails(web.getDoc(ref)); await assertFails(web.setDoc(ref, { forged: true })); await assertFails(web.deleteDoc(ref));
    }
  }
  for (const target of [`trainingBootstrapOrigins/${o.uid}`, `${api.LIFECYCLE_COLLECTION}/${o.uid}`]) await assertFails(web.setDoc(web.doc(o.client, target), { forged: true }));
  await assertFails(web.getDoc(web.doc(other.client, `users/${o.uid}`)));
  await assertSucceeds(web.updateDoc(web.doc(o.client, `users/${o.uid}`), { name: "Synthetic demo", preferences: { compact: true } }));
  await assertFails(web.updateDoc(web.doc(o.client, `users/${o.uid}`), { learningProfile: { forged: true } }));
  const methodIds = ["active-recall"], sessionId = "origin-draft-" + unique();
  await createFirebaseTrainingQuotaManager({ now: () => Date.parse("2026-10-25T10:00:00.000Z"), getFirestore: () => db }).reserve(o.uid, { sessionId, mode: "manual", methodIds, timezone: "UTC" });
  const draft = web.doc(o.client, `users/${o.uid}/trainingProgress/active`);
  await assertSucceeds(web.setDoc(draft, { schemaVersion: 1, sessionId, owner: { kind: "user", uid: o.uid }, mode: "manual", selectedMethods: methodIds }));
  await assertSucceeds(web.updateDoc(draft, { section: 4 })); await assertSucceeds(web.deleteDoc(draft));
  await assertSucceeds(web.setDoc(web.doc(o.client, `users/${o.uid}/trainingActivity/2026-10-25`), { dayKey: "2026-10-25", firstSessionId: sessionId, firstMode: "manual", methodIds, timezone: "UTC" }));
  await assertSucceeds(web.setDoc(web.doc(o.client, `users/${o.uid}/trainingStats/streak`), { currentStreak: 1, longestStreak: 1, totalActiveDays: 1, lastCompletedDay: "2026-10-25" }));
  await assertSucceeds(web.setDoc(web.doc(o.client, `users/${o.uid}/aiRecommendations/latest`), { schemaVersion: 1, mode: "standard", inputs: { biggestProblem: "Demo", methodQuestion: "Demo", extraContext: "" },
    result: { user_problem: "Demo", recommended_methods: [{ name: "Recall", branch: "memory", reason: "Demo", warning: "Demo" }], study_plan: "Demo", final_note: "Demo" }, updatedAt: web.serverTimestamp() }));
  assert.equal((await o.s.recover(o.token)).state, "EXTERNAL_TRUST_NOT_ENFORCED");
  const acceptance = api.createStage2EmulatorTransport(), v2 = api.createStage2AcceptanceService(acceptance), worker = api.createShadowWorker(), v1 = createEmulatorTrainingCompletionService();
  const completion = completionFixture({ sessionId, mode: "manual", count: 1 }), before = await snapshot(o);
  try {
    await assert.rejects(() => v1.complete(o.uid, completion)); await assert.rejects(() => v2.admitFreshOwner(o.token));
    await assert.rejects(() => v2.accept(o.token, completion)); await assert.rejects(() => worker.claim(o.uid));
    assert.deepEqual(await snapshot(o), before);
  } finally { await v1.close(); await worker.close(); await acceptance.close(); }
  assert.equal((await db.collection(`users/${o.uid}/learningEvidence`).get()).size, 0);
});
test("Unicode exact owner identity and root commitment survive durable reconstruction without normalization", async () => {
  for (const form of ["unicode58", "unicode128"]) {
    const o = await owner(service(), form), ledger = await store.read(o.uid), result = await service().recover(o.token);
    assert.equal(o.uid.length, form === "unicode58" ? 58 : 128); assert.equal(ledger.attestation.commitment.uid, o.uid);
    assert.equal(result.incarnationId, ledger.intent.incarnationId); assert.equal(result.state, "EXTERNAL_TRUST_NOT_ENFORCED");
  }
});
