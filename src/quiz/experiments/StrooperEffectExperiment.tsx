import {
  useTrainingState as useState
} from "../trainingProgressState";
import ColorChange
  from "../../MIDSECTION/COLOR_CHANGE.jsx";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  useExperimentTimer
} from "../engines/shared";

import type {
  LabEngineProps,
  StrooperEngineData
} from "../methodEngineTypes";

type Stage =
  | "intro"
  | "stroop"
  | "study"
  | "test"
  | "reflection";

type StroopStimulus = {
  inkIndex: number;
  wordIndex: number;
};

type Props = LabEngineProps<StrooperEngineData>;

const ATTEMPTS = 8;

function StrooperEffectExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("intro");
  const [count, setCount] = useState(0);
  const [answers, setAnswers] =
    useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);
  const [ease, setEase] =
    useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] =
    useState<number | null>(null);
  const { start, elapsedMs } = useExperimentTimer();
  const [stimulus, setStimulus] =
    useState<StroopStimulus | null>(null);
  const current = data.questions[index];

  function finish() {
    if (
      confidence === null ||
      ease === null ||
      willingnessToUse === null
    ) {
      return;
    }

    const { correct, total, score } =
      scoreMultipleChoice(data.questions, answers);

    onComplete({
      method,
      category,
      correct,
      total,
      score,
      confidence,
      ease,
      willingnessToUse,
      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section>
      {stage === "intro" && (
        <div>
          <h2>{name}</h2>
          <p>Say the ink color, not the written word.</p>
          <button
            onClick={() => {
              start();
              setStage("stroop");
            }}
          >
            Start attention task
          </button>
        </div>
      )}

      {stage === "stroop" && (
        <div>
          <p>{count} / {ATTEMPTS}</p>
          <ColorChange
            colors={data.colors}
            initialLabel="press for first stimulus"
            stimulus={stimulus}
            onStimulusChange={setStimulus}
            onAttempt={() =>
              setCount(value =>
                Math.min(ATTEMPTS, value + 1)
              )
            }
          />
          <button
            disabled={count < ATTEMPTS}
            onClick={() => setStage("study")}
          >
            Continue to learning
          </button>
        </div>
      )}

      {stage === "study" && (
        <div>
          <h2>{data.topic}</h2>
          <StudyPanel>
            <p>{data.material}</p>
          </StudyPanel>
          <button onClick={() => setStage("test")}>
            Continue to test
          </button>
        </div>
      )}

      {stage === "test" && (
        <MultipleChoiceRunner
          question={current}
          selectedAnswer={answers[current.id]}
          onSelect={option =>
            setAnswers(currentAnswers => ({
              ...currentAnswers,
              [current.id]: option
            }))
          }
          onNext={() =>
            index < data.questions.length - 1
              ? setIndex(value => value + 1)
              : setStage("reflection")
          }
          nextLabel={
            index === data.questions.length - 1
              ? "Finish test"
              : "Next question"
          }
        />
      )}

      {stage === "reflection" && (
        <LabRatings
          confidence={{
            prompt: "How confident were you?",
            value: confidence,
            onChange: setConfidence
          }}
          ease={{
            prompt: "How easy was the method?",
            value: ease,
            onChange: setEase
          }}
          willingnessToUse={{
            prompt: <>Would you use {name}?</>,
            value: willingnessToUse,
            onChange: setWillingnessToUse
          }}
          completeLabel="Complete experiment"
          onComplete={finish}
        />
      )}
    </section>
  );
}

export default StrooperEffectExperiment;
