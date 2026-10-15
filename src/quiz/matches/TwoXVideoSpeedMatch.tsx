import {
  useTrainingState as useState
} from "../trainingProgressState";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer,
  useResumableYouTubeProgress,
  YouTubeTrainingPlayer,
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
  const videoProgress =
    useResumableYouTubeProgress();
  const [notes, setNotes] = useState("");
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
    <section className="two-x-video-method">
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
