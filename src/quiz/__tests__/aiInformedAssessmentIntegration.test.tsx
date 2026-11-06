// @vitest-environment jsdom

import React from "react";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrainingCompletionClient } from "../../services/trainingCompletion";
import type { TrainingCompletionClient } from "../../services/trainingCompletion";
import { createCompletionOutbox } from "../../services/trainingCompletionOutbox";
import { validateCompletion, digest } from "../../../backend/trainingCompletionContract";

import type { SavedAIRecommendation } from "../../services/aiRecommendationPersistence";
import type {
  BaselineResult, LearningProfile, LearningSituation,
  MethodIntroductionResult, MethodLabResult, MethodMatchResult,
  ReflectionResult, TrainingMethodId
} from "../type";

const mocks = vi.hoisted(() => ({
  user: { uid: "qa-user" } as { uid: string } | null,
  authListeners: new Set<(user: { uid: string } | null) => void>(),
  durable: null as TrainingCompletionClient | null,
  savedAI: null as SavedAIRecommendation | null,
  labMethods: [] as TrainingMethodId[],
  matchMethods: [] as TrainingMethodId[],
  loadTrainingDraft: vi.fn(),
  saveTrainingDraft: vi.fn(),
  reserveTrainingAccess: vi.fn(),
  loadAIRecommendation: vi.fn(),
  saveAssessment: vi.fn(),
  recordTrainingCompletion: vi.fn(),
  discardTrainingDraft: vi.fn()
}));
vi.mock("../../services/localTrainingCompletionConfig", () => ({ localCompletionConfig: () => mocks.durable ? { projectId: "demo-stage4e-ui" } : null }));
vi.mock("../../services/localTrainingCompletion", () => ({ getLocalTrainingCompletionClient: () => mocks.durable }));

vi.mock("../../HEADER/header", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("../../firebase", () => ({ auth: { currentUser: null } }));
vi.mock("../../services/auth", () => ({
  subscribeToAuth: (callback: (user: { uid: string } | null) => void) => {
    mocks.authListeners.add(callback);
    callback(mocks.user);
    return () => { mocks.authListeners.delete(callback); };
  }
}));
vi.mock("../../services/trainingProgress", () => ({
  TrainingDraftConflictError: class extends Error {},
  loadTrainingDraft: mocks.loadTrainingDraft,
  saveTrainingDraft: mocks.saveTrainingDraft,
  discardTrainingDraft: mocks.discardTrainingDraft,
  forceDiscardTrainingDraft: vi.fn()
}));
vi.mock("../../services/trainingAccess", () => ({
  reserveTrainingAccess: mocks.reserveTrainingAccess
}));
vi.mock("../../services/aiRecommendationPersistence", () => ({
  loadAIRecommendation: mocks.loadAIRecommendation
}));
vi.mock("../../services/assessment", () => ({
  saveAssessment: mocks.saveAssessment
}));
vi.mock("../../services/trainingStreak", () => ({
  recordTrainingCompletion: mocks.recordTrainingCompletion
}));
vi.mock("../sections/LearningSituation", () => ({
  default: ({ onComplete }: { onComplete: (value: LearningSituation) => void }) => (
    <button onClick={() => onComplete({
      goal: "remember-longer", difficulties: ["forgetting"],
      contentTypes: ["facts"], currentApproach: "rereading",
      sessionLength: "20-45", learningContext: "school"
    })}>Complete situation</button>
  )
}));
vi.mock("../sections/BaselineChallenge", () => ({
  default: ({ onComplete, onContentSelected }: {
    onComplete: (value: BaselineResult) => void;
    onContentSelected?: (value: { memory: string; understanding: string }) => void;
  }) => {
    React.useEffect(() => {
      onContentSelected?.({ memory: "baseline-memory-01", understanding: "baseline-concept-01" });
    }, [onContentSelected]);
    return <button onClick={() => onComplete({
      memory: { score: 0.5, correct: 2, total: 4, confidence: 3, timeSpentMs: 1000 },
      understanding: { score: 2 / 3, correct: 2, total: 3, confidence: 3, timeSpentMs: 1200 }
    })}>Complete baseline</button>;
  }
}));
vi.mock("../sections/MethodIntroduction", () => ({
  default: ({ methods, onComplete }: {
    methods: TrainingMethodId[];
    onComplete: (value: MethodIntroductionResult) => void;
  }) => (
    <button onClick={() => onComplete({
      methods, correct: methods.length, total: methods.length, score: 1
    })}>Complete introduction: {methods.length}</button>
  )
}));
vi.mock("../sections/MethodLab", async () => {
  const { getMethodDefinition } = await vi.importActual<
    typeof import("../methodRegistry")
  >("../methodRegistry");
  return {
    default: ({ methods, onComplete }: {
      methods: TrainingMethodId[];
      onComplete: (value: MethodLabResult) => void;
    }) => (
      <button onClick={() => {
        mocks.labMethods = [...methods];
        onComplete({ experiments: methods.map((method, index) => ({
          method,
          category: getMethodDefinition(method).category,
          score: [0.2, 0.9, 0.8, 0.1][index],
          correct: [2, 9, 8, 1][index], total: 10,
          confidence: 3, ease: 3, willingnessToUse: 3, timeSpentMs: 1000
        })) });
      }}>Complete lab: {methods.length}</button>
    )
  };
});
vi.mock("../sections/MethodMatchChallenge", async () => {
  const { selectMethodsForVerification } = await vi.importActual<
    typeof import("../methodMatchSelector")
  >("../methodMatchSelector");
  return {
    default: ({ methodLab, onComplete }: {
      methodLab: MethodLabResult;
      onComplete: (value: MethodMatchResult) => void;
    }) => {
      const methods = selectMethodsForVerification(methodLab.experiments);
      return <button onClick={() => {
        mocks.matchMethods = [...methods];
        onComplete({ methods: methods.map(method => ({
          method,
          firstScore: methodLab.experiments.find(item => item.method === method)!.score,
          verificationScore: 0.75, confidence: 3, timeSpentMs: 900
        })) });
      }}>Complete match: {methods.length}</button>;
    }
  };
});
vi.mock("../sections/Reflection", () => ({
  default: ({ onComplete }: { onComplete: (value: ReflectionResult) => void }) => (
    <button onClick={() => onComplete({
      preferredMethod: null, priority: "performance",
      surprisedByResults: false, reflectionText: ""
    })}>Complete reflection</button>
  )
}));

import Assessment from "../Assessment";
import { validateTrainingDraft } from "../trainingProgress";
import type { TrainingDraft } from "../trainingProgress";

function savedRecommendation(): SavedAIRecommendation {
  return {
    schemaVersion: 1, mode: "standard",
    inputs: {
      biggestProblem: "I forget facts after studying.",
      methodQuestion: "Which methods help me remember facts?",
      extraContext: "School biology revision"
    },
    result: {
      user_problem: "Forgetting facts",
      recommended_methods: [{
        name: "Active Recall", branch: "meta-learn",
        reason: "Retrieval practice", warning: "Check gaps"
      }],
      study_plan: "Practice retrieval", final_note: "Review gaps"
    },
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
  };
}

async function runAssessment(useAI: boolean) {
  render(<MemoryRouter initialEntries={["/training/assessment"]}>
    <Routes><Route path="/training/assessment" element={<Assessment />} /></Routes>
  </MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Complete situation" }));
  fireEvent.click(screen.getByRole("button", { name: "Complete baseline" }));
  if (useAI) {
    fireEvent.click(await screen.findByRole("button", {
      name: "Use this recommendation"
    }));
  }
  const count = useAI ? 3 : 4;
  fireEvent.click(await screen.findByRole("button", {
    name: `Complete introduction: ${count}`
  }));
  fireEvent.click(screen.getByRole("button", { name: `Complete lab: ${count}` }));
  fireEvent.click(screen.getByRole("button", { name: "Complete match: 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Complete reflection" }));
  await screen.findByRole("heading", { name: mocks.durable ? "Training completion saved" : "Your Learning Profile" });
  return (durableSnapshot ?? mocks.saveAssessment.mock.calls[0][0]) as {
    sessionId: string;
    methodLab: MethodLabResult;
    methodMatch: MethodMatchResult;
    learningProfile: LearningProfile;
  };
}

let durableSnapshot: unknown = null;
let closeOutbox: (() => Promise<void>) | null = null;
function enableV2() {
  vi.stubGlobal("crypto", webcrypto);
  const outbox = createCompletionOutbox("demo-stage4e-ui", new IDBFactory()); closeOutbox = outbox.close;
  mocks.durable = createTrainingCompletionClient({ outbox, target: "protected-v2", timeZone: () => "UTC",
    assertOwner: uid => { if (uid !== "qa-user") throw new Error("owner changed"); }, hasReservation: async () => true,
    transport: async (uid, json) => {
      const request = JSON.parse(json), checked = validateCompletion(uid, request, new Date().toISOString());
      const entry = (await outbox.get(uid, request.sessionId))!;
      durableSnapshot = { ...request, learningProfile: JSON.parse(entry.draftJSON!).completed.learningProfile };
      return { schemaVersion: 2, status: "accepted", sessionId: request.sessionId, mode: request.mode,
        evidenceId: `session-${digest(request.sessionId)}`, requestHash: checked.requestHash, lifecycleEpoch: 1, acceptedRevision: 1,
        recordedAt: new Date().toISOString(), legacyAssessmentId: request.sessionId, legacyProfileUpdated: true };
    }, recordActivity: async () => {}, clearDraft: async () => {} });
}

beforeEach(() => {
  mocks.user = { uid: "qa-user" }; mocks.authListeners.clear();
  mocks.durable = null; durableSnapshot = null;
  mocks.savedAI = null;
  mocks.labMethods = [];
  mocks.matchMethods = [];
  mocks.loadTrainingDraft.mockResolvedValue(null);
  mocks.saveTrainingDraft.mockResolvedValue(undefined);
  mocks.reserveTrainingAccess.mockResolvedValue(undefined);
  mocks.loadAIRecommendation.mockImplementation(async () => mocks.savedAI);
  mocks.saveAssessment.mockResolvedValue("completed-assessment");
  mocks.recordTrainingCompletion.mockResolvedValue({
    wasNewDay: false, currentStreak: 1
  });
  mocks.discardTrainingDraft.mockResolvedValue(undefined);
});

afterEach(async () => { cleanup(); if (closeOutbox) await closeOutbox(); closeOutbox = null; vi.unstubAllGlobals(); });

describe("complete automatic Test Me journeys with real ranking and profile builder", () => {
  it.each([
    { label: "AI-informed", useAI: true, count: 3, v2: false },
    { label: "traditional", useAI: false, count: 4, v2: false },
    { label: "protected V2 AI-informed", useAI: true, count: 3, v2: true },
    { label: "protected V2 traditional", useAI: false, count: 4, v2: true }
  ])("$label Test Me builds $count method-evidence records without AI entering performance scores", async ({ useAI, count, v2 }) => {
    if (v2) enableV2();
    mocks.savedAI = useAI ? savedRecommendation() : null;
    const saved = await runAssessment(useAI);

    expect(mocks.reserveTrainingAccess).toHaveBeenCalledTimes(1);
    expect(mocks.labMethods).toHaveLength(count);
    expect(saved.methodLab.experiments).toHaveLength(count);
    expect(mocks.matchMethods).toEqual(mocks.labMethods.slice(1, 3));
    expect(saved.methodMatch.methods.map(result => result.method))
      .toEqual(mocks.matchMethods);
    expect(saved.learningProfile.methodEvidence).toHaveLength(count);
    expect(saved.learningProfile.methodEvidence.map(item => item.method))
      .toEqual(mocks.labMethods);
    expect(saved.learningProfile.strongestVerifiedMethod).toBe(mocks.labMethods[1]);
    expect(saved.learningProfile.recommendedMethods).toEqual(mocks.matchMethods);
    expect(saved.learningProfile.methodEvidence[0]).toMatchObject({
      labScore: 0.2, verificationScore: null
    });
    expect(saved.learningProfile.methodEvidence[1]).toMatchObject({
      labScore: 0.9, verificationScore: 0.75
    });
    expect(saved.learningProfile.methodEvidence[1].evidenceScore)
      .toBeCloseTo(0.9 * 0.4 + 0.75 * 0.35 + 0.6 * 0.05 +
        0.6 * 0.05 + 0.6 * 0.05 + 0.6 * 0.1);
    expect(mocks.saveAssessment).toHaveBeenCalledTimes(v2 ? 0 : 1);
  });
});

describe("AI confirmation at the actual selection boundary", () => {
  function entry(url = "/training/assessment") {
    return render(<MemoryRouter initialEntries={[url]}><Routes>
      <Route path="/training/assessment" element={<Assessment />} />
      <Route path="/training" element={<p>Training landing</p>} />
    </Routes></MemoryRouter>);
  }
  async function reachSelection() {
    entry();
    expect(screen.queryByRole("heading", { name: "Use your recent AI Recommendation?" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Complete situation" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete baseline" }));
  }
  async function prompt() {
    mocks.savedAI = savedRecommendation(); await reachSelection();
    await screen.findByRole("heading", { name: "Use your recent AI Recommendation?" });
    expect(screen.queryByRole("button", { name: /Complete introduction/ })).toBeNull();
  }
  async function expectCount(count: number, timeout = 1000) {
    expect(await screen.findByRole("button", { name: `Complete introduction: ${count}` }, { timeout })).toBeTruthy();
    expect(mocks.reserveTrainingAccess).toHaveBeenCalledTimes(1);
  }

  it("announces committed major sections once, keeps the AI prompt after Baseline, and does not overlay Lab/Match sounds", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("Audio", vi.fn(function () { return { play, pause: vi.fn(), currentTime: 0, volume: 1 }; }));
    mocks.savedAI = savedRecommendation(); entry();
    await screen.findByRole("button", { name: "Complete situation" });
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Completion sound: off" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete situation" }));
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Complete baseline" }));
    await screen.findByRole("heading", { name: "Use your recent AI Recommendation?" });
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Use this recommendation" }));
    await expectCount(3); expect(play).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Complete introduction: 3" }));
    expect(play).toHaveBeenCalledTimes(3);
    // These stubs have no individual activity callbacks. The real Lab/Match
    // controllers announce those; their enclosing section must stay silent.
    fireEvent.click(screen.getByRole("button", { name: "Complete lab: 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete match: 2" }));
    expect(play).toHaveBeenCalledTimes(3);
  });

  it.each([true, false])("requires an explicit decision after Baseline and selects the actual count (yes=%s)", async yes => {
    await prompt();
    fireEvent.click(screen.getByRole("button", { name: yes ? "Use this recommendation" : "Use standard selection" }));
    await expectCount(yes ? 3 : 4);
    expect(mocks.loadAIRecommendation).toHaveBeenCalledTimes(yes ? 2 : 1);
  });

  it.each(["expired", "non-trainable", "ambiguous"])("keeps %s advice on the four-method route", async kind => {
    mocks.savedAI = savedRecommendation();
    if (kind === "expired") mocks.savedAI.updatedAt = { seconds: 1, nanoseconds: 0 };
    else mocks.savedAI.result.recommended_methods[0].name = kind === "non-trainable" ? "Calm Start" : "Active Recall / Feynman";
    await reachSelection(); await expectCount(4);
    expect(screen.queryByRole("heading", { name: "Use your recent AI Recommendation?" })).toBeNull();
    expect(screen.getByText(/saved AI recommendation isn't eligible/)).toBeTruthy();
  });

  it("keeps guests traditional even when browser advice exists", async () => {
    mocks.user = null; mocks.savedAI = savedRecommendation(); await reachSelection(); await expectCount(4);
    expect(mocks.loadAIRecommendation).not.toHaveBeenCalled();
  });

  it.each(["removed", "changed-context", "expired"])("revalidates %s advice when Yes is committed", async kind => {
    await prompt();
    if (kind === "removed") mocks.savedAI = null;
    else if (kind === "changed-context") mocks.savedAI = {
      ...mocks.savedAI!, inputs: { ...mocks.savedAI!.inputs, extraContext: "A different subject and topic" }
    };
    else mocks.savedAI = { ...mocks.savedAI!, updatedAt: { seconds: 1, nanoseconds: 0 } };
    fireEvent.click(screen.getByRole("button", { name: "Use this recommendation" }));
    await expectCount(4);
    expect(screen.getByText(/previous AI recommendation is no longer available/)).toBeTruthy();
    expect(mocks.loadAIRecommendation).toHaveBeenLastCalledWith({ kind: "user", uid: "qa-user" });
  });

  it("checks the seven-day boundary again even if the saved record itself has not changed", async () => {
    await prompt();
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 8 * 86400000);
    try {
      fireEvent.click(screen.getByRole("button", { name: "Use this recommendation" }));
      await expectCount(4);
    } finally { now.mockRestore(); }
  });

  it("deduplicates confirmation while the latest owner read is pending", async () => {
    await prompt();
    let release!: (saved: SavedAIRecommendation) => void;
    mocks.loadAIRecommendation.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const yes = screen.getByRole("button", { name: "Use this recommendation" });
    fireEvent.click(yes); fireEvent.click(yes);
    await waitFor(() => expect(mocks.loadAIRecommendation).toHaveBeenCalledTimes(2));
    await act(async () => { release(mocks.savedAI!); }); await expectCount(3);
  });

  it("times out a stalled confirmation read and never changes finalized methods on late resolution", async () => {
    await prompt();
    let release!: (saved: SavedAIRecommendation) => void;
    mocks.loadAIRecommendation.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Use this recommendation" }));
    await expectCount(4, 3500);
    await act(async () => { release(mocks.savedAI!); });
    expect(screen.queryByRole("button", { name: "Complete introduction: 3" })).toBeNull();
  });

  it("rejects a late old-owner result after account switching", async () => {
    await prompt();
    let release!: (saved: SavedAIRecommendation) => void;
    const old = mocks.savedAI!;
    mocks.loadAIRecommendation.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Use this recommendation" }));
    await waitFor(() => expect(mocks.loadAIRecommendation).toHaveBeenCalledTimes(2));
    await act(async () => {
      mocks.user = { uid: "different-student" };
      for (const callback of mocks.authListeners) callback(mocks.user);
    });
    await act(async () => { release(old); });
    expect(screen.queryByRole("button", { name: /Complete introduction/ })).toBeNull();
    expect(await screen.findByRole("heading", { name: "Training paused" })).toBeTruthy();
    expect(mocks.reserveTrainingAccess).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("resumes the session's already fixed methods without another decision or reservation (yes=%s)", async yes => {
    await prompt();
    fireEvent.click(screen.getByRole("button", { name: yes ? "Use this recommendation" : "Use standard selection" }));
    const count = yes ? 3 : 4;
    await expectCount(count);
    fireEvent.click(screen.getByRole("button", { name: "Save and exit" }));
    await screen.findByText("Training landing");
    const saved = mocks.saveTrainingDraft.mock.calls.map(call => call[0] as TrainingDraft)
      .reverse().find(draft => draft.section === 3 && draft.selectedMethods.length === count);
    expect(saved).toBeDefined();
    const draft = saved!;
    expect(draft.pendingAIConfirmation).toBeUndefined();
    const validation = validateTrainingDraft(draft, { kind: "user", uid: "qa-user" });
    expect(validation.valid, JSON.stringify(validation)).toBe(true);
    cleanup(); mocks.loadTrainingDraft.mockResolvedValue(validation);
    mocks.savedAI = null; mocks.loadAIRecommendation.mockClear(); mocks.reserveTrainingAccess.mockClear();
    entry(`/training/assessment?resume=${encodeURIComponent(draft.sessionId)}`);
    expect(await screen.findByRole("button", { name: `Complete introduction: ${count}` })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Use your recent AI Recommendation?" })).toBeNull();
    expect(mocks.loadAIRecommendation).not.toHaveBeenCalled();
    expect(mocks.reserveTrainingAccess).not.toHaveBeenCalled();
  });
});
