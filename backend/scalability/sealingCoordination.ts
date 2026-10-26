import type { Transaction } from "firebase-admin/firestore";
import { assertStage2Environment } from "./acceptanceTransport";
import { assertWriterGuardContext, assertCurrentWriterResult } from "./writerGuard";
import type { SharedWriterGuard } from "./writerGuard";
import { SEAL_COLLECTION, SEAL_PARTICIPANTS, parseSealControl } from "./sealingContracts";
import { nextRevision, requireContract } from "./values";
const attempts = new WeakMap<object, Transaction>();

/** Persisted enrollment, never a process flag, selects coordinated accounts. This helper
 * grants NO authority and accepts only the live facade already checked by 4C.
 * Call during the read phase; queue the proposed control update with source writes
 * AFTER all reads. A seal cannot interleave between this read and that commit. */
export async function readSealParticipant(tx: Transaction, protection: Awaited<ReturnType<SharedWriterGuard["read"]>>, participant: typeof SEAL_PARTICIPANTS[number]) {
  assertStage2Environment();
  requireContract(SEAL_PARTICIPANTS.some(p => p === participant), "seal_participant_unknown");
  assertCurrentWriterResult(protection, tx); const context = protection.context;
  const ref = protection.root.ref.firestore.doc(`${SEAL_COLLECTION}/${context.uid}`), saved = await tx.get(ref);
  // Reading absence in this transaction also conflicts with concurrent enrollment.
  // A persisted control on a downgraded/reused legacy root must fail its context
  // check; it cannot be skipped just because the current root looks unenrolled.
  if (!saved.exists) return null;
  const control = parseSealControl(saved.data()); assertWriterGuardContext(context, control.context);
  requireContract(control.phase === "open" || control.phase === "sealed", "seal_writer_blocked");
  const next = parseSealControl({ ...control, revision: nextRevision(control.revision), sourceRevision: nextRevision(control.sourceRevision),
    phase: "open", sealId: null });
  const result = Object.freeze({ ref, control, next }); attempts.set(result, tx); return result;
}
export function queueSealParticipant(tx: Transaction, result: Awaited<ReturnType<typeof readSealParticipant>>) {
  if (result === null) return;
  requireContract(attempts.get(result) === tx, "seal_writer_attempt_invalid");
  attempts.delete(result); tx.set(result.ref, { ...result.next });
}
