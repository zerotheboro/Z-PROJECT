import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";

if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
if (typeof globalThis.gc !== "function") throw new Error("Use --expose-gc for consistent heap baselines.");
const argument = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : Number(process.argv[index + 1]); };
const runs = argument("--runs", 3), latency = argument("--latency", 0);
assert.ok(Number.isInteger(runs) && runs >= 1 && runs <= 5 && [0, 100].includes(latency));
const baseline = JSON.parse(await readFile("dist-stage2/stage4i-baseline.json", "utf8"));
const allowed = ["src/quiz/learningEvidenceExposure.ts", "src/quiz/cumulativeProfile.ts", "src/quiz/cumulativeProfileView.ts",
  "src/services/syntheticPublishedProfile.ts", "src/components/CumulativeProfileDashboard.tsx"];
assert.deepEqual(Object.keys(baseline).sort(), [...allowed].sort());
console.log(JSON.stringify({ node: process.versions.node, runs, injectedLatencyMs: latency,
  baseline: allowed.map(file => ({ file, sha256: createHash("sha256").update(baseline[file]).digest("hex") })) }));
await mkdir("dist-stage2", { recursive: true });
const apis = {};
for (const variant of ["before", "after"]) {
  const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: [
    'export * from "./test-support/stage4hProfileFixture";',
    'export * from "./src/services/syntheticPublishedProfile";',
    'export * from "./src/quiz/learningEvidenceExposure";',
    'export {aggregateCompletedEvidence} from "./src/quiz/cumulativeProfile";',
    'export {buildReferenceExposureIndex} from "./test-support/referenceExposure.stage4i";',
    'export {default as Dashboard} from "./src/components/CumulativeProfileDashboard";',
    'export {createElement,act} from "react";', 'export {MemoryRouter} from "react-router-dom";',
    'export {createRoot} from "react-dom/client";'
  ].join("\n") }, bundle: true, packages: "external", platform: "node", target: "node24", format: "esm", jsx: "automatic",
    loader: { ".scss": "empty" }, define: { "import.meta.env": '{"DEV":false}' }, write: false,
    plugins: [{ name: "offline-snapshot", setup(b) {
      b.onResolve({ filter: /(^|\/)firebase$/ }, () => ({ path: "no-client", namespace: "stage4i-offline" }));
      b.onLoad({ filter: /.*/, namespace: "stage4i-offline" }, () => ({ contents: "export const auth=null,db=null,functions=null;", loader: "js" }));
      if (variant === "before") b.onLoad({ filter: /\.[tj]sx?$/ }, args => {
        const relative = path.relative(process.cwd(), args.path).replaceAll("\\", "/");
        return Object.hasOwn(baseline, relative) ? { contents: baseline[relative], loader: relative.endsWith("tsx") ? "tsx" : "ts", resolveDir: path.dirname(args.path) } : undefined;
      });
    } }] });
  const file = `dist-stage2/stage4i-${variant}.mjs`;
  await writeFile(file, bundle.outputFiles[0].text);
  apis[variant] = await import("../" + file);
}
const dom = new JSDOM('<!doctype html><div id="profile"></div>', { url: "http://127.0.0.1/", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.fetch = async () => { throw new Error("Network is forbidden in this offline benchmark."); };
const measurements = [];
try {
  for (const size of [100, 500, 1000]) {
    // The exact same fixture bytes serve both variants. Fixture preparation is
    // outside reader/render timings, including server-side aggregation emulation.
    const f = await apis.after.stage4hProfileFixture(size), sessions = f.history.map(row => row.data.evidence);
    assert.deepEqual(apis.before.aggregateCompletedEvidence({ kind: "user", uid: f.uid }, sessions), f.status.profile);
    const oldMetrics = { candidateVisits: 0, relationChecks: 0 }, indexed = apis.after.createExposureMetrics();
    assert.deepEqual(apis.after.buildReferenceExposureIndex(sessions, oldMetrics), apis.after.buildExposureIndex(sessions, indexed));
    console.log(JSON.stringify({ sessions: size, exposureOperations: { before: oldMetrics, after: indexed } }));
    for (let run = 1; run <= runs; run++) {
      let previous;
      for (const variant of run % 2 ? ["before", "after"] : ["after", "before"]) {
        const api = apis[variant]; f.calls.length = 0; globalThis.gc();
        const memoryBefore = process.memoryUsage(), start = performance.now();
        const view = await api.createSyntheticPublishedProfileReader(p => f.request(p, latency), uid => assert.equal(uid, f.uid), async () => [])(f.uid);
        const readerMs = performance.now() - start, memoryAfter = process.memoryUsage();
        globalThis.gc(); const retained = process.memoryUsage();
        assert.equal(view.coverageComplete, true); assert.deepEqual(view.warnings, []);
        assert.equal(view.history.length, size); assert.equal(view.summary.sessionCount, size);
        assert.equal(view.publication.pendingSessions, 0); assert.equal(view.revision, null);
        assert.equal(f.calls.length, 1 + Math.ceil(size / 20));
        if (previous) assert.deepEqual(view, previous); previous = view;
        const calls = f.calls.map(c => ({ ...c }));
        const root = api.createRoot(document.getElementById("profile")), renderStart = performance.now();
        try {
          await api.act(async () => root.render(api.createElement(api.MemoryRouter, null, api.createElement(api.Dashboard, { data: view, refresh() {} }))));
          const renderMs = performance.now() - renderStart;
          assert.ok(!document.body.textContent.includes("PRIVATE SYNTHETIC REFLECTION"));
          const button = [...document.querySelectorAll("button")].find(b => b.textContent === "Show 10 more history records");
          assert.ok(button); const pageStart = performance.now();
          await api.act(async () => button.click());
          const paginationMs = performance.now() - pageStart;
          assert.equal(document.querySelectorAll(".cumulative-history > li").length, 20);
          assert.equal(f.calls.length, calls.length);
          const round = n => +n.toFixed(2);
          const row = { sessions: size, run, variant, latencyMs: latency, initialReaderMs: round(readerMs), jsdomInitialRenderMs: round(renderMs),
            jsdomPaginationMs: round(paginationMs), requests: calls.length, historyDocumentsReturned: calls.filter(c => c.path !== "status").reduce((n, c) => n + c.records, 0),
            transportUTF8Bytes: calls.reduce((n, c) => n + c.bytes, 0), firestoreDocumentReads: null,
            heapDeltaMiB: round((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1048576),
            retainedHeapDeltaMiB: round((retained.heapUsed - memoryBefore.heapUsed) / 1048576), rssMiB: round(retained.rss / 1048576) };
          measurements.push(row); console.log(JSON.stringify(row));
        } finally { await api.act(async () => root.unmount()); }
      }
    }
  }
} finally { dom.window.close(); }
await writeFile(`dist-stage2/stage4i-measurements-${latency}.json`, JSON.stringify(measurements, null, 2) + "\n");
console.log(JSON.stringify({ scope: "Paired Node/jsdom offline measurements; no browser layout, Firestore billing, production users or backend capacity claim", samples: measurements.length }));
