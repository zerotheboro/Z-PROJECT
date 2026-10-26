import { describe, expect, it } from "vitest";
import {
  assertCompletedSessionEvidence, createCompletedSessionEvidence,
  normalizeEvidenceTimestamp
} from "../learningEvidence";
import type { CompletedSessionEvidence, EvidencePhase } from "../learningEvidence";
import { aggregateCompletedEvidence, rebuildCompletedEvidenceHistory } from "../cumulativeProfile";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import { completedSession, evidenceOwner, legacyAssessment, sessionInput } from "./learningEvidenceFixtures";

function timedInput(phase: EvidencePhase, observationTime: string | null, sessionTime: string | null) {
  const input = sessionInput({ mode: "auto" });
  return { ...input, completedAt: sessionTime,
    metadata: input.metadata!.map(item => ({ ...item,
      completedAt: item.phase === phase ? observationTime : null
    })) };
}

// Exercise stored/raw evidence too: factory normalization must not hide a
// validator that accidentally compares the original offset-bearing strings.
function timedRecord(phase: EvidencePhase, observationTime: string | null, sessionTime: string | null) {
  const record = completedSession({ mode: "auto" });
  return { ...record, completedAt: sessionTime,
    observations: record.observations.map(item => ({ ...item,
      completedAt: item.phase === phase ? observationTime : null
    })) };
}

describe("native observation/session timestamp integrity", () => {
  it.each([
    ["before", "2026-10-10T09:00:00Z", "2026-10-10T10:00:00Z"],
    ["equal", "2026-10-10T10:00:00Z", "2026-10-10T10:00:00Z"],
    ["equal with a positive offset", "2026-10-10T17:00:00+07:00", "2026-10-10T10:00:00Z"],
    ["equal with different offsets", "2026-10-10T05:00:00-05:00", "2026-10-10T11:00:00+01:00"],
    ["before with a negative offset", "2026-10-10T05:00:00-05:00", "2026-10-10T10:30:00Z"],
    ["before across calendar dates", "2026-10-11T00:00:00+07:00", "2026-10-10T18:00:00Z"]
  ])("accepts observations %s session completion", (_label, observationTime, sessionTime) => {
    for (const phase of ["lab", "match"] as const) {
      expect(() => assertCompletedSessionEvidence(timedRecord(phase, observationTime, sessionTime))).not.toThrow();
      const result = createCompletedSessionEvidence(timedInput(phase, observationTime, sessionTime));
      expect(result.completedAt).toBe(normalizeEvidenceTimestamp(sessionTime));
      expect(result.observations.find(item => item.phase === phase)!.completedAt)
        .toBe(normalizeEvidenceTimestamp(observationTime));
    }
  });

  it.each([
    ["same timezone", "2026-10-10T11:00:00Z", "2026-10-10T10:00:00Z"],
    ["positive offset", "2026-10-10T18:00:00+07:00", "2026-10-10T10:00:00Z"],
    ["lexically earlier but absolutely later", "2026-10-10T09:30:00Z", "2026-10-10T11:00:00+02:00"]
  ])("rejects observations after session completion: %s", (_label, observationTime, sessionTime) => {
    for (const phase of ["lab", "match"] as const) {
      const raw = timedRecord(phase, observationTime, sessionTime);
      expect(() => assertCompletedSessionEvidence(raw)).toThrow(/Observation completion exceeds session completion/);
      expect(() => createCompletedSessionEvidence(timedInput(phase, observationTime, sessionTime)))
        .toThrow(/Observation completion exceeds session completion/);
      expect(() => aggregateCompletedEvidence(evidenceOwner, [raw]))
        .toThrow(/Observation completion exceeds session completion/);
    }
  });

  it.each(["auto", "manual"] as const)("rejects the exact two-session 09:00/10:00 reproduction in %s mode", mode => {
    const inputs = (["active-recall", "feynman"] as const).map((method, index) =>
      sessionInput({ id: `clock-${index}`, methods: [method], mode,
        date: "2026-10-10T10:00:00Z" }));
    const raw = inputs.map(input => ({ ...createCompletedSessionEvidence(input),
      completedAt: "2026-10-10T09:00:00Z" }));
    for (const input of inputs) {
      expect(() => createCompletedSessionEvidence({ ...input, completedAt: "2026-10-10T09:00:00Z" }))
        .toThrow(/Observation completion exceeds session completion/);
    }
    for (const record of raw) {
      expect(() => assertCompletedSessionEvidence(record)).toThrow(/Observation completion exceeds session completion/);
    }
    for (const records of [raw, [...raw].reverse()]) {
      expect(() => aggregateCompletedEvidence(evidenceOwner, records))
        .toThrow(/Observation completion exceeds session completion/);
    }
  });

  it.each([
    [null, "2026-10-10T10:00:00Z"],
    ["2026-10-10T10:00:00Z", null],
    [null, null]
  ])("preserves unknown times rather than inventing a bound: %s / %s", (observationTime, sessionTime) => {
    const result = createCompletedSessionEvidence(timedInput("lab", observationTime, sessionTime));
    expect(() => assertCompletedSessionEvidence(result)).not.toThrow();
    expect(result.completedAt).toBe(normalizeEvidenceTimestamp(sessionTime));
    expect(result.observations[0].completedAt).toBe(normalizeEvidenceTimestamp(observationTime));
  });
});

describe("conservative and deterministic exposure ordering", () => {
  it.each([undefined, "2026-10-10T10:00:00"])("preserves historical unknown timing: %s", completedAt => {
    const records = ["historical-a", "historical-b"].map(assessmentId => {
      const adapted = adaptLegacyAutomaticAssessment({ ownerUid: evidenceOwner.uid, assessmentId,
        assessment: { ...legacyAssessment(), completedAt, createdAt: completedAt } });
      if (!adapted.valid) throw new Error(adapted.reason);
      expect(adapted.session.completedAt).toBeNull();
      expect(adapted.session.recordedAt).toBeNull();
      expect(adapted.session.observations.every(item => item.completedAt === null)).toBe(true);
      if (completedAt !== undefined) expect(adapted.session.limitations).toContain("legacy-timestamp-ambiguous");
      return adapted.session;
    });
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, records);
    expect(history.observationCount).toBe(4);
    expect(history.methods[0].observations.every(item => item.exposure.content === "unknown" &&
      item.exposure.questions === "unknown")).toBe(true);
    expect(history.performanceGroups).toEqual([]);
    expect(history).toEqual(rebuildCompletedEvidenceHistory(evidenceOwner, [...records].reverse()));
  });

  it("keeps cross-session ties unknown, but detects reliably later cross-method reuse in every input order", () => {
    const first = completedSession({ id: "tie-a", methods: ["active-recall"], mode: "auto" });
    const secondInput = sessionInput({ id: "tie-b", methods: ["cornell"], mode: "auto", date: "2026-10-10T17:00:00+07:00" });
    const second = createCompletedSessionEvidence({ ...secondInput, completedAt: "2026-10-10T11:00:00Z" });
    const later = completedSession({ id: "later", methods: ["feynman"], mode: "auto", date: "2026-10-11T10:00:00Z" });
    const expected = rebuildCompletedEvidenceHistory(evidenceOwner, [first, second, later]);
    for (const method of expected.methods) {
      const state = method.methodId === "feynman" ? "repeated" : "unknown";
      expect(method.observations.every(item => item.exposure.content === state && item.exposure.questions === state)).toBe(true);
    }
    const tiedOnly = rebuildCompletedEvidenceHistory(evidenceOwner, [first, second]);
    expect(tiedOnly.performanceGroups.every(group => group.rankings.every(row => row.chronologicalChange === null))).toBe(true);
    for (const records of [[first, later, second], [second, first, later], [second, later, first], [later, first, second], [later, second, first]]) {
      expect(rebuildCompletedEvidenceHistory(evidenceOwner, records)).toEqual(expected);
    }
  });

  it("never breaks a historical observation tie with inconsistent session-end bounds", () => {
    const records: CompletedSessionEvidence[] = (["active-recall", "feynman"] as const).map((method, index) => ({
      ...completedSession({ id: `legacy-tie-${index}`, methods: [method] }),
      provenance: { kind: "legacy-assessment", recordId: `record-${index}` },
      completedAt: "2026-10-10T09:00:00Z"
    }));
    const history = rebuildCompletedEvidenceHistory(evidenceOwner, records);
    expect(history.methods.every(method => method.observations.every(item =>
      item.exposure.content === "unknown" && item.exposure.questions === "unknown"))).toBe(true);
    expect(history).toEqual(rebuildCompletedEvidenceHistory(evidenceOwner, [...records].reverse()));
  });
});
