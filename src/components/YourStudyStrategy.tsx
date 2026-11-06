import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStudyStrategyEvidence } from "../hooks/useStudyStrategyEvidence";
import { useStudyFollowThrough } from "../hooks/useStudyFollowThrough";
import { recommendEconomicsStudy } from "../quiz/economics9708/studyRecommendations";
import { economicsCoverageManifest } from "../quiz/economics9708/packs";
import { getMethodName } from "../quiz/methodRegistry";
import { isTrainingMethodId } from "../quiz/type";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import type { StudyRecommendation } from "../quiz/economics9708/studyRecommendations";
import "./YourStudyStrategy.scss";

const strength = { "repeated-recorded-errors": "Several recorded questions suggest a review",
  "limited-recorded-answers": "Limited recorded answer evidence", "task-suitability-only": "Task-based suggestion · not personalised performance evidence" };
const purpose = { "review-recorded-error": "Review this concept", "cover-unassessed-content": "Explore this part of the topic",
  consolidate: "Consolidate your understanding", "future-retention-check": "Plan a later check" };
const phase = { "baseline-post-study": "Baseline · after studying", "method-lab": "Method Lab", "method-match": "Top-two verification" };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "Completion date not recorded";
function importantLimits(r: StudyRecommendation) {
  const limits = new Set(r.limitations), messages = ["This suggests a suitable task, not your best method. Answers and study times are reported by the student; outside study is unknown."];
  if (limits.has("historical-objective-context-unavailable") || limits.has("incomplete-answer-capture-in-supplied-history")) messages.push("Some saved sessions have less answer detail. Advice uses only the details available here.");
  if (limits.has("prior-method-and-objective-exposure-carryover") || limits.has("repeated-questions-not-independent-corroboration")) messages.push("Earlier methods and familiar questions may influence later answers. Repeated attempts do not prove independent improvement.");
  if (limits.has("baseline-is-post-study")) messages.push("Baseline answers were collected after studying; they do not show what you knew beforehand.");
  if (limits.has("verification-is-top-two-selected")) messages.push("Verification checks only the selected follow-up methods, not every method equally.");
  if (limits.has("unlocalized-joint-question-errors-in-history")) messages.push("Some missed questions cover several concepts, so they cannot identify one weak concept on their own.");
  if (limits.has("completion-order-unknown")) messages.push("Some completion times are missing, so an improvement over time cannot be inferred.");
  if (limits.has("presentation-is-exposure-only")) messages.push("Seeing study material is exposure only; it does not prove it was learned.");
  return messages;
}

export default function YourStudyStrategy({ ownerUid, snapshot, refresh }: { ownerUid: string; snapshot?: CumulativeProfileSnapshot; refresh?: () => void }) {
  const id = useId(), state = useStudyStrategyEvidence(ownerUid, snapshot);
  const [topicId, setTopicId] = useState("1.5");
  const source = state.data?.strategyEvidence;
  const result = useMemo(() => source?.ownerUid === ownerUid ? recommendEconomicsStudy(ownerUid, topicId, source.rows) : null,
    [source, ownerUid, topicId]);
  const r = result?.status === "recommended" ? result.recommendation : null;
  const follow = useStudyFollowThrough(ownerUid, topicId, source, Boolean(import.meta.env.DEV && state.visible && !state.loading && r));
  if (!import.meta.env.DEV || !state.visible) return null;
  const topic = economicsCoverageManifest.find(t => t.id === topicId);
  const retry = refresh ?? state.refresh;
  return <section className="study-strategy" id="your-study-strategy" aria-labelledby={`${id}-heading`} aria-busy={state.loading}>
    <div className="study-strategy-heading"><div><p className="cumulative-eyebrow">A PRACTICAL NEXT STEP · LOCAL PREVIEW</p><h2 id={`${id}-heading`}>Your Study Strategy</h2>
      <p>Choose a whole topic. Find one useful thing to work on next.</p></div>
      <label htmlFor={`${id}-topic`}>Economics topic<select id={`${id}-topic`} value={topicId} onChange={e => setTopicId(e.target.value)}>
        {economicsCoverageManifest.map(t => <option key={t.id} value={t.id} disabled={t.status !== "playable"}>{t.title}{t.status !== "playable" ? " — not available yet" : ""}</option>)}
      </select></label></div>
    {state.loading ? <p role="status">Loading accepted learning evidence for your study strategy…</p>
      : state.error ? <div><p role="alert">Your study strategy could not be loaded safely. Your saved results have not changed.</p><button type="button" onClick={retry}>Retry study strategy</button></div>
        : !source || source.ownerUid !== ownerUid ? <div><p role="status">{state.data?.publication?.pendingSessions
          ? "Your accepted sessions are waiting for profile preparation. Evidence-based advice is not available from those pending sessions yet."
          : "Study advice from accepted answer evidence is not available for this profile yet. Your saved Test Me and individual practice remain in your history."}</p>
          <p>Older browser-saved reports are not treated as accepted evidence. You can still choose a topic and explore Training.</p></div>
          : !r ? <div><p role="status">There isn’t enough trustworthy, compatible evidence to suggest a study strategy for this topic.</p><p>Keep your saved results and try refreshing. No method or session has been changed.</p><button type="button" onClick={retry}>Retry study strategy</button></div>
            : <>
              <p className="study-strategy-source">{source.scope === "published-generation" ? "Based on the displayed local synthetic profile generation. This is not a verified real-student publication." : "Based on accepted records from the local demo account. Acceptance is separate from profile publication."}</p>
              {source.pendingAcceptedSessions > 0 && <p className="study-strategy-notice">Newer accepted sessions are still awaiting profile preparation and are not included in this advice.</p>}
              {source.legacyReportsExcluded && <p className="study-strategy-notice">Older saved reports do not contain accepted answer evidence. This suggestion uses topic suitability, not those legacy scores.</p>}
              <div className="study-strategy-grid"><article><p className="cumulative-eyebrow">{purpose[r.purpose]}</p><h3>{r.objectiveLabel}</h3>
                <p className="study-strategy-method">Try <strong>{getMethodName(r.methodId)}</strong></p><p>{r.action}</p>
                <details className="profile-card-details"><summary>How to use {getMethodName(r.methodId)}</summary><ol>{r.contentSuggestion.canonicalHow.map((step, i) => <li key={i}>{step}</li>)}</ol></details>
              </article><aside aria-label="Why this study strategy fits"><span className="profile-status-pill">{strength[r.evidenceStrength]}</span><h3>Why this fits the task</h3><p>{r.explanation}</p>
                <p>No full-topic mastery or learning gain is inferred from these tasks.</p></aside></div>
              <p>{importantLimits(r)[0]}</p>
              {(r.limitations.includes("prior-method-and-objective-exposure-carryover") || r.limitations.includes("repeated-questions-not-independent-corroboration")) &&
                <p className="study-strategy-notice">Earlier methods and familiar questions may influence these answers. Repeated attempts do not prove independent improvement.</p>}
              <details className="profile-card-details study-strategy-details"><summary>Evidence and things to keep in mind</summary>
                <ul>{importantLimits(r).map(message => <li key={message}>{message}</li>)}</ul>
                {r.evidenceReferences.length ? <><h3>Recorded tasks supporting this advice</h3><ul>{r.evidenceReferences.map((ref, i) => <li key={i}>
                  {phase[ref.stage]}{isTrainingMethodId(ref.methodId) ? ` · ${getMethodName(ref.methodId)}` : ""} · {date(ref.completedAt)} · {ref.role === "scored" ? ref.correct ? "Recorded correct answer" : "Recorded incorrect answer" : "Practice response, separate from scored assessment"}.
                </li>)}</ul>{r.referencesTruncated && <p>Showing selected supporting tasks; more recorded responses were considered.</p>}</>
                  : <p>No scored answer evidence supports a personal conclusion for this focus. This is a topic-based study suggestion.</p>}
              </details>
              {follow.value && follow.report && <aside className="study-strategy-follow" aria-label="Recommendation follow-through">
                <h3>Since an earlier suggestion</h3>
                <p>Comparison focus: {follow.value.observation.recommendation.objectiveLabel}. Suggested method: {getMethodName(follow.value.observation.recommendation.methodId)}.</p>
                <p>Suggestion shown: observed in this browser session. Training page opened: {follow.value.trainingOpenedAt ? "observed" : "not observed here"}. Opening Training alone does not show that a method was attempted.</p>
                {follow.report.status !== "evaluated" ? <p>Follow-through could not be established from this snapshot. No conclusion about your study activity was made.</p>
                  : <>
                    <p>{follow.report.evidenceChange === "none" ? "No newly visible accepted Training evidence for this comparison yet."
                      : `${follow.report.newlyVisibleRecords} accepted session record${follow.report.newlyVisibleRecords === 1 ? " is" : "s are"} newly visible since this comparison's evidence snapshot. The advice above has been reassessed.`}</p>
                    {follow.report.newlyVisibleRecords > 0 && <ul>
                      <li>Suggested method attempt: {follow.report.methodAttempt === "reported" ? "reported in the new activity details" : "not established by the available activity details"}.</li>
                      <li>Focus concept assessed: {follow.report.targetAssessment === "recorded" ? "a scored answer is recorded" : "not established by the available answer details"}.</li>
                      <li>New task performance: {follow.report.newPerformance === "recorded" ? "recorded; this does not establish improvement" : "not established"}.</li>
                      {follow.report.matchingActivity === "reported-sequence-consistent" && <li>A later reported activity matches this topic, method and assessed concept. This is consistent with the suggestion, not proof it was followed or caused a change.</li>}
                      {(follow.report.otherMethodsObserved || follow.report.otherObjectivesObserved || follow.report.otherTopicsObserved) && <li>Other methods, concepts or topics also appear. This does not mean the suggestion was ignored.</li>}
                      {follow.report.previouslyAcceptedNowVisible > 0 && <li>Some records were already accepted before this comparison and only became visible now; they are not follow-through evidence.</li>}
                      {(follow.report.acceptanceOrderUnknown > 0 || follow.report.limitations.includes("missing-objective-context-or-session-start")) && <li>Missing context or timing makes the sequence inconclusive.</li>}
                      {follow.report.limitations.includes("session-not-reported-after-local-display") && <li>Some sessions reportedly started before or at this suggestion; they do not establish follow-through.</li>}
                      {follow.report.limitations.includes("local-display-time-inconsistent-with-known-completion") && <li>The local display time and reported completion times do not establish a reliable sequence.</li>}
                      {follow.report.limitations.includes("familiar-questions-not-independent-improvement") && <li>Familiar questions were repeated. Those responses are not independent evidence of improvement.</li>}
                    </ul>}
                  </>}
                <p>This local comparison is kept in memory across navigation, not as a saved recommendation receipt. Reloading, closing the tab or signing out resets it. Changing topics starts a new comparison. Outside study and the student's intent remain unknown.</p>
              </aside>}
            </>}
    <div className="study-strategy-actions"><Link className="profile-primary-action" to="/training" onClick={follow.openTraining}>Open Training</Link>
      {state.local && <button className="profile-refresh" type="button" disabled={state.loading} onClick={retry}>Refresh study strategy</button>}
      <p>Choose {topic?.title ?? "your topic"} in Training. The method is a suggestion: your saved session, method allocation and normal access checks stay unchanged.</p></div>
  </section>;
}
