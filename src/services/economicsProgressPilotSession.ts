import type { TrainingDraft } from "../quiz/trainingProgress";
import type { PilotCheckResult } from "../quiz/economics9708/progressPilot/model";

type Owner = { readonly uid: string };
export type PilotSession = {
  readonly sessionId: string; readonly topicId: "1.5" | "2.2";
  instructionOpened: boolean; initialSkipped: boolean; subsequentSkipped: boolean;
  initial: PilotCheckResult | null; subsequent: PilotCheckResult | null;
};
let owner: Owner | null = null, uid: string | null = null, session: PilotSession | null = null;

export function resetProgressPilot() { owner = null; uid = null; session = null; }
export function syncProgressPilotOwner(current: Owner | null) {
  if (owner !== current || uid !== (current?.uid ?? null)) resetProgressPilot();
}
export function readProgressPilot(current: Owner | null, sessionId: string): PilotSession | null {
  syncProgressPilotOwner(current);
  return current && session?.sessionId === sessionId ? session : null;
}
export function isFreshProgressPilotDraft(draft: TrainingDraft): boolean {
  return draft.section === (draft.mode === "auto" ? 1 : 3) &&
    Object.values(draft.completed).every(value => value === null || value === undefined) &&
    Object.keys(draft.internalState).every(key => key === "curriculum");
}
/** Called only after the existing reservation and draft save, before navigation.
 * No receipt, DB write, durable storage or authority is created by this marker. */
export function armProgressPilot(current: Owner, draft: TrainingDraft, topic: string) {
  syncProgressPilotOwner(current);
  if (readProgressPilot(current, draft.sessionId)) return;
  const selected = draft.internalState.curriculum?.named.economics9708;
  if (!['1.5', '2.2'].includes(topic) || draft.owner.kind !== "user" || draft.owner.uid !== current.uid ||
    !selected || typeof selected !== "object" || Array.isArray(selected) || !("topicId" in selected) || selected.topicId !== topic ||
    !("activityVersion" in selected) || selected.activityVersion !== "mapped-1" ||
    !isFreshProgressPilotDraft(draft)) return;
  owner = current; uid = current.uid;
  session = { sessionId: draft.sessionId, topicId: topic === "1.5" ? "1.5" : "2.2", instructionOpened: false,
    initialSkipped: false, subsequentSkipped: false, initial: null, subsequent: null };
}
