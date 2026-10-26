import { validateCompletion } from "../trainingCompletionContract";
import { legacyAssessmentFingerprint, rebuildPersistedProjection } from "../trainingCompletion";
import { parseAcceptanceBatch, initialAcceptanceCheckpoint, checkpointForBatch, verifyAcceptanceCheckpoint } from "./acceptanceBatches";
import { verifyInventoryProof, inventorySourceReference } from "./inventory";
import type { InventorySource } from "./inventory";
import type { GenerationReference } from "./references";
import { createGenerationPage, createManifestPart, createGenerationManifest, verifyGenerationManifest } from "./generations";
import { canonicalJSON, copyJSON, integer, object, requireContract, typedHash } from "./values";
import type { ShadowPin } from "./shadowContracts";
import { parseShadowPin } from "./shadowContracts";
import { generationIdentity } from "./generations";
import { initialControl } from "./acceptanceState";

type Row = { id: string; data: Record<string, unknown> };
export type ReplayPacket = Readonly<{ schemaVersion: 1; ordinal: number; batch: unknown; entries: readonly unknown[];
  archive: Record<string, unknown>; row: Record<string, unknown>; decisions: readonly Row[]; indexes: readonly Row[];
  legacyFingerprint: string | null }>;
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
export function parseReplayPacket(value: unknown, pinValue: ShadowPin): ReplayPacket {
  const pin = parseShadowPin(pinValue);
  const data = object(value, ["schemaVersion", "ordinal", "batch", "entries", "archive", "row", "decisions", "indexes", "legacyFingerprint"]);
  integer(data.ordinal, 1); requireContract(data.schemaVersion === 1 && data.ordinal <= pin.checkpoint.ordinal, "shadow_packet_scope");
  const batch = parseAcceptanceBatch(data.batch), receipt = batch.receipt;
  requireContract(batch.uid === pin.source.uid && batch.lifecycleEpoch === pin.source.lifecycleEpoch &&
    batch.ordinal === data.ordinal && batch.lastRevision <= pin.source.revision, "shadow_packet_scope");
  requireContract(Array.isArray(data.entries) && Array.isArray(data.decisions) && Array.isArray(data.indexes), "shadow_packet_invalid");
  const archive = object(data.archive, ["schemaVersion", "uid", "lifecycleEpoch", "sessionId", "evidenceId", "requestHash", "payload", "receipt", "archivedAt"]);
  requireContract(archive.schemaVersion === 1 && archive.uid === batch.uid && archive.lifecycleEpoch === batch.lifecycleEpoch &&
    archive.sessionId === receipt.sessionId && archive.evidenceId === receipt.evidenceId && archive.requestHash === receipt.requestHash &&
    archive.archivedAt === receipt.recordedAt && same(archive.receipt, receipt), "shadow_archive_mismatch");
  const validated = validateCompletion(batch.uid, archive.payload, receipt.recordedAt);
  const row = data.row as Record<string, unknown>;
  const expectedRow = { schemaVersion: 1, evidence: validated.evidence, requestHash: validated.requestHash, receipt,
    ...(validated.request.mode === "manual" ? { completionDetails: { schemaVersion: 1,
      methodIntroduction: validated.request.methodIntroduction, reflection: validated.request.reflection } } : {}),
    resultAuthority: "client-reported", selectionContextAuthority: "client-advisory" };
  requireContract(validated.requestHash === receipt.requestHash && same(row, expectedRow), "shadow_evidence_archive_mismatch");
  const source = { schemaVersion: 1, uid: batch.uid, lifecycleEpoch: batch.lifecycleEpoch,
    namespace: "learningEvidence", id: receipt.evidenceId, payload: row };
  requireContract(inventorySourceReference(source, pin.source).contentHash === batch.evidenceHash, "shadow_evidence_hash_mismatch");
  const events = data.entries as unknown as { event: { kind: string; decisionId: string } }[];
  const expectedIds = events.slice(1).map(entry => entry.event.decisionId);
  const decisions = data.decisions as unknown as Row[], indexes = data.indexes as unknown as Row[];
  requireContract(decisions.length === expectedIds.length && decisions.every((row, index) => row.id === expectedIds[index]), "shadow_decisions_missing");
  // Existing immutable decision protocol, not a new identity scheme.
  rebuildPersistedProjection(batch.uid, [{ id: receipt.evidenceId, data: row }], indexes, decisions);
  if (validated.legacy === null) requireContract(data.legacyFingerprint === null, "shadow_unexpected_legacy");
  else {
    const expected = legacyAssessmentFingerprint({ ...validated.legacy, createdAt: new Date(receipt.recordedAt) });
    requireContract(data.legacyFingerprint === expected && decisions.some(decision =>
      decision.data.sourceKind === "legacy" && decision.data.fingerprint === expected), "shadow_legacy_fingerprint_mismatch");
  }
  return data as unknown as ReplayPacket;
}

/** Exact full-generation rebuild. These are independently fetched server
 * packets, NOT caller authority. Stage 1 authority remains NOT VERIFIED. */
export function rebuildShadow(pinValue: ShadowPin, bootstrap: unknown, values: readonly unknown[]) {
  const pin = parseShadowPin(pinValue), packets = values.map(value => parseReplayPacket(value, pin)).sort((a, b) => a.ordinal - b.ordinal);
  requireContract(packets.length === pin.checkpoint.ordinal, "shadow_inventory_incomplete");
  let previous = initialAcceptanceCheckpoint(pin.source);
  let predecessor: unknown;
  const entries: unknown[] = [], sources: InventorySource[] = [], evidence: Row[] = [], indexes: Row[] = [], decisions: Row[] = [];
  packets.forEach((packet, index) => {
    const batch = parseAcceptanceBatch(packet.batch);
    requireContract(packet.ordinal === index + 1 && same(batch.previous, previous), "shadow_batch_gap");
    previous = verifyAcceptanceCheckpoint({ ...initialControl(pin.source.uid), nativeAcceptedCount: batch.ordinal,
      headRevision: batch.lastRevision, headHash: batch.headHash }, checkpointForBatch(batch), batch, packet.entries, predecessor);
    predecessor = batch; entries.push(...packet.entries);
    evidence.push({ id: batch.receipt.evidenceId, data: packet.row });
    decisions.push(...packet.decisions); indexes.push(...packet.indexes);
    sources.push({ schemaVersion: 1, uid: pin.source.uid, lifecycleEpoch: pin.source.lifecycleEpoch,
      namespace: "learningEvidence", id: batch.receipt.evidenceId, payload: copyJSON(packet.row) as InventorySource["payload"] });
    for (const row of packet.decisions) sources.push({ schemaVersion: 1, uid: pin.source.uid, lifecycleEpoch: pin.source.lifecycleEpoch,
      namespace: "learningEvidenceIdentityEvents", id: row.id, payload: copyJSON(row.data) as InventorySource["payload"] });
  });
  requireContract(same(previous, pin.checkpoint), "shadow_checkpoint_mismatch");
  const inventory = verifyInventoryProof({ bootstrap, bootstrapReferences: [], journalPrefix: entries, sources }, pin.source);
  requireContract(inventory.consistency === "verified" && inventory.proof?.nativeAcceptedCount === packets.length, "shadow_inventory_invalid");
  const projection = rebuildPersistedProjection(pin.source.uid, evidence, indexes, decisions);
  requireContract(projection.active.length === packets.length && projection.profile.sessionCount === packets.length, "shadow_projection_count");
  const profile = projection.profile, profileHash = typedHash("shadow-profile-v1", profile);
  const generationId = generationIdentity(pin.source, pin.aggregationVersion, pin.executionVersion);
  const refs: GenerationReference[] = [...inventory.sourceReferences, { namespace: "generation-artifact", id: "profile", contentHash: profileHash }];
  // The Stage 1 reference identity, page and manifest contracts remain the oracle.
  const pages = [];
  for (let offset = 0; offset < refs.length; offset += 20) pages.push(createGenerationPage(generationId, pages.length, refs.slice(offset, offset + 20)));
  const parts = [];
  for (let offset = 0; offset < pages.length; offset += 128) parts.push(createManifestPart(generationId, parts.length, pages.slice(offset, offset + 128)));
  const manifest = createGenerationManifest({ generationId, source: pin.source, aggregationVersion: pin.aggregationVersion,
    executionVersion: pin.executionVersion, nativeAcceptedCount: packets.length, profileHash }, parts);
  verifyGenerationManifest(manifest, parts, pages, refs);
  return { profile, inventory, pages, parts, manifest, entries, sourceCount: sources.length };
}
