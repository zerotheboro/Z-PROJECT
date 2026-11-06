// @vitest-environment jsdom
import React, { createRef } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BaselineChallenge from "../sections/BaselineChallenge";
import MethodLab from "../sections/MethodLab";
import MethodMatchChallenge from "../sections/MethodMatchChallenge";
import { baselineConceptContentSets, baselineMemoryContentSets } from "../assessmentData";
import { AssessmentQuestionUXProvider, AssessmentSoundToggle, useAssessmentCompletionSound } from "../AssessmentQuestionUX";
import type { QuestionInteractionControl } from "../AssessmentQuestionUX";
import { createAssessmentProgressSound, ASSESSMENT_PROGRESS_SOUND_SOURCE } from "../assessmentProgressSound";
import { questionUXStorageKey } from "../questionUXState";
import * as registry from "../methodRegistry";
import type { MethodExperimentResult, TrainingMethodId } from "../type";
import ActiveRecallExperiment from "../experiments/ActiveRecallExperiment";
import ActiveBlurtingExperiment from "../experiments/ActiveBlurtingExperiment";
import { activeRecallExperiment, activeBlurtingExperiment } from "../methodLabData";

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const memory = baselineMemoryContentSets[0], concept = baselineConceptContentSets[0];
function memoryConfidence() {
  click("Start challenge"); click("I'm ready");
  memory.questions.forEach((q, i) => { click(q.correct); click(i === memory.questions.length - 1 ? "Finish memory test" : "Next question"); });
}
function understandingConfidence() {
  click("I'm ready");
  concept.questions.forEach((q, i) => { click(q.correct); click(i === concept.questions.length - 1 ? "Finish understanding test" : "Next question"); });
}
function CompletionEvents() {
  const complete = useAssessmentCompletionSound();
  return <><button onClick={() => complete("section:1")}>Commit section</button>
    <button onClick={() => complete("section:3")}>Commit next section</button></>;
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("the two Baseline confidence decisions", () => {
  it("shows 4 immediately, advances Memory at 300ms and submits Understanding's exact 3 once", () => {
    const done = vi.fn(); render(<BaselineChallenge random={() => 0} onComplete={done} />); memoryConfidence();
    click("4"); expect(screen.getByRole("button", { name: "4" }).className).toBe("confidence selected");
    tick(299); expect(screen.getByRole("button", { name: "4" })).toBeTruthy(); tick(1);
    expect(screen.getByRole("heading", { name: concept.title })).toBeTruthy(); understandingConfidence();
    click("3"); expect(done).not.toHaveBeenCalled(); tick(299); expect(done).not.toHaveBeenCalled(); tick(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toMatchObject({ memory: { confidence: 4, score: 1 }, understanding: { confidence: 3, score: 1 } });
    tick(1000); click("Continue to Method Lab"); expect(done).toHaveBeenCalledTimes(1);
  });

  it("replaces a pending rating and uses the latest value without stale submission", () => {
    const done = vi.fn(); render(<BaselineChallenge random={() => 0} onComplete={done} />); memoryConfidence();
    click("4"); tick(200); click("2"); tick(299);
    expect(screen.getByRole("button", { name: "2" }).className).toContain("selected"); tick(1);
    understandingConfidence(); click("5"); tick(200); click("3"); tick(299); expect(done).not.toHaveBeenCalled(); tick(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toMatchObject({ memory: { confidence: 2 }, understanding: { confidence: 3 } });
  });

  it("manual Continue cancels the delayed action instead of completing twice", () => {
    const done = vi.fn(); render(<BaselineChallenge random={() => 0} onComplete={done} />); memoryConfidence();
    click("4"); click("Continue"); tick(1000); understandingConfidence();
    click("3"); click("Continue to Method Lab"); tick(1000); expect(done).toHaveBeenCalledTimes(1);
  });

  it.each(["pause", "unmount"])("cancels pending confidence advancement on %s", action => {
    const control = createRef<QuestionInteractionControl>(), done = vi.fn();
    const view = render(<AssessmentQuestionUXProvider controlRef={control}>
      <BaselineChallenge random={() => 0} onComplete={done} /></AssessmentQuestionUXProvider>);
    memoryConfidence(); click("4");
    if (action === "pause") act(() => control.current?.pause()); else view.unmount();
    tick(1000); expect(done).not.toHaveBeenCalled();
    if (action === "pause") expect(screen.getByRole("button", { name: "4" }).className).toContain("selected");
  });
});

describe("central optional completion sound", () => {
  it("uses the existing MP3, opts in, deduplicates completions and reuses a 35%-volume player", () => {
    expect(ASSESSMENT_PROGRESS_SOUND_SOURCE).toBe("/sounds/section-complete.MP3");
    const audio = { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), currentTime: 0, volume: 1 };
    const factory = vi.fn(() => audio);
    const view = render(<AssessmentQuestionUXProvider createAudio={factory}><AssessmentSoundToggle /><CompletionEvents /></AssessmentQuestionUXProvider>);
    expect(factory).not.toHaveBeenCalled(); click("Commit section"); expect(factory).not.toHaveBeenCalled();
    click("Completion sound: off"); click("Commit section"); expect(factory).not.toHaveBeenCalled();
    click("Commit next section"); click("Commit next section"); expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.volume).toBe(0.35); expect(factory).toHaveBeenCalledTimes(1);
    view.unmount(); expect(audio.pause).toHaveBeenCalledTimes(1);
  });

  it("does not play on loading, refresh, replay or paused navigation", () => {
    const play = vi.fn().mockResolvedValue(undefined), factory = () => ({ play, pause: vi.fn(), currentTime: 0 });
    const key = questionUXStorageKey({ kind: "user", uid: "student-a" }, "session-a");
    const control = createRef<QuestionInteractionControl>();
    const content = <AssessmentQuestionUXProvider storageKey={key} controlRef={control} createAudio={factory}>
      <AssessmentSoundToggle /><CompletionEvents /></AssessmentQuestionUXProvider>;
    const view = render(content); click("Completion sound: off"); click("Commit section"); expect(play).toHaveBeenCalledTimes(1);
    view.unmount(); render(content); expect(play).toHaveBeenCalledTimes(1);
    click("Completion sound: off"); click("Commit section"); expect(play).toHaveBeenCalledTimes(1);
    act(() => control.current?.pause()); click("Commit next section"); expect(play).toHaveBeenCalledTimes(1);
    act(() => control.current?.resume()); expect(play).toHaveBeenCalledTimes(1);
  });

  it("respects reduced stimulation for real completion events", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const factory = vi.fn(); render(<AssessmentQuestionUXProvider createAudio={factory}><AssessmentSoundToggle /><CompletionEvents /></AssessmentQuestionUXProvider>);
    expect((screen.getByRole("button", { name: /reduced stimulation/ }) as HTMLButtonElement).disabled).toBe(true);
    click("Commit section"); expect(factory).not.toHaveBeenCalled();
  });

  it.each(["missing", "blocked"])("handles %s audio without blocking committed activity", async kind => {
    const play = vi.fn().mockRejectedValue(new Error("Playback blocked"));
    const sound = createAssessmentProgressSound("missing.mp3", () => {
      if (kind === "missing") throw new Error("Audio unavailable");
      return { play, pause: vi.fn(), currentTime: 0 };
    });
    expect(() => sound.play()).not.toThrow(); await Promise.resolve(); sound.dispose();
  });
});

describe("individual Lab and Match completion callbacks", () => {
  it.each(["active-recall", "active-blurting"] as const)("keeps %s ratings visibly selected and manually submitted", method => {
    const done = vi.fn(), recall = method === "active-recall";
    const Component = recall ? ActiveRecallExperiment : ActiveBlurtingExperiment;
    const data = recall ? activeRecallExperiment : activeBlurtingExperiment;
    render(<Component method={method} category="memory" name="Recall" data={data} onComplete={done} />);
    click("Start experiment"); click("I'm ready");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "The material is recalled in my own words." } });
    click("Continue"); if (!recall) click("Continue to test");
    data.questions.forEach((q, i) => { click(q.correct); click(i === data.questions.length - 1 ? "Finish test" : "Next question"); });
    screen.getAllByRole("button", { name: "4" }).forEach(button => fireEvent.click(button));
    expect(document.querySelectorAll(".rating-choice.selected")).toHaveLength(3);
    tick(1000); expect(done).not.toHaveBeenCalled();
    click("Complete experiment"); expect(done).toHaveBeenCalledTimes(1);
  });

  it.each(["lab", "match"])("plays once per committed %s, including the last activity, and stays silent on resume", kind => {
    const real = registry.getMethodDefinition;
    const methods: TrainingMethodId[] = ["active-recall", "feynman"];
    const result = (method: TrainingMethodId): MethodExperimentResult => ({
      method, category: real(method).category, correct: 1, total: 1,
      score: method === "active-recall" ? 1 : 0.5, confidence: 3, ease: 3, willingnessToUse: 3, timeSpentMs: 10
    });
    vi.spyOn(registry, "getMethodDefinition").mockImplementation(method => ({
      ...real(method), renderLab: (_id, done) => <button onClick={() => done(result(method))}>Finish {method}</button>,
      renderMatch: (_id, originalScore, done) => <button onClick={() => done({
        method, firstScore: originalScore, verificationScore: 1, confidence: 3, timeSpentMs: 10
      })}>Finish {method}</button>
    }));
    const done = vi.fn(), play = vi.fn().mockResolvedValue(undefined);
    const factory = () => ({ play, pause: vi.fn(), currentTime: 0 });
    const content = <AssessmentQuestionUXProvider storageKey={`completion-${kind}`} createAudio={factory}>
      <AssessmentSoundToggle />{kind === "lab"
        ? <MethodLab methods={methods} random={() => 0} onComplete={done} />
        : <MethodMatchChallenge methodLab={{ experiments: methods.map(result) }} random={() => 0} onComplete={done} />}
    </AssessmentQuestionUXProvider>;
    const view = render(content); expect(play).not.toHaveBeenCalled(); click("Completion sound: off");
    click("Finish active-recall"); expect(play).toHaveBeenCalledTimes(1); expect(done).not.toHaveBeenCalled();
    click("Finish feynman"); expect(play).toHaveBeenCalledTimes(2); expect(done).toHaveBeenCalledTimes(1);
    click("Finish feynman"); expect(play).toHaveBeenCalledTimes(2); expect(done).toHaveBeenCalledTimes(1);
    view.unmount(); render(content); expect(play).toHaveBeenCalledTimes(2);
  });
});
