import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const checked = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.backend.json", "--noEmit"], { cwd: root, stdio: "inherit", windowsHide: true });
if (checked.error) throw checked.error;
if (checked.status !== 0) process.exit(checked.status ?? 1);
// Explicit standalone Node bundle, not Vite runtime module resolution.
const result = await build({ absWorkingDir: root, entryPoints: ["backend/trainingCompletion.ts"],
  outfile: "dist-backend/backend/trainingCompletion.js", bundle: true, platform: "node",
  target: "node22", format: "esm", packages: "external", metafile: true });
mkdirSync(new URL("../dist-backend/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist-backend/package.json", import.meta.url), JSON.stringify({ type: "module" }) + "\n");
writeFileSync(new URL("../dist-backend/metafile.json", import.meta.url), JSON.stringify(result.metafile, null, 2) + "\n");
