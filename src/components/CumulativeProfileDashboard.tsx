import { memo, useCallback, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMethodName } from "../quiz/methodRegistry";
import { observationConditions } from "../quiz/cumulativeProfileView";
import type { HistoryEntry, ProgressSeries } from "../quiz/cumulativeProfileView";
import type { LearningObservation } from "../quiz/learningEvidence";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import { ProfileIcon, ProfileRail, ProfileSectionTitle, TaskScoreBar } from "./ProfileVisuals";
import "./CumulativeProfile.scss";

const dateLabel = (value: string | null) => value === null ? "Completion date unknown" :
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
const modeLabel = (mode: "auto" | "manual") => mode === "auto" ? "Test Me" : "Test Methods";
const phaseLabel = (phase: "lab" | "match") => phase === "lab" ? "Lab practice" : "Match verification";
const choice = (value: string | null) => value === null ? "unknown" : `value:${value}`;
const performanceLabel = (o: LearningObservation) => o.performance.score === null ? "Score not recorded" :
  o.performance.correct !== null && o.performance.total !== null
    ? `${o.performance.correct} / ${o.performance.total} correct (${Math.round(o.performance.score * 100)}% on this task)`
    : `Recorded task score: ${o.performance.score}; question counts unknown`;

function Observation({ observation: o, exposure }: { observation: LearningObservation; exposure?: string }) {
  return <li className="cumulative-observation">
    <strong>{getMethodName(o.methodId)} · {phaseLabel(o.phase)}</strong>
    <p>{performanceLabel(o)}</p>
    <p>{[o.context.subject, o.context.topic, o.context.exerciseTopic].filter(Boolean).join(" / ") || "Subject and topic not recorded"}</p>
    <p>{exposure === "repeated" ? "Repeated learning content is known." : exposure === "first-known" ? "First known use in this recorded history; earlier learning is unknown." : "Earlier use of this learning content is unknown."}</p>
    <details><summary>Scoring conditions and personal ratings</summary>
      <p>{observationConditions(o)}</p>
      <p>Content set: {o.context.contentSetId ?? "not recorded"}. Question conditions: {o.protocol.questions ? `${o.protocol.questions.length} recorded` : "not recorded"}.</p>
      {o.protocol.questions && <ul>{o.protocol.questions.map(q => <li key={q.questionId}>
        {q.questionId}: {q.difficulty ?? "unknown difficulty"}; {q.offeredOptionCount ?? "unknown"} choices; choice identities: {q.offeredOptionIds?.join(", ") ?? "not recorded"}.
      </li>)}</ul>}
      <p>Self-reported confidence: {o.selfReport.confidence ?? "not recorded"}; ease: {o.selfReport.ease ?? "not recorded"}; willingness to use: {o.selfReport.willingnessToUse ?? "not recorded"} (available ratings are out of 5).</p>
      <p>These personal ratings are not objective performance or chart scores.</p>
    </details>
  </li>;
}

function PrivateSessionDetails({ entry }: { entry: HistoryEntry }) {
  const [revealed, setRevealed] = useState(false);
  const details = entry.details;
  if (!details) return <p>Additional completion details are not available in this readable record. Older records are not assumed to have been backfilled.</p>;
  return <div className="cumulative-private">
    {entry.evidence.mode === "auto" && <p>These additional details come from your saved assessment snapshot, which can be updated separately. They are not part of the immutable performance evidence.</p>}
    <p>Introduction check: {details.methodIntroduction.correct} / {details.methodIntroduction.total} correct. This check is separate from method performance.</p>
    <button type="button" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? "Hide private reflection" : "Show private reflection"}</button>
    {revealed && <div><p className="cumulative-writing">{details.reflection.reflectionText || "No reflection text recorded."}</p>
      <p>Surprised by the results: {details.reflection.surprisedByResults === null ? "not recorded" : details.reflection.surprisedByResults ? "Yes" : "No"}.</p></div>}
  </div>;
}

const ProgressChart = memo(function ProgressChart({ series }: { series: ProgressSeries }) {
  const chartId = useId().replaceAll(":", "");
  const title = `${getMethodName(series.methodId)} — ${phaseLabel(series.group.phase)}`;
  const comparisonContext = [
    series.group.context.subject === null ? "Subject not recorded" : `Subject: ${series.group.context.subject}`,
    series.group.context.topic === null ? "Topic not recorded" : `Topic: ${series.group.context.topic}`,
    series.group.source === "test-methods" ? "Test Methods" : "Test Me"
  ].join("; ");
  const accessibleTitle = `${title} — ${comparisonContext}`;
  const x = (i: number) => series.points.length < 2 ? 300 : 40 + i / (series.points.length - 1) * 520;
  const points = series.points.map((p, i) => `${x(i)},${190 - p.score * 160}`).join(" ");
  const dateLabels = series.points.map(p => dateLabel(p.date));
  const first = series.points[0], last = series.points.at(-1);
  const change = first && last && series.points.length > 1 ? Math.round((last.score - first.score) * 100) : null;
  return <article className={`cumulative-card profile-chart ${series.group.phase === "match" ? "coral" : "teal"}`}>
    <div className="profile-chart-heading"><div><p className="profile-section-kicker">{series.group.context.subject ?? "Subject not recorded"} · {series.group.context.topic ?? "Topic not recorded"}</p><h3>{title}</h3></div>
      <span className="profile-status-pill">{series.points.length} observations</span></div>
    <div className="profile-chart-reading"><strong>{last ? `${Math.round(last.score * 100)}%` : "Not recorded"}</strong><span>Latest task accuracy</span>
      {change !== null && <small>{change > 0 ? "+" : ""}{change} percentage points from first observation</small>}</div>
    <svg viewBox="0 0 600 230" role="img" aria-label={`${accessibleTitle}: recorded task accuracy over time. Exact values follow in the table.`}>
      <defs><linearGradient id={`profile-area-${chartId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".18" /><stop offset="100%" stopColor="currentColor" stopOpacity=".01" /></linearGradient></defs>
      <line className="profile-gridline" x1="40" y1="30" x2="570" y2="30" /><line className="profile-gridline" x1="40" y1="110" x2="570" y2="110" />
      <line x1="40" y1="30" x2="40" y2="190" /><line x1="40" y1="190" x2="570" y2="190" />
      <text x="30" y="35" textAnchor="end">100%</text><text x="30" y="115" textAnchor="end">50%</text><text x="30" y="194" textAnchor="end">0%</text>
      {series.points.length > 1 && <path d={`M ${points} L 560 190 L 40 190 Z`} fill={`url(#profile-area-${chartId})`} stroke="none" />}
      <polyline points={points} fill="none" className="cumulative-trend" />
      {series.points.map((p, i) => <circle key={p.date} cx={x(i)} cy={190 - p.score * 160} r="5"><title>{dateLabels[i]}: {Math.round(p.score * 100)}%</title></circle>)}
      {first && <text x="40" y="218">{first.date.slice(0, 10)}</text>}{last && series.points.length > 1 && <text x="560" y="218" textAnchor="end">{last.date.slice(0, 10)}</text>}
    </svg>
    <p className="profile-chart-context">{series.group.context.exerciseTopic ?? "Exercise objective not recorded"} · {series.group.exposure.content === "repeated" ? "Repeated content" : "First known content"}</p>
    <div className="cumulative-table-wrap" tabIndex={0} role="region" aria-label={`${accessibleTitle}: exact observation table`}><table><caption>{accessibleTitle}: exact recorded observations</caption>
      <thead><tr><th scope="col">Completion date</th><th scope="col">Correct / questions</th><th scope="col">Task accuracy</th></tr></thead>
      <tbody>{series.points.map((p, i) => <tr key={p.date}><th scope="row">{dateLabels[i]}</th><td>{p.correct} / {p.total}</td><td>{Math.round(p.score * 100)}%</td></tr>)}</tbody>
    </table></div>
    <details className="profile-card-details"><summary>How to read this chart</summary><p>Same recorded scoring and question conditions. Points are observations in date order, equally spaced—not elapsed time.</p></details>
    <p>This describes these tasks only. It does not show that a learning method caused a change.</p>
  </article>;
});

function MethodComparison({ progress }: { progress: ProgressSeries[] }) {
  const [selected, setSelected] = useState("");
  const comparisons = useMemo(() => {
    const groups = new Map<string, { group: ProgressSeries["group"]; methods: Set<string> }>();
    for (const series of progress) {
      const group = series.group;
      if (series.points.length < 2 || group.context.subject === null || group.context.topic === null) continue;
      const key = JSON.stringify([group.groupId, group.source, group.phase, group.context, group.protocol, group.exposure]);
      const value = groups.get(key) ?? { group, methods: new Set<string>() };
      value.methods.add(series.methodId); groups.set(key, value);
    }
    return [...groups].filter(([, value]) => value.methods.size > 1);
  }, [progress]);
  const current = comparisons.find(([key]) => key === selected) ?? comparisons[0];
  if (!current) return null;
  const [, { group, methods }] = current;
  return <article className="profile-comparison" aria-label="Comparable method results">
    <div className="profile-comparison-heading"><div><p className="profile-section-kicker">A FAIRER COMPARISON</p><h3>Same task. Different methods.</h3><p>Recorded results under the same known conditions.</p></div>
      <label>Comparison context<select value={current[0]} onChange={event => setSelected(event.target.value)}>{comparisons.map(([key, value], index) =>
        <option key={key} value={key}>{value.group.context.subject} · {value.group.context.topic} · {phaseLabel(value.group.phase)} · {value.group.source === "test-methods" ? "Test Methods" : "Test Me"} · {value.group.exposure.content === "repeated" ? "Repeated content" : "First known content"} ({index + 1})</option>)}</select></label></div>
    <p className="profile-comparison-context">{group.context.subject} / {group.context.topic} · {phaseLabel(group.phase)} · {group.source === "test-methods" ? "Test Methods" : "Test Me"}</p>
    <ul>{group.results.filter(result => methods.has(result.methodId)).map(result => <li key={result.methodId}>
      <TaskScoreBar label={getMethodName(result.methodId)} score={result.score} /><small>{result.correct} / {result.total} correct across {result.sessionCount} sessions</small>
    </li>)}</ul><p className="profile-fine-print">Task accuracy, not a best-method ranking. Personal preference and confidence are kept separate.</p>
  </article>;
}

export default function CumulativeProfileDashboard({ data, refresh }: { data: CumulativeProfileSnapshot; refresh: () => void }) {
  const [historyLimit, setHistoryLimit] = useState(10);
  const [methodOpen, setMethodOpen] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [activeSection, setActiveSection] = useState("learning-overview");
  const matches = useCallback((o: { context: { subject: string | null; topic: string | null } }) =>
    (!subject || choice(o.context.subject) === subject) && (!topic || choice(o.context.topic) === topic), [subject, topic]);
  const allObservations = useMemo(() => data.history.flatMap(entry => entry.evidence.observations), [data.history]);
  const subjects = useMemo(() => [...new Set(allObservations.map(o => o.context.subject))].sort(), [allObservations]);
  const topics = useMemo(() => [...new Set(allObservations.filter(o => !subject || choice(o.context.subject) === subject)
    .map(o => o.context.topic))].sort(), [allObservations, subject]);
  const filtered = Boolean(subject || topic);
  const history = useMemo(() => data.history.filter(entry => !filtered || entry.evidence.observations.some(matches)), [data.history, filtered, matches]);
  const progress = useMemo(() => data.coverageComplete ? data.progress.filter(series => matches(series.group)) : [], [data.progress, data.coverageComplete, matches]);
  const visibleMethods = useMemo(() => new Set(allObservations.filter(matches).map(o => o.methodId)), [allObservations, matches]);
  const methodRecords = useMemo(() => {
    const records = new Map<LearningObservation["methodId"], { observations: LearningObservation[]; topics: Set<string>; sessionIds: Set<string> }>();
    for (const entry of history) if (entry.serverRecorded) for (const observation of entry.evidence.observations) {
      if (!matches(observation)) continue;
      const record = records.get(observation.methodId) ?? { observations: [], topics: new Set<string>(), sessionIds: new Set<string>() };
      record.observations.push(observation); record.sessionIds.add(observation.sessionId);
      for (const value of [observation.context.subject, observation.context.topic]) if (value !== null) record.topics.add(value);
      records.set(observation.methodId, record);
    }
    return records;
  }, [history, matches]);
  const resetDisplay = () => { setHistoryLimit(10); setMethodOpen(null); };
  const summary = data.summary;
  const fixture = data.preview?.source === "synthetic-fixture";
  const completionLabel = data.latestKnownCompletion !== null ? dateLabel(data.latestKnownCompletion)
    : data.history.some(item => item.serverRecorded) ? "Completion date unknown"
      : summary && summary.sessionCount > 0 ? "Completion dates unavailable in readable evidence" : "No server-recorded sessions";
  return <main className="cumulative-profile" id="cumulative-profile-main" tabIndex={-1}>
    <div className="profile-layout"><ProfileRail active={activeSection} onSelect={setActiveSection} /><div className="profile-content">
    <header className="cumulative-hero">
      <div><p className="cumulative-eyebrow">YOUR LEARNING PROFILE <span className="profile-status-pill">{fixture ? "SYNTHETIC DEMO" : "LOCAL DEMO"}</span></p>
      <h1>Your learning, over time</h1>
      <p>See what you’ve tried. Discover what’s worth trying next.</p></div>
      <Link className="profile-primary-action" to="/training">Try a learning method <ProfileIcon name="arrow" /></Link>
    <div className="profile-toolbar"><div><span className="profile-live-dot" aria-hidden="true" />{fixture ? "Clearly labeled demonstration data" : "Your recorded evidence"}</div><div className="cumulative-actions"><button type="button" className="profile-refresh" onClick={refresh}><ProfileIcon name="history" />Refresh recorded evidence</button>
      <Link to="/training/profile?view=latest">View latest assessment snapshot</Link><Link to="/training">Back to Training</Link></div></div>
    </header>

    <section id="learning-overview" aria-labelledby="overview-title">
      <ProfileSectionTitle number="01" title="Learning Overview" id="overview-title" description="Every experiment adds a little more perspective." />
      {data.publication && <aside className="cumulative-notice" aria-label="Synthetic publication status">
        <h3>Demo publication status</h3>
        <p><strong>{data.publication.publication === "published" ? "Published synthetic generation" : "Not published"}</strong> · Synthetic Emulator data only.</p>
        <details className="profile-status-details"><summary>{data.publication.acceptedSessions} accepted · {data.publication.publishedSessions} published · {data.publication.pendingSessions} pending</summary>
        <p>Demo publication: <strong>{data.publication.publication === "published" ? "Published synthetic generation" : "Not published"}</strong>.
          Production authority and admission: <strong>NOT VERIFIED</strong>. This is not a real student publication.</p>
        <p>{data.publication.acceptedSessions} durably accepted sessions; {data.publication.publishedSessions} included in the published generation;
          {" "}{data.publication.pendingSessions} awaiting aggregation/publication.</p>
        <p>Figures and history below belong to the published generation only. Acceptance revisions are not profile revisions.</p></details>
      </aside>}
      {data.preview && <aside className="cumulative-notice" aria-label="Acceptance and publication status">
        <h3>Accepted evidence preview</h3>
        <p>Published profile generation: <strong>Not published</strong>. Trusted admission: <strong>NOT VERIFIED</strong>.</p>
        <details className="profile-status-details"><summary>{fixture ? "Demonstration fixtures · nothing saved to an account" : "Accepted evidence · aggregation and publication are not confirmed"}</summary><p>{fixture ? "Synthetic fixture results only: these are not real accepted sessions, and no aggregation job or publication was created." : data.preview.aggregation === "pending" ? "Aggregation and publication are pending. This read-only demo preview is calculated from readable V2 accepted evidence; it is not a published profile."
          : "Aggregation status is unavailable because some evidence could not be validated. Preview totals and charts are withheld."}</p>
        <p>An accepted receipt confirms durable saving only. Its acceptance revision is not a profile revision. Counts cover this bounded readable demo history, not an independently verified inventory.</p></details>
      </aside>}
      {!summary && <p className="cumulative-notice">No server-recorded cumulative profile yet. Complete Training in the local demo to start recording evidence. Earlier assessment snapshots, if available, are listed separately below.</p>}
      <dl className="cumulative-metrics">
        <div><dt>{fixture ? "Synthetic session fixtures (not saved)" : data.preview ? "Accepted Training sessions (readable demo history)" : "Recorded completed sessions"}<ProfileIcon name="history" /></dt><dd>{summary?.sessionCount ?? "Not available"}</dd></div>
        <div><dt>Distinct methods tested<ProfileIcon name="methods" /></dt><dd>{summary?.methods.length ?? "Not available"}</dd></div>
        <div><dt>Recorded observations<ProfileIcon name="book" /></dt><dd>{summary?.observationCount ?? "—"}</dd></div>
        <div><dt>Comparable progress series<ProfileIcon name="progress" /></dt><dd>{data.coverageComplete ? data.progress.length : "—"}</dd></div>
      </dl>
      <div className="profile-overview-bottom"><div className="profile-session-mix"><div><p className="profile-section-kicker">YOUR EXPLORATIONS</p><h3>Two ways to try something new</h3><dl><div><dt>Test Me sessions</dt><dd>{data.automaticSessions ?? "Coverage incomplete"}</dd></div><div><dt>Test Methods sessions</dt><dd>{data.manualSessions ?? "Coverage incomplete"}</dd></div></dl></div>
        <div className="profile-mix-ring" aria-hidden="true" style={data.automaticSessions !== null && data.manualSessions !== null && data.automaticSessions + data.manualSessions > 0 ? { background: `conic-gradient(var(--lightblue) 0deg ${data.automaticSessions / (data.automaticSessions + data.manualSessions) * 360}deg, var(--passion-orange) 0deg 360deg)` } : undefined}><span><ProfileIcon name="book" /></span></div></div>
        <aside className="profile-next-note"><p className="profile-section-kicker">A GOOD NEXT STEP</p><h3>Stay curious. Keep testing.</h3><p>A task result is a clue, not a label. Try a method on different material before drawing conclusions.</p><Link to="/training">Explore Training <ProfileIcon name="arrow" /></Link></aside></div>
      <p>{fixture ? "Latest synthetic completion" : "Latest server-recorded completion (readable evidence)"}: <strong>{fixture && data.history.length === 0 ? "No synthetic sessions" : completionLabel}</strong>.</p>
      {data.unknownCompletionCount > 0 && <p>{data.unknownCompletionCount} recorded session(s) have no known completion date; they cannot be placed reliably on a timeline.</p>}
      {summary && <p>{summary.observationCount} recorded observations. {summary.independentSessionCount} session identities are established; {summary.unknownIndependenceSessionCount} have uncertain historical independence.</p>}
      <details className="profile-coverage-details" open={data.warnings.length > 0}><summary>What this evidence can tell you</summary><aside className="cumulative-notice" aria-label="Evidence coverage">
        <h3>What this evidence can tell you</h3>
        <p>Results describe the tasks you completed. They are student-reported, not independently verified measurements. A backend acknowledgment confirms saving, not the truth of a score. Prior learning outside this history is unknown.</p>
        {summary && (summary.retention.observationsNotEmbedded > 0 || summary.retention.performanceGroupsNotEmbedded > 0) && <p>The {data.preview ? "local preview" : "server summary"} is a bounded sample: {summary.retention.observationsNotEmbedded} observations and {summary.retention.performanceGroupsNotEmbedded} comparison groups are not embedded in it. Original evidence is retained separately.</p>}
        {data.warnings.map(message => <p key={message}>{message}</p>)}
      </aside></details>
      <details className="profile-storage-details" open={!data.browserStorageVerified && !fixture}><summary>Completed work on this browser</summary><aside className="cumulative-card" aria-label="Browser completion status"><h3>Completed work on this browser</h3>
        {fixture ? <p>Browser completion storage is not inspected in fixture mode. Sign in to an isolated demo account to inspect its recovery checkpoints.</p>
          : !data.browserStorageVerified ? <p>Browser recovery storage could not be verified. There may be unsent work; do not clear browser data.</p>
          : data.pending.length === 0 ? <p>No pending completion checkpoints were found for this account on this browser.</p>
            : <ul>{data.pending.map(item => <li key={item.sessionId}>{item.acknowledged ? "Backend acknowledgment saved; activity or cleanup is pending."
              : item.legacy ? "Browser checkpoint saved; this older session uses the legacy saving flow, not cumulative submission."
                : "Browser checkpoint saved; backend acknowledgment is not confirmed."}</li>)}</ul>}
        <p>Browser-only checkpoints are not added to the recorded totals. Clearing browser data, storage eviction or losing this device may destroy unacknowledged work. Return to Training to recover it.</p>
      </aside></details>
    </section>

    <form className="cumulative-filters" aria-label="Evidence context filters" onSubmit={event => event.preventDefault()}>
      <div className="profile-filter-heading"><ProfileIcon name="methods" /><strong>Find your context</strong></div><label>Subject<select value={subject} onChange={event => { setSubject(event.target.value); setTopic(""); resetDisplay(); }}>
        <option value="">All subjects</option>{subjects.map(value => <option key={choice(value)} value={choice(value)}>{value ?? "Subject not recorded"}</option>)}
      </select></label>
      <label>Topic<select value={topic} onChange={event => { setTopic(event.target.value); resetDisplay(); }}>
        <option value="">All topics</option>{topics.map(value => <option key={choice(value)} value={choice(value)}>{value ?? "Topic not recorded"}</option>)}
      </select></label>
      <button type="button" disabled={!filtered} onClick={() => { setSubject(""); setTopic(""); resetDisplay(); }}>Clear filters</button>
      <p>Overview totals cover all readable history. Filters narrow method details, history and comparable progress; unknown context stays unknown.</p>
    </form>

    <section id="method-evidence" aria-labelledby="methods-title"><ProfileSectionTitle number="02" title="Study Method Evidence" id="methods-title" description="Explore your toolkit, one method and context at a time." />
      <p>No overall effectiveness score or best-method ranking is inferred. Different tasks and conditions stay separate.</p>
      <MethodComparison progress={progress} />
      {!summary?.methods.length && <p>No cumulative method evidence is available yet.</p>}
      <div className="cumulative-grid profile-method-grid">{summary?.methods.filter(method => !filtered || visibleMethods.has(method.methodId)).map((method, index) => {
        const coverage = data.methodCoverage.get(method.methodId) ?? "incomplete";
        const records = methodRecords.get(method.methodId), observations = records?.observations ?? [];
        const topics = records ? [...records.topics] : [];
        return <article className="cumulative-card profile-method-card" key={method.methodId}><div className="profile-method-heading"><span className={`profile-method-glyph tone-${index % 4}`}><ProfileIcon name="methods" /></span><span className="profile-status-pill">{coverage === "contradictory" ? "Needs review" : coverage === "incomplete" ? "Partial coverage" : method.independentSessionCount > 1 ? "Building evidence" : "Early evidence"}</span></div><h3>{getMethodName(method.methodId)}</h3>
          {coverage === "contradictory" ? <p>Method summary figures are withheld because they contradict the recorded evidence. Original readable observations remain available below.</p>
            : <>
              {coverage === "incomplete" && <p>Readable method coverage is incomplete. These figures are from the {data.preview ? "local preview" : "server summary"} and have not been fully reconciled with the available details.</p>}
              <p>{method.sessionCount} recorded session(s) · {method.observationCount} observations. A Lab and a Match can be two observations of one session—not two independent attempts.</p>
              {filtered && <p>In this context: {records?.sessionIds.size ?? 0} session(s), {observations.length} observations. Method totals above cover all contexts.</p>}
            </>}
          <p>{topics.length ? topics.join(" · ") : "Subjects and topics not recorded in the available details."}</p>
          <details className="profile-card-details"><summary>Evidence context & limits</summary>{coverage !== "contradictory" && <p>{method.knownContentExposureCount} known versioned content exposure(s); {method.unknownContentObservationCount} observations have unknown content identity/version.</p>}
          <p>{coverage === "contradictory" ? "Progress is unavailable until the summary discrepancy is reviewed." : data.coverageComplete && data.progress.some(p => p.methodId === method.methodId) ? "A comparable set is available in Progress Over Time."
            : summary.retention.performanceGroupsNotEmbedded > 0 ? "No comparable chart is available in this bounded projection. Original observations remain below." : "More comparable learning sessions are needed to assess progress."}</p>
          {coverage !== "contradictory" && <p>{method.unpooledObservationCount} observation(s) lack the conditions needed for pooled comparison. {method.unknownIndependenceSessionCount} session(s) have uncertain independence.</p>}</details>
          <button type="button" aria-expanded={methodOpen === method.methodId} onClick={() => setMethodOpen(methodOpen === method.methodId ? null : method.methodId)}>{methodOpen === method.methodId ? "Hide" : "View"} {getMethodName(method.methodId)} records</button>
          {methodOpen === method.methodId && (observations.length ? <ul className="cumulative-observations">{observations.map(o => <Observation key={o.observationId} observation={o} exposure={data.exposure.get(o.observationId)?.content} />)}</ul> : <p>Detailed records are unavailable; the summary was not replaced with invented results.</p>)}
        </article>;
      })}</div>
    </section>

    <section id="learning-history" aria-labelledby="history-title"><ProfileSectionTitle number="03" title="Learning History" id="history-title" description="Your available Test Me and individual practice history appears here. Some older records may contain less detail." />
      {data.history.length === 0 && <p>No readable completed history yet.</p>}
      {data.history.length > 0 && history.length === 0 && <p>No recorded sessions match these filters.</p>}
      <p role="status">Showing {Math.min(historyLimit, history.length)} of {history.length} readable history records{filtered ? " matching these filters" : ""}.</p>
      <ol className="cumulative-history">{history.slice(0, historyLimit).map(entry => <li className="cumulative-card" key={entry.evidence.sessionId}>
        <div className="profile-history-heading"><span className={`profile-history-marker ${entry.evidence.mode}`}><ProfileIcon name={entry.evidence.mode === "auto" ? "book" : "methods"} /></span><div><p className="profile-section-kicker">{entry.evidence.mode === "auto" ? "GUIDED EXPLORATION" : "YOUR METHOD CHOICE"}</p><h3>{modeLabel(entry.evidence.mode)} · {dateLabel(entry.evidence.completedAt)}</h3></div></div>
        <p>{fixture ? "Synthetic session fixture — not an actual backend acceptance or publication" : entry.serverRecorded ? entry.evidence.provenance.kind === "native" ? data.publication ? "V2 accepted session included in this synthetic published generation" : data.preview ? "V2 accepted session — aggregation pending; no published generation" : "Server-acknowledged session" : "Historical assessment retained in server evidence" : "Earlier assessment snapshot — not included in cumulative recorded totals"}.</p>
        {entry.evidence.originalSessionId === null && <p>The original Training session link is unknown. This record may overlap other historical work; independent-session coverage is uncertain.</p>}
        <p>Recorded/saved date: {entry.evidence.recordedAt ? dateLabel(entry.evidence.recordedAt) : "unknown"}.</p>
        <p>Methods: {[...new Set(entry.evidence.observations.map(o => getMethodName(o.methodId)))].join(", ")}.</p>
        <p>Recorded study context: {entry.studyContext.length ? entry.studyContext.join(" · ") : "not available"}.</p>
        <ul aria-label="Session method results">{entry.evidence.observations.filter(o => o.phase === "lab" && matches(o)).map(o => <li key={o.observationId}>
          <strong>{getMethodName(o.methodId)}</strong>: {performanceLabel(o)}. {[o.context.subject, o.context.topic].filter(Boolean).join(" / ") || "Subject and topic not recorded"}.
        </li>)}</ul>
        <details><summary>View session observations and details</summary>
          <ul className="cumulative-observations">{entry.evidence.observations.filter(matches).map(o => <Observation key={o.observationId} observation={o} exposure={data.exposure.get(o.observationId)?.content} />)}</ul>
          <PrivateSessionDetails entry={entry} />
        </details>
      </li>)}</ol>
      {historyLimit < history.length && <button type="button" onClick={() => setHistoryLimit(value => value + 10)}>Show 10 more history records</button>}
    </section>

    <section id="learning-progress" aria-labelledby="progress-title"><ProfileSectionTitle number="04" title="Progress Over Time" id="progress-title" description="Look for patterns in genuinely comparable tasks." />
      {progress.length === 0 ? <div className="cumulative-notice"><h3>Not enough comparable results yet.</h3><p>Your practice sessions are saved. As you complete more comparable assessments, your progress trends will appear here.</p></div>
        : <div className="cumulative-grid">{progress.map(series => <ProgressChart key={series.key} series={series} />)}</div>}
      {summary && data.coverageComplete && <p>{summary.observationCount} observations recorded</p>}
      <p>These records do not prove that a method is scientifically best for you, that a method caused improvement, or that personalization has been validated.</p>
    </section>
    </div></div>
  </main>;
}
