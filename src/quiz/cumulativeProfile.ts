import {
  canonicalEvidence as canonical,
  compareEvidenceIds,
  evidenceOwnerKey,
  EvidenceValidationError
} from "./learningEvidence";

import type {
  CompletedSessionEvidence,
  EvidenceOwner,
  EvidenceSource,
  LearningObservation
} from "./learningEvidence";
import type { MethodId } from "./type";
import { normalizeCompletedEvidence } from "./completedEvidenceIdentity";
import { buildExposureIndex, questionIdentities } from "./learningEvidenceExposure";
import type { ObservationExposure } from "./learningEvidenceExposure";
import { materializeCumulativeProfile } from "./cumulativeProfileSummary";
import type { CumulativeLearningProfile } from "./cumulativeProfileSummary";
export type { CumulativeLearningProfile } from "./cumulativeProfileSummary";

export const CUMULATIVE_PROFILE_VERSION = 2 as const;
export const CUMULATIVE_AGGREGATION_VERSION = "exposure-separated-accuracy-v2" as const;

export type EvidenceLimitation =
  | "client-reported-results" | "legacy-record" | "session-independence-unknown"
  | "subject-unknown" | "topic-unknown" | "exercise-topic-unknown"
  | "content-set-unknown" | "content-version-unknown"
  | "assessment-version-unknown" | "scoring-version-unknown"
  | "question-conditions-unknown" | "difficulty-unknown" | "option-count-unknown" | "option-identities-unknown"
  | "score-unknown" | "question-counts-unknown" | "completion-time-unknown"
  | "self-report-incomplete" | "self-selected-methods" | "unpooled-performance"
  | "repeated-content" | "verification-content-reused" | "performance-varies"
  | "prior-history-unknown" | "exposure-unknown" | "question-exposure-unknown" | "repeated-questions"
  | "legacy-timestamp-ambiguous" | "legacy-timestamp-unreadable"
  | "legacy-status-absent" | "legacy-verification-absent";

export type MethodCumulativeEvidence = {
  readonly methodId: MethodId;
  readonly sessionIds: readonly string[];
  readonly independentSessionCount: number;
  readonly unknownIndependenceSessionCount: number;
  readonly observations: readonly (LearningObservation & { readonly exposure: ObservationExposure })[];
  readonly sourceCounts: Readonly<Record<EvidenceSource, number>>;
  readonly verification: {
    readonly observationCount: number;
    readonly scoredObservationCount: number;
    readonly sessionCount: number;
  };
  readonly knownContentSetCount: number;
  readonly knownContentVersionCount: number;
  // One exposure per session/content-version pair, not per duplicated event.
  readonly knownContentExposureCount: number;
  readonly unknownContentObservationCount: number;
  readonly knownQuestionExposureCount: number;
  readonly unknownQuestionObservationCount: number;
  readonly contentExposures: readonly {
    readonly contentSetId: string;
    readonly contentVersion: string;
    readonly sessionIds: readonly string[];
    readonly observationIds: readonly string[];
  }[];
  readonly selfReports: readonly (LearningObservation["selfReport"] & {
    readonly observationId: string;
  })[];
  readonly unpooledObservationIds: readonly string[];
  readonly limitations: readonly EvidenceLimitation[];
  readonly interpretation: {
    readonly kind: "descriptive-only";
    readonly furtherTestingRecommended: true;
    readonly nextAction: "test-on-different-material" | "repeat-under-known-conditions" | "collect-more-independent-evidence";
  };
};

export type ContextualPerformanceGroup = {
  readonly groupId: string;
  readonly source: EvidenceSource;
  readonly phase: LearningObservation["phase"];
  readonly context: LearningObservation["context"];
  readonly protocol: LearningObservation["protocol"];
  readonly exposure: Pick<ObservationExposure, "content" | "questions">;
  readonly interpretation: "descriptive-task-results-not-method-superiority";
  // These are repeated-task descriptive results, not a causal method ranking.
  readonly rankings: readonly {
    readonly methodId: MethodId;
    readonly observationIds: readonly string[];
    readonly sessionCount: number;
    readonly correct: number;
    readonly total: number;
    readonly score: number;
    readonly scoreRange: { readonly minimum: number; readonly maximum: number };
    readonly varies: boolean;
    readonly chronologicalChange: {
      readonly fromScore: number;
      readonly toScore: number;
      readonly difference: number;
    } | null;
  }[];
};

/** Detailed offline rebuild, never a current-profile storage document. */
export type CumulativeEvidenceHistory = {
  readonly schemaVersion: typeof CUMULATIVE_PROFILE_VERSION;
  readonly aggregationVersion: typeof CUMULATIVE_AGGREGATION_VERSION;
  readonly owner: EvidenceOwner;
  readonly sessionCount: number;
  readonly independentSessionCount: number;
  readonly unknownIndependenceSessionCount: number;
  readonly observationCount: number;
  readonly exposures: {
    readonly knownContentExposureCount: number;
    readonly knownQuestionExposureCount: number;
    readonly unknownContentObservationCount: number;
    readonly unknownQuestionObservationCount: number;
    readonly historyCoverage: "unknown";
  };
  readonly methods: readonly MethodCumulativeEvidence[];
  readonly performanceGroups: readonly ContextualPerformanceGroup[];
  readonly preferenceReports: readonly {
    readonly sessionId: string;
    readonly completedAt: string | null;
    readonly preference: NonNullable<CompletedSessionEvidence["preference"]>;
  }[];
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareEvidenceIds);
}

function groupKey(item: LearningObservation): string | null {
  const { context, protocol, performance } = item;
  if (performance.score === null || performance.correct === null || performance.total === null ||
    context.contentSetId === null || context.contentVersion === null ||
    protocol.assessmentVersion === null || protocol.scoringVersion === null ||
    protocol.questions === null || protocol.questions.some(question =>
      question.difficulty === null || question.offeredOptionCount === null || question.offeredOptionIds === null)) return null;
  // Method is deliberately excluded so only an identical actual task and
  // protocol permits a cross-method comparison. Source/phase stay separate.
  return canonical({ source: item.source, phase: item.phase, context,
    protocol: { ...protocol, questions: protocol.questions.map(question => ({ ...question,
      offeredOptionIds: [...question.offeredOptionIds!].sort(compareEvidenceIds)
    })) } });
}

function limitations(
  item: LearningObservation,
  session: CompletedSessionEvidence
): EvidenceLimitation[] {
  const result: EvidenceLimitation[] = ["client-reported-results"];
  if (session.provenance.kind === "legacy-assessment") result.push("legacy-record");
  if (session.originalSessionId === null) result.push("session-independence-unknown");
  if (session.mode === "manual") result.push("self-selected-methods");
  if (item.context.subject === null) result.push("subject-unknown");
  if (item.context.topic === null) result.push("topic-unknown");
  if (item.context.exerciseTopic === null) result.push("exercise-topic-unknown");
  if (item.context.contentSetId === null) result.push("content-set-unknown");
  if (item.context.contentVersion === null) result.push("content-version-unknown");
  if (item.protocol.assessmentVersion === null) result.push("assessment-version-unknown");
  if (item.protocol.scoringVersion === null) result.push("scoring-version-unknown");
  if (item.protocol.questions === null) result.push("question-conditions-unknown");
  if (item.protocol.questions === null || item.protocol.questions.some(q => q.difficulty === null)) {
    result.push("difficulty-unknown");
  }
  if (item.protocol.questions === null || item.protocol.questions.some(q => q.offeredOptionCount === null)) {
    result.push("option-count-unknown");
  }
  if (item.protocol.questions === null || item.protocol.questions.some(q => q.offeredOptionIds === null)) {
    result.push("option-identities-unknown");
  }
  if (item.performance.score === null) result.push("score-unknown");
  if (item.performance.correct === null || item.performance.total === null) result.push("question-counts-unknown");
  if (item.completedAt === null) result.push("completion-time-unknown");
  if (item.selfReport.confidence === null || item.phase === "lab" &&
    (item.selfReport.ease === null || item.selfReport.willingnessToUse === null)) {
    result.push("self-report-incomplete");
  }
  if (item.performance.score !== null && groupKey(item) === null) result.push("unpooled-performance");
  return result;
}

function sumCounts(items: readonly LearningObservation[], key: "correct" | "total"): number {
  const result = items.reduce((sum, item) => sum + item.performance[key]!, 0);
  if (!Number.isSafeInteger(result)) throw new EvidenceValidationError("Aggregated question counts overflow.");
  return result;
}

/**
 * Rebuild from completed records only. No clock, RNG, Firebase, network,
 * selection bonus, legacy evidenceScore, or preference weighting is used.
 * Conflicting immutable identities fail closed instead of choosing an order.
 */
export function rebuildCompletedEvidenceHistory(
  owner: EvidenceOwner,
  evidence: readonly CompletedSessionEvidence[]
): CumulativeEvidenceHistory {
  evidenceOwnerKey(owner);
  const sessions = normalizeCompletedEvidence(owner, evidence);
  const bySession = new Map(sessions.map(session => [session.sessionId, session]));
  const observations = sessions.flatMap(session => session.observations);
  const exposure = buildExposureIndex(sessions);
  const grouped = new Map<string, LearningObservation[]>();
  for (const item of observations) {
    const base = groupKey(item);
    const conditions = exposure.byObservation.get(item.observationId)!;
    const key = base === null ? null : canonical([base, conditions.content, conditions.questions, conditions.questionStates]);
    if (key !== null) grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const performanceGroups: ContextualPerformanceGroup[] = [...grouped]
    .sort(([a], [b]) => compareEvidenceIds(a, b))
    .map(([groupId, items]) => ({
      groupId, source: items[0].source, phase: items[0].phase,
      context: items[0].context, protocol: items[0].protocol,
      exposure: { content: exposure.byObservation.get(items[0].observationId)!.content,
        questions: exposure.byObservation.get(items[0].observationId)!.questions },
      interpretation: "descriptive-task-results-not-method-superiority" as const,
      rankings: uniqueSorted(items.map(item => item.methodId)).map(id => {
        const methodId = id as MethodId;
        const results = items.filter(item => item.methodId === methodId);
        const scores = results.map(item => item.performance.score!);
        const correct = sumCounts(results, "correct");
        const total = sumCounts(results, "total");
        const minimum = scores.reduce((a, b) => Math.min(a, b));
        const maximum = scores.reduce((a, b) => Math.max(a, b));
        const dated = results.map(item => ({ item, date: item.completedAt }));
        dated.sort((a, b) => compareEvidenceIds(a.date ?? "", b.date ?? "") ||
          compareEvidenceIds(a.item.observationId, b.item.observationId));
        const first = dated[0];
        const last = dated[dated.length - 1];
        return {
          methodId, observationIds: results.map(item => item.observationId).sort(compareEvidenceIds),
          sessionCount: new Set(results.map(item => item.sessionId)).size,
          correct, total, score: correct / total,
          scoreRange: { minimum, maximum }, varies: minimum !== maximum,
          chronologicalChange: dated.every(item => item.date !== null) &&
            new Set(dated.map(item => item.date)).size === dated.length && first.date !== last.date
            ? { fromScore: first.item.performance.score!, toScore: last.item.performance.score!,
                difference: last.item.performance.score! - first.item.performance.score! }
            : null
        };
      }).sort((a, b) => compareEvidenceIds(a.methodId, b.methodId))
    }));

  const methods: MethodCumulativeEvidence[] = uniqueSorted(observations.map(item => item.methodId)).map(id => {
    const methodId = id as MethodId;
    const items = observations.filter(item => item.methodId === methodId);
    const sessionIds = uniqueSorted(items.map(item => item.sessionId));
    const relatedSessions = sessionIds.map(sessionId => bySession.get(sessionId)!);
    const exposureMap = new Map<string, LearningObservation[]>();
    const flags = new Set<EvidenceLimitation>(["prior-history-unknown",
      ...items.flatMap(item => limitations(item, bySession.get(item.sessionId)!)),
      ...relatedSessions.flatMap(session => session.limitations ?? [])]);
    for (const item of items) {
      const seen = exposure.byObservation.get(item.observationId)!;
      if (seen.content === "repeated" || exposure.reusedContentObservationIds.has(item.observationId)) flags.add("repeated-content");
      if (seen.content === "unknown") flags.add("exposure-unknown");
      if (seen.questions === "repeated" || exposure.reusedQuestionObservationIds.has(item.observationId)) flags.add("repeated-questions");
      if (seen.questions === "unknown" || seen.questionCounts.unknown > 0) flags.add("question-exposure-unknown");
      if (item.phase === "match" && (seen.content === "repeated" || seen.questions === "repeated")) {
        flags.add("verification-content-reused");
      }
    }
    for (const item of items) {
      if (item.context.contentSetId !== null && item.context.contentVersion !== null) {
        const key = canonical([item.context.contentSetId, item.context.contentVersion]);
        exposureMap.set(key, [...(exposureMap.get(key) ?? []), item]);
      }
    }
    const contentExposures = [...exposureMap].sort(([a], [b]) => compareEvidenceIds(a, b))
      .map(([, seen]) => {
        if (seen.length > 1) flags.add("repeated-content");
        if (seen.some(item => item.phase === "match" &&
          seen.some(other => other.phase === "lab" && other.sessionId === item.sessionId))) {
          flags.add("verification-content-reused");
        }
        return {
          contentSetId: seen[0].context.contentSetId!, contentVersion: seen[0].context.contentVersion!,
          sessionIds: uniqueSorted(seen.map(item => item.sessionId)),
          observationIds: seen.map(item => item.observationId).sort(compareEvidenceIds)
        };
      });
    if (performanceGroups.some(group => group.rankings.some(item => item.methodId === methodId && item.varies))) {
      flags.add("performance-varies");
    }
    // Variation across exposure classes is retained without averaging the classes.
    const descriptive = new Map<string, Set<number>>();
    for (const item of items) {
      const key = groupKey(item);
      if (key !== null) {
        const scores = descriptive.get(key) ?? new Set<number>(); scores.add(item.performance.score!);
        descriptive.set(key, scores);
      }
    }
    if ([...descriptive.values()].some(scores => scores.size > 1)) flags.add("performance-varies");
    const verification = items.filter(item => item.phase === "match");
    return {
      methodId, sessionIds,
      independentSessionCount: new Set(relatedSessions.flatMap(session =>
        session.originalSessionId === null ? [] : [session.originalSessionId])).size,
      unknownIndependenceSessionCount: relatedSessions.filter(session => session.originalSessionId === null).length,
      observations: items.map(item => ({ ...item, exposure: exposure.byObservation.get(item.observationId)! })),
      sourceCounts: {
        "test-me-lab": items.filter(item => item.source === "test-me-lab").length,
        "test-me-match": items.filter(item => item.source === "test-me-match").length,
        "test-methods": items.filter(item => item.source === "test-methods").length
      },
      verification: {
        observationCount: verification.length,
        scoredObservationCount: verification.filter(item => item.performance.score !== null).length,
        sessionCount: new Set(verification.map(item => item.sessionId)).size
      },
      knownContentSetCount: new Set(contentExposures.map(item => item.contentSetId)).size,
      knownContentVersionCount: contentExposures.length,
      knownContentExposureCount: contentExposures.reduce((sum, item) => sum + item.sessionIds.length, 0),
      unknownContentObservationCount: items.filter(item => item.context.contentSetId === null ||
        item.context.contentVersion === null).length,
      knownQuestionExposureCount: new Set(items.flatMap(item => (questionIdentities(item) ?? [])
        .map(key => canonical([item.sessionId, key])))).size,
      unknownQuestionObservationCount: items.filter(item => questionIdentities(item) === null).length,
      contentExposures,
      selfReports: items.map(item => ({ observationId: item.observationId, ...item.selfReport })),
      unpooledObservationIds: items.filter(item => groupKey(item) === null)
        .map(item => item.observationId).sort(compareEvidenceIds),
      limitations: [...flags].sort(compareEvidenceIds),
      interpretation: { kind: "descriptive-only", furtherTestingRecommended: true,
        nextAction: flags.has("repeated-content") || flags.has("repeated-questions") ? "test-on-different-material"
          : flags.has("unpooled-performance") || flags.has("question-conditions-unknown") ? "repeat-under-known-conditions"
            : "collect-more-independent-evidence" }
    };
  });
  return {
    schemaVersion: CUMULATIVE_PROFILE_VERSION,
    aggregationVersion: CUMULATIVE_AGGREGATION_VERSION,
    owner: owner.kind === "user" ? { kind: "user", uid: owner.uid }
      : { kind: "guest", scopeId: owner.scopeId }, sessionCount: sessions.length,
    independentSessionCount: new Set(sessions.flatMap(session =>
      session.originalSessionId === null ? [] : [session.originalSessionId])).size,
    unknownIndependenceSessionCount: sessions.filter(session => session.originalSessionId === null).length,
    observationCount: observations.length, methods, performanceGroups,
    exposures: { knownContentExposureCount: exposure.knownContentExposureCount,
      knownQuestionExposureCount: exposure.knownQuestionExposureCount,
      unknownContentObservationCount: exposure.unknownContentObservationCount,
      unknownQuestionObservationCount: exposure.unknownQuestionObservationCount,
      historyCoverage: "unknown" },
    preferenceReports: sessions.flatMap(session => session.preference === null ? [] : [{
      sessionId: session.sessionId, completedAt: session.completedAt, preference: session.preference
    }])
  };
}

/** Current-profile projection is bounded; detailed history is a separate API. */
export function aggregateCompletedEvidence(
  owner: EvidenceOwner, evidence: readonly CompletedSessionEvidence[]
): CumulativeLearningProfile {
  return materializeCumulativeProfile(rebuildCompletedEvidenceHistory(owner, evidence));
}
