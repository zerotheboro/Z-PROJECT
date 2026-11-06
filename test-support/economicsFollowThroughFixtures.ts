import { economicsEvidenceFixture } from "./economicsEvidenceFixtures";
import { digest, validateCompletion } from "../backend/trainingCompletionContract";
import { resolveEconomicsAssessment } from "../src/quiz/economics9708/assessmentEvidence";
import type { TrainingMethodId } from "../src/quiz/type";
import type { ProfileRow } from "../src/quiz/cumulativeProfileView";
import { buildAcceptedProfilePreview } from "../src/services/acceptedProfilePreview";
import { strategyEvidenceSnapshot } from "../src/services/cumulativeProfileReader";
import type { CumulativeProfileSnapshot } from "../src/services/cumulativeProfileReader";

export const FOLLOW_UID = "strategy-student-a", FOLLOW_DISPLAY = "2026-11-03T12:00:00.000Z";
export function followRecord({ topic = "1.5", methods = ["memory-palace"], sessionId = "follow-before-0001", revision = 1,
  start = "2026-11-03T09:00:00.000Z", end = "2026-11-03T10:00:00.000Z", wrong = [] as string[], details = true,
  keep = (_q: { questionId: string; methodId: string | null; objectiveIds: readonly string[] }) => true, v1 = false, uid = FOLLOW_UID }: {
    topic?: string; methods?: TrainingMethodId[]; sessionId?: string; revision?: number; start?: string | null; end?: string | null;
    wrong?: string[]; details?: boolean; keep?: (q: { questionId: string; methodId: string | null; objectiveIds: readonly string[] }) => boolean; v1?: boolean; uid?: string;
  } = {}): ProfileRow {
  const request = economicsEvidenceFixture({ topic, methods, sessionId });
  request.completedAt = end; request.economicsResponses!.sessionStartedAt = start;
  for (const a of request.economicsResponses!.activities) {
    const form = resolveEconomicsAssessment(a.contentSetId);
    a.responses.forEach(r => { if (wrong.includes(r.questionId)) r.answerOptionId = `${r.questionId}:option-1`; });
    const correct = form.scored.length - form.scored.filter(q => wrong.includes(q.id)).length;
    if (form.phase === "lab") Object.assign(request.methodLab.experiments.find(m => m.method === form.methodId)!, { correct, total: form.scored.length, score: correct / form.scored.length });
    if (form.phase === "match") request.methodMatch.methods.find(m => m.method === form.methodId)!.verificationScore = correct / form.scored.length;
    a.responses = a.responses.filter(r => { const q = [...form.scored, ...form.practice].find(q => q.id === r.questionId)!;
      return keep({ questionId: r.questionId, methodId: form.methodId, objectiveIds: q.coverage.map(id => `ec9708-objective-${id}`) }); });
  }
  request.methodMatch.methods.forEach(m => { m.firstScore = request.methodLab.experiments.find(l => l.method === m.method)!.score; });
  if (!details) delete request.economicsResponses;
  const value = validateCompletion(uid, request, "2026-11-05T10:00:00.000Z"), id = `session-${digest(sessionId)}`;
  const receipt = v1 ? { schemaVersion: 1, status: "completed", sessionId, mode: "manual", evidenceId: id, requestHash: value.requestHash,
    profileRevision: 999, recordedAt: "2026-11-05T10:00:00.000Z", legacyAssessmentId: null, legacyProfileUpdated: false }
    : { schemaVersion: 2, status: "accepted", sessionId, mode: "manual", evidenceId: id, requestHash: value.requestHash,
      lifecycleEpoch: 1, acceptedRevision: revision, recordedAt: "2026-11-05T10:00:00.000Z", legacyAssessmentId: null, legacyProfileUpdated: false };
  return { id, data: { schemaVersion: 1, evidence: value.evidence, requestHash: value.requestHash, receipt,
    ...(value.objectiveEvidence ? { objectiveEvidence: value.objectiveEvidence } : {}) } };
}
export const laterFollowRecord = (options: Parameters<typeof followRecord>[0] = {}) => followRecord({ sessionId: "follow-after-0002", revision: 3,
  methods: ["feynman"], start: "2026-11-04T09:00:00.000Z", end: "2026-11-04T10:00:00.000Z", ...options });
export function followProfile(rows: ProfileRow[], serverHead?: number): CumulativeProfileSnapshot {
  const view = buildAcceptedProfilePreview(FOLLOW_UID, rows, []);
  return { ...view, pending: [], browserStorageVerified: true,
    strategyEvidence: strategyEvidenceSnapshot(FOLLOW_UID, view, rows, serverHead === undefined ? "accepted-history" : "published-generation", 0, serverHead) };
}
