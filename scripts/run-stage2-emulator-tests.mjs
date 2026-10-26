// Run THROUGH run-sanitized.mjs, with the existing local demo Emulators running.
import { spawnSync } from "node:child_process";
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" ||
    !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs")) throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a",
  GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" });
const result = spawnSync(process.execPath, ["--require", "./test-support/no-dotenv.cjs", "--test", "--test-concurrency=1",
  "backend/scalability/acceptance.emulator.mjs"], { env: process.env, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
