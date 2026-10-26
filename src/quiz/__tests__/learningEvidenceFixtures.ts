import { createCompletedSessionEvidence } from "../learningEvidence";
import type { CompletedSessionInput, ObservationMetadata } from "../learningEvidence";
import type { MethodId } from "../type";

export const evidenceOwner = { kind: "user", uid: "foundation-student" } as const;

export function knownMetadata(
  methodId: MethodId,
  phase: "lab" | "match" = "lab",
  completedAt = "2026-10-10T10:00:00.000Z"
): ObservationMetadata {
  return {
    methodId, phase, completedAt,
    context: {
      subject: "Biology", topic: "Cell transport", exerciseTopic: "Osmosis",
      contentSetId: `osmosis-${phase}`, contentVersion: "1"
    },
    protocol: {
      assessmentVersion: "foundation-fixture-v1", scoringVersion: "mcq-accuracy-v1",
      questions: ["q1", "q2", "q3", "q4"].map(questionId => ({
        questionId, difficulty: "medium", offeredOptionCount: 3, offeredOptionIds: ["a", "b", "c"]
      }))
    },
    ...(phase === "match" ? { matchCounts: { correct: 3, total: 4 } } : {})
  };
}

export function sessionInput({
  id = "session-one",
  methods = ["active-recall"],
  mode = "manual",
  correct = 3,
  date = "2026-10-10T10:00:00.000Z",
  known = true
}: {
  id?: string;
  methods?: MethodId[];
  mode?: "auto" | "manual";
  correct?: number;
  date?: string;
  known?: boolean;
} = {}): CompletedSessionInput {
  const verified = methods.slice(0, 2);
  return {
    sessionId: id, owner: evidenceOwner, mode, completedAt: date,
    methodLab: { experiments: methods.map(method => ({
      method, score: correct / 4, correct, total: 4,
      confidence: 4, ease: 3, willingnessToUse: 5, timeSpentMs: 1000
    })) },
    methodMatch: { methods: verified.map(method => ({
      method, verificationScore: 0.75, confidence: 4, timeSpentMs: 500
    })) },
    metadata: known ? [
      ...methods.map(method => knownMetadata(method, "lab", date)),
      ...verified.map(method => knownMetadata(method, "match", date))
    ] : [],
    selectionContext: {
      kind: mode === "manual" ? "manual" : methods.length === 3 ? "ai-confirmed" : "traditional",
      nominatedMethodIds: mode === "auto" && methods.length === 3 ? ["active-recall"] : []
    },
    preference: { methodId: methods[0], priority: "realistic-use" }
  };
}

export function completedSession(options: Parameters<typeof sessionInput>[0] = {}) {
  return createCompletedSessionEvidence(sessionInput(options));
}

export function legacyAssessment() {
  return {
    status: "completed",
    methodLab: { experiments: [{
      method: "active-recall", category: "memory", score: 0.75, correct: 3, total: 4,
      confidence: 4, ease: 3, willingnessToUse: 5, timeSpentMs: 1000
    }] },
    methodMatch: { methods: [{
      method: "active-recall", firstScore: 0.75, verificationScore: 0.5,
      confidence: 3, timeSpentMs: 800
    }] },
    learningSituation: { goal: "exam-preparation", contentTypes: ["facts"], learningContext: "school" },
    baseline: { memory: { score: 1 }, understanding: { score: 1 } },
    learningProfile: { methodEvidence: [{ method: "active-recall", evidenceScore: 999 }] },
    reflection: { preferredMethod: "active-recall", priority: "performance", reflectionText: "Private writing" },
    createdAt: { seconds: 1_760_097_600, nanoseconds: 123_000_000 }
  };
}
