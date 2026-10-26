import type { CompletionRequest } from "../../backend/trainingCompletionContract";
import type { ClientCompletionReceipt, CompletionTarget } from "./trainingCompletionReceipt";

export type CompletionEntry = {
  schemaVersion: 1;
  uid: string;
  sessionId: string;
  payloadJSON: string;
  frozenAt: string;
  timeZone: string;
  receipt: ClientCompletionReceipt | null;
  // Absent on original v1 entries. Never reroute an existing protected payload.
  target?: CompletionTarget;
  activityDone: boolean;
  finalized: boolean;
  lease: { token: string; until: number } | null;
  // Optional additions to v1. Older entries were created only AFTER a verified
  // reservation and therefore default to verified, without rewriting them.
  reservationStatus?: "pending" | "verified" | "legacy";
  legacySaved?: boolean;
  draftJSON?: string;
};

function assertEntry(entry: CompletionEntry, uid: string, sessionId = entry.sessionId): void {
  let payload: Partial<CompletionRequest>;
  try { payload = JSON.parse(entry.payloadJSON) as Partial<CompletionRequest>; }
  catch { throw new CompletionOutboxError("outbox_invalid", "Stored completion needs recovery; it was not replaced or deleted."); }
  if (entry.schemaVersion !== 1 || entry.uid !== uid || entry.sessionId !== sessionId || payload.sessionId !== sessionId ||
    !["auto", "manual"].includes(payload.mode ?? "") || typeof entry.activityDone !== "boolean" || typeof entry.finalized !== "boolean" ||
    !Number.isFinite(Date.parse(entry.frozenAt)) || typeof entry.timeZone !== "string" ||
    entry.receipt === undefined || entry.receipt !== null && typeof entry.receipt !== "object" ||
    entry.target !== undefined && entry.target !== "v1" && entry.target !== "protected-v2" ||
    entry.reservationStatus !== undefined && !["pending", "verified", "legacy"].includes(entry.reservationStatus) ||
    entry.legacySaved !== undefined && typeof entry.legacySaved !== "boolean" ||
    entry.draftJSON !== undefined && typeof entry.draftJSON !== "string" ||
    entry.lease !== null && (!entry.lease || typeof entry.lease.token !== "string" || !Number.isFinite(entry.lease.until))) {
    throw new CompletionOutboxError("outbox_invalid", "Stored completion needs recovery; it was not replaced or deleted.");
  }
}

export class CompletionOutboxError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export const canonicalCompletionJSON = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalCompletionJSON).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalCompletionJSON(item)}`).join(",")}}`;
  const result = JSON.stringify(value);
  if (result === undefined) throw new CompletionOutboxError("invalid_payload", "Completed work is not serializable.");
  return result;
};

export function completionPayloadJSON(payload: CompletionRequest): string {
  const text = canonicalCompletionJSON(payload);
  if (new TextEncoder().encode(text).length > 64 * 1024) {
    throw new CompletionOutboxError("completion_too_large", "Completed work exceeds the submission limit. Keep this training draft and contact support.");
  }
  return text;
}

/** Separate local-development DB. Compound keys and atomic transactions prevent
 * another tab from replacing the first frozen payload. No tokens are stored. */
export function createCompletionOutbox(projectId: string, factory: IDBFactory | undefined = globalThis.indexedDB) {
  if (!/^demo-[a-z0-9-]+$/.test(projectId)) throw new Error("Demo outbox project required.");
  let connection: Promise<IDBDatabase> | undefined;
  const unavailable = () => new CompletionOutboxError("outbox_storage_failed",
    "Completion recovery could not be updated durably in this browser. Keep the draft, free storage and retry the same session; an unacknowledged request may already have been saved.");
  function open(): Promise<IDBDatabase> {
    if (!factory) return Promise.reject(unavailable());
    if (connection) return connection;
    const pending = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try { request = factory.open(`edulience.training-completion.local.v1.${projectId}`, 1); }
      catch { reject(unavailable()); return; }
      request.onupgradeneeded = () => request.result.createObjectStore("completions", { keyPath: ["uid", "sessionId"] });
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
      request.onerror = () => { connection = undefined; reject(unavailable()); };
      request.onblocked = () => { connection = undefined; reject(unavailable()); };
    });
    connection = pending;
    void pending.catch(() => { if (connection === pending) connection = undefined; });
    return pending;
  }
  async function change<T>(uid: string, sessionId: string, edit: (entry: CompletionEntry | undefined) => { entry?: CompletionEntry; result: T }): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
      // Completion is durable only after the readwrite transaction commits.
      const tx = db.transaction("completions", "readwrite", { durability: "strict" });
      const store = tx.objectStore("completions");
      const read = store.get([uid, sessionId]);
      let result: T, failure: unknown;
      read.onsuccess = () => {
        try {
          const current = read.result as CompletionEntry | undefined;
          if (current) assertEntry(current, uid, sessionId);
          const update = edit(current); result = update.result;
          if (update.entry) store.put(update.entry);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(failure ?? unavailable());
    });
  }
  return {
    async freeze(uid: string, payload: CompletionRequest, timeZone: string, frozenAt = new Date().toISOString(), draftJSON?: string,
      target: CompletionTarget = "v1"): Promise<CompletionEntry> {
      if (target !== "v1" && target !== "protected-v2") throw new CompletionOutboxError("completion_target_invalid", "Unknown completion protocol; completed work was not submitted.");
      if (draftJSON !== undefined && new TextEncoder().encode(draftJSON).length > 1024 * 1024) {
        throw new CompletionOutboxError("completion_checkpoint_too_large", "The browser completion checkpoint exceeds 1 MiB. It is not safely saved; keep this page open and preserve your draft.");
      }
      const capturedPayload = structuredClone(payload);
      completionPayloadJSON(capturedPayload);
      return change(uid, payload.sessionId, current => {
        // Resolve simultaneous checkpoint attempts atomically. The first actual
        // completion timestamp wins; all other result fields must still match.
        const payloadJSON = completionPayloadJSON(current && draftJSON !== undefined
          ? { ...capturedPayload, completedAt: JSON.parse(current.payloadJSON).completedAt ?? null }
          : capturedPayload);
        if (current && (current.payloadJSON !== payloadJSON || (current.target ?? "v1") !== target)) throw new CompletionOutboxError("outbox_conflict",
          "Another tab already froze different completed work for this session. The original was preserved; do not start a replacement submission.");
        const entry: CompletionEntry = current ?? { schemaVersion: 1, uid, sessionId: payload.sessionId, payloadJSON,
          timeZone, frozenAt, receipt: null, activityDone: false, finalized: false, lease: null,
          ...(target === "protected-v2" ? { target } : {}),
          ...(draftJSON === undefined ? {} : { draftJSON, reservationStatus: "pending" as const, legacySaved: false }) };
        return { entry, result: entry };
      });
    },
    get: (uid: string, sessionId: string) => change(uid, sessionId, entry => ({ result: entry ?? null })),
    async list(uid: string): Promise<CompletionEntry[]> {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("completions", "readonly");
        const request = tx.objectStore("completions").getAll(IDBKeyRange.bound([uid, ""], [uid, "\uffff"]));
        request.onsuccess = () => {
          try { const entries = request.result as CompletionEntry[]; entries.forEach(entry => assertEntry(entry, uid)); resolve(entries.filter(item => !item.finalized)); }
          catch (error) { reject(error); }
        };
        request.onerror = () => reject(unavailable());
      });
    },
    claim: (uid: string, sessionId: string, token: string, now = Date.now()) => change(uid, sessionId, entry => {
      if (!entry) throw new CompletionOutboxError("outbox_missing", "The durable completion is unavailable. Keep your draft.");
      if (entry.lease && entry.lease.until > now && entry.lease.token !== token) throw new CompletionOutboxError("completion_busy", "Another tab is saving this completion. Retry shortly.");
      const next = { ...entry, lease: { token, until: now + 60_000 } };
      return { entry: next, result: next };
    }),
    update: (uid: string, sessionId: string, token: string, update: Partial<Pick<CompletionEntry, "receipt" | "activityDone" | "finalized" | "reservationStatus" | "legacySaved">>) => change(uid, sessionId, entry => {
      if (!entry || entry.lease?.token !== token) throw new CompletionOutboxError("completion_busy", "Completion recovery moved to another tab. Retry safely.");
      if (Object.keys(update).some(key => !["receipt", "activityDone", "finalized", "reservationStatus", "legacySaved"].includes(key)) ||
        update.reservationStatus !== undefined && !["pending", "verified", "legacy"].includes(update.reservationStatus) ||
        update.reservationStatus !== undefined && (entry.reservationStatus ?? "verified") !== "pending" && update.reservationStatus !== (entry.reservationStatus ?? "verified") ||
        entry.legacySaved && update.legacySaved === false ||
        entry.receipt && update.receipt !== undefined && canonicalCompletionJSON(entry.receipt) !== canonicalCompletionJSON(update.receipt) ||
        entry.activityDone && update.activityDone === false || entry.finalized && update.finalized === false) {
        throw new CompletionOutboxError("outbox_conflict", "The original payload and completion checkpoints cannot be replaced. Saved work was retained.");
      }
      const next = { ...entry, ...update };
      if (next.legacySaved && next.reservationStatus !== "legacy" ||
        next.activityDone && !next.receipt && !next.legacySaved || next.finalized && !next.activityDone) throw new CompletionOutboxError("outbox_conflict", "Completion checkpoints are inconsistent; saved work was retained.");
      return { entry: next, result: next };
    }),
    release: (uid: string, sessionId: string, token: string) => change(uid, sessionId, entry => ({
      entry: entry?.lease?.token === token ? { ...entry, lease: null } : undefined, result: undefined
    })),
    async close() { if (connection) (await connection).close(); connection = undefined; }
  };
}

export type CompletionOutbox = ReturnType<typeof createCompletionOutbox>;
