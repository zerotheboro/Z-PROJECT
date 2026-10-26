// THROUGH run-sanitized.mjs. No production or arbitrary host arguments.
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" ||
    !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs") || process.argv[2] !== "--enable-stage3a")
  throw new Error("Explicit sanitized Node 24 Stage 3A opt-in required.");
Object.assign(process.env, { TRAINING_SHADOW_STAGE3A: "emulator-only", TRAINING_JOURNAL_STAGE2: "emulator-only",
  FIREBASE_PROJECT_ID: "demo-edulience-phase2a", GCLOUD_PROJECT: "demo-edulience-phase2a",
  GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" });
const { createShadowWorker } = await import("../dist-stage2/shadow-worker.js");
const worker = createShadowWorker();
try {
  let afterPath = null;
  do {
    const page = process.argv[3] ? { uids: [process.argv[3]], afterPath: null } : await worker.observePendingPage(10, afterPath);
    for (const uid of page.uids) {
      try { await worker.processOwner(uid); }
      catch (error) {
        // Static codes only; one blocked owner must not starve other owners.
        const code = typeof error?.code === "string" && /^[a-z0-9_-]{1,100}$/.test(error.code) ? error.code : "shadow_worker_unavailable";
        console.error("STAGE3A BLOCKED/RETRY", code); process.exitCode = 1;
      }
    }
    afterPath = page.afterPath;
  } while (afterPath);
  // Metrics only. Never tokens, environment values, UID, payload or Reflection.
  console.log("STAGE3A SHADOW METRICS", JSON.stringify(worker.metrics));
} finally { await worker.close(); }
