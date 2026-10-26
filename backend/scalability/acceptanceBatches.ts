import { digest } from "../trainingCompletionContract";
import { parseJournalAnchor, parseJournalEntry, verifyJournalContinuity } from "./journal";
import type { JournalEntry, JournalScope } from "./journal";
import type { AccountRevisionControl } from "./controls";
import { parseAcceptanceReceipt } from "./receipts";
import type { CompletionReceiptV2 } from "./receipts";
import { CONTRACT_LIMITS, bounded, canonicalJSON, copyJSON, hash, integer, nextRevision, object, requireContract, typedHash } from "./values";

/** Mutable pointer to an immutable batch, NOT an inventory/publication proof. */
export type AcceptanceCheckpoint = Readonly<{
  schemaVersion: 1; uid: string; lifecycleEpoch: number; ordinal: number;
  batchId: string | null; batchHash: string | null; headRevision: number; headHash: string | null;
}>;
export type AcceptanceBatch = Readonly<{
  schemaVersion: 1; uid: string; lifecycleEpoch: number; ordinal: number; batchId: string;
  previous: AcceptanceCheckpoint; receipt: CompletionReceiptV2; evidenceHash: string;
  firstRevision: number; lastRevision: number; headHash: string; batchHash: string;
}>;
const check = (condition: unknown) => requireContract(condition, "acceptance_checkpoint_invalid");
const same = (left: unknown, right: unknown) => canonicalJSON(left) === canonicalJSON(right);

export function acceptanceBatchIdentity(scope: JournalScope, ordinal: number): string {
  parseJournalAnchor({ uid: scope.uid, lifecycleEpoch: scope.lifecycleEpoch, revision: 0, headHash: null }); integer(ordinal, 1);
  return `batch-${typedHash("stage2-acceptance-batch-id-v1", { uid: scope.uid, lifecycleEpoch: scope.lifecycleEpoch, ordinal })}`;
}
export function parseAcceptanceCheckpoint(value: unknown): AcceptanceCheckpoint {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "ordinal", "batchId", "batchHash", "headRevision", "headHash"]);
  check(data.schemaVersion === 1); integer(data.ordinal);
  parseJournalAnchor({ uid: data.uid, lifecycleEpoch: data.lifecycleEpoch, revision: data.headRevision, headHash: data.headHash });
  if (data.ordinal === 0) check(data.batchId === null && data.batchHash === null && data.headRevision === 0);
  else {
    check(data.batchId === acceptanceBatchIdentity({ uid: data.uid as string, lifecycleEpoch: data.lifecycleEpoch as number }, data.ordinal));
    hash(data.batchHash); check(Number(data.headRevision) > 0);
  }
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as AcceptanceCheckpoint;
}
export function initialAcceptanceCheckpoint(scope: JournalScope): AcceptanceCheckpoint {
  return parseAcceptanceCheckpoint({ schemaVersion: 1, uid: scope.uid, lifecycleEpoch: scope.lifecycleEpoch, ordinal: 0,
    batchId: null, batchHash: null, headRevision: 0, headHash: null });
}
export function parseAcceptanceBatch(value: unknown): AcceptanceBatch {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "ordinal", "batchId", "previous", "receipt",
    "evidenceHash", "firstRevision", "lastRevision", "headHash", "batchHash"]);
  check(data.schemaVersion === 1); integer(data.ordinal, 1);
  const scope = { uid: data.uid as string, lifecycleEpoch: data.lifecycleEpoch as number };
  check(data.batchId === acceptanceBatchIdentity(scope, data.ordinal));
  const previous = parseAcceptanceCheckpoint(data.previous), receipt = parseAcceptanceReceipt(data.receipt);
  check(previous.uid === data.uid && previous.lifecycleEpoch === data.lifecycleEpoch && data.ordinal === nextRevision(previous.ordinal));
  check(receipt.schemaVersion === 2 && receipt.lifecycleEpoch === data.lifecycleEpoch &&
    receipt.evidenceId === `session-${digest(receipt.sessionId)}`);
  integer(data.firstRevision, 1); integer(data.lastRevision, 1); hash(data.evidenceHash); hash(data.headHash); hash(data.batchHash);
  check(data.firstRevision === nextRevision(previous.headRevision) && receipt.schemaVersion === 2 && receipt.acceptedRevision === data.firstRevision &&
    data.lastRevision === nextRevision(Number(data.firstRevision)) + (receipt.mode === "auto" ? 1 : 0));
  const { batchHash, ...body } = data;
  check(batchHash === typedHash("stage2-acceptance-batch-v1", body));
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as AcceptanceBatch;
}
export function checkpointForBatch(value: unknown): AcceptanceCheckpoint {
  const batch = parseAcceptanceBatch(value);
  return parseAcceptanceCheckpoint({ schemaVersion: 1, uid: batch.uid, lifecycleEpoch: batch.lifecycleEpoch,
    ordinal: batch.ordinal, batchId: batch.batchId, batchHash: batch.batchHash, headRevision: batch.lastRevision, headHash: batch.headHash });
}
function batchEntries(values: readonly unknown[]): readonly JournalEntry[] {
  const copied = copyJSON(values);
  requireContract(Array.isArray(copied) && (copied.length === 2 || copied.length === 3), "acceptance_checkpoint_invalid");
  return copied.map(parseJournalEntry);
}
function verifyBatchJournal(batch: AcceptanceBatch, entries: readonly unknown[]): void {
  const prefix = verifyJournalContinuity({ uid: batch.uid, lifecycleEpoch: batch.lifecycleEpoch,
    revision: batch.previous.headRevision, headHash: batch.previous.headHash }, {
    uid: batch.uid, lifecycleEpoch: batch.lifecycleEpoch, revision: batch.lastRevision, headHash: batch.headHash }, batchEntries(entries));
  const [accepted, ...decisions] = prefix.entries;
  check(accepted?.event.kind === "session-accepted" && same(accepted.event.receipt, batch.receipt) && accepted.event.evidenceHash === batch.evidenceHash);
  const kinds = batch.receipt.mode === "auto" ? ["native", "legacy"] : ["native"];
  check(decisions.length === kinds.length);
  decisions.forEach((entry, index) => {
    const event = entry.event;
    check(event.kind === "identity-decided" && event.sourceKind === kinds[index] && event.recordId === batch.receipt.sessionId &&
      event.fromEvidenceId === null && event.toEvidenceId === batch.receipt.evidenceId && event.linkage === "established");
    if (event.kind === "identity-decided") {
      const fingerprint = event.proof.version === "v2" ? `v2:${event.proof.digest}` : event.proof.digest;
      check(event.decisionId === digest({ schemaVersion: 1, sourceKind: event.sourceKind, recordId: event.recordId,
        sourceHash: digest(["training-source-v1", event.sourceKind, event.recordId]), fromEvidenceId: null,
        toEvidenceId: event.toEvidenceId, fingerprint }));
      if (event.sourceKind === "native") check(fingerprint === batch.receipt.requestHash);
      else check(event.proof.version === "v2");
    }
  });
}
/** Pure construction is not authority. Only the isolated authenticated transaction
 * may persist this batch with its journal, source, receipt and checkpoint. */
export function createAcceptanceBatch(previousValue: AcceptanceCheckpoint, entries: readonly JournalEntry[]): AcceptanceBatch {
  const previous = parseAcceptanceCheckpoint(previousValue), checkedEntries = batchEntries(entries), first = checkedEntries[0], last = checkedEntries.at(-1);
  requireContract(first?.event.kind === "session-accepted" && last !== undefined, "acceptance_checkpoint_invalid");
  const ordinal = nextRevision(previous.ordinal);
  const body = { schemaVersion: 1, uid: previous.uid, lifecycleEpoch: previous.lifecycleEpoch, ordinal,
    batchId: acceptanceBatchIdentity(previous, ordinal), previous, receipt: first.event.receipt, evidenceHash: first.event.evidenceHash,
    firstRevision: first.revision, lastRevision: last.revision, headHash: last.entryHash };
  const batch = parseAcceptanceBatch({ ...body, batchHash: typedHash("stage2-acceptance-batch-v1", body) });
  verifyBatchJournal(batch, checkedEntries); return batch;
}
/** Bounded tail validation, NOT complete prefix verification. The pointer is
 * checked against stored immutable batches, never reconstructed from control. */
export function verifyAcceptanceCheckpoint(control: AccountRevisionControl, checkpointValue: unknown,
  batchValue?: unknown, entries: readonly unknown[] = [], predecessorValue?: unknown): AcceptanceCheckpoint {
  const checkpoint = parseAcceptanceCheckpoint(checkpointValue);
  check(checkpoint.uid === control.uid && checkpoint.lifecycleEpoch === control.lifecycleEpoch &&
    checkpoint.ordinal === control.nativeAcceptedCount && checkpoint.headRevision === control.headRevision && checkpoint.headHash === control.headHash);
  if (checkpoint.ordinal === 0) {
    check(batchValue === undefined && predecessorValue === undefined && entries.length === 0); return checkpoint;
  }
  const batch = parseAcceptanceBatch(batchValue);
  check(same(checkpointForBatch(batch), checkpoint)); verifyBatchJournal(batch, entries);
  if (batch.previous.ordinal > 0) check(same(checkpointForBatch(predecessorValue), batch.previous));
  else check(predecessorValue === undefined);
  return checkpoint;
}
