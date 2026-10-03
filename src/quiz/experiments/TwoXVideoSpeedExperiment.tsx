import {
  useTrainingState as useState
} from "../trainingProgressState";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  useExperimentTimer,
  useResumableVideoProgress
} from "../engines/shared";

import type {
  LabEngineProps,
  TwoXVideoEngineData
} from "../methodEngineTypes";

type Stage =
  | "intro"
  | "watch"
  | "test"
  | "reflection";

type Props = LabEngineProps<TwoXVideoEngineData>;

function TwoXVideoSpeedExperiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("intro");
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
  const {
    checkpoint: checkpointVideo,
    videoProps
  } = useResumableVideoProgress(2);
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
          <p>
            This measures whether 2x works for you; it is not universally better.
          </p>
          <button
            onClick={() => {
              start();
              setStage("watch");
            }}
          >
            Start 2x playback
          </button>
        </div>
      )}

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
            prompt: "How manageable was 2x?",
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

export default TwoXVideoSpeedExperiment;
