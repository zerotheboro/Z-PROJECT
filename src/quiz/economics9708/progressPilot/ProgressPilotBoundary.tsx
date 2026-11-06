import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { auth } from "../../../firebase";
import { subscribeToAuth } from "../../../services/auth";
import { progressPilotEnabled } from "../../../services/economicsProgressPilot";
import { isFreshProgressPilotDraft, readProgressPilot } from "../../../services/economicsProgressPilotSession";
import type { PilotSession } from "../../../services/economicsProgressPilotSession";
import { useStudyStrategyEvidence } from "../../../hooks/useStudyStrategyEvidence";
import type { TrainingDraft } from "../../trainingProgress";
import MultipleChoiceRunner from "../../engines/shared/MultipleChoiceRunner";
import { readEconomicsSelection } from "../selection";
import { pilotForm, isPilotFormUsable } from "./forms";
import type { PilotForm } from "./forms";
import { currentPilotExposure, formExposure, pilotHistory, recordPilotCheck } from "./model";
import type { PilotCheckResult, PilotHistory } from "./model";

const prototypeWarning = "DRAFT local prototype — results stay in this tab's memory. They are not accepted evidence or a cloud backup. Refresh, signing out or closing this tab loses them.";

export function PilotCheck({ form, history, currentAnswered, preparedForDisplay = new Set(), currentAnswersComplete, instructionOpened, onComplete, onSkip }: {
  form: PilotForm; history: PilotHistory; currentAnswered: ReadonlySet<string>; instructionOpened: boolean;
  preparedForDisplay?: ReadonlySet<string>; currentAnswersComplete?: boolean;
  onComplete: (value: PilotCheckResult) => void; onSkip: () => void;
}) {
  const [started, setStarted] = useState(false), [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [exposure, setExposure] = useState(() => formExposure(form, history, currentAnswered, preparedForDisplay, currentAnswersComplete ?? form.name === "A"));
  const [error, setError] = useState<string | null>(null);
  const initial = form.name === "A";
  const unavailable = !isPilotFormUsable(form) || form.name === "C" || initial && instructionOpened;
  const q = form.items[index]?.question;
  return <section className="training-system-message" aria-label={initial ? "Optional initial check" : "Optional subsequent check"}>
    <p>OPTIONAL ECONOMICS CHECK · FORM {form.name} · {form.status.toUpperCase()}</p>
    <h1>{initial ? "Before this session's study material" : "A short check after Training"}</h1>
    <p>{form.concept}</p><p>{prototypeWarning}</p>
    <p>These forms have not been independently reviewed as equivalent. Correct answers show performance on these tasks, not demonstrated improvement, retention or an effect of a method.</p>
    {unavailable ? <p role="status">This form is unavailable or incomplete. Continue with ordinary Training.</p> : <>
      {history.previousTopicPractice === true && <p>Available accepted records include earlier practice in this topic. This is not a first-ever knowledge test.</p>}
      {history.previousTopicPractice === false && <p>No earlier topic practice was identified in the available accepted records. Missing history and study outside Edulience remain unknown.</p>}
      {!history.readable && <p>Previous question exposure is unknown. This check can only record local task performance.</p>}
      {Object.values(exposure).includes("known-repeat") && <p>Some questions have been encountered in available records or this Training session. Repeated questions are not independent evidence of improvement.</p>}
      {Object.values(exposure).includes("possible-repeat") && <p>Some questions may have been prepared for display. This indicates possible exposure, not proof of an answer or learning.</p>}
      {initial && <p>No new Training study material is shown until you finish or skip. We cannot verify outside help or previous studying.</p>}
      {!started ? <button type="button" onClick={() => { setExposure(formExposure(form, history, currentAnswered, preparedForDisplay, currentAnswersComplete ?? initial)); setStarted(true); }}>Try Form {form.name} (2 questions)</button> : q && <MultipleChoiceRunner
        question={q} selectedAnswer={answers[q.id]} onSelect={answer => setAnswers(old => ({ ...old, [q.id]: answer }))}
        onBack={() => setIndex(i => Math.max(0, i - 1))} backDisabled={index === 0}
        nextLabel={index === form.items.length - 1 ? "Finish optional check" : "Next question"}
        onNext={() => {
          if (index < form.items.length - 1) { setIndex(i => i + 1); return; }
          try { onComplete(recordPilotCheck(form, answers, exposure, new Date().toISOString(), instructionOpened)); }
          catch { setError("The optional check could not be recorded. You can skip it; ordinary Training is unchanged."); }
        }} />}
    </>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="secondary-action" onClick={onSkip}>{initial ? "Skip initial check and continue Training" : "Skip subsequent check"}</button>
  </section>;
}

function OwnedPilot({ draft, entry, current, children }: {
  draft: TrainingDraft; entry: PilotSession; current: NonNullable<typeof auth.currentUser>; children: ReactNode;
}) {
  const [, update] = useState(0);
  const source = useStudyStrategyEvidence(current.uid);
  const history = pilotHistory(current.uid, entry.topicId, source.data?.strategyEvidence);
  const valid = () => auth.currentUser === current && current.uid === (draft.owner.kind === "user" ? draft.owner.uid : null) &&
    progressPilotEnabled() && readProgressPilot(current, draft.sessionId) === entry;
  if (auth.currentUser !== current || draft.owner.kind !== "user" || draft.owner.uid !== current.uid)
    return <p role="status">Training paused because sign-in changed. Return to Training for the current account.</p>;
  if (!valid()) return <>{children}</>;
  const initial = pilotForm(entry.topicId, "A"), subsequent = pilotForm(entry.topicId, "B");
  const complete = (value: PilotCheckResult) => {
    if (!valid()) { update(n => n + 1); return; }
    if (value.phase === "initial" && !entry.instructionOpened) { entry.initial = value; entry.instructionOpened = true; }
    else if (value.phase === "subsequent" && draft.section === 7 && !entry.subsequent) entry.subsequent = value;
    update(n => n + 1);
  };
  const skip = (phase: "initial" | "subsequent") => {
    if (!valid()) { update(n => n + 1); return; }
    if (phase === "initial") { entry.initialSkipped = true; entry.instructionOpened = true; }
    else entry.subsequentSkipped = true;
    update(n => n + 1);
  };
  if (!entry.instructionOpened && initial) return <main className="assessment assessment-v2">
    {source.loading && <p role="status">Checking available accepted history; you can still skip this optional check.</p>}
    {source.error && <p>Accepted history is unavailable. No unseen-question claim can be made.</p>}
    <PilotCheck key={initial.id} form={initial} history={history} currentAnswered={new Set()} instructionOpened={false} onComplete={complete} onSkip={() => skip("initial")} />
  </main>;
  const trace = draft.section === 7 ? currentPilotExposure(draft) : null;
  return <>{children}{draft.section === 7 && <aside className="assessment assessment-v2" aria-label="Local optional check results">
    {!entry.subsequent && !entry.subsequentSkipped && subsequent && <PilotCheck key={subsequent.id} form={subsequent} history={history}
      currentAnswered={trace?.answered ?? new Set()} preparedForDisplay={trace?.preparedForDisplay}
      currentAnswersComplete={trace?.answersComplete ?? false} instructionOpened onComplete={complete} onSkip={() => skip("subsequent")} />}
    <section className="training-system-message">
      <h2>Local task performance</h2><p>{prototypeWarning}</p>
      <p>Initial check: {entry.initial ? `${entry.initial.correct} of ${entry.initial.total} correct` : "not recorded (skipped or unavailable)"}.</p>
      <p>Subsequent check: {entry.subsequent ? `${entry.subsequent.correct} of ${entry.subsequent.total} correct` : "not recorded"}.</p>
      {[entry.initial, entry.subsequent].some(r => r?.answers.some(a => a.exposure === "known-repeat")) &&
        <p>Some recorded answers used familiar questions. These are repeated task results, not independent evidence of improvement.</p>}
      {[entry.initial, entry.subsequent].some(r => r?.answers.some(a => a.exposure === "possible-repeat")) &&
        <p>Some recorded questions had possible prior display. These local traces do not prove an answer, attention or improvement.</p>}
      <p>Outside study and any missing question-exposure history remain unknown.</p>
      <p>No numerical learning gain, mastery or retention estimate is available. A later correct answer does not establish that a method caused a change.</p>
      <p>Form C is a draft review candidate; delayed testing is not activated.</p>
    </section>
  </aside>}</>;
}

/** Sits OUTSIDE all Training draft/scoring/interaction providers. The reused
 * renderer's local answer order and progress cannot enter a Training draft. */
export default function ProgressPilotBoundary({ draft, children }: { draft: TrainingDraft; children: ReactNode }) {
  const [current, setCurrent] = useState(auth.currentUser);
  useEffect(() => subscribeToAuth(setCurrent), []);
  if (!progressPilotEnabled() || draft.owner.kind === "guest") return <>{children}</>;
  if (!current || current !== auth.currentUser || draft.owner.uid !== current.uid)
    return <p role="status">Training paused because sign-in changed. Return to Training for the current account.</p>;
  let selectedTopic: string | undefined;
  try { selectedTopic = readEconomicsSelection(draft.internalState)?.topicId; if (!["1.5", "2.2"].includes(selectedTopic ?? "")) return <>{children}</>; }
  catch { return <>{children}</>; }
  const entry = readProgressPilot(current, draft.sessionId);
  if (entry && (entry.topicId !== selectedTopic || !entry.instructionOpened && !isFreshProgressPilotDraft(draft)))
    return <>{children}<p role="status">The optional initial check is unavailable for this restored or changed session. No pre-study result can be recorded.</p></>;
  if (!entry) return <>{children}{(draft.section === 1 || draft.section === 3 || draft.section === 7) &&
    <p role="status">Optional check memory is unavailable. No initial or subsequent result was restored from this draft. Ordinary Training is unchanged.</p>}</>;
  return <OwnedPilot key={entry.sessionId} draft={draft} current={current} entry={entry}>{children}</OwnedPilot>;
}
