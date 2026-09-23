import type {
  TrainingMethodId
} from "./type";

export type MethodIntro = {
  name: string;

  description: string;

  howTo: string[];

  example: string;

  knowledgePrompt: string;
};

export const methodIntroductionData:
  Record<TrainingMethodId, MethodIntro> = {

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
  },

  "active-blurting": {
    name: "Active Blurting",

    description:
      "Active Blurting means studying a topic, closing the material, and writing everything you can remember before checking the gaps.",

    howTo: [
      "Study the material.",
      "Hide or close it.",
      "Blurt out everything you remember in writing.",
      "Compare your blurt with the material and identify gaps."
    ],

    example:
      "Read about coral reefs, close the page, write every fact you remember, then check what you missed.",

    knowledgePrompt:
      "Which method involves writing everything remembered and then checking the gaps?"
  },

  "one-sentence": {
    name: "1 sentence",

    description:
      "1 sentence tests understanding by requiring you to express the central idea accurately in one concise sentence.",

    howTo: [
      "Study the concept.",
      "Explain the central idea in exactly one sentence.",
      "Check whether the sentence is accurate and focused.",
      "Refine it into a clearer single sentence."
    ],

    example:
      "After learning how vaccines work, explain the key process in one clear sentence.",

    knowledgePrompt:
      "Which method asks you to explain the central idea in exactly one concise sentence?"
  },

  "note-taking-4x4": {
    name: "Note-taking 4x4",

    description:
      "Note-taking 4x4 organizes a main idea into four sub-ideas, with supporting details placed beneath each one.",

    howTo: [
      "Identify the main idea.",
      "Divide it into four important sub-ideas.",
      "Add supporting details beneath each sub-idea.",
      "Review how the four parts connect to the whole."
    ],

    example:
      "Organize the water cycle into evaporation, condensation, precipitation, and collection, then add details under each part.",

    knowledgePrompt:
      "Which method organizes one main idea into four sub-ideas with supporting details?"
  },

  "leitner-system": {
    name: "Leitner system",
    description:
      "The Leitner system organizes flashcards by how well you know them so weaker items are reviewed more often.",
    howTo: [
      "Study flashcard-style material.",
      "Test your recall.",
      "Place weaker items in a frequent-review level.",
      "Retest weak items before moving them forward."
    ],
    example:
      "Keep missed vocabulary cards in the first level and move remembered cards to a later level.",
    knowledgePrompt:
      "Which method sorts flashcards into levels based on recall performance?"
  },

  "story-telling": {
    name: "Story telling",
    description:
      "Story telling connects ordered information into a narrative so each event becomes a cue for the next.",
    howTo: [
      "Study the information in order.",
      "Turn the items into one connected story.",
      "Use the story to reconstruct the original sequence.",
      "Check the original information."
    ],
    example:
      "Connect a sequence of historical events into a story in which each event causes the next.",
    knowledgePrompt:
      "Which method links ordered information through a connected narrative?"
  },

  "capture-create": {
    name: "capture & create",
    description:
      "capture & create first identifies important knowledge, then develops it through meaning, importance, application, and usefulness.",
    howTo: [
      "Study the material.",
      "Capture the most important knowledge.",
      "Explain what it is and why it matters.",
      "Create examples of how and when it can be applied."
    ],
    example:
      "Capture the idea of opportunity cost, then explain why it matters and when you would use it.",
    knowledgePrompt:
      "Which method captures key knowledge and develops what, why, how, and when responses?"
  },

  "abbreviation": {
    name: "ABBREVIATION!",
    description:
      "ABBREVIATION! compresses related items into an acronym, abbreviation, or mnemonic that cues the original information.",
    howTo: [
      "Study the related items.",
      "Create a compact abbreviation or mnemonic.",
      "Use it to reconstruct every original item.",
      "Check what you recalled."
    ],
    example:
      "Use HOMES to remember Huron, Ontario, Michigan, Erie, and Superior.",
    knowledgePrompt:
      "Which method creates a compact acronym or mnemonic for related items?"
  },

  "header-first": {
    name: "HEADER first",
    description:
      "HEADER first previews headings before full reading so you can predict the structure and identify the key ideas.",
    howTo: [
      "Inspect the headers before reading.",
      "Predict how the material is organized.",
      "Read the full text with that structure in mind.",
      "Check your comprehension."
    ],
    example:
      "Preview the headings in a chapter, predict its argument, then read each section in context.",
    knowledgePrompt:
      "Which method previews headings before reading the full material?"
  },

  "prime-question": {
    name: "Prime question",
    description:
      "Prime question focuses attention on one strong guiding question before studying new material.",
    howTo: [
      "Identify the learning topic.",
      "Create or focus on one central guiding question.",
      "Study with that question in mind.",
      "Answer the question from understanding."
    ],
    example:
      "Before reading about mangroves, ask how their roots protect a coastline.",
    knowledgePrompt:
      "Which method uses one guiding question to focus attention before studying?"
  },

  "doodle-effect": {
    name: "the Doodle effect",
    description:
      "the Doodle effect turns important ideas and relationships into a simple visual representation that supports recall.",
    howTo: [
      "Study the material.",
      "Sketch or describe a simple visual representation.",
      "Connect the important ideas in the visual.",
      "Use it to reconstruct the material."
    ],
    example:
      "Represent a food web with simple organisms and arrows showing energy flow.",
    knowledgePrompt:
      "Which method encodes important ideas in a simple visual representation?"
  },

  "eighty-twenty-rule": {
    name: "80/20 rule",
    description:
      "The 80/20 rule prioritizes the small set of concepts that produces most of the understanding or value.",
    howTo: [
      "Inspect all the available material.",
      "Identify the few highest-value concepts.",
      "Rank those concepts by importance.",
      "Study the priorities before supporting details."
    ],
    example:
      "Prioritize the actions that most improve a recycling program before minor presentation details.",
    knowledgePrompt:
      "Which method prioritizes a small set of high-value concepts?"
  },

  "divide-steps": {
    name: "divide steps",
    description:
      "divide steps breaks a complex process into smaller actions, organizes their sequence, and reconnects them into the full process.",
    howTo: [
      "Inspect the full process.",
      "Break it into clear smaller steps.",
      "Put the steps in sequence.",
      "Reconstruct how the complete process works."
    ],
    example:
      "Break the journey of a bill into proposal, committee review, voting, and approval.",
    knowledgePrompt:
      "Which method breaks a complex process into an organized sequence of smaller actions?"
  },

  "derive-basics": {
    name: "derive basics",
    description:
      "derive basics identifies the simplest principles beneath an idea and uses them to rebuild the higher-level conclusion.",
    howTo: [
      "Identify the concept or problem.",
      "Find the basic facts or principles underneath it.",
      "Derive the higher-level idea from those basics.",
      "Explain the complete reasoning chain."
    ],
    example:
      "Use density and displaced water to derive why an object floats or sinks.",
    knowledgePrompt:
      "Which method rebuilds a complex idea from its most basic principles?"
  }
};
