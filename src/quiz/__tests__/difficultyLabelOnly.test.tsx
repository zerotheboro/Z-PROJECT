// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import MultipleChoiceRunner from "../engines/shared/MultipleChoiceRunner";
import { AdaptiveDifficultyProvider, AdaptiveDifficultyScope } from "../engines/shared/AdaptiveDifficultyProvider";
import { createAdaptiveDifficultyState } from "../engines/shared/adaptiveDifficulty";
import type { AdaptiveDifficulty, AdaptiveDifficultyState } from "../engines/shared/adaptiveDifficulty";
import { scoreMultipleChoice } from "../engines/shared/scoring";
import { baselineMemoryContentSets, baselineConceptContentSets } from "../assessmentData";
import { methodLabContentSets, methodMatchContentSets } from "../methodContentSets";
import { activeRecallExperiment } from "../methodLabData";
import { legacyQuestionOptions, isCompatibleQuestionAnswer } from "../legacyQuestionOptions";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import { encodeFirestoreTrainingDraft, decodeFirestoreTrainingDraft } from "../../services/trainingDraftFirestoreCodec";
import type { MultipleChoiceQuestion } from "../methodEngineTypes";
import type { TrainingInternalState } from "../trainingProgress";
import { shuffleOptions } from "../engines/shared/shuffleOptions";

const scope = "lab:active-recall:active-recall-lab-1";
const question = activeRecallExperiment.questions[0];
const previous = legacyQuestionOptions(question)!;
const oldWrong = previous.find(o => o !== question.correct)!;
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const offered = () => Array.from(document.querySelectorAll(".option-grid button"), item => item.textContent);

function Choice({ state, name = scope, initialAnswer, onNext = vi.fn(), onChange = vi.fn(), q = question }:
  { state: AdaptiveDifficultyState; name?: string; initialAnswer?: string; onNext?: () => void;
    onChange?: (state: AdaptiveDifficultyState) => void; q?: MultipleChoiceQuestion }) {
  const [answer, setAnswer] = useState(initialAnswer);
  return <AdaptiveDifficultyProvider state={state} onChange={onChange}>
    <AdaptiveDifficultyScope name={name}>
      <MultipleChoiceRunner question={q} selectedAnswer={answer} onSelect={setAnswer} onBack={() => undefined}
        backDisabled onNext={onNext} nextLabel="Next" random={() => 0.99}
        progress={{ questions: [q], answers: answer ? { [q.id]: answer } : {}, id: "answers" }} />
    </AdaptiveDifficultyScope>
  </AdaptiveDifficultyProvider>;
}

function allQuestions() {
  const questions = new Map<string, MultipleChoiceQuestion>();
  function visit(value: unknown) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const q = value as Partial<MultipleChoiceQuestion>;
    if (typeof q.id === "string" && typeof q.question === "string" && typeof q.correct === "string" && Array.isArray(q.options)) {
      questions.set(q.id, q as MultipleChoiceQuestion); return;
    }
    Object.values(value).forEach(visit);
  }
  [baselineMemoryContentSets, baselineConceptContentSets, methodLabContentSets, methodMatchContentSets].forEach(visit);
  return [...questions.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("four options with display-only difficulty", () => {
  for (const name of ["baseline", scope, "match:feynman:feynman-match-1"]) {
    it.each(["easy", "medium", "hard"] as const)(`${name} displays four choices at %s without adaptive writes`, level => {
      const state = { ...createAdaptiveDifficultyState(), level }, change = vi.fn(), next = vi.fn();
      const original = structuredClone(state);
      render(<Choice state={state} name={name} onChange={change} onNext={next} />);
      expect(offered()).toHaveLength(4);
      expect(screen.getByLabelText("Difficulty").textContent).toBe(`Difficulty: ${level[0].toUpperCase() + level.slice(1)}`);
      click(question.correct); act(() => { vi.advanceTimersByTime(300); });
      expect(next).toHaveBeenCalledTimes(1); expect(change).not.toHaveBeenCalled(); expect(state).toEqual(original);
      expect(scoreMultipleChoice([question], { [question.id]: question.correct }).score).toBe(1);
    });
  }

  it("changing only the label keeps the exact options, ordering and correct key", () => {
    const view = render(<Choice state={{ ...createAdaptiveDifficultyState(), level: "easy" }} />);
    const initial = offered();
    view.rerender(<Choice state={{ ...createAdaptiveDifficultyState(), level: "hard" }} />);
    expect(offered()).toEqual(initial); expect(offered()).toContain(question.correct);
  });

  it.each(["easy", "medium", "hard"] as const)("preserves an already assigned %s question's original option count and wording", level => {
    const state = { ...createAdaptiveDifficultyState(), level: "hard" as AdaptiveDifficulty,
      challengeLevels: { [`${scope}:${question.id}`]: level } };
    const internal: TrainingInternalState = { [scope]: { slots: [], named: {
      "answer-option-orders": { [question.id]: [oldWrong, question.correct, ...previous.filter(o => o !== oldWrong && o !== question.correct)] }
    } } };
    const next = vi.fn(), onChange = vi.fn();
    render(<TrainingProgressStateProvider state={internal} onChange={() => undefined}>
      <TrainingStateScope name={scope}><Choice state={state} initialAnswer={oldWrong} onNext={next} onChange={onChange} /></TrainingStateScope>
    </TrainingProgressStateProvider>);
    expect(offered()).toHaveLength(level === "easy" ? 2 : level === "medium" ? 3 : 4);
    expect(offered()).toContain(oldWrong); expect(offered()).not.toContain(question.options[1]);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    click("Next"); expect(next).toHaveBeenCalledTimes(1); expect(onChange).not.toHaveBeenCalled();
    expect(scoreMultipleChoice([question], { [question.id]: oldWrong }).score).toBe(0);
  });

  it("a refreshed new question keeps its reviewed four choices without a new persistence field", () => {
    const internal: TrainingInternalState = { [scope]: { slots: [], named: { "answer-option-orders": { [question.id]: [...question.options] } } } };
    const renderSaved = () => <TrainingProgressStateProvider state={internal} onChange={() => undefined}>
      <TrainingStateScope name={scope}><Choice state={createAdaptiveDifficultyState()} initialAnswer={question.correct} /></TrainingStateScope>
    </TrainingProgressStateProvider>;
    const view = render(renderSaved()); expect(offered()).toEqual(question.options); view.unmount();
    render(renderSaved()); expect(offered()).toEqual(question.options);
  });

  it("restores a reviewed incorrect answer even if its optional shuffled-order cache is absent", () => {
    const reviewedWrong = question.options.find(o => o !== question.correct && !previous.includes(o))!;
    const next = vi.fn(); render(<Choice state={createAdaptiveDifficultyState()} initialAnswer={reviewedWrong} onNext={next} />);
    expect(offered()).toHaveLength(4); expect(offered()).toContain(reviewedWrong); expect(offered()).not.toContain(oldWrong);
    click("Next"); expect(next).toHaveBeenCalledTimes(1);
  });

  it("an unseen question in an older draft gets four choices without modifying its previous assignments", () => {
    const state = { ...createAdaptiveDifficultyState(), level: "easy" as const,
      challengeLevels: { [`${scope}:${question.id}`]: "easy" as const } };
    render(<Choice state={state} q={activeRecallExperiment.questions[1]} />);
    expect(offered()).toHaveLength(4); expect(Object.keys(state.challengeLevels)).toHaveLength(1);
  });

  it("Back keeps a saved two-choice question unchanged after entering a new four-choice question", () => {
    const state = { ...createAdaptiveDifficultyState(), challengeLevels: { [`${scope}:${question.id}`]: "easy" as const } };
    const saved: TrainingInternalState = { [scope]: { slots: [], named: {
      "answer-option-orders": { [question.id]: [oldWrong, question.correct, ...previous.filter(o => o !== oldWrong && o !== question.correct)] }
    } } };
    function Sequence() {
      const [index, setIndex] = useState(0);
      const [answers, setAnswers] = useState<Record<string, string>>({ [question.id]: oldWrong });
      const q = activeRecallExperiment.questions[index];
      return <MultipleChoiceRunner question={q} selectedAnswer={answers[q.id]}
        onSelect={a => setAnswers(old => ({ ...old, [q.id]: a }))}
        onNext={() => setIndex(1)} onBack={() => setIndex(0)} backDisabled={index === 0} nextLabel="Next" />;
    }
    render(<TrainingProgressStateProvider state={saved} onChange={() => undefined}>
      <TrainingStateScope name={scope}><AdaptiveDifficultyProvider state={state} onChange={() => undefined}>
        <AdaptiveDifficultyScope name={scope}><Sequence /></AdaptiveDifficultyScope>
      </AdaptiveDifficultyProvider></TrainingStateScope>
    </TrainingProgressStateProvider>);
    const original = offered(); expect(original).toHaveLength(2); click("Next"); expect(offered()).toHaveLength(4);
    click("Back"); expect(offered()).toEqual(original);
  });
});

describe("fixed question-bank and draft compatibility", () => {
  it("can display the unchanged correct key at every position without mutating authored options", () => {
    const positions = [0, 0.3, 0.4, 0.99].map(random => shuffleOptions(question.options, () => random).indexOf(question.correct));
    expect(new Set(positions).size).toBe(4);
    expect(question.options[0]).toBe(question.correct);
  });
  it("preserves all 582 question IDs, prompts, correct keys and authored counts from the pre-edit inventory", () => {
    const list = allQuestions(); expect(list).toHaveLength(582);
    const fingerprint = createHash("sha256").update(JSON.stringify(list.map(q => ({ id: q.id, question: q.question, correct: q.correct, count: q.options.length })))).digest("hex");
    expect(fingerprint).toBe("e558d3a82889a5494aeee25442d5f577176ce478839cbd0f6106bdc62fd1a0b8");
    for (const q of list) {
      expect(q.options, q.id).toHaveLength(4);
      expect(q.options.filter(o => o === q.correct), q.id).toHaveLength(1);
      expect(new Set(q.options.map(o => o.trim().toLocaleLowerCase())).size, q.id).toBe(4);
      const numeric = q.options.map(o => {
        const fraction = o.match(/^(\d+)\s*[:/]\s*(\d+)$/);
        return fraction ? Number(fraction[1]) / Number(fraction[2]) : /^\d+(\.\d+)?$/.test(o) ? Number(o) : null;
      });
      if (numeric.every(n => n !== null)) expect(new Set(numeric).size, q.id).toBe(4);
    }
  });

  it("keeps previous saved text valid but rejects arbitrary answers and mixed-version orders", () => {
    const draft = createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", selectedMethods: ["active-recall"] });
    draft.section = 4; draft.phase = "lab"; draft.labContentSetIds = ["active-recall-lab-1"];
    draft.completed.methodIntroduction = { methods: ["active-recall"], score: 1, correct: 1, total: 1 };
    draft.adaptiveDifficulty.challengeLevels[`${scope}:${question.id}`] = "easy";
    draft.internalState[scope] = { slots: ["test", "Remembered bee communication.", { [question.id]: oldWrong }, 0,
      null, null, null, { accumulatedMs: 0, running: true }, null, null],
      named: { "answer-option-orders": { [question.id]: [...previous] } } };
    expect(validateTrainingDraft(draft)).toMatchObject({ valid: true });
    expect(decodeFirestoreTrainingDraft(encodeFirestoreTrainingDraft(draft))).toEqual(draft);
    const invalid = structuredClone(draft); invalid.internalState[scope].slots[2] = { [question.id]: "Unrecognized answer" };
    expect(validateTrainingDraft(invalid).valid).toBe(false);
    const mixed = structuredClone(draft);
    mixed.internalState[scope].named["answer-option-orders"] = { [question.id]: [question.correct, oldWrong, question.options[2], question.options[3]] };
    expect(validateTrainingDraft(mixed).valid).toBe(false);
    expect(isCompatibleQuestionAnswer(question, oldWrong)).toBe(true);
    expect(isCompatibleQuestionAnswer(question, "Unrecognized answer")).toBe(false);
  });
});
