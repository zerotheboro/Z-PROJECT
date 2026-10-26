import { describe, expect, it } from "vitest";
import {
  assertCompletedSessionEvidence,
  createCompletedSessionEvidence,
  observationIdFor
} from "../learningEvidence";
import type { MethodLabResult, MethodMatchResult } from "../type";
import { completedSession, sessionInput } from "./learningEvidenceFixtures";

describe("completed-session evidence contract", () => {
  it.each([3, 4])("represents completed automatic Test Me with %i methods and two verification observations", count => {
    const methods = ["active-recall", "feynman", "cornell", "interleaving"] as const;
    const session = completedSession({ mode: "auto", methods: methods.slice(0, count) });
    expect(session.schemaVersion).toBe(1);
    expect(session.selectionContext.kind).toBe(count === 3 ? "ai-confirmed" : "traditional");
    expect(session.observations.filter(item => item.source === "test-me-lab")).toHaveLength(count);
    expect(session.observations.filter(item => item.source === "test-me-match")).toHaveLength(2);
    expect(new Set(session.observations.map(item => item.observationId)).size).toBe(count + 2);
    expect(session.originalSessionId).toBe(session.sessionId);
  });

  it.each([1, 2, 3])("uses the same contract for a %i-method manual session", count => {
    const methods = ["active-recall", "feynman", "cornell"] as const;
    const session = completedSession({ methods: methods.slice(0, count) });
    expect(session.observations.every(item => item.source === "test-methods")).toBe(true);
    expect(session.observations.filter(item => item.phase === "match")).toHaveLength(Math.min(count, 2));
  });

  it("accepts the unchanged production result types and ignores firstScore", () => {
    const methodLab: MethodLabResult = { experiments: [{
      method: "feynman", category: "understanding", score: 0.5, correct: 1, total: 2,
      confidence: 5, ease: 2, willingnessToUse: 4, timeSpentMs: 40
    }] };
    const methodMatch: MethodMatchResult = { methods: [{
      method: "feynman", firstScore: 0.99, verificationScore: 0.25, confidence: 3, timeSpentMs: 30
    }] };
    const session = createCompletedSessionEvidence({
      sessionId: "real-shape", owner: { kind: "user", uid: "student" }, mode: "manual",
      methodLab, methodMatch
    });
    expect(session.observations.map(item => item.performance.score)).toEqual([0.5, 0.25]);
    expect(session.observations[1].performance).toMatchObject({ correct: null, total: null });
    expect(JSON.stringify(session)).not.toContain("firstScore");
    expect(JSON.stringify(session)).not.toContain("evidenceScore");
  });

  it("preserves absent context, scores, counts, ratings, and observation times as unknown", () => {
    const input = sessionInput({ known: false });
    const session = createCompletedSessionEvidence({
      ...input,
      methodLab: { experiments: [{
        method: "active-recall", score: null, correct: null, total: null,
        confidence: null, ease: null, willingnessToUse: null, timeSpentMs: null
      }] }
    });
    expect(session.observations[0]).toMatchObject({
      context: { subject: null, topic: null, exerciseTopic: null, contentSetId: null, contentVersion: null },
      protocol: { assessmentVersion: null, scoringVersion: null, questions: null },
      performance: { score: null, correct: null, total: null, timeSpentMs: null },
      selfReport: { confidence: null, ease: null, willingnessToUse: null },
      completedAt: null
    });
    // A session completion timestamp is not an invented exact method timestamp.
    expect(session.completedAt).not.toBeNull();
  });

  it("copies metadata and results without mutating or retaining caller-owned arrays", () => {
    const input = sessionInput();
    const before = JSON.stringify(input);
    const session = createCompletedSessionEvidence(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(session.observations[0].protocol.questions)
      .not.toBe(input.metadata?.[0].protocol?.questions);
    expect(session.observations[0].context).not.toBe(input.metadata?.[0].context);
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.observations[0].protocol.questions)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it("uses stable collision-safe observation identities without a clock or random source", () => {
    expect(observationIdFor("session:a", "lab", "active-recall"))
      .toBe("session%3Aa:lab:active-recall");
    expect(completedSession()).toEqual(completedSession());
  });

  it("does not copy unrelated private fields into the evidence contract", () => {
    const input = sessionInput();
    const owner = { kind: "user" as const, uid: "student", email: "private@example.test" };
    const preference = { methodId: "feynman" as const, priority: "ease" as const, reflectionText: "private writing" };
    const session = createCompletedSessionEvidence({ ...input, owner, preference });
    expect(session.owner).toEqual({ kind: "user", uid: "student" });
    expect(session.preference).toEqual({ methodId: "feynman", priority: "ease" });
    expect(JSON.stringify(session)).not.toContain("private");
  });

  it("does not reconstruct a missing score from known counts", () => {
    const input = sessionInput();
    const session = createCompletedSessionEvidence({ ...input,
      methodLab: { experiments: input.methodLab.experiments.map(item => ({ ...item, score: null })) }
    });
    expect(session.observations[0].performance).toMatchObject({ score: null, correct: 3, total: 4 });
  });

  it("rejects invalid ratings, counts, versions, and inconsistent question conditions", () => {
    const session = completedSession();
    const item = session.observations[0];
    expect(() => assertCompletedSessionEvidence({ ...session, schemaVersion: 2 } as never)).toThrow(/Unsupported/);
    expect(() => assertCompletedSessionEvidence({ ...session, observations: [{
      ...item, selfReport: { ...item.selfReport, ease: 6 }
    }] })).toThrow(/rating/);
    expect(() => assertCompletedSessionEvidence({ ...session, observations: [{
      ...item, performance: { ...item.performance, correct: 2 }
    }] })).toThrow(/Score disagrees/);
    expect(() => assertCompletedSessionEvidence({ ...session, observations: [{
      ...item, protocol: { ...item.protocol, questions: item.protocol.questions!.slice(0, 2) }
    }] })).toThrow(/question count/);
  });
});
