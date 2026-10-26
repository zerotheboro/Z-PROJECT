import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { syntheticAcceptedHistory } from "./syntheticProfilePreview";
import { createSyntheticPublishedProfileReader, syntheticProfileHash, SYNTHETIC_PUBLICATION_PROTOCOL } from "./syntheticPublishedProfile";
import { aggregateCompletedEvidence } from "../quiz/cumulativeProfile";
import type { CompletedSessionEvidence } from "../quiz/learningEvidence";
import { resolveLocalCumulativeProfileConfig } from "./localCumulativeProfileConfig";
import { createCompletedSessionEvidence } from "../quiz/learningEvidence";
import { sessionInput } from "../quiz/__tests__/learningEvidenceFixtures";

async function fixture(size = 14) {
  const data = syntheticAcceptedHistory("student-a"), uid = data.uid;
  const rows = size === 14 ? data.rows : Array.from({ length: size }, (_, i) => {
    const evidence = createCompletedSessionEvidence({ ...sessionInput({ id: `large-${i}` }), owner: { kind: "user", uid } });
    const id = `session-${i.toString(16).padStart(64, "0")}`, requestHash = "d".repeat(64);
    return { id, data: { schemaVersion: 1, evidence, requestHash, receipt: { schemaVersion: 2, status: "accepted", sessionId: evidence.sessionId,
      mode: "manual", evidenceId: id, requestHash, lifecycleEpoch: 1, acceptedRevision: 1 + i * 3,
      recordedAt: "2026-10-26T10:00:00Z", legacyAssessmentId: null, legacyProfileUpdated: false } } };
  });
  const profile = aggregateCompletedEvidence({ kind: "user", uid }, rows.map(r => (r.data as { evidence: CompletedSessionEvidence }).evidence));
  const generationId = "e".repeat(64), history = rows.map(r => ({ ...r, details: {} }));
  let historyHash = await syntheticProfileHash("synthetic-history-start-stage4g-v1", { uid, generationId });
  for (let index = 0; index < history.length; index++) historyHash = await syntheticProfileHash("synthetic-history-fold-stage4g-v1", { previous: historyHash, index, row: history[index] });
  const body = { schemaVersion: 1, protocol: SYNTHETIC_PUBLICATION_PROTOCOL, status: "synthetic-published", uid, context: { uid, lifecycleEpoch: 1 }, generationId,
    authority: "NOT VERIFIED", productionPublication: false, source: { uid, revision: size * 3 }, sessionCount: rows.length, historyHash,
    publishedAt: "2026-10-26T10:00:00Z", profileHash: await syntheticProfileHash("shadow-profile-v1", profile) };
  const publication = { ...body, publicationHash: await syntheticProfileHash("synthetic-publication-record-stage4g-v1", body) };
  const status = { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid, authority: "NOT VERIFIED", accepted: { sessionCount: size + 2, revision: size * 3 + 6 }, publication, profile };
  const paths: string[] = [];
  const request = async (path: string): Promise<any> => {
    paths.push(path);
    if (path === "status") return structuredClone(status);
    const start = Number(new URL("http://127.0.0.1/" + path).searchParams.get("after"));
    return { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid, generationId, publicationHash: publication.publicationHash,
      offset: start, total: history.length, rows: structuredClone(history.slice(start, start + 3)), next: start + 3 < history.length ? start + 3 : null };
  };
  return { uid, request, paths, status, history };
}
it("matches the original typed JSON hash encoding, including supplementary Unicode and null/array distinction", async () => {
  const input = JSON.stringify(["edulience-scalability", 1, "test", ["map", [["a", ["array", [["null"], ["string", "🧠"]]]]]]]);
  expect(await syntheticProfileHash("test", { a: [null, "🧠"] })).toBe(createHash("sha256").update(input).digest("hex"));
  await expect(syntheticProfileHash("test", { a: "\ud800" })).rejects.toThrow();
});
it("loads all generation-pinned pages, keeps accepted/pending separate and preserves method/subject/score associations", async () => {
  const f = await fixture(), view = await createSyntheticPublishedProfileReader(f.request, uid => expect(uid).toBe(f.uid), async () => [])(f.uid);
  expect(view.history).toHaveLength(14); expect(f.paths).toHaveLength(6); expect(view.warnings).toEqual([]); expect(view.coverageComplete).toBe(true);
  expect(view.publication).toMatchObject({ publication: "published", publishedSessions: 14, acceptedSessions: 16, pendingSessions: 2, authority: "NOT VERIFIED" });
  expect(view.revision).toBeNull(); expect(view.preview).toBeUndefined();
  for (const entry of view.history) {
    const original = f.history.find(row => (row.data as any).evidence.sessionId === entry.evidence.sessionId)!;
    expect(entry.evidence).toEqual((original.data as any).evidence);
  }
});
it.each(["duplicate", "missing", "owner", "generation", "offset", "next", "score", "hash", "summary", "revision"])("rejects %s corruption rather than presenting partial or fabricated totals", async mutation => {
  const f = await fixture();
  const request = async (path: string) => {
    const value = await f.request(path);
    if (path === "status") {
      if (mutation === "hash") value.publication.publicationHash = "0".repeat(64);
      if (mutation === "summary") value.profile.sessionCount++;
      if (mutation === "revision") value.accepted.revision = 0;
      return value;
    }
    if (mutation === "duplicate") value.rows[1] = value.rows[0];
    if (mutation === "missing") value.rows = [];
    if (mutation === "owner") value.uid = "other";
    if (mutation === "generation") value.generationId = "0".repeat(64);
    if (mutation === "offset") value.offset++;
    if (mutation === "next") value.next = 0;
    if (mutation === "score") value.rows[0].data.evidence.observations[0].performance.score = .999;
    return value;
  };
  await expect(createSyntheticPublishedProfileReader(request, () => {}, async () => [])(f.uid)).rejects.toThrow();
});
it("does not turn accepted evidence into a published summary and keeps browser-only checkpoints out of counts", async () => {
  const f = await fixture();
  const view = await createSyntheticPublishedProfileReader(async () => ({ ...f.status, publication: null, profile: null }), () => {},
    async () => [{ sessionId: "not-sent", acknowledged: false, legacy: false }])(f.uid);
  expect(view.summary).toBeNull(); expect(view.history).toEqual([]); expect(view.publication?.pendingSessions).toBe(16); expect(view.pending).toHaveLength(1);
});
it("erases delayed owner data before any asynchronous result can return", async () => {
  const f = await fixture(); let current = f.uid;
  const reader = createSyntheticPublishedProfileReader(async path => { const value = await f.request(path); current = "other"; return value; },
    uid => { if (uid !== current) throw new Error("owner switched"); }, async () => []);
  await expect(reader(f.uid)).rejects.toThrow("owner switched");
});
it("requires explicit local flags and cannot enable production reads", () => {
  const env = { DEV: true, VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only", VITE_CUMULATIVE_PROFILE_PHASE2C: "emulator-only",
    VITE_CUMULATIVE_PROFILE_STAGE4G: "synthetic-emulator-only", VITE_TRAINING_PROTECTED_STAGE4E: "emulator-only", VITE_API_BASE_URL: "http://127.0.0.1:18084" };
  expect(resolveLocalCumulativeProfileConfig(env, "127.0.0.1")?.syntheticPublished).toBe(true);
  expect(resolveLocalCumulativeProfileConfig({ ...env, DEV: false }, "127.0.0.1")).toBeNull();
  expect(() => resolveLocalCumulativeProfileConfig(env, "edulience.space")).toThrow();
});
it("reads 105 complete sessions through bounded pinned pages without the old 100-record truncation", async () => {
  const f = await fixture(105), view = await createSyntheticPublishedProfileReader(f.request, () => {}, async () => [])(f.uid);
  expect(view.history).toHaveLength(105); expect(view.summary?.sessionCount).toBe(105); expect(view.coverageComplete).toBe(true);
  expect(new Set(view.history.map(r => r.evidence.sessionId)).size).toBe(105); expect(f.paths).toHaveLength(36);
});
