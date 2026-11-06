if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Use sanitized Node 24 for the memory-only Economics pilot.");
process.env.VITE_ECONOMICS_PROGRESS_PILOT = "memory-only";
await import("./run-stage4f-frontend.mjs");
console.log("Phase 5B1 DRAFT memory-only pilot: http://127.0.0.1:5174/#/training — synthetic demo accounts, PPC/Elasticity only.");
console.log("Start a NEW normal Training session. Form C, genuine admission and production publication remain disabled.");
