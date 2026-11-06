import type { MultipleChoiceQuestion } from "../methodEngineTypes";
import type { EconomicsTopicId } from "./syllabus";

export type EconomicsDiagramData = {
  kind: "ppc" | "market" | "surplus";
  label: string;
  variant?: "straight" | "bowed" | "demand-shift" | "supply-shift";
};
export type EconomicsQuestion = MultipleChoiceQuestion & { coverage: readonly string[] };
export type QuestionSeed = readonly [string, string, string, string, string, readonly number[], EconomicsDiagramData?];
export type TopicPack = {
  topicId: EconomicsTopicId;
  version: "2026-v2-pilot-1";
  notes: readonly string[]; // One original teaching note for every numbered syllabus subpoint.
  terms: readonly string[];
  scenario: string;
  steps: readonly string[];
  baselineMemory: readonly EconomicsQuestion[];
  baselineUnderstanding: readonly EconomicsQuestion[];
  lab: readonly EconomicsQuestion[];
  verification: readonly EconomicsQuestion[];
  video: { youtubeId: string; title: string; channel: string; source: string } | null;
};

export function questions(topic: EconomicsTopicId, phase: string, seeds: readonly QuestionSeed[], start = 0): EconomicsQuestion[] {
  return seeds.map(([question, correct, a, b, c, points, diagram], i) => ({
    id: `ec9708-${topic}-${phase}-${i + start + 1}-v1`, question, correct, options: [correct, a, b, c],
    coverage: points.map(n => `${topic}.${n}`), ...(diagram ? { diagram } : {})
  }));
}
export function pack(topicId: EconomicsTopicId, notes: readonly string[], terms: readonly string[], scenario: string,
  steps: readonly string[], memory: readonly QuestionSeed[], understanding: readonly QuestionSeed[],
  lab: readonly QuestionSeed[], verification: readonly QuestionSeed[], video: TopicPack["video"] = null): TopicPack {
  return { topicId, version: "2026-v2-pilot-1", notes, terms, scenario, steps,
    baselineMemory: questions(topicId, "memory", memory), baselineUnderstanding: questions(topicId, "understanding", understanding),
    lab: questions(topicId, "lab", lab), verification: questions(topicId, "verification", verification), video };
}
