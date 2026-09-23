import { useState } from "react";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import type { DivideStepsEngineData, MatchEngineProps } from "../methodEngineTypes";
type Stage = "inspect" | "divide" | "organize" | "reconstruct" | "test" | "confidence";
type Props = MatchEngineProps<DivideStepsEngineData>;
function DivideStepsMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("inspect"); const [steps, setSteps] = useState(""); const [sequence, setSequence] = useState(""); const [explanation, setExplanation] = useState(""); const [answers, setAnswers] = useState<Record<string, string>>({}); const [index, setIndex] = useState(0); const [confidence, setConfidence] = useState<number | null>(null); const { elapsedMs } = useExperimentTimer({ startImmediately: true }); const current = data.questions[index];
  function finish() { if (confidence === null) return; const { score } = scoreMultipleChoice(data.questions, answers); console.log("DIVIDE STEPS ROUND 2:", { steps, sequence, explanation }); onComplete({ method, firstScore: originalScore, verificationScore: score, confidence, timeSpentMs: elapsedMs() }); }
  return <section className="method-match-experiment">
    {stage === "inspect" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><StudyPanel><p>{data.overview}</p></StudyPanel><button type="button" onClick={() => setStage("divide")}>Divide the process</button></div>}
    {stage === "divide" && <div><h2>Break the process into smaller steps.</h2><TextResponse value={steps} onChange={setSteps} placeholder="List the smaller steps..."/><button type="button" disabled={steps.trim().length < 25} onClick={() => setStage("organize")}>Organize the sequence</button></div>}
    {stage === "organize" && <div><h2>Put the steps in a clear sequence.</h2><TextResponse value={sequence} onChange={setSequence} placeholder="Organize the steps in order..."/><button type="button" disabled={sequence.trim().length < 25} onClick={() => setStage("reconstruct")}>Reconstruct the process</button></div>}
    {stage === "reconstruct" && <div><StudyPanel><ol>{data.referenceSteps.map((item) => <li key={item}>{item}</li>)}</ol></StudyPanel><TextResponse value={explanation} onChange={setExplanation} placeholder="Explain how the complete process works..."/><button type="button" disabled={explanation.trim().length < 25} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("confidence")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <VerificationConfidence prompt="How confident are you in the process sequence?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/>} 
  </section>;
}
export default DivideStepsMatch;
