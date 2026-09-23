import { useState } from "react";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import type { DoodleEffectEngineData, MatchEngineProps } from "../methodEngineTypes";
type Stage = "study" | "doodle" | "reconstruct" | "test" | "confidence";
type Props = MatchEngineProps<DoodleEffectEngineData>;
function DoodleEffectMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("study"); const [doodle, setDoodle] = useState(""); const [reconstruction, setReconstruction] = useState(""); const [answers, setAnswers] = useState<Record<string, string>>({}); const [index, setIndex] = useState(0); const [confidence, setConfidence] = useState<number | null>(null); const { elapsedMs } = useExperimentTimer({ startImmediately: true }); const current = data.questions[index];
  function finish() { if (confidence === null) return; const { score } = scoreMultipleChoice(data.questions, answers); console.log("DOODLE ROUND 2:", { doodle, reconstruction }); onComplete({ method, firstScore: originalScore, verificationScore: score, confidence, timeSpentMs: elapsedMs() }); }
  return <section className="method-match-experiment">
    {stage === "study" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><StudyPanel><p>{data.material}</p><ul>{data.relationships.map((item) => <li key={item}>{item}</li>)}</ul></StudyPanel><button type="button" onClick={() => setStage("doodle")}>Create a doodle</button></div>}
    {stage === "doodle" && <div><h2>Describe a simple doodle of the new relationships.</h2><TextResponse value={doodle} onChange={setDoodle} placeholder="Describe your doodle and connections..."/><button type="button" disabled={doodle.trim().length < 20} onClick={() => setStage("reconstruct")}>Use my doodle</button></div>}
    {stage === "reconstruct" && <div><h2>Reconstruct the material from your visual idea.</h2><TextResponse value={reconstruction} onChange={setReconstruction} placeholder="Reconstruct the material..."/><button type="button" disabled={reconstruction.trim().length < 20} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("confidence")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <VerificationConfidence prompt="How confident are you in what you reconstructed?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/>} 
  </section>;
}
export default DoodleEffectMatch;
