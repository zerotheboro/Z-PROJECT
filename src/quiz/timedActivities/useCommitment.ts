import { useCallback, useEffect, useRef, useState } from "react";
import { advanceCommitment, readLocalActivity, startCommitment, validCommitment, writeLocalActivity } from "./commitment";
import type { Commitment } from "./commitment";

type Stored = { version: 1; timer: Commitment; writer: string; leaseUntil: number };
const valid = (value: unknown): value is Stored => Boolean(value && typeof value === "object" &&
  (value as Stored).version === 1 && validCommitment((value as Stored).timer) && typeof (value as Stored).writer === "string" && Number.isFinite((value as Stored).leaseUntil));
/** Used by Reset, 100-Second Delay and the isolated legacy Post-Sleep pilot. Persist synchronously on visibility
 * changes; recovery detects an abandoned writer, without resetting its deadline. */
export function useCommitment(key: string | null, durationMs: number, enabled: boolean, grace = 1500) {
  const writer = useRef(crypto.randomUUID());
  const uncertainKey = useRef<string | null>(null);
  const [state, setState] = useState<Stored | null>(null), [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stateKey, setStateKey] = useState(key);
  const ref = useRef(state); ref.current = state;
  const update = useCallback((action: "tick" | "hidden" | "start" | "restart" | "complete") => {
    if (!key) { setError("Open this activity from your Training session so its timer can be saved safely."); setLoaded(true); return false; }
    try {
      const now = Date.now(), saved = readLocalActivity(key, valid);
      if (saved && saved.timer.durationMs !== durationMs) throw new Error("The saved timer does not match this activity. It was not overwritten.");
      if (saved?.timer.status === "running" && saved.writer !== writer.current && saved.leaseUntil > now) {
        setState(saved); setLoaded(true); setError("This attempt is active in another page. Close it, then retry after five seconds; its clock continues."); return false;
      }
      let timer = saved?.timer ?? null;
      if (timer && uncertainKey.current === key) timer = { ...timer, status: "invalid", endedAt: Math.max(timer.startedAt, Math.min(now, timer.deadline)),
        reason: "Browser storage failed during this attempt. Its timing and interruptions cannot be confirmed. Review the material and restart." };
      if (action === "start" || action === "restart") {
        if (action === "start" && timer) throw new Error("A saved attempt already exists. Resume it or use its explicit restart.");
        if (action === "restart" && timer?.status === "running") throw new Error("A running attempt cannot be restarted to extend its clock.");
        timer = startCommitment(durationMs, now, timer ?? undefined);
      } else if (timer) {
        if (timer.status !== "running" && uncertainKey.current !== key) { ref.current = saved; setState(saved); setError(null); setLoaded(true); return true; }
        // A new document after refresh/closure resumes the exact deadline. An
        // abandoned run contributes one interruption, even if pagehide was lost.
        if (saved!.writer !== writer.current && timer.status === "running" && timer.hiddenSince === null && now - timer.lastSeen >= grace)
          timer = { ...timer, hiddenSince: timer.lastSeen, hiddenCounted: false };
        timer = advanceCommitment(timer, now, action === "hidden" || document.visibilityState === "hidden", grace);
        if (action === "complete" && timer.status === "running" && document.visibilityState !== "hidden") timer = { ...timer, status: "finished", endedAt: now };
      }
      if (timer) {
        const next: Stored = { version: 1, timer, writer: writer.current, leaseUntil: now + 5000 };
        writeLocalActivity(key, next); uncertainKey.current = null; ref.current = next; setState(next);
      }
      setError(null); setLoaded(true); return true;
    } catch (e) {
      if (ref.current?.timer.status === "running" || action === "start" || action === "restart") uncertainKey.current = key;
      setError(e instanceof Error ? e.message : "Browser storage failed. This attempt cannot be safely confirmed."); setLoaded(true); return false;
    }
  }, [key, durationMs, grace]);
  useEffect(() => { setStateKey(key); setState(null); setLoaded(false); setError(null); update("tick"); }, [update, key]);
  useEffect(() => {
    if (!enabled || !key) return;
    const visibility = () => update(document.visibilityState === "hidden" ? "hidden" : "tick");
    const closing = () => update("hidden");
    const storage = (event: StorageEvent) => { if (event.key === key) update("tick"); };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", closing); window.addEventListener("storage", storage);
    const interval = window.setInterval(() => update("tick"), 1000);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", closing); window.removeEventListener("storage", storage);
      // Best effort: synchronously mark leaving this running activity, including
      // an ordinary route exit. Already finished/invalid attempts are immutable.
      if (ref.current?.timer.status === "running") update("hidden"); };
  }, [enabled, key, update]);
  const timer = stateKey === key ? state?.timer ?? null : null;
  return { timer, error: stateKey === key ? error : null, loaded: stateKey === key && loaded, remaining: timer ? Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)) : durationMs / 1000,
    begin: () => update("start"), restart: () => update("restart"), refresh: () => update("tick"),
    allowInteraction: () => update("tick") && ref.current?.timer.status === "running" && Date.now() < ref.current.timer.deadline && document.visibilityState !== "hidden",
    complete: () => update("complete") && ref.current?.timer.status === "finished",
    confirmFinished: () => update("tick") && ref.current?.timer.status === "finished" && ref.current.timer.exits < 3 };
}
