import type {
  LearningSituationQuestion
} from "./type.ts";

import type {
  MultipleChoiceQuestion
} from "./methodEngineTypes";

export type BaselineMemoryContentSet = {
  id: string;
  title: string;
  studyTime: number;
  facts: readonly string[];
  questions:
    readonly MultipleChoiceQuestion[];
};

export type BaselineConceptContentSet = {
  id: string;
  title: string;
  studyTime: number;
  explanation: string;
  questions:
    readonly MultipleChoiceQuestion[];
};

export const learningSituationQuestions:
  LearningSituationQuestion[] = [

  {
    id: "goal",
    type: "single",
    question:
      "What are you trying to achieve right now?",
    options: [
      {
        value: "remember-longer",
        label: "Remember information for longer"
      },
      {
        value: "understand-concepts",
        label: "Understand difficult concepts"
      },
      {
        value: "exam-preparation",
        label: "Prepare for an exam"
      },
      {
        value: "problem-solving",
        label: "Solve problems more effectively"
      },
      {
        value: "large-material",
        label: "Get through large amounts of material"
      },
      {
        value: "focus",
        label: "Stay focused and finish studying"
      },
      {
        value: "personal-learning",
        label: "Learn something for personal interest"
      }
    ]
  },

  {
    id: "difficulties",
    type: "multi",
    maxSelections: 2,
    question:
      "What usually causes you the most trouble?",
    options: [
      {
        value: "forgetting",
        label:
          "I understand things, but forget them later"
      },
      {
        value: "focus",
        label:
          "I lose focus quickly"
      },
      {
        value: "understanding",
        label:
          "I struggle to understand difficult ideas"
      },
      {
        value: "prioritization",
        label:
          "I don't know what information is important"
      },
      {
        value: "inefficiency",
        label:
          "I spend a lot of time but don't get much done"
      },
      {
        value: "starting",
        label:
          "I have trouble starting"
      },
      {
        value: "application",
        label:
          "I know the material but struggle to use it"
      },
      {
        value: "strategy",
        label:
          "I don't really know how to study effectively"
      }
    ]
  },

  {
    id: "contentTypes",
    type: "multi",
    maxSelections: 2,
    question:
      "What kind of material do you work with most?",
    options: [
      {
        value: "facts",
        label: "Facts, terms and definitions"
      },
      {
        value: "concepts",
        label:
          "Difficult concepts and explanations"
      },
      {
        value: "reading",
        label:
          "Long readings, textbooks or articles"
      },
      {
        value: "problems",
        label:
          "Maths and calculation problems"
      },
      {
        value: "essays",
        label:
          "Essay-based subjects"
      },
      {
        value: "mixed",
        label:
          "Mixed subjects"
      }
    ]
  },

  {
    id: "currentApproach",
    type: "single",
    question:
      "What normally happens when you study?",
    options: [
      {
        value: "rereading",
        label: "I mostly reread or highlight"
      },
      {
        value: "notes",
        label: "I make notes"
      },
      {
        value: "self-testing",
        label: "I test myself"
      },
      {
        value: "practice",
        label: "I practise questions"
      },
      {
        value: "mixed",
        label:
          "I switch between several approaches"
      },
      {
        value: "none",
        label:
          "I don't have a consistent approach"
      }
    ]
  },

  {
    id: "sessionLength",
    type: "single",
    question:
      "How much time do you usually have for one study session?",
    options: [
      {
        value: "under-20",
        label: "Less than 20 minutes"
      },
      {
        value: "20-45",
        label: "20–45 minutes"
      },
      {
        value: "45-90",
        label: "45–90 minutes"
      },
      {
        value: "90-plus",
        label: "More than 90 minutes"
      },
      {
        value: "variable",
        label: "It varies a lot"
      }
    ]
  },

  {
    id: "learningContext",
    type: "single",
    question:
      "What are you mainly learning for?",
    options: [
      {
        value: "school",
        label: "School"
      },
      {
        value: "university",
        label: "University"
      },
      {
        value: "professional",
        label:
          "Professional or work-related learning"
      },
      {
        value: "qualification",
        label:
          "A qualification or external exam"
      },
      {
        value: "personal",
        label: "Personal learning"
      },
      {
        value: "mixed",
        label: "A mixture"
      }
    ]
  }
];

export const baselineMemoryContent = {
  id: "baseline-memory-01",

  title: "Meet Europa",

  studyTime: 30,

  facts: [
    "Europa is one of Jupiter's largest moons.",
    "Its surface is mostly covered in water ice.",
    "Scientists think a salty ocean may exist beneath its icy surface.",
    "Europa completes an orbit around Jupiter in about 3.5 Earth days.",
    "Its surface contains long cracks and ridges.",
    "Europa is slightly smaller than Earth's Moon."
  ],

  questions: [
    {
      id: "bm1",
      question: "What planet does Europa orbit?",
      options: [
        "Jupiter",
        "Saturn",
        "Mars",
        "Neptune"
      ],
      correct: "Jupiter"
    },

    {
      id: "bm2",
      question:
        "What is Europa's surface mainly covered with?",
      options: [
        "Water ice",
        "Liquid water",
        "Rock",
        "Frozen carbon dioxide"
      ],
      correct: "Water ice"
    },

    {
      id: "bm3",
      question:
        "What may exist beneath Europa's surface?",
      options: [
        "A salty ocean",
        "A liquid iron layer",
        "A dense atmosphere",
        "Large forests"
      ],
      correct: "A salty ocean"
    },

    {
      id: "bm4",
      question:
        "Approximately how long does Europa take to orbit Jupiter?",
      options: [
        "3.5 Earth days",
        "24 hours",
        "30 Earth days",
        "1 Earth year"
      ],
      correct: "3.5 Earth days"
    }
  ]
} satisfies BaselineMemoryContentSet;

const emperorPenguinMemoryContent = {
  id: "baseline-memory-02",
  title: "Emperor penguin survival",
  studyTime: 30,
  facts: [
    "Emperor penguins live around Antarctica and breed on sea ice during winter.",
    "The female lays a single egg and transfers it to the male.",
    "The male balances the egg on his feet beneath a warm fold of skin called a brood pouch.",
    "Males huddle closely together to reduce heat loss during severe weather.",
    "The female feeds at sea before returning to the colony.",
    "Parents feed their chick by regurgitating food they collected at sea."
  ],
  questions: [
    {
      id: "bm-penguin-1",
      question:
        "Where do emperor penguins breed during the Antarctic winter?",
      options: [
        "On sea ice",
        "In forest nests",
        "On tropical beaches",
        "Inside freshwater caves"
      ],
      correct: "On sea ice"
    },
    {
      id: "bm-penguin-2",
      question:
        "Where does the male keep the egg while incubating it?",
      options: [
        "On his feet beneath a brood pouch",
        "Under the sea ice",
        "Inside a nest made from branches",
        "Between rocks at the shoreline"
      ],
      correct:
        "On his feet beneath a brood pouch"
    },
    {
      id: "bm-penguin-3",
      question:
        "Why do male emperor penguins huddle together?",
      options: [
        "To reduce heat loss",
        "To build a shared nest",
        "To search for fish",
        "To make the ice melt"
      ],
      correct: "To reduce heat loss"
    },
    {
      id: "bm-penguin-4",
      question:
        "How do emperor penguin parents feed their chick?",
      options: [
        "By regurgitating food collected at sea",
        "By bringing it seaweed",
        "By teaching it to hunt immediately",
        "By feeding it pieces of ice"
      ],
      correct:
        "By regurgitating food collected at sea"
    }
  ]
} satisfies BaselineMemoryContentSet;

const octopusMemoryContent = {
  id: "baseline-memory-03",
  title: "Octopus adaptations",
  studyTime: 30,
  facts: [
    "An octopus has three hearts.",
    "Two hearts pump blood through the gills, while one pumps it around the rest of the body.",
    "Octopus blood appears blue because it uses a copper-containing protein called hemocyanin.",
    "Special skin cells called chromatophores help an octopus change its appearance.",
    "A large share of an octopus's neurons are located in its arms.",
    "Without a rigid skeleton, an octopus can squeeze through narrow openings."
  ],
  questions: [
    {
      id: "bm-octopus-1",
      question:
        "How many hearts does an octopus have?",
      options: [
        "Three",
        "One",
        "Two",
        "Four"
      ],
      correct: "Three"
    },
    {
      id: "bm-octopus-2",
      question:
        "What do two of an octopus's hearts pump blood through?",
      options: [
        "The gills",
        "The arms only",
        "The skin",
        "The eyes"
      ],
      correct: "The gills"
    },
    {
      id: "bm-octopus-3",
      question:
        "Why does octopus blood appear blue?",
      options: [
        "It contains hemocyanin",
        "It absorbs seawater",
        "It contains chlorophyll",
        "It has no oxygen-carrying protein"
      ],
      correct: "It contains hemocyanin"
    },
    {
      id: "bm-octopus-4",
      question:
        "What helps an octopus change its appearance?",
      options: [
        "Chromatophores in its skin",
        "A rigid outer shell",
        "Feathers around its body",
        "Air stored in its arms"
      ],
      correct:
        "Chromatophores in its skin"
    }
  ]
} satisfies BaselineMemoryContentSet;

export const baselineMemoryContentSets = [
  baselineMemoryContent,
  emperorPenguinMemoryContent,
  octopusMemoryContent
] as const satisfies
  readonly BaselineMemoryContentSet[];

export const baselineConceptContent = {
  id: "baseline-concept-01",

  title: "Why does ice float?",

  studyTime: 35,

  explanation: `
    Most substances become denser when they freeze,
    but water behaves differently.

    When water freezes, its molecules form an open
    crystal structure that keeps them farther apart.

    This means the same amount of water occupies more
    space as ice and becomes less dense than liquid water.

    Because the ice is less dense than the water around it,
    it floats.
  `,

  questions: [
    {
      id: "bc1",

      question:
        "Why does ice float on liquid water?",

      options: [
        "Ice is less dense than liquid water",
        "Ice contains no molecules",
        "Liquid water pushes everything upward",
        "Ice becomes heavier when frozen"
      ],

      correct:
        "Ice is less dense than liquid water"
    },

    {
      id: "bc2",

      question:
        "Why does frozen water become less dense?",

      options: [
        "Its molecules form a more open structure",
        "Its molecules disappear",
        "Its molecules become heavier",
        "Its molecules collapse closer together"
      ],

      correct:
        "Its molecules form a more open structure"
    },

    {
      id: "bc3",

      question:
        "If freezing forced water molecules closer together instead, what would most likely happen?",

      options: [
        "The solid could become denser and sink",
        "The solid would contain no mass",
        "The water would stop freezing",
        "Density would no longer matter"
      ],

      correct:
        "The solid could become denser and sink"
    }
  ]
} satisfies BaselineConceptContentSet;

const seasonsConceptContent = {
  id: "baseline-concept-02",
  title: "Why do seasons change?",
  studyTime: 35,
  explanation: `
    Earth's axis is tilted relative to its path around
    the Sun.

    As Earth orbits the Sun, each hemisphere alternately
    tilts toward or away from the Sun.

    A hemisphere tilted toward the Sun receives more direct
    sunlight and has longer days, producing warmer conditions.

    At the same time, the opposite hemisphere receives less
    direct sunlight and has shorter days. The seasons are not
    primarily caused by changes in Earth's distance from the Sun.
  `,
  questions: [
    {
      id: "bc-seasons-1",
      question:
        "What is the main reason Earth experiences seasons?",
      options: [
        "Earth's axis is tilted as Earth orbits the Sun",
        "Earth repeatedly moves much closer to the Sun",
        "The Sun changes size during the year",
        "Clouds permanently move between hemispheres"
      ],
      correct:
        "Earth's axis is tilted as Earth orbits the Sun"
    },
    {
      id: "bc-seasons-2",
      question:
        "What happens when a hemisphere is tilted toward the Sun?",
      options: [
        "It receives more direct sunlight and has longer days",
        "It receives no sunlight",
        "Its oceans stop absorbing energy",
        "Its distance from the Sun doubles"
      ],
      correct:
        "It receives more direct sunlight and has longer days"
    },
    {
      id: "bc-seasons-3",
      question:
        "If the Northern Hemisphere is tilted toward the Sun, what is happening in the Southern Hemisphere?",
      options: [
        "It is tilted away and receives less direct sunlight",
        "It is also tilted toward the Sun",
        "It has no day-and-night cycle",
        "It becomes permanently colder"
      ],
      correct:
        "It is tilted away and receives less direct sunlight"
    }
  ]
} satisfies BaselineConceptContentSet;

const dewConceptContent = {
  id: "baseline-concept-03",
  title: "Why does dew form?",
  studyTime: 35,
  explanation: `
    Surfaces such as grass can lose heat during the night
    and become cooler than the surrounding air.

    Air touching a cool surface also cools. Cooler air can
    hold less water vapor than warmer air.

    If that air reaches its dew point, some water vapor
    condenses into liquid droplets on the surface.

    This is why dew often appears after clear, calm nights
    that allow surfaces to cool effectively.
  `,
  questions: [
    {
      id: "bc-dew-1",
      question:
        "What happens to air that touches a sufficiently cool surface?",
      options: [
        "The air cools",
        "The air loses all its gases",
        "The air immediately becomes warmer",
        "The air stops containing water vapor"
      ],
      correct: "The air cools"
    },
    {
      id: "bc-dew-2",
      question:
        "What occurs when the nearby air reaches its dew point?",
      options: [
        "Water vapor condenses into liquid droplets",
        "Liquid water turns into sunlight",
        "The surface begins producing water",
        "All moisture disappears from the air"
      ],
      correct:
        "Water vapor condenses into liquid droplets"
    },
    {
      id: "bc-dew-3",
      question:
        "Why can a clear, calm night encourage dew formation?",
      options: [
        "It allows surfaces to cool effectively",
        "It prevents surfaces from losing heat",
        "It removes all water vapor",
        "It keeps grass warmer than the air"
      ],
      correct:
        "It allows surfaces to cool effectively"
    }
  ]
} satisfies BaselineConceptContentSet;

export const baselineConceptContentSets = [
  baselineConceptContent,
  seasonsConceptContent,
  dewConceptContent
] as const satisfies
  readonly BaselineConceptContentSet[];
