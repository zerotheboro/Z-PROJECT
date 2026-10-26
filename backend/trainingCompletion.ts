import {
  assertCompletedSessionEvidence, canonicalEvidence, evidenceBytes
} from "../src/quiz/learningEvidence";
import type { CompletedSessionEvidence } from "../src/quiz/learningEvidence";
import { aggregateCompletedEvidence } from "../src/quiz/cumulativeProfile";
import { adaptLegacyAutomaticAssessment } from "../src/quiz/legacyAssessmentEvidence";
import { CompletionError, digest, requireCompletion, validateCompletion } from "./trainingCompletionContract";
import { createCompletionEmulatorFirestore } from "./completionFirestore";
import { assertCompletionDocumentBudget, completionDocumentBytes, completionHistoryJSONBytes, fingerprintFirestoreSource } from "./completionFirestoreValues";
export { CompletionError, validateCompletion } from "./trainingCompletionContract";
export { assertCompletionEmulatorClient, completionEmulatorConfig, createCompletionEmulatorFirestore } from "./completionFirestore";
export { completionDocumentBytes, completionHistoryJSONBytes, fingerprintFirestoreSource } from "./completionFirestoreValues";

// Deliberately small Phase 2A preparation ceiling, not approximate counters.
export const COMPLETION_LIMITS = Object.freeze({ historyDocuments: 100, readDocuments: 400, historyBytes: 3 * 1024 * 1024, preparationAttempts: 3 });
type Data = Record<string, unknown>;
type Ref = { id: string; collection(name: string): Collection; get(): Promise<Snapshot> };
type Query = { limit(count: number): Query; get(): Promise<QuerySnapshot> };
type Collection = Query & { doc(id: string): Ref };
type Snapshot = { id: string; exists: boolean; data(): Data | undefined };
type QuerySnapshot = { docs: Snapshot[] };
type Transaction = {
  get(ref: Ref): Promise<Snapshot>;
  get(query: Query): Promise<QuerySnapshot>;
  create(ref: Ref, data: Data): Transaction;
  set(ref: Ref, data: Data, options?: { merge: boolean }): Transaction;
};
export type CompletionDatabase = { collection(name: string): Collection; runTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> };
type Row = { id: string; data: Data };
export type ManualCompletionDetails = { schemaVersion: 1;
  methodIntroduction: import("./trainingCompletionContract").CompletionRequest["methodIntroduction"];
  reflection: import("./trainingCompletionContract").CompletionRequest["reflection"] };
type EvidenceRow = { schemaVersion: 1; evidence: CompletedSessionEvidence; requestHash?: string; receipt?: CompletionReceipt;
  completionDetails?: ManualCompletionDetails };
type Decision = {
  schemaVersion: 1; sourceKind: "native" | "legacy"; recordId: string; sourceHash: string;
  fromEvidenceId: string | null; toEvidenceId: string; fingerprint: string;
};
type SourceIndex = { schemaVersion: 1; sourceKind: "native" | "legacy"; recordId: string; evidenceId: string; fingerprint: string; decisionId: string };
export type CompletionReceipt = {
  schemaVersion: 1; status: "completed"; sessionId: string; mode: "auto" | "manual";
  evidenceId: string; requestHash: string; profileRevision: number; recordedAt: string;
  legacyAssessmentId: string | null; legacyProfileUpdated: boolean;
};
class PreparationChanged extends Error {}
const internal = (condition: unknown, code = "completion_history_invalid") => requireCompletion(condition, code, 503);
const sourceHash = (kind: "native" | "legacy", id: string) => digest(["training-source-v1", kind, id]);
const nativeId = (id: string) => `session-${digest(id)}`;
const legacyId = (id: string) => `legacy-${digest(id)}`;
export function legacyAssessmentFingerprint(data: Data): string {
  // saveAssessment() refreshes createdAt on an identical legacy save retry.
  // Save time is transport metadata, not a new performance observation.
  const { createdAt: _saveTime, ...content } = data;
  return fingerprintFirestoreSource(content);
}
function record(value: unknown): Data {
  internal(typeof value === "object" && value !== null && !Array.isArray(value));
  return value as Data;
}
const historyCollections = ["learningEvidence", "assessments", "learningEvidenceSourceIndex", "learningEvidenceIdentityEvents"] as const;
function checkHistoryBytes(groups: readonly (readonly Row[])[], uid: string, prospective = false): void {
  let jsonBytes = 1 + groups.length * 3;
  let firestoreBytes = 0;
  for (const [index, rows] of groups.entries()) for (const row of rows) {
    jsonBytes += completionHistoryJSONBytes(row) + 1;
    const path = `users/${uid}/${historyCollections[index]}/${row.id}`;
    firestoreBytes += prospective ? assertCompletionDocumentBudget(path, row.data) : completionDocumentBytes(path, row.data);
    requireCompletion(Math.max(jsonBytes, firestoreBytes) <= COMPLETION_LIMITS.historyBytes,
      prospective ? "completion_capacity_exceeded" : "completion_preparation_limit", prospective ? 409 : 503);
  }
}
function boundedRows(snapshots: readonly QuerySnapshot[], uid: string): Row[][] {
  internal(snapshots[0].docs.length <= COMPLETION_LIMITS.historyDocuments && snapshots[1].docs.length <= COMPLETION_LIMITS.historyDocuments &&
    snapshots.reduce((sum, item) => sum + item.docs.length, 0) <= COMPLETION_LIMITS.readDocuments, "completion_preparation_limit");
  const rows = snapshots.map(snapshot => snapshot.docs.map(item => ({ id: item.id, data: item.data()! }))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  checkHistoryBytes(rows, uid);
  return rows;
}
function revision(snapshot: Snapshot): number {
  if (!snapshot.exists) return 0;
  const value = snapshot.data()!;
  internal(value.persistenceVersion === 1 && Number.isSafeInteger(value.revision) && Number(value.revision) >= 1 && Number(value.revision) < Number.MAX_SAFE_INTEGER);
  return Number(value.revision);
}
function indexFrom(decision: Decision, decisionId: string): SourceIndex {
  return { schemaVersion: 1, sourceKind: decision.sourceKind, recordId: decision.recordId,
    evidenceId: decision.toEvidenceId, fingerprint: decision.fingerprint, decisionId };
}

/** Rebuild the mutable source index solely from immutable decisions. No clocks. */
export function rebuildSourceIndex(events: readonly Row[]): Map<string, SourceIndex> {
  const groups = new Map<string, { id: string; decision: Decision }[]>();
  for (const event of events) {
    const decision = event.data as unknown as Decision;
    internal(decision.schemaVersion === 1 && ["native", "legacy"].includes(decision.sourceKind) &&
      typeof decision.recordId === "string" && typeof decision.toEvidenceId === "string" &&
      (decision.fromEvidenceId === null || typeof decision.fromEvidenceId === "string") &&
      (decision.sourceKind === "native" ? /^[a-f0-9]{64}$/ : /^(?:v2:)?[a-f0-9]{64}$/).test(decision.fingerprint) && event.id === digest(decision) &&
      decision.sourceHash === sourceHash(decision.sourceKind, decision.recordId));
    groups.set(decision.sourceHash, [...(groups.get(decision.sourceHash) ?? []), { id: event.id, decision }]);
  }
  const result = new Map<string, SourceIndex>();
  for (const [hash, decisions] of groups) {
    const roots = decisions.filter(item => item.decision.fromEvidenceId === null);
    internal(roots.length === 1);
    let current = roots[0];
    const seen = new Set([current.id]);
    while (true) {
      const next = decisions.filter(item => item.decision.fromEvidenceId === current.decision.toEvidenceId);
      internal(next.length <= 1);
      if (!next.length) break;
      internal(!seen.has(next[0].id) && next[0].decision.fingerprint === current.decision.fingerprint);
      current = next[0]; seen.add(current.id);
    }
    internal(seen.size === decisions.length);
    result.set(hash, indexFrom(current.decision, current.id));
  }
  return result;
}

/** Full deterministic reconstruction; the index is checked against its event log. */
export function rebuildPersistedProjection(uid: string, evidenceRows: readonly Row[], sourceRows: readonly Row[], events: readonly Row[]) {
  const sources = rebuildSourceIndex(events);
  internal(sources.size === sourceRows.length);
  for (const row of sourceRows) internal(canonicalEvidence(row.data) === canonicalEvidence(sources.get(row.id)));
  const evidence = new Map<string, CompletedSessionEvidence>();
  for (const row of evidenceRows) {
    const stored = row.data as unknown as EvidenceRow;
    internal(stored.schemaVersion === 1);
    assertCompletedSessionEvidence(stored.evidence);
    internal(stored.evidence.owner.kind === "user" && stored.evidence.owner.uid === uid);
    const expected = stored.evidence.provenance.kind === "native" ? nativeId(stored.evidence.sessionId) : legacyId(stored.evidence.provenance.recordId!);
    internal(row.id === expected && events.some(item => item.data.toEvidenceId === row.id));
    evidence.set(row.id, stored.evidence);
  }
  const active = [...new Set([...sources.values()].map(item => item.evidenceId))].sort().map(id => {
    internal(evidence.has(id)); return evidence.get(id)!;
  });
  return { sources, active, profile: aggregateCompletedEvidence({ kind: "user", uid }, active) };
}

function originalReceipt(snapshot: Snapshot, uid: string, sessionId: string, hash: string): CompletionReceipt | null {
  if (!snapshot.exists) return null;
  const stored = snapshot.data() as unknown as EvidenceRow;
  internal(stored.schemaVersion === 1 && stored.evidence?.owner.kind === "user" && stored.evidence.owner.uid === uid &&
    stored.evidence.sessionId === sessionId && stored.evidence.provenance.kind === "native" &&
    stored.receipt?.schemaVersion === 1 && stored.receipt.status === "completed" && stored.receipt.evidenceId === snapshot.id &&
    Number.isSafeInteger(stored.receipt.profileRevision) && stored.receipt.profileRevision >= 1 &&
    stored.receipt.sessionId === sessionId && stored.receipt.requestHash === stored.requestHash);
  requireCompletion(stored.requestHash === hash, "completion_conflict", 409);
  return stored.receipt!;
}
function checkReservation(snapshot: Snapshot, sessionId: string, mode: string, selected: readonly string[]) {
  requireCompletion(snapshot.exists, "training_reservation_required", 403);
  const data = snapshot.data()!;
  requireCompletion(data.sessionId === sessionId && data.mode === mode && Array.isArray(data.methodIds), "training_reservation_mismatch", 409);
  const reserved = data.methodIds as unknown[];
  requireCompletion(mode === "auto" ? reserved.length === 0
    : canonicalEvidence(reserved) === canonicalEvidence(selected), "training_reservation_mismatch", 409);
  // Reservation path, not a body UID, proves ownership. No entitlement/day recheck.
}

/** Root latestAssessmentId names an assessment document, not necessarily a native
 * session. Resolve via owner-scoped source identities without inventing aliases.
 * A known save time is only an upper bound for an unknown historical completion;
 * it is never copied into evidence.completedAt or used as exposure chronology.
 * Unknown/unresolvable/conflicting bounds and ties preserve the current display.
 */
function canAdvanceLegacyProfile(previousId: unknown, incoming: CompletedSessionEvidence,
  sources: ReadonlyMap<string, SourceIndex>, evidenceRows: readonly Row[]): boolean {
  if (typeof previousId !== "string" || incoming.completedAt === null) return false;
  const ids = new Set([sources.get(sourceHash("legacy", previousId))?.evidenceId,
    sources.get(sourceHash("native", previousId))?.evidenceId].filter((id): id is string => id !== undefined));
  if (ids.size !== 1) return false;
  const previous = evidenceRows.find(row => ids.has(row.id))?.data.evidence as CompletedSessionEvidence | undefined;
  if (!previous || previous.mode !== "auto" || previous.completedAt !== null && previous.recordedAt !== null && previous.completedAt > previous.recordedAt) return false;
  const bound = previous.completedAt ?? previous.recordedAt;
  return bound !== null && incoming.completedAt > bound;
}

// Firestore set(..., {merge:true}) recursively preserves existing map fields;
// a shallow spread would underestimate the actual resulting root document.
function mergedDocument(current: Data, update: Data): Data {
  const map = (value: unknown): value is Data => typeof value === "object" && value !== null && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  return Object.fromEntries(Object.entries({ ...current, ...update }).map(([key, value]) => [key,
    Object.hasOwn(update, key) && map(value) && Object.keys(value).length > 0 && map(current[key])
      ? mergedDocument(current[key], value) : value]));
}

// Reuse the existing v1 identity/reservation/display protocols in the isolated
// Stage 2 writer. Export-only: no active v1 call path or persistence is changed.
export { sourceHash as completionSourceIdentity, nativeId as nativeCompletionIdentity,
  checkReservation as checkCompletionReservation, canAdvanceLegacyProfile,
  mergedDocument as mergeCompletionDocument };

export function createEmulatorTrainingCompletionService({ now = Date.now }: { now?: () => number } = {}) {
  const provider = createCompletionEmulatorFirestore();
  return { ...createTrainingCompletionService({ getFirestore: provider.getFirestore, now }), close: provider.close };
}

export function createTrainingCompletionService({
  getFirestore, now = Date.now, onPrepared
}: {
  getFirestore: () => CompletionDatabase;
  now?: () => number;
  // Test orchestration only, always outside the retryable transaction callback.
  onPrepared?: (attempt: number) => Promise<void>;
}) {
  return {
    async complete(uid: string, raw: unknown): Promise<CompletionReceipt> {
      const recordedAt = new Date(now()).toISOString();
      const validated = validateCompletion(uid, raw, recordedAt);
      const { request, evidence, legacy, requestHash } = validated;
      const firestore = getFirestore();
      const user = firestore.collection("users").doc(uid);
      const evidenceRef = user.collection("learningEvidence").doc(nativeId(request.sessionId));
      const coordinator = user.collection("learningProfiles").doc("cumulative");
      const reservationRef = user.collection("trainingReservations").doc(request.sessionId);
      const legacyRef = user.collection("assessments").doc(request.sessionId);
      const queries = historyCollections
        .map(name => user.collection(name).limit(name === "learningEvidence" || name === "assessments" ? COMPLETION_LIMITS.historyDocuments + 1 : COMPLETION_LIMITS.readDocuments + 1));
      for (let attempt = 0; attempt < COMPLETION_LIMITS.preparationAttempts; attempt++) {
        // Fast retry path: immutable receipt does not require history/quota to fit again.
        const existing = originalReceipt(await evidenceRef.get(), uid, request.sessionId, requestHash);
        if (existing) return existing;
        checkReservation(await reservationRef.get(), request.sessionId, request.mode, request.selectedMethods);
        const preparedRevision = revision(await coordinator.get());
        const snapshots = await Promise.all(queries.map(query => query.get()));
        // Fence nontransactional queries before interpreting a potentially mixed
        // native snapshot from concurrent atomic completions.
        if (revision(await coordinator.get()) !== preparedRevision) continue;
        const preparedRows = boundedRows(snapshots, uid);
        const [savedEvidence, assessments, savedSources, savedEvents] = preparedRows;
        const preparedHash = fingerprintFirestoreSource(preparedRows);
        const rebuilt = rebuildPersistedProjection(uid, savedEvidence, savedSources, savedEvents);
        // Never silently upgrade collision-prone pilot proofs. Immutable receipts
        // above remain recoverable, even if further reconciliation is required.
        for (const source of rebuilt.sources.values()) if (source.sourceKind === "legacy") {
          requireCompletion(source.fingerprint.startsWith("v2:"), "completion_fingerprint_upgrade_required", 409);
        }
        const nextEvidence = [...savedEvidence];
        const nextEvents = [...savedEvents];
        const nextSources = new Map(rebuilt.sources);
        const newEvidence: Row[] = [];
        const newEvents: Row[] = [];
        const changedSources = new Map<string, SourceIndex>();
        const addDecision = (sourceKind: "native" | "legacy", recordId: string, toEvidenceId: string, fingerprint: string) => {
          const hash = sourceHash(sourceKind, recordId);
          const prior = nextSources.get(hash);
          const decision: Decision = { schemaVersion: 1, sourceKind, recordId, sourceHash: hash,
            fromEvidenceId: prior?.evidenceId ?? null, toEvidenceId, fingerprint };
          const id = digest(decision);
          const row = { id, data: { ...decision } };
          nextEvents.push(row); newEvents.push(row);
          const index = indexFrom(decision, id);
          nextSources.set(hash, index); changedSources.set(hash, index);
        };
        for (const assessment of assessments) {
          const hash = sourceHash("legacy", assessment.id);
          const fingerprint = legacyAssessmentFingerprint(assessment.data);
          const prior = nextSources.get(hash);
          if (prior) requireCompletion(prior.fingerprint === fingerprint, "legacy_source_conflict", 409);
          if (assessment.id === request.sessionId) {
            requireCompletion(legacy !== null, "legacy_session_mode_conflict", 409);
            const keys = Object.keys(legacy!);
            const saved = Object.fromEntries(keys.map(key => [key, assessment.data[key]]));
            requireCompletion(canonicalEvidence(saved) === canonicalEvidence(legacy), "legacy_session_conflict", 409);
            if (prior) requireCompletion(prior.evidenceId.startsWith("legacy-"), "legacy_identity_conflict", 409);
            addDecision("legacy", assessment.id, evidenceRef.id, fingerprint);
            continue;
          }
          if (prior) continue;
          // IDs and save timestamps alone do not establish historical session linkage.
          const adapted = adaptLegacyAutomaticAssessment({ ownerUid: uid, assessmentId: assessment.id, assessment: assessment.data });
          requireCompletion(adapted.valid, "legacy_history_invalid", 409);
          const row: Row = { id: legacyId(assessment.id), data: { schemaVersion: 1, evidence: adapted.session } };
          newEvidence.push(row); nextEvidence.push(row);
          addDecision("legacy", assessment.id, row.id, fingerprint);
        }
        const createdLegacy = legacy === null ? null : { ...legacy, createdAt: new Date(recordedAt) };
        const targetExists = assessments.some(item => item.id === request.sessionId);
        if (createdLegacy !== null && !targetExists) addDecision("legacy", request.sessionId, evidenceRef.id, legacyAssessmentFingerprint(createdLegacy));
        addDecision("native", request.sessionId, evidenceRef.id, requestHash);
        // A temporary receipt is not evidence and never participates in aggregation.
        const nativeRow: Row = { id: evidenceRef.id, data: { schemaVersion: 1, evidence, requestHash,
          // Immutable completion details are retained, but are NEVER inputs to
          // objective aggregation. The request hash already covers these fields.
          ...(request.mode === "manual" ? { completionDetails: { schemaVersion: 1,
            methodIntroduction: request.methodIntroduction, reflection: request.reflection } } : {}),
          resultAuthority: "client-reported", selectionContextAuthority: "client-advisory" } };
        nextEvidence.push(nativeRow);
        requireCompletion(nextEvidence.length <= COMPLETION_LIMITS.historyDocuments &&
          assessments.length + Number(createdLegacy !== null && !targetExists) <= COMPLETION_LIMITS.historyDocuments &&
          nextEvidence.length + assessments.length + nextSources.size + nextEvents.length + Number(createdLegacy !== null && !targetExists) <= COMPLETION_LIMITS.readDocuments,
        "completion_capacity_exceeded", 409);
        const projected = rebuildPersistedProjection(uid, nextEvidence,
          [...nextSources].map(([id, data]) => ({ id, data: { ...data } })), nextEvents).profile;
        const cumulative = { persistenceVersion: 1, revision: preparedRevision + 1, profile: projected, updatedAt: recordedAt };
        internal(evidenceBytes(cumulative) <= 200 * 1024, "completion_projection_limit");
        if (onPrepared) await onPrepared(attempt);
        try {
          return await firestore.runTransaction(async transaction => {
            // All reads, including the bounded source queries, precede every write.
            const currentCoordinator = await transaction.get(coordinator);
            const completion = await transaction.get(evidenceRef);
            const reservation = await transaction.get(reservationRef);
            const currentUser = await transaction.get(user);
            const currentSnapshots = await Promise.all(queries.map(query => transaction.get(query)));
            const receipt = originalReceipt(completion, uid, request.sessionId, requestHash);
            if (receipt) return receipt;
            if (revision(currentCoordinator) !== preparedRevision || fingerprintFirestoreSource(boundedRows(currentSnapshots, uid)) !== preparedHash) throw new PreparationChanged();
            checkReservation(reservation, request.sessionId, request.mode, request.selectedMethods);
            const userData = currentUser.data();
            const previousId = userData?.latestAssessmentId;
            const updateLegacyProfile = legacy !== null && (userData?.learningProfile == null || previousId === request.sessionId ||
              canAdvanceLegacyProfile(previousId, evidence, nextSources, nextEvidence));
            const original: CompletionReceipt = { schemaVersion: 1, status: "completed", sessionId: request.sessionId,
              mode: request.mode, evidenceId: evidenceRef.id, requestHash, profileRevision: preparedRevision + 1,
              recordedAt, legacyAssessmentId: legacy === null ? null : request.sessionId, legacyProfileUpdated: updateLegacyProfile };
            const persistedNative = { ...nativeRow.data, receipt: original };
            // Validate the exact post-commit archive, including the original
            // receipt and unchanged legacy documents, before queuing ANY write.
            checkHistoryBytes([
              nextEvidence.map(row => row.id === evidenceRef.id ? { id: row.id, data: persistedNative } : row),
              createdLegacy !== null && !targetExists ? [...assessments, { id: legacyRef.id, data: createdLegacy }] : assessments,
              [...nextSources].map(([id, data]) => ({ id, data: { ...data } })), nextEvents
            ], uid, true);
            assertCompletionDocumentBudget(`users/${uid}/learningProfiles/cumulative`, cumulative);
            const legacyProfileUpdate = updateLegacyProfile ? { learningProfile: legacy!.learningProfile,
              latestAssessmentId: request.sessionId, learningProfileUpdatedAt: new Date(recordedAt) } : null;
            if (legacyProfileUpdate) assertCompletionDocumentBudget(`users/${uid}`, mergedDocument(userData ?? {}, legacyProfileUpdate));
            transaction.create(evidenceRef, persistedNative);
            for (const row of newEvidence) transaction.create(user.collection("learningEvidence").doc(row.id), row.data);
            for (const row of newEvents) transaction.create(user.collection("learningEvidenceIdentityEvents").doc(row.id), row.data);
            for (const [id, index] of changedSources) transaction.set(user.collection("learningEvidenceSourceIndex").doc(id), { ...index });
            transaction.set(coordinator, cumulative);
            if (createdLegacy !== null && !targetExists) transaction.create(legacyRef, createdLegacy);
            if (legacyProfileUpdate) transaction.set(user, legacyProfileUpdate, { merge: true });
            return original;
          });
        } catch (error) {
          if (error instanceof PreparationChanged) continue;
          throw error;
        }
      }
      throw new CompletionError(503, "completion_contention");
    }
  };
}
