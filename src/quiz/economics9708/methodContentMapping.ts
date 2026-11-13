import { METHOD_POOL } from "../../../methodPool.js";
import { methodIntroductionData } from "../methodIntroductionData";
import { isTrainingMethodId } from "../type";
import type { TrainingMethodId } from "../type";
import { economicsFormats } from "./formats";
import { packProblems } from "./packs";
import { mapTopicLearningContent } from "./objectives";
import type { LearningContentType, TopicLearningContent } from "./objectives";
import type { TopicPack } from "./types";
import { economicsVideoEligibilityGap, selectEconomicsVideo } from "./videos";
import { interleavingEligibilityGap, mixedPracticeGap } from "./interleaving";

export type MethodContentForm = {
  readonly questions: readonly { readonly id: string }[];
  readonly practice: readonly { readonly id: string }[];
  readonly test: readonly { readonly id: string }[];
};
export type MethodLearningContent = {
  readonly status: "supported" | "unsupported";
  readonly reasons: readonly string[];
  readonly topic: TopicLearningContent;
  readonly methodId: TrainingMethodId;
  readonly phase: "lab" | "match";
  readonly procedure: {
    readonly trainingName: string;
    readonly trainingHow: readonly string[];
    readonly reviewedName: string | null;
    readonly reviewedHow: readonly string[] | null;
  };
  // These are plans/source links, NEVER proof that a learner saw or mastered them.
  readonly coverageStatus: "planned-not-observed";
  readonly primaryObjectiveIds: readonly string[];
  readonly supportingObjectiveIds: readonly string[];
  readonly materials: readonly {
    readonly source: "syllabus-note" | "topic-terms" | "topic-steps" | "topic-scenario";
    readonly objectiveIds: readonly string[];
    readonly text: readonly string[];
  }[];
  readonly assessment: readonly {
    readonly questionId: string;
    readonly role: "questions" | "practice" | "test";
    readonly objectiveIds: readonly string[];
    readonly hasDiagram: boolean;
  }[];
};

// Explicit name reconciliation. Training-only methods retain the registry's
// own HOW; we do not invent an AI-pool counterpart or rewrite either procedure.
export const reviewedMethodNames: Record<TrainingMethodId, string | null> = {
  "active-recall": "Active Recall", feynman: "Feynman Technique", cornell: "Cornell Method",
  interleaving: "Interleaved Practice", "memory-palace": "Memory Palace", "active-blurting": null,
  "one-sentence": "One Sentence", "note-taking-4x4": "Note-taking 4x4", "leitner-system": "Leitner System",
  "story-telling": "Story Telling", "capture-create": null, abbreviation: "Abbreviation",
  "header-first": "Header First", "prime-question": "Prime Question", "doodle-effect": "Doodle Effect",
  "eighty-twenty-rule": "80/20 Rule", "divide-steps": "Divide Steps", "derive-basics": "Derive Basics",
  "kidlin-rule": null, "premack-principle": "Premack's Principle", "ten-minute-wall-stare": "10 Minute Wall Stare",
  "strooper-effect": "Stroop Effect Exercise", "two-x-video-speed": "2X Video Speed", "hundred-second-delay": null
};
const preferredTypes: Partial<Record<TrainingMethodId, readonly LearningContentType[]>> = {
  feynman: ["conceptual-explanation", "causal-explanation", "relationship"],
  "one-sentence": ["conceptual-explanation", "relationship"],
  "memory-palace": ["recall", "conceptual-explanation"],
  "leitner-system": ["recall", "conceptual-explanation", "formula"],
  "capture-create": ["application", "conceptual-explanation"],
  "divide-steps": ["calculation", "causal-explanation", "application"],
  "kidlin-rule": ["application", "causal-explanation"]
};
const knownGaps: Partial<Record<TrainingMethodId, string>> = {
  "derive-basics": "Existing general reasoning steps are not a checked step-by-step derivation.",
  "eighty-twenty-rule": "No reviewed objective priorities or dependency map; the first notes cannot be assumed most important."
};
export function economicsMethodGap(method: TrainingMethodId, topicId?: string): string | null {
  if (method === "two-x-video-speed") return economicsVideoEligibilityGap(topicId);
  if (method === "interleaving") return interleavingEligibilityGap(topicId);
  return knownGaps[method] ?? null;
}

export function mapMethodLearningContent(pack: TopicPack, methodId: TrainingMethodId, phase: "lab" | "match", form: MethodContentForm): MethodLearningContent {
  if (!isTrainingMethodId(methodId) || (phase !== "lab" && phase !== "match")) throw new Error("Unknown method/phase for objective mapping.");
  const topic = mapTopicLearningContent(pack);
  const training = methodIntroductionData[methodId];
  const name = reviewedMethodNames[methodId];
  const reviewed = name === null ? null : METHOD_POOL.find(m => m.name === name);
  if (name !== null && !reviewed) throw new Error("Canonical HOW reference is unavailable.");
  const procedure = { trainingName: training.name, trainingHow: [...training.howTo],
    reviewedName: reviewed?.name ?? null, reviewedHow: reviewed ? [...reviewed.how_to_use] : null };
  const reasons = [...packProblems(pack)];
  const gap = knownGaps[methodId];
  if (gap) reasons.push(gap);
  // Doodling uses free-form scribbling alongside source notes, followed by the
  // independent knowledge check; a listening prerequisite is not a permanent
  // topic ban. Missing/malformed material still fails normal pack/form validation.
  if (methodId === "two-x-video-speed") {
    const video = selectEconomicsVideo(`ec9708-${pack.topicId.replace(".", "_")}-${pack.version}-${phase}-two-x-video-speed-mapped1`, form.questions.map(q => q.id));
    if (video.status === "unavailable") reasons.push(video.reason);
  }
  const questionIndex = new Map(topic.questions.map(q => [q.questionId, q]));
  const seen = new Set<string>();
  const assessment: MethodLearningContent["assessment"][number][] = [];
  const roles = ["questions", "practice", "test"] as const;
  const counts = economicsFormats[methodId][phase];
  for (const [index, role] of roles.entries()) {
    const supplied = form[role];
    if (!Array.isArray(supplied) || supplied.length !== counts[index]) {
      reasons.push(`Invalid ${role} count for the existing method format.`);
      continue;
    }
    for (const suppliedQuestion of supplied) {
      const q = questionIndex.get(suppliedQuestion.id);
      if (!q || q.phase !== (phase === "lab" ? "lab" : "verification") || seen.has(suppliedQuestion.id)) {
        reasons.push("Unknown, repeated or cross-phase question assignment.");
        continue;
      }
      seen.add(q.questionId);
      assessment.push({ questionId: q.questionId, role, objectiveIds: [...q.objectiveIds], hasDiagram: q.hasDiagram });
    }
  }
  const types = preferredTypes[methodId];
  if (methodId === "interleaving" && !reasons.length) {
    const pool = phase === "lab" ? pack.lab : pack.verification;
    const gap = mixedPracticeGap(pack, form.practice.map(q => pool.find(item => item.id === q.id)!));
    if (gap) reasons.push(gap);
  }
  let primary = topic.objectives.filter(o => !types || o.contentTypes.some(t => types.includes(t)));
  if (methodId === "memory-palace" && topic.objectives.length > 8) reasons.push("The existing palace has only eight locations.");
  if (methodId === "abbreviation" && pack.terms.length < 2) reasons.push("No accurate term list for initials.");
  if (methodId === "story-telling" && pack.steps.length < 2) reasons.push("No ordered source steps for a story.");
  if (!primary.length) reasons.push("No suitable objective material for this method.");
  // Topic selection stays whole-topic. The actual assigned item coverage adds
  // supporting material, so a focused plan never hides prerequisites for its test.
  const required = new Set(assessment.flatMap(q => q.objectiveIds));
  if (reasons.length) primary = [];
  const primaryIds = new Set(primary.map(o => o.id));
  const supporting = reasons.length ? [] : topic.objectives.filter(o => required.has(o.id) && !primaryIds.has(o.id));
  const materials: MethodLearningContent["materials"][number][] = [...primary, ...supporting].map(o => ({ source: "syllabus-note", objectiveIds: [o.id], text: [o.material] }));
  if (!reasons.length) {
    // Keep these references topic-scoped. There is no reviewed term-to-objective
    // or step-to-objective correspondence; do not invent one from array positions.
    if (methodId === "abbreviation") materials.push({ source: "topic-terms", objectiveIds: [], text: [...pack.terms] });
    if (methodId === "story-telling" || methodId === "divide-steps") materials.push({ source: "topic-steps", objectiveIds: [], text: [...pack.steps] });
    if (["capture-create", "prime-question", "kidlin-rule"].includes(methodId)) materials.push({ source: "topic-scenario", objectiveIds: [], text: [pack.scenario] });
  }
  return { status: reasons.length ? "unsupported" : "supported", reasons, topic, methodId, phase, procedure,
    coverageStatus: "planned-not-observed", primaryObjectiveIds: [...primaryIds], supportingObjectiveIds: supporting.map(o => o.id), materials, assessment };
}

export function requireSupportedLearningContent(mapping: MethodLearningContent): MethodLearningContent {
  if (mapping.status !== "supported") throw new Error(`Unsupported topic/method content: ${mapping.reasons.join(" ")}`);
  return mapping;
}
