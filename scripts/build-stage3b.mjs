import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const result = await build({ entryPoints: ["backend/scalability/publication.ts"], outfile: "dist-stage2/publication.js",
  bundle: true, platform: "node", target: "node24", format: "esm", packages: "external", metafile: true });
writeFileSync("dist-stage2/publication-metafile.json", JSON.stringify(result.metafile, null, 2) + "\n");
