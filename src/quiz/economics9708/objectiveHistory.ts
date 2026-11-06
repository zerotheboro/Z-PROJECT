import { assertCompletedSessionEvidence, canonicalEvidence } from "../learningEvidence";
import type { CompletedSessionEvidence } from "../learningEvidence";
import { normalizeCompletedEvidence, completedEvidenceSourceKey } from "../completedEvidenceIdentity";
import { buildExposureIndex } from "../learningEvidenceExposure";
import { deriveEconomicsObjectiveEvidence } from "./assessmentEvidence";
import type { EconomicsObjectiveEvidence, EconomicsResponses } from "./assessmentEvidence";
import { assertMaterialPresentations } from "./presentationRecords";
import type { MaterialPresentations } from "./presentationRecords";
import { isTrainingMethodId } from "../type";

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const requireValue = (condition: unknown): void => { if (!condition) throw new Error("Objective history could not be reconciled."); };

function checkedSidecar(value: unknown, evidence: CompletedSessionEvidence, presentations?: MaterialPresentations): EconomicsObjectiveEvidence {
  requireValue(object(value) && Array.isArray(value.activities) && value.activities.length <= 8);
  const sidecar = value as EconomicsObjectiveEvidence;
  const labs = sidecar.activities.filter(a => a.stage === "method-lab");
  const matches = sidecar.activities.filter(a => a.stage === "method-match");
  const methods = labs.map(a => a.methodId).filter(isTrainingMethodId);
  const observation = (method: string | null, phase: "lab" | "match") => {
    const o = evidence.observations.find(o => o.methodId === method && o.phase === phase);
    requireValue(o); return o!;
  };
  requireValue(methods.length === labs.length && methods.length === new Set(methods).size && labs.length === evidence.observations.filter(o => o.phase === "lab").length);
  const responses: EconomicsResponses = { schemaVersion: 1, activityVersion: "mapped-1", topicId: sidecar.topicId, sessionStartedAt: sidecar.sessionStartedAt,
    activities: sidecar.activities.map(a => ({ contentSetId: a.contentSetId, responses: a.answers.map(q => ({ questionId: q.questionId, answerOptionId: q.answerOptionId,
      offeredOptionIds: q.offeredOptionIds, role: q.role })) })) };
  const rebuilt = deriveEconomicsObjectiveEvidence({ mode: evidence.mode, selectedMethods: methods,
    methodLab: { experiments: labs.map(a => { const o = observation(a.methodId, "lab"); return { method: o.methodId, ...o.performance }; }) },
    methodMatch: { methods: matches.map(a => { const o = observation(a.methodId, "match"); return { method: o.methodId, verificationScore: o.performance.score }; }) },
    ...(evidence.mode === "auto" ? { baseline: { memory: sidecar.activities[0].declaredPerformance, understanding: sidecar.activities[1].declaredPerformance } } : {}),
    completedAt: evidence.completedAt, metadata: evidence.observations.map(o => ({ methodId: o.methodId, phase: o.phase, context: o.context, protocol: o.protocol })), economicsResponses: responses,
    ...(presentations ? { materialPresentations: presentations } : {}) });
  requireValue(canonicalEvidence(rebuilt) === canonicalEvidence(value));
  return rebuilt!;
}

/** Read-only projection over the existing authenticated, reconciled accepted
 * source snapshot. This pure function is not an authorization or IAM provider.
 * It must never be fed browser drafts as if they were accepted source history. */
export function buildEconomicsObjectiveHistory(uid: string, rows: readonly { id: string; data: unknown }[]) {
  const records = rows.map(row => {
    requireValue(object(row.data) && object(row.data.evidence));
    const data = row.data as Record<string, unknown>;
    assertCompletedSessionEvidence(data.evidence);
    const evidence = data.evidence;
    let sidecar: EconomicsObjectiveEvidence | undefined;
    if (evidence.provenance.kind === "native") {
      const receipt = data.receipt;
      requireValue(object(receipt) && receipt.sessionId === evidence.sessionId && receipt.mode === evidence.mode &&
        receipt.evidenceId === row.id && typeof data.requestHash === "string" && /^[a-f0-9]{64}$/.test(data.requestHash) && receipt.requestHash === data.requestHash &&
        (receipt.schemaVersion === 1 && receipt.status === "completed" || receipt.schemaVersion === 2 && receipt.status === "accepted"));
    }
    let presentations: MaterialPresentations | undefined;
    if (data.materialPresentations !== undefined && evidence.provenance.kind === "native") {
      assertMaterialPresentations(data.materialPresentations); presentations = data.materialPresentations;
    }
    if (data.objectiveEvidence !== undefined) {
      requireValue(evidence.provenance.kind === "native");
      sidecar = checkedSidecar(data.objectiveEvidence, evidence, presentations);
    }
    return { evidence, sidecar, presentations };
  });
  const sessions = normalizeCompletedEvidence({ kind: "user", uid }, records.map(r => r.evidence));
  const bySource = new Map<string, typeof records[number]>();
  for (const record of records) {
    const key = completedEvidenceSourceKey(record.evidence), existing = bySource.get(key);
    if (existing) requireValue(canonicalEvidence([existing.sidecar ?? null, existing.presentations ?? null]) === canonicalEvidence([record.sidecar ?? null, record.presentations ?? null]));
    else bySource.set(key, record);
  }
  type Timeline = { sessions: Set<string>; dates: string[] };
  const objectiveIndex = new Map<string, Timeline>(), methodIndex = new Map<string, Timeline>();
  const add = (index: Map<string, Timeline>, key: string, session: CompletedSessionEvidence) => {
    let timeline = index.get(key); if (!timeline) { timeline = { sessions: new Set(), dates: [] }; index.set(key, timeline); }
    if (timeline.sessions.has(session.sessionId)) return;
    timeline.sessions.add(session.sessionId); if (session.completedAt) timeline.dates.push(session.completedAt);
  };
  const objectiveKey = (id: string, version: string) => canonicalEvidence([id, version]);
  for (const session of sessions) {
    const record = bySource.get(completedEvidenceSourceKey(session))!;
    // Unresolved historical snapshots can alias native sessions. They remain
    // available in the existing exposure model, but cannot increase this
    // lower-bound count of distinct accepted native method sessions.
    if (session.provenance.kind === "native") for (const o of session.observations) add(methodIndex, o.methodId, session);
    for (const activity of record.sidecar?.activities ?? []) for (const answer of activity.answers)
      for (const id of answer.objectiveIds) add(objectiveIndex, objectiveKey(id, record.sidecar!.contentVersion), session);
    for (const p of record.presentations?.records ?? []) for (const id of p.objectiveIds)
      add(objectiveIndex, objectiveKey(id, "2026-v2-pilot-1"), session);
  }
  for (const index of [objectiveIndex, methodIndex]) for (const timeline of index.values()) timeline.dates.sort();
  const earlier = (timeline: Timeline | undefined, start: string | null) => {
    if (!timeline || start === null) return 0;
    let lo = 0, hi = timeline.dates.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (timeline.dates[mid] < start) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const activities = sessions.flatMap(session => {
    const record = bySource.get(completedEvidenceSourceKey(session))!;
    const previous: { methodId: string | null; objectives: Set<string> }[] = [];
    return (record.sidecar?.activities ?? []).map(activity => {
      const presentations = record.presentations?.records.filter(p => p.contentSetId === activity.contentSetId) ?? [];
      const exposed = new Set([...activity.answers.flatMap(a => a.objectiveIds), ...presentations.flatMap(p => p.objectiveIds)]);
      const prior = [...exposed].sort().map(objectiveId => {
        const timeline = objectiveIndex.get(objectiveKey(objectiveId, record.sidecar!.contentVersion));
        return { objectiveId, earlierWithinSessionActivities: previous.filter(a => a.objectives.has(objectiveId)).length,
          otherKnownSessionCount: (timeline?.sessions.size ?? 0) - Number(timeline?.sessions.has(session.sessionId)),
          earlierReportedSessions: earlier(timeline, record.sidecar!.sessionStartedAt) };
      });
      const result = { sessionId: session.sessionId, ...activity, materialExposureOnly: presentations,
        priorMethodsInSession: previous.map(a => a.methodId).filter((id): id is string => id !== null),
        earlierReportedMethodSessions: activity.methodId ? earlier(methodIndex.get(activity.methodId), record.sidecar!.sessionStartedAt) : 0,
        priorByObjective: prior, withinEdulienceHistory: "partial-or-unknown" as const, outsideStudy: "unknown" as const,
        priorCountMeaning: "lower-bound-in-supplied-history" as const, timingAuthority: "client-reported" as const,
        causalAttribution: "not-established" as const };
      previous.push({ methodId: activity.methodId, objectives: exposed }); return result;
    });
  });
  return { ownerUid: uid, sessions: sessions.length, objectiveAssessmentUnavailableSessions: sessions.filter(s => !bySource.get(completedEvidenceSourceKey(s))?.sidecar).map(s => s.sessionId),
    activities, contentExposure: buildExposureIndex(sessions).byObservation, historyCoverage: "partial-or-unknown" as const, outsideStudy: "unknown" as const };
}
