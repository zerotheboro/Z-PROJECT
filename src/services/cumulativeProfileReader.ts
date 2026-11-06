import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";
import type { CumulativeProfileView, ProfileRow } from "../quiz/cumulativeProfileView";
import { buildAcceptedProfilePreview } from "./acceptedProfilePreview";
import type { AcceptedPreviewStatus } from "./acceptedProfilePreview";
import type { SyntheticPublicationStatus } from "./syntheticPublishedProfile";
import { completedEvidenceSourceKey } from "../quiz/completedEvidenceIdentity";
import { assertCompletedSessionEvidence } from "../quiz/learningEvidence";

export type PendingCompletionStatus = { sessionId: string; acknowledged: boolean; legacy: boolean };
/** Read-model only: preserved after existing snapshot verification, never a
 * new persistence/acceptance contract. Private completion details are omitted. */
export type StrategyEvidenceSnapshot = { ownerUid: string; scope: "accepted-history" | "published-generation";
  rows: ProfileRow[]; pendingAcceptedSessions: number; legacyReportsExcluded: boolean;
  acceptanceHead?: { revision: number; lifecycleEpoch: number | null; basis: "visible-v2-receipts" | "server-journal-head" } };
export type CumulativeProfileSnapshot = CumulativeProfileView & {
  pending: PendingCompletionStatus[]; browserStorageVerified: boolean; preview?: AcceptedPreviewStatus;
  publication?: SyntheticPublicationStatus;
  strategyEvidence?: StrategyEvidenceSnapshot;
};
export type CumulativeReadRepository = {
  summary(uid: string): Promise<unknown | null>;
  evidence(uid: string): Promise<ProfileRow[]>;
  legacy(uid: string): Promise<ProfileRow[]>;
  pending(uid: string): Promise<PendingCompletionStatus[]>;
};

export function strategyEvidenceSnapshot(uid: string, view: CumulativeProfileView, rows: readonly ProfileRow[],
  scope: StrategyEvidenceSnapshot["scope"], pendingAcceptedSessions = 0, serverAcceptanceRevision?: number): StrategyEvidenceSnapshot | undefined {
  if (!view.coverageComplete) return undefined;
  const active = new Set(view.history.filter(h => h.serverRecorded).map(h => completedEvidenceSourceKey(h.evidence)));
  const selected: ProfileRow[] = [];
  for (const row of rows) {
    const data = row.data as Record<string, unknown>;
    assertCompletedSessionEvidence(data.evidence);
    if (!active.has(completedEvidenceSourceKey(data.evidence))) continue;
    selected.push({ id: row.id, data: { schemaVersion: data.schemaVersion, evidence: data.evidence,
      ...(data.evidence.provenance.kind === "native" ? { receipt: data.receipt, requestHash: data.requestHash } : {}),
      ...(data.objectiveEvidence !== undefined ? { objectiveEvidence: data.objectiveEvidence } : {}),
      ...(data.materialPresentations !== undefined ? { materialPresentations: data.materialPresentations } : {}) } });
  }
  const receipts = selected.flatMap(row => {
    const data = row.data as Record<string, unknown>;
    return data.receipt ? [data.receipt as { schemaVersion: number; acceptedRevision?: number; lifecycleEpoch?: number }] : [];
  });
  const v2 = receipts.length === selected.length && receipts.every(r => r.schemaVersion === 2 && Number.isSafeInteger(r.acceptedRevision) &&
    r.acceptedRevision! > 0 && Number.isSafeInteger(r.lifecycleEpoch) && r.lifecycleEpoch! > 0);
  const epochs = new Set(receipts.map(r => r.lifecycleEpoch));
  const visibleRevision = Math.max(0, ...receipts.map(r => r.acceptedRevision ?? 0));
  if (serverAcceptanceRevision !== undefined && (!Number.isSafeInteger(serverAcceptanceRevision) || serverAcceptanceRevision < visibleRevision)) throw new Error("Acceptance cutoff mismatch.");
  const acceptanceHead = v2 && epochs.size <= 1 && (pendingAcceptedSessions === 0 || serverAcceptanceRevision !== undefined) ? {
    revision: serverAcceptanceRevision ?? visibleRevision, lifecycleEpoch: receipts[0]?.lifecycleEpoch ?? null,
    basis: serverAcceptanceRevision === undefined ? "visible-v2-receipts" as const : "server-journal-head" as const } : undefined;
  return { ownerUid: uid, scope, rows: selected, pendingAcceptedSessions, legacyReportsExcluded: false, ...(acceptanceHead ? { acceptanceHead } : {}) };
}

/** Read-only, injectable repository. No profile aggregation, persistence or quota calls. */
export function createCumulativeProfileReader(repository: CumulativeReadRepository, assertOwner: (uid: string) => void,
  options: { acceptedPreview?: boolean } = {}) {
  const load = async (uid: string): Promise<CumulativeProfileSnapshot> => {
    assertOwner(uid);
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = await repository.summary(uid); assertOwner(uid);
      const [evidence, legacy] = await Promise.all([repository.evidence(uid), repository.legacy(uid)]); assertOwner(uid);
      if (evidence.length > 100 || legacy.length > 100) throw new Error("The local history limit has been reached. No partial history was presented as complete.");
      if (new TextEncoder().encode(JSON.stringify([evidence, legacy])).length > 3 * 1024 * 1024) throw new Error("The local history byte limit has been reached. No partial history was presented as complete.");
      const after = await repository.summary(uid); assertOwner(uid);
      if (JSON.stringify(before) !== JSON.stringify(after)) continue;
      if (options.acceptedPreview) {
        const [evidenceAfter, legacyAfter] = await Promise.all([repository.evidence(uid), repository.legacy(uid)]); assertOwner(uid);
        if (JSON.stringify(evidence) !== JSON.stringify(evidenceAfter) || JSON.stringify(legacy) !== JSON.stringify(legacyAfter)) continue;
      }
      let pending: PendingCompletionStatus[] = [], browserStorageVerified = true;
      try { pending = await repository.pending(uid); } catch { browserStorageVerified = false; }
      assertOwner(uid);
      const view = options.acceptedPreview ? buildAcceptedProfilePreview(uid, evidence, legacy)
        : buildCumulativeProfileView(uid, after, evidence, legacy);
      const strategyEvidence = strategyEvidenceSnapshot(uid, view, evidence, "accepted-history") ??
        (after === null && evidence.length === 0 ? { ownerUid: uid, scope: "accepted-history" as const, rows: [],
          pendingAcceptedSessions: 0, legacyReportsExcluded: legacy.length > 0 } : undefined);
      return { ...view, pending, browserStorageVerified, ...(strategyEvidence ? { strategyEvidence } : {}) };
    }
    throw new Error("Your recorded history changed while loading. Refresh to view a consistent snapshot.");
  };
  return async (uid: string): Promise<CumulativeProfileSnapshot> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([load(uid), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Local evidence lookup timed out. Refresh when the demo Emulators are available.")), 20_000);
      })]);
    } finally { clearTimeout(timer); }
  };
}
