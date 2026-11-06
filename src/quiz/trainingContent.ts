// All content is resolved here; default selection stays in the general banks.
import { methodLabContentSets, methodMatchContentSets } from "./methodContentSets";
import { baselineMemoryContentSets, baselineConceptContentSets } from "./assessmentData";
import { withEconomics, economicsMemoryContentSets, economicsUnderstandingContentSets } from "./economics9708/adapter";
export const trainingMemoryContentSets = [...baselineMemoryContentSets, ...economicsMemoryContentSets];
export const trainingUnderstandingContentSets = [...baselineConceptContentSets, ...economicsUnderstandingContentSets];
export const trainingLabContentSets = {
  "active-recall": withEconomics("active-recall", "lab", methodLabContentSets["active-recall"]),
  "feynman": withEconomics("feynman", "lab", methodLabContentSets["feynman"]),
  "cornell": withEconomics("cornell", "lab", methodLabContentSets["cornell"]),
  "interleaving": withEconomics("interleaving", "lab", methodLabContentSets["interleaving"]),
  "memory-palace": withEconomics("memory-palace", "lab", methodLabContentSets["memory-palace"]),
  "active-blurting": withEconomics("active-blurting", "lab", methodLabContentSets["active-blurting"]),
  "one-sentence": withEconomics("one-sentence", "lab", methodLabContentSets["one-sentence"]),
  "note-taking-4x4": withEconomics("note-taking-4x4", "lab", methodLabContentSets["note-taking-4x4"]),
  "leitner-system": withEconomics("leitner-system", "lab", methodLabContentSets["leitner-system"]),
  "story-telling": withEconomics("story-telling", "lab", methodLabContentSets["story-telling"]),
  "capture-create": withEconomics("capture-create", "lab", methodLabContentSets["capture-create"]),
  "abbreviation": withEconomics("abbreviation", "lab", methodLabContentSets["abbreviation"]),
  "header-first": withEconomics("header-first", "lab", methodLabContentSets["header-first"]),
  "prime-question": withEconomics("prime-question", "lab", methodLabContentSets["prime-question"]),
  "doodle-effect": withEconomics("doodle-effect", "lab", methodLabContentSets["doodle-effect"]),
  "eighty-twenty-rule": withEconomics("eighty-twenty-rule", "lab", methodLabContentSets["eighty-twenty-rule"]),
  "divide-steps": withEconomics("divide-steps", "lab", methodLabContentSets["divide-steps"]),
  "derive-basics": withEconomics("derive-basics", "lab", methodLabContentSets["derive-basics"]),
  "kidlin-rule": withEconomics("kidlin-rule", "lab", methodLabContentSets["kidlin-rule"]),
  "premack-principle": withEconomics("premack-principle", "lab", methodLabContentSets["premack-principle"]),
  "ten-minute-wall-stare": withEconomics("ten-minute-wall-stare", "lab", methodLabContentSets["ten-minute-wall-stare"]),
  "strooper-effect": withEconomics("strooper-effect", "lab", methodLabContentSets["strooper-effect"]),
  "two-x-video-speed": withEconomics("two-x-video-speed", "lab", methodLabContentSets["two-x-video-speed"])
};
export const trainingMatchContentSets = {
  "active-recall": withEconomics("active-recall", "match", methodMatchContentSets["active-recall"]),
  "feynman": withEconomics("feynman", "match", methodMatchContentSets["feynman"]),
  "cornell": withEconomics("cornell", "match", methodMatchContentSets["cornell"]),
  "interleaving": withEconomics("interleaving", "match", methodMatchContentSets["interleaving"]),
  "memory-palace": withEconomics("memory-palace", "match", methodMatchContentSets["memory-palace"]),
  "active-blurting": withEconomics("active-blurting", "match", methodMatchContentSets["active-blurting"]),
  "one-sentence": withEconomics("one-sentence", "match", methodMatchContentSets["one-sentence"]),
  "note-taking-4x4": withEconomics("note-taking-4x4", "match", methodMatchContentSets["note-taking-4x4"]),
  "leitner-system": withEconomics("leitner-system", "match", methodMatchContentSets["leitner-system"]),
  "story-telling": withEconomics("story-telling", "match", methodMatchContentSets["story-telling"]),
  "capture-create": withEconomics("capture-create", "match", methodMatchContentSets["capture-create"]),
  "abbreviation": withEconomics("abbreviation", "match", methodMatchContentSets["abbreviation"]),
  "header-first": withEconomics("header-first", "match", methodMatchContentSets["header-first"]),
  "prime-question": withEconomics("prime-question", "match", methodMatchContentSets["prime-question"]),
  "doodle-effect": withEconomics("doodle-effect", "match", methodMatchContentSets["doodle-effect"]),
  "eighty-twenty-rule": withEconomics("eighty-twenty-rule", "match", methodMatchContentSets["eighty-twenty-rule"]),
  "divide-steps": withEconomics("divide-steps", "match", methodMatchContentSets["divide-steps"]),
  "derive-basics": withEconomics("derive-basics", "match", methodMatchContentSets["derive-basics"]),
  "kidlin-rule": withEconomics("kidlin-rule", "match", methodMatchContentSets["kidlin-rule"]),
  "premack-principle": withEconomics("premack-principle", "match", methodMatchContentSets["premack-principle"]),
  "ten-minute-wall-stare": withEconomics("ten-minute-wall-stare", "match", methodMatchContentSets["ten-minute-wall-stare"]),
  "strooper-effect": withEconomics("strooper-effect", "match", methodMatchContentSets["strooper-effect"]),
  "two-x-video-speed": withEconomics("two-x-video-speed", "match", methodMatchContentSets["two-x-video-speed"])
};
