import type { MultipleChoiceQuestion } from "../../methodEngineTypes";
import { requireEconomicsPack } from "../packs";

export type AcademicStatus = "draft" | "reviewed" | "unavailable";
export type PilotTopic = "1.5" | "2.2";
export type PilotFormName = "A" | "B" | "C";
export const PILOT_VERSION = "ec-progress-draft-1" as const;
export type PilotItem = Readonly<{
  question: MultipleChoiceQuestion;
  status: AcademicStatus;
  sourceQuestionId: string | null;
  sourceVersion: "2026-v2-pilot-1" | typeof PILOT_VERSION;
  reasoning: string;
  distractorRationale: readonly string[];
}>;
export type PilotForm = Readonly<{
  id: string; version: typeof PILOT_VERSION; topicId: PilotTopic; objectiveId: string;
  concept: string; name: PilotFormName; stage: "initial" | "subsequent" | "delayed";
  status: AcademicStatus; equivalence: "not-reviewed"; items: readonly PilotItem[];
}>;

// Existing items are approved for ordinary Training, NOT independently reviewed
// as parallel measurement forms. All measurement statuses therefore stay draft.
function existing(topic: PilotTopic, suffix: string, id: string, reasoning: string, distractorRationale: string[]): PilotItem {
  const p = requireEconomicsPack(topic);
  const q = [...p.lab, ...p.verification].find(q => q.id === `ec9708-${topic}-${suffix}-v1`);
  if (!q) throw new Error("Pilot candidate source is unavailable.");
  return Object.freeze({ question: Object.freeze({ ...q, id, options: Object.freeze([...q.options]) }),
    status: "draft", sourceQuestionId: q.id, sourceVersion: p.version, reasoning,
    distractorRationale: Object.freeze(distractorRationale) });
}
function form(topicId: PilotTopic, name: PilotFormName, items: PilotItem[]): PilotForm {
  return Object.freeze({ id: `${PILOT_VERSION}-${topicId}-${name}`, version: PILOT_VERSION, topicId,
    objectiveId: `ec9708-objective-${topicId === "1.5" ? "1.5.2" : "2.2.7"}`,
    concept: topicId === "1.5" ? "Opportunity cost per additional unit" : "Price, quantity and total expenditure",
    name, stage: name === "A" ? "initial" : name === "B" ? "subsequent" : "delayed",
    status: "draft", equivalence: "not-reviewed", items: Object.freeze(items) });
}
const id = (topic: PilotTopic, name: PilotFormName, n: number) => `ec-progress-${topic}-${name}-${n}-draft1`;
const ppc = (name: PilotFormName, n: number, suffix: string, reasoning: string, errors: string[]) =>
  existing("1.5", suffix, id("1.5", name, n), reasoning, errors);
const expenditure = (name: PilotFormName, n: number, suffix: string, reasoning: string, errors: string[]) =>
  existing("2.2", suffix, id("2.2", name, n), reasoning, errors);

export const PILOT_FORMS: readonly PilotForm[] = Object.freeze([
  form("1.5", "A", [
    ppc("A", 1, "lab-2", "Food forgone = 50−44 = 6; extra machines = 12−10 = 2; cost = 6/2 = 3 food per machine.",
      ["6 is the total food sacrificed, not the cost per machine.", "2 is the extra machine count, not the food cost.", "12 is the final machine output, not a marginal cost."]),
    ppc("A", 2, "verification-2", "20 tonnes of grain forgone / 4 additional vehicles = 5 tonnes per vehicle.",
      ["20 is the total sacrifice.", "4 is the added vehicle count.", "80 multiplies the two changes instead of dividing."])
  ]),
  form("1.5", "B", [
    ppc("B", 1, "lab-9", "Food forgone = 30−24 = 6; extra tools = 13−10 = 3; cost = 6/3 = 2 food per tool.",
      ["6 is the total sacrifice.", "3 counts the additional tools.", "8 has no clear diagnostic derivation from changes of 6 food and 3 tools; academic review should assess this distractor."]),
    ppc("B", 2, "verification-10", "18 bicycles forgone / 3 additional boats = 6 bicycles per boat.",
      ["18 is the total sacrifice.", "3 is the extra boat count.", "54 multiplies changes instead of dividing."])
  ]),
  form("1.5", "C", [
    ppc("C", 1, "lab-15", "Food forgone = 40−32 = 8; extra tools = 9−5 = 4; cost = 8/4 = 2 food per tool.",
      ["8 is the total sacrifice.", "4 is the added tool count.", "10 has no clear diagnostic interpretation; academic review should consider replacing this distractor."]),
    ppc("C", 2, "verification-14", "24 food units forgone / 4 extra vehicles = 6 food units per vehicle.",
      ["24 is the total sacrifice.", "4 counts vehicles rather than opportunity cost.", "96 multiplies changes instead of dividing."])
  ]),
  form("2.2", "A", [
    expenditure("A", 1, "lab-4", "Initial expenditure = 10×100 = $1,000; later expenditure = 12×70 = $840.",
      ["$1,200 holds quantity at 100.", "$1,000 assumes unchanged expenditure.", "$700 holds price at $10."]),
    expenditure("A", 2, "verification-7", "Initial expenditure = 15×40 = $600; later expenditure = 12×60 = $720.",
      ["$480 keeps the original quantity.", "$600 assumes expenditure is unchanged.", "$900 keeps the original price."])
  ]),
  form("2.2", "B", [
    expenditure("B", 1, "lab-19", "Initial expenditure = 8×75 = $600; later expenditure = 10×50 = $500.",
      ["$750 keeps the original quantity.", "$600 assumes unchanged expenditure.", "The reversed $500→$600 puts the two observations in the wrong order."]),
    expenditure("B", 2, "verification-12", "Initial expenditure = 20×30 = $600; later expenditure = 18×40 = $720.",
      ["$540 keeps the original quantity.", "$800 keeps the original price.", "$600 assumes unchanged expenditure."])
  ]),
  form("2.2", "C", [
    expenditure("C", 1, "lab-26", "Initial expenditure = 6×100 = $600; later expenditure = 8×60 = $480.",
      ["$800 keeps the original quantity.", "$360 keeps the original price.", "$600 assumes unchanged expenditure."]),
    Object.freeze({ status: "draft", sourceQuestionId: null, sourceVersion: PILOT_VERSION,
      question: Object.freeze({ id: id("2.2", "C", 2), question: "Price falls from $12 to $10 while sales rise from 50 to 70 units. What happens to total expenditure?",
        options: Object.freeze(["From $600 to $700", "From $600 to $500", "From $600 to $840", "From $600 to $600"]), correct: "From $600 to $700" }),
      reasoning: "Initial expenditure = 12×50 = $600; later expenditure = 10×70 = $700.",
      distractorRationale: Object.freeze(["$500 keeps the original quantity.", "$840 keeps the original price.", "$600 assumes unchanged expenditure."]) })
  ])
]);

/** Structural eligibility for a clearly labelled prototype, NOT academic approval. */
export function isPilotFormUsable(value: PilotForm): boolean {
  return value.version === PILOT_VERSION && ["1.5", "2.2"].includes(value.topicId) &&
    value.objectiveId === `ec9708-objective-${value.topicId === "1.5" ? "1.5.2" : "2.2.7"}` &&
    ["draft", "reviewed"].includes(value.status) && ["A", "B", "C"].includes(value.name) &&
    value.stage === (value.name === "A" ? "initial" : value.name === "B" ? "subsequent" : "delayed") &&
    Array.isArray(value.items) && value.items.length === 2 && new Set(value.items.map(i => i.question.id)).size === 2 &&
    value.items.every((i: PilotItem) => ["draft", "reviewed"].includes(i.status) && (value.status !== "reviewed" || i.status === "reviewed") && Array.isArray(i.question.options) && i.question.options.length === 4 &&
      new Set(i.question.options).size === 4 && i.question.options.filter(o => o === i.question.correct).length === 1);
}
export function pilotForm(topic: string, name: PilotFormName): PilotForm | null {
  const value = PILOT_FORMS.find(f => f.topicId === topic && f.name === name);
  return value && isPilotFormUsable(value) ? value : null;
}
