import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
if (process.versions.node.split(".")[0] !== "24" || process.env.NODE_ENV !== "test" || !process.env.NODE_OPTIONS?.includes("no-dotenv.cjs"))
  throw new Error("Sanitized Node 24 is required.");
if (typeof globalThis.gc !== "function") throw new Error("Use --expose-gc so reported reader heap deltas have an explicit GC baseline.");
// Offline measurement only: no Firebase client or backend writer is constructed.
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: [
  'export * from "./test-support/stage4hProfileFixture";',
  'export * from "./src/services/syntheticPublishedProfile";',
  'export {default as Dashboard} from "./src/components/CumulativeProfileDashboard";',
  'export {createElement,act} from "react";', 'export {MemoryRouter} from "react-router-dom";',
  'export {createRoot} from "react-dom/client";',
  'export {renderToStaticMarkup} from "react-dom/server";'
].join("\n") }, bundle: true, packages: "external", platform: "node", target: "node24", format: "esm", jsx: "automatic",
  loader: { ".scss": "empty" }, define: { "import.meta.env": '{"DEV":false}' }, write: false,
  plugins: [{ name: "offline-no-firebase", setup(b) {
    b.onResolve({ filter: /(^|\/)firebase$/ }, () => ({ path: "no-client", namespace: "stage4h-offline" }));
    b.onLoad({ filter: /.*/, namespace: "stage4h-offline" }, () => ({ contents: 'export const auth=null,db=null,functions=null;', loader: "js" }));
  } }] });
await mkdir("dist-stage2", { recursive: true });
await writeFile("dist-stage2/stage4h-performance.mjs", bundle.outputFiles[0].text);
const dom = new JSDOM('<!doctype html><div id="profile"></div>', { url: "http://127.0.0.1/", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.fetch = async () => { throw new Error("Network is forbidden in this offline benchmark."); };
const api = await import("../dist-stage2/stage4h-performance.mjs");
const measurements = [];
for (const size of [4, 100, 500, 1000]) {
  const startFixture = performance.now(), f = await api.stage4hProfileFixture(size);
  const fixtureMs = performance.now() - startFixture;
  assert.ok(f.history.every(row => Date.parse(row.data.evidence.completedAt) <= Date.parse(f.status.publication.publishedAt)));
  for (const delayMs of size === 100 ? [0, 100] : [0]) {
    f.calls.length = 0; globalThis.gc?.();
    const before = process.memoryUsage(), start = performance.now();
    const view = await api.createSyntheticPublishedProfileReader(path => f.request(path, delayMs), uid => assert.equal(uid, f.uid), async () => [])(f.uid);
    const loadMs = performance.now() - start, after = process.memoryUsage();
    assert.equal(view.history.length, size); assert.equal(view.summary.sessionCount, size); assert.equal(view.coverageComplete, true);
    assert.deepEqual(view.warnings, []); assert.equal(view.publication.pendingSessions, 0); assert.equal(view.revision, null);
    assert.equal(f.calls.length, 1 + Math.ceil(size / 20));
    const renderStart = performance.now();
    const markup = api.renderToStaticMarkup(api.createElement(api.MemoryRouter, null,
      api.createElement(api.Dashboard, { data: view, refresh() {} })));
    assert.ok(!markup.includes("PRIVATE SYNTHETIC REFLECTION"));
    const staticRenderMs = performance.now() - renderStart;
    const root = api.createRoot(document.getElementById("profile")), domStart = performance.now();
    await api.act(async () => root.render(api.createElement(api.MemoryRouter, null, api.createElement(api.Dashboard, { data: view, refresh() {} }))));
    const jsdomInitialRenderMs = performance.now() - domStart;
    const more = [...document.querySelectorAll("button")].find(button => button.textContent === "Show 10 more history records");
    let jsdomPaginationMs = null;
    if (more) {
      const pageStart = performance.now(); await api.act(async () => more.click()); jsdomPaginationMs = performance.now() - pageStart;
      assert.equal(document.querySelectorAll(".cumulative-history > li").length, Math.min(20, size));
    }
    await api.act(async () => root.unmount());
    const row = { sessions: size, injectedLatencyMsPerRequest: delayMs, fixturePreparationMs: Math.round(fixtureMs),
      initialReaderMs: Math.round(loadMs), nodeStaticRenderMs: Math.round(staticRenderMs), jsdomInitialRenderMs: Math.round(jsdomInitialRenderMs),
      jsdomPaginationMs: jsdomPaginationMs === null ? null : Math.round(jsdomPaginationMs),
      historyRecordsReturned: f.calls.filter(x => x.path !== "status").reduce((n, x) => n + x.records, 0),
      transportRequests: f.calls.length, transportUTF8Bytes: f.calls.reduce((n, x) => n + x.bytes, 0),
      pageLatencyMs: { minimum: Math.round(Math.min(...f.calls.slice(1).map(x => x.milliseconds))),
        maximum: Math.round(Math.max(...f.calls.slice(1).map(x => x.milliseconds))) },
      heapDeltaMiB: +((after.heapUsed - before.heapUsed) / 1048576).toFixed(2), rssMiB: +(after.rss / 1048576).toFixed(2),
      renderedUTF8Bytes: Buffer.byteLength(markup), firestoreDocumentReads: null };
    measurements.push(row); console.log(JSON.stringify(row));
  }
}
dom.window.close();
console.log(JSON.stringify({scope: "Node 24 injected transport, static markup and jsdom interaction only; no real network, browser layout, Firestore billing or backend publication capacity measurement", measurements: measurements.length}));
