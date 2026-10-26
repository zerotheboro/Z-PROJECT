import { createHash } from "node:crypto";
import { assertCompletedSessionEvidence, canonicalEvidence } from "../../src/quiz/learningEvidence";
import type { CompletedSessionEvidence } from "../../src/quiz/learningEvidence";
import { parseAcceptanceReceipt } from "./receipts";
import { parseJournalAnchor, verifyJournalContinuity } from "./journal";
import type { JournalAnchor } from "./journal";
import { parseGenerationReference, referenceIdentity } from "./references";
import type { GenerationReference } from "./references";
import { CONTRACT_LIMITS, ScalabilityContractError, bounded, canonicalJSON, copyJSON, hash, integer,
  object, requireContract, typedHash } from "./values";
import type { JSONValue } from "./values";

export type InventorySource = Readonly<{
  schemaVersion: 1; uid: string; lifecycleEpoch: number;
  namespace: "learningEvidence" | "learningEvidenceIdentityEvents"; id: string;
  // Complete immutable document, including receipt and Manual completionDetails.
  payload: Readonly<Record<string, JSONValue>>;
}>;
export type InventoryBootstrap = Readonly<{
  schemaVersion: 1; source: JournalAnchor; recordCount: number; inventoryDigest: string; bootstrapDigest: string;
}>;
export type InventoryProof = Readonly<{
  schemaVersion: 1; source: JournalAnchor; bootstrapDigest: string; bootstrapInventoryDigest: string;
  inventoryDigest: string; sourceCount: number; nativeAcceptedCount: number; proofDigest: string;
}>;
export type InventoryInputs = Readonly<{
  bootstrap: unknown; bootstrapReferences: readonly unknown[]; journalPrefix: readonly unknown[];
  sources: readonly unknown[]; claimedProof?: unknown;
}>;
export type InventoryVerification = Readonly<{
  authority: "NOT VERIFIED"; consistency: "verified" | "not-verified";
  reasons: readonly string[]; limitations: readonly string[];
  proof: InventoryProof | null; sourceReferences: readonly GenerationReference[];
}>;
const oldDigest = (value: unknown) => createHash("sha256").update(canonicalEvidence(value)).digest("hex");

// A proof input is not a persisted document: check descriptors shallowly, then
// validate each bounded source/entry separately. Do not impose a new whole-history
// JSON byte ceiling, invoke getters, retain caller objects or flatten unknowns.
function fields(value: unknown, keys: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  requireContract(typeof value === "object" && value !== null && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
  const descriptors = Object.getOwnPropertyDescriptors(value);
  requireContract(Reflect.ownKeys(value).every(key => typeof key === "string" && [...keys, ...optional].includes(key)) &&
    keys.every(key => Object.hasOwn(descriptors, key)), "invalid_inventory_fields");
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => {
    requireContract("value" in descriptor && descriptor.enumerable, "non_json_property"); return [key, descriptor.value];
  }));
}
function list(value: unknown): unknown[] {
  requireContract(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype &&
    Reflect.ownKeys(value).length === value.length + 1, "invalid_inventory_list");
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    requireContract(descriptor && "value" in descriptor && descriptor.enumerable, "invalid_inventory_list"); return descriptor.value;
  });
}
function sourceReference(value: unknown): GenerationReference {
  const reference = parseGenerationReference(value);
  requireContract(reference.namespace !== "generation-artifact", "artifact_is_not_source"); return reference;
}
/** Ordered, domain-separated fold: fixed-size proof, no growing digest array. */
export function inventoryDigest(sourceValue: JournalAnchor, references: readonly unknown[]): string {
  const source = parseJournalAnchor(sourceValue), rows = list(references).map(sourceReference)
    .sort((a, b) => referenceIdentity(a) < referenceIdentity(b) ? -1 : referenceIdentity(a) > referenceIdentity(b) ? 1 : 0);
  let digest = typedHash("inventory-start-v1", { uid: source.uid, lifecycleEpoch: source.lifecycleEpoch, count: rows.length });
  let previous = "";
  for (const reference of rows) {
    const key = referenceIdentity(reference); requireContract(key > previous, "duplicate_inventory_reference"); previous = key;
    digest = typedHash("inventory-fold-v1", { previous: digest, reference });
  }
  return digest;
}
/** A commitment factory, NOT an authority factory. Its output is caller data. */
export function createInventoryBootstrap(sourceValue: JournalAnchor, references: readonly unknown[]): InventoryBootstrap {
  const source = parseJournalAnchor(sourceValue); requireContract(source.revision === 0, "bootstrap_must_pin_origin");
  const body = { schemaVersion: 1, source, recordCount: list(references).length, inventoryDigest: inventoryDigest(source, references) };
  return parseBootstrap({ ...body, bootstrapDigest: typedHash("inventory-bootstrap-v1", body) });
}
function parseBootstrap(value: unknown): InventoryBootstrap {
  const data = object(value, ["schemaVersion", "source", "recordCount", "inventoryDigest", "bootstrapDigest"]);
  requireContract(data.schemaVersion === 1); const source = parseJournalAnchor(data.source);
  requireContract(source.revision === 0, "bootstrap_must_pin_origin"); integer(data.recordCount); hash(data.inventoryDigest); hash(data.bootstrapDigest);
  const { bootstrapDigest, ...body } = data;
  requireContract(bootstrapDigest === typedHash("inventory-bootstrap-v1", body), "bootstrap_digest_mismatch");
  return data as unknown as InventoryBootstrap;
}
export function parseInventorySource(value: unknown, scopeValue: JournalAnchor): InventorySource {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "namespace", "id", "payload"]);
  const scope = parseJournalAnchor(scopeValue);
  requireContract(data.schemaVersion === 1 && data.uid === scope.uid && data.lifecycleEpoch === scope.lifecycleEpoch, "inventory_source_scope_mismatch");
  const reference = sourceReference({ namespace: data.namespace, id: data.id, contentHash: "0".repeat(64) });
  const payload = copyJSON(data.payload);
  requireContract(payload !== null && typeof payload === "object" && !Array.isArray(payload), "invalid_source_payload");
  const row = payload as Record<string, JSONValue>;
  if (reference.namespace === "learningEvidence") {
    requireContract(row.schemaVersion === 1); assertCompletedSessionEvidence(row.evidence);
    const evidence = row.evidence as unknown as CompletedSessionEvidence;
    requireContract(evidence.owner.kind === "user" && evidence.owner.uid === scope.uid, "inventory_evidence_owner_mismatch");
    const id = evidence.provenance.kind === "native" ? `session-${oldDigest(evidence.sessionId)}` : `legacy-${oldDigest(evidence.provenance.recordId)}`;
    requireContract(data.id === id, "inventory_evidence_identity_mismatch");
    if (evidence.provenance.kind === "native") {
      const receipt = parseAcceptanceReceipt(row.receipt); hash(row.requestHash);
      requireContract(receipt.evidenceId === id && receipt.sessionId === evidence.sessionId && receipt.mode === evidence.mode &&
        receipt.requestHash === row.requestHash && (receipt.schemaVersion === 1 || receipt.lifecycleEpoch === scope.lifecycleEpoch), "inventory_receipt_mismatch");
    }
  } else {
    const decision = object(payload, ["schemaVersion", "sourceKind", "recordId", "sourceHash", "fromEvidenceId", "toEvidenceId", "fingerprint"]);
    requireContract(decision.schemaVersion === 1 && (decision.sourceKind === "native" || decision.sourceKind === "legacy"));
    sourceReference({ namespace: "learningEvidence", id: decision.toEvidenceId, contentHash: "0".repeat(64) });
    if (decision.fromEvidenceId !== null) sourceReference({ namespace: "learningEvidence", id: decision.fromEvidenceId, contentHash: "0".repeat(64) });
    requireContract(typeof decision.recordId === "string" && decision.recordId.length > 0 && typeof decision.fingerprint === "string" &&
      (decision.sourceKind === "native" ? /^[a-f0-9]{64}$/ : /^(?:v2:)?[a-f0-9]{64}$/).test(decision.fingerprint) &&
      data.id === oldDigest(decision) && decision.sourceHash === oldDigest(["training-source-v1", decision.sourceKind, decision.recordId]), "inventory_decision_identity_mismatch");
  }
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as InventorySource;
}
export function inventorySourceReference(value: unknown, scope: JournalAnchor): GenerationReference {
  const record = parseInventorySource(value, scope);
  return sourceReference({ namespace: record.namespace, id: record.id, contentHash: typedHash("inventory-source-v1", record) });
}

/** Checks replay/completeness RELATIVE TO supplied commitments. No JSON origin
 * claim, digest, factory, callback or boolean can turn these inputs into trusted
 * Firestore facts. Stage 1 intentionally has no authority-admission provider. */
export function verifyInventoryProof(value: unknown, expectedSourceValue: JournalAnchor): InventoryVerification {
  const notVerified = (reason: string): InventoryVerification => Object.freeze({ authority: "NOT VERIFIED", consistency: "not-verified",
    reasons: Object.freeze([reason]), limitations: Object.freeze([]), proof: null, sourceReferences: Object.freeze([]) });
  if (value === undefined || value === null) return notVerified("inventory_inputs_unavailable");
  try {
    const input = fields(value, ["bootstrap", "bootstrapReferences", "journalPrefix", "sources"], ["claimedProof"]);
    const source = parseJournalAnchor(expectedSourceValue), bootstrap = parseBootstrap(input.bootstrap);
    requireContract(bootstrap.source.uid === source.uid && bootstrap.source.lifecycleEpoch === source.lifecycleEpoch, "inventory_scope_mismatch");
    const bootstrapRefs = list(input.bootstrapReferences).map(sourceReference);
    requireContract(bootstrapRefs.length === bootstrap.recordCount && inventoryDigest(bootstrap.source, bootstrapRefs) === bootstrap.inventoryDigest, "bootstrap_inventory_mismatch");
    const prefix = verifyJournalContinuity(bootstrap.source, source, list(input.journalPrefix));
    const records = new Map<string, InventorySource>(), references = new Map<string, GenerationReference>();
    for (const raw of list(input.sources)) {
      const record = parseInventorySource(raw, source), reference = inventorySourceReference(record, source), key = referenceIdentity(reference);
      requireContract(!records.has(key), "duplicate_inventory_source"); records.set(key, record); references.set(key, reference);
    }
    const included = new Map<string, GenerationReference>(), nativeSessions = new Set<string>();
    const take = (namespace: GenerationReference["namespace"], id: string, expectedHash?: string) => {
      const key = referenceIdentity({ namespace, id, contentHash: "0".repeat(64) }), record = records.get(key), reference = references.get(key);
      requireContract(record && reference, "inventory_source_missing");
      requireContract(expectedHash === undefined || reference.contentHash === expectedHash, "inventory_source_substituted");
      included.set(key, reference); return record;
    };
    for (const reference of bootstrapRefs) {
      const record = take(reference.namespace, reference.id, reference.contentHash);
      if (record.namespace === "learningEvidence") {
        const evidence = record.payload.evidence as unknown as CompletedSessionEvidence;
        if (evidence.provenance.kind === "native") { requireContract(!nativeSessions.has(evidence.sessionId), "duplicate_native_session"); nativeSessions.add(evidence.sessionId); }
      }
    }
    const limitations = new Set(["bootstrap_origin_unverified", "journal_head_origin_unverified", "artifact_semantics_unverified"]);
    for (const entry of prefix.entries) {
      const event = entry.event;
      if (event.kind === "session-accepted") {
        requireContract(!nativeSessions.has(event.receipt.sessionId), "duplicate_native_session"); nativeSessions.add(event.receipt.sessionId);
        const record = take("learningEvidence", event.receipt.evidenceId, event.evidenceHash);
        const evidence = record.payload.evidence as unknown as CompletedSessionEvidence;
        requireContract(evidence.provenance.kind === "native" && evidence.sessionId === event.receipt.sessionId &&
          canonicalJSON(record.payload.receipt) === canonicalJSON(event.receipt), "inventory_acceptance_identity_mismatch");
      } else if (event.kind === "historical-imported") {
        const record = take("learningEvidence", event.evidenceId), evidence = record.payload.evidence as unknown as CompletedSessionEvidence;
        requireContract(evidence.provenance.kind === "legacy-assessment" && evidence.provenance.recordId === event.recordId &&
          evidence.originalSessionId === event.originalSessionId && evidence.completedAt === event.completedAt, "inventory_historical_identity_mismatch");
        // Existing event format commits a legacy-source fingerprint, not a hash
        // of the complete frozen evidence row. Do not invent that missing proof.
        limitations.add("historical_payload_attestation_unavailable");
        if (event.proof.version === "pre-v2-unverified") limitations.add("historical_fingerprint_unverified");
      } else {
        const decision = take("learningEvidenceIdentityEvents", event.decisionId).payload;
        const fingerprint = event.proof.version === "v2" ? `v2:${event.proof.digest}` : event.proof.digest;
        requireContract(decision.sourceKind === event.sourceKind && decision.recordId === event.recordId &&
          decision.fromEvidenceId === event.fromEvidenceId && decision.toEvidenceId === event.toEvidenceId && decision.fingerprint === fingerprint, "inventory_decision_substituted");
      }
    }
    // Every identity target must be present already, not introduced implicitly by
    // an uncommitted pointer. Retain old alias sources; do not aggregate them twice.
    for (const [key] of included) {
      const record = records.get(key)!;
      if (record.namespace !== "learningEvidenceIdentityEvents") continue;
      for (const id of [record.payload.fromEvidenceId, record.payload.toEvidenceId]) if (typeof id === "string") {
        requireContract(included.has(referenceIdentity({ namespace: "learningEvidence", id, contentHash: "0".repeat(64) })), "inventory_identity_target_missing");
      }
      if (record.payload.sourceKind === "native") {
        const targetKey = referenceIdentity({ namespace: "learningEvidence", id: record.payload.toEvidenceId as string, contentHash: "0".repeat(64) });
        const target = records.get(targetKey)!, evidence = target.payload.evidence as unknown as CompletedSessionEvidence;
        requireContract(evidence.provenance.kind === "native" && evidence.sessionId === record.payload.recordId &&
          target.payload.requestHash === record.payload.fingerprint, "inventory_native_decision_mismatch");
      }
    }
    const chains = new Map<string, InventorySource[]>();
    for (const [key] of included) {
      const record = records.get(key)!;
      if (record.namespace === "learningEvidenceIdentityEvents") {
        const sourceHash = record.payload.sourceHash as string;
        chains.set(sourceHash, [...(chains.get(sourceHash) ?? []), record]);
      }
    }
    for (const chain of chains.values()) {
      const roots = chain.filter(record => record.payload.fromEvidenceId === null);
      requireContract(roots.length === 1, "inventory_identity_chain_invalid");
      let current = roots[0]; const visited = new Set([current.id]);
      while (true) {
        const next = chain.filter(record => record.payload.fromEvidenceId === current.payload.toEvidenceId);
        requireContract(next.length <= 1, "inventory_identity_chain_invalid");
        if (!next.length) break;
        requireContract(!visited.has(next[0].id) && next[0].payload.fingerprint === current.payload.fingerprint, "inventory_identity_chain_invalid");
        current = next[0]; visited.add(current.id);
      }
      requireContract(visited.size === chain.length, "inventory_identity_chain_invalid");
    }
    requireContract(included.size === records.size, "inventory_unreferenced_source");
    const sourceReferences = [...included.values()].sort((a, b) => referenceIdentity(a) < referenceIdentity(b) ? -1 : 1);
    const body = { schemaVersion: 1, source, bootstrapDigest: bootstrap.bootstrapDigest, bootstrapInventoryDigest: bootstrap.inventoryDigest,
      inventoryDigest: inventoryDigest(source, sourceReferences), sourceCount: sourceReferences.length, nativeAcceptedCount: prefix.acceptedSessionIds.length };
    const proof = bounded(copyJSON({ ...body, proofDigest: typedHash("inventory-proof-v1", body) }), CONTRACT_LIMITS.recordBytes) as unknown as InventoryProof;
    if (input.claimedProof !== undefined) requireContract(canonicalJSON(input.claimedProof) === canonicalJSON(proof), "inventory_proof_mismatch");
    return Object.freeze({ authority: "NOT VERIFIED", consistency: "verified", reasons: Object.freeze(["inventory_authority_unavailable"]),
      limitations: Object.freeze([...limitations].sort()), proof, sourceReferences: Object.freeze(sourceReferences) });
  } catch (error) {
    return notVerified(error instanceof ScalabilityContractError ? error.code : "inventory_source_invalid");
  }
}
