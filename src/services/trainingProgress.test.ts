// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const firestore = vi.hoisted(() => ({
  activeSessionId: null as string | null,
  delete: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  set: vi.fn(),
  runTransaction: vi.fn()
}));

vi.mock("firebase/firestore", () => ({
  deleteDoc: firestore.deleteDoc,
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  runTransaction: firestore.runTransaction,
  serverTimestamp: firestore.serverTimestamp
}));

vi.mock("../firebase", () => ({
  db: { name: "test-db" }
}));

import {
  discardTrainingDraft,
  readLocalTrainingDraft,
  saveTrainingDraft,
  TrainingDraftConflictError
} from "./trainingProgress";
import {
  createTrainingDraft
} from "../quiz/trainingProgress";

describe("cloud training draft safety", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) =>
          values.get(key) ?? null,
        removeItem: (key: string) =>
          values.delete(key),
        setItem: (key: string, value: string) =>
          values.set(key, value)
      }
    });

    firestore.activeSessionId = null;
    firestore.doc.mockReturnValue("active-draft-ref");
    firestore.serverTimestamp.mockReturnValue(
      "server-time"
    );
    firestore.runTransaction.mockImplementation(
      async (_db, callback) => callback({
        get: vi.fn().mockResolvedValue({
          exists: () =>
            firestore.activeSessionId !== null,
          data: () => ({
            sessionId: firestore.activeSessionId
          })
        }),
        set: firestore.set,
        delete: firestore.delete
      })
    );
  });

  it("writes only the authenticated user's active draft path", async () => {
    const draft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });

    await saveTrainingDraft(draft, {
      allowCreate: true
    });

    expect(firestore.doc).toHaveBeenCalledWith(
      { name: "test-db" },
      "users",
      "user-a",
      "trainingProgress",
      "active"
    );
    expect(firestore.set).toHaveBeenCalledWith(
      "active-draft-ref",
      expect.objectContaining({
        sessionId: draft.sessionId,
        owner: {
          kind: "user",
          uid: "user-a"
        }
      })
    );
  });

  it("rejects stale saves and removes their local recovery copy", async () => {
    const draft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });
    firestore.activeSessionId = "newer-session";

    await expect(
      saveTrainingDraft(draft)
    ).rejects.toBeInstanceOf(
      TrainingDraftConflictError
    );

    expect(firestore.set).not.toHaveBeenCalled();
    expect(readLocalTrainingDraft(draft.owner))
      .toBeNull();
  });

  it("deletes only a matching active session", async () => {
    const owner = {
      kind: "user",
      uid: "user-a"
    } as const;
    firestore.activeSessionId = "replacement";

    await discardTrainingDraft(owner, "older-session");
    expect(firestore.delete).not.toHaveBeenCalled();

    await discardTrainingDraft(owner, "replacement");
    expect(firestore.doc).toHaveBeenCalledWith(
      { name: "test-db" },
      "users",
      "user-a",
      "trainingProgress",
      "active"
    );
    expect(firestore.delete).toHaveBeenCalledWith(
      "active-draft-ref"
    );
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
  });
});
