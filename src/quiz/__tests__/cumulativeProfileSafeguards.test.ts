import { describe, expect, it } from "vitest";
import {
  createCompletedSessionEvidence, evidenceBytes, EVIDENCE_LIMITS
} from "../learningEvidence";
import type { CompletedSessionEvidence } from "../learningEvidence";
import { aggregateCompletedEvidence, rebuildCompletedEvidenceHistory } from "../cumulativeProfile";
import { CUMULATIVE_SUMMARY_LIMITS } from "../cumulativeProfileSummary";
import { EVIDENCE_HISTORY_LIMITS, pageCompletedEvidenceHistory } from "../completedEvidenceIdentity";
import { completedSession, evidenceOwner, sessionInput } from "./learningEvidenceFixtures";
import { TRAINING_METHOD_IDS } from "../../../trainingMethodIds.js";

describe("owner-wide content and question exposure", () => {
  it("marks content/question reuse across methods and separates first-known from repeated results", () => {
    const first = completedSession({ id: "first", methods: ["active-recall"], correct: 1 });
    const later = completedSession({ id: "later", methods: ["feynman"], correct: 4, date: "2026-10-11T10:00:00Z" });
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [later, first]);
    const feynman = history.methods.find(method => method.methodId === "feynman")!;
    expect(feynman.observations.every(item => item.exposure.content === "repeated" && item.exposure.questions === "repeated")).toBe(true);
    expect(feynman.limitations).toEqual(expect.arrayContaining(["repeated-content", "repeated-questions", "verification-content-reused"]));
    const labs = history.performanceGroups.filter(group => group.phase === "lab");
    expect(labs).toHaveLength(2);
    expect(labs.every(group => group.rankings.length === 1)).toBe(true);
    expect(labs.map(group => group.exposure.content).sort()).toEqual(["first-known", "repeated"]);
    expect(history.exposures.knownContentExposureCount).toBe(4);
    expect(aggregateCompletedEvidence(evidenceOwner, [later, first]))
      .toEqual(aggregateCompletedEvidence(evidenceOwner, [first, later]));
  });

  it("does not count a shared session/content exposure once per method or duplicated observation", () => {
    const input = sessionInput({ methods: ["active-recall", "feynman"] });
    const session = createCompletedSessionEvidence(input);
    const duplicated = { ...session, observations: [...session.observations, session.observations[0]] };
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [duplicated, session]);
    expect(history.observationCount).toBe(4);
    expect(history.methods.map(method => method.methodId)).toEqual(["active-recall", "feynman"]);
    expect(history.exposures).toMatchObject({ knownContentExposureCount: 2, knownQuestionExposureCount: 8, historyCoverage: "unknown" });
    expect(history.methods.every(method => method.observations.every(item => item.exposure.content === "unknown"))).toBe(true);
  });

  it("marks same-session Lab -> Match reuse once without calling verification unseen", () => {
    const input = sessionInput();
    const labContext = input.metadata![0].context;
    const session = createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(item => ({ ...item, context: labContext })) });
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [session]);
    expect(history.exposures).toMatchObject({ knownContentExposureCount: 1, knownQuestionExposureCount: 4 });
    expect(history.methods[0].observations.map(item => item.exposure.content)).toEqual(["first-known", "repeated"]);
    expect(history.methods[0].limitations).toContain("verification-content-reused");
  });

  it("records unknown exposure when incomplete prior history could contain the material", () => {
    const unknown = completedSession({ id: "old", known: false });
    const known = completedSession({ id: "new", date: "2026-10-12T10:00:00Z" });
    const profile = aggregateCompletedEvidence(evidenceOwner, [unknown, known]);
    expect(profile.methods[0].recentObservations.every(item => item.exposure.content === "unknown")).toBe(true);
    expect(profile.methods[0].limitations).toEqual(expect.arrayContaining(["exposure-unknown", "prior-history-unknown", "question-exposure-unknown"]));
    expect(JSON.stringify(profile)).not.toContain('"fresh"');
  });

  it("tracks question identities separately from the shared study material", () => {
    const first = completedSession({ id: "one" });
    const input = sessionInput({ id: "two", date: "2026-10-12T10:00:00Z" });
    const later = createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(item => ({ ...item, protocol: { ...item.protocol,
        questions: item.protocol!.questions!.map(question => ({ ...question, questionId: `new-${question.questionId}` }))
      } })) });
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [first, later]);
    const observation = history.methods[0].observations.find(item => item.sessionId === "two" && item.phase === "lab")!;
    expect(observation.exposure).toMatchObject({ content: "repeated", questions: "first-known",
      questionCounts: { "first-known": 4, repeated: 0, unknown: 0 } });
  });

  it("does not assume local question IDs in different versioned content identify the same question", () => {
    const first = completedSession({ id: "one" });
    const input = sessionInput({ id: "two", date: "2026-10-12T10:00:00Z" });
    const second = createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(item => ({ ...item, context: { ...item.context, contentVersion: "2" } })) });
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [first, second]);
    expect(history.methods[0].observations.filter(item => item.sessionId === "two")
      .every(item => item.exposure.questions === "first-known")).toBe(true);
  });

  it("does not invent exact method/exposure order from two possibly overlapping session end times", () => {
    const sessions = [sessionInput({ id: "a" }), sessionInput({ id: "b", date: "2026-10-12T10:00:00Z" })]
      .map(input => createCompletedSessionEvidence({ ...input,
        metadata: input.metadata!.map(item => ({ ...item, completedAt: null })) }));
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, sessions);
    expect(history.methods[0].observations.every(item => item.exposure.content === "unknown")).toBe(true);
    expect(history.performanceGroups.every(group => group.rankings.every(row => row.chronologicalChange === null))).toBe(true);
  });
});

describe("bounded projection, preserved archive, and honest interpretation", () => {
  it.each([3, 4])("keeps %i-method Test Me evidence counts without adding firstScore or AI performance", count => {
    const methods = ["active-recall", "feynman", "cornell", "interleaving"] as const;
    const original = completedSession({ mode: "auto", methods: methods.slice(0, count) });
    const changed = { ...original, selectionContext: { kind: "ai-confirmed" as const, nominatedMethodIds: ["cornell" as const] },
      observations: original.observations.map(item => ({ ...item, selfReport: { confidence: 1, ease: 1, willingnessToUse: 1 } })) };
    const profile = aggregateCompletedEvidence(evidenceOwner, [original]);
    expect(profile).toMatchObject({ schemaVersion: 2, sessionCount: 1, independentSessionCount: 1, observationCount: count + 2 });
    expect(profile.methods).toHaveLength(count);
    expect(profile.performanceGroups).toEqual(aggregateCompletedEvidence(evidenceOwner, [changed]).performanceGroups);
    expect(JSON.stringify(profile)).not.toContain("firstScore"); expect(JSON.stringify(profile)).not.toContain("2.55");
  });

  it("keeps manual Lab and Match as two observations but one session, without a certainty percentage", () => {
    const profile = aggregateCompletedEvidence(evidenceOwner, [completedSession()]);
    expect(profile.methods[0]).toMatchObject({ sessionCount: 1, observationCount: 2, independentSessionCount: 1,
      sourceCounts: { "test-methods": 2 }, interpretation: { kind: "descriptive-only", furtherTestingRecommended: true } });
    expect(JSON.stringify(profile)).not.toContain("effectiveness");
    expect(JSON.stringify(profile)).not.toContain("certainty");
  });

  it("preserves conflicting outcomes and recommends more testing instead of implying superiority", () => {
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [
      completedSession({ id: "anchor", date: "2026-10-09T10:00:00Z" }),
      completedSession({ id: "one", correct: 4 }),
      completedSession({ id: "two", correct: 0, date: "2026-10-12T10:00:00Z" })
    ]);
    expect(history.methods[0].observations).toHaveLength(6);
    expect(history.methods[0].limitations).toContain("performance-varies");
    expect(history.methods[0].interpretation).toEqual({ kind: "descriptive-only", furtherTestingRecommended: true,
      nextAction: "test-on-different-material" });
    const repeated = history.performanceGroups.find(group => group.phase === "lab" && group.exposure.content === "repeated")!;
    expect(repeated.interpretation).toBe("descriptive-task-results-not-method-superiority");
    expect(repeated.rankings[0]).toMatchObject({ score: 0.5, varies: true, scoreRange: { minimum: 0, maximum: 1 } });
  });

  it("bounds a 1,000-session materialization without modifying or deleting source evidence", () => {
    const sessions = Array.from({ length: 1000 }, (_, index) => {
      const input = sessionInput({ id: `session-${String(index).padStart(4, "0")}` });
      return createCompletedSessionEvidence({ ...input, metadata: input.metadata!.map(item => ({ ...item,
        context: { ...item.context, topic: `Topic ${index}`, contentSetId: `set-${index}-${item.phase}` }
      })) });
    });
    const before = JSON.stringify(sessions);
    const profile = aggregateCompletedEvidence(evidenceOwner, sessions);
    expect(profile).toMatchObject({ sessionCount: 1000, independentSessionCount: 1000, observationCount: 2000 });
    expect(evidenceBytes(profile)).toBeLessThanOrEqual(CUMULATIVE_SUMMARY_LIMITS.profileBytes);
    expect(profile.methods[0].recentObservations.length).toBeLessThanOrEqual(CUMULATIVE_SUMMARY_LIMITS.observationsPerMethod);
    expect(profile.performanceGroups.length).toBeLessThanOrEqual(CUMULATIVE_SUMMARY_LIMITS.performanceGroups);
    expect(profile.retention).toMatchObject({ sourceEvidenceDiscarded: false, completeHistoryEmbedded: false,
      observationsNotEmbedded: 1996, totalPerformanceGroupCount: 2000, performanceGroupsNotEmbedded: 1988 });
    expect(profile).toEqual(aggregateCompletedEvidence(evidenceOwner, [...sessions].reverse()));
    expect(JSON.stringify(sessions)).toBe(before);
    expect(rebuildCompletedEvidenceHistory(evidenceOwner, sessions).methods[0].observations).toHaveLength(2000);
    const firstPage = pageCompletedEvidenceHistory(evidenceOwner, sessions, { limit: 20 });
    expect(firstPage.records).toHaveLength(20);
    expect(evidenceBytes(firstPage)).toBeLessThanOrEqual(EVIDENCE_HISTORY_LIMITS.pageBytes);
    console.info("FOUNDATION SIZE CHECK", { sessions: 1000, observations: 2000,
      profileBytes: evidenceBytes(profile), evidenceBytes: evidenceBytes(sessions), firstPageBytes: evidenceBytes(firstPage) });
  }, 30000);

  it("paginates the complete archive with no missing/duplicated sessions", () => {
    const sessions = Array.from({ length: 45 }, (_, index) => completedSession({ id: `page-${index}` }));
    const records: CompletedSessionEvidence[] = [];
    let afterSourceKey: string | undefined;
    do {
      const page = pageCompletedEvidenceHistory(evidenceOwner, [...sessions].reverse(), { afterSourceKey, limit: 7 });
      expect(page.records.length).toBeLessThanOrEqual(7);
      expect(evidenceBytes(page)).toBeLessThanOrEqual(EVIDENCE_HISTORY_LIMITS.pageBytes);
      records.push(...page.records); afterSourceKey = page.nextSourceKey ?? undefined;
    } while (afterSourceKey);
    expect(new Set(records.map(record => record.sessionId)).size).toBe(45);
    expect(aggregateCompletedEvidence(evidenceOwner, records)).toEqual(aggregateCompletedEvidence(evidenceOwner, sessions));
    expect(() => pageCompletedEvidenceHistory(evidenceOwner, sessions, { limit: 21 })).toThrow(/page limit/);
    expect(() => pageCompletedEvidenceHistory(evidenceOwner, sessions, { afterSourceKey: "another-owner-cursor" })).toThrow(/cursor/);
  });

  it("enforces byte limits with all 25 methods and worst-case escaped metadata, not just item counts", () => {
    const methods = [...TRAINING_METHOD_IDS, "pomodoro", "stopwatch"] as const;
    const records = methods.flatMap((method, index) => [0, 1].map(attempt => {
      const input = sessionInput({ id: `${index}-${attempt}-${"\u0001".repeat(990)}`, methods: [method] });
      return createCompletedSessionEvidence({ ...input, metadata: input.metadata!.map(item => ({ ...item,
        context: { subject: `s${"\u0001".repeat(127)}`, topic: `t${"\u0001".repeat(255)}`,
          exerciseTopic: `e${"\u0001".repeat(255)}`, contentSetId: `${index}-${item.phase}-${"\u0001".repeat(140)}`,
          contentVersion: `v${"\u0001".repeat(63)}` }
      })) });
    }));
    const profile = aggregateCompletedEvidence(evidenceOwner, records);
    expect(profile.methods).toHaveLength(25);
    expect(profile.observationCount).toBe(100);
    expect(evidenceBytes(profile)).toBeLessThanOrEqual(CUMULATIVE_SUMMARY_LIMITS.profileBytes);
    expect(profile.retention.observationsNotEmbedded).toBeGreaterThan(60);
    const page = pageCompletedEvidenceHistory(evidenceOwner, records, { limit: 20 });
    expect(evidenceBytes(page)).toBeLessThanOrEqual(EVIDENCE_HISTORY_LIMITS.pageBytes);
    expect(page.records.length).toBeLessThan(20);
    expect(page.nextSourceKey).not.toBeNull();
  });

  it.each(["subject", "topic", "exerciseTopic", "contentSetId", "contentVersion"] as const)(
    "rejects oversized %s rather than silently truncating evidence", field => {
      const input = sessionInput();
      expect(() => createCompletedSessionEvidence({ ...input,
        metadata: input.metadata!.map(item => ({ ...item, context: { ...item.context, [field]: "x".repeat(1100000) } }))
      })).toThrow(/context/);
    });

  it("bounds option metadata and total evidence bytes, including otherwise valid oversized sessions", () => {
    const input = sessionInput();
    expect(() => createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(item => ({ ...item, protocol: { ...item.protocol,
        questions: item.protocol!.questions!.map(question => ({ ...question, offeredOptionIds: ["x".repeat(10000), "b", "c"] }))
      } }))
    })).toThrow(/question conditions/);
    const methods = ["active-recall", "feynman", "cornell"] as const;
    const large = sessionInput({ methods: [...methods] });
    expect(() => createCompletedSessionEvidence({ ...large,
      methodLab: { experiments: large.methodLab.experiments.map(item => ({ ...item, score: 0.75, correct: 75, total: 100 })) },
      metadata: large.metadata!.map(item => ({ ...item,
        matchCounts: item.phase === "match" ? { correct: 75, total: 100 } : undefined,
        protocol: { ...item.protocol, questions: Array.from({ length: 100 }, (_, index) => ({
          questionId: `question-${index}`, difficulty: "medium" as const, offeredOptionCount: 16,
          offeredOptionIds: Array.from({ length: 16 }, (_, option) => `${option}-${"x".repeat(200)}`)
        })) }
      }))
    })).toThrow(/session byte limit/);
    expect(EVIDENCE_LIMITS.sessionBytes).toBe(128 * 1024);
  });
});
