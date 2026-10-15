import {
  useRef,
  useState
} from "react";

import {
  auth
} from "../../../firebase";
import {
  judgeTrainingWriting
} from "../../../services/writingJudge";
import {
  useWritingJudgeRecord
} from "./WritingJudgeProvider";

export type WritingJudgeTask = {
  taskId: string;
  sourceMaterial: string;
};

function FeedbackList({
  heading,
  items
}: {
  heading: string;
  items: string[];
}) {
  return (
    <div>
      <h4>{heading}</h4>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${index}:${item}`}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p>None identified.</p>
      )}
    </div>
  );
}

function WritingJudgeControl({
  task,
  userWriting
}: {
  task: WritingJudgeTask;
  userWriting: string;
}) {
  const {
    available,
    sessionId,
    methodId,
    result,
    save
  } = useWritingJudgeRecord(
    task.taskId,
    userWriting
  );
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const inFlight = useRef(false);

  if (!available || !sessionId || !methodId) {
    return null;
  }

  async function judge() {
    if (
      inFlight.current ||
      !sessionId ||
      !methodId ||
      userWriting.trim().length === 0
    ) {
      return;
    }

    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const feedback = await judgeTrainingWriting(
        auth.currentUser,
        {
          sessionId,
          taskId: task.taskId,
          methodId,
          sourceMaterial: task.sourceMaterial,
          userWriting
        }
      );
      save(feedback);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Writing evaluation failed. Please try again."
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={
          loading ||
          userWriting.trim().length === 0
        }
        onClick={() => void judge()}
      >
        {loading
          ? "Judging..."
          : "Judge my writing"}
      </button>

      {error && (
        <p role="alert">{error}</p>
      )}

      {result && (
        <section aria-label="AI writing feedback">
          <h3>AI writing feedback</h3>
          <p>
            <strong>Overall score:</strong>{" "}
            {result.score}/100
          </p>
          <p>
            <strong>Accuracy:</strong>{" "}
            {result.accuracy}/100
          </p>
          <p>
            <strong>Coverage:</strong>{" "}
            {result.coverage}/100
          </p>
          <p>
            <strong>Clarity:</strong>{" "}
            {result.clarity}/100
          </p>
          <p>
            <strong>Verdict:</strong>{" "}
            {result.verdict}
          </p>
          <FeedbackList
            heading="Strengths"
            items={result.strengths}
          />
          <FeedbackList
            heading="Missing points"
            items={result.missingPoints}
          />
          <FeedbackList
            heading="Misconceptions"
            items={result.misconceptions}
          />
          <p>
            <strong>Recommended next action:</strong>{" "}
            {result.nextAction}
          </p>
        </section>
      )}
    </div>
  );
}

export default WritingJudgeControl;
