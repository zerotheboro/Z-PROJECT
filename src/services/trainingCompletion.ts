import type { CompletionRequest } from "../../backend/trainingCompletionContract";
import type { ClientCompletionReceipt, CompletionTarget } from "./trainingCompletionReceipt";
import { validateClientCompletionReceipt } from "./trainingCompletionReceipt";
import type { TrainingDraft } from "../quiz/trainingProgress";
import type { CompletionEntry, CompletionOutbox } from "./trainingCompletionOutbox";
import { canonicalCompletionJSON, CompletionOutboxError } from "./trainingCompletionOutbox";
import { isTrainingMethodId } from "../quiz/type";
import { normalizeEvidenceTimestamp } from "../quiz/learningEvidence";

export type CompletionTransport = (uid: string, payloadJSON: string) => Promise<ClientCompletionReceipt>;
export type CompletionDependencies = {
  outbox: CompletionOutbox;
  assertOwner: (uid: string) => void;
  hasReservation: (draft: Pick<TrainingDraft, "owner" | "sessionId" | "mode" | "selectedMethods">) => Promise<boolean>;
  completeLegacy?: (entry: CompletionEntry, payload: CompletionRequest) => Promise<void>;
  transport: CompletionTransport;
  recordActivity: (entry: CompletionEntry, payload: CompletionRequest) => Promise<void>;
  clearDraft: (uid: string, sessionId: string) => Promise<void>;
  timeZone: () => string;
  target?: CompletionTarget;
  allowLegacy?: boolean;
};

export type LegacyCompletionReceipt = { schemaVersion: 1; status: "legacy-completed"; sessionId: string; mode: "auto" | "manual" };

export function completionFromDraft(draft: TrainingDraft, completedAt: string | null = null): CompletionRequest {
  const { methodIntroduction, methodLab, methodMatch, reflection, learningSituation, baseline } = draft.completed;
  if (!methodIntroduction || !methodLab || !methodMatch || !reflection ||
    draft.mode === "auto" && (!learningSituation || !baseline)) {
    throw new CompletionOutboxError("completion_incomplete", "Completed Training results are incomplete. The draft was kept.");
  }
  // Only a newly observed Reflection completion supplies completedAt. A resumed
  // historical final-save draft has unknown timing; never use recovery time.
  return {
    schemaVersion: 1, sessionId: draft.sessionId, mode: draft.mode,
    selectedMethods: [...draft.selectedMethods], methodIntroduction, methodLab, methodMatch, reflection,
    ...(draft.mode === "auto" ? { learningSituation: learningSituation!, baseline: baseline! } : {}),
    completedAt: normalizeEvidenceTimestamp(completedAt),
    selectionContext: { kind: draft.mode === "manual" ? "manual" : draft.selectedMethods.length === 3 ? "ai-confirmed" : "traditional", nominatedMethodIds: [] },
    metadata: [
      ...draft.selectedMethods.map((methodId, index) => ({ methodId, phase: "lab" as const,
        context: { contentSetId: draft.labContentSetIds[index] ?? null } })),
      ...methodMatch.methods.map(item => {
        if (!isTrainingMethodId(item.method)) throw new CompletionOutboxError("invalid_method", "Unknown verification method; the draft was kept.");
        return { methodId: item.method, phase: "match" as const,
          context: { contentSetId: draft.matchContentSetIds[draft.verificationMethodOrder.findIndex(method => method === item.method)] ?? null } };
      })
    ]
  };
}

export function createTrainingCompletionClient(deps: CompletionDependencies) {
  const check = (uid: string) => deps.assertOwner(uid);
  return {
    async prepare(draft: TrainingDraft, completedAt: string | null = null): Promise<CompletionEntry | null> {
      if (draft.owner.kind !== "user") return null;
      const uid = draft.owner.uid; check(uid);
      // Capture completed results before any await. Do not retain caller-owned
      // result objects while a reservation lookup or another tab is running.
      const snapshot: TrainingDraft = { ...draft, owner: { ...draft.owner }, selectedMethods: [...draft.selectedMethods],
        labContentSetIds: [...draft.labContentSetIds], matchContentSetIds: [...draft.matchContentSetIds],
        verificationMethodOrder: [...draft.verificationMethodOrder], completed: structuredClone(draft.completed) };
      // No reservation lookup, HTTP request or token retrieval before the
      // strict IndexedDB commit. Also retain the full draft, without changing
      // its Firestore schema, for local recovery of all completed session data.
      const entry = await deps.outbox.freeze(uid, completionFromDraft(snapshot, completedAt), deps.timeZone(),
        new Date().toISOString(), JSON.stringify(snapshot), deps.target ?? "v1"); check(uid);
      return entry;
    },
    async list(uid: string) { check(uid); const entries = await deps.outbox.list(uid); check(uid); return entries; },
    async get(uid: string, sessionId: string) { check(uid); const entry = await deps.outbox.get(uid, sessionId); check(uid); return entry; },
    async resume(uid: string, sessionId: string): Promise<ClientCompletionReceipt | LegacyCompletionReceipt> {
      check(uid);
      const token = crypto.randomUUID();
      let entry: CompletionEntry = await deps.outbox.claim(uid, sessionId, token);
      try {
        check(uid);
        const target = deps.target ?? "v1";
        if ((entry.target ?? "v1") !== target) throw new CompletionOutboxError("completion_target_changed",
          "This completion belongs to a different local protocol. Restore its original configuration; the exact saved work was retained.");
        const payload = JSON.parse(entry.payloadJSON) as CompletionRequest;
        if (entry.reservationStatus === "pending") {
          const reserved = await deps.hasReservation({ owner: { kind: "user", uid }, sessionId,
            mode: payload.mode, selectedMethods: [...payload.selectedMethods] }); check(uid);
          if (!reserved && (target === "protected-v2" || deps.allowLegacy === false)) throw new CompletionOutboxError("protected_reservation_required",
            "Protected Training requires its original reservation. The completed evidence was retained; no legacy save or new quota reservation was attempted.");
          entry = await deps.outbox.update(uid, sessionId, token, { reservationStatus: reserved ? "verified" : "legacy" }); check(uid);
        }
        if (entry.reservationStatus === "legacy") {
          if (target === "protected-v2" || deps.allowLegacy === false) throw new CompletionOutboxError("protected_legacy_forbidden", "Protected Training cannot use legacy browser saves. Completed work was retained.");
          if (!entry.legacySaved) {
            if (!deps.completeLegacy) throw new CompletionOutboxError("legacy_completion_required", "This grandfathered session needs its existing legacy save. Its browser checkpoint was retained; no quota was reserved.");
            await deps.completeLegacy(entry, payload); check(uid);
            entry = await deps.outbox.update(uid, sessionId, token, { legacySaved: true }); check(uid);
          }
        } else {
        const hash = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
          new TextEncoder().encode(canonicalCompletionJSON(value))))).map(byte => byte.toString(16).padStart(2, "0")).join("");
        const requestHash = await hash({ contract: "training-complete-v1", uid, request: payload });
        const evidenceId = `session-${await hash(sessionId)}`;
        check(uid);
        // Protected retries recheck current lifecycle/revocation at the backend,
        // even when a prior acknowledgment is already stored locally.
        const raw = target === "protected-v2" ? await deps.transport(uid, entry.payloadJSON) : entry.receipt ?? await deps.transport(uid, entry.payloadJSON); check(uid);
        const receipt = validateClientCompletionReceipt(raw, { sessionId, mode: payload.mode, requestHash, evidenceId }, target);
        if (entry.receipt && canonicalCompletionJSON(entry.receipt) !== canonicalCompletionJSON(receipt))
          throw new CompletionOutboxError("completion_conflict", "The original server receipt changed. Saved work was retained for investigation.");
        if (!entry.receipt) {
          entry = await deps.outbox.update(uid, sessionId, token, { receipt }); check(uid);
        }
        }
        if (!entry.activityDone) {
          await deps.recordActivity(entry, payload); check(uid);
          entry = await deps.outbox.update(uid, sessionId, token, { activityDone: true }); check(uid);
        }
        if (!entry.finalized) {
          await deps.clearDraft(uid, sessionId); check(uid);
          entry = await deps.outbox.update(uid, sessionId, token, { finalized: true }); check(uid);
        }
        return entry.receipt ?? { schemaVersion: 1, status: "legacy-completed", sessionId, mode: payload.mode };
      } finally {
        // Release only this claim. A crashed tab's claim expires; duplicate HTTP
        // requests remain safe because all claimants send the frozen JSON bytes.
        await deps.outbox.release(uid, sessionId, token);
      }
    }
  };
}

export type TrainingCompletionClient = ReturnType<typeof createTrainingCompletionClient>;
