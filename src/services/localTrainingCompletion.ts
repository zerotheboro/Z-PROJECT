import { doc, getDocFromServer } from "firebase/firestore";
import { auth, db } from "../firebase";
import { localCompletionConfig } from "./localTrainingCompletionConfig";
import { createCompletionOutbox, CompletionOutboxError } from "./trainingCompletionOutbox";
import { createTrainingCompletionClient } from "./trainingCompletion";
import type { TrainingCompletionClient } from "./trainingCompletion";
import type { ClientCompletionReceipt } from "./trainingCompletionReceipt";
import type { User } from "firebase/auth";
import { recordTrainingCompletion } from "./trainingStreak";
import { discardTrainingDraft } from "./trainingProgress";
import { getBrowserTimeZone } from "../quiz/trainingStreak";
import { saveAssessment } from "./assessment";
import { buildLearningProfile } from "../quiz/profileBuilder";
import type { TrainingDraft } from "../quiz/trainingProgress";

let cached: { user: User; client: TrainingCompletionClient } | undefined;

/** No production transport exists here. Tokens and data are sent only to the
 * explicitly configured loopback backend, from the separate demo Firebase app. */
export function getLocalTrainingCompletionClient(): TrainingCompletionClient | null {
  const config = localCompletionConfig();
  if (!config) return null;
  const user = auth.currentUser;
  if (!user) return null;
  if (auth.app.options.projectId !== config.projectId || db.app.options.projectId !== config.projectId) {
    throw new CompletionOutboxError("completion_not_isolated", "Local completion requires the isolated demo Firebase app.");
  }
  if (cached?.user === user) return cached.client;
  const check = (uid: string) => {
    if (auth.currentUser !== user || user.uid !== uid) throw new CompletionOutboxError("completion_owner_changed",
      "Sign-in changed. Completed work was retained for its original account; sign back in to recover it.");
  };
  const client = createTrainingCompletionClient({
    target: config.target ?? "v1", allowLegacy: config.target !== "protected-v2",
    outbox: createCompletionOutbox(config.projectId), assertOwner: check, timeZone: getBrowserTimeZone,
    async hasReservation(draft) {
      check(user.uid);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const reservation = await Promise.race([
        getDocFromServer(doc(db, "users", user.uid, "trainingReservations", draft.sessionId)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CompletionOutboxError("reservation_unavailable",
          "The local reservation could not be checked. Keep your draft and retry; no new quota was charged.")), 10_000); })
      ]).finally(() => clearTimeout(timer));
      check(user.uid);
      if (!reservation.exists()) return false; // Grandfathered draft: do not reserve retroactively.
      const data = reservation.data();
      const expected = draft.mode === "auto" ? [] : draft.selectedMethods;
      if (data.sessionId !== draft.sessionId || data.mode !== draft.mode || JSON.stringify(data.methodIds) !== JSON.stringify(expected)) {
        throw new CompletionOutboxError("training_reservation_mismatch", "The existing Training reservation does not match. Completed work and draft were retained.");
      }
      return true;
    },
    async transport(uid, payloadJSON) {
      check(uid);
      const controller = new AbortController();
      const timeoutError = new CompletionOutboxError("completion_timeout", "The local completion request timed out. Its exact payload was retained; retry safely.");
      const timer = setTimeout(() => controller.abort(timeoutError), 20_000);
      let stopWaiting = () => {};
      try {
      const token = await Promise.race([user.getIdToken(), new Promise<never>((_, reject) => {
        const abort = () => reject(timeoutError);
        controller.signal.addEventListener("abort", abort, { once: true });
        stopWaiting = () => controller.signal.removeEventListener("abort", abort);
      })]);
      check(uid); controller.signal.throwIfAborted();
      const endpoint = config.target === "protected-v2" ? "/api/development/training/complete-protected-v2" : "/api/training/complete";
      const response = await fetch(`${config.apiBase}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: payloadJSON, signal: controller.signal, redirect: "error"
      });
      check(uid);
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        const code = typeof body.code === "string" ? body.code : "completion_unavailable";
        const reason = response.status === 401 ? "Sign in again to the same account, then retry."
          : code === "completion_conflict" ? "The server already has different results for this session. Keep the saved work and contact support."
            : ["stage2_account_not_active", "writer_account_not_active", "protected_training_origin_unavailable_or_revoked"].includes(code)
              ? "The local account's completion authority is no longer available. Keep the saved work for operator review; no legacy save was attempted."
            : code.startsWith("seal_")
              ? "The local account's inventory seal is busy, invalid or revoked. Keep the saved work and retry after the account has been reviewed."
            : ["completion_capacity_exceeded", "completion_document_limit", "completion_fingerprint_upgrade_required", "protected_training_inventory_capacity",
              "stage2_record_limit", "stage2_transaction_limit", "stage2_write_limit"].includes(code)
              ? "The server needs capacity or historical-data reconciliation. Keep the saved work and contact support."
              : [400, 403, 413].includes(response.status)
                ? "The server rejected this completion's data, size or reservation. Keep the saved work and contact support."
              : "The server did not acknowledge completion. Retry when the local backend is available.";
        throw new CompletionOutboxError(code, `${reason} Your durable completion was retained.`);
      }
      return body as ClientCompletionReceipt;
      } finally { stopWaiting(); clearTimeout(timer); }
    },
    async completeLegacy(entry, payload) {
      check(entry.uid);
      if (config.target === "protected-v2" || entry.target === "protected-v2" || entry.uid.startsWith("b1_")) {
        throw new CompletionOutboxError("protected_legacy_forbidden", "Protected Training cannot use legacy browser saves. Its completed work was retained.");
      }
      const [root, fence] = await Promise.all([
        getDocFromServer(doc(db, "users", entry.uid)),
        getDocFromServer(doc(db, "users", entry.uid, "learningProfiles", "cumulative"))
      ]); check(entry.uid);
      if (root.exists() && root.data().trainingLifecycleBinding !== undefined || fence.exists() && fence.data().persistenceVersion !== 1)
        throw new CompletionOutboxError("protected_legacy_forbidden", "Protected Training cannot use legacy browser saves. Its completed work was retained.");
      if (!root.exists()) throw new CompletionOutboxError("legacy_owner_unverified", "The account's legacy status could not be verified. Completed work was retained; no browser assessment write was attempted.");
      if (payload.mode === "auto") {
        const frozen = entry.draftJSON ? JSON.parse(entry.draftJSON) as TrainingDraft : null;
        await saveAssessment({ userId: entry.uid, sessionId: entry.sessionId,
          learningSituation: payload.learningSituation!, baseline: payload.baseline!,
          methodIntroduction: payload.methodIntroduction, methodLab: payload.methodLab,
          methodMatch: payload.methodMatch, reflection: payload.reflection,
          learningProfile: frozen?.completed.learningProfile ?? buildLearningProfile({ baseline: payload.baseline!,
            methodIntroduction: payload.methodIntroduction, methodLab: payload.methodLab,
            methodMatch: payload.methodMatch, reflection: payload.reflection }) });
      }
      check(entry.uid);
    },
    async recordActivity(entry, payload) {
      check(entry.uid);
      await recordTrainingCompletion({ owner: { kind: "user", uid: entry.uid }, sessionId: entry.sessionId,
        mode: payload.mode, methodIds: payload.selectedMethods }, { now: new Date(entry.frozenAt), timeZone: entry.timeZone });
      check(entry.uid);
    },
    async clearDraft(uid, sessionId) { check(uid); await discardTrainingDraft({ kind: "user", uid }, sessionId); check(uid); }
  });
  cached = { user, client };
  return client;
}
