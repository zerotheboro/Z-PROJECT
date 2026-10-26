import type { Transaction } from "firebase-admin/firestore";
import { assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { trainingOwnerUID } from "./ownerUID";
import { assertOriginTransport } from "./originTransport";
import type { OriginTransport } from "./originTransport";
import { ORIGIN_LIMITS, makeOriginAttestation, makeOriginEvent, originEventKey, originRequestKey, parseOriginIntent, verifyOriginLedger } from "./originContracts";
import type { OriginIntent, OriginPhase } from "./originContracts";
import { canonicalJSON, hash, object, requireContract } from "./values";

const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
const CONTROL_KEYS = ["schemaVersion", "uid", "lifecycleEpoch", "incarnationId", "requestKey", "intentHash", "phase", "sequence", "headHash", "reviewRequired", "attestationHash"];
/** Trusted-by-construction test API, NOT an externally enforceable Admin role.
 * Intents, events and attestations use create-only writes; only their derived
 * bounded control changes. Every operation replays the complete small ledger. */
export function createOriginStore(transport: OriginTransport) {
  assertOriginTransport(transport);
  const db = () => { assertOriginTransport(transport); return transport.authorityFirestore(); };
  const refs = (uid: string) => {
    trainingOwnerUID(uid); const owner = db().collection("originOwners").doc(uid);
    return { owner, events: owner.collection("events"), attestation: db().collection("originAttestations").doc(uid) };
  };
  async function load(tx: Transaction, uid: string) {
    const r = refs(uid), header = await tx.get(r.owner);
    requireContract(header.exists, "origin_authority_missing");
    const raw = object(header.data(), CONTROL_KEYS); hash(raw.requestKey);
    const [request, events, attestation] = await Promise.all([
      tx.get(db().collection("originProvisioningRequests").doc(raw.requestKey)),
      tx.get(r.events.orderBy("__name__").limit(ORIGIN_LIMITS.events + 1)), tx.get(r.attestation)
    ]);
    requireContract(request.exists && events.size <= ORIGIN_LIMITS.events, "origin_ledger_incomplete");
    const ledger = verifyOriginLedger(request.data(), events.docs.map(row => row.data()), attestation.exists ? attestation.data() : null);
    requireContract(ledger.intent.uid === uid && ledger.intent.requestKey === raw.requestKey && same(raw, ledger.control) &&
      events.docs.every((row, i) => row.id === originEventKey(i + 1)) &&
      header.createTime!.isEqual(request.createTime!) && header.createTime!.isEqual(events.docs[0].createTime!), "origin_ledger_substituted");
    return ledger;
  }
  function budget(writes: readonly { path: string; data: unknown }[]) {
    const bytes = writes.reduce((sum, write) => sum + assertCompletionDocumentBudget(write.path, write.data), 0);
    requireContract(bytes <= ORIGIN_LIMITS.transactionBytes, "origin_transaction_capacity");
  }
  return Object.freeze({
    async open(intentValue: OriginIntent) {
      const prepared = parseOriginIntent(intentValue), request = db().collection("originProvisioningRequests").doc(prepared.requestKey);
      return db().runTransaction(async tx => {
        const existing = await tx.get(request);
        if (existing.exists) {
          const intent = parseOriginIntent(existing.data());
          requireContract(same(intent.request, prepared.request), "origin_request_conflict");
          return load(tx, intent.uid);
        }
        const r = refs(prepared.uid), [owner, attest, oldEvents] = await Promise.all([tx.get(r.owner), tx.get(r.attestation), tx.get(r.events.limit(1))]);
        requireContract(!owner.exists && !attest.exists && oldEvents.empty, "origin_uid_not_reusable");
        const event = makeOriginEvent(prepared, null, "INTENT_RECORDED", {}), ledger = verifyOriginLedger(prepared, [event]);
        budget([{ path: request.path, data: prepared }, { path: r.owner.path, data: ledger.control }, { path: r.events.doc(originEventKey(1)).path, data: event }]);
        db(); tx.create(request, { ...prepared }); tx.create(r.owner, { ...ledger.control }); tx.create(r.events.doc(originEventKey(1)), { ...event });
        return ledger;
      });
    },
    async read(uid: string) { return db().runTransaction(tx => load(tx, uid), { readOnly: true }); },
    async byRequest(requestId: string) {
      return db().runTransaction(async tx => {
        const request = await tx.get(db().collection("originProvisioningRequests").doc(originRequestKey(requestId)));
        return request.exists ? load(tx, parseOriginIntent(request.data()).uid) : null;
      }, { readOnly: true });
    },
    async append(uid: string, expected: OriginPhase, kind: OriginPhase, detail: Record<string, unknown>) {
      return db().runTransaction(async tx => {
        const current = await load(tx, uid), last = current.events.at(-1)!;
        if (last.kind === kind) { requireContract(same(last.detail, detail), "origin_event_conflict"); return current; }
        requireContract(current.control.phase === expected && current.control.phase !== "REVOKED", "origin_stale_phase");
        const event = makeOriginEvent(current.intent, last, kind, detail);
        const attestation = kind === "FINALIZED" ? makeOriginAttestation(current.intent, current.commitment) : current.attestation;
        const next = verifyOriginLedger(current.intent, [...current.events, event], attestation), r = refs(uid), eventRef = r.events.doc(originEventKey(event.sequence));
        const writes = [{ path: r.owner.path, data: next.control }, { path: eventRef.path, data: event },
          ...(kind === "FINALIZED" ? [{ path: r.attestation.path, data: attestation }] : [])];
        budget(writes); db(); tx.create(eventRef, { ...event }); tx.set(r.owner, { ...next.control });
        if (kind === "FINALIZED") tx.create(r.attestation, { ...attestation! });
        return next;
      });
    }
  });
}
