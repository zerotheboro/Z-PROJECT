import type {
  ReactNode
} from "react";
import { useQuestionAdvance } from "../../AssessmentQuestionUX";

type Props = {
  prompt: ReactNode;
  value: number | null;
  onChange: (value: number) => void;
  completeLabel: string;
  onComplete: () => void;
};

function VerificationConfidence({
  prompt,
  value,
  onChange,
  completeLabel,
  onComplete
}: Props) {
  const submission = useQuestionAdvance("verification-confidence", () => {
    if (value === null) return false;
    onComplete();
    return true;
  });
  return (
    <>
      <h2>{prompt}</h2>

      <div>
        {[1, 2, 3, 4, 5].map(
          (rating) => (
            <button
              type="button"
              key={rating}
              className={
                value === rating
                  ? "rating-choice selected"
                  : "rating-choice"
              }
              onClick={() =>
                onChange(rating)
              }
            >
              {rating}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        disabled={value === null}
        onClick={event => { if (event.detail < 2) submission.completeNow(); }}
      >
        {completeLabel}
      </button>
    </>
  );
}

export default VerificationConfidence;
