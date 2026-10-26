import { createTrainingDraft } from "../src/quiz/trainingProgress";
import { selectMethodsForVerification } from "../src/quiz/methodMatchSelector";
import { buildLearningProfile } from "../src/quiz/profileBuilder";
import type { TrainingMethodId } from "../src/quiz/type";

export function completionDraftFixture(mode: "auto" | "manual" = "auto", count = 3, sessionId = "local-completion-session") {
  const methods: TrainingMethodId[] = ["active-recall", "feynman", "cornell", "memory-palace"];
  const draft = createTrainingDraft({ owner: { kind: "user", uid: "local-student" }, mode, selectedMethods: methods.slice(0, count), sessionId });
  draft.section = 6; draft.phase = "final-save";
  draft.labContentSetIds = draft.selectedMethods.map(id => `${id}-fixture-lab`);
  draft.completed.methodIntroduction = { methods: draft.selectedMethods, correct: count, total: count, score: 1 };
  draft.completed.methodLab = { experiments: draft.selectedMethods.map(method => ({ method,
    category: method === "feynman" ? "understanding" : method === "cornell" ? "organization" : "memory",
    score: 0.75, correct: 3, total: 4, confidence: 3, ease: 3, willingnessToUse: 3, timeSpentMs: 1000 })) };
  draft.verificationMethodOrder = selectMethodsForVerification(draft.completed.methodLab.experiments);
  draft.matchContentSetIds = draft.verificationMethodOrder.map(id => `${id}-fixture-match`);
  draft.completed.methodMatch = { methods: draft.verificationMethodOrder.map(method => ({ method,
    firstScore: 0.75, verificationScore: 0.5, confidence: 3, timeSpentMs: 500 })) };
  draft.completed.reflection = { preferredMethod: null, priority: "performance", surprisedByResults: false, reflectionText: "Synthetic offline reflection" };
  if (mode === "auto") {
    draft.completed.learningSituation = { goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"], currentApproach: "rereading", sessionLength: "20-45", learningContext: "school" };
    draft.completed.baseline = { memory: { score: 0.5, correct: 2, total: 4, confidence: 3, timeSpentMs: 1000 },
      understanding: { score: 0.5, correct: 2, total: 4, confidence: 3, timeSpentMs: 1000 } };
    draft.completed.learningProfile = buildLearningProfile({ baseline: draft.completed.baseline,
      methodIntroduction: draft.completed.methodIntroduction, methodLab: draft.completed.methodLab,
      methodMatch: draft.completed.methodMatch, reflection: draft.completed.reflection });
  }
  return draft;
}
