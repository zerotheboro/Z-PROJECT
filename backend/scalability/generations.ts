import { parseAggregationCheckpoint, parseAccountRevisionControl } from "./controls";
import { parseJournalAnchor, verifyJournalContinuity } from "./journal";
import type { JournalAnchor } from "./journal";
import { verifyInventoryProof } from "./inventory";
import { parseGenerationReference as reference, referenceIdentity } from "./references";
import type { GenerationReference } from "./references";
export { referenceIdentity } from "./references";
export type { GenerationReference } from "./references";
import { CONTRACT_LIMITS, bounded, copyJSON, hash, integer, jsonBytes, object, requireContract, text, timestamp, typedHash } from "./values";

// Pages contain references, not recomputed performance or private payloads. The
// referenced evidence/derived artifacts require their own semantic validation.
export type GenerationPage = Readonly<{ schemaVersion: 1; generationId: string; index: number;
  records: readonly GenerationReference[]; pageHash: string }>;
export type PageDescriptor = Readonly<{ index: number; pageHash: string; recordCount: number; byteCount: number }>;
export type ManifestPart = Readonly<{ schemaVersion: 1; generationId: string; index: number;
  pages: readonly PageDescriptor[]; partHash: string }>;
export type PartDescriptor = Readonly<{ index: number; partHash: string; pageCount: number; recordCount: number; byteCount: number }>;
export type GenerationManifest = Readonly<{ schemaVersion: 1; generationId: string; source: JournalAnchor;
  aggregationVersion: string; executionVersion: string; nativeAcceptedCount: number;
  parts: readonly PartDescriptor[]; pageCount: number; recordCount: number;
  profileHash: string; manifestHash: string }>;
export function generationIdentity(sourceValue: JournalAnchor, aggregationVersion: string, executionVersion: string): string {
  const source = parseJournalAnchor(sourceValue); text(aggregationVersion, 64); text(executionVersion, 64);
  return typedHash("profile-generation-v1", { source, aggregationVersion, executionVersion });
}
/** Includes JSON escaping and the entire envelope, not just text lengths. */
export function assertPageCapacity(envelope: unknown): number {
  const copied = copyJSON(envelope);
  requireContract(copied !== null && typeof copied === "object" && !Array.isArray(copied), "invalid_page_envelope");
  const data = copied as Record<string, import("./values").JSONValue>;
  requireContract(Object.hasOwn(data, "records") && Array.isArray(data.records), "invalid_records_container");
  requireContract(data.records.length >= 1 && data.records.length <= CONTRACT_LIMITS.pageRecords, "page_count_limit");
  for (const item of data.records) bounded(item, CONTRACT_LIMITS.recordBytes);
  const bytes = jsonBytes(data); requireContract(bytes <= CONTRACT_LIMITS.pageBytes, "page_byte_limit"); return bytes;
}
export function parseGenerationPage(value: unknown): GenerationPage {
  const data = object(value, ["schemaVersion", "generationId", "index", "records", "pageHash"]);
  requireContract(data.schemaVersion === 1 && Array.isArray(data.records)); hash(data.generationId); integer(data.index); hash(data.pageHash);
  let previous = "";
  for (const row of data.records) {
    const key = referenceIdentity(reference(row)); requireContract(key > previous, "reference_order_or_duplicate"); previous = key;
  }
  const { pageHash, ...body } = data;
  requireContract(pageHash === typedHash("generation-page-v1", body), "page_hash_mismatch");
  assertPageCapacity({ ...data, records: data.records }); return data as unknown as GenerationPage;
}
export function createGenerationPage(generationId: string, index: number, records: readonly GenerationReference[]): GenerationPage {
  const body = { schemaVersion: 1, generationId, index,
    records: records.map(reference).sort((a, b) => referenceIdentity(a) < referenceIdentity(b) ? -1 : referenceIdentity(a) > referenceIdentity(b) ? 1 : 0) };
  return parseGenerationPage({ ...body, pageHash: typedHash("generation-page-v1", body) });
}
function pageDescriptor(value: unknown): PageDescriptor {
  const data = object(value, ["index", "pageHash", "recordCount", "byteCount"]);
  integer(data.index); hash(data.pageHash); integer(data.recordCount, 1); integer(data.byteCount, 1);
  requireContract(data.recordCount <= CONTRACT_LIMITS.pageRecords && data.byteCount <= CONTRACT_LIMITS.pageBytes);
  return data as unknown as PageDescriptor;
}
export function parseManifestPart(value: unknown): ManifestPart {
  const data = object(value, ["schemaVersion", "generationId", "index", "pages", "partHash"]);
  requireContract(data.schemaVersion === 1 && Array.isArray(data.pages) && data.pages.length >= 1 && data.pages.length <= CONTRACT_LIMITS.descriptors);
  hash(data.generationId); integer(data.index); hash(data.partHash);
  let previous = -1;
  for (const row of data.pages) { const parsed = pageDescriptor(row); requireContract(parsed.index > previous, "descriptor_order"); previous = parsed.index; }
  const { partHash, ...body } = data;
  requireContract(partHash === typedHash("manifest-part-v1", body), "part_hash_mismatch");
  return bounded(data, CONTRACT_LIMITS.manifestBytes) as unknown as ManifestPart;
}
export function createManifestPart(generationId: string, index: number, pages: readonly GenerationPage[]): ManifestPart {
  const body = { schemaVersion: 1, generationId, index, pages: pages.map(parseGenerationPage).sort((a, b) => a.index - b.index).map(page => {
    requireContract(page.generationId === generationId, "generation_mismatch");
    return { index: page.index, pageHash: page.pageHash, recordCount: page.records.length, byteCount: jsonBytes(page) };
  }) };
  return parseManifestPart({ ...body, partHash: typedHash("manifest-part-v1", body) });
}
function partDescriptor(value: unknown): PartDescriptor {
  const data = object(value, ["index", "partHash", "pageCount", "recordCount", "byteCount"]);
  integer(data.index); hash(data.partHash); integer(data.pageCount, 1); integer(data.recordCount, 1); integer(data.byteCount, 1);
  requireContract(data.pageCount <= CONTRACT_LIMITS.descriptors && data.recordCount >= data.pageCount &&
    data.recordCount <= data.pageCount * CONTRACT_LIMITS.pageRecords && data.byteCount <= CONTRACT_LIMITS.manifestBytes);
  return data as unknown as PartDescriptor;
}
export function parseGenerationManifest(value: unknown): GenerationManifest {
  const data = object(value, ["schemaVersion", "generationId", "source", "aggregationVersion", "executionVersion", "nativeAcceptedCount",
    "parts", "pageCount", "recordCount", "profileHash", "manifestHash"]);
  requireContract(data.schemaVersion === 1 && Array.isArray(data.parts) && data.parts.length >= 1 && data.parts.length <= CONTRACT_LIMITS.descriptors);
  const source = parseJournalAnchor(data.source); hash(data.generationId); hash(data.profileHash); hash(data.manifestHash);
  text(data.aggregationVersion, 64); text(data.executionVersion, 64); integer(data.nativeAcceptedCount);
  requireContract(data.nativeAcceptedCount <= source.revision && data.generationId === generationIdentity(source, data.aggregationVersion, data.executionVersion), "generation_identity_mismatch");
  integer(data.pageCount, 1); integer(data.recordCount, 1);
  let pages = 0, records = 0;
  data.parts.forEach((row, index) => { const parsed = partDescriptor(row); requireContract(parsed.index === index, "missing_manifest_part"); pages += parsed.pageCount; records += parsed.recordCount; });
  requireContract(data.pageCount === pages && data.recordCount === records, "manifest_count_mismatch");
  const { manifestHash, ...body } = data;
  requireContract(manifestHash === typedHash("generation-manifest-v1", body), "manifest_hash_mismatch");
  return bounded(data, CONTRACT_LIMITS.manifestBytes) as unknown as GenerationManifest;
}
export function createGenerationManifest(input: Omit<GenerationManifest, "schemaVersion" | "parts" | "pageCount" | "recordCount" | "manifestHash">,
  parts: readonly ManifestPart[]): GenerationManifest {
  const descriptors = parts.map(parseManifestPart).sort((a, b) => a.index - b.index).map(part => {
    requireContract(part.generationId === input.generationId, "generation_mismatch");
    return { index: part.index, partHash: part.partHash, pageCount: part.pages.length,
      recordCount: part.pages.reduce((count, page) => count + page.recordCount, 0), byteCount: jsonBytes(part) };
  });
  const body = { schemaVersion: 1, generationId: input.generationId, source: input.source,
    aggregationVersion: input.aggregationVersion, executionVersion: input.executionVersion,
    nativeAcceptedCount: input.nativeAcceptedCount, profileHash: input.profileHash, parts: descriptors,
    pageCount: descriptors.reduce((count, part) => count + part.pageCount, 0), recordCount: descriptors.reduce((count, part) => count + part.recordCount, 0) };
  return parseGenerationManifest({ ...body, manifestHash: typedHash("generation-manifest-v1", body) });
}
/** Complete, order-independent structural/hash verification. Does NOT prove the
 * referenced payloads exist or that aggregation mathematics was performed. */
export function verifyGenerationStructure(manifestValue: unknown, partValues: readonly unknown[], pageValues: readonly unknown[]): GenerationManifest {
  const manifest = parseGenerationManifest(manifestValue);
  const parts = partValues.map(parseManifestPart).sort((a, b) => a.index - b.index);
  const pages = pageValues.map(parseGenerationPage).sort((a, b) => a.index - b.index);
  requireContract(parts.length === manifest.parts.length && pages.length === manifest.pageCount, "generation_incomplete");
  const seen = new Set<string>(); let pageIndex = 0, profiles = 0;
  parts.forEach((part, index) => {
    const descriptor = manifest.parts[index];
    requireContract(part.index === index && part.generationId === manifest.generationId && part.partHash === descriptor.partHash &&
      jsonBytes(part) === descriptor.byteCount && part.pages.length === descriptor.pageCount, "manifest_part_mismatch");
    let count = 0;
    for (const expected of part.pages) {
      const page = pages[pageIndex];
      requireContract(page && expected.index === pageIndex && page.index === pageIndex && page.generationId === manifest.generationId &&
        page.pageHash === expected.pageHash && page.records.length === expected.recordCount && jsonBytes(page) === expected.byteCount, "manifest_page_mismatch");
      for (const row of page.records) {
        const key = referenceIdentity(row); requireContract(!seen.has(key), "duplicate_generation_reference"); seen.add(key);
        if (row.namespace === "generation-artifact" && row.id === "profile") {
          requireContract(row.contentHash === manifest.profileHash, "profile_hash_mismatch"); profiles++;
        }
      }
      count += page.records.length; pageIndex++;
    }
    requireContract(count === descriptor.recordCount, "manifest_count_mismatch");
  });
  requireContract(profiles === 1 && seen.size === manifest.recordCount, "profile_or_count_missing");
  return manifest;
}
/** Compatibility helper: equality with a supplied list is structural consistency
 * ONLY. It is deliberately not used as publication authority. */
export function verifyGenerationManifest(manifestValue: unknown, partValues: readonly unknown[], pageValues: readonly unknown[],
  expectedReferences: readonly GenerationReference[]): GenerationManifest {
  const manifest = verifyGenerationStructure(manifestValue, partValues, pageValues);
  requireContract(Array.isArray(expectedReferences), "expected_inventory_required");
  const expected = new Map<string, GenerationReference>();
  for (const raw of expectedReferences) {
    const parsed = reference(raw), key = referenceIdentity(parsed);
    requireContract(!expected.has(key), "duplicate_expected_reference"); expected.set(key, parsed);
  }
  let count = 0;
  for (const page of pageValues.map(parseGenerationPage)) for (const row of page.records) {
    requireContract(expected.get(referenceIdentity(row))?.contentHash === row.contentHash, "reference_inventory_mismatch"); count++;
  }
  requireContract(count === expected.size, "reference_inventory_incomplete"); return manifest;
}
export type PublicationInput = {
  control: unknown; job: unknown; manifest: unknown; parts: readonly unknown[]; pages: readonly unknown[];
  inventoryInputs?: unknown;
  journalTail: readonly unknown[]; workerId: string; fence: number; checkpointSequence: number; now: string;
};
/** Eligibility only: future publication must re-read control/job and atomically
 * CAS the same epoch, fence and checkpoint. A stale-but-exact generation may
 * publish while acceptance continues; its lag remains explicit. */
export function profilePublicationEligibility(input: PublicationInput) {
  const control = parseAccountRevisionControl(input.control), job = parseAggregationCheckpoint(input.job);
  const manifest = verifyGenerationStructure(input.manifest, input.parts, input.pages);
  const inventory = verifyInventoryProof(input.inventoryInputs, manifest.source);
  timestamp(input.now); text(input.workerId, 128); integer(input.fence, 1); integer(input.checkpointSequence);
  const reasons: string[] = [];
  if (inventory.consistency !== "verified") reasons.push(...inventory.reasons);
  else {
    const expected = new Map(inventory.sourceReferences.map(row => [referenceIdentity(row), row.contentHash]));
    const actual = input.pages.flatMap(page => parseGenerationPage(page).records).filter(row => row.namespace !== "generation-artifact");
    if (actual.length !== expected.size || actual.some(row => expected.get(referenceIdentity(row)) !== row.contentHash)) reasons.push("source_inventory_mismatch");
    if (manifest.nativeAcceptedCount !== inventory.proof!.nativeAcceptedCount) reasons.push("source_inventory_count_mismatch");
  }
  if (control.lifecycle !== "active") reasons.push("account_not_active");
  if (control.uid !== job.uid || control.uid !== manifest.source.uid || control.lifecycleEpoch !== job.lifecycleEpoch ||
    control.lifecycleEpoch !== manifest.source.lifecycleEpoch) reasons.push("scope_mismatch");
  if (job.phase !== "ready" || job.manifestHash !== manifest.manifestHash || job.generationId !== manifest.generationId ||
    job.sourceRevision !== manifest.source.revision || job.sourceHeadHash !== manifest.source.headHash) reasons.push("job_not_verified");
  if (!job.lease || job.lease.workerId !== input.workerId || job.lease.fence !== input.fence ||
    job.checkpointSequence !== input.checkpointSequence || input.now >= job.lease.expiresAt) reasons.push("stale_worker_fence");
  if (control.desiredAggregationVersion !== manifest.aggregationVersion || control.desiredExecutionVersion !== manifest.executionVersion ||
    job.aggregationVersion !== manifest.aggregationVersion || job.executionVersion !== manifest.executionVersion) reasons.push("version_mismatch");
  if (manifest.source.revision > control.headRevision || manifest.nativeAcceptedCount > control.nativeAcceptedCount) reasons.push("future_generation");
  if (control.published && (manifest.source.revision < control.published.revision ||
    manifest.nativeAcceptedCount < control.published.nativeAcceptedCount ||
    manifest.source.revision === control.published.revision && manifest.generationId === control.published.generationId)) reasons.push("publication_not_advancing");
  // Proof of ancestry and accepted-count difference, including when a newer
  // journal head exists. No session chronology is inferred from this proof.
  if (!reasons.includes("scope_mismatch") && !reasons.includes("future_generation")) {
    const tail = verifyJournalContinuity(manifest.source, { uid: control.uid, lifecycleEpoch: control.lifecycleEpoch,
      revision: control.headRevision, headHash: control.headHash }, input.journalTail);
    if (control.nativeAcceptedCount - manifest.nativeAcceptedCount !== tail.acceptedSessionIds.length) reasons.push("acceptance_count_mismatch");
  }
  const structurallyEligible = reasons.length === 0;
  // No authority-admission provider exists in Stage 1. Never accept a caller's
  // claim, signed-looking object, matching list or derived proof as that provider.
  reasons.push("inventory_authority_not_verified");
  return Object.freeze({ eligible: false as const, authority: inventory.authority,
    structurallyEligible, reasons: Object.freeze(reasons), inventory });
}
