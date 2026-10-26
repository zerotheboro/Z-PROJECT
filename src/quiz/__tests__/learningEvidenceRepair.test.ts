import { describe, expect, it } from "vitest";
import {
  assertCompletedSessionEvidence, createCompletedSessionEvidence,
  EvidenceValidationError, normalizeEvidenceTimestamp
} from "../learningEvidence";
import type { ObservationMetadata } from "../learningEvidence";
import { aggregateCompletedEvidence, rebuildCompletedEvidenceHistory } from "../cumulativeProfile";
import { completedEvidenceSourceKey, normalizeCompletedEvidence } from "../completedEvidenceIdentity";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import { completedSession, evidenceOwner, legacyAssessment, sessionInput } from "./learningEvidenceFixtures";

function historical(knownSessionId?: string, assessment: unknown = legacyAssessment(), assessmentId = "same-document") {
  const result = adaptLegacyAutomaticAssessment({ ownerUid: evidenceOwner.uid, assessmentId, assessment, knownSessionId });
  if (!result.valid) throw new Error(result.reason);
  return result.session;
}

describe("historical source identity repair", () => {
  it("deduplicates linked/unlinked aliases and duplicated imports independently of order", () => {
    const unlinked = historical(), linked = historical("trusted-session");
    expect(completedEvidenceSourceKey(unlinked)).toBe(completedEvidenceSourceKey(linked));
    const expected = aggregateCompletedEvidence(evidenceOwner, [linked]);
    for (const values of [[unlinked, linked], [linked, unlinked], [unlinked, unlinked, linked, linked]]) {
      expect(aggregateCompletedEvidence(evidenceOwner, values)).toEqual(expected);
      const normalized = normalizeCompletedEvidence(evidenceOwner, values);
      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toMatchObject({ sessionId: "trusted-session", originalSessionId: "trusted-session" });
      expect(normalized[0].observations.every(item => item.sessionId === "trusted-session" &&
        item.observationId.startsWith("trusted-session:"))).toBe(true);
    }
    expect(expected).toMatchObject({ sessionCount: 1, independentSessionCount: 1, observationCount: 2 });
  });

  it("rejects conflicting contents under different aliases in either processing order", () => {
    const saved = legacyAssessment();
    const changed = { ...saved, methodLab: { experiments: saved.methodLab.experiments.map(item => ({ ...item, score: 0.25, correct: 1 })) } };
    const first = historical(), second = historical("trusted-session", changed);
    for (const values of [[first, second], [second, first]]) {
      expect(() => aggregateCompletedEvidence(evidenceOwner, values)).toThrow(/Conflicting historical source/);
    }
  });

  it("rejects incompatible known session claims even when contents agree", () => {
    for (const values of [[historical("a"), historical("b")], [historical("b"), historical("a")]]) {
      expect(() => aggregateCompletedEvidence(evidenceOwner, values)).toThrow(/Incompatible historical session linkage/);
    }
  });

  it("does not silently merge different source documents claiming the same session", () => {
    expect(() => aggregateCompletedEvidence(evidenceOwner, [historical("a"), historical("a", legacyAssessment(), "other-document")]))
      .toThrow(/Different sources claim/);
  });

  it("keeps unlinked source records stable without claiming an original Training identity", () => {
    const session = historical();
    const copy = structuredClone(session);
    expect(aggregateCompletedEvidence(evidenceOwner, [session, copy])).toMatchObject({
      sessionCount: 1, independentSessionCount: 0, unknownIndependenceSessionCount: 1, observationCount: 2
    });
    expect(() => aggregateCompletedEvidence({ kind: "user", uid: "other-user" }, [session])).toThrow(/another owner/);
  });
});

describe("Match whitelist and duplicate observation repair", () => {
  it("ignores arbitrary extra Match metadata without invoking getters or freezing caller data", () => {
    const input = sessionInput();
    const privateObject = { text: "do not copy" };
    const counts = { correct: 3, total: 4, privateObject,
      get score(): number { throw new Error("must never read score"); },
      get timeSpentMs(): number { throw new Error("must never read time"); } };
    const session = createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(item => item.phase === "match" ? { ...item, matchCounts: counts } : item) });
    const match = session.observations.find(item => item.phase === "match")!;
    expect(match.performance).toEqual({ score: 0.75, correct: 3, total: 4, timeSpentMs: 500 });
    expect(JSON.stringify(session)).not.toContain("do not copy");
    expect(Object.isFrozen(privateObject)).toBe(false);
    expect(Object.isFrozen(counts)).toBe(false);
    expect(Object.isFrozen(match.performance)).toBe(true);
  });

  it("cannot smuggle an overriding score through otherwise valid count metadata", () => {
    const input = sessionInput();
    const counts = { correct: 4, total: 4, score: 1, timeSpentMs: 0 };
    expect(() => createCompletedSessionEvidence({ ...input,
      metadata: input.metadata!.map(item => item.phase === "match" ? { ...item, matchCounts: counts } : item)
    })).toThrow(/Score disagrees/);
  });

  it.each([null, 4, [], { correct: "3", total: 4 }, { correct: -1, total: 4 },
    { correct: 1.5, total: 4 }, { correct: 0, total: 0 }, { correct: 5, total: 4 }, { correct: 3, total: Infinity }, {}])(
    "rejects malformed allowed Match fields: %j", counts => {
      const input = sessionInput();
      expect(() => createCompletedSessionEvidence({ ...input,
        metadata: input.metadata!.map(item => item.phase === "match" ? {
          ...item, matchCounts: counts as unknown as ObservationMetadata["matchCounts"]
        } : item)
      })).toThrow(EvidenceValidationError);
    });

  it("accepts six-decimal score rounding without reconstructing or replacing the score", () => {
    const input = sessionInput();
    const rounded = (score: number) => createCompletedSessionEvidence({ ...input,
      methodMatch: { methods: input.methodMatch.methods.map(item => ({ ...item, verificationScore: score })) },
      metadata: input.metadata!.map(item => item.phase === "match" ? { ...item,
        matchCounts: { correct: 1, total: 3 },
        protocol: { ...item.protocol, questions: item.protocol!.questions!.slice(0, 3) }
      } : item)
    });
    expect(rounded(0.333333).observations.find(item => item.phase === "match")!.performance.score).toBe(0.333333);
    expect(() => rounded(0.33333)).toThrow(/Score disagrees/);
  });

  it.each(["lab", "match"] as const)("deduplicates identical %s results before returning immutable evidence", phase => {
    const input = sessionInput();
    const result = createCompletedSessionEvidence({ ...input,
      methodLab: { experiments: phase === "lab" ? [...input.methodLab.experiments, input.methodLab.experiments[0]] : input.methodLab.experiments },
      methodMatch: { methods: phase === "match" ? [...input.methodMatch.methods, input.methodMatch.methods[0]] : input.methodMatch.methods }
    });
    expect(result).toEqual(createCompletedSessionEvidence(input));
    expect(() => assertCompletedSessionEvidence(result)).not.toThrow();
    expect(() => aggregateCompletedEvidence(evidenceOwner, [result])).not.toThrow();
    expect(Object.isFrozen(result.observations)).toBe(true);
  });

  it.each(["lab", "match"] as const)("rejects contradictory duplicate %s results before freezing", phase => {
    const input = sessionInput();
    const changedLab = { ...input.methodLab.experiments[0], score: 0.25, correct: 1 };
    const changedMatch = { ...input.methodMatch.methods[0], confidence: 1 };
    expect(() => createCompletedSessionEvidence({ ...input,
      methodLab: { experiments: phase === "lab" ? [...input.methodLab.experiments, changedLab] : input.methodLab.experiments },
      methodMatch: { methods: phase === "match" ? [...input.methodMatch.methods, changedMatch] : input.methodMatch.methods }
    })).toThrow(/Conflicting observation/);
    expect(Object.isFrozen(input)).toBe(false);
  });
});

describe("explicit timestamps and partial historical evidence", () => {
  it.each(["2026-10-10T10:00:00", "2026-10-10", "not-a-date", "2026-02-30T10:00:00Z", "2026-10-10T25:00:00Z"])(
    "rejects ambiguous/invalid native timestamp %s", date => {
      expect(() => completedSession({ date })).toThrow(EvidenceValidationError);
    });

  it("normalizes explicit UTC offsets consistently", () => {
    expect(normalizeEvidenceTimestamp("2026-10-10T17:00:00+07:00")).toBe("2026-10-10T10:00:00.000Z");
    expect(completedSession({ date: "2026-10-10T17:00:00+07:00" }))
      .toEqual(completedSession({ date: "2026-10-10T10:00:00Z" }));
  });

  it("rebuilds identically under UTC and Bangkok and preserves ambiguous legacy time as unknown", () => {
    const previous = process.env.TZ;
    try {
      const results = ["UTC", "Asia/Bangkok"].map(tz => {
        process.env.TZ = tz;
        const old = { ...legacyAssessment(), completedAt: "2026-10-10T10:00:00", createdAt: "2026-10-10T11:00:00" };
        const session = historical(undefined, old);
        expect(session.completedAt).toBeNull(); expect(session.recordedAt).toBeNull();
        expect(session.limitations).toContain("legacy-timestamp-ambiguous");
        return aggregateCompletedEvidence(evidenceOwner, [session, completedSession({ date: "2026-10-10T17:00:00+07:00" })]);
      });
      expect(results[0]).toEqual(results[1]);
      expect(results[0].methods[0].limitations).toContain("legacy-timestamp-ambiguous");
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  });

  it.each(["total", "correct", "score"] as const)("preserves all independent historical fields when %s is absent", missing => {
    const saved = legacyAssessment();
    const lab: Record<string, unknown> = { ...saved.methodLab.experiments[0] };
    delete lab[missing];
    const session = historical(undefined, { ...saved, methodLab: { experiments: [lab] } });
    const observation = session.observations.find(item => item.phase === "lab")!;
    expect(observation.performance[missing]).toBeNull();
    for (const key of ["total", "correct", "score"] as const) if (key !== missing) {
      expect(observation.performance[key]).toBe(saved.methodLab.experiments[0][key]);
    }
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, [session]);
    expect(history.methods[0].observations).toHaveLength(2);
    expect(history.performanceGroups).toEqual([]);
    expect(history.methods[0].limitations).toContain(missing === "score" ? "score-unknown" : "question-counts-unknown");
  });

  it("still reads v1 JSON evidence without the additive limitations field", () => {
    const { limitations: _oldOptionalField, ...value } = structuredClone(completedSession());
    expect(() => assertCompletedSessionEvidence(value)).not.toThrow();
    expect(aggregateCompletedEvidence(evidenceOwner, [value])).toEqual(aggregateCompletedEvidence(evidenceOwner, [completedSession()]));
  });

  it("fails closed with a validation error on malformed stored shapes", () => {
    expect(() => assertCompletedSessionEvidence({ ...completedSession(), selectionContext: null })).toThrow(EvidenceValidationError);
  });
});
