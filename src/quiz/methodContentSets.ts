import * as labData
  from "./methodLabData";
import * as matchData
  from "./methodMatchData";
import {
  methodLabContentVariants
} from "./methodLabContentVariants";
import {
  methodMatchContentVariants
} from "./methodMatchContentVariants";

import type {
  MethodContentSet
} from "./methodContentSelector";
import type {
  TrainingMethodId
} from "./type";

function contentSet<Data>(
  id: string,
  data: Data
): MethodContentSet<Data> {
  return { id, data };
}

function addVariants<
  BaseData,
  VariantData
>(
  idPrefix: string,
  baseData: BaseData,
  variants: readonly VariantData[]
) {
  return [
    contentSet(`${idPrefix}-1`, baseData),
    ...variants.map((data, index) =>
      contentSet(
        `${idPrefix}-${index + 2}`,
        data
      )
    )
  ];
}

export const methodLabContentSets = {
  "active-recall": addVariants("active-recall-lab", labData.activeRecallExperiment, methodLabContentVariants["active-recall"]),
  feynman: addVariants("feynman-lab", labData.feynmanExperiment, methodLabContentVariants.feynman),
  cornell: addVariants("cornell-lab", labData.cornellExperiment, methodLabContentVariants.cornell),
  interleaving: addVariants("interleaving-lab", labData.interleavingExperiment, methodLabContentVariants.interleaving),
  "memory-palace": addVariants("memory-palace-lab", labData.memoryPalaceExperiment, methodLabContentVariants["memory-palace"]),
  "active-blurting": addVariants("active-blurting-lab", labData.activeBlurtingExperiment, methodLabContentVariants["active-blurting"]),
  "one-sentence": addVariants("one-sentence-lab", labData.oneSentenceExperiment, methodLabContentVariants["one-sentence"]),
  "note-taking-4x4": addVariants("note-taking-4x4-lab", labData.noteTaking4x4Experiment, methodLabContentVariants["note-taking-4x4"]),
  "leitner-system": addVariants("leitner-system-lab", labData.leitnerSystemExperiment, methodLabContentVariants["leitner-system"]),
  "story-telling": addVariants("story-telling-lab", labData.storyTellingExperiment, methodLabContentVariants["story-telling"]),
  "capture-create": addVariants("capture-create-lab", labData.captureCreateExperiment, methodLabContentVariants["capture-create"]),
  abbreviation: addVariants("abbreviation-lab", labData.abbreviationExperiment, methodLabContentVariants.abbreviation),
  "header-first": addVariants("header-first-lab", labData.headerFirstExperiment, methodLabContentVariants["header-first"]),
  "prime-question": addVariants("prime-question-lab", labData.primeQuestionExperiment, methodLabContentVariants["prime-question"]),
  "doodle-effect": addVariants("doodle-effect-lab", labData.doodleEffectExperiment, methodLabContentVariants["doodle-effect"]),
  "eighty-twenty-rule": addVariants("eighty-twenty-rule-lab", labData.eightyTwentyExperiment, methodLabContentVariants["eighty-twenty-rule"]),
  "divide-steps": addVariants("divide-steps-lab", labData.divideStepsExperiment, methodLabContentVariants["divide-steps"]),
  "derive-basics": addVariants("derive-basics-lab", labData.deriveBasicsExperiment, methodLabContentVariants["derive-basics"]),
  "kidlin-rule": addVariants("kidlin-rule-lab", labData.kidlinRuleExperiment, methodLabContentVariants["kidlin-rule"]),
  "premack-principle": addVariants("premack-principle-lab", labData.premackPrincipleExperiment, methodLabContentVariants["premack-principle"]),
  "ten-minute-wall-stare": addVariants("ten-minute-wall-stare-lab", labData.wallStareExperiment, methodLabContentVariants["ten-minute-wall-stare"]),
  "strooper-effect": addVariants("strooper-effect-lab", labData.strooperEffectExperiment, methodLabContentVariants["strooper-effect"]),
  "two-x-video-speed": [contentSet("two-x-video-speed-lab-1", labData.twoXVideoExperiment)]
} satisfies Record<
  TrainingMethodId,
  readonly MethodContentSet<unknown>[]
>;

export const methodMatchContentSets = {
  "active-recall": addVariants("active-recall-match", matchData.activeRecallMatchData, methodMatchContentVariants["active-recall"]),
  feynman: addVariants("feynman-match", matchData.feynmanMatchData, methodMatchContentVariants.feynman),
  cornell: addVariants("cornell-match", matchData.cornellMatchData, methodMatchContentVariants.cornell),
  interleaving: addVariants("interleaving-match", matchData.interleavingMatchData, methodMatchContentVariants.interleaving),
  "memory-palace": addVariants("memory-palace-match", matchData.memoryPalaceMatchData, methodMatchContentVariants["memory-palace"]),
  "active-blurting": addVariants("active-blurting-match", matchData.activeBlurtingMatchData, methodMatchContentVariants["active-blurting"]),
  "one-sentence": addVariants("one-sentence-match", matchData.oneSentenceMatchData, methodMatchContentVariants["one-sentence"]),
  "note-taking-4x4": addVariants("note-taking-4x4-match", matchData.noteTaking4x4MatchData, methodMatchContentVariants["note-taking-4x4"]),
  "leitner-system": addVariants("leitner-system-match", matchData.leitnerSystemMatchData, methodMatchContentVariants["leitner-system"]),
  "story-telling": addVariants("story-telling-match", matchData.storyTellingMatchData, methodMatchContentVariants["story-telling"]),
  "capture-create": addVariants("capture-create-match", matchData.captureCreateMatchData, methodMatchContentVariants["capture-create"]),
  abbreviation: addVariants("abbreviation-match", matchData.abbreviationMatchData, methodMatchContentVariants.abbreviation),
  "header-first": addVariants("header-first-match", matchData.headerFirstMatchData, methodMatchContentVariants["header-first"]),
  "prime-question": addVariants("prime-question-match", matchData.primeQuestionMatchData, methodMatchContentVariants["prime-question"]),
  "doodle-effect": addVariants("doodle-effect-match", matchData.doodleEffectMatchData, methodMatchContentVariants["doodle-effect"]),
  "eighty-twenty-rule": addVariants("eighty-twenty-rule-match", matchData.eightyTwentyMatchData, methodMatchContentVariants["eighty-twenty-rule"]),
  "divide-steps": addVariants("divide-steps-match", matchData.divideStepsMatchData, methodMatchContentVariants["divide-steps"]),
  "derive-basics": addVariants("derive-basics-match", matchData.deriveBasicsMatchData, methodMatchContentVariants["derive-basics"]),
  "kidlin-rule": addVariants("kidlin-rule-match", matchData.kidlinRuleMatchData, methodMatchContentVariants["kidlin-rule"]),
  "premack-principle": addVariants("premack-principle-match", matchData.premackPrincipleMatchData, methodMatchContentVariants["premack-principle"]),
  "ten-minute-wall-stare": addVariants("ten-minute-wall-stare-match", matchData.wallStareMatchData, methodMatchContentVariants["ten-minute-wall-stare"]),
  "strooper-effect": addVariants("strooper-effect-match", matchData.strooperEffectMatchData, methodMatchContentVariants["strooper-effect"]),
  "two-x-video-speed": [contentSet("two-x-video-speed-match-1", matchData.twoXVideoMatchData)]
} satisfies Record<
  TrainingMethodId,
  readonly MethodContentSet<unknown>[]
>;
