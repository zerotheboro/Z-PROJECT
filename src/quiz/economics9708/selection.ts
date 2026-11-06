import { requireEconomicsPack } from "./packs";
import type { TopicPack } from "./types";
import { economicsTopic } from "./syllabus";
import { ECONOMICS_ACTIVITY_VERSION } from "./runtime";
import type { EconomicsActivityVersion } from "./runtime";

import { ECONOMICS_VERSION } from "./version";
export { ECONOMICS_VERSION } from "./version";
export function economicsContentId(topicId: string, stage: string): string {
  return `ec9708-${topicId.replace(".", "_")}-${ECONOMICS_VERSION}-${stage}`;
}
export function isEconomicsContentId(id: string): boolean { return id.startsWith("ec9708-"); }

// Use the existing versioned draft's internal metadata map; no new root field
// or change to old draft/Firestore schemas. Validation rejects unknown versions.
export function economicsSelection(topicId: string, activityVersion?: EconomicsActivityVersion) {
  const pack = requireEconomicsPack(topicId);
  return { slots: [], named: { economics9708: { topicId: pack.topicId, version: pack.version, ...(activityVersion ? { activityVersion } : {}) } } };
}
export function readEconomicsSelection(state: Record<string, unknown>): TopicPack | null {
  if (!Object.hasOwn(state, "curriculum")) return null;
  const value = state.curriculum;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved curriculum.");
  const scope = value as Record<string, unknown>;
  if (Object.keys(scope).length !== 2 || !Array.isArray(scope.slots) || scope.slots.length || !scope.named || typeof scope.named !== "object" || Array.isArray(scope.named)) throw new Error("Invalid saved curriculum.");
  const named = scope.named as Record<string, unknown>;
  const selection = named.economics9708;
  if (Object.keys(named).length !== 1 || !selection || typeof selection !== "object" || Array.isArray(selection)) throw new Error("Invalid saved curriculum.");
  const selected = selection as Record<string, unknown>;
  if (Object.keys(selected).some(key => !["topicId", "version", "activityVersion"].includes(key)) ||
    selected.version !== ECONOMICS_VERSION || typeof selected.topicId !== "string" ||
    Object.hasOwn(selected, "activityVersion") && selected.activityVersion !== ECONOMICS_ACTIVITY_VERSION) throw new Error("Unsupported saved Economics content version.");
  return requireEconomicsPack(selected.topicId);
}
export function readEconomicsActivityVersion(state: Record<string, unknown>): EconomicsActivityVersion | undefined {
  if (!readEconomicsSelection(state)) return undefined;
  const scope = state.curriculum as { named: { economics9708: { activityVersion?: EconomicsActivityVersion } } };
  return scope.named.economics9708.activityVersion;
}
export function economicsMetadata(id: string | null | undefined) {
  if (!id || !isEconomicsContentId(id)) return null;
  const match = /^ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(.+)$/.exec(id);
  if (!match) throw new Error("Unknown Economics content identity.");
  const pack = requireEconomicsPack(`${match[1]}.${match[2]}`);
  const phase = match[3].startsWith("lab-") ? "lab" : match[3].startsWith("match-") ? "verification" : match[3];
  return { subject: "Economics 9708 AS", topic: `${pack.topicId} ${economicsTopic(pack.topicId)!.title}`,
    // Reused lesson/question pools retain one cross-method exposure identity.
    exerciseTopic: id, contentSetId: economicsContentId(pack.topicId, `${phase}-pool`), contentVersion: pack.version };
}
