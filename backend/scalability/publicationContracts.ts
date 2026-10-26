import { generationIdentity } from "./generations";
import { parseJournalAnchor } from "./journal";
import type { JournalAnchor } from "./journal";
import { parseReadTime } from "./shadowContracts";
import { bounded, hash, integer, object, requireContract, text, timestamp } from "./values";

export const PUBLICATION_PROTOCOL = "source-replay-stage3b-v1" as const;
export const PUBLICATION_POLICY = "exact-head-stage3b-v1" as const;
export const EVIDENCE_PROTOCOL = "native-evidence-v1-journal-v2" as const;
export const PUBLICATION_STATES = Object.freeze(["STRUCTURALLY_VALID", "SOURCE_VERIFIED", "PUBLICATION_ELIGIBLE"] as const);
// The third state is an obligation, NOT an assertion a stored marker can grant.
// No Stage 3B authority-admission provider exists; no function here issues it.
export type VerificationState = typeof PUBLICATION_STATES[number];
/** Check the actual fetched inventory BEFORE allocating count-sized ID arrays.
 * Corrupt safe-integer counters must not induce huge speculative allocations. */
export function assertPublicationArtifactCount(accepted: number, parts: number, pages: number, actual: number): void {
  for (const value of [accepted, parts, pages, actual]) integer(value);
  const expected = accepted + parts + pages + 2;
  integer(expected);
  requireContract(expected === actual, "publication_artifact_inventory_invalid");
}
export type PublicationVerification = Readonly<{
  schemaVersion: 1; state: "STRUCTURALLY_VALID" | "SOURCE_VERIFIED";
  publicationEligible: false; authority: "NOT VERIFIED";
  source: JournalAnchor; generationId: string; manifestHash: string; profileHash: string;
  inventoryDigest: string | null; artifactDigest: string; admissionDigest: string; bootstrapDigest: string;
  nativeAcceptedCount: number; profileSchemaVersion: 2; aggregationVersion: string; executionVersion: string;
  verificationProtocol: typeof PUBLICATION_PROTOCOL; evidenceProtocol: typeof EVIDENCE_PROTOCOL;
  policy: typeof PUBLICATION_POLICY; asOf: { seconds: number; nanoseconds: number };
  workerFence: number; checkpointSequence: number;
}>;

export function parsePublicationVerification(value: unknown): PublicationVerification {
  const data = object(value, ["schemaVersion", "state", "publicationEligible", "authority", "source", "generationId", "manifestHash", "profileHash",
    "inventoryDigest", "artifactDigest", "admissionDigest", "bootstrapDigest", "nativeAcceptedCount", "profileSchemaVersion", "aggregationVersion",
    "executionVersion", "verificationProtocol", "evidenceProtocol", "policy", "asOf", "workerFence", "checkpointSequence"]);
  const source = parseJournalAnchor(data.source);
  requireContract(data.schemaVersion === 1 && (data.state === "STRUCTURALLY_VALID" || data.state === "SOURCE_VERIFIED") &&
    data.publicationEligible === false && data.authority === "NOT VERIFIED" && data.profileSchemaVersion === 2 &&
    data.verificationProtocol === PUBLICATION_PROTOCOL && data.evidenceProtocol === EVIDENCE_PROTOCOL && data.policy === PUBLICATION_POLICY,
  "publication_verification_invalid");
  text(data.aggregationVersion, 64); text(data.executionVersion, 64);
  requireContract(data.generationId === generationIdentity(source, data.aggregationVersion, data.executionVersion), "publication_generation_invalid");
  for (const name of ["manifestHash", "profileHash", "artifactDigest", "admissionDigest", "bootstrapDigest"]) hash(data[name]);
  if (data.state === "SOURCE_VERIFIED") hash(data.inventoryDigest);
  else requireContract(data.inventoryDigest === null, "publication_verification_invalid");
  integer(data.nativeAcceptedCount); integer(data.workerFence, 1); integer(data.checkpointSequence, 1); parseReadTime(data.asOf);
  requireContract(data.nativeAcceptedCount <= source.revision, "publication_verification_invalid");
  return bounded(data, 16 * 1024) as unknown as PublicationVerification;
}

/** Future read-only wire contract. Parsing a pointer is NOT authenticating it or
 * permission to publish. Existing frontend readers/outbox do not consume this. */
export function parseDevelopmentPublication(value: unknown) {
  const data = object(value, ["schemaVersion", "status", "owner", "lifecycleEpoch", "generationId", "source",
    "nativeAcceptedCount", "manifestHash", "profileHash", "profileSchemaVersion", "aggregationVersion", "executionVersion",
    "verificationProtocol", "evidenceProtocol", "policy", "pointerVersion", "publishedAt", "coordinatorFence", "authorizationDigest"]);
  const owner = object(data.owner, ["kind", "uid"]), source = parseJournalAnchor(data.source);
  requireContract(data.schemaVersion === 1 && data.status === "published" && owner.kind === "user" &&
    owner.uid === source.uid && data.lifecycleEpoch === source.lifecycleEpoch && data.lifecycleEpoch === 1, "publication_scope_invalid");
  text(data.aggregationVersion, 64); text(data.executionVersion, 64); hash(data.generationId);
  requireContract(data.generationId === generationIdentity(source, data.aggregationVersion, data.executionVersion), "publication_generation_invalid");
  hash(data.manifestHash); hash(data.profileHash); hash(data.authorizationDigest);
  integer(data.nativeAcceptedCount); integer(data.pointerVersion, 1); integer(data.coordinatorFence, 1); timestamp(data.publishedAt);
  requireContract(data.nativeAcceptedCount <= source.revision && data.profileSchemaVersion === 2 &&
    data.aggregationVersion === "exposure-separated-accuracy-v2" && data.executionVersion === "full-generation-v1" &&
    data.verificationProtocol === PUBLICATION_PROTOCOL && data.evidenceProtocol === EVIDENCE_PROTOCOL && data.policy === PUBLICATION_POLICY,
  "publication_version_invalid");
  return bounded(data, 16 * 1024);
}

/** Description only. Even a perfectly shaped Admin-written marker is untrusted
 * evidence of rules/IAM enforcement, bootstrap origin, or immutable sources. */
export function parsePublicationCoordinator(value: unknown) {
  const data = object(value, ["schemaVersion", "uid", "lifecycleEpoch", "protocol", "lifecycle", "fencingToken", "writerProtocol", "policy"]);
  parseJournalAnchor({ uid: data.uid, lifecycleEpoch: data.lifecycleEpoch, revision: 0, headHash: null });
  requireContract(data.schemaVersion === 1 && data.lifecycleEpoch === 1 && data.protocol === "stage3b-coordinator-v1" &&
    data.writerProtocol === "journal-v2" && data.policy === PUBLICATION_POLICY &&
    ["active", "deleting", "migrating"].some(state => state === data.lifecycle), "publication_coordinator_invalid");
  integer(data.fencingToken, 1); return data;
}

/** Deliberately no caller-supplied boolean/proof/provider parameter. These facts
 * cannot be established by this isolated protocol without approved writer,
 * rules/IAM, lifecycle and reader changes. Fail closed even for valid markers. */
export function publicationAuthorityBlockers(): readonly string[] {
  return Object.freeze(["bootstrap_origin_unattested", "legacy_browser_writers_unfenced",
    "privileged_source_writers_unfenced", "lifecycle_deletion_protocol_unverified",
    "generation_immutability_unverified", "reader_compatibility_not_admitted"]);
}
