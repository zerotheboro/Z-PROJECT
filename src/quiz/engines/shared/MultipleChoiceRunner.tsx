import type {
  MultipleChoiceQuestion
} from "../../methodEngineTypes";

import {
  useShuffledOptions
} from "./shuffleOptions";

import type {
  RandomSource
} from "./shuffleOptions";

type Props = {
  question: MultipleChoiceQuestion;
  selectedAnswer: string | undefined;
  onSelect: (option: string) => void;
  onNext: () => void;
  nextLabel: string;
  random?: RandomSource;
};

function MultipleChoiceRunner({
  question,
  selectedAnswer,
  onSelect,
  onNext,
  nextLabel,
  random
}: Props) {
  const shuffledOptions =
    useShuffledOptions(
      question.options,
      question.id,
      random
    );

  return (
    <>
      <h2>{question.question}</h2>

      <div className="option-grid">
        {shuffledOptions.map((option) => (
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
