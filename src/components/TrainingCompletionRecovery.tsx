import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getLocalTrainingCompletionClient } from "../services/localTrainingCompletion";
import type { CompletionEntry } from "../services/trainingCompletionOutbox";

/** Local-only recovery surface. No enumeration before Firebase auth settles;
 * stale effects never render another account's pending evidence or errors. */
export default function TrainingCompletionRecovery({ uid, sessionId, children, onRecovered }: {
  uid: string; sessionId?: string; children?: ReactNode; onRecovered?: () => void;
}) {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{ loading: boolean; entries: CompletionEntry[]; error: string | null; saved: boolean; legacy?: boolean; accepted?: boolean; storageUnverified?: boolean }>({
    loading: true, entries: [], error: null, saved: false
  });
  useEffect(() => {
    let active = true;
    const online = () => setRefresh(value => value + 1);
    window.addEventListener("online", online);
    setState({ loading: true, entries: [], error: null, saved: false });
    void (async () => {
      const client = getLocalTrainingCompletionClient();
      if (!client) { if (active) setState({ loading: false, entries: [], error: null, saved: false }); return; }
      const entry = sessionId ? await client.get(uid, sessionId) : null;
      const entries = sessionId ? entry ? [entry] : [] : await client.list(uid);
      if (!active) return;
      if (!sessionId && children && entries.length > 0) {
        // A bare assessment refresh must not reserve another session, including
        // a crash after acknowledgment but before draft cleanup/rendering.
        navigate(`/training/assessment?resume=${encodeURIComponent(entries[0].sessionId)}`, { replace: true });
        return;
      }
      setState({ loading: entries.length > 0, entries, error: null, saved: false });
      const failed: CompletionEntry[] = [];
      const errors: string[] = [];
      let legacy = false;
      let accepted = false;
      let storageUnverified = false;
      for (const pending of entries) {
        if (!active) return;
        try { const receipt = await client.resume(uid, pending.sessionId); legacy ||= receipt.status === "legacy-completed"; accepted ||= receipt.status === "accepted"; }
        catch (error) {
          if (!active) return;
          if (error instanceof Error && "code" in error && error.code === "completion_owner_changed") throw error;
          // Confirm checkpoints again: the backend may have acknowledged the
          // request before activity/cleanup failed. Never infer that from HTTP
          // failure alone, nor claim storage is safe when it cannot be read.
          let confirmed = pending;
          try {
            const latest = await client.get(uid, pending.sessionId);
            if (latest) confirmed = latest;
            else {
              storageUnverified = true;
              errors.push("The browser checkpoint can no longer be found. Its persistence is not confirmed.");
            }
          }
          catch (storageError) {
            storageUnverified = true;
            errors.push(storageError instanceof Error ? storageError.message : "Browser storage could not be verified.");
          }
          if (confirmed.finalized && !storageUnverified) {
            legacy ||= confirmed.reservationStatus === "legacy";
            accepted ||= confirmed.receipt?.status === "accepted";
            continue;
          }
          failed.push(confirmed);
          errors.push(error instanceof Error ? error.message : "Completion recovery failed; saved work was retained.");
        }
      }
      if (active) {
        setState({ loading: false, entries: failed,
          error: errors.length ? `${errors.length} completion(s) need retry. ${[...new Set(errors)].join(" ")}` : null,
          saved: entries.length > 0 && failed.length === 0, legacy, accepted, storageUnverified });
        if (entries.length > failed.length) onRecovered?.();
      }
    })().catch(error => {
      if (active) setState(current => ({ ...current, loading: false, storageUnverified: true,
        error: error instanceof Error ? error.message : "Completion recovery could not be verified." }));
    });
    return () => { active = false; window.removeEventListener("online", online); };
  }, [uid, sessionId, refresh]);

  if (!state.loading && !state.error && !state.saved && state.entries.length === 0) return <>{children}</>;
  return (
    <section className="training-system-message" aria-label="Training completion recovery">
      <h2>{state.saved ? "Training completion saved" : "Recovering completed Training"}</h2>
      <p role="status">{state.loading ? "Checking browser storage and completion acknowledgment..."
        : state.saved ? state.accepted
          ? "Your completed session was durably accepted by the isolated backend. Cumulative profile publication is still disabled; acceptance does not mean a new profile is published. Activity recording and draft cleanup are complete. No additional Training quota was consumed."
          : state.legacy
          ? "Recovery is complete. Grandfathered sessions kept the existing legacy flow and their full browser checkpoint; they did not create cumulative evidence. Any server-eligible sessions were acknowledged by the backend. No additional Training quota was consumed."
          : "Your completed work was acknowledged by the backend. Activity recording and draft cleanup are complete. No additional Training quota was consumed."
        : state.storageUnverified || state.entries.length === 0
          ? state.entries.some(entry => entry.receipt)
            ? "A completion acknowledgment was previously confirmed, but browser recovery storage cannot currently be verified. Keep this page open and retry activity recording or draft cleanup."
            : "Completion is not confirmed safely saved in browser storage or acknowledged by the backend. Keep this page open and preserve your draft where possible."
          : state.entries.every(entry => entry.receipt?.status === "accepted")
            ? "Durable session acceptance is confirmed. Cumulative profile publication remains disabled. Activity recording or draft cleanup still needs retry."
          : state.entries.every(entry => entry.receipt)
            ? "Completion acknowledgment is saved in browser storage. Activity recording or draft cleanup still needs retry."
            : state.entries.every(entry => entry.reservationStatus === "legacy")
              ? "Completed work is saved in browser storage. This grandfathered session uses the existing legacy flow, not cumulative backend submission. Legacy saving, activity recording or draft cleanup still needs retry."
            : "Completed work is saved in browser storage for this account. Backend acknowledgment is not yet confirmed for every completion; retry safely."}</p>
      <p>Clearing browser data, browser storage eviction, or losing this device may destroy unsent evidence. Browser storage is not a cloud backup.</p>
      {state.error && <p role="alert">{state.error}</p>}
      {!state.loading && !state.saved && <button type="button" onClick={() => setRefresh(value => value + 1)}>Retry saved completion</button>}
      {(sessionId || children) && <button type="button" onClick={() => navigate("/training")}>Back to training</button>}
    </section>
  );
}
