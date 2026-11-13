import { useTrainingState as useState } from "../trainingProgressState";
import { MultipleChoiceRunner, scoreMultipleChoice, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import { useEffect, useRef } from "react";
import DoodleCanvas from "../engines/shared/DoodleCanvas";
import type { DoodleStroke } from "../engines/shared/DoodleCanvas";
import DoodleStudyContent from "../engines/shared/DoodleStudyContent";
import type { DoodleEffectEngineData, MatchEngineProps } from "../methodEngineTypes";
type Stage = "study" | "doodle" | "reconstruct" | "test" | "confidence";
type Props = MatchEngineProps<DoodleEffectEngineData>;
function DoodleEffectMatch({ method, data, originalScore, onComplete }: Props) {
  const strokes = useRef<DoodleStroke[]>([]);
  const [stage, setStage] = useState<Stage>("study");
  // Reserved legacy text slots: keep saved answer/rating/timer indices intact.
  useState(""); useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({}); const [index, setIndex] = useState(0); const [confidence, setConfidence] = useState<number | null>(null); const { elapsedMs } = useExperimentTimer({ startImmediately: true }); const current = data.questions[index];
  useEffect(() => { if (stage === "doodle" || stage === "reconstruct") setStage("study"); }, [stage, setStage]);
  function finish() { if (confidence === null) return; const { score } = scoreMultipleChoice(data.questions, answers); onComplete({ method, firstScore: originalScore, verificationScore: score, confidence, timeSpentMs: elapsedMs() }); }
  return <section className="method-match-experiment">
    {stage === "study" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><div className="doodle-study-layout"><DoodleStudyContent material={data.material} relationships={data.relationships} /><DoodleCanvas strokes={strokes} /></div><button type="button" onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current}
      progress={{ questions: data.questions, answers: answers, id: "answers", label: "Current method quiz" }} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onBack={() => setIndex((value) => Math.max(0, value - 1))} backDisabled={index === 0} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("confidence")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <VerificationConfidence prompt="How confident are you in your answers?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/>}
  </section>;
}
export default DoodleEffectMatch;
