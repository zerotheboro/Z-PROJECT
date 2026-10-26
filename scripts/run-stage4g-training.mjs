// Separate synthetic application, never the active production server.
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a", GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", TRAINING_PUBLICATION_STAGE4G: "synthetic-emulator-only" });
for (const key of ["TRAINING_JOURNAL_STAGE2", "TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2", "TRAINING_SEAL_STAGE4D",
  "TRAINING_PROTECTED_STAGE4E", "TRAINING_SHADOW_STAGE3A", "TRAINING_PUBLICATION_STAGE3B"]) process.env[key] = "emulator-only";
const { createSyntheticPublicationApp } = await import("../dist-stage2/syntheticPublication.js");
const service = createSyntheticPublicationApp({ enabled: true });
const server = service.app.listen(18084, "127.0.0.1", () => console.log("Stage 4G synthetic Emulator pipeline on loopback port 18084. Production authority NOT VERIFIED; production publication disabled."));
let stopping = false;
async function stop() { if (stopping) return; stopping = true; server.close(); await service.close(); }
process.once("SIGINT", () => void stop()); process.once("SIGTERM", () => void stop());
