import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import type { ManualTrainingRecord, LegacyAssessmentRecord } from "../services/manualTrainingHistory";
import type { SavedLearningProfileView, SavedProfileHistoryItem, SavedProfileInput } from "../quiz/savedLearningProfileView";
import { getMethodName } from "../quiz/methodRegistry";
import { TaskScoreBar } from "./ProfileVisuals";

export type ManualPracticeState = SavedProfileInput & { loadMore: () => void; refresh: () => void };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "Completion time not recorded";
function PracticeRecord({ item }: { item: Extract<SavedProfileHistoryItem, { kind: "individual" }> }) {
  const { record, details, methods } = item;
  const [revealedRecord, setRevealedRecord] = useState<ManualTrainingRecord | null>(null);
  const revealed = revealedRecord === record;
  return <li className="cumulative-card" data-history-key={item.key}><span className="profile-status-pill">SAVED INDIVIDUAL PRACTICE · LEGACY</span>
    <h3>Individual Training · {record.completedAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(record.completedAt)) + " UTC" : "Completion time not recorded"}</h3>
    <p>Methods: {methods.map(getMethodName).join(", ")}. Subject and topic were not recorded by this legacy flow.</p>
    <details><summary>View individual session results</summary>
      {details.methodLab!.experiments.map(result => <div className="profile-practice-result" key={result.method}>
        <h4>{getMethodName(result.method)}</h4><TaskScoreBar label="Method Lab" score={result.score} />
        <TaskScoreBar label="Verification" score={details.methodMatch!.methods.find(m => m.method === result.method)?.verificationScore ?? null} tone="coral" />
        <p>Personal ratings (out of 5): confidence {result.confidence}, ease {result.ease}, willingness to use again {result.willingnessToUse}.</p>
      </div>)}
      <p>Introduction check: {details.methodIntroduction!.correct} / {details.methodIntroduction!.total}. Personal ratings remain separate from task accuracy.</p>
      <button type="button" aria-expanded={revealed} onClick={() => setRevealedRecord(revealed ? null : record)}>{revealed ? "Hide private reflection" : "Show private reflection"}</button>
      {revealed && <div className="cumulative-writing"><p>{details.reflection!.reflectionText || "No reflection recorded."}</p><p>Surprised by the results: {details.reflection!.surprisedByResults === null ? "Not recorded" : details.reflection!.surprisedByResults ? "Yes" : "No"}.</p></div>}
    </details></li>;
}
function AssessmentRecord({ record }: { record: LegacyAssessmentRecord }) {
  const [revealedRecord, setRevealedRecord] = useState<LegacyAssessmentRecord | null>(null), evidence = record.evidence;
  const revealed = revealedRecord === record;
  return <li className="cumulative-card" data-history-key={`assessment:${record.id}`}><span className="profile-status-pill">SAVED TEST ME ASSESSMENT · LEGACY SNAPSHOT</span>
    <h3>Test Me · {date(evidence.completedAt)}</h3>
    <p>Recorded/saved date: {evidence.recordedAt ? date(evidence.recordedAt) : "Not recorded"}. This is not substituted for a missing completion date.</p>
    <p>Original session linkage: {evidence.originalSessionId ?? "Not established in this historical record"}. Unlinked historical records may overlap other work; independent-session counts are not inferred.</p>
    <details><summary>View Test Me session results</summary>{evidence.observations.filter(o => o.phase === "lab").map(o => <div key={o.observationId} className="profile-practice-result">
      <h4>{getMethodName(o.methodId)}</h4><TaskScoreBar label="Method Lab" score={o.performance.score} />
      <TaskScoreBar label="Verification" score={evidence.observations.find(m => m.phase === "match" && m.methodId === o.methodId)?.performance.score ?? null} tone="coral" />
      <p>{[o.context.subject, o.context.topic].filter(Boolean).join(" / ") || "Subject and topic not recorded"}.</p>
    </div>)}
    {record.reflection && <><button type="button" aria-expanded={revealed} onClick={() => setRevealedRecord(revealed ? null : record)}>{revealed ? "Hide private reflection" : "Show private reflection"}</button>
      {revealed && <p className="cumulative-writing">{record.reflection.text || "No reflection recorded."}</p>}</>}
    </details></li>;
}
export default function ManualPracticeHistory({ state, view }: { state: ManualPracticeState; view: SavedLearningProfileView }) {
  const history = view.history;
  return <div className="profile-practice-history" role="region" aria-label="Saved Training history">
    {state.hasMore && <p>Load more to see earlier saved results.</p>}
    {state.loading && <p role="status">Loading Training history...</p>}
    {state.error && <p role="alert">{state.error}</p>}
    {!state.loading && !state.error && view.coverage === "complete" && history.length === 0 && <p>No saved Training results were found. Daily streak activity alone does not contain the method results.</p>}
    <ol className="cumulative-history">{history.map(item => <Fragment key={`${view.ownerUid}:${item.key}`}>
      {item.kind === "individual" ? <PracticeRecord item={item} /> : <AssessmentRecord record={item.record} />}
    </Fragment>)}</ol>
    {state.hasMore && <button type="button" disabled={state.loading} onClick={state.loadMore}>Load more Training history</button>}
    <button type="button" disabled={state.loading} onClick={state.refresh}>Refresh Training history</button><p><Link to="/training">Return to Training to recover a pending save</Link></p>
  </div>;
}
