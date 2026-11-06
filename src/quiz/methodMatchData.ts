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
        "The reflection of light from an animal's surface",
        "The storage of daylight for later reflection",
        "The absorption of light without producing any"
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
        "To obtain energy directly from faint light",
        "To keep internal pressure equal to water pressure",
        "To replace their need for chemical senses"
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
        "Food is so abundant that feeding takes little effort",
        "Their bodies must release energy as quickly as possible",
        "Sunlight supplies most of their energy needs"
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
        "High daily air-temperature variation",
        "Low salinity caused by constant freshwater input",
        "Strong solar radiation through the water"
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
        "Seasonal changes in the energy produced by the Sun",
        "Seasonal changes in Earth's rotation speed"
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
        "It receives the same sunlight angle but shorter days",
        "It receives less direct sunlight and longer days",
        "Its day length stays fixed while the Sun becomes hotter"
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
        "The hemispheres reach opposite sides of Earth's orbit at different times",
        "The Sun becomes hotter above one hemisphere each season",
        "Both hemispheres tilt toward the Sun but rotate at different speeds"
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
        "It is always denser than surrounding solid rock",
        "It rises because its weight increases as it melts",
        "It moves upward only after becoming solid rock"
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
        "Pressure must decrease",
        "Magma must immediately solidify",
        "Gas stops exerting pressure"
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
        "Magma",
        "Basalt",
        "Volcanic ash"
      ],
      correct: "Lava"
    },

    {
      id: "com4",
      question:
        "How can repeated eruptions help form a volcano?",
      options: [
        "They build layers of volcanic material",
        "They build layers only by eroding existing volcanic rock",
        "They prevent new material from being deposited at the surface",
        "They replace earlier deposits with empty space after every eruption"
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
        "They immediately send excess water into faster runoff",
        "They prevent rain from entering nearby soils",
        "They permanently remove water from the local water cycle"
      ],
      correct: "They absorb and temporarily store excess water"
    },
    {
      id: "abm2",
      question:
        "What can wetland plants do to moving water?",
      options: [
        "Slow it and trap sediment",
        "Speed it up and keep more sediment suspended",
        "Turn dissolved nutrients into additional sediment",
        "Carry sediment away without reducing water flow"
      ],
      correct: "Slow it and trap sediment"
    },
    {
      id: "abm3",
      question:
        "How can wetlands improve water quality?",
      options: [
        "Plants and microorganisms remove some nutrients and pollutants",
        "Plants remove pollutants only by making the water evaporate",
        "Microorganisms prevent all nutrient cycling in wetland soils",
        "Sediment trapping increases every pollutant downstream"
      ],
      correct: "Plants and microorganisms remove some nutrients and pollutants"
    },
    {
      id: "abm4",
      question:
        "What is one likely effect of draining wetlands?",
      options: [
        "Reduced flood protection and wildlife habitat",
        "Increased storage of floodwater and expanded wetland habitat",
        "Unchanged flood storage but less water reaching rivers",
        "Cleaner water because draining removes all pollutants"
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
        "Only incoming ultraviolet radiation",
        "Only heat carried upward by moving air"
      ],
      correct: "Outgoing infrared radiation"
    },
    {
      id: "osm2",
      question:
        "How do greenhouse gases affect heat loss to space?",
      options: [
        "They slow the rate at which heat escapes",
        "They prevent the surface from emitting infrared energy",
        "They reflect all incoming sunlight back to space",
        "They increase the direct escape of infrared energy"
      ],
      correct: "They slow the rate at which heat escapes"
    },
    {
      id: "osm3",
      question:
        "What happens when greenhouse-gas concentrations increase?",
      options: [
        "The greenhouse effect strengthens and average temperatures rise",
        "The atmosphere absorbs less outgoing infrared radiation",
        "The greenhouse effect weakens as more heat escapes",
        "The surface warms only because more sunlight is produced"
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
        "Its open floor provides most of the forest's bare-ground habitat",
        "It lies below the darkest understory vegetation",
        "Its leaves receive less light than leaves on the forest floor"
      ],
      correct: "Its dense roof of leaves supports many animals"
    },
    {
      id: "nt4m3",
      question:
        "What characterizes many understory plants?",
      options: [
        "They are adapted to limited sunlight",
        "They need more direct sunlight than emergent-tree leaves",
        "They rely on stronger winds than plants above the canopy",
        "They grow without using light for photosynthesis"
      ],
      correct: "They are adapted to limited sunlight"
    },
    {
      id: "nt4m4",
      question:
        "What important process occurs on the forest floor?",
      options: [
        "Decomposers return nutrients to the soil",
        "Leaf canopies form above all emergent trees",
        "Roots obtain nutrients mainly from unbroken leaf litter",
        "Dead material remains unchanged without decomposition"
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
    { id: "lsmp1", question: "Which component transports oxygen?", options: ["Red blood cells", "Platelets", "Fibrin", "White blood cells"], correct: "Red blood cells" },
    { id: "lsmp2", question: "Which component helps fight infection?", options: ["White blood cells", "Plasma water", "Hemoglobin", "Red blood cells"], correct: "White blood cells" },
    { id: "lsmp3", question: "Which component helps form clots?", options: ["Platelets", "Albumin", "Red blood cells", "White blood cells"], correct: "Platelets" },
    { id: "lsmp4", question: "Which component carries nutrients and hormones?", options: ["Plasma", "Platelets", "White blood cells", "Red blood cells"], correct: "Plasma" }
  ],
  test: [
    { id: "lsmt1", question: "A patient has difficulty forming blood clots; which component may be low?", options: ["Platelets", "Hemoglobin", "Red blood cells", "White blood cells"], correct: "Platelets" },
    { id: "lsmt2", question: "Which pairing is correct?", options: ["White blood cells — defense against infection", "Platelets ? oxygen transport", "Plasma ? production of red blood cells", "Red blood cells ? hormone production"], correct: "White blood cells — defense against infection" },
    { id: "lsmt3", question: "What is a major function of plasma?", options: ["Transporting dissolved materials and blood cells", "Producing antibodies inside red blood cells", "Carrying most oxygen bound to hemoglobin", "Producing platelets within the bloodstream"], correct: "Transporting dissolved materials and blood cells" }
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
    { id: "stm1", question: "What forms before a main-sequence star?", options: ["A protostar", "A white dwarf", "A red giant", "A neutron star"], correct: "A protostar" },
    { id: "stm2", question: "What begins when a main-sequence star forms?", options: ["Nuclear fusion", "Chemical combustion", "Gravitational cooling alone", "Expansion into a white dwarf"], correct: "Nuclear fusion" },
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
    { id: "ccm1", question: "What defines a feedback loop?", options: ["A system's output influences its later behavior", "An output changes without influencing the system again", "Every output is determined only by an external input", "A process repeats without responding to its results"], correct: "A system's output influences its later behavior" },
    { id: "ccm2", question: "Why does negative feedback matter?", options: ["It can stabilize a system by counteracting change", "It reinforces each change and moves the system farther from its starting point", "It stabilizes a system by removing every response to change", "It makes a system's output independent of all inputs"], correct: "It can stabilize a system by counteracting change" },
    { id: "ccm3", question: "Which example is positive feedback?", options: ["Contractions that intensify further contractions", "Sweating that lowers body temperature", "A thermostat switching off heat", "Blood sugar returning toward normal"], correct: "Contractions that intensify further contractions" },
    { id: "ccm4", question: "When is the concept especially useful?", options: ["When predicting how a system responds to change", "When assuming outputs never affect later conditions", "When describing only the first input to a system", "When ignoring the direction of a system's response"], correct: "When predicting how a system responds to change" }
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
    { id: "abbrm4", question: "What does HOMES help reconstruct?", options: ["Huron, Ontario, Michigan, Erie, Superior", "Huron, Ottawa, Michigan, Erie, Superior", "Huron, Ontario, Manitoba, Erie, Superior", "Huron, Ontario, Michigan, Erie, Saskatchewan"], correct: "Huron, Ontario, Michigan, Erie, Superior" }
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
    { id: "hfm2", question: "Why might distribution control temperature?", options: ["To protect food quality and safety during transport", "To replace food processing with refrigeration during transport", "To accelerate ripening in all foods throughout transport", "To avoid checking food condition when it reaches retailers"], correct: "To protect food quality and safety during transport" },
    { id: "hfm3", question: "Which heading would discuss warehouses and transport?", options: ["Distribution", "Production", "Processing", "Retail and consumption"], correct: "Distribution" },
    { id: "hfm4", question: "What sequence do the headers reveal?", options: ["Production through processing and distribution to consumption", "Distribution, consumption, processing, production", "Production, consumption, distribution, processing", "Processing, retail, production, distribution"], correct: "Production through processing and distribution to consumption" }
  ]
};

export const primeQuestionMatchData = {
  method: "prime-question" as const,
  title: "PRIME QUESTION · ROUND 2",
  topic: "How urban trees cool neighborhoods",
  guidingQuestion: "How do urban trees reduce heat through both shade and water movement?",
  material: `Tree canopies block part of the Sun's radiation from heating roads and buildings. Trees also draw water from the soil and release water vapor through transpiration. Evaporation during this process uses heat energy and cools the surrounding air. Groups of healthy trees can therefore reduce surface temperatures and local air temperatures, especially where paved surfaces would otherwise store substantial heat.`,
  questions: [
    { id: "pqm1", question: "How does a canopy directly reduce surface heating?", options: ["It blocks part of the Sun's radiation", "It cools pavement mainly by removing its stored mass", "It prevents the ground from giving off heat at night", "It cools surfaces mainly by increasing absorbed sunlight"], correct: "It blocks part of the Sun's radiation" },
    { id: "pqm2", question: "Why does transpiration cool nearby air?", options: ["Evaporation uses heat energy", "Evaporation releases heat into the surrounding air", "The leaves turn sunlight directly into cooler air", "Water vapor prevents heat from entering the atmosphere"], correct: "Evaporation uses heat energy" },
    { id: "pqm3", question: "Where can urban trees have especially strong value?", options: ["Areas with heat-storing paved surfaces", "Shaded areas that already remain cool throughout the day", "Locations selected only for the color of their pavement", "Only indoor spaces separated from outdoor air"], correct: "Areas with heat-storing paved surfaces" },
    { id: "pqm4", question: "What complete answer fits the guiding question?", options: ["Trees shade surfaces and cool air through transpiration", "Trees cool paved surfaces only by changing their color", "Trees cool air mainly by preventing evaporation from leaves", "Trees cool surfaces by absorbing all heat into their roots"], correct: "Trees shade surfaces and cool air through transpiration" }
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
    { id: "dem3", question: "Which relationship forms metamorphic rock?", options: ["Existing rock plus heat and pressure", "Magma plus weathering", "Sediment plus melting", "Existing rock plus compaction and cementation"], correct: "Existing rock plus heat and pressure" },
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
    { id: "etm1", question: "What should guide the week's highest priorities?", options: ["The assessed learning objectives", "Chapter length alone", "Familiarity of topics alone", "Timetable formatting choices"], correct: "The assessed learning objectives" },
    { id: "etm2", question: "Which activity produces useful evidence about learning?", options: ["Retrieval practice followed by error checking", "Rereading familiar notes without checking recall", "Copying worked answers without attempting the questions", "Highlighting every sentence before testing understanding"], correct: "Retrieval practice followed by error checking" },
    { id: "etm3", question: "Which pair is most likely to drive performance?", options: ["Practising weak key skills and protecting sleep", "Recopying familiar notes and reorganizing the same schedule", "Studying every minor detail and cutting sleep to gain time", "Reading worked solutions and avoiding difficult practice"], correct: "Practising weak key skills and protecting sleep" },
    { id: "etm4", question: "How is the 80/20 rule being applied?", options: ["Time goes first to the few actions with greatest learning value", "Every task receives equal time regardless of learning value", "Only the easiest details receive the available study time", "Exactly twenty percent of the content is chosen at random"], correct: "Time goes first to the few actions with greatest learning value" }
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
    { id: "dsm1", question: "What happens before regional transport?", options: ["The package is scanned and sorted at origin", "The package is placed on its final delivery route", "The destination depot records the final delivery scan", "The recipient confirms receipt before transport starts"], correct: "The package is scanned and sorted at origin" },
    { id: "dsm2", question: "Why are scans used throughout the process?", options: ["They update location and support correct routing", "They replace the need to sort packages by destination", "They change the destination on every transport leg", "They guarantee delivery without any physical movement"], correct: "They update location and support correct routing" },
    { id: "dsm3", question: "Which step follows arrival in the destination region?", options: ["Sorting onto a local delivery route", "Returning to origin before any local sorting", "Reprinting the sender's label before every route decision", "Recording delivery before the local route begins"], correct: "Sorting onto a local delivery route" },
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
    { id: "dbm1", question: "Why are shadows usually long when the Sun is low?", options: ["Light reaches the ground at a shallow angle", "The object grows taller while its position stays fixed", "The same light spreads less as the Sun approaches the horizon", "Light bends around the object more strongly at low angles"], correct: "Light reaches the ground at a shallow angle" },
    { id: "dbm2", question: "Why is a midday shadow often shorter?", options: ["Sunlight strikes the ground more steeply", "The object becomes shorter as the ground warms", "Light bends less because the object becomes transparent", "Less light reaches the ground so every shadow contracts"], correct: "Sunlight strikes the ground more steeply" },
    { id: "dbm3", question: "What causes the Sun's apparent position to change?", options: ["Earth's rotation", "Earth's yearly orbit", "Changes in object height", "Changes in Earth?Sun distance"], correct: "Earth's rotation" },
    { id: "dbm4", question: "Which reasoning chain is valid?", options: ["Lower apparent Sun angle leads to a longer blocked region", "Higher Sun angle always makes shadows longer", "A longer shadow means the object has gained height", "A lower Sun angle reduces the area blocked from direct light"], correct: "Lower apparent Sun angle leads to a longer blocked region" }
  ]
};

export const kidlinRuleMatchData={method:"kidlin-rule" as const,title:"KIDLIN'S RULE · ROUND 2",topic:"Clarifying an inconsistent study schedule",vagueProblem:"I never have enough time to study.",context:"On three weekdays, study starts after 10 p.m. because the two hours after dinner are spent switching between messages and short videos. No subject or start time is chosen in advance.",questions:[
{id:"krm1",question:"Which rewrite is most actionable?",options:["Choose tomorrow's subject tonight and begin a 30-minute session after dinner","Try to study more whenever spare time becomes available","Ban every leisure activity without choosing a study period","Make a longer subject list without deciding when to begin"],correct:"Choose tomorrow's subject tonight and begin a 30-minute session after dinner"},
{id:"krm2",question:"What is the most specific obstacle?",options:["Unplanned media switching during the available period","The study period is fixed but every subject lacks materials","There is no time available after dinner on any weekday","The student must complete all subjects during every session"],correct:"Unplanned media switching during the available period"},
{id:"krm3",question:"Which detail provides a useful boundary?",options:["The two hours after dinner on three weekdays","A goal to study whenever there is enough time","A plan to improve every subject at some point","A request to reduce distractions without naming a study period"],correct:"The two hours after dinner on three weekdays"}]};
export const premackPrincipleMatchData={method:"premack-principle" as const,title:"PREMACK'S PRINCIPLE · ROUND 2",topic:"Practising difficult fraction problems",task:"Complete the fraction explanation before the preferred activity.",material:"To add fractions with different denominators, find a common denominator. Rewrite each fraction equivalently, add the numerators, and simplify.",preferredExamples:["A short social break","Drawing for a few minutes","A favorite snack"],questions:[
{id:"ppm1",question:"What is the first step when denominators differ?",options:["Find a common denominator","Add the denominators","Keep the original denominators and add only the tops","Use one denominator without making equivalent fractions"],correct:"Find a common denominator"},
{id:"ppm2",question:"What happens after rewriting equivalent fractions?",options:["Add the numerators","Add the denominators again","Multiply the numerators while keeping the denominator","Add the denominators but keep one original numerator"],correct:"Add the numerators"},
{id:"ppm3",question:"When should the preferred activity occur?",options:["After the agreed practice task","Before choosing the practice task","Instead of completing the agreed practice","Regardless of whether the practice task is completed"],correct:"After the agreed practice task"}]};
export const wallStareMatchData={method:"ten-minute-wall-stare" as const,title:"10 MIN WALL STARE · ROUND 2",topic:"How soil stores carbon",material:"Plants build carbon-rich tissues. Roots and fallen material enter soil, where organisms decompose them. Some carbon returns to the atmosphere, while some stabilizes in organic matter or binds to minerals for long periods.",questions:[
{id:"wsm1",question:"How does plant carbon first enter soil?",options:["Through roots and fallen material","Through mineral weathering without any plant input","Through rainfall supplying all the carbon in soil","Through sunlight entering soil directly as stored carbon"],correct:"Through roots and fallen material"},
{id:"wsm2",question:"What can keep carbon in soil for long periods?",options:["Stabilization in organic matter or binding to minerals","Frequent erosion that removes carbon-rich topsoil","Rapid oxidation of all organic matter in the soil","Preventing any plant material from entering soil"],correct:"Stabilization in organic matter or binding to minerals"},
{id:"wsm3",question:"What can decomposition do?",options:["Return some carbon to the atmosphere","Keep all organic carbon permanently unchanged","Return carbon to the soil only as unbreakable minerals","Create new carbon atoms independently of existing matter"],correct:"Return some carbon to the atmosphere"}]};
export const strooperEffectMatchData={method:"strooper-effect" as const,title:"STROOPER EFFECT · ROUND 2",topic:"Task switching and response inhibition",material:"Task switching changes from one rule to another while suppressing the previous rule. Responses can slow immediately after a switch because the earlier task set still competes for control. Response inhibition helps prevent the old response.",colors:[{name:"purple",hsla:"hsl(280 100% 45%)"},{name:"pink",hsla:"hsl(330 100% 55%)"},{name:"gold",hsla:"hsl(48 100% 42%)"},{name:"cyan",hsla:"hsl(180 100% 38%)"}],questions:[
{id:"sem1",question:"Why can performance slow after a task switch?",options:["The previous rule still competes for control","The new task always uses exactly the same response rule","The previous response is fully erased before the switch","The switch removes any need to update the response goal"],correct:"The previous rule still competes for control"},
{id:"sem2",question:"What helps prevent the old response?",options:["Response inhibition","Repeating the previous rule","Speeding up the old response","Following both rules simultaneously"],correct:"Response inhibition"},
{id:"sem3",question:"What changes during task switching?",options:["The rule guiding the response","Only the appearance of the response buttons","Only the time allowed to make the same response","Only the wording of an unchanged response rule"],correct:"The rule guiding the response"}]};
export const twoXVideoMatchData={method:"two-x-video-speed" as const,title:"2X VIDEO SPEED · ROUND 2",topic:"How light behaves as a wave",youtubeId:"IRBfpBPELmE",videoTitle:"Light Is Waves: Crash Course Physics #39",channel:"CrashCourse",focusPoints:["Track the evidence that light behaves as a wave.","Notice interference and diffraction patterns.","Connect wavelength and frequency to different kinds of light."],questions:[
{id:"vxm1",question:"Which observation supports the wave model of light?",options:["Interference patterns","Photoelectric emission","Photon absorption events","Discrete atomic spectra"],correct:"Interference patterns"},
{id:"vxm2",question:"What happens when a wave spreads after passing an edge or opening?",options:["Diffraction","Reflection","Refraction","Absorption"],correct:"Diffraction"},
{id:"vxm3",question:"What distinguishes different regions of the electromagnetic spectrum?",options:["Their wavelength and frequency","Their speed through a vacuum","Their need for a material medium","Their electrical charge"],correct:"Their wavelength and frequency"}]};
