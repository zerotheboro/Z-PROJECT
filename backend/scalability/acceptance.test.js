import { describe, it, expect } from "vitest";
import { assertStage2Environment, assertStage2Transport } from "./acceptanceTransport";
import { checkAdmission, initialAdmission, initialControl, writerFence } from "./acceptanceState";
import { verifyInventoryProof } from "./inventory";
import { createStage2AcceptanceApp } from "./acceptanceApp";

const env = { NODE_ENV: "test", TRAINING_JOURNAL_STAGE2: "emulator-only", FIREBASE_PROJECT_ID: "demo-edulience-phase2a",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
describe("isolated Stage 2 boundary", () => {
  it("is disabled without explicit configuration", async () => {
    expect(() => assertStage2Environment({})).toThrow("stage2_disabled");
    const local = createStage2AcceptanceApp(); await local.close();
    expect(() => assertStage2Transport({ getFirestore() {} })).toThrow("stage2_transport_required");
  });
  it.each([
    { NODE_ENV: "production" }, { FIREBASE_PROJECT_ID: "production-project" }, { GCLOUD_PROJECT: "other-project" },
    { FIRESTORE_EMULATOR_HOST: "remote.example:18787" }, { FIRESTORE_EMULATOR_HOST: "localhost:18787" },
    { FIREBASE_AUTH_EMULATOR_HOST: "remote.example:9099" }, { GOOGLE_APPLICATION_CREDENTIALS: "forbidden" },
    { GITHUB_TOKEN: "synthetic-forbidden" }, { FIREBASE_CONFIG: "{}" }, { OPENAI_API_KEY: "synthetic-forbidden" },
    { HTTPS_PROXY: "http://remote.invalid" }, { grpc_proxy: "http://remote.invalid" }
  ])("rejects unsafe configuration without printing values %#", change => {
    expect(() => assertStage2Environment({ ...env, ...change })).toThrow();
  });
  it("allows only explicit demo configuration and the existing offline dummy", () => {
    expect(() => assertStage2Environment(env)).not.toThrow();
    expect(() => assertStage2Environment({ ...env, OPENAI_API_KEY: "offline-test-placeholder-not-a-real-key" })).not.toThrow();
  });
  it("binds admission and the incompatible v1 coordinator fence without upgrading inventory authority", () => {
    const uid = "stage2-unit-owner", at = "2026-10-22T10:00:00.000Z";
    const admission = initialAdmission(uid, at), fence = writerFence(uid, admission), control = initialControl(uid);
    expect(checkAdmission(uid, admission, fence, control).control.headRevision).toBe(0);
    expect(fence.persistenceVersion).toBe(2); expect(fence).not.toHaveProperty("profile");
    expect(verifyInventoryProof({ bootstrap: admission.bootstrap, bootstrapReferences: [], journalPrefix: [], sources: [] }, admission.bootstrap.source).authority).toBe("NOT VERIFIED");
    for (const bad of [{ ...fence, persistenceVersion: 1 }, { ...fence, uid: "another" }, { ...fence, lifecycleEpoch: 2 }])
      expect(() => checkAdmission(uid, admission, bad, control)).toThrow();
    expect(() => checkAdmission(uid, admission, fence, { ...control, lifecycle: "deleting" })).toThrow("stage2_account_not_active");
  });
});
