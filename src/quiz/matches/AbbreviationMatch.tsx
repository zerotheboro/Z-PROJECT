import { useState } from "react";
import type { AbbreviationEngineData, MatchEngineProps } from "../methodEngineTypes";
import { MultipleChoiceRunner, scoreMultipleChoice, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";

type Stage = "study" | "create" | "recall" | "test" | "confidence";
type Props = MatchEngineProps<AbbreviationEngineData>;

function AbbreviationMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("study");
  const [mnemonic, setMnemonic] = useState("");
  const [recall, setRecall] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({ startImmediately: true });
  const currentQuestion = data.questions[questionIndex];

  function finish() {
    if (confidence === null) return;
    const { score: verificationScore } = scoreMultipleChoice(data.questions, answers);
    console.log("ABBREVIATION ROUND 2:", mnemonic, recall);
    onComplete({ method, firstScore: originalScore, verificationScore, confidence, timeSpentMs: elapsedMs() });
  }

  return <section className="method-match-experiment">
    {stage === "study" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><ol>{data.items.map((item) => <li key={item}>{item}</li>)}</ol><button type="button" onClick={() => setStage("create")}>Create an abbreviation</button></div>}
    {stage === "create" && <div><h2>Create a compact abbreviation, acronym, or mnemonic.</h2><TextResponse value={mnemonic} onChange={setMnemonic} placeholder="Create your abbreviation or mnemonic..."/><button type="button" disabled={mnemonic.trim().length < 2} onClick={() => setStage("recall")}>Use my mnemonic</button></div>}
    {stage === "recall" && <div><h2>Use your mnemonic to reconstruct the original items.</h2><TextResponse value={recall} onChange={setRecall} placeholder="Recall the original items..."/><button type="button" disabled={recall.trim().length < 10} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {questionIndex + 1}{" / "}{data.questions.length}</p><MultipleChoiceRunner question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} onNext={() => questionIndex < data.questions.length - 1 ? setQuestionIndex((value) => value + 1) : setStage("confidence")} nextLabel={questionIndex === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <div><VerificationConfidence prompt="How confident were you recalling the original items?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/></div>}
  </section>;
}

export default AbbreviationMatch;
