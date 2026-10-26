import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createAuthorityPrototype } from "./authority";
import { AUTHORITY_PROTOCOL, AUTHORITY_WRITER, LIFECYCLE_COLLECTION, SOURCE_CATALOG, SOURCE_NAMESPACE_VERSION, parseStoredLifecycle } from "./authorityContracts";
import { BOOTSTRAP_COLLECTION, parseGenesis, parseInventoryPin } from "./bootstrapContracts";
import { metadataTime, newInventoryMetrics, readBootstrapInventory } from "./bootstrapInventory";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { createOriginTransport, assertOriginEnvironment } from "./originTransport";
import { createOriginStore } from "./originStore";
import { ORIGIN_CLAIM, ORIGIN_LIMITS, ORIGIN_PROTOCOL, genesisForOrigin, makeOriginAttestation, makeOriginIntent,
  originCommitment, originRequest, originStatus } from "./originContracts";
import type { OriginLedger, OriginCommitment } from "./originContracts";
import { canonicalJSON, object, requireContract, typedHash } from "./values";

type Boundary = "before-intent" | "intent-recorded" | "auth-started" | "auth-created-before-claims" | "auth-before-checkpoint" | "auth-created" |
  "genesis-started" | "genesis-before-checkpoint" | "genesis-recorded" | "finalized";
type Options = { onBoundary?: (boundary: Boundary, uid: string) => Promise<void> };
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
class OriginMismatch extends Error {
  constructor(readonly reason: "auth-incarnation-changed" | "root-incarnation-changed" | "lifecycle-closed" | "epoch-changed") { super(reason); }
}

/** NEW isolated operator harness. No HTTP route, onboarding, completion writer,
 * publisher, authority-provider injection, signing key or trusted-state branch.
 * Durable records support consistency recovery, not independently enforced IAM. */
export function createOriginPrototype(options: Options = {}) {
  assertOriginEnvironment(); const transport = createOriginTransport(), store = createOriginStore(transport), coordinator = createAuthorityPrototype();
  const app = transport.application, db = () => { assertOriginEnvironment(); return app.getFirestore(); };
  const boundary = (name: Boundary, uid: string) => options.onBoundary?.(name, uid) ?? Promise.resolve();
  function refs(uid: string) {
    const root = db().doc(`users/${uid}`), life = db().doc(`${LIFECYCLE_COLLECTION}/${uid}`);
    return { root, life, genesis: db().doc(`${BOOTSTRAP_COLLECTION}/${uid}`), fence: root.collection("learningProfiles").doc("cumulative") };
  }
  async function authMatches(ledger: OriginLedger) {
    let user;
    try { user = await app.getAuthClient().getUser(ledger.intent.uid); }
    catch (error) { if ((error as { code?: unknown })?.code === "auth/user-not-found") throw new OriginMismatch("auth-incarnation-changed"); throw error; }
    if (new Date(user.metadata.creationTime).toISOString() !== ledger.authCreatedAt ||
      user.customClaims?.[ORIGIN_CLAIM] !== ledger.intent.incarnationId || user.customClaims?.originStage4b2Protocol !== ORIGIN_PROTOCOL)
      throw new OriginMismatch("auth-incarnation-changed");
    return user;
  }
  async function sourceCommitment(ledger: OriginLedger, token?: string): Promise<OriginCommitment> {
    await authMatches(ledger); const i = ledger.intent, r = refs(i.uid);
    const [root, life, genesis, fence] = await db().runTransaction(tx => tx.getAll(r.root, r.life, r.genesis, r.fence), { readOnly: true });
    if (!life.exists) throw new OriginMismatch("lifecycle-closed");
    const lifecycle = parseStoredLifecycle(life.data());
    if (lifecycle.lifecycleEpoch !== i.lifecycleEpoch || lifecycle.uid !== i.uid) throw new OriginMismatch("epoch-changed");
    if (lifecycle.state !== "active") throw new OriginMismatch("lifecycle-closed");
    if (!root.exists || !genesis.exists || !fence.exists || root.data()!.uid !== i.uid || root.data()!.trainingLifecycleBinding !== i.rootBinding ||
      lifecycle.rootBinding !== i.rootBinding || !same(fence.data(), { persistenceVersion: 3, writerProtocol: AUTHORITY_PROTOCOL,
        uid: i.uid, lifecycleEpoch: i.lifecycleEpoch, rootBinding: i.rootBinding })) throw new OriginMismatch("root-incarnation-changed");
    const g = parseGenesis(genesis.data()), expected = genesisForOrigin(i, ledger.authCreatedAt!);
    if (!same(g, expected) || !root.createTime!.isEqual(life.createTime!) || !root.createTime!.isEqual(genesis.createTime!) ||
      !root.createTime!.isEqual(fence.createTime!)) throw new OriginMismatch("root-incarnation-changed");
    const sourceCreatedAt = metadataTime(root.createTime!);
    const commitment = originCommitment(i, { schemaVersion: 1, protocol: ORIGIN_PROTOCOL, uid: i.uid, lifecycleEpoch: i.lifecycleEpoch,
      incarnationId: i.incarnationId, intentHash: i.intentHash, genesisHash: g.genesisHash, rootBinding: i.rootBinding,
      authCreatedAt: ledger.authCreatedAt, sourceCreatedAt,
      rootIncarnationHash: typedHash("origin-root-incarnation-v1", { uid: i.uid, rootBinding: i.rootBinding, sourceCreatedAt }) });
    if (ledger.commitment && !same(ledger.commitment, commitment)) throw new OriginMismatch("root-incarnation-changed");
    if (token) await coordinator.read(token); // Existing ledger/probe and incarnation checks, not source authority.
    return commitment;
  }
  async function recordRevocation(ledger: OriginLedger, reason: OriginMismatch["reason"] | "operator-demo") {
    // A concurrent creation checkpoint may advance between read and append.
    // Retry only that CAS conflict; there are six monotonic creation phases.
    // Never replace an already recorded revocation or retry an Auth RPC.
    for (let attempt = 0; attempt <= ORIGIN_LIMITS.events; attempt++) {
      if (ledger.control.phase === "REVOKED") return ledger;
      try { return await store.append(ledger.intent.uid, ledger.control.phase, "REVOKED", { reason }); }
      catch (error) {
        if ((error as { code?: unknown })?.code !== "origin_stale_phase" && (error as { code?: unknown })?.code !== "origin_event_conflict") throw error;
        ledger = await store.read(ledger.intent.uid);
      }
    }
    requireContract(false, "origin_revocation_not_confirmed");
  }
  async function requireUsable(ledger: OriginLedger) {
    requireContract(ledger.control.phase !== "REVOKED", "origin_revoked");
    try {
      await authMatches(ledger);
      if (ledger.commitment) await sourceCommitment(ledger);
      // Also close a pre-genesis intent if an independently retained lifecycle
      // is present/closed. Never adopt it as this intent's genesis.
      else { const life = await refs(ledger.intent.uid).life.get(); if (life.exists && parseStoredLifecycle(life.data()).state !== "active") throw new OriginMismatch("lifecycle-closed"); }
    } catch (error) {
      if (error instanceof OriginMismatch) { await recordRevocation(ledger, error.reason); requireContract(false, "origin_incarnation_rejected"); }
      throw error;
    }
  }
  async function createGenesis(ledger: OriginLedger) {
    const i = ledger.intent, r = refs(i.uid), before = await db().runTransaction(tx => tx.getAll(r.root, r.life, r.genesis, r.fence), { readOnly: true });
    requireContract(before.every(row => !row.exists), "origin_existing_source_requires_review");
    const pin = parseInventoryPin({ uid: i.uid, lifecycleEpoch: null, lifecycleRevision: null, lifecycleHead: null, lifecycleFence: null,
      writerProtocol: null, genesisHash: null, lifecycleState: null, journal: null, writerFenceHash: null, rootCreatedAt: null,
      scopeVersion: "all-user-descendants-stage4b1-v1", readTime: metadataTime(before[0].readTime) });
    const inventory = await readBootstrapInventory(app, pin, newInventoryMetrics());
    requireContract(inventory.manifest.recordCount === 2 && inventory.pages.every(p => p.records.every(row => !row.exists)), "origin_existing_source_requires_review");
    const genesis = genesisForOrigin(i, ledger.authCreatedAt!);
    const lifecycle = parseStoredLifecycle({ schemaVersion: 1, uid: i.uid, lifecycleEpoch: 1, state: "active", writerProtocol: AUTHORITY_PROTOCOL,
      writerIdentity: AUTHORITY_WRITER, namespaceVersion: SOURCE_NAMESPACE_VERSION, admissionEligibility: "NOT VERIFIED",
      rootBinding: i.rootBinding, fence: 1, revision: 0, headHash: null });
    const root = { uid: i.uid, learningProfile: null, trainingLifecycleBinding: i.rootBinding };
    const fence = { persistenceVersion: 3, writerProtocol: AUTHORITY_PROTOCOL, uid: i.uid, lifecycleEpoch: 1, rootBinding: i.rootBinding };
    const bytes = [[r.root.path, { ...root, createdAt: new Timestamp(0, 0) }], [r.life.path, lifecycle], [r.genesis.path, genesis], [r.fence.path, fence]]
      .reduce((sum, [path, data]) => sum + assertCompletionDocumentBudget(path as string, data), 0);
    requireContract(bytes <= ORIGIN_LIMITS.transactionBytes, "origin_transaction_capacity");
    await db().runTransaction(async tx => {
      db(); const current = await tx.getAll(r.root, r.life, r.genesis, r.fence);
      const history = await Promise.all([...Object.keys(SOURCE_CATALOG).map(name => tx.get(r.root.collection(name).limit(1))), tx.get(r.life.collection("events").limit(1))]);
      requireContract(current.every(row => !row.exists) && history.every(rows => rows.empty), "origin_existing_source_requires_review");
      db(); tx.create(r.root, { ...root, createdAt: FieldValue.serverTimestamp() }); tx.create(r.life, { ...lifecycle });
      tx.create(r.genesis, { ...genesis }); tx.create(r.fence, fence);
    });
  }
  async function recover(token: string) {
    const uid = await app.verifyToken(token); let ledger: OriginLedger;
    try { ledger = await store.read(uid); }
    catch { return originStatus(uid, "ORIGIN_UNVERIFIED", "independent_authority_missing_or_invalid"); }
    if (ledger.control.phase === "REVOKED") return originStatus(uid, "ORIGIN_REVOKED", "recorded_revocation");
    if (ledger.control.reviewRequired) return originStatus(uid, "PROVISIONING_PENDING", "controlled_recovery_required");
    if (!ledger.commitment) return originStatus(uid, "PROVISIONING_PENDING", "provisioning_incomplete");
    try {
      await sourceCommitment(ledger, token);
      const latest = await store.read(uid);
      requireContract(same(ledger.control, latest.control), "origin_state_changed");
      if (ledger.control.phase !== "FINALIZED") return originStatus(uid, "PROVISIONING_PENDING", "attestation_not_finalized", "SOURCE_COMMITMENT_MATCHES");
      return Object.freeze({ ...originStatus(uid, "EXTERNAL_TRUST_NOT_ENFORCED", "emulator_admin_can_cross_realms", "FINALIZED_COMMITMENTS_MATCH"),
        lifecycleEpoch: ledger.intent.lifecycleEpoch, incarnationId: ledger.intent.incarnationId, attestation: ledger.attestation });
    } catch (error) {
      if (error instanceof OriginMismatch) {
        try { await recordRevocation(ledger, error.reason); return originStatus(uid, "ORIGIN_REVOKED", error.reason); }
        catch { return originStatus(uid, "ORIGIN_UNVERIFIED", "revocation_not_confirmed"); }
      }
      return originStatus(uid, "ORIGIN_UNVERIFIED", "origin_source_or_lifecycle_unverifiable");
    }
  }
  return Object.freeze({
    /** Operator-only preparation; UID is generated once and durably reserved.
     * AUTH_CREATE_STARTED is deliberately NOT an automatically retryable RPC. */
    async prepare(input: unknown) {
      const request = originRequest(input), unicode = (n: number) => Array.from({ length: n }, () => String.fromCharCode(randomInt(0x4e00, 0x9fff))).join("");
      const uid = "b1_" + (request.identityForm === "ascii" ? randomUUID().replaceAll("-", "") : request.identityForm === "unicode58" ? unicode(50) + randomBytes(3).toString("hex").slice(0, 5) : unicode(125));
      const prepared = makeOriginIntent(request, uid, randomBytes(32).toString("hex"));
      await boundary("before-intent", uid); let ledger = await store.open(prepared); await boundary("intent-recorded", ledger.intent.uid);
      requireContract(ledger.control.phase !== "REVOKED", "origin_revoked");
      if (ledger.control.phase === "INTENT_RECORDED") {
        const attemptId = randomBytes(32).toString("hex");
        ledger = await store.append(ledger.intent.uid, "INTENT_RECORDED", "AUTH_CREATE_STARTED", { attemptId });
        await boundary("auth-started", ledger.intent.uid);
        // No RPC retry loop. Even an ambiguous create response retains this UID
        // and requires controlled recovery, never a new account or adoption.
        const user = await app.getAuthClient().createUser({ uid: ledger.intent.uid });
        await boundary("auth-created-before-claims", user.uid);
        await app.getAuthClient().setCustomUserClaims(user.uid, { [ORIGIN_CLAIM]: ledger.intent.incarnationId, originStage4b2Protocol: ORIGIN_PROTOCOL });
        await boundary("auth-before-checkpoint", user.uid);
        ledger = await store.append(user.uid, "AUTH_CREATE_STARTED", "AUTH_CREATED", { authCreatedAt: new Date(user.metadata.creationTime).toISOString(), incarnationId: ledger.intent.incarnationId });
        await boundary("auth-created", user.uid);
      }
      requireContract(!ledger.control.reviewRequired, "origin_controlled_recovery_required"); await requireUsable(ledger);
      return Object.freeze({ uid: ledger.intent.uid, requestId: ledger.intent.request.requestId, incarnationId: ledger.intent.incarnationId,
        phase: ledger.control.phase, customToken: await app.getAuthClient().createCustomToken(ledger.intent.uid), authority: "NOT VERIFIED" as const });
    },
    async finalize(token: string, input: unknown) {
      const request = object(input, ["requestId"]), uid = await app.verifyToken(token); let ledger = await store.read(uid);
      requireContract(request.requestId === ledger.intent.request.requestId, "origin_request_owner_mismatch");
      requireContract(!ledger.control.reviewRequired, "origin_controlled_recovery_required"); await requireUsable(ledger);
      if (ledger.control.phase === "AUTH_CREATED") {
        ledger = await store.append(uid, "AUTH_CREATED", "GENESIS_CREATE_STARTED", { attemptId: randomBytes(32).toString("hex") });
        await boundary("genesis-started", uid); await createGenesis(ledger); await boundary("genesis-before-checkpoint", uid);
        const commitment = await sourceCommitment(ledger, token);
        ledger = await store.append(uid, "GENESIS_CREATE_STARTED", "GENESIS_COMMITTED", { ...commitment }); await boundary("genesis-recorded", uid);
      }
      if (ledger.control.phase === "GENESIS_COMMITTED") {
        await sourceCommitment(ledger, token); const attestation = makeOriginAttestation(ledger.intent, ledger.commitment);
        ledger = await store.append(uid, "GENESIS_COMMITTED", "FINALIZED", { attestationHash: attestation.attestationHash });
      }
      requireContract(ledger.control.phase === "FINALIZED", "origin_provisioning_incomplete"); await boundary("finalized", uid);
      return recover(token);
    },
    recover,
    async revoke(token: string, input: unknown) {
      const request = object(input, ["reason"]); requireContract(request.reason === "operator-demo", "origin_revocation_reason");
      const uid = await app.verifyToken(token), ledger = await store.read(uid); await recordRevocation(ledger, "operator-demo");
      return originStatus(uid, "ORIGIN_REVOKED", "recorded_revocation");
    },
    async close() { await coordinator.close(); await transport.close(); }
  });
}
