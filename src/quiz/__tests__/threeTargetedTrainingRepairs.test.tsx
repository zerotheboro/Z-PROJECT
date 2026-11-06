// @vitest-environment jsdom
import React, { createRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningSituation from "../sections/LearningSituation";
import FeynmanExperiment from "../experiments/FeynmanExperiment";
import { AssessmentQuestionUXProvider, AssessmentSoundToggle } from "../AssessmentQuestionUX";
import type { QuestionInteractionControl } from "../AssessmentQuestionUX";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import type { TrainingInternalState } from "../trainingProgress";
import { questionUXStorageKey } from "../questionUXState";
import { learningSituationQuestions, baselineConceptContentSets, baselineMemoryContentSets } from "../assessmentData";
import { methodLabContentSets } from "../methodContentSets";
import { FEYNMAN_STUDY_SECONDS, activeRecallExperiment } from "../methodLabData";
import { getMethodDefinition } from "../methodRegistry";

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const tick = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const [a, b, c] = learningSituationQuestions[1].options;
const key = questionUXStorageKey({ kind: "guest" }, "three-repairs");
const progress = () => screen.getByRole("progressbar").getAttribute("aria-valuenow");
const selected = () => Array.from(document.querySelectorAll(".learning-situation button[aria-pressed=true]"), item => item.textContent?.trim());

function Situation({ initial = {}, snapshot = () => undefined, control, blocked = false, soundSource = null, play = vi.fn() }:
  { initial?: TrainingInternalState; snapshot?: (state: TrainingInternalState) => void;
    control?: React.MutableRefObject<QuestionInteractionControl | null>; blocked?: boolean; soundSource?: string | null; play?: () => Promise<void> }) {
  const [state, setState] = useState(initial);
  return <TrainingProgressStateProvider state={state} onChange={next => { setState(next); snapshot(next); }}>
    <AssessmentQuestionUXProvider storageKey={key} controlRef={control} blocked={blocked} soundSource={soundSource}
      createAudio={() => ({ play, pause: vi.fn(), currentTime: 0 })}>
      <AssessmentSoundToggle />
      <TrainingStateScope name="situation"><LearningSituation onComplete={vi.fn()} /></TrainingStateScope>
    </AssessmentQuestionUXProvider>
  </TrainingProgressStateProvider>;
}

async function reachMulti() { click(learningSituationQuestions[0].options[0].label); await tick(300); }

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("fresh second-choice completion", () => {
  it("keeps zero invalid and leaves one selected after 500ms", async () => {
    render(<Situation />); await reachMulti();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    click(a.label); await tick(500);
    expect(selected()).toEqual([a.label]); expect(progress()).toBe("1");
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("saves both choices and advances once at exactly 300ms after the second", async () => {
    let state: TrainingInternalState = {};
    render(<Situation snapshot={next => { state = next; }} />); await reachMulti();
    click(a.label); await tick(500); click(b.label); await tick(299);
    expect(selected()).toEqual([a.label, b.label]);
    expect(state.situation.slots[1]).toMatchObject({ difficulties: [a.value, b.value] });
    await tick(1); expect(state.situation.slots[0]).toBe(2); expect(progress()).toBe("2");
    await tick(1000); expect(state.situation.slots[0]).toBe(2);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
  });

  it("retains the one-answer Continue alternative", async () => {
    render(<Situation />); await reachMulti(); click(a.label); click("Continue"); await tick(1000);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
    expect(progress()).toBe("2");
  });

  it("cancels when deselecting before the deadline and starts a fresh delay on replacement", async () => {
    render(<Situation />); await reachMulti(); click(a.label); click(b.label); await tick(200);
    click(a.label); await tick(500); expect(selected()).toEqual([b.label]); expect(progress()).toBe("1");
    click(c.label); await tick(299); expect(selected()).toEqual([b.label, c.label]);
    await tick(1); expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
  });

  it("ignores a third choice without resetting the valid pending transition", async () => {
    render(<Situation />); await reachMulti(); click(a.label); click(b.label); await tick(200); click(c.label);
    expect(selected()).toEqual([a.label, b.label]); await tick(100);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
  });

  it("does not advance restored two-choice answers on Back, and permits a fresh edit", async () => {
    render(<Situation />); await reachMulti(); click(a.label); click(b.label); await tick(300); click("Back");
    await tick(1000); expect(selected()).toEqual([a.label, b.label]); expect(progress()).toBe("2");
    click(b.label); click(c.label); await tick(300); click("Back"); await tick(500);
    expect(selected()).toEqual([a.label, c.label]); expect(progress()).toBe("2");
  });

  it("manual Continue during the delay cancels the timer and cannot skip the next question", async () => {
    let state: TrainingInternalState = {};
    render(<Situation snapshot={next => { state = next; }} />); await reachMulti();
    click(a.label); click(b.label); click("Continue"); await tick(1000);
    expect(state.situation.slots[0]).toBe(2); expect(progress()).toBe("2");
  });

  it("Save & Exit pauses a pending transition and refresh restores both answers without scheduling", async () => {
    let state: TrainingInternalState = {};
    const control = createRef<QuestionInteractionControl>();
    const view = render(<Situation control={control} snapshot={next => { state = next; }} />); await reachMulti();
    click(a.label); click(b.label); act(() => control.current?.pause()); await tick(1000);
    const draft = { ...createTrainingDraft({ owner: { kind: "guest" }, mode: "auto", sessionId: "three-repairs" }), internalState: structuredClone(state) };
    expect(validateTrainingDraft(draft, { kind: "guest" }).valid).toBe(true);
    expect(state.situation.slots[0]).toBe(1); view.unmount();
    render(<Situation initial={draft.internalState} />); await tick(1000);
    expect(selected()).toEqual([a.label, b.label]); click("Continue"); expect(progress()).toBe("2");
  });

  it.each(["discard", "unmount"])("cancels on %s without changing the saved question", async action => {
    let state: TrainingInternalState = {};
    const view = render(<Situation snapshot={next => { state = next; }} />); await reachMulti();
    click(a.label); click(b.label);
    if (action === "discard") view.rerender(<Situation blocked snapshot={next => { state = next; }} />);
    else view.unmount();
    await tick(1000); expect(state.situation.slots[0]).toBe(1);
  });

  it("does not duplicate sound or completed-question counts on manual confirmation, Back or editing", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    render(<Situation soundSource="synthetic-unit-fixture" play={play} />); click("Completion sound: off"); await reachMulti();
    click(a.label); expect(play).not.toHaveBeenCalled();
    click(b.label); expect(play).not.toHaveBeenCalled(); click("Continue"); await tick(1000);
    expect(progress()).toBe("2"); expect(play).not.toHaveBeenCalled();
    click("Back"); click(b.label); click(c.label); await tick(300);
    expect(progress()).toBe("2"); expect(play).not.toHaveBeenCalled();
  });
});

const contentId = "feynman-lab-1";
const scope = `lab:feynman:${contentId}`;
function TimedFeynman({ initial = {}, snapshot = () => undefined }:
  { initial?: TrainingInternalState; snapshot?: (state: TrainingInternalState) => void }) {
  const [state, setState] = useState(initial);
  return <TrainingProgressStateProvider state={state} onChange={next => { setState(next); snapshot(next); }}>
    {getMethodDefinition("feynman").renderLab(contentId, vi.fn())}
  </TrainingProgressStateProvider>;
}
function completedIntroductionDraft(state: TrainingInternalState) {
  const draft = createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", selectedMethods: ["feynman"] });
  draft.section = 4; draft.phase = "lab"; draft.labContentSetIds = [contentId];
  draft.completed.methodIntroduction = { methods: ["feynman"], correct: 1, total: 1, score: 1 };
  draft.internalState = structuredClone(state);
  return draft;
}

describe("identified Feynman study duration", () => {
  it.each(methodLabContentSets.feynman)("starts content $id at 01:00 using the shared duration", ({ data }) => {
    expect(FEYNMAN_STUDY_SECONDS).toBe(60); expect(data.studyTime).toBe(60);
    render(<FeynmanExperiment method="feynman" category="understanding" name="Feynman" data={data} onComplete={vi.fn()} />);
    click("Start experiment"); expect(screen.getByRole("timer").textContent).toContain("01:00");
  });

  it("validates the 60-second draft and resumes its saved remainder under the existing pause policy", async () => {
    let state: TrainingInternalState = {};
    const view = render(<TimedFeynman snapshot={next => { state = next; }} />); click("Start experiment");
    expect(validateTrainingDraft(completedIntroductionDraft(state)).valid).toBe(true);
    await tick(35000); expect(screen.getByRole("timer").textContent).toContain("00:25");
    const draft = completedIntroductionDraft(state); expect(validateTrainingDraft(draft).valid).toBe(true);
    view.unmount(); await tick(100000); render(<TimedFeynman initial={draft.internalState} />);
    expect(screen.getByRole("timer").textContent).toContain("00:25");
    await tick(25000); expect(screen.getByPlaceholderText("Explain the concept...")).toBeTruthy();
  });

  it("keeps an existing 35-second remainder rather than upgrading it to 60", async () => {
    let state: TrainingInternalState = {};
    const view = render(<TimedFeynman snapshot={next => { state = next; }} />); click("Start experiment"); view.unmount();
    const legacy = structuredClone(state); legacy[scope].slots[9] = 35;
    const draft = completedIntroductionDraft(legacy); expect(validateTrainingDraft(draft).valid).toBe(true);
    render(<TimedFeynman initial={draft.internalState} />);
    expect(screen.getByRole("timer").textContent).toContain("00:35");
    await tick(35000); expect(screen.getByPlaceholderText("Explain the concept...")).toBeTruthy();
  });

  it("leaves Baseline and Active Recall durations unchanged", () => {
    expect(baselineConceptContentSets.map(item => item.studyTime)).toEqual([35, 35, 35]);
    expect(baselineMemoryContentSets.map(item => item.studyTime)).toEqual([30, 30, 30]);
    expect(activeRecallExperiment.studyTime).toBe(30); expect(activeRecallExperiment.retrievalTime).toBe(30);
  });
});
