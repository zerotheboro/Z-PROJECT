import { useEffect, useState } from "react";
import { subscribeToAuth } from "../services/auth";
import { getLocalCumulativeProfileReader, publishLocalSyntheticProfile } from "../services/localCumulativeProfile";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";

type ProfileState = { uid: string | null; loading: boolean; signedOut: boolean; data: CumulativeProfileSnapshot | null; error: string | null };
const initial: ProfileState = { uid: null, loading: true, signedOut: false, data: null, error: null };
export function useCumulativeProfile(enabled = true) {
  const [state, setState] = useState(initial);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) { setState(initial); return; }
    let active = true, generation = 0;
    const unsubscribe = subscribeToAuth(user => {
      const current = ++generation;
      // Immediately erase previous account data, including open private details.
      setState({ ...initial, uid: user?.uid ?? null, loading: Boolean(user), signedOut: !user });
      if (!user) return;
      void (async () => {
        try {
          const data = await getLocalCumulativeProfileReader()(user.uid);
          if (active && generation === current) setState({ uid: user.uid, loading: false, signedOut: false, data, error: null });
        } catch (error) {
          if (!active || generation !== current) return;
          // No reflection, SDK payload, UID or document contents in logs/errors.
          const permission = typeof error === "object" && error !== null && "code" in error && error.code === "permission-denied";
          setState({ uid: user.uid, loading: false, signedOut: false, data: null,
            error: permission ? "Your local demo account does not have permission to read this profile. Check the Emulator rules."
              : "Recorded evidence could not be loaded safely. Check the local Emulators and refresh. No learning records were changed." });
        }
      })();
    });
    return () => { active = false; generation++; unsubscribe(); };
  }, [revision, enabled]);
  return { ...state, refresh: () => setRevision(value => value + 1), publishSynthetic: () => publishLocalSyntheticProfile() };
}
