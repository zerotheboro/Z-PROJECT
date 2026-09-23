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

export const activeBlurtingExperiment = {
  method: "active-blurting" as const,
  category: "memory" as const,
  title: "Active Blurting",
  topic: "How coral reefs support marine ecosystems",
  facts: [
    "Coral reefs provide shelter and nursery areas for many marine species.",
    "Reef-building corals live with algae that provide much of their energy through photosynthesis.",
    "The complex shape of a reef creates many small habitats for different organisms.",
    "Reefs reduce wave energy and can help protect coastlines from erosion.",
    "Healthy reefs support fishing and tourism in many coastal communities.",
    "Warmer water can cause corals to expel their algae, a process called coral bleaching."
  ],
  questions: [
    {
      id: "ab1",
      question:
        "How do coral reefs help many young marine animals?",
      options: [
        "They provide shelter and nursery areas",
        "They remove all predators from the ocean",
        "They make seawater warmer",
        "They prevent animals from moving"
      ],
      correct: "They provide shelter and nursery areas"
    },
    {
      id: "ab2",
      question:
        "What do the algae living with reef-building corals provide?",
      options: [
        "Energy produced through photosynthesis",
        "Sand for the ocean floor",
        "Protection from every disease",
        "Fresh water for the coral"
      ],
      correct: "Energy produced through photosynthesis"
    },
    {
      id: "ab3",
      question:
        "How can reefs help protect coastlines?",
      options: [
        "They reduce wave energy",
        "They stop the tides completely",
        "They increase coastal wind speed",
        "They remove all coastal sediment"
      ],
      correct: "They reduce wave energy"
    },
    {
      id: "ab4",
      question:
        "What happens during coral bleaching?",
      options: [
        "Corals expel the algae living with them",
        "Corals turn into sand immediately",
        "Corals begin producing their own sunlight",
        "Corals move into deeper water"
      ],
      correct: "Corals expel the algae living with them"
    }
  ]
};

export const oneSentenceExperiment = {
  method: "one-sentence" as const,
  category: "understanding" as const,
  title: "1 sentence",
  topic: "How vaccines create immune memory",
  explanation: `
Vaccines expose the immune system to a safe form or recognizable
part of a pathogen without causing the full disease.

The immune system responds by producing specialized cells and
antibodies that recognize that pathogen.

Some of these cells remain as memory cells after the immediate
response ends.

If the real pathogen appears later, the memory cells help the body
respond faster and more effectively.
  `,
  questions: [
    {
      id: "os1",
      question:
        "Why can the immune system respond faster after vaccination?",
      options: [
        "Memory cells recognize the pathogen",
        "The pathogen can no longer enter the body",
        "Vaccines permanently raise body temperature",
        "Antibodies replace every immune cell"
      ],
      correct: "Memory cells recognize the pathogen"
    },
    {
      id: "os2",
      question:
        "What does a vaccine safely present to the immune system?",
      options: [
        "A recognizable form or part of a pathogen",
        "A completely unrelated nutrient",
        "Only healthy human cells",
        "A permanent supply of antibodies"
      ],
      correct: "A recognizable form or part of a pathogen"
    },
    {
      id: "os3",
      question:
        "Which statement best transfers the idea of immune memory?",
      options: [
        "Prior safe exposure prepares a faster later response",
        "Every immune response starts from the beginning",
        "Memory cells prevent all future infections",
        "The body responds only while a vaccine is present"
      ],
      correct: "Prior safe exposure prepares a faster later response"
    }
  ]
};

export const noteTaking4x4Experiment = {
  method: "note-taking-4x4" as const,
  category: "organization" as const,
  title: "Note-taking 4x4",
  topic: "The water cycle",
  content: `
The water cycle continuously moves water through Earth's surface and
atmosphere. During evaporation, liquid water absorbs energy and becomes
water vapor. Plants also release water vapor through transpiration.

As water vapor rises and cools, it condenses into tiny droplets that
form clouds. When droplets or ice crystals become heavy enough, water
returns to the surface as precipitation such as rain or snow.

Water then collects in oceans, lakes, rivers, soil, and groundwater.
Runoff and groundwater movement eventually return much of it to larger
bodies of water, where the cycle continues.
  `,
  questions: [
    {
      id: "nt41",
      question:
        "Which process changes liquid water into water vapor?",
      options: [
        "Evaporation",
        "Condensation",
        "Precipitation",
        "Collection"
      ],
      correct: "Evaporation"
    },
    {
      id: "nt42",
      question:
        "What occurs when rising water vapor cools?",
      options: [
        "It condenses into droplets that can form clouds",
        "It immediately becomes groundwater",
        "It stops participating in the water cycle",
        "It turns directly into runoff"
      ],
      correct: "It condenses into droplets that can form clouds"
    },
    {
      id: "nt43",
      question:
        "When does precipitation occur?",
      options: [
        "When water droplets or ice crystals become heavy enough to fall",
        "Whenever liquid water absorbs energy",
        "Only when groundwater reaches the ocean",
        "When plants absorb water through their roots"
      ],
      correct: "When water droplets or ice crystals become heavy enough to fall"
    },
    {
      id: "nt44",
      question:
        "Which sequence correctly connects four major parts of the water cycle?",
      options: [
        "Evaporation, condensation, precipitation, collection",
        "Collection, precipitation, evaporation, condensation only once",
        "Condensation, collection, erosion, combustion",
        "Precipitation, photosynthesis, condensation, respiration"
      ],
      correct: "Evaporation, condensation, precipitation, collection"
    }
  ]
};

export const leitnerSystemExperiment = {
  method: "leitner-system" as const,
  category: "memory" as const,
  title: "Leitner system",
  topic: "Key functions of cell structures",
  cards: [
    { id: "lsc1", front: "Nucleus", back: "Stores DNA and helps control cell activity." },
    { id: "lsc2", front: "Mitochondrion", back: "Releases usable energy through cellular respiration." },
    { id: "lsc3", front: "Ribosome", back: "Builds proteins from amino acids." },
    { id: "lsc4", front: "Cell membrane", back: "Controls what enters and leaves the cell." }
  ],
  practice: [
    { id: "lsp1", question: "Which structure stores DNA?", options: ["Nucleus", "Ribosome", "Cell membrane", "Mitochondrion"], correct: "Nucleus" },
    { id: "lsp2", question: "Which structure builds proteins?", options: ["Ribosome", "Nucleus", "Mitochondrion", "Cell membrane"], correct: "Ribosome" },
    { id: "lsp3", question: "Which structure controls entry and exit?", options: ["Cell membrane", "Nucleus", "Ribosome", "Mitochondrion"], correct: "Cell membrane" },
    { id: "lsp4", question: "Which structure releases usable energy?", options: ["Mitochondrion", "Cell membrane", "Nucleus", "Ribosome"], correct: "Mitochondrion" }
  ],
  test: [
    { id: "lst1", question: "A cell cannot assemble proteins correctly; which structure is most directly affected?", options: ["Ribosome", "Nucleus", "Cell membrane", "Mitochondrion"], correct: "Ribosome" },
    { id: "lst2", question: "Which structure regulates movement of substances into a cell?", options: ["Cell membrane", "Mitochondrion", "Ribosome", "Nucleus"], correct: "Cell membrane" },
    { id: "lst3", question: "Which pairing is correct?", options: ["Nucleus — stores DNA", "Ribosome — controls entry", "Cell membrane — builds proteins", "Mitochondrion — stores DNA"], correct: "Nucleus — stores DNA" }
  ]
};

export const storyTellingExperiment = {
  method: "story-telling" as const,
  category: "memory" as const,
  title: "Story telling",
  topic: "The sequence of primary succession",
  orderedItems: [
    "Bare rock is exposed with little or no soil.",
    "Lichens begin breaking down the rock.",
    "Small amounts of soil form as material accumulates.",
    "Mosses and small plants establish roots.",
    "Grasses, shrubs, and eventually trees become established."
  ],
  questions: [
    { id: "st1", question: "What begins primary succession?", options: ["Bare rock with little or no soil", "A mature forest", "Deep fertile soil", "Large grazing animals"], correct: "Bare rock with little or no soil" },
    { id: "st2", question: "How do lichens help the sequence continue?", options: ["They help break down rock", "They remove all soil", "They prevent plant growth", "They create mature trees immediately"], correct: "They help break down rock" },
    { id: "st3", question: "What normally becomes established after soil and small plants develop?", options: ["Grasses, shrubs, and eventually trees", "Only bare rock", "Ocean currents", "Glaciers"], correct: "Grasses, shrubs, and eventually trees" },
    { id: "st4", question: "Which order is most accurate?", options: ["Bare rock, lichens, soil, small plants, larger plants", "Soil, trees, bare rock, lichens, moss", "Trees, shrubs, lichens, bare rock, soil", "Moss, bare rock, trees, soil, lichens"], correct: "Bare rock, lichens, soil, small plants, larger plants" }
  ]
};

export const captureCreateExperiment = {
  method: "capture-create" as const,
  category: "understanding" as const,
  title: "capture & create",
  topic: "Opportunity cost",
  content: `Opportunity cost is the value of the best alternative given up when a choice is made. Because time, money, and other resources are limited, choosing one option usually means giving up another. Opportunity cost is not every possible alternative; it is the most valuable alternative that was not chosen. The idea helps people compare choices in personal decisions, business, and public policy.`,
  questions: [
    { id: "cc1", question: "What is opportunity cost?", options: ["The value of the best alternative given up", "The price of every available option", "A reward received after any decision", "The total number of alternatives"], correct: "The value of the best alternative given up" },
    { id: "cc2", question: "Why does opportunity cost exist?", options: ["Resources are limited and choices exclude alternatives", "Every resource is unlimited", "All choices have identical results", "Alternatives can always be selected together"], correct: "Resources are limited and choices exclude alternatives" },
    { id: "cc3", question: "A student studies instead of working a paid shift; what is the clearest opportunity cost?", options: ["The wages from the shift", "The knowledge gained", "Every future job", "The cost of the textbook only"], correct: "The wages from the shift" },
    { id: "cc4", question: "When is this idea most useful?", options: ["When comparing choices that use limited resources", "When no alternatives exist", "When every option can be chosen", "Only after a choice has no consequences"], correct: "When comparing choices that use limited resources" }
  ]
};

export const abbreviationExperiment = {
  method: "abbreviation" as const,
  category: "memory" as const,
  title: "ABBREVIATION!",
  topic: "The five layers of Earth's atmosphere",
  items: [
    "Troposphere",
    "Stratosphere",
    "Mesosphere",
    "Thermosphere",
    "Exosphere"
  ],
  questions: [
    { id: "abbr1", question: "Which layer comes directly after the troposphere?", options: ["Stratosphere", "Mesosphere", "Thermosphere", "Exosphere"], correct: "Stratosphere" },
    { id: "abbr2", question: "Which layer is third in the sequence?", options: ["Mesosphere", "Troposphere", "Exosphere", "Stratosphere"], correct: "Mesosphere" },
    { id: "abbr3", question: "Which layer follows the thermosphere?", options: ["Exosphere", "Stratosphere", "Troposphere", "Mesosphere"], correct: "Exosphere" },
    { id: "abbr4", question: "Which sequence is correct from lowest to highest?", options: ["Troposphere, Stratosphere, Mesosphere, Thermosphere, Exosphere", "Stratosphere, Troposphere, Thermosphere, Mesosphere, Exosphere", "Troposphere, Mesosphere, Stratosphere, Exosphere, Thermosphere", "Exosphere, Thermosphere, Mesosphere, Stratosphere, Troposphere"], correct: "Troposphere, Stratosphere, Mesosphere, Thermosphere, Exosphere" }
  ]
};

export const headerFirstExperiment = {
  method: "header-first" as const,
  category: "organization" as const,
  title: "HEADER first",
  topic: "How cities manage water",
  sections: [
    { heading: "Collecting water", content: "Cities collect water from rivers, reservoirs, lakes, or underground aquifers. The available source depends on local geography and climate." },
    { heading: "Treating water", content: "Treatment plants remove debris, particles, and harmful microorganisms before the water enters the public supply." },
    { heading: "Distributing water", content: "Pumps, pipes, and storage tanks move treated water to homes and businesses while maintaining pressure." },
    { heading: "Managing wastewater", content: "Used water travels through sewers to treatment facilities before it is safely released or reused." }
  ],
  questions: [
    { id: "hf1", question: "What normally happens before water enters the public supply?", options: ["It is treated to remove contaminants", "It is sent directly to sewers", "It is mixed with wastewater", "It is stored only in homes"], correct: "It is treated to remove contaminants" },
    { id: "hf2", question: "What maintains the movement and pressure of treated water?", options: ["Pumps, pipes, and storage tanks", "Only natural rainfall", "Wastewater facilities alone", "Household drains"], correct: "Pumps, pipes, and storage tanks" },
    { id: "hf3", question: "Which heading would contain information about used water?", options: ["Managing wastewater", "Collecting water", "Treating water", "Distributing water"], correct: "Managing wastewater" },
    { id: "hf4", question: "What overall structure do the headings reveal?", options: ["A sequence from sourcing water to handling used water", "A list of unrelated weather events", "A comparison of four cities", "A history of household plumbing"], correct: "A sequence from sourcing water to handling used water" }
  ]
};

export const primeQuestionExperiment = {
  method: "prime-question" as const,
  category: "understanding" as const,
  title: "Prime question",
  topic: "How mangrove roots protect coastlines",
  guidingQuestion: "How do mangrove roots reduce coastal damage while supporting an ecosystem?",
  material: `Mangroves grow dense networks of roots in shallow coastal water. The roots slow waves and currents, reducing the energy that reaches the shore. Slower water also drops suspended sediment, which can help build and stabilize the coastline. The root network traps organic matter and creates sheltered nursery habitat for young fish and other animals. By combining physical protection with habitat support, mangroves strengthen both coastlines and coastal ecosystems.`,
  questions: [
    { id: "pq1", question: "How do mangrove roots directly reduce wave damage?", options: ["They slow waves and currents", "They increase tidal height", "They remove all seawater", "They harden the ocean floor"], correct: "They slow waves and currents" },
    { id: "pq2", question: "Why does sediment collect near mangrove roots?", options: ["Slower water drops suspended material", "Roots manufacture sand", "Fish carry every particle", "The water becomes warmer"], correct: "Slower water drops suspended material" },
    { id: "pq3", question: "How do mangroves support young marine animals?", options: ["Their roots create sheltered nursery habitat", "They eliminate all predators", "They stop animals from moving", "They turn salt water fresh"], correct: "Their roots create sheltered nursery habitat" },
    { id: "pq4", question: "What central idea connects the material?", options: ["Root structure provides physical protection and ecological habitat", "Mangroves protect shores only by absorbing rain", "Coastal protection requires removing wildlife", "Sediment prevents roots from growing"], correct: "Root structure provides physical protection and ecological habitat" }
  ]
};

export const doodleEffectExperiment = {
  method: "doodle-effect" as const,
  category: "understanding" as const,
  title: "the Doodle effect",
  topic: "Energy relationships in a grassland food web",
  material: `Grass captures sunlight and stores energy. Grasshoppers and rabbits eat grass. Frogs eat grasshoppers, while foxes can eat rabbits. Hawks may eat frogs and rabbits. Decomposers break down dead organisms and return nutrients to the soil, helping grass grow again. Arrows in a food web point from the food to the organism receiving energy.`,
  relationships: [
    "Sunlight → grass",
    "Grass → grasshopper → frog → hawk",
    "Grass → rabbit → fox or hawk",
    "Dead organisms → decomposers → soil nutrients → grass"
  ],
  questions: [
    { id: "de1", question: "Which organism receives energy directly from grasshoppers?", options: ["Frogs", "Grass", "Rabbits", "Decomposers only"], correct: "Frogs" },
    { id: "de2", question: "What do arrows represent in this food web?", options: ["The direction of energy transfer", "The size of each organism", "Where each organism sleeps", "The amount of rainfall"], correct: "The direction of energy transfer" },
    { id: "de3", question: "How do decomposers support new plant growth?", options: ["They return nutrients to the soil", "They create sunlight", "They remove every consumer", "They stop energy transfer"], correct: "They return nutrients to the soil" },
    { id: "de4", question: "Which path correctly shows energy movement?", options: ["Grass → rabbit → hawk", "Hawk → rabbit → grass", "Frog → grasshopper → grass", "Soil → fox → sunlight"], correct: "Grass → rabbit → hawk" }
  ]
};

export const eightyTwentyExperiment = {
  method: "eighty-twenty-rule" as const,
  category: "organization" as const,
  title: "80/20 rule",
  topic: "Launching a community recycling program",
  details: [
    "Identify which materials the local facility actually accepts.",
    "Place clearly labelled bins where people generate waste.",
    "Teach residents how to avoid contamination.",
    "Arrange a reliable collection schedule.",
    "Choose a decorative font for every poster.",
    "Print matching staff T-shirts.",
    "Change the campaign slogan every month."
  ],
  coreConcepts: [
    "Accepted materials",
    "Convenient labelled bins",
    "Contamination guidance",
    "Reliable collection"
  ],
  questions: [
    { id: "et1", question: "Which action has the greatest effect on preventing unusable recycling?", options: ["Teach residents how to avoid contamination", "Change the slogan monthly", "Choose a decorative font", "Print matching shirts"], correct: "Teach residents how to avoid contamination" },
    { id: "et2", question: "Why should accepted materials be identified first?", options: ["It determines what the program can successfully process", "It selects the poster font", "It removes the need for collection", "It guarantees every item is recyclable"], correct: "It determines what the program can successfully process" },
    { id: "et3", question: "Which pair represents high-value priorities?", options: ["Convenient bins and reliable collection", "T-shirts and changing slogans", "Fonts and T-shirts", "Monthly slogans and poster colors"], correct: "Convenient bins and reliable collection" },
    { id: "et4", question: "What does applying 80/20 accomplish here?", options: ["It focuses effort on actions that drive most program success", "It requires memorizing every minor detail equally", "It removes the need to prioritize", "It guarantees exactly eighty participants"], correct: "It focuses effort on actions that drive most program success" }
  ]
};

export const divideStepsExperiment = {
  method: "divide-steps" as const,
  category: "organization" as const,
  title: "divide steps",
  topic: "How a bill becomes a national law",
  overview: `A proposed bill must move through several connected decisions before it becomes law. It is introduced, examined by a committee, debated and voted on by each legislative chamber, reconciled if the chambers approve different versions, and finally sent for executive approval.`,
  referenceSteps: [
    "A legislator introduces the bill.",
    "A committee studies and may revise it.",
    "The legislative chambers debate and vote.",
    "Different approved versions are reconciled.",
    "The final bill receives executive approval or another constitutional response."
  ],
  questions: [
    { id: "ds1", question: "What normally happens after a bill is introduced?", options: ["A committee studies it", "It immediately becomes law", "The courts rewrite it", "Voters must approve every clause"], correct: "A committee studies it" },
    { id: "ds2", question: "Why might approved versions need reconciliation?", options: ["The chambers may approve different wording", "A committee cannot read a bill", "The bill has already become law", "Executive approval happens first"], correct: "The chambers may approve different wording" },
    { id: "ds3", question: "Which action occurs before executive consideration?", options: ["The legislature approves a final version", "The law is enforced for a year", "A new bill replaces it automatically", "All committees are dissolved"], correct: "The legislature approves a final version" },
    { id: "ds4", question: "Why is dividing the process into steps useful?", options: ["It reveals the sequence and role of each decision", "It makes the order irrelevant", "It removes intermediate decisions", "It turns every stage into the same action"], correct: "It reveals the sequence and role of each decision" }
  ]
};

export const deriveBasicsExperiment = {
  method: "derive-basics" as const,
  category: "understanding" as const,
  title: "derive basics",
  topic: "Why objects float or sink",
  prompt: "Derive why an object floats or sinks from density and buoyant force.",
  source: `An object in water experiences an upward buoyant force equal to the weight of the water it displaces. Density compares mass with volume. If an object's average density is lower than water, it can displace its own weight before being fully submerged and float. If its average density is greater than water, its weight remains greater than the available buoyant force and it sinks. Shape can change average density by including air and increasing displaced volume.`,
  basicPrinciples: [
    "Buoyant force equals the weight of displaced water.",
    "Density is mass divided by volume.",
    "Floating requires buoyant force to balance weight.",
    "Shape can increase displaced volume and lower average density."
  ],
  questions: [
    { id: "db1", question: "What determines the buoyant force on an object?", options: ["The weight of displaced water", "The object's color", "The water's surface shape only", "The time of day"], correct: "The weight of displaced water" },
    { id: "db2", question: "Why can a hollow steel ship float?", options: ["Its shape lowers average density and displaces enough water", "Steel stops having mass", "Water loses density near ships", "Gravity does not act on hollow objects"], correct: "Its shape lowers average density and displaces enough water" },
    { id: "db3", question: "What happens when an object's weight exceeds the available buoyant force?", options: ["It sinks", "It becomes massless", "It always evaporates", "Its density becomes zero"], correct: "It sinks" },
    { id: "db4", question: "Which reasoning chain is valid?", options: ["Greater displaced volume can increase buoyant force and support floating", "Greater mass always creates lower density", "Smaller volume always increases buoyant force", "Density has no relationship to floating"], correct: "Greater displaced volume can increase buoyant force and support floating" }
  ]
};
