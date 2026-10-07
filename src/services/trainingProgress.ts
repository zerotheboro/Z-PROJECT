import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

import {
  getGuestDraftStorageKey,
  getUserRecoveryStorageKey,
  validateTrainingDraft
} from "../quiz/trainingProgress";

import type {
  DraftValidation,
  TrainingDraft,
  TrainingDraftOwner
} from "../quiz/trainingProgress";
import {
  decodeFirestoreTrainingDraft,
  encodeFirestoreTrainingDraft
} from "./trainingDraftFirestoreCodec";

export const TRAINING_DRAFT_CLOUD_PATH =
  "users/{uid}/trainingProgress/active";

export class TrainingDraftConflictError extends Error {
  constructor() {
    super(
      "This training session was replaced in another tab or device."
    );
    this.name = "TrainingDraftConflictError";
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.localStorage;
  } catch {
    return null;
  }
}

function safeSerializableDraft(
  draft: TrainingDraft
): TrainingDraft {
  return JSON.parse(
    JSON.stringify(draft)
  ) as TrainingDraft;
}

function cloudApplicationDraft(
  value: Record<string, unknown>
): unknown {
  const {
    cloudUpdatedAt: _cloudUpdatedAt,
    ...storedDraft
  } = value;

  return decodeFirestoreTrainingDraft(storedDraft);
}

export function readLocalTrainingDraft(
  owner: TrainingDraftOwner
): DraftValidation | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = owner.kind === "guest"
      ? storage.getItem(getGuestDraftStorageKey())
      : (() => {
          const sessionId = storage.getItem(
            getUserRecoveryStorageKey(owner.uid)
          );

          return sessionId
            ? storage.getItem(
                getUserRecoveryStorageKey(
                  owner.uid,
                  sessionId
                )
              )
            : null;
        })();
    if (!raw) {
      return null;
    }

    return validateTrainingDraft(
      JSON.parse(raw) as unknown,
      owner
    );
  } catch {
    return {
      valid: false,
      reason: "The browser recovery copy is corrupted."
    };
  }
}

export function writeLocalTrainingDraft(
  draft: TrainingDraft
): void {
  const storage = getStorage();
  if (!storage) {
    throw new Error("Browser storage is unavailable.");
  }

  const serialized = JSON.stringify(
    safeSerializableDraft(draft)
  );

  if (draft.owner.kind === "guest") {
    storage.setItem(
      getGuestDraftStorageKey(),
      serialized
    );
    return;
  }

  const pointerKey = getUserRecoveryStorageKey(
    draft.owner.uid
  );
  const previousSessionId =
    storage.getItem(pointerKey);
  const recoveryKey = getUserRecoveryStorageKey(
    draft.owner.uid,
    draft.sessionId
  );

  storage.setItem(recoveryKey, serialized);
  storage.setItem(pointerKey, draft.sessionId);

  if (
    previousSessionId &&
    previousSessionId !== draft.sessionId
  ) {
    storage.removeItem(
      getUserRecoveryStorageKey(
        draft.owner.uid,
        previousSessionId
      )
    );
  }
}

export function deleteLocalTrainingDraft(
  owner: TrainingDraftOwner,
  expectedSessionId?: string
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (expectedSessionId) {
    const current = readLocalTrainingDraft(owner);
    if (
      current?.valid &&
      current.draft.sessionId !== expectedSessionId
    ) {
      return;
    }
  }

  if (owner.kind === "guest") {
    storage.removeItem(getGuestDraftStorageKey());
    return;
  }

  const pointerKey = getUserRecoveryStorageKey(
    owner.uid
  );
  const currentSessionId =
    storage.getItem(pointerKey);

  if (currentSessionId) {
    storage.removeItem(
      getUserRecoveryStorageKey(
        owner.uid,
        currentSessionId
      )
    );
  }
  storage.removeItem(pointerKey);
}

function cloudRef(uid: string) {
  return doc(
    db,
    "users",
    uid,
    "trainingProgress",
    "active"
  );
}

export async function loadTrainingDraft(
  owner: TrainingDraftOwner
): Promise<DraftValidation | null> {
  if (owner.kind === "guest") {
    return readLocalTrainingDraft(owner);
  }

  try {
    const snapshot = await getDoc(
      cloudRef(owner.uid)
    );

    if (snapshot.exists()) {
      return validateTrainingDraft(
        cloudApplicationDraft(snapshot.data()),
        owner
      );
    }
  } catch {
    // The recovery copy is intentionally used only when cloud loading fails.
  }

  return readLocalTrainingDraft(owner);
}

export async function saveTrainingDraft(
  draft: TrainingDraft,
  options: {
    allowCreate?: boolean;
  } = {}
): Promise<void> {
  const serializable = safeSerializableDraft(draft);

  try {
    writeLocalTrainingDraft(serializable);
  } catch (error) {
    if (draft.owner.kind === "guest") {
      throw error;
    }
  }

  if (draft.owner.kind === "guest") {
    return;
  }

  const reference = cloudRef(draft.owner.uid);
  const cloudDraft = encodeFirestoreTrainingDraft(
    serializable
  ) as Record<string, unknown>;

  try {
    await runTransaction(db, async transaction => {
      const current = await transaction.get(reference);

      if (current.exists()) {
        const activeSessionId =
          current.data().sessionId;

        if (activeSessionId !== draft.sessionId) {
          throw new TrainingDraftConflictError();
        }
      } else if (!options.allowCreate) {
        throw new TrainingDraftConflictError();
      }

      transaction.set(reference, {
        ...cloudDraft,
        cloudUpdatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    if (error instanceof TrainingDraftConflictError) {
      deleteLocalTrainingDraft(
        draft.owner,
        draft.sessionId
      );
    }
    throw error;
  }
}

export async function discardTrainingDraft(
  owner: TrainingDraftOwner,
  sessionId: string
): Promise<void> {
  if (owner.kind === "user") {
    const reference = cloudRef(owner.uid);

    await runTransaction(db, async transaction => {
      const current = await transaction.get(reference);

      if (
        current.exists() &&
        current.data().sessionId === sessionId
      ) {
        transaction.delete(reference);
      }
    });
  }

  deleteLocalTrainingDraft(owner, sessionId);
}

export async function forceDiscardTrainingDraft(
  owner: TrainingDraftOwner
): Promise<void> {
  if (owner.kind === "user") {
    await deleteDoc(cloudRef(owner.uid));
  }

  deleteLocalTrainingDraft(owner);
}
