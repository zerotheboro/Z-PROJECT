import { describe, expect, it } from "vitest";
import { assertPublicationEnvironment } from "./publication";
import { EVIDENCE_PROTOCOL, PUBLICATION_POLICY, PUBLICATION_PROTOCOL, parseDevelopmentPublication,
  assertPublicationArtifactCount, parsePublicationCoordinator, parsePublicationVerification, publicationAuthorityBlockers } from "./publicationContracts";
import { generationIdentity } from "./generations";

const source = { uid: "offline-publication-owner", lifecycleEpoch: 1, revision: 2, headHash: "a".repeat(64) };
const generation = generationIdentity(source, "exposure-separated-accuracy-v2", "full-generation-v1");
const pointer = () => ({ schemaVersion: 1, status: "published", owner: { kind: "user", uid: source.uid }, lifecycleEpoch: 1,
  generationId: generation, source, nativeAcceptedCount: 1, manifestHash: "b".repeat(64), profileHash: "c".repeat(64),
  profileSchemaVersion: 2, aggregationVersion: "exposure-separated-accuracy-v2", executionVersion: "full-generation-v1",
  verificationProtocol: PUBLICATION_PROTOCOL, evidenceProtocol: EVIDENCE_PROTOCOL, policy: PUBLICATION_POLICY,
  pointerVersion: 1, publishedAt: "2026-10-23T00:00:00.000Z", coordinatorFence: 1, authorizationDigest: "d".repeat(64) });
const report = () => ({ schemaVersion: 1, state: "SOURCE_VERIFIED", publicationEligible: false, authority: "NOT VERIFIED", source,
  generationId: generation, manifestHash: "b".repeat(64), profileHash: "c".repeat(64), inventoryDigest: "d".repeat(64),
  artifactDigest: "e".repeat(64), admissionDigest: "f".repeat(64), bootstrapDigest: "0".repeat(64), nativeAcceptedCount: 1,
  profileSchemaVersion: 2, aggregationVersion: "exposure-separated-accuracy-v2", executionVersion: "full-generation-v1",
  verificationProtocol: PUBLICATION_PROTOCOL, evidenceProtocol: EVIDENCE_PROTOCOL, policy: PUBLICATION_POLICY,
  asOf: { seconds: 1792713600, nanoseconds: 0 }, workerFence: 1, checkpointSequence: 3 });
describe("isolated Stage 3B contracts do not manufacture publication authority", () => {
  it("rejects forged huge counts before allocating an expected artifact inventory", () => {
    expect(() => assertPublicationArtifactCount(1000, 1, 101, 1104)).not.toThrow();
    expect(() => assertPublicationArtifactCount(Number.MAX_SAFE_INTEGER, 1, 1, 5)).toThrow();
    expect(() => assertPublicationArtifactCount(1e9, 1, 1, 5)).toThrow("publication_artifact_inventory_invalid");
    expect(() => assertPublicationArtifactCount([1], 1, 1, 5)).toThrow();
  });
  it("requires separate opt-in and exact credential-free demo configuration", () => {
    const safe = { NODE_ENV: "test", TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_PUBLICATION_STAGE3B: "emulator-only",
      FIREBASE_PROJECT_ID: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
    expect(() => assertPublicationEnvironment(safe)).not.toThrow();
    for (const change of [{ TRAINING_PUBLICATION_STAGE3B: undefined }, { NODE_ENV: "production" }, { FIREBASE_PROJECT_ID: "production" },
      { FIRESTORE_EMULATOR_HOST: "example.invalid:443" }, { GITHUB_TOKEN: "synthetic-forbidden" }, { GOOGLE_APPLICATION_CREDENTIALS: "synthetic-forbidden" }])
      expect(() => assertPublicationEnvironment({ ...safe, ...change })).toThrow();
  });
  it("copies and freezes future pointer data without claiming provenance", () => {
    const original = pointer(), parsed = parseDevelopmentPublication(original);
    expect(parsed).toEqual(original); expect(Object.isFrozen(parsed)).toBe(true); expect(Object.isFrozen(original)).toBe(false);
    original.owner.uid = "changed"; expect(parsed.owner.uid).toBe(source.uid);
  });
  it.each([{ schemaVersion: 2 }, { status: ["published"] }, { owner: { kind: "guest", uid: source.uid } },
    { lifecycleEpoch: 2 }, { pointerVersion: 0 }, { pointerVersion: Number.MAX_SAFE_INTEGER + 1 }, { coordinatorFence: -1 },
    { generationId: "f".repeat(64) }, { policy: "lag-tolerant" }, { profileSchemaVersion: 1 }, { publishedAt: "2026-10-23" },
    { evidenceProtocol: "unknown" }, { authorizationDigest: null }, { extra: true }])("rejects incompatible pointer %#", change => {
    expect(() => parseDevelopmentPublication({ ...pointer(), ...change })).toThrow();
  });
  it("rejects unknown reader algorithms even when the generation identity is self-consistent", () => {
    const input = { ...pointer(), aggregationVersion: "unapproved-algorithm" };
    input.generationId = generationIdentity(input.source, input.aggregationVersion, input.executionVersion);
    expect(() => parseDevelopmentPublication(input)).toThrow("publication_version_invalid");
  });
  it("rejects getters and invalid Unicode before parsing or hashing", () => {
    const input = pointer(); let invoked = false;
    Object.defineProperty(input, "status", { enumerable: true, get() { invoked = true; return "published"; } });
    expect(() => parseDevelopmentPublication(input)).toThrow(); expect(invoked).toBe(false);
    expect(() => parseDevelopmentPublication({ ...pointer(), owner: { kind: "user", uid: "bad-\ud800" } })).toThrow();
  });
  it("keeps the three states distinct; rejects fabricated eligibility and authority", () => {
    expect(parsePublicationVerification(report()).state).toBe("SOURCE_VERIFIED");
    expect(parsePublicationVerification({ ...report(), state: "STRUCTURALLY_VALID", inventoryDigest: null }).state).toBe("STRUCTURALLY_VALID");
    for (const change of [{ state: "PUBLICATION_ELIGIBLE" }, { state: ["SOURCE_VERIFIED"] }, { publicationEligible: true },
      { authority: "VERIFIED" }, { inventoryDigest: null }, { verificationProtocol: "shadow-ready" }, { asOf: { seconds: 1, nanoseconds: 1e9 } }])
      expect(() => parsePublicationVerification({ ...report(), ...change })).toThrow();
  });
  it("a valid coordinator marker does not establish any missing enforcement", () => {
    const marker = { schemaVersion: 1, uid: source.uid, lifecycleEpoch: 1, protocol: "stage3b-coordinator-v1", lifecycle: "active",
      fencingToken: 1, writerProtocol: "journal-v2", policy: PUBLICATION_POLICY };
    expect(parsePublicationCoordinator(marker)).toEqual(marker);
    expect(publicationAuthorityBlockers()).toContain("legacy_browser_writers_unfenced");
    expect(publicationAuthorityBlockers()).toContain("privileged_source_writers_unfenced");
    expect(() => parsePublicationCoordinator({ ...marker, allWritersFenced: true })).toThrow();
    expect(() => parsePublicationCoordinator({ ...marker, writerProtocol: "legacy" })).toThrow();
  });
});
