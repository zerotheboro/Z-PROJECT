import {
  useTrainingState as useState
} from "../trainingProgressState";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  useExperimentTimer,
  useResumableVideoProgress,
  VerificationConfidence
} from "../engines/shared";

import type {
  MatchEngineProps,
  TwoXVideoEngineData
} from "../methodEngineTypes";

type Stage =
  | "watch"
  | "test"
  | "confidence";

type Props = MatchEngineProps<TwoXVideoEngineData>;

function TwoXVideoSpeedMatch({
  method,
  data,
  originalScore,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("watch");
  const [answers, setAnswers] =
    useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);
  const { elapsedMs } = useExperimentTimer({
    startImmediately: true
  });
  const {
    checkpoint: checkpointVideo,
    videoProps
  } = useResumableVideoProgress(2);
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
      {stage === "watch" && (
        <div>
          <h2>{data.topic}</h2>
          <video
            {...videoProps}
            controls
            preload="metadata"
            data-playback-speed="2"
          >
            <source
              src={data.mediaSrc}
              type="video/mp4"
            />
          </video>
          <StudyPanel>
            <ul>
              {data.focusPoints.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </StudyPanel>
          <button
            onClick={() => {
              checkpointVideo();
              setStage("test");
            }}
          >
            I finished at 2x · test comprehension
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
          prompt="How confident are you at 2x?"
          value={confidence}
          onChange={setConfidence}
          completeLabel="Complete verification"
          onComplete={finish}
        />
      )}
    </section>
  );
}

export default TwoXVideoSpeedMatch;
