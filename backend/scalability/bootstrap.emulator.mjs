import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { build } from "esbuild";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Firestore, Timestamp } from "firebase-admin/firestore";
import { completionFixture } from "../completionFixtures.mjs";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";
import { createEmulatorTrainingCompletionService } from "../../dist-backend/backend/trainingCompletion.js";

assert.equal(process.versions.node.split(".")[0], "24"); assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787"); assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
Object.assign(process.env, { TRAINING_BOOTSTRAP_STAGE4B1: "emulator-only", TRAINING_JOURNAL_STAGE2: "emulator-only",
  TRAINING_AUTHORITY_STAGE4A: "emulator-only", TRAINING_SHADOW_STAGE3A: "emulator-only" });
const bundled = await build({ stdin: { resolveDir: process.cwd(), loader: "ts", contents:
  ["bootstrap", "bootstrapContracts", "bootstrapInventory", "bootstrapTransport", "authority", "authorityContracts", "acceptanceTransport", "acceptance", "shadowWorker", "values", "inventory"]
    .map(name => `export * from './backend/scalability/${name}';`).join("\n") +
    "\nexport { validateCompletion, digest } from './backend/trainingCompletionContract';\nexport { nativeCompletionIdentity, completionSourceIdentity, legacyAssessmentFingerprint } from './backend/trainingCompletion';\nexport { encodeFirestoreTrainingDraft, decodeFirestoreTrainingDraft } from './src/services/trainingDraftFirestoreCodec';" },
  bundle: true, write: false, platform: "node", target: "node24", format: "esm", packages: "external" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/bootstrap-test-api.mjs", bundled.outputFiles[0].text);
const api = await import("../../dist-stage2/bootstrap-test-api.mjs");
const tools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = tools("@firebase/rules-unit-testing");
const web = tools("firebase/firestore"), auth = tools("firebase/auth"), apps = tools("firebase/app"); web.setLogLevel("silent");
let transport, db, rules; const services = [], clients = [];
const service = options => { const s = api.createBootstrapPrototype(options); services.push(s); return s; };
const unique = () => crypto.randomUUID().replaceAll("-", "");
before(async () => {
  const config = JSON.parse(await readFile("firebase.stage4b1-emulator.json", "utf8"));
  assert.equal(config.emulators.firestore.host, "127.0.0.1"); assert.equal(config.emulators.firestore.port, 18787);
  assert.equal(config.emulators.auth.host, "127.0.0.1"); assert.equal(config.emulators.auth.port, 9099);
  assert.equal(config.firestore.rules, "test-support/firestore/stage4b1-demo.rules");
  rules = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile(config.firestore.rules, "utf8") } });
  transport = api.createStage2EmulatorTransport(); db = transport.getFirestore();
});
afterEach(async () => {
  for (const s of services.splice(0)) await s.close();
  for (const c of clients.splice(0)) { await auth.signOut(c.auth); await web.terminate(c.db); await apps.deleteApp(c.app); }
});
after(async () => {
  await transport?.close(); await rules?.cleanup();
  const restore = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile("test-support/firestore/owner-supplied.rules", "utf8") } }); await restore.cleanup();
});
async function browser(customToken) {
  const app = apps.initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-stage4b1-only", authDomain: "localhost" }, unique());
  const a = auth.getAuth(app); auth.connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
  const client = web.getFirestore(app); web.connectFirestoreEmulator(client, "127.0.0.1", 18787); clients.push({ app, auth: a, db: client });
  const result = customToken ? await auth.signInWithCustomToken(a, customToken) :
    await auth.createUserWithEmailAndPassword(a, unique() + "@example.test", "synthetic-only-password");
  const uid = result.user.uid;
  return { uid, token: await result.user.getIdToken(), client, root: db.doc(`users/${uid}`),
    life: db.doc(`${api.LIFECYCLE_COLLECTION}/${uid}`), genesis: db.doc(`${api.BOOTSTRAP_COLLECTION}/${uid}`) };
}
async function prepared(s = service(), form = "ascii") {
  const requestId = "request-" + unique(), identity = await s.prepareSyntheticIdentity({ requestId, identityForm: form });
  const o = await browser(identity.customToken); assert.equal(o.uid, identity.uid); return { ...o, s, requestId };
}
async function owner(s, suffix) { const o = await prepared(s, suffix); await o.s.bootstrap(o.token, { requestId: o.requestId }); return o; }
async function snapshot(o) {
  const result = [];
  async function walk(ref) { const saved = await ref.get(); result.push([ref.path, saved.data() ?? null]);
    for (const c of await ref.listCollections()) for (const d of await c.listDocuments()) await walk(d); }
  for (const ref of [o.root, o.life, o.genesis]) await walk(ref);
  return result.sort((a, b) => a[0] < b[0] ? -1 : 1);
}
async function rejected(o, operation, code) {
  const before = await snapshot(o); await assert.rejects(operation, e => code === undefined || e.code === code);
  assert.deepEqual(await snapshot(o), before);
}
async function denied(o, operation) { const before = await snapshot(o); await assertFails(operation()); assert.deepEqual(await snapshot(o), before); }
const recordRows = result => result.pages.flatMap(page => page.records);
async function reserve(o, input) {
  await createFirebaseTrainingQuotaManager({ now: () => Date.parse("2026-10-24T10:00:00.000Z"), getFirestore: () => db }).reserve(o.uid,
    { sessionId: input.sessionId, mode: input.mode, methodIds: input.mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
}

test("guard rejects disabled, production and changed transports without a production fallback", () => {
  const old = process.env.TRAINING_BOOTSTRAP_STAGE4B1; delete process.env.TRAINING_BOOTSTRAP_STAGE4B1;
  try { assert.throws(() => api.createBootstrapPrototype(), e => e.code === "bootstrap_disabled"); } finally { process.env.TRAINING_BOOTSTRAP_STAGE4B1 = old; }
  const before = process.env.NODE_ENV; process.env.NODE_ENV = "production";
  try { assert.throws(() => api.createBootstrapPrototype()); } finally { process.env.NODE_ENV = before; }
  const t = api.createBootstrapTransport(); services.push(t); const previous = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIRESTORE_EMULATOR_HOST = "non-loopback.invalid:443";
  try { assert.throws(() => t.getFirestore()); } finally { process.env.FIRESTORE_EMULATOR_HOST = previous; }
});
test("creation order: authenticated reserved cohort cannot write root or history BEFORE atomic genesis", async () => {
  const o = await prepared();
  for (const target of [o.root.path, `${o.root.path}/assessments/first`, `${o.root.path}/quizAttempts/first`, `${o.root.path}/unknown/first`])
    await denied(o, () => web.setDoc(web.doc(o.client, target), { learningProfile: null }));
  const g = await o.s.bootstrap(o.token, { requestId: o.requestId }); assert.equal(g.uid, o.uid);
  const saved = await db.getAll(o.root, o.life, o.genesis, o.root.collection("learningProfiles").doc("cumulative"));
  assert.ok(saved.every(r => r.exists)); assert.ok(saved.every(r => r.createTime.isEqual(saved[0].createTime)));
  assert.equal((await o.life.collection("events").get()).size, 0);
  assert.equal((await o.s.inspect(o.token)).state, "ORIGIN_VERIFIED");
  const inventory = await o.s.inventory(o.token); assert.equal(inventory.completenessAuthority, "NOT VERIFIED");
  assert.equal(inventory.status.studentReady, false); assert.equal((await o.s.requestAdmission(o.token)).admissionEligible, false);
  console.log("STAGE4B1 NEW COHORT", JSON.stringify({ state: inventory.status.state, admissionEligible: false,
    bootstrapWrites: o.s.metrics.writes, maxTransactionReads: o.s.metrics.maximumTransactionReads,
    maxTransactionBytes: o.s.metrics.maximumTransactionBytes, maxTransactionWrites: o.s.metrics.maximumTransactionWrites,
    maxDocumentBytes: o.s.metrics.maximumDocumentBytes }));
});
test("concurrent identical creation/bootstrap and retries return one original genesis; conflicts change nothing", async () => {
  const s = service(), requestId = "concurrent-" + unique(), input = { requestId, identityForm: "ascii" };
  const identities = await Promise.all([s.prepareSyntheticIdentity(input), s.prepareSyntheticIdentity(input)]);
  assert.equal(identities[0].uid, identities[1].uid); const o = { ...await browser(identities[0].customToken), s, requestId };
  const [one, two] = await Promise.all([s.bootstrap(o.token, { requestId }), s.bootstrap(o.token, { requestId })]); assert.deepEqual(one, two);
  const before = await snapshot(o); assert.deepEqual(await s.bootstrap(o.token, { requestId }), one); assert.deepEqual(await snapshot(o), before);
  await rejected(o, () => s.prepareSyntheticIdentity({ requestId, identityForm: "unicode58" }), "bootstrap_request_conflict");
  await rejected(o, () => s.bootstrap(o.token, { requestId: "wrong-request" }), "bootstrap_origin_not_observed");
  await rejected(o, () => s.bootstrap(o.token, { requestId, uid: "forged" }));
});
test("legacy browser history racing atomic creation is denied on both sides of the genesis commit", async () => {
  const o = await prepared();
  const [genesis] = await Promise.all([
    o.s.bootstrap(o.token, { requestId: o.requestId }),
    assertFails(web.setDoc(web.doc(o.client, `${o.root.path}/assessments/racing`), { synthetic: true })),
    assertFails(web.setDoc(web.doc(o.client, `${o.root.path}/quizAttempts/racing`), { synthetic: true }))
  ]);
  assert.equal(genesis.uid, o.uid);
  assert.equal((await o.root.collection("assessments").get()).size, 0);
  assert.equal((await o.root.collection("quizAttempts").get()).size, 0);
  assert.equal((await o.life.collection("events").get()).size, 0);
  assert.equal((await o.root.get()).data().learningProfile, null);
  assert.equal(o.s.metrics.writes, 4);
  const before = await snapshot(o);
  await denied(o, () => web.setDoc(web.doc(o.client, `${o.root.path}/assessments/after`), { synthetic: true }));
  assert.deepEqual(await snapshot(o), before);
});

test("bootstrap transaction interruption, real SDK retry and lost response do not create duplicate origins", async () => {
  const o = await prepared(), original = Firestore.prototype.runTransaction;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const result = await callback(tx); if (!options?.readOnly) { const e = new Error("Injected before commit"); e.code = "audit_interruption"; throw e; } return result;
  }, options); };
  try { await rejected(o, () => o.s.bootstrap(o.token, { requestId: o.requestId }), "audit_interruption"); } finally { Firestore.prototype.runTransaction = original; }
  let attempts = 0;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const result = await callback(tx); if (!options?.readOnly && ++attempts === 1) { const e = new Error("Injected ABORTED"); e.code = 10; throw e; } return result;
  }, options); };
  try { await o.s.bootstrap(o.token, { requestId: o.requestId }); } finally { Firestore.prototype.runTransaction = original; }
  assert.equal(attempts, 2); assert.equal((await o.life.collection("events").get()).size, 0);
  let lose = true; const s = service({ onEvent: async event => { if (event === "after-bootstrap" && lose) { lose = false; throw new Error("Lost response"); } } });
  const lost = await prepared(s); await assert.rejects(() => s.bootstrap(lost.token, { requestId: lost.requestId }));
  const committed = (await lost.genesis.get()).data(), before = await snapshot(lost);
  assert.deepEqual(await s.bootstrap(lost.token, { requestId: lost.requestId }), committed); assert.deepEqual(await snapshot(lost), before);
});
test("stored genesis, fabricated Admin markers and a new service process cannot establish observed origin", async () => {
  const o = await owner(); const restarted = service(); const previous = await snapshot(o);
  assert.equal((await restarted.inspect(o.token)).state, "UNVERIFIED_ORIGIN");
  assert.equal((await restarted.requestAdmission(o.token)).admitted, false); assert.deepEqual(await snapshot(o), previous);
  await rejected(o, () => restarted.bootstrap(o.token, { requestId: o.requestId }), "bootstrap_origin_not_observed");
  const other = await browser(); await other.root.set({ learningProfile: null });
  const g = (await o.genesis.get()).data(), body = { ...g, uid: "b1_forged", genesisHash: undefined }; delete body.genesisHash;
  body.bootstrapDigest = api.createInventoryBootstrap({ uid: body.uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []).bootstrapDigest;
  assert.equal(api.parseGenesis({ ...body, genesisHash: api.typedHash("bootstrap-genesis-stage4b1-v1", body) }).uid, "b1_forged");
  await other.genesis.set({ ...g, uid: other.uid, state: "ADMITTED" });
  const before = await snapshot(other); assert.equal((await restarted.inspect(other.token)).state, "UNVERIFIED_ORIGIN");
  assert.deepEqual(await snapshot(other), before);
});
for (const namespace of [null, "assessments", "quizAttempts", "trainingProgress", "learningEvidence", "learningEvidenceIdentityEvents"]) {
  test(`historical owner with null root profile and ${namespace ?? "no visible history"} remains read-only and unadmitted`, async () => {
    const o = await browser(), s = service(); await o.root.set({ learningProfile: null });
    if (namespace) await o.root.collection(namespace).doc("historical").set({ unknown: true, fingerprint: "a".repeat(64) });
    const before = await snapshot(o), report = await s.inventory(o.token);
    assert.equal(report.status.state, "UNVERIFIED_ORIGIN"); assert.equal(report.reconciliation.migrationAuthorized, false);
    assert.equal(report.status.admitted, false); assert.deepEqual(await snapshot(o), before);
    if (namespace) assert.ok(recordRows(report).some(r => r.path === `${o.root.path}/${namespace}/historical`));
  });
}
test("genuine newly created Auth owner with existing/orphan history cannot bootstrap or silently reconcile it", async () => {
  const o = await prepared(); await db.doc(`${o.root.path}/learningProfiles/missing/artifacts/orphan`).set({ retained: true });
  await rejected(o, () => o.s.bootstrap(o.token, { requestId: o.requestId }), "bootstrap_existing_history_requires_review");
  const result = await o.s.inventory(o.token);
  assert.ok(recordRows(result).some(r => r.path.endsWith("/missing") && !r.exists));
  assert.ok(result.reconciliation.warnings.includes("missing-parent-with-descendants"));
  assert.ok(result.reconciliation.warnings.includes("unsupported-source-scope"));
});
test("protected root recreation is rejected; tombstone remains and no new admission is possible", async () => {
  const o = await owner(), original = (await o.root.get()).data();
  await denied(o, () => web.deleteDoc(web.doc(o.client, o.root.path)));
  await o.root.delete(); await o.root.set(original);
  assert.equal((await o.s.inspect(o.token)).state, "UNVERIFIED_ORIGIN");
  await rejected(o, () => o.s.bootstrap(o.token, { requestId: o.requestId }), "bootstrap_origin_changed");
  const dead = await owner(), c = api.createAuthorityPrototype(); services.push(c);
  await c.transition(dead.token, api.writerContext(await c.read(dead.token)), "deleting");
  await dead.root.delete(); await c.transition(dead.token, api.writerContext(await c.read(dead.token)), "deleted");
  await denied(dead, () => web.setDoc(web.doc(dead.client, dead.root.path), { ...original, uid: dead.uid, createdAt: web.serverTimestamp() }));
  const before = await snapshot(dead); assert.equal((await dead.s.requestAdmission(dead.token)).admissionEligible, false);
  assert.deepEqual(await snapshot(dead), before); assert.equal((await dead.life.get()).data().state, "deleted");
});
test("wrong owner, epoch, revision and writer fence cannot perform coordinated writes", async () => {
  const o = await owner(), other = await owner(), c = api.createAuthorityPrototype(); services.push(c);
  const ctx = api.writerContext(await c.read(o.token));
  for (const patch of [{ uid: other.uid }, { lifecycleEpoch: 2 }, { revision: 1 }, { fence: 2 }, { writerProtocol: "other" }])
    await rejected(o, () => c.createImmutableProbe(o.token, { ...ctx, ...patch }, { id: "stale", kind: "artifact-probe", payload: {} }));
  await rejected(o, () => o.s.bootstrap(other.token, { requestId: o.requestId }), "bootstrap_origin_not_observed");
});
test("Unicode exact 58-unit/158-byte new owner retains identical owner paths and genesis hashes", async () => {
  const o = await owner(undefined, "unicode58");
  assert.equal(o.uid.length, 58); assert.equal(Buffer.byteLength(o.uid), 158);
  const result = await o.s.inventory(o.token); assert.equal(result.status.state, "ORIGIN_VERIFIED");
  assert.ok(recordRows(result).every(r => r.path.includes(o.uid))); assert.equal((await o.genesis.get()).data().uid, o.uid);
  api.verifyBootstrapInventory(result.manifest, result.pages);
  for (const bad of ["bad/uid", "\ud800", "\udfff", ["ascii"]])
    await rejected(o, () => o.s.prepareSyntheticIdentity({ requestId: "invalid-" + unique(), identityForm: bad }));
  const boundary = await owner(undefined, "unicode128"); assert.equal(boundary.uid.length, 128);
  assert.equal((await boundary.s.inspect(boundary.token)).state, "ORIGIN_VERIFIED");
});
test("complete inventory pages detect missing/altered pages; self-consistent omissions never grant authority", async () => {
  const o = await owner(), batch = db.batch();
  for (let i = 0; i < 43; i++) batch.create(o.root.collection("quizAttempts").doc("old-" + i), { synthetic: true }); await batch.commit();
  const before = await snapshot(o), r = await o.s.inventory(o.token); assert.ok(r.pages.length >= 3);
  assert.throws(() => api.verifyBootstrapInventory(r.manifest, r.pages.slice(1)));
  assert.throws(() => api.verifyBootstrapInventory(r.manifest, [{ ...r.pages[0], index: 99 }, ...r.pages.slice(1)]));
  const omitted = api.createBootstrapInventory(r.manifest.pin, recordRows(r).slice(1));
  assert.equal(api.verifyBootstrapInventory(omitted.manifest, omitted.pages).authority, "NOT VERIFIED");
  assert.equal((await o.s.requestAdmission(o.token)).admitted, false); assert.deepEqual(await snapshot(o), before);
});
for (const change of ["insert", "alter", "delete", "new-namespace", "delete-owner", "deleting", "browser-field"]) {
  test(`concurrent ${change} during pinned inventory is detected without inventory writes`, async () => {
    let fired = false, expected; const s = service({ onEvent: async (event, uid) => {
      if (event !== "between-inventory-passes" || fired) return; fired = true;
      const root = db.doc(`users/${uid}`);
      if (change === "insert") await root.collection("quizAttempts").doc("new").set({ synthetic: true });
      if (change === "alter") await root.collection("quizAttempts").doc("old").update({ synthetic: false });
      if (change === "delete") await root.collection("quizAttempts").doc("old").delete();
      if (change === "new-namespace") await db.doc(`${root.path}/unknown/parent/deep/leaf`).set({ synthetic: true });
      if (change === "delete-owner") await root.delete();
      if (change === "deleting") { const c = api.createAuthorityPrototype(); try { await c.transition(o.token, api.writerContext(await c.read(o.token)), "deleting"); } finally { await c.close(); } }
      if (change === "browser-field") await web.updateDoc(web.doc(o.client, root.path), { name: "Concurrent ordinary profile edit" });
      expected = await snapshot(o);
    } });
    const o = await owner(s); await o.root.collection("quizAttempts").doc("old").set({ synthetic: true });
    await assert.rejects(() => s.inventory(o.token), e => ["bootstrap_cutoff_changed", "bootstrap_sources_changed", "bootstrap_origin_changed"].includes(e.code));
    assert.equal(s.metrics.writes, 4); assert.deepEqual(await snapshot(o), expected);
  });
}
test("SDK metadata pagination really honors the pin despite later orphan inserts", async () => {
  let altered = false, captured = [];
  const s = service({ onEvent: async (event, uid) => {
    if (event === "inventory-page" && !altered) { altered = true; await db.doc(`users/${uid}/late/missing/deep/new`).set({ late: true }); }
  } });
  const o = await owner(s); await assert.rejects(() => s.inventory(o.token), e => e.code === "bootstrap_sources_changed");
  assert.equal(s.metrics.writes, 4);
  // Independent direct metadata adapter readTime check, not a cursor assumption.
  const t = api.createBootstrapTransport(); services.push(t);
  const prior = await o.root.get(); await db.doc(`${o.root.path}/later/missing/leaf/new`).set({ later: true });
  let cursor = null;
  do { const p = await t.list("collections", o.root.path, null, prior.readTime, cursor); captured.push(...p.rows); cursor = p.next; } while (cursor);
  assert.ok(!captured.includes("later"));
});
test("arbitrary Admin mutation after final full-source verification is explicitly NOT authoritative", async () => {
  let mutate = true;
  const s = service({ onEvent: async (event, uid) => { if (event === "after-inventory-verification" && mutate) {
    mutate = false; await db.doc(`users/${uid}/quizAttempts/uncoordinated-after-verification`).set({ synthetic: true });
  } } });
  const o = await owner(s), r = await s.inventory(o.token);
  assert.equal(r.completenessAuthority, "NOT VERIFIED"); assert.equal(r.privilegedMutationGap, true);
  assert.equal(r.status.admissionEligible, false); assert.equal(r.status.publicationEligible, false);
});
test("protected browser exclusions, owner-only reads and legacy account compatibility use the COMPLETE policy", async () => {
  const o = await owner(), other = await owner();
  for (const path of ["assessments/a", "quizAttempts/a", "learningEvidence/a", "learningEvidenceIdentityEvents/a", "learningEvidenceSourceIndex/a",
    "learningProfiles/journalControl/journal/a", "learningProfiles/journalControl/acceptanceBatches/a", "learningProfiles/journalControl/completionArchives/a",
    "learningProfiles/shadow-a/artifacts/a", "unknown/a"]) {
    const ref = db.doc(`${o.root.path}/${path}`); await ref.set({ synthetic: true });
    for (const op of [() => web.setDoc(web.doc(o.client, ref.path + "-new"), { changed: true }),
      () => web.updateDoc(web.doc(o.client, ref.path), { changed: true }), () => web.deleteDoc(web.doc(o.client, ref.path))]) await denied(o, op);
  }
  for (const field of ["uid", "createdAt", "trainingLifecycleBinding", "learningProfile", "latestAssessmentId", "learningProfileUpdatedAt"])
    await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { [field]: "forged" }));
  await denied(o, () => web.setDoc(web.doc(o.client, o.genesis.path), { authority: "ADMITTED" }));
  await assertFails(web.getDoc(web.doc(o.client, o.genesis.path)));
  for (const client of [other.client, rules.unauthenticatedContext().firestore()]) for (const path of [o.root.path, `${o.root.path}/learningEvidence/a`])
    await assertFails(web.getDoc(web.doc(client, path)));
  await assertSucceeds(web.updateDoc(web.doc(o.client, o.root.path), { name: "Demo", preferences: { compact: true } }));
  const legacy = await browser(); await assertSucceeds(web.setDoc(web.doc(legacy.client, legacy.root.path), { learningProfile: null }));
  await assertSucceeds(web.setDoc(web.doc(legacy.client, `${legacy.root.path}/assessments/a`), { historical: true }));
});
test("reserved drafts, activity/streak, recommendations remain compatible; no quota or legacy-profile changes", async () => {
  const o = await owner(), input = completionFixture({ sessionId: "stage4b1-draft-session", mode: "manual", count: 1 }); await reserve(o, input);
  const ref = web.doc(o.client, `${o.root.path}/trainingProgress/active`);
  const draft = { schemaVersion: 1, sessionId: input.sessionId, owner: { kind: "user", uid: o.uid }, mode: "manual", selectedMethods: input.selectedMethods,
    phase: "introduction", section: 3, completed: { baseline: null }, internalState: { options: api.encodeFirestoreTrainingDraft([["a", "b"], ["c", "d"]]) } };
  await assertSucceeds(web.setDoc(ref, draft)); await assertSucceeds(web.updateDoc(ref, { section: 4, "completed.methodIntroduction": input.methodIntroduction }));
  assert.deepEqual(api.decodeFirestoreTrainingDraft((await web.getDoc(ref)).data().internalState.options), [["a", "b"], ["c", "d"]]);
  const quotaBefore = (await o.root.collection("trainingUsage").get()).docs.map(r => r.data());
  const r = await o.s.inventory(o.token); assert.ok(recordRows(r).some(row => row.category === "unfinished-draft"));
  assert.deepEqual((await o.root.collection("trainingUsage").get()).docs.map(r => r.data()), quotaBefore);
  await assertSucceeds(web.deleteDoc(ref));
  await assertSucceeds(web.setDoc(web.doc(o.client, `${o.root.path}/trainingActivity/2026-10-24`), { dayKey: "2026-10-24", firstSessionId: input.sessionId, firstMode: "manual", methodIds: input.selectedMethods, timezone: "UTC" }));
  await assertSucceeds(web.setDoc(web.doc(o.client, `${o.root.path}/trainingStats/streak`), { currentStreak: 1, longestStreak: 1, totalActiveDays: 1, lastCompletedDay: "2026-10-24" }));
  await assertSucceeds(web.setDoc(web.doc(o.client, `${o.root.path}/aiRecommendations/latest`), { schemaVersion: 1, mode: "deep", inputs: { biggestProblem: "Synthetic", methodQuestion: "Synthetic", extraContext: "" },
    result: { user_problem: "Synthetic", recommended_methods: [{ name: "Recall", branch: "memory", reason: "Synthetic", warning: "Synthetic" }], study_plan: "Synthetic", final_note: "Synthetic" }, updatedAt: web.serverTimestamp() }));
  for (const target of ["trainingUsage/day", "trainingReservations/id", "entitlements/current"]) await denied(o, () => web.setDoc(web.doc(o.client, `${o.root.path}/${target}`), { forged: true }));
  assert.equal((await o.root.get()).data().learningProfile, null);
});
test("incompatible v1/v2 completions and shadow workers cannot serve protected owners or consume quota", async () => {
  const o = await owner(), input = completionFixture({ sessionId: "stage4b1-legacy-fence", mode: "manual", count: 1 }); await reserve(o, input);
  const v1 = createEmulatorTrainingCompletionService(), v2 = api.createStage2AcceptanceService(transport), worker = api.createShadowWorker();
  try {
    await rejected(o, () => v1.complete(o.uid, input));
    await rejected(o, () => v2.admitFreshOwner(o.token));
    await rejected(o, () => v2.accept(o.token, input));
    await rejected(o, () => worker.claim(o.uid));
  } finally { await v1.close(); await worker.close(); }
  assert.equal((await o.root.get()).data().learningProfile, null); assert.equal((await o.s.inspect(o.token)).studentReady, false);
});
test("uncoordinated quota/webhook-like Admin writes after deletion remain an explicit admission blocker", async () => {
  const o = await owner(), c = api.createAuthorityPrototype(); services.push(c);
  await c.transition(o.token, api.writerContext(await c.read(o.token)), "deleting");
  await c.transition(o.token, api.writerContext(await c.read(o.token)), "deleted");
  // Deliberately demonstrates a GAP, not enforcement: Admin bypasses rules.
  const input = completionFixture({ sessionId: "post-deletion-quota", mode: "manual", count: 1 }); await reserve(o, input);
  await o.root.collection("entitlements").doc("current").set({ plan: "premium", source: "synthetic-webhook-like-fixture" });
  const before = await snapshot(o), report = await o.s.requestAdmission(o.token);
  assert.equal(report.state, "UNVERIFIED_ORIGIN"); assert.ok(report.blockers.includes("privileged-writers-and-iam-unverified"));
  assert.deepEqual(await snapshot(o), before);
});
test("native/legacy duplicates, pre-v2 claims, conflicting aliases and malformed identities are diagnosed, never migrated", async () => {
  const o = await browser(), s = service(), input = completionFixture({ sessionId: "historical-native-legacy", mode: "auto", count: 3 });
  const v = api.validateCompletion(o.uid, input, input.completedAt), id = api.nativeCompletionIdentity(input.sessionId);
  const receipt = { schemaVersion: 1, status: "completed", sessionId: input.sessionId, mode: "auto", evidenceId: id, requestHash: v.requestHash,
    profileRevision: 1, recordedAt: input.completedAt, legacyAssessmentId: input.sessionId, legacyProfileUpdated: true };
  await o.root.set({ learningProfile: v.legacy.learningProfile, latestAssessmentId: input.sessionId });
  await o.root.collection("learningEvidence").doc(id).set({ schemaVersion: 1, evidence: v.evidence, requestHash: v.requestHash, receipt });
  await o.root.collection("assessments").doc(input.sessionId).set({ ...v.legacy, createdAt: new Date(input.completedAt) });
  for (const [kind, fingerprint, target] of [["native", v.requestHash, id], ["legacy", "a".repeat(64), id], ["legacy", "a".repeat(64), "session-" + "b".repeat(64)]]) {
    const d = { schemaVersion: 1, sourceKind: kind, recordId: input.sessionId, sourceHash: api.completionSourceIdentity(kind, input.sessionId),
      fromEvidenceId: null, toEvidenceId: target, fingerprint }, decisionId = api.digest(d);
    await o.root.collection("learningEvidenceIdentityEvents").doc(decisionId).set(d);
    await o.root.collection("learningEvidenceSourceIndex").doc(d.sourceHash).set({ schemaVersion: 1, sourceKind: kind, recordId: input.sessionId,
      evidenceId: target, fingerprint, decisionId });
  }
  await o.root.collection("learningEvidenceIdentityEvents").doc("malformed").set({ sourceKind: "unknown", fingerprint: 42 });
  const before = await snapshot(o), r = await s.inventory(o.token);
  assert.equal(r.status.state, "UNVERIFIED_ORIGIN");
  for (const warning of ["pre-v2-fingerprint-unverified", "conflicting-historical-aliases", "identity-target-missing", "malformed-or-conflicting-source"])
    assert.ok(r.reconciliation.warnings.includes(warning), warning);
  assert.ok(r.reconciliation.facts.some(f => f.kind === "possible-native-legacy-duplicate-not-established"));
  assert.equal(JSON.stringify(r).includes(input.reflection.reflectionText), false);
  assert.deepEqual(await snapshot(o), before);
});
test("a pre-existing reserved-prefix Auth UID cannot be re-enrolled as newly observed", async () => {
  const o = await prepared(), other = service();
  await rejected(o, () => other.prepareSyntheticIdentity({ requestId: "preexisting-" + unique(), identityForm: "ascii", uid: o.uid }));
  await rejected(o, () => other.bootstrap(o.token, { requestId: o.requestId }), "bootstrap_origin_not_observed");
  assert.equal((await other.inspect(o.token)).state, "UNVERIFIED_ORIGIN");
});
test("valid v1 historical evidence preserves unknown lifecycle epoch without losing its receipt or observations", async () => {
  const o = await browser(), s = service(), input = completionFixture({ sessionId: "historical-v1-unknown-epoch", mode: "manual", count: 1 });
  const v = api.validateCompletion(o.uid, input, input.completedAt), id = api.nativeCompletionIdentity(input.sessionId);
  const receipt = { schemaVersion: 1, status: "completed", sessionId: input.sessionId, mode: "manual", evidenceId: id,
    requestHash: v.requestHash, profileRevision: 17, recordedAt: input.completedAt, legacyAssessmentId: null, legacyProfileUpdated: false };
  await o.root.set({ learningProfile: null });
  await o.root.collection("learningEvidence").doc(id).set({ schemaVersion: 1, evidence: v.evidence, requestHash: v.requestHash, receipt });
  const before = await snapshot(o), r = await s.inventory(o.token), source = recordRows(r).find(row => row.path.endsWith(id));
  assert.equal(r.manifest.pin.lifecycleEpoch, null); assert.equal(r.manifest.pin.journal, null);
  assert.ok(source.issues.includes("historical-lifecycle-epoch-unknown"));
  assert.ok(!source.issues.includes("malformed-or-conflicting-source"));
  assert.ok(source.links.some(l => l.kind === "native-session" && l.recordId === input.sessionId));
  assert.equal((await o.root.collection("learningEvidence").doc(id).get()).data().receipt.profileRevision, 17);
  assert.deepEqual(await snapshot(o), before);
});
test("existing valid Stage 2 journal supplies its known cutoff without inventing an independent lifecycle", async () => {
  const o = await browser(), s = service(); await o.root.set({ learningProfile: null });
  const v2 = api.createStage2AcceptanceService(transport), input = completionFixture({ sessionId: "historical-v2-cutoff", mode: "manual", count: 1 });
  await reserve(o, input); await v2.admitFreshOwner(o.token); await v2.accept(o.token, input);
  const before = await snapshot(o), r = await s.inventory(o.token);
  assert.equal(r.manifest.pin.lifecycleEpoch, null); assert.equal(r.manifest.pin.journal.lifecycleEpoch, 1);
  assert.equal(r.manifest.pin.journal.revision, 2);
  assert.ok(recordRows(r).filter(row => ["acceptance-journal", "acceptance-batch"].includes(row.category))
    .every(row => !row.issues.includes("malformed-or-conflicting-source")));
  assert.ok(!r.reconciliation.warnings.includes("journal-prefix-gap-or-conflict"));
  assert.equal(r.status.state, "UNVERIFIED_ORIGIN"); assert.deepEqual(await snapshot(o), before);
});
test("missing lifecycle and self-consistently rehashed genesis cannot reopen protected client writes or origin", async () => {
  const o = await owner(); await o.life.delete();
  await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { learningProfile: { forged: true } }));
  await denied(o, () => web.updateDoc(web.doc(o.client, o.root.path), { name: "missing lifecycle" }));
  assert.equal((await o.s.inspect(o.token)).state, "UNVERIFIED_ORIGIN");
  const changed = await owner(), { genesisHash, ...body } = (await changed.genesis.get()).data(); body.requestId = "fabricated-new-request";
  await changed.genesis.set({ ...body, genesisHash: api.typedHash("bootstrap-genesis-stage4b1-v1", body) });
  const before = await snapshot(changed); assert.equal((await changed.s.inspect(changed.token)).state, "UNVERIFIED_ORIGIN");
  await rejected(changed, () => changed.s.bootstrap(changed.token, { requestId: changed.requestId }), "bootstrap_origin_changed");
  assert.deepEqual(await snapshot(changed), before);
});
test("changed SDK listing structures fail closed before an enumeration call", async () => {
  const o = await owner(), t = api.createBootstrapTransport(); services.push(t);
  const store = t.getFirestore(), pool = store._clientPool, original = pool.run; let reached = false;
  pool.run = async () => { reached = true; throw new Error("must not invoke changed transport"); };
  try {
    await assert.rejects(() => t.list("collections", o.root.path, null, new Timestamp(1, 0), null),
      e => e.code === "bootstrap_listing_transport_mismatch");
  } finally { pool.run = original; }
  assert.equal(reached, false);
});
for (const count of [100, 500, 1000]) test(`${count} synthetic historical records: bounded pinned diagnostic benchmark, NOT trusted admission`, { timeout: 300_000 }, async () => {
  const o = await browser(), s = service(); await o.root.set({ learningProfile: null });
  for (let offset = 0; offset < count; offset += 200) {
    const batch = db.batch(); for (let i = offset; i < Math.min(count, offset + 200); i++) batch.create(o.root.collection("quizAttempts").doc("synthetic-" + String(i).padStart(6, "0")), { synthetic: true, index: i }); await batch.commit();
  }
  const start = performance.now(), result = await s.inventory(o.token);
  assert.equal(recordRows(result).filter(r => r.exists && r.category === "legacy-unclassified-quiz").length, count);
  assert.equal(result.status.state, "UNVERIFIED_ORIGIN"); assert.equal(result.metrics.writes, 0);
  assert.ok(result.metrics.maximumPageRecords <= 20 && result.metrics.maximumTransactionReads <= 20);
  console.log("STAGE4B1 INVENTORY BENCHMARK", JSON.stringify({ records: count, wallMs: Math.round(performance.now() - start), ...result.metrics,
    inventoryPages: result.pages.length, maxPageBytes: Math.max(...result.pages.map(p => Buffer.byteLength(JSON.stringify(p)))),
    authority: result.completenessAuthority, fixture: "untrusted-synthetic-legacy-not-students" }));
});
