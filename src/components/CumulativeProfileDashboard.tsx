import { useState } from "react";
import { Link } from "react-router-dom";
import { getMethodName } from "../quiz/methodRegistry";
import { observationConditions } from "../quiz/cumulativeProfileView";
import type { HistoryEntry, ProgressSeries } from "../quiz/cumulativeProfileView";
import type { LearningObservation } from "../quiz/learningEvidence";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import "./CumulativeProfile.scss";

const dateLabel = (value: string | null) => value === null ? "Completion date unknown" :
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
const modeLabel = (mode: "auto" | "manual") => mode === "auto" ? "Test Me" : "Test Methods";
const phaseLabel = (phase: "lab" | "match") => phase === "lab" ? "Lab practice" : "Match verification";
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

function ProgressChart({ series }: { series: ProgressSeries }) {
  const title = `${getMethodName(series.methodId)} — ${phaseLabel(series.group.phase)}`;
  const comparisonContext = [
    series.group.context.subject === null ? "Subject not recorded" : `Subject: ${series.group.context.subject}`,
    series.group.context.topic === null ? "Topic not recorded" : `Topic: ${series.group.context.topic}`,
    series.group.source === "test-methods" ? "Test Methods" : "Test Me"
  ].join("; ");
  const accessibleTitle = `${title} — ${comparisonContext}`;
  const points = series.points.map((p, i) => `${40 + i / (series.points.length - 1) * 520},${190 - p.score * 160}`).join(" ");
  return <article className="cumulative-card">
    <h3>{title}</h3>
    <p>{series.group.context.subject} / {series.group.context.topic}. {series.group.context.exerciseTopic ?? "Exercise objective not recorded"}.</p>
    <p>{series.group.exposure.content === "repeated" ? "Repeated content" : "First known content"}; same recorded scoring and question conditions. Points are observations in date order, equally spaced—not elapsed time.</p>
    <svg viewBox="0 0 600 230" role="img" aria-label={`${accessibleTitle}: recorded task accuracy over time. Exact values follow in the table.`}>
      <line x1="40" y1="30" x2="40" y2="190" /><line x1="40" y1="190" x2="570" y2="190" />
      <text x="0" y="35">100%</text><text x="14" y="194">0%</text>
      <polyline points={points} fill="none" className="cumulative-trend" />
      {series.points.map((p, i) => <circle key={p.date} cx={40 + i / (series.points.length - 1) * 520} cy={190 - p.score * 160} r="5" />)}
    </svg>
    <div className="cumulative-table-wrap"><table><caption>{accessibleTitle}: exact recorded observations</caption>
      <thead><tr><th scope="col">Completion date</th><th scope="col">Correct / questions</th><th scope="col">Task accuracy</th></tr></thead>
      <tbody>{series.points.map(p => <tr key={p.date}><th scope="row">{dateLabel(p.date)}</th><td>{p.correct} / {p.total}</td><td>{Math.round(p.score * 100)}%</td></tr>)}</tbody>
    </table></div>
    <p>This describes these tasks only. It does not show that a learning method caused a change.</p>
  </article>;
}

export default function CumulativeProfileDashboard({ data, refresh }: { data: CumulativeProfileSnapshot; refresh: () => void }) {
  const [historyLimit, setHistoryLimit] = useState(10);
  const [methodOpen, setMethodOpen] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const choice = (value: string | null) => value === null ? "unknown" : `value:${value}`;
  const matches = (o: { context: { subject: string | null; topic: string | null } }) =>
    (!subject || choice(o.context.subject) === subject) && (!topic || choice(o.context.topic) === topic);
  const allObservations = data.history.flatMap(entry => entry.evidence.observations);
  const subjects = [...new Set(allObservations.map(o => o.context.subject))].sort();
  const topics = [...new Set(allObservations.filter(o => !subject || choice(o.context.subject) === subject).map(o => o.context.topic))].sort();
  const filtered = Boolean(subject || topic);
  const history = data.history.filter(entry => !filtered || entry.evidence.observations.some(matches));
  const progress = data.progress.filter(series => matches(series.group));
  const resetDisplay = () => { setHistoryLimit(10); setMethodOpen(null); };
  const summary = data.summary;
  const fixture = data.preview?.source === "synthetic-fixture";
  const completionLabel = data.latestKnownCompletion !== null ? dateLabel(data.latestKnownCompletion)
    : data.history.some(item => item.serverRecorded) ? "Completion date unknown"
      : summary && summary.sessionCount > 0 ? "Completion dates unavailable in readable evidence" : "No server-recorded sessions";
  return <main className="cumulative-profile" id="cumulative-profile-main" tabIndex={-1}>
    <header className="cumulative-hero">
      <p className="cumulative-eyebrow">LOCAL DEMO · LEARNING EVIDENCE</p>
      <h1>Your learning, over time</h1>
      <p>A record of what you tested—not a verdict on how you learn best.</p>
      <div className="cumulative-actions"><button type="button" onClick={refresh}>Refresh recorded evidence</button>
        <Link to="/training/profile?view=latest">View latest assessment snapshot</Link><Link to="/training">Back to Training</Link></div>
    </header>
    <nav aria-label="Learning profile sections"><a href="#learning-overview">Overview</a><a href="#method-evidence">Method evidence</a><a href="#learning-history">History</a><a href="#learning-progress">Progress</a></nav>

    <section id="learning-overview" aria-labelledby="overview-title">
      <h2 id="overview-title">Learning Overview</h2>
      {data.publication && <aside className="cumulative-notice" aria-label="Synthetic publication status">
        <h3>Synthetic Emulator pipeline</h3>
        <p>Demo publication: <strong>{data.publication.publication === "published" ? "Published synthetic generation" : "Not published"}</strong>.
          Production authority and admission: <strong>NOT VERIFIED</strong>. This is not a real student publication.</p>
        <p>{data.publication.acceptedSessions} durably accepted sessions; {data.publication.publishedSessions} included in the published generation;
          {" "}{data.publication.pendingSessions} awaiting aggregation/publication.</p>
        <p>Figures and history below belong to the published generation only. Acceptance revisions are not profile revisions.</p>
      </aside>}
      {data.preview && <aside className="cumulative-notice" aria-label="Acceptance and publication status">
        <h3>Accepted evidence preview</h3>
        <p>Published profile generation: <strong>Not published</strong>. Trusted admission: <strong>NOT VERIFIED</strong>.</p>
        <p>{fixture ? "Synthetic fixture results only: these are not real accepted sessions, and no aggregation job or publication was created." : data.preview.aggregation === "pending" ? "Aggregation and publication are pending. This read-only demo preview is calculated from readable V2 accepted evidence; it is not a published profile."
          : "Aggregation status is unavailable because some evidence could not be validated. Preview totals and charts are withheld."}</p>
        <p>An accepted receipt confirms durable saving only. Its acceptance revision is not a profile revision. Counts cover this bounded readable demo history, not an independently verified inventory.</p>
      </aside>}
      {!summary && <p className="cumulative-notice">No server-recorded cumulative profile yet. Complete Training in the local demo to start recording evidence. Earlier assessment snapshots, if available, are listed separately below.</p>}
      <dl className="cumulative-metrics">
        <div><dt>{fixture ? "Synthetic session fixtures (not saved)" : data.preview ? "Accepted Training sessions (readable demo history)" : "Recorded completed sessions"}</dt><dd>{summary?.sessionCount ?? "Not available"}</dd></div>
        <div><dt>Distinct methods tested</dt><dd>{summary?.methods.length ?? "Not available"}</dd></div>
        <div><dt>Test Me sessions</dt><dd>{data.automaticSessions ?? "Coverage incomplete"}</dd></div>
        <div><dt>Test Methods sessions</dt><dd>{data.manualSessions ?? "Coverage incomplete"}</dd></div>
      </dl>
      <p>{fixture ? "Latest synthetic completion" : "Latest server-recorded completion (readable evidence)"}: <strong>{fixture && data.history.length === 0 ? "No synthetic sessions" : completionLabel}</strong>.</p>
      {data.unknownCompletionCount > 0 && <p>{data.unknownCompletionCount} recorded session(s) have no known completion date; they cannot be placed reliably on a timeline.</p>}
      {summary && <p>{summary.observationCount} recorded observations. {summary.independentSessionCount} session identities are established; {summary.unknownIndependenceSessionCount} have uncertain historical independence.</p>}
      <aside className="cumulative-notice" aria-label="Evidence coverage">
        <h3>What this evidence can tell you</h3>
        <p>Results describe the tasks you completed. They are student-reported, not independently verified measurements. A backend acknowledgment confirms saving, not the truth of a score. Prior learning outside this history is unknown.</p>
        {summary && (summary.retention.observationsNotEmbedded > 0 || summary.retention.performanceGroupsNotEmbedded > 0) && <p>The {data.preview ? "local preview" : "server summary"} is a bounded sample: {summary.retention.observationsNotEmbedded} observations and {summary.retention.performanceGroupsNotEmbedded} comparison groups are not embedded in it. Original evidence is retained separately.</p>}
        {data.warnings.map(message => <p key={message}>{message}</p>)}
      </aside>
      <aside className="cumulative-card" aria-label="Browser completion status"><h3>Completed work on this browser</h3>
        {fixture ? <p>Browser completion storage is not inspected in fixture mode. Sign in to an isolated demo account to inspect its recovery checkpoints.</p>
          : !data.browserStorageVerified ? <p>Browser recovery storage could not be verified. There may be unsent work; do not clear browser data.</p>
          : data.pending.length === 0 ? <p>No pending completion checkpoints were found for this account on this browser.</p>
            : <ul>{data.pending.map(item => <li key={item.sessionId}>{item.acknowledged ? "Backend acknowledgment saved; activity or cleanup is pending."
              : item.legacy ? "Browser checkpoint saved; this older session uses the legacy saving flow, not cumulative submission."
                : "Browser checkpoint saved; backend acknowledgment is not confirmed."}</li>)}</ul>}
        <p>Browser-only checkpoints are not added to the recorded totals. Clearing browser data, storage eviction or losing this device may destroy unacknowledged work. Return to Training to recover it.</p>
      </aside>
    </section>

    <form className="cumulative-filters" aria-label="Evidence context filters" onSubmit={event => event.preventDefault()}>
      <label>Subject<select value={subject} onChange={event => { setSubject(event.target.value); setTopic(""); resetDisplay(); }}>
        <option value="">All subjects</option>{subjects.map(value => <option key={choice(value)} value={choice(value)}>{value ?? "Subject not recorded"}</option>)}
      </select></label>
      <label>Topic<select value={topic} onChange={event => { setTopic(event.target.value); resetDisplay(); }}>
        <option value="">All topics</option>{topics.map(value => <option key={choice(value)} value={choice(value)}>{value ?? "Topic not recorded"}</option>)}
      </select></label>
      <button type="button" disabled={!filtered} onClick={() => { setSubject(""); setTopic(""); resetDisplay(); }}>Clear filters</button>
      <p>Overview totals cover all readable history. Filters narrow method details, history and comparable progress; unknown context stays unknown.</p>
    </form>

    <section id="method-evidence" aria-labelledby="methods-title"><h2 id="methods-title">Study Method Evidence</h2>
      <p>No overall effectiveness score or best-method ranking is inferred. Different tasks and conditions stay separate.</p>
      {!summary?.methods.length && <p>No cumulative method evidence is available yet.</p>}
      <div className="cumulative-grid">{summary?.methods.filter(method => !filtered || history.some(entry => entry.evidence.observations.some(o => o.methodId === method.methodId && matches(o)))).map(method => {
        const coverage = data.methodCoverage.get(method.methodId) ?? "incomplete";
        const observations = history.filter(item => item.serverRecorded).flatMap(item => item.evidence.observations).filter(o => o.methodId === method.methodId && matches(o));
        const topics = [...new Set(observations.flatMap(o => [o.context.subject, o.context.topic].filter((v): v is string => v !== null)))];
        return <article className="cumulative-card" key={method.methodId}><h3>{getMethodName(method.methodId)}</h3>
          {coverage === "contradictory" ? <p>Method summary figures are withheld because they contradict the recorded evidence. Original readable observations remain available below.</p>
            : <>
              {coverage === "incomplete" && <p>Readable method coverage is incomplete. These figures are from the {data.preview ? "local preview" : "server summary"} and have not been fully reconciled with the available details.</p>}
              <p>{method.sessionCount} recorded session(s) · {method.observationCount} observations. A Lab and a Match can be two observations of one session—not two independent attempts.</p>
              {filtered && <p>In this context: {new Set(observations.map(o => o.sessionId)).size} session(s), {observations.length} observations. Method totals above cover all contexts.</p>}
            </>}
          <p>{topics.length ? topics.join(" · ") : "Subjects and topics not recorded in the available details."}</p>
          {coverage !== "contradictory" && <p>{method.knownContentExposureCount} known versioned content exposure(s); {method.unknownContentObservationCount} observations have unknown content identity/version.</p>}
          <p>{coverage === "contradictory" ? "Progress is unavailable until the summary discrepancy is reviewed." : data.progress.some(p => p.methodId === method.methodId) ? "A comparable set is available in Progress Over Time."
            : summary.retention.performanceGroupsNotEmbedded > 0 ? "No comparable chart is available in this bounded projection. Original observations remain below." : "More comparable learning sessions are needed to assess progress."}</p>
          {coverage !== "contradictory" && <p>{method.unpooledObservationCount} observation(s) lack the conditions needed for pooled comparison. {method.unknownIndependenceSessionCount} session(s) have uncertain independence.</p>}
          <button type="button" aria-expanded={methodOpen === method.methodId} onClick={() => setMethodOpen(methodOpen === method.methodId ? null : method.methodId)}>{methodOpen === method.methodId ? "Hide" : "View"} {getMethodName(method.methodId)} records</button>
          {methodOpen === method.methodId && (observations.length ? <ul className="cumulative-observations">{observations.map(o => <Observation key={o.observationId} observation={o} exposure={data.exposure.get(o.observationId)?.content} />)}</ul> : <p>Detailed records are unavailable; the summary was not replaced with invented results.</p>)}
        </article>;
      })}</div>
    </section>

    <section id="learning-history" aria-labelledby="history-title"><h2 id="history-title">Learning History</h2>
      <p>Known completion dates appear newest first (UTC). Unknown dates appear last. Save dates do not stand in for completion dates.</p>
      {data.history.length === 0 && <p>No readable completed history yet.</p>}
      {data.history.length > 0 && history.length === 0 && <p>No recorded sessions match these filters.</p>}
      <p role="status">Showing {Math.min(historyLimit, history.length)} of {history.length} readable history records{filtered ? " matching these filters" : ""}.</p>
      <ol className="cumulative-history">{history.slice(0, historyLimit).map(entry => <li className="cumulative-card" key={entry.evidence.sessionId}>
        <h3>{modeLabel(entry.evidence.mode)} · {dateLabel(entry.evidence.completedAt)}</h3>
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

    <section id="learning-progress" aria-labelledby="progress-title"><h2 id="progress-title">Progress Over Time</h2>
      <p>Charts require the same method, subject, topic, content version, scoring version, actual questions, difficulty, answer choices and known exposure conditions, with distinct known completion dates in separate sessions. Lab, Match and Manual sources are not pooled.</p>
      {progress.length === 0 ? <div className="cumulative-notice"><p>{summary && summary.retention.performanceGroupsNotEmbedded > 0 ? "Comparison groups are omitted from this bounded projection. No chart is available here; this does not establish an absence of progress."
        : filtered && data.progress.length > 0 ? "No comparable chart matches these context filters." : "More comparable learning sessions are needed to assess progress."}</p><p>Scores from different or unknown conditions are shown as separate records above; an improvement trend cannot be concluded.</p></div>
        : <div className="cumulative-grid">{progress.map(series => <ProgressChart key={series.key} series={series} />)}</div>}
      <p>These records do not prove that a method is scientifically best for you, that a method caused improvement, or that personalization has been validated.</p>
    </section>
  </main>;
}
