import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const firestore = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn()
}));

const firebase = vi.hoisted(() => ({
  db: { name: "mock-db" }
}));

vi.mock("firebase/firestore", () => ({
  addDoc: firestore.addDoc,
  collection: firestore.collection,
  doc: firestore.doc,
  serverTimestamp:
    firestore.serverTimestamp,
  setDoc: firestore.setDoc
}));

vi.mock("../../firebase", () => ({
  db: firebase.db
}));

import {
  saveAssessment
} from "../../services/assessment";
import {
  buildLearningProfile
} from "../profileBuilder";

import type {
  BaselineResult,
  LearningSituation,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult
} from "../type";

const learningSituation: LearningSituation = {
  goal: "remember-longer",
  difficulties: ["forgetting"],
  contentTypes: ["facts"],
  currentApproach: "rereading",
  sessionLength: "20-45",
  learningContext: "university"
};

const baseline: BaselineResult = {
  memory: {
    score: 0.5,
    correct: 2,
    total: 4,
    confidence: 3,
    timeSpentMs: 1000
  },
  understanding: {
    score: 1,
    correct: 3,
    total: 3,
    confidence: 4,
    timeSpentMs: 1200
  }
};

const methodIntroduction:
  MethodIntroductionResult = {
    methods: ["active-recall"],
    correct: 1,
    total: 1,
    score: 1
  };

const methodLab: MethodLabResult = {
  experiments: [
    {
      method: "active-recall",
      category: "memory",
      score: 0.75,
      correct: 3,
      total: 4,
      confidence: 4,
      ease: 3,
      willingnessToUse: 5,
      timeSpentMs: 5000
    }
  ]
};

const methodMatch: MethodMatchResult = {
  methods: [
    {
      method: "active-recall",
      firstScore: 0.75,
      verificationScore: 0.5,
      confidence: 3,
      timeSpentMs: 3000
    }
  ]
};

const reflection: ReflectionResult = {
  preferredMethod: "active-recall",
  priority: "performance",
  surprisedByResults: false,
  reflectionText: ""
};

describe("assessment persistence contract", () => {
  beforeEach(() => {
    firestore.collection.mockReturnValue(
      "assessments-ref"
    );
    firestore.doc.mockReturnValue("user-ref");
    firestore.addDoc.mockResolvedValue({
      id: "assessment-123"
    });
    firestore.setDoc.mockResolvedValue(undefined);
    firestore.serverTimestamp.mockReturnValue(
      "server-timestamp"
    );
  });

  it("builds the existing LearningProfile and MethodEvidence shapes", () => {
    const profile = buildLearningProfile({
      baseline,
      methodIntroduction,
      methodLab,
      methodMatch,
      reflection
    });

    expect(Object.keys(profile).sort()).toEqual([
      "baseline",
      "methodEvidence",
      "methodKnowledgeScore",
      "preferredMethod",
      "priority",
      "recommendedMethods",
      "strongestVerifiedMethod"
    ]);
    expect(
      Object.keys(profile.methodEvidence[0]).sort()
    ).toEqual([
      "ease",
      "evidenceScore",
      "labConfidence",
      "labScore",
      "method",
      "verificationConfidence",
      "verificationScore",
      "willingnessToUse"
    ]);
    expect(profile).toMatchObject({
      strongestVerifiedMethod: "active-recall",
      preferredMethod: "active-recall",
      recommendedMethods: ["active-recall"],
      baseline: {
        memoryScore: 0.5,
        understandingScore: 1
      },
      methodKnowledgeScore: 1,
      priority: "performance"
    });
  });

  it("writes the existing Firestore paths and payload fields without using production Firebase", async () => {
    const learningProfile = buildLearningProfile({
      baseline,
      methodIntroduction,
      methodLab,
      methodMatch,
      reflection
    });

    const assessmentId = await saveAssessment({
      userId: "user-123",
      learningSituation,
      baseline,
      methodIntroduction,
      methodLab,
      methodMatch,
      reflection,
      learningProfile
    });

    expect(firestore.collection).toHaveBeenCalledWith(
      firebase.db,
      "users",
      "user-123",
      "assessments"
    );
    expect(firestore.addDoc).toHaveBeenCalledWith(
      "assessments-ref",
      {
        status: "completed",
        learningSituation,
        baseline,
        methodIntroduction,
        methodLab,
        methodMatch,
        reflection,
        learningProfile,
        createdAt: "server-timestamp"
      }
    );
    expect(firestore.doc).toHaveBeenCalledWith(
      firebase.db,
      "users",
      "user-123"
    );
    expect(firestore.setDoc).toHaveBeenCalledWith(
      "user-ref",
      {
        learningProfile,
        latestAssessmentId: "assessment-123",
        learningProfileUpdatedAt:
          "server-timestamp"
      },
      {
        merge: true
      }
    );
    expect(assessmentId).toBe("assessment-123");
  });
});
