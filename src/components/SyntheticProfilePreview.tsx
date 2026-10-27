import { useEffect, useState } from "react";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import { syntheticProfileSnapshot } from "../services/syntheticProfilePreview";
import type { SyntheticStudent } from "../services/syntheticProfilePreview";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";

export default function SyntheticProfilePreview() {
  const [student, setStudent] = useState<SyntheticStudent>("student-a");
  const [scenario, setScenario] = useState("normal");
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data: CumulativeProfileSnapshot | null; error: boolean } | null>(null);
  const key = `${student}:${scenario}:${revision}`;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      try { setState({ key, data: scenario === "error" ? null : syntheticProfileSnapshot(student), error: scenario === "error" }); }
      catch { setState({ key, data: null, error: true }); }
    }, scenario === "delayed" ? 1800 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [key, scenario, student]);
  const current = state?.key === key ? state : null;
  return <>
    <aside className="cumulative-profile cumulative-demo-controls" aria-label="Synthetic preview controls">
      <div className="profile-demo-heading"><span className="profile-status-pill">DEMO DATA</span><h2>Synthetic student preview</h2></div>
      <p>Demonstration data only. These sessions and receipts are fixtures, not actual backend acceptances or a verified publication. Nothing here is saved to an account.</p>
      <div className="cumulative-filters">
        <label>Synthetic student<select value={student} onChange={event => setStudent(event.target.value as SyntheticStudent)}>
          <option value="student-a">Student A — multiple sessions</option><option value="student-b">Student B — single session</option>
          <option value="empty">Empty history</option><option value="malformed">Partially unreadable history</option>
        </select></label>
        <label>Preview response<select value={scenario} onChange={event => setScenario(event.target.value)}>
          <option value="normal">Ready</option><option value="delayed">Delayed</option><option value="error">Unavailable</option>
        </select></label>
      </div>
    </aside>
    {current?.data ? <CumulativeProfileDashboard key={key} data={current.data} refresh={() => setRevision(value => value + 1)} />
      : <main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1} aria-busy={!current}>
        <h1>Your learning, over time</h1>
        {current?.error ? <><p role="alert">Synthetic preview is unavailable. No account data was accessed or changed.</p><button type="button" onClick={() => { setScenario("normal"); setRevision(value => value + 1); }}>Retry preview</button></>
          : <p role="status">Loading synthetic learning evidence...</p>}
      </main>}
  </>;
}
