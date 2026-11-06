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
import { AssessmentSectionProgress, useQuestionAdvance } from "../../AssessmentQuestionUX";
import { isCompatibleQuestionAnswer, legacyQuestionOptions } from "../../legacyQuestionOptions";
import EconomicsDiagram from "../../economics9708/EconomicsDiagram";

type Props = {
  question: MultipleChoiceQuestion;
  selectedAnswer: string | undefined;
  onSelect: (option: string) => void;
  onBack: () => void;
  backDisabled: boolean;
  onNext: () => void;
  nextLabel: string;
  random?: RandomSource;
  progress?: {
    questions: readonly MultipleChoiceQuestion[];
    answers: Readonly<Record<string, string>>;
    id: string;
    label?: string;
  };
};

function MultipleChoiceRunner({
  question,
  selectedAnswer,
  onSelect,
  onBack,
  backDisabled,
  onNext,
  nextLabel,
  random,
  progress
}: Props) {
  const {
    difficulty,
    legacyOptionDifficulty,
    commit
  } = useAdaptiveChallenge(question.id);
  // An existing cached order wins inside useShuffledOptions. For older drafts
  // without that cache, a saved answer/assignment selects the previous bank.
  const previousOptions = legacyQuestionOptions(question);
  const offeredOptions = previousOptions && (legacyOptionDifficulty !== null ||
    selectedAnswer !== undefined && previousOptions.includes(selectedAnswer))
    ? previousOptions : question.options;
  const shuffledOptions =
    useShuffledOptions(
      offeredOptions,
      question.id,
      random
    );
  const displayedOptions =
    optionsForDifficulty(
      shuffledOptions,
      question.correct,
      legacyOptionDifficulty
    );
  const navigation = useQuestionAdvance(`${progress?.id ?? "quiz"}:${question.id}`, () => {
    if (!selectedAnswer || !shuffledOptions.includes(selectedAnswer)) return false;
    commit({ correct: selectedAnswer === question.correct ? 1 : 0, total: 1 });
    onNext();
    return true;
  });

  return (
    <>
      {progress && <AssessmentSectionProgress label={progress.label ?? "Current quiz"} total={progress.questions.length}
        completed={progress.questions.filter(item => isCompatibleQuestionAnswer(item, progress.answers[item.id])).length} />}
      <h2 aria-live="polite">{question.question}</h2>
      {question.diagram && <EconomicsDiagram diagram={question.diagram} />}
      {difficulty && <p aria-label="Difficulty">Difficulty: {difficulty[0].toUpperCase() + difficulty.slice(1)}</p>}

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
            onClick={() => {
              if (navigation.blocked()) return;
              onSelect(option);
              navigation.schedule();
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={backDisabled}
        onClick={() => { navigation.cancel(); onBack(); }}
      >
        Back
      </button>

      <button
        type="button"
        disabled={!selectedAnswer}
        onClick={event => { if (event.detail < 2) navigation.completeNow(); }}
      >
        {nextLabel}
      </button>
    </>
  );
}

export default MultipleChoiceRunner;
