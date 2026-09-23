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

export const activeBlurtingMatchData = {
  method: "active-blurting" as const,
  title: "Active Blurting Â· Round 2",
  topic: "How wetlands protect ecosystems",
  facts: [
    "Wetlands are areas where water covers the soil or remains near the surface for part of the year.",
    "Wetland plants can slow moving water and trap sediment.",
    "Wetlands can absorb and temporarily store excess water during heavy rain.",
    "Microorganisms and plants in wetlands can remove some nutrients and pollutants from water.",
    "Wetlands provide breeding and feeding habitats for fish, birds, amphibians, and insects.",
    "Draining or filling wetlands can reduce flood protection and wildlife habitat."
  ],
  questions: [
    {
      id: "abm1",
      question:
        "How can wetlands reduce the impact of heavy rain?",
      options: [
        "They absorb and temporarily store excess water",
        "They prevent all rain from reaching the ground",
        "They permanently remove rivers",
        "They increase the speed of runoff"
      ],
      correct: "They absorb and temporarily store excess water"
    },
    {
      id: "abm2",
      question:
        "What can wetland plants do to moving water?",
      options: [
        "Slow it and trap sediment",
        "Turn it into salt water",
        "Stop evaporation everywhere",
        "Remove all organisms from it"
      ],
      correct: "Slow it and trap sediment"
    },
    {
      id: "abm3",
      question:
        "How can wetlands improve water quality?",
      options: [
        "Plants and microorganisms remove some nutrients and pollutants",
        "They replace water with dry soil",
        "They prevent microorganisms from living",
        "They add sediment to every water source"
      ],
      correct: "Plants and microorganisms remove some nutrients and pollutants"
    },
    {
      id: "abm4",
      question:
        "What is one likely effect of draining wetlands?",
      options: [
        "Reduced flood protection and wildlife habitat",
        "More habitat for wetland species",
        "Complete prevention of runoff",
        "Permanent improvement of water quality"
      ],
      correct: "Reduced flood protection and wildlife habitat"
    }
  ]
};

export const oneSentenceMatchData = {
  method: "one-sentence" as const,
  title: "1 SENTENCE Â· ROUND 2",
  topic: "How greenhouse gases warm Earth",
  explanation: `
Sunlight passes through the atmosphere and warms Earth's surface.

The warm surface releases some of that energy as infrared radiation.

Greenhouse gases absorb and re-emit part of this outgoing infrared
energy, slowing the rate at which heat escapes to space.

This natural greenhouse effect keeps Earth warm enough for life, but
increasing greenhouse-gas concentrations strengthens the effect and
raises average temperatures.
  `,
  questions: [
    {
      id: "osm1",
      question:
        "What energy do greenhouse gases absorb and re-emit?",
      options: [
        "Outgoing infrared radiation",
        "All incoming visible sunlight",
        "Sound waves from Earth's surface",
        "Energy from ocean tides only"
      ],
      correct: "Outgoing infrared radiation"
    },
    {
      id: "osm2",
      question:
        "How do greenhouse gases affect heat loss to space?",
      options: [
        "They slow the rate at which heat escapes",
        "They stop Earth from absorbing sunlight",
        "They make the surface release no energy",
        "They reflect all heat directly into space"
      ],
      correct: "They slow the rate at which heat escapes"
    },
    {
      id: "osm3",
      question:
        "What happens when greenhouse-gas concentrations increase?",
      options: [
        "The greenhouse effect strengthens and average temperatures rise",
        "The natural greenhouse effect disappears",
        "Earth receives no sunlight",
        "Infrared radiation changes into gravity"
      ],
      correct: "The greenhouse effect strengthens and average temperatures rise"
    }
  ]
};

export const noteTaking4x4MatchData = {
  method: "note-taking-4x4" as const,
  title: "NOTE-TAKING 4X4 Â· ROUND 2",
  topic: "The four main layers of a rainforest",
  content: `
Tropical rainforests can be organized into four main vertical layers.

The emergent layer contains the tallest trees, which receive intense
sunlight and face strong winds. Below it, the canopy forms a dense roof
of leaves and supports a large share of rainforest wildlife.

The understory receives limited sunlight and contains smaller trees,
shrubs, and plants adapted to shade. The forest floor is the darkest
layer, where decomposers rapidly break down fallen organic material and
return nutrients to the soil.
  `,
  questions: [
    {
      id: "nt4m1",
      question:
        "Which rainforest layer contains the tallest trees?",
      options: [
        "The emergent layer",
        "The canopy",
        "The understory",
        "The forest floor"
      ],
      correct: "The emergent layer"
    },
    {
      id: "nt4m2",
      question:
        "Why is the canopy important to rainforest wildlife?",
      options: [
        "Its dense roof of leaves supports many animals",
        "It is the darkest layer",
        "It contains no plant life",
        "It receives less light than the forest floor"
      ],
      correct: "Its dense roof of leaves supports many animals"
    },
    {
      id: "nt4m3",
      question:
        "What characterizes many understory plants?",
      options: [
        "They are adapted to limited sunlight",
        "They grow above every emergent tree",
        "They receive constant strong winds",
        "They do not require water"
      ],
      correct: "They are adapted to limited sunlight"
    },
    {
      id: "nt4m4",
      question:
        "What important process occurs on the forest floor?",
      options: [
        "Decomposers return nutrients to the soil",
        "The tallest trees capture the strongest winds",
        "Most sunlight is stored permanently",
        "Leaves form the rainforest canopy"
      ],
      correct: "Decomposers return nutrients to the soil"
    }
  ]
};

export const leitnerSystemMatchData = {
  method: "leitner-system" as const,
  title: "LEITNER SYSTEM · ROUND 2",
  topic: "Core functions of blood components",
  cards: [
    { id: "lsmc1", front: "Red blood cells", back: "Transport oxygen using hemoglobin." },
    { id: "lsmc2", front: "White blood cells", back: "Help defend the body against infection." },
    { id: "lsmc3", front: "Platelets", back: "Help blood clot after an injury." },
    { id: "lsmc4", front: "Plasma", back: "Carries blood cells, nutrients, hormones, and wastes." }
  ],
  practice: [
    { id: "lsmp1", question: "Which component transports oxygen?", options: ["Red blood cells", "Platelets", "Plasma", "White blood cells"], correct: "Red blood cells" },
    { id: "lsmp2", question: "Which component helps fight infection?", options: ["White blood cells", "Plasma", "Platelets", "Red blood cells"], correct: "White blood cells" },
    { id: "lsmp3", question: "Which component helps form clots?", options: ["Platelets", "Plasma", "Red blood cells", "White blood cells"], correct: "Platelets" },
    { id: "lsmp4", question: "Which component carries nutrients and hormones?", options: ["Plasma", "Platelets", "White blood cells", "Red blood cells"], correct: "Plasma" }
  ],
  test: [
    { id: "lsmt1", question: "A patient has difficulty forming blood clots; which component may be low?", options: ["Platelets", "Plasma", "Red blood cells", "White blood cells"], correct: "Platelets" },
    { id: "lsmt2", question: "Which pairing is correct?", options: ["White blood cells — defense against infection", "Platelets — oxygen transport", "Plasma — blood clotting only", "Red blood cells — hormone production"], correct: "White blood cells — defense against infection" },
    { id: "lsmt3", question: "What is a major function of plasma?", options: ["Transporting dissolved materials and blood cells", "Producing all antibodies", "Carrying oxygen with hemoglobin", "Sealing wounds by itself"], correct: "Transporting dissolved materials and blood cells" }
  ]
};

export const storyTellingMatchData = {
  method: "story-telling" as const,
  title: "STORY TELLING · ROUND 2",
  topic: "The stages of a star like the Sun",
  orderedItems: [
    "Gas and dust gather in a nebula.",
    "Gravity forms a dense protostar.",
    "Fusion begins and a main-sequence star forms.",
    "The star expands into a red giant after core hydrogen declines.",
    "Outer layers drift away and the core remains as a white dwarf."
  ],
  questions: [
    { id: "stm1", question: "What forms before a main-sequence star?", options: ["A protostar", "A white dwarf", "A red giant", "A planet"], correct: "A protostar" },
    { id: "stm2", question: "What begins when a main-sequence star forms?", options: ["Nuclear fusion", "The loss of all gravity", "Planetary motion", "The immediate white-dwarf stage"], correct: "Nuclear fusion" },
    { id: "stm3", question: "What stage follows declining hydrogen in the core?", options: ["Red giant", "Nebula", "Protostar", "Main-sequence star"], correct: "Red giant" },
    { id: "stm4", question: "Which sequence is correct?", options: ["Nebula, protostar, main sequence, red giant, white dwarf", "Protostar, white dwarf, nebula, red giant, main sequence", "White dwarf, nebula, red giant, protostar, main sequence", "Red giant, nebula, main sequence, white dwarf, protostar"], correct: "Nebula, protostar, main sequence, red giant, white dwarf" }
  ]
};

export const captureCreateMatchData = {
  method: "capture-create" as const,
  title: "CAPTURE & CREATE · ROUND 2",
  topic: "Feedback loops",
  content: `A feedback loop occurs when the output of a system influences what happens next. Negative feedback counteracts change and helps stabilize a system, such as body-temperature regulation. Positive feedback reinforces change and pushes a process further in the same direction, such as contractions during childbirth. Recognizing the kind of loop helps explain how systems behave and how an intervention may affect them.`,
  questions: [
    { id: "ccm1", question: "What defines a feedback loop?", options: ["A system's output influences its later behavior", "A system never responds to its output", "Every process stops after one step", "Only outside forces can affect a system"], correct: "A system's output influences its later behavior" },
    { id: "ccm2", question: "Why does negative feedback matter?", options: ["It can stabilize a system by counteracting change", "It always accelerates change", "It removes every system input", "It prevents any response"], correct: "It can stabilize a system by counteracting change" },
    { id: "ccm3", question: "Which example is positive feedback?", options: ["Contractions that intensify further contractions", "Sweating that lowers body temperature", "A thermostat switching off heat", "Blood sugar returning toward normal"], correct: "Contractions that intensify further contractions" },
    { id: "ccm4", question: "When is the concept especially useful?", options: ["When predicting how a system responds to change", "Only when a system has no outputs", "When comparing unrelated definitions", "Only after a system permanently stops"], correct: "When predicting how a system responds to change" }
  ]
};

export const abbreviationMatchData = {
  method: "abbreviation" as const,
  title: "ABBREVIATION! · ROUND 2",
  topic: "The five Great Lakes",
  items: [
    "Huron",
    "Ontario",
    "Michigan",
    "Erie",
    "Superior"
  ],
  questions: [
    { id: "abbrm1", question: "Which lake is represented by the O in HOMES?", options: ["Ontario", "Erie", "Superior", "Michigan"], correct: "Ontario" },
    { id: "abbrm2", question: "Which lake is represented by the M in HOMES?", options: ["Michigan", "Huron", "Ontario", "Superior"], correct: "Michigan" },
    { id: "abbrm3", question: "Which option contains only Great Lakes?", options: ["Huron, Erie, Superior", "Huron, Tahoe, Erie", "Ontario, Victoria, Michigan", "Superior, Baikal, Erie"], correct: "Huron, Erie, Superior" },
    { id: "abbrm4", question: "What does HOMES help reconstruct?", options: ["Huron, Ontario, Michigan, Erie, Superior", "Hudson, Ohio, Maine, Erie, Saskatchewan", "Huron, Ottawa, Manitoba, Erie, Superior", "Huron, Ontario, Michigan, Everest, Superior"], correct: "Huron, Ontario, Michigan, Erie, Superior" }
  ]
};

export const headerFirstMatchData = {
  method: "header-first" as const,
  title: "HEADER FIRST · ROUND 2",
  topic: "How food moves from farms to consumers",
  sections: [
    { heading: "Production", content: "Farmers grow crops and raise animals while managing land, water, feed, and seasonal conditions." },
    { heading: "Processing", content: "Some foods are cleaned, transformed, preserved, or packaged to make them safe and practical to distribute." },
    { heading: "Distribution", content: "Warehouses and transport networks move food while controlling time and temperature when necessary." },
    { heading: "Retail and consumption", content: "Stores, markets, and food services make products available before consumers purchase and use them." }
  ],
  questions: [
    { id: "hfm1", question: "Which stage can transform and package food?", options: ["Processing", "Production", "Distribution", "Consumption only"], correct: "Processing" },
    { id: "hfm2", question: "Why might distribution control temperature?", options: ["To protect food quality and safety during transport", "To make farms produce faster", "To replace processing", "To eliminate retail stores"], correct: "To protect food quality and safety during transport" },
    { id: "hfm3", question: "Which heading would discuss warehouses and transport?", options: ["Distribution", "Production", "Processing", "Retail and consumption"], correct: "Distribution" },
    { id: "hfm4", question: "What sequence do the headers reveal?", options: ["Production through processing and distribution to consumption", "Consumption before production", "Four unrelated farming methods", "Retail followed by crop growth"], correct: "Production through processing and distribution to consumption" }
  ]
};

export const primeQuestionMatchData = {
  method: "prime-question" as const,
  title: "PRIME QUESTION · ROUND 2",
  topic: "How urban trees cool neighborhoods",
  guidingQuestion: "How do urban trees reduce heat through both shade and water movement?",
  material: `Tree canopies block part of the Sun's radiation from heating roads and buildings. Trees also draw water from the soil and release water vapor through transpiration. Evaporation during this process uses heat energy and cools the surrounding air. Groups of healthy trees can therefore reduce surface temperatures and local air temperatures, especially where paved surfaces would otherwise store substantial heat.`,
  questions: [
    { id: "pqm1", question: "How does a canopy directly reduce surface heating?", options: ["It blocks part of the Sun's radiation", "It produces cold pavement", "It removes every building", "It stops air movement"], correct: "It blocks part of the Sun's radiation" },
    { id: "pqm2", question: "Why does transpiration cool nearby air?", options: ["Evaporation uses heat energy", "Water vapor creates sunlight", "Roots reflect all radiation", "Leaves stop using water"], correct: "Evaporation uses heat energy" },
    { id: "pqm3", question: "Where can urban trees have especially strong value?", options: ["Areas with heat-storing paved surfaces", "Areas with no sunlight ever", "Only inside sealed buildings", "Places without soil or water"], correct: "Areas with heat-storing paved surfaces" },
    { id: "pqm4", question: "What complete answer fits the guiding question?", options: ["Trees shade surfaces and cool air through transpiration", "Trees cool only by changing road color", "Trees eliminate solar energy", "Trees cool only after losing all leaves"], correct: "Trees shade surfaces and cool air through transpiration" }
  ]
};

export const doodleEffectMatchData = {
  method: "doodle-effect" as const,
  title: "THE DOODLE EFFECT · ROUND 2",
  topic: "Relationships in the rock cycle",
  material: `Magma cools and solidifies into igneous rock. Weathering and erosion break exposed rock into sediment. Compaction and cementation turn sediment into sedimentary rock. Heat and pressure can transform existing rock into metamorphic rock. If any rock melts, it becomes magma, while uplift can expose buried rock to weathering again.`,
  relationships: [
    "Magma → cooling → igneous rock",
    "Rock → weathering and erosion → sediment",
    "Sediment → compaction and cementation → sedimentary rock",
    "Rock → heat and pressure → metamorphic rock",
    "Rock → melting → magma"
  ],
  questions: [
    { id: "dem1", question: "What process forms igneous rock from magma?", options: ["Cooling and solidification", "Weathering", "Compaction only", "Uplift"], correct: "Cooling and solidification" },
    { id: "dem2", question: "How does sediment become sedimentary rock?", options: ["Compaction and cementation", "Melting and cooling", "Heat and pressure only", "Evaporation and freezing"], correct: "Compaction and cementation" },
    { id: "dem3", question: "Which relationship forms metamorphic rock?", options: ["Existing rock plus heat and pressure", "Magma plus weathering", "Sediment plus melting", "Igneous rock plus sunlight"], correct: "Existing rock plus heat and pressure" },
    { id: "dem4", question: "What returns rock material to magma?", options: ["Melting", "Cementation", "Erosion", "Uplift"], correct: "Melting" }
  ]
};

export const eightyTwentyMatchData = {
  method: "eighty-twenty-rule" as const,
  title: "80/20 RULE · ROUND 2",
  topic: "Planning an effective study week",
  details: [
    "Identify the assessed learning objectives.",
    "Schedule focused practice on weak high-value skills.",
    "Use retrieval practice and check errors.",
    "Protect sleep before the assessment.",
    "Color-code every page border.",
    "Rewrite the timetable in several fonts.",
    "Choose matching stationery for each subject."
  ],
  coreConcepts: [
    "Assessed objectives",
    "Weak high-value skills",
    "Retrieval and error checking",
    "Adequate sleep"
  ],
  questions: [
    { id: "etm1", question: "What should guide the week's highest priorities?", options: ["The assessed learning objectives", "Matching stationery", "Page-border colors", "The number of available fonts"], correct: "The assessed learning objectives" },
    { id: "etm2", question: "Which activity produces useful evidence about learning?", options: ["Retrieval practice followed by error checking", "Rewriting decorative headings", "Sorting pens by color", "Changing the timetable font"], correct: "Retrieval practice followed by error checking" },
    { id: "etm3", question: "Which pair is most likely to drive performance?", options: ["Practising weak key skills and protecting sleep", "Color coding and matching stationery", "Fonts and borders", "Decorating and recopying schedules"], correct: "Practising weak key skills and protecting sleep" },
    { id: "etm4", question: "How is the 80/20 rule being applied?", options: ["Time goes first to the few actions with greatest learning value", "Every task receives equal time", "Only easy details are studied", "Twenty separate schedules are created"], correct: "Time goes first to the few actions with greatest learning value" }
  ]
};

export const divideStepsMatchData = {
  method: "divide-steps" as const,
  title: "DIVIDE STEPS · ROUND 2",
  topic: "How a package moves through a delivery network",
  overview: `A package is labelled and collected, scanned into a local facility, sorted toward a regional hub, transported to the destination region, sorted onto a local route, and delivered with a final status scan. Each scan updates location information and helps the network direct the package correctly.`,
  referenceSteps: [
    "Label and collect the package.",
    "Scan and sort it at the origin facility.",
    "Transport it through a regional hub.",
    "Sort it onto the destination delivery route.",
    "Deliver it and record the final scan."
  ],
  questions: [
    { id: "dsm1", question: "What happens before regional transport?", options: ["The package is scanned and sorted at origin", "The final delivery scan is recorded", "The recipient returns it", "The label is removed"], correct: "The package is scanned and sorted at origin" },
    { id: "dsm2", question: "Why are scans used throughout the process?", options: ["They update location and support correct routing", "They make transport unnecessary", "They replace package labels", "They guarantee same-minute delivery"], correct: "They update location and support correct routing" },
    { id: "dsm3", question: "Which step follows arrival in the destination region?", options: ["Sorting onto a local delivery route", "Creating the original label", "Returning to the origin automatically", "Removing all tracking data"], correct: "Sorting onto a local delivery route" },
    { id: "dsm4", question: "Which sequence is correct?", options: ["Collection, origin sorting, regional transport, local route, delivery", "Delivery, collection, transport, label, sorting", "Regional transport, delivery, collection, sorting, label", "Local route, origin sorting, collection, delivery, transport"], correct: "Collection, origin sorting, regional transport, local route, delivery" }
  ]
};

export const deriveBasicsMatchData = {
  method: "derive-basics" as const,
  title: "DERIVE BASICS · ROUND 2",
  topic: "Why shadows change length during the day",
  prompt: "Derive how the Sun's apparent angle changes the length of a shadow.",
  source: `Light travels in straight lines, and an opaque object blocks some of those lines to form a shadow. When the Sun appears low in the sky, its rays reach the ground at a shallow angle, so the blocked region stretches farther. Near midday, the Sun appears higher and its rays strike more steeply, producing a shorter shadow. Earth's rotation changes the Sun's apparent position over the day.`,
  basicPrinciples: [
    "Light travels in straight lines.",
    "Opaque objects block light.",
    "A shallow light angle stretches the blocked region.",
    "Earth's rotation changes the Sun's apparent angle."
  ],
  questions: [
    { id: "dbm1", question: "Why are shadows usually long when the Sun is low?", options: ["Light reaches the ground at a shallow angle", "Light stops moving in straight lines", "Objects become taller", "Earth stops rotating"], correct: "Light reaches the ground at a shallow angle" },
    { id: "dbm2", question: "Why is a midday shadow often shorter?", options: ["Sunlight strikes the ground more steeply", "The object loses height", "Opaque objects become transparent", "The Sun produces less light"], correct: "Sunlight strikes the ground more steeply" },
    { id: "dbm3", question: "What causes the Sun's apparent position to change?", options: ["Earth's rotation", "The object's color", "The shadow pulling the Sun", "Daily changes in gravity"], correct: "Earth's rotation" },
    { id: "dbm4", question: "Which reasoning chain is valid?", options: ["Lower apparent Sun angle leads to a longer blocked region", "Higher Sun angle always makes shadows longer", "Straight-line light eliminates shadows", "Rotation makes objects change size"], correct: "Lower apparent Sun angle leads to a longer blocked region" }
  ]
};
