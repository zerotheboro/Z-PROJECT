import {
  describe,
  expect,
  it
} from "vitest";

import {
  activeBlurtingExperiment,
  activeRecallExperiment,
  abbreviationExperiment,
  captureCreateExperiment,
  deriveBasicsExperiment,
  divideStepsExperiment,
  doodleEffectExperiment,
  eightyTwentyExperiment,
  cornellExperiment,
  feynmanExperiment,
  headerFirstExperiment,
  interleavingExperiment,
  leitnerSystemExperiment,
  memoryPalaceExperiment,
  noteTaking4x4Experiment,
  oneSentenceExperiment,
  primeQuestionExperiment,
  storyTellingExperiment
} from "../methodLabData";
import {
  activeBlurtingMatchData,
  activeRecallMatchData,
  abbreviationMatchData,
  captureCreateMatchData,
  deriveBasicsMatchData,
  divideStepsMatchData,
  doodleEffectMatchData,
  eightyTwentyMatchData,
  cornellMatchData,
  feynmanMatchData,
  headerFirstMatchData,
  interleavingMatchData,
  leitnerSystemMatchData,
  memoryPalaceMatchData,
  noteTaking4x4MatchData,
  oneSentenceMatchData,
  primeQuestionMatchData,
  storyTellingMatchData
} from "../methodMatchData";

type Question = {
  id: string;
  options: readonly string[];
  correct: string;
};

type ContentCase = {
  method: string;
  labQuestionGroups: readonly (
    readonly Question[]
  )[];
  verificationQuestionGroups: readonly (
    readonly Question[]
  )[];
  requiredLabArrays: readonly (
    readonly unknown[]
  )[];
  requiredVerificationArrays: readonly (
    readonly unknown[]
  )[];
};

const contentCases: ContentCase[] = [
  {
    method: "active-recall",
    labQuestionGroups: [
      activeRecallExperiment.questions
    ],
    verificationQuestionGroups: [
      activeRecallMatchData.questions
    ],
    requiredLabArrays: [
      activeRecallExperiment.facts,
      activeRecallExperiment.questions
    ],
    requiredVerificationArrays: [
      activeRecallMatchData.facts,
      activeRecallMatchData.questions
    ]
  },
  {
    method: "feynman",
    labQuestionGroups: [
      feynmanExperiment.questions
    ],
    verificationQuestionGroups: [
      feynmanMatchData.questions
    ],
    requiredLabArrays: [
      feynmanExperiment.questions
    ],
    requiredVerificationArrays: [
      feynmanMatchData.questions
    ]
  },
  {
    method: "cornell",
    labQuestionGroups: [
      cornellExperiment.questions
    ],
    verificationQuestionGroups: [
      cornellMatchData.questions
    ],
    requiredLabArrays: [
      cornellExperiment.questions
    ],
    requiredVerificationArrays: [
      cornellMatchData.questions
    ]
  },
  {
    method: "interleaving",
    labQuestionGroups: [
      interleavingExperiment.practice,
      interleavingExperiment.test
    ],
    verificationQuestionGroups: [
      interleavingMatchData.practice,
      interleavingMatchData.test
    ],
    requiredLabArrays: [
      interleavingExperiment.instructions,
      interleavingExperiment.practice,
      interleavingExperiment.test
    ],
    requiredVerificationArrays: [
      interleavingMatchData.instructions,
      interleavingMatchData.practice,
      interleavingMatchData.test
    ]
  },
  {
    method: "memory-palace",
    labQuestionGroups: [
      memoryPalaceExperiment.questions
    ],
    verificationQuestionGroups: [
      memoryPalaceMatchData.questions
    ],
    requiredLabArrays: [
      memoryPalaceExperiment.locations,
      memoryPalaceExperiment.pairings,
      memoryPalaceExperiment.questions
    ],
    requiredVerificationArrays: [
      memoryPalaceMatchData.locations,
      memoryPalaceMatchData.pairings,
      memoryPalaceMatchData.questions
    ]
  },
  {
    method: "active-blurting",
    labQuestionGroups: [
      activeBlurtingExperiment.questions
    ],
    verificationQuestionGroups: [
      activeBlurtingMatchData.questions
    ],
    requiredLabArrays: [
      activeBlurtingExperiment.facts,
      activeBlurtingExperiment.questions
    ],
    requiredVerificationArrays: [
      activeBlurtingMatchData.facts,
      activeBlurtingMatchData.questions
    ]
  },
  {
    method: "one-sentence",
    labQuestionGroups: [
      oneSentenceExperiment.questions
    ],
    verificationQuestionGroups: [
      oneSentenceMatchData.questions
    ],
    requiredLabArrays: [
      oneSentenceExperiment.questions
    ],
    requiredVerificationArrays: [
      oneSentenceMatchData.questions
    ]
  },
  {
    method: "note-taking-4x4",
    labQuestionGroups: [
      noteTaking4x4Experiment.questions
    ],
    verificationQuestionGroups: [
      noteTaking4x4MatchData.questions
    ],
    requiredLabArrays: [
      noteTaking4x4Experiment.questions
    ],
    requiredVerificationArrays: [
      noteTaking4x4MatchData.questions
    ]
  },
  {
    method: "leitner-system",
    labQuestionGroups: [
      leitnerSystemExperiment.practice,
      leitnerSystemExperiment.test
    ],
    verificationQuestionGroups: [
      leitnerSystemMatchData.practice,
      leitnerSystemMatchData.test
    ],
    requiredLabArrays: [
      leitnerSystemExperiment.cards,
      leitnerSystemExperiment.practice,
      leitnerSystemExperiment.test
    ],
    requiredVerificationArrays: [
      leitnerSystemMatchData.cards,
      leitnerSystemMatchData.practice,
      leitnerSystemMatchData.test
    ]
  },
  {
    method: "story-telling",
    labQuestionGroups: [
      storyTellingExperiment.questions
    ],
    verificationQuestionGroups: [
      storyTellingMatchData.questions
    ],
    requiredLabArrays: [
      storyTellingExperiment.orderedItems,
      storyTellingExperiment.questions
    ],
    requiredVerificationArrays: [
      storyTellingMatchData.orderedItems,
      storyTellingMatchData.questions
    ]
  },
  {
    method: "capture-create",
    labQuestionGroups: [
      captureCreateExperiment.questions
    ],
    verificationQuestionGroups: [
      captureCreateMatchData.questions
    ],
    requiredLabArrays: [
      captureCreateExperiment.questions
    ],
    requiredVerificationArrays: [
      captureCreateMatchData.questions
    ]
  },
  {
    method: "abbreviation",
    labQuestionGroups: [
      abbreviationExperiment.questions
    ],
    verificationQuestionGroups: [
      abbreviationMatchData.questions
    ],
    requiredLabArrays: [
      abbreviationExperiment.items,
      abbreviationExperiment.questions
    ],
    requiredVerificationArrays: [
      abbreviationMatchData.items,
      abbreviationMatchData.questions
    ]
  },
  {
    method: "header-first",
    labQuestionGroups: [
      headerFirstExperiment.questions
    ],
    verificationQuestionGroups: [
      headerFirstMatchData.questions
    ],
    requiredLabArrays: [
      headerFirstExperiment.sections,
      headerFirstExperiment.questions
    ],
    requiredVerificationArrays: [
      headerFirstMatchData.sections,
      headerFirstMatchData.questions
    ]
  },
  {
    method: "prime-question",
    labQuestionGroups: [primeQuestionExperiment.questions],
    verificationQuestionGroups: [primeQuestionMatchData.questions],
    requiredLabArrays: [primeQuestionExperiment.questions],
    requiredVerificationArrays: [primeQuestionMatchData.questions]
  },
  {
    method: "doodle-effect",
    labQuestionGroups: [doodleEffectExperiment.questions],
    verificationQuestionGroups: [doodleEffectMatchData.questions],
    requiredLabArrays: [doodleEffectExperiment.relationships, doodleEffectExperiment.questions],
    requiredVerificationArrays: [doodleEffectMatchData.relationships, doodleEffectMatchData.questions]
  },
  {
    method: "eighty-twenty-rule",
    labQuestionGroups: [eightyTwentyExperiment.questions],
    verificationQuestionGroups: [eightyTwentyMatchData.questions],
    requiredLabArrays: [eightyTwentyExperiment.details, eightyTwentyExperiment.coreConcepts, eightyTwentyExperiment.questions],
    requiredVerificationArrays: [eightyTwentyMatchData.details, eightyTwentyMatchData.coreConcepts, eightyTwentyMatchData.questions]
  },
  {
    method: "divide-steps",
    labQuestionGroups: [divideStepsExperiment.questions],
    verificationQuestionGroups: [divideStepsMatchData.questions],
    requiredLabArrays: [divideStepsExperiment.referenceSteps, divideStepsExperiment.questions],
    requiredVerificationArrays: [divideStepsMatchData.referenceSteps, divideStepsMatchData.questions]
  },
  {
    method: "derive-basics",
    labQuestionGroups: [deriveBasicsExperiment.questions],
    verificationQuestionGroups: [deriveBasicsMatchData.questions],
    requiredLabArrays: [deriveBasicsExperiment.basicPrinciples, deriveBasicsExperiment.questions],
    requiredVerificationArrays: [deriveBasicsMatchData.basicPrinciples, deriveBasicsMatchData.questions]
  }
];

const flatten = (
  groups: ContentCase["labQuestionGroups"]
) => groups.flatMap((group) => group);

describe("method training content", () => {
  it.each(contentCases)(
    "$method has valid objective questions",
    ({
      labQuestionGroups,
      verificationQuestionGroups
    }) => {
      const questions = [
        ...flatten(labQuestionGroups),
        ...flatten(verificationQuestionGroups)
      ];

      questions.forEach((question) => {
        expect(question.options.length).toBeGreaterThan(0);
        expect(question.options).toContain(
          question.correct
        );
        expect(
          question.options.filter(
            (option) =>
              option === question.correct
          )
        ).toHaveLength(1);
      });
    }
  );

  it.each(contentCases)(
    "$method has unique, non-overlapping question IDs",
    ({
      labQuestionGroups,
      verificationQuestionGroups
    }) => {
      const labIds = flatten(
        labQuestionGroups
      ).map(({ id }) => id);
      const verificationIds = flatten(
        verificationQuestionGroups
      ).map(({ id }) => id);

      expect(new Set(labIds).size).toBe(
        labIds.length
      );
      expect(new Set(verificationIds).size).toBe(
        verificationIds.length
      );
      expect(
        labIds.filter((id) =>
          verificationIds.includes(id)
        )
      ).toEqual([]);
    }
  );

  it.each(contentCases)(
    "$method has all required content arrays",
    ({
      requiredLabArrays,
      requiredVerificationArrays
    }) => {
      [
        ...requiredLabArrays,
        ...requiredVerificationArrays
      ].forEach((content) => {
        expect(content.length).toBeGreaterThan(0);
      });
    }
  );
});
