import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("dist-stage2", { recursive: true });
const result = await build({ entryPoints: ["backend/scalability/syntheticPublicationApp.ts"], outfile: "dist-stage2/syntheticPublication.js",
  bundle: true, platform: "node", target: "node24", format: "esm", packages: "external", metafile: true });
writeFileSync("dist-stage2/syntheticPublication-metafile.json", JSON.stringify(result.metafile, null, 2) + "\n");
