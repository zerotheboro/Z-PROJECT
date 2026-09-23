import { useState } from "react";
import type { CaptureCreateEngineData, MatchEngineProps } from "../methodEngineTypes";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";

type Stage = "study" | "capture" | "create" | "test" | "confidence";
type Props = MatchEngineProps<CaptureCreateEngineData>;
const prompts = ["What is it?", "Why does it matter?", "How can it be applied?", "When would it be useful?"] as const;

function CaptureCreateMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("study");
  const [capture, setCapture] = useState("");
  const [responses, setResponses] = useState(["", "", "", ""]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({ startImmediately: true });
  const currentQuestion = data.questions[questionIndex];
  const updateResponse = (index: number, value: string) => setResponses(responses.map((entry, entryIndex) => entryIndex === index ? value : entry));

  function finish() {
    if (confidence === null) return;
    const { score: verificationScore } = scoreMultipleChoice(data.questions, answers);
    console.log("CAPTURE & CREATE ROUND 2:", { capture, responses });
    onComplete({ method, firstScore: originalScore, verificationScore, confidence, timeSpentMs: elapsedMs() });
  }

  return <section className="method-match-experiment">
    {stage === "study" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><StudyPanel><p>{data.content}</p></StudyPanel><button type="button" onClick={() => setStage("capture")}>Capture the knowledge</button></div>}
    {stage === "capture" && <div><h2>Capture the most important knowledge.</h2><TextResponse value={capture} onChange={setCapture} placeholder="Capture the key knowledge..."/><button type="button" disabled={capture.trim().length < 20} onClick={() => setStage("create")}>Create with it</button></div>}
    {stage === "create" && <div><h2>Develop the captured knowledge.</h2>{prompts.map((prompt, index) => <div key={prompt}><h3>{prompt}</h3><TextResponse value={responses[index]} onChange={(value) => updateResponse(index, value)} placeholder={`${prompt} Write your response...`}/></div>)}<button type="button" disabled={responses.some((response) => response.trim().length < 10)} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {questionIndex + 1}{" / "}{data.questions.length}</p><MultipleChoiceRunner question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} onNext={() => questionIndex < data.questions.length - 1 ? setQuestionIndex((value) => value + 1) : setStage("confidence")} nextLabel={questionIndex === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <div><VerificationConfidence prompt="How confident are you that you understood and could apply the idea?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/></div>}
  </section>;
}

export default CaptureCreateMatch;
