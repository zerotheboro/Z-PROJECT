import { expect, it, vi } from "vitest";
import { buildAcceptedProfilePreview } from "./acceptedProfilePreview";
import { syntheticAcceptedHistory, syntheticProfileSnapshot } from "./syntheticProfilePreview";
import { createCumulativeProfileReader } from "./cumulativeProfileReader";
import { resolveLocalCumulativeProfileConfig } from "./localCumulativeProfileConfig";
import type { ProfileRow } from "../quiz/cumulativeProfileView";
import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";
import { aggregateCompletedEvidence } from "../quiz/cumulativeProfile";
import type { CompletedSessionEvidence } from "../quiz/learningEvidence";

it("accumulates all four journey shapes without inventing publication or profile revisions", () => {
  const { uid, rows } = syntheticAcceptedHistory("student-a"), view = buildAcceptedProfilePreview(uid, rows, []);
  expect(view.summary?.sessionCount).toBe(14); expect(view.history).toHaveLength(14); expect(view.revision).toBeNull();
  expect(view.preview).toMatchObject({ authority: "NOT VERIFIED", publication: "not-published", aggregation: "pending" });
  expect(view.history.map(item => [item.evidence.mode, item.evidence.observations.filter(o => o.phase === "lab").length]))
    .toEqual(expect.arrayContaining([["auto", 3], ["auto", 4], ["manual", 1], ["manual", 3]]));
  expect(view.warnings).toEqual([]); expect(view.automaticSessions! + view.manualSessions!).toBe(14);
  for (const entry of view.history) for (const o of entry.evidence.observations) {
    expect(o.performance.score).toBe(o.performance.correct! / o.performance.total!);
    expect(o.sessionId).toBe(entry.evidence.sessionId);
  }
});
it("deduplicates identical rows and matching legacy snapshots without counting them twice", () => {
  const { uid, rows } = syntheticAcceptedHistory("student-b"), data = rows[0].data as Record<string, unknown>;
  const view = buildAcceptedProfilePreview(uid, [...rows, ...rows], [{ id: (data.evidence as { sessionId: string }).sessionId, data: {} }]);
  expect(view.history).toHaveLength(1); expect(view.summary?.sessionCount).toBe(1); expect(view.warnings).toEqual([]);
});
it.each(["foreign", "malformed", "conflicting", "version", "epoch", "revision"])("withholds totals/charts for %s evidence", variant => {
  const { uid, rows } = syntheticAcceptedHistory("student-a"), altered = structuredClone(rows) as { id: string; data: any }[];
  if (variant === "foreign") altered[0].data.evidence.owner.uid = "another-student";
  if (variant === "malformed") altered[0].data.evidence.observations = [];
  if (variant === "conflicting") altered.push({ id: "substitute", data: altered[0].data });
  if (variant === "version") altered[0].data.receipt.schemaVersion = 1;
  if (variant === "epoch") altered[0].data.receipt.lifecycleEpoch = 99;
  if (variant === "revision") altered[0].data.receipt.acceptedRevision = altered[1].data.receipt.acceptedRevision;
  const view = buildAcceptedProfilePreview(uid, altered, []);
  expect(view.summary).toBeNull(); expect(view.progress).toEqual([]); expect(view.preview.aggregation).toBe("unavailable");
  expect(view.warnings.some(w => w.includes("malformed or conflicting"))).toBe(true);
  expect(view.history.every(entry => entry.evidence.owner.kind === "user" && entry.evidence.owner.uid === uid)).toBe(true);
});
it("leaves empty history empty and renders only truly comparable progress", () => {
  expect(syntheticProfileSnapshot("empty").summary?.sessionCount).toBe(0);
  const view = syntheticProfileSnapshot("student-a"); expect(view.progress.length).toBeGreaterThan(0);
  for (const series of view.progress) {
    expect(series.points.length).toBeGreaterThan(1); expect(series.group.exposure.content).not.toBe("unknown");
    expect(series.group.context.subject).toBeTruthy(); expect(series.group.context.topic).toBeTruthy();
  }
});
it("never treats missing question conditions as a comparable trend", () => {
  const { uid, rows } = syntheticAcceptedHistory("student-a");
  const altered = structuredClone(rows) as { id: string; data: any }[];
  altered.forEach(row => row.data.evidence.observations.forEach((o: any) => { o.protocol.questions = null; }));
  expect(buildAcceptedProfilePreview(uid, altered, []).progress).toEqual([]);
});
it("keeps different method scores attached to their actual method and unknown completion times off trends", () => {
  const { uid, rows } = syntheticAcceptedHistory("student-b");
  const altered = structuredClone(rows) as { id: string; data: any }[];
  const evidence = altered[0].data.evidence;
  evidence.completedAt = null;
  for (const observation of evidence.observations) {
    observation.completedAt = null;
    const correct = observation.methodId === "active-recall" ? 1 : 3;
    observation.performance = { ...observation.performance, correct, total: 4, score: correct / 4 };
  }
  const view = buildAcceptedProfilePreview(uid, altered, []);
  expect(view.history[0].evidence.observations.find(o => o.methodId === "active-recall")?.performance.score).toBe(.25);
  expect(view.history[0].evidence.observations.find(o => o.methodId === "feynman")?.performance.score).toBe(.75);
  expect(view.latestKnownCompletion).toBeNull(); expect(view.unknownCompletionCount).toBe(1); expect(view.progress).toEqual([]);
});
it("pins preview loading to repeated server evidence reads while keeping browser-only work separate", async () => {
  const { uid, rows } = syntheticAcceptedHistory("student-b"); let changed = true;
  const repository = { summary: vi.fn(async () => ({ persistenceVersion: 3 })), legacy: vi.fn(async () => []),
    evidence: vi.fn(async (): Promise<ProfileRow[]> => { if (changed) { changed = false; return []; } return rows; }),
    pending: vi.fn(async () => [{ sessionId: "unsent", acknowledged: false, legacy: false }]) };
  const view = await createCumulativeProfileReader(repository, () => {}, { acceptedPreview: true })(uid);
  expect(view.summary?.sessionCount).toBe(1); expect(repository.evidence).toHaveBeenCalledTimes(4);
  expect(view.pending).toHaveLength(1); expect(view.revision).toBeNull();
});
it("requires explicit Stage 4F plus Stage 4E flags and remains disabled in production", () => {
  const env = { DEV: true, VITE_CUMULATIVE_PROFILE_PHASE2C: "emulator-only", VITE_CUMULATIVE_PROFILE_STAGE4F: "emulator-only",
    VITE_TRAINING_COMPLETION_PHASE2B: "emulator-only", VITE_TRAINING_PROTECTED_STAGE4E: "emulator-only", VITE_API_BASE_URL: "http://127.0.0.1:18084" };
  expect(resolveLocalCumulativeProfileConfig(env, "localhost")?.acceptedPreview).toBe(true);
  expect(resolveLocalCumulativeProfileConfig({ ...env, DEV: false }, "localhost")).toBeNull();
  expect(() => resolveLocalCumulativeProfileConfig({ ...env, VITE_TRAINING_PROTECTED_STAGE4E: "off" }, "localhost")).toThrow();
});
it("cannot promote a caller-supplied preview marker through the legacy profile reader", () => {
  const { uid, rows } = syntheticAcceptedHistory("student-b");
  const profile = aggregateCompletedEvidence({ kind: "user", uid }, rows.map(row => (row.data as { evidence: CompletedSessionEvidence }).evidence));
  expect(() => buildCumulativeProfileView(uid, { kind: "local-accepted-evidence-preview", profile }, rows, [])).toThrow();
});
