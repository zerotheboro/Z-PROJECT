// @vitest-environment jsdom
import React, { createRef, useState } from "react";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import LearningSituation from "../sections/LearningSituation";
import BaselineChallenge from "../sections/BaselineChallenge";
import MultipleChoiceRunner from "../engines/shared/MultipleChoiceRunner";
import VerificationConfidence from "../engines/shared/VerificationConfidence";
import { AssessmentQuestionUXProvider, AssessmentSoundToggle, QUESTION_ADVANCE_DELAY_MS } from "../AssessmentQuestionUX";
import type { QuestionInteractionControl } from "../AssessmentQuestionUX";
import { createAssessmentProgressSound } from "../assessmentProgressSound";
import { createQuestionUXState, questionUXStorageKey } from "../questionUXState";
import MethodIntroduction from "../sections/MethodIntroduction";
import { getMethodDefinition } from "../methodRegistry";
import FeynmanExperiment from "../experiments/FeynmanExperiment";
import { feynmanExperiment } from "../methodLabData";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import type { TrainingInternalState } from "../trainingProgress";
import { baselineMemoryContentSets, learningSituationQuestions } from "../assessmentData";
import type { MultipleChoiceQuestion } from "../methodEngineTypes";

const questions: MultipleChoiceQuestion[] = ["one", "two", "three"].map(id => ({
  id, question: `Question ${id}`, options: ["A", "B", "C", "D"], correct: "A"
}));
const tick = async (ms = QUESTION_ADVANCE_DELAY_MS) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const value = () => screen.getByRole("progressbar").getAttribute("aria-valuenow");

function ChoiceSequence({ finish = () => undefined, count = 3 }: { finish?: () => void; count?: number }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const list = questions.slice(0, count), current = list[index];
  return <MultipleChoiceRunner question={current} selectedAnswer={answers[current.id]}
    progress={{ questions: list, answers, id: "answers" }} random={() => 0.999}
    onSelect={answer => setAnswers(previous => ({ ...previous, [current.id]: answer }))}
    onBack={() => setIndex(previous => Math.max(0, previous - 1))} backDisabled={index === 0}
    onNext={() => index < list.length - 1 ? setIndex(previous => previous + 1) : finish()}
    nextLabel={index === list.length - 1 ? "Finish quiz" : "Next question"} />;
}

function SavedSituation({ initial = {}, snapshot = () => undefined, children }:
  { initial?: TrainingInternalState; snapshot?: (state: TrainingInternalState) => void; children?: ReactNode }) {
  const [state, setState] = useState(initial);
  return <TrainingProgressStateProvider state={state} onChange={next => { setState(next); snapshot(next); }}>
    <TrainingStateScope name="situation">{children ?? <LearningSituation onComplete={() => undefined} />}</TrainingStateScope>
  </TrainingProgressStateProvider>;
}

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("valid question navigation", () => {
  it("shows selection, counts the answer and advances once after 300ms", async () => {
    render(<ChoiceSequence />);
    expect(value()).toBe("0");
    click("A");
    expect(screen.getByRole("button", { name: "A" }).className).toContain("selected");
    expect(value()).toBe("1");
    await tick(299);
    expect(screen.getByRole("heading", { name: "Question one" })).toBeTruthy();
    await tick(1);
    expect(screen.getByRole("heading", { name: "Question two" })).toBeTruthy();
    await tick(1000);
    expect(screen.getByRole("heading", { name: "Question two" })).toBeTruthy();
  });

  it("keeps manual Next without a second delayed submission", async () => {
    const finish = vi.fn();
    render(<ChoiceSequence count={1} finish={finish} />);
    click("A"); click("Finish quiz"); click("Finish quiz");
    await tick(1000);
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("cancels stale transitions on Back and retains answers, option order and progress", async () => {
    render(<ChoiceSequence />);
    expect((screen.getByRole("button", { name: "Back" }) as HTMLButtonElement).disabled).toBe(true);
    const order = Array.from(document.querySelectorAll(".option-grid button"), button => button.textContent);
    click("A"); await tick(); click("B"); click("Back"); await tick(1000);
    expect(screen.getByRole("heading", { name: "Question one" })).toBeTruthy();
    expect(value()).toBe("2");
    expect(Array.from(document.querySelectorAll(".option-grid button"), button => button.textContent)).toEqual(order);
    expect(screen.getByRole("button", { name: "A" }).className).toContain("selected");
    click("C"); await tick();
    expect(screen.getByRole("heading", { name: "Question two" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "B" }).className).toContain("selected");
    await tick(1000);
    expect(screen.getByRole("heading", { name: "Question two" })).toBeTruthy();
  });

  it("replaces a pending choice and cancels navigation on unmount/account change", async () => {
    const finish = vi.fn();
    const view = render(<ChoiceSequence count={1} finish={finish} />);
    click("A"); await tick(200); click("B"); await tick(200);
    expect(finish).not.toHaveBeenCalled();
    view.unmount(); await tick(1000);
    expect(finish).not.toHaveBeenCalled();
    render(<ChoiceSequence count={1} finish={finish} />); await tick(1000);
    expect(value()).toBe("0"); expect(finish).not.toHaveBeenCalled();
  });

  it.each([1, 2])("confirms one selection manually and two automatically, respecting the maximum (%i choices)", async count => {
    render(<LearningSituation onComplete={() => undefined} />);
    click("Remember information for longer"); await tick();
    const note = screen.getByText("Choose up to 2");
    expect(note.tagName).toBe("STRONG");
    click("I understand things, but forget them later");
    if (count === 2) {
      click("I lose focus quickly"); click("I struggle to understand difficult ideas");
      expect(document.querySelectorAll(".assessment-option.selected")).toHaveLength(2);
    }
    await tick(count === 2 ? 299 : 1000);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[1].question })).toBeTruthy();
    expect(value()).toBe("1");
    if (count === 2) await tick(1);
    else click("Continue");
    // A physical double click must not confirm the next question too.
    fireEvent.click(screen.getByRole("button", { name: "Continue" }), { detail: 2 });
    expect(screen.getByRole("heading", { name: learningSituationQuestions[2].question })).toBeTruthy();
    expect(value()).toBe("2");
  });

  it("preserves the final section transition and exact answers", async () => {
    const complete = vi.fn(); render(<LearningSituation onComplete={complete} />);
    click("Remember information for longer"); await tick();
    click("I understand things, but forget them later"); click("Continue");
    click("Facts, terms and definitions"); click("Continue");
    for (const item of learningSituationQuestions.slice(3)) { click(item.options[0].label); await tick(); }
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toMatchObject({ goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"] });
    await tick(1000); expect(complete).toHaveBeenCalledTimes(1);
  });

  it("restores confirmed progress through existing draft state, and invalidates only an edited multi answer", async () => {
    const snapshots: TrainingInternalState[] = [];
    const view = render(<SavedSituation snapshot={state => snapshots.push(state)} />);
    click("Remember information for longer"); await tick();
    click("I understand things, but forget them later"); click("Continue");
    await act(async () => undefined);
    const state = structuredClone(snapshots.at(-1)!);
    const draft = { ...createTrainingDraft({ owner: { kind: "guest" }, mode: "auto", sessionId: "ux-resume" }), internalState: state };
    const validated = validateTrainingDraft(draft, { kind: "guest" });
    expect(validated.valid, JSON.stringify(validated)).toBe(true);
    view.unmount(); render(<SavedSituation initial={draft.internalState} />);
    expect(value()).toBe("2"); click("Back"); await tick(1000);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[1].question })).toBeTruthy();
    expect(screen.getByRole("button", { name: "I understand things, but forget them later" }).className).toContain("selected");
    click("I lose focus quickly"); expect(value()).toBe("1");
    click("Continue"); expect(value()).toBe("2");
  });

  it("keeps completed questions from legacy drafts without assuming future multi answers were confirmed", async () => {
    render(<SavedSituation initial={{ situation: { slots: [3, { goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"], currentApproach: null, sessionLength: null, learningContext: null }], named: {} } }} />);
    expect(value()).toBe("3"); click("Back"); await tick(1000);
    expect(value()).toBe("3");
  });

  it("Save and Exit pauses pending navigation before asynchronous persistence", async () => {
    const control = createRef<QuestionInteractionControl>();
    render(<AssessmentQuestionUXProvider controlRef={control}><LearningSituation onComplete={() => undefined} /></AssessmentQuestionUXProvider>);
    click("Remember information for longer");
    act(() => control.current?.pause()); await tick(1000);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[0].question })).toBeTruthy();
    act(() => control.current?.resume()); await tick(1000);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[0].question })).toBeTruthy();
    click("Continue"); expect(screen.getByRole("heading", { name: learningSituationQuestions[1].question })).toBeTruthy();
  });

  it("preserves confirmed multi progress after Back, save and refresh without adding draft fields", async () => {
    let saved: TrainingInternalState = {};
    const storageKey = questionUXStorageKey({ kind: "user", uid: "student-a" }, "session-a");
    const view = render(<AssessmentQuestionUXProvider storageKey={storageKey}><SavedSituation snapshot={state => { saved = state; }} /></AssessmentQuestionUXProvider>);
    click("Remember information for longer"); await tick();
    click("I lose focus quickly"); click("Continue"); click("Back");
    expect(value()).toBe("2");
    view.unmount();
    render(<AssessmentQuestionUXProvider storageKey={storageKey}><SavedSituation initial={structuredClone(saved)} /></AssessmentQuestionUXProvider>);
    expect(value()).toBe("2"); await tick(1000);
    expect(screen.getByRole("heading", { name: learningSituationQuestions[1].question })).toBeTruthy();
    expect(saved.situation.named ?? {}).toEqual({});
  });

  it.each([3, 4])("keeps %i-method introductions explicit, then auto-advances the actual knowledge check", async count => {
    const methods = (["active-recall", "feynman", "leitner-system", "interleaving"] as const).slice(0, count);
    const complete = vi.fn();
    render(<MethodIntroduction methods={methods} onComplete={complete} />);
    await tick(1000); expect(screen.queryByRole("progressbar")).toBeNull();
    for (let index = 0; index < methods.length - 1; index++) click("Next method");
    click("Check my understanding");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe(String(count));
    click(getMethodDefinition(methods[0]).introduction.name); await tick();
    click("Back"); await tick(1000);
    expect(value()).toBe("1");
    click("Next question");
    for (const method of methods.slice(1)) { click(getMethodDefinition(method).introduction.name); await tick(); }
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({ methods, correct: count, total: count, score: 1 });
  });

  it.each([1, 2, 3])("uses the actual conditional quiz length %i and not a fixed overall denominator", count => {
    render(<ChoiceSequence count={count} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe(String(count));
    click("A"); expect(value()).toBe("1");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(`1 of ${count} questions completed`);
  });
});

describe("optional progress audio", () => {
  it("stays silent and creates no audio when its asset is unavailable", async () => {
    const factory = vi.fn(); render(<AssessmentQuestionUXProvider soundSource={null} createAudio={factory}><AssessmentSoundToggle /><ChoiceSequence /></AssessmentQuestionUXProvider>);
    expect(screen.queryByRole("button", { name: /Completion sound/ })).toBeNull();
    click("A"); await tick(); expect(factory).not.toHaveBeenCalled();
  });

  it("keeps individual answers silent after opting in, including editing and Back", async () => {
    const play = vi.fn().mockResolvedValue(undefined), factory = vi.fn(() => ({ play, pause: vi.fn(), currentTime: 0 }));
    render(<AssessmentQuestionUXProvider soundSource="synthetic-unit-fixture" createAudio={factory}><AssessmentSoundToggle /><ChoiceSequence /></AssessmentQuestionUXProvider>);
    expect(factory).not.toHaveBeenCalled(); click("Completion sound: off");
    click("A"); click("B"); expect(play).not.toHaveBeenCalled();
    await tick(); click("A"); expect(play).not.toHaveBeenCalled();
    click("Back"); await tick(1000); click("C"); expect(play).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
  });

  it("keeps multi-select questions silent, including invalid submissions", async () => {
    const play = vi.fn().mockResolvedValue(undefined), factory = vi.fn(() => ({ play, pause: vi.fn(), currentTime: 0 }));
    render(<AssessmentQuestionUXProvider soundSource="synthetic-unit-fixture" createAudio={factory}><AssessmentSoundToggle /><LearningSituation onComplete={() => undefined} /></AssessmentQuestionUXProvider>);
    click("Completion sound: off"); click("Continue"); expect(play).not.toHaveBeenCalled();
    click("Remember information for longer"); await tick(); expect(play).not.toHaveBeenCalled();
    click("I lose focus quickly"); await tick(1000); expect(play).not.toHaveBeenCalled();
    click("Continue"); expect(play).not.toHaveBeenCalled();
  });

  it("blocked playback does not delay or break navigation", async () => {
    const play = vi.fn().mockRejectedValue(new Error("Playback blocked"));
    render(<AssessmentQuestionUXProvider soundSource="synthetic-unit-fixture" createAudio={() => ({ play, pause: vi.fn(), currentTime: 0 })}><AssessmentSoundToggle /><ChoiceSequence /></AssessmentQuestionUXProvider>);
    click("Completion sound: off"); click("A"); await tick();
    expect(screen.getByRole("heading", { name: "Question two" })).toBeTruthy();
  });

  it("honors reduced sensory stimulation", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const factory = vi.fn();
    render(<AssessmentQuestionUXProvider soundSource="synthetic-unit-fixture" createAudio={factory}><AssessmentSoundToggle /><ChoiceSequence /></AssessmentQuestionUXProvider>);
    expect((screen.getByRole("button", { name: /reduced stimulation/ }) as HTMLButtonElement).disabled).toBe(true);
    click("A"); expect(factory).not.toHaveBeenCalled();
  });

  it("stops its player on unmount and does not replay an edited answer after refresh", async () => {
    const pause = vi.fn(), play = vi.fn().mockResolvedValue(undefined);
    const factory = () => ({ play, pause, currentTime: 0 });
    const storageKey = questionUXStorageKey({ kind: "guest" }, "sound-session");
    const view = render(<AssessmentQuestionUXProvider storageKey={storageKey} soundSource="synthetic-unit-fixture" createAudio={factory}><AssessmentSoundToggle /><ChoiceSequence /></AssessmentQuestionUXProvider>);
    click("Completion sound: off"); click("A"); await tick();
    view.unmount(); expect(pause).not.toHaveBeenCalled();
    render(<AssessmentQuestionUXProvider storageKey={storageKey} soundSource="synthetic-unit-fixture" createAudio={factory}><AssessmentSoundToggle /><ChoiceSequence /></AssessmentQuestionUXProvider>);
    click("Completion sound: off"); click("B"); expect(play).not.toHaveBeenCalled();
  });

  it("handles unavailable audio APIs and disposes a reused player", () => {
    const unavailable = createAssessmentProgressSound("synthetic-unit-fixture", () => { throw new Error("Unavailable"); });
    expect(() => unavailable.play()).not.toThrow();
    const pause = vi.fn(), play = vi.fn().mockResolvedValue(undefined);
    const sound = createAssessmentProgressSound("synthetic-unit-fixture", () => ({ play, pause, currentTime: 0 }));
    sound.play(); sound.play(); sound.dispose(); expect(play).toHaveBeenCalledTimes(2); expect(pause).toHaveBeenCalledTimes(1);
  });
});

describe("display-only progress cache", () => {
  it("isolates owners and sessions and rejects a mismatched cache header", () => {
    const a = questionUXStorageKey({ kind: "user", uid: "a" }, "session");
    const b = questionUXStorageKey({ kind: "user", uid: "b" }, "session");
    const other = questionUXStorageKey({ kind: "user", uid: "a" }, "other");
    createQuestionUXState(a).set("situation", "confirmed", "difficulties", ["forgetting"]);
    expect(createQuestionUXState(a).get("situation", "confirmed", "difficulties")).toEqual(["forgetting"]);
    for (const key of [b, other]) {
      expect(createQuestionUXState(key).get("situation", "confirmed", "difficulties")).toBeUndefined();
      localStorage.setItem(key, localStorage.getItem(a)!);
      expect(createQuestionUXState(key).get("situation", "confirmed", "difficulties")).toBeUndefined();
    }
    createQuestionUXState(a).clear(); expect(localStorage.getItem(a)).toBeNull();
  });

  it("keeps display progress usable when optional storage fails", () => {
    const fail = () => { throw new Error("Storage full"); };
    const cache = createQuestionUXState("optional-cache", { getItem: fail, setItem: fail, removeItem: fail, clear: fail, key: fail, length: 0 });
    expect(() => cache.set("situation", "confirmed", "difficulties", ["forgetting"])).not.toThrow();
    expect(cache.get("situation", "confirmed", "difficulties")).toEqual(["forgetting"]);
    expect(() => cache.clear()).not.toThrow();
  });
});

describe("timing and explicit completion gates", () => {
  it("retains written-response validation and requires explicit submission even after valid typing", async () => {
    render(<FeynmanExperiment method="feynman" category="understanding" name="Feynman" data={feynmanExperiment} onComplete={vi.fn()} />);
    click("Start experiment"); click("I'm ready");
    const answer = screen.getByPlaceholderText("Explain the concept...");
    fireEvent.change(answer, { target: { value: "Too short" } });
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(answer, { target: { value: "A complete written explanation that meets the existing minimum length." } });
    await tick(1000);
    expect(screen.getByPlaceholderText("Explain the concept...")).toBeTruthy();
    click("Continue"); expect(screen.getByPlaceholderText("Explain it simply...")).toBeTruthy();
  });

  it("preserves the study countdown and the final confidence gate after automatic answers", async () => {
    const complete = vi.fn(); render(<BaselineChallenge onComplete={complete} random={() => 0} />);
    click("Start challenge");
    expect(screen.getByRole("timer").textContent?.trim()).toBe(`${baselineMemoryContentSets[0].studyTime}s`);
    await tick(1000);
    expect(screen.getByRole("timer").textContent?.trim()).toBe(`${baselineMemoryContentSets[0].studyTime - 1}s`);
    click("I'm ready");
    for (const item of baselineMemoryContentSets[0].questions) { click(item.correct); await tick(); }
    expect(screen.getByRole("heading", { name: /How confident are you that you remembered/ })).toBeTruthy();
    expect(complete).not.toHaveBeenCalled(); await tick(1000);
    expect(screen.getByRole("heading", { name: /How confident are you that you remembered/ })).toBeTruthy();
  });

  it("does not submit confidence ratings before explicit confirmation or twice afterward", () => {
    const complete = vi.fn();
    function Ratings() { const [answer, setAnswer] = useState<number | null>(null); return <VerificationConfidence prompt="Confidence?" value={answer} onChange={setAnswer} completeLabel="Confirm rating" onComplete={complete} />; }
    render(<Ratings />); click("Confirm rating"); expect(complete).not.toHaveBeenCalled();
    click("3"); expect(complete).not.toHaveBeenCalled();
    click("Confirm rating"); click("Confirm rating"); expect(complete).toHaveBeenCalledTimes(1);
  });

  it("scopes instruction and tabular timer emphasis to the assessment", () => {
    const styles = readFileSync("src/quiz/TrainingExperience.scss", "utf8");
    expect(styles).toContain("font-variant-numeric: tabular-nums");
    expect(styles).toContain(".assessment.assessment-v2 .training-timer-value");
    expect(styles).toMatch(/\.selection-note\s*\{\s*font-weight: 800/);
  });
});
