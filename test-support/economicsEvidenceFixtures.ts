import type { CompletionRequest } from "../backend/trainingCompletionContract";
import type { TrainingMethodId, MethodCategory } from "../src/quiz/type";
import { economicsAssignments } from "../src/quiz/economics9708/allocation";
import { economicsContentId, economicsMetadata } from "../src/quiz/economics9708/selection";
import { resolveEconomicsAssessment } from "../src/quiz/economics9708/assessmentEvidence";
import type { EconomicsResponse } from "../src/quiz/economics9708/assessmentEvidence";
import { selectMethodsForVerification } from "../src/quiz/methodMatchSelector";

/** Synthetic canonical-key fixture; no Firebase, browser or external service. */
export function economicsEvidenceFixture({ topic = "1.5", methods = ["memory-palace", "feynman"], mode = "manual", sessionId = "objective-session-0001",
  startedAt = "2026-11-03T09:00:00.000Z", completedAt = "2026-11-03T10:00:00.000Z" }: {
  topic?: string; methods?: TrainingMethodId[]; mode?: "auto" | "manual"; sessionId?: string; startedAt?: string; completedAt?: string;
} = {}): CompletionRequest {
  const labIds = economicsAssignments(methods, "lab", topic, "mapped-1");
  const categories: Partial<Record<TrainingMethodId, MethodCategory>> = { "memory-palace": "memory", feynman: "understanding", "active-recall": "memory", cornell: "organization", "leitner-system": "memory" };
  const methodLab = { experiments: methods.map((method, i) => { const n = resolveEconomicsAssessment(labIds[i]).scored.length;
    return { method, category: categories[method] ?? "understanding", correct: n, total: n, score: 1, confidence: 3, ease: 3, willingnessToUse: 3, timeSpentMs: 60000 }; }) };
  const verified = selectMethodsForVerification(methodLab.experiments);
  const matchIds = economicsAssignments(verified, "match", topic, "mapped-1");
  const ids = [...(mode === "auto" ? [economicsContentId(topic, "memory"), economicsContentId(topic, "understanding")] : []), ...labIds, ...matchIds];
  return { schemaVersion: 1, sessionId, mode, selectedMethods: [...methods], methodIntroduction: { methods: [...methods], correct: methods.length, total: methods.length, score: 1 },
    methodLab, methodMatch: { methods: verified.map(method => ({ method, firstScore: 1, verificationScore: 1, confidence: 3, timeSpentMs: 60000 })) },
    reflection: { preferredMethod: null, priority: "performance", reflectionText: "Synthetic private reflection", surprisedByResults: false },
    ...(mode === "auto" ? { learningSituation: { goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"], currentApproach: "rereading", sessionLength: "20-45", learningContext: "school" },
      baseline: { memory: { score: 1, correct: 4, total: 4, confidence: 3, timeSpentMs: 60000 }, understanding: { score: 1, correct: 3, total: 3, confidence: 3, timeSpentMs: 60000 } } } : {}),
    completedAt, selectionContext: { kind: mode === "manual" ? "manual" : methods.length === 3 ? "ai-confirmed" : "traditional", nominatedMethodIds: [] },
    metadata: [...labIds, ...matchIds].map(id => {
      const f = resolveEconomicsAssessment(id);
      return { methodId: f.methodId!, phase: f.phase === "lab" ? "lab" : "match", context: economicsMetadata(id)!,
        protocol: { assessmentVersion: `2026-v2-pilot-1:${f.phase}:${f.methodId}:mapped-1`, scoringVersion: null,
          questions: f.practice.length ? null : f.scored.map(q => ({ questionId: q.id, difficulty: null,
            offeredOptionCount: 4, offeredOptionIds: q.options.map((_, i) => `${q.id}:option-${i}`) })) } };
    }),
    economicsResponses: { schemaVersion: 1, topicId: topic, activityVersion: "mapped-1", sessionStartedAt: startedAt,
      activities: ids.map(contentSetId => { const f = resolveEconomicsAssessment(contentSetId);
        const answer = (questions: typeof f.scored, role: EconomicsResponse["role"]) => questions.map(q => ({ questionId: q.id,
          answerOptionId: `${q.id}:option-${q.options.indexOf(q.correct)}`, offeredOptionIds: q.options.map((_, i) => `${q.id}:option-${i}`), role }));
        return { contentSetId, responses: [...answer(f.scored, "scored"), ...answer(f.practice, "practice")] }; }) }
  };
}
