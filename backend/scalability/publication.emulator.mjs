import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { completionFixture } from "../completionFixtures.mjs";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";

assert.equal(process.versions.node.split(".")[0], "24");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
Object.assign(process.env, { TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_SHADOW_STAGE3A: "emulator-only", TRAINING_PUBLICATION_STAGE3B: "emulator-only" });
const bundle = await build({ stdin: { contents: ["publication", "publicationContracts", "shadowWorker", "acceptance", "acceptanceTransport", "acceptanceState",
  "acceptanceBatches", "journal", "receipts", "inventory", "generations", "values"].map(name => `export * from "./backend/scalability/${name}";`).join("\n") +
  '\nexport { digest, validateCompletion } from "./backend/trainingCompletionContract";\nexport { nativeCompletionIdentity, completionSourceIdentity } from "./backend/trainingCompletion";',
  resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, platform: "node", target: "node24", format: "esm", packages: "external" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/publication-test-api.mjs", bundle.outputFiles[0].text);
const api = await import("../../dist-stage2/publication-test-api.mjs");
const tools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment, assertFails, assertSucceeds } = tools("@firebase/rules-unit-testing"), web = tools("firebase/firestore");
web.setLogLevel("silent");
const NOW = Date.parse("2026-10-23T12:00:00.000Z"), key = n => String(n).padStart(16, "0");
let transport, db, rules; const resources = [];
const publisher = options => { const p = api.createDevelopmentPublisher(options); resources.push(p); return p; };
const worker = options => { const w = api.createShadowWorker(options); resources.push(w); return w; };
const ref = (owner, name) => owner.refs.user.collection("learningProfiles").doc(name);
const pubRef = owner => ref(owner, "developmentPublicationStage3b");
const coordinatorRef = owner => ref(owner, "developmentPublicationCoordinatorStage3b");
async function account() {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-stage3b-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "publication-" + crypto.randomUUID() + "@example.test",
      password: "synthetic-emulator-password", returnSecureToken: true }) });
  assert.equal(response.status, 200); const a = await response.json();
  await db.doc("users/" + a.localId).set({ displayName: "Synthetic publication student" });
  const service = api.createStage2AcceptanceService(transport, { now: () => NOW }); await service.admitFreshOwner(a.idToken);
  return { uid: a.localId, token: a.idToken, service, refs: api.acceptanceReferences(db, a.localId) };
}
async function accept(owner, n, mode = "manual", count = 1) {
  const input = completionFixture({ sessionId: "publication-session-" + key(n), mode, count });
  await createFirebaseTrainingQuotaManager({ now: () => NOW - (200 - n) * 86400000, getFirestore: () => db }).reserve(owner.uid,
    { sessionId: input.sessionId, mode, methodIds: mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
  return owner.service.accept(owner.token, input);
}
async function candidate(count = 1, mode = "manual", methods = 1) {
  const owner = await account(); for (let n = 0; n < count; n++) await accept(owner, n, mode, methods);
  const w = worker(), result = await w.processOwner(owner.uid); assert.equal(result.job.state, "ready");
  return { owner, w, ...result, refs: api.shadowReferences(db, owner.uid, result.handle.generationId) };
}
async function state(c) {
  const r = c.owner.refs, groups = {};
  for (const [name, collection] of [["profiles", r.user.collection("learningProfiles")], ["evidence", r.user.collection("learningEvidence")],
    ["identities", r.user.collection("learningEvidenceIdentityEvents")], ["indexes", r.user.collection("learningEvidenceSourceIndex")],
    ["assessments", r.user.collection("assessments")], ["usage", r.user.collection("trainingUsage")], ["reservations", r.user.collection("trainingReservations")],
    ["journal", r.journal], ["archives", r.archives], ["batches", r.batches], ["artifacts", c.refs.artifacts]])
    groups[name] = (await collection.get()).docs.map(row => ({ id: row.id, data: row.data() }));
  return { root: (await r.user.get()).data(), ...groups };
}
function marker(owner) { return { schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1, protocol: "stage3b-coordinator-v1", lifecycle: "active",
  fencingToken: 1, writerProtocol: "journal-v2", policy: api.PUBLICATION_POLICY }; }
function untrustedPointer(c, pointerVersion = 1) { return { schemaVersion: 1, status: "published", owner: { kind: "user", uid: c.owner.uid }, lifecycleEpoch: 1,
  generationId: c.handle.generationId, source: c.job.pin.source, nativeAcceptedCount: c.job.pin.checkpoint.ordinal,
  manifestHash: c.job.verification.manifestHash, profileHash: "a".repeat(64), profileSchemaVersion: 2,
  aggregationVersion: c.job.pin.aggregationVersion, executionVersion: c.job.pin.executionVersion,
  verificationProtocol: api.PUBLICATION_PROTOCOL, evidenceProtocol: api.EVIDENCE_PROTOCOL, policy: api.PUBLICATION_POLICY,
  pointerVersion, publishedAt: "2026-10-23T12:00:00.000Z", coordinatorFence: 1, authorizationDigest: "b".repeat(64) }; }
before(async () => {
  transport = api.createStage2EmulatorTransport(); db = transport.getFirestore(); await db.doc("users/stage3b-connectivity").get();
  rules = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787,
    rules: await readFile(new URL("../../test-support/firestore/owner-supplied.rules", import.meta.url), "utf8") } });
});
afterEach(async () => { for (const r of resources.splice(0)) await r.close(); });
after(async () => { await rules?.cleanup(); await transport?.close(); });

for (const [mode, count] of [["manual", 1], ["auto", 3], ["auto", 4]]) test(`fresh ${mode}/${count}: independent source verification is not publication authority`, async () => {
  const c = await candidate(1, mode, count), p = publisher(), before = await state(c);
  assert.equal((await publisher().verifyStructure(c.owner.token, c.handle.generationId)).state, "STRUCTURALLY_VALID");
  const result = await p.publish(c.owner.token, c.handle.generationId);
  assert.equal(result.verification.state, "SOURCE_VERIFIED"); assert.equal(result.verification.publicationEligible, false);
  assert.equal(result.status, "NOT_PUBLISHED"); assert.equal(result.pointerWrites, 0); assert.equal(p.metrics.maxCasReads, 14); // lifecycle + persisted enrollment checks
  assert.ok(result.blockers.includes("bootstrap_origin_unattested")); assert.ok(result.blockers.includes("publication_coordinator_missing"));
  assert.deepEqual(await state(c), before); assert.equal((await c.owner.refs.control.get()).data().published, null);
  console.log("STAGE3B SMALL COST", JSON.stringify({ mode, methods: count, ...p.metrics }));
});
test("empty admitted owner remains source verified but cannot publish an artificial empty bootstrap", async () => {
  const c = await candidate(0), p = publisher(), before = await state(c), result = await p.publish(c.owner.token, c.handle.generationId);
  assert.equal(result.verification.nativeAcceptedCount, 0); assert.equal(result.status, "NOT_PUBLISHED"); assert.deepEqual(await state(c), before);
});
for (const damage of ["counter", "checkpoint", "middle-journal", "source", "archive-receipt", "manifest", "profile", "page", "missing-page", "extra-page",
  "bootstrap", "writer", "epoch", "owner", "unverified-source", "legacy-assessment", "root-snapshot", "draft", "activity", "stats", "partial-generation"])
  test("rejects " + damage + " with no pointer or source writes", async () => {
    const c = await candidate(damage === "middle-journal" ? 3 : 1), o = c.owner;
    if (damage === "counter") await o.refs.control.update({ nativeAcceptedCount: 99 });
    if (damage === "checkpoint") await o.refs.checkpoint.update({ ordinal: 99 });
    if (damage === "middle-journal") await o.refs.journal.doc(api.journalIdentity({ uid: o.uid, lifecycleEpoch: 1 }, 3)).delete();
    if (damage === "source") { const rows = await o.refs.user.collection("learningEvidence").get(); await rows.docs[0].ref.update({ resultAuthority: "forged" }); }
    if (damage === "archive-receipt") { const rows = await o.refs.archives.get(); await rows.docs[0].ref.update({ requestHash: "0".repeat(64) }); }
    if (["manifest", "profile", "page"].includes(damage)) await c.refs.artifacts.doc((damage === "page" ? "references" : damage) + "-" + key(0)).update({ bodyHash: "0".repeat(64) });
    if (damage === "missing-page") await c.refs.artifacts.doc("references-" + key(0)).delete();
    if (damage === "extra-page") { const a = (await c.refs.artifacts.doc("profile-" + key(0)).get()).data(); await c.refs.artifacts.doc("profile-" + key(1)).set({ ...a, index: 1 }); }
    if (damage === "bootstrap") await o.refs.admission.update({ admittedAt: "ambiguous date" });
    if (damage === "writer") await o.refs.fence.update({ writerProtocol: "legacy" });
    if (damage === "epoch") await o.refs.control.update({ lifecycleEpoch: 2 });
    if (damage === "owner") await o.refs.control.update({ uid: "different-owner" });
    if (damage === "unverified-source") await o.refs.user.collection("learningEvidence").doc("unverified-source").set({ schemaVersion: 1 });
    if (damage === "legacy-assessment") await o.refs.user.collection("assessments").doc("unlinked-legacy").set({ status: "completed" });
    if (damage === "root-snapshot") await o.refs.user.update({ learningProfile: { legacy: true }, latestAssessmentId: "unknown" });
    if (["draft", "activity", "stats"].includes(damage)) await o.refs.user.collection(damage === "draft" ? "trainingProgress" : damage === "activity" ? "trainingActivity" : "trainingStats").doc("legacy").set({ unknownLegacy: true });
    if (damage === "partial-generation") { const data = (await c.refs.job.get()).data(); await c.refs.job.set({ ...data, state: "working", verification: null, checkpoint: { ...data.checkpoint, phase: "verifying" } }); }
    const before = await state(c), p = publisher(); await assert.rejects(p.publish(o.token, c.handle.generationId));
    assert.equal((await pubRef(o).get()).exists, false); assert.equal(p.metrics.writes, 0); assert.deepEqual(await state(c), before);
  });
test("wrong account token cannot read or publish another owner's generation", async () => {
  const c = await candidate(), other = await account(), before = await state(c), p = publisher();
  await assert.rejects(p.publish(other.token, c.handle.generationId)); await assert.rejects(p.publish("invalid-token", c.handle.generationId));
  assert.deepEqual(await state(c), before); assert.equal((await pubRef(other).get()).exists, false);
});
test("structurally valid artifacts do not conceal changed Firestore sources", async () => {
  const c = await candidate(), rows = await c.owner.refs.user.collection("learningEvidence").get(); await rows.docs[0].ref.update({ resultAuthority: "forged" });
  const p = publisher(); assert.equal((await p.verifyStructure(c.owner.token, c.handle.generationId)).state, "STRUCTURALLY_VALID");
  await assert.rejects(p.verify(c.owner.token, c.handle.generationId)); assert.equal((await pubRef(c.owner).get()).exists, false);
});
test("Admin-planted valid coordinator and published-looking pointer cannot authorize publication or receipt recovery", async () => {
  const c = await candidate(); await coordinatorRef(c.owner).set(marker(c.owner)); await pubRef(c.owner).set(untrustedPointer(c, 7));
  const before = await state(c), p = publisher();
  for (let n = 0; n < 3; n++) { const result = await p.publish(c.owner.token, c.handle.generationId); assert.equal(result.status, "NOT_PUBLISHED");
    assert.ok(result.blockers.includes("publication_coordinator_origin_unverified")); }
  assert.equal((await pubRef(c.owner).get()).data().pointerVersion, 7); assert.deepEqual(await state(c), before);
});
test("simultaneous publishers and identical retries never advance an untrusted pointer", async () => {
  const c = await candidate(), before = await state(c), a = publisher(), b = publisher();
  const results = await Promise.all([a.publish(c.owner.token, c.handle.generationId), b.publish(c.owner.token, c.handle.generationId)]);
  assert.ok(results.every(r => r.status === "NOT_PUBLISHED")); assert.deepEqual(await state(c), before);
  console.log("STAGE3B CONCURRENT CHECK", JSON.stringify({ publishers: 2, casAttempts: a.metrics.casAttempts + b.metrics.casAttempts,
    casReads: a.metrics.casReads + b.metrics.casReads, writes: a.metrics.writes + b.metrics.writes }));
});
test("a planted newer pointer cannot be rolled back by an older generation", async () => {
  const c = await candidate(), source = { ...c.job.pin.source, revision: 4, headHash: "e".repeat(64) };
  const newer = { ...untrustedPointer(c, 9), source, nativeAcceptedCount: 2,
    generationId: api.generationIdentity(source, c.job.pin.aggregationVersion, c.job.pin.executionVersion) };
  await pubRef(c.owner).set(newer); const before = await state(c);
  await assert.rejects(publisher().publish(c.owner.token, c.handle.generationId), e => e.code === "publication_rollback");
  assert.deepEqual(await state(c), before); assert.equal((await pubRef(c.owner).get()).data().pointerVersion, 9);
});
for (const race of ["head", "deletion", "root-deletion", "epoch", "lease", "worker-fence", "coordinator-fence", "source", "artifact"])
  test("verification/CAS race: " + race + " never permits a pointer write", async () => {
    const c = await candidate(); if (race === "coordinator-fence") await coordinatorRef(c.owner).set(marker(c.owner));
    let expected;
    const p = publisher({ onEvent: async event => {
      if (event !== "after-source-verification") return;
      if (race === "head") await accept(c.owner, 1);
      if (race === "deletion") await c.owner.refs.control.update({ lifecycle: "deleting" });
      if (race === "root-deletion") await c.owner.refs.user.delete();
      if (race === "epoch") await c.owner.refs.control.update({ lifecycleEpoch: 2 });
      if (race === "lease") { const job = (await c.refs.job.get()).data(); await c.refs.job.set({ ...job, checkpoint: { ...job.checkpoint,
        lease: { ...job.checkpoint.lease, expiresAt: "2000-01-01T00:00:00.000Z" } } }); }
      if (race === "worker-fence") {
        const job = (await c.refs.job.get()).data(), pointer = (await c.refs.pointer.get()).data(), fence = job.checkpoint.fencingToken + 1;
        const writes = db.batch();
        writes.set(c.refs.job, { ...job, checkpoint: { ...job.checkpoint, fencingToken: fence,
          lease: { ...job.checkpoint.lease, fence, workerId: "synthetic-replacement" } } });
        writes.set(c.refs.pointer, { ...pointer, fence }); await writes.commit();
      }
      if (race === "coordinator-fence") await coordinatorRef(c.owner).update({ fencingToken: 2 });
      if (race === "source") { const rows = await c.owner.refs.user.collection("learningEvidence").get(); await rows.docs[0].ref.update({ resultAuthority: "forged" }); }
      if (race === "artifact") await c.refs.artifacts.doc("profile-" + key(0)).update({ bodyHash: "0".repeat(64) });
      expected = await state(c);
    } });
    if (race === "source") {
      const result = await p.publish(c.owner.token, c.handle.generationId); // snapshot was valid; unsafe gap still blocks publication
      assert.equal(result.status, "NOT_PUBLISHED"); assert.ok(result.blockers.includes("privileged_source_writers_unfenced"));
      await assert.rejects(p.verify(c.owner.token, c.handle.generationId));
    } else await assert.rejects(p.publish(c.owner.token, c.handle.generationId));
    assert.deepEqual(await state(c), expected); assert.equal((await pubRef(c.owner).get()).exists, false);
    if (race === "head") { assert.equal((await c.owner.refs.work.get()).data().targetRevision, 4); assert.equal((await c.refs.job.get()).data().state, "ready"); }
  });
test("newer generation rejects an older candidate without damaging pending work", async () => {
  const c = await candidate(); await accept(c.owner, 1); const next = await c.w.processOwner(c.owner.uid);
  const before = await state(c), p = publisher();
  await assert.rejects(p.publish(c.owner.token, c.handle.generationId), e => e.code === "publication_stale_generation");
  assert.equal((await p.publish(c.owner.token, next.handle.generationId)).status, "NOT_PUBLISHED"); assert.deepEqual(await state(c), before);
});
for (const event of ["before-cas", "after-cas"]) test("interruption/lost response " + event + " leaves no partial publication and retry stays closed", async () => {
  const c = await candidate(), before = await state(c), p = publisher({ onEvent: async at => { if (at === event) throw new Error("synthetic-process-interruption"); } });
  await assert.rejects(p.publish(c.owner.token, c.handle.generationId), /synthetic-process-interruption/); assert.deepEqual(await state(c), before);
  const retry = await publisher().publish(c.owner.token, c.handle.generationId); assert.equal(retry.status, "NOT_PUBLISHED"); assert.deepEqual(await state(c), before);
});
test("actual legacy browser permissions are unfenced; new development paths remain client-inaccessible", async () => {
  const c = await candidate(), client = rules.authenticatedContext(c.owner.uid).firestore(), other = rules.authenticatedContext("other-student").firestore();
  await assertSucceeds(web.setDoc(web.doc(client, "users", c.owner.uid), { displayName: "Legacy browser update" }, { merge: true }));
  const result = await publisher().publish(c.owner.token, c.handle.generationId); assert.ok(result.blockers.includes("legacy_browser_writers_unfenced"));
  for (const name of ["developmentPublicationStage3b", "developmentPublicationCoordinatorStage3b"]) {
    await assertFails(web.setDoc(web.doc(client, "users", c.owner.uid, "learningProfiles", name), { forged: true }));
    await assertFails(web.getDoc(web.doc(other, "users", c.owner.uid, "learningProfiles", name)));
  }
  await assertSucceeds(web.setDoc(web.doc(client, "users", c.owner.uid, "assessments", "late-browser-assessment"), { status: "completed" }));
  await assert.rejects(publisher().verify(c.owner.token, c.handle.generationId)); assert.equal((await pubRef(c.owner).get()).exists, false);
});

// Explicitly lower-level, Admin-planted benchmark INPUTS, never authority.
// Real Stage 3A and independent Stage 3B must replay every source. No grant is
// made even if every fixture/hash/manifest is perfectly self-consistent.
async function prebuilt(owner, count) {
  let checkpoint = api.initialAcceptanceCheckpoint({ uid: owner.uid, lifecycleEpoch: 1 });
  const control = (await owner.refs.control.get()).data(); let batchWrite = db.batch(), queued = 0;
  const create = async (r, data) => { batchWrite.create(r, data); if (++queued === 300) { await batchWrite.commit(); batchWrite = db.batch(); queued = 0; } };
  for (let n = 0; n < count; n++) {
    const raw = completionFixture({ sessionId: "publication-benchmark-" + key(n), mode: "manual", count: 1,
      date: new Date(Date.parse("2026-10-19T10:00:00.000Z") - n % 31 * 86400000).toISOString() });
    const recordedAt = new Date(NOW + n).toISOString(), { request, requestHash, evidence } = api.validateCompletion(owner.uid, raw, recordedAt);
    const evidenceId = api.nativeCompletionIdentity(request.sessionId), receipt = api.parseAcceptanceReceipt({ schemaVersion: 2, status: "accepted", sessionId: request.sessionId,
      mode: "manual", evidenceId, requestHash, lifecycleEpoch: 1, acceptedRevision: checkpoint.headRevision + 1, recordedAt, legacyAssessmentId: null, legacyProfileUpdated: false });
    const row = { schemaVersion: 1, evidence, requestHash, receipt, completionDetails: { schemaVersion: 1, methodIntroduction: request.methodIntroduction,
      reflection: request.reflection }, resultAuthority: "client-reported", selectionContextAuthority: "client-advisory" };
    const evidenceHash = api.inventorySourceReference({ schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1, namespace: "learningEvidence", id: evidenceId, payload: row },
      { uid: owner.uid, lifecycleEpoch: 1, revision: 0, headHash: null }).contentHash;
    const decision = { schemaVersion: 1, sourceKind: "native", recordId: request.sessionId, sourceHash: api.completionSourceIdentity("native", request.sessionId),
      fromEvidenceId: null, toEvidenceId: evidenceId, fingerprint: requestHash }, decisionId = api.digest(decision);
    const accepted = api.createJournalEntry({ uid: owner.uid, lifecycleEpoch: 1, revision: checkpoint.headRevision, headHash: checkpoint.headHash },
      { kind: "session-accepted", receipt, evidenceHash }, recordedAt);
    const identity = api.createJournalEntry({ uid: owner.uid, lifecycleEpoch: 1, revision: accepted.revision, headHash: accepted.entryHash },
      { kind: "identity-decided", decisionId, sourceKind: "native", recordId: request.sessionId, fromEvidenceId: null, toEvidenceId: evidenceId,
        linkage: "established", proof: { version: "request-v1", digest: requestHash } }, recordedAt);
    const batch = api.createAcceptanceBatch(checkpoint, [accepted, identity]); checkpoint = api.checkpointForBatch(batch);
    for (const [r, data] of [[owner.refs.user.collection("learningEvidence").doc(evidenceId), row],
      [owner.refs.archives.doc(evidenceId), { schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1, sessionId: request.sessionId, evidenceId, requestHash, payload: request, receipt, archivedAt: recordedAt }],
      [owner.refs.user.collection("learningEvidenceIdentityEvents").doc(decisionId), decision],
      [owner.refs.user.collection("learningEvidenceSourceIndex").doc(decision.sourceHash), { schemaVersion: 1, sourceKind: "native", recordId: request.sessionId, evidenceId, fingerprint: requestHash, decisionId }],
      [owner.refs.journal.doc(accepted.entryId), accepted], [owner.refs.journal.doc(identity.entryId), identity], [owner.refs.batches.doc(batch.batchId), batch]]) await create(r, data);
  }
  if (queued) await batchWrite.commit();
  await owner.refs.control.set({ ...control, headRevision: checkpoint.headRevision, headHash: checkpoint.headHash, nativeAcceptedCount: count });
  await owner.refs.checkpoint.set(checkpoint);
  await owner.refs.work.set({ schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1, status: "pending", targetRevision: checkpoint.headRevision, headHash: checkpoint.headHash,
    aggregationVersion: control.desiredAggregationVersion, executionVersion: control.desiredExecutionVersion });
}
test("1000-session independent source verification cost, not authorized publication or acceptance throughput", { timeout: 900_000 }, async () => {
  const owner = await account(); await prebuilt(owner, 1000);
  const w = worker(), ready = await w.processOwner(owner.uid); assert.equal(ready.job.state, "ready");
  const p = publisher(), start = performance.now(), result = await p.publish(owner.token, ready.handle.generationId);
  assert.equal(result.verification.state, "SOURCE_VERIFIED"); assert.equal(result.verification.nativeAcceptedCount, 1000);
  assert.equal(result.status, "NOT_PUBLISHED"); assert.equal((await pubRef(owner).get()).exists, false);
  assert.equal(p.metrics.writes, 0); assert.equal(p.metrics.maxCasReads, 14);
  assert.equal((await owner.refs.user.collection("learningEvidence").get()).size, 1000); assert.equal((await owner.refs.control.get()).data().published, null);
  console.log("STAGE3B BENCHMARK", JSON.stringify({ fixture: "lower-level-prebuilt-not-authority-not-http", sessions: 1000, wallMs: Math.round(performance.now() - start), ...p.metrics }));
});
