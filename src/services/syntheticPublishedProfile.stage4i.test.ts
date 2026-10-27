import { afterEach, expect, it, vi } from "vitest";
import { createSyntheticPublishedProfileReader } from "./syntheticPublishedProfile";
import { stage4hProfileFixture } from "../../test-support/stage4hProfileFixture";
import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";

afterEach(() => vi.restoreAllMocks());
const offset = (path: string) => Number(new URL(path, "http://127.0.0.1/").searchParams.get("after"));

it("prefetches only the next actual cursor while folding all hashes strictly in order", async () => {
  const f = await stage4hProfileFixture(41);
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let folds = 0;
  vi.spyOn(crypto.subtle, "digest").mockImplementation((algorithm, data) => {
    if (new TextDecoder().decode(data).includes('"synthetic-history-fold-stage4g-v1"')) folds++;
    return digest(algorithm, data);
  });
  const started: { after: number; folds: number }[] = [];
  const request = async (path: string) => {
    if (path !== "status") started.push({ after: offset(path), folds });
    return f.request(path);
  };
  const view = await createSyntheticPublishedProfileReader(request, () => {}, async () => [])(f.uid);
  expect(started).toEqual([{ after: 0, folds: 0 }, { after: 20, folds: 0 }, { after: 40, folds: 20 }]);
  expect(folds).toBe(41); expect(view.coverageComplete).toBe(true); expect(view.history).toHaveLength(41);
  expect(view.publication).toMatchObject({ acceptedSessions: 41, publishedSessions: 41, pendingSessions: 0 });
});

it("never emits a partial snapshot when a later prefetched page fails, and retries the original pinned generation", async () => {
  const f = await stage4hProfileFixture(41); let fail = true, returned = false;
  const reader = createSyntheticPublishedProfileReader(async path => {
    if (path !== "status" && offset(path) === 20 && fail) throw new Error("lost synthetic response");
    return f.request(path);
  }, () => {}, async () => []);
  await expect(reader(f.uid).then(value => { returned = true; return value; })).rejects.toThrow("lost synthetic response");
  expect(returned).toBe(false); fail = false;
  const restored = await reader(f.uid);
  expect(restored.history).toHaveLength(41); expect(restored.publication?.generationId).toBe(f.generationId);
});

it("handles a rejected prefetch even when the current page is corrupt", async () => {
  const f = await stage4hProfileFixture(21);
  await expect(createSyntheticPublishedProfileReader(async path => {
    if (path === "status") return f.request(path);
    if (offset(path) > 0) throw new Error("prefetch also failed");
    const page = await f.request(path) as { rows: unknown[] };
    page.rows[0] = null; return page;
  }, () => {}, async () => [])(f.uid)).rejects.toThrow("could not be verified");
  // An unhandled rejected background promise would fail this test in Vitest.
  await new Promise(resolve => setTimeout(resolve, 0));
});

it("fences a stale owner after a prefetched response without returning private records", async () => {
  const f = await stage4hProfileFixture(21); let owner = f.uid;
  const reader = createSyntheticPublishedProfileReader(async path => {
    const response = await f.request(path);
    if (path !== "status" && offset(path) === 20) owner = "different-student";
    return response;
  }, uid => { if (uid !== owner) throw new Error("owner changed"); }, async () => []);
  await expect(reader(f.uid)).rejects.toThrow("owner changed");
});

it("keeps in-flight history pinned while a newer generation appears and uses the new generation on refresh", async () => {
  const first = await stage4hProfileFixture(21), second = await stage4hProfileFixture(24, first.uid);
  let active = first;
  const reader = createSyntheticPublishedProfileReader(async path => {
    if (path === "status") return active.request(path);
    const id = new URL(path, "http://127.0.0.1/").searchParams.get("generationId");
    active = second;
    return (id === first.generationId ? first : second).request(path);
  }, () => {}, async () => []);
  const oldView = await reader(first.uid), newView = await reader(first.uid);
  expect(oldView.publication?.generationId).toBe(first.generationId); expect(oldView.history).toHaveLength(21);
  expect(newView.publication?.generationId).toBe(second.generationId); expect(newView.history).toHaveLength(24);
  expect(newView.warnings).toEqual([]); expect(newView.coverageComplete).toBe(true);
});

it("preserves first legacy snapshot lookup and private details without changing objective observations", async () => {
  const f = await stage4hProfileFixture(4);
  const auto = f.history.find(row => row.data.evidence.mode === "auto")!;
  const first = { id: auto.data.evidence.sessionId, data: { ...auto.details, reflection: { reflectionText: "first private snapshot", surprisedByResults: false } } };
  const second = { id: first.id, data: { ...first.data, reflection: { reflectionText: "second private snapshot", surprisedByResults: true } } };
  const legacy = [first, second, ...f.history.filter(row => row.data.evidence.mode === "auto" && row !== auto)
    .map(row => ({ id: row.data.evidence.sessionId, data: row.details }))];
  const view = buildCumulativeProfileView(f.uid, { kind: "synthetic-published-generation", profile: f.status.profile }, f.history, legacy, { syntheticPublished: true });
  expect(view.warnings).toEqual([]); expect(view.coverageComplete).toBe(true);
  const record = view.history.find(row => row.evidence.sessionId === first.id)!;
  expect(record.details?.reflection.reflectionText).toBe("first private snapshot");
  expect(record.evidence).toEqual(auto.data.evidence);
});
