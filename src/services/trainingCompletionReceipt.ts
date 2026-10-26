import type { AcceptanceReceipt } from "../../backend/scalability/receipts";
import { CompletionOutboxError } from "./trainingCompletionOutbox";
export type ClientCompletionReceipt = AcceptanceReceipt;
export type CompletionTarget = "v1" | "protected-v2";

/** Browser-safe version validation. No Node/scalability runtime is imported.
 * A v2 acceptance revision is never converted to a published profile revision. */
export function validateClientCompletionReceipt(value: unknown, expected: {
  sessionId: string; mode: "auto" | "manual"; evidenceId: string; requestHash: string;
}, target: CompletionTarget): ClientCompletionReceipt {
  const invalid = () => { throw new CompletionOutboxError("invalid_completion_receipt",
    "The server acknowledgment was invalid. Completed work was retained for safe retry."); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== "string" || !("value" in descriptors[key]))) return invalid();
  const d = value as Record<string, unknown>;
  const version = target === "v1" ? 1 : 2;
  const fields = ["schemaVersion", "status", "sessionId", "mode", "evidenceId", "requestHash", "recordedAt", "legacyAssessmentId", "legacyProfileUpdated",
    ...(version === 1 ? ["profileRevision"] : ["lifecycleEpoch", "acceptedRevision"])];
  if (Reflect.ownKeys(value).length !== fields.length || fields.some(key => !Object.hasOwn(descriptors, key)) ||
    d.schemaVersion !== version || d.status !== (version === 1 ? "completed" : "accepted") ||
    Object.entries(expected).some(([key, item]) => d[key] !== item) ||
    typeof d.recordedAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/.test(d.recordedAt) || !Number.isFinite(Date.parse(d.recordedAt)) ||
    d.legacyAssessmentId !== (expected.mode === "auto" ? expected.sessionId : null) || typeof d.legacyProfileUpdated !== "boolean" ||
    expected.mode === "manual" && d.legacyProfileUpdated !== false) return invalid();
  const positive = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 1;
  if (version === 1 ? !positive(d.profileRevision) : !positive(d.lifecycleEpoch) || !positive(d.acceptedRevision)) return invalid();
  return structuredClone(value) as ClientCompletionReceipt;
}
