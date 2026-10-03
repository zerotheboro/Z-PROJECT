import type {
  ComponentType,
  ReactNode
} from "react";

import RecallExperiment
  from "./experiments/ActiveRecallExperiment";
import ExplanationExperiment
  from "./experiments/FeynmanExperiment";
import OrganizationExperiment
  from "./experiments/CornellExperiment";
import ComparisonExperiment
  from "./experiments/InterleavingExperiment";
import SpatialMemoryExperiment
  from "./experiments/MemoryPalaceExperiment";
import ActiveBlurtingExperiment
  from "./experiments/ActiveBlurtingExperiment";
import OneSentenceExperiment
  from "./experiments/OneSentenceExperiment";
import NoteTaking4x4Experiment
  from "./experiments/NoteTaking4x4Experiment";
import LeitnerSystemExperiment
  from "./experiments/LeitnerSystemExperiment";
import StoryTellingExperiment
  from "./experiments/StoryTellingExperiment";
import CaptureCreateExperiment
  from "./experiments/CaptureCreateExperiment";
import AbbreviationExperiment
  from "./experiments/AbbreviationExperiment";
import HeaderFirstExperiment
  from "./experiments/HeaderFirstExperiment";
import PrimeQuestionExperiment from "./experiments/PrimeQuestionExperiment";
import DoodleEffectExperiment from "./experiments/DoodleEffectExperiment";
import EightyTwentyExperiment from "./experiments/EightyTwentyExperiment";
import DivideStepsExperiment from "./experiments/DivideStepsExperiment";
import DeriveBasicsExperiment from "./experiments/DeriveBasicsExperiment";
import KidlinRuleExperiment from "./experiments/KidlinRuleExperiment";
import PremackPrincipleExperiment from "./experiments/PremackPrincipleExperiment";
import TenMinuteWallStareExperiment from "./experiments/TenMinuteWallStareExperiment";
import StrooperEffectExperiment from "./experiments/StrooperEffectExperiment";
import TwoXVideoSpeedExperiment from "./experiments/TwoXVideoSpeedExperiment";

import RecallMatch
  from "./matches/ActiveRecallMatch";
import ExplanationMatch
  from "./matches/FeynmanMatch";
import OrganizationMatch
  from "./matches/CornellMatch";
import ComparisonMatch
  from "./matches/InterleavingMatch";
import SpatialMemoryMatch
  from "./matches/MemoryPalaceMatch";
import ActiveBlurtingMatch
  from "./matches/ActiveBlurtingMatch";
import OneSentenceMatch
  from "./matches/OneSentenceMatch";
import NoteTaking4x4Match
  from "./matches/NoteTaking4x4Match";
import LeitnerSystemMatch
  from "./matches/LeitnerSystemMatch";
import StoryTellingMatch
  from "./matches/StoryTellingMatch";
import CaptureCreateMatch
  from "./matches/CaptureCreateMatch";
import AbbreviationMatch
  from "./matches/AbbreviationMatch";
import HeaderFirstMatch
  from "./matches/HeaderFirstMatch";
import PrimeQuestionMatch from "./matches/PrimeQuestionMatch";
import DoodleEffectMatch from "./matches/DoodleEffectMatch";
import EightyTwentyMatch from "./matches/EightyTwentyMatch";
import DivideStepsMatch from "./matches/DivideStepsMatch";
import DeriveBasicsMatch from "./matches/DeriveBasicsMatch";
import KidlinRuleMatch from "./matches/KidlinRuleMatch";
import PremackPrincipleMatch from "./matches/PremackPrincipleMatch";
import TenMinuteWallStareMatch from "./matches/TenMinuteWallStareMatch";
import StrooperEffectMatch from "./matches/StrooperEffectMatch";
import TwoXVideoSpeedMatch from "./matches/TwoXVideoSpeedMatch";

import {
  methodLabContentSets,
  methodMatchContentSets
} from "./methodContentSets";
import {
  getMethodContentSet,
  selectMethodContentSet
} from "./methodContentSelector";
import {
  methodIntroductionData
} from "./methodIntroductionData";

import type {
  BaselineResult,
  LearningSituation,
  MethodCategory,
  MethodExperimentResult,
  MethodId,
  MethodMatchExperimentResult,
  TrainingMethodId
} from "./type";
import type {
  MethodIntro
} from "./methodIntroductionData";
import type {
  LabEngineProps,
  MatchEngineProps
} from "./methodEngineTypes";
import {
  TrainingStateScope
} from "./trainingProgressState";

type SelectionSignal =
  | {
      kind: "difficulty";
      value: string;
      weight: number;
      selectionOrder: number;
      reason?: string;
      reasonOrder?: number;
    }
  | {
      kind: "content-type";
      value: string;
      weight: number;
      selectionOrder: number;
      reason?: string;
      reasonOrder?: number;
    }
  | {
      kind: "baseline";
      task: keyof BaselineResult;
      below: number;
      weight: number;
      selectionOrder: number;
      reason?: string;
      reasonOrder?: number;
    };

type MethodDefinition = {
  id: TrainingMethodId;
  name: string;
  shortName?: string;
  category: MethodCategory;
  introduction: MethodIntro;
  defaultSelectionWeight: number;
  defaultSelectionOrder: number;
  selectionSignals: readonly SelectionSignal[];
  labContentSetIds: readonly string[];
  matchContentSetIds: readonly string[];
  selectLabContentSetId: (
    random?: () => number
  ) => string;
  selectMatchContentSetId: (
    random?: () => number
  ) => string;
  renderLab: (
    contentSetId: string,
    onComplete: (
      result: MethodExperimentResult
    ) => void
  ) => ReactNode;
  renderMatch: (
    contentSetId: string,
    originalScore: number | null,
    onComplete: (
      result: MethodMatchExperimentResult
    ) => void
  ) => ReactNode;
};

function defineMethod<LabData, MatchData>(
  definition: Omit<
    MethodDefinition,
    | "labContentSetIds"
    | "matchContentSetIds"
    | "selectLabContentSetId"
    | "selectMatchContentSetId"
    | "renderLab"
    | "renderMatch"
  > & {
    labEngine: ComponentType<
      LabEngineProps<LabData>
    >;
    labContentSets: readonly {
      id: string;
      data: LabData;
    }[];
    matchEngine: ComponentType<
      MatchEngineProps<MatchData>
    >;
    matchContentSets: readonly {
      id: string;
      data: MatchData;
    }[];
  }
): MethodDefinition {
  const {
    labEngine: LabEngine,
    labContentSets,
    matchEngine: MatchEngine,
    matchContentSets,
    ...method
  } = definition;

  return {
    ...method,
    labContentSetIds:
      labContentSets.map(({ id }) => id),
    matchContentSetIds:
      matchContentSets.map(({ id }) => id),
    selectLabContentSetId: (random) =>
      selectMethodContentSet(
        labContentSets,
        random
      ).id,
    selectMatchContentSetId: (random) =>
      selectMethodContentSet(
        matchContentSets,
        random
      ).id,
    renderLab: (
      contentSetId,
      onComplete
    ) => {
      const { data } = getMethodContentSet(
        labContentSets,
        contentSetId
      );

      return (
        <TrainingStateScope
          key={`${method.id}:${contentSetId}`}
          name={`lab:${method.id}:${contentSetId}`}
        >
          <LabEngine
            method={method.id}
            category={method.category}
            name={method.name}
            data={data}
            onComplete={onComplete}
          />
        </TrainingStateScope>
      );
    },
    renderMatch: (
      contentSetId,
      originalScore,
      onComplete
    ) => {
      const { data } = getMethodContentSet(
        matchContentSets,
        contentSetId
      );

      return (
        <TrainingStateScope
          key={`${method.id}:${contentSetId}`}
          name={`match:${method.id}:${contentSetId}`}
        >
          <MatchEngine
            method={method.id}
            name={method.name}
            shortName={method.shortName}
            data={data}
            originalScore={originalScore}
            onComplete={onComplete}
          />
        </TrainingStateScope>
      );
    }
  };
}

export const methodRegistry = {
  "active-recall": defineMethod({
    id: "active-recall",
    name: "Active Recall",
    category: "memory",
    introduction:
      methodIntroductionData["active-recall"],
    defaultSelectionWeight: 1,
    defaultSelectionOrder: 17,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "forgetting",
        weight: 5,
        selectionOrder: 0,
        reasonOrder: 0,
        reason: "You reported difficulty remembering information."
      },
      {
        kind: "content-type",
        value: "facts",
        weight: 4,
        selectionOrder: 6,
        reasonOrder: 1,
        reason: "You often study factual material."
      },
      {
        kind: "baseline",
        task: "memory",
        below: 0.7,
        weight: 4,
        selectionOrder: 13,
        reasonOrder: 2,
        reason: "Your baseline suggests memory is worth testing further."
      }
    ],
    labEngine: RecallExperiment,
    labContentSets: methodLabContentSets["active-recall"],
    matchEngine: RecallMatch,
    matchContentSets: methodMatchContentSets["active-recall"]
  }),
  "feynman": defineMethod({
    id: "feynman",
    name: "Feynman Technique",
    category: "understanding",
    introduction:
      methodIntroductionData.feynman,
    defaultSelectionWeight: 1,
    defaultSelectionOrder: 18,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "understanding",
        weight: 5,
        selectionOrder: 2,
        reasonOrder: 0,
        reason: "You reported difficulty understanding concepts."
      },
      {
        kind: "content-type",
        value: "concepts",
        weight: 4,
        selectionOrder: 8,
        reasonOrder: 1,
        reason: "Conceptual material is important in your learning."
      },
      {
        kind: "content-type",
        value: "essays",
        weight: 2,
        selectionOrder: 12
      },
      {
        kind: "baseline",
        task: "understanding",
        below: 0.7,
        weight: 4,
        selectionOrder: 15,
        reasonOrder: 2,
        reason: "Your understanding baseline makes this useful to test."
      }
    ],
    labEngine: ExplanationExperiment,
    labContentSets: methodLabContentSets.feynman,
    matchEngine: ExplanationMatch,
    matchContentSets: methodMatchContentSets.feynman
  }),
  "cornell": defineMethod({
    id: "cornell",
    name: "Cornell Notes",
    shortName: "Cornell",
    category: "organization",
    introduction:
      methodIntroductionData.cornell,
    defaultSelectionWeight: 1,
    defaultSelectionOrder: 19,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "understanding",
        weight: 2,
        selectionOrder: 3
      },
      {
        kind: "difficulty",
        value: "prioritization",
        weight: 5,
        selectionOrder: 4,
        reasonOrder: 2,
        reason: "You reported difficulty identifying or prioritizing important information."
      },
      {
        kind: "content-type",
        value: "reading",
        weight: 4,
        selectionOrder: 9,
        reasonOrder: 0,
        reason: "You regularly work with reading material."
      },
      {
        kind: "content-type",
        value: "essays",
        weight: 3,
        selectionOrder: 11,
        reasonOrder: 1,
        reason: "Organizing ideas may help with essay-based material."
      },
      {
        kind: "baseline",
        task: "understanding",
        below: 0.7,
        weight: 2,
        selectionOrder: 16
      }
    ],
    labEngine: OrganizationExperiment,
    labContentSets: methodLabContentSets.cornell,
    matchEngine: OrganizationMatch,
    matchContentSets: methodMatchContentSets.cornell
  }),
  "interleaving": defineMethod({
    id: "interleaving",
    name: "Interleaving",
    category: "problem-solving",
    introduction:
      methodIntroductionData.interleaving,
    defaultSelectionWeight: 1,
    defaultSelectionOrder: 20,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "application",
        weight: 5,
        selectionOrder: 5,
        reasonOrder: 1,
        reason: "You reported difficulty applying what you learn."
      },
      {
        kind: "content-type",
        value: "problems",
        weight: 5,
        selectionOrder: 10,
        reasonOrder: 0,
        reason: "You regularly work with problem-solving material."
      }
    ],
    labEngine: ComparisonExperiment,
    labContentSets: methodLabContentSets.interleaving,
    matchEngine: ComparisonMatch,
    matchContentSets: methodMatchContentSets.interleaving
  }),
  "memory-palace": defineMethod({
    id: "memory-palace",
    name: "Memory Palace",
    category: "memory",
    introduction:
      methodIntroductionData["memory-palace"],
    defaultSelectionWeight: 1,
    defaultSelectionOrder: 21,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "forgetting",
        weight: 4,
        selectionOrder: 1,
        reasonOrder: 0,
        reason: "You reported difficulty remembering information."
      },
      {
        kind: "content-type",
        value: "facts",
        weight: 3,
        selectionOrder: 7,
        reasonOrder: 1,
        reason: "You often need to remember factual material."
      },
      {
        kind: "baseline",
        task: "memory",
        below: 0.7,
        weight: 3,
        selectionOrder: 14
      }
    ],
    labEngine: SpatialMemoryExperiment,
    labContentSets: methodLabContentSets["memory-palace"],
    matchEngine: SpatialMemoryMatch,
    matchContentSets: methodMatchContentSets["memory-palace"]
  }),
  "active-blurting": defineMethod({
    id: "active-blurting",
    name: "Active Blurting",
    category: "memory",
    introduction:
      methodIntroductionData["active-blurting"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 22,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "forgetting",
        weight: 3,
        selectionOrder: 22,
        reasonOrder: 0,
        reason: "You reported difficulty remembering information."
      },
      {
        kind: "content-type",
        value: "facts",
        weight: 2,
        selectionOrder: 23,
        reasonOrder: 1,
        reason: "You often study factual material that can be checked through written recall."
      },
      {
        kind: "baseline",
        task: "memory",
        below: 0.7,
        weight: 2,
        selectionOrder: 24,
        reasonOrder: 2,
        reason: "Your baseline suggests a written retrieval method is worth testing."
      }
    ],
    labEngine: ActiveBlurtingExperiment,
    labContentSets: methodLabContentSets["active-blurting"],
    matchEngine: ActiveBlurtingMatch,
    matchContentSets: methodMatchContentSets["active-blurting"]
  }),
  "one-sentence": defineMethod({
    id: "one-sentence",
    name: "1 sentence",
    category: "understanding",
    introduction:
      methodIntroductionData["one-sentence"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 23,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "understanding",
        weight: 3,
        selectionOrder: 25,
        reasonOrder: 0,
        reason: "You reported difficulty understanding concepts."
      },
      {
        kind: "content-type",
        value: "concepts",
        weight: 3,
        selectionOrder: 26,
        reasonOrder: 1,
        reason: "You work with concepts that benefit from concise explanation."
      },
      {
        kind: "content-type",
        value: "essays",
        weight: 1,
        selectionOrder: 27
      },
      {
        kind: "baseline",
        task: "understanding",
        below: 0.7,
        weight: 2,
        selectionOrder: 28,
        reasonOrder: 2,
        reason: "Your understanding baseline makes concise explanation useful to test."
      }
    ],
    labEngine: OneSentenceExperiment,
    labContentSets: methodLabContentSets["one-sentence"],
    matchEngine: OneSentenceMatch,
    matchContentSets: methodMatchContentSets["one-sentence"]
  }),
  "note-taking-4x4": defineMethod({
    id: "note-taking-4x4",
    name: "Note-taking 4x4",
    category: "organization",
    introduction:
      methodIntroductionData["note-taking-4x4"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 24,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "prioritization",
        weight: 4,
        selectionOrder: 29,
        reasonOrder: 0,
        reason: "You reported difficulty identifying or prioritizing important information."
      },
      {
        kind: "content-type",
        value: "reading",
        weight: 3,
        selectionOrder: 30,
        reasonOrder: 1,
        reason: "You regularly organize information from reading material."
      },
      {
        kind: "content-type",
        value: "essays",
        weight: 2,
        selectionOrder: 31,
        reasonOrder: 2,
        reason: "A four-part structure can help organize essay material."
      },
      {
        kind: "difficulty",
        value: "understanding",
        weight: 1,
        selectionOrder: 32
      }
    ],
    labEngine: NoteTaking4x4Experiment,
    labContentSets: methodLabContentSets["note-taking-4x4"],
    matchEngine: NoteTaking4x4Match,
    matchContentSets: methodMatchContentSets["note-taking-4x4"]
  }),
  "leitner-system": defineMethod({
    id: "leitner-system",
    name: "Leitner system",
    category: "memory",
    introduction:
      methodIntroductionData["leitner-system"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 25,
    selectionSignals: [
      {
        kind: "content-type",
        value: "facts",
        weight: 3,
        selectionOrder: 33,
        reasonOrder: 0,
        reason: "You often study factual material that benefits from spaced card review."
      },
      {
        kind: "baseline",
        task: "memory",
        below: 0.7,
        weight: 3,
        selectionOrder: 34,
        reasonOrder: 1,
        reason: "Your baseline suggests repeated review of weaker items is worth testing."
      }
    ],
    labEngine: LeitnerSystemExperiment,
    labContentSets: methodLabContentSets["leitner-system"],
    matchEngine: LeitnerSystemMatch,
    matchContentSets: methodMatchContentSets["leitner-system"]
  }),
  "story-telling": defineMethod({
    id: "story-telling",
    name: "Story telling",
    category: "memory",
    introduction:
      methodIntroductionData["story-telling"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 26,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "forgetting",
        weight: 3,
        selectionOrder: 35,
        reasonOrder: 0,
        reason: "You reported difficulty remembering information."
      },
      {
        kind: "content-type",
        value: "reading",
        weight: 1,
        selectionOrder: 36,
        reasonOrder: 1,
        reason: "Connected stories can support recall of ordered reading material."
      },
      {
        kind: "baseline",
        task: "memory",
        below: 0.7,
        weight: 2,
        selectionOrder: 37,
        reasonOrder: 2,
        reason: "Your memory baseline makes a narrative recall method useful to test."
      }
    ],
    labEngine: StoryTellingExperiment,
    labContentSets: methodLabContentSets["story-telling"],
    matchEngine: StoryTellingMatch,
    matchContentSets: methodMatchContentSets["story-telling"]
  }),
  "capture-create": defineMethod({
    id: "capture-create",
    name: "capture & create",
    category: "understanding",
    introduction:
      methodIntroductionData["capture-create"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 27,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "application",
        weight: 5,
        selectionOrder: 38,
        reasonOrder: 0,
        reason: "You reported difficulty applying what you learn."
      },
      {
        kind: "content-type",
        value: "concepts",
        weight: 1,
        selectionOrder: 39,
        reasonOrder: 1,
        reason: "You study concepts that benefit from being developed and applied."
      }
    ],
    labEngine: CaptureCreateExperiment,
    labContentSets: methodLabContentSets["capture-create"],
    matchEngine: CaptureCreateMatch,
    matchContentSets: methodMatchContentSets["capture-create"]
  }),
  "abbreviation": defineMethod({
    id: "abbreviation",
    name: "ABBREVIATION!",
    category: "memory",
    introduction:
      methodIntroductionData.abbreviation,
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 28,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "forgetting",
        weight: 3,
        selectionOrder: 40,
        reasonOrder: 0,
        reason: "You reported difficulty remembering information."
      },
      {
        kind: "content-type",
        value: "facts",
        weight: 3,
        selectionOrder: 41,
        reasonOrder: 1,
        reason: "You often study related facts that can be compressed into a mnemonic."
      }
    ],
    labEngine: AbbreviationExperiment,
    labContentSets: methodLabContentSets.abbreviation,
    matchEngine: AbbreviationMatch,
    matchContentSets: methodMatchContentSets.abbreviation
  }),
  "header-first": defineMethod({
    id: "header-first",
    name: "HEADER first",
    category: "organization",
    introduction:
      methodIntroductionData["header-first"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 29,
    selectionSignals: [
      {
        kind: "difficulty",
        value: "prioritization",
        weight: 1,
        selectionOrder: 42,
        reasonOrder: 0,
        reason: "You reported difficulty identifying or prioritizing important information."
      },
      {
        kind: "content-type",
        value: "reading",
        weight: 1,
        selectionOrder: 43,
        reasonOrder: 1,
        reason: "You regularly work with structured reading material."
      }
    ],
    labEngine: HeaderFirstExperiment,
    labContentSets: methodLabContentSets["header-first"],
    matchEngine: HeaderFirstMatch,
    matchContentSets: methodMatchContentSets["header-first"]
  }),
  "prime-question": defineMethod({
    id: "prime-question",
    name: "Prime question",
    category: "understanding",
    introduction: methodIntroductionData["prime-question"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 30,
    selectionSignals: [
      { kind: "difficulty", value: "understanding", weight: 2, selectionOrder: 44, reasonOrder: 0, reason: "A guiding question can focus attention on material you want to understand." },
      { kind: "content-type", value: "reading", weight: 2, selectionOrder: 45, reasonOrder: 1, reason: "You regularly work with reading material that can be framed by a central question." },
      { kind: "content-type", value: "concepts", weight: 1, selectionOrder: 46 }
    ],
    labEngine: PrimeQuestionExperiment,
    labContentSets: methodLabContentSets["prime-question"],
    matchEngine: PrimeQuestionMatch,
    matchContentSets: methodMatchContentSets["prime-question"]
  }),
  "doodle-effect": defineMethod({
    id: "doodle-effect",
    name: "the Doodle effect",
    category: "understanding",
    introduction: methodIntroductionData["doodle-effect"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 31,
    selectionSignals: [
      { kind: "difficulty", value: "forgetting", weight: 2, selectionOrder: 47, reasonOrder: 0, reason: "Visual encoding can provide another cue for information you need to remember." },
      { kind: "content-type", value: "concepts", weight: 3, selectionOrder: 48, reasonOrder: 1, reason: "You study concepts whose relationships can be represented visually." }
    ],
    labEngine: DoodleEffectExperiment,
    labContentSets: methodLabContentSets["doodle-effect"],
    matchEngine: DoodleEffectMatch,
    matchContentSets: methodMatchContentSets["doodle-effect"]
  }),
  "eighty-twenty-rule": defineMethod({
    id: "eighty-twenty-rule",
    name: "80/20 rule",
    category: "organization",
    introduction: methodIntroductionData["eighty-twenty-rule"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 32,
    selectionSignals: [
      { kind: "difficulty", value: "prioritization", weight: 4, selectionOrder: 49, reasonOrder: 0, reason: "You reported difficulty identifying the information with the greatest value." },
      { kind: "content-type", value: "reading", weight: 1, selectionOrder: 50, reasonOrder: 1, reason: "You work with reading material that contains both core ideas and supporting details." }
    ],
    labEngine: EightyTwentyExperiment,
    labContentSets: methodLabContentSets["eighty-twenty-rule"],
    matchEngine: EightyTwentyMatch,
    matchContentSets: methodMatchContentSets["eighty-twenty-rule"]
  }),
  "divide-steps": defineMethod({
    id: "divide-steps",
    name: "divide steps",
    category: "organization",
    introduction: methodIntroductionData["divide-steps"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 33,
    selectionSignals: [
      { kind: "difficulty", value: "application", weight: 4, selectionOrder: 51, reasonOrder: 0, reason: "Breaking a process into steps can make it easier to apply." },
      { kind: "content-type", value: "problems", weight: 3, selectionOrder: 52, reasonOrder: 1, reason: "You work with problems or tasks that benefit from an explicit sequence." }
    ],
    labEngine: DivideStepsExperiment,
    labContentSets: methodLabContentSets["divide-steps"],
    matchEngine: DivideStepsMatch,
    matchContentSets: methodMatchContentSets["divide-steps"]
  }),
  "derive-basics": defineMethod({
    id: "derive-basics",
    name: "derive basics",
    category: "understanding",
    introduction: methodIntroductionData["derive-basics"],
    defaultSelectionWeight: 0,
    defaultSelectionOrder: 34,
    selectionSignals: [
      { kind: "difficulty", value: "understanding", weight: 2, selectionOrder: 53, reasonOrder: 0, reason: "Rebuilding an idea from basic principles can strengthen understanding." },
      { kind: "content-type", value: "concepts", weight: 2, selectionOrder: 54, reasonOrder: 1, reason: "You study concepts that can be derived from underlying principles." },
      { kind: "difficulty", value: "application", weight: 2, selectionOrder: 55, reasonOrder: 2, reason: "A reasoning chain can help transfer basic principles to new problems." },
      { kind: "baseline", task: "understanding", below: 0.7, weight: 1, selectionOrder: 56 }
    ],
    labEngine: DeriveBasicsExperiment,
    labContentSets: methodLabContentSets["derive-basics"],
    matchEngine: DeriveBasicsMatch,
    matchContentSets: methodMatchContentSets["derive-basics"]
  }),
  "kidlin-rule": defineMethod({id:"kidlin-rule",name:"Kidlin's rule",category:"problem-solving",introduction:methodIntroductionData["kidlin-rule"],defaultSelectionWeight:0,defaultSelectionOrder:35,selectionSignals:[
    {kind:"difficulty",value:"strategy",weight:4,selectionOrder:57,reasonOrder:0,reason:"Clarifying the real problem can provide a concrete starting strategy."},
    {kind:"difficulty",value:"application",weight:2,selectionOrder:58,reasonOrder:1,reason:"A precise problem statement can make the next action clearer."},
    {kind:"content-type",value:"problems",weight:2,selectionOrder:59}
  ],labEngine:KidlinRuleExperiment,labContentSets:methodLabContentSets["kidlin-rule"],matchEngine:KidlinRuleMatch,matchContentSets:methodMatchContentSets["kidlin-rule"]}),
  "premack-principle": defineMethod({id:"premack-principle",name:"Premack's principle",category:"focus",introduction:methodIntroductionData["premack-principle"],defaultSelectionWeight:0,defaultSelectionOrder:36,selectionSignals:[
    {kind:"difficulty",value:"starting",weight:5,selectionOrder:60,reasonOrder:0,reason:"You reported difficulty starting your learning task."},
    {kind:"difficulty",value:"inefficiency",weight:2,selectionOrder:61,reasonOrder:1,reason:"A clear task-before-reward pairing may reduce delay."}
  ],labEngine:PremackPrincipleExperiment,labContentSets:methodLabContentSets["premack-principle"],matchEngine:PremackPrincipleMatch,matchContentSets:methodMatchContentSets["premack-principle"]}),
  "ten-minute-wall-stare": defineMethod({id:"ten-minute-wall-stare",name:"10 min wall stare",category:"focus",introduction:methodIntroductionData["ten-minute-wall-stare"],defaultSelectionWeight:0,defaultSelectionOrder:37,selectionSignals:[
    {kind:"difficulty",value:"focus",weight:4,selectionOrder:62,reasonOrder:0,reason:"You reported difficulty sustaining focus."},
    {kind:"difficulty",value:"inefficiency",weight:2,selectionOrder:63,reasonOrder:1,reason:"A low-stimulation reset is worth testing before another learning attempt."}
  ],labEngine:TenMinuteWallStareExperiment,labContentSets:methodLabContentSets["ten-minute-wall-stare"],matchEngine:TenMinuteWallStareMatch,matchContentSets:methodMatchContentSets["ten-minute-wall-stare"]}),
  "strooper-effect": defineMethod({id:"strooper-effect",name:"Strooper effect",category:"focus",introduction:methodIntroductionData["strooper-effect"],defaultSelectionWeight:0,defaultSelectionOrder:38,selectionSignals:[
    {kind:"difficulty",value:"focus",weight:5,selectionOrder:64,reasonOrder:0,reason:"You reported difficulty focusing, so an interference warm-up is useful to test."},
    {kind:"difficulty",value:"strategy",weight:1,selectionOrder:65}
  ],labEngine:StrooperEffectExperiment,labContentSets:methodLabContentSets["strooper-effect"],matchEngine:StrooperEffectMatch,matchContentSets:methodMatchContentSets["strooper-effect"]}),
  "two-x-video-speed": defineMethod({id:"two-x-video-speed",name:"2X video speed",category:"understanding",introduction:methodIntroductionData["two-x-video-speed"],defaultSelectionWeight:0,defaultSelectionOrder:39,selectionSignals:[
    {kind:"difficulty",value:"inefficiency",weight:4,selectionOrder:66,reasonOrder:0,reason:"You reported spending substantial time without enough progress."},
    {kind:"content-type",value:"reading",weight:2,selectionOrder:67,reasonOrder:1,reason:"Accelerated instructional presentation is worth comparing with your usual information intake."}
  ],labEngine:TwoXVideoSpeedExperiment,labContentSets:methodLabContentSets["two-x-video-speed"],matchEngine:TwoXVideoSpeedMatch,matchContentSets:methodMatchContentSets["two-x-video-speed"]
  })
} satisfies Record<
  TrainingMethodId,
  MethodDefinition
>;

export const methodDefinitions =
  Object.values(methodRegistry);

export function getMethodDefinition(
  method: TrainingMethodId
) {
  return methodRegistry[method];
}

export function getMethodName(
  method: MethodId
) {
  if (method in methodRegistry) {
    return methodRegistry[
      method as TrainingMethodId
    ].name;
  }

  if (method === "pomodoro") {
    return "Pomodoro";
  }

  if (method === "stopwatch") {
    return "Stopwatch";
  }

  return method;
}

export function matchesSelectionSignal(
  signal: SelectionSignal,
  situation: LearningSituation,
  baseline: BaselineResult
) {
  if (signal.kind === "difficulty") {
    return situation.difficulties.includes(
      signal.value
    );
  }

  if (signal.kind === "content-type") {
    return situation.contentTypes.includes(
      signal.value
    );
  }

  return baseline[signal.task].score <
    signal.below;
}

export function getMethodSelectionReasons(
  method: TrainingMethodId,
  situation: LearningSituation,
  baseline: BaselineResult
) {
  const reasons = getMethodDefinition(method)
    .selectionSignals
    .filter(
      (signal) =>
        signal.reason &&
        matchesSelectionSignal(
          signal,
          situation,
          baseline
        )
    )
    .sort(
      (a, b) =>
        (a.reasonOrder ?? 0) -
        (b.reasonOrder ?? 0)
    )
    .map((signal) => signal.reason as string);

  return reasons.length > 0
    ? reasons
    : [
        "This method gives us another useful learning approach to compare."
      ];
}
