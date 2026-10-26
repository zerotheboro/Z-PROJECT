import { describe, expect, it } from "vitest";

import {
  getAIRecommendationCandidates,
  getRelevantAIRecommendedMethods,
  resolveAITrainingMethodId
} from "../aiRecommendationContext";

import type {
  SavedAIRecommendation
} from "../../services/aiRecommendationPersistence";
import type {
  BaselineResult,
  LearningSituation
} from "../type";

const situation: LearningSituation = {
  goal: "remember-longer",
  difficulties: ["forgetting"],
  contentTypes: ["facts"],
  currentApproach: "rereading",
  sessionLength: "20-45",
  learningContext: "school"
};

const baseline: BaselineResult = {
  memory: {
    score: 1, correct: 4, total: 4,
    confidence: 3, timeSpentMs: 1000
  },
  understanding: {
    score: 1, correct: 4, total: 4,
    confidence: 3, timeSpentMs: 1000
  }
};

function saved(names: string[], updatedAt: unknown = new Date().toISOString()): SavedAIRecommendation {
  return {
    schemaVersion: 1,
    mode: "standard",
    inputs: {
      biggestProblem: "I forget facts.",
      methodQuestion: "How should I study?",
      extraContext: "School revision"
    },
    result: {
      user_problem: "Forgetting facts",
      recommended_methods: names.map(name => ({
        name,
        branch: "meta-learn",
        reason: "Useful here.",
        warning: "Practise consistently."
      })),
      study_plan: "Study and test.",
      final_note: "Keep reviewing."
    },
    updatedAt
  };
}

describe("saved AI recommendation context", () => {
  it.each([
    ["Cornell Method", "cornell"],
    ["Interleaved Practice", "interleaving"],
    ["One Sentence", "one-sentence"],
    ["Doodle Effect", "doodle-effect"],
    ["10 Minute Wall Stare", "ten-minute-wall-stare"],
    ["Stroop Effect Exercise", "strooper-effect"],
    ["Active Recall", "active-recall"],
    ["active-recall", "active-recall"]
  ])("maps %s unambiguously to %s", (name, id) => {
    expect(resolveAITrainingMethodId(name)).toBe(id);
  });

  it("rejects unsupported or fuzzy names", () => {
    expect(resolveAITrainingMethodId("Pomodoro Technique"))
      .toBeNull();
    expect(resolveAITrainingMethodId("Recall"))
      .toBeNull();
  });

  it("keeps only trainable candidates that fit the current situation", () => {
    expect(getAIRecommendationCandidates(
      saved(["Active Recall", "Cornell Method", "Pomodoro Technique"]),
      situation, baseline
    )).toEqual(["active-recall"]);
    expect(getRelevantAIRecommendedMethods(
      saved(["Active Recall", "Cornell Method", "Pomodoro Technique"]),
      situation, baseline, true
    )).toEqual(["active-recall"]);
    expect(getRelevantAIRecommendedMethods(
      saved(["Pomodoro Technique", "Cornell Method"]),
      situation, baseline, true
    )).toEqual([]);
    expect(getRelevantAIRecommendedMethods(
      null, situation, baseline, true
    )).toEqual([]);
  });

  it("does not accept an unrelated subject from one broad signal alone", () => {
    const advice = saved(["Active Recall"]);
    advice.inputs.extraContext = "Biology vocabulary on coral reefs";
    // The current situation has no subject/topic field. A generic
    // facts/forgetting signal cannot establish same-subject relevance.
    expect(getAIRecommendationCandidates(advice, situation, baseline))
      .toEqual(["active-recall"]);
    expect(getRelevantAIRecommendedMethods(advice, situation, baseline))
      .toEqual([]);
  });

  it("rejects stale and future-dated advice even when explicitly confirmed", () => {
    const now = Date.parse("2026-10-18T12:00:00.000Z");
    expect(getRelevantAIRecommendedMethods(
      saved(["Active Recall"], "2026-10-01T00:00:00.000Z"),
      situation, baseline, true, now
    )).toEqual([]);
    expect(getRelevantAIRecommendedMethods(
      saved(["Active Recall"], { seconds: Math.floor((now + 3600000) / 1000), nanoseconds: 0 }),
      situation, baseline, true, now
    )).toEqual([]);
  });

  it("requires saved inputs and a current learning goal", () => {
    const advice = saved(["Active Recall"]);
    advice.inputs.methodQuestion = "";
    expect(getRelevantAIRecommendedMethods(
      advice, situation, baseline, true
    )).toEqual([]);
    const completeAdvice = saved(["Active Recall"]);
    expect(getRelevantAIRecommendedMethods(
      completeAdvice, { ...situation, goal: null }, baseline, true
    )).toEqual([]);
  });

  it("does not infer a subject from missing topic metadata", () => {
    const advice = saved(["Active Recall"]);
    advice.inputs.extraContext = "";
    expect(getRelevantAIRecommendedMethods(advice, situation, baseline))
      .toEqual([]);
  });

  it("accepts a fresh, confirmed matching context with a cloud timestamp", () => {
    const now = Date.parse("2026-10-18T12:00:00.000Z");
    expect(getRelevantAIRecommendedMethods(
      saved(["Active Recall"], { seconds: Math.floor((now - 3600000) / 1000), nanoseconds: 0 }),
      situation, baseline, true, now
    )).toEqual(["active-recall"]);
  });
});
