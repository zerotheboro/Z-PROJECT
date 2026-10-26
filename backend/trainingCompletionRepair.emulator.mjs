import assert from "node:assert/strict";
import { test, before, beforeEach, after } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import { completionFixture } from "./completionFixtures.mjs";
import { createCompletionEmulatorFirestore, createEmulatorTrainingCompletionService, createTrainingCompletionService,
  validateCompletion, rebuildPersistedProjection, legacyAssessmentFingerprint, completionHistoryJSONBytes,
  completionDocumentBytes, COMPLETION_LIMITS } from "../dist-backend/backend/trainingCompletion.js";

const PROJECT = "demo-edulience-phase2a", HOST = "127.0.0.1:18787", UID = "phase2a-repair-student";
assert.equal(process.env.FIREBASE_PROJECT_ID, PROJECT); assert.equal(process.env.FIRESTORE_EMULATOR_HOST, HOST);
for (const key of ["GITHUB_PAT_TOKEN", "DEBUG", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON"]) assert.equal(key in process.env, false);
const requireTools = createRequire(path.join(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY, "package.json"));
const { initializeTestEnvironment } = requireTools("@firebase/rules-unit-testing");
const NOW = Date.parse("2026-10-20T10:00:00Z"), recordedAt = new Date(NOW).toISOString();
const collections = ["learningEvidence", "assessments", "learningEvidenceSourceIndex", "learningEvidenceIdentityEvents"];
let provider, db, rulesEnv;
const user = () => db.collection("users").doc(UID);
const rows = async name => (await user().collection(name).get()).docs.map(doc => ({ id: doc.id, data: doc.data() }));
const groups = () => Promise.all(collections.map(rows));
const service = options => createTrainingCompletionService({ getFirestore: provider.getFirestore, now: () => NOW, ...options });
const legacy = () => validateCompletion(UID, completionFixture(), recordedAt).legacy;
const projection = async () => (await user().collection("learningProfiles").doc("cumulative").get()).data();
async function reserve(input) {
  await user().collection("trainingReservations").doc(input.sessionId).set({ sessionId: input.sessionId, mode: input.mode, methodIds: input.mode === "auto" ? [] : input.selectedMethods });
}
async function complete(input, options) { await reserve(input); return service(options).complete(UID, input); }
async function noCompletionWrites() {
  for (const name of ["learningEvidence", "learningProfiles", "learningEvidenceSourceIndex", "learningEvidenceIdentityEvents"]) assert.equal((await rows(name)).length, 0, name);
}
const canonical = value => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
const hash = value => createHash("sha256").update(canonical(value)).digest("hex");
function historyBytes(all) {
  const json = 13 + all.flat().reduce((sum, row) => sum + completionHistoryJSONBytes(row) + 1, 0);
  const stored = all.reduce((sum, entries, index) => sum + entries.reduce((total, row) => total + completionDocumentBytes(`users/${UID}/${collections[index]}/${row.id}`, row.data), 0), 0);
  return Math.max(json, stored);
}
before(async () => {
  provider = createCompletionEmulatorFirestore(); db = provider.getFirestore();
  rulesEnv = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: "127.0.0.1", port: 18787,
    rules: readFileSync(new URL("../test-support/firestore/owner-supplied.rules", import.meta.url), "utf8") } });
});
beforeEach(async () => { await rulesEnv.clearFirestore(); await user().set({ name: "Synthetic repair student", preferences: { unchanged: true } }); });
after(async () => { await rulesEnv.cleanup(); await provider.close(); });

test("dedicated emulator service completes with no Admin credentials or general cached app", async () => {
  const isolated = createEmulatorTrainingCompletionService({ now: () => NOW });
  try { const input = completionFixture(); await reserve(input); assert.equal((await isolated.complete(UID, input)).status, "completed"); }
  finally { await isolated.close(); }
});

test("October 19 legacy document advances October 20 and subsequent automatic profiles without inventing an alias", async () => {
  const ref = user().collection("assessments").doc("historical-october-19");
  await ref.set({ ...legacy(), completedAt: "2026-10-19T12:00:00+02:00", createdAt: Timestamp.fromDate(new Date("2026-10-19T10:01:00Z")) });
  const original = (await ref.get()).data();
  await user().set({ learningProfile: original.learningProfile, latestAssessmentId: ref.id }, { merge: true });
  const current = completionFixture({ sessionId: "october-20-first", date: "2026-10-20T09:00:00Z", score: 1 });
  const next = completionFixture({ sessionId: "october-20-next", date: "2026-10-20T09:30:00Z", score: 0.5 });
  for (const input of [current, next]) {
    assert.equal((await complete(input)).legacyProfileUpdated, true);
    assert.equal((await user().get()).data().latestAssessmentId, input.sessionId);
  }
  assert.deepEqual((await ref.get()).data(), original);
  const historical = (await rows("learningEvidence")).find(row => row.data.evidence.provenance.recordId === ref.id).data.evidence;
  assert.equal(historical.originalSessionId, null);
  const older = completionFixture({ sessionId: "late-older-october-19", date: "2026-10-19T11:00:00Z" });
  assert.equal((await complete(older)).legacyProfileUpdated, false);
  assert.equal((await user().get()).data().latestAssessmentId, next.sessionId);
});
for (const [description, completedAt, createdAt, advance] of [
  ["missing completion with known save upper bound", undefined, "2026-10-19T10:01:00Z", true],
  ["ambiguous completion with known save upper bound", "2026-10-19T10:00:00", "2026-10-19T10:01:00Z", true],
  ["no known ordering bound", undefined, undefined, false],
  ["ambiguous timing only", "2026-10-19T10:00:00", "2026-10-19T10:01:00", false],
  ["conflicting completion/save times", "2026-10-20T09:00:00Z", "2026-10-19T10:01:00Z", false],
  ["tied completion times", "2026-10-20T09:45:00Z", "2026-10-20T09:46:00Z", false],
  ["genuinely newer prior completion", "2026-10-20T09:50:00Z", "2026-10-20T09:51:00Z", false]
]) test(`legacy display policy: ${description}`, async () => {
  const data = { ...legacy(), ...(completedAt === undefined ? {} : { completedAt }), ...(createdAt === undefined ? {} : { createdAt }) };
  await user().collection("assessments").doc("previous-historical").set(data);
  await user().set({ learningProfile: data.learningProfile, latestAssessmentId: "previous-historical" }, { merge: true });
  const input = completionFixture({ sessionId: "next-native-with-policy", date: "2026-10-20T09:45:00Z" });
  const receipt = await complete(input);
  assert.equal(receipt.legacyProfileUpdated, advance);
  assert.equal((await user().get()).data().latestAssessmentId, advance ? input.sessionId : "previous-historical");
  const prior = (await rows("learningEvidence")).find(row => row.data.evidence.provenance.kind === "legacy-assessment").data.evidence;
  if (completedAt === undefined || !/(Z|[+-]\d\d:\d\d)$/.test(completedAt)) assert.equal(prior.completedAt, null);
});

test("original frozen-source Timestamp-to-map collision is rejected without rewriting evidence", async () => {
  const stamp = Timestamp.fromDate(new Date("2026-10-19T09:00:00Z")), ref = user().collection("assessments").doc("timestamp-source");
  await ref.set({ ...legacy(), completedAt: stamp });
  const first = completionFixture({ sessionId: "freeze-timestamp-source", mode: "manual", count: 1 }); await complete(first);
  const original = await rows("learningEvidence");
  await ref.update({ completedAt: { timestampSeconds: stamp.seconds, timestampNanos: stamp.nanoseconds } });
  const next = completionFixture({ sessionId: "after-timestamp-map", mode: "manual", count: 1 }); await reserve(next);
  await assert.rejects(service().complete(UID, next), error => error.code === "legacy_source_conflict");
  assert.deepEqual(await rows("learningEvidence"), original); assert.equal((await projection()).revision, 1);
});
test("original preparation Timestamp-to-map collision triggers repreparation and freezes current unknown timing", async () => {
  const stamp = Timestamp.fromDate(new Date("2026-10-19T09:00:00Z")), ref = user().collection("assessments").doc("moving-timestamp-source");
  await ref.set({ ...legacy(), completedAt: stamp }); let prepared = 0;
  await complete(completionFixture(), { onPrepared: async () => {
    if (prepared++ === 0) await ref.update({ completedAt: { timestampSeconds: stamp.seconds, timestampNanos: stamp.nanoseconds } });
  } });
  assert.ok(prepared >= 2);
  const prior = (await rows("learningEvidence")).find(row => row.data.evidence.provenance.kind === "legacy-assessment").data.evidence;
  assert.equal(prior.completedAt, null); assert.ok(prior.limitations.includes("legacy-timestamp-unreadable"));
});

async function seedPaddedHistory(target) {
  const data = legacy(), all = [[], Array.from({ length: 4 }, (_, index) => ({ id: `padded-history-${index}`, data: { ...data, padding: "" } })), [], []];
  let remaining = target - historyBytes(all); assert.ok(remaining >= 0);
  for (let i = 0; i < 4; i++) { const padding = Math.floor(remaining / (4 - i)); all[1][i].data.padding = "x".repeat(padding); remaining -= padding; }
  for (const row of all[1]) await user().collection("assessments").doc(row.id).set(row.data);
  assert.equal(historyBytes(await groups()), target);
}
function maximumRequest() {
  const input = completionFixture({ sessionId: "over-budget-large-session" });
  for (const item of input.metadata) item.protocol = { assessmentVersion: "fixture-v1", scoringVersion: "fixture-accuracy-v1",
    questions: [1, 2, 3, 4].map(i => ({ questionId: `q${i}`, difficulty: "medium", offeredOptionCount: 16,
      offeredOptionIds: Array.from({ length: 16 }, (_, index) => `${index}-`) })) };
  let remaining = 65536 - Buffer.byteLength(JSON.stringify(input));
  for (const item of input.metadata) for (const question of item.protocol.questions) for (let i = 0; i < 16; i++) {
    const grow = Math.min(remaining, 256 - question.offeredOptionIds[i].length); question.offeredOptionIds[i] += "x".repeat(grow); remaining -= grow;
  }
  assert.equal(remaining, 0); return input;
}
test("original 3,145,428-byte history reproduction now rejects atomically before any completion write", async () => {
  await seedPaddedHistory(3145428); const original = await groups(), root = (await user().get()).data();
  const input = completionFixture({ sessionId: "original-budget-repro", mode: "manual", count: 1 }); await reserve(input);
  for (let i = 0; i < 2; i++) await assert.rejects(service().complete(UID, input), error => error.status === 409 && error.code === "completion_capacity_exceeded");
  await noCompletionWrites(); assert.deepEqual(await groups(), original); assert.deepEqual((await user().get()).data(), root);
});
test("over-budget rejection does not poison history; smaller next sessions and original receipts remain usable", async () => {
  await seedPaddedHistory(COMPLETION_LIMITS.historyBytes - 50000);
  const large = maximumRequest(); await reserve(large);
  await assert.rejects(service().complete(UID, large), error => error.code === "completion_capacity_exceeded"); await noCompletionWrites();
  for (const id of ["smaller-session-one", "smaller-session-two"]) {
    const input = completionFixture({ sessionId: id, mode: "manual", count: 1 }), receipt = await complete(input);
    assert.deepEqual(await service().complete(UID, input), receipt); assert.ok(historyBytes(await groups()) <= COMPLETION_LIMITS.historyBytes);
  }
});
test("exact prospective 3 MiB boundary includes receipt and indexes; one more session is rejected without loss", async () => {
  const input = completionFixture({ sessionId: "exact-boundary-session", mode: "manual", count: 1 });
  await seedPaddedHistory(100000); const before = historyBytes(await groups()); await complete(input);
  const delta = historyBytes(await groups()) - before;
  await rulesEnv.clearFirestore(); await user().set({ name: "Synthetic repair student", preferences: { unchanged: true } });
  await seedPaddedHistory(COMPLETION_LIMITS.historyBytes - delta); const receipt = await complete(input);
  assert.equal(historyBytes(await groups()), COMPLETION_LIMITS.historyBytes);
  const original = await groups(), next = completionFixture({ sessionId: "one-over-boundary-session", mode: "manual", count: 1 }); await reserve(next);
  await assert.rejects(service().complete(UID, next), error => error.code === "completion_capacity_exceeded");
  assert.deepEqual(await groups(), original); assert.deepEqual(await service().complete(UID, input), receipt);
});
test("oversized merged root user document is rejected before evidence, legacy or projection writes", async () => {
  await user().set({ padding: "x".repeat(1048000) }); const original = (await user().get()).data();
  const input = completionFixture(); await reserve(input);
  await assert.rejects(service().complete(UID, input), error => error.code === "completion_document_limit");
  await noCompletionWrites(); assert.equal((await rows("assessments")).length, 0); assert.deepEqual((await user().get()).data(), original);
});
test("document budget includes old nested fields preserved by Firestore merge semantics", async () => {
  await user().collection("assessments").doc("previous-with-large-root").set({ ...legacy(), completedAt: "2026-10-18T10:00:00Z" });
  await user().set({ learningProfile: { legacyExtra: "x".repeat(1048000) }, latestAssessmentId: "previous-with-large-root" });
  const original = (await user().get()).data();
  const input = completionFixture({ sessionId: "after-large-legacy-map" }); await reserve(input);
  await assert.rejects(service().complete(UID, input), error => error.code === "completion_document_limit");
  await noCompletionWrites(); assert.deepEqual((await user().get()).data(), original); assert.equal((await rows("assessments")).length, 1);
});

async function seedAutomatic(count) {
  const evidence = [], sources = [], events = [], batch = db.batch();
  for (let i = 0; i < count; i++) {
    const input = completionFixture({ sessionId: `capacity-auto-${String(i).padStart(3, "0")}` });
    const validated = validateCompletion(UID, input, recordedAt), id = `session-${hash(input.sessionId)}`;
    const data = { schemaVersion: 1, evidence: validated.evidence, requestHash: validated.requestHash,
      receipt: { schemaVersion: 1, status: "completed", sessionId: input.sessionId, mode: "auto", evidenceId: id,
        requestHash: validated.requestHash, profileRevision: i + 1, recordedAt, legacyAssessmentId: input.sessionId, legacyProfileUpdated: false } };
    evidence.push({ id, data }); batch.set(user().collection("learningEvidence").doc(id), data);
    batch.set(user().collection("assessments").doc(input.sessionId), validated.legacy);
    for (const kind of ["native", "legacy"]) {
      const sourceHash = hash(["training-source-v1", kind, input.sessionId]);
      const fingerprint = kind === "native" ? validated.requestHash : legacyAssessmentFingerprint(validated.legacy);
      const decision = { schemaVersion: 1, sourceKind: kind, recordId: input.sessionId, sourceHash, fromEvidenceId: null, toEvidenceId: id, fingerprint }, decisionId = hash(decision);
      const source = { schemaVersion: 1, sourceKind: kind, recordId: input.sessionId, evidenceId: id, fingerprint, decisionId };
      sources.push({ id: sourceHash, data: source }); events.push({ id: decisionId, data: decision });
      batch.set(user().collection("learningEvidenceSourceIndex").doc(sourceHash), source); batch.set(user().collection("learningEvidenceIdentityEvents").doc(decisionId), decision);
    }
  }
  const profile = rebuildPersistedProjection(UID, evidence, sources, events).profile;
  batch.set(user().collection("learningProfiles").doc("cumulative"), { persistenceVersion: 1, revision: count, profile, updatedAt: recordedAt }); await batch.commit();
}
test("400-source capacity is exactly 66 native automatic sessions; session 67 cannot partially persist", async () => {
  await seedAutomatic(65);
  const input = completionFixture({ sessionId: "capacity-session-066" }); const receipt = await complete(input);
  const original = await groups(); assert.equal(original.flat().length, 396); assert.equal((await projection()).profile.sessionCount, 66);
  const next = completionFixture({ sessionId: "capacity-session-067" }); await reserve(next);
  await assert.rejects(service().complete(UID, next), error => error.code === "completion_capacity_exceeded");
  assert.deepEqual(await groups(), original); assert.deepEqual(await service().complete(UID, input), receipt);
});
test("pre-v2 pilot fingerprints require explicit reconciliation; original receipts remain recoverable", async () => {
  const input = completionFixture(), receipt = await complete(input);
  const source = (await rows("learningEvidenceSourceIndex")).find(row => row.data.sourceKind === "legacy");
  const oldEvent = (await user().collection("learningEvidenceIdentityEvents").doc(source.data.decisionId).get()).data();
  const decision = { ...oldEvent, fingerprint: "a".repeat(64) }, decisionId = hash(decision);
  const batch = db.batch(); batch.delete(user().collection("learningEvidenceIdentityEvents").doc(source.data.decisionId));
  batch.set(user().collection("learningEvidenceIdentityEvents").doc(decisionId), decision);
  batch.set(user().collection("learningEvidenceSourceIndex").doc(source.id), { ...source.data, fingerprint: decision.fingerprint, decisionId }); await batch.commit();
  assert.deepEqual(await service().complete(UID, input), receipt);
  const next = completionFixture({ sessionId: "after-v1-pilot", mode: "manual", count: 1 }); await reserve(next);
  await assert.rejects(service().complete(UID, next), error => error.code === "completion_fingerprint_upgrade_required");
  assert.equal((await rows("learningEvidence")).length, 1);
});
