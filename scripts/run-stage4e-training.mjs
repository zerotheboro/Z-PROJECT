// Invoke through run-sanitized.mjs. No .env, production app or remote client.
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a",
  GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  TRAINING_JOURNAL_STAGE2: "emulator-only", TRAINING_AUTHORITY_STAGE4A: "emulator-only", TRAINING_BOOTSTRAP_STAGE4B1: "emulator-only",
  TRAINING_ORIGIN_STAGE4B2: "emulator-only", TRAINING_SEAL_STAGE4D: "emulator-only", TRAINING_PROTECTED_STAGE4E: "emulator-only" });
const { createProtectedTrainingApp } = await import("../dist-stage2/protectedTraining.js");
const service = createProtectedTrainingApp({ enabled: true });
const server = service.app.listen(18084, "127.0.0.1", () => console.log("Stage 4E demo Training backend listening on loopback port 18084; admission NOT VERIFIED; publication disabled."));
let stopping = false;
async function stop() { if (stopping) return; stopping = true; server.close(); await service.close(); }
process.once("SIGINT", () => void stop()); process.once("SIGTERM", () => void stop());
