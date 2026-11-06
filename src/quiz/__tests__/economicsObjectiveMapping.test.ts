import { describe, expect, it } from "vitest";
import { METHOD_POOL } from "../../../methodPool.js";
import { methodIntroductionData } from "../methodIntroductionData";
import { TRAINING_METHOD_IDS } from "../type";
import { economicsPacks } from "../economics9708/packs";
import { economicsTopics, syllabusPointIds } from "../economics9708/syllabus";
import { learningObjectiveId, mapTopicLearningContent } from "../economics9708/objectives";
import { mapMethodLearningContent, requireSupportedLearningContent } from "../economics9708/methodContentMapping";
import { getEconomicsMethodLearningContent, getEconomicsObjectiveMapping, getTrainingContentSet } from "../economics9708/adapter";
import type { EconomicsTemplate } from "../economics9708/adapter";
import { economicsFormats } from "../economics9708/formats";
import { economicsContentId } from "../economics9708/selection";
import { economicsAssignments } from "../economics9708/allocation";
import { economicsObservationMetadata } from "../economics9708/evidenceMetadata";
import { trainingLabContentSets, trainingMatchContentSets } from "../trainingContent";
import { createTrainingDraft } from "../trainingProgress";
import { scoreMultipleChoice } from "../engines/shared/scoring";

const gaps = ["interleaving", "derive-basics", "doodle-effect", "eighty-twenty-rule", "two-x-video-speed"];
const ppc = economicsPacks.find(p => p.topicId === "1.5")!;
const elasticity = economicsPacks.find(p => p.topicId === "2.2")!;
const objective = (point: string) => learningObjectiveId(point);

describe("reviewed topic-level objective source mappings", () => {
  it("maps exactly nine playable topics and all 43 source subpoints without enabling another topic", () => {
    expect(economicsPacks.map(p => p.topicId)).toEqual(economicsTopics.slice(0, 9).map(t => t.id));
    expect(economicsPacks.flatMap(p => mapTopicLearningContent(p).objectives)).toHaveLength(43);
    expect(() => getEconomicsObjectiveMapping("4.3")).toThrow();
    expect(() => getEconomicsObjectiveMapping("uploaded-topic")).toThrow();
  });
  it.each(economicsPacks)("retains every original note and question membership for $topicId", p => {
    const mapping = mapTopicLearningContent(p);
    expect(mapping.contentVersion).toBe(p.version);
    expect(mapping.objectives.map(o => o.syllabusPointId)).toEqual(syllabusPointIds(p.topicId));
    expect(mapping.objectives.map(o => o.material)).toEqual(p.notes);
    const original = [...p.baselineMemory, ...p.baselineUnderstanding, ...p.lab, ...p.verification];
    expect(mapping.questions).toHaveLength(48);
    for (const q of original) {
      const mapped = mapping.questions.find(m => m.questionId === q.id)!;
      expect(mapped.objectiveIds).toEqual(q.coverage.map(objective));
      expect(mapped.hasDiagram).toBe(Boolean(q.diagram));
    }
    for (const o of mapping.objectives) {
      expect(o.diagramQuestionIds).toEqual(original.filter(q => q.coverage.includes(o.syllabusPointId) && q.diagram).map(q => q.id));
      if (o.contentTypes.includes("diagram-interpretation")) expect(o.diagramQuestionIds.length).toBeGreaterThan(0);
    }
  });
  it("distinguishes PPC definitions, opportunity cost, capacity and actual diagram items", () => {
    const mapping = mapTopicLearningContent(ppc);
    expect(mapping.objectives[0]).toMatchObject({ id: objective("1.5.1"), contentTypes: expect.arrayContaining(["recall", "conceptual-explanation"]) });
    expect(mapping.objectives[1]).toMatchObject({ id: objective("1.5.2"), label: expect.stringContaining("opportunity cost"), contentTypes: expect.arrayContaining(["relationship"]) });
    expect(mapping.objectives.some(o => o.contentTypes.includes("diagram-interpretation"))).toBe(true);
    expect(mapping.objectives[2].contentTypes).toContain("causal-explanation");
  });
  it("distinguishes elasticity definitions, calculations, signs, relationships and interpretation", () => {
    const o = mapTopicLearningContent(elasticity).objectives;
    expect(o[0].contentTypes).toContain("recall");
    expect(o[1].contentTypes).toEqual(expect.arrayContaining(["formula", "calculation"]));
    expect(o[2].label).toContain("signs and magnitudes");
    expect(o[4].contentTypes).toContain("relationship");
    expect(o[6].contentTypes).toEqual(expect.arrayContaining(["formula", "calculation", "relationship"]));
    expect(o.every(x => !x.contentTypes.includes("diagram-interpretation"))).toBe(true);
  });
  it("retains identities under item reordering and does not mutate caller-owned content", () => {
    const copy = structuredClone(ppc), before = JSON.stringify(copy);
    const mapping = mapTopicLearningContent(copy);
    expect(JSON.stringify(copy)).toBe(before);
    expect(Object.isFrozen(copy)).toBe(false);
    const reordered = mapTopicLearningContent({ ...copy, lab: [...copy.lab].reverse() });
    expect(reordered.objectives.map(o => o.id)).toEqual(mapping.objectives.map(o => o.id));
    expect(reordered.questions.find(q => q.questionId === copy.lab[0].id)).toEqual(mapping.questions.find(q => q.questionId === copy.lab[0].id));
  });
  it("rejects missing, duplicate, foreign or unsupported-version source identities", () => {
    expect(() => mapTopicLearningContent({ ...ppc, notes: ppc.notes.slice(1) })).toThrow();
    expect(() => mapTopicLearningContent({ ...ppc, lab: [...ppc.lab, ppc.lab[0]] })).toThrow();
    expect(() => mapTopicLearningContent({ ...ppc, lab: [{ ...ppc.lab[0], coverage: ["2.2.1"] }, ...ppc.lab.slice(1)] })).toThrow();
    expect(() => mapTopicLearningContent({ ...ppc, lab: [{ ...ppc.lab[0], coverage: ["1.5.1", "1.5.1"] }, ...ppc.lab.slice(1)] })).toThrow();
    expect(() => mapTopicLearningContent({ ...ppc, version: "future" } as unknown as typeof ppc)).toThrow();
  });
});

describe("canonical method material plans, separate from observed evidence", () => {
  it.each(economicsPacks)("checks all 23 existing methods and both phases in $topicId", p => {
    for (const method of TRAINING_METHOD_IDS) for (const phase of ["lab", "match"] as const) {
      const sets = phase === "lab" ? trainingLabContentSets[method] : trainingMatchContentSets[method];
      const id = economicsContentId(p.topicId, `${phase}-${method}`);
      const plan = getEconomicsMethodLearningContent<EconomicsTemplate>(sets, id);
      expect(plan.coverageStatus).toBe("planned-not-observed");
      expect(plan.procedure.trainingHow).toEqual(methodIntroductionData[method].howTo);
      if (plan.procedure.reviewedName) expect(plan.procedure.reviewedHow).toEqual(METHOD_POOL.find(m => m.name === plan.procedure.reviewedName)!.how_to_use);
      expect(plan.assessment).toHaveLength(economicsFormats[method][phase].reduce((a, b) => a + b, 0));
      if (gaps.includes(method)) {
        expect(plan.status).toBe("unsupported"); expect(plan.reasons.length).toBeGreaterThan(0);
        expect(plan.materials).toEqual([]); expect(plan.primaryObjectiveIds).toEqual([]); expect(plan.supportingObjectiveIds).toEqual([]);
        expect(() => requireSupportedLearningContent(plan)).toThrow(/Unsupported/);
      } else {
        expect(requireSupportedLearningContent(plan).status).toBe("supported");
        const selected = new Set([...plan.primaryObjectiveIds, ...plan.supportingObjectiveIds]);
        expect(selected.size).toBeGreaterThan(0);
        for (const q of plan.assessment) expect(q.objectiveIds.every(o => selected.has(o))).toBe(true);
        for (const m of plan.materials) {
          const source = m.source === "syllabus-note" ? p.notes : m.source === "topic-terms" ? p.terms : m.source === "topic-steps" ? p.steps : [p.scenario];
          expect(m.text.every(t => source.includes(t))).toBe(true);
        }
      }
    }
  });
  it("chooses different aspects within the same topic, retaining support for all assigned questions", () => {
    const id = (method: string) => economicsContentId("2.2", `lab-${method}`);
    const recall = getEconomicsMethodLearningContent(trainingLabContentSets["active-recall"], id("active-recall"));
    const explanation = getEconomicsMethodLearningContent(trainingLabContentSets.feynman, id("feynman"));
    expect(recall.primaryObjectiveIds).toHaveLength(8);
    expect(explanation.primaryObjectiveIds).not.toContain(objective("2.2.2"));
    expect(explanation.supportingObjectiveIds).toContain(objective("2.2.2"));
    expect(explanation.assessment.flatMap(q => q.objectiveIds)).toContain(objective("2.2.2"));
    expect(explanation.primaryObjectiveIds).toContain(objective("2.2.3"));
  });
  it("does not invent term/step membership, priorities or canonical HOW instructions", () => {
    const p = getEconomicsMethodLearningContent(trainingLabContentSets.abbreviation, economicsContentId("1.5", "lab-abbreviation"));
    expect(p.materials.find(m => m.source === "topic-terms")).toEqual({ source: "topic-terms", objectiveIds: [], text: ppc.terms });
    const s = getEconomicsMethodLearningContent(trainingLabContentSets["story-telling"], economicsContentId("1.5", "lab-story-telling"));
    expect(s.materials.find(m => m.source === "topic-steps")?.text).toEqual(ppc.steps);
    expect(s.materials.find(m => m.source === "topic-steps")?.objectiveIds).toEqual([]);
    expect(p.procedure.reviewedHow).not.toBe(METHOD_POOL.find(m => m.name === "Abbreviation")!.how_to_use);
  });
  it("rejects missing media, exhausted material and foreign/duplicate/incorrect-phase forms", () => {
    const form = { questions: ppc.lab.slice(0, 4), practice: [], test: [] };
    const plan = mapMethodLearningContent({ ...ppc, video: null }, "active-recall", "lab", form);
    expect(() => requireSupportedLearningContent(plan)).toThrow(/video/);
    for (const questions of [ppc.lab.slice(0, 3), [ppc.lab[0], ppc.lab[0], ...ppc.lab.slice(2, 4)], ppc.verification.slice(0, 4), elasticity.lab.slice(0, 4)]) {
      expect(() => requireSupportedLearningContent(mapMethodLearningContent(ppc, "active-recall", "lab", { ...form, questions }))).toThrow();
    }
    expect(() => getEconomicsMethodLearningContent(trainingLabContentSets["active-recall"], economicsContentId("1.5", "lab-active-recall") + "-q999")).toThrow();
  });
  it("returns independent plans without mutating the canonical source", () => {
    const p = getEconomicsMethodLearningContent(trainingLabContentSets.feynman, economicsContentId("1.5", "lab-feynman"));
    const original = methodIntroductionData.feynman.howTo[0];
    Object.defineProperty(p.procedure, "trainingHow", { value: ["changed"] });
    expect(methodIntroductionData.feynman.howTo[0]).toBe(original);
    expect(getEconomicsMethodLearningContent(trainingLabContentSets.feynman, economicsContentId("1.5", "lab-feynman")).procedure.trainingHow[0]).toBe(original);
  });
});

describe("frozen forms and existing evidence/scoring preservation", () => {
  it.each(economicsPacks)("keeps disjoint allocated forms, option keys and scoring unchanged for $topicId", p => {
    const methods = ["interleaving", "leitner-system", "memory-palace", "active-recall"] as const;
    const ids = economicsAssignments(methods, "lab", p.topicId);
    const seen = new Set<string>();
    methods.forEach((method, i) => {
      const sets = trainingLabContentSets[method];
      const data = getTrainingContentSet<EconomicsTemplate>(sets, ids[i]).data;
      const mapping = getEconomicsMethodLearningContent<EconomicsTemplate>(sets, ids[i]);
      expect(mapping.assessment.map(q => q.questionId)).toEqual([...(data.questions ?? []), ...(data.practice ?? []), ...(data.test ?? [])].map(q => q.id));
      for (const q of mapping.assessment) { expect(seen.has(q.questionId)).toBe(false); seen.add(q.questionId); }
      const qs = data.test?.length ? data.test : data.questions ?? [];
      expect(scoreMultipleChoice(qs, Object.fromEntries(qs.map(q => [q.id, q.correct])))).toMatchObject({ score: 1, correct: qs.length, total: qs.length });
      expect(JSON.stringify(data)).not.toContain("objectiveIds");
    });
    expect(seen.size).toBe(26);
  });
  it("makes assessment memberships resolvable without changing current evidence fields or claiming studied coverage", () => {
    const id = economicsContentId("1.5", "lab-active-recall");
    const d = createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", economicsTopicId: "1.5", selectedMethods: ["active-recall"] });
    const metadata = economicsObservationMetadata(d, "active-recall", "lab", id)!;
    const mapping = getEconomicsMethodLearningContent(trainingLabContentSets["active-recall"], id);
    expect(metadata.protocol?.questions?.map(q => q.questionId)).toEqual(mapping.assessment.map(q => q.questionId));
    expect(JSON.stringify(metadata)).not.toContain("objectiveIds");
    expect(metadata.context?.contentVersion).toBe("2026-v2-pilot-1");
    expect(metadata.protocol?.scoringVersion).toBeNull();
  });
});
