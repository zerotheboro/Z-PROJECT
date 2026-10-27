import { expect, it, vi } from "vitest";
vi.mock("../../firebase", () => ({ auth: {}, db: {} }));
import { buildSavedLearningProfileView } from "../savedLearningProfileView";
import { savedProfileConsistencyFixture } from "../../../test-support/savedProfileConsistencyFixture";

it("projects one four-method Test Me record and two individual practices consistently without counting the latest snapshot or Match.firstScore twice", () => {
  const f = savedProfileConsistencyFixture();
  const input = { ...f.page, uid: "consistency-student", loading: false, error: null, hasMore: false };
  const before = JSON.stringify(f);
  const v = buildSavedLearningProfileView(input.uid, f.profile, input);
  expect(v.counts).toEqual({ individualSessions: 2, testMeRecords: 1, observations: 10, latestSnapshotMethods: 4, latestSnapshotVerified: 2 });
  expect(v.history.map(h => h.key)).toEqual([`manual:${f.records[1].sessionId}`, `manual:${f.records[0].sessionId}`, `assessment:${f.automatic.sessionId}`]);
  const recall = v.methods.find(m => m.methodId === "active-recall")!;
  expect(recall.individual).toHaveLength(2); expect(recall.assessments).toHaveLength(1);
  expect(recall.individualObservationCount).toBe(4); expect(recall.assessmentObservationCount).toBe(2);
  expect(recall.individual.map(a => [a.lab!.score, a.verification!.score])).toEqual([[1, 0.75], [0.25, 0.5]]);
  expect(v.progress.excludedIndividualObservations).toBe(4); expect(v.progress.excludedTestMeObservations).toBe(6);
  expect(v.progress.reason).toContain("actual question conditions"); expect(JSON.stringify(f)).toBe(before);
});
it("counts identical source pages once and withholds conflicting identities instead of selecting a version", () => {
  const f = savedProfileConsistencyFixture(), input = { ...f.page, uid: "consistency-student", loading: false, error: null, hasMore: false };
  const repeated = buildSavedLearningProfileView(input.uid, f.profile, { ...input, records: [...f.records, ...f.records], assessments: [...f.page.assessments, ...f.page.assessments] });
  expect(repeated.counts.individualSessions).toBe(2); expect(repeated.counts.testMeRecords).toBe(1);
  const conflict = { ...f.records[0], payloadJSON: f.records[0].payloadJSON.replace('"score":0.25', '"score":0.5') };
  const v = buildSavedLearningProfileView(input.uid, f.profile, { ...input, records: [...f.records, conflict] });
  expect(v.history).toHaveLength(2); expect(v.counts.individualSessions).toBe(1); expect(v.coverage).toBe("partial"); expect(v.warnings.length).toBeGreaterThan(0);
});
it("withholds mismatched-owner data and rejects a cross-owner assessment inside an otherwise matching page", () => {
  const f = savedProfileConsistencyFixture("a"), input = { ...f.page, uid: "a", loading: false, error: null, hasMore: false };
  expect(buildSavedLearningProfileView("b", null, input).history).toEqual([]);
  const foreign = savedProfileConsistencyFixture("b").page.assessments;
  const v = buildSavedLearningProfileView("a", f.profile, { ...input, assessments: foreign });
  expect(v.counts.testMeRecords).toBe(0); expect(v.counts.individualSessions).toBe(2); expect(v.coverage).toBe("partial");
});
it("keeps practice-only methods visible and missing times/scores unknown", () => {
  const f = savedProfileConsistencyFixture(), record = f.records[0], payload = JSON.parse(record.payloadJSON);
  payload.completedAt = null; payload.methodLab.experiments[0].score = null; payload.methodLab.experiments[0].correct = null; payload.methodLab.experiments[0].total = null;
  payload.methodMatch.methods[0].firstScore = null; payload.methodMatch.methods[0].verificationScore = null;
  const v = buildSavedLearningProfileView("consistency-student", null, { uid: "consistency-student", records: [{ ...record, completedAt: null, payloadJSON: JSON.stringify(payload) }], loading: false, error: null, hasMore: false });
  expect(v.methods).toHaveLength(1); expect(v.methods[0].individual[0].lab!.score).toBeNull(); expect(v.history[0].completedAt).toBeNull();
  expect(v.counts.observations).toBe(2); expect(v.counts.latestSnapshotMethods).toBe(0);
});
it("marks paginated, failed and loading coverage without changing the loaded evidence into lifetime totals", () => {
  const f = savedProfileConsistencyFixture(), input = { ...f.page, uid: "consistency-student", loading: false, error: null, hasMore: true };
  expect(buildSavedLearningProfileView(input.uid, f.profile, input).coverage).toBe("partial");
  expect(buildSavedLearningProfileView(input.uid, f.profile, { ...input, loading: true }).coverage).toBe("loading");
  expect(buildSavedLearningProfileView(input.uid, f.profile, { ...input, hasMore: false, error: "offline" }).counts.individualSessions).toBe(2);
});
it("does not turn a root-only latest snapshot into a guessed saved history session", () => {
  const f = savedProfileConsistencyFixture(), input = { ...f.page, uid: "consistency-student", assessments: [], loading: false, error: null, hasMore: false };
  const v = buildSavedLearningProfileView(input.uid, f.profile, input);
  expect(v.counts.testMeRecords).toBe(0); expect(v.counts.latestSnapshotMethods).toBe(4); expect(v.counts.individualSessions).toBe(2); expect(v.counts.observations).toBe(4);
  expect(v.history).toHaveLength(2);
});
