import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTrainingScopeName } from "../trainingProgressState";
import { useTimedActivityIdentity } from "./TimedActivityIdentity";
import { activityKey } from "./commitment";
import { useCommitment } from "./useCommitment";
import { commitmentDisclosure, CommitmentNotice } from "./CommitmentNotice";

export function useResetCommitment(active: boolean) {
  const identity = useTimedActivityIdentity(), scope = useTrainingScopeName();
  return useCommitment(identity ? activityKey(identity, `reset:${scope}`) : null, 600_000, active);
}
export function ResetCommitment({ monitor, material, onComplete, onRemaining, legacyRemaining }: {
  monitor: ReturnType<typeof useResetCommitment>; material: ReactNode; onComplete: () => void;
  onRemaining: (value: number) => void; legacyRemaining: number;
}) {
  const [review, setReview] = useState(false);
  const timer = monitor.timer;
  useEffect(() => { if (timer && !monitor.error) onRemaining(monitor.remaining); }, [timer, monitor.remaining, monitor.error, onRemaining]);
  return <div>
    <h2>10-Minute Reset</h2><p>{commitmentDisclosure}</p>
    {monitor.error && <p role="alert">{monitor.error} No invalid result will be submitted.</p>}
    {monitor.error && <button type="button" onClick={monitor.refresh}>Retry local timer recovery</button>}
    <CommitmentNotice exits={timer?.exits ?? 0} invalid={timer?.status === "invalid"} reason={timer?.reason} />
    {!monitor.loaded ? <p role="status">Checking the saved timer…</p> :
      timer?.status === "invalid" || !timer && legacyRemaining < 600 ? <>
        {!timer && <p>The previous counter has no reliable deadline. Review the material and explicitly restart; it was not treated as a completed reset.</p>}
        {!review ? <button type="button" onClick={() => setReview(true)}>Review material before restarting</button> : <>{material}<button type="button" disabled={Boolean(monitor.error)} onClick={() => { if (monitor.restart()) { onRemaining(600); setReview(false); } }}>Restart 10-minute reset</button></>}
        <p>A restart belongs to this same Training session, not a new independent observation.</p>
      </> : !timer ? <button type="button" disabled={Boolean(monitor.error)} onClick={monitor.begin}>Begin 10-minute reset</button> : <>
        <p>Look at a blank wall or neutral surface. No phone, reading or other stimulating activity.</p>
        <p className="training-timer-value" aria-label="wall stare time remaining" role="timer" aria-live="off">{Math.floor(monitor.remaining / 60)}:{String(monitor.remaining % 60).padStart(2, "0")}</p>
        <button type="button" disabled={timer.status !== "finished" || Boolean(monitor.error)} onClick={() => { if (monitor.confirmFinished()) onComplete(); }}>Start studying</button>
      </>}
  </div>;
}
