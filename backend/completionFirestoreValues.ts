import { DocumentReference, GeoPoint, Timestamp } from "firebase-admin/firestore";
import { CompletionError, digest } from "./trainingCompletionContract";

export const SOURCE_FINGERPRINT_VERSION = "v2";
export const FIRESTORE_DOCUMENT_BYTES = 1024 * 1024;
type Representation = { tagged: unknown; json: unknown; storage: number };
const utf8 = (value: string) => Buffer.byteLength(value, "utf8");
const nameBytes = (path: string) => 16 + path.split("/").reduce((sum, part) => sum + utf8(part) + 1, 0);
const invalid = (): never => { throw new CompletionError(503, "completion_history_invalid"); };

// All containers are tagged, not just Timestamp. A map/array cannot impersonate
// any scalar encoding. Date and Timestamp intentionally share a representation:
// Firestore persists a Date as a Timestamp. No untrusted toJSON/toProto is called.
function represent(value: unknown, depth = 0, document = false): Representation {
  if (value === null) return { tagged: ["null"], json: null, storage: 1 };
  if (typeof value === "string") return { tagged: ["string", value], json: value, storage: utf8(value) + 1 };
  if (typeof value === "boolean") return { tagged: ["boolean", value], json: value, storage: 1 };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return invalid();
    return { tagged: ["number", Object.is(value, -0) ? "-0" : value], json: value, storage: 8 };
  }
  if (value instanceof Date || value instanceof Timestamp) {
    const time = value instanceof Timestamp ? value : Timestamp.fromDate(value);
    return { tagged: ["timestamp", time.seconds, time.nanoseconds],
      json: { timestampSeconds: time.seconds, timestampNanos: time.nanoseconds }, storage: 8 };
  }
  if (value instanceof Uint8Array) {
    const bytes = Buffer.from(value).toString("base64");
    return { tagged: ["bytes", bytes], json: { bytes }, storage: value.byteLength };
  }
  if (value instanceof GeoPoint) return { tagged: ["geopoint", value.latitude, value.longitude],
    json: { latitude: value.latitude, longitude: value.longitude }, storage: 16 };
  if (value instanceof DocumentReference) {
    const project = (value.firestore as unknown as { projectId?: unknown }).projectId;
    if (typeof project !== "string") return invalid();
    return { tagged: ["reference", project, value.firestore.databaseId, value.path],
      json: { referenceProject: project, referenceDatabase: value.firestore.databaseId, referencePath: value.path }, storage: nameBytes(value.path) };
  }
  if (depth > (document ? 20 : 24)) return invalid();
  if (Array.isArray(value)) {
    if (document && value.some(Array.isArray)) return invalid();
    const entries = value.map(item => represent(item, depth + 1, document));
    return { tagged: ["array", entries.map(item => item.tagged)], json: entries.map(item => item.json),
      storage: entries.reduce((sum, item) => sum + item.storage, 0) };
  }
  if (typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return invalid();
  const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => {
    const result = represent(item, depth + 1, document);
    if (document && (utf8(key) > 1500 || result.storage > FIRESTORE_DOCUMENT_BYTES - 89)) {
      throw new CompletionError(409, "completion_document_limit");
    }
    return { key, ...result };
  });
  return { tagged: ["map", entries.map(item => [item.key, item.tagged])],
    json: Object.fromEntries(entries.map(item => [item.key, item.json])),
    storage: 32 + entries.reduce((sum, item) => sum + utf8(item.key) + 1 + item.storage, 0) };
}

export function fingerprintFirestoreSource(value: unknown): string {
  return `${SOURCE_FINGERPRINT_VERSION}:${digest(["firestore-source", SOURCE_FINGERPRINT_VERSION, represent(value).tagged])}`;
}

// Logical JSON preparation budget includes UTF-8 and JSON escaping, independently
// of fingerprint encoding. Firestore document storage is checked separately using
// https://firebase.google.com/docs/firestore/storage-size (including name/32 bytes).
export function completionHistoryJSONBytes(value: unknown): number {
  return utf8(JSON.stringify(represent(value).json));
}
export function completionDocumentBytes(path: string, data: unknown): number {
  return nameBytes(path) + represent(data, 0, true).storage;
}
export function assertCompletionDocumentBudget(path: string, data: unknown): number {
  const bytes = completionDocumentBytes(path, data);
  if (nameBytes(path) > 6 * 1024 || bytes > FIRESTORE_DOCUMENT_BYTES) throw new CompletionError(409, "completion_document_limit");
  return bytes;
}
