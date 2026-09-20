export const activeRecallExperiment = {
  method: "active-recall" as const,

  category: "memory" as const,

  title: "Active Recall",

  topic: "Honeybee Communication",

  studyTime: 30,

  retrievalTime: 30,

  facts: [
    "Honeybees can communicate the location of food through movement.",
    "The waggle dance is used when food is farther from the hive.",
    "The direction of the dance helps indicate the direction of the food.",
    "The duration of the waggle portion gives information about distance.",
    "Bees also use scent to help identify food sources.",
    "The dance usually takes place inside the hive."
  ],

  questions: [
    {
      id: "ar1",

      question:
        "What behavior can honeybees use to communicate the location of food?",

      options: [
        "A waggle dance",
        "Changing wing color",
        "Building a second hive",
        "Sleeping near the food"
      ],

      correct: "A waggle dance"
    },

    {
      id: "ar2",

      question:
        "What does the direction of the waggle dance help communicate?",

      options: [
        "The direction of the food",
        "The age of the bee",
        "The size of the hive",
        "The temperature outside"
      ],

      correct:
        "The direction of the food"
    },

    {
      id: "ar3",

      question:
        "What can the duration of the waggle portion communicate?",

      options: [
        "Distance to the food",
        "Number of bees in the hive",
        "Age of the queen",
        "Amount of honey already stored"
      ],

      correct:
        "Distance to the food"
    },

    {
      id: "ar4",

      question:
        "What additional cue can bees use when identifying food sources?",

      options: [
        "Scent",
        "Written symbols",
        "Color changes in their wings",
        "Changes in hive shape"
      ],

      correct: "Scent"
    }
  ]
};

export const feynmanExperiment = {
  method: "feynman" as const,

  category: "understanding" as const,

  title: "Feynman Technique",

  topic: "Why do metal objects feel colder than wood?",

  studyTime: 35,

  explanation: `
Metal and wood in the same room are usually at roughly
the same temperature.

However, metal often feels colder because it conducts heat
much faster than wood.

When you touch metal, heat moves quickly from your warm hand
into the metal.

Wood transfers heat much more slowly, so your hand loses
heat less quickly.

Your skin senses this faster loss of heat as feeling colder.
  `,

  questions: [
    {
      id: "fy1",

      question:
        "Why can metal feel colder than wood even when both are at the same room temperature?",

      options: [
        "Metal removes heat from your hand faster",
        "Metal always has a lower temperature",
        "Wood produces heat",
        "Metal contains cold energy"
      ],

      correct:
        "Metal removes heat from your hand faster"
    },

    {
      id: "fy2",

      question:
        "What property mainly explains the difference?",

      options: [
        "Thermal conductivity",
        "Mass",
        "Color",
        "Shape"
      ],

      correct:
        "Thermal conductivity"
    },

    {
      id: "fy3",

      question:
        "If another material transferred heat even faster than metal, how would it probably feel at the same temperature?",

      options: [
        "Even colder to the touch",
        "Warmer than your hand",
        "Exactly like wood",
        "Temperature would become irrelevant"
      ],

      correct:
        "Even colder to the touch"
    },

    {
      id: "fy4",

      question:
        "Why does wood usually feel less cold?",

      options: [
        "Heat leaves your hand more slowly",
        "Wood is always warmer than the room",
        "Wood creates heat when touched",
        "Wood stops heat from existing"
      ],

      correct:
        "Heat leaves your hand more slowly"
    }
  ]
};

export const cornellExperiment = {
  method: "cornell" as const,

  category: "organization" as const,

  title: "Cornell Notes",

  topic: "How earthquakes happen",

  content: `
Earth's outer layer is divided into large pieces called tectonic plates.

These plates move very slowly. Where two plates meet, their movement can cause
rocks along a fault to become stuck because of friction.

Even though the rocks are stuck, the plates continue moving and stress builds
inside the rock.

Eventually the stress becomes greater than the friction holding the rocks in
place. The rocks suddenly move along the fault and release stored energy.

This energy travels through Earth as seismic waves. When these waves reach the
surface, they cause the shaking we experience as an earthquake.

The point underground where the movement begins is called the focus. The point
on Earth's surface directly above it is called the epicenter.
  `,

  questions: [
    {
      id: "co1",
      question:
        "Why can stress build along a fault?",
      options: [
        "The plates continue moving while rocks are temporarily stuck",
        "Tectonic plates completely stop moving",
        "Seismic waves prevent the rocks from moving",
        "The epicenter pulls the plates together"
      ],
      correct:
        "The plates continue moving while rocks are temporarily stuck"
    },

    {
      id: "co2",
      question:
        "What happens when accumulated stress overcomes friction?",
      options: [
        "The rocks suddenly move along the fault",
        "The tectonic plates disappear",
        "The epicenter moves underground",
        "The rocks permanently stop storing energy"
      ],
      correct:
        "The rocks suddenly move along the fault"
    },

    {
      id: "co3",
      question:
        "How does released earthquake energy travel through Earth?",
      options: [
        "As seismic waves",
        "As tectonic plates",
        "As atmospheric pressure",
        "As ocean currents"
      ],
      correct:
        "As seismic waves"
    },

    {
      id: "co4",
      question:
        "What is the epicenter?",
      options: [
        "The surface point directly above the earthquake focus",
        "The underground point where movement begins",
        "The boundary of every tectonic plate",
        "The strongest seismic wave"
      ],
      correct:
        "The surface point directly above the earthquake focus"
    }
  ]
};

export const interleavingExperiment = {
  method: "interleaving" as const,

  category: "problem-solving" as const,

  title: "Interleaving",

  topic: "Mixed Problem Solving",

  instructions: [
    {
      type: "percentage",
      name: "Percentage",
      rule:
        "To find a percentage of an amount, multiply the amount by the percentage written as a decimal.",
      example: "20% of 50 = 0.20 × 50 = 10"
    },

    {
      type: "mean",
      name: "Mean",
      rule:
        "To calculate the mean, add all the values and divide by the number of values.",
      example: "Mean of 4, 6, 8 = 18 ÷ 3 = 6"
    },

    {
      type: "equation",
      name: "Simple Equation",
      rule:
        "Undo the operation applied to x to isolate x.",
      example: "x + 5 = 12 → x = 7"
    }
  ],

  practice: [
    {
      id: "ip1",
      type: "percentage",
      question: "What is 25% of 80?",
      options: ["20", "25", "40", "60"],
      correct: "20"
    },

    {
      id: "ip2",
      type: "equation",
      question: "Solve: x + 7 = 15",
      options: ["8", "7", "22", "6"],
      correct: "8"
    },

    {
      id: "ip3",
      type: "mean",
      question: "What is the mean of 5, 7 and 9?",
      options: ["7", "6", "8", "21"],
      correct: "7"
    },

    {
      id: "ip4",
      type: "percentage",
      question: "What is 10% of 70?",
      options: ["7", "10", "17", "63"],
      correct: "7"
    },

    {
      id: "ip5",
      type: "mean",
      question: "What is the mean of 4, 8 and 12?",
      options: ["8", "6", "12", "24"],
      correct: "8"
    },

    {
      id: "ip6",
      type: "equation",
      question: "Solve: x + 9 = 20",
      options: ["11", "9", "29", "10"],
      correct: "11"
    }
  ],

  test: [
    {
      id: "it1",
      question: "What is 30% of 90?",
      options: ["27", "30", "60", "63"],
      correct: "27"
    },

    {
      id: "it2",
      question: "Solve: x + 6 = 19",
      options: ["13", "25", "12", "6"],
      correct: "13"
    },

    {
      id: "it3",
      question: "What is the mean of 6, 10 and 14?",
      options: ["10", "12", "30", "8"],
      correct: "10"
    },

    {
      id: "it4",
      question: "What is 15% of 60?",
      options: ["9", "15", "45", "6"],
      correct: "9"
    }
  ]
};

export const memoryPalaceExperiment = {
  method: "memory-palace" as const,

  category: "memory" as const,

  title: "Memory Palace",

  topic: "Remembering a sequence of discoveries",

  locations: [
    "Front door",
    "Sofa",
    "Kitchen table",
    "Bathroom mirror",
    "Bed"
  ],

  items: [
    "Compass",
    "Telescope",
    "Steam engine",
    "Telephone",
    "Airplane"
  ],

  pairings: [
    {
      location: "Front door",
      item: "Compass"
    },
    {
      location: "Sofa",
      item: "Telescope"
    },
    {
      location: "Kitchen table",
      item: "Steam engine"
    },
    {
      location: "Bathroom mirror",
      item: "Telephone"
    },
    {
      location: "Bed",
      item: "Airplane"
    }
  ],

  questions: [
    {
      id: "mp1",
      question:
        "Which item was placed at the front door?",
      options: [
        "Compass",
        "Telephone",
        "Airplane",
        "Telescope"
      ],
      correct: "Compass"
    },

    {
      id: "mp2",
      question:
        "Which item was placed on the sofa?",
      options: [
        "Telescope",
        "Compass",
        "Steam engine",
        "Airplane"
      ],
      correct: "Telescope"
    },

    {
      id: "mp3",
      question:
        "Which item was placed on the kitchen table?",
      options: [
        "Steam engine",
        "Telephone",
        "Compass",
        "Telescope"
      ],
      correct: "Steam engine"
    },

    {
      id: "mp4",
      question:
        "Which item was associated with the bathroom mirror?",
      options: [
        "Telephone",
        "Airplane",
        "Steam engine",
        "Compass"
      ],
      correct: "Telephone"
    },

    {
      id: "mp5",
      question:
        "Which item was placed on the bed?",
      options: [
        "Airplane",
        "Compass",
        "Telescope",
        "Telephone"
      ],
      correct: "Airplane"
    }
  ]
};