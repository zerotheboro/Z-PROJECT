import { describe, expect, it } from "vitest";
import { rebuildCompletedEvidenceHistory as aggregateCompletedEvidence } from "../cumulativeProfile";
import { createCompletedSessionEvidence } from "../learningEvidence";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import type { CompletedSessionEvidence, ObservationMetadata } from "../learningEvidence";
import { completedSession, evidenceOwner, knownMetadata, legacyAssessment, sessionInput } from "./learningEvidenceFixtures";

describe("deterministic cumulative Learning Profile foundation", () => {
  it.each([3, 4])("keeps all %i automatic methods and only two verification results", count => {
    const methods = ["active-recall", "feynman", "cornell", "interleaving"] as const;
    const session = completedSession({ mode: "auto", methods: methods.slice(0, count) });
    const profile = aggregateCompletedEvidence(evidenceOwner, [session]);
    expect(profile).toMatchObject({ sessionCount: 1, independentSessionCount: 1, observationCount: count + 2 });
    expect(profile.methods).toHaveLength(count);
    expect(profile.methods.reduce((sum, method) => sum + method.verification.observationCount, 0)).toBe(2);
    expect(profile.methods.find(item => item.methodId === "cornell")?.verification.observationCount).toBe(0);
    expect(profile.methods.find(item => item.methodId === "memory-palace")).toBeUndefined();
  });

  it("accumulates manual sessions but keeps them separate from automatic comparison groups", () => {
    const auto = completedSession({ id: "auto", mode: "auto" });
    const manual = completedSession({ id: "manual" });
    const profile = aggregateCompletedEvidence(evidenceOwner, [auto, manual]);
    expect(profile.methods[0]).toMatchObject({
      independentSessionCount: 2,
      sourceCounts: { "test-me-lab": 1, "test-me-match": 1, "test-methods": 2 }
    });
    expect(profile.performanceGroups).toHaveLength(4);
    expect(profile.methods[0].limitations).toContain("self-selected-methods");
    expect(profile.preferenceReports).toHaveLength(2);
  });

  it("adds sessions and exposures without calling repeated content fresh transfer", () => {
    const first = completedSession({ id: "one" });
    const second = completedSession({ id: "two", date: "2026-10-11T10:00:00.000Z" });
    const profile = aggregateCompletedEvidence(evidenceOwner, [first, second]);
    expect(profile.methods[0]).toMatchObject({
      independentSessionCount: 2, knownContentSetCount: 2, knownContentExposureCount: 4,
      unknownContentObservationCount: 0,
      verification: { observationCount: 2, scoredObservationCount: 2, sessionCount: 2 }
    });
    expect(profile.methods[0].limitations).toContain("repeated-content");
    const labs = profile.performanceGroups.filter(group => group.phase === "lab");
    expect(labs.map(group => group.exposure.content).sort()).toEqual(["first-known", "repeated"]);
    expect(labs.every(group => group.rankings[0].correct === 3 && group.rankings[0].total === 4 &&
      group.rankings[0].score === 0.75 && group.rankings[0].sessionCount === 1)).toBe(true);
  });

  it("deduplicates repeated sessions and identical observation IDs before any counters", () => {
    const session = completedSession();
    const withDuplicate = { ...session, observations: [...session.observations, session.observations[0]] };
    const expected = aggregateCompletedEvidence(evidenceOwner, [session]);
    expect(aggregateCompletedEvidence(evidenceOwner, [withDuplicate, session, session])).toEqual(expected);
  });

  it("rejects conflicting duplicate events/sessions instead of choosing whichever arrived first", () => {
    const session = completedSession();
    const changed = { ...session.observations[0], performance: {
      ...session.observations[0].performance, score: 0.5, correct: 2
    } };
    const conflict = { ...session, observations: [...session.observations, changed] };
    expect(() => aggregateCompletedEvidence(evidenceOwner, [conflict])).toThrow(/Conflicting observation/);
    const replacement = { ...session, observations: [changed, session.observations[1]] };
    for (const input of [[session, replacement], [replacement, session]]) {
      expect(() => aggregateCompletedEvidence(evidenceOwner, input)).toThrow(/Conflicting completed session/);
    }
  });

  it("retains contradictory same-task observations and reports range and chronological change", () => {
    const anchor = completedSession({ id: "anchor", date: "2026-10-09T10:00:00.000Z" });
    const first = completedSession({ id: "first", correct: 4 });
    const later = completedSession({ id: "later", correct: 1, date: "2026-10-12T10:00:00.000Z" });
    const profile = aggregateCompletedEvidence(evidenceOwner, [later, first, anchor]);
    const lab = profile.performanceGroups.find(group => group.phase === "lab" && group.exposure.content === "repeated")!.rankings[0];
    expect(lab).toMatchObject({
      correct: 5, total: 8, score: 0.625, varies: true,
      scoreRange: { minimum: 0.25, maximum: 1 },
      chronologicalChange: { fromScore: 1, toScore: 0.25, difference: -0.75 }
    });
    expect(profile.methods[0].observations).toHaveLength(6);
    expect(profile.methods[0].limitations).toContain("performance-varies");
  });

  it("does not invent chronological improvement when completion times tie", () => {
    const profile = aggregateCompletedEvidence(evidenceOwner, [
      completedSession({ id: "one", correct: 1 }),
      completedSession({ id: "two", correct: 4 })
    ]);
    expect(profile.performanceGroups.find(group => group.phase === "lab")!.rankings[0])
      .toMatchObject({ varies: true, chronologicalChange: null });
  });

  it("evolves across Test Me and manual sessions while preserving separate context scores", () => {
    const first = completedSession({ id: "auto-1", mode: "auto",
      methods: ["active-recall", "feynman", "cornell"] });
    const later = completedSession({ id: "auto-2", mode: "auto", correct: 2,
      methods: ["active-recall", "feynman", "cornell", "interleaving"],
      date: "2026-10-11T10:00:00.000Z" });
    const manual = completedSession({ id: "manual-1", methods: ["feynman"], correct: 4,
      date: "2026-10-12T10:00:00.000Z" });
    expect(aggregateCompletedEvidence(evidenceOwner, [first]).methods).toHaveLength(3);
    const profile = aggregateCompletedEvidence(evidenceOwner, [first, later, manual]);
    expect(profile).toMatchObject({ sessionCount: 3, independentSessionCount: 3, observationCount: 13 });
    expect(profile.methods).toHaveLength(4);
    expect(profile.methods.find(item => item.methodId === "feynman")?.independentSessionCount).toBe(3);
    const automatic = profile.performanceGroups.filter(group => group.source === "test-me-lab");
    const practice = profile.performanceGroups.find(group => group.source === "test-methods" && group.phase === "lab")!;
    expect(automatic.map(group => group.rankings.find(item => item.methodId === "feynman")?.score).sort())
      .toEqual([0.5, 0.75]);
    expect(practice.rankings[0]).toMatchObject({ methodId: "feynman", score: 1 });
  });

  const changedMetadata: [string, (item: ObservationMetadata) => ObservationMetadata][] = [
    ["subject", item => ({ ...item, context: { ...item.context, subject: "Physics" } })],
    ["topic", item => ({ ...item, context: { ...item.context, topic: "Waves" } })],
    ["exercise topic", item => ({ ...item, context: { ...item.context, exerciseTopic: "Diffusion" } })],
    ["content ID", item => ({ ...item, context: { ...item.context, contentSetId: "different" } })],
    ["content version", item => ({ ...item, context: { ...item.context, contentVersion: "2" } })],
    ["assessment version", item => ({ ...item, protocol: { ...item.protocol, assessmentVersion: "2" } })],
    ["scoring version", item => ({ ...item, protocol: { ...item.protocol, scoringVersion: "2" } })],
    ["question IDs", item => ({ ...item, protocol: { ...item.protocol,
      questions: item.protocol!.questions!.map(q => ({ ...q, questionId: `other-${q.questionId}` })) } })],
    ["actual difficulty", item => ({ ...item, protocol: { ...item.protocol,
      questions: item.protocol!.questions!.map(q => ({ ...q, difficulty: "hard" })) } })],
    ["offered option count", item => ({ ...item, protocol: { ...item.protocol,
      questions: item.protocol!.questions!.map(q => ({ ...q, offeredOptionCount: 4,
        offeredOptionIds: ["a", "b", "c", "d"] })) } })],
    ["retained distractor identities", item => ({ ...item, protocol: { ...item.protocol,
      questions: item.protocol!.questions!.map(q => ({ ...q, offeredOptionIds: ["a", "b", "d"] })) } })]
  ];

  it.each(changedMetadata)("does not average observations with different %s", (_label, change) => {
    const first = completedSession({ id: "one" });
    const input = sessionInput({ id: "two", correct: 1 });
    const second = createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(change) });
    const profile = aggregateCompletedEvidence(evidenceOwner, [first, second]);
    expect(profile.performanceGroups).toHaveLength(4);
    expect(profile.performanceGroups.every(group => group.rankings[0].sessionCount === 1)).toBe(true);
  });

  it("leaves incomplete metadata unpooled even when unknown values happen to match", () => {
    const profile = aggregateCompletedEvidence(evidenceOwner, [
      completedSession({ id: "one", known: false }),
      completedSession({ id: "two", known: false })
    ]);
    expect(profile.performanceGroups).toEqual([]);
    expect(profile.methods[0].unpooledObservationIds).toHaveLength(4);
    expect(profile.methods[0].knownContentExposureCount).toBe(0);
    expect(profile.methods[0].observations.map(item => item.performance.score)).toEqual([0.75, 0.75, 0.75, 0.75]);
  });

  it("does not pool matching option counts when the actual retained options are unknown", () => {
    const input = sessionInput();
    const session = createCompletedSessionEvidence({ ...input, metadata: input.metadata!.map(item => ({
      ...item, protocol: { ...item.protocol,
        questions: item.protocol!.questions!.map(question => ({ ...question, offeredOptionIds: null })) }
    })) });
    const profile = aggregateCompletedEvidence(evidenceOwner, [session]);
    expect(profile.performanceGroups).toEqual([]);
    expect(profile.methods[0].limitations).toContain("option-identities-unknown");
  });

  it("uses canonical method IDs for tied comparable results", () => {
    const session = completedSession({ methods: ["feynman", "active-recall", "cornell"] });
    const profile = aggregateCompletedEvidence(evidenceOwner, [session]);
    const lab = profile.performanceGroups.find(group => group.phase === "lab")!;
    expect(lab.rankings.map(item => item.methodId)).toEqual(["active-recall", "cornell", "feynman"]);
    expect(lab.rankings.map(item => item.score)).toEqual([0.75, 0.75, 0.75]);
  });

  it("is order-independent down to serialized output without mutating input", () => {
    const sessions = [completedSession({ id: "z" }), completedSession({ id: "a", correct: 2 })];
    const before = JSON.stringify(sessions);
    const shuffled = [...sessions].reverse().map(session => ({
      ...session, observations: [...session.observations].reverse().map(item => ({
        ...item, protocol: { ...item.protocol, questions: [...item.protocol.questions!].reverse() }
      }))
    }));
    const expected = aggregateCompletedEvidence(evidenceOwner, sessions);
    expect(JSON.stringify(aggregateCompletedEvidence(evidenceOwner, shuffled)))
      .toBe(JSON.stringify(expected));
    expect(aggregateCompletedEvidence(evidenceOwner, JSON.parse(before) as CompletedSessionEvidence[]))
      .toEqual(expected);
    expect(JSON.stringify(sessions)).toBe(before);
  });

  it("does not let AI selection context or student preference alter performance", () => {
    const plain = completedSession({ mode: "auto" });
    const nominated: CompletedSessionEvidence = { ...plain,
      selectionContext: { kind: "ai-confirmed", nominatedMethodIds: ["active-recall"] },
      preference: { methodId: "feynman", priority: "ease" }
    };
    const traditional = aggregateCompletedEvidence(evidenceOwner, [plain]);
    const ai = aggregateCompletedEvidence(evidenceOwner, [nominated]);
    expect(ai.performanceGroups).toEqual(traditional.performanceGroups);
    expect(ai.methods).toEqual(traditional.methods);
    expect(ai.preferenceReports).not.toEqual(traditional.preferenceReports);
    expect(JSON.stringify(ai)).not.toContain("2.55");
  });

  it("keeps confidence, ease, and willingness out of the numerical performance ranking", () => {
    const first = completedSession({ id: "one" });
    const changed = { ...first, observations: first.observations.map(item => ({
      ...item, selfReport: { confidence: 1, ease: 1, willingnessToUse: 1 }
    })) };
    expect(aggregateCompletedEvidence(evidenceOwner, [first]).performanceGroups)
      .toEqual(aggregateCompletedEvidence(evidenceOwner, [changed]).performanceGroups);
  });

  it("does not silently mix owners, including two guest scopes", () => {
    expect(() => aggregateCompletedEvidence({ kind: "user", uid: "another-student" }, [completedSession()]))
      .toThrow(/another owner/);
    const guest = createCompletedSessionEvidence({ ...sessionInput(), owner: { kind: "guest", scopeId: "browser-one" } });
    expect(() => aggregateCompletedEvidence({ kind: "guest", scopeId: "browser-two" }, [guest]))
      .toThrow(/another owner/);
  });

  it("retains historical evidence without inflating established independent-session counts", () => {
    const adapted = adaptLegacyAutomaticAssessment({
      ownerUid: evidenceOwner.uid, assessmentId: "old", assessment: legacyAssessment()
    });
    if (!adapted.valid) throw new Error(adapted.reason);
    const profile = aggregateCompletedEvidence(evidenceOwner, [adapted.session, completedSession()]);
    expect(profile).toMatchObject({ sessionCount: 2, independentSessionCount: 1,
      unknownIndependenceSessionCount: 1, observationCount: 4 });
    expect(profile.methods[0].unpooledObservationIds).toHaveLength(2);
  });

  it("flags verification on the same content version as Lab without inventing unseen-material evidence", () => {
    const input = sessionInput();
    const session = createCompletedSessionEvidence({ ...input,
      metadata: [knownMetadata("active-recall"), {
        ...knownMetadata("active-recall", "match"),
        context: knownMetadata("active-recall").context
      }] });
    const method = aggregateCompletedEvidence(evidenceOwner, [session]).methods[0];
    expect(method.knownContentSetCount).toBe(1);
    expect(method.knownContentExposureCount).toBe(1);
    expect(method.limitations).toContain("verification-content-reused");
  });

  it("supports an empty profile without inventing zero-score method evidence", () => {
    expect(aggregateCompletedEvidence(evidenceOwner, [])).toMatchObject({
      sessionCount: 0, observationCount: 0, methods: [], performanceGroups: [], preferenceReports: []
    });
  });
});
