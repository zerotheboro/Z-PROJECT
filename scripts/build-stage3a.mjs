import { build } from "esbuild";
import { writeFileSync } from "node:fs";
// Stays in the existing ignored development artifact directory.
const result = await build({ entryPoints: ["backend/scalability/shadowWorkerEntry.ts"],
  outfile: "dist-stage2/shadow-worker.js", bundle: true, platform: "node", target: "node24",
  format: "esm", packages: "external", metafile: true });
writeFileSync("dist-stage2/shadow-metafile.json", JSON.stringify(result.metafile, null, 2) + "\n");
