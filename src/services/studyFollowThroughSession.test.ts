import { afterEach, expect, it } from "vitest";
import { followRecord, followProfile, FOLLOW_DISPLAY, FOLLOW_UID } from "../../test-support/economicsFollowThroughFixtures";
import { observeStudyRecommendation } from "../quiz/economics9708/recommendationFollowThrough";
import { armStudyTrainingVisit, getStudyComparison, noteStudyTrainingVisit, rememberStudyComparison, resetStudyFollowThroughSession, syncStudyFollowThroughOwner,
  rememberStudyMethodSuggestion, getStudyMethodSuggestion, clearStudyMethodSuggestion } from "./studyFollowThroughSession";

const owner = { uid: FOLLOW_UID };
function observation() { const row = followRecord(); return observeStudyRecommendation(owner.uid, "1.5", [row], FOLLOW_DISPLAY, followProfile([row]).strategyEvidence?.acceptanceHead)!; }
afterEach(resetStudyFollowThroughSession);
it("keeps a display separate from link intent and actual Training arrival; duplicate arrivals do not rewrite it", () => {
  const o = observation(); rememberStudyComparison(owner, o);
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBeNull();
  armStudyTrainingVisit(owner, o, FOLLOW_DISPLAY);
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBeNull();
  noteStudyTrainingVisit(owner, "2026-11-03T12:01:00.000Z");
  noteStudyTrainingVisit(owner, "2026-11-03T12:02:00.000Z");
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBe("2026-11-03T12:01:00.000Z");
});
it("never counts a direct Training visit without the corresponding suggestion navigation", () => {
  rememberStudyComparison(owner, observation()); noteStudyTrainingVisit(owner, FOLLOW_DISPLAY);
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBeNull();
});
it("expires abandoned navigation and rejects malformed local clocks", () => {
  const o = observation(); armStudyTrainingVisit(owner, o, FOLLOW_DISPLAY);
  noteStudyTrainingVisit(owner, "2026-11-03T12:11:00.000Z");
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBeNull();
  armStudyTrainingVisit(owner, o, "not-a-date"); noteStudyTrainingVisit(owner, FOLLOW_DISPLAY);
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBeNull();
});
it("clears on logout, another owner and a new auth instance for the same UID", () => {
  rememberStudyComparison(owner, observation()); syncStudyFollowThroughOwner(null);
  expect(getStudyComparison(owner, "1.5")).toBeNull();
  rememberStudyComparison(owner, observation()); expect(getStudyComparison({ uid: "other-owner" }, "1.5")).toBeNull();
  expect(getStudyComparison(owner, "1.5")).toBeNull();
  rememberStudyComparison(owner, observation()); expect(getStudyComparison({ uid: owner.uid }, "1.5")).toBeNull();
});
it("cannot attach a pending navigation to another owner's Training route", () => {
  armStudyTrainingVisit(owner, observation(), FOLLOW_DISPLAY);
  noteStudyTrainingVisit({ uid: "other-owner" }, FOLLOW_DISPLAY);
  expect(getStudyComparison(owner, "1.5")).toBeNull();
});
it("also clears if an auth object's UID changes in place", () => {
  const mutable = { uid: owner.uid }; rememberStudyComparison(mutable, observation()); mutable.uid = "another-owner";
  expect(getStudyComparison(mutable, "1.5")).toBeNull();
});
it("keeps a copied, expiring method hint separate from activity or follow-through evidence", () => {
  const o = observation(); rememberStudyComparison(owner, o);
  rememberStudyMethodSuggestion(owner, owner.uid, o.recommendation, 1000);
  const hint = getStudyMethodSuggestion(owner, "1.5", 1000)!;
  expect(hint.methodId).toBe(o.recommendation.methodId);
  hint.methodId = "derive-basics";
  expect(getStudyMethodSuggestion(owner, "1.5", 1000)?.methodId).toBe(o.recommendation.methodId);
  expect(getStudyComparison(owner, "1.5")?.trainingOpenedAt).toBeNull();
  expect(getStudyMethodSuggestion(owner, "1.5", 601000)).toBeNull();
  expect(getStudyMethodSuggestion(owner, "1.5", 1000)).toBeNull();
});
it("clears method hints on dismissal, auth rotation, topic change, new display and invalid local time", () => {
  const o = observation(), seed = () => rememberStudyMethodSuggestion(owner, owner.uid, o.recommendation, 1000);
  seed(); clearStudyMethodSuggestion(owner); expect(getStudyMethodSuggestion(owner, "1.5", 1000)).toBeNull();
  seed(); syncStudyFollowThroughOwner(null); expect(getStudyMethodSuggestion(owner, "1.5", 1000)).toBeNull();
  seed(); syncStudyFollowThroughOwner({ uid: owner.uid }); expect(getStudyMethodSuggestion(owner, "1.5", 1000)).toBeNull();
  seed(); expect(getStudyMethodSuggestion(owner, "2.2", 1000)).toBeNull(); expect(getStudyMethodSuggestion(owner, "1.5", 1000)).toBeNull();
  seed(); rememberStudyComparison(owner, o); expect(getStudyMethodSuggestion(owner, "1.5", 1000)).toBeNull();
  seed(); expect(getStudyMethodSuggestion(owner, "1.5", 999)).toBeNull();
});
