import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LearningProfile } from "../quiz/type";
import { getMethodName } from "../quiz/methodRegistry";
import { ProfileIcon, ProfileRail, ProfileSectionTitle, TaskScoreBar, validTaskScore } from "./ProfileVisuals";
import "./CumulativeProfile.scss";
import ManualPracticeHistory from "./ManualPracticeHistory";
import type { ManualPracticeState } from "./ManualPracticeHistory";
import { buildSavedLearningProfileView } from "../quiz/savedLearningProfileView";
import type { SavedMethodAttempt } from "../quiz/savedLearningProfileView";

const completionLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "Completion time not recorded";
function RecordedAttempt({ attempt }: { attempt: SavedMethodAttempt }) {
  const individual = attempt.source === "individual";
  return <li className="profile-practice-result" data-history-key={attempt.historyKey}>
    <p><strong>{individual ? "Legacy individual practice" : "Saved Test Me assessment"}</strong> · {completionLabel(attempt.completedAt)}</p>
    <p>{[attempt.subject, attempt.topic].filter(Boolean).join(" / ") || "Subject and topic not recorded"}.</p>
    {attempt.lab && <TaskScoreBar label={individual ? "Individual practice task" : "Test Me Lab task"} score={attempt.lab.score} />}
    {attempt.verification && <TaskScoreBar label={individual ? "Individual follow-up task (legacy)" : "Test Me verification task"} score={attempt.verification.score} tone="coral" />}
    <p>Separate recorded task results; not an averaged method score or verified V2 evidence.</p>
  </li>;
}

/** One owner-scoped read model; the latest snapshot never stands in for all history. */
export default function LatestProfileDashboard({ profile, cumulativeAvailable, manual, ownerUid = manual?.uid ?? null }: { profile: LearningProfile | null; cumulativeAvailable: boolean; manual?: ManualPracticeState; ownerUid?: string | null }) {
  const [active, setActive] = useState("learning-overview");
  const view = useMemo(() => buildSavedLearningProfileView(ownerUid, profile, manual),
    [ownerUid, profile, manual?.ownerUid, manual?.uid, manual?.records, manual?.assessments, manual?.loading, manual?.error, manual?.hasMore]);
  const baseline = (score: number) => validTaskScore(score) ? `${Math.round(score * 100)}%` : "Not recorded";
  const rating = (value: number) => Number.isInteger(value) && value >= 1 && value <= 5 ? `${value}/5` : "Not recorded";
  return <main className="cumulative-profile profile-latest" id="cumulative-profile-main" tabIndex={-1}>
    <div className="profile-layout"><ProfileRail active={active} onSelect={setActive} /><div className="profile-content">
      <header className="cumulative-hero"><div><p className="cumulative-eyebrow">YOUR LEARNING PROFILE</p><h1>Your Learning Profile</h1><p>Explore your results. Build a study toolkit that works for the task.</p></div>
        <Link className="profile-primary-action" to="/training/assessment">Try another assessment <ProfileIcon name="arrow" /></Link></header>
      <div className="profile-scope-banner"><span className="profile-status-pill">{profile ? "Latest assessment & Training history" : "Saved Training history"}</span><p>{profile ? "This is your latest saved Test Me snapshot, not your complete Training history." : "Your saved Test Me and Test Method records are shown below. No latest Test Me summary has been recorded."} Cumulative publication is not enabled for genuine accounts. Individual practice does not replace your Test Me snapshot.</p>
        {cumulativeAvailable && <Link to="/training/profile">View cumulative learning evidence →</Link>}</div>

      <section id="learning-overview" aria-labelledby="latest-overview-title">
        <ProfileSectionTitle number="01" title="Learning Overview" id="latest-overview-title" description="Your saved practice and latest Test Me snapshot, with their scopes kept clear." />
        <dl className="cumulative-metrics">
          <div><dt>Saved Test Me assessments (loaded) <ProfileIcon name="book" /></dt><dd>{view.coverage === "unavailable" ? "Not loaded" : view.counts.testMeRecords}</dd></div>
          <div><dt>Individual practice sessions (loaded) <ProfileIcon name="history" /></dt><dd>{view.coverage === "unavailable" ? "Not loaded" : view.counts.individualSessions}</dd></div>
          <div><dt>Methods in latest Test Me snapshot <ProfileIcon name="methods" /></dt><dd>{profile ? view.counts.latestSnapshotMethods : "Not recorded"}</dd></div>
          <div><dt>Task observations in loaded history <ProfileIcon name="progress" /></dt><dd>{view.coverage === "unavailable" ? "Not loaded" : view.counts.observations}</dd></div>
        </dl>
        {view.coverage === "loading" && <p>Saved history is still loading.</p>}
        {view.coverage === "partial" && <p>Some saved history is not shown yet.</p>}
        {view.warnings.map(message => <p key={message} role="alert">{message}</p>)}
        {profile && <div className="profile-discovery-grid"><article className="profile-discovery"><span className="profile-status-pill">OBSERVED IN THIS ASSESSMENT</span>
          <h2>{profile.strongestVerifiedMethod ? getMethodName(profile.strongestVerifiedMethod) : "Keep collecting evidence"}</h2>
          <p>{profile.strongestVerifiedMethod ? "This method had the strongest combined result in your saved assessment. It is a finding from these tasks, not proof of your best method." : "No verified method result was available in this snapshot."}</p></article>
          <article className="profile-preference"><span className="profile-status-pill">YOUR PERSONAL PREFERENCE</span><h2>{profile.preferredMethod ? getMethodName(profile.preferredMethod) : "No clear preference"}</h2>
            <p>Your choice is kept separate from task performance. What feels practical matters too.</p></article></div>}
      </section>

      <section id="method-evidence" aria-labelledby="latest-methods-title">
        <ProfileSectionTitle number="02" title="Study Method Evidence" id="latest-methods-title" description="Your original task results, with your personal ratings kept separate." />
        <p>The same saved records appear here and in Learning History. One individual practice session is one attempt per method; a follow-up task is another observation, not another practice attempt. Scores are not pooled across tasks.</p>
        <div className="cumulative-grid profile-method-grid">{view.methods.map((method, index) => <article className="cumulative-card profile-method-card" key={method.methodId} aria-label={`${getMethodName(method.methodId)} evidence`}>
          <div className="profile-method-heading"><span className={`profile-method-glyph tone-${index % 4}`}><ProfileIcon name="methods" /></span><span className="profile-status-pill">Source-labeled evidence</span></div>
          <h3>{getMethodName(method.methodId)}</h3>
          {method.latestSnapshot && <div className="profile-method-source" aria-label="Latest Test Me snapshot results">
            <h4>Latest Test Me snapshot</h4><p>One snapshot reference, not an extra saved session.</p>
            <TaskScoreBar label="Method Lab" score={method.latestSnapshot.labScore} /><TaskScoreBar label="Verification" score={method.latestSnapshot.verificationScore} tone="coral" />
            <details className="profile-card-details"><summary>Your ratings & context</summary><p>Self-reported confidence: {rating(method.latestSnapshot.labConfidence)} · ease: {rating(method.latestSnapshot.ease)} · willingness to use again: {rating(method.latestSnapshot.willingnessToUse)}.</p><p>These ratings are not objective performance. Different or unknown task conditions are not evidence that one method is better.</p></details>
          </div>}
          {method.individual.length > 0 && <details className="profile-card-details">
            <summary>{method.individual.length} saved individual practice session{method.individual.length === 1 ? "" : "s"}</summary>
            <div className="profile-method-source" role="region" aria-label="Legacy individual practice results">
              <h4>Individual practice · legacy</h4><p>{method.individual.length} individual practice attempt{method.individual.length === 1 ? "" : "s"} · {method.individual.length} saved session{method.individual.length === 1 ? "" : "s"} (loaded).</p>
              <p>{method.individualObservationCount} recorded task observations. Practice and follow-up tasks stay separate.</p>
              <ul className="profile-practice-attempts">{method.individual.map(attempt => <RecordedAttempt key={attempt.key} attempt={attempt} />)}</ul>
            </div>
          </details>}
          {method.assessments.length > 0 && <details className="profile-card-details"><summary>{method.assessments.length} saved Test Me assessment record{method.assessments.length === 1 ? "" : "s"} (loaded)</summary>
            <p>{method.assessmentObservationCount} recorded Test Me task observations; the latest snapshot is not another attempt.</p>
            <ul className="profile-practice-attempts">{method.assessments.map(attempt => <RecordedAttempt key={attempt.key} attempt={attempt} />)}</ul>
          </details>}
        </article>)}</div>
        {view.methods.length === 0 && <div className="profile-empty-panel"><ProfileIcon name="methods" /><h3>No readable method results yet</h3><p>{view.coverage === "loading" ? "Saved practice is still loading." : "Load saved history or complete Training to see available evidence."}</p></div>}
        {profile && profile.recommendedMethods.length > 0 && <aside className="profile-next-step"><div><p className="cumulative-eyebrow">WORTH EXPLORING NEXT</p><h3>Your saved starting suggestions</h3><p>{profile.recommendedMethods.map(getMethodName).join(" · ")}</p></div><Link to="/training">Try a method <ProfileIcon name="arrow" /></Link></aside>}
      </section>

      <section id="learning-history" aria-labelledby="latest-history-title">
        <ProfileSectionTitle number="03" title="Learning History" id="latest-history-title" description="Your available Test Me and individual practice history appears here. Some older records may contain less detail." />
        {profile && <div className="cumulative-card"><span className="profile-status-pill">LATEST SAVED SNAPSHOT · NOT AN ADDITIONAL HISTORY EVENT</span><h3>Test Me assessment</h3>
          <details className="profile-snapshot-details"><summary>View saved assessment details</summary><p>Memory baseline: {baseline(profile.baseline.memoryScore)}. Understanding baseline: {baseline(profile.baseline.understandingScore)}.</p><p>Methods with verification in latest snapshot: {view.counts.latestSnapshotVerified}.</p><p>Method understanding check: {baseline(profile.methodKnowledgeScore)}.</p><p>Your stated priority: {profile.priority === "realistic-use" ? "Realistic everyday use" : profile.priority === "ease" ? "Ease of use" : profile.priority === "confidence" ? "Confidence" : profile.priority === "performance" ? "Performance" : "Not recorded"}.</p></details></div>}
        {manual && <ManualPracticeHistory state={manual} view={view} />}
      </section>
      <section id="learning-progress" aria-labelledby="latest-progress-title">
        <ProfileSectionTitle number="04" title="Progress Over Time" id="latest-progress-title" description="" />
        <div className="profile-empty-panel"><ProfileIcon name="progress" /><h3>Not enough comparable results yet.</h3><p>Your practice sessions are saved. As you complete more comparable assessments, your progress trends will appear here.</p><Link to="/training">Keep exploring <ProfileIcon name="arrow" /></Link></div>
        {view.coverage === "complete" && <p>{view.counts.observations} observations recorded</p>}
      </section>
    </div></div>
  </main>;
}
