import { economicsEvidenceFixture } from "./economicsEvidenceFixtures";
import { digest, validateCompletion } from "../backend/trainingCompletionContract";
import { buildAcceptedProfilePreview } from "../src/services/acceptedProfilePreview";
import { strategyEvidenceSnapshot } from "../src/services/cumulativeProfileReader";
import type { CumulativeProfileSnapshot } from "../src/services/cumulativeProfileReader";
import type { ProfileRow } from "../src/quiz/cumulativeProfileView";

/** Local synthetic tests only. Goes through the actual canonical validator and
 * existing reader projections; never authenticates a caller or writes data. */
export function economicsStrategyFixture(uid = "strategy-student-a", topic = "1.5", objectiveDetails = true) {
  const request = economicsEvidenceFixture({ topic, methods: ["memory-palace"] });
  const lab = request.economicsResponses!.activities[0];
  const wrong = lab.responses[topic === "1.5" ? 0 : 3];
  wrong.answerOptionId = `${wrong.questionId}:option-1`;
  Object.assign(request.methodLab.experiments[0], { correct: 4, total: 5, score: .8 });
  request.methodMatch.methods[0].firstScore = .8;
  if (!objectiveDetails) delete request.economicsResponses;
  const v = validateCompletion(uid, request, "2026-11-05T10:00:00.000Z"), id = `session-${digest(request.sessionId)}`;
  const row: ProfileRow = { id, data: { schemaVersion: 1, evidence: v.evidence, requestHash: v.requestHash,
    ...(v.objectiveEvidence ? { objectiveEvidence: v.objectiveEvidence } : {}),
    completionDetails: { schemaVersion: 1, methodIntroduction: request.methodIntroduction,
      reflection: { ...request.reflection, reflectionText: "PRIVATE SYNTHETIC REFLECTION" } },
    receipt: { schemaVersion: 2, status: "accepted", sessionId: request.sessionId, mode: "manual", evidenceId: id, requestHash: v.requestHash,
      lifecycleEpoch: 1, acceptedRevision: 1, recordedAt: "2026-11-05T10:00:00.000Z", legacyAssessmentId: null, legacyProfileUpdated: false } } };
  const view = buildAcceptedProfilePreview(uid, [row], []);
  const snapshot: CumulativeProfileSnapshot = { ...view, pending: [], browserStorageVerified: true,
    strategyEvidence: strategyEvidenceSnapshot(uid, view, [row], "accepted-history") };
  return { row, request, snapshot };
}
