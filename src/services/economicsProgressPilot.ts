import { auth } from "../firebase";
import { localCompletionConfig } from "./localTrainingCompletionConfig";
import { assertLocalProfileEnvironment } from "./localCumulativeProfile";
import { armProgressPilot } from "./economicsProgressPilotSession";
import type { TrainingDraft } from "../quiz/trainingProgress";
import type { User } from "firebase/auth";

export function progressPilotEnabled(): boolean {
  if (import.meta.env.DEV !== true || import.meta.env.VITE_ECONOMICS_PROGRESS_PILOT !== "memory-only") return false;
  try {
    if (!localCompletionConfig()) return false;
    assertLocalProfileEnvironment(); // Actual SDK hosts/project/default DB, not flags alone.
    return true;
  } catch { return false; }
}
export function prepareProgressPilot(user: User | null, draft: TrainingDraft, topic: string | undefined) {
  if (progressPilotEnabled() && user && user === auth.currentUser && topic) armProgressPilot(user, draft, topic);
}
