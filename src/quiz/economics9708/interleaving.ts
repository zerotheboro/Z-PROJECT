import { economicsPacks } from "./packs";
import type { EconomicsQuestion, TopicPack } from "./types";
import type { ComparisonEngineData } from "../methodEngineTypes";

type Group = { name: string; points: readonly number[] };
// Groups reference the existing syllabus notes and question coverage. They add
// no questions, answer keys, difficulty equivalence or new scoring procedure.
const groups: Record<string, readonly Group[]> = {
  "1.3": [{ name: "Specialisation", points: [4] }, { name: "Enterprise and risk", points: [5] }, { name: "Resources and rewards", points: [1, 2, 3] }],
  "1.4": [{ name: "Allocation decisions", points: [1] }, { name: "Prices and planning", points: [2] }],
  "1.5": [{ name: "Opportunity cost", points: [2] }, { name: "Capacity and utilisation", points: [3, 4] }, { name: "PPC boundaries", points: [1] }],
  "1.6": [{ name: "Public goods", points: [2] }, { name: "Merit and demerit goods", points: [3, 4] }, { name: "Free and private goods", points: [1] }],
  "2.1": [{ name: "Demand changes", points: [3, 5] }, { name: "Supply changes", points: [4, 6] }, { name: "Own-price movements", points: [7] }, { name: "Effective and market demand", points: [1, 2] }],
  "2.2": [{ name: "Expenditure", points: [7] }, { name: "Determinants and applications", points: [6, 8] }, { name: "PED, YED and XED coefficients", points: [1, 2, 3, 4, 5] }],
  "2.3": [{ name: "Capacity, stocks and adjustment time", points: [4, 5] }, { name: "PES coefficients and interpretation", points: [1, 2, 3] }],
  "2.4": [{ name: "Market changes", points: [2] }, { name: "Linked markets", points: [3] }, { name: "Price functions", points: [4] }, { name: "Equilibrium", points: [1] }],
  "2.5": [{ name: "Surplus changes and calculations", points: [3] }, { name: "Elasticity and surplus", points: [4] }, { name: "Consumer and producer surplus", points: [1, 2] }]
};
export function interleavingGroup(pack: TopicPack, q: EconomicsQuestion): string {
  const group = groups[pack.topicId]?.find(g => g.points.some(n => q.coverage.includes(`${pack.topicId}.${n}`)));
  if (!group) throw new Error("No reviewed mixed-practice group for this question.");
  // Numerical calculation and diagram interpretation are different approaches
  // even when they assess the same syllabus objective. Do not relabel a string
  // of unrelated notes as mixed practice.
  const calculation = /\d/.test(q.question) && /^(?:[+$−–\-]?\d|From \$|It (?:falls|rises|remains))/.test(q.correct);
  return `${group.name}${q.diagram ? " · diagram interpretation" : calculation ? " · calculation" : " · explanation and application"}`;
}
export function mixedPracticeGap(pack: TopicPack, practice: readonly EconomicsQuestion[]): string | null {
  try { return practice.length >= 4 && new Set(practice.map(q => interleavingGroup(pack, q))).size >= 2 ? null : "This question set needs at least two compatible problem types for mixed practice."; }
  catch { return "The mixed-practice material is not available for this topic."; }
}
// The allocator can place this method at different offsets. Check every possible
// assigned practice window before offering it, so starting cannot consume quota
// and then discover an unsupported form. Lab and Match pools stay separate.
export function interleavingEligibilityGap(topicId?: string): string | null {
  const packs = topicId ? economicsPacks.filter(p => p.topicId === topicId) : economicsPacks;
  if (!packs.length) return "This Economics topic has no mixed-practice material.";
  for (const pack of packs) for (const phase of ["lab", "match"] as const) {
    const pool = phase === "lab" ? pack.lab : pack.verification, practiceCount = phase === "lab" ? 6 : 4, total = practiceCount + 4;
    for (let offset = 0; offset + total <= pool.length; offset++)
      if (mixedPracticeGap(pack, pool.slice(offset, offset + practiceCount))) return "Some assigned questions still need compatible mixed-practice grouping.";
  }
  return null;
}
export function buildInterleaving(pack: TopicPack, practice: readonly EconomicsQuestion[], test: readonly EconomicsQuestion[]): Pick<ComparisonEngineData, "practice" | "test" | "instructions"> {
  const gap = mixedPracticeGap(pack, practice); if (gap) throw new Error(gap);
  const buckets = new Map<string, EconomicsQuestion[]>();
  for (const q of practice) { const key = interleavingGroup(pack, q); buckets.set(key, [...(buckets.get(key) ?? []), q]); }
  const mixed: EconomicsQuestion[] = [];
  while (mixed.length < practice.length) for (const bucket of buckets.values()) { const q = bucket.shift(); if (q) mixed.push(q); }
  return { practice: mixed, test: [...test], instructions: [...new Set(practice.map(q => interleavingGroup(pack, q)))].map(type => {
    const example = practice.find(q => interleavingGroup(pack, q) === type)!;
    const points = new Set(example.coverage);
    return { type, name: type, rule: pack.notes.filter((_, i) => points.has(`${pack.topicId}.${i + 1}`)).join("\n\n"),
      example: `${example.question} ${example.correct}` };
  }) };
}
