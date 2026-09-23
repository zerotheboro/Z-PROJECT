import { useState } from "react";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import type { DeriveBasicsEngineData, MatchEngineProps } from "../methodEngineTypes";
type Stage = "inspect" | "basics" | "derive" | "chain" | "test" | "confidence";
type Props = MatchEngineProps<DeriveBasicsEngineData>;
function DeriveBasicsMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("inspect"); const [basics, setBasics] = useState(""); const [derivation, setDerivation] = useState(""); const [chain, setChain] = useState(""); const [answers, setAnswers] = useState<Record<string, string>>({}); const [index, setIndex] = useState(0); const [confidence, setConfidence] = useState<number | null>(null); const { elapsedMs } = useExperimentTimer({ startImmediately: true }); const current = data.questions[index];
  function finish() { if (confidence === null) return; const { score } = scoreMultipleChoice(data.questions, answers); console.log("DERIVE BASICS ROUND 2:", { basics, derivation, chain }); onComplete({ method, firstScore: originalScore, verificationScore: score, confidence, timeSpentMs: elapsedMs() }); }
  return <section className="method-match-experiment">
    {stage === "inspect" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><p>{data.prompt}</p><StudyPanel><p>{data.source}</p></StudyPanel><button type="button" onClick={() => setStage("basics")}>Identify the basics</button></div>}
    {stage === "basics" && <div><h2>What are the simplest facts underneath the idea?</h2><TextResponse value={basics} onChange={setBasics} placeholder="Identify the basic principles..."/><button type="button" disabled={basics.trim().length < 25} onClick={() => setStage("derive")}>Derive the idea</button></div>}
    {stage === "derive" && <div><StudyPanel><ul>{data.basicPrinciples.map((item) => <li key={item}>{item}</li>)}</ul></StudyPanel><TextResponse value={derivation} onChange={setDerivation} placeholder="Derive the higher-level idea..."/><button type="button" disabled={derivation.trim().length < 25} onClick={() => setStage("chain")}>Explain the reasoning chain</button></div>}
    {stage === "chain" && <div><h2>Connect each basic principle to the conclusion.</h2><TextResponse value={chain} onChange={setChain} placeholder="Explain the complete reasoning chain..."/><button type="button" disabled={chain.trim().length < 25} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("confidence")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <VerificationConfidence prompt="How confident are you in the reasoning you derived?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/>} 
  </section>;
}
export default DeriveBasicsMatch;
