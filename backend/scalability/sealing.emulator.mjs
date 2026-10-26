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
  TRAINING_BOOTSTRAP_STAGE4B1: "emulator-only", TRAINING_ORIGIN_STAGE4B2: "emulator-only", TRAINING_SEAL_STAGE4D: "emulator-only",
  TRAINING_SHADOW_STAGE3A: "emulator-only", TRAINING_PUBLICATION_STAGE3B: "emulator-only" });
const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: "ts", contents:
  ["sealing", "sealingContracts", "sealingCoordination", "writerGuard", "acceptanceTransport", "acceptance", "acceptanceState", "authority", "authorityContracts", "origin", "shadowWorker", "publication", "bootstrapTransport", "values"]
    .map(n => `export * from './backend/scalability/${n}';`).join("\n") + "\nexport { validateCompletion } from './backend/trainingCompletion';" }, bundle: true, write: false, platform: "node", target: "node24", format: "esm", packages: "external" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/sealing-test-api.mjs", bundle.outputFiles[0].text);
const api = await import("../../dist-stage2/sealing-test-api.mjs");
const id = () => crypto.randomUUID().replaceAll("-", ""), resources = [], track = o => { resources.push(o); return o; };
let transport, db, origin, coordinator;
before(async () => {
  transport = api.createStage2EmulatorTransport(); db = transport.getFirestore(); origin = api.createOriginPrototype(); coordinator = api.createAuthorityPrototype();
  await db.doc("stage4dHealth/demo-only").get();
});
afterEach(async () => { for (const o of resources.splice(0)) await o.close(); });
after(async () => { await coordinator?.close(); await origin?.close(); await transport?.close(); });
async function account(identityForm = "ascii") {
  const request = { requestId: "stage4d-" + id(), identityForm }, prepared = await origin.prepare(request);
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-stage4d-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: prepared.customToken, returnSecureToken: true }) });
  assert.equal(response.ok, true); const token = (await response.json()).idToken; await origin.finalize(token, { requestId: request.requestId });
  return { uid: prepared.uid, token, root: db.doc(`users/${prepared.uid}`), control: db.doc(`${api.SEAL_COLLECTION}/${prepared.uid}`) };
}
const sealer = options => track(api.createInventorySealer(options));
const request = () => ({ requestId: "seal-" + id() });
const pages = (o, h) => o.control.collection("attempts").doc(h.sealId).collection("pages");
async function preserved(o) { return Promise.all(["learningEvidence", "assessments", "trainingUsage", "trainingReservations"].map(async name =>
  (await o.root.collection(name).orderBy("__name__").get()).docs.map(d => ({ id: d.id, data: d.data() })))); }
async function many(o) { const batch = db.batch(); for (let i = 0; i < 26; i++) batch.create(o.root.collection("trainingReservations").doc("retained-" + i), { fixture: true }); await batch.commit(); }
test("strict isolated opt-in cannot enable production or accept a remote host", () => {
  const prior = process.env.TRAINING_SEAL_STAGE4D; process.env.TRAINING_SEAL_STAGE4D = "true";
  try { assert.throws(() => api.createInventorySealer(), /seal_disabled/); } finally { process.env.TRAINING_SEAL_STAGE4D = prior; }
  const host = process.env.FIRESTORE_EMULATOR_HOST; process.env.FIRESTORE_EMULATOR_HOST = "firestore.googleapis.com:443";
  try { assert.throws(() => api.createInventorySealer()); } finally { process.env.FIRESTORE_EMULATOR_HOST = host; }
});
test("concurrent identical begin and complete snapshot retain one attempt and never admit or publish", async () => {
  const o = await account(), s = sealer(), r = request(); await many(o); const before = await preserved(o);
  const [a, b] = await Promise.all([s.begin(o.token, r), s.begin(o.token, r)]); assert.deepEqual(a, b);
  const [result, concurrent] = await Promise.all([s.run(o.token, a), s.run(o.token, b)]);
  assert.deepEqual(result, concurrent); assert.ok(result.manifest.pageCount >= 2);
  assert.equal(result.admission, "NOT VERIFIED"); assert.equal(result.admitted, false); assert.equal(result.publicationEligible, false);
  assert.equal(result.inventoryAuthority, "NOT VERIFIED"); assert.equal(result.privilegedMutationGap, true);
  assert.deepEqual(await s.run(o.token, b), result); assert.deepEqual(await preserved(o), before);
  assert.equal((await o.control.get()).data().attemptCount, 1); assert.equal((await o.control.get()).data().phase, "sealed");
  assert.equal((await o.root.collection("learningProfiles").doc("developmentPublicationStage3b").get()).exists, false);
});
for (const event of ["begun", "page-stored", "sealed"]) test(`restart/lost response at ${event} preserves original request, pages and result`, async () => {
  const o = await account(); await many(o); let once = false;
  const a = sealer({ onEvent: async name => { if (!once && name === event) { once = true; throw new api.SealInterruption("process-loss"); } } }), r = request();
  let h;
  if (event === "begun") await assert.rejects(a.begin(o.token, r), /process-loss/);
  else { h = await a.begin(o.token, r); await assert.rejects(a.run(o.token, h), /process-loss/); }
  const b = sealer(), recovered = await b.begin(o.token, r); if (h) assert.deepEqual(recovered, h);
  const storedBefore = (await pages(o, recovered).get()).docs.map(d => ({ id: d.id, data: d.data() }));
  const result = await b.run(o.token, recovered); assert.equal(result.admitted, false);
  for (const row of storedBefore) assert.deepEqual((await pages(o, recovered).doc(row.id).get()).data(), row.data);
  assert.equal((await o.control.get()).data().attemptCount, 1);
});
test("real coordinated probe versus begin serializes; later participant writes are blocked without partial events", async () => {
  const o = await account(), s = sealer(); const setup = await s.begin(o.token, request()); await s.cancel(o.token, setup);
  const life = await coordinator.read(o.token), probe = { id: "probe-" + id(), kind: "evidence-probe", payload: { diagnostic: true } };
  const results = await Promise.allSettled([coordinator.createImmutableProbe(o.token, api.writerContext(life), probe), s.begin(o.token, request())]);
  assert.equal(results[1].status, "fulfilled"); const h = results[1].value;
  const current = await coordinator.read(o.token); assert.equal(h.pin.lifecycleRevision, current.revision);
  const revision = current.revision;
  await assert.rejects(coordinator.createImmutableProbe(o.token, api.writerContext(current), { ...probe, id: "later-" + id() }), /seal_writer_blocked/);
  assert.equal((await coordinator.read(o.token)).revision, revision);
  assert.equal((await o.root.collection("learningEvidence").get()).size, 0);
});
test("a participating write after sealing invalidates the prior seal without deleting its immutable pages", async () => {
  const o = await account(), s = sealer(), h = await s.begin(o.token, request()); await s.run(o.token, h);
  const before = (await pages(o, h).get()).docs.map(d => d.data()); const life = await coordinator.read(o.token);
  await coordinator.createImmutableProbe(o.token, api.writerContext(life), { id: "after-" + id(), kind: "artifact-probe", payload: { note: "diagnostic" } });
  assert.equal((await o.control.get()).data().phase, "open"); await assert.rejects(s.check(o.token, h), /seal_stale_attempt/);
  assert.deepEqual((await pages(o, h).get()).docs.map(d => d.data()), before);
  const next = await s.begin(o.token, request()); assert.equal((await s.run(o.token, next)).admission, "NOT VERIFIED");
});
test("protected V2 acceptance, worker and publication cannot bypass a live seal or consume another quota", async () => {
  const o = await account(), payload = completionFixture({ sessionId: "stage4d-complete-" + id(), mode: "manual", count: 1 });
  await createFirebaseTrainingQuotaManager({ now: () => Date.parse("2026-10-25T10:00:00.000Z"), getFirestore: () => db })
    .reserve(o.uid, { sessionId: payload.sessionId, mode: "manual", methodIds: payload.selectedMethods, timezone: "UTC" });
  const before = await preserved(o), s = sealer(), h = await s.begin(o.token, request());
  await assert.rejects(api.createStage2AcceptanceService(transport).accept(o.token, payload));
  await assert.rejects(track(api.createShadowWorker()).claim(o.uid));
  await assert.rejects(track(api.createDevelopmentPublisher()).publish(o.token, "a".repeat(64)));
  assert.deepEqual(await preserved(o), before); await s.run(o.token, h);
});
test("deletion during inventory invalidates the attempt and preserves evidence and pages", async () => {
  const o = await account(); let deleted = false;
  const s = sealer({ onEvent: async event => { if (!deleted && event === "inventory-page") { deleted = true;
    await coordinator.transition(o.token, api.writerContext(await coordinator.read(o.token)), "deleting"); } } });
  const h = await s.begin(o.token, request()), before = await preserved(o); await assert.rejects(s.run(o.token, h));
  assert.equal((await o.control.get()).data().phase, "invalidated"); assert.equal((await coordinator.read(o.token)).state, "deleting");
  assert.deepEqual(await preserved(o), before); await assert.rejects(s.cancel(o.token, h));
});
for (const kind of ["missing", "duplicate", "altered"]) test(`stored ${kind} page fails closed with no admission`, async () => {
  const o = await account(); await many(o); let injected = false;
  const s = sealer({ onEvent: async (event, h) => { if (event !== "pages-stored" || injected) return; injected = true;
    const p = pages(o, h), first = (await p.doc("00000000").get()).data();
    if (kind === "missing") await p.doc("00000000").delete();
    if (kind === "duplicate") await p.doc("99999999").create(first);
    if (kind === "altered") await p.doc("00000000").update({ pageHash: "f".repeat(64) });
  } }); const h = await s.begin(o.token, request()); await assert.rejects(s.run(o.token, h));
  assert.equal((await o.control.get()).data().phase, "invalidated"); assert.equal((await o.root.collection("learningEvidence").get()).size, 0);
});
test("journal absence changing to a known cutoff rejects the stale attempt", async () => {
  const o = await account(); let once = false;
  const s = sealer({ onEvent: async event => { if (event === "pages-stored" && !once) { once = true;
    await o.root.collection("learningProfiles").doc("journalControl").create({ ...api.initialControl(o.uid) }); } } });
  const h = await s.begin(o.token, request()); assert.equal(h.pin.journalCutoff, null);
  await assert.rejects(s.run(o.token, h), /seal_cutoff_changed/); assert.equal((await o.control.get()).data().phase, "invalidated");
});
for (const path of ["quizAttempts/unknown", "assessments/unknown", "unknownNamespace/missing/descendants/orphan", "learningEvidence/broken"])
  test(`unknown/conflicting historical source ${path} is retained and rejected`, async () => {
    const o = await account(); const ref = db.doc(o.root.path + "/" + path); await ref.create({ uid: o.uid, unsupported: true });
    const s = sealer(), h = await s.begin(o.token, request()); await assert.rejects(s.run(o.token, h));
    assert.equal((await ref.get()).exists, true); assert.equal((await o.control.get()).data().phase, "invalidated");
  });
test("uncoordinated Admin mutation between full inventory passes is detected", async () => {
  const o = await account(); let once = false;
  const s = sealer({ onEvent: async event => { if (event === "pages-stored" && !once) { once = true; await o.root.update({ unrelatedField: "changed" }); } } });
  const h = await s.begin(o.token, request()); await assert.rejects(s.run(o.token, h), /seal_sources_changed/);
  assert.equal((await o.control.get()).data().phase, "invalidated");
});
test("an Admin phantom in the final privileged gap NEVER grants admission and is detected on revalidation", async () => {
  const o = await account(); let once = false;
  const s = sealer({ onEvent: async event => { if (event === "before-finalize" && !once) { once = true; await o.root.collection("unknownLater").doc("phantom").create({ unknown: true }); } } });
  const h = await s.begin(o.token, request()), result = await s.run(o.token, h);
  assert.equal(result.admitted, false); assert.equal(result.inventoryAuthority, "NOT VERIFIED"); assert.equal(result.privilegedMutationGap, true);
  await assert.rejects(s.check(o.token, h)); assert.equal((await o.control.get()).data().phase, "invalidated");
});
for (const external of [false, true]) test(`${external ? "independent demo ledger" : "local transactional"} revocation closes a pending seal`, async () => {
  const o = await account(); let once = false;
  const s = sealer({ onEvent: async (event, h) => { if (event === "pages-stored" && !once) { once = true;
    if (external) await origin.revoke(o.token, { reason: "operator-demo" }); else await s.revoke(o.token, h); } } });
  const h = await s.begin(o.token, request()); await assert.rejects(s.run(o.token, h));
  assert.equal((await o.control.get()).data().phase, "revoked"); await assert.rejects(s.begin(o.token, request()));
});
test("account switching, forged handles and stale request retries cannot alter another owner", async () => {
  const a = await account(), b = await account(), s = sealer(), r = request(), h = await s.begin(a.token, r), before = (await a.control.get()).data();
  await assert.rejects(s.run(b.token, h), /seal_owner_mismatch/); await assert.rejects(s.cancel(b.token, h));
  await assert.rejects(s.run(a.token, { ...h, uid: b.uid })); assert.deepEqual((await a.control.get()).data(), before);
  await s.cancel(a.token, h); await assert.rejects(s.begin(a.token, r), /seal_request_conflict/);
});
test("actual SDK ABORTED retries create one durable attempt and one original manifest", async () => {
  const o = await account(), s = sealer(), r = request(), original = Firestore.prototype.runTransaction; let aborted = false, callbacks = 0;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, async tx => {
    const value = await callback(tx); if (!options?.readOnly) { callbacks++; if (!aborted) { aborted = true; const e = new Error("SDK ABORTED"); e.code = 10; throw e; } } return value;
  }, options); };
  let h; try { h = await s.begin(o.token, r); } finally { Firestore.prototype.runTransaction = original; }
  assert.ok(callbacks >= 2); const first = await s.run(o.token, h); assert.deepEqual(await s.run(o.token, h), first);
  assert.equal((await o.control.get()).data().attemptCount, 1); assert.equal((await o.control.collection("requests").get()).size, 1);
});
test("coordination proposals cannot escape their 4C callback attempt across SDK retries", async () => {
  const o = await account(), s = sealer(), h = await s.begin(o.token, request()); await s.cancel(o.token, h);
  const guard = api.createSharedWriterGuard(transport), principal = await guard.authenticate(o.token), before = (await o.control.get()).data();
  let cached, attempts = 0;
  await assert.rejects(guard.transaction(async tx => {
    if (++attempts === 1) {
      const protectedOwner = await guard.read(tx, principal);
      cached = await api.readSealParticipant(tx, protectedOwner, "stage4a-probe");
      const e = new Error("ABORTED-proposal"); e.code = 10; throw e;
    }
    api.queueSealParticipant(tx, cached); tx.create(o.root.collection("learningEvidence").doc("must-not-exist"), { invalid: true });
  }, { maxAttempts: 2 }), /seal_writer_attempt_invalid/);
  assert.equal(attempts, 2); assert.deepEqual((await o.control.get()).data(), before);
  assert.equal((await o.root.collection("learningEvidence").get()).size, 0);
});
test("an unlinked root legacy profile cannot be sealed as a fresh protected history", async () => {
  const o = await account(), s = sealer(); await o.root.update({ learningProfile: { historical: true }, latestAssessmentId: "unknown-legacy" });
  await assert.rejects(s.begin(o.token, request()), /seal_unadmitted_history/);
  assert.equal((await o.control.get()).exists, false);
});
test("seal proposals require a genuine live 4C snapshot witness, not a raw SDK transaction or cloned result", async () => {
  const o = await account(), s = sealer(), h = await s.begin(o.token, request()); await s.cancel(o.token, h);
  const guard = api.createSharedWriterGuard(transport), p = await guard.authenticate(o.token);
  const expired = await guard.transaction(tx => guard.read(tx, p));
  await assert.rejects(db.runTransaction(tx => api.readSealParticipant(tx, expired, "stage4a-probe")), /writer_guard_transaction_required/);
  await guard.transaction(async tx => {
    const live = await guard.read(tx, p);
    await assert.rejects(api.readSealParticipant(tx, { ...live }, "stage4a-probe"), /writer_guard_transaction_required/);
    await assert.rejects(api.readSealParticipant(tx, expired, "stage4a-probe"), /writer_guard_transaction_required/);
    assert.ok(await api.readSealParticipant(tx, live, "stage4a-probe"));
  });
});
for (const form of ["unicode58", "unicode128"]) test(`exact ${form} Auth ownership and inventory hashes survive sealing`, async () => {
  const o = await account(form), s = sealer(), h = await s.begin(o.token, request()), result = await s.run(o.token, h);
  assert.equal(h.uid, o.uid); assert.equal(result.manifest.pin.uid, o.uid); assert.deepEqual(await s.check(o.token, h), result);
});
test("existing demo client rules deny owner and cross-account reads/writes of the seal namespace", async () => {
  const o = await account(), other = await account(), s = sealer(), h = await s.begin(o.token, request()); await s.run(o.token, h);
  const before = (await o.control.get()).data(), base = "http://127.0.0.1:18787/v1/projects/demo-edulience-phase2a/databases/(default)/documents/";
  for (const token of [o.token, other.token]) {
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    assert.equal((await fetch(base + o.control.path, { headers })).status, 403);
    assert.equal((await fetch(base + o.control.path, { method: "PATCH", headers, body: JSON.stringify({ fields: { forged: { booleanValue: true } } }) })).status, 403);
  }
  assert.deepEqual((await o.control.get()).data(), before);
});
test("a valid historical automatic assessment is preserved without inventing an admitted native identity", async () => {
  const o = await account(), payload = completionFixture({ sessionId: "historical-" + id(), mode: "auto", count: 3 });
  const { legacy } = api.validateCompletion(o.uid, payload, "2026-10-25T10:00:00.000Z");
  const ref = o.root.collection("assessments").doc(payload.sessionId);
  await ref.create({ ...legacy, createdAt: new Date("2026-10-25T10:00:00.000Z") });
  const before = (await ref.get()).data(), s = sealer(), h = await s.begin(o.token, request());
  await assert.rejects(s.run(o.token, h)); assert.deepEqual((await ref.get()).data(), before);
  assert.equal((await o.root.collection("learningEvidence").get()).size, 0);
});

test("repair: omitted flag cannot bypass an enrolled Stage 4A sealing barrier or change any persisted state", async () => {
  const o = await account(), s = sealer(), h = await s.begin(o.token, request()), life = await coordinator.read(o.token);
  const before = await o.control.get(), evidence = await preserved(o), flag = process.env.TRAINING_SEAL_STAGE4D;
  delete process.env.TRAINING_SEAL_STAGE4D;
  try {
    await assert.rejects(coordinator.createImmutableProbe(o.token, api.writerContext(life), {
      id: "without-flag-" + id(), kind: "evidence-probe", payload: { diagnostic: true }
    }), /seal_writer_blocked/);
  } finally { process.env.TRAINING_SEAL_STAGE4D = flag; }
  const after = await o.control.get(); assert.deepEqual(after.data(), before.data()); assert.ok(after.updateTime.isEqual(before.updateTime));
  assert.deepEqual(await coordinator.read(o.token), life); assert.deepEqual(await preserved(o), evidence);
  assert.equal((await o.root.collection("learningProfiles").doc("authorityStage4a").collection("probes").get()).size, 0);
  assert.equal((await s.run(o.token, h)).admission, "NOT VERIFIED");
});

test("repair: missing/stale flag still advances the source revision and invalidates a sealed cutoff", async () => {
  for (const config of [undefined, "stale-disabled-value"]) {
    const o = await account(), s = sealer(), h = await s.begin(o.token, request()); await s.run(o.token, h);
    const before = (await o.control.get()).data(), storedPages = (await pages(o, h).get()).docs.map(d => d.data());
    const life = await coordinator.read(o.token), flag = process.env.TRAINING_SEAL_STAGE4D;
    if (config === undefined) delete process.env.TRAINING_SEAL_STAGE4D; else process.env.TRAINING_SEAL_STAGE4D = config;
    try { await coordinator.createImmutableProbe(o.token, api.writerContext(life), { id: "tracked-" + id(), kind: "artifact-probe", payload: { diagnostic: true } }); }
    finally { process.env.TRAINING_SEAL_STAGE4D = flag; }
    const after = (await o.control.get()).data(); assert.equal(after.phase, "open"); assert.equal(after.sealId, null);
    assert.equal(after.sourceRevision, before.sourceRevision + 1); assert.equal(after.revision, before.revision + 1);
    await assert.rejects(s.check(o.token, h), /seal_stale_attempt/);
    assert.deepEqual((await pages(o, h).get()).docs.map(d => d.data()), storedPages);
  }
});

test("repair: genuinely unenrolled protected owners retain diagnostic writes without a flag", async () => {
  const o = await account(), life = await coordinator.read(o.token), flag = process.env.TRAINING_SEAL_STAGE4D;
  delete process.env.TRAINING_SEAL_STAGE4D;
  try { await coordinator.createImmutableProbe(o.token, api.writerContext(life), { id: "unenrolled-" + id(), kind: "evidence-probe", payload: { diagnostic: true } }); }
  finally { process.env.TRAINING_SEAL_STAGE4D = flag; }
  assert.equal((await o.control.get()).exists, false); assert.equal((await coordinator.read(o.token)).revision, life.revision + 1);
});

test("repair: V2 acceptance and worker/publication paths consult a live seal even without its process flag", async () => {
  const o = await account(), payload = completionFixture({ sessionId: "repair-reserved-" + id(), mode: "manual", count: 1 });
  await createFirebaseTrainingQuotaManager({ now: () => Date.parse("2026-10-25T10:00:00.000Z"), getFirestore: () => db })
    .reserve(o.uid, { sessionId: payload.sessionId, mode: "manual", methodIds: payload.selectedMethods, timezone: "UTC" });
  const s = sealer(), h = await s.begin(o.token, request()), before = await o.control.get(), evidence = await preserved(o);
  const guard = api.createSharedWriterGuard(transport), p = await guard.authenticate(o.token);
  const context = (await guard.transaction(tx => guard.read(tx, p))).context;
  const service = api.createStage2AcceptanceService(transport), worker = track(api.createShadowWorker()), publisher = track(api.createDevelopmentPublisher());
  const original = Firestore.prototype.runTransaction, flag = process.env.TRAINING_SEAL_STAGE4D; let sealReads = 0;
  delete process.env.TRAINING_SEAL_STAGE4D;
  Firestore.prototype.runTransaction = function(callback, options) { return original.call(this, tx => callback(new Proxy(tx, {
    get(target, key) { const value = target[key];
      if (key === "get") return ref => { if (ref.path === o.control.path) sealReads++; return value.call(target, ref); };
      return typeof value === "function" ? value.bind(target) : value;
    }
  })), options); };
  try {
    await assert.rejects(service.accept(o.token, payload)); assert.ok(sealReads >= 1);
    await assert.rejects(worker.claim(o.uid), /seal_writer_blocked/);
    const handle = { uid: o.uid, generationId: "a".repeat(64), fence: 1, workerId: "repair-worker", writerContext: context };
    await assert.rejects(worker.heartbeat(handle), /seal_writer_blocked/);
    await assert.rejects(worker.run(handle), /seal_writer_blocked/);
    await assert.rejects(publisher.publish(o.token, "a".repeat(64)), /seal_writer_blocked/);
  } finally { Firestore.prototype.runTransaction = original; process.env.TRAINING_SEAL_STAGE4D = flag; }
  const after = await o.control.get(); assert.deepEqual(after.data(), before.data()); assert.ok(after.updateTime.isEqual(before.updateTime));
  assert.deepEqual(await preserved(o), evidence); assert.equal((await s.run(o.token, h)).admitted, false);
});

test("repair: an incompatible persisted control fails closed with the flag absent", async () => {
  const o = await account(), s = sealer(); await s.begin(o.token, request()); const life = await coordinator.read(o.token);
  await o.control.update({ protocol: "unknown-future-protocol" }); const before = (await o.control.get()).data();
  const flag = process.env.TRAINING_SEAL_STAGE4D; delete process.env.TRAINING_SEAL_STAGE4D;
  try { await assert.rejects(coordinator.createImmutableProbe(o.token, api.writerContext(life), { id: "incompatible-" + id(), kind: "evidence-probe", payload: {} }), /seal_protocol_invalid/); }
  finally { process.env.TRAINING_SEAL_STAGE4D = flag; }
  assert.deepEqual((await o.control.get()).data(), before); assert.equal((await coordinator.read(o.token)).revision, life.revision);
});

test("repair: missing enrollment read serializes a genuine probe against first enrollment", async () => {
  const o = await account(), s = sealer(), life = await coordinator.read(o.token);
  const results = await Promise.allSettled([
    coordinator.createImmutableProbe(o.token, api.writerContext(life), { id: "enrollment-race-" + id(), kind: "artifact-probe", payload: {} }),
    s.begin(o.token, request())
  ]);
  assert.equal(results[1].status, "fulfilled"); const h = results[1].value, currentLife = await coordinator.read(o.token);
  assert.equal(h.pin.lifecycleRevision, currentLife.revision); assert.equal(currentLife.revision, results[0].status === "fulfilled" ? 1 : 0);
  assert.equal((await s.run(o.token, h)).admitted, false);
});

test("repair: 29,990 cumulative calls cannot consume the budget of a valid run or unchanged check", async () => {
  const o = await account(), s = sealer(), h = await s.begin(o.token, request()); s.metrics.listingCalls = 29990;
  const first = await s.run(o.token, h), afterFirst = s.metrics.listingCalls;
  assert.equal(afterFirst, 29998); const before = await o.control.get(), checked = await s.check(o.token, h), after = await o.control.get();
  assert.deepEqual(checked, first); assert.equal(s.metrics.listingCalls, 30006); assert.equal(after.data().phase, "sealed");
  assert.deepEqual(after.data(), before.data()); assert.ok(after.updateTime.isEqual(before.updateTime));
});

for (const kind of ["missing", "malformed", "hash", "binding", "attempt-phase", "control-phase"])
  test(`repair: sealed ${kind} metadata rejects before reporting consistency or overwriting the manifest`, async () => {
    const o = await account(), s = sealer(), r = request(), h = await s.begin(o.token, r); await s.run(o.token, h);
    const ref = o.control.collection("attempts").doc(h.sealId), original = (await ref.get()).data(), sources = await preserved(o);
    if (kind === "missing") await ref.update({ manifest: null });
    if (kind === "malformed") await ref.update({ manifest: "not-a-manifest" });
    if (kind === "hash") await ref.update({ manifest: { ...original.manifest, manifestHash: "f".repeat(64) } });
    if (kind === "binding") {
      const { manifestHash: _hash, ...body } = original.manifest;
      const changed = { ...body, pin: { ...body.pin, readTime: { ...body.pin.readTime, seconds: body.pin.readTime.seconds + 1 } } };
      await ref.update({ manifest: { ...changed, manifestHash: api.typedHash("bootstrap-inventory-manifest-stage4b1-v1", changed) } });
    }
    if (kind === "attempt-phase") await ref.update({ phase: "sealing", manifest: null });
    if (kind === "control-phase") await o.control.update({ phase: "sealing" });
    const corrupt = (await ref.get()).data();
    await assert.rejects(s.begin(o.token, r)); await assert.rejects(s.check(o.token, h));
    assert.equal((await o.control.get()).data().phase, "invalidated");
    assert.deepEqual((await ref.get()).data(), corrupt); assert.deepEqual(await preserved(o), sources);
    assert.equal((await o.root.collection("learningProfiles").doc("developmentPublicationStage3b").get()).exists, false);
  });

test("repair: unenrolled V2 completions and receipt retries remain idempotent without the flag", async () => {
  const operator = track(api.createBootstrapTransport()), uid = "repair-legacy-" + id();
  await operator.getAuthClient().createUser({ uid }); const custom = await operator.getAuthClient().createCustomToken(uid);
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-repair-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }) });
  assert.equal(response.ok, true); const token = (await response.json()).idToken, root = db.doc(`users/${uid}`);
  await root.create({ uid, learningProfile: null }); const service = api.createStage2AcceptanceService(transport);
  await service.admitFreshOwner(token); const payload = completionFixture({ sessionId: "repair-legacy-session-" + id(), mode: "manual", count: 1 });
  await createFirebaseTrainingQuotaManager({ now: () => Date.parse("2026-10-25T10:00:00.000Z"), getFirestore: () => db })
    .reserve(uid, { sessionId: payload.sessionId, mode: "manual", methodIds: payload.selectedMethods, timezone: "UTC" });
  const quotas = (await root.collection("trainingUsage").get()).docs.map(d => d.data()), flag = process.env.TRAINING_SEAL_STAGE4D;
  delete process.env.TRAINING_SEAL_STAGE4D;
  try { const receipt = await service.accept(token, payload); assert.deepEqual(await service.accept(token, payload), receipt); }
  finally { process.env.TRAINING_SEAL_STAGE4D = flag; }
  assert.deepEqual((await root.collection("trainingUsage").get()).docs.map(d => d.data()), quotas);
  assert.equal((await root.collection("learningEvidence").get()).size, 1); assert.equal((await db.doc(`${api.SEAL_COLLECTION}/${uid}`).get()).exists, false);
  // Persisted enrollment cannot be ignored on a root that now looks legacy:
  // simulate stale/downgraded local account metadata, not a trusted bootstrap.
  const guard = api.createSharedWriterGuard(transport), principal = await guard.authenticate(token);
  const legacyContext = (await guard.transaction(tx => guard.read(tx, principal))).context;
  const enrolled = api.initialSealControl({ ...legacyContext, protection: "protected", lifecycleEpoch: 1,
    rootBinding: "a".repeat(64), fence: 1, writerProtocol: api.AUTHORITY_PROTOCOL, namespaceVersion: api.SOURCE_NAMESPACE_VERSION });
  const control = db.doc(`${api.SEAL_COLLECTION}/${uid}`); await control.create({ ...enrolled });
  const saved = (await control.get()).data(); delete process.env.TRAINING_SEAL_STAGE4D;
  try { await assert.rejects(service.accept(token, payload)); }
  finally { process.env.TRAINING_SEAL_STAGE4D = flag; }
  assert.deepEqual((await control.get()).data(), saved); assert.equal((await root.collection("learningEvidence").get()).size, 1);
  assert.deepEqual((await root.collection("trainingUsage").get()).docs.map(d => d.data()), quotas);
});
