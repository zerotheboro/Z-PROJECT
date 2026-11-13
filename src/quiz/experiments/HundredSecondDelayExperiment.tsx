import { useEffect, useMemo } from "react";
import { useTrainingScopeName, useTrainingState as useState } from "../trainingProgressState";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import type { LabEngineProps, MatchEngineProps, WallStareEngineData } from "../methodEngineTypes";
import { useTimedActivityIdentity } from "../timedActivities/TimedActivityIdentity";
import { activityKey } from "../timedActivities/commitment";
import { useCommitment } from "../timedActivities/useCommitment";
import { commitmentDisclosure, CommitmentNotice } from "../timedActivities/CommitmentNotice";
import { EconomicsPassageLayout } from "../economics9708/EconomicsStudyLayout";
import EconomicsTopicImages from "../economics9708/EconomicsTopicImages";
import { requireEconomicsPack } from "../economics9708/packs";
import { mapTopicLearningContent } from "../economics9708/objectives";

export const HUNDRED_SECOND_DELAY_MS = 100_000;
type LabProps = LabEngineProps<WallStareEngineData>;
type MatchProps = MatchEngineProps<WallStareEngineData>;
type Props = LabProps & { phase: "lab" } | MatchProps & { phase: "match" };
type Stage = "study" | "restudy" | "wait" | "test" | "reflection" | "confidence";

function HundredSecondDelayActivity(props: Props) {
  const { data, method, name, contentSetId } = props;
  // New method only: slots 0–6 are pinned in trainingDraftValidation. Existing
  // methods/drafts keep their original slots and content allocations.
  const [stage, setStage] = useState<Stage>("study");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] = useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({ startImmediately: true });
  const identity = useTimedActivityIdentity(), scope = useTrainingScopeName();
  const monitor = useCommitment(identity ? activityKey(identity, `hundred-second-delay:${scope}`) : null,
    HUNDRED_SECOND_DELAY_MS, stage === "wait");
  // A read of the durable timer on mount can discover that its start committed
  // immediately before the draft stage write was interrupted.
  const timer = monitor.timer;
  const view = (stage === "study" && timer || stage === "restudy" && timer?.status === "running") ? "wait" : stage;
  const missing = monitor.loaded && stage !== "study" && stage !== "restudy" && !timer;
  const invalid = timer?.status === "invalid" && stage !== "restudy" || missing;
  const finished = timer?.status === "finished" && !monitor.error;
  const image = useMemo(() => {
    const topic = /^ec9708-(\d+)_(\d+)-/.exec(contentSetId ?? "");
    if (!topic) return null;
    const topicId = `${topic[1]}.${topic[2]}`, ids = new Set(data.questions.map(q => q.id));
    const mapping = mapTopicLearningContent(requireEconomicsPack(topicId));
    const objectives = mapping.questions.filter(q => q.phase === (props.phase === "lab" ? "lab" : "verification") && ids.has(q.questionId)).flatMap(q => q.objectiveIds);
    return <EconomicsTopicImages topicId={topicId} objectiveIds={objectives} />;
  }, [contentSetId, data.questions, props.phase]);
  useEffect(() => {
    // Reconcile the interrupted timer-start/draft-write window before exposing
    // source material, and attach monitoring only to the waiting stage.
    if ((stage === "study" && timer || stage === "restudy" && timer?.status === "running") && !monitor.error) setStage("wait");
    if (view === "wait" && finished && document.visibilityState !== "hidden" && monitor.confirmFinished()) setStage("test");
  }, [stage, view, timer, monitor.error]);

  const begin = () => {
    if (!monitor.loaded || monitor.error || document.visibilityState === "hidden") return;
    if (timer ? stage === "restudy" && timer.status !== "running" && monitor.restart() : monitor.begin()) setStage("wait");
  };
  const restartStudy = () => {
    setAnswers({}); setIndex(0); setConfidence(null); setEase(null); setWillingnessToUse(null); setStage("restudy");
  };
  const finish = () => {
    if (confidence === null || !monitor.confirmFinished()) return;
    const result = scoreMultipleChoice(data.questions, answers);
    if (props.phase === "lab") {
      if (ease === null || willingnessToUse === null) return;
      props.onComplete({ method, category: props.category, ...result, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() });
    } else props.onComplete({ method, firstScore: props.originalScore, verificationScore: result.score, confidence, timeSpentMs: elapsedMs() });
  };
  return <section className="hundred-second-delay-method">
    <h2>{name}</h2>
    {monitor.error && <><p role="alert">{monitor.error} This attempt cannot be submitted.</p><button type="button" onClick={monitor.refresh}>Retry timer recovery</button></>}
    {!monitor.loaded ? <p role="status">Checking the saved countdown…</p> : invalid ? <>
      <CommitmentNotice exits={timer?.exits ?? 0} invalid reason={missing ? "The saved countdown is unavailable. This attempt cannot be scored." : timer?.reason} />
      <button type="button" disabled={Boolean(monitor.error)} onClick={restartStudy}>Restart from the study passage</button>
    </> : (view === "study" || view === "restudy") && !monitor.error ? <>
      <h3>{data.topic}</h3>
      <StudyPanel><EconomicsPassageLayout image={image}>{data.material.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</EconomicsPassageLayout></StudyPanel>
      <p>When you are ready, the passage and illustration will disappear for 100 seconds. Questions unlock afterward.</p>
      <p>{commitmentDisclosure}</p>
      <button type="button" onClick={begin}>I'm ready</button>
    </> : view === "wait" ? <>
      <p>Wait without looking at notes or other learning material.</p>
      <CommitmentNotice exits={timer?.exits ?? 0} />
      <p className="training-timer-value" role="timer" aria-live="off" aria-label="100-second delay time remaining">{Math.floor(monitor.remaining / 60)}:{String(monitor.remaining % 60).padStart(2, "0")}</p>
      <p role="status">{finished ? "The wait is complete. Return to this tab to answer the questions." : "Questions unlock when the countdown reaches zero."}</p>
    </> : !finished || monitor.error ? <p role="alert">The completed countdown could not be confirmed. No result can be submitted.</p> : view === "test" ?
      <MultipleChoiceRunner question={data.questions[index]} selectedAnswer={answers[data.questions[index].id]}
        progress={{ questions: data.questions, answers, id: "answers", label: "Current method quiz" }}
        onSelect={answer => { if (monitor.confirmFinished()) setAnswers(value => ({ ...value, [data.questions[index].id]: answer })); }}
        onBack={() => setIndex(value => Math.max(0, value - 1))} backDisabled={index === 0}
        onNext={() => { if (!monitor.confirmFinished()) return; if (index < data.questions.length - 1) setIndex(value => value + 1); else setStage(props.phase === "lab" ? "reflection" : "confidence"); }}
        nextLabel={index < data.questions.length - 1 ? "Next question" : "Finish test"} />
      : props.phase === "lab" ? <LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }}
        ease={{ prompt: "How manageable was the delay?", value: ease, onChange: setEase }}
        willingnessToUse={{ prompt: <>Would you use {name}?</>, value: willingnessToUse, onChange: setWillingnessToUse }} completeLabel="Complete experiment" onComplete={finish} />
        : <VerificationConfidence prompt="How confident are you?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish} />}
  </section>;
}

export default function HundredSecondDelayExperiment(props: LabProps) { return <HundredSecondDelayActivity {...props} phase="lab" />; }
export function HundredSecondDelayMatch(props: MatchProps) { return <HundredSecondDelayActivity {...props} phase="match" />; }
