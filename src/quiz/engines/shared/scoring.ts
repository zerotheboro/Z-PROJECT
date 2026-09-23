import type {
  MultipleChoiceQuestion
} from "../../methodEngineTypes";

export function scoreMultipleChoice(
  questions:
    readonly MultipleChoiceQuestion[],
  answers: Readonly<Record<string, string>>
) {
  const correct = questions.reduce(
    (score, question) =>
      answers[question.id] ===
      question.correct
        ? score + 1
        : score,
    0
  );
  const total = questions.length;

  return {
    correct,
    total,
    score:
      total === 0
        ? 0
        : correct / total
  };
}
