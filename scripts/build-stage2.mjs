// Separate opt-in artifact. Never changes the active backend bundle entry.
import { build } from "esbuild";
await build({ entryPoints: ["backend/scalability/acceptanceApp.ts"], outfile: "dist-stage2/acceptance.js",
  bundle: true, platform: "node", target: "node24", format: "esm", packages: "external" });
