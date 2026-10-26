import { canonicalEvidence } from "./learningEvidence";
import type { CompletedSessionEvidence, LearningObservation } from "./learningEvidence";

export type ExposureState = "first-known" | "repeated" | "unknown";
export type ObservationExposure = {
  readonly content: ExposureState;
  readonly questions: ExposureState;
  readonly questionCounts: Readonly<Record<ExposureState, number>>;
  readonly questionStates: readonly { readonly questionId: string; readonly state: ExposureState }[] | null;
  // Even first-known means only earliest established in supplied history.
  readonly historyCoverage: "unknown";
};

export function contentIdentity(item: LearningObservation): string | null {
  return item.context.contentSetId === null || item.context.contentVersion === null ? null
    : canonicalEvidence([item.context.contentSetId, item.context.contentVersion]);
}

export function questionIdentities(item: LearningObservation): string[] | null {
  const content = contentIdentity(item);
  return content === null || item.protocol.questions === null ? null
    : item.protocol.questions.map(question => canonicalEvidence([content, question.questionId]));
}

/** All methods share the same owner-wide index. Dates never come from save time. */
export function buildExposureIndex(sessions: readonly CompletedSessionEvidence[]) {
  const observations = sessions.flatMap(session => session.observations);
  const sessionDates = new Map(sessions.map(session => [session.sessionId, session.completedAt]));
  const content = new Map<string, LearningObservation[]>();
  const questions = new Map<string, LearningObservation[]>();
  const contentUnits = new Set<string>();
  const questionUnits = new Set<string>();
  const unknownContent = observations.filter(item => contentIdentity(item) === null);
  const unknownQuestions = observations.filter(item => questionIdentities(item) === null);
  const date = (item: LearningObservation) => item.completedAt ?? sessionDates.get(item.sessionId) ?? null;
  for (const item of observations) {
    const key = contentIdentity(item);
    if (key !== null) {
      const seen = content.get(key) ?? []; seen.push(item); content.set(key, seen);
      contentUnits.add(canonicalEvidence([item.sessionId, key]));
    }
    for (const question of questionIdentities(item) ?? []) {
      const seen = questions.get(question) ?? []; seen.push(item); questions.set(question, seen);
      questionUnits.add(canonicalEvidence([item.sessionId, question]));
    }
  }
  function relation(other: LearningObservation, item: LearningObservation): "before" | "after" | "unknown" {
    if (other.sessionId === item.sessionId) {
      if (other.phase !== item.phase) return other.phase === "lab" ? "before" : "after";
      // A session timestamp does not establish within-Lab method order.
      if (other.completedAt === null || item.completedAt === null || other.completedAt === item.completedAt) return "unknown";
      return other.completedAt < item.completedAt ? "before" : "after";
    }
    const left = other.completedAt, right = item.completedAt;
    // A cross-session tie cannot be resolved by session-end bounds.
    if (left !== null && right !== null) return left === right ? "unknown" : left < right ? "before" : "after";
    // A session end is only an upper bound, not its methods' exact times.
    // Two session-end times alone cannot rule out overlapping sessions.
    const otherEnd = sessionDates.get(other.sessionId) ?? null;
    const thisEnd = sessionDates.get(item.sessionId) ?? null;
    if (right !== null && otherEnd !== null && otherEnd < right) return "before";
    if (left !== null && thisEnd !== null && thisEnd < left) return "after";
    return "unknown";
  }
  function state(item: LearningObservation, seen: readonly LearningObservation[], unidentified: readonly LearningObservation[]): ExposureState {
    const others = seen.filter(other => other.observationId !== item.observationId);
    if (others.some(other => relation(other, item) === "before")) return "repeated";
    if (date(item) === null || others.some(other => relation(other, item) === "unknown") ||
      unidentified.some(other => other.observationId !== item.observationId && relation(other, item) !== "after")) return "unknown";
    return "first-known";
  }
  const byObservation = new Map<string, ObservationExposure>();
  for (const item of observations) {
    const contentKey = contentIdentity(item);
    const questionKeys = questionIdentities(item);
    const counts: Record<ExposureState, number> = { "first-known": 0, repeated: 0, unknown: 0 };
    const questionStates = questionKeys === null ? null : questionKeys.map((key, index) => {
      const exposure = state(item, questions.get(key)!, unknownQuestions); counts[exposure]++;
      return { questionId: item.protocol.questions![index].questionId, state: exposure };
    });
    const questionState = counts.repeated > 0 ? "repeated"
      : questionKeys === null || counts.unknown > 0 ? "unknown" : "first-known";
    byObservation.set(item.observationId, {
      content: contentKey === null ? "unknown" : state(item, content.get(contentKey)!, unknownContent),
      questions: questionState, questionCounts: counts, questionStates, historyCoverage: "unknown"
    });
  }
  return { byObservation,
    reusedContentObservationIds: new Set([...content.values()].filter(seen => seen.length > 1).flatMap(seen => seen.map(item => item.observationId))),
    reusedQuestionObservationIds: new Set([...questions.values()].filter(seen => seen.length > 1).flatMap(seen => seen.map(item => item.observationId))),
    knownContentExposureCount: contentUnits.size,
    knownQuestionExposureCount: questionUnits.size,
    unknownContentObservationCount: unknownContent.length,
    unknownQuestionObservationCount: unknownQuestions.length };
}
