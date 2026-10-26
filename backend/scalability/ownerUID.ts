import { requireContract, text } from "./values";

/** Isolated Training owner identity: retain exact text, never normalize it.
 * Firebase Admin's UID bound is 128 UTF-16 code units. The existing journal and
 * evidence contracts budget 512 UTF-8 bytes. Additionally require one supported
 * Firestore document-ID segment; unsupported Auth identities fail before writes.
 * Generic string limits and existing identity/hash encodings are unchanged. */
export function trainingOwnerUID(value: unknown): asserts value is string {
  text(value, 512); // Also rejects malformed UTF-16 and whitespace-only identities.
  requireContract(value.length <= 128 && !value.includes("/") && value !== "." && value !== ".." &&
    !(value.length >= 4 && value.startsWith("__") && value.endsWith("__")), "invalid_training_owner");
}
