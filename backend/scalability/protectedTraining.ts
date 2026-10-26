import { createStage2EmulatorTransport } from "./acceptanceTransport";
import { createStage2AcceptanceService } from "./acceptance";
import { createSharedWriterGuard } from "./writerGuard";
import { readSealParticipant, queueSealParticipant } from "./sealingCoordination";
import { createInventorySealer } from "./sealing";
import { createOriginPrototype } from "./origin";
import { assertProtectedTrainingEnvironment, prepareProtectedTraining } from "./protectedTrainingPolicy";
import type { FrozenCompletionIdentity } from "./protectedTrainingRecovery";
import { createFirebaseTrainingQuotaManager } from "../../trainingQuota.js";
import { CompletionError, validateCompletion, requireCompletion } from "../trainingCompletionContract";
import { ScalabilityContractError, requireContract, copyJSON, jsonBytes } from "./values";

/** Separate synthetic-student service. No constructor accepts a client UID,
 * database, admission proof, bypass boolean or external authority provider. */
export function createProtectedTrainingService() {
  assertProtectedTrainingEnvironment();
  const transport = createStage2EmulatorTransport(), guard = createSharedWriterGuard(transport);
  const acceptance = createStage2AcceptanceService(transport, { protectedDevelopment: true });
  const sealer = createInventorySealer(), origin = createOriginPrototype();
  const preparations = new Map<string, { completion: FrozenCompletionIdentity; pending: Promise<void> }>();
  async function owner(token: string) {
    assertProtectedTrainingEnvironment(); const principal = await guard.authenticate(token);
    const observation = await origin.recover(token);
    requireContract(observation.state === "EXTERNAL_TRUST_NOT_ENFORCED", "protected_training_origin_unavailable_or_revoked");
    await guard.transaction(async tx => { const p = await guard.read(tx, principal); guard.assertDevelopmentTrainingAccess(p, tx); }, { readOnly: true });
    return principal;
  }
  async function prepare(token: string, completion: FrozenCompletionIdentity) {
    const principal = await owner(token);
    const inspectEnrollment = () => prepareProtectedTraining(guard, principal, completion);
    const plan = await inspectEnrollment();
    if (plan.kind !== "enrolled") {
      try {
        const handle = plan.kind === "resume" ? plan.handle : await sealer.begin(token, plan.request);
        const result = await sealer.run(token, handle);
        requireContract(result.consistency === "COORDINATED_SNAPSHOT_SEALED" && result.admission === "NOT VERIFIED" &&
          result.admitted === false && result.publicationEligible === false, "protected_training_seal_required");
        await acceptance.enrollProtectedOwner(token, handle);
      } catch (error) {
        // Another identical request can finish enrollment and atomically reopen
        // the seal while this scan is still checking its old cutoff. Accept only
        // a fully revalidated CURRENT enrollment, never the stale scan result.
        try { if ((await inspectEnrollment()).kind === "enrolled") return; } catch { /* retain original failure */ }
        throw error;
      }
    }
  }
  function quota(principal: Awaited<ReturnType<typeof owner>>) {
    const db = transport.getFirestore();
    // Reuse the unchanged quota algorithm. Its writes participate in the same
    // owner/seal transaction; quota idempotent reads do not advance source state.
    const coordinated = {
      collection: db.collection.bind(db),
      runTransaction: (callback: (tx: import("firebase-admin/firestore").Transaction) => Promise<unknown>) => guard.transaction(async tx => {
        const p = await guard.read(tx, principal); guard.assertDevelopmentTrainingAccess(p, tx);
        const c = await readSealParticipant(tx, p, "v2-acceptance"); let wrote = false;
        // Do not Proxy the frozen guard facade: JavaScript requires exact values
        // for its non-configurable methods. Wrap only the quota manager surface.
        const methods = tx as unknown as Record<string, (...args: unknown[]) => unknown>;
        const facade: Record<string, (...args: unknown[]) => unknown> = {};
        for (const key of ["get", "getAll"]) facade[key] = (...args) => methods[key](...args);
        for (const key of ["set", "update", "create", "delete"]) facade[key] = (...args) => { wrote = true; methods[key](...args); return facade; };
        const result = await callback(Object.freeze(facade) as unknown as import("firebase-admin/firestore").Transaction);
        if (wrote) queueSealParticipant(tx, c); return result;
      })
    };
    return createFirebaseTrainingQuotaManager({ getFirestore: () => coordinated });
  }
  return Object.freeze({
    async complete(token: string, payload: unknown) {
      try {
        const principal = await guard.authenticate(token);
        const input = copyJSON(payload); requireCompletion(jsonBytes(input) <= 64 * 1024, "completion_too_large", 413);
        const validated = validateCompletion(principal.uid, input, new Date().toISOString());
        const completion = { sessionId: validated.request.sessionId, requestHash: validated.requestHash };
        let preparation = preparations.get(principal.uid);
        if (preparation) {
          requireCompletion(preparation.completion.sessionId !== completion.sessionId || preparation.completion.requestHash === completion.requestHash,
            "completion_conflict", 409);
          await preparation.pending;
          if (preparation.completion.sessionId !== completion.sessionId) await prepare(token, completion);
        } else {
          requireCompletion(preparations.size < 1024, "protected_training_busy", 503);
          const pending = prepare(token, completion).finally(() => { if (preparations.get(principal.uid) === preparation) preparations.delete(principal.uid); });
          preparation = { completion, pending }; preparations.set(principal.uid, preparation); await pending;
        }
        await owner(token); return await acceptance.accept(token, input);
      }
      catch (error) {
        if (error instanceof ScalabilityContractError) throw new CompletionError(409, error.code);
        throw error;
      }
    },
    async access(token: string, timezone: string) { const p = await owner(token); return quota(p).getAccess(p.uid, timezone); },
    async reserve(token: string, payload: unknown) { const p = await owner(token); return quota(p).reserve(p.uid, payload); },
    async close() { await sealer.close(); await origin.close(); await transport.close(); }
  });
}
