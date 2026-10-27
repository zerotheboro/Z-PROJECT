// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { completionDraftFixture } from "../../test-support/completionDraftFixture";
const mock = vi.hoisted(() => ({ user: { uid: "local-student" }, enabled: false, records: new Map<string, unknown>(), writes: 0, failure: false }));
vi.mock("../firebase", () => ({ auth: { get currentUser() { return mock.user; }, app: { options: { projectId: "demo-manual-tests" } } }, db: {} }));
vi.mock("./localTrainingCompletionConfig", () => ({ localCompletionConfig: () => mock.enabled ? {} : null }));
vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => args.filter(a => typeof a === "string").join("/"), collection: vi.fn(), limit: vi.fn(), orderBy: vi.fn(), query: vi.fn(), startAfter: vi.fn(), getDocsFromServer: vi.fn(),
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
    if (mock.failure) throw new Error("Synthetic network failure");
    const writes = new Map<string, unknown>();
    const result = await fn({ get: async (key: string) => ({ exists: () => mock.records.has(key), data: () => mock.records.get(key) }),
      set: (key: string, value: unknown) => { writes.set(key, value); } });
    for (const [k,v] of writes) { mock.records.set(k,v); mock.writes++; }
    return result;
  }
}));
import { freezeManualTraining, readManualTrainingRecord, restoreManualTraining, saveManualTraining } from "./manualTrainingHistory";
beforeEach(() => { localStorage.clear(); mock.user = { uid: "local-student" }; mock.enabled = false; mock.failure = false; mock.writes = 0;
  mock.records.clear(); mock.records.set("users/local-student", { learningProfile: "original" }); });
it.each([1,3])("saves all %i Manual results separately without changing the automatic profile", async count => {
  const record = freezeManualTraining(completionDraftFixture("manual", count), "2026-10-20T09:00:00Z");
  const result = readManualTrainingRecord(record, "local-student"); expect(result.draft.completed.methodLab!.experiments).toHaveLength(count);
  expect(await saveManualTraining("local-student", record)).toEqual(record);
  expect(await saveManualTraining("local-student", record)).toEqual(record); expect(mock.writes).toBe(1);
  expect(mock.records.get("users/local-student")).toEqual({ learningProfile: "original" });
});
it("restores exact reflection and original timestamp before a delayed/failed save and after refresh", async () => {
  const draft = completionDraftFixture("manual", 1); const record = freezeManualTraining(draft, "2026-10-20T09:00:00Z");
  mock.failure = true; await expect(saveManualTraining("local-student", record)).rejects.toThrow("network failure");
  const restored = restoreManualTraining({ ...draft, phase: "reflection", completed: { ...draft.completed, reflection: null } });
  expect(restored.draft.phase).toBe("final-save"); expect(restored.draft.completed.reflection).toEqual(draft.completed.reflection);
  expect(freezeManualTraining(restored.draft, "2026-10-22T10:00:00Z")).toEqual(record);
});
it("rejects conflicting payloads without replacing the original checkpoint or server record", async () => {
  const draft = completionDraftFixture("manual", 1), record = freezeManualTraining(draft, null); await saveManualTraining("local-student", record);
  draft.completed.reflection!.reflectionText = "changed";
  expect(() => freezeManualTraining(draft, null)).toThrow("Different results");
  const changed = { ...record, payloadJSON: record.payloadJSON.replace("Synthetic offline reflection", "changed") };
  await expect(saveManualTraining("local-student", changed)).rejects.toThrow("different saved results"); expect(mock.writes).toBe(1);
});
it("fails before network on browser storage exhaustion", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  expect(() => freezeManualTraining(completionDraftFixture("manual",1), null)).toThrow("Storage full"); expect(mock.writes).toBe(0);
});
it("does not fall back for protected accounts", async () => {
  const record = freezeManualTraining(completionDraftFixture("manual",1), null);
  mock.records.set("users/local-student", { trainingLifecycleBinding: {} });
  await expect(saveManualTraining("local-student", record)).rejects.toThrow("cannot use legacy"); expect(mock.writes).toBe(0);
  mock.enabled = true; expect(() => freezeManualTraining(completionDraftFixture("manual",1), null)).toThrow("existing completion protocol");
});
it("rejects account switching and malformed records", async () => {
  const record = freezeManualTraining(completionDraftFixture("manual",1), null); mock.user = { uid: "another-student" };
  await expect(saveManualTraining("local-student", record)).rejects.toThrow("original account");
  expect(restoreManualTraining(completionDraftFixture("manual",1)).error).toBeTruthy();
  expect(() => readManualTrainingRecord({ ...record, completedAt: "yesterday" }, "local-student")).toThrow("explicit timezone");
});
