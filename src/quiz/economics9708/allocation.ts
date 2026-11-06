import type { TrainingMethodId } from "../type";
import { economicsContentId } from "./selection";
import { requireEconomicsPack } from "./packs";
import { economicsFormats } from "./formats";
import { requireEconomicsMethods } from "./runtime";
import type { EconomicsActivityVersion } from "./runtime";

export function economicsAssignments(methods: readonly TrainingMethodId[], phase: "lab" | "match", topicId: string, activityVersion?: EconomicsActivityVersion): string[] {
  let offset = 0;
  const pack = requireEconomicsPack(topicId);
  if (activityVersion) requireEconomicsMethods(methods);
  return methods.map(method => {
    const count = economicsFormats[method][phase].reduce((sum, n) => sum + n, 0);
    const id = economicsContentId(topicId, `${phase}-${method}`) + (activityVersion ? "-mapped1" : "") + (offset ? `-q${offset}` : "");
    offset += count;
    if (offset > (phase === "lab" ? pack.lab.length : pack.verification.length)) throw new Error("The Economics item pool cannot support these methods without repeating questions.");
    return id;
  });
}
