import { isTrainingMethodId } from "../type";
import type { TrainingMethodId } from "../type";
import { normalizeEvidenceTimestamp } from "../learningEvidence";
import { economicsTopics, syllabusPointIds } from "./syllabus";

export type MaterialPresentation = {
  materialId: string; materialVersion: string; mappingVersion: "ec9708-objectives-1";
  contentSetId: string; methodId: TrainingMethodId; phase: "lab" | "match";
  objectiveIds: string[]; presentedAt: string;
};
export type MaterialPresentations = { schemaVersion: 1; kind: "client-rendered"; records: MaterialPresentation[] };
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const only = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && Object.keys(v).every(k => keys.includes(k));
export function assertMaterialPresentations(value: unknown): asserts value is MaterialPresentations {
  if (!object(value) || !only(value, ["schemaVersion", "kind", "records"]) || value.schemaVersion !== 1 || value.kind !== "client-rendered" ||
    !Array.isArray(value.records) || value.records.length > 96 || new TextEncoder().encode(JSON.stringify(value)).length > 32 * 1024) throw new Error("Invalid material presentation record.");
  const seen = new Set<string>();
  for (const r of value.records) {
    if (!object(r) || !only(r, ["materialId", "materialVersion", "mappingVersion", "contentSetId", "methodId", "phase", "objectiveIds", "presentedAt"]) ||
      typeof r.materialId !== "string" || r.materialId.length > 160 || !/^ec9708-(?:objective-\d+\.\d+\.\d+:(?:note|cue)|\d+\.\d+:(?:term-[1-9]\d*|step-[1-9]\d*|scenario))$/.test(r.materialId) ||
      (r.materialVersion !== "2026-v2-pilot-1" && r.materialVersion !== "mapped-1") || r.mappingVersion !== "ec9708-objectives-1" || !isTrainingMethodId(r.methodId) ||
      (r.phase !== "lab" && r.phase !== "match") || typeof r.contentSetId !== "string" || r.contentSetId.length > 160 ||
      !new RegExp(`^ec9708-\\d+_\\d+-2026-v2-pilot-1-${r.phase}-${r.methodId}-mapped1(?:-q[1-9]\\d*)?$`).test(r.contentSetId) ||
      !Array.isArray(r.objectiveIds) || r.objectiveIds.length > 8 || new Set(r.objectiveIds).size !== r.objectiveIds.length ||
      r.objectiveIds.some(id => typeof id !== "string" || !/^ec9708-objective-\d+\.\d+\.\d+$/.test(id)) ||
      typeof r.presentedAt !== "string" || normalizeEvidenceTimestamp(r.presentedAt) !== r.presentedAt) throw new Error("Invalid material presentation identity.");
    const topic = /^ec9708-(\d+)_(\d+)-/.exec(r.contentSetId)!;
    const prefix = `${topic[1]}.${topic[2]}`;
    const knownTopic = economicsTopics.slice(0, 9).find(t => t.id === prefix);
    if (!knownTopic) throw new Error("Unknown material topic.");
    if (!r.materialId.startsWith(`ec9708-objective-${prefix}.`) && !r.materialId.startsWith(`ec9708-${prefix}:`) ||
      r.objectiveIds.some(id => !id.startsWith(`ec9708-objective-${prefix}.`))) throw new Error("Mixed material topics.");
    const note = /^ec9708-objective-(.+):(note|cue)$/.exec(r.materialId);
    if (note ? !syllabusPointIds(knownTopic.id).includes(note[1]) || r.objectiveIds.length !== 1 || r.objectiveIds[0] !== `ec9708-objective-${note[1]}` : r.objectiveIds.length !== 0)
      throw new Error("Invalid material/objective membership.");
    if (r.materialVersion !== (note?.[2] === "cue" ? "mapped-1" : "2026-v2-pilot-1") || note?.[2] === "cue" && r.methodId !== "memory-palace") throw new Error("Invalid material version/procedure.");
    const key = `${r.contentSetId}:${r.materialId}`;
    if (seen.has(key)) throw new Error("Duplicate material presentation.");
    seen.add(key);
  }
}
export function collectMaterialPresentations(draft: { internalState: Record<string, { named: Record<string, unknown> }> }): MaterialPresentations | undefined {
  const records = Object.values(draft.internalState).flatMap(scope => Object.values(scope.named["material-presentations"] ?? {}));
  if (!records.length) return undefined;
  const result = { schemaVersion: 1, kind: "client-rendered", records };
  assertMaterialPresentations(result);
  return result;
}
