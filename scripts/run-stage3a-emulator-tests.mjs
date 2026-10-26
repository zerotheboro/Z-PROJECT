import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" ||
    !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs")) throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a",
  GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" });
for (const port of [18787, 9099]) await new Promise((resolve, reject) => {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.setTimeout(2_000);
  socket.once("connect", () => { socket.destroy(); resolve(); });
  socket.once("timeout", () => { socket.destroy(); reject(new Error("Required loopback demo Emulator unavailable; no fallback.")); });
  socket.once("error", () => reject(new Error("Required loopback demo Emulator unavailable; no fallback.")));
});
const result = spawnSync(process.execPath, ["--require", "./test-support/no-dotenv.cjs", "--test", "--test-concurrency=1",
  ...process.argv.slice(2), "backend/scalability/shadow.emulator.mjs"], { env: process.env, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
