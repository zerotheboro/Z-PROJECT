import type {
  ReactNode
} from "react";

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
                ? "selected"
                : ""
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
        onClick={onComplete}
      >
        {completeLabel}
      </button>
    </>
  );
}

export default LabRatings;
