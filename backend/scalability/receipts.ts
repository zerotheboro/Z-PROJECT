import type { CompletionReceipt } from "../trainingCompletion";
import { CONTRACT_LIMITS, bounded, hash, integer, object, requireContract, text, timestamp } from "./values";

// Type-only legacy dependency: the active endpoint and outbox are NOT changed.
export type CompletionReceiptV1 = Readonly<CompletionReceipt>;
export type CompletionReceiptV2 = Readonly<{
  schemaVersion: 2; status: "accepted"; sessionId: string; mode: "auto" | "manual";
  evidenceId: string; requestHash: string; lifecycleEpoch: number; acceptedRevision: number;
  recordedAt: string; legacyAssessmentId: string | null; legacyProfileUpdated: boolean;
}>;
export type AcceptanceReceipt = CompletionReceiptV1 | CompletionReceiptV2;
const common = ["schemaVersion", "status", "sessionId", "mode", "evidenceId", "requestHash", "recordedAt", "legacyAssessmentId", "legacyProfileUpdated"];

/** Validate without converting versions, normalizing bytes or freezing caller
 * objects. In particular v1.profileRevision is NOT an acceptance revision. */
export function parseAcceptanceReceipt(value: unknown): AcceptanceReceipt {
  const version = Object.getOwnPropertyDescriptor(value ?? {}, "schemaVersion")?.value;
  requireContract(version === 1 || version === 2, "unsupported_receipt_version");
  const data = object(value, [...common, ...(version === 1 ? ["profileRevision"] : ["lifecycleEpoch", "acceptedRevision"])]);
  text(data.sessionId, 200); text(data.evidenceId); hash(data.requestHash); timestamp(data.recordedAt);
  requireContract(data.mode === "auto" || data.mode === "manual");
  requireContract(typeof data.legacyProfileUpdated === "boolean" &&
    data.legacyAssessmentId === (data.mode === "auto" ? data.sessionId : null) &&
    (data.mode !== "manual" || data.legacyProfileUpdated === false), "invalid_legacy_receipt");
  if (version === 1) { requireContract(data.status === "completed"); integer(data.profileRevision, 1); }
  else { requireContract(data.status === "accepted"); integer(data.lifecycleEpoch, 1); integer(data.acceptedRevision, 1); }
  return bounded(data, CONTRACT_LIMITS.recordBytes) as unknown as AcceptanceReceipt;
}
export function requireIdenticalReceipt(value: unknown, expected: {
  sessionId: string; mode: "auto" | "manual"; evidenceId: string; requestHash: string;
}): AcceptanceReceipt {
  const receipt = parseAcceptanceReceipt(value);
  requireContract(receipt.sessionId === expected.sessionId && receipt.mode === expected.mode &&
    receipt.evidenceId === expected.evidenceId && receipt.requestHash === expected.requestHash, "completion_conflict");
  return receipt;
}
