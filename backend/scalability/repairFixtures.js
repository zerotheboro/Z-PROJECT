import { createHash } from "node:crypto";
import { createCompletedSessionEvidence, canonicalEvidence } from "../../src/quiz/learningEvidence.ts";
import { sessionInput } from "../../src/quiz/__tests__/learningEvidenceFixtures.ts";
import { createJournalEntry } from "./journal.ts";
import { createInventoryBootstrap, inventorySourceReference } from "./inventory.ts";
import { createGenerationManifest, createGenerationPage, createManifestPart, generationIdentity } from "./generations.ts";

export const NOW = "2026-10-22T10:00:00.000Z", UNTIL = "2026-10-22T10:01:00.000Z";
export const UID = "stage1-repair-fixture", oldHash = value => createHash("sha256").update(canonicalEvidence(value)).digest("hex");
export const origin = (uid = UID) => ({ uid, lifecycleEpoch: 1, revision: 0, headHash: null });
export function nativeSource(sessionId = "repaired-session-0001", { version = 2, revision = 1, uid = UID } = {}) {
  const scope = origin(uid), id = `session-${oldHash(sessionId)}`;
  const evidence = createCompletedSessionEvidence({ ...sessionInput({ id: sessionId, date: NOW }), owner: { kind: "user", uid } });
  const receipt = { schemaVersion: version, status: version === 1 ? "completed" : "accepted", sessionId, mode: "manual", evidenceId: id,
    requestHash: "a".repeat(64), recordedAt: NOW, legacyAssessmentId: null, legacyProfileUpdated: false,
    ...(version === 1 ? { profileRevision: 19 } : { lifecycleEpoch: 1, acceptedRevision: revision }) };
  const source = { schemaVersion: 1, uid, lifecycleEpoch: 1, namespace: "learningEvidence", id,
    payload: { schemaVersion: 1, evidence, receipt, requestHash: receipt.requestHash,
      completionDetails: { schemaVersion: 1, methodIntroduction: { score: 1 }, reflection: { reflectionText: "Private synthetic writing", surprisedByResults: false } } } };
  return { scope, source, receipt, reference: inventorySourceReference(source, scope) };
}
export function inventoryFixture() {
  const value = nativeSource(), bootstrap = createInventoryBootstrap(value.scope, []);
  const entry = createJournalEntry(value.scope, { kind: "session-accepted", receipt: value.receipt, evidenceHash: value.reference.contentHash }, NOW);
  const source = { ...value.scope, revision: 1, headHash: entry.entryHash };
  return { ...value, entry, cutoff: source, inputs: { bootstrap, bootstrapReferences: [], journalPrefix: [entry], sources: [value.source] } };
}
export function publicationFixture(value = inventoryFixture(), sourceReferences = [value.reference]) {
  const aggregationVersion = "exposure-separated-accuracy-v2", executionVersion = "full-generation-v1";
  const generationId = generationIdentity(value.cutoff, aggregationVersion, executionVersion);
  const profile = { namespace: "generation-artifact", id: "profile", contentHash: "c".repeat(64) };
  const pages = [createGenerationPage(generationId, 0, [profile, ...sourceReferences])];
  const parts = [createManifestPart(generationId, 0, pages)];
  const manifest = createGenerationManifest({ generationId, source: value.cutoff, aggregationVersion, executionVersion,
    nativeAcceptedCount: 1, profileHash: profile.contentHash }, parts);
  const control = { schemaVersion: 1, uid: UID, lifecycleEpoch: 1, lifecycle: "active", headRevision: value.cutoff.revision,
    headHash: value.cutoff.headHash, nativeAcceptedCount: 1, published: null,
    desiredAggregationVersion: aggregationVersion, desiredExecutionVersion: executionVersion };
  const job = { schemaVersion: 1, uid: UID, lifecycleEpoch: 1, generationId, sourceRevision: value.cutoff.revision,
    sourceHeadHash: value.cutoff.headHash, targetRevision: value.cutoff.revision, aggregationVersion, executionVersion,
    phase: "ready", lease: { workerId: "repair-worker", fence: 1, expiresAt: UNTIL }, fencingToken: 1, checkpointSequence: 1,
    cursor: { stage: "artifacts", afterKey: null, processedCount: 0 }, manifestHash: manifest.manifestHash };
  return { control, job, manifest, parts, pages, inventoryInputs: value.inputs, journalTail: [],
    workerId: "repair-worker", fence: 1, checkpointSequence: 1, now: NOW };
}
