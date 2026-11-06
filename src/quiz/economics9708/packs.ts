import { unit1Packs } from "./unit1";
import { unit2Packs } from "./unit2";
import { economicsTopics, syllabusPointIds } from "./syllabus";
import type { TopicPack } from "./types";
import { questions } from "./types";
import { parallelUnit1 } from "./parallelUnit1";
import { parallelUnit2 } from "./parallelUnit2";
import { parallelExtra } from "./parallelExtra";

const parallelItems = { ...parallelUnit1, ...parallelUnit2 };
export const economicsPacks: readonly TopicPack[] = [...unit1Packs, ...unit2Packs].map(pack => {
  const extra = parallelItems[pack.topicId];
  const tail = parallelExtra[pack.topicId];
  return !extra ? pack : { ...pack,
    lab: [...pack.lab, ...questions(pack.topicId, "lab", extra.lab, pack.lab.length), ...questions(pack.topicId, "lab", tail?.lab ?? [], pack.lab.length + extra.lab.length)],
    verification: [...pack.verification, ...questions(pack.topicId, "verification", extra.verification, pack.verification.length), ...questions(pack.topicId, "verification", tail?.verification ?? [], pack.verification.length + extra.verification.length)] };
});
export function packProblems(pack: TopicPack): string[] {
  const problems: string[] = [];
  const points = syllabusPointIds(pack.topicId);
  if (pack.notes.length !== points.length || pack.notes.some(note => !note.trim())) problems.push("Incomplete teaching coverage");
  if (pack.terms.length < 4 || pack.steps.length < 4 || !pack.scenario.trim()) problems.push("Missing method adaptations");
  if (pack.baselineMemory.length !== 4 || pack.baselineUnderstanding.length !== 3 || pack.lab.length < 26 || pack.verification.length < 15) problems.push("Incomplete stage questions");
  const questions = [...pack.baselineMemory, ...pack.baselineUnderstanding, ...pack.lab, ...pack.verification];
  if (new Set(questions.map(q => q.id)).size !== questions.length || new Set(questions.map(q => q.question)).size !== questions.length) problems.push("Repeated stage items");
  for (const q of questions) {
    if (q.options.length !== 4 || new Set(q.options).size !== 4 || q.options.filter(o => o === q.correct).length !== 1 ||
      !q.coverage.length || q.coverage.some(id => !points.includes(id))) problems.push(`Invalid question ${q.id}`);
  }
  if (!pack.video || !/^[\w-]{11}$/.test(pack.video.youtubeId)) problems.push("Missing topic video adaptation");
  return problems;
}
export function requireEconomicsPack(id: string): TopicPack {
  const pack = economicsPacks.find(pack => pack.topicId === id);
  if (!pack || packProblems(pack).length) throw new Error("This Economics topic is not ready for Training. Choose an available topic.");
  return pack;
}
export const economicsCoverageManifest = economicsTopics.map(topic => {
  const pack = economicsPacks.find(pack => pack.topicId === topic.id);
  return {
    ...topic, status: pack && !packProblems(pack).length ? "playable" as const : "planned" as const,
    // Covered = original teaching note exists. Assessment coverage is separate.
    coverage: syllabusPointIds(topic.id).map((id, i) => ({ id, label: topic.points[i], material: pack?.notes[i] ?? null,
      assessedBy: pack ? [...pack.baselineMemory, ...pack.baselineUnderstanding, ...pack.lab, ...pack.verification].filter(q => q.coverage.includes(id)).map(q => q.id) : [] })),
    missing: pack ? packProblems(pack) : ["Teaching material", "Baseline", "Lab adaptations", "Verification", "Video adaptation"]
  };
});
