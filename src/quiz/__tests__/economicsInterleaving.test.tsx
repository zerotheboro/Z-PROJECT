// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TrainingDraft } from "../trainingProgress";
import type { ComparisonEngineData } from "../methodEngineTypes";
import { economicsPacks } from "../economics9708/packs";
import { buildInterleaving, interleavingEligibilityGap, interleavingGroup } from "../economics9708/interleaving";
import { economicsAssignments } from "../economics9708/allocation";
import { getTrainingContentSet } from "../economics9708/adapter";
import { trainingLabContentSets, trainingMatchContentSets } from "../trainingContent";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { readEconomicsSelection } from "../economics9708/selection";
import { selectMethods } from "../methodSelector";
import { supportedEconomicsMethods } from "../economics9708/runtime";
import { getMethodDefinition } from "../methodRegistry";
import { TrainingProgressStateProvider } from "../trainingProgressState";
import { collectEconomicsResponses } from "../economics9708/collectAssessmentResponses";
import { economicsEvidenceFixture } from "../../../test-support/economicsEvidenceFixtures";
import { validateCompletion } from "../../../backend/trainingCompletionContract";

const mock = vi.hoisted(() => ({ draft: null as TrainingDraft | null, reserve: vi.fn(), save: vi.fn(), done: vi.fn() }));
vi.mock("../../firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("../../HEADER/header", () => ({ default: () => <nav>Existing navigation</nav> }));
vi.mock("../../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ loading: false, error: null, user: null, unlimited: false, manualMethodsRemaining: 3, refreshAccess: () => {} }) }));
vi.mock("../../services/trainingAccess", () => ({ reserveTrainingAccess: mock.reserve }));
vi.mock("../../services/trainingProgress", () => ({ saveTrainingDraft: mock.save, readLocalTrainingDraft: () => null }));
import ChooseMethods from "../ChooseMethods";
import MethodLab from "../sections/MethodLab";
beforeEach(() => { mock.draft = null; vi.clearAllMocks(); mock.save.mockImplementation(async (draft: TrainingDraft) => { mock.draft = draft; }); });
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function data(topic: string, phase: "lab" | "match") {
  const id = economicsAssignments(["interleaving"], phase, topic, "mapped-1")[0];
  const sets = phase === "lab" ? trainingLabContentSets.interleaving : trainingMatchContentSets.interleaving;
  return { id, data: getTrainingContentSet(sets, id).data as ComparisonEngineData };
}
function finishQuestions(questions: ComparisonEngineData["practice"], practice: boolean, nextTest = "Next question") {
  questions.forEach((q, i) => { click(q.correct); click(i === questions.length - 1 ? practice ? "Finish practice" : "Finish test" : practice ? "Next problem" : nextTest); });
}
function finishLab(topic: string) {
  const form = data(topic, "lab").data;
  click("Start experiment"); expect(screen.getAllByText(/calculation|explanation and application|diagram interpretation/).length).toBeGreaterThan(1);
  click("Start mixed practice"); finishQuestions(form.practice, true); finishQuestions(form.test, false);
  for (const prompt of ["How confident were you?", "How easy was it?", "Would you use mixed practice yourself?"])
    fireEvent.click(within(screen.getByRole("heading", { name: prompt }).nextElementSibling as HTMLElement).getByRole("button", { name: "3" }));
  click("Complete experiment");
}
function SelectedLab() {
  const [draft, setDraft] = useState(mock.draft!);
  return <TrainingProgressStateProvider state={draft.internalState} onChange={state => setDraft(value => ({ ...value, internalState: state }))}>
    <MethodLab methods={draft.selectedMethods} economicsTopicId={readEconomicsSelection(draft.internalState)!.topicId} economicsActivityVersion="mapped-1"
      onProgress={progress => setDraft(value => value.labContentSetIds.join() === progress.contentSetIds.join() ? value : { ...value, labContentSetIds: progress.contentSetIds })}
      onComplete={result => mock.done(result.experiments[0], collectEconomicsResponses(draft))} />
  </TrainingProgressStateProvider>;
}
it.each(["1.5", "2.1", "2.2", "2.3"])("uses the actual Individual picker → %s → reserved mapped Interleaving Lab → normal result", async topic => {
  render(<MemoryRouter initialEntries={[`/training/choose?economics=${topic}`]}><Routes>
    <Route path="/training/choose" element={<ChooseMethods />} /><Route path="/training/assessment" element={<SelectedLab />} />
  </Routes></MemoryRouter>);
  const option = screen.getByRole("checkbox", { name: /^Interleaving/ }); expect(option).toHaveProperty("disabled", false);
  fireEvent.click(option); expect(option.getAttribute("aria-checked")).toBe("true"); click("Start training");
  await screen.findByText("Start experiment"); finishLab(topic);
  expect(mock.reserve).toHaveBeenCalledExactlyOnceWith(null, expect.objectContaining({ mode: "manual", methodIds: ["interleaving"] }));
  expect(mock.save).toHaveBeenCalledOnce(); expect(mock.done).toHaveBeenCalledOnce();
  expect(mock.done.mock.calls[0][0]).toMatchObject({ method: "interleaving", category: "problem-solving", correct: 4, total: 4, score: 1 });
  const responses = mock.done.mock.calls[0][1]; expect(responses.activities[0].responses.filter((r: { role: string }) => r.role === "practice")).toHaveLength(6);
  expect(responses.activities[0].responses.filter((r: { role: string }) => r.role === "scored")).toHaveLength(4);
});
it.each(economicsPacks)("supports every allocated Lab/Match offset in $topicId using unchanged phase-specific questions", pack => {
  const before = JSON.stringify(pack); expect(interleavingEligibilityGap(pack.topicId)).toBeNull();
  for (const phase of ["lab", "match"] as const) {
    const pool = phase === "lab" ? pack.lab : pack.verification, count = phase === "lab" ? 6 : 4;
    for (let offset = 0; offset + count + 4 <= pool.length; offset++) {
      const original = pool.slice(offset, offset + count), test = pool.slice(offset + count, offset + count + 4);
      const form = buildInterleaving(pack, original, test);
      expect(new Set(form.practice.map(q => q.id))).toEqual(new Set(original.map(q => q.id)));
      expect(new Set(form.practice.map(q => interleavingGroup(pack, pool.find(source => source.id === q.id)!))).size).toBeGreaterThanOrEqual(2);
      expect(form.test).toEqual(test); expect(form.instructions.length).toBeGreaterThanOrEqual(2);
      expect(form.instructions.every(i => i.example.includes(original.find(q => interleavingGroup(pack, q) === i.type)!.correct))).toBe(true);
      expect(form.practice.every(q => !test.some(t => t.id === q.id) && !pack.baselineMemory.some(b => b.id === q.id) && !pack.baselineUnderstanding.some(b => b.id === q.id))).toBe(true);
    }
  }
  expect(JSON.stringify(pack)).toBe(before);
});
it.each(["1.5", "2.2", "2.3"])("completes the actual %s Interleaving Match with its existing four-question result", topic => {
  const form = data(topic, "match"), done = vi.fn();
  render(getMethodDefinition("interleaving").renderMatch(form.id, .75, done));
  click("Start mixed practice"); finishQuestions(form.data.practice, true); finishQuestions(form.data.test, false, "Next problem"); click("3"); click("Complete verification");
  expect(done).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ method: "interleaving", firstScore: .75, verificationScore: 1 }));
});
it("keeps Test Me's actual 3/4 selector and excludes unreviewed scored video without changing ranking weights", () => {
  const situation = { goal: "solve-problems", difficulties: ["application"], contentTypes: ["problems"], currentApproach: "rereading", sessionLength: "20-45", learningContext: "school" };
  const baseline = { memory: { score: .8, correct: 4, total: 5, confidence: 3, timeSpentMs: 60000 }, understanding: { score: .5, correct: 2, total: 4, confidence: 3, timeSpentMs: 60000 } };
  for (const topic of ["1.5", "2.1", "2.2", "2.3"]) for (const advice of [[], ["interleaving"]] as const) {
    const methods = selectMethods(situation, baseline, advice, supportedEconomicsMethods(topic));
    expect(methods).toHaveLength(advice.length ? 3 : 4); expect(methods).toContain("interleaving"); expect(methods).not.toContain("two-x-video-speed");
    expect(economicsAssignments(methods, "lab", topic, "mapped-1")).toHaveLength(methods.length);
  }
});
it.each(["1.5", "2.2", "2.3"])("accepts canonical %s Interleaving answers through the unchanged completion validator", topic => {
  const request = economicsEvidenceFixture({ topic, methods: ["interleaving"] }); request.methodLab.experiments[0].category = "problem-solving";
  const result = validateCompletion("synthetic-interleaving-owner", request, "2026-11-05T10:00:00.000Z");
  expect(result.objectiveEvidence?.activities.filter(a => a.stage === "method-lab")[0].answers.filter(a => a.role === "scored")).toHaveLength(4);
  expect(resolveEconomicsAssessment(request.economicsResponses!.activities[0].contentSetId).practice).toHaveLength(6);
});
