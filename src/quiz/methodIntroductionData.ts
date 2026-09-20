import type {
  MethodId
} from "./type";

type MethodIntro = {
  name: string;

  description: string;

  howTo: string[];

  example: string;

  knowledgePrompt: string;
};

export const methodIntroductionData:
  Partial<Record<MethodId, MethodIntro>> = {

  "active-recall": {
    name: "Active Recall",

    description:
      "Active Recall means deliberately retrieving information from memory instead of repeatedly looking at your notes.",

    howTo: [
      "Study the material.",
      "Hide or close it.",
      "Try to remember the information.",
      "Check what you missed."
    ],

    example:
      "Read about photosynthesis, close the page, then explain everything you remember.",

    knowledgePrompt:
      "Which method mainly involves retrieving information without looking at the material?"
  },

  "feynman": {
    name: "Feynman Technique",

    description:
      "The Feynman Technique helps you test understanding by explaining a concept in simple language.",

    howTo: [
      "Learn the concept.",
      "Explain it in your own words.",
      "Notice where your explanation becomes unclear.",
      "Review those gaps and simplify again."
    ],

    example:
      "Learn why seasons happen, then explain it as if teaching a younger student.",

    knowledgePrompt:
      "Which method mainly involves explaining a concept in simple language?"
  },

  "cornell": {
    name: "Cornell Notes",

    description:
      "Cornell Notes organizes information into main notes, cues or questions, and a short summary.",

    howTo: [
      "Record important information.",
      "Create cues or questions.",
      "Summarize the main idea.",
      "Use the cues later for review."
    ],

    example:
      "After a biology lesson, write your notes, create questions beside them, and summarize the topic below.",

    knowledgePrompt:
      "Which method organizes information into main notes, cues and a summary?"
  },

  "interleaving": {
    name: "Interleaving",

    description:
      "Interleaving means mixing different types of problems or material instead of practising one type repeatedly.",

    howTo: [
      "Choose several related problem types.",
      "Mix them during practice.",
      "Identify which approach each problem requires.",
      "Switch between approaches."
    ],

    example:
      "Instead of doing ten percentage problems first, mix percentages, equations and averages.",

    knowledgePrompt:
      "Which method involves mixing different problem types during practice?"
  },

  "memory-palace": {
    name: "Memory Palace",

    description:
      "The Memory Palace technique links information to familiar imagined locations so those locations become retrieval cues.",

    howTo: [
      "Choose familiar locations.",
      "Assign information to each location.",
      "Create vivid mental images.",
      "Mentally walk through the locations to retrieve the information."
    ],

    example:
      "Imagine placing five facts around different locations in your bedroom.",

    knowledgePrompt:
      "Which method links information to familiar imagined locations?"
  }
};