import { useState } from "react";
import type { LabEngineProps, LeitnerEngineData } from "../methodEngineTypes";
import { LabRatings, MultipleChoiceRunner, scoreMultipleChoice, StudyPanel, useExperimentTimer } from "../engines/shared";

type Stage = "intro" | "study" | "recall" | "organize" | "retest" | "test" | "reflection";
type Props = LabEngineProps<LeitnerEngineData>;

function LeitnerSystemExperiment({ method, category, name, data, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [retestIndex, setRetestIndex] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [retestAnswers, setRetestAnswers] = useState<Record<string, string>>({});
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ease, setEase] = useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] = useState<number | null>(null);
  const { start: startTimer, elapsedMs } = useExperimentTimer();

  const weakItems = data.practice.filter((question) => practiceAnswers[question.id] !== question.correct);
  const currentPractice = data.practice[practiceIndex];
  const currentRetest = weakItems[retestIndex];
  const currentTest = data.test[testIndex];

  function advancePractice() {
    if (practiceIndex < data.practice.length - 1) setPracticeIndex((value) => value + 1);
    else setStage("organize");
  }

  function advanceRetest() {
    if (retestIndex < weakItems.length - 1) setRetestIndex((value) => value + 1);
    else setStage("test");
  }

  function advanceTest() {
    if (testIndex < data.test.length - 1) setTestIndex((value) => value + 1);
    else setStage("reflection");
  }

  function finish() {
    if (confidence === null || ease === null || willingnessToUse === null) return;
    const { correct, total, score } = scoreMultipleChoice(data.test, testAnswers);
    onComplete({ method, category, correct, total, score, confidence, ease, willingnessToUse, timeSpentMs: elapsedMs() });
  }

  return <section className="method-experiment">
    {stage === "intro" && <div>
      <p>METHOD LAB · MEMORY</p><h2>{name}</h2>
      <p>You'll study flashcards, sort items by recall strength, retest weak items, and finish with a new objective test.</p>
      <button type="button" onClick={() => { startTimer(); setStage("study"); }}>Start experiment</button>
    </div>}
    {stage === "study" && <div>
      <p>STEP 1 · STUDY FLASHCARDS</p><h2>{data.topic}</h2>
      {data.cards.map((card) => <StudyPanel key={card.id}><h3>{card.front}</h3><p>{card.back}</p></StudyPanel>)}
      <button type="button" onClick={() => setStage("recall")}>Start recall</button>
    </div>}
    {stage === "recall" && <div>
      <p>STEP 2 · RECALL {practiceIndex + 1}{" / "}{data.practice.length}</p>
      <MultipleChoiceRunner question={currentPractice} selectedAnswer={practiceAnswers[currentPractice.id]}
        onSelect={(option) => setPracticeAnswers((previous) => ({ ...previous, [currentPractice.id]: option }))}
        onNext={advancePractice} nextLabel={practiceIndex === data.practice.length - 1 ? "Organize levels" : "Next card"} />
    </div>}
    {stage === "organize" && <div>
      <p>STEP 3 · LEITNER LEVELS</p><h2>Organize cards by performance.</h2>
      <h3>Level 1 · Review soon</h3>
      {weakItems.length === 0 ? <p>No weak items this round.</p> : <ul>{weakItems.map((item) => <li key={item.id}>{item.question}</li>)}</ul>}
      <h3>Level 2 · Remembered</h3>
      <ul>{data.practice.filter((item) => practiceAnswers[item.id] === item.correct).map((item) => <li key={item.id}>{item.question}</li>)}</ul>
      <button type="button" onClick={() => setStage(weakItems.length > 0 ? "retest" : "test")}>
        {weakItems.length > 0 ? "Retest weak items" : "Continue to final test"}
      </button>
    </div>}
    {stage === "retest" && currentRetest && <div>
      <p>STEP 4 · RETEST WEAK ITEMS {retestIndex + 1}{" / "}{weakItems.length}</p>
      <MultipleChoiceRunner question={currentRetest} selectedAnswer={retestAnswers[currentRetest.id]}
        onSelect={(option) => setRetestAnswers((previous) => ({ ...previous, [currentRetest.id]: option }))}
        onNext={advanceRetest} nextLabel={retestIndex === weakItems.length - 1 ? "Continue to final test" : "Next weak item"} />
    </div>}
    {stage === "test" && <div>
      <p>STEP 5 · FINAL TEST</p><p>Question {testIndex + 1}{" / "}{data.test.length}</p>
      <MultipleChoiceRunner question={currentTest} selectedAnswer={testAnswers[currentTest.id]}
        onSelect={(option) => setTestAnswers((previous) => ({ ...previous, [currentTest.id]: option }))}
        onNext={advanceTest} nextLabel={testIndex === data.test.length - 1 ? "Finish test" : "Next question"} />
    </div>}
    {stage === "reflection" && <div>
      <p>STEP 6 · REFLECT</p><h2>How did {name} feel?</h2>
      <LabRatings confidence={{ prompt: "How confident were you?", value: confidence, onChange: setConfidence }}
        ease={{ prompt: "How easy was the method?", value: ease, onChange: setEase }}
        willingnessToUse={{ prompt: <>Would you use {name} while studying?</>, value: willingnessToUse, onChange: setWillingnessToUse }}
        completeLabel="Complete experiment" onComplete={finish} />
    </div>}
  </section>;
}

export default LeitnerSystemExperiment;
