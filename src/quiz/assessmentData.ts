import type {
  LearningSituationQuestion
} from "./type.ts";

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
};

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
};