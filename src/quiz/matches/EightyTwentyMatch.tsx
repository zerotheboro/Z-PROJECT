import { useState } from "react";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import type { EightyTwentyEngineData, MatchEngineProps } from "../methodEngineTypes";
type Stage = "inspect" | "identify" | "prioritize" | "study" | "test" | "confidence";
type Props = MatchEngineProps<EightyTwentyEngineData>;
function EightyTwentyMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("inspect"); const [highValue, setHighValue] = useState(""); const [priority, setPriority] = useState(""); const [answers, setAnswers] = useState<Record<string, string>>({}); const [index, setIndex] = useState(0); const [confidence, setConfidence] = useState<number | null>(null); const { elapsedMs } = useExperimentTimer({ startImmediately: true }); const current = data.questions[index];
  function finish() { if (confidence === null) return; const { score } = scoreMultipleChoice(data.questions, answers); console.log("80/20 ROUND 2:", { highValue, priority }); onComplete({ method, firstScore: originalScore, verificationScore: score, confidence, timeSpentMs: elapsedMs() }); }
  return <section className="method-match-experiment">
    {stage === "inspect" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><StudyPanel><ul>{data.details.map((item) => <li key={item}>{item}</li>)}</ul></StudyPanel><button type="button" onClick={() => setStage("identify")}>Identify high-value concepts</button></div>}
    {stage === "identify" && <div><h2>Which concepts will produce most of the value?</h2><TextResponse value={highValue} onChange={setHighValue} placeholder="Identify the high-value concepts..."/><button type="button" disabled={highValue.trim().length < 20} onClick={() => setStage("prioritize")}>Prioritize them</button></div>}
    {stage === "prioritize" && <div><h2>Put the concepts in priority order.</h2><TextResponse value={priority} onChange={setPriority} placeholder="Rank the concepts and explain your order..."/><button type="button" disabled={priority.trim().length < 20} onClick={() => setStage("study")}>Study the priorities</button></div>}
    {stage === "study" && <div><h2>High-value concepts</h2><StudyPanel><ol>{data.coreConcepts.map((item) => <li key={item}>{item}</li>)}</ol></StudyPanel><button type="button" onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("confidence")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <VerificationConfidence prompt="How confident are you in the priorities you identified?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/>} 
  </section>;
}
export default EightyTwentyMatch;
