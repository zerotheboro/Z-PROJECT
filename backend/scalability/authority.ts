import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { createStage2EmulatorTransport, assertStage2Environment } from "./acceptanceTransport";
import { AUTHORITY_LIMITS, AUTHORITY_PROTOCOL, AUTHORITY_WRITER, LIFECYCLE_COLLECTION, SOURCE_CATALOG, SOURCE_NAMESPACE_VERSION,
  advanceLifecycle, assertWriterContext, ownerUID, parseStoredLifecycle, parseWriterContext, probeInput } from "./authorityContracts";
import type { AuthorityEventKind, Lifecycle, StoredLifecycle } from "./authorityContracts";
import { bounded, canonicalJSON, nextRevision, object, requireContract, typedHash } from "./values";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { createSharedWriterGuard } from "./writerGuard";
import { readSealParticipant, queueSealParticipant } from "./sealingCoordination";

type Environment = Readonly<Record<string, string | undefined>>;
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
const key = (n: number) => String(n).padStart(16, "0");
export function assertAuthorityEnvironment(env: Environment = process.env) {
  requireContract(env.TRAINING_AUTHORITY_STAGE4A === "emulator-only", "authority_disabled"); assertStage2Environment(env);
}

/** Protection is NOT bootstrap authority. No production import, publisher, HTTP
 * endpoint, arbitrary database injection, ownership input or authority provider. */
export function createAuthorityPrototype() {
  assertAuthorityEnvironment(); const transport = createStage2EmulatorTransport();
  const writerGuard = createSharedWriterGuard(transport);
  const db = () => { assertAuthorityEnvironment(); return transport.getFirestore(); };
  const refs = (uid: string) => {
    ownerUID(uid); // No path construction or write transaction for unsupported identities.
    const root = db().doc(`users/${uid}`), life = db().collection(LIFECYCLE_COLLECTION).doc(uid);
    const sandbox = root.collection("learningProfiles").doc("authorityStage4a");
    return { root, life, events: life.collection("events"), fence: root.collection("learningProfiles").doc("cumulative"), probes: sandbox.collection("probes") };
  };
  const fenceData = (life: StoredLifecycle) => ({ persistenceVersion: 3, writerProtocol: AUTHORITY_PROTOCOL,
    uid: life.uid, lifecycleEpoch: life.lifecycleEpoch, rootBinding: life.rootBinding });
  async function current(tx: Transaction, uid: string, allowMissingClosedRoot = false) {
    db(); const r = refs(uid);
    const { lifecycle: life } = await writerGuard.lifecycle(tx, writerGuard.worker(uid), allowMissingClosedRoot);
    return { r, life };
  }
  /** Bounded diagnostic traversal includes missing document ancestors via
   * listDocuments(), unlike ordinary queries. NOT a serializable bootstrap proof. */
  async function inspect(uid: string) {
    const r = refs(uid), found: { path: string; classification: string }[] = [];
    let visited = 0;
    async function walk(ref: DocumentReference, namespace: string, depth: number) {
      requireContract(++visited <= AUTHORITY_LIMITS.scanDocuments && depth <= AUTHORITY_LIMITS.scanDepth, "authority_scan_incomplete");
      db(); const row = await ref.get();
      if (row.exists) found.push({ path: ref.path, classification: SOURCE_CATALOG[namespace as keyof typeof SOURCE_CATALOG] ?? "unclassified-history" });
      db(); for (const collection of await ref.listCollections()) {
        db(); for (const child of await collection.listDocuments()) await walk(child, namespace, depth + 1);
      }
    }
    db(); for (const collection of await r.root.listCollections()) {
      db(); for (const ref of await collection.listDocuments()) await walk(ref, collection.id, 1);
    }
    // Explicit zero/presence classification, including currently absent namespaces.
    return { found, classifications: Object.entries(SOURCE_CATALOG).map(([namespace, classification]) => ({ namespace, classification,
      observedDocuments: found.filter(row => row.path.startsWith(`${r.root.path}/${namespace}/`)).length })), visited };
  }
  async function verifyLedger(tx: Transaction, uid: string, life: Lifecycle) {
    const r = refs(uid); db();
    const [events, sources] = await Promise.all([tx.get(r.events.orderBy("__name__").limit(AUTHORITY_LIMITS.events + 1)),
      tx.get(r.probes.limit(AUTHORITY_LIMITS.probeEvents + 1))]);
    requireContract(events.size <= AUTHORITY_LIMITS.events && events.size === life.revision &&
      sources.size <= AUTHORITY_LIMITS.probeEvents, "authority_ledger_incomplete");
    const expected = new Set<string>(); let previous: string | null = null;
    let expectedState = "active", expectedFence = 1;
    for (const [index, row] of events.docs.entries()) {
      const event = object(row.data(), ["schemaVersion", "uid", "lifecycleEpoch", "revision", "previousHash", "kind", "sourceId", "sourceHash", "eventHash"]);
      const { eventHash, ...body } = event;
      requireContract(event.schemaVersion === 1 && event.uid === uid && event.lifecycleEpoch === life.lifecycleEpoch &&
        event.revision === index + 1 && row.id === key(index + 1) && event.previousHash === previous &&
        eventHash === typedHash("authority-event-v1", body), "authority_ledger_corrupt");
      if (event.kind === "source") {
        requireContract(expectedState === "active", "authority_ledger_corrupt");
        requireContract(typeof event.sourceId === "string" && !expected.has(event.sourceId), "authority_ledger_corrupt");
        const source = sources.docs.find(item => item.id === event.sourceId);
        requireContract(source && typedHash("authority-probe-envelope-v1", source.data()) === event.sourceHash, "authority_uncoordinated_mutation");
        expected.add(event.sourceId);
      } else {
        requireContract((event.kind === "deleting" && expectedState === "active" || event.kind === "deleted" && expectedState === "deleting") &&
          event.sourceId === null && event.sourceHash === null, "authority_ledger_corrupt");
        expectedState = event.kind; expectedFence = nextRevision(expectedFence);
      }
      previous = eventHash as string;
    }
    requireContract(previous === life.headHash && sources.size === expected.size && life.state === expectedState &&
      life.fence === expectedFence, "authority_uncoordinated_mutation");
  }
  function append(tx: Transaction, uid: string, life: Lifecycle, kind: AuthorityEventKind, sourceId: string | null, sourceHash: string | null) {
    const revision = nextRevision(life.revision), body = { schemaVersion: 1, uid, lifecycleEpoch: life.lifecycleEpoch,
      revision, previousHash: life.headHash, kind, sourceId, sourceHash };
    const event = { ...body, eventHash: typedHash("authority-event-v1", body) };
    const next = advanceLifecycle(life, kind, event.eventHash);
    const r = refs(uid); assertCompletionDocumentBudget(r.events.doc(key(revision)).path, event);
    assertCompletionDocumentBudget(r.life.path, next);
    tx.create(r.events.doc(key(revision)), event);
    tx.update(r.life, { revision: next.revision, headHash: next.headHash, state: next.state, fence: next.fence });
  }
  async function read(token: string) {
    const uid = await transport.verifyToken(token);
    return writerGuard.transaction(async tx => { const { life } = await current(tx, uid, true); await verifyLedger(tx, uid, life); return life; }, { readOnly: true });
  }
  return Object.freeze({
    /** Operator/demo harness only. Creates protection for a missing root, never
     * migrates an existing root or declares historical freshness verified. */
    async protectSyntheticOwner(token: string) {
      const uid = await transport.verifyToken(token), r = refs(uid);
      // All persisted lifecycle fields are copied/validated and budgeted BEFORE
      // opening the write transaction. Only genuine server creation metadata is
      // learned afterward; it is never supplied as a fictitious stored field.
      const value = parseStoredLifecycle({ schemaVersion: 1, uid, lifecycleEpoch: 1, state: "active", writerProtocol: AUTHORITY_PROTOCOL,
        writerIdentity: AUTHORITY_WRITER, namespaceVersion: SOURCE_NAMESPACE_VERSION, admissionEligibility: "NOT VERIFIED",
        rootBinding: randomBytes(32).toString("hex"), fence: 1, revision: 0, headHash: null });
      const preparedFence = fenceData(value);
      assertCompletionDocumentBudget(r.life.path, value); assertCompletionDocumentBudget(r.fence.path, preparedFence);
      const observation = await inspect(uid);
      const unsupported = observation.found.filter(row => !row.classification.startsWith("preserved-"));
      requireContract(unsupported.length === 0, "authority_existing_history_requires_review");
      await writerGuard.transaction(async tx => {
        db(); const [life, root, fence] = await tx.getAll(r.life, r.root, r.fence);
        requireContract(!life.exists, "authority_lifecycle_already_exists");
        requireContract(!root.exists && !fence.exists, "authority_root_origin_unverifiable");
        const orphanEvents = await tx.get(r.events.limit(1));
        requireContract(orphanEvents.empty, "authority_orphan_lifecycle_history");
        // Detect normal concurrent legacy writers in all classified namespaces;
        // never claim these checks rule out arbitrary privileged phantoms/deletion.
        const histories = await Promise.all(Object.entries(SOURCE_CATALOG).filter(([, kind]) => !kind.startsWith("preserved-"))
          .map(([name]) => tx.get(r.root.collection(name).limit(1))));
        requireContract(histories.every(rows => rows.empty), "authority_existing_history_requires_review");
        db(); tx.create(r.life, value); tx.create(r.root, { uid, learningProfile: null, createdAt: FieldValue.serverTimestamp(), trainingLifecycleBinding: value.rootBinding });
        tx.create(r.fence, preparedFence);
      });
      return read(token);
    },
    read,
    async assessFreshAuthority(token: string) {
      const uid = await transport.verifyToken(token), observation = await inspect(uid);
      const reasons = ["pre_lifecycle_history_unverifiable", "privileged_writer_enforcement_unverified", "trusted_bootstrap_not_implemented"];
      try {
        await writerGuard.transaction(async tx => { const { life } = await current(tx, uid); requireContract(life.state === "active", "authority_account_not_active"); await verifyLedger(tx, uid, life); }, { readOnly: true });
      } catch (error) { reasons.push(error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "authority_lifecycle_unverifiable"); }
      const history = observation.found.filter(row => !row.classification.startsWith("preserved-") && row.path !== refs(uid).fence.path);
      if (history.length) reasons.push("observed_history_requires_review");
      return Object.freeze({ schemaVersion: 1, authority: "NOT VERIFIED", publicationEligible: false, reasons: Object.freeze(reasons),
        catalogVersion: SOURCE_NAMESPACE_VERSION, classifications: observation.classifications, traversalComplete: true });
    },
    /** Immutable quarantined probes only; NOT a Training completion writer. */
    async createImmutableProbe(token: string, context: unknown, input: unknown) {
      const expected = parseWriterContext(context), request = probeInput(input);
      const uid = await transport.verifyToken(token);
      const id = typedHash("authority-probe-id-v1", { uid, kind: request.kind, id: request.id });
      return writerGuard.transaction(async tx => {
        const { life, r } = await current(tx, uid); requireContract(life.state === "active", "authority_account_not_active");
        const coordination = await readSealParticipant(tx,
          await writerGuard.read(tx, writerGuard.worker(uid)), "stage4a-probe");
        assertWriterContext(life, expected); await verifyLedger(tx, uid, life);
        const reference = r.probes.doc(id), existing = await tx.get(reference);
        const data = bounded({ schemaVersion: 1, uid, lifecycleEpoch: life.lifecycleEpoch, writerIdentity: AUTHORITY_WRITER,
          writerProtocol: AUTHORITY_PROTOCOL, namespaceVersion: SOURCE_NAMESPACE_VERSION, acceptedTrainingEvidence: false,
          kind: request.kind, id: request.id, payload: request.payload }, AUTHORITY_LIMITS.probeBytes);
        if (existing.exists) { requireContract(same(existing.data(), data), "authority_immutable_conflict"); return data; }
        assertCompletionDocumentBudget(reference.path, data); db(); queueSealParticipant(tx, coordination); tx.create(reference, data);
        append(tx, uid, life, "source", id, typedHash("authority-probe-envelope-v1", data)); return data;
      });
    },
    async transition(token: string, context: unknown, target: "deleting" | "deleted") {
      requireContract(target === "deleting" || target === "deleted", "authority_transition_invalid");
      const expected = parseWriterContext(context);
      const uid = await transport.verifyToken(token);
      await writerGuard.transaction(async tx => {
        const { life } = await current(tx, uid, target === "deleted"); assertWriterContext(life, expected);
        requireContract(target === "deleting" ? life.state === "active" : life.state === "deleting", "authority_transition_invalid");
        await verifyLedger(tx, uid, life); db(); append(tx, uid, life, target, null, null);
      });
      // Tombstone only: no account, root, legacy record or evidence is deleted.
      return Object.freeze({ state: target, authority: "NOT VERIFIED" as const });
    },
    close: transport.close
  });
}
