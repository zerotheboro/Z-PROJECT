import { describe, expect, it } from "vitest";
import { economicsEvidenceFixture } from "../../../test-support/economicsEvidenceFixtures";
import { validateCompletion } from "../../../backend/trainingCompletionContract";
import { deriveEconomicsObjectiveEvidence, resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { compileMappedEconomics } from "../economics9708/runtime";
import { buildEconomicsObjectiveHistory } from "../economics9708/objectiveHistory";
import { aggregateCompletedEvidence } from "../cumulativeProfile";
import { observationIdFor } from "../learningEvidence";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";

const UID = "synthetic-objective-owner", recorded = "2026-11-05T10:00:00.000Z";
function accepted(request = economicsEvidenceFixture()) {
  const result = validateCompletion(UID, request, recorded);
  const id = `session-${request.sessionId}`;
  return { id, data: { evidence: result.evidence, objectiveEvidence: result.objectiveEvidence, requestHash: result.requestHash,
    ...(request.materialPresentations ? { materialPresentations: request.materialPresentations } : {}),
    receipt: { schemaVersion: 2, status: "accepted", evidenceId: id, sessionId: request.sessionId, mode: request.mode, requestHash: result.requestHash } } };
}
describe("canonical objective-level evidence integrity", () => {
  it.each(["1.5", "2.2"])("derives %s objective membership and correctness from actual responses, independently of presentations", topic => {
    const request = economicsEvidenceFixture({ topic }), validated = validateCompletion(UID, request, recorded);
    const sidecar = validated.objectiveEvidence!;
    expect(sidecar.provenance).toBe("server-validated-canonical-questions-and-client-answers");
    expect(sidecar.outsideStudy).toBe("unknown");
    for (const a of sidecar.activities) for (const q of a.answers) {
      expect(q.objectiveIds.every(id => id.startsWith(`ec9708-objective-${topic}.`))).toBe(true);
      expect(q.correct).toBe(true);
    }
    expect(sidecar.activities[0].stage).toBe("method-lab");
    expect(sidecar.activities.filter(a => a.verificationRole === "top-two-verification")).toHaveLength(2);
    const without = structuredClone(request); delete without.economicsResponses;
    expect(validateCompletion(UID, without, recorded).evidence).toEqual(validated.evidence);
    expect(aggregateCompletedEvidence({ kind: "user", uid: UID }, [validated.evidence])).toEqual(aggregateCompletedEvidence({ kind: "user", uid: UID }, [validateCompletion(UID, without, recorded).evidence]));
  });
  it.each([3, 4])("preserves post-study Baseline meaning and %i-method totals without adding performance observations", count => {
    const methods = ["active-recall", "feynman", "cornell", "memory-palace"] as const;
    const result = validateCompletion(UID, economicsEvidenceFixture({ mode: "auto", methods: [...methods.slice(0, count)] }), recorded);
    expect(result.objectiveEvidence!.baselineMeaning).toBe("post-study-not-prior-knowledge");
    expect(result.objectiveEvidence!.activities.slice(0, 2).map(a => a.stage)).toEqual(["baseline-post-study", "baseline-post-study"]);
    expect(result.evidence.observations).toHaveLength(count + 2);
  });
  it("marks missing and partial answer detail unknown instead of upgrading plans/material exposure into assessed objectives", () => {
    const empty = economicsEvidenceFixture(); empty.economicsResponses!.activities.forEach(a => { a.responses = []; });
    const result = validateCompletion(UID, empty, recorded);
    expect(result.objectiveEvidence!.activities.every(a => a.responseCoverage === "unavailable" && a.answers.length === 0)).toBe(true);
    const partial = economicsEvidenceFixture(); partial.economicsResponses!.activities[0].responses.pop();
    expect(validateCompletion(UID, partial, recorded).objectiveEvidence!.activities[0].responseCoverage).toBe("partial");
    const old = economicsEvidenceFixture(); delete old.economicsResponses;
    expect(validateCompletion(UID, old, recorded).objectiveEvidence).toBeUndefined();
  });
  it("retains a canonical reported presentation as exposure only, and rejects unassigned material", () => {
    const request = economicsEvidenceFixture(), id = request.economicsResponses!.activities[0].contentSetId;
    const form = resolveEconomicsAssessment(id);
    const materials = compileMappedEconomics({ title: "" }, form.pack, "memory-palace", "lab", { questions: form.scored, practice: [], test: [] }, id).runtime.materials;
    const m = materials[0];
    request.materialPresentations = { schemaVersion: 1, kind: "client-rendered", records: [{ materialId: m.id, materialVersion: m.version,
      mappingVersion: "ec9708-objectives-1", contentSetId: id, methodId: "memory-palace", phase: "lab", objectiveIds: m.objectiveIds,
      presentedAt: "2026-11-03T09:30:00.000Z" }] };
    request.economicsResponses!.activities[0].responses = [];
    const row = accepted(request), view = buildEconomicsObjectiveHistory(UID, [row]);
    expect(view.activities[0].materialExposureOnly).toHaveLength(1);
    expect(view.activities[0].answers).toEqual([]);
    expect(view.activities[0].responseCoverage).toBe("unavailable");
    request.materialPresentations.records[0] = { ...request.materialPresentations.records[0], materialId: "ec9708-1.5:step-1", objectiveIds: [] };
    expect(() => validateCompletion(UID, request, recorded)).toThrow();
    row.data.materialPresentations = request.materialPresentations;
    expect(() => buildEconomicsObjectiveHistory(UID, [row])).toThrow();
  });
  it("separates Leitner practice/retest from scored assessment without double-counting the final score", () => {
    const request = economicsEvidenceFixture({ methods: ["leitner-system"] });
    const activity = request.economicsResponses!.activities[0];
    const practice = activity.responses.find(q => q.role === "practice")!;
    activity.responses.push({ ...practice, role: "retest" });
    const result = validateCompletion(UID, request, recorded);
    expect(result.objectiveEvidence!.activities[0].answers.filter(q => q.role === "scored")).toHaveLength(3);
    expect(result.objectiveEvidence!.activities[0].answers.filter(q => q.role === "retest")).toHaveLength(1);
    expect(result.evidence.observations.find(o => o.phase === "lab")!.performance.total).toBe(3);
  });
  it.each([
    (r: ReturnType<typeof economicsEvidenceFixture>) => { r.economicsResponses!.activities[0].responses[0].answerOptionId = r.economicsResponses!.activities[0].responses[0].answerOptionId.replace("option-0", "option-1"); },
    r => { r.economicsResponses!.activities[0].responses[0].questionId = "ec9708-2.2-lab-1-v1"; },
    r => { r.economicsResponses!.activities[0].responses.push(r.economicsResponses!.activities[0].responses[0]); },
    r => { r.economicsResponses!.activities.reverse(); },
    r => { r.economicsResponses!.activities[0].contentSetId = r.economicsResponses!.activities[0].contentSetId.replace("memory-palace", "derive-basics"); },
    r => { r.economicsResponses!.sessionStartedAt = "2027-01-01T00:00:00.000Z"; },
    r => { Object.assign(r.metadata![0].context!, { topic: "Fabricated topic" }); },
    r => { Object.assign(r.metadata![0].protocol!, { scoringVersion: "invented-scoring" }); },
    r => { Object.assign(r.metadata![0].protocol!, { questions: r.metadata![0].protocol!.questions!.map(() => r.metadata![0].protocol!.questions![0]) }); },
    r => { Object.assign(r.metadata![0].protocol!.questions![0], { offeredOptionIds: ["a", "b", "c", "d"] }); },
    r => { r.economicsResponses!.activities.forEach(a => { a.responses = []; }); r.methodMatch.methods.find(m => m.method === "memory-palace")!.verificationScore = .5; },
    r => { Object.assign(r.economicsResponses!.activities[0].responses[0], { objectiveIds: ["fabricated"], correct: true }); }
  ])("rejects corrupt identities, impossible performance, altered sequences and caller-supplied objective claims", mutate => {
    const request = economicsEvidenceFixture(); mutate(request);
    expect(() => validateCompletion(UID, request, recorded)).toThrow();
  });
  it("does not mutate or freeze caller-owned reports", () => {
    const request = economicsEvidenceFixture(), original = structuredClone(request);
    deriveEconomicsObjectiveEvidence(request);
    expect(request).toEqual(original); expect(Object.isFrozen(request.economicsResponses)).toBe(false);
  });
});

describe("owner-scoped accepted-history interpretation", () => {
  it("tracks sequential Memory Palace → Feynman as prior exposure, not causal improvement", () => {
    const row = accepted(), view = buildEconomicsObjectiveHistory(UID, [row]);
    const feynman = view.activities.find(a => a.methodId === "feynman" && a.stage === "method-lab")!;
    expect(feynman.priorMethodsInSession).toEqual(["memory-palace"]);
    expect(feynman.priorByObjective.some(p => p.earlierWithinSessionActivities > 0)).toBe(true);
    expect(feynman.causalAttribution).toBe("not-established");
    expect(view.activities).toHaveLength(4);
    expect(view.contentExposure.has(observationIdFor(row.data.evidence.sessionId, "lab", "feynman"))).toBe(true);
  });
  it("deduplicates retries and preserves order-independent known prior session counts", () => {
    const first = accepted(), second = accepted(economicsEvidenceFixture({ sessionId: "objective-session-0002", startedAt: "2026-11-04T09:00:00.000Z", completedAt: "2026-11-04T10:00:00.000Z" }));
    const a = buildEconomicsObjectiveHistory(UID, [first, second, first]);
    const b = buildEconomicsObjectiveHistory(UID, [second, first]);
    expect(a.activities).toEqual(b.activities); expect(a.sessions).toBe(2);
    const later = a.activities.find(a => a.sessionId === second.data.evidence.sessionId)!;
    expect(later.priorByObjective.some(p => p.earlierReportedSessions === 1)).toBe(true);
    expect(later.outsideStudy).toBe("unknown");
  });
  it("does not use tied, missing or overlapping times to invent earlier exposure", () => {
    const first = accepted();
    const tied = accepted(economicsEvidenceFixture({ sessionId: "objective-tied-0002", startedAt: "2026-11-03T10:00:00.000Z" }));
    const view = buildEconomicsObjectiveHistory(UID, [first, tied]);
    expect(view.activities.filter(a => a.sessionId === tied.data.evidence.sessionId).flatMap(a => a.priorByObjective).every(p => p.earlierReportedSessions === 0)).toBe(true);
    const unknownRequest = economicsEvidenceFixture({ sessionId: "objective-unknown-0003" });
    unknownRequest.economicsResponses!.sessionStartedAt = null; unknownRequest.completedAt = null;
    const unknown = accepted(unknownRequest), incomplete = buildEconomicsObjectiveHistory(UID, [first, unknown]);
    expect(incomplete.activities.filter(a => a.sessionId === unknown.data.evidence.sessionId).every(a => a.priorByObjective.every(p => p.earlierReportedSessions === 0))).toBe(true);
    const future = structuredClone(unknownRequest); future.economicsResponses!.sessionStartedAt = "2027-01-01T00:00:00.000Z";
    expect(() => validateCompletion(UID, future, recorded)).toThrow();
  });
  it("keeps historical records without objective answers usable and rejects cross-account or altered sidecars", () => {
    const oldRequest = economicsEvidenceFixture({ sessionId: "historical-session-0001" }); delete oldRequest.economicsResponses;
    const old = accepted(oldRequest), native = accepted();
    const view = buildEconomicsObjectiveHistory(UID, [old, native]);
    expect(view.objectiveAssessmentUnavailableSessions).toEqual([old.data.evidence.sessionId]);
    expect(() => buildEconomicsObjectiveHistory("another-student", [native])).toThrow();
    const altered = structuredClone(native); altered.data.objectiveEvidence!.activities[0].answers[0].objectiveIds = ["ec9708-objective-2.2.1"];
    expect(() => buildEconomicsObjectiveHistory(UID, [altered])).toThrow();
    expect(() => buildEconomicsObjectiveHistory(UID, [native, altered])).toThrow();
    const unaccepted = structuredClone(native); unaccepted.data.receipt.status = "pending";
    expect(() => buildEconomicsObjectiveHistory(UID, [unaccepted])).toThrow();
  });
  it("does not turn an unresolved historical snapshot into a distinct prior native method session", () => {
    const request = economicsEvidenceFixture({ mode: "auto", methods: ["memory-palace", "feynman", "active-recall"] });
    const legacy = adaptLegacyAutomaticAssessment({ ownerUid: UID, assessmentId: "unlinked-old-assessment", assessment: {
      ...validateCompletion(UID, request, recorded).legacy, completedAt: "2026-11-02T10:00:00.000Z", createdAt: "2026-11-02T10:00:00.000Z"
    } });
    expect(legacy.valid).toBe(true); if (!legacy.valid) throw new Error(legacy.reason);
    const view = buildEconomicsObjectiveHistory(UID, [{ id: "legacy-source", data: { evidence: legacy.session } }, accepted()]);
    expect(view.objectiveAssessmentUnavailableSessions).toContain(legacy.session.sessionId);
    expect(view.activities.filter(a => a.stage === "method-lab").every(a => a.earlierReportedMethodSessions === 0)).toBe(true);
  });
});
