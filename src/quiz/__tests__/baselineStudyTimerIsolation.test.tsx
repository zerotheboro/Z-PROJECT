// @vitest-environment jsdom
import React, { StrictMode, createRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BaselineChallenge from "../sections/BaselineChallenge";
import { baselineConceptContentSets, baselineMemoryContentSets } from "../assessmentData";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import { decodeFirestoreTrainingDraft, encodeFirestoreTrainingDraft } from "../../services/trainingDraftFirestoreCodec";
import type { TrainingInternalState } from "../trainingProgress";
import type { BaselineResult } from "../type";

const memory = baselineMemoryContentSets[0];
const concept = baselineConceptContentSets[0];
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const remaining = () => screen.getByRole("timer").textContent;
const checkpoint = createRef<(() => void) | null>();

function SavedBaseline({ initial = {}, snapshot = () => undefined, onComplete = vi.fn(), index = 0 }:
  { initial?: TrainingInternalState; snapshot?: (state: TrainingInternalState) => void;
    onComplete?: (result: BaselineResult) => void; index?: number }) {
  const [state, setState] = useState(initial);
  return <TrainingProgressStateProvider state={state} checkpointRef={checkpoint}
    onChange={next => { setState(next); snapshot(next); }}>
    <TrainingStateScope name="baseline">
      <BaselineChallenge random={() => (index + 0.5) / 3} onComplete={onComplete} />
    </TrainingStateScope>
  </TrainingProgressStateProvider>;
}

function finishMemory(index = 0) {
  click("I'm ready");
  const questions = baselineMemoryContentSets[index].questions;
  questions.forEach((question, i) => {
    click(question.correct);
    click(i === questions.length - 1 ? "Finish memory test" : "Next question");
  });
  click("3"); click("Continue");
}

function roundTrip(state: TrainingInternalState) {
  const draft = createTrainingDraft({ owner: { kind: "guest" }, mode: "auto", sessionId: "baseline-timer" });
  draft.section = 2; draft.phase = "baseline";
  draft.completed.learningSituation = {
    goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"],
    currentApproach: "rereading", sessionLength: "under-20", learningContext: "school"
  };
  draft.baselineContentSetIds = { memory: memory.id, understanding: concept.id };
  draft.internalState = structuredClone(state);
  expect(validateTrainingDraft(draft)).toMatchObject({ valid: true });
  const restored = decodeFirestoreTrainingDraft(encodeFirestoreTrainingDraft(draft));
  expect(restored).toEqual(draft);
  expect(validateTrainingDraft(restored)).toMatchObject({ valid: true });
  return draft.internalState;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-01T00:00:00Z")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Baseline study-entry timer ownership", () => {
  it.each([0, 1, 2])("gives Understanding its own configured duration after leaving Memory at 25s, variant %s", index => {
    render(<SavedBaseline index={index} />); click("Start challenge");
    expect(remaining()).toBe("30s"); tick(5000); expect(remaining()).toBe("25s");
    finishMemory(index);
    expect(remaining()).toBe("35s"); tick(20000); expect(remaining()).toBe("15s");
  });

  it("does not postpone expiry when the same study screen repeatedly rerenders", () => {
    const view = render(<SavedBaseline />); click("Start challenge");
    for (let i = 0; i < 5; i++) { tick(200); view.rerender(<SavedBaseline />); }
    expect(remaining()).toBe("29s");
    tick(28999); expect(remaining()).toBe("1s");
    tick(1); expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("heading", { name: memory.questions[0].question })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["memory", "understanding"])("saves and resumes the same unfinished %s entry without free time", stage => {
    let state: TrainingInternalState = {};
    const view = render(<SavedBaseline snapshot={next => { state = next; }} />); click("Start challenge");
    if (stage === "understanding") finishMemory();
    tick(stage === "memory" ? 5000 : 10000); expect(remaining()).toBe("25s");
    act(() => checkpoint.current?.());
    const saved = roundTrip(state); view.unmount(); tick(120000);
    render(<SavedBaseline initial={saved} />); expect(remaining()).toBe("25s");
    tick(24999); expect(remaining()).toBe("1s"); tick(1);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("heading", {
      name: (stage === "memory" ? memory : concept).questions[0].question
    })).toBeTruthy();
  });

  it.each(["memory", "understanding"])("does not restart an already expired saved %s entry", stage => {
    let state: TrainingInternalState = {};
    const view = render(<SavedBaseline snapshot={next => { state = next; }} />); click("Start challenge");
    if (stage === "understanding") finishMemory();
    view.unmount();
    const saved = structuredClone(state); saved.baseline.slots[10] = 0;
    render(<SavedBaseline initial={roundTrip(saved)} />);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("heading", {
      name: (stage === "memory" ? memory : concept).questions[0].question
    })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("expires both configured entries once under StrictMode and preserves original scoring", () => {
    const onComplete = vi.fn();
    render(<StrictMode><SavedBaseline onComplete={onComplete} /></StrictMode>); click("Start challenge");
    tick(29999); expect(remaining()).toBe("1s"); tick(1);
    memory.questions.forEach((question, i) => {
      click(question.correct); click(i === memory.questions.length - 1 ? "Finish memory test" : "Next question");
    });
    click("3"); click("Continue"); expect(remaining()).toBe("35s");
    tick(34999); expect(remaining()).toBe("1s"); tick(1); tick(60000);
    expect(screen.getByRole("heading", { name: concept.questions[0].question })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
    concept.questions.forEach((question, i) => {
      click(question.correct); click(i === concept.questions.length - 1 ? "Finish understanding test" : "Next question");
    });
    click("4"); click("Continue to Method Lab");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      memory: { correct: 4, total: 4, score: 1, confidence: 3 },
      understanding: { correct: 3, total: 3, score: 1, confidence: 4 }
    });
  });

  it("Back and refresh in an answer screen never reopen a completed study timer", () => {
    let state: TrainingInternalState = {};
    const view = render(<SavedBaseline snapshot={next => { state = next; }} />); click("Start challenge");
    tick(5000); click("I'm ready"); click(memory.questions[0].correct); click("Next question"); click("Back");
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("heading", { name: memory.questions[0].question })).toBeTruthy();
    const saved = roundTrip(state); view.unmount(); tick(60000);
    render(<SavedBaseline initial={saved} />); tick(60000);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("heading", { name: memory.questions[0].question })).toBeTruthy();
    expect(saved.baseline.slots[3]).toMatchObject({ [memory.questions[0].id]: memory.questions[0].correct });
  });
});
