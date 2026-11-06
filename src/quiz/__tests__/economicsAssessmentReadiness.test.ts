import { describe, expect, it } from "vitest";
import { economicsPacks, requireEconomicsPack, packProblems } from "../economics9708/packs";
import { mapTopicLearningContent } from "../economics9708/objectives";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { economicsAssignments } from "../economics9708/allocation";

const items = (topic: string) => {
  const p = requireEconomicsPack(topic);
  return [...p.baselineMemory, ...p.baselineUnderstanding, ...p.lab, ...p.verification];
};
describe("Phase 5B0 assessment-readiness inventory (not difficulty calibration)", () => {
  it("accounts for all nine playable topics, 43 objectives and 432 distinct item identities", () => {
    expect(economicsPacks.map(p => p.topicId)).toEqual(["1.3", "1.4", "1.5", "1.6", "2.1", "2.2", "2.3", "2.4", "2.5"]);
    expect(economicsPacks.flatMap(p => mapTopicLearningContent(p).objectives)).toHaveLength(43);
    const bank = economicsPacks.flatMap(p => items(p.topicId));
    expect(bank).toHaveLength(432); expect(new Set(bank.map(q => q.id)).size).toBe(432);
    expect(bank.filter(q => q.coverage.length === 1)).toHaveLength(258);
    expect(bank.filter(q => q.diagram)).toHaveLength(10);
    for (const p of economicsPacks) {
      expect(packProblems(p)).toEqual([]);
      expect([p.baselineMemory.length, p.baselineUnderstanding.length, p.lab.length, p.verification.length]).toEqual([4, 3, 26, 15]);
    }
  });
  it("checks keyed answers and declared membership without claiming semantic or difficulty equivalence", () => {
    for (const p of economicsPacks) {
      const mapped = mapTopicLearningContent(p);
      for (const q of items(p.topicId)) {
        expect(new Set(q.options).size, q.id).toBe(4);
        expect(q.options.filter(o => o === q.correct), q.id).toHaveLength(1);
        expect(mapped.questions.find(m => m.questionId === q.id)?.objectiveIds, q.id)
          .toEqual(q.coverage.map(id => `ec9708-objective-${id}`));
      }
    }
  });
  it("reproduces repeat exposure on a later session despite disjoint Lab and Match pools", () => {
    const first = economicsAssignments(["memory-palace", "feynman"], "lab", "1.5", "mapped-1");
    const later = economicsAssignments(["memory-palace", "feynman"], "lab", "1.5", "mapped-1");
    expect(later).toEqual(first);
    expect(resolveEconomicsAssessment(first[0]).scored.map(q => q.id)).toEqual(resolveEconomicsAssessment(later[0]).scored.map(q => q.id));
    const labIds = new Set(requireEconomicsPack("1.5").lab.map(q => q.id));
    expect(requireEconomicsPack("1.5").verification.every(q => !labIds.has(q.id))).toBe(true);
  });
  it("does not mistake two selected methods for two Economics Verification questions", () => {
    const ids = economicsAssignments(["memory-palace", "feynman"], "match", "1.5", "mapped-1");
    expect(ids.map(id => resolveEconomicsAssessment(id).scored.length)).toEqual([5, 3]);
    const single = economicsAssignments(["active-recall"], "match", "2.2", "mapped-1");
    expect(resolveEconomicsAssessment(single[0]).scored).toHaveLength(4);
  });
  it("exposes the shortage of independent diagram forms and joint-objective coverage", () => {
    const ppc = requireEconomicsPack("1.5");
    expect(ppc.lab.filter(q => q.diagram)).toHaveLength(2);
    expect(ppc.verification.filter(q => q.diagram)).toHaveLength(2);
    const calculation = items("2.2").filter(q => q.coverage.includes("2.2.2"));
    expect(calculation).toHaveLength(21);
    expect(calculation.every(q => q.coverage.length > 1)).toBe(true);
    expect(items("2.5").filter(q => q.coverage.includes("2.5.4")).every(q => q.coverage.length > 1)).toBe(true);
  });
  it("checks additional parallel numerical keys independently of the stored correct option", () => {
    const cases: [string, string, number][] = [
      ["1.5", "lab-15", (40 - 32) / (9 - 5)], ["1.5", "verification-10", 18 / 3], ["1.5", "verification-14", 24 / 4],
      ["2.1", "lab-14", 8 + 17], ["2.1", "lab-22", 7 + 13], ["2.1", "verification-12", 4 + 9 + 12],
      ["2.2", "lab-11", -6 / 4], ["2.2", "lab-12", 4 / 8], ["2.2", "lab-13", 10 / -5],
      ["2.2", "lab-23", -15 / 5], ["2.2", "lab-24", 10 / 4], ["2.2", "lab-25", -3 / 6],
      ["2.2", "verification-9", -9 / 3], ["2.2", "verification-11", 14 / 7], ["2.2", "verification-13", 15 / 5],
      ["2.2", "verification-14", -4 / -8]
    ];
    for (const [topic, suffix, expected] of cases) {
      const q = items(topic).find(q => q.id === `ec9708-${topic}-${suffix}-v1`)!;
      const value = q.correct.replaceAll("−", "-").replace(/[$+]/g, "").match(/-?\d+(?:\.\d+)?/)?.[0];
      expect(Number(value), q.id).toBe(expected);
    }
  });
});
