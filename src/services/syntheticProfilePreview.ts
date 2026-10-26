import { createCompletedSessionEvidence } from "../quiz/learningEvidence";
import type { ObservationMetadata } from "../quiz/learningEvidence";
import type { MethodId } from "../quiz/type";
import type { ProfileRow } from "../quiz/cumulativeProfileView";
import { buildAcceptedProfilePreview } from "./acceptedProfilePreview";
import type { CumulativeProfileSnapshot } from "./cumulativeProfileReader";

export type SyntheticStudent = "student-a" | "student-b" | "empty" | "malformed";

/** Explicit UI fixtures only. Not imported by Training or any backend writer;
 * not saved to Firebase, localStorage or the completion outbox. */
export function syntheticAcceptedHistory(student: SyntheticStudent): { uid: string; rows: ProfileRow[] } {
  const uid = `stage4f-synthetic-${student}`;
  const rows: ProfileRow[] = [];
  const length = student === "empty" ? 0 : student === "student-b" ? 1 : 14;
  for (let i = 0; i < length; i++) {
    const mode = i % 4 < 2 ? "auto" : "manual";
    const count = [3, 4, 1, 3][i % 4];
    const methods = (["active-recall", "feynman", "cornell", "interleaving"] as MethodId[]).slice(0, count);
    const date = `2026-10-${String(10 + i).padStart(2, "0")}T10:00:00.000Z`;
    const subject = i < 10 ? "Biology" : "Mathematics", topic = i < 10 ? "Cell transport" : "Probability";
    const correct = 1 + i % 4;
    const metadata: ObservationMetadata[] = methods.flatMap(methodId => (["lab", ...(methods.slice(0, 2).includes(methodId) ? ["match" as const] : [])] as const).map(phase => ({
      methodId, phase, completedAt: date,
      context: { subject, topic, exerciseTopic: topic, contentSetId: `synthetic-${subject}-${phase}`, contentVersion: "synthetic-1" },
      protocol: { assessmentVersion: "synthetic-demo-v1", scoringVersion: "mcq-accuracy-v1",
        questions: Array.from({ length: 4 }, (_, n) => ({ questionId: `q${n}`, difficulty: "medium" as const,
          offeredOptionCount: 3, offeredOptionIds: ["a", "b", "c"] })) },
      ...(phase === "match" ? { matchCounts: { correct, total: 4 } } : {})
    })));
    const evidence = createCompletedSessionEvidence({ sessionId: `${uid}-session-${i}`, owner: { kind: "user", uid }, mode,
      completedAt: date, recordedAt: date, metadata,
      methodLab: { experiments: methods.map(method => ({ method, score: correct / 4, correct, total: 4,
        confidence: 4, ease: 3, willingnessToUse: 5, timeSpentMs: 1000 })) },
      methodMatch: { methods: methods.slice(0, 2).map(method => ({ method, verificationScore: correct / 4, confidence: 4, timeSpentMs: 500 })) },
      selectionContext: { kind: mode === "manual" ? "manual" : count === 3 ? "ai-confirmed" : "traditional",
        nominatedMethodIds: mode === "auto" && count === 3 ? ["active-recall"] : [] } });
    const id = `session-${i.toString(16).padStart(64, "0")}`, requestHash = "d".repeat(64);
    rows.push({ id, data: { schemaVersion: 1, requestHash, evidence,
      receipt: { schemaVersion: 2, status: "accepted", sessionId: evidence.sessionId, mode, evidenceId: id, requestHash,
        lifecycleEpoch: 1, acceptedRevision: 1 + i * 3, recordedAt: date, legacyAssessmentId: mode === "auto" ? evidence.sessionId : null,
        legacyProfileUpdated: mode === "auto" },
      completionDetails: { schemaVersion: 1, methodIntroduction: { correct: 1, total: 1, score: 1 },
        reflection: { reflectionText: "Synthetic private reflection for " + student + ".\n" + "This is a demonstration reflection, not a real student's work. ".repeat(8), surprisedByResults: true } }
    } });
  }
  if (student === "malformed") rows.push({ id: "unreadable-demo-record", data: { schemaVersion: 999 } });
  return { uid, rows };
}

export function syntheticProfileSnapshot(student: SyntheticStudent): CumulativeProfileSnapshot {
  const { uid, rows } = syntheticAcceptedHistory(student);
  const view = buildAcceptedProfilePreview(uid, rows, []);
  return { ...view, preview: { ...view.preview, source: "synthetic-fixture" }, pending: [], browserStorageVerified: false };
}
