import type {
  ReactNode
} from "react";
import { useQuestionAdvance } from "../../AssessmentQuestionUX";

type Rating = {
  prompt: ReactNode;
  value: number | null;
  onChange: (value: number) => void;
  highlightSelection?: boolean;
};

type Props = {
  confidence: Rating;
  ease: Rating;
  willingnessToUse: Rating;
  completeLabel: string;
  onComplete: () => void;
};

function RatingScale({
  value,
  onChange,
  highlightSelection = true
}: Omit<Rating, "prompt">) {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(
        (rating) => (
          <button
            type="button"
            key={rating}
            className={highlightSelection
              ? value === rating
                ? "rating-choice selected"
                : "rating-choice"
              : undefined}
            onClick={() => onChange(rating)}
          >
            {rating}
          </button>
        )
      )}
    </div>
  );
}

function LabRatings({
  confidence,
  ease,
  willingnessToUse,
  completeLabel,
  onComplete
}: Props) {
  const submission = useQuestionAdvance("lab-ratings", () => {
    if (confidence.value === null || ease.value === null || willingnessToUse.value === null) return false;
    onComplete();
    return true;
  });
  return (
    <>
      <h3>{confidence.prompt}</h3>
      <RatingScale {...confidence} />

      <h3>{ease.prompt}</h3>
      <RatingScale {...ease} />

      <h3>{willingnessToUse.prompt}</h3>
      <RatingScale {...willingnessToUse} />

      <button
        type="button"
        disabled={
          confidence.value === null ||
          ease.value === null ||
          willingnessToUse.value === null
        }
        onClick={event => { if (event.detail < 2) submission.completeNow(); }}
      >
        {completeLabel}
      </button>
    </>
  );
}

export default LabRatings;
