import type { LearningProfile, MethodEvidence, MethodId } from "./type";
import type { TrainingDraft } from "./trainingProgress";
import { assertCompletedSessionEvidence, canonicalEvidence, isEvidenceMethodId } from "./learningEvidence";
import { readManualTrainingRecord } from "../services/manualTrainingHistory";
import type { ManualTrainingRecord, LegacyAssessmentRecord } from "../services/manualTrainingHistory";

export type SavedProfileInput = {
  uid: string; ownerUid?: string | null; records: readonly ManualTrainingRecord[];
  assessments?: readonly LegacyAssessmentRecord[]; loading: boolean; error: string | null; hasMore: boolean;
};
export type SavedProfileHistoryItem = ({ kind: "individual"; record: ManualTrainingRecord; methods: readonly MethodId[]; details: TrainingDraft["completed"] } |
  { kind: "test-me"; record: LegacyAssessmentRecord }) & { key: string; completedAt: string | null };
export type SavedMethodAttempt = {
  key: string; historyKey: string; source: "individual" | "test-me"; methodId: MethodId;
  completedAt: string | null; recordedAt: string | null;
  subject: string | null; topic: string | null;
  lab: { score: number | null; correct: number | null; total: number | null } | null;
  verification: { score: number | null; correct: number | null; total: number | null } | null;
};
export type SavedProfileMethod = {
  methodId: MethodId; latestSnapshot: MethodEvidence | null;
  individual: SavedMethodAttempt[]; assessments: SavedMethodAttempt[];
  individualObservationCount: number; assessmentObservationCount: number;
};
export type SavedLearningProfileView = {
  ownerUid: string | null; latest: LearningProfile | null; history: SavedProfileHistoryItem[]; methods: SavedProfileMethod[];
  coverage: "unavailable" | "loading" | "partial" | "complete"; warnings: string[];
  counts: { individualSessions: number; testMeRecords: number; observations: number; latestSnapshotMethods: number; latestSnapshotVerified: number };
  progress: { excludedIndividualObservations: number; excludedTestMeObservations: number; reason: string };
};

/** Read-only projection of the SAME loaded records for every regular profile section.
 * No scoring, pooling, persistence, authority promotion, or inferred session aliases.
 * The root latest snapshot is a separate projection, never another history event.
 */
export function buildSavedLearningProfileView(ownerUid: string | null, latest: LearningProfile | null,
  input?: SavedProfileInput): SavedLearningProfileView {
  const warnings: string[] = [], history: SavedProfileHistoryItem[] = [];
  const ownerMatches = Boolean(ownerUid && input?.uid === ownerUid && (input.ownerUid === undefined || input.ownerUid === ownerUid));
  if (input && !ownerMatches && (input.records.length || input.assessments?.length)) warnings.push("History from a different or unconfirmed owner was withheld.");
  // Identical duplicate pages count once. Conflicting source identities count
  // neither version, rather than choosing whichever response happened to finish.
  const unique = <T,>(rows: readonly T[], key: (row: T) => string): T[] => {
    const values = new Map<string, { row: T; signature: string } | null>();
    for (const row of rows) {
      const id = key(row), signature = canonicalEvidence(row), prior = values.get(id);
      if (prior === undefined) values.set(id, { row, signature });
      else if (prior && prior.signature !== signature) {
        values.set(id, null); warnings.push("Conflicting saved record identities were withheld; coverage is incomplete.");
      }
    }
    return [...values.values()].flatMap(item => item ? [item.row] : []);
  };
  if (ownerMatches && input && ownerUid) {
    for (const record of unique(input.records, row => row.sessionId)) {
      try {
        const parsed = readManualTrainingRecord(record, ownerUid);
        history.push({ kind: "individual", key: `manual:${record.sessionId}`, record, methods: parsed.draft.selectedMethods, details: parsed.draft.completed, completedAt: record.completedAt });
      } catch { warnings.push("An individual practice record could not be validated; it was not treated as zero."); }
    }
    for (const record of unique(input.assessments ?? [], row => row.id)) {
      try {
        assertCompletedSessionEvidence(record.evidence);
        if (record.evidence.owner.kind !== "user" || record.evidence.owner.uid !== ownerUid || record.evidence.mode !== "auto" ||
          record.evidence.provenance.kind !== "legacy-assessment" || record.evidence.provenance.recordId !== record.id) throw new Error();
        history.push({ kind: "test-me", key: `assessment:${record.id}`, record, completedAt: record.evidence.completedAt });
      } catch { warnings.push("A Test Me source identity or owner could not be validated; the record was withheld."); }
    }
  }
  history.sort((a,b) => a.completedAt === b.completedAt ? a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    : a.completedAt === null ? 1 : b.completedAt === null ? -1 : a.completedAt > b.completedAt ? -1 : 1);
  const methods = new Map<MethodId, SavedProfileMethod>();
  const method = (id: MethodId) => {
    const value = methods.get(id) ?? { methodId: id, latestSnapshot: null, individual: [], assessments: [], individualObservationCount: 0, assessmentObservationCount: 0 };
    methods.set(id, value); return value;
  };
  for (const item of latest?.methodEvidence ?? []) if (isEvidenceMethodId(item.method)) method(item.method).latestSnapshot = item;
  let individualObservations = 0, testMeObservations = 0;
  for (const item of history) {
    if (item.kind === "individual") {
      const { methodLab, methodMatch } = item.details;
      for (const lab of methodLab!.experiments) {
        const followUp = methodMatch!.methods.find(row => row.method === lab.method);
        // Match.firstScore repeats Lab. Only verificationScore is another task.
        method(lab.method).individual.push({ key: `${item.key}:${lab.method}`, historyKey: item.key, source: "individual", methodId: lab.method,
          completedAt: item.completedAt, recordedAt: null, subject: null, topic: null,
          lab: { score: lab.score, correct: lab.correct, total: lab.total },
          verification: followUp ? { score: followUp.verificationScore, correct: null, total: null } : null });
        individualObservations += 1 + (followUp ? 1 : 0);
        method(lab.method).individualObservationCount += 1 + (followUp ? 1 : 0);
      }
    } else {
      const evidence = item.record.evidence;
      const rows = new Map<MethodId, SavedMethodAttempt>();
      for (const observation of evidence.observations) {
        const row = rows.get(observation.methodId) ?? { key: `${item.key}:${observation.methodId}`, historyKey: item.key, source: "test-me" as const,
          methodId: observation.methodId, completedAt: item.completedAt, recordedAt: evidence.recordedAt,
          subject: observation.context.subject, topic: observation.context.topic, lab: null, verification: null };
        const result = { score: observation.performance.score, correct: observation.performance.correct, total: observation.performance.total };
        if (observation.phase === "lab") row.lab = result; else row.verification = result;
        rows.set(observation.methodId, row); testMeObservations++; method(observation.methodId).assessmentObservationCount++;
      }
      for (const row of rows.values()) method(row.methodId).assessments.push(row);
    }
  }
  const snapshot = [...methods.values()].flatMap(m => m.latestSnapshot ? [m.latestSnapshot] : []);
  return { ownerUid, latest, history, methods: [...methods.values()], warnings,
    coverage: !ownerMatches ? "unavailable" : input?.loading ? "loading" : input?.error || input?.hasMore || warnings.length ? "partial" : "complete",
    counts: { individualSessions: history.filter(row => row.kind === "individual").length, testMeRecords: history.filter(row => row.kind === "test-me").length,
      observations: individualObservations + testMeObservations, latestSnapshotMethods: snapshot.length,
      latestSnapshotVerified: snapshot.filter(row => typeof row.verificationScore === "number" && Number.isFinite(row.verificationScore) && row.verificationScore >= 0 && row.verificationScore <= 1).length },
    // These regular legacy reader contracts do not establish actual question
    // conditions, content/scoring versions or exposure history. Scores alone
    // are never enough for a valid trend. The gated cumulative reader retains
    // its existing comparability checks for evidence that DOES supply them.
    progress: { excludedIndividualObservations: individualObservations, excludedTestMeObservations: testMeObservations,
      reason: "The legacy reader does not establish subject/topic, actual question conditions, content and scoring versions, or prior question exposure. These are required for a valid progress comparison." }
  };
}
