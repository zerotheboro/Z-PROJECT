// Explicit local opt-in. Reuse Stage 4E's isolated frontend and backend target.
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { VITE_CUMULATIVE_PROFILE_PHASE2C: "emulator-only", VITE_CUMULATIVE_PROFILE_STAGE4F: "emulator-only" });
await import("./run-stage4e-frontend.mjs");
console.log("Stage 4F Emulator evidence: http://127.0.0.1:5174/#/training/profile");
console.log("Stage 4F synthetic preview: http://127.0.0.1:5174/#/training/profile?preview=synthetic (clearly labeled UI fixtures).");
console.log("Publication disabled; trusted admission NOT VERIFIED.");
