if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { VITE_CUMULATIVE_PROFILE_PHASE2C: "emulator-only", VITE_CUMULATIVE_PROFILE_STAGE4G: "synthetic-emulator-only" });
await import("./run-stage4e-frontend.mjs");
console.log("Stage 4G: http://127.0.0.1:5174/#/training/profile — synthetic Emulator Auth owners only; use the separate Stage 4G backend.");
console.log("Production authority NOT VERIFIED. Production publication disabled. No memory fixture is a published generation.");
