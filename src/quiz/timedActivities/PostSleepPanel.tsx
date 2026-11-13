import { useEffect, useRef, useState } from "react";
import { auth } from "../../firebase";
import { subscribeToAuth } from "../../services/auth";
import { localCompletionConfig } from "../../services/localTrainingCompletionConfig";
import type { TrainingDraft } from "../trainingProgress";
import { activityKey, readLocalActivity } from "./commitment";
import type { LocalActivityIdentity } from "./commitment";
import { useCommitment } from "./useCommitment";
import { CommitmentNotice, commitmentDisclosure } from "./CommitmentNotice";
import { listPostSleep, postSleepKey, postSleepQuestions, preparePostSleep, preparePostSleepPreview, savePostSleep, scorePostSleep, validPostSleepTask } from "./postSleepModel";
import type { PostSleepTask } from "./postSleepModel";
import MultipleChoiceRunner from "../engines/shared/MultipleChoiceRunner";
import StudyPanel from "../engines/shared/StudyPanel";
import { requireEconomicsPack } from "../economics9708/packs";
import { getMethodName } from "../methodRegistry";
import { isTrainingMethodId } from "../type";
import type { User } from "firebase/auth";
import { mapTopicLearningContent } from "../economics9708/objectives";
import { readEconomicsSelection } from "../economics9708/selection";

export function postSleepEnabled() {
  // Local browser-only pilot: no evidence reader, API or Firebase write is used.
  // Ordinary local development must not require an unrelated Emulator UI flag.
  return import.meta.env.DEV === true && window.location.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(window.location.hostname);
}
function Check({ task: initial, identity, owner }: { task: PostSleepTask; identity: LocalActivityIdentity; owner: User | null }) {
  const [task, setTask] = useState(initial), [error, setError] = useState<string | null>(null), [review, setReview] = useState(false);
  const preview = task.sourceAuthority === "owner-preview-only", previewStarted = useRef(false);
  const timerKey = activityKey({ ...identity, sessionId: task.sourceSessionId }, `post-sleep-timer:${task.id}`);
  const active = task.mode === "timed-100" && task.startedAt !== null && !task.result;
  const monitor = useCommitment(timerKey, 100_000, active);
  const current = () => auth.currentUser === owner && (preview || owner?.uid === identity.owner) && postSleepEnabled();
  const commit = (change: (value: PostSleepTask) => PostSleepTask) => {
    try {
      if (!current()) throw new Error("Sign-in changed. Previous account results were not saved or displayed.");
      if (preview) { setTask(value => change(value)); setError(null); return true; }
      const saved = readLocalActivity(postSleepKey(identity, task), validPostSleepTask);
      if (!saved || saved.owner !== identity.owner) throw new Error("The saved delayed activity is unavailable.");
      if (saved.result) { setTask(saved); return true; }
      const next = change(saved); savePostSleep(identity, next); setTask(next); setError(null); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "The browser could not safely save this result."); return false; }
  };
  useEffect(() => {
    if (preview && monitor.loaded && !monitor.timer && !monitor.error && !previewStarted.current) {
      previewStarted.current = true; monitor.begin();
    }
  }, [preview, monitor.loaded, monitor.timer, monitor.error]);
  const finish = (expired: boolean) => {
    if (task.mode === "timed-100") {
      if (!(expired ? monitor.confirmFinished() : monitor.complete())) return;
      // The persisted terminal timer pins the original assessment end time,
      // including if the result write fails and is recovered much later.
      return;
    }
    if (monitor.timer?.status === "invalid" || monitor.error) return;
    commit(value => scorePostSleep(value, Date.now(), expired));
  };
  useEffect(() => {
    if (!task.result && task.mode === "timed-100" && monitor.timer?.status === "finished" && !monitor.error)
      commit(value => scorePostSleep(value, monitor.timer!.endedAt!, monitor.timer!.endedAt === monitor.timer!.deadline, Date.now()));
  }, [monitor.timer?.status, monitor.error, task.result]);
  // Recover a timer whose start committed before a task-state storage failure.
  useEffect(() => {
    if (task.startedAt === null && monitor.timer?.status === "running") commit(value => ({ ...value, startedAt: monitor.timer!.startedAt }));
  }, [monitor.timer?.startedAt]);
  if (!current()) return null;
  const questions = postSleepQuestions(task), available = preview || Date.now() >= task.availableAt, q = questions[task.index];
  const missingTimer = task.mode === "timed-100" && task.startedAt !== null && monitor.loaded && !monitor.error && !monitor.timer;
  const invalid = monitor.timer?.status === "invalid" || missingTimer;
  const material = mapTopicLearningContent(requireEconomicsPack(task.topicId)).objectives.filter(o => task.objectiveIds.includes(o.id));
  return <section aria-label="Post-Sleep activity">
    <h2>{preview ? "Owner preview · 100 Seconds" : "Post-Sleep · 100 Seconds"}</h2>
    {preview ? <p role="status">Preview only · sample questions · no overnight wait. No Training scores, accepted evidence or Learning Profile updates are created. Preview answers and results are not saved.</p> : <>
      {!task.result && !available ? <p role="status">Pending · available {new Date(task.availableAt).toLocaleString()}. The next day and at least 12 hours after Training are required.</p>
        : <p>Optional delayed practice · {questions.length} questions · saved only in this browser. The interval does not verify sleep.</p>}
    </>}
    {error && <><p role="alert">{error} Keep this page open; do not assume the result is saved.</p><button type="button" onClick={() => {
      if (monitor.timer?.status === "finished" && monitor.confirmFinished()) commit(value => scorePostSleep(value, monitor.timer!.endedAt!, monitor.timer!.endedAt === monitor.timer!.deadline, Date.now()));
      else setError(null);
    }}>Retry local activity save</button></>}
    {monitor.error && <p role="alert">{monitor.error}</p>}
    {monitor.error && <button type="button" onClick={monitor.refresh}>Retry local timer recovery</button>}
    {task.result && preview ? <p role="status">Preview complete: {task.result.correct} / {task.result.total} correct. This is not a delayed result and was not saved to Training or your Learning Profile.</p> : task.result ? <div role="status">
      <h3>Delayed task result: {task.result.correct} / {task.result.total} correct</h3>
      <p>{task.result.answered} answered. {task.result.expired ? "The 100-second deadline ended the attempt; unanswered questions are shown separately." : "Check completed."}</p>
      <p>Elapsed interval: {(task.result.elapsedIntervalMs / 3_600_000).toFixed(1)} hours. Assessed {new Date(task.result.assessedAt).toLocaleString()}.</p>
      <p>Immediate Training results on different tasks: {task.immediateResults.map(r => `${isTrainingMethodId(r.method) ? getMethodName(r.method) : "Recorded method"}: ${r.correct ?? "?"}/${r.total ?? "?"}`).join("; ")}.</p>
      <p>These question sets have not been independently reviewed as comparable. No numerical gain, retention estimate or causal method effect is claimed. Baseline was after study.</p>
      {task.restudied && <p>This attempt followed a restart and review of material. It is not independent delayed-retention evidence.</p>}
      <p>{task.mode === "untimed-accommodation" ? "Untimed accommodation: do not compare with 100-second checks." : "Timed local task performance only."} Sleep report: {task.sleepReport} (optional self-report only).</p>
    </div> : invalid ? <>
      <CommitmentNotice exits={monitor.timer?.exits ?? 0} invalid reason={missingTimer ? "The saved timer is unavailable. This attempt cannot be confirmed." : monitor.timer?.reason} />
      <p>No zero score or valid assessment result was recorded. A restart remains linked to the same source session.</p>
      {!review ? <button type="button" onClick={() => setReview(true)}>Review learning material before restarting</button> : <>
        <StudyPanel>{material.map(o => <p key={o.id}>{o.material}</p>)}</StudyPanel>
        <button type="button" disabled={Boolean(monitor.error)} onClick={() => {
          if (task.invalidAttempts.length >= 10) { setError("The restart-history capacity was reached; no previous attempt was removed."); return; }
          if (commit(value => ({ ...value, invalidAttempts: [...value.invalidAttempts, { attempt: monitor.timer?.attempt ?? 0, answers: value.answers, endedAt: Date.now() }],
            answers: {}, index: 0, restudied: true, startedAt: Date.now() })) && monitor.restart()) setReview(false);
        }}>Restart 100-second check</button>
      </>}
    </> : task.startedAt === null && !available ? <button type="button" disabled>Available after the overnight interval</button> : task.startedAt === null ? <>
      <p>{commitmentDisclosure}</p><p>Questions differ from the source session. Earlier/outside exposure and equivalent difficulty are not established.</p>
      <label>Timing accommodation <select value={task.mode} onChange={e => commit(value => ({ ...value, mode: e.target.value as PostSleepTask["mode"] }))}>
        <option value="timed-100">Standard 100-second check</option><option value="untimed-accommodation">Untimed accommodation · not comparable</option>
      </select></label>
      <label>Optional sleep report <select value={task.sleepReport} onChange={e => commit(value => ({ ...value, sleepReport: e.target.value as PostSleepTask["sleepReport"] }))}>
        <option value="not-provided">Prefer not to say</option><option value="slept">I slept during the interval</option><option value="did-not-sleep">I did not sleep during the interval</option>
      </select></label>
      <button type="button" disabled={!available || !monitor.loaded || Boolean(error || monitor.error)} onClick={() => {
        if (Date.now() < task.availableAt) return;
        if (task.mode === "untimed-accommodation" || monitor.begin()) commit(value => ({ ...value, startedAt: monitor.timer?.startedAt ?? Date.now() }));
      }}>{available ? "Start optional Post-Sleep check" : "Available after the overnight interval"}</button>
    </> : <>
      <CommitmentNotice exits={monitor.timer?.exits ?? 0} />
      {task.mode === "timed-100" && <p className="training-timer-value" role="timer" aria-live="off" aria-label="Post-Sleep time remaining">{Math.floor(monitor.remaining / 60)}:{String(monitor.remaining % 60).padStart(2, "0")}</p>}
      {!error && !monitor.error && <MultipleChoiceRunner question={q} selectedAnswer={task.answers[q.id]}
        onSelect={answer => { if (task.mode === "untimed-accommodation" || monitor.allowInteraction()) commit(value => ({ ...value, answers: { ...value.answers, [q.id]: answer } })); }}
        onBack={() => commit(value => ({ ...value, index: Math.max(0, value.index - 1) }))} backDisabled={task.index === 0}
        nextLabel={task.index === questions.length - 1 ? "Finish delayed check" : "Next question"}
        onNext={() => { if (task.mode === "timed-100" && !monitor.allowInteraction()) return;
          if (task.index < questions.length - 1) commit(value => ({ ...value, index: value.index + 1 })); else finish(false); }} />}
    </>}
    <p>Closing or refreshing does not reset a running timer. Clearing browser data or losing this device may remove local tasks and results. Visibility and the device clock are not independent authority.</p>
  </section>;
}

type PanelProps = { ownerUid?: string; draft?: TrainingDraft; completedAt?: string | null; topicId?: string; scheduleOnly?: boolean; previewOnly?: boolean };
export default function PostSleepPanel({ ownerUid, draft, completedAt, topicId, scheduleOnly = false, previewOnly = false }: PanelProps) {
  const [owner, setOwner] = useState(auth.currentUser), [tasks, setTasks] = useState<PostSleepTask[]>([]), [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ task: PostSleepTask; owner: User | null } | null>(null);
  const uid = draft?.owner.kind === "user" ? draft.owner.uid : ownerUid ?? owner?.uid;
  const project = localCompletionConfig()?.projectId ?? auth.app?.options.projectId ?? "browser-only";
  const identity: LocalActivityIdentity = { owner: uid ?? "owner-preview", project, sessionId: draft?.sessionId ?? "post-sleep-hub" };
  const enabled = postSleepEnabled(), visible = enabled && owner !== null && owner.uid === uid && owner === auth.currentUser;
  const reload = () => { try { if (visible) { setTasks(listPostSleep(identity)); setError(null); } } catch (e) { setError(e instanceof Error ? e.message : "Local activities could not be read safely."); } };
  useEffect(() => subscribeToAuth(setOwner), []);
  useEffect(() => { setTasks([]); setError(null); setPreview(null); reload(); }, [uid, owner, project]);
  useEffect(() => {
    if (previewOnly && enabled && owner === auth.currentUser)
      setPreview({ task: preparePostSleepPreview(topicId || "1.5", identity), owner });
  }, [previewOnly, enabled, uid, owner, project, topicId]);
  // Queue only an optional browser task after the original Training completion.
  // Missing source details/time fail closed; no historical session is invented.
  useEffect(() => {
    if (!visible || !draft || draft.section !== 7 || !completedAt) return;
    try {
      if (!readEconomicsSelection(draft.internalState)) return;
      if (!listPostSleep(identity).some(task => task.sourceSessionId === draft.sessionId)) {
        if (listPostSleep(identity).length >= 100) throw new Error("The local delayed-task capacity was reached. Existing results were preserved.");
        savePostSleep(identity, preparePostSleep(draft, completedAt, identity));
      }
      reload();
    } catch (e) { setError(e instanceof Error ? e.message : "The optional check could not be saved."); }
  }, [visible, draft?.sessionId, completedAt, uid, project]);
  useEffect(() => {
    if (!visible) return;
    const refresh = () => reload(); window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [visible, uid, owner, project]);
  if (scheduleOnly) return null;
  const availableTasks = visible ? tasks.filter(task => !topicId || task.topicId === topicId) : [];
  return <section aria-label="Post-Sleep · 100 Seconds">
    {previewOnly ? enabled && preview?.owner === owner && owner === auth.currentUser
      ? <Check key={preview.task.id} task={preview.task} identity={identity} owner={owner} />
      : <p role="status">Owner preview is available only in local development.</p>
      : <>
        {!availableTasks.length && <><h2>POST-SLEEP · 100 SECONDS</h2>
          <p>Complete an Economics session first, then return for an optional next-day recall check. No immediate Post-Sleep score is created.</p>
          {!visible && <p>{enabled ? "Sign in to see your saved delayed checks." : "Delayed checks are available in the local pilot only."}</p>}
          {visible && <p role="status">No saved delayed check is available for this topic in this browser yet.</p>}</>}
        {availableTasks.map(task => <Check key={uid + ":" + task.id} task={task} identity={identity} owner={owner} />)}
      </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

/** Queue the existing local delayed task after completion without adding a
 * permanent section or owner controls to the student's Training screens. */
export function PostSleepScheduler(props: Pick<PanelProps, "draft" | "completedAt">) {
  return <PostSleepPanel {...props} scheduleOnly />;
}
