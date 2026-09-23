import { useState } from "react";
import type { CaptureCreateEngineData, LabEngineProps } from "../methodEngineTypes";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer } from "../engines/shared";

type Stage = "intro" | "study" | "capture" | "create" | "test" | "reflection";
type Props = LabEngineProps<CaptureCreateEngineData>;
const prompts = ["What is it?", "Why does it matter?", "How can it be applied?", "When would it be useful?"] as const;

function CaptureCreateExperiment({ method, category, name, data, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [capture, setCapture] = useState("");
  const [responses, setResponses] = useState(["", "", "", ""]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] = useState<number | null>(null);
  const { start: startTimer, elapsedMs } = useExperimentTimer();
  const currentQuestion = data.questions[questionIndex];
  const updateResponse = (index: number, value: string) => setResponses(responses.map((entry, entryIndex) => entryIndex === index ? value : entry));

  function finish() {
    if (confidence === null || ease === null || willingnessToUse === null) return;
    const { correct, total, score } = scoreMultipleChoice(data.questions, answers);
    console.log("CAPTURE & CREATE:", { capture, responses });
    onComplete({ method, category, correct, total, score, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() });
  }

  return <section className="method-experiment">
    {stage === "intro" && <div><p>METHOD LAB · UNDERSTANDING</p><h2>{name}</h2><p>You'll capture the important knowledge, then create responses about what, why, how, and when.</p><button type="button" onClick={() => { startTimer(); setStage("study"); }}>Start experiment</button></div>}
    {stage === "study" && <div><p>STEP 1 · STUDY</p><h2>{data.topic}</h2><StudyPanel><p>{data.content}</p></StudyPanel><button type="button" onClick={() => setStage("capture")}>Capture the knowledge</button></div>}
    {stage === "capture" && <div><p>STEP 2 · CAPTURE</p><h2>Capture the most important knowledge in your own words.</h2><TextResponse value={capture} onChange={setCapture} placeholder="Capture the key knowledge..."/><button type="button" disabled={capture.trim().length < 20} onClick={() => setStage("create")}>Create with it</button></div>}
    {stage === "create" && <div><p>STEP 3 · CREATE</p><h2>Develop the captured knowledge.</h2>{prompts.map((prompt, index) => <div key={prompt}><h3>{prompt}</h3><TextResponse value={responses[index]} onChange={(value) => updateResponse(index, value)} placeholder={`${prompt} Write your response...`}/></div>)}<button type="button" disabled={responses.some((response) => response.trim().length < 10)} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>STEP 4 · COMPREHENSION AND APPLICATION</p><p>Question {questionIndex + 1}{" / "}{data.questions.length}</p><MultipleChoiceRunner question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} onNext={() => questionIndex < data.questions.length - 1 ? setQuestionIndex((value) => value + 1) : setStage("reflection")} nextLabel={questionIndex === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "reflection" && <div><p>STEP 5 · REFLECT</p><h2>How did {name} feel?</h2><LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }} ease={{ prompt: "How easy was the method?", value: ease, onChange: setEase }} willingnessToUse={{ prompt: <>Would you use {name} while studying?</>, value: willingnessToUse, onChange: setWillingnessToUse }} completeLabel="Complete experiment" onComplete={finish}/></div>}
  </section>;
}

export default CaptureCreateExperiment;
