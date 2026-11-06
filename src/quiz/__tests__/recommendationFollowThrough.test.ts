import { describe, expect, it } from "vitest";
import { followProfile, followRecord, laterFollowRecord, FOLLOW_DISPLAY as DISPLAY, FOLLOW_UID as UID } from "../../../test-support/economicsFollowThroughFixtures";
import { observeStudyRecommendation, reassessStudyRecommendation } from "../economics9708/recommendationFollowThrough";
import { recommendEconomicsStudy } from "../economics9708/studyRecommendations";

const before = () => followRecord({ wrong: ["ec9708-1.5-lab-1-v1"] });
function observe(rows = [before()], topic = "1.5", display = DISPLAY, head = followProfile(rows).strategyEvidence?.acceptanceHead) {
  const observation = observeStudyRecommendation(UID, topic, rows, display, head);
  expect(observation).not.toBeNull(); return observation!;
}
describe("accepted-evidence recommendation follow-through, without causal claims", () => {
  it("PPC: records a matching later Feynman attempt/assessment and reuses the unchanged engine for updated advice", () => {
    const old = before(), observation = observe([old]), rows = [old, laterFollowRecord()];
    const result = reassessStudyRecommendation(UID, observation, rows, followProfile(rows).strategyEvidence?.acceptanceHead);
    expect(observation.recommendation).toMatchObject({ objectiveId: "ec9708-objective-1.5.4", methodId: "feynman" });
    expect(result).toMatchObject({ status: "evaluated", newlyVisibleRecords: 1, acceptedAfterSnapshot: 1, methodAttempt: "reported",
      targetAssessment: "recorded", newPerformance: "recorded", matchingActivity: "reported-sequence-consistent", recommendationIntent: "unknown", outsideStudy: "unknown" });
    expect(result.updatedRecommendation).toEqual(recommendEconomicsStudy(UID, "1.5", rows));
    expect(result.updatedRecommendation).toMatchObject({ status: "recommended", recommendation: { objectiveId: "ec9708-objective-1.5.3", purpose: "future-retention-check" } });
    expect(result.demonstratedImprovement).toBe("not-established"); expect(result.causalMethodEffectiveness).toBe("not-established");
  });
  it("Elasticity: matches a Divide Steps expenditure assessment, preserving reported correctness rather than generating a gain score", () => {
    const old = followRecord({ topic: "2.2", wrong: ["ec9708-2.2-lab-4-v1"] }), observation = observe([old], "2.2");
    const rows = [old, laterFollowRecord({ topic: "2.2", methods: ["divide-steps"] })];
    const result = reassessStudyRecommendation(UID, observation, rows, followProfile(rows).strategyEvidence?.acceptanceHead);
    expect(observation.recommendation.methodId).toBe("divide-steps");
    expect(result.matchingActivity).toBe("reported-sequence-consistent");
    expect(result.activities.some(a => a.methodId === "divide-steps" && a.targetQuestionCorrect > 0)).toBe(true);
    expect(result.limitations).toContain("familiar-questions-not-independent-improvement");
    expect(result.updatedRecommendation).toEqual(recommendEconomicsStudy(UID, "2.2", rows));
  });
  it("keeps sequential Memory Palace → Feynman and joint-question carryover explicit", () => {
    const old = before(), observation = observe([old]), rows = [old, laterFollowRecord({ methods: ["memory-palace", "feynman"] })];
    const result = reassessStudyRecommendation(UID, observation, rows, followProfile(rows).strategyEvidence?.acceptanceHead);
    expect(result.activities.find(a => a.methodId === "feynman" && a.stage === "method-lab")?.priorMethods).toEqual(["memory-palace"]);
    expect(result.activities.find(a => a.methodId === "feynman" && a.stage === "method-lab")?.familiarQuestions).toBe(false);
    expect(result.limitations).toContain("prior-method-and-objective-carryover");
    expect(result.limitations).toContain("joint-question-performance-not-an-objective-score");
    expect(result.causalMethodEffectiveness).toBe("not-established");
  });
  it("retains inconclusive/wrong later answers without claiming improvement or method failure", () => {
    const old = before(), observation = observe([old]), rows = [old, laterFollowRecord({ wrong: ["ec9708-1.5-lab-1-v1"] })];
    const result = reassessStudyRecommendation(UID, observation, rows, followProfile(rows).strategyEvidence?.acceptanceHead);
    expect(result.matchingActivity).toBe("reported-sequence-consistent");
    expect(result.activities.some(a => a.targetQuestionIncorrect > 0)).toBe(true);
    expect(result.updatedRecommendation).toMatchObject({ status: "recommended", recommendation: { objectiveId: "ec9708-objective-1.5.4", purpose: "review-recorded-error" } });
    expect(result.demonstratedImprovement).toBe("not-established"); expect(result.causalMethodEffectiveness).toBe("not-established");
  });
  it("requires the recommended method and target assessment in the SAME activity", () => {
    const old = before(), observation = observe([old]);
    const later = laterFollowRecord({ methods: ["feynman", "memory-palace"], keep: q => q.methodId !== "feynman" || !q.objectiveIds.includes("ec9708-objective-1.5.4") });
    const result = reassessStudyRecommendation(UID, observation, [old, later], followProfile([old, later]).strategyEvidence?.acceptanceHead);
    expect(result.methodAttempt).toBe("reported"); expect(result.targetAssessment).toBe("recorded");
    expect(result.matchingActivity).toBe("not-established");
  });
  it("distinguishes another method and another objective without declaring that the student ignored advice", () => {
    const old = before(), observation = observe([old]);
    const otherMethod = laterFollowRecord({ methods: ["active-recall"] });
    const r = reassessStudyRecommendation(UID, observation, [old, otherMethod], followProfile([old, otherMethod]).strategyEvidence?.acceptanceHead);
    expect(r.methodAttempt).toBe("not-observed"); expect(r.targetAssessment).toBe("recorded"); expect(r.otherMethodsObserved).toBe(true);
    const otherObjective = laterFollowRecord({ keep: q => !q.objectiveIds.includes("ec9708-objective-1.5.4") });
    const r2 = reassessStudyRecommendation(UID, observation, [old, otherObjective], followProfile([old, otherObjective]).strategyEvidence?.acceptanceHead);
    expect(r2.methodAttempt).toBe("reported"); expect(r2.targetAssessment).toBe("not-observed"); expect(r2.otherObjectivesObserved).toBe(true);
    expect(r2.matchingActivity).toBe("not-established"); expect(r2.recommendationIntent).toBe("unknown");
  });
  it("does not equate newly visible published records with acceptance after the recommendation snapshot", () => {
    const old = before(), head = { revision: 8, lifecycleEpoch: 1, basis: "server-journal-head" as const };
    const observation = observe([old], "1.5", DISPLAY, head), rows = [old, laterFollowRecord()];
    const result = reassessStudyRecommendation(UID, observation, rows, head);
    expect(result.newlyVisibleRecords).toBe(1); expect(result.previouslyAcceptedNowVisible).toBe(1);
    expect(result.acceptedAfterSnapshot).toBe(0); expect(result.matchingActivity).toBe("not-established");
  });
  it.each([null, "2026-11-03T12:00:00.000Z", "2026-11-03T11:00:00.000Z"])("does not associate missing, tied or earlier session start %s", start => {
    const old = before(), observation = observe([old]), rows = [old, laterFollowRecord({ start })];
    const result = reassessStudyRecommendation(UID, observation, rows, followProfile(rows).strategyEvidence?.acceptanceHead);
    expect(result.newPerformance).toBe("recorded"); expect(result.matchingActivity).toBe("not-established");
  });
  it("retains historical v1 data without reinterpreting profileRevision as an accepted revision", () => {
    const old = before(), observation = observe([old]), historical = laterFollowRecord({ v1: true, details: false });
    const result = reassessStudyRecommendation(UID, observation, [old, historical]);
    expect(result.newlyVisibleRecords).toBe(1); expect(result.acceptanceOrderUnknown).toBe(1);
    expect(result.matchingActivity).toBe("not-established"); expect(result.targetAssessment).toBe("not-observed");
    expect(result.limitations).toContain("missing-objective-context-or-session-start");
  });
  it("does not call an activity sequence-consistent when the local display clock predates already-known completion", () => {
    const old = followRecord({ wrong: ["ec9708-1.5-lab-1-v1"], end: "2026-11-03T14:00:00.000Z" }), observation = observe([old]);
    const rows = [old, laterFollowRecord()], r = reassessStudyRecommendation(UID, observation, rows, followProfile(rows).strategyEvidence?.acceptanceHead);
    expect(r.matchingActivity).toBe("not-established"); expect(r.limitations).toContain("local-display-time-inconsistent-with-known-completion");
  });
  it("deduplicates retries, treats same snapshots as no new evidence, and remains input-order deterministic", () => {
    const old = before(), observation = observe([old]);
    expect(reassessStudyRecommendation(UID, observation, [old, old])).toMatchObject({ status: "evaluated", evidenceChange: "none", newlyVisibleRecords: 0 });
    const later = laterFollowRecord(), head = followProfile([old, later]).strategyEvidence?.acceptanceHead;
    expect(reassessStudyRecommendation(UID, observation, [old, later, later], head)).toEqual(reassessStudyRecommendation(UID, observation, [later, old], head));
  });
  it("rejects source removal, mutation and acceptance rollback rather than fabricating follow-through", () => {
    const old = before(), observation = observe([old]);
    expect(reassessStudyRecommendation(UID, observation, []).status).toBe("source-conflict");
    const changed = followRecord(); // same immutable ID, different frozen answers/hash
    expect(reassessStudyRecommendation(UID, observation, [changed]).status).toBe("source-conflict");
    const preservedHash = structuredClone(changed);
    Object.assign(preservedHash.data as object, { requestHash: (old.data as Record<string, unknown>).requestHash, receipt: (old.data as Record<string, unknown>).receipt });
    expect(reassessStudyRecommendation(UID, observation, [preservedHash]).status).toBe("source-conflict");
    expect(reassessStudyRecommendation(UID, observation, [old], { revision: 0, lifecycleEpoch: 1, basis: "server-journal-head" }).status).toBe("unavailable");
  });
  it("does not associate other topics or another owner, nor accept serialized local observations as durable receipts", () => {
    const old = before(), observation = observe([old]), other = laterFollowRecord({ topic: "2.2" });
    expect(reassessStudyRecommendation(UID, observation, [old, other]).otherTopicsObserved).toBe(true);
    expect(reassessStudyRecommendation("another-owner", observation, [old]).status).toBe("unavailable");
    expect(reassessStudyRecommendation(UID, structuredClone(observation), [old]).status).toBe("unavailable");
    expect(observeStudyRecommendation(UID, "1.5", [followRecord({ uid: "another-owner" })], DISPLAY)).toBeNull();
  });
});
