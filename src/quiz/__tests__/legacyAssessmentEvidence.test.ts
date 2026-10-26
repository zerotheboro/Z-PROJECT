import { describe, expect, it } from "vitest";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import { aggregateCompletedEvidence } from "../cumulativeProfile";
import { evidenceOwner, legacyAssessment } from "./learningEvidenceFixtures";

describe("offline legacy automatic assessment adapter", () => {
  function adapt(assessment: unknown = legacyAssessment(), knownSessionId?: string) {
    return adaptLegacyAutomaticAssessment({
      ownerUid: evidenceOwner.uid, assessmentId: "stored-document", assessment, knownSessionId
    });
  }

  it("adapts the existing payload without changing it or counting its saved profile/Baseline", () => {
    const saved = legacyAssessment();
    const before = JSON.stringify(saved);
    const result = adapt(saved);
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error(result.reason);
    expect(JSON.stringify(saved)).toBe(before);
    expect(result.session.observations).toHaveLength(2);
    expect(result.session.observations.map(item => item.performance.score)).toEqual([0.75, 0.5]);
    expect(JSON.stringify(result.session)).not.toContain("999");
    expect(JSON.stringify(result.session)).not.toContain("Private writing");
    expect(result.session.preference).toEqual({ methodId: "active-recall", priority: "performance" });
  });

  it("does not infer subjects, topics, versions, difficulty, counts, or completion time", () => {
    const result = adapt();
    if (!result.valid) throw new Error(result.reason);
    expect(result.session.originalSessionId).toBeNull();
    expect(result.session.completedAt).toBeNull();
    expect(result.session.recordedAt).toBe("2025-10-10T12:00:00.123Z");
    expect(result.session.observations[0].context).toEqual({
      subject: null, topic: null, exerciseTopic: null, contentSetId: null, contentVersion: null
    });
    expect(result.session.observations[0].protocol).toEqual({
      assessmentVersion: null, scoringVersion: null, questions: null
    });
    expect(result.session.observations[1].performance).toMatchObject({
      score: 0.5, correct: null, total: null
    });
    const profile = aggregateCompletedEvidence(evidenceOwner, [result.session]);
    expect(profile).toMatchObject({ sessionCount: 1, independentSessionCount: 0,
      unknownIndependenceSessionCount: 1, observationCount: 2 });
    expect(profile.performanceGroups).toEqual([]);
    expect(profile.methods[0].limitations).toEqual(expect.arrayContaining([
      "legacy-record", "session-independence-unknown", "difficulty-unknown", "unpooled-performance"
    ]));
  });

  it("keeps genuinely missing historical performance and self reports null", () => {
    const result = adapt({
      methodLab: { experiments: [{ method: "pomodoro" }] }
    });
    if (!result.valid) throw new Error(result.reason);
    expect(result.warnings).toEqual(["legacy-status-absent", "legacy-verification-absent"]);
    expect(result.session.observations[0]).toMatchObject({
      performance: { score: null, correct: null, total: null, timeSpentMs: null },
      selfReport: { confidence: null, ease: null, willingnessToUse: null }
    });
    expect(aggregateCompletedEvidence(evidenceOwner, [result.session]).methods[0].limitations)
      .toContain("score-unknown");
  });

  it.each(["pomodoro", "stopwatch"])("preserves historical %s without renaming it", method => {
    const result = adapt({
      status: "completed",
      methodLab: { experiments: [{ method, score: null, correct: null, total: null }] },
      methodMatch: { methods: [] }
    });
    if (!result.valid) throw new Error(result.reason);
    expect(result.session.observations[0].methodId).toBe(method);
  });

  it("uses a stable record identity and only accepts separately established session linkage", () => {
    const unknown = adapt();
    const known = adapt(legacyAssessment(), "trusted-original-session");
    if (!unknown.valid || !known.valid) throw new Error("Fixture adaptation failed.");
    expect(unknown.session.sessionId).toBe("legacy-assessment:stored-document");
    expect(known.session.sessionId).toBe("trusted-original-session");
    expect(known.session.originalSessionId).toBe("trusted-original-session");
    expect(aggregateCompletedEvidence(evidenceOwner, [known.session]).independentSessionCount).toBe(1);
    expect(adapt()).toEqual(unknown);
  });

  it("treats unreadable timestamps as unknown rather than using the current time", () => {
    const result = adapt({ ...legacyAssessment(), createdAt: "not-a-date" });
    if (!result.valid) throw new Error(result.reason);
    expect(result.session.recordedAt).toBeNull();
    expect(result.warnings).toContain("legacy-timestamp-unreadable");
  });

  it.each([
    { status: "in-progress", methodLab: { experiments: [] } },
    { learningProfile: { methodEvidence: [] } },
    { methodLab: { experiments: [{ method: "invented-method", score: 1 }] } },
    { methodLab: { experiments: [{ method: "active-recall", score: "1" }] } },
    { methodLab: { experiments: [{ method: "active-recall", score: 0.5, correct: 4, total: 4 }] } }
  ])("rejects unfinished, summary-only, or corrupt historical records: %j", value => {
    expect(adapt(value).valid).toBe(false);
  });
});
