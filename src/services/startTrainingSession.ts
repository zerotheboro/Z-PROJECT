import type {
  User
} from "firebase/auth";

import {
  createSessionId,
  createTrainingDraft
} from "../quiz/trainingProgress";
import type {
  TrainingDraft,
  TrainingDraftOwner,
  TrainingMode
} from "../quiz/trainingProgress";
import type {
  TrainingMethodId
} from "../quiz/type";
import {
  reserveTrainingAccess
} from "./trainingAccess";
import {
  readLocalTrainingDraft,
  saveTrainingDraft
} from "./trainingProgress";

export async function startTrainingSession({
  user,
  owner,
  mode,
  methodIds,
  sessionId = createSessionId()
}: {
  user: User | null;
  owner: TrainingDraftOwner;
  mode: TrainingMode;
  methodIds: TrainingMethodId[];
  sessionId?: string;
}): Promise<TrainingDraft> {
  await reserveTrainingAccess(user, {
    sessionId,
    mode,
    methodIds
  });

  const draft = createTrainingDraft({
    owner,
    mode,
    selectedMethods: methodIds,
    sessionId
  });

  try {
    await saveTrainingDraft(draft, {
      allowCreate: true
    });
  } catch (error) {
    const recovery = readLocalTrainingDraft(owner);
    if (
      !recovery?.valid ||
      recovery.draft.sessionId !== sessionId
    ) {
      throw error;
    }
  }

  return draft;
}
