import { isTrainingMethodId } from "../type";
import type { ObservationMetadata } from "../learningEvidence";
import { economicsTopic } from "./syllabus";
import { ECONOMICS_VERSION } from "./version";

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
/** Read-only legacy context. Does not load question banks, promote snapshots to
 * native evidence, repair contradictory metadata or infer missing old context. */
export function recordedEconomicsMetadata(value: unknown): ObservationMetadata[] {
  if (!Array.isArray(value)) return [];
  const result: ObservationMetadata[] = [];
  let topicId: string | null = null;
  const identities = new Set<string>();
  for (const row of value) {
    if (!object(row) || !isTrainingMethodId(row.methodId) || (row.phase !== "lab" && row.phase !== "match") ||
      !object(row.context) || typeof row.context.exerciseTopic !== "string") continue;
    const c = row.context;
    const match = /^ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(lab|match)-([a-z0-9-]+?)(?:-mapped1)?(?:-q([1-9]\d*))?$/.exec(row.context.exerciseTopic);
    if (!match || match[3] !== row.phase || match[4] !== row.methodId) continue;
    if (match[5] && (!Number.isSafeInteger(Number(match[5])) || Number(match[5]) >= (row.phase === "lab" ? 26 : 15))) continue;
    const topic = economicsTopic(`${match[1]}.${match[2]}`);
    if (!topic) continue;
    const expected = { subject: "Economics 9708 AS", topic: `${topic.id} ${topic.title}`, exerciseTopic: row.context.exerciseTopic,
      contentSetId: `ec9708-${match[1]}_${match[2]}-${ECONOMICS_VERSION}-${row.phase === "lab" ? "lab" : "verification"}-pool`, contentVersion: ECONOMICS_VERSION };
    if (Object.entries(expected).some(([key, v]) => c[key] !== v)) continue;
    // A new pilot session has exactly one topic. Contradictory legacy context
    // remains unknown rather than choosing an input-order-dependent label.
    const key = `${row.phase}:${row.methodId}`;
    if (topicId !== null && topicId !== topic.id) return [];
    if (identities.has(key)) return [];
    topicId = topic.id; identities.add(key);
    result.push({ methodId: row.methodId, phase: row.phase, context: expected });
  }
  return result;
}
