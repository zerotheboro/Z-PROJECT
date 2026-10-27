import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../firebase";
import { loadManualTrainingHistory } from "../services/manualTrainingHistory";
import type { ManualHistoryPage } from "../services/manualTrainingHistory";

export function useManualTrainingHistory(uid: string | null) {
  const empty: ManualHistoryPage = { records: [], assessments: [], cursor: null, assessmentCursor: null, more: false, manualMore: false, assessmentMore: false };
  const [state, setState] = useState<ManualHistoryPage & { uid: string | null; loading: boolean; error: string | null }>({ ...empty, uid: null, loading: false, error: null });
  const generation = useRef(0);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const token = ++generation.current;
    setState({ ...empty, uid, loading: Boolean(uid), error: null });
    if (!uid) return;
    const current = () => generation.current === token && auth.currentUser?.uid === uid;
    void loadManualTrainingHistory(uid).then(page => {
      if (current()) setState({ ...page, uid, loading: false, error: page.warnings?.join(" ") || null });
    }, () => { if (current()) setState({ ...empty, uid, loading: false, error: "Training history could not be verified. This does not mean your results were lost. Retry loading or return to Training to recover pending saves." }); });
    return () => { generation.current++; };
  }, [uid, reload]);
  const more = useCallback(async () => {
    if (!uid || state.uid !== uid || !state.more || state.loading) return;
    const token = ++generation.current;
    setState(s => ({ ...s, loading: true, error: null }));
    const current = () => generation.current === token && auth.currentUser?.uid === uid;
    try {
      const page = await loadManualTrainingHistory(uid, state);
      if (current()) setState(s => ({ ...page, records: [...s.records, ...page.records.filter(r => !s.records.some(old => old.sessionId === r.sessionId))], assessments: [...s.assessments, ...page.assessments.filter(r => !s.assessments.some(old => old.id === r.id))], uid, loading: false, error: [...(s.warnings ?? []), ...(page.warnings ?? [])].join(" ") || null, warnings: [...(s.warnings ?? []), ...(page.warnings ?? [])] }));
    } catch { if (current()) setState(s => ({ ...s, loading: false, error: "The next history page could not be verified. Existing records were retained; retry loading." })); }
  }, [uid, state]);
  const visible = state.uid === uid && auth.currentUser?.uid === uid;
  return { ownerUid: visible ? uid : null, records: visible ? state.records : [], assessments: visible ? state.assessments : [], loading: Boolean(uid) && (!visible || state.loading), error: visible ? state.error : null,
    hasMore: visible && state.more, loadMore: more, refresh: () => setReload(n => n + 1) };
}
