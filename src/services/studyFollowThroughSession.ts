import type { RecommendationObservation } from "../quiz/economics9708/recommendationFollowThrough";

type Owner = { readonly uid: string };
export type LocalStudyComparison = { observation: RecommendationObservation; trainingOpenedAt: string | null };
let currentOwner: Owner | null = null;
let currentUid: string | null = null;
let topics: Map<string, LocalStudyComparison> | null = null;
let pending: { topicId: string; observation: RecommendationObservation; armedAt: string } | null = null;

/** Tab/process memory only. No storage, server receipt or authentication claim.
 * The adapter passes the exact current Firebase User, never a UID-only cache key. */
function owned(owner: Owner | null) {
  if (owner !== currentOwner || (owner?.uid ?? null) !== currentUid) resetStudyFollowThroughSession();
  currentOwner = owner;
  currentUid = owner?.uid ?? null;
  if (!owner) return null;
  return topics ??= new Map();
}
export function resetStudyFollowThroughSession() { currentOwner = null; currentUid = null; topics = null; pending = null; }
export function syncStudyFollowThroughOwner(owner: Owner | null) { owned(owner); }
export function getStudyComparison(owner: Owner | null, topicId: string) { return owned(owner)?.get(topicId) ?? null; }
export function rememberStudyComparison(owner: Owner, observation: RecommendationObservation) {
  if (observation.ownerUid !== owner.uid) return null;
  const value = { observation, trainingOpenedAt: null }, map = owned(owner)!;
  // One active topic comparison bounds memory; choosing another topic starts a
  // new comparison rather than retaining multiple copies of accepted history.
  pending = null; map.clear(); map.set(observation.topicId, value); return value;
}
export function armStudyTrainingVisit(owner: Owner, observation: RecommendationObservation, at: string) {
  if (!Number.isFinite(Date.parse(at)) || Date.parse(at) < Date.parse(observation.displayedAt)) return;
  const value = rememberStudyComparison(owner, observation);
  if (value) pending = { topicId: observation.topicId, observation, armedAt: at };
}
/** Called only when the actual Training route is rendered for this owner.
 * Even this event proves neither starting a session nor attempting a method. */
export function noteStudyTrainingVisit(owner: Owner, at: string) {
  const map = owned(owner), intent = pending; pending = null;
  if (!map || !intent || !Number.isFinite(Date.parse(at)) || !Number.isFinite(Date.parse(intent.armedAt)) || Date.parse(at) < Date.parse(intent.armedAt) ||
    Date.parse(at) - Date.parse(intent.armedAt) > 10 * 60 * 1000) return;
  if (map.get(intent.topicId)?.observation !== intent.observation) return;
  map.set(intent.topicId, { observation: intent.observation, trainingOpenedAt: at });
}
