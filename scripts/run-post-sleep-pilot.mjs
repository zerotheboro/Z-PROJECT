// Isolated local pilot only. The shared launcher disables .env loading and
// selects the demo Auth/Firestore configuration; no production fallback.
process.env.VITE_POST_SLEEP_PILOT = "local-only";
process.env.VITE_CUMULATIVE_PROFILE_PHASE2C = "emulator-only";
await import("./run-stage4e-frontend.mjs");
console.log("100-SECOND DELAY: choose the normal Memory method at http://127.0.0.1:5174/#/training/choose");
console.log("Retired overnight pilot, development only: http://127.0.0.1:5174/#/training/post-sleep/preview");
