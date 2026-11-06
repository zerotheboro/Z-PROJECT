// @vitest-environment jsdom
import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { CumulativeProfileSnapshot } from "../../services/cumulativeProfileReader";
import { createTrainingDraft } from "../trainingProgress";
import { TrainingProgressStateProvider } from "../trainingProgressState";
import { pilotForm } from "../economics9708/progressPilot/forms";
import type { PilotForm } from "../economics9708/progressPilot/forms";
import { pilotHistory } from "../economics9708/progressPilot/model";
import { economicsAssignments } from "../economics9708/allocation";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { armProgressPilot, readProgressPilot, resetProgressPilot, syncProgressPilotOwner } from "../../services/economicsProgressPilotSession";
import { followRecord, followProfile, FOLLOW_UID } from "../../../test-support/economicsFollowThroughFixtures";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null }, enabled: true, snapshot: undefined as CumulativeProfileSnapshot | undefined,
  listener: null as ((u: User | null) => void) | null, instructionMount: vi.fn(), draftChange: vi.fn()
}));
vi.mock("../../firebase", () => ({ auth: mocks.auth }));
vi.mock("../../services/auth", () => ({ subscribeToAuth: (listener: typeof mocks.listener) => { mocks.listener = listener; return () => { mocks.listener = null; }; } }));
vi.mock("../../services/economicsProgressPilot", () => ({ progressPilotEnabled: () => mocks.enabled }));
vi.mock("../../hooks/useStudyStrategyEvidence", () => ({ useStudyStrategyEvidence: () => ({ data: mocks.snapshot, loading: false, error: false }) }));
import Boundary, { PilotCheck } from "../economics9708/progressPilot/ProgressPilotBoundary";

function draftFor(topic = "1.5") { return createTrainingDraft({ owner: { kind: "user", uid: FOLLOW_UID }, mode: "auto", selectedMethods: [],
  sessionId: "pilot-ui-session", economicsTopicId: topic, economicsActivityVersion: "mapped-1" }); }
function Instruction() { useEffect(() => { mocks.instructionMount(); }, []); return <p>Original study material</p>; }
function experience(draft: ReturnType<typeof draftFor>) { return <Boundary draft={draft}>
  <TrainingProgressStateProvider state={draft.internalState} onChange={mocks.draftChange}><Instruction /></TrainingProgressStateProvider>
</Boundary>; }
function finish(form: PilotForm, correct = true) {
  fireEvent.click(screen.getByRole("button", { name: `Try Form ${form.name} (2 questions)` }));
  form.items.forEach((item, i) => {
    const answer = correct ? item.question.correct : item.question.options.find(o => o !== item.question.correct)!;
    fireEvent.click(screen.getByRole("button", { name: answer }));
    fireEvent.click(screen.getByRole("button", { name: i === 0 ? "Next question" : "Finish optional check" }));
  });
}
beforeEach(() => { resetProgressPilot(); vi.clearAllMocks(); mocks.enabled = true; mocks.snapshot = undefined;
  mocks.auth.currentUser = { uid: FOLLOW_UID } as User; });
afterEach(() => { cleanup(); resetProgressPilot(); });

it.each(["1.5", "2.2"])("keeps %s instruction unmounted until the initial check ends; records performance separately", topic => {
  const draft = draftFor(topic), frozenDraft = structuredClone(draft); armProgressPilot(mocks.auth.currentUser!, draft, topic);
  const page = render(experience(draft));
  expect(screen.queryByText("Original study material")).toBeNull(); expect(mocks.instructionMount).not.toHaveBeenCalled();
  finish(pilotForm(topic, "A")!);
  expect(screen.getByText("Original study material")).toBeTruthy(); expect(mocks.instructionMount).toHaveBeenCalledOnce();
  expect(readProgressPilot(mocks.auth.currentUser, draft.sessionId)?.initial?.correct).toBe(2);
  const completed = { ...draft, section: 7 }; page.rerender(experience(completed));
  finish(pilotForm(topic, "B")!);
  const result = within(screen.getByRole("complementary", { name: "Local optional check results" }));
  expect(result.getByText("Initial check: 2 of 2 correct.")).toBeTruthy();
  expect(result.getByText("Subsequent check: 2 of 2 correct.")).toBeTruthy();
  expect(result.getByText(/No numerical learning gain/)).toBeTruthy();
  expect(result.getByText(/not accepted evidence/)).toBeTruthy();
  expect(draft).toEqual(frozenDraft); expect(mocks.draftChange).not.toHaveBeenCalled();
});
it("allows skipping both checks without adding a result or delaying ordinary Training", () => {
  const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5"); const page = render(experience(d));
  fireEvent.click(screen.getByRole("button", { name: "Skip initial check and continue Training" }));
  expect(screen.getByText("Original study material")).toBeTruthy(); page.rerender(experience({ ...d, section: 7 }));
  fireEvent.click(screen.getByRole("button", { name: "Skip subsequent check" }));
  const entry = readProgressPilot(mocks.auth.currentUser, d.sessionId)!;
  expect(entry.initial).toBeNull(); expect(entry.subsequent).toBeNull(); expect(entry.subsequentSkipped).toBe(true);
});
it("shows known familiarity for a returning student and does not mistake it for a first-ever check", () => {
  mocks.snapshot = followProfile([followRecord()]); const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5");
  render(experience(d)); finish(pilotForm("1.5", "A")!);
  expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)?.initial?.answers[0].exposure).toBe("known-repeat");
});
it("updates exposure from delayed accepted history at the moment a form starts", () => {
  const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5"); const page = render(experience(d));
  mocks.snapshot = followProfile([followRecord()]); page.rerender(experience(d));
  expect(screen.getByText(/not a first-ever knowledge test/)).toBeTruthy(); finish(pilotForm("1.5", "A")!);
  expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)?.initial?.answers[0].exposure).toBe("known-repeat");
});
it("conservatively flags a question prepared for display without treating missing current-session answers as unseen", () => {
  const d = createTrainingDraft({ owner: { kind: "user", uid: FOLLOW_UID }, mode: "manual", selectedMethods: ["memory-palace", "feynman"],
    sessionId: "pilot-display-trace-session", economicsTopicId: "1.5", economicsActivityVersion: "mapped-1" });
  armProgressPilot(mocks.auth.currentUser!, d, "1.5"); mocks.snapshot = followProfile([]);
  const page = render(experience(d)); fireEvent.click(screen.getByRole("button", { name: "Skip initial check and continue Training" }));
  d.labContentSetIds = economicsAssignments(d.selectedMethods, "lab", "1.5", "mapped-1");
  const contentId = d.labContentSetIds[1], question = resolveEconomicsAssessment(contentId).scored.find(q => q.id === "ec9708-1.5-lab-9-v1")!;
  d.internalState[`lab:feynman:${contentId}`] = { slots: [], named: { "answer-option-orders": { [question.id]: [...question.options] } } };
  page.rerender(experience({ ...d, section: 7 }));
  expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)?.subsequentSkipped).toBe(false);
  expect(screen.getByRole("button", { name: "Try Form B (2 questions)" })).toBeTruthy();
  expect(screen.getByText(/may have been prepared for display/)).toBeTruthy();
  finish(pilotForm("1.5", "B")!);
  const result = readProgressPilot(mocks.auth.currentUser, d.sessionId)!.subsequent!;
  expect(result.answers[0].exposure).toBe("possible-repeat");
  expect(result.answers[1].exposure).toBe("unknown");
  expect(result.measurementClaims.learningGain).toBe("unavailable");
});
it("does not manufacture improvement from a higher subsequent draft-form result", () => {
  const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5"); const page = render(experience(d));
  finish(pilotForm("1.5", "A")!, false); page.rerender(experience({ ...d, section: 7 })); finish(pilotForm("1.5", "B")!);
  expect(screen.getByText("Initial check: 0 of 2 correct.")).toBeTruthy();
  expect(screen.getByText("Subsequent check: 2 of 2 correct.")).toBeTruthy(); expect(screen.queryByText(/100%|gain:|improved by/i)).toBeNull();
});
it("rejects incomplete/unavailable initial forms while retaining a working skip action", () => {
  const skip = vi.fn(); render(<PilotCheck form={{ ...pilotForm("1.5", "A")!, items: [], status: "unavailable" }}
    history={pilotHistory(FOLLOW_UID, "1.5")} currentAnswered={new Set()} instructionOpened={false} onComplete={vi.fn()} onSkip={skip} />);
  expect(screen.getByRole("status").textContent).toContain("unavailable or incomplete"); expect(screen.queryByText(/Try Form/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip initial check and continue Training" })); expect(skip).toHaveBeenCalledOnce();
});
it("clears previous-user check data on account switching, including a new same-UID auth instance", () => {
  const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5"); const page = render(experience(d)); finish(pilotForm("1.5", "A")!);
  mocks.auth.currentUser = { uid: "student-b" } as User; syncProgressPilotOwner(mocks.auth.currentUser); page.rerender(experience(d));
  expect(screen.queryByRole("region", { name: "Optional initial check" })).toBeNull();
  expect(screen.queryByText("Original study material")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("sign-in changed");
  expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)).toBeNull();
  mocks.auth.currentUser = { uid: FOLLOW_UID } as User; page.rerender(experience({ ...d, section: 7 }));
  expect(screen.queryByText("Initial check: 2 of 2 correct.")).toBeNull();
});
it("does not recover an initial check from a draft after refresh/memory loss", () => {
  const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5"); const page = render(experience(d)); finish(pilotForm("1.5", "A")!);
  page.unmount(); resetProgressPilot(); render(experience(d));
  expect(screen.getByText(/No initial or subsequent result was restored/)).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Optional initial check" })).toBeNull(); expect(screen.getByText("Original study material")).toBeTruthy();
});
it("never labels a restored in-progress draft as pre-study even if an old fresh-session marker remains", () => {
  const d = draftFor(); armProgressPilot(mocks.auth.currentUser!, d, "1.5");
  render(experience({ ...d, section: 4 }));
  expect(screen.queryByRole("region", { name: "Optional initial check" })).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("No pre-study result can be recorded");
  expect(screen.getByText("Original study material")).toBeTruthy();
});
it("leaves other topics and disabled environments untouched", () => {
  const d = draftFor("2.3"), page = render(experience(d)); expect(screen.getByText("Original study material")).toBeTruthy();
  expect(screen.queryByText(/Optional check memory/)).toBeNull();
  const supported = draftFor(); armProgressPilot(mocks.auth.currentUser!, supported, "1.5"); mocks.enabled = false; page.rerender(experience(supported));
  expect(screen.queryByRole("region", { name: "Optional initial check" })).toBeNull();
});
