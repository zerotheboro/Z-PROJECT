import { METHOD_POOL } from "../../../methodPool.js";
import { TRAINING_METHOD_IDS } from "../type";
import type { TrainingMethodId } from "../type";
import { economicsMethodGap, mapMethodLearningContent, requireSupportedLearningContent, reviewedMethodNames } from "./methodContentMapping";
import type { MethodContentForm } from "./methodContentMapping";
import type { TopicPack } from "./types";
import { mnemonicCues } from "./mnemonicCues";

export const ECONOMICS_ACTIVITY_VERSION = "mapped-1" as const;
export type EconomicsActivityVersion = typeof ECONOMICS_ACTIVITY_VERSION;
export function supportedEconomicsMethods(): TrainingMethodId[] {
  return TRAINING_METHOD_IDS.filter(id => !economicsMethodGap(id));
}
export function requireEconomicsMethods(methods: readonly TrainingMethodId[]): void {
  for (const method of methods) if (economicsMethodGap(method)) throw new Error(`This Economics activity is not supported: ${method}. Choose another method; no allowance was reserved.`);
}
export const economicsMethodInventory = METHOD_POOL.map(method => {
  const id = TRAINING_METHOD_IDS.find(id => reviewedMethodNames[id] === method.name) ?? null;
  const outOfScope = ["Pomodoro Technique", "Spaced Learning", "Post-Learning Rest"].includes(method.name);
  return { name: method.name, methodId: id,
    status: id ? economicsMethodGap(id) ? "unsupported" as const : "supported" as const : outOfScope ? "out-of-scope" as const : "non-trainable" as const,
    reason: id ? economicsMethodGap(id) : outOfScope ? "Requires a separate time/scheduling protocol; no existing topic Lab." : "No existing Training engine; not automatically made trainable." };
});
export type RuntimeMaterial = { id: string; version: string; objectiveIds: string[]; text: string };
export type MappedRuntime = {
  version: EconomicsActivityVersion; mappingVersion: string; contentSetId: string;
  sourceVersion: string; methodId: TrainingMethodId; phase: "lab" | "match";
  materials: RuntimeMaterial[]; howTo: readonly string[];
};

export function compileMappedEconomics<Data extends { title: string }>(base: Data, pack: TopicPack, method: TrainingMethodId,
  phase: "lab" | "match", form: MethodContentForm, contentSetId: string) {
  const plan = requireSupportedLearningContent(mapMethodLearningContent(pack, method, phase, form));
  const selected = new Set([...plan.primaryObjectiveIds, ...plan.supportingObjectiveIds]);
  const assessed = new Set(plan.assessment.flatMap(q => q.objectiveIds));
  const objectives = plan.topic.objectives.filter(o => selected.has(o.id) && assessed.has(o.id));
  if (!objectives.length) throw new Error("No assessed topic material for this activity.");
  const cues = mnemonicCues[pack.topicId];
  if (method === "memory-palace" && (!cues || cues.length !== plan.topic.objectives.length)) throw new Error("No reviewed memory cues for this topic.");
  const notes = objectives.map(o => o.material), lesson = notes.join("\n\n");
  const locations = ["Door", "Desk", "Window", "Bookshelf", "Chair", "Lamp", "Rug", "Noticeboard"].slice(0, objectives.length);
  const materials: RuntimeMaterial[] = objectives.map(o => ({ id: `${o.id}:note`, version: pack.version, objectiveIds: [o.id], text: o.material }));
  if (method === "memory-palace") objectives.forEach(o => materials.push({ id: `${o.id}:cue`, version: ECONOMICS_ACTIVITY_VERSION, objectiveIds: [o.id], text: cues![o.noteIndex] }));
  if (method === "abbreviation") pack.terms.forEach((text, i) => materials.push({ id: `ec9708-${pack.topicId}:term-${i + 1}`, version: pack.version, objectiveIds: [], text }));
  if (method === "divide-steps") pack.steps.forEach((text, i) => materials.push({ id: `ec9708-${pack.topicId}:step-${i + 1}`, version: pack.version, objectiveIds: [], text }));
  if (["prime-question", "kidlin-rule", "capture-create"].includes(method)) materials.push({ id: `ec9708-${pack.topicId}:scenario`, version: pack.version, objectiveIds: [], text: pack.scenario });
  const runtime: MappedRuntime = { version: ECONOMICS_ACTIVITY_VERSION, mappingVersion: plan.topic.mappingVersion,
    sourceVersion: pack.version, contentSetId, methodId: method, phase, materials,
    howTo: plan.procedure.reviewedHow ?? plan.procedure.trainingHow };
  return { ...base, facts: notes, explanation: lesson, content: lesson, material: lesson,
    locations, pairings: objectives.map((o, i) => ({ location: locations[i], item: cues?.[o.noteIndex] ?? o.label, meaning: o.material })),
    items: method === "abbreviation" ? [...pack.terms] : notes, orderedItems: notes,
    cards: objectives.map(o => ({ id: o.id, front: o.label, back: o.material })),
    sections: objectives.map(o => ({ heading: o.label, content: o.material })),
    relationships: notes, details: notes, coreConcepts: [], overview: `${pack.scenario}\n\n${lesson}`,
    referenceSteps: pack.steps, source: lesson, basicPrinciples: notes, context: `${pack.scenario}\n\n${lesson}`,
    runtime };
}
