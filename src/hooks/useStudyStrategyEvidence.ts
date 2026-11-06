import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase";
import { localCumulativeProfileConfig } from "../services/localCumulativeProfileConfig";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";

/** Parent profile auth hooks cause immediate rerenders/unmounts on sign-in
 * changes. Both UID and the exact Firebase User instance fence every result. */
export function useStudyStrategyEvidence(ownerUid: string, provided?: CumulativeProfileSnapshot) {
  const owner = auth.currentUser;
  const generation = useRef(0);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ owner: typeof owner; data: CumulativeProfileSnapshot | null; loading: boolean; error: boolean }>(
    { owner: null, data: null, loading: true, error: false });
  const local = import.meta.env.DEV === true && Boolean(localCumulativeProfileConfig());
  useEffect(() => {
    const token = ++generation.current;
    if (provided) return () => { generation.current++; };
    setState({ owner, data: null, loading: Boolean(owner && local), error: false });
    if (!owner || owner.uid !== ownerUid || !local) return;
    const current = () => generation.current === token && auth.currentUser === owner && owner.uid === ownerUid;
    void (async () => {
      try {
        // Reuse the verified, bounded, generation-pinned reader; do not query
        // legacy practice, drafts or outboxes to manufacture accepted answers.
        const { getLocalCumulativeProfileReader } = await import("../services/localCumulativeProfile");
        if (!current()) return;
        const data = await getLocalCumulativeProfileReader()(ownerUid);
        if (current()) setState({ owner, data, loading: false, error: false });
      } catch {
        if (current()) setState({ owner, data: null, loading: false, error: true });
      }
    })();
    return () => { generation.current++; };
  }, [ownerUid, owner, local, provided, reload]);
  const visible = owner?.uid === ownerUid && auth.currentUser === owner;
  return { visible, data: visible ? provided ?? (state.owner === owner ? state.data : null) : null,
    loading: visible && !provided && local && (state.owner !== owner || state.loading),
    error: visible && !provided && state.owner === owner && state.error,
    local, refresh: () => setReload(value => value + 1) };
}
