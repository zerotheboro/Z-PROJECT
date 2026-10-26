import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("dist-stage2", { recursive: true });
const result = await build({ entryPoints: ["backend/scalability/protectedTrainingApp.ts"], outfile: "dist-stage2/protectedTraining.js",
  bundle: true, platform: "node", target: "node24", format: "esm", packages: "external", metafile: true });
writeFileSync("dist-stage2/protectedTraining-metafile.json", JSON.stringify(result.metafile, null, 2) + "\n");
