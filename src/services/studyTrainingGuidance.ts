import { localCumulativeProfileConfig } from "./localCumulativeProfileConfig";
import { economicsCoverageManifest } from "../quiz/economics9708/packs";

/** Navigation carries a public whole-topic hint, never an owner, method,
 * recommendation receipt, evidence or authority. The destination reads again. */
export function studyTrainingTopic(search: string): string | null {
  const topics = new URLSearchParams(search).getAll("studyTopic");
  return topics.length === 1 && economicsCoverageManifest.some(t => t.id === topics[0] && t.status === "playable") ? topics[0] : null;
}

export function studyTrainingGuidanceEnabled(): boolean {
  if (import.meta.env.DEV !== true || import.meta.env.VITE_STUDY_TRAINING_GUIDANCE !== "emulator-only") return false;
  try { return Boolean(localCumulativeProfileConfig()); } catch { return false; }
}

export function studyTrainingLink(topicId: string): string {
  return studyTrainingGuidanceEnabled() && studyTrainingTopic(`studyTopic=${encodeURIComponent(topicId)}`)
    ? `/training?studyTopic=${encodeURIComponent(topicId)}` : "/training";
}
