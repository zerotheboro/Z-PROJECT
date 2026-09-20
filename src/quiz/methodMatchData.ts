export const activeRecallMatchData = {

  method: "active-recall" as const,

  title:
    "Active Recall · Round 2",

  topic:
    "Deep-sea adaptations",

  facts: [
    "Many deep-sea animals produce their own light through bioluminescence.",
    "Sunlight becomes extremely limited in the deep ocean.",
    "Some deep-sea animals have very large eyes to detect small amounts of light.",
    "Many species have slow metabolisms because food is scarce.",
    "Some fish have expandable stomachs that allow them to eat large prey.",
    "High water pressure is one of the major environmental challenges of the deep sea."
  ],

  questions: [
    {
      id: "arm1",

      question:
        "What is bioluminescence?",

      options: [
        "The production of light by an organism",
        "The reflection of sunlight",
        "A way animals produce oxygen",
        "The movement of ocean currents"
      ],

      correct:
        "The production of light by an organism"
    },

    {
      id: "arm2",

      question:
        "Why do some deep-sea animals have large eyes?",

      options: [
        "To detect very small amounts of light",
        "To reduce water pressure",
        "To store more energy",
        "To breathe underwater"
      ],

      correct:
        "To detect very small amounts of light"
    },

    {
      id: "arm3",

      question:
        "Why do many deep-sea species have slow metabolisms?",

      options: [
        "Food can be scarce",
        "The water contains too much oxygen",
        "They receive too much sunlight",
        "They constantly swim at high speed"
      ],

      correct:
        "Food can be scarce"
    },

    {
      id: "arm4",

      question:
        "What major physical challenge exists in the deep ocean?",

      options: [
        "High water pressure",
        "Low gravity",
        "Extremely dry air",
        "Constant wind"
      ],

      correct:
        "High water pressure"
    }
  ]
};

export const feynmanMatchData = {

  method: "feynman" as const,

  title:
    "Feynman · Round 2",

  topic:
    "Why do we have seasons?",

  explanation: `
Earth's seasons are mainly caused by the tilt of Earth's axis,
not by major changes in Earth's distance from the Sun.

Earth's axis is tilted by about 23.5 degrees.

As Earth travels around the Sun, one hemisphere is tilted
more toward the Sun while the other is tilted away.

The hemisphere tilted toward the Sun receives more direct
sunlight and longer days, producing warmer conditions.

About six months later, the situation is reversed.
  `,

  questions: [
    {
      id: "fym1",

      question:
        "What mainly causes Earth's seasons?",

      options: [
        "The tilt of Earth's axis",
        "Large changes in Earth's distance from the Sun",
        "Changes in the Moon",
        "Changes in Earth's rotation speed"
      ],

      correct:
        "The tilt of Earth's axis"
    },

    {
      id: "fym2",

      question:
        "What happens when a hemisphere is tilted toward the Sun?",

      options: [
        "It receives more direct sunlight and generally longer days",
        "It moves significantly closer to the Sun",
        "Its gravity becomes weaker",
        "It stops rotating"
      ],

      correct:
        "It receives more direct sunlight and generally longer days"
    },

    {
      id: "fym3",

      question:
        "Why are the seasons opposite in the Northern and Southern Hemispheres?",

      options: [
        "When one tilts toward the Sun, the other tilts away",
        "The hemispheres orbit the Sun separately",
        "Only one hemisphere rotates",
        "The Sun heats only one hemisphere each year"
      ],

      correct:
        "When one tilts toward the Sun, the other tilts away"
    }
  ]
};

export const cornellMatchData = {
  method: "cornell" as const,

  title: "Cornell Notes · Round 2",

  topic: "How volcanoes form",

  content: `
Magma is molten rock beneath Earth's surface.

Because magma is often less dense than the surrounding solid rock,
it can rise through cracks and weak areas in Earth's crust.

Sometimes magma collects in a magma chamber beneath the surface.

As more magma and gases accumulate, pressure can increase.

If the pressure becomes strong enough, magma may move upward through
a vent and erupt at the surface.

Once magma reaches the surface, it is called lava.

Repeated eruptions can gradually build layers of lava and other
volcanic material, forming a volcano.
  `,

  questions: [
    {
      id: "com1",
      question:
        "Why can magma rise through Earth's crust?",
      options: [
        "It can be less dense than surrounding rock",
        "It contains no mass",
        "Gravity pushes it upward",
        "The crust always moves downward"
      ],
      correct:
        "It can be less dense than surrounding rock"
    },

    {
      id: "com2",
      question:
        "What can happen as magma and gases accumulate underground?",
      options: [
        "Pressure can increase",
        "Gravity disappears",
        "The magma immediately becomes rock",
        "The crust stops existing"
      ],
      correct:
        "Pressure can increase"
    },

    {
      id: "com3",
      question:
        "What is magma called after it reaches Earth's surface?",
      options: [
        "Lava",
        "Sediment",
        "Steam",
        "Mantle"
      ],
      correct: "Lava"
    },

    {
      id: "com4",
      question:
        "How can repeated eruptions help form a volcano?",
      options: [
        "They build layers of volcanic material",
        "They remove all rock from the area",
        "They stop magma from rising",
        "They eliminate pressure underground"
      ],
      correct:
        "They build layers of volcanic material"
    }
  ]
};

export const interleavingMatchData = {
  method: "interleaving" as const,

  title: "Interleaving · Round 2",

  topic: "Mixed Problem Solving",

  instructions: [
    {
      type: "fraction",
      name: "Fractions",
      rule:
        "To add fractions with the same denominator, add the numerators and keep the denominator.",
      example:
        "2/7 + 3/7 = 5/7"
    },

    {
      type: "equation",
      name: "Multiplication Equation",
      rule:
        "Divide both sides by the number multiplying x.",
      example:
        "3x = 18 → x = 6"
    },

    {
      type: "perimeter",
      name: "Rectangle Perimeter",
      rule:
        "Add all four sides, or use 2 × (length + width).",
      example:
        "Length 5, width 3 → perimeter = 16"
    }
  ],

  practice: [
    {
      id: "imp1",
      question:
        "What is 2/9 + 4/9?",
      options: [
        "6/9",
        "6/18",
        "2/9",
        "8/9"
      ],
      correct: "6/9"
    },

    {
      id: "imp2",
      question:
        "Solve: 4x = 24",
      options: [
        "6",
        "20",
        "28",
        "4"
      ],
      correct: "6"
    },

    {
      id: "imp3",
      question:
        "A rectangle has length 6 and width 2. What is its perimeter?",
      options: [
        "16",
        "12",
        "8",
        "24"
      ],
      correct: "16"
    },

    {
      id: "imp4",
      question:
        "What is 3/8 + 2/8?",
      options: [
        "5/8",
        "5/16",
        "1/8",
        "6/8"
      ],
      correct: "5/8"
    }
  ],

  test: [
    {
      id: "imt1",
      question:
        "Solve: 5x = 35",
      options: [
        "7",
        "30",
        "40",
        "5"
      ],
      correct: "7"
    },

    {
      id: "imt2",
      question:
        "A rectangle has length 7 and width 4. What is its perimeter?",
      options: [
        "22",
        "28",
        "11",
        "18"
      ],
      correct: "22"
    },

    {
      id: "imt3",
      question:
        "What is 1/6 + 4/6?",
      options: [
        "5/6",
        "5/12",
        "3/6",
        "4/6"
      ],
      correct: "5/6"
    },

    {
      id: "imt4",
      question:
        "Solve: 6x = 48",
      options: [
        "8",
        "42",
        "54",
        "6"
      ],
      correct: "8"
    }
  ]
};

export const memoryPalaceMatchData = {
  method: "memory-palace" as const,

  title: "Memory Palace · Round 2",

  topic: "Remembering scientific instruments",

  locations: [
    "Front gate",
    "Hallway",
    "Dining table",
    "Bookshelf",
    "Window"
  ],

  pairings: [
    {
      location: "Front gate",
      item: "Microscope"
    },
    {
      location: "Hallway",
      item: "Thermometer"
    },
    {
      location: "Dining table",
      item: "Barometer"
    },
    {
      location: "Bookshelf",
      item: "Telescope"
    },
    {
      location: "Window",
      item: "Compass"
    }
  ],

  questions: [
    {
      id: "mpm1",
      question:
        "Which item was placed at the front gate?",
      options: [
        "Microscope",
        "Compass",
        "Telescope",
        "Barometer"
      ],
      correct: "Microscope"
    },

    {
      id: "mpm2",
      question:
        "Which item was placed in the hallway?",
      options: [
        "Thermometer",
        "Microscope",
        "Compass",
        "Barometer"
      ],
      correct: "Thermometer"
    },

    {
      id: "mpm3",
      question:
        "Which item was placed on the dining table?",
      options: [
        "Barometer",
        "Telescope",
        "Thermometer",
        "Compass"
      ],
      correct: "Barometer"
    },

    {
      id: "mpm4",
      question:
        "Which item was associated with the bookshelf?",
      options: [
        "Telescope",
        "Compass",
        "Microscope",
        "Thermometer"
      ],
      correct: "Telescope"
    },

    {
      id: "mpm5",
      question:
        "Which item was placed at the window?",
      options: [
        "Compass",
        "Barometer",
        "Telescope",
        "Microscope"
      ],
      correct: "Compass"
    }
  ]
};