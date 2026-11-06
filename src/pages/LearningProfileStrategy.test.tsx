// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import { economicsStrategyFixture } from "../../test-support/economicsStrategyUIFixtures";

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, local: true, snapshot: null as CumulativeProfileSnapshot | null,
  read: vi.fn(), refresh: vi.fn(), legacyProfile: true }));
vi.mock("../firebase", () => ({ auth: mocks.auth, db: {} }));
vi.mock("../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => mocks.local ? { acceptedPreview: true } : null }));
vi.mock("../services/localCumulativeProfile", () => ({ getLocalCumulativeProfileReader: () => (uid: string) => mocks.read(uid) }));
vi.mock("../hooks/useUserProfile", () => ({ useUserProfile: () => ({ user: mocks.auth.currentUser, loading: false,
  learningProfile: mocks.legacyProfile ? { strongestVerifiedMethod: null, preferredMethod: null, recommendedMethods: [], methodEvidence: [],
    baseline: { memoryScore: .5, understandingScore: .75 }, methodKnowledgeScore: 1, priority: "performance" } : null }) }));
vi.mock("../hooks/useManualTrainingHistory", () => ({ useManualTrainingHistory: () => ({ records: [], assessments: [], loading: false, error: null,
  hasMore: false, loadMore: () => {}, refresh: () => {} }) }));
vi.mock("../hooks/useCumulativeProfile", () => ({ useCumulativeProfile: () => ({ uid: mocks.auth.currentUser?.uid ?? null, data: mocks.snapshot,
  loading: false, signedOut: !mocks.auth.currentUser, error: null, refresh: mocks.refresh, publishSynthetic: vi.fn() }) }));
import LearningProfilePage from "./LearningProfilePage";
// Preload the real lazy panel outside individual tests' assertion timers.
// Route rendering still uses the actual lazy/Suspense production integration.
import "../components/YourStudyStrategy";

function Location() { const location = useLocation(); return <output data-testid="location">{JSON.stringify({ pathname: location.pathname, search: location.search, state: location.state })}</output>; }
function App({ latest = false }: { latest?: boolean }) {
  return <MemoryRouter initialEntries={[`/training/profile${latest ? "?view=latest" : ""}`]}><Routes>
    <Route path="/training/profile" element={<LearningProfilePage />} /><Route path="/training" element={<p>Normal Training entry</p>} />
  </Routes><Location /></MemoryRouter>;
}
const section = () => within(screen.getByRole("region", { name: "Your Study Strategy" }));
function signIn(uid = "strategy-student-a") { mocks.auth.currentUser = { uid } as User; }
function deferred() { let resolve!: (value: CumulativeProfileSnapshot) => void, reject!: (error: unknown) => void;
  const promise = new Promise<CumulativeProfileSnapshot>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
beforeEach(() => { vi.stubEnv("DEV", true); mocks.read.mockReset(); mocks.refresh.mockReset(); mocks.local = true; mocks.legacyProfile = true;
  signIn(); mocks.snapshot = economicsStrategyFixture().snapshot; mocks.read.mockResolvedValue(mocks.snapshot); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("actual Learning Profile study strategy integration", () => {
  it("renders PPC advice above existing sections, hides IDs/Reflection, and preserves history and original scores", async () => {
    render(<App />); await screen.findByRole("region", { name: "Your Study Strategy" });
    const s = section(); expect(s.getByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeTruthy();
    expect(s.getByText("Feynman Technique", { exact: true })).toBeTruthy();
    expect(s.getByText("Limited recorded answer evidence")).toBeTruthy();
    expect(s.getByText(/spare capacity/)).toBeTruthy();
    for (const name of ["Learning Overview", "Study Method Evidence", "Learning History", "Progress Over Time"]) expect(screen.getByRole("region", { name })).toBeTruthy();
    const panels = [...document.querySelectorAll(".profile-content > section")]; expect(panels[0].id).toBe("your-study-strategy");
    expect(screen.queryByText("PRIVATE SYNTHETIC REFLECTION")).toBeNull();
    expect(s.queryByText(/ec9708-objective|session-|acceptedRevision|profileRevision/)).toBeNull();
    expect(mocks.snapshot!.history[0].evidence.observations.find(o => o.phase === "lab")!.performance.score).toBe(.8);
    const disclosure = s.getByText("Evidence and things to keep in mind"); expect(disclosure.closest("details")!.open).toBe(false);
    fireEvent.click(disclosure);
    expect(s.getByText(/Recorded incorrect answer/)).toBeTruthy();
    expect(s.getAllByText(/Repeated attempts do not prove independent improvement/).length).toBeGreaterThan(0);
  });
  it("changes whole topics from PPC to Elasticity and uses the correct method/concept without an objective picker", async () => {
    mocks.snapshot = economicsStrategyFixture("strategy-student-a", "2.2").snapshot;
    render(<App />); await screen.findByRole("region", { name: "Your Study Strategy" });
    fireEvent.change(section().getByLabelText("Economics topic"), { target: { value: "2.2" } });
    expect(section().getByRole("heading", { name: "Relate PED to expenditure" })).toBeTruthy();
    expect(section().getByText(/^divide steps$/i)).toBeTruthy();
    expect(section().queryByRole("combobox", { name: /objective/i })).toBeNull();
  });
  it("shows a task-based starting point for confirmed no-history accounts, including the latest page's empty state", async () => {
    mocks.legacyProfile = false;
    mocks.snapshot = { ...mocks.snapshot!, strategyEvidence: { ownerUid: "strategy-student-a", rows: [], scope: "accepted-history", pendingAcceptedSessions: 0, legacyReportsExcluded: true } };
    mocks.read.mockResolvedValue(mocks.snapshot);
    render(<App latest />); await screen.findByText("Task-based suggestion · not personalised performance evidence");
    expect(section().getByText(/Older saved reports do not contain accepted answer evidence/)).toBeTruthy();
    expect(section().getByText(/No scored answer evidence supports a personal conclusion/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "You don't have a learning profile yet." })).toBeTruthy();
  });
  it("does not turn legacy-only ordinary local profiles into accepted evidence or make database requests", async () => {
    mocks.local = false; render(<App latest />);
    await screen.findByText(/Study advice from accepted answer evidence is not available/);
    expect(mocks.read).not.toHaveBeenCalled(); expect(section().queryByText("Feynman Technique", { exact: true })).toBeNull();
    expect(screen.getByRole("region", { name: "Learning History" })).toBeTruthy();
  });
  it("treats accepted historical records without objective details as unknown rather than inventing personal evidence", async () => {
    mocks.snapshot = economicsStrategyFixture("strategy-student-a", "1.5", false).snapshot;
    render(<App />); await screen.findByText("Task-based suggestion · not personalised performance evidence");
    expect(section().getByText(/Some saved sessions have less answer detail/)).toBeTruthy();
    expect(section().getByText(/No scored answer evidence supports a personal conclusion/)).toBeTruthy();
  });
  it("uses labelled native topic and disclosure controls with keyboard activation semantics", async () => {
    render(<App />); await screen.findByRole("region", { name: "Your Study Strategy" });
    const selector = section().getByLabelText("Economics topic"); selector.focus(); expect(document.activeElement).toBe(selector);
    const disclosure = section().getByText("How to use Feynman Technique");
    expect(disclosure.tagName).toBe("SUMMARY"); disclosure.focus(); expect(document.activeElement).toBe(disclosure);
    fireEvent.keyDown(disclosure, { key: "Enter" }); fireEvent.click(disclosure, { detail: 0 });
    expect(disclosure.closest("details")!.open).toBe(true);
    expect(within(disclosure.closest("details")!).getByRole("list")).toBeTruthy();
  });
  it("withholds advice for malformed/unsupported source metadata while leaving historical results available", async () => {
    const source = mocks.snapshot!.strategyEvidence!;
    const row = source.rows[0].data as { objectiveEvidence: { activities: { contentSetId: string }[] } };
    row.objectiveEvidence.activities[0].contentSetId = row.objectiveEvidence.activities[0].contentSetId.replace("memory-palace", "derive-basics");
    render(<App />); await screen.findByText(/isn’t enough trustworthy, compatible evidence/);
    expect(section().queryByText("Feynman Technique", { exact: true })).toBeNull();
    expect(screen.getByRole("region", { name: "Learning History" })).toBeTruthy();
  });
  it("distinguishes published-generation advice and newer pending acceptance, and never invents advice from pending-only sessions", async () => {
    mocks.snapshot!.strategyEvidence!.scope = "published-generation";
    mocks.snapshot!.strategyEvidence!.pendingAcceptedSessions = 2;
    const page = render(<App />); await screen.findByText(/Based on the displayed local synthetic profile generation/);
    expect(section().getByText(/Newer accepted sessions are still awaiting profile preparation/)).toBeTruthy();
    const next = { ...mocks.snapshot!, strategyEvidence: undefined, publication: { kind: "synthetic-emulator-publication" as const, authority: "NOT VERIFIED" as const,
      publication: "not-published" as const, acceptedSessions: 2, publishedSessions: 0, pendingSessions: 2, generationId: null, publishedAt: null } };
    mocks.snapshot = next; page.rerender(<App />);
    await screen.findByText(/Evidence-based advice is not available from those pending sessions/);
    expect(section().queryByText("Feynman Technique", { exact: true })).toBeNull();
  });
  it("navigates normally without passing a forced method/topic allocation or modifying the frozen session", async () => {
    const f = economicsStrategyFixture(); mocks.snapshot = f.snapshot; const frozen = JSON.stringify(f.request);
    render(<App />); await screen.findByRole("region", { name: "Your Study Strategy" });
    expect(section().getByText(/method allocation and normal access checks stay unchanged/)).toBeTruthy();
    fireEvent.click(section().getByRole("link", { name: "Open Training" }));
    expect(screen.getByText("Normal Training entry")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe('{"pathname":"/training","search":"","state":null}');
    expect(JSON.stringify(f.request)).toBe(frozen);
  });
  it("retries redacted loading errors without exposing the failure payload", async () => {
    mocks.read.mockRejectedValueOnce({ private: "PRIVATE FAILURE", code: "permission-denied" }).mockResolvedValue(mocks.snapshot);
    render(<App latest />); await screen.findByText(/Your study strategy could not be loaded safely/);
    expect(screen.queryByText(/PRIVATE FAILURE/)).toBeNull();
    fireEvent.click(section().getByRole("button", { name: "Retry study strategy" }));
    await screen.findByRole("heading", { name: "Distinguish utilisation from capacity" });
  });
  it("refreshes the same owner's source snapshot and invalidates the previous recommendation", async () => {
    mocks.read.mockResolvedValueOnce(mocks.snapshot).mockResolvedValueOnce(economicsStrategyFixture("strategy-student-a", "1.5", false).snapshot);
    render(<App latest />); await screen.findByRole("heading", { name: "Distinguish utilisation from capacity" });
    fireEvent.click(section().getByRole("button", { name: "Refresh study strategy" }));
    await screen.findByText("Task-based suggestion · not personalised performance evidence");
    expect(section().queryByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeNull();
    expect(section().getByRole("heading", { name: "Define and interpret the PPC boundary" })).toBeTruthy();
  });
  it("fences late account A reads after B loads, including source/Reflection disclosures", async () => {
    const a = deferred(), b = deferred(); mocks.read.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const page = render(<App latest />); await screen.findByText(/Loading accepted learning evidence/);
    signIn("strategy-student-b"); page.rerender(<App latest />);
    await act(async () => b.resolve(economicsStrategyFixture("strategy-student-b", "2.2").snapshot));
    fireEvent.change(section().getByLabelText("Economics topic"), { target: { value: "2.2" } });
    expect(section().getByRole("heading", { name: "Relate PED to expenditure" })).toBeTruthy();
    await act(async () => a.resolve(economicsStrategyFixture().snapshot));
    expect(section().getByRole("heading", { name: "Relate PED to expenditure" })).toBeTruthy();
    expect(section().queryByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeNull();
    expect(screen.queryByText("PRIVATE SYNTHETIC REFLECTION")).toBeNull();
  });
  it("rejects stale reads during rapid A → B → A switching", async () => {
    const oldA = deferred(), b = deferred(), newA = deferred();
    mocks.read.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(newA.promise);
    const page = render(<App latest />); await screen.findByText(/Loading accepted learning evidence/);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    signIn("strategy-student-b"); page.rerender(<App latest />);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    signIn(); page.rerender(<App latest />);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(3));
    await act(async () => newA.resolve(economicsStrategyFixture().snapshot));
    fireEvent.click(section().getByText("Evidence and things to keep in mind"));
    await act(async () => { oldA.resolve(economicsStrategyFixture("strategy-student-a", "2.2").snapshot); b.resolve(economicsStrategyFixture("strategy-student-b", "2.2").snapshot); });
    expect(section().getByRole("heading", { name: "Distinguish utilisation from capacity" })).toBeTruthy();
  });
  it("does not expose a provided source snapshot belonging to another account", async () => {
    mocks.snapshot!.strategyEvidence = economicsStrategyFixture("another-student", "2.2").snapshot.strategyEvidence;
    render(<App />); await screen.findByText(/Study advice from accepted answer evidence is not available/);
    expect(section().queryByText(/Relate PED|Feynman Technique|divide steps/)).toBeNull();
  });
  it("clears recommendations on logout and ignores late failures after unmount", async () => {
    const pending = deferred(); mocks.read.mockReturnValueOnce(pending.promise);
    const page = render(<App latest />); await screen.findByText(/Loading accepted learning evidence/);
    mocks.auth.currentUser = null; page.rerender(<App latest />);
    expect(screen.queryByRole("region", { name: "Your Study Strategy" })).toBeNull();
    await act(async () => pending.reject({ private: "PRIVATE LATE FAILURE" }));
    expect(screen.queryByText(/PRIVATE LATE FAILURE/)).toBeNull();
  });
});
