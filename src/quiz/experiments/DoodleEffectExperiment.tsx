import { useTrainingState as useState } from "../trainingProgressState";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, useExperimentTimer } from "../engines/shared";
import type { DoodleEffectEngineData, LabEngineProps } from "../methodEngineTypes";
import { useEffect, useRef } from "react";
import DoodleCanvas from "../engines/shared/DoodleCanvas";
import DoodleStudyContent from "../engines/shared/DoodleStudyContent";
import type { DoodleStroke } from "../engines/shared/DoodleCanvas";
type Stage = "intro" | "study" | "doodle" | "reconstruct" | "test" | "reflection";
type Props = LabEngineProps<DoodleEffectEngineData>;
function DoodleEffectExperiment({ method, category, name, data, onComplete }: Props) {
  const strokes = useRef<DoodleStroke[]>([]);
  const [stage, setStage] = useState<Stage>("intro");
  // Retain old text slots 1/2 without reading, changing or scoring their values.
  // Existing answers, ratings and timer keep their original saved indices.
  useState(""); useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({}); const [index, setIndex] = useState(0); const [confidence, setConfidence] = useState<number | null>(null); const [ease, setEase] = useState<number | null>(null); const [willingnessToUse, setWillingnessToUse] = useState<number | null>(null); const { start, elapsedMs } = useExperimentTimer(); const current = data.questions[index];
  useEffect(() => { if (stage === "doodle" || stage === "reconstruct") setStage("study"); }, [stage, setStage]);
  function finish() { if (confidence === null || ease === null || willingnessToUse === null) return; const { correct, total, score } = scoreMultipleChoice(data.questions, answers); onComplete({ method, category, correct, total, score, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() }); }
  return <section className="method-experiment">
    {stage === "intro" && <div><p>METHOD LAB · UNDERSTANDING</p><h2>{name}</h2><p>Make free-form scribbles while studying. They do not need to mean anything.</p><button type="button" onClick={() => { start(); setStage("study"); }}>Start experiment</button></div>}
    {stage === "study" && <div><p>STEP 1 · STUDY</p><h2>{data.topic}</h2><div className="doodle-study-layout"><DoodleStudyContent material={data.material} relationships={data.relationships} /><DoodleCanvas strokes={strokes} /></div><button type="button" onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>STEP 2 · KNOWLEDGE CHECK</p><p>Question {index + 1} / {data.questions.length}</p><MultipleChoiceRunner question={current}
      progress={{ questions: data.questions, answers: answers, id: "answers", label: "Current method quiz" }} selectedAnswer={answers[current.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [current.id]: option }))} onBack={() => setIndex((value) => Math.max(0, value - 1))} backDisabled={index === 0} onNext={() => index < data.questions.length - 1 ? setIndex((value) => value + 1) : setStage("reflection")} nextLabel={index === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "reflection" && <div><p>STEP 3 · REFLECT</p><h2>How did {name} feel?</h2><LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }} ease={{ prompt: "How easy was the method?", value: ease, onChange: setEase }} willingnessToUse={{ prompt: <>Would you use {name} while studying?</>, value: willingnessToUse, onChange: setWillingnessToUse }} completeLabel="Complete experiment" onComplete={finish}/></div>}
  </section>;
}
export default DoodleEffectExperiment;
