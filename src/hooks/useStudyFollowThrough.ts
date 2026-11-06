import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { auth } from "../firebase";
import type { StrategyEvidenceSnapshot } from "../services/cumulativeProfileReader";
import { observeStudyRecommendation, reassessStudyRecommendation } from "../quiz/economics9708/recommendationFollowThrough";
import { armStudyTrainingVisit, getStudyComparison, rememberStudyComparison } from "../services/studyFollowThroughSession";
import type { LocalStudyComparison } from "../services/studyFollowThroughSession";

export function useStudyFollowThrough(uid: string, topicId: string, source: StrategyEvidenceSnapshot | undefined, rendered: boolean) {
  const owner = auth.currentUser;
  const [state, setState] = useState<{ owner: typeof owner; value: LocalStudyComparison | null }>({ owner: null, value: null });
  useEffect(() => {
    if (!import.meta.env.DEV || !rendered || !source || source.ownerUid !== uid || !owner || owner.uid !== uid || auth.currentUser !== owner) {
      setState({ owner, value: null }); return;
    }
    // First committed render in this topic establishes the local comparison.
    // Navigation can retain it in memory; reload and auth changes do not provide
    // a durable or trusted recommendation receipt.
    let value = getStudyComparison(owner, topicId);
    if (!value) {
      const observation = observeStudyRecommendation(uid, topicId, source.rows, new Date().toISOString(), source.acceptanceHead);
      if (observation) value = rememberStudyComparison(owner, observation);
    }
    setState({ owner, value });
    return () => { if (auth.currentUser !== owner) getStudyComparison(auth.currentUser, topicId); };
  }, [owner, uid, topicId, source, rendered]);
  const value = state.owner === owner && owner?.uid === uid && state.value?.observation.ownerUid === uid && state.value.observation.topicId === topicId ? state.value : null;
  const report = useMemo(() => value && source?.ownerUid === uid && rendered ?
    reassessStudyRecommendation(uid, value.observation, source.rows, source.acceptanceHead) : null, [value, source, uid, rendered]);
  const openTraining = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!import.meta.env.DEV || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      !source || !owner || auth.currentUser !== owner || owner.uid !== uid || source.ownerUid !== uid) return;
    // Re-anchor to the suggestion actually on screen, not an older suggestion
    // that happened to be displayed before subsequent evidence arrived.
    const now = new Date().toISOString(), observation = observeStudyRecommendation(uid, topicId, source.rows, now, source.acceptanceHead);
    if (observation) armStudyTrainingVisit(owner, observation, now);
  };
  return { value, report, openTraining };
}
