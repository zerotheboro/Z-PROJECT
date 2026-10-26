import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { createBootstrapTransport, assertBootstrapEnvironment } from "./bootstrapTransport";
import { createAuthorityPrototype } from "./authority";
import { AUTHORITY_PROTOCOL, AUTHORITY_WRITER, LIFECYCLE_COLLECTION, SOURCE_CATALOG, SOURCE_NAMESPACE_VERSION, parseStoredLifecycle } from "./authorityContracts";
import { createInventoryBootstrap } from "./inventory";
import { parseAccountRevisionControl } from "./controls";
import { trainingOwnerUID } from "./ownerUID";
import { BOOTSTRAP_COLLECTION, BOOTSTRAP_PROTOCOL, COHORT_PREFIX, BOOTSTRAP_LIMITS, parseGenesis, parseInventoryPin } from "./bootstrapContracts";
import type { Genesis, InventoryPin } from "./bootstrapContracts";
import { metadataTime, newInventoryMetrics, readBootstrapInventory, reconciliationPlan } from "./bootstrapInventory";
import { assertCompletionDocumentBudget, fingerprintFirestoreSource } from "../completionFirestoreValues";
import { canonicalJSON, object, requireContract, text, typedHash } from "./values";

type Witness = { uid: string; requestId: string; authCreatedAt: string; rootBinding: string; customToken: string; genesis: Genesis | null;
  committedAt: { seconds: number; nanoseconds: number } | null; bootstrapOperation?: Promise<Genesis> };
type Event = "identity-created" | "before-bootstrap" | "after-bootstrap" | "inventory-page" | "between-inventory-passes" | "after-inventory-verification";
type Options = { onEvent?: (event: Event, uid: string) => Promise<void> };
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
const blockers = Object.freeze(["privileged-writers-and-iam-unverified", "legacy-completion-replacement-not-integrated",
  "worker-and-publisher-lifecycle-integration-required", "historical-reconciliation-not-authorized", "durable-origin-attestation-after-process-restart-required"]);

/** Isolated operator/test harness ONLY. No HTTP route, injected authority, DB or
 * caller-provided UID at the bootstrap/inventory boundary. The private witness
 * exists ONLY after this process actually creates a NEW Emulator Auth user.
 * Stored markers and hashes cannot recreate it, including after process loss. */
export function createBootstrapPrototype(options: Options = {}) {
  assertBootstrapEnvironment(); const transport = createBootstrapTransport(), coordinator = createAuthorityPrototype();
  const requests = new Map<string, { inputHash: string; operation: Promise<Witness> }>(), witnesses = new Map<string, Witness>();
  const metrics = newInventoryMetrics();
  const db = () => transport.getFirestore();
  function refs(uid: string) {
    trainingOwnerUID(uid); const root = db().doc(`users/${uid}`), life = db().doc(`${LIFECYCLE_COLLECTION}/${uid}`);
    return { root, life, fence: root.collection("learningProfiles").doc("cumulative"),
      genesis: db().doc(`${BOOTSTRAP_COLLECTION}/${uid}`), journal: root.collection("learningProfiles").doc("journalControl") };
  }
  async function pin(uid: string): Promise<InventoryPin> {
    const r = refs(uid), rows = await db().runTransaction(tx => tx.getAll(r.root, r.life, r.fence, r.genesis, r.journal), { readOnly: true });
    metrics.documentReads += rows.length; metrics.readTransactions++;
    metrics.maximumTransactionReads = Math.max(metrics.maximumTransactionReads, rows.length);
    const [root, life, fence, genesis, journal] = rows;
    let checked: ReturnType<typeof parseStoredLifecycle> | null = null, g: Genesis | null = null, j = null;
    try { if (life.exists) checked = parseStoredLifecycle(life.data()); } catch { /* Retain invalid raw record in diagnostics, not invented state. */ }
    try { if (genesis.exists) g = parseGenesis(genesis.data()); } catch { /* A malformed marker grants no origin. */ }
    try { if (journal.exists) { const c = parseAccountRevisionControl(journal.data()); j = { uid: c.uid, lifecycleEpoch: c.lifecycleEpoch, revision: c.headRevision, headHash: c.headHash }; } } catch { /* Unknown historical cutoff. */ }
    return parseInventoryPin({ uid, lifecycleEpoch: checked?.lifecycleEpoch ?? null, lifecycleRevision: checked?.revision ?? null,
      lifecycleHead: checked?.headHash ?? null, lifecycleFence: checked?.fence ?? null, writerProtocol: checked?.writerProtocol ?? null,
      lifecycleState: checked?.state ?? null, genesisHash: g?.genesisHash ?? null, journal: j,
      writerFenceHash: fence.exists ? fingerprintFirestoreSource(fence.data()) : null,
      rootCreatedAt: root.exists ? metadataTime(root.createTime!) : null,
      scopeVersion: "all-user-descendants-stage4b1-v1", readTime: metadataTime(root.readTime) });
  }
  async function origin(uid: string, token: string) {
    const witness = witnesses.get(uid);
    if (!witness?.genesis) return { verified: false, reason: "creation-not-observed-by-this-process" };
    const user = await transport.getAuthClient().getUser(uid);
    requireContract(new Date(user.metadata.creationTime).toISOString() === witness.authCreatedAt, "bootstrap_auth_incarnation_changed");
    const r = refs(uid);
    const [root, life, fence, genesis] = await db().runTransaction(tx => tx.getAll(r.root, r.life, r.fence, r.genesis), { readOnly: true });
    metrics.documentReads += 4; metrics.readTransactions++;
    const g = parseGenesis(genesis.data());
    requireContract(g.uid === uid && same(g, witness.genesis) && root.exists && life.exists && fence.exists &&
      root.data()!.trainingLifecycleBinding === g.rootBinding && same(metadataTime(root.createTime!), metadataTime(life.createTime!)) &&
      same(metadataTime(root.createTime!), metadataTime(genesis.createTime!)) && same(metadataTime(root.createTime!), metadataTime(fence.createTime!)) &&
      (witness.committedAt === null || same(witness.committedAt, metadataTime(genesis.createTime!))), "bootstrap_origin_changed");
    const checked = await coordinator.read(token);
    requireContract(checked.uid === uid && checked.rootBinding === g.rootBinding && checked.lifecycleEpoch === g.lifecycleEpoch &&
      checked.state === "active", "bootstrap_account_not_active");
    witness.committedAt ??= metadataTime(genesis.createTime!);
    return { verified: true, reason: "observed-new-demo-auth-and-atomic-genesis" };
  }
  async function inspect(token: string) {
    const uid = await transport.verifyToken(token);
    let verified = false, reason = "creation-not-observed-by-this-process";
    try { const result = await origin(uid, token); verified = result.verified; reason = result.reason; }
    catch { reason = "origin-lifecycle-or-root-incarnation-disagreement"; }
    return Object.freeze({ schemaVersion: 1, uid, state: verified ? "ORIGIN_VERIFIED" as const : "UNVERIFIED_ORIGIN" as const,
      originScope: "observed-demo-process-only" as const, reason, stage1Authority: "NOT VERIFIED" as const,
      inventoryAuthority: "NOT VERIFIED" as const, writerFencing: "NOT VERIFIED" as const,
      studentReady: false as const, admissionEligible: false as const, admitted: false as const, publicationEligible: false as const, blockers });
  }
  async function inventory(token: string) {
    const uid = await transport.verifyToken(token), status = await inspect(token), firstPin = await pin(uid);
    if (status.state === "ORIGIN_VERIFIED") requireContract(firstPin.lifecycleState === "active", "bootstrap_account_not_active");
    const first = await readBootstrapInventory(transport, firstPin, metrics, () => options.onEvent?.("inventory-page", uid) ?? Promise.resolve());
    await options.onEvent?.("between-inventory-passes", uid);
    const secondPin = await pin(uid), { readTime: _a, ...a } = firstPin, { readTime: _b, ...b } = secondPin;
    requireContract(same(a, b), "bootstrap_cutoff_changed");
    const second = await readBootstrapInventory(transport, secondPin, metrics);
    const left = first.pages.flatMap(p => p.records), right = second.pages.flatMap(p => p.records);
    requireContract(left.length === right.length && left.every((r, i) => same(r, right[i])), "bootstrap_sources_changed");
    await options.onEvent?.("after-inventory-verification", uid);
    const current = await pin(uid), { readTime: _c, ...c } = current;
    requireContract(same(b, c), "bootstrap_cutoff_changed");
    // Final point reads cannot fence arbitrary Admin mutations in the gap. Do
    // NOT call this authoritative completeness or issue a publication capability.
    const finalStatus = await inspect(token);
    requireContract(finalStatus.state === status.state, "bootstrap_origin_changed");
    return Object.freeze({ ...first, status: finalStatus, consistency: "REVISION_PINNED_SNAPSHOT_VERIFIED" as const,
      completenessAuthority: "NOT VERIFIED" as const, privilegedMutationGap: true as const,
      reconciliation: reconciliationPlan(left, firstPin), metrics: Object.freeze({ ...metrics }) });
  }
  return Object.freeze({
    /** Operator-only NEW random identity creation. No caller-selected UID or
     * suffix; templates exercise Unicode without permitting re-enrollment.
     * b1_ is write-denied BEFORE root/lifecycle creation in the separate policy. */
    async prepareSyntheticIdentity(input: unknown) {
      const data = object(input, ["requestId", "identityForm"]); text(data.requestId, 100);
      requireContract(/^[A-Za-z0-9_-]{8,100}$/.test(data.requestId), "bootstrap_request_invalid");
      requireContract(data.identityForm === "ascii" || data.identityForm === "unicode58" || data.identityForm === "unicode128", "bootstrap_identity_form_invalid");
      const inputHash = typedHash("bootstrap-identity-request-stage4b1-v1", data), previous = requests.get(data.requestId);
      if (previous) requireContract(previous.inputHash === inputHash, "bootstrap_request_conflict");
      else {
        requireContract(requests.size < 128, "bootstrap_operator_capacity");
        const unicode = (n: number) => Array.from({ length: n }, () => String.fromCharCode(randomInt(0x4e00, 0x9fff))).join("");
        const uid = COHORT_PREFIX + (data.identityForm === "ascii" ? randomUUID().replaceAll("-", "") :
          data.identityForm === "unicode58" ? unicode(50) + randomBytes(3).toString("hex").slice(0, 5) : unicode(125));
        trainingOwnerUID(uid);
        const operation = (async (): Promise<Witness> => {
          // A server-observed successful createUser is essential. Never replace
          // it with getUser + "no current history", even for a stored marker.
          const user = await transport.getAuthClient().createUser({ uid });
          const w: Witness = { uid: user.uid, requestId: data.requestId as string,
            authCreatedAt: new Date(user.metadata.creationTime).toISOString(), rootBinding: randomBytes(32).toString("hex"),
            customToken: await transport.getAuthClient().createCustomToken(user.uid), genesis: null, committedAt: null };
          witnesses.set(user.uid, w); await options.onEvent?.("identity-created", user.uid); return w;
        })();
        requests.set(data.requestId, { inputHash, operation });
      }
      const w = await requests.get(data.requestId)!.operation;
      return Object.freeze({ uid: w.uid, requestId: w.requestId, customToken: w.customToken });
    },
    async bootstrap(token: string, input: unknown) {
      const request = object(input, ["requestId"]); text(request.requestId, 100);
      const uid = await transport.verifyToken(token), w = witnesses.get(uid);
      requireContract(w && w.requestId === request.requestId, "bootstrap_origin_not_observed");
      if (w.bootstrapOperation) return w.bootstrapOperation;
      w.bootstrapOperation = (async () => {
      if (w.genesis && (await refs(uid).genesis.get()).exists) {
        requireContract((await inspect(token)).state === "ORIGIN_VERIFIED", "bootstrap_origin_changed"); return w.genesis;
      }
      const user = await transport.getAuthClient().getUser(uid);
      requireContract(new Date(user.metadata.creationTime).toISOString() === w.authCreatedAt, "bootstrap_auth_incarnation_changed");
      const r = refs(uid), beforePin = await pin(uid), before = await readBootstrapInventory(transport, beforePin, metrics);
      requireContract(before.pages.flatMap(p => p.records).every(row => !row.exists) && before.manifest.recordCount === 2,
        "bootstrap_existing_history_requires_review");
      const life = parseStoredLifecycle({ schemaVersion: 1, uid, lifecycleEpoch: 1, state: "active", writerProtocol: AUTHORITY_PROTOCOL,
        writerIdentity: AUTHORITY_WRITER, namespaceVersion: SOURCE_NAMESPACE_VERSION, admissionEligibility: "NOT VERIFIED",
        rootBinding: w.rootBinding, fence: 1, revision: 0, headHash: null });
      const gBody = { schemaVersion: 1, protocol: BOOTSTRAP_PROTOCOL, uid, lifecycleEpoch: 1, writerProtocol: AUTHORITY_PROTOCOL,
        catalog: SOURCE_NAMESPACE_VERSION, requestId: w.requestId, rootBinding: w.rootBinding, authCreatedAt: w.authCreatedAt,
        initialState: "active", initialFence: 1, initialRevision: 0,
        bootstrapDigest: createInventoryBootstrap({ uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []).bootstrapDigest };
      const genesis = parseGenesis({ ...gBody, genesisHash: typedHash("bootstrap-genesis-stage4b1-v1", gBody) });
      const fence = { persistenceVersion: 3, writerProtocol: AUTHORITY_PROTOCOL, uid, lifecycleEpoch: 1, rootBinding: w.rootBinding };
      let budget = 0;
      for (const [ref, data] of [[r.life, life], [r.genesis, genesis], [r.fence, fence]] as const)
        budget += assertCompletionDocumentBudget(ref.path, data);
      const root = { uid, learningProfile: null, trainingLifecycleBinding: w.rootBinding };
      budget += assertCompletionDocumentBudget(r.root.path, { ...root, createdAt: new Timestamp(0, 0) }); // deterministic size only
      requireContract(budget <= BOOTSTRAP_LIMITS.transactionBytes, "bootstrap_transaction_capacity");
      await options.onEvent?.("before-bootstrap", uid);
      await db().runTransaction(async tx => {
        metrics.readTransactions++;
        db(); const existing = await tx.getAll(r.root, r.life, r.fence, r.genesis);
        metrics.documentReads += 4;
        requireContract(existing.every(row => !row.exists), "bootstrap_origin_already_exists");
        const groups = await Promise.all([...Object.keys(SOURCE_CATALOG).map(name => tx.get(r.root.collection(name).limit(1))), tx.get(r.life.collection("events").limit(1))]);
        metrics.documentReads += groups.length;
        metrics.maximumTransactionReads = Math.max(metrics.maximumTransactionReads, groups.length + 4);
        requireContract(groups.every(group => group.empty), "bootstrap_existing_history_requires_review");
        db(); tx.create(r.life, { ...life }); tx.create(r.root, { ...root, createdAt: FieldValue.serverTimestamp() });
        tx.create(r.fence, fence); tx.create(r.genesis, { ...genesis });
      });
      w.genesis = genesis; metrics.writes += 4;
      metrics.maximumTransactionWrites = Math.max(metrics.maximumTransactionWrites, 4);
      metrics.maximumTransactionBytes = Math.max(metrics.maximumTransactionBytes, budget);
      await options.onEvent?.("after-bootstrap", uid);
      requireContract((await inspect(token)).state === "ORIGIN_VERIFIED", "bootstrap_origin_changed");
      return genesis;
      })();
      try { return await w.bootstrapOperation; } finally { delete w.bootstrapOperation; }
    },
    inspect, inventory, metrics,
    async requestAdmission(token: string) {
      const result = await inventory(token);
      return Object.freeze({ ...result.status, code: "bootstrap_admission_prerequisites_unverified" as const,
        inventoryDigest: result.manifest.inventoryDigest }); // NEVER a journal admission write
    },
    async close() { await coordinator.close(); await transport.close(); }
  });
}
