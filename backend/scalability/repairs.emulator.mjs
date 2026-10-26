import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { build } from "esbuild";
import { createCompletionEmulatorFirestore, createTrainingCompletionService } from "../../dist-backend/backend/trainingCompletion.js";
import { completionFixture } from "../completionFixtures.mjs";

// Explicit opt-in only. Missing Emulator/config must fail, never skip/fallback.
assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-edulience-phase2a");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18787");
assert.equal(process.versions.node.split(".")[0], "24");
for (const name of ["GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON", "GITHUB_PAT_TOKEN"]) {
  assert.equal(Object.hasOwn(process.env, name), false);
}
// The existing preload installs this public dummy value for auth-only legacy
// tests. Compare a boolean so even a misconfigured test cannot print a real key.
assert.equal(process.env.OPENAI_API_KEY === "offline-test-placeholder-not-a-real-key", true);
let provider, db, api;
const NOW = "2026-10-22T10:00:00.000Z", UID = "offline-stage1-repairs-emulator";
before(async () => {
  const output = await build({ stdin: { contents: 'export * as v from "./backend/scalability/values"; export * as r from "./backend/scalability/receipts"; export * as j from "./backend/scalability/journal"; export * as f from "./backend/scalability/repairFixtures.js"; export * as i from "./backend/scalability/inventory";',
    resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, platform: "node", target: "node24", format: "esm" });
  api = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
  provider = createCompletionEmulatorFirestore(); db = provider.getFirestore();
  // A real RPC must succeed before testing; an unavailable Emulator is a failure.
  await db.doc(`users/${UID}`).get();
});
after(async () => { if (provider) await provider.close(); });

test("accepted supplementary Unicode and keys round-trip through real Emulator transport without changing journal hashes", async () => {
  const origin = { uid: UID, lifecycleEpoch: 1, revision: 0, headHash: null };
  const entry = api.j.createJournalEntry(origin, { kind: "historical-imported", recordId: "old-\ud83d\ude00", evidenceId: "legacy-offline-test",
    originalSessionId: null, completedAt: null, proof: { version: "v2", digest: "a".repeat(64) } }, NOW);
  const ref = db.doc(`users/${UID}/learningProfiles/control/journal/valid-unicode`);
  await ref.set(entry);
  const stored = (await ref.get()).data();
  assert.deepEqual(api.j.parseJournalEntry(stored), entry);
  assert.equal(api.v.typedHash("unicode-transport-test", stored), api.v.typedHash("unicode-transport-test", entry));
  const keys = { "\ud83d\ude00": { text: "Paired \ud83d\ude00 and \u00e9, escaped \u0000" } };
  const textRef = db.doc(`users/${UID}/learningProfiles/control/audit/keys`);
  await textRef.set(api.v.copyJSON(keys));
  assert.equal(api.v.canonicalJSON((await textRef.get()).data()), api.v.canonicalJSON(keys));
});

test("unpaired high/low surrogates are rejected locally before any Firestore write", async () => {
  let writes = 0;
  for (const bad of ["old-\ud800", "old-\udc00"]) {
    assert.throws(() => {
      const entry = api.j.createJournalEntry({ uid: UID, lifecycleEpoch: 1, revision: 0, headHash: null }, {
        kind: "historical-imported", recordId: bad, evidenceId: "legacy-offline-test", originalSessionId: null, completedAt: null,
        proof: { version: "v2", digest: "a".repeat(64) } }, NOW);
      writes++; return db.doc(`users/${UID}/learningProfiles/control/journal/invalid-unicode`).set(entry);
    }, /invalid_unicode/);
  }
  assert.equal(writes, 0);
  assert.equal((await db.doc(`users/${UID}/learningProfiles/control/journal/invalid-unicode`).get()).exists, false);
});

test("full immutable Manual source payload and proof remain deterministic through Emulator reads", async () => {
  const value = api.f.inventoryFixture();
  const ref = db.doc(`users/${value.scope.uid}/learningEvidence/${value.source.id}`);
  await ref.set(value.source.payload);
  const restored = { ...value.source, payload: (await ref.get()).data() };
  assert.deepEqual(api.i.inventorySourceReference(restored, value.cutoff), value.reference);
  const proof = api.i.verifyInventoryProof({ ...value.inputs, sources: [restored] }, value.cutoff);
  assert.equal(proof.consistency, "verified"); assert.equal(proof.authority, "NOT VERIFIED");
  assert.equal(restored.payload.completionDetails.reflection.reflectionText, "Private synthetic writing");
  assert.equal(JSON.stringify(proof).includes("Private synthetic writing"), false);
});

test("v1 identical retry recovers exact original receipt after a newer completion with no additional quota writes", async () => {
  const uid = `${UID}-legacy`, user = db.collection("users").doc(uid);
  const service = createTrainingCompletionService({ getFirestore: provider.getFirestore, now: () => Date.parse(NOW) });
  const first = completionFixture({ sessionId: "stage1-repairs-original-auto" });
  await user.collection("trainingReservations").doc(first.sessionId).set({ sessionId: first.sessionId, mode: "auto", methodIds: [] });
  const original = await service.complete(uid, first), legacyProfile = (await user.get()).data().learningProfile;
  const manual = completionFixture({ sessionId: "stage1-repairs-next-manual", mode: "manual", count: 1 });
  await user.collection("trainingReservations").doc(manual.sessionId).set({ sessionId: manual.sessionId, mode: "manual", methodIds: manual.selectedMethods });
  const newer = await service.complete(uid, manual), retry = await service.complete(uid, first);
  assert.equal(JSON.stringify(retry), JSON.stringify(original));
  assert.equal(JSON.stringify(api.r.requireIdenticalReceipt(retry, original)), JSON.stringify(original));
  assert.equal(original.profileRevision + 1, newer.profileRevision);
  assert.deepEqual((await user.get()).data().learningProfile, legacyProfile);
  assert.equal((await user.collection("trainingUsage").get()).size, 0);
});
