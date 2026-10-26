import { createServer } from "vite";
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
Object.assign(process.env, { VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only", VITE_TRAINING_PROTECTED_STAGE4E: "emulator-only",
  VITE_TRAINING_COMPLETION_PROJECT_ID: "demo-edulience-phase2a", VITE_API_BASE_URL: "http://127.0.0.1:18084" });
// Override envDir: Vite must not read .env even though dotenv.config is blocked.
const server = await createServer({ envDir: false, server: { host: "127.0.0.1", port: 5174, strictPort: true } });
await server.listen(); console.log("Isolated Stage 4E frontend on http://127.0.0.1:5174; synthetic Emulator students only.");
