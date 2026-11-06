import { describe, expect, it } from "vitest";
import { digest, validateCompletion } from "../../../backend/trainingCompletionContract";
import { economicsEvidenceFixture } from "../../../test-support/economicsEvidenceFixtures";
import type { CompletionRequest } from "../../../backend/trainingCompletionContract";
import { recommendEconomicsStudy } from "../economics9708/studyRecommendations";
import type { StudyRecommendationResult, AcceptedObjectiveSource } from "../economics9708/studyRecommendations";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import { supportedEconomicsMethods } from "../economics9708/runtime";
import { requireEconomicsPack, economicsPacks } from "../economics9708/packs";
import { mapTopicLearningContent } from "../economics9708/objectives";
import { METHOD_POOL } from "../../../methodPool.js";

const UID = "synthetic-recommendation-owner", NOW = "2026-11-05T10:00:00.000Z";
function accepted(request: CompletionRequest, uid = UID): AcceptedObjectiveSource {
  const v = validateCompletion(uid, request, NOW), id = `session-${digest(request.sessionId)}`;
  return { id, data: { schemaVersion: 1, evidence: v.evidence, ...(v.objectiveEvidence ? { objectiveEvidence: v.objectiveEvidence } : {}),
    ...(request.materialPresentations ? { materialPresentations: request.materialPresentations } : {}),
    requestHash: v.requestHash, receipt: { schemaVersion: 2, status: "accepted", evidenceId: id, sessionId: request.sessionId,
      mode: request.mode, requestHash: v.requestHash, lifecycleEpoch: 1, acceptedRevision: 1, recordedAt: NOW,
      legacyAssessmentId: request.mode === "auto" ? request.sessionId : null, legacyProfileUpdated: false } } };
}
// Change real canonical responses and their corresponding existing totals.
// Partial capture omits details, never fabricates a zero-scored completion.
function answers(request: CompletionRequest, keep?: readonly string[], wrong: readonly string[] = []) {
  for (const activity of request.economicsResponses!.activities) {
    const form = resolveEconomicsAssessment(activity.contentSetId);
    for (const response of activity.responses) if (wrong.includes(response.questionId)) {
      const q = [...form.scored, ...form.practice].find(q => q.id === response.questionId)!;
      response.answerOptionId = `${q.id}:option-${q.options.findIndex(option => option !== q.correct)}`;
    }
    const n = form.scored.length, correct = n - form.scored.filter(q => wrong.includes(q.id)).length;
    if (form.phase === "lab") Object.assign(request.methodLab.experiments.find(m => m.method === form.methodId)!, { correct, total: n, score: correct / n });
    else if (form.phase === "match") request.methodMatch.methods.find(m => m.method === form.methodId)!.verificationScore = correct / n;
    else Object.assign(request.baseline![form.phase === "memory" ? "memory" : "understanding"], { correct, total: n, score: correct / n });
    if (keep) activity.responses = activity.responses.filter(q => keep.includes(q.questionId));
  }
  request.methodMatch.methods.forEach(m => { m.firstScore = request.methodLab.experiments.find(l => l.method === m.method)!.score; });
  return request;
}
function recommendation(result: StudyRecommendationResult) {
  expect(result.status).toBe("recommended");
  if (result.status !== "recommended") throw new Error(result.reason);
  return result.recommendation;
}
const fixture = (topic = "1.5", sessionId = "recommendation-session-0001") => economicsEvidenceFixture({ topic, sessionId, methods: ["memory-palace"] });

describe("deterministic owner-scoped Economics study recommendations", () => {
  it("PPC: prioritizes an actual incorrect diagram answer over correct answers and unassessed targets", () => {
    const request = answers(fixture(), undefined, ["ec9708-1.5-lab-1-v1"]), row = accepted(request);
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [row]));
    expect(r.objectiveId).toBe("ec9708-objective-1.5.4");
    expect(r.methodId).toBe("feynman"); expect(r.purpose).toBe("review-recorded-error");
    expect(r.contentSuggestion.contentType).toBe("diagram-interpretation");
    expect(r.evidenceStrength).toBe("limited-recorded-answers");
    expect(r.evidenceReferences[0]).toMatchObject({ evidenceId: row.id, questionId: "ec9708-1.5-lab-1-v1", correct: false, stage: "method-lab", role: "scored" });
    expect(r.action).toContain("spare capacity");
    expect(r.explanation).toContain("does not diagnose a lasting weakness");
  });
  it("Elasticity: distinguishes recall from calculation/application using reviewed mappings", () => {
    const pack = requireEconomicsPack("2.2");
    const definition = pack.lab.find(q => q.coverage.length === 1 && q.coverage[0] === "2.2.4")!;
    const calculation = pack.lab.find(q => q.coverage.length === 1 && q.coverage[0] === "2.2.7")!;
    expect(definition).toBeDefined(); expect(calculation).toBeDefined();
    const recall = recommendation(recommendEconomicsStudy(UID, "2.2", [accepted(answers(fixture("2.2"), [definition.id], [definition.id]))]));
    const calculate = recommendation(recommendEconomicsStudy(UID, "2.2", [accepted(answers(fixture("2.2"), [calculation.id], [calculation.id]))]));
    expect(recall.objectiveId).toBe("ec9708-objective-2.2.4"); expect(recall.contentSuggestion.contentType).toBe("recall");
    expect(["active-recall", "leitner-system"]).toContain(recall.methodId);
    expect(calculate.objectiveId).toBe("ec9708-objective-2.2.7"); expect(calculate.methodId).toBe("divide-steps");
    expect(calculate.contentSuggestion.contentType).toBe("calculation");
    expect(calculate.contentSuggestion.canonicalHow).toEqual(METHOD_POOL.find(m => m.name === "Divide Steps")!.how_to_use);
    expect(calculate.action).toContain("expenditure");
  });
  it("prioritizes genuinely unassessed-in-available-history objectives without claiming no outside study", () => {
    const pack = requireEconomicsPack("2.2");
    const request = answers(economicsEvidenceFixture({ topic: "2.2", mode: "auto", methods: ["memory-palace", "feynman", "active-recall"] }),
      [pack.baselineMemory[1].id, ...[3, 5, 6, 7].map(n => `ec9708-2.2-lab-${n}-v1`)]);
    const r = recommendation(recommendEconomicsStudy(UID, "2.2", [accepted(request)]));
    expect(r.purpose).toBe("cover-unassessed-content"); expect(r.objectiveId).toBe("ec9708-objective-2.2.2");
    expect(r.methodId).toBe("divide-steps"); expect(r.evidenceReferences).toEqual([]);
    expect(r.evidenceStrength).toBe("task-suitability-only"); expect(r.explanation).toContain("not a claim that you have never studied it");
    expect(r.limitations).toContain("outside-study-unknown");
  });
  it.each(economicsPacks.map(p => p.topicId))("supports no-history whole-topic %s safely with task-based instructions", topic => {
    const r = recommendation(recommendEconomicsStudy(UID, topic, []));
    expect(r.topicId).toBe(topic); expect(r.purpose).toBe("cover-unassessed-content");
    expect(r.evidenceStrength).toBe("task-suitability-only"); expect(r.evidenceReferences).toEqual([]);
    expect(supportedEconomicsMethods()).toContain(r.methodId);
    expect(["interleaving", "derive-basics", "doodle-effect", "eighty-twenty-rule", "two-x-video-speed", "calm-start", "sleep-after-studying"]).not.toContain(r.methodId);
    const form = resolveEconomicsAssessment(r.contentSuggestion.contentSetId);
    expect(form.scored.some(q => q.id === r.contentSuggestion.questionId && q.coverage.some(id => `ec9708-objective-${id}` === r.objectiveId))).toBe(true);
    expect(r.contentSuggestion.status).toBe("planned-suggestion-not-session-allocation-or-observed-evidence");
  });
  it("suggests a future check when all objectives have recorded correct answers, without a mastery or best-method claim", () => {
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(fixture())]));
    expect(r.purpose).toBe("future-retention-check"); expect(r.action).toContain("At a later study session");
    expect(r.explanation).toContain("do not establish topic mastery");
    expect(r.methodBasis).toBe("reviewed-task-suitability-not-personal-effectiveness");
    expect(r.limitations).toContain("no-learning-gain-or-causal-method-claim");
  });
  it("keeps sequential Memory Palace → Feynman carryover explicit, without treating a higher score as a method winner", () => {
    const request = answers(economicsEvidenceFixture(), undefined, ["ec9708-1.5-lab-1-v1"]);
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(request)]));
    expect(r.limitations).toContain("prior-method-and-objective-exposure-carryover");
    expect(r.evidenceReferences.some(ref => ref.methodId === "feynman" && ref.priorMethodsInSession.includes("memory-palace"))).toBe(true);
    expect(r.methodBasis).toBe("reviewed-task-suitability-not-personal-effectiveness");
    expect(r.explanation).toContain("not a proven better method");
  });
  it("duplicate sources and repeat attempts on the same question do not inflate evidence strength", () => {
    const request = answers(fixture(), ["ec9708-1.5-lab-1-v1"], ["ec9708-1.5-lab-1-v1"]), first = accepted(request);
    expect(recommendEconomicsStudy(UID, "1.5", [first, first])).toEqual(recommendEconomicsStudy(UID, "1.5", [first]));
    const second = structuredClone(request); second.sessionId = "recommendation-session-0002";
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [first, accepted(second)]));
    expect(r.evidenceStrength).toBe("limited-recorded-answers");
    expect(r.limitations).toContain("repeated-questions-not-independent-corroboration");
    expect(r.evidenceReferenceCount).toBe(2);
  });
  it("distinguishes errors on different reviewed questions without claiming independence or method causality", () => {
    const request = answers(fixture(), undefined, ["ec9708-1.5-lab-2-v1", "ec9708-1.5-lab-5-v1"]);
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(request)]));
    expect(r.objectiveId).toBe("ec9708-objective-1.5.2"); expect(r.evidenceStrength).toBe("repeated-recorded-errors");
    expect(r.limitations).toContain("no-learning-gain-or-causal-method-claim");
    expect(r.explanation).toContain("2 distinct questions");
  });
  it("does not diagnose an individual objective from an incorrect joint-objective calculation", () => {
    const request = answers(fixture("2.2"), ["ec9708-2.2-lab-1-v1"], ["ec9708-2.2-lab-1-v1"]);
    const r = recommendation(recommendEconomicsStudy(UID, "2.2", [accepted(request)]));
    expect(r.purpose).toBe("cover-unassessed-content");
    expect(r.limitations).toContain("unlocalized-joint-question-errors-in-history");
    expect(r.explanation).not.toContain("lasting weakness");
  });
  it("retains the actual error reference when long histories require bounded reference output", () => {
    const rows = Array.from({ length: 20 }, (_, i) => accepted(answers(fixture("1.5", `recommendation-history-${String(i).padStart(3, "0")}`), ["ec9708-1.5-lab-1-v1"])));
    rows.push(accepted(answers(fixture("1.5", "recommendation-history-zzz"), ["ec9708-1.5-lab-1-v1"], ["ec9708-1.5-lab-1-v1"])));
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", rows));
    expect(r.evidenceReferenceCount).toBe(21); expect(r.evidenceReferences).toHaveLength(16); expect(r.referencesTruncated).toBe(true);
    expect(r.evidenceReferences[0]).toMatchObject({ sessionId: "recommendation-history-zzz", correct: false });
    expect(r.evidenceStrength).toBe("limited-recorded-answers");
  });
  it("later nonoverlapping reported correct responses end the immediate error prompt without inferring gain; ties do not", () => {
    const first = accepted(answers(fixture(), ["ec9708-1.5-lab-1-v1"], ["ec9708-1.5-lab-1-v1"]));
    const laterRequest = answers(fixture("1.5", "recommendation-session-later"), ["ec9708-1.5-lab-1-v1"]);
    laterRequest.economicsResponses!.sessionStartedAt = "2026-11-04T09:00:00.000Z"; laterRequest.completedAt = "2026-11-04T10:00:00.000Z";
    expect(recommendation(recommendEconomicsStudy(UID, "1.5", [first, accepted(laterRequest)])).purpose).toBe("cover-unassessed-content");
    laterRequest.economicsResponses!.sessionStartedAt = "2026-11-03T10:00:00.000Z";
    expect(recommendation(recommendEconomicsStudy(UID, "1.5", [first, accepted(laterRequest)])).purpose).toBe("review-recorded-error");
  });
  it("missing timestamps cannot silently resolve an earlier recorded error", () => {
    const first = accepted(answers(fixture(), ["ec9708-1.5-lab-1-v1"], ["ec9708-1.5-lab-1-v1"]));
    const unknown = answers(fixture("1.5", "unknown-completion-time"), ["ec9708-1.5-lab-1-v1"]);
    unknown.completedAt = null; unknown.economicsResponses!.sessionStartedAt = null;
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(unknown), first]));
    expect(r.purpose).toBe("review-recorded-error"); expect(r.limitations).toContain("completion-order-unknown");
  });
  it("historical v1 native and unlinked legacy records remain unknown instead of acquiring objective or prior-knowledge claims", () => {
    const old = fixture(); delete old.economicsResponses;
    const automatic = economicsEvidenceFixture({ mode: "auto", methods: ["active-recall", "cornell", "feynman"] }); delete automatic.economicsResponses;
    const legacy = adaptLegacyAutomaticAssessment({ ownerUid: UID, assessmentId: "historical-v1", assessment: validateCompletion(UID, automatic, NOW).legacy });
    expect(legacy.valid).toBe(true); if (!legacy.valid) throw new Error(legacy.reason);
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(old), { id: "historical-v1", data: { evidence: legacy.session } }]));
    expect(r.purpose).toBe("cover-unassessed-content"); expect(r.evidenceReferences).toEqual([]);
    expect(r.limitations).toContain("historical-objective-context-unavailable");
  });
  it("does not treat practice/retest answers as scored assessment or turn presentation into learning", () => {
    const request = economicsEvidenceFixture({ methods: ["leitner-system"] });
    request.economicsResponses!.activities.forEach(a => { a.responses = a.responses.filter(r => r.role === "practice"); });
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(request)]));
    expect(r.purpose).toBe("cover-unassessed-content"); expect(r.evidenceStrength).toBe("task-suitability-only");
    expect(r.evidenceReferences.every(ref => ref.role !== "scored")).toBe(true);
    expect(r.limitations).toContain("practice-and-retest-not-scored-assessment");
  });
  it("reported material presentation alone creates neither an assessment nor a method-effectiveness claim", () => {
    const request = answers(fixture(), []);
    request.materialPresentations = { schemaVersion: 1, kind: "client-rendered", records: [{ materialId: "ec9708-objective-1.5.1:note",
      materialVersion: "2026-v2-pilot-1", mappingVersion: "ec9708-objectives-1", objectiveIds: ["ec9708-objective-1.5.1"],
      contentSetId: request.economicsResponses!.activities[0].contentSetId, methodId: "memory-palace", phase: "lab", presentedAt: "2026-11-03T09:30:00.000Z" }] };
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(request)]));
    expect(r.purpose).toBe("cover-unassessed-content"); expect(r.evidenceStrength).toBe("task-suitability-only");
    expect(r.evidenceReferences).toEqual([]); expect(r.limitations).toContain("presentation-is-exposure-only");
  });
  it("keeps post-study Baseline and selected Verification provenance visible", () => {
    const auto = economicsEvidenceFixture({ mode: "auto", methods: ["active-recall", "cornell", "feynman"] });
    const r = recommendation(recommendEconomicsStudy(UID, "1.5", [accepted(auto)]));
    expect(r.limitations).toContain("baseline-is-post-study");
    expect(r.limitations).toContain("verification-is-top-two-selected");
    expect(r.evidenceReferences.some(a => a.stage === "baseline-post-study")).toBe(true);
  });
  it("rejects wrong owners, pending records, malformed or substituted evidence without exposing private data", () => {
    const row = accepted(fixture());
    for (const rows of [[accepted(fixture(), "other-student")], [{ id: "broken", data: null }],
      [{ id: "pending", data: { evidence: (row.data as { evidence: unknown }).evidence } }]]) {
      const result = recommendEconomicsStudy(UID, "1.5", rows);
      expect(result).toMatchObject({ status: "insufficient-evidence", reason: "invalid-owner-or-evidence" });
      expect(JSON.stringify(result)).not.toContain("reflection"); expect(JSON.stringify(result)).not.toContain("other-student");
    }
    expect(recommendEconomicsStudy("", "1.5", [])).toMatchObject({ status: "insufficient-evidence" });
    expect(recommendEconomicsStudy(UID, "3.1", [])).toMatchObject({ status: "insufficient-evidence", reason: "unsupported-topic" });
  });
  it("fails closed for conflicting duplicate source IDs, changed objective membership and unsupported activities", () => {
    const original = accepted(fixture());
    const alteredId = { ...structuredClone(original), id: "substituted-source-id" };
    const data = alteredId.data as { receipt: { evidenceId: string } };
    data.receipt.evidenceId = alteredId.id;
    expect(recommendEconomicsStudy(UID, "1.5", [original, alteredId])).toMatchObject({ status: "insufficient-evidence" });
    type Sidecar = { activities: { contentSetId: string; answers: { objectiveIds: string[] }[] }[] };
    const mutations: ((r: Sidecar) => void)[] = [
      r => { r.activities[0].answers[0].objectiveIds = ["ec9708-objective-2.2.1"]; },
      r => { r.activities[0].contentSetId = r.activities[0].contentSetId.replace("memory-palace", "derive-basics"); }
    ];
    for (const mutate of mutations) {
      const altered = structuredClone(original);
      mutate((altered.data as { objectiveEvidence: Parameters<typeof mutate>[0] }).objectiveEvidence);
      expect(recommendEconomicsStudy(UID, "1.5", [altered])).toMatchObject({ status: "insufficient-evidence", reason: "invalid-owner-or-evidence" });
    }
  });
  it("never treats evidence from another selected topic as this topic's results", () => {
    const r = recommendation(recommendEconomicsStudy(UID, "2.2", [accepted(fixture("1.5"))]));
    expect(r.purpose).toBe("cover-unassessed-content"); expect(r.evidenceReferences).toEqual([]);
  });
  it("is deterministic under source ordering, copies outputs, and never modifies records or core contracts", () => {
    const a = accepted(fixture()), b = accepted(fixture("2.2", "other-topic-session")), original = structuredClone([a, b]);
    const before = recommendEconomicsStudy(UID, "1.5", [a, b]);
    expect(recommendEconomicsStudy(UID, "1.5", [b, a])).toEqual(before); expect([a, b]).toEqual(original);
    const r = recommendation(before); expect(r.contentSuggestion.canonicalHow.length).toBeGreaterThan(0);
    expect(Object.keys(before)).not.toContain("profileRevision");
    expect(mapTopicLearningContent(requireEconomicsPack("1.5")).objectives.some(o => o.id === r.objectiveId)).toBe(true);
    Object.assign(r.contentSuggestion.canonicalHow, { 0: "Changed output copy" });
    expect(recommendation(recommendEconomicsStudy(UID, "1.5", [a, b])).contentSuggestion.canonicalHow[0]).not.toBe("Changed output copy");
    expect([a, b]).toEqual(original);
  });
});
