// Invoke through run-sanitized.mjs: no .env, inherited tokens, billing or paid AI.
import { createConnection } from "node:net";
if (process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs")) {
  throw new Error("Use: node scripts/run-sanitized.mjs scripts/start-local-training.mjs");
}
for (const key of ["GITHUB_PAT_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "DEBUG", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON", "PADDLE_API_KEY"]) {
  if (Object.hasOwn(process.env, key)) throw new Error("Local Training launcher requires the sanitized environment.");
}
Object.assign(process.env, { FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a",
  GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", TRAINING_COMPLETION_PHASE2A: "emulator-only" });
await Promise.all([18787, 9099].map(port => new Promise((resolve, reject) => {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.setTimeout(3000, () => socket.destroy(new Error("Required local Emulator is unavailable; no production fallback.")));
  socket.once("connect", () => { socket.end(); resolve(); }); socket.once("error", reject);
})));
const { initializeApp, getApps } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");
if (getApps().length) throw new Error("Local backend must start in a fresh sanitized process.");
const admin = initializeApp({ projectId: "demo-edulience-phase2a" }, "edulience-backend");
getFirestore(admin).settings({ host: "127.0.0.1:18787", ssl: false });
const { createRecommendationApp } = await import("../server.js");
const app = createRecommendationApp({
  trainingCompletionEnabled: true,
  verifyFirebaseToken: token => getAuth(admin).verifyIdToken(token, true),
  openAIClient: { responses: { create() { throw new Error("Paid AI is disabled in the local Training backend."); } } },
  billingConfig: { available: false, missing: [] }
});
app.listen(3001, "127.0.0.1", () => console.log("Isolated demo Training backend: http://127.0.0.1:3001 (Auth + Firestore Emulators required)."));
