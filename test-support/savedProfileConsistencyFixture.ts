import { completionDraftFixture } from "./completionDraftFixture";
import { completionFromDraft } from "../src/services/trainingCompletion";
import { canonicalCompletionJSON } from "../src/services/trainingCompletionOutbox";
import { adaptLegacyAutomaticAssessment } from "../src/quiz/legacyAssessmentEvidence";
import type { ManualTrainingRecord, ManualHistoryPage } from "../src/services/manualTrainingHistory";

/** Same persisted source fixtures for model, actual route, and Emulator assertions. */
export function savedProfileConsistencyFixture(uid = "consistency-student") {
  const automatic = completionDraftFixture("auto", 4, "saved-test-me-four-methods");
  automatic.owner = { kind: "user", uid };
  const assessmentDocument = { status: "completed", ...automatic.completed, completedAt: "2026-10-19T09:00:00.000Z", createdAt: "2026-10-19T10:00:00.000Z" };
  const adapted = adaptLegacyAutomaticAssessment({ ownerUid: uid, assessmentId: automatic.sessionId, assessment: assessmentDocument });
  if (!adapted.valid) throw new Error("Invalid consistency assessment fixture");
  const records = [0.25, 1].map((value, i): ManualTrainingRecord => {
    const draft = completionDraftFixture("manual", 1, `saved-active-recall-practice-${i + 1}`);
    draft.owner = { kind: "user", uid };
    draft.completed.methodLab!.experiments[0].score = value;
    draft.completed.methodLab!.experiments[0].correct = value * 4;
    draft.completed.methodMatch!.methods[0].firstScore = value;
    draft.completed.methodMatch!.methods[0].verificationScore = i === 0 ? 0.5 : 0.75;
    draft.completed.reflection!.reflectionText = `PRIVATE ${uid} practice ${i + 1}`;
    const completedAt = `2026-10-${20 + i}T09:00:00.000Z`;
    return { schemaVersion: 1, kind: "legacy-manual", sessionId: draft.sessionId, completedAt,
      payloadJSON: canonicalCompletionJSON(completionFromDraft(draft, completedAt)) };
  });
  const page: ManualHistoryPage = { records, assessments: [{ id: automatic.sessionId, evidence: adapted.session, reflection: null }],
    cursor: null, assessmentCursor: null, more: false, manualMore: false, assessmentMore: false };
  return { automatic, assessmentDocument, records, page, profile: automatic.completed.learningProfile! };
}
