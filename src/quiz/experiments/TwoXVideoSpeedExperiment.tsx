import {
  useTrainingState as useState
} from "../trainingProgressState";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer,
  useResumableYouTubeProgress,
  YouTubeTrainingPlayer
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
  const videoProgress =
    useResumableYouTubeProgress();
  const [notes, setNotes] = useState("");
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
    <section className="two-x-video-method">
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
          <YouTubeTrainingPlayer
            youtubeId={data.youtubeId}
            title={data.videoTitle}
            channel={data.channel}
            playbackRate={2}
            progressController={videoProgress}
          />
          <div className="two-x-video-notes">
            <h3>Your notes</h3>
            <TextResponse
              value={notes}
              onChange={setNotes}
              placeholder="Optional notes or thoughts..."
            />
          </div>
          <StudyPanel>
            <ul>
              {data.focusPoints.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </StudyPanel>
          <button
            onClick={() => {
              videoProgress.checkpoint();
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
          onBack={() =>
            setIndex(value =>
              Math.max(0, value - 1)
            )
          }
          backDisabled={index === 0}
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
