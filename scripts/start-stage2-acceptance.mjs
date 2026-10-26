// Explicitly invoked only; not part of npm start, server.js, or the frontend.
if (!process.argv.includes("--enable-stage2") || process.env.NODE_ENV !== "test" ||
    !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs")) {
  throw new Error("Stage 2 is disabled. Use sanitized Node 24 and explicitly pass --enable-stage2.");
}
Object.assign(process.env, { TRAINING_JOURNAL_STAGE2: "emulator-only", FIREBASE_PROJECT_ID: "demo-edulience-phase2a",
  GCLOUD_PROJECT: "demo-edulience-phase2a", GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" });
const { createConnection } = await import("node:net");
await Promise.all([18787, 9099].map(port => new Promise((resolve, reject) => {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.setTimeout(3000, () => socket.destroy(new Error("Required demo Emulator unavailable; no production fallback.")));
  socket.once("connect", () => { socket.end(); resolve(); }); socket.once("error", reject);
})));
const { createStage2AcceptanceApp } = await import("../dist-stage2/acceptance.js");
const local = createStage2AcceptanceApp({ enabled: true });
const server = local.app.listen(3002, "127.0.0.1", () => console.log("Stage 2 demo acceptance only: http://127.0.0.1:3002. No bootstrap HTTP endpoint or publisher."));
async function close() { server.close(); await local.close(); }
process.once("SIGINT", close); process.once("SIGTERM", close);
