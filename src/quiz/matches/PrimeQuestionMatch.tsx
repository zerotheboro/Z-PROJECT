import { useState } from "react";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";
import type { MatchEngineProps, PrimeQuestionEngineData } from "../methodEngineTypes";

type Stage = "prime" | "study" | "answer" | "test" | "confidence";
type Props = MatchEngineProps<PrimeQuestionEngineData>;

function PrimeQuestionMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("prime");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({ startImmediately: true });
  const current = data.questions[index];
  function finish() { if (confidence === null) return; const { score } = scoreMultipleChoice(data.questions, answers); console.log("PRIME QUESTION ROUND 2:", { question, response }); onComplete({ method, firstScore: originalScore, verificationScore: score, confidence, timeSpentMs: elapsedMs() }); }
  return <section className="method-match-experiment">
    {stage === "prime" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><p>Suggested focus: {data.guidingQuestion}</p><TextResponse value={question} onChange={setQuestion} placeholder="Write one guiding question..."/><button type="button" disabled={question.trim().length < 12} onClick={() => setStage("study")}>Study with this question</button></div>}
    {stage === "study" && <div><h2>{question}</h2><StudyPanel><p>{data.material}</p></StudyPanel><button type="button" onClick={() => setStage("answer")}>Answer my question</button></div>}
    {stage === "answer" && <div><h2>{question}</h2><TextResponse value={response} onChange={setResponse} placeholder="Answer the guiding question..."/><button type="button" disabled={response.trim().length < 20} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("confidence")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <VerificationConfidence prompt="How confident are you in your understanding?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/>} 
  </section>;
}
export default PrimeQuestionMatch;
