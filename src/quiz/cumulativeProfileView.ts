import { assertCompletedSessionEvidence, canonicalEvidence, isEvidenceMethodId, normalizeEvidenceTimestamp } from "./learningEvidence";
import type { CompletedSessionEvidence, LearningObservation } from "./learningEvidence";
import { normalizeCompletedEvidence } from "./completedEvidenceIdentity";
import { buildExposureIndex } from "./learningEvidenceExposure";
import type { ObservationExposure } from "./learningEvidenceExposure";
import { adaptLegacyAutomaticAssessment } from "./legacyAssessmentEvidence";
import { CUMULATIVE_AGGREGATION_VERSION } from "./cumulativeProfile";
import type { CumulativeLearningProfile } from "./cumulativeProfileSummary";
import type { MethodId } from "./type";
import { validateClientCompletionReceipt } from "../services/trainingCompletionReceipt";

export type ProfileRow = { id: string; data: unknown };
type ProfileGroup = CumulativeLearningProfile["performanceGroups"][number];
export type ProfileSummary = Pick<CumulativeLearningProfile, "sessionCount" | "observationCount" | "independentSessionCount" |
  "unknownIndependenceSessionCount" | "methods" | "performanceGroups" | "retention">;
export type CompletionDetails = { schemaVersion: 1; methodIntroduction: { correct: number; total: number; score: number };
  reflection: { reflectionText: string; surprisedByResults: boolean | null } };
export type HistoryEntry = { evidence: CompletedSessionEvidence; serverRecorded: boolean; details: CompletionDetails | null; studyContext: string[] };
export type ProgressSeries = { key: string; methodId: MethodId; group: ProfileGroup;
  points: { date: string; score: number; correct: number; total: number }[] };
export type MethodCoverage = "verified" | "incomplete" | "contradictory";
export type CumulativeProfileView = {
  summary: ProfileSummary | null; revision: number | null; history: HistoryEntry[]; warnings: string[];
  coverageComplete: boolean; automaticSessions: number | null; manualSessions: number | null;
  latestKnownCompletion: string | null; unknownCompletionCount: number;
  exposure: Map<string, ObservationExposure>; progress: ProgressSeries[];
  methodCoverage: ReadonlyMap<MethodId, MethodCoverage>;
};

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const score = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 2048;
const nullableText = (value: unknown) => value === null || text(value);
const exposureState = (value: unknown) => ["first-known", "repeated", "unknown"].includes(String(value));
function validGroup(value: unknown): value is ProfileGroup {
  if (!record(value) || !text(value.groupId) || !["test-me-lab", "test-me-match", "test-methods"].includes(String(value.source)) ||
    !["lab", "match"].includes(String(value.phase)) || !record(value.context) || !record(value.protocol) || !record(value.exposure) ||
    !["subject", "topic", "exerciseTopic", "contentSetId", "contentVersion"].every(key => nullableText(value.context && (value.context as Record<string, unknown>)[key])) ||
    !nullableText(value.protocol.assessmentVersion) || !nullableText(value.protocol.scoringVersion) ||
    !(value.protocol.questionCount === null || count(value.protocol.questionCount)) ||
    !exposureState(value.exposure.content) || !exposureState(value.exposure.questions) || !Array.isArray(value.results)) return false;
  return value.results.length <= 25 && value.results.every(result => record(result) && isEvidenceMethodId(result.methodId) &&
    count(result.sessionCount) && count(result.observationCount) && count(result.correct) && count(result.total) && result.total > 0 &&
    result.correct <= result.total && score(result.score) && record(result.scoreRange) && score(result.scoreRange.minimum) && score(result.scoreRange.maximum) &&
    (result.chronologicalChange === null || record(result.chronologicalChange) && score(result.chronologicalChange.fromScore) && score(result.chronologicalChange.toScore)));
}

function summaryFrom(raw: unknown, uid: string, allowPreview: boolean, allowSyntheticPublished: boolean): { profile: ProfileSummary; revision: number | null } | null {
  if (raw === null) return null;
  const preview = record(raw) && (allowPreview && raw.kind === "local-accepted-evidence-preview" ||
    allowSyntheticPublished && raw.kind === "synthetic-published-generation");
  if (!record(raw) || !record(raw.profile) || !preview && (raw.persistenceVersion !== 1 || !count(raw.revision) || raw.revision < 1)) throw new Error("The saved cumulative summary is not readable. No totals were inferred.");
  const p = raw.profile;
  if (p.schemaVersion !== 2 || p.aggregationVersion !== CUMULATIVE_AGGREGATION_VERSION || !record(p.owner) || p.owner.kind !== "user" || p.owner.uid !== uid ||
    ![p.sessionCount, p.observationCount, p.independentSessionCount, p.unknownIndependenceSessionCount].every(count) ||
    !Array.isArray(p.methods) || p.methods.length > 25 || !Array.isArray(p.performanceGroups) || p.performanceGroups.length > 12 ||
    !p.performanceGroups.every(validGroup) || !record(p.retention) ||
    !["observationsNotEmbedded", "performanceGroupsNotEmbedded"].every(key => count((p.retention as Record<string, unknown>)[key])) ||
    !p.methods.every(m => record(m) && isEvidenceMethodId(m.methodId) &&
      [m.sessionCount, m.observationCount, m.independentSessionCount, m.unknownIndependenceSessionCount, m.knownContentExposureCount,
        m.unknownContentObservationCount, m.unpooledObservationCount].every(count) && Array.isArray(m.limitations) && m.limitations.every(text))) {
    throw new Error("The saved cumulative summary has missing or invalid fields. No totals were inferred.");
  }
  if (new Set(p.methods.map(m => m.methodId)).size !== p.methods.length) throw new Error("The saved cumulative summary has conflicting method identities.");
  return { profile: p as unknown as ProfileSummary, revision: preview ? null : raw.revision as number };
}

function detailsFrom(raw: unknown): CompletionDetails | null {
  if (!record(raw) || raw.schemaVersion !== 1 || !record(raw.methodIntroduction) || !record(raw.reflection)) return null;
  const intro = raw.methodIntroduction, reflection = raw.reflection;
  if (!count(intro.correct) || !count(intro.total) || intro.total < 1 || intro.correct > intro.total || !score(intro.score) ||
    typeof reflection.reflectionText !== "string" || new TextEncoder().encode(reflection.reflectionText).length > 4000 ||
    !(reflection.surprisedByResults === null || typeof reflection.surprisedByResults === "boolean")) return null;
  return { schemaVersion: 1, methodIntroduction: { correct: intro.correct, total: intro.total, score: intro.score },
    reflection: { reflectionText: reflection.reflectionText, surprisedByResults: reflection.surprisedByResults } };
}

function studyContextFrom(raw: unknown): string[] {
  if (!record(raw) || !record(raw.learningSituation)) return [];
  const context = raw.learningSituation;
  return ["goal", "learningContext", "contentTypes", "difficulties", "currentApproach", "sessionLength"].flatMap(key => {
    const value = context[key], values = Array.isArray(value) ? value : [value];
    return values.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 256)
      .slice(0, 8).map(item => `${key.replace(/([A-Z])/g, " $1").toLowerCase()}: ${item.replaceAll("-", " ")}`);
  });
}

/** Presentation checks only, not a replacement aggregation or a profile repair.
 * Exact equality requires complete normalized immutable history. Missing rows,
 * unreadable identities and mutable legacy snapshots never stand in for zeros.
 * Method summaries are complete counters; only their embedded samples are bounded.
 */
function reconcileMethods(summary: ProfileSummary | null, recorded: readonly HistoryEntry[], complete: boolean) {
  const coverage = new Map<MethodId, MethodCoverage>();
  if (!summary) return coverage;
  const observed = new Map<MethodId, { sessions: Set<string>; observations: number }>();
  for (const { evidence } of recorded) {
    for (const observation of evidence.observations) {
      const method = observed.get(observation.methodId) ?? { sessions: new Set<string>(), observations: 0 };
      method.sessions.add(evidence.sessionId); method.observations++;
      observed.set(observation.methodId, method);
    }
  }
  const summaryCountsAgree = summary.methods.reduce((sum, method) => sum + method.observationCount, 0) === summary.observationCount;
  for (const method of summary.methods) {
    const actual = observed.get(method.methodId);
    const impossible = !summaryCountsAgree || method.sessionCount > summary.sessionCount ||
      method.observationCount > summary.observationCount || method.sessionCount > method.observationCount;
    const differs = complete && (!actual || actual.sessions.size !== method.sessionCount || actual.observations !== method.observationCount);
    coverage.set(method.methodId, impossible || differs ? "contradictory" : complete ? "verified" : "incomplete");
  }
  if (complete) {
    for (const methodId of observed.keys()) if (!coverage.has(methodId)) coverage.set(methodId, "contradictory");
  }
  return coverage;
}

/** Read-only presentation normalization. Never rebuilds or writes a cumulative profile. */
export function buildCumulativeProfileView(uid: string, rawSummary: unknown, evidenceRows: readonly ProfileRow[], legacyRows: readonly ProfileRow[],
  options: { acceptedPreview?: boolean; syntheticPublished?: boolean } = {}): CumulativeProfileView {
  const parsed = summaryFrom(rawSummary, uid, options.acceptedPreview === true, options.syntheticPublished === true), warnings: string[] = [];
  const candidates: HistoryEntry[] = [], linkedLegacy = new Set<string>(), nativeSessions = new Set<string>();
  const nativeDetail = new Map<string, CompletionDetails | null>();
  for (const row of evidenceRows) {
    try {
      if (!record(row.data) || row.data.schemaVersion !== 1) throw new Error();
      const evidence = row.data.evidence; assertCompletedSessionEvidence(evidence);
      if (evidence.owner.kind !== "user" || evidence.owner.uid !== uid) throw new Error();
      if (evidence.provenance.kind === "native") {
        const receipt = row.data.receipt;
        if (record(rawSummary) && (options.acceptedPreview && rawSummary.kind === "local-accepted-evidence-preview" ||
          options.syntheticPublished && rawSummary.kind === "synthetic-published-generation")) {
          if (typeof row.data.requestHash !== "string" || !/^[a-f0-9]{64}$/.test(row.data.requestHash)) throw new Error();
          validateClientCompletionReceipt(receipt, { sessionId: evidence.sessionId, mode: evidence.mode,
            evidenceId: row.id, requestHash: row.data.requestHash }, "protected-v2");
        } else if (!record(receipt) || receipt.schemaVersion !== 1 || receipt.status !== "completed" || receipt.sessionId !== evidence.sessionId ||
          receipt.mode !== evidence.mode || receipt.evidenceId !== row.id || !count(receipt.profileRevision) || receipt.profileRevision < 1 ||
          typeof row.data.requestHash !== "string" || receipt.requestHash !== row.data.requestHash ||
          (evidence.mode === "auto" ? receipt.legacyAssessmentId !== evidence.sessionId : receipt.legacyAssessmentId !== null)) throw new Error();
        if (parsed?.revision !== null && parsed?.revision !== undefined && record(receipt) && Number(receipt.profileRevision) > parsed.revision) warnings.push("A recorded completion is newer than the readable summary. Inclusion is not established; coverage is incomplete.");
        nativeSessions.add(evidence.sessionId);
        if (evidence.mode === "auto") linkedLegacy.add(evidence.sessionId);
        const details = detailsFrom(row.data.completionDetails);
        if (row.data.completionDetails !== undefined && !details) warnings.push("Some saved session details are unreadable; performance records were kept separate.");
        nativeDetail.set(evidence.sessionId, details);
      }
      candidates.push({ evidence, serverRecorded: true, details: null, studyContext: [] });
    } catch { warnings.push("A saved evidence record could not be read. Coverage is incomplete; it was not treated as zero."); }
  }
  const persistedLegacy = new Set(candidates.flatMap(item => item.evidence.provenance.recordId ? [item.evidence.provenance.recordId] : []));
  const filtered = candidates.filter(item => item.evidence.provenance.kind === "native" ||
    !linkedLegacy.has(item.evidence.provenance.recordId!) && !(item.evidence.originalSessionId !== null && nativeSessions.has(item.evidence.originalSessionId)));
  for (const row of legacyRows) {
    if (linkedLegacy.has(row.id) || persistedLegacy.has(row.id)) continue;
    const adapted = adaptLegacyAutomaticAssessment({ ownerUid: uid, assessmentId: row.id, assessment: row.data });
    if (adapted.valid) filtered.push({ evidence: adapted.session, serverRecorded: false, details: null, studyContext: studyContextFrom(row.data) });
    else warnings.push("An earlier assessment snapshot is partial or unreadable and is not included in recorded totals.");
  }
  let history: HistoryEntry[] = [];
  try {
    const normalized = normalizeCompletedEvidence({ kind: "user", uid }, filtered.map(item => item.evidence));
    const sources = new Map(filtered.map(item => [canonicalEvidence([item.evidence.provenance.kind, item.evidence.provenance.recordId ?? item.evidence.sessionId]), item]));
    history = normalized.map(evidence => {
      const snapshot = legacyRows.find(row => row.id === (evidence.provenance.kind === "native"
        ? linkedLegacy.has(evidence.sessionId) ? evidence.sessionId : null : evidence.provenance.recordId))?.data;
      return { evidence,
        serverRecorded: sources.get(canonicalEvidence([evidence.provenance.kind, evidence.provenance.recordId ?? evidence.sessionId]))!.serverRecorded,
        details: evidence.mode === "manual" ? nativeDetail.get(evidence.sessionId) ?? null
          : record(snapshot) ? detailsFrom({ schemaVersion: 1, methodIntroduction: snapshot.methodIntroduction, reflection: snapshot.reflection }) : null,
        studyContext: studyContextFrom(snapshot) };
    });
  } catch { warnings.push("Conflicting session identities need review. Detailed history and charts are withheld rather than double-counted."); }
  history.sort((a, b) => (b.evidence.completedAt ?? "").localeCompare(a.evidence.completedAt ?? "") || a.evidence.sessionId.localeCompare(b.evidence.sessionId));
  const recorded = history.filter(item => item.serverRecorded), summary = parsed?.profile ?? null;
  const immutableCoverageComplete = warnings.length === 0 && summary !== null && recorded.length === summary.sessionCount &&
    recorded.reduce((sum, item) => sum + item.evidence.observations.length, 0) === summary.observationCount;
  const methodCoverage = reconcileMethods(summary, recorded, immutableCoverageComplete);
  const contradictory = [...methodCoverage.values()].includes("contradictory");
  if (contradictory) warnings.push("The saved method summary and recorded evidence contradict each other. Affected method figures and progress charts are withheld pending review; server totals were not changed.");
  const coverageComplete = immutableCoverageComplete && history.every(item => item.serverRecorded) && !contradictory;
  if (summary && !coverageComplete) warnings.push("The summary and readable history do not have complete matching coverage. Mode totals and progress charts are unavailable until refreshed or reviewed.");
  const exposure = buildExposureIndex(recorded.map(item => item.evidence)).byObservation;
  const progress = coverageComplete ? comparableProgress(summary!, recorded, exposure) : [];
  const known = recorded.flatMap(item => item.evidence.completedAt === null ? [] : [normalizeEvidenceTimestamp(item.evidence.completedAt)!]).sort();
  return { summary, revision: parsed?.revision ?? null, history, warnings: [...new Set(warnings)], coverageComplete,
    automaticSessions: coverageComplete ? recorded.filter(item => item.evidence.mode === "auto").length : null,
    manualSessions: coverageComplete ? recorded.filter(item => item.evidence.mode === "manual").length : null,
    latestKnownCompletion: known.at(-1) ?? null, unknownCompletionCount: recorded.filter(item => item.evidence.completedAt === null).length,
    exposure, progress, methodCoverage };
}

function comparableProgress(summary: ProfileSummary, history: HistoryEntry[], exposure: Map<string, ObservationExposure>): ProgressSeries[] {
  const all = history.flatMap(item => item.evidence.observations), result: ProgressSeries[] = [];
  for (const group of summary.performanceGroups) {
    if (group.context.subject === null || group.context.topic === null || group.context.exerciseTopic === null || group.context.contentSetId === null || group.context.contentVersion === null ||
      group.protocol.scoringVersion === null || group.protocol.assessmentVersion === null || group.exposure.content === "unknown" || group.exposure.questions === "unknown") continue;
    const matches = all.filter(o => o.source === group.source && o.phase === group.phase && canonicalEvidence(o.context) === canonicalEvidence(group.context) &&
      o.protocol.scoringVersion === group.protocol.scoringVersion && o.protocol.assessmentVersion === group.protocol.assessmentVersion &&
      o.protocol.questions?.length === group.protocol.questionCount && exposure.get(o.observationId)?.content === group.exposure.content &&
      exposure.get(o.observationId)?.questions === group.exposure.questions);
    // The bounded server projection omits option identities and per-question exposure.
    // Require one unambiguous full condition signature; never guess which cohort it represents.
    const signatures = new Set(matches.map(o => canonicalEvidence([o.protocol.questions?.map(q => ({ ...q, offeredOptionIds: q.offeredOptionIds && [...q.offeredOptionIds].sort() })), exposure.get(o.observationId)?.questionStates])));
    if (signatures.size !== 1 || matches.some(o => o.protocol.questions === null || o.protocol.questions.some(q => q.difficulty === null || q.offeredOptionCount === null || q.offeredOptionIds === null))) continue;
    for (const measured of group.results) {
      const observations = matches.filter(o => o.methodId === measured.methodId).sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
      if (!measured.chronologicalChange || measured.sessionCount < 2 || observations.length !== measured.observationCount ||
        new Set(observations.map(o => o.sessionId)).size !== measured.sessionCount || observations.some(o => o.completedAt === null || o.performance.score === null || o.performance.correct === null || o.performance.total === null) ||
        new Set(observations.map(o => o.completedAt)).size !== observations.length ||
        observations[0]?.performance.score !== measured.chronologicalChange.fromScore || observations.at(-1)?.performance.score !== measured.chronologicalChange.toScore) continue;
      result.push({ key: `${group.groupId}:${measured.methodId}`, methodId: measured.methodId, group,
        points: observations.map(o => ({ date: o.completedAt!, score: o.performance.score!, correct: o.performance.correct!, total: o.performance.total! })) });
    }
  }
  return result;
}

export function observationConditions(o: LearningObservation): string {
  const q = o.protocol.questions;
  const difficulties = q ? [...new Set(q.map(item => item.difficulty ?? "unknown"))].join(", ") : "unknown";
  return `Scoring: ${o.protocol.scoringVersion ?? "unknown"}; assessment: ${o.protocol.assessmentVersion ?? "unknown"}; difficulty: ${difficulties}; content version: ${o.context.contentVersion ?? "unknown"}.`;
}
