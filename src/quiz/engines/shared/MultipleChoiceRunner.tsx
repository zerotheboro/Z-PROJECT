import type {
  MultipleChoiceQuestion
} from "../../methodEngineTypes";

import {
  useShuffledOptions
} from "./shuffleOptions";

import type {
  RandomSource
} from "./shuffleOptions";
import {
  optionsForDifficulty
} from "./adaptiveDifficulty";
import {
  useAdaptiveChallenge
} from "./AdaptiveDifficultyProvider";

type Props = {
  question: MultipleChoiceQuestion;
  selectedAnswer: string | undefined;
  onSelect: (option: string) => void;
  onBack: () => void;
  backDisabled: boolean;
  onNext: () => void;
  nextLabel: string;
  random?: RandomSource;
};

function MultipleChoiceRunner({
  question,
  selectedAnswer,
  onSelect,
  onBack,
  backDisabled,
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
  const {
    difficulty,
    commit
  } = useAdaptiveChallenge(question.id);
  const displayedOptions =
    optionsForDifficulty(
      shuffledOptions,
      question.correct,
      difficulty
    );

  return (
    <>
      <h2>{question.question}</h2>

      <div className="option-grid">
        {displayedOptions.map((option) => (
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
        disabled={backDisabled}
        onClick={onBack}
      >
        Back
      </button>

      <button
        type="button"
        disabled={!selectedAnswer}
        onClick={() => {
          if (!selectedAnswer) {
            return;
          }

          commit({
            correct:
              selectedAnswer ===
                question.correct
                ? 1
                : 0,
            total: 1
          });
          onNext();
        }}
      >
        {nextLabel}
      </button>
    </>
  );
}

export default MultipleChoiceRunner;
