import { parseAcceptanceReceipt } from "./receipts";
import type { CompletionReceiptV2 } from "./receipts";
import { CONTRACT_LIMITS, bounded, compareRevisions, hash, integer, nextRevision, object,
  requireContract, text, timestamp, typedHash } from "./values";

export type JournalScope = Readonly<{ uid: string; lifecycleEpoch: number }>;
export type JournalAnchor = JournalScope & Readonly<{ revision: number; headHash: string | null }>;
export type SourceProof = Readonly<{ version: "v2" | "request-v1" | "pre-v2-unverified"; digest: string }>;
export type JournalEvent =
  | Readonly<{ kind: "session-accepted"; receipt: CompletionReceiptV2; evidenceHash: string }>
  | Readonly<{ kind: "identity-decided"; decisionId: string; sourceKind: "native" | "legacy";
      recordId: string; fromEvidenceId: string | null; toEvidenceId: string; proof: SourceProof;
      linkage: "established" | "unresolved" }>
  | Readonly<{ kind: "historical-imported"; recordId: string; evidenceId: string;
      originalSessionId: string | null; completedAt: string | null; proof: SourceProof }>;
export type JournalEntry = JournalScope & Readonly<{
  schemaVersion: 1; revision: number; entryId: string; previousHash: string | null;
  recordedAt: string; event: JournalEvent; entryHash: string;
}>;
function scope(uid: unknown, epoch: unknown): void {
  text(uid, 512); requireContract((uid as string).length <= 128 && !(uid as string).includes("/")); integer(epoch, 1);
}
export function journalIdentity(input: JournalScope, revision: number): string {
  scope(input.uid, input.lifecycleEpoch); integer(revision, 1);
  return `j-${typedHash("journal-scope-v1", { uid: input.uid, lifecycleEpoch: input.lifecycleEpoch })}-${String(revision).padStart(16, "0")}`;
}
export function parseJournalAnchor(value: unknown): JournalAnchor {
  const data = object(value, ["uid", "lifecycleEpoch", "revision", "headHash"]);
  scope(data.uid, data.lifecycleEpoch); integer(data.revision);
  if (data.revision === 0) requireContract(data.headHash === null, "invalid_anchor"); else hash(data.headHash);
  return data as unknown as JournalAnchor;
}
function proof(value: unknown): SourceProof {
  const data = object(value, ["version", "digest"]);
  requireContract(data.version === "v2" || data.version === "request-v1" || data.version === "pre-v2-unverified"); hash(data.digest);
  return data as unknown as SourceProof;
}
function event(value: unknown): JournalEvent {
  const kind = Object.getOwnPropertyDescriptor(value ?? {}, "kind")?.value;
  if (kind === "session-accepted") {
    const data = object(value, ["kind", "receipt", "evidenceHash"]);
    const receipt = parseAcceptanceReceipt(data.receipt);
    requireContract(receipt.schemaVersion === 2, "journal_requires_v2_receipt"); hash(data.evidenceHash);
    return data as unknown as JournalEvent;
  }
  if (kind === "identity-decided") {
    const data = object(value, ["kind", "decisionId", "sourceKind", "recordId", "fromEvidenceId", "toEvidenceId", "proof", "linkage"]);
    hash(data.decisionId); text(data.recordId); text(data.toEvidenceId);
    if (data.fromEvidenceId !== null) text(data.fromEvidenceId);
    requireContract(data.sourceKind === "native" || data.sourceKind === "legacy");
    const sourceProof = proof(data.proof);
    requireContract(data.sourceKind === "native" ? sourceProof.version === "request-v1" : sourceProof.version !== "request-v1", "source_proof_protocol_mismatch");
    requireContract(data.linkage === "established" || data.linkage === "unresolved");
    requireContract(data.linkage !== "unresolved" || data.sourceKind === "legacy" && data.fromEvidenceId === null &&
      (data.toEvidenceId as string).startsWith("legacy-"), "invented_identity");
    requireContract(data.fromEvidenceId !== data.toEvidenceId, "identity_noop");
    return data as unknown as JournalEvent;
  }
  requireContract(kind === "historical-imported", "unknown_journal_event");
  const data = object(value, ["kind", "recordId", "evidenceId", "originalSessionId", "completedAt", "proof"]);
  text(data.recordId); text(data.evidenceId); requireContract((data.evidenceId as string).startsWith("legacy-"));
  if (data.originalSessionId !== null) text(data.originalSessionId, 200);
  if (data.completedAt !== null) timestamp(data.completedAt);
  requireContract(proof(data.proof).version !== "request-v1", "source_proof_protocol_mismatch");
  return data as unknown as JournalEvent;
}
export function parseJournalEntry(value: unknown): JournalEntry {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "revision", "entryId", "previousHash", "recordedAt", "event", "entryHash"]);
  requireContract(data.schemaVersion === 1); scope(data.uid, data.lifecycleEpoch); integer(data.revision, 1);
  const owner = { uid: data.uid as string, lifecycleEpoch: data.lifecycleEpoch as number };
  requireContract(data.entryId === journalIdentity(owner, data.revision), "journal_identity_mismatch");
  if (data.revision === 1) requireContract(data.previousHash === null); else hash(data.previousHash);
  timestamp(data.recordedAt); const parsed = event(data.event); hash(data.entryHash);
  if (parsed.kind === "session-accepted") requireContract(parsed.receipt.acceptedRevision === data.revision &&
    parsed.receipt.lifecycleEpoch === data.lifecycleEpoch && parsed.receipt.recordedAt === data.recordedAt, "receipt_revision_mismatch");
  const { entryHash, ...body } = data;
  requireContract(entryHash === typedHash("journal-entry-v1", body), "journal_hash_mismatch");
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as JournalEntry;
}
export function createJournalEntry(anchorValue: JournalAnchor, journalEvent: JournalEvent, recordedAt: string): JournalEntry {
  const anchor = parseJournalAnchor(anchorValue), revision = nextRevision(anchor.revision);
  const body = { schemaVersion: 1, uid: anchor.uid, lifecycleEpoch: anchor.lifecycleEpoch, revision,
    entryId: journalIdentity({ uid: anchor.uid, lifecycleEpoch: anchor.lifecycleEpoch }, revision),
    previousHash: anchor.headHash, recordedAt, event: journalEvent };
  return parseJournalEntry({ ...body, entryHash: typedHash("journal-entry-v1", body) });
}
/** Proves a pinned interval, not chronology, authorization, global uniqueness
 * before the anchor, source existence or semantic validity of identity decisions. */
export function verifyJournalContinuity(anchorValue: JournalAnchor, expectedHeadValue: JournalAnchor,
  values: readonly unknown[]) {
  const anchor = parseJournalAnchor(anchorValue), expected = parseJournalAnchor(expectedHeadValue);
  requireContract(anchor.uid === expected.uid && anchor.lifecycleEpoch === expected.lifecycleEpoch && expected.revision >= anchor.revision, "journal_scope_mismatch");
  const entries = values.map(parseJournalEntry).sort((a, b) => compareRevisions(a.revision, b.revision));
  let current = anchor;
  const sessions = new Set<string>(), evidenceIds = new Set<string>(), decisions = new Set<string>(), historical = new Set<string>();
  for (const entry of entries) {
    requireContract(entry.uid === anchor.uid && entry.lifecycleEpoch === anchor.lifecycleEpoch &&
      entry.revision === nextRevision(current.revision) && entry.previousHash === current.headHash, "journal_discontinuity");
    const value = entry.event;
    const [set, key] = value.kind === "session-accepted" ? [sessions, value.receipt.sessionId] :
      value.kind === "identity-decided" ? [decisions, value.decisionId] : [historical, value.recordId];
    requireContract(!set.has(key), "duplicate_journal_event"); set.add(key);
    if (value.kind === "session-accepted") {
      requireContract(!evidenceIds.has(value.receipt.evidenceId), "duplicate_evidence_acceptance"); evidenceIds.add(value.receipt.evidenceId);
    }
    current = { uid: entry.uid, lifecycleEpoch: entry.lifecycleEpoch, revision: entry.revision, headHash: entry.entryHash };
  }
  requireContract(current.revision === expected.revision && current.headHash === expected.headHash, "journal_incomplete");
  return Object.freeze({ head: Object.freeze(current), entries: Object.freeze(entries),
    acceptedSessionIds: Object.freeze([...sessions].sort()), acceptanceUniqueness: "interval-only" as const });
}
