import assert from "node:assert/strict";
import { test, before, after, afterEach } from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { completionFixture } from "../completionFixtures.mjs";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";

assert.equal(process.versions.node.split(".")[0], "24");
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
Object.assign(process.env, { TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_SHADOW_STAGE3A: "emulator-only" });
const result = await build({ stdin: { contents: [
  'export * from "./backend/scalability/shadowWorker";',
  'export * from "./backend/scalability/shadowContracts";',
  'export * from "./backend/scalability/shadowTransport";',
  'export * from "./backend/scalability/acceptance";',
  'export * from "./backend/scalability/acceptanceTransport";',
  'export * from "./backend/scalability/acceptanceState";',
  'export * from "./backend/scalability/acceptanceBatches";',
  'export * from "./backend/scalability/journal";',
  'export * from "./backend/scalability/receipts";',
  'export * from "./backend/scalability/inventory";',
  'export * from "./backend/scalability/values";',
  'export { digest, validateCompletion } from "./backend/trainingCompletionContract";',
  'export { legacyAssessmentFingerprint, completionSourceIdentity, nativeCompletionIdentity } from "./backend/trainingCompletion";'
  ,'export { aggregateCompletedEvidence } from "./src/quiz/cumulativeProfile";'
].join("\n"), resolveDir: process.cwd(), loader: "ts" }, write: false, bundle: true, packages: "external", platform: "node", target: "node24", format: "esm" });
await mkdir("dist-stage2", { recursive: true }); await writeFile("dist-stage2/shadow-test-api.mjs", result.outputFiles[0].text);
const api = await import("../../dist-stage2/shadow-test-api.mjs");
let transport, db;
const NOW = Date.parse("2026-10-23T12:00:00.000Z");
const key = value => String(value).padStart(16, "0");
const workers = [];
function worker(options) { const value = api.createShadowWorker(options); workers.push(value); return value; }
async function account() {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-stage3a-only", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "shadow-" + crypto.randomUUID() + "@example.test",
      password: "synthetic-emulator-password", returnSecureToken: true }) });
  assert.equal(response.status, 200); const data = await response.json();
  await db.doc("users/" + data.localId).set({ displayName: "Synthetic shadow worker student" });
  const service = api.createStage2AcceptanceService(transport, { now: () => NOW });
  await service.admitFreshOwner(data.idToken);
  return { uid: data.localId, token: data.idToken, service, refs: api.acceptanceReferences(db, data.localId) };
}
async function accept(owner, ordinal, { mode = "manual", count = 1, date } = {}) {
  const input = completionFixture({ sessionId: "shadow-session-" + key(ordinal), mode, count,
    ...(date ? { date } : {}) });
  // Real quota reservations, injected SERVER days; never relax quota policies.
  const clock = NOW - (200 - Math.floor(ordinal / 2)) * 86_400_000;
  await createFirebaseTrainingQuotaManager({ now: () => clock, getFirestore: () => db }).reserve(owner.uid,
    { sessionId: input.sessionId, mode, methodIds: mode === "auto" ? [] : input.selectedMethods, timezone: "UTC" });
  return owner.service.accept(owner.token, input);
}
async function ready(owner, options) {
  const w = worker(options), result = await w.processOwner(owner.uid); assert.ok(result);
  const { handle, job } = result; assert.equal(job.state, "ready");
  assert.equal(job.verification.publicationAuthorized, false); assert.equal(job.verification.stage1Authority, "NOT VERIFIED");
  return { w, handle, job, refs: api.shadowReferences(db, owner.uid, handle.generationId) };
}
async function expire(owner, handle) {
  const refs = api.shadowReferences(db, owner.uid, handle.generationId), job = (await refs.job.get()).data();
  await refs.job.set({ ...job, checkpoint: { ...job.checkpoint, lease: { ...job.checkpoint.lease, expiresAt: "2000-01-01T00:00:00.000Z" } } });
}
async function profile(refs) { return (await refs.artifacts.doc("profile-" + key(0)).get()).data().body; }
async function oracle(owner, refs) {
  const original = (await owner.refs.user.collection("learningEvidence").get()).docs.map(row => row.data().evidence);
  assert.deepEqual(await profile(refs), api.aggregateCompletedEvidence({ kind: "user", uid: owner.uid }, original));
}
before(async () => {
  transport = api.createStage2EmulatorTransport(); db = transport.getFirestore();
  await db.doc("users/stage3a-connectivity").get(); // No skip or production fallback.
});
after(async () => { for (const w of workers) await w.close(); await transport?.close(); });
// Each worker owns a dedicated SDK client. Do not accumulate dozens of idle
// transports across failure tests before the 500/1,000-session benchmarks.
afterEach(async () => { for (const w of workers.splice(0)) await w.close(); });

test("explicit isolated opt-in rejects production, credentials and forged transport configuration", () => {
  const safe = { NODE_ENV: "test", TRAINING_SHADOW_STAGE3A: "emulator-only", TRAINING_JOURNAL_STAGE2: "emulator-only",
    FIREBASE_PROJECT_ID: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
  api.assertShadowEnvironment(safe);
  for (const change of [{ TRAINING_SHADOW_STAGE3A: undefined }, { NODE_ENV: "production" }, { FIREBASE_PROJECT_ID: "real-project" },
    { FIRESTORE_EMULATOR_HOST: "example.invalid:443" }, { GITHUB_TOKEN: "synthetic-forbidden" }, { GOOGLE_APPLICATION_CREDENTIALS: "synthetic-forbidden" }])
    assert.throws(() => api.assertShadowEnvironment({ ...safe, ...change }));
});
test("empty owner produces an exact empty shadow, never a live profile", async () => {
  const owner = await account(), result = await ready(owner);
  assert.equal((await profile(result.refs)).sessionCount, 0);
  assert.equal((await owner.refs.control.get()).data().published, null);
  assert.equal((await owner.refs.fence.get()).data().profile, undefined);
  assert.equal((await owner.refs.user.get()).data().learningProfile, undefined);
  assert.equal(await result.w.claim(owner.uid), null);
});
test("one and mixed Manual/Automatic sessions preserve exact receipts, details, quotas and learning chronology", async () => {
  const owner = await account(), first = await accept(owner, 0);
  const one = await ready(owner); assert.equal((await profile(one.refs)).sessionCount, 1);
  const auto = await accept(owner, 1, { mode: "auto", count: 3, date: "2026-10-21T10:00:00.000Z" });
  await accept(owner, 2, { mode: "auto", count: 4, date: "2026-10-20T10:00:00.000Z" });
  const quotaBefore = (await owner.refs.user.collection("trainingUsage").get()).docs.map(row => row.data());
  const rootBefore = (await owner.refs.user.get()).data();
  const mixed = await ready(owner), p = await profile(mixed.refs);
  assert.equal(p.sessionCount, 3); assert.equal(p.observationCount, 13);
  await oracle(owner, mixed.refs);
  assert.deepEqual((await owner.refs.user.get()).data(), rootBefore);
  assert.deepEqual((await owner.refs.user.collection("trainingUsage").get()).docs.map(row => row.data()), quotaBefore);
  for (const receipt of [first, auto]) assert.deepEqual((await owner.refs.user.collection("learningEvidence").doc(receipt.evidenceId).get()).data().receipt, receipt);
  assert.equal((await owner.refs.work.get()).data().status, "pending");
  assert.equal((await owner.refs.control.get()).data().published, null);
});
test("two workers race; expired lease is reclaimed and stale heartbeat/page writes fail", async () => {
  const owner = await account(); await accept(owner, 0);
  const a = worker(), b = worker(), handles = await Promise.all([a.claim(owner.uid), b.claim(owner.uid)]);
  assert.equal(handles.filter(Boolean).length, 1);
  const first = handles.find(Boolean), old = handles[0] ? a : b, next = handles[0] ? b : a;
  await expire(owner, first);
  const second = await next.claim(owner.uid); assert.ok(second.fence > first.fence);
  await assert.rejects(old.heartbeat(first), e => e.code === "stale_worker_fence");
  await assert.rejects(old.run(first), e => e.code === "stale_worker_fence");
  assert.equal((await next.run(second)).state, "ready");
});
for (const event of ["before-page", "after-page"])
  test("restart recovers a crash " + event + " without duplicate pages", async () => {
    const owner = await account(); await accept(owner, 0); await accept(owner, 1);
    let crashed = false;
    const a = worker({ onEvent: async name => { if (!crashed && name === event) { crashed = true; throw new api.ShadowWorkerInterruption("synthetic-process-interruption"); } } });
    const first = await a.claim(owner.uid); await assert.rejects(a.run(first), /synthetic-process-interruption/);
    const refs = api.shadowReferences(db, owner.uid, first.generationId);
    assert.equal((await refs.artifacts.get()).size, event === "after-page" ? 1 : 0);
    await expire(owner, first); const b = worker(), second = await b.claim(owner.uid);
    const start = performance.now(); const result = await b.run(second);
    assert.equal(result.state, "ready"); assert.equal((await profile(refs)).sessionCount, 2);
    assert.equal((await refs.artifacts.where("kind", "==", "packet").get()).size, 2);
    console.log("STAGE3A RECOVERY", JSON.stringify({ crash: event, durationMs: Math.round(performance.now() - start), ...b.metrics }));
  });
test("new acceptance cannot contaminate a pinned snapshot and preserves follow-up work", async () => {
  const owner = await account(); await accept(owner, 0);
  let accepted = false;
  const w = worker({ onEvent: async event => { if (event === "after-page" && !accepted) { accepted = true; await accept(owner, 1); } } });
  const handle = await w.claim(owner.uid), first = await w.run(handle);
  assert.equal(first.verification.nativeAcceptedCount, 1);
  assert.equal((await owner.refs.control.get()).data().nativeAcceptedCount, 2);
  const next = await w.claim(owner.uid); assert.notEqual(next.generationId, handle.generationId);
  assert.equal((await w.run(next)).verification.nativeAcceptedCount, 2);
  assert.equal((await owner.refs.work.get()).data().status, "pending");
});
for (const damage of ["journal", "evidence-missing", "evidence-substituted", "archive", "index", "batch", "checkpoint", "checkpoint-changed", "uid", "epoch", "deleting", "root-deleted", "extra-legacy"])
  test("fails closed for " + damage + " and never publishes", async () => {
    const owner = await account(), receipt = await accept(owner, 0);
    const w = worker({ onEvent: async event => {
      if (event !== "before-verification") return;
      if (damage === "journal") await owner.refs.journal.doc(api.journalIdentity({ uid: owner.uid, lifecycleEpoch: 1 }, 1)).update({ recordedAt: "2026-10-22T00:00:00.000Z" });
      if (damage === "evidence-missing") await owner.refs.user.collection("learningEvidence").doc(receipt.evidenceId).delete();
      if (damage === "evidence-substituted") await owner.refs.user.collection("learningEvidence").doc(receipt.evidenceId).update({ resultAuthority: "forged" });
      if (damage === "archive") await owner.refs.archives.doc(receipt.evidenceId).update({ requestHash: "0".repeat(64) });
      if (damage === "index") await owner.refs.user.collection("learningEvidenceSourceIndex").doc(api.completionSourceIdentity("native", receipt.sessionId)).delete();
      if (damage === "batch") await owner.refs.batches.doc(api.acceptanceBatchIdentity({ uid: owner.uid, lifecycleEpoch: 1 }, 1)).delete();
      if (damage === "checkpoint") await owner.refs.checkpoint.delete();
      if (damage === "checkpoint-changed") await owner.refs.checkpoint.update({ ordinal: 2 });
      if (damage === "uid") await owner.refs.control.update({ uid: "different-student" });
      if (damage === "epoch") await owner.refs.control.update({ lifecycleEpoch: 2 });
      if (damage === "deleting") await owner.refs.control.update({ lifecycle: "deleting" });
      if (damage === "root-deleted") await owner.refs.user.delete();
      if (damage === "extra-legacy") await owner.refs.user.collection("assessments").doc("unlinked-historical-record").set({ originalSessionId: null });
    } });
    const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
    const job = (await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data();
    assert.notEqual(job.state, "ready"); assert.equal(job.verification, null);
    if ((await owner.refs.control.get()).exists) assert.equal((await owner.refs.control.get()).data().published, null);
  });
for (const kind of ["packet", "profile", "references", "part", "manifest"])
  test("tampered " + kind + " artifact/hash is rejected", async () => {
    const owner = await account(); await accept(owner, 0);
    const w = worker({ onEvent: async (event, handle) => {
      if (event === "before-verification") await api.shadowReferences(db, owner.uid, handle.generationId).artifacts.doc(kind + "-" + key(0)).update({ bodyHash: "0".repeat(64) });
    } });
    const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
    assert.equal((await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data().state, "blocked");
  });
test("unadmitted history is migration-required; no bootstrap is fabricated", async () => {
  const uid = "unadmitted-" + crypto.randomUUID(); await db.doc("users/" + uid).set({ learningProfile: { historical: true } });
  const w = worker(); await assert.rejects(w.claim(uid), e => e.code === "shadow_migration_required");
  assert.equal((await api.acceptanceReferences(db, uid).admission.get()).exists, false);
});
test("an earlier prefix is checked even when the current tail/checkpoint is intact", async () => {
  const owner = await account(); for (let n = 0; n < 3; n++) await accept(owner, n);
  const first = owner.refs.journal.doc(api.journalIdentity({ uid: owner.uid, lifecycleEpoch: 1 }, 1));
  await first.update({ previousHash: "0".repeat(64) });
  const w = worker(), handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
  assert.equal((await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data().state, "blocked");
});
test("heartbeat uses server time and preserves monotonic fences and checkpoints", async () => {
  const owner = await account(), w = worker(), handle = await w.claim(owner.uid);
  const refs = api.shadowReferences(db, owner.uid, handle.generationId), before = (await refs.job.get()).data();
  const after = await w.heartbeat(handle);
  assert.equal(after.checkpoint.fencingToken, before.checkpoint.fencingToken);
  assert.equal(after.checkpoint.checkpointSequence, before.checkpoint.checkpointSequence + 1);
  assert.ok(after.checkpoint.lease.expiresAt >= before.checkpoint.lease.expiresAt);
});
test("pending discovery paginates past completed/leased owners without starving later work", async () => {
  const owner = await account(); await accept(owner, 0);
  const w = worker(); let cursor = null, found = false, pages = 0;
  do {
    const page = await w.observePendingPage(20, cursor); found ||= page.uids.includes(owner.uid); cursor = page.afterPath; pages++;
  } while (cursor);
  assert.equal(found, true); assert.ok(pages > 0);
});
test("new acceptance after verification preserves the original pin and durably reschedules a newer generation", async () => {
  const owner = await account(); await accept(owner, 0); let inserted = false;
  const w = worker({ onEvent: async event => { if (event === "after-verification" && !inserted) { inserted = true; await accept(owner, 1); } } });
  const first = await w.claim(owner.uid); await assert.rejects(w.run(first), e => e.code === "shadow_head_changed_retry");
  const refs = api.shadowReferences(db, owner.uid, first.generationId), retry = (await refs.job.get()).data();
  assert.equal(retry.state, "reschedule"); assert.equal(retry.verification, null); assert.equal(retry.attempts, 0);
  assert.equal(retry.pin.checkpoint.ordinal, 1);
  assert.equal(await w.claim(owner.uid), null); // server-time backoff, not a tight loop
  await refs.job.set({ ...retry, retryAt: "2000-01-01T00:00:00.000Z" });
  const second = await w.claim(owner.uid); assert.notEqual(second.generationId, first.generationId);
  assert.equal((await w.run(second)).verification.nativeAcceptedCount, 2);
  assert.deepEqual((await refs.job.get()).data().pin, retry.pin);
  assert.equal(await w.claim(owner.uid), null);
});

test("five normal head-growth sweeps stay recoverable; quiescence builds the latest head without quota or artifact changes", { timeout: 90_000 }, async () => {
  const owner = await account(); await accept(owner, 0);
  let inserted = 0, interfere = true;
  const w = worker({ onEvent: async event => { if (event === "after-verification" && interfere) await accept(owner, ++inserted); } });
  const retired = [];
  for (let n = 0; n < 5; n++) {
    const start = performance.now();
    assert.equal(await w.processOwner(owner.uid), null); // one reschedule ends this sweep
    const pointer = (await api.shadowReferences(db, owner.uid).pointer.get()).data();
    const refs = api.shadowReferences(db, owner.uid, pointer.generationId), job = (await refs.job.get()).data();
    assert.equal(job.state, "reschedule"); assert.equal(job.attempts, 0); assert.equal(job.verification, null);
    assert.equal(job.pin.checkpoint.ordinal, n + 1);
    assert.equal((await profile(refs)).sessionCount, n + 1);
    assert.equal((await owner.refs.work.get()).data().targetRevision, (n + 2) * 2);
    const before = (await refs.artifacts.get()).docs.map(row => ({ id: row.id, data: row.data() }));
    retired.push({ refs, pin: job.pin, before });
    const eligibility = Date.parse(job.retryAt);
    assert.ok(eligibility > Date.now()); assert.equal(await w.claim(owner.uid), null);
    // Actual server-time backoff; no privileged editing of retry or lease fields.
    await new Promise(resolve => setTimeout(resolve, Math.max(0, eligibility - Date.now()) + 75));
    assert.ok(performance.now() - start >= api.SHADOW_LIMITS.headChangeBackoffMs);
  }
  interfere = false;
  const quotas = (await owner.refs.user.collection("trainingUsage").get()).docs.map(row => row.data());
  const result = await w.processOwner(owner.uid);
  assert.equal(result.job.state, "ready"); assert.equal(result.job.verification.nativeAcceptedCount, 6);
  assert.equal(result.job.pin.checkpoint.ordinal, 6); assert.equal(result.job.verification.publicationAuthorized, false);
  await oracle(owner, api.shadowReferences(db, owner.uid, result.handle.generationId));
  assert.deepEqual((await owner.refs.user.collection("trainingUsage").get()).docs.map(row => row.data()), quotas);
  for (const old of retired) {
    assert.deepEqual((await old.refs.job.get()).data().pin, old.pin);
    assert.deepEqual((await old.refs.artifacts.get()).docs.map(row => ({ id: row.id, data: row.data() })), old.before);
  }
  const before = (await owner.refs.control.get()).data();
  await accept(owner, 5); // identical accepted completion, not another head or generation
  assert.deepEqual((await owner.refs.control.get()).data(), before);
  assert.equal(await w.claim(owner.uid), null);
});

for (const crash of ["before-reschedule", "after-reschedule"])
  test("crash " + crash + " recovers with fencing and the highest pending head", async () => {
    const owner = await account(); await accept(owner, 0); let inserted = false;
    const a = worker({ onEvent: async event => {
      if (event === "after-verification" && !inserted) { inserted = true; await accept(owner, 1); }
      if (event === crash) throw new api.ShadowWorkerInterruption("synthetic-reschedule-crash");
    } });
    const first = await a.claim(owner.uid); await assert.rejects(a.run(first), /synthetic-reschedule-crash/);
    const refs = api.shadowReferences(db, owner.uid, first.generationId), old = (await refs.job.get()).data();
    assert.equal(old.state, crash === "before-reschedule" ? "working" : "reschedule");
    if (crash === "before-reschedule") await expire(owner, first);
    else await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(old.retryAt) - Date.now()) + 75));
    const b = worker(), c = worker(), claims = await Promise.all([b.claim(owner.uid), c.claim(owner.uid)]);
    assert.equal(claims.filter(Boolean).length, 1);
    const second = claims.find(Boolean), winner = claims[0] ? b : c;
    assert.ok(second.fence > first.fence);
    await assert.rejects(a.heartbeat(first), e => e.code === "stale_worker_fence");
    await assert.rejects(a.run(first));
    await winner.run(second);
    // A crash before the scheduling transaction may finish the older, explicit
    // snapshot first. The next claim then builds the newest generation.
    const next = await winner.claim(owner.uid); if (next) await winner.run(next);
    const pointer = (await refs.pointer.get()).data(), latest = (await api.shadowReferences(db, owner.uid, pointer.generationId).job.get()).data();
    assert.equal(latest.state, "ready"); assert.equal(latest.pin.checkpoint.ordinal, 2);
    assert.equal((await owner.refs.work.get()).data().targetRevision, 4);
  });

test("expired old worker cannot reschedule or cancel a takeover's newer generation", async () => {
  const owner = await account(); await accept(owner, 0); let inserted = false;
  const b = worker(); let newest;
  const a = worker({ onEvent: async (event, old) => {
    if (event === "after-verification" && !inserted) { inserted = true; await accept(owner, 1); }
    if (event === "before-reschedule") {
      await expire(owner, old); const takeover = await b.claim(owner.uid); await b.run(takeover);
      newest = await b.claim(owner.uid); await b.run(newest);
    }
  } });
  const first = await a.claim(owner.uid); await assert.rejects(a.run(first), e => e.code === "stale_worker_fence");
  const pointer = (await api.shadowReferences(db, owner.uid).pointer.get()).data();
  assert.equal(pointer.generationId, newest.generationId);
  assert.equal((await api.shadowReferences(db, owner.uid, newest.generationId).job.get()).data().state, "ready");
});

for (const damage of ["source", "journal", "counter", "checkpoint", "deleting", "epoch"])
  test("head growth never disguises " + damage + " as a recoverable scheduling event", async () => {
    const owner = await account(), receipt = await accept(owner, 0); let inserted = false;
    const w = worker({ onEvent: async event => {
      if (event !== "after-verification" || inserted) return;
      inserted = true; await accept(owner, 1);
      if (damage === "source") await owner.refs.archives.doc(receipt.evidenceId).update({ requestHash: "0".repeat(64) });
      if (damage === "journal") await owner.refs.journal.doc(api.journalIdentity({ uid: owner.uid, lifecycleEpoch: 1 }, 1)).delete();
      if (damage === "counter") await owner.refs.control.update({ nativeAcceptedCount: 99 });
      if (damage === "checkpoint") await owner.refs.checkpoint.update({ ordinal: 99 });
      if (damage === "deleting") await owner.refs.control.update({ lifecycle: "deleting" });
      if (damage === "epoch") await owner.refs.control.update({ lifecycleEpoch: 2 });
    } });
    const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
    const job = (await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data();
    assert.notEqual(job.state, "reschedule"); assert.notEqual(job.state, "ready"); assert.equal(job.verification, null);
    if (!["deleting", "epoch"].includes(damage)) assert.equal(job.state, "blocked");
  });

for (const damage of ["counter", "deleting", "epoch"])
  test("reschedule transaction rechecks " + damage + " after source verification", async () => {
    const owner = await account(); await accept(owner, 0); let inserted = false;
    const w = worker({ onEvent: async event => {
      if (event === "after-verification" && !inserted) { inserted = true; await accept(owner, 1); }
      if (event === "before-reschedule") await owner.refs.control.update(damage === "counter"
        ? { nativeAcceptedCount: 99 } : damage === "epoch" ? { lifecycleEpoch: 2 } : { lifecycle: "deleting" });
    } });
    const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
    const job = (await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data();
    assert.notEqual(job.state, "reschedule"); assert.equal(job.verification, null);
  });

for (const code of ["shadow_head_changed_retry", [14]]) test("untrusted error code " + JSON.stringify(code) + " cannot bypass integrity failure handling", async () => {
  const owner = await account(); await accept(owner, 0);
  const w = worker({ onEvent: async event => { if (event === "after-verification") throw Object.assign(new Error("synthetic-forged-code"), { code }); } });
  const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
  assert.equal((await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data().state, "blocked");
});

test("growth during rescheduling coalesces the highest head and racing claimants create only one successor", async () => {
  const owner = await account(); await accept(owner, 0); let firstGrowth = false, secondGrowth = false;
  const a = worker({ onEvent: async event => {
    if (event === "after-verification" && !firstGrowth) { firstGrowth = true; await accept(owner, 1); }
    if (event === "before-reschedule" && !secondGrowth) { secondGrowth = true; await accept(owner, 2); }
  } });
  const first = await a.claim(owner.uid); await assert.rejects(a.run(first), e => e.code === "shadow_head_changed_retry");
  const refs = api.shadowReferences(db, owner.uid, first.generationId), deferred = (await refs.job.get()).data();
  assert.equal(deferred.state, "reschedule"); assert.equal(deferred.pin.checkpoint.ordinal, 1);
  assert.equal((await owner.refs.work.get()).data().targetRevision, 6);
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(deferred.retryAt) - Date.now()) + 75));
  const b = worker(), c = worker(), claims = await Promise.all([b.claim(owner.uid), c.claim(owner.uid)]);
  assert.equal(claims.filter(Boolean).length, 1);
  const handle = claims.find(Boolean), winner = claims[0] ? b : c;
  assert.ok(handle.fence > first.fence);
  await assert.rejects(a.run(first), e => e.code === "stale_worker_fence");
  assert.equal((await winner.run(handle)).verification.nativeAcceptedCount, 3);
  assert.equal((await refs.job.get()).data().state, "reschedule");
  assert.equal((await refs.artifacts.where("kind", "==", "packet").get()).size, 1);
  assert.equal((await owner.refs.control.get()).data().published, null);
  assert.ok(a.metrics.maxTransactionReads <= 20); assert.ok(a.metrics.maxTransactionWrites <= 2);
});

test("identical completion retry during final verification creates no reschedule or successor", async () => {
  const owner = await account(), receipt = await accept(owner, 0);
  const quota = (await owner.refs.user.collection("trainingUsage").get()).docs.map(row => row.data());
  const result = await ready(owner, { onEvent: async event => {
    if (event === "after-verification") assert.deepEqual(await accept(owner, 0), receipt);
  } });
  assert.equal(result.job.pin.checkpoint.ordinal, 1); assert.equal(result.job.attempts, 0);
  assert.equal(await result.w.claim(owner.uid), null);
  assert.deepEqual((await owner.refs.user.collection("trainingUsage").get()).docs.map(row => row.data()), quota);
});
test("long-outage reclaim reuses the pinned immutable prefix without requiring expired historical reads", async () => {
  const owner = await account(); await accept(owner, 0);
  const a = worker(), first = await a.claim(owner.uid), refs = api.shadowReferences(db, owner.uid, first.generationId);
  // Privileged synthetic old-job fixture, BEFORE any page is created. Not a
  // migration/bootstrap claim; actual immutable source hashes are still checked.
  const job = (await refs.job.get()).data();
  await refs.job.set({ ...job, pin: { ...job.pin, readTime: { seconds: 1_700_000_000, nanoseconds: 0 } },
    checkpoint: { ...job.checkpoint, lease: { ...job.checkpoint.lease, expiresAt: "2000-01-01T00:00:00.000Z" } } });
  const b = worker(), second = await b.claim(owner.uid);
  assert.equal(second.generationId, first.generationId);
  assert.equal((await b.run(second)).verification.nativeAcceptedCount, 1);
});
test("missing generation pages and cross-owner artifact envelopes block readiness", async () => {
  for (const damage of ["missing", "other-owner"]) {
    const owner = await account(); await accept(owner, 0);
    const w = worker({ onEvent: async (event, handle) => {
      if (event !== "before-verification") return;
      const ref = api.shadowReferences(db, owner.uid, handle.generationId).artifacts.doc("references-" + key(0));
      if (damage === "missing") await ref.delete(); else await ref.update({ uid: "other-student" });
    } });
    const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle));
    assert.equal((await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data().state, "blocked");
  }
});
test("transient failures persist backoff and resume idempotently; repeated failures become blocked", async () => {
  const owner = await account(); await accept(owner, 0);
  const broken = worker({ onEvent: async event => { if (event === "before-verification") throw Object.assign(new Error("synthetic-unavailable"), { code: 14 }); } });
  let handle = await broken.claim(owner.uid);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await assert.rejects(broken.run(handle));
    const refs = api.shadowReferences(db, owner.uid, handle.generationId), saved = (await refs.job.get()).data();
    assert.equal(saved.attempts, attempt); assert.equal(saved.state, attempt < 3 ? "retry" : "blocked");
    if (attempt < 3) {
      assert.ok(saved.retryAt); assert.equal(await broken.claim(owner.uid), null);
      await refs.job.set({ ...saved, retryAt: "2000-01-01T00:00:00.000Z" });
      handle = await broken.claim(owner.uid);
    }
  }
  await assert.rejects(broken.claim(owner.uid), e => e.code === "shadow_job_blocked");
  const recoveryOwner = await account(); await accept(recoveryOwner, 0);
  const interrupted = worker({ onEvent: async event => { if (event === "before-verification") throw Object.assign(new Error("synthetic-unavailable"), { code: 14 }); } });
  const first = await interrupted.claim(recoveryOwner.uid); await assert.rejects(interrupted.run(first));
  const refs = api.shadowReferences(db, recoveryOwner.uid, first.generationId), saved = (await refs.job.get()).data();
  await refs.job.set({ ...saved, retryAt: "2000-01-01T00:00:00.000Z" });
  const replacement = worker(), second = await replacement.claim(recoveryOwner.uid);
  assert.ok(second.fence > first.fence); assert.equal((await replacement.run(second)).state, "ready");
});
test("unexpected ordinary errors are durably blocked rather than retried forever", async () => {
  const owner = await account(); await accept(owner, 0);
  const w = worker({ onEvent: async event => { if (event === "before-verification") throw new Error("synthetic-unexpected-error"); } });
  const handle = await w.claim(owner.uid); await assert.rejects(w.run(handle), /synthetic-unexpected-error/);
  const saved = (await api.shadowReferences(db, owner.uid, handle.generationId).job.get()).data();
  assert.equal(saved.state, "blocked"); assert.equal(saved.error, "shadow_worker_error");
});
test("a substituted pinned bootstrap digest is rejected before replay", async () => {
  const owner = await account(); await accept(owner, 0);
  const w = worker(), handle = await w.claim(owner.uid), refs = api.shadowReferences(db, owner.uid, handle.generationId);
  const job = (await refs.job.get()).data();
  await refs.job.set({ ...job, pin: { ...job.pin, bootstrapDigest: "0".repeat(64) } });
  await assert.rejects(w.run(handle), e => e.code === "shadow_pin_mismatch");
  assert.equal((await refs.job.get()).data().state, "blocked"); assert.equal((await refs.artifacts.get()).size, 0);
});
test("supervisor reclaims an expired own lease with a new fence and identical pinned pages", async () => {
  const owner = await account(); await accept(owner, 0); await accept(owner, 1);
  let paused = false, firstGeneration;
  const result = await ready(owner, { onEvent: async (event, handle) => {
    if (event === "after-page" && !paused) { paused = true; firstGeneration = handle.generationId; await expire(owner, handle); }
  } });
  assert.equal(result.handle.generationId, firstGeneration); assert.equal(result.handle.fence, 2);
  assert.equal(result.w.metrics.leaseRecoveries, 1); assert.equal((await profile(result.refs)).sessionCount, 2);
  assert.equal((await result.refs.artifacts.where("kind", "==", "packet").get()).size, 2);
});

// LOWER-LEVEL PREBUILT FIXTURES: not endpoint/quotas benchmarks. Exact Stage 2
// source factory, receipts, batches, decision hashes and archives are constructed
// offline, stored only in this demo, then fully revalidated by the real worker.
async function prebuilt(owner, count) {
  let checkpoint = api.initialAcceptanceCheckpoint({ uid: owner.uid, lifecycleEpoch: 1 });
  let control = (await owner.refs.control.get()).data();
  let writes = db.batch(), queued = 0;
  const create = async (ref, data) => { writes.create(ref, data); if (++queued === 300) { await writes.commit(); writes = db.batch(); queued = 0; } };
  for (let n = 0; n < count; n++) {
    const raw = completionFixture({ sessionId: "prebuilt-shadow-" + key(n), mode: "manual", count: 1,
      // Out-of-order actual completions, never substitute journal order.
      date: new Date(Date.parse("2026-10-19T10:00:00.000Z") - (n % 31) * 86_400_000).toISOString() });
    const recordedAt = new Date(NOW + n).toISOString();
    const { request, requestHash, evidence } = api.validateCompletion(owner.uid, raw, recordedAt);
    const evidenceId = api.nativeCompletionIdentity(request.sessionId);
    const receipt = api.parseAcceptanceReceipt({ schemaVersion: 2, status: "accepted", sessionId: request.sessionId,
      mode: "manual", evidenceId, requestHash, lifecycleEpoch: 1, acceptedRevision: checkpoint.headRevision + 1,
      recordedAt, legacyAssessmentId: null, legacyProfileUpdated: false });
    const row = { schemaVersion: 1, evidence, requestHash, receipt, completionDetails: { schemaVersion: 1,
      methodIntroduction: request.methodIntroduction, reflection: request.reflection }, resultAuthority: "client-reported", selectionContextAuthority: "client-advisory" };
    const evidenceHash = api.inventorySourceReference({ schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1,
      namespace: "learningEvidence", id: evidenceId, payload: row }, { uid: owner.uid, lifecycleEpoch: 1, revision: 0, headHash: null }).contentHash;
    const decision = { schemaVersion: 1, sourceKind: "native", recordId: request.sessionId,
      sourceHash: api.completionSourceIdentity("native", request.sessionId), fromEvidenceId: null, toEvidenceId: evidenceId, fingerprint: requestHash };
    const decisionId = api.digest(decision);
    const accepted = api.createJournalEntry({ uid: owner.uid, lifecycleEpoch: 1, revision: checkpoint.headRevision, headHash: checkpoint.headHash },
      { kind: "session-accepted", receipt, evidenceHash }, recordedAt);
    const identity = api.createJournalEntry({ uid: owner.uid, lifecycleEpoch: 1, revision: accepted.revision, headHash: accepted.entryHash },
      { kind: "identity-decided", decisionId, sourceKind: "native", recordId: request.sessionId, fromEvidenceId: null,
        toEvidenceId: evidenceId, linkage: "established", proof: { version: "request-v1", digest: requestHash } }, recordedAt);
    const batch = api.createAcceptanceBatch(checkpoint, [accepted, identity]); checkpoint = api.checkpointForBatch(batch);
    for (const [ref, data] of [
      [owner.refs.user.collection("learningEvidence").doc(evidenceId), row],
      [owner.refs.archives.doc(evidenceId), { schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1, sessionId: request.sessionId,
        evidenceId, requestHash, payload: request, receipt, archivedAt: recordedAt }],
      [owner.refs.user.collection("learningEvidenceIdentityEvents").doc(decisionId), decision],
      [owner.refs.user.collection("learningEvidenceSourceIndex").doc(decision.sourceHash), { schemaVersion: 1,
        sourceKind: "native", recordId: request.sessionId, evidenceId, fingerprint: requestHash, decisionId }],
      [owner.refs.journal.doc(accepted.entryId), accepted], [owner.refs.journal.doc(identity.entryId), identity],
      [owner.refs.batches.doc(batch.batchId), batch]]) await create(ref, data);
  }
  if (queued) await writes.commit();
  await owner.refs.control.set({ ...control, headRevision: checkpoint.headRevision, headHash: checkpoint.headHash, nativeAcceptedCount: count });
  await owner.refs.checkpoint.set(checkpoint);
  await owner.refs.work.set({ schemaVersion: 1, uid: owner.uid, lifecycleEpoch: 1, status: "pending", targetRevision: checkpoint.headRevision,
    headHash: checkpoint.headHash, aggregationVersion: control.desiredAggregationVersion, executionVersion: control.desiredExecutionVersion });
}
test("100 sessions via authenticated service and real server quota reservations", { timeout: 600_000 }, async () => {
  const owner = await account();
  for (let n = 0; n < 100; n++) await accept(owner, n, n % 4 === 0 ? { mode: "auto", count: n % 8 === 0 ? 3 : 4 } : {});
  const start = performance.now(), result = await ready(owner);
  assert.equal((await profile(result.refs)).sessionCount, 100);
  await oracle(owner, result.refs);
  assert.ok(result.w.metrics.maxTransactionWrites <= 12); assert.ok(result.w.metrics.maxTransactionBytes <= 2 * 1024 * 1024);
  console.log("STAGE3A BENCHMARK", JSON.stringify({ fixture: "authenticated-service-real-quotas-not-http", sessions: 100,
    wallMs: Math.round(performance.now() - start), ...result.w.metrics }));
});
for (const count of [500, 1000]) test(count + " sessions lower-level prebuilt fixture replay", { timeout: 900_000 }, async () => {
  const owner = await account(); await prebuilt(owner, count);
  const start = performance.now(), result = await ready(owner, { onEvent: async (event, _handle, ordinal) => {
    if ((event === "after-page" || event === "verification-page") && ordinal % 100 === 0 || event === "before-verification" || event === "after-verification")
      console.log("STAGE3A BENCHMARK PROGRESS", JSON.stringify({ sessions: count, event, ordinal, elapsedMs: Math.round(performance.now() - start) }));
  } });
  assert.equal((await profile(result.refs)).sessionCount, count);
  await oracle(owner, result.refs);
  assert.equal(result.job.verification.nativeAcceptedCount, count);
  assert.ok(result.w.metrics.maxTransactionReads <= 20); assert.ok(result.w.metrics.maxDocumentBytes < 1024 * 1024);
  console.log("STAGE3A BENCHMARK", JSON.stringify({ fixture: "lower-level-prebuilt-not-authenticated-acceptance-or-http", sessions: count,
    wallMs: Math.round(performance.now() - start), ...result.w.metrics }));
});
