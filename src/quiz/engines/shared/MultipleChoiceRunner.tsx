import type {
  MultipleChoiceQuestion
} from "../../methodEngineTypes";

type Props = {
  question: MultipleChoiceQuestion;
  selectedAnswer: string | undefined;
  onSelect: (option: string) => void;
  onNext: () => void;
  nextLabel: string;
};

function MultipleChoiceRunner({
  question,
  selectedAnswer,
  onSelect,
  onNext,
  nextLabel
}: Props) {
  return (
    <>
      <h2>{question.question}</h2>

      <div className="option-grid">
        {question.options.map((option) => (
          <button
            type="button"
            key={option}
            className={
              selectedAnswer === option
                ? "assessment-option selected"
                : "assessment-option"
            }
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selectedAnswer}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </>
  );
}

export default MultipleChoiceRunner;
