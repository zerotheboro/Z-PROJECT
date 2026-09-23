import type {
  ReactNode
} from "react";

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
                  ? "selected"
                  : ""
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
        onClick={onComplete}
      >
        {completeLabel}
      </button>
    </>
  );
}

export default VerificationConfidence;
