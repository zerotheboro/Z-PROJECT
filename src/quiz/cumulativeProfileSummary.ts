import { compareEvidenceIds, evidenceBytes, EvidenceValidationError } from "./learningEvidence";
import type { LearningObservation } from "./learningEvidence";
import type { CumulativeEvidenceHistory, ContextualPerformanceGroup, MethodCumulativeEvidence } from "./cumulativeProfile";
import type { ObservationExposure } from "./learningEvidenceExposure";
import { TRAINING_METHOD_IDS } from "../../trainingMethodIds.js";

export const CUMULATIVE_SUMMARY_LIMITS = Object.freeze({
  profileBytes: 192 * 1024,
  methods: TRAINING_METHOD_IDS.length + 2,
  recentObservations: 40,
  observationsPerMethod: 4,
  performanceGroups: 12,
  preferenceReports: 10
});

type SummaryProtocol = Pick<LearningObservation["protocol"], "assessmentVersion" | "scoringVersion"> & {
  readonly questionCount: number | null;
};
export type RecentObservation = Omit<LearningObservation, "protocol"> & {
  readonly protocol: SummaryProtocol;
  readonly exposure: Omit<ObservationExposure, "questionStates">;
};
export type MethodSummary = Omit<MethodCumulativeEvidence,
  "sessionIds" | "observations" | "contentExposures" | "selfReports" | "unpooledObservationIds"> & {
  readonly sessionCount: number;
  readonly observationCount: number;
  readonly unpooledObservationCount: number;
  readonly recentObservations: readonly RecentObservation[];
};
type PerformanceSummary = Omit<ContextualPerformanceGroup, "protocol" | "rankings"> & {
  readonly protocol: SummaryProtocol;
  readonly results: readonly (Omit<ContextualPerformanceGroup["rankings"][number], "observationIds"> & {
    readonly observationCount: number;
  })[];
};
export type CumulativeLearningProfile = Omit<CumulativeEvidenceHistory,
  "methods" | "performanceGroups" | "preferenceReports"> & {
  readonly methods: readonly MethodSummary[];
  readonly performanceGroups: readonly PerformanceSummary[];
  readonly recentPreferenceReports: CumulativeEvidenceHistory["preferenceReports"];
  readonly retention: {
    readonly sourceEvidenceDiscarded: false;
    readonly completeHistoryEmbedded: false;
    readonly profileByteLimit: number;
    readonly storedObservationCount: number;
    readonly observationsNotEmbedded: number;
    readonly totalPerformanceGroupCount: number;
    readonly performanceGroupsNotEmbedded: number;
    readonly preferenceReportsNotEmbedded: number;
  };
};

function protocolSummary(protocol: LearningObservation["protocol"]): SummaryProtocol {
  return { assessmentVersion: protocol.assessmentVersion, scoringVersion: protocol.scoringVersion,
    questionCount: protocol.questions?.length ?? null };
}

function recentFirst(a: { completedAt: string | null; observationId: string }, b: { completedAt: string | null; observationId: string }) {
  return compareEvidenceIds(b.completedAt ?? "", a.completedAt ?? "") || compareEvidenceIds(a.observationId, b.observationId);
}

/** Bounded projection only. Full immutable records are never pruned or changed. */
export function materializeCumulativeProfile(history: CumulativeEvidenceHistory): CumulativeLearningProfile {
  if (history.methods.length > CUMULATIVE_SUMMARY_LIMITS.methods) {
    throw new EvidenceValidationError("Too many methods in cumulative summary.");
  }
  const candidates = history.methods.flatMap(method => [...method.observations].sort(recentFirst)
    .slice(0, CUMULATIVE_SUMMARY_LIMITS.observationsPerMethod)).sort(recentFirst)
    .slice(0, CUMULATIVE_SUMMARY_LIMITS.recentObservations);
  const retainedIds = new Set(candidates.map(item => item.observationId));
  const methods = history.methods.map(method => {
    const { sessionIds, observations, contentExposures: _content, selfReports: _ratings,
      unpooledObservationIds, ...summary } = method;
    return { ...summary, sessionCount: sessionIds.length, observationCount: observations.length,
      unpooledObservationCount: unpooledObservationIds.length,
      recentObservations: observations.filter(item => retainedIds.has(item.observationId)).sort(recentFirst)
        .map(item => ({ ...item, protocol: protocolSummary(item.protocol),
          exposure: { content: item.exposure.content, questions: item.exposure.questions,
            questionCounts: item.exposure.questionCounts, historyCoverage: item.exposure.historyCoverage } })) };
  });
  const performanceGroups = history.performanceGroups.slice(0, CUMULATIVE_SUMMARY_LIMITS.performanceGroups)
    .map((group, index) => ({
      // Projection-local ordinal, not a new immutable event/group identity.
      groupId: `context-${index + 1}`, source: group.source, phase: group.phase,
      context: group.context, protocol: protocolSummary(group.protocol), exposure: group.exposure,
      interpretation: group.interpretation,
      results: group.rankings.map(({ observationIds, ...result }) => ({ ...result, observationCount: observationIds.length }))
    }));
  const recentPreferenceReports = [...history.preferenceReports].sort((a, b) =>
    compareEvidenceIds(b.completedAt ?? "", a.completedAt ?? "") || compareEvidenceIds(a.sessionId, b.sessionId))
    .slice(0, CUMULATIVE_SUMMARY_LIMITS.preferenceReports);
  const { methods: _methods, performanceGroups: _groups, preferenceReports: _preferences, ...totals } = history;
  function snapshot(): CumulativeLearningProfile {
    const stored = methods.reduce((sum, method) => sum + method.recentObservations.length, 0);
    return { ...totals, methods, performanceGroups, recentPreferenceReports,
      retention: { sourceEvidenceDiscarded: false, completeHistoryEmbedded: false,
        profileByteLimit: CUMULATIVE_SUMMARY_LIMITS.profileBytes, storedObservationCount: stored,
        observationsNotEmbedded: history.observationCount - stored,
        totalPerformanceGroupCount: history.performanceGroups.length,
        performanceGroupsNotEmbedded: history.performanceGroups.length - performanceGroups.length,
        preferenceReportsNotEmbedded: history.preferenceReports.length - recentPreferenceReports.length } };
  }
  let profile = snapshot();
  // Enforce bytes as well as item caps, including worst-case UTF-8/JSON escaping.
  // Only explicitly marked summary samples are omitted, never source evidence or totals.
  while (evidenceBytes(profile) > CUMULATIVE_SUMMARY_LIMITS.profileBytes) {
    if (performanceGroups.length) performanceGroups.pop();
    else if (candidates.length) {
      const id = candidates.pop()!.observationId;
      for (const method of methods) method.recentObservations = method.recentObservations.filter(item => item.observationId !== id);
    } else if (recentPreferenceReports.length) recentPreferenceReports.pop();
    else throw new EvidenceValidationError("Required cumulative summary exceeds its byte limit.");
    profile = snapshot();
  }
  return profile;
}
