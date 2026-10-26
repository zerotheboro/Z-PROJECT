import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const tools = path.resolve(argument("--tools-dir") ?? path.join(root, "test-support/firestore"));
const javaHome = argument("--java-home");
const cache = argument("--emulator-cache");
const phase2b = process.argv.includes("--phase2b");
const serve = process.argv.includes("--serve");
if (serve && !phase2b) throw new Error("--serve is only supported with the isolated --phase2b configuration.");
const cli = path.join(tools, "node_modules/firebase-tools/lib/bin/firebase.js");
if (!existsSync(cli)) throw new Error("Install the pinned test-support/firestore dependencies first; no production fallback.");
const temp = mkdtempSync(path.join(os.tmpdir(), "edulience-phase2a-"));
const env = {};
for (const key of ["SystemRoot", "windir", "ComSpec", "PATHEXT", "OS"]) if (process.env[key]) env[key] = process.env[key];
for (const folder of ["home", "tmp", "config", "appdata", "localappdata"]) mkdirSync(path.join(temp, folder));
Object.assign(env, {
  PATH: [path.dirname(process.execPath), ...(javaHome ? [path.join(javaHome, "bin")] : []), process.env.SystemRoot ? path.join(process.env.SystemRoot, "System32") : "/usr/bin", "/bin"].join(path.delimiter),
  HOME: path.join(temp, "home"), USERPROFILE: path.join(temp, "home"), TEMP: path.join(temp, "tmp"), TMP: path.join(temp, "tmp"),
  APPDATA: path.join(temp, "appdata"), LOCALAPPDATA: path.join(temp, "localappdata"), XDG_CONFIG_HOME: path.join(temp, "config"),
  GCLOUD_PROJECT: "demo-edulience-phase2a", GOOGLE_CLOUD_PROJECT: "demo-edulience-phase2a", FIREBASE_PROJECT_ID: "demo-edulience-phase2a",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787", METADATA_SERVER_DETECTION: "none", NODE_ENV: "test", CI: "true",
  NO_UPDATE_NOTIFIER: "1", FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true", DOTENV_CONFIG_QUIET: "true",
  EDULIENCE_TEST_TOOLS_DIRECTORY: tools
});
if (javaHome) env.JAVA_HOME = javaHome;
if (cache) env.FIREBASE_EMULATORS_PATH = path.resolve(cache);
if (phase2b) env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
console.log(`Starting isolated demo-only Phase ${phase2b ? "2B Auth/Firestore" : "2A Firestore"} ${serve ? "Emulators" : "tests"} (no inherited credentials).`);
const args = [cli, serve ? "emulators:start" : "emulators:exec", "--only", phase2b ? "firestore,auth" : "firestore", "--project", "demo-edulience-phase2a", "--non-interactive",
  "--config", path.join(root, phase2b ? "firebase.phase2b-emulator.json" : "firebase.phase2a-emulator.json")];
if (!serve) args.push('node --require ./test-support/no-dotenv.cjs --test --test-concurrency=1 backend/trainingCompletion.emulator.mjs backend/trainingCompletionRepair.emulator.mjs' +
  (phase2b ? ' backend/trainingCompletionOutbox.emulator.mjs test-support/cumulativeProfileReader.emulator.mjs' : ''));
const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
