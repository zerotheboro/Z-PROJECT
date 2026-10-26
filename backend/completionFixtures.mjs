export const COMPLETION_TEST_UID = "phase2a-student";
export function completionFixture({ sessionId = "session-phase2a-001", mode = "auto", count = 3,
  date = "2026-10-19T10:00:00.000Z", score = 0.75 } = {}) {
  const selectedMethods = ["active-recall", "feynman", "cornell", "memory-palace"].slice(0, count);
  const categories = { "active-recall": "memory", feynman: "understanding", cornell: "organization", "memory-palace": "memory" };
  const methodLab = { experiments: selectedMethods.map(method => ({ method, category: categories[method],
    score, correct: Math.round(score * 4), total: 4, confidence: 3, ease: 3, willingnessToUse: 3, timeSpentMs: 1000 })) };
  const verified = [...selectedMethods].sort().slice(0, 2);
  return {
    schemaVersion: 1, sessionId, mode, selectedMethods,
    methodIntroduction: { methods: selectedMethods, correct: count, total: count, score: 1 },
    methodLab, methodMatch: { methods: verified.map(method => ({ method, firstScore: score, verificationScore: 0.5, confidence: 3, timeSpentMs: 500 })) },
    reflection: { preferredMethod: selectedMethods[0], priority: "performance", surprisedByResults: false, reflectionText: "Safe offline reflection" },
    ...(mode === "auto" ? {
      learningSituation: { goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"], currentApproach: "rereading", sessionLength: "20-45", learningContext: "school" },
      baseline: { memory: { score: 0.5, correct: 2, total: 4, confidence: 3, timeSpentMs: 1000 }, understanding: { score: 0.75, correct: 3, total: 4, confidence: 3, timeSpentMs: 1000 } }
    } : {}),
    completedAt: date,
    selectionContext: { kind: mode === "manual" ? "manual" : count === 3 ? "ai-confirmed" : "traditional", nominatedMethodIds: mode === "auto" && count === 3 ? ["feynman"] : [] },
    metadata: [
      ...selectedMethods.map(methodId => ({ methodId, phase: "lab", completedAt: date,
        context: { subject: "Biology", topic: "Cells", contentSetId: "fixture-lab", contentVersion: "1" },
        protocol: { scoringVersion: "fixture-accuracy-v1", assessmentVersion: "fixture-v1", questions: [1, 2, 3, 4].map(i => ({ questionId: `q${i}`, difficulty: "medium", offeredOptionCount: 3, offeredOptionIds: ["a", "b", "c"] })) } })),
      ...verified.map(methodId => ({ methodId, phase: "match", completedAt: date,
        context: { contentSetId: "fixture-match", contentVersion: "1" }, matchCounts: { correct: 2, total: 4 } }))
    ]
  };
}
