// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import LearningSituation from "../sections/LearningSituation";
import BaselineChallenge from "../sections/BaselineChallenge";
import ActiveRecallExperiment from "../experiments/ActiveRecallExperiment";
import FeynmanExperiment from "../experiments/FeynmanExperiment";
import TenMinuteWallStareExperiment from "../experiments/TenMinuteWallStareExperiment";
import TenMinuteWallStareMatch from "../matches/TenMinuteWallStareMatch";
import { activeRecallExperiment, feynmanExperiment, wallStareExperiment } from "../methodLabData";
import { wallStareMatchData } from "../methodMatchData";
import { baselineMemoryContentSets, learningSituationQuestions } from "../assessmentData";
import { AssessmentQuestionUXProvider, QUESTION_ADVANCE_DELAY_MS } from "../AssessmentQuestionUX";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import { questionUXStorageKey } from "../questionUXState";
import type { TrainingInternalState } from "../trainingProgress";

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const tick = async (milliseconds = QUESTION_ADVANCE_DELAY_MS) => {
  await act(async () => { vi.advanceTimersByTime(milliseconds); });
};
const selected = () => Array.from(document.querySelectorAll(".learning-situation button[aria-pressed=true]"), node => node.textContent?.trim());
const choices = learningSituationQuestions[1].options.slice(0, 3);
const storageKey = questionUXStorageKey({ kind: "guest" }, "multi-select-fix");

function SavedSituation({ initial = {}, snapshot = () => undefined }:
  { initial?: TrainingInternalState; snapshot?: (state: TrainingInternalState) => void }) {
  const [state, setState] = useState(initial);
  return <TrainingProgressStateProvider state={state} onChange={next => { setState(next); snapshot(next); }}>
    <AssessmentQuestionUXProvider storageKey={storageKey}>
      <TrainingStateScope name="situation"><LearningSituation onComplete={vi.fn()} /></TrainingStateScope>
    </AssessmentQuestionUXProvider>
  </TrainingProgressStateProvider>;
}

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Section 1 multi-select and selected-state semantics", () => {
  it("allows two, blocks a third, deselects/replaces and confirms exactly once through the real resumable provider", async () => {
    let state: TrainingInternalState = {};
    render(<SavedSituation snapshot={next => { state = next; }} />);
    click(learningSituationQuestions[0].options[0].label); await tick();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    click(choices[0].label); await tick(800);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[1].question })).toBeTruthy();
    expect(selected()).toEqual([choices[0].label]);
    click(choices[1].label); click(choices[2].label);
    expect(selected()).toEqual([choices[0].label, choices[1].label]);
    click(choices[0].label); expect(selected()).toEqual([choices[1].label]);
    click(choices[2].label); expect(selected()).toEqual([choices[1].label, choices[2].label]);
    click("Continue");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }), { detail: 2 });
    await tick(800);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    click("Back"); await tick(800);
    expect(selected()).toEqual([choices[1].label, choices[2].label]);
    expect(state.situation.slots[1]).toMatchObject({ difficulties: [choices[1].value, choices[2].value] });
    expect(screen.getByText("Choose up to 2").tagName).toBe("STRONG");
  });

  it("supports zero/one selections, editing after Back and unchanged draft validation on resume", async () => {
    let saved: TrainingInternalState = {};
    const view = render(<SavedSituation snapshot={next => { saved = next; }} />);
    click(learningSituationQuestions[0].options[0].label); await tick();
    click(choices[0].label); click(choices[0].label);
    expect(selected()).toEqual([]);
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    click(choices[1].label); await tick(800); click("Continue"); click("Back");
    click(choices[1].label); click(choices[2].label); click("Continue"); click("Back");
    const draft = { ...createTrainingDraft({ owner: { kind: "guest" }, mode: "auto", sessionId: "multi-select-fix" }), internalState: structuredClone(saved) };
    expect(validateTrainingDraft(draft, { kind: "guest" }).valid).toBe(true);
    view.unmount(); render(<SavedSituation initial={draft.internalState} />);
    expect(selected()).toEqual([choices[2].label]); await tick(800);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[1].question })).toBeTruthy();
    click("Continue"); expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
  });

  it("keeps selected hover styling separate from the unselected hover rule", () => {
    const styles = readFileSync("src/quiz/TrainingExperience.scss", "utf8");
    expect(styles).toContain(".assessment-option:hover:not(:disabled):not(.selected)");
    expect(styles).toContain(".assessment-option.selected:hover");
  });
});

describe("dedicated timer values without changing countdowns", () => {
  it("attaches the timer class to both Baseline phases and retains the confidence gate", async () => {
    render(<BaselineChallenge onComplete={vi.fn()} random={() => 0} />);
    click("Start challenge");
    expect(screen.getByRole("timer").classList.contains("training-timer-value")).toBe(true);
    click("I'm ready");
    for (const question of baselineMemoryContentSets[0].questions) { click(question.correct); await tick(); }
    expect(screen.queryByRole("timer")).toBeNull();
    click("3"); click("Continue");
    expect(screen.getByRole("timer").classList.contains("training-timer-value")).toBe(true);
  });

  it("keeps Active Recall study/retrieval timing and Feynman expiration unchanged", async () => {
    const view = render(<ActiveRecallExperiment method="active-recall" category="memory" name="Active Recall" data={activeRecallExperiment} onComplete={vi.fn()} />);
    click("Start experiment");
    expect(screen.getByRole("timer").classList.contains("training-timer-value")).toBe(true);
    expect(screen.getByRole("timer").textContent).toContain(`${activeRecallExperiment.studyTime}s`);
    click("I'm ready");
    expect(screen.getByRole("timer").classList.contains("training-timer-value")).toBe(true);
    expect(screen.getByRole("timer").textContent).toContain(`${activeRecallExperiment.retrievalTime}s`);
    await tick(activeRecallExperiment.retrievalTime! * 1000);
    expect(screen.getByRole("timer").textContent).toContain("0s");
    expect(screen.getByRole("timer").classList.contains("training-timer-value")).toBe(true);
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Write what you remember..."), { target: { value: "A valid remembered response." } });
    click("Continue");
    expect(screen.queryByRole("timer")).toBeNull(); view.unmount();
    render(<FeynmanExperiment method="feynman" category="understanding" name="Feynman" data={feynmanExperiment} onComplete={vi.fn()} />);
    click("Start experiment");
    expect(screen.getByRole("timer").classList.contains("training-timer-value")).toBe(true);
    await tick(feynmanExperiment.studyTime! * 1000);
    expect(screen.getByPlaceholderText("Explain the concept...")).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it.each(["lab", "verification"])("keeps the %s reset locked until 0:00, with the same timer class at expiration", async phase => {
    if (phase === "lab") {
      render(<TenMinuteWallStareExperiment method="ten-minute-wall-stare" category="focus" name="Reset" data={wallStareExperiment} onComplete={vi.fn()} />);
      click("Begin 10-minute reset");
    } else {
      render(<TenMinuteWallStareMatch method="ten-minute-wall-stare" name="Reset" data={wallStareMatchData} originalScore={0.5} onComplete={vi.fn()} />);
    }
    const timer = screen.getByLabelText("wall stare time remaining");
    expect(timer.classList.contains("training-timer-value")).toBe(true);
    expect(timer.textContent).toBe("10:00");
    await tick(599000);
    expect((screen.getByRole("button", { name: "Start studying" }) as HTMLButtonElement).disabled).toBe(true);
    await tick(1000);
    expect(timer.textContent).toBe("0:00");
    expect(timer.classList.contains("training-timer-value")).toBe(true);
    expect((screen.getByRole("button", { name: "Start studying" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("uses an assessment-scoped class strong enough to override the ordinary white paragraph rule", () => {
    const styles = readFileSync("src/quiz/TrainingExperience.scss", "utf8");
    expect(styles).toContain(".assessment.assessment-v2 .training-timer-value");
    const rule = styles.slice(styles.indexOf(".assessment.assessment-v2 .training-timer-value"));
    expect(rule).toContain("color: var(--darker-black)");
    expect(rule).toContain("background: var(--energetic--yellow)");
    expect(rule).toContain("font-weight: 800");
    expect(rule).toContain("font-variant-numeric: tabular-nums");
    expect(rule).toContain("font-size: clamp(1.35rem, 2vw, 1.85rem)");
  });
});
