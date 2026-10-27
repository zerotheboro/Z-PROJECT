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

/** Optional offline instrumentation. Counts algorithmic work, never student data. */
export type ExposureMetrics = { observations: number; indexedMemberships: number; sortComparisons: number;
  binarySearchSteps: number; relationQueries: number };
export const createExposureMetrics = (): ExposureMetrics => ({ observations: 0, indexedMemberships: 0,
  sortComparisons: 0, binarySearchSteps: 0, relationQueries: 0 });

type Entry = { item: LearningObservation; end: string | null; content: string | null; questions: string[] | null };
type Timeline = { total: number; known: string[]; undatedEnds: string[] };
type Pool = { all: Timeline; sessions: Map<string, Record<"lab" | "match", Timeline>> };
type Group = { pool: Pool; byId: Map<string, Entry | { pool: Pool }> };
type Relations = { before: number; after: number; total: number };

/** All methods share the owner-wide index. Sorted range counts replace pairwise
 * filtering. Session ends remain upper bounds; tied/unknown times stay unknown.
 * O(M log M) time/O(M) space for M content/question memberships, including
 * unidentified observations. Journal/save order never supplies chronology. */
export function buildExposureIndex(sessions: readonly CompletedSessionEvidence[], metrics?: ExposureMetrics) {
  const sessionDates = new Map(sessions.map(session => [session.sessionId, session.completedAt]));
  const entries: Entry[] = sessions.flatMap(session => session.observations.map(item => {
    const content = contentIdentity(item);
    if (metrics) metrics.observations++;
    return { item, end: sessionDates.get(item.sessionId) ?? null, content,
      questions: content === null || item.protocol.questions === null ? null
        : item.protocol.questions.map(question => canonicalEvidence([content, question.questionId])) };
  }));
  const timeline = (): Timeline => ({ total: 0, known: [], undatedEnds: [] });
  const pool = (): Pool => ({ all: timeline(), sessions: new Map() });
  const group = (): Group => ({ pool: pool(), byId: new Map() });
  function addTimeline(target: Timeline, entry: Entry) {
    if (metrics) metrics.indexedMemberships++;
    target.total++;
    if (entry.item.completedAt !== null) target.known.push(entry.item.completedAt);
    else if (entry.end !== null) target.undatedEnds.push(entry.end);
  }
  function addPool(target: Pool, entry: Entry) {
    addTimeline(target.all, entry);
    let local = target.sessions.get(entry.item.sessionId);
    if (!local) { local = { lab: timeline(), match: timeline() }; target.sessions.set(entry.item.sessionId, local); }
    addTimeline(local[entry.item.phase], entry);
  }
  function add(target: Group, entry: Entry) {
    addPool(target.pool, entry);
    const previous = target.byId.get(entry.item.observationId);
    if (!previous) target.byId.set(entry.item.observationId, entry);
    else {
      // Normalized evidence has unique IDs. Keep exact self-ID exclusion even
      // for duplicate inputs, without introducing a quadratic fallback scan.
      const duplicate = "item" in previous ? { pool: pool() } : previous;
      if ("item" in previous) addPool(duplicate.pool, previous);
      addPool(duplicate.pool, entry); target.byId.set(entry.item.observationId, duplicate);
    }
  }
  const content = new Map<string, Group>(), questions = new Map<string, Group>();
  const unknownContent = group(), unknownQuestions = group();
  const contentUnits = new Set<string>(), questionUnits = new Set<string>();
  function addKey(target: Map<string, Group>, key: string, entry: Entry) {
    let bucket = target.get(key);
    if (!bucket) { bucket = group(); target.set(key, bucket); }
    add(bucket, entry);
  }
  for (const entry of entries) {
    if (entry.content === null) add(unknownContent, entry);
    else {
      addKey(content, entry.content, entry);
      contentUnits.add(canonicalEvidence([entry.item.sessionId, entry.content]));
    }
    if (entry.questions === null) add(unknownQuestions, entry);
    else for (const key of entry.questions) {
      addKey(questions, key, entry);
      questionUnits.add(canonicalEvidence([entry.item.sessionId, key]));
    }
  }
  function preparePool(target: Pool) {
    const compare = (a: string, b: string) => { if (metrics) metrics.sortComparisons++; return a < b ? -1 : a > b ? 1 : 0; };
    for (const value of [target.all, ...[...target.sessions.values()].flatMap(local => [local.lab, local.match])]) {
      value.known.sort(compare); value.undatedEnds.sort(compare);
    }
  }
  for (const bucket of [...content.values(), ...questions.values(), unknownContent, unknownQuestions]) {
    preparePool(bucket.pool);
    for (const value of bucket.byId.values()) if (!("item" in value)) preparePool(value.pool);
  }
  function rank(values: readonly string[], time: string, inclusive = false) {
    let low = 0, high = values.length;
    while (low < high) {
      if (metrics) metrics.binarySearchSteps++;
      const middle = low + Math.floor((high - low) / 2);
      if (values[middle] < time || inclusive && values[middle] === time) low = middle + 1;
      else high = middle;
    }
    return low;
  }
  function across(value: Timeline, entry: Entry): Relations {
    const time = entry.item.completedAt;
    return time === null ? { total: value.total, before: 0,
      after: entry.end === null ? 0 : value.known.length - rank(value.known, entry.end, true) }
      : { total: value.total, before: rank(value.known, time) + rank(value.undatedEnds, time),
        after: value.known.length - rank(value.known, time, true) };
  }
  function relations(target: Pool, entry: Entry): Relations {
    if (metrics) metrics.relationQueries++;
    const result = across(target.all, entry), local = target.sessions.get(entry.item.sessionId);
    if (!local) return result;
    // Remove same-session observations from the cross-session formula, then
    // restore the reliable Lab-before-Match rule and exact same-phase times.
    for (const phase of ["lab", "match"] as const) {
      const value = local[phase], removed = across(value, entry);
      result.before -= removed.before; result.after -= removed.after;
      if (phase !== entry.item.phase) {
        if (phase === "lab") result.before += value.total;
        else result.after += value.total;
      } else if (entry.item.completedAt !== null) {
        result.before += rank(value.known, entry.item.completedAt);
        result.after += value.known.length - rank(value.known, entry.item.completedAt, true);
      }
    }
    return result;
  }
  function single(other: Entry, entry: Entry): Relations {
    const left = other.item.completedAt, right = entry.item.completedAt;
    if (other.item.sessionId === entry.item.sessionId) {
      if (other.item.phase !== entry.item.phase) return { total: 1, before: other.item.phase === "lab" ? 1 : 0, after: other.item.phase === "match" ? 1 : 0 };
      return { total: 1, before: left !== null && right !== null && left < right ? 1 : 0,
        after: left !== null && right !== null && left > right ? 1 : 0 };
    }
    if (left !== null && right !== null) return { total: 1, before: left < right ? 1 : 0, after: left > right ? 1 : 0 };
    return { total: 1, before: right !== null && other.end !== null && other.end < right ? 1 : 0,
      after: left !== null && entry.end !== null && entry.end < left ? 1 : 0 };
  }
  function excludingSelf(target: Group, entry: Entry) {
    const result = relations(target.pool, entry), self = target.byId.get(entry.item.observationId);
    if (self) {
      const removed = "item" in self ? single(self, entry) : relations(self.pool, entry);
      result.before -= removed.before; result.after -= removed.after; result.total -= removed.total;
    }
    return result;
  }
  function state(entry: Entry, seen: Group, unidentified: Group): ExposureState {
    const others = excludingSelf(seen, entry);
    if (others.before > 0) return "repeated";
    if ((entry.item.completedAt ?? entry.end) === null || others.total - others.before - others.after > 0) return "unknown";
    const unknown = excludingSelf(unidentified, entry);
    return unknown.total - unknown.after > 0 ? "unknown" : "first-known";
  }
  const byObservation = new Map<string, ObservationExposure>();
  for (const entry of entries) {
    const { item, content: contentKey, questions: questionKeys } = entry;
    const counts: Record<ExposureState, number> = { "first-known": 0, repeated: 0, unknown: 0 };
    const questionStates = questionKeys === null ? null : questionKeys.map((key, index) => {
      const exposure = state(entry, questions.get(key)!, unknownQuestions); counts[exposure]++;
      return { questionId: item.protocol.questions![index].questionId, state: exposure };
    });
    const questionState = counts.repeated > 0 ? "repeated"
      : questionKeys === null || counts.unknown > 0 ? "unknown" : "first-known";
    byObservation.set(item.observationId, {
      content: contentKey === null ? "unknown" : state(entry, content.get(contentKey)!, unknownContent),
      questions: questionState, questionCounts: counts, questionStates, historyCoverage: "unknown"
    });
  }
  return { byObservation,
    reusedContentObservationIds: new Set([...content.values()].filter(seen => seen.pool.all.total > 1).flatMap(seen => [...seen.byId.keys()])),
    reusedQuestionObservationIds: new Set([...questions.values()].filter(seen => seen.pool.all.total > 1).flatMap(seen => [...seen.byId.keys()])),
    knownContentExposureCount: contentUnits.size,
    knownQuestionExposureCount: questionUnits.size,
    unknownContentObservationCount: unknownContent.pool.all.total,
    unknownQuestionObservationCount: unknownQuestions.pool.all.total };
}
