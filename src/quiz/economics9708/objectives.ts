import { economicsTopic, syllabusPointIds } from "./syllabus";
import type { EconomicsTopicId } from "./syllabus";
import type { TopicPack } from "./types";

export const OBJECTIVE_MAPPING_VERSION = "ec9708-objectives-1" as const;
export type LearningContentType = "recall" | "conceptual-explanation" | "formula"
  | "calculation" | "diagram-interpretation" | "relationship" | "causal-explanation" | "application";
export type LearningObjective = {
  readonly id: string;
  readonly syllabusPointId: string;
  readonly label: string;
  readonly contentTypes: readonly LearningContentType[];
  readonly material: string;
  readonly noteIndex: number;
  readonly questionIds: readonly string[];
  // Only actual supplied figures qualify; curve-related prose is insufficient.
  readonly diagramQuestionIds: readonly string[];
};
export type TopicLearningContent = {
  readonly mappingVersion: typeof OBJECTIVE_MAPPING_VERSION;
  readonly topicId: EconomicsTopicId;
  readonly contentVersion: TopicPack["version"];
  readonly objectives: readonly LearningObjective[];
  readonly questions: readonly {
    readonly questionId: string;
    readonly phase: "memory" | "understanding" | "lab" | "verification";
    readonly objectiveIds: readonly string[];
    readonly hasDiagram: boolean;
  }[];
};

type Descriptor = readonly [string, ...LearningContentType[]];
// Reviewed annotations of existing notes, not newly generated teaching content.
// Ordering is the syllabus order; IDs do not depend on wording or array sorting.
const descriptors: Partial<Record<EconomicsTopicId, readonly Descriptor[]>> = {
  "1.3": [
    ["Identify the factors of production", "recall", "conceptual-explanation", "application"],
    ["Distinguish human and physical capital", "recall", "conceptual-explanation", "application"],
    ["Associate factors with their rewards", "recall", "relationship"],
    ["Explain division of labour and specialisation", "conceptual-explanation", "causal-explanation", "application"],
    ["Explain entrepreneurship and uncertainty", "conceptual-explanation", "causal-explanation", "application"]
  ],
  "1.4": [
    ["Distinguish allocation decisions in economic systems", "recall", "conceptual-explanation", "application"],
    ["Explain allocation through prices and planning", "conceptual-explanation", "causal-explanation", "application"]
  ],
  "1.5": [
    ["Define and interpret the PPC boundary", "recall", "conceptual-explanation", "diagram-interpretation"],
    ["Explain opportunity cost and PPC shape", "conceptual-explanation", "relationship", "diagram-interpretation", "application"],
    ["Explain changes in productive capacity", "causal-explanation", "diagram-interpretation", "application"],
    ["Distinguish utilisation from capacity", "conceptual-explanation", "diagram-interpretation", "application"]
  ],
  "1.6": [
    ["Distinguish free and private goods", "recall", "conceptual-explanation", "application"],
    ["Explain public-good characteristics", "recall", "conceptual-explanation", "causal-explanation", "application"],
    ["Explain merit-good under-consumption", "conceptual-explanation", "causal-explanation", "application"],
    ["Explain demerit-good over-consumption", "conceptual-explanation", "causal-explanation", "application"]
  ],
  "2.1": [
    ["Define effective demand", "recall", "conceptual-explanation"],
    ["Aggregate individual quantities", "conceptual-explanation", "calculation"],
    ["Explain determinants of demand", "causal-explanation", "application"],
    ["Explain determinants of supply", "causal-explanation", "application"],
    ["Interpret demand shifts", "causal-explanation", "diagram-interpretation", "application"],
    ["Interpret supply shifts", "causal-explanation", "diagram-interpretation", "application"],
    ["Distinguish shifts from movements", "conceptual-explanation", "diagram-interpretation", "application"]
  ],
  "2.2": [
    ["Define PED, YED and XED", "recall", "conceptual-explanation"],
    ["Calculate elasticity with consistent percentage bases", "formula", "calculation", "application"],
    ["Interpret elasticity signs and magnitudes", "conceptual-explanation", "relationship", "application"],
    ["Classify responsiveness", "recall", "conceptual-explanation", "relationship"],
    ["Distinguish slope from elasticity", "conceptual-explanation", "relationship"],
    ["Explain determinants of elasticity", "causal-explanation", "application"],
    ["Relate PED to expenditure", "formula", "calculation", "relationship", "application"],
    ["Apply elasticity estimates with limitations", "conceptual-explanation", "application"]
  ],
  "2.3": [
    ["Define PES", "recall", "conceptual-explanation"],
    ["Calculate PES", "formula", "calculation", "application"],
    ["Interpret PES coefficients", "recall", "conceptual-explanation", "relationship"],
    ["Explain supply responsiveness constraints", "causal-explanation", "application"],
    ["Apply PES to capacity and time", "causal-explanation", "application"]
  ],
  "2.4": [
    ["Explain equilibrium and disequilibrium", "recall", "conceptual-explanation", "causal-explanation"],
    ["Explain adjustment after demand and supply changes", "causal-explanation", "relationship", "application"],
    ["Distinguish linked markets", "recall", "conceptual-explanation", "relationship", "application"],
    ["Explain the functions of prices", "conceptual-explanation", "causal-explanation", "application"]
  ],
  "2.5": [
    ["Define and interpret consumer surplus", "recall", "conceptual-explanation", "diagram-interpretation"],
    ["Define and interpret producer surplus", "recall", "conceptual-explanation", "diagram-interpretation"],
    ["Calculate and explain changes in surplus", "formula", "calculation", "causal-explanation", "application"],
    ["Explain elasticity and surplus relationships", "conceptual-explanation", "relationship", "application"]
  ]
};

export function learningObjectiveId(syllabusPointId: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(syllabusPointId)) throw new Error("Invalid learning-objective source identity.");
  return `ec9708-objective-${syllabusPointId}`;
}

export function mapTopicLearningContent(pack: TopicPack): TopicLearningContent {
  const topic = economicsTopic(pack.topicId), definitions = descriptors[pack.topicId];
  if (!topic || !definitions || pack.version !== "2026-v2-pilot-1") throw new Error("No reviewed objective mapping for this topic/version.");
  const points = syllabusPointIds(pack.topicId);
  if (pack.notes.length !== points.length || definitions.length !== points.length || pack.notes.some(n => !n.trim())) throw new Error("Incomplete objective material.");
  const seen = new Set<string>();
  const phases = ["memory", "understanding", "lab", "verification"] as const;
  const pools = [pack.baselineMemory, pack.baselineUnderstanding, pack.lab, pack.verification];
  const questions = pools.flatMap((pool, i) => pool.map(q => {
    if (!q.id || seen.has(q.id) || !q.coverage.length || new Set(q.coverage).size !== q.coverage.length || q.coverage.some(id => !points.includes(id))) throw new Error("Invalid question/objective membership.");
    seen.add(q.id);
    return { questionId: q.id, phase: phases[i], objectiveIds: q.coverage.map(learningObjectiveId), hasDiagram: Boolean(q.diagram) };
  }));
  return {
    mappingVersion: OBJECTIVE_MAPPING_VERSION, topicId: pack.topicId, contentVersion: pack.version,
    objectives: definitions.map(([label, ...contentTypes], i) => {
      const id = learningObjectiveId(points[i]);
      const associated = questions.filter(q => q.objectiveIds.includes(id));
      // A diagram objective is unsupported if no actual figure accompanies any item.
      const diagramQuestionIds = associated.filter(q => q.hasDiagram).map(q => q.questionId);
      return { id, syllabusPointId: points[i], label, contentTypes: contentTypes.filter(t => t !== "diagram-interpretation" || diagramQuestionIds.length > 0),
        material: pack.notes[i], noteIndex: i, questionIds: associated.map(q => q.questionId), diagramQuestionIds };
    }),
    questions
  };
}
