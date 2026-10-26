import { Timestamp } from "firebase-admin/firestore";
import type { DocumentReference, DocumentSnapshot, QuerySnapshot, ReadOnlyTransactionOptions, ReadWriteTransactionOptions, Transaction } from "firebase-admin/firestore";
import { assertStage2Environment, assertStage2Transport } from "./acceptanceTransport";
import type { Stage2Transport } from "./acceptanceTransport";
import { AUTHORITY_PROTOCOL, LIFECYCLE_COLLECTION, parseLifecycle, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { BOOTSTRAP_COLLECTION, parseGenesis } from "./bootstrapContracts";
import { ORIGIN_PROTOCOL } from "./originContracts";
import { trainingOwnerUID } from "./ownerUID";
import { bounded, canonicalJSON, hash, integer, object, requireContract, typedHash } from "./values";

const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
type Point = { seconds: number; nanoseconds: number };
export type WriterGuardContext = Readonly<{ schemaVersion: 1; uid: string; protection: "protected" | "legacy-demo";
  lifecycleEpoch: number | null; rootBinding: string | null; rootCreatedAt: Point; fence: number | null;
  writerProtocol: string | null; namespaceVersion: string | null }>;
export function parseWriterGuardContext(value: unknown): WriterGuardContext {
  const d = object(value, ["schemaVersion", "uid", "protection", "lifecycleEpoch", "rootBinding", "rootCreatedAt", "fence", "writerProtocol", "namespaceVersion"]);
  trainingOwnerUID(d.uid); const at = object(d.rootCreatedAt, ["seconds", "nanoseconds"]);
  integer(at.seconds); integer(at.nanoseconds); requireContract(at.nanoseconds < 1_000_000_000, "writer_guard_time_invalid");
  requireContract(d.schemaVersion === 1 && (d.protection === "protected" || d.protection === "legacy-demo"), "writer_guard_context_invalid");
  if (d.protection === "protected") {
    integer(d.lifecycleEpoch, 1); integer(d.fence, 1); hash(d.rootBinding);
    requireContract(d.writerProtocol === AUTHORITY_PROTOCOL && d.namespaceVersion === SOURCE_NAMESPACE_VERSION, "writer_protocol_incompatible");
  } else requireContract(d.lifecycleEpoch === null && d.rootBinding === null && d.fence === null &&
    d.writerProtocol === null && d.namespaceVersion === null, "writer_guard_context_invalid");
  return bounded(d, 4096) as unknown as WriterGuardContext;
}
export function assertWriterGuardContext(actual: WriterGuardContext, expected: unknown) {
  requireContract(same(parseWriterGuardContext(actual), parseWriterGuardContext(expected)), "writer_stale_context");
}
/** Pure Stage 4A/4C incarnation check, NOT an authorization capability. Guarded
 * writers use the guard-owned reads below; root creation metadata is never
 * replaced by a stored timestamp. */
export function validateLifecycleSnapshots(uid: string, life: DocumentSnapshot, root: DocumentSnapshot,
  fence: DocumentSnapshot, allowMissingClosedRoot = false) {
  trainingOwnerUID(uid); requireContract(life.exists, "authority_lifecycle_missing");
  const data = life.data()!;
  requireContract(life.createTime instanceof Timestamp && !Object.hasOwn(data, "rootCreatedAt"), "authority_origin_invalid");
  const lifecycle = parseLifecycle({ ...data, rootCreatedAt: { seconds: life.createTime.seconds, nanoseconds: life.createTime.nanoseconds } });
  requireContract(lifecycle.uid === uid && same(fence.data(), { persistenceVersion: 3, writerProtocol: AUTHORITY_PROTOCOL,
    uid, lifecycleEpoch: lifecycle.lifecycleEpoch, rootBinding: lifecycle.rootBinding }), "authority_fence_invalid");
  if (root.exists) requireContract(root.data()!.uid === uid && root.data()!.trainingLifecycleBinding === lifecycle.rootBinding &&
    root.createTime instanceof Timestamp && root.createTime.isEqual(life.createTime), "authority_root_recreated");
  else requireContract(allowMissingClosedRoot && lifecycle.state !== "active", "authority_root_missing");
  return lifecycle;
}

type Identity = Readonly<{ uid: string; kind: "firebase-owner" | "emulator-worker";
  authCreatedAt: string | null; originIncarnation: string | null; originProtocol: string | null }>;
type Attempt = { active: boolean };
const currentWitnesses = new WeakMap<object, { attempt: Attempt; tx: Transaction }>();
/** Fresh-read proof only, never protected admission. Used by the isolated seal
 * coordinator without accepting a caller-selected guard or Firestore client. */
export function assertCurrentWriterResult(result: object, tx: Transaction) {
  const witness = currentWitnesses.get(result);
  requireContract(witness?.attempt.active === true && witness.tx === tx, "writer_guard_transaction_required");
}
type WriteMethod = "create" | "set" | "update" | "delete";
export type WriterTransactionHooks = {
  beforeRead?: () => void;
  afterRead?: (result: DocumentSnapshot | QuerySnapshot | DocumentSnapshot[]) => void;
  beforeWrite?: (method: WriteMethod, ref: DocumentReference, data: unknown) => void;
};
/** The opaque principal proves only this process's verified token or scoped demo
 * worker target. It is NOT an externally enforced service identity/capability. */
export function createSharedWriterGuard(transport: Stage2Transport) {
  assertStage2Transport(transport); assertStage2Environment();
  const principals = new WeakSet<object>(), results = new WeakMap<object, Attempt>(), attempts = new WeakMap<object, Attempt>();
  const developmentOwners = new WeakSet<object>();
  const db = () => { assertStage2Environment(); return transport.getFirestore(); };
  function principal(value: Identity) { principals.add(value); return value; }
  function assertPrincipal(value: Identity) { requireContract(principals.has(value), "writer_verified_principal_required"); trainingOwnerUID(value.uid); }
  function attempt(tx: Transaction) {
    const state = attempts.get(tx);
    requireContract(state?.active === true, "writer_guard_attempt_inactive"); return state;
  }
  async function snapshots(tx: Transaction, identity: Identity) {
    attempt(tx); assertPrincipal(identity); const firestore = db(), uid = identity.uid;
    // Read every witness HERE, through the live attempt facade. Public SDK
    // snapshots have no reliable callback-attempt provenance and are not input.
    const [root, fence, life] = await Promise.all([
      tx.get(firestore.doc(`users/${uid}`)), tx.get(firestore.doc(`users/${uid}/learningProfiles/cumulative`)),
      tx.get(firestore.doc(`${LIFECYCLE_COLLECTION}/${uid}`))
    ]);
    attempt(tx); return Object.freeze({ root, fence, life });
  }
  return Object.freeze({
    /** Own the SDK callback boundary. The SDK may reuse its Transaction object:
     * each invocation instead receives a new private, revocable facade/capability.
     * Hooks observe budgets only; neither raw transaction nor attempt is exposed. */
    async transaction<T>(callback: (tx: Transaction) => Promise<T>,
      options?: ReadOnlyTransactionOptions | ReadWriteTransactionOptions, onAttempt?: () => WriterTransactionHooks): Promise<T> {
      return db().runTransaction(async raw => {
        const state: Attempt = { active: true };
        const invoke = raw as unknown as Record<string, (...args: unknown[]) => unknown>;
        try {
          const hooks = onAttempt?.() ?? {};
          const facade: Record<string, (...args: unknown[]) => unknown> = {};
          for (const method of ["get", "getAll"]) facade[method] = async (...args) => {
            requireContract(state.active, "writer_guard_attempt_inactive"); db(); hooks.beforeRead?.();
            const result = await invoke[method].apply(raw, args);
            requireContract(state.active, "writer_guard_attempt_inactive"); db();
            hooks.afterRead?.(result as DocumentSnapshot | QuerySnapshot | DocumentSnapshot[]); return result;
          };
          for (const method of ["create", "set", "update", "delete"] as const) facade[method] = (...args) => {
            requireContract(state.active, "writer_guard_attempt_inactive");
            requireContract(options?.readOnly !== true, "writer_transaction_read_only"); db();
            hooks.beforeWrite?.(method, args[0] as DocumentReference, args[1]);
            invoke[method].apply(raw, args);
            // SDK writes return the raw Transaction for chaining. Never leak it.
            return facade;
          };
          Object.freeze(facade); attempts.set(facade, state);
          return await callback(facade as unknown as Transaction);
        } finally { state.active = false; }
      }, options);
    },
    async authenticate(token: unknown) {
      const identity = await transport.verifyWriterIdentity(token);
      return principal(Object.freeze({ ...identity, kind: "firebase-owner" as const }));
    },
    worker(uid: string) {
      db(); trainingOwnerUID(uid);
      // Operator/supervisor scope ONLY. This does not claim Firebase owner auth,
      // independent worker IAM or permission to write protected performance.
      return principal(Object.freeze({ uid, kind: "emulator-worker" as const, authCreatedAt: null, originIncarnation: null, originProtocol: null }));
    },
    async lifecycle(tx: Transaction, identity: Identity, allowMissingClosedRoot = false) {
      attempt(tx); requireContract(typeof allowMissingClosedRoot === "boolean", "writer_guard_context_invalid");
      const rows = await snapshots(tx, identity);
      return Object.freeze({ ...rows, lifecycle: validateLifecycleSnapshots(identity.uid, rows.life, rows.root, rows.fence, allowMissingClosedRoot) });
    },
    async read(tx: Transaction, identity: Identity, expected?: unknown) {
      const currentAttempt = attempt(tx); assertPrincipal(identity);
      // Old {root, fence} arguments, including genuine cached SDK snapshots,
      // fail this strict context parser; there is no snapshot-input overload.
      if (expected !== undefined) parseWriterGuardContext(expected);
      const firestore = db(), uid = identity.uid, rows = await snapshots(tx, identity), life = rows.life;
      const root = rows.root.data();
      const protectedAccount = life.exists || uid.startsWith("b1_") || Object.hasOwn(root ?? {}, "trainingLifecycleBinding") ||
        rows.fence.data()?.persistenceVersion === 3 || identity.originIncarnation !== null || identity.originProtocol !== null;
      requireContract(rows.root.exists && rows.root.createTime instanceof Timestamp, "writer_account_not_active");
      let context: WriterGuardContext;
      if (protectedAccount) {
        const lifecycle = validateLifecycleSnapshots(uid, life, rows.root, rows.fence);
        requireContract(lifecycle.state === "active", "writer_account_not_active");
        context = parseWriterGuardContext({ schemaVersion: 1, uid, protection: "protected", lifecycleEpoch: lifecycle.lifecycleEpoch,
          rootBinding: lifecycle.rootBinding, rootCreatedAt: lifecycle.rootCreatedAt, fence: lifecycle.fence,
          writerProtocol: lifecycle.writerProtocol, namespaceVersion: lifecycle.namespaceVersion });
        if (identity.kind === "firebase-owner" && (identity.originIncarnation !== null || identity.originProtocol !== null)) {
          hash(identity.originIncarnation);
          requireContract(identity.originProtocol === ORIGIN_PROTOCOL && lifecycle.rootBinding === typedHash("origin-root-binding-v1", {
            uid, lifecycleEpoch: lifecycle.lifecycleEpoch, incarnationId: identity.originIncarnation }), "writer_auth_incarnation_mismatch");
          const genesis = await tx.get(firestore.doc(`${BOOTSTRAP_COLLECTION}/${uid}`)), g = parseGenesis(genesis.data());
          requireContract(g.uid === uid && g.lifecycleEpoch === lifecycle.lifecycleEpoch && g.rootBinding === lifecycle.rootBinding &&
            g.authCreatedAt === identity.authCreatedAt && genesis.createTime!.isEqual(rows.root.createTime!), "writer_auth_incarnation_mismatch");
        }
      } else context = parseWriterGuardContext({ schemaVersion: 1, uid, protection: "legacy-demo", lifecycleEpoch: null,
        rootBinding: null, rootCreatedAt: { seconds: rows.root.createTime!.seconds, nanoseconds: rows.root.createTime!.nanoseconds },
        fence: null, writerProtocol: null, namespaceVersion: null });
      if (expected !== undefined) assertWriterGuardContext(context, expected);
      const result = Object.freeze({ context, authority: "NOT VERIFIED" as const, independentRevocation: "NOT VERIFIED" as const,
        protectedAdmissionEligible: false as const, publicationEligible: false as const, ...rows });
      attempt(tx); results.set(result, currentAttempt); currentWitnesses.set(result, { attempt: currentAttempt, tx });
      if (identity.kind === "firebase-owner" && identity.originIncarnation !== null && identity.originProtocol === ORIGIN_PROTOCOL)
        developmentOwners.add(result);
      return result;
    },
    /** Quarantined synthetic Training only. This is deliberately separate from
     * assertJournalAccess: it NEVER establishes trusted admission or publication. */
    assertDevelopmentTrainingAccess(result: { context: WriterGuardContext }, tx: Transaction) {
      const currentAttempt = attempt(tx); db();
      requireContract(process.versions.node.split(".")[0] === "24" && process.env.TRAINING_PROTECTED_STAGE4E === "emulator-only",
        "protected_training_disabled");
      requireContract(results.get(result) === currentAttempt && developmentOwners.has(result), "writer_guard_transaction_required");
      requireContract(parseWriterGuardContext(result.context).protection === "protected", "protected_training_owner_required");
    },
    assertJournalAccess(result: { context: WriterGuardContext }, tx: Transaction) {
      const currentAttempt = attempt(tx);
      requireContract(results.has(result) && results.get(result) === currentAttempt, "writer_guard_transaction_required");
      // No branch, stored marker or source hash can authorize protected Training.
      requireContract(parseWriterGuardContext(result.context).protection === "legacy-demo", "writer_protected_admission_not_verified");
    }
  });
}
export type SharedWriterGuard = ReturnType<typeof createSharedWriterGuard>;
export type WriterPrincipal = Awaited<ReturnType<SharedWriterGuard["authenticate"]>>;
