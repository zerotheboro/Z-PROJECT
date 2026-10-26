import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Never enumerate or log inherited values. Only harmless OS essentials pass.
const env = {};
for (const key of ["SystemRoot", "windir", "ComSpec", "PATHEXT", "OS", "TEMP", "TMP", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA"]) {
  if (process.env[key]) env[key] = process.env[key];
}
env.PATH = [path.dirname(process.execPath), process.env.SystemRoot ? path.join(process.env.SystemRoot, "System32") : "/usr/bin", "/bin"].join(path.delimiter);
const args = process.argv.slice(2);
const production = args[0] === "--production";
if (production) args.shift();
Object.assign(env, { CI: "true", NODE_ENV: production ? "production" : "test", DOTENV_CONFIG_QUIET: "true", METADATA_SERVER_DETECTION: "none" });
const preload = fileURLToPath(new URL("../test-support/no-dotenv.cjs", import.meta.url));
// npm/test runners may spawn further Node processes; keep .env disabled there.
env.NODE_OPTIONS = `--require "${preload.replace(/\\/g, "/")}"`;
const result = spawnSync(process.execPath, ["--require", preload, ...args], {
  env, cwd: process.cwd(), stdio: "inherit", windowsHide: true
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
