import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";
import type { CumulativeProfileView, ProfileRow } from "../quiz/cumulativeProfileView";
import { buildAcceptedProfilePreview } from "./acceptedProfilePreview";
import type { AcceptedPreviewStatus } from "./acceptedProfilePreview";
import type { SyntheticPublicationStatus } from "./syntheticPublishedProfile";

export type PendingCompletionStatus = { sessionId: string; acknowledged: boolean; legacy: boolean };
export type CumulativeProfileSnapshot = CumulativeProfileView & {
  pending: PendingCompletionStatus[]; browserStorageVerified: boolean; preview?: AcceptedPreviewStatus;
  publication?: SyntheticPublicationStatus;
};
export type CumulativeReadRepository = {
  summary(uid: string): Promise<unknown | null>;
  evidence(uid: string): Promise<ProfileRow[]>;
  legacy(uid: string): Promise<ProfileRow[]>;
  pending(uid: string): Promise<PendingCompletionStatus[]>;
};

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
      return { ...(options.acceptedPreview ? buildAcceptedProfilePreview(uid, evidence, legacy)
        : buildCumulativeProfileView(uid, after, evidence, legacy)), pending, browserStorageVerified };
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
