import { useId, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useStudyStrategyEvidence } from "../hooks/useStudyStrategyEvidence";
import { recommendEconomicsStudy } from "../quiz/economics9708/studyRecommendations";
import { supportedEconomicsMethods } from "../quiz/economics9708/runtime";
import { economicsCoverageManifest } from "../quiz/economics9708/packs";
import { getMethodName } from "../quiz/methodRegistry";
import { studyTrainingGuidanceEnabled, studyTrainingTopic } from "../services/studyTrainingGuidance";
import { clearStudyMethodSuggestion, rememberStudyMethodSuggestion } from "../services/studyFollowThroughSession";
import "./TrainingStudyGuidance.scss";

/** Isolated advisory UI only. A refreshed topic hint has no remembered consent
 * or method. Authentication and the existing verified reader supply the advice. */
export default function TrainingStudyGuidance({ uid, hasDraft, disabled, selectedTopic, onUse }: {
  uid: string; hasDraft: boolean; disabled: boolean; selectedTopic: string; onUse: (topic: string) => void;
}) {
  const location = useLocation();
  const topic = studyTrainingTopic(location.search);
  return studyTrainingGuidanceEnabled() && topic && auth.currentUser?.uid === uid
    ? <OwnedGuidance key={`${uid}:${topic}`} uid={uid} topic={topic} hasDraft={hasDraft} disabled={disabled} selectedTopic={selectedTopic} onUse={onUse} /> : null;
}

function OwnedGuidance({ uid, topic, hasDraft, disabled, selectedTopic, onUse }: {
  uid: string; topic: string; hasDraft: boolean; disabled: boolean; selectedTopic: string; onUse: (topic: string) => void;
}) {
  const owner = auth.currentUser, id = useId(), location = useLocation(), navigate = useNavigate();
  const state = useStudyStrategyEvidence(uid);
  const source = state.data?.strategyEvidence;
  const result = useMemo(() => source?.ownerUid === uid ? recommendEconomicsStudy(uid, topic, source.rows) : null, [source, uid, topic]);
  const recommendation = result?.status === "recommended" && supportedEconomicsMethods().includes(result.recommendation.methodId)
    ? result.recommendation : null;
  const [decision, setDecision] = useState<{ owner: typeof owner; source: typeof source } | null>(null);
  // Invalidate at commit, before the card becomes actionable: a delayed passive
  // reset must not erase a hint just recorded by a fast click. Navigation
  // unmount deliberately retains the short-lived hint for the picker.
  useLayoutEffect(() => { clearStudyMethodSuggestion(owner); }, [owner, source]);
  if (!state.visible || owner?.uid !== uid) return null;
  const applied = decision?.owner === owner && decision.source === source && selectedTopic === topic;
  const dismiss = () => {
    if (auth.currentUser !== owner) return;
    clearStudyMethodSuggestion(owner);
    const search = new URLSearchParams(location.search); search.delete("studyTopic");
    navigate({ pathname: location.pathname, search: search.size ? `?${search}` : "", hash: location.hash }, { replace: true, state: location.state });
  };
  return <section className="training-resume-card training-study-guidance" aria-labelledby={`${id}-heading`} aria-busy={state.loading}>
    <p>LOCAL DEMO · OPTIONAL PROFILE GUIDANCE</p>
    <h2 id={`${id}-heading`}>A next step from your Learning Profile</h2>
    <p>Suggested whole topic: <strong>{economicsCoverageManifest.find(t => t.id === topic)?.title}</strong></p>
    {state.loading ? <p role="status">Checking your current accepted learning evidence…</p>
      : state.error ? <><p role="alert">Study guidance could not be checked safely. You can continue normal Training.</p><button type="button" onClick={state.refresh}>Retry guidance</button></>
        : !recommendation ? <p>Accepted evidence for this guidance is unavailable or incompatible. Choose your topic and continue normally; older browser reports are not treated as accepted evidence.</p>
          : <>
            <h3>{recommendation.objectiveLabel}</h3>
            <p>Suggested method: <strong>{getMethodName(recommendation.methodId)}</strong></p>
            <p>{recommendation.action}</p>
            <h3>Why this fits the task</h3><p>{recommendation.explanation}</p>
            <p>{recommendation.evidenceStrength === "task-suitability-only" ? "Task-based suggestion · not personalised performance evidence"
              : recommendation.evidenceStrength === "repeated-recorded-errors" ? "Several recorded questions suggest a review" : "Limited recorded answer evidence"}</p>
            <details><summary>Evidence and limitations</summary>
              <p>This is a suitable practice task, not your best method or proof of improvement. Student-reported answers, earlier methods, familiar questions and outside study limit what can be concluded. Baseline is after studying.</p>
              {(source?.legacyReportsExcluded || recommendation.limitations.includes("historical-objective-context-unavailable") || recommendation.limitations.includes("incomplete-answer-capture-in-supplied-history")) &&
                <p>Some records lack accepted answer detail; missing details do not establish personal method effectiveness.</p>}
              {recommendation.limitations.includes("completion-order-unknown") && <p>Some session times are missing, so the sequence of learning is uncertain.</p>}
              {recommendation.limitations.includes("verification-is-top-two-selected") && <p>Verification covers selected methods, not all methods equally.</p>}
              {source?.pendingAcceptedSessions ? <p>Newer accepted sessions awaiting profile preparation are not included in this suggestion.</p> : null}
              <p>{source?.scope === "published-generation" ? "Advice uses the displayed local synthetic generation; this is not a real-student publication." : "Advice uses local accepted evidence. Acceptance is separate from profile publication."}</p>
            </details>
            <p>Use this topic selects the whole topic only, not a method. Choose your own methods for individual practice; Test Me keeps its existing selection rules. The suggested concept and question are not a frozen session allocation.</p>
          </>}
    {hasDraft && <p>Your saved session keeps its original topic and methods. This suggestion is for a new session; Resume continues your existing work.</p>}
    <div className="training-resume-actions">
      {recommendation && !state.loading && !state.error && <button type="button" disabled={disabled || applied} onClick={() => {
        // Fence the actual callback as well as asynchronous reader results.
        if (auth.currentUser !== owner || source?.ownerUid !== uid) return;
        rememberStudyMethodSuggestion(owner, uid, recommendation);
        onUse(topic); setDecision({ owner, source });
      }}>{applied ? "Topic selected" : "Use this topic"}</button>}
      <button type="button" className="secondary-action" disabled={disabled} onClick={dismiss}>Dismiss guidance</button>
    </div>
    <p>Opening Training or selecting this topic does not show that the suggested method was attempted. Refresh checks the advice again; this choice is not a durable recommendation receipt.</p>
  </section>;
}
