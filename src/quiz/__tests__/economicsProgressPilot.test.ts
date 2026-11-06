import { afterEach, expect, it } from "vitest";
import { PILOT_FORMS, pilotForm, isPilotFormUsable, PILOT_VERSION } from "../economics9708/progressPilot/forms";
import { currentPilotExposure, formExposure, pilotHistory, PILOT_CLAIMS, recordPilotCheck } from "../economics9708/progressPilot/model";
import { economicsAssignments } from "../economics9708/allocation";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { trainingAnswerBindings } from "../trainingDraftValidation";
import { economicsPacks } from "../economics9708/packs";
import { createTrainingDraft } from "../trainingProgress";
import { armProgressPilot, readProgressPilot, resetProgressPilot, syncProgressPilotOwner } from "../../services/economicsProgressPilotSession";
import { followRecord, followProfile, FOLLOW_UID } from "../../../test-support/economicsFollowThroughFixtures";

const at = "2026-11-05T10:00:00.000Z", owner = { uid: FOLLOW_UID };
const draft = (topic = "1.5") => createTrainingDraft({ owner: { kind: "user", uid: owner.uid }, mode: "auto", selectedMethods: [],
  sessionId: "pilot-new-session", economicsTopicId: topic, economicsActivityVersion: "mapped-1" });
const unknown = pilotHistory(owner.uid, "1.5");
afterEach(resetProgressPilot);

it("contains exactly six draft forms, twelve unique items, and only the two approved pilot concepts", () => {
  expect(PILOT_FORMS).toHaveLength(6);
  expect(new Set(PILOT_FORMS.map(f => f.topicId))).toEqual(new Set(["1.5", "2.2"]));
  expect(new Set(PILOT_FORMS.flatMap(f => f.items.map(i => i.question.id))).size).toBe(12);
  expect(PILOT_FORMS.every(f => f.status === "draft" && f.equivalence === "not-reviewed" && isPilotFormUsable(f) && f.items.every(i => i.status === "draft"))).toBe(true);
  expect(pilotForm("2.3", "A")).toBeNull();
});
it("uses defensive copies of eleven existing items and one clearly identified new draft without changing the bank", () => {
  const bank = economicsPacks.flatMap(p => [...p.baselineMemory, ...p.baselineUnderstanding, ...p.lab, ...p.verification]);
  expect(bank).toHaveLength(432);
  const items = PILOT_FORMS.flatMap(f => f.items);
  expect(items.filter(i => i.sourceQuestionId !== null)).toHaveLength(11);
  expect(items.filter(i => i.sourceVersion === PILOT_VERSION)).toHaveLength(1);
  for (const item of items.filter(i => i.sourceQuestionId !== null)) {
    const q = bank.find(q => q.id === item.sourceQuestionId)!;
    expect(item.question.question).toBe(q.question); expect(item.question.correct).toBe(q.correct);
    expect(item.question.options).toEqual(q.options); expect(item.question.options).not.toBe(q.options);
    expect(Object.isFrozen(item.question.options)).toBe(true);
  }
});
it.each([
  ["1.5", "A", ["3 units of food", "5 tonnes of grain"]],
  ["1.5", "B", ["2 units of food", "6 bicycles"]],
  ["1.5", "C", ["2 units", "6 food units"]],
  ["2.2", "A", ["It falls from $1000 to $840", "It rises from $600 to $720"]],
  ["2.2", "B", ["It falls from $600 to $500", "From $600 to $720"]],
  ["2.2", "C", ["From $600 to $480", "From $600 to $700"]]
] as const)("pins the candidate %s form %s answer keys (not equivalence)", (topic, name, keys) => {
  expect(pilotForm(topic, name)!.items.map(i => i.question.correct)).toEqual(keys);
});
it("keeps high initial performance descriptive and never emits a gain, retention value or method effect", () => {
  const f = pilotForm("1.5", "A")!, answers = Object.fromEntries(f.items.map(i => [i.question.id, i.question.correct]));
  const r = recordPilotCheck(f, answers, formExposure(f, unknown), at, false);
  expect([r.correct, r.total, r.authority, r.persistence, r.reviewStatus]).toEqual([2, 2, "unaccepted-browser-report", "memory-only", "draft"]);
  expect(PILOT_CLAIMS).toEqual({ learningGain: "unavailable", retention: "unavailable", methodEffect: "not-established" });
  expect(Object.isFrozen(r.answers)).toBe(true);
});
it("checks all twelve candidate calculations independently of the stored answer keys", () => {
  const costs = [[(50 - 44) / (12 - 10), 20 / 4], [(30 - 24) / (13 - 10), 18 / 3], [(40 - 32) / (9 - 5), 24 / 4]];
  const expenditures = [[[10 * 100, 12 * 70], [15 * 40, 12 * 60]], [[8 * 75, 10 * 50], [20 * 30, 18 * 40]], [[6 * 100, 8 * 60], [12 * 50, 10 * 70]]];
  (["A", "B", "C"] as const).forEach((name, i) => {
    expect(pilotForm("1.5", name)!.items.map(q => Number(q.question.correct.match(/\d+/)?.[0]))).toEqual(costs[i]);
    expect(pilotForm("2.2", name)!.items.map(q => [...q.question.correct.matchAll(/\$(\d+)/g)].map(m => Number(m[1])))).toEqual(expenditures[i]);
  });
});
it("rejects incomplete/unavailable forms, missing or invalid answers, late initial checks and delayed execution", () => {
  const f = pilotForm("1.5", "A")!, answers = Object.fromEntries(f.items.map(i => [i.question.id, i.question.correct]));
  expect(isPilotFormUsable({ ...f, items: [] })).toBe(false);
  expect(isPilotFormUsable({ ...f, status: "unavailable" })).toBe(false);
  expect(isPilotFormUsable({ ...f, status: "reviewed" })).toBe(false); // Draft items cannot acquire a reviewed form label.
  expect(() => recordPilotCheck(f, {}, {}, at, false)).toThrow();
  expect(() => recordPilotCheck(f, { ...answers, [f.items[0].question.id]: "invented answer" }, formExposure(f, unknown), at, false)).toThrow();
  expect(() => recordPilotCheck(f, answers, formExposure(f, unknown), at, true)).toThrow();
  const b = pilotForm("1.5", "B")!;
  expect(() => recordPilotCheck(b, Object.fromEntries(b.items.map(i => [i.question.id, i.question.correct])), formExposure(b, unknown), at, false)).toThrow();
  expect(() => recordPilotCheck(pilotForm("1.5", "C")!, answers, {}, at, true)).toThrow();
});
it("keeps missing, historical incomplete and other-owner exposure unknown and detects accepted familiar questions", () => {
  const row = followRecord(), source = followProfile([row]).strategyEvidence!;
  const f = pilotForm("1.5", "A")!, known = pilotHistory(owner.uid, "1.5", source);
  expect(known.previousTopicPractice).toBe(true);
  expect(formExposure(f, known)[f.items[0].question.id]).toBe("known-repeat");
  expect(pilotHistory("another-owner", "1.5", source).readable).toBe(false);
  expect(Object.values(formExposure(f, unknown))).toEqual(["unknown", "unknown"]);
  const empty = pilotHistory(owner.uid, "1.5", { ...source, rows: [] });
  expect(empty.previousTopicPractice).toBe(false);
  expect(Object.values(formExposure(f, empty))).toEqual(["no-repeat-in-available-records", "no-repeat-in-available-records"]);
  const legacy = followRecord({ v1: true, details: false });
  expect(pilotHistory(owner.uid, "1.5", { ...source, rows: [legacy] }).knownQuestions.size).toBe(0);
});
it("also recognises actual answers captured in this Training session", () => {
  const f = pilotForm("2.2", "B")!;
  expect(formExposure(f, unknown, new Set([f.items[1].sourceQuestionId!]))[f.items[1].question.id]).toBe("known-repeat");
});
it("keeps prepared option orders separate from answers and rejects unallocated/malformed display traces", () => {
  const d = createTrainingDraft({ owner: { kind: "user", uid: owner.uid }, mode: "manual", selectedMethods: ["active-recall"],
    sessionId: "pilot-trace-session", economicsTopicId: "1.5", economicsActivityVersion: "mapped-1" });
  d.labContentSetIds = economicsAssignments(d.selectedMethods, "lab", "1.5", "mapped-1");
  const id = d.labContentSetIds[0], qs = resolveEconomicsAssessment(id).scored;
  d.internalState[`lab:active-recall:${id}`] = { slots: [], named: { "answer-option-orders": {
    [qs[1].id]: [...qs[1].options], [qs[2].id]: ["invalid", "order", "not", "canonical"],
    "ec9708-1.5-lab-9-v1": ["2 units of food", "6 units of food", "3 units of food", "8 units of food"]
  } } };
  const before = structuredClone(d), trace = currentPilotExposure(d);
  expect([...trace.preparedForDisplay]).toEqual([qs[1].id]); expect(trace.answered.size).toBe(0); expect(trace.answersComplete).toBe(false);
  const f = pilotForm("1.5", "A")!;
  expect(formExposure(f, unknown, trace.answered, trace.preparedForDisplay, trace.answersComplete)[f.items[0].question.id]).toBe("possible-repeat");
  expect(d).toEqual(before);
});
it("confirmed saved answers take priority over possible display and missing current answers stay unknown", () => {
  const d = createTrainingDraft({ owner: { kind: "user", uid: owner.uid }, mode: "manual", selectedMethods: ["active-recall"],
    sessionId: "pilot-answered-session", economicsTopicId: "1.5", economicsActivityVersion: "mapped-1" });
  d.labContentSetIds = economicsAssignments(d.selectedMethods, "lab", "1.5", "mapped-1");
  const id = d.labContentSetIds[0], qs = resolveEconomicsAssessment(id).scored, slots: unknown[] = [];
  slots[trainingAnswerBindings("active-recall", "lab").find(b => b.role === "scored")!.answerSlot] = Object.fromEntries(qs.map(q => [q.id, q.correct]));
  d.internalState[`lab:active-recall:${id}`] = { slots, named: { "answer-option-orders": Object.fromEntries(qs.map(q => [q.id, [...q.options]])) } };
  const trace = currentPilotExposure(d), f = pilotForm("1.5", "A")!;
  expect(trace.answered.size).toBe(4); expect(trace.answersComplete).toBe(true);
  expect(formExposure(f, unknown, trace.answered, trace.preparedForDisplay, trace.answersComplete)[f.items[0].question.id]).toBe("known-repeat");
  const empty = { ...unknown, readable: true };
  expect(Object.values(formExposure(f, empty, new Set(), new Set(), false))).toEqual(["unknown", "unknown"]);
});
it("allocation alone adds no display or answer evidence", () => {
  const d = draft(); d.selectedMethods = ["memory-palace"];
  d.labContentSetIds = economicsAssignments(d.selectedMethods, "lab", "1.5", "mapped-1");
  const trace = currentPilotExposure(d); expect(trace.answered.size).toBe(0); expect(trace.preparedForDisplay.size).toBe(0);
  expect(trace.answersComplete).toBe(false);
});
it.each([
  ["1.5", ["memory-palace", "feynman", "leitner-system"]],
  ["2.2", ["memory-palace", "leitner-system", "active-recall", "feynman"]]
] as const)("reproduces both Form B items occurring in ordinary %s Training before the optional subsequent check", (topic, methods) => {
  const lab = economicsAssignments(methods, "lab", topic, "mapped-1");
  const match = economicsAssignments(["memory-palace", "leitner-system"], "match", topic, "mapped-1");
  const previouslyScored = new Set([...lab, ...match].flatMap(id => resolveEconomicsAssessment(id).scored.map(q => q.id)));
  expect(pilotForm(topic, "B")!.items.every(i => previouslyScored.has(i.sourceQuestionId!))).toBe(true);
});
it("arms only fresh topic-bound sessions and never changes draft, allocation, evidence or quota fields", () => {
  const d = draft(), before = structuredClone(d); armProgressPilot(owner, d, "1.5");
  const entry = readProgressPilot(owner, d.sessionId)!; expect(entry).not.toBeNull(); expect(d).toEqual(before);
  entry.instructionOpened = true; armProgressPilot(owner, d, "1.5");
  expect(readProgressPilot(owner, d.sessionId)).toBe(entry); expect(entry.instructionOpened).toBe(true);
  resetProgressPilot(); d.section = 4; armProgressPilot(owner, d, "1.5"); expect(readProgressPilot(owner, d.sessionId)).toBeNull();
  resetProgressPilot(); armProgressPilot(owner, draft(), "2.2"); expect(readProgressPilot(owner, d.sessionId)).toBeNull();
});
it("loses memory on refresh/reset, logout, UID mutation or another authentication instance", () => {
  const d = draft(); armProgressPilot(owner, d, "1.5"); resetProgressPilot(); expect(readProgressPilot(owner, d.sessionId)).toBeNull();
  armProgressPilot(owner, d, "1.5"); syncProgressPilotOwner(null); expect(readProgressPilot(owner, d.sessionId)).toBeNull();
  armProgressPilot(owner, d, "1.5"); expect(readProgressPilot({ uid: "student-b" }, d.sessionId)).toBeNull();
  armProgressPilot(owner, d, "1.5"); expect(readProgressPilot({ uid: owner.uid }, d.sessionId)).toBeNull();
  const mutable = { uid: owner.uid }; armProgressPilot(mutable, d, "1.5"); mutable.uid = "changed";
  expect(readProgressPilot(mutable, d.sessionId)).toBeNull();
});
