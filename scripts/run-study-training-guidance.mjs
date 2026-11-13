if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Use sanitized Node 24 for isolated study guidance.");
process.env.VITE_STUDY_TRAINING_GUIDANCE = "emulator-only";
await import("./run-stage4g-frontend.mjs");
console.log("Optional Profile → Training guidance: http://127.0.0.1:5174/#/training/profile (synthetic demo accounts only).");
