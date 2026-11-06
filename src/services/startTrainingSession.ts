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
import { ECONOMICS_ACTIVITY_VERSION } from "../quiz/economics9708/runtime";
import {
  readLocalTrainingDraft,
  saveTrainingDraft
} from "./trainingProgress";

export async function startTrainingSession({
  user,
  owner,
  mode,
  methodIds,
  sessionId = createSessionId(),
  economicsTopicId
}: {
  user: User | null;
  owner: TrainingDraftOwner;
  mode: TrainingMode;
  methodIds: TrainingMethodId[];
  sessionId?: string;
  economicsTopicId?: string;
}): Promise<TrainingDraft> {
  // Reject unavailable topics before reserving any existing Training allowance.
  const draft = createTrainingDraft({ owner, mode, selectedMethods: methodIds, sessionId, economicsTopicId,
    ...(economicsTopicId ? { economicsActivityVersion: ECONOMICS_ACTIVITY_VERSION } : {}) });
  await reserveTrainingAccess(user, {
    sessionId,
    mode,
    methodIds
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

  if (import.meta.env.DEV && import.meta.env.VITE_ECONOMICS_PROGRESS_PILOT === "memory-only") {
    // Optional local instrumentation must never change reservation/save outcomes.
    try {
      const { prepareProgressPilot } = await import("./economicsProgressPilot");
      prepareProgressPilot(user, draft, economicsTopicId);
    } catch { /* An unavailable pilot leaves ordinary Training unchanged. */ }
  }
  return draft;
}
