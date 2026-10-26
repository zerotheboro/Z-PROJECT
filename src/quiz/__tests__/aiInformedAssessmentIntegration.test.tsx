// @vitest-environment jsdom

import React from "react";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  subscribeToAuth: (callback: (user: { uid: string }) => void) => {
    callback({ uid: "qa-user" });
    return () => undefined;
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
  default: ({ onComplete }: { onComplete: (value: BaselineResult) => void }) => (
    <button onClick={() => onComplete({
      memory: { score: 0.5, correct: 2, total: 4, confidence: 3, timeSpentMs: 1000 },
      understanding: { score: 0.5, correct: 2, total: 4, confidence: 3, timeSpentMs: 1200 }
    })}>Complete baseline</button>
  )
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
