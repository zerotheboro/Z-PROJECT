import { useState } from "react";
import type { LeitnerEngineData, MatchEngineProps } from "../methodEngineTypes";
import { MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, useExperimentTimer, VerificationConfidence } from "../engines/shared";

type Stage = "study" | "recall" | "organize" | "retest" | "test" | "confidence";
type Props = MatchEngineProps<LeitnerEngineData>;

function LeitnerSystemMatch({ method, data, originalScore, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("study");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [retestIndex, setRetestIndex] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [retestAnswers, setRetestAnswers] = useState<Record<string, string>>({});
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({ startImmediately: true });
  const weakItems = data.practice.filter((question) => practiceAnswers[question.id] !== question.correct);
  const currentPractice = data.practice[practiceIndex];
  const currentRetest = weakItems[retestIndex];
  const currentTest = data.test[testIndex];

  function finish() {
    if (confidence === null) return;
    const { score: verificationScore } = scoreMultipleChoice(data.test, testAnswers);
    onComplete({ method, firstScore: originalScore, verificationScore, confidence, timeSpentMs: elapsedMs() });
  }

  return <section className="method-match-experiment">
    {stage === "study" && <div><p>{data.title.toUpperCase()}</p><h2>{data.topic}</h2>
      {data.cards.map((card) => <StudyPanel key={card.id}><h3>{card.front}</h3><p>{card.back}</p></StudyPanel>)}
      <button type="button" onClick={() => setStage("recall")}>Start recall</button></div>}
    {stage === "recall" && <div><p>RECALL {practiceIndex + 1}{" / "}{data.practice.length}</p>
      <MultipleChoiceRunner question={currentPractice} selectedAnswer={practiceAnswers[currentPractice.id]}
        onSelect={(option) => setPracticeAnswers((previous) => ({ ...previous, [currentPractice.id]: option }))}
        onNext={() => practiceIndex < data.practice.length - 1 ? setPracticeIndex((value) => value + 1) : setStage("organize")}
        nextLabel={practiceIndex === data.practice.length - 1 ? "Organize levels" : "Next card"} /></div>}
    {stage === "organize" && <div><p>LEITNER LEVELS</p><h2>Review weak items before the final test.</h2>
      <h3>Level 1 · Review soon</h3>{weakItems.length === 0 ? <p>No weak items this round.</p> : <ul>{weakItems.map((item) => <li key={item.id}>{item.question}</li>)}</ul>}
      <button type="button" onClick={() => setStage(weakItems.length > 0 ? "retest" : "test")}>{weakItems.length > 0 ? "Retest weak items" : "Continue to final test"}</button></div>}
    {stage === "retest" && currentRetest && <div><p>RETEST {retestIndex + 1}{" / "}{weakItems.length}</p>
      <MultipleChoiceRunner question={currentRetest} selectedAnswer={retestAnswers[currentRetest.id]}
        onSelect={(option) => setRetestAnswers((previous) => ({ ...previous, [currentRetest.id]: option }))}
        onNext={() => retestIndex < weakItems.length - 1 ? setRetestIndex((value) => value + 1) : setStage("test")}
        nextLabel={retestIndex === weakItems.length - 1 ? "Continue to final test" : "Next weak item"} /></div>}
    {stage === "test" && <div><p>VERIFICATION TEST</p><p>Question {testIndex + 1}{" / "}{data.test.length}</p>
      <MultipleChoiceRunner question={currentTest} selectedAnswer={testAnswers[currentTest.id]}
        onSelect={(option) => setTestAnswers((previous) => ({ ...previous, [currentTest.id]: option }))}
        onNext={() => testIndex < data.test.length - 1 ? setTestIndex((value) => value + 1) : setStage("confidence")}
        nextLabel={testIndex === data.test.length - 1 ? "Finish test" : "Next question"} /></div>}
    {stage === "confidence" && <div><VerificationConfidence prompt="How confident are you in what you remembered?" value={confidence} onChange={setConfidence} completeLabel="Complete verification" onComplete={finish} /></div>}
  </section>;
}

export default LeitnerSystemMatch;
