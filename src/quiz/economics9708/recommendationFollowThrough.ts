import { canonicalEvidence, normalizeEvidenceTimestamp } from "../learningEvidence";
import type { CompletedSessionEvidence } from "../learningEvidence";
import { buildEconomicsObjectiveHistory } from "./objectiveHistory";
import { recommendEconomicsStudy } from "./studyRecommendations";
import type { AcceptedObjectiveSource, StudyRecommendation, StudyRecommendationResult } from "./studyRecommendations";

export type AcceptanceHead = { readonly revision: number; readonly lifecycleEpoch: number | null;
  readonly basis: "visible-v2-receipts" | "server-journal-head" };
export type RecommendationObservation = Readonly<{ ownerUid: string; topicId: string; displayedAt: string;
  recommendation: StudyRecommendation; authority: "browser-session-observation"; persistence: "memory-only" }>;
type Native = { id: string; signature: string; revision: number | null; epoch: number | null; startedAt: string | null;
  completedAt: string | null; topicId: string | null; contentVersion: string | null; mappingVersion: string | null; activityVersion: string | null };
type Snapshot = { natives: Map<string, Native>; history: ReturnType<typeof buildEconomicsObjectiveHistory>; questions: Set<string> };
const baselines = new WeakMap<RecommendationObservation, { snapshot: Pick<Snapshot, "natives" | "questions">; head?: AcceptanceHead }>();
export type FollowThroughActivity = { sessionId: string; methodId: string | null; stage: string; sequence: number;
  methodMatches: boolean; targetAssessed: boolean; scoredAnswers: number; targetQuestionCorrect: number; targetQuestionIncorrect: number;
  priorMethods: readonly string[]; familiarQuestions: boolean; association: "reported-sequence-consistent" | "not-established" };
export type FollowThroughReport = {
  status: "evaluated" | "unavailable" | "source-conflict";
  updatedRecommendation: StudyRecommendationResult;
  evidenceChange: "none" | "newly-visible-accepted-records" | "unknown";
  newlyVisibleRecords: number; acceptedAfterSnapshot: number; previouslyAcceptedNowVisible: number; acceptanceOrderUnknown: number;
  methodAttempt: "reported" | "not-observed"; targetAssessment: "recorded" | "not-observed";
  newPerformance: "recorded" | "not-observed"; matchingActivity: "reported-sequence-consistent" | "not-established";
  otherMethodsObserved: boolean; otherObjectivesObserved: boolean; otherTopicsObserved: boolean;
  activities: readonly FollowThroughActivity[]; activityCount: number; activitiesTruncated: boolean;
  demonstratedImprovement: "not-established"; causalMethodEffectiveness: "not-established"; recommendationIntent: "unknown";
  outsideStudy: "unknown"; limitations: readonly string[];
};
function snapshot(uid: string, rows: readonly AcceptedObjectiveSource[]): Snapshot {
  const history = buildEconomicsObjectiveHistory(uid, rows), natives = new Map<string, Native>();
  for (const row of rows) {
    const data = row.data as { evidence: CompletedSessionEvidence; requestHash: string; receipt: Record<string, unknown>;
      objectiveEvidence?: { sessionStartedAt: string | null; topicId: string; contentVersion: string; mappingVersion: string; activityVersion: string } };
    if (data.evidence.provenance.kind !== "native") continue;
    const v2 = data.receipt.schemaVersion === 2;
    if (v2 && (!Number.isSafeInteger(data.receipt.acceptedRevision) || Number(data.receipt.acceptedRevision) < 1 ||
      !Number.isSafeInteger(data.receipt.lifecycleEpoch) || Number(data.receipt.lifecycleEpoch) < 1)) throw new Error("Invalid acceptance sequence.");
    const native = { id: row.id, signature: canonicalEvidence([row.id, data.requestHash, data.receipt, data.evidence, data.objectiveEvidence ?? null,
      (row.data as Record<string, unknown>).materialPresentations ?? null]),
      revision: v2 ? Number(data.receipt.acceptedRevision) : null, epoch: v2 ? Number(data.receipt.lifecycleEpoch) : null,
      completedAt: normalizeEvidenceTimestamp(data.evidence.completedAt),
      startedAt: data.objectiveEvidence?.sessionStartedAt ?? null, topicId: data.objectiveEvidence?.topicId ?? null,
      contentVersion: data.objectiveEvidence?.contentVersion ?? null, mappingVersion: data.objectiveEvidence?.mappingVersion ?? null,
      activityVersion: data.objectiveEvidence?.activityVersion ?? null };
    const old = natives.get(data.evidence.sessionId);
    if (old && old.signature !== native.signature) throw new Error("Conflicting source identity.");
    natives.set(data.evidence.sessionId, native);
  }
  if (new Set([...natives.values()].flatMap(n => n.epoch === null ? [] : [n.epoch])).size > 1) throw new Error("Mixed lifecycle epochs.");
  return { natives, history, questions: new Set(history.activities.flatMap(a => a.answers.map(q => q.questionId))) };
}
function checkedHead(s: Snapshot, head?: AcceptanceHead): AcceptanceHead | undefined {
  if (!head) return undefined;
  if (!Number.isSafeInteger(head.revision) || head.revision < 0 || !["visible-v2-receipts", "server-journal-head"].includes(head.basis) ||
    head.lifecycleEpoch !== null && (!Number.isSafeInteger(head.lifecycleEpoch) || head.lifecycleEpoch < 1)) throw new Error("Invalid acceptance cutoff.");
  for (const n of s.natives.values()) if (n.revision === null || n.revision > head.revision || n.epoch !== head.lifecycleEpoch) throw new Error("Acceptance cutoff conflict.");
  return { ...head };
}
function frozen<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) frozen(child); Object.freeze(value); }
  return value;
}

/** A local render observation, NOT a server receipt, durable intent or proof
 * the student read the suggestion. Cannot be restored from fabricated JSON. */
export function observeStudyRecommendation(uid: string, topicId: string, rows: readonly AcceptedObjectiveSource[], displayedAt: string, head?: AcceptanceHead): RecommendationObservation | null {
  const result = recommendEconomicsStudy(uid, topicId, rows);
  if (result.status !== "recommended") return null;
  try {
    if (typeof displayedAt !== "string" || normalizeEvidenceTimestamp(displayedAt) !== displayedAt) return null;
    const s = snapshot(uid, rows), cutoff = checkedHead(s, head);
    const observation = frozen({ ownerUid: uid, topicId, displayedAt, recommendation: structuredClone(result.recommendation),
      authority: "browser-session-observation" as const, persistence: "memory-only" as const });
    baselines.set(observation, { snapshot: { natives: s.natives, questions: s.questions }, head: cutoff }); return observation;
  } catch { return null; }
}

/** Reuses the unchanged policy on latest trusted rows, irrespective of whether
 * a local suggestion can be associated with a later activity. Never pools task
 * scores or treats acceptance order as session chronology. */
export function reassessStudyRecommendation(uid: string, observation: RecommendationObservation, rows: readonly AcceptedObjectiveSource[], head?: AcceptanceHead): FollowThroughReport {
  const updatedRecommendation = recommendEconomicsStudy(uid, observation.topicId, rows);
  const result: FollowThroughReport = { status: "unavailable", updatedRecommendation, evidenceChange: "unknown", newlyVisibleRecords: 0,
    acceptedAfterSnapshot: 0, previouslyAcceptedNowVisible: 0, acceptanceOrderUnknown: 0, methodAttempt: "not-observed", targetAssessment: "not-observed",
    newPerformance: "not-observed", matchingActivity: "not-established", otherMethodsObserved: false, otherObjectivesObserved: false, otherTopicsObserved: false,
    activities: [], activityCount: 0, activitiesTruncated: false, demonstratedImprovement: "not-established", causalMethodEffectiveness: "not-established",
    recommendationIntent: "unknown", outsideStudy: "unknown", limitations: ["local-observation-not-a-durable-receipt", "client-reported-session-timing-and-answers",
      "new-to-snapshot-does-not-prove-started-after-display", "outside-study-unknown", "no-comparable-gain-or-causal-method-conclusion"] };
  const baseline = baselines.get(observation);
  if (!baseline || observation.ownerUid !== uid || updatedRecommendation.status === "insufficient-evidence" && updatedRecommendation.reason === "invalid-owner-or-evidence") return result;
  try {
    const latest = snapshot(uid, rows), cutoff = checkedHead(latest, head), before = observation.recommendation;
    for (const [session, old] of baseline.snapshot.natives) if (latest.natives.get(session)?.signature !== old.signature) return { ...result, status: "source-conflict" };
    if (baseline.head && cutoff && (cutoff.revision < baseline.head.revision || baseline.head.lifecycleEpoch !== null && cutoff.lifecycleEpoch !== baseline.head.lifecycleEpoch)) return { ...result, status: "source-conflict" };
    const added = new Map([...latest.natives].filter(([session]) => !baseline.snapshot.natives.has(session)));
    const localClockConsistent = [...baseline.snapshot.natives.values()].every(n => n.completedAt === null || n.completedAt <= observation.displayedAt);
    if (!localClockConsistent) result.limitations = [...result.limitations, "local-display-time-inconsistent-with-known-completion"];
    const after = new Set<string>();
    for (const [session, n] of added) {
      if (baseline.head && n.revision !== null && (baseline.head.lifecycleEpoch === null && baseline.snapshot.natives.size === 0 || n.epoch === baseline.head.lifecycleEpoch)) {
        if (n.revision > baseline.head.revision) { after.add(session); result.acceptedAfterSnapshot++; } else result.previouslyAcceptedNowVisible++;
      } else result.acceptanceOrderUnknown++;
      if (n.topicId !== null && n.topicId !== observation.topicId) result.otherTopicsObserved = true;
      if (n.startedAt !== null && n.startedAt <= observation.displayedAt) result.limitations = [...result.limitations, "session-not-reported-after-local-display"];
    }
    const occurrences = new Map<string, number>();
    for (const a of latest.history.activities) for (const q of a.answers) occurrences.set(q.questionId, (occurrences.get(q.questionId) ?? 0) + 1);
    const activities: FollowThroughActivity[] = [];
    for (const a of latest.history.activities) {
      const n = added.get(a.sessionId);
      if (!n || n.topicId !== observation.topicId) continue;
      const scored = a.answers.filter(q => q.role === "scored"), target = scored.filter(q => q.objectiveIds.includes(before.objectiveId));
      const methodMatches = a.methodId === before.methodId, targetAssessed = target.length > 0;
      const versionMatches = n.contentVersion === before.contentSuggestion.contentVersion && n.mappingVersion === before.contentSuggestion.mappingVersion && n.activityVersion === before.contentSuggestion.activityVersion;
      const sequenceConsistent = localClockConsistent && after.has(a.sessionId) && versionMatches && n.startedAt !== null && n.startedAt > observation.displayedAt;
      if (methodMatches) result.methodAttempt = "reported";
      if (targetAssessed) result.targetAssessment = "recorded";
      if (scored.length) result.newPerformance = "recorded";
      if (a.methodId !== null && !methodMatches) result.otherMethodsObserved = true;
      if (scored.some(q => !q.objectiveIds.includes(before.objectiveId))) result.otherObjectivesObserved = true;
      const association = methodMatches && targetAssessed && sequenceConsistent ? "reported-sequence-consistent" as const : "not-established" as const;
      if (association === "reported-sequence-consistent") result.matchingActivity = association;
      const familiar = target.some(q => baseline.snapshot.questions.has(q.questionId) || (occurrences.get(q.questionId) ?? 0) > 1);
      if (familiar) result.limitations = [...result.limitations, "familiar-questions-not-independent-improvement"];
      if (a.priorMethodsInSession.length || a.priorByObjective.some(p => p.earlierWithinSessionActivities || p.otherKnownSessionCount)) result.limitations = [...result.limitations, "prior-method-and-objective-carryover"];
      if (target.some(q => q.objectiveIds.length > 1)) result.limitations = [...result.limitations, "joint-question-performance-not-an-objective-score"];
      activities.push({ sessionId: a.sessionId, methodId: a.methodId, stage: a.stage, sequence: a.sequence, methodMatches, targetAssessed,
        scoredAnswers: scored.length, targetQuestionCorrect: target.filter(q => q.correct).length, targetQuestionIncorrect: target.filter(q => !q.correct).length,
        priorMethods: [...a.priorMethodsInSession], familiarQuestions: familiar, association });
    }
    activities.sort((a, b) => { const priority = Number(b.association === "reported-sequence-consistent") - Number(a.association === "reported-sequence-consistent");
      const left = canonicalEvidence([a.sessionId, a.sequence]), right = canonicalEvidence([b.sessionId, b.sequence]); return priority || (left < right ? -1 : left > right ? 1 : 0); });
    if ([...added.values()].some(n => n.startedAt === null)) result.limitations = [...result.limitations, "missing-objective-context-or-session-start"];
    return { ...result, status: "evaluated", evidenceChange: added.size ? "newly-visible-accepted-records" : "none", newlyVisibleRecords: added.size,
      activities: activities.slice(0, 16), activityCount: activities.length, activitiesTruncated: activities.length > 16, limitations: [...new Set(result.limitations)] };
  } catch { return result; }
}
