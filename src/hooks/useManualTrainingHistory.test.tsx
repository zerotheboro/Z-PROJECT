// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ManualHistoryPage } from "../services/manualTrainingHistory";
const mock = vi.hoisted(() => ({ auth: { currentUser: null as { uid: string } | null }, read: vi.fn() }));
vi.mock("../firebase", () => ({ auth: mock.auth }));
vi.mock("../services/manualTrainingHistory", () => ({ loadManualTrainingHistory: (...args: unknown[]) => mock.read(...args) }));
import { useManualTrainingHistory } from "./useManualTrainingHistory";
const page = (id: string): ManualHistoryPage => ({ records: [{schemaVersion:1,kind:"legacy-manual",sessionId:id,completedAt:null,payloadJSON:"{}"}],assessments:[],cursor:null,assessmentCursor:null,more:false,manualMore:false,assessmentMore:false });
function deferred() { let resolve!: (value: ManualHistoryPage) => void, reject!: (value: unknown) => void; const promise=new Promise<ManualHistoryPage>((yes,no)=>{resolve=yes;reject=no;}); return {promise,resolve,reject}; }
beforeEach(()=>{mock.read.mockReset();mock.auth.currentUser={uid:"a"};}); afterEach(cleanup);
it("clears A's records immediately while B's read is pending and ignores stale callbacks", async()=>{
  const b=deferred();mock.read.mockResolvedValueOnce(page("a-session")).mockReturnValueOnce(b.promise);
  const h=renderHook(({uid})=>useManualTrainingHistory(uid),{initialProps:{uid:"a"}});await waitFor(()=>expect(h.result.current.records).toHaveLength(1));
  mock.auth.currentUser={uid:"b"};h.rerender({uid:"b"});expect(h.result.current.records).toEqual([]);
  await act(async()=>b.resolve(page("b-session")));expect(h.result.current.records[0].sessionId).toBe("b-session");
});
it("fences rapid A B A changes, old errors, and logout", async()=>{
  const a=deferred(),b=deferred(),newA=deferred();mock.read.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(newA.promise);
  const h=renderHook(({uid}:{uid:string|null})=>useManualTrainingHistory(uid),{initialProps:{uid:"a" as string|null}});
  mock.auth.currentUser={uid:"b"};h.rerender({uid:"b"});mock.auth.currentUser={uid:"a"};h.rerender({uid:"a"});
  await act(async()=>{a.resolve(page("old-a"));b.reject(new Error("synthetic private failure"));});expect(h.result.current.records).toEqual([]);expect(h.result.current.loading).toBe(true);
  await act(async()=>newA.resolve(page("new-a")));expect(h.result.current.records[0].sessionId).toBe("new-a");
  mock.auth.currentUser=null;h.rerender({uid:null});expect(h.result.current.records).toEqual([]);
});
it("ignores reads after unmount and reports a current read error without false empty-history success",async()=>{
  const p=deferred();mock.read.mockReturnValueOnce(p.promise);const h=renderHook(()=>useManualTrainingHistory("a"));h.unmount();await act(async()=>p.resolve(page("late")));
  mock.read.mockRejectedValueOnce(new Error("offline"));const retry=renderHook(()=>useManualTrainingHistory("a"));await waitFor(()=>expect(retry.result.current.error).toContain("could not be verified"));expect(retry.result.current.records).toEqual([]);
});
