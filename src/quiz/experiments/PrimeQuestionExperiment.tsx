import { useState } from "react";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer } from "../engines/shared";
import type { LabEngineProps, PrimeQuestionEngineData } from "../methodEngineTypes";

type Stage = "intro" | "prime" | "study" | "answer" | "test" | "reflection";
type Props = LabEngineProps<PrimeQuestionEngineData>;

function PrimeQuestionExperiment({ method, category, name, data, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] = useState<number | null>(null);
  const { start, elapsedMs } = useExperimentTimer();
  const current = data.questions[index];

  function finish() {
    if (confidence === null || ease === null || willingnessToUse === null) return;
    const { correct, total, score } = scoreMultipleChoice(data.questions, answers);
    console.log("PRIME QUESTION:", { question, response });
    onComplete({ method, category, correct, total, score, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() });
  }

  return <section className="method-experiment">
    {stage === "intro" && <div><p>METHOD LAB · UNDERSTANDING</p><h2>{name}</h2><p>You'll choose one strong question before studying and use it to focus your attention.</p><button type="button" onClick={() => { start(); setStage("prime"); }}>Start experiment</button></div>}
    {stage === "prime" && <div><p>STEP 1 · PRIME YOUR ATTENTION</p><h2>{data.topic}</h2><p>Suggested focus: {data.guidingQuestion}</p><TextResponse value={question} onChange={setQuestion} placeholder="Write one guiding question..."/><button type="button" disabled={question.trim().length < 12} onClick={() => setStage("study")}>Study with this question</button></div>}
    {stage === "study" && <div><p>STEP 2 · STUDY</p><h2>{question}</h2><StudyPanel><p>{data.material}</p></StudyPanel><button type="button" onClick={() => setStage("answer")}>Answer my question</button></div>}
    {stage === "answer" && <div><p>STEP 3 · ANSWER FROM UNDERSTANDING</p><h2>{question}</h2><TextResponse value={response} onChange={setResponse} placeholder="Answer the guiding question..."/><button type="button" disabled={response.trim().length < 20} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>STEP 4 · COMPREHENSION TEST</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("reflection")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "reflection" && <div><p>STEP 5 · REFLECT</p><h2>How did {name} feel?</h2><LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }} ease={{ prompt: "How easy was the method?", value: ease, onChange: setEase }} willingnessToUse={{ prompt: <>Would you use {name} while studying?</>, value: willingnessToUse, onChange: setWillingnessToUse }} completeLabel="Complete experiment" onComplete={finish}/></div>}
  </section>;
}

export default PrimeQuestionExperiment;
