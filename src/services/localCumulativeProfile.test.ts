// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { uid: "demo-student" } as { uid: string } | null,
  project: "demo-edulience-phase2a", host: "127.0.0.1:18787", ssl: false, database: "(default)",
  authHost: "127.0.0.1", authPort: 9099, doc: vi.fn(), docs: vi.fn(), pending: vi.fn() }));
vi.mock("../firebase", () => ({ auth: { get currentUser() { return mocks.user; }, get app() { return { options: { projectId: mocks.project } }; },
  get emulatorConfig() { return { host: mocks.authHost, port: mocks.authPort, protocol: "http" }; } },
  db: { get app() { return { options: { projectId: mocks.project } }; }, _getSettings: () => ({ host: mocks.host, ssl: mocks.ssl }),
    get _databaseId() { return { database: mocks.database }; } } }));
vi.mock("firebase/firestore", () => ({ collection: (...parts: unknown[]) => parts.slice(1).join("/"), doc: (...parts: unknown[]) => parts.slice(1).join("/"),
  query: (path: unknown) => path, limit: (n: number) => n, getDocFromServer: mocks.doc, getDocsFromServer: mocks.docs }));
vi.mock("./localTrainingCompletion", () => ({ getLocalTrainingCompletionClient: () => ({ list: mocks.pending }) }));
import { getLocalCumulativeProfileReader } from "./localCumulativeProfile";
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  Object.assign(mocks, { user: { uid: "demo-student" }, project: "demo-edulience-phase2a", host: "127.0.0.1:18787", ssl: false, database: "(default)", authHost: "127.0.0.1", authPort: 9099 });
  vi.stubEnv("DEV", true); vi.stubEnv("VITE_CUMULATIVE_PROFILE_PHASE2C", "emulator-only"); vi.stubEnv("VITE_TRAINING_COMPLETION_PHASE2B", "emulator-only"); vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:3001");
  mocks.doc.mockReset().mockResolvedValue({ exists: () => false, metadata: { fromCache: false, hasPendingWrites: false } });
  mocks.docs.mockReset().mockResolvedValue({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } }); mocks.pending.mockReset().mockResolvedValue([]);
});
it.each(["project", "host", "ssl", "database", "authHost", "authPort"])("rejects a misconfigured %s before any remote I/O", field => {
  (mocks as Record<string, unknown>)[field] = field === "ssl" ? true : field === "authPort" ? 443 : "non-demo-or-non-loopback";
  expect(() => getLocalCumulativeProfileReader()).toThrow(/isolated local demo/); expect(mocks.doc).not.toHaveBeenCalled(); expect(mocks.docs).not.toHaveBeenCalled();
});
it("uses only the current owner's permitted summary/evidence/assessment paths", async () => {
  await getLocalCumulativeProfileReader()("demo-student");
  expect(mocks.doc).toHaveBeenCalledWith("users/demo-student/learningProfiles/cumulative");
  expect(mocks.docs.mock.calls.map(call => call[0]).sort()).toEqual(["users/demo-student/assessments", "users/demo-student/learningEvidence"]);
});
it("rejects forged UIDs and cached readers after logout", async () => {
  const read = getLocalCumulativeProfileReader(); await expect(read("another-owner")).rejects.toThrow("Sign-in changed");
  mocks.user = null; await expect(read("demo-student")).rejects.toThrow("Sign-in changed"); expect(mocks.doc).not.toHaveBeenCalled();
});
it("fails closed in a production bundle despite both local flags", () => {
  vi.stubEnv("DEV", false); expect(() => getLocalCumulativeProfileReader()).toThrow(); expect(mocks.doc).not.toHaveBeenCalled(); vi.unstubAllEnvs();
});
