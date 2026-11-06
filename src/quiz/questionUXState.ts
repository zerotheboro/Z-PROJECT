import type { TrainingDraftOwner } from "./trainingProgress";

/** Display-only metadata. Never part of Training drafts, evidence or scoring. */
export function questionUXStorageKey(owner: TrainingDraftOwner, sessionId: string) {
  return `edulience.training-question-ux.v1.${encodeURIComponent(owner.kind === "user" ? `user:${owner.uid}` : "guest")}.${encodeURIComponent(sessionId)}`;
}

function browserStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

function validValue(value: unknown): boolean {
  return typeof value === "boolean" || Array.isArray(value) && value.length <= 8
    && value.every(item => typeof item === "string" && item.length <= 160);
}

export function createQuestionUXState(storageKey?: string, storage = browserStorage()) {
  const records = new Map<string, unknown>();
  if (storageKey && storage) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey) ?? "null");
      if (saved?.version === 1 && saved.key === storageKey && Array.isArray(saved.records) && saved.records.length <= 500) {
        for (const entry of saved.records) {
          if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && entry[0].length <= 800 && validValue(entry[1])) {
            records.set(entry[0], entry[1]);
          }
        }
      }
    } catch { /* A missing/invalid display cache never invalidates a saved draft. */ }
  }
  const identity = (scope: string, record: string, item: string) => JSON.stringify([scope, record, item]);
  return {
    get(scope: string, record: string, item: string) { return records.get(identity(scope, record, item)); },
    set(scope: string, record: string, item: string, value: unknown) {
      const id = identity(scope, record, item);
      if (id.length > 800 || !validValue(value) || !records.has(id) && records.size >= 500) return;
      records.set(id, value);
      if (storageKey && storage) {
        try { storage.setItem(storageKey, JSON.stringify({ version: 1, key: storageKey, records: [...records] })); }
        catch { /* Progress stays usable in memory if optional browser storage is full. */ }
      }
    },
    clear() { records.clear(); if (storageKey) { try { storage?.removeItem(storageKey); } catch { /* Optional cache only. */ } } }
  };
}
