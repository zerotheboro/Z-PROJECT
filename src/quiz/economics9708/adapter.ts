import { economicsPacks, packProblems } from "./packs";
import { economicsContentId } from "./selection";
import { economicsTopic } from "./syllabus";
import type { MultipleChoiceQuestion } from "../methodEngineTypes";
import type { MethodContentSet } from "../methodContentSelector";
import type { TrainingMethodId } from "../type";
import type { TopicPack } from "./types";
import { economicsFormats } from "./formats";
import { isTrainingMethodId } from "../type";
import { mapMethodLearningContent } from "./methodContentMapping";
import { mapTopicLearningContent } from "./objectives";
import { compileMappedEconomics } from "./runtime";
import type { MappedRuntime } from "./runtime";

export type EconomicsTemplate = { title: string; questions?: readonly MultipleChoiceQuestion[]; practice?: readonly MultipleChoiceQuestion[]; test?: readonly MultipleChoiceQuestion[]; runtime?: MappedRuntime };

// Existing engines keep their own stages, question counts, timers and scoring.
// Extra fields let one original lesson serve their different study strategies.
function adapt<Data extends EconomicsTemplate>(base: Data, pack: TopicPack, phase: "lab" | "match", method: TrainingMethodId, offset = 0) {
  const topic = economicsTopic(pack.topicId)!;
  const pool = phase === "lab" ? pack.lab : pack.verification;
  const [questionCount, practiceCount, testCount] = economicsFormats[method][phase];
  const take = (start: number, count: number) => {
    if (offset + start + count > pool.length) throw new Error("Economics question pool is too short for this method.");
    return pool.slice(offset + start, offset + start + count);
  };
  const lesson = pack.notes.join("\n\n");
  const locations = ["Door", "Desk", "Window", "Bookshelf", "Chair", "Lamp", "Rug", "Noticeboard"];
  const video = pack.video!;
  return { ...base,
    title: base.title, topic: `${pack.topicId} ${topic.title}`,
    facts: pack.notes, explanation: lesson, content: lesson, material: lesson,
    questions: take(0, questionCount),
    practice: take(0, practiceCount), test: take(practiceCount, testCount),
    instructions: [
      { type: "concept", name: "Economic concepts", rule: pack.notes.slice(0, Math.ceil(pack.notes.length / 2)).join("\n"), example: pack.scenario },
      { type: "application", name: "Apply and explain", rule: pack.notes.slice(Math.ceil(pack.notes.length / 2)).join("\n"), example: pack.scenario }
    ],
    locations: locations.slice(0, pack.notes.length), pairings: pack.notes.map((item, i) => ({ location: locations[i], item })),
    items: pack.notes, orderedItems: pack.notes,
    cards: pack.notes.map((back, i) => ({ id: `${pack.topicId}-card-${i + 1}`, front: `Explain syllabus point ${pack.topicId}.${i + 1}`, back })),
    sections: pack.notes.map((content, i) => ({ heading: `${pack.topicId}.${i + 1} — ${topic.points[i]}`, content })),
    guidingQuestion: `How can ${topic.title.toLowerCase()} explain the situation below?`,
    relationships: pack.notes, details: pack.notes, coreConcepts: pack.notes.slice(0, 2),
    overview: `${pack.scenario}\n\n${lesson}`, referenceSteps: pack.steps, prompt: `Explain this economic situation from first principles: ${pack.scenario}`,
    source: lesson, basicPrinciples: pack.notes, vagueProblem: "The economic situation needs a clearer explanation.",
    context: `${pack.scenario}\n\n${lesson}`, task: `Study ${topic.title.toLowerCase()} before taking your chosen break.`,
    youtubeId: video.youtubeId, videoTitle: video.title, channel: video.channel,
    reading: pack.notes, focusPoints: pack.terms
  };
}

export function withEconomics<Data extends EconomicsTemplate>(method: TrainingMethodId, phase: "lab" | "match", general: readonly MethodContentSet<Data>[]) {
  return [...general, ...economicsPacks.filter(pack => !packProblems(pack).length).map(pack => ({
    id: economicsContentId(pack.topicId, `${phase}-${method}`), data: adapt(general[0].data, pack, phase, method)
  }))];
}
// Resolve an allocated form lazily: no topic × method × form content copies.
export function getTrainingContentSet<Data extends EconomicsTemplate>(sets: readonly MethodContentSet<Data>[], id: string): MethodContentSet<Data> {
  const mapped = /^(ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(lab|match)-([a-z0-9-]+?))-mapped1(-q[1-9]\d*)?$/.exec(id);
  if (mapped) {
    const pack = economicsPacks.find(p => p.topicId === `${mapped[2]}.${mapped[3]}`);
    if (!pack || !isTrainingMethodId(mapped[5])) throw new Error("Unknown mapped Economics content.");
    const old = getTrainingContentSet(sets, mapped[1] + (mapped[6] ?? ""));
    return { id, data: compileMappedEconomics(old.data, pack, mapped[5], mapped[4] === "lab" ? "lab" : "match",
      { questions: old.data.questions ?? [], practice: old.data.practice ?? [], test: old.data.test ?? [] }, id) };
  }
  const exact = sets.find(set => set.id === id);
  if (exact) return exact;
  const form = /^(ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(lab|match)-([a-z0-9-]+))-q([1-9]\d*)$/.exec(id);
  const canonical = form && sets.find(set => set.id === form[1]);
  const pack = form && economicsPacks.find(p => p.topicId === `${form[2]}.${form[3]}`);
  const offset = form ? Number(form[6]) : NaN;
  if (!form || !canonical || !pack || !isTrainingMethodId(form[5]) || !Number.isSafeInteger(offset) || offset >= (form[4] === "lab" ? pack.lab.length : pack.verification.length)) throw new Error(`Unknown Training content set: ${id}`);
  return { id, data: adapt(sets[0].data, pack, form[4] === "lab" ? "lab" : "match", form[5], offset) };
}
function baselineNotes(pack: TopicPack, questions: readonly { coverage: readonly string[] }[]): readonly string[] {
  const sampled = new Set(questions.flatMap(q => q.coverage));
  return pack.notes.filter((_, index) => sampled.has(`${pack.topicId}.${index + 1}`));
}
// Assessment/evidence callers can resolve stable identities without adding
// objective claims to the current immutable completion/evidence schemas.
export function getEconomicsObjectiveMapping(topicId: string) {
  const pack = economicsPacks.find(p => p.topicId === topicId);
  if (!pack || packProblems(pack).length) throw new Error("Economics topic is not ready for objective mapping.");
  return mapTopicLearningContent(pack);
}
// Resolve on demand, avoiding a full-history/objective copy in every engine.
// Existing v1 rendering/scoring remains unchanged; new mapping consumers must
// explicitly require a supported result before using the selected materials.
export function getEconomicsMethodLearningContent<Data extends EconomicsTemplate>(sets: readonly MethodContentSet<Data>[], id: string) {
  id = id.replace(/-mapped1(?=-q[1-9]\d*$|$)/, "");
  const match = /^ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(lab|match)-([a-z0-9-]+)(?:-q[1-9]\d*)?$/.exec(id);
  // Method IDs contain hyphens; remove the optional form offset before checking.
  const method = match?.[4].replace(/-q[1-9]\d*$/, "");
  const pack = match && economicsPacks.find(p => p.topicId === `${match[1]}.${match[2]}`);
  if (!match || !pack || !isTrainingMethodId(method)) throw new Error("Unknown Economics method content identity.");
  const { data } = getTrainingContentSet(sets, id);
  return mapMethodLearningContent(pack, method, match[3] === "lab" ? "lab" : "match", {
    questions: data.questions ?? [], practice: data.practice ?? [], test: data.test ?? []
  });
}
export const economicsMemoryContentSets = economicsPacks.filter(pack => !packProblems(pack).length).map(pack => ({
  id: economicsContentId(pack.topicId, "memory"), title: `${pack.topicId} ${economicsTopic(pack.topicId)!.title}`,
  studyTime: 60, facts: baselineNotes(pack, pack.baselineMemory), questions: pack.baselineMemory
}));
export const economicsUnderstandingContentSets = economicsPacks.filter(pack => !packProblems(pack).length).map(pack => ({
  id: economicsContentId(pack.topicId, "understanding"), title: `${pack.topicId} ${economicsTopic(pack.topicId)!.title}`,
  studyTime: 60, explanation: baselineNotes(pack, pack.baselineUnderstanding).join("\n\n"), questions: pack.baselineUnderstanding
}));
