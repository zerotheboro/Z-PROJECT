import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { transform } from "esbuild";
import { positiveCases, negativeCases } from "../test-support/studyTipConstructor.type-cases.mjs";

if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
const root = process.cwd(), temporary = mkdtempSync(path.join(tmpdir(), "study-tip-types-"));
const positive = path.join(temporary, "positive.tsx"), negative = path.join(temporary, "negative.tsx"), config = path.join(temporary, "tsconfig.json");
const posix = value => value.replaceAll("\\", "/");
const imports = `import { DetailOfTips, type TipHeader, type TipParagraph, type StudyTip } from ${JSON.stringify(posix(path.resolve("src/MIDSECTION/info_every_tips.jsx")))};\nimport type { ReactNode } from ${JSON.stringify(posix(path.resolve("node_modules/@types/react/index.d.ts")))};\n`;
const compiler = file => {
  writeFileSync(config, JSON.stringify({ extends: posix(path.resolve("tsconfig.json")), files: [file], include: [], exclude: [],
    compilerOptions: { types: [posix(path.resolve("node_modules/vite/client.d.ts")), posix(path.resolve("node_modules/@types/node/index.d.ts"))] } }));
  const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--project", config, "--noEmit", "--pretty", "false"],
    { cwd: root, env: process.env, encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  const output = result.stdout + result.stderr;
  const diagnostics = output.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
    return match ? [{ file: path.resolve(root, match[1]), line: Number(match[2]), code: match[4], message: match[5] }] : [];
  });
  return { exit: result.status, diagnostics, output };
};
try {
  writeFileSync(positive, imports + positiveCases);
  const valid = compiler(positive);
  assert.ok(valid.exit === 0, `Positive constructor cases must compile:\n${valid.output}`);
  console.log(JSON.stringify({ positiveConstructionCases: (positiveCases.match(/new DetailOfTips/g) ?? []).length,
    positiveCases: "passed", compilerExit: valid.exit }));
  const expected = new Map(); let source = imports;
  for (const [name, expression] of negativeCases) {
    source += `// ${name}\n`; expected.set(source.split("\n").length, name); source += expression + "\n";
  }
  writeFileSync(negative, source);
  const invalid = compiler(negative), rejected = new Set();
  for (const diagnostic of invalid.diagnostics) {
    assert.ok(diagnostic.file === negative && expected.has(diagnostic.line), `Unexpected diagnostic: ${JSON.stringify(diagnostic)}`);
    assert.ok(["TS2345", "TS2554", "TS2555", "TS2322", "TS2769"].includes(diagnostic.code), `Unexpected diagnostic kind: ${diagnostic.code}`);
    rejected.add(expected.get(diagnostic.line));
  }
  const accepted = negativeCases.map(([name]) => name).filter(name => !rejected.has(name));
  const original = invalid.diagnostics.find(diagnostic => expected.get(diagnostic.line) === "original explicit object defaults");
  console.log(JSON.stringify({ negativeCases: negativeCases.length, rejected: rejected.size, unexpectedlyAccepted: accepted,
    originalExampleDiagnostic: original?.code ?? null, compilerExit: invalid.exit }));
  assert.ok(invalid.exit !== 0 && accepted.length === 0, "Every incompatible-default call must be rejected by TypeScript.");

  // Execute only the actual constructor, avoiding app initialization and asset IO.
  const constructorFrom = file => { const full = readFileSync(file, "utf8");
    return 'const image_importor=(src,format)=>({src,format});' + full.slice(full.indexOf("export class DetailOfTips"), full.indexOf("function CITATE")); };
  const options = { minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false };
  const runtime = await transform(constructorFrom("src/MIDSECTION/info_every_tips.tsx"), { ...options, loader: "tsx" });
  const libraryRuntime = await transform(constructorFrom("src/MIDSECTION/info_every_tips.jsx"), { ...options, loader: "jsx" });
  assert.ok(runtime.code === libraryRuntime.code, "The typed constructor must erase to the unchanged Library runtime constructor.");
  const { DetailOfTips } = await import("data:text/javascript;base64," + Buffer.from(runtime.code).toString("base64"));
  const defaults = new DetailOfTips(); assert.equal(defaults.header, "header"); assert.equal(defaults.paragraph, "p");
  const absent = new DetailOfTips(undefined, undefined); assert.equal(absent.header, "header"); assert.equal(absent.paragraph, "p");
  const header = { eng: "Title" }, paragraph = { eng: "Text" }, asset = { src: "asset.svg", format: "image" };
  const tip = new DetailOfTips(header, paragraph, asset, "left", "Info", false, "ignored");
  assert.equal(tip.header, header); assert.equal(tip.paragraph, paragraph); assert.equal(tip.asset, asset);
  assert.equal(tip.side, "left"); assert.equal(tip.more_info, "Info"); assert.equal(tip.audio, false);
  console.log(JSON.stringify({ runtimeDefaults: [defaults.header, defaults.paragraph], explicitValuesAndLegacyArgumentPreserved: true,
    emittedConstructorMatchesLibraryRuntime: true }));
} finally {
  for (const file of [positive, negative, config]) { try { unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; } }
  rmdirSync(temporary);
}
