import { useState } from "react";
import type { AbbreviationEngineData, LabEngineProps } from "../methodEngineTypes";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, TextResponse, useExperimentTimer } from "../engines/shared";

type Stage = "intro" | "study" | "create" | "recall" | "test" | "reflection";
type Props = LabEngineProps<AbbreviationEngineData>;

function AbbreviationExperiment({ method, category, name, data, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [mnemonic, setMnemonic] = useState("");
  const [recall, setRecall] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] = useState<number | null>(null);
  const { start: startTimer, elapsedMs } = useExperimentTimer();
  const currentQuestion = data.questions[questionIndex];

  function finish() {
    if (confidence === null || ease === null || willingnessToUse === null) return;
    const { correct, total, score } = scoreMultipleChoice(data.questions, answers);
    console.log("ABBREVIATION:", mnemonic, recall);
    onComplete({ method, category, correct, total, score, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() });
  }

  return <section className="method-experiment">
    {stage === "intro" && <div><p>METHOD LAB · MEMORY</p><h2>{name}</h2><p>You'll compress several related items into an abbreviation, acronym, or mnemonic and use it to recall the originals.</p><button type="button" onClick={() => { startTimer(); setStage("study"); }}>Start experiment</button></div>}
    {stage === "study" && <div><p>STEP 1 · STUDY THE ITEMS</p><h2>{data.topic}</h2><ol>{data.items.map((item) => <li key={item}>{item}</li>)}</ol><button type="button" onClick={() => setStage("create")}>Create an abbreviation</button></div>}
    {stage === "create" && <div><p>STEP 2 · CREATE</p><h2>Create a compact abbreviation, acronym, or mnemonic.</h2><TextResponse value={mnemonic} onChange={setMnemonic} placeholder="Create your abbreviation or mnemonic..."/><button type="button" disabled={mnemonic.trim().length < 2} onClick={() => setStage("recall")}>Use my mnemonic</button></div>}
    {stage === "recall" && <div><p>STEP 3 · RECALL</p><h2>Use your mnemonic to reconstruct every original item.</h2><TextResponse value={recall} onChange={setRecall} placeholder="Recall the original items..."/><button type="button" disabled={recall.trim().length < 10} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>STEP 4 · FINAL RECALL TEST</p><p>Question {questionIndex + 1}{" / "}{data.questions.length}</p><MultipleChoiceRunner question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} onNext={() => questionIndex < data.questions.length - 1 ? setQuestionIndex((value) => value + 1) : setStage("reflection")} nextLabel={questionIndex === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "reflection" && <div><p>STEP 5 · REFLECT</p><h2>How did {name} feel?</h2><LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }} ease={{ prompt: "How easy was the method?", value: ease, onChange: setEase }} willingnessToUse={{ prompt: <>Would you use {name} while studying?</>, value: willingnessToUse, onChange: setWillingnessToUse }} completeLabel="Complete experiment" onComplete={finish}/></div>}
  </section>;
}

export default AbbreviationExperiment;
