import { useState } from "react";
import type { MatchEngineProps, StoryTellingEngineData } from "../methodEngineTypes";
import { MultipleChoiceRunner, scoreMultipleChoice, TextResponse, useExperimentTimer, VerificationConfidence } from "../engines/shared";

type Stage = "study" | "story" | "reconstruct" | "test" | "confidence";
type Props = MatchEngineProps<StoryTellingEngineData>;

function StoryTellingMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("study");
  const [story, setStory] = useState("");
  const [reconstruction, setReconstruction] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({ startImmediately: true });
  const currentQuestion = data.questions[questionIndex];

  function finish() {
    if (confidence === null) return;
    const { score: verificationScore } = scoreMultipleChoice(data.questions, answers);
    console.log("STORY ROUND 2:", story, reconstruction);
    onComplete({ method, firstScore: originalScore, verificationScore, confidence, timeSpentMs: elapsedMs() });
  }

  return <section className="method-match-experiment">
    {stage === "study" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2><ol>{data.orderedItems.map((item) => <li key={item}>{item}</li>)}</ol><button type="button" onClick={() => setStage("story")}>Create a story</button></div>}
    {stage === "story" && <div><h2>Connect the new information in one story.</h2><TextResponse value={story} onChange={setStory} placeholder="Write a connected story..."/><button type="button" disabled={story.trim().length < 30} onClick={() => setStage("reconstruct")}>Use my story</button></div>}
    {stage === "reconstruct" && <div><h2>Reconstruct the original information in order.</h2><TextResponse value={reconstruction} onChange={setReconstruction} placeholder="Reconstruct the original sequence..."/><button type="button" disabled={reconstruction.trim().length < 20} onClick={() => setStage("test")}>Continue to test</button></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {questionIndex + 1}{" / "}{data.questions.length}</p><MultipleChoiceRunner question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelect={(option) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} onNext={() => questionIndex < data.questions.length - 1 ? setQuestionIndex((value) => value + 1) : setStage("confidence")} nextLabel={questionIndex === data.questions.length - 1 ? "Finish test" : "Next question"}/></div>}
    {stage === "confidence" && <div><VerificationConfidence prompt="How confident were you reconstructing the information?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish}/></div>}
  </section>;
}

export default StoryTellingMatch;
