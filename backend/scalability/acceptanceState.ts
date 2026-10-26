import type { Firestore } from "firebase-admin/firestore";
import { parseAccountRevisionControl } from "./controls";
import type { AccountRevisionControl } from "./controls";
import { createInventoryBootstrap } from "./inventory";
import { copyJSON, object, requireContract, timestamp, typedHash } from "./values";
import { requireCompletion } from "../trainingCompletionContract";

export const WRITER_PROTOCOL = "journal-v2";
export const ADMISSION_PROTOCOL = "empty-history-emulator-v1";
export function acceptanceReferences(db: Firestore, uid: string) {
  const user = db.collection("users").doc(uid);
  const profiles = user.collection("learningProfiles"), control = profiles.doc("journalControl");
  return { user, control, admission: profiles.doc("journalAdmission"), fence: profiles.doc("cumulative"),
    work: profiles.doc("journalWork"), checkpoint: profiles.doc("acceptanceCheckpoint"),
    journal: control.collection("journal"), archives: control.collection("completionArchives"), batches: control.collection("acceptanceBatches") };
}
export function initialAdmission(uid: string, recordedAt: string) {
  const source = { uid, lifecycleEpoch: 1, revision: 0, headHash: null };
  return copyJSON({ schemaVersion: 1, uid, lifecycleEpoch: 1, writerProtocol: WRITER_PROTOCOL,
    admissionProtocol: ADMISSION_PROTOCOL, admittedAt: recordedAt, bootstrap: createInventoryBootstrap(source, []) });
}
export function writerFence(uid: string, admission: unknown) {
  return { persistenceVersion: 2, writerProtocol: WRITER_PROTOCOL, uid, lifecycleEpoch: 1,
    admissionDigest: typedHash("stage2-admission-v1", admission) };
}
export function initialControl(uid: string): AccountRevisionControl {
  return parseAccountRevisionControl({ schemaVersion: 1, uid, lifecycleEpoch: 1, lifecycle: "active",
    headRevision: 0, headHash: null, nativeAcceptedCount: 0, published: null,
    desiredAggregationVersion: "exposure-separated-accuracy-v2", desiredExecutionVersion: "full-generation-v1" });
}
/** This admits only the server-stored empty-history Emulator protocol. It is not
 * an inventory authority upgrade and does not admit migrated/existing histories. */
export function checkAdmission(uid: string, admissionValue: unknown, fenceValue: unknown, controlValue: unknown) {
  const admission = object(admissionValue, ["schemaVersion", "uid", "lifecycleEpoch", "writerProtocol", "admissionProtocol", "admittedAt", "bootstrap"]);
  requireContract(admission.schemaVersion === 1 && admission.uid === uid && admission.lifecycleEpoch === 1 &&
    admission.writerProtocol === WRITER_PROTOCOL && admission.admissionProtocol === ADMISSION_PROTOCOL, "invalid_stage2_admission");
  timestamp(admission.admittedAt);
  const expectedBootstrap = createInventoryBootstrap({ uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []);
  requireContract(typedHash("stage2-bootstrap-check-v1", admission.bootstrap) === typedHash("stage2-bootstrap-check-v1", expectedBootstrap), "invalid_stage2_bootstrap");
  const fence = object(fenceValue, ["persistenceVersion", "writerProtocol", "uid", "lifecycleEpoch", "admissionDigest"]);
  requireContract(typedHash("stage2-fence-check-v1", fence) === typedHash("stage2-fence-check-v1", writerFence(uid, admission)), "incompatible_writer_protocol");
  const control = parseAccountRevisionControl(controlValue);
  requireCompletion(control.uid === uid && control.lifecycleEpoch === 1 && control.lifecycle === "active",
    "stage2_account_not_active", 409);
  // No identity/import worker or publisher exists in Stage 2. Only this writer's
  // 2/3-entry acceptance batches may exist in this admitted account epoch.
  requireContract(control.published === null, "stage2_publication_not_supported");
  return { admission, control };
}
