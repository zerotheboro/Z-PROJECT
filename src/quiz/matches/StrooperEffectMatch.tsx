import {
  useTrainingState as useState
} from "../trainingProgressState";
import ColorChange
  from "../../MIDSECTION/COLOR_CHANGE.jsx";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  useExperimentTimer,
  VerificationConfidence
} from "../engines/shared";

import type {
  MatchEngineProps,
  StrooperEngineData
} from "../methodEngineTypes";

type Stage =
  | "stroop"
  | "study"
  | "test"
  | "confidence";

type StroopStimulus = {
  inkIndex: number;
  wordIndex: number;
};

type Props = MatchEngineProps<StrooperEngineData>;

const ATTEMPTS = 8;

function StrooperEffectMatch({
  method,
  data,
  originalScore,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("stroop");
  const [count, setCount] = useState(0);
  const [answers, setAnswers] =
    useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({
    startImmediately: true
  });
  const [stimulus, setStimulus] =
    useState<StroopStimulus | null>(null);
  const current = data.questions[index];

  function finish() {
    if (confidence === null) {
      return;
    }

    const { score } = scoreMultipleChoice(
      data.questions,
      answers
    );

    onComplete({
      method,
      firstScore: originalScore,
      verificationScore: score,
      confidence,
      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section>
      {stage === "stroop" && (
        <div>
          <p>
            Say the ink color, not the word · {count} / {ATTEMPTS}
          </p>
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
              : setStage("confidence")
          }
          nextLabel={
            index === data.questions.length - 1
              ? "Finish test"
              : "Next question"
          }
        />
      )}

      {stage === "confidence" && (
        <VerificationConfidence
          prompt="How confident are you?"
          value={confidence}
          onChange={setConfidence}
          completeLabel="Complete verification"
          onComplete={finish}
        />
      )}
    </section>
  );
}

export default StrooperEffectMatch;
