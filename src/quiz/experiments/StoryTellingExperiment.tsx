import { useState } from "react";
import type { LabEngineProps, StoryTellingEngineData } from "../methodEngineTypes";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, TextResponse, useExperimentTimer } from "../engines/shared";

type Stage = "intro" | "study" | "story" | "reconstruct" | "test" | "reflection";
type Props = LabEngineProps<StoryTellingEngineData>;

function StoryTellingExperiment({ method, category, name, data, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [story, setStory] = useState("");
  const [reconstruction, setReconstruction] = useState("");
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
    console.log("STORY:", story, "RECONSTRUCTION:", reconstruction);
    onComplete({ method, category, correct, total, score, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() });
  }

  return <section className="method-experiment">
    {stage === "intro" && <div><p>METHOD LAB · MEMORY</p><h2>{name}</h2><p>You'll connect ordered information into a story and use it to reconstruct the original sequence.</p><button type="button" onClick={() => { startTimer(); setStage("study"); }}>Start experiment</button></div>}
    {stage === "study" && <div><p>STEP 1 · STUDY THE ORDER</p><h2>{data.topic}</h2><ol>{data.orderedItems.map((item) => <li key={item}>{item}</li>)}</ol><button type="button" onClick={() => setStage("story")}>Create a story</button></div>}
    {stage === "story" && <div><p>STEP 2 · CONNECT THE STORY</p><h2>Turn the information into one connected story.</h2><TextResponse value={story} onChange={setStory} placeholder="Write a connected story..."/><button type="button" disabled={story.trim().length < 30} onClick={() => setStage("reconstruct")}>Use my story</button></div>}
    {stage === "reconstruct" && <div><p>STEP 3 · RECONSTRUCT</p><h2>Without looking back, reconstruct the original information in order.</h2><TextResponse value={reconstruction} onChange={setReconstruction} placeholder="Reconstruct the original sequence..."/><button type="button" disabled={reconstruction.trim().length < 20} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>STEP 4 · FINAL TEST</p><p>Question {questionIndex + 1}{" / "}{data.questions.length}</p><MultipleChoiceRunner question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} onNext={() => questionIndex < data.questions.length - 1 ? setQuestionIndex((value) => value + 1) : setStage("reflection")} nextLabel={questionIndex === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "reflection" && <div><p>STEP 5 · REFLECT</p><h2>How did {name} feel?</h2><LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }} ease={{ prompt: "How easy was the method?", value: ease, onChange: setEase }} willingnessToUse={{ prompt: <>Would you use {name} while studying?</>, value: willingnessToUse, onChange: setWillingnessToUse }} completeLabel="Complete experiment" onComplete={finish}/></div>}
  </section>;
}

export default StoryTellingExperiment;
