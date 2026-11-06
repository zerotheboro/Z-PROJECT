export const activeRecallExperiment = {
  method: "active-recall" as const,

  category: "memory" as const,

  title: "Active Recall",

  topic: "Honeybee Communication",

  studyTime: 60,

  retrievalTime: 60,

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
        "Repeated wing buzzing",
        "A fixed scent mark",
        "A circular flight outside the hive"
      ],

      correct: "A waggle dance"
    },

    {
      id: "ar2",

      question:
        "What does the direction of the waggle dance help communicate?",

      options: [
        "The direction of the food",
        "The distance to the food",
        "The sugar concentration of the food",
        "The amount of food available"
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
        "The direction toward the food",
        "The scent of the food source",
        "The sugar concentration of the food"
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
        "Body temperature",
        "Abdominal stripe pattern",
        "Wingbeat frequency"
      ],

      correct: "Scent"
    }
  ]
};

export const FEYNMAN_STUDY_SECONDS = 60;

export const feynmanExperiment = {
  method: "feynman" as const,

  category: "understanding" as const,

  title: "Feynman Technique",

  topic: "Why do metal objects feel colder than wood?",

  studyTime: FEYNMAN_STUDY_SECONDS,

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
        "Metal stores more cold energy at the same temperature",
        "Wood removes heat from your hand faster"
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
        "Heat capacity alone",
        "Surface temperature alone",
        "Material density alone"
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
        "Warmer because faster heat transfer heats your skin",
        "Equally cold because equal temperatures always feel identical",
        "Less cold because faster transfer prevents your hand losing heat"
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
        "Heat flows from the wood into your warmer hand",
        "Wood removes heat faster but your skin detects it less"
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
        "The plates stop and the rocks continue moving",
        "Friction releases stress as fast as plates move",
        "Rocks on both sides move freely without resistance"
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
        "The rocks move without releasing stored energy",
        "The friction increases enough to prevent any movement",
        "The earthquake focus moves up to the surface"
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
        "As slow plate motion",
        "As pressure in the air",
        "As flowing molten rock"
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
        "The point on the fault with the greatest depth",
        "The surface area where all seismic waves end"
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
        "They supply young animals with fresh water",
        "They keep young animals in open water without cover",
        "They produce all the oxygen needed by ocean animals"
      ],
      correct: "They provide shelter and nursery areas"
    },
    {
      id: "ab2",
      question:
        "What do the algae living with reef-building corals provide?",
      options: [
        "Energy produced through photosynthesis",
        "Minerals collected directly from ocean sediment",
        "Energy released by digesting coral tissue",
        "Fresh water absorbed from the surrounding sea"
      ],
      correct: "Energy produced through photosynthesis"
    },
    {
      id: "ab3",
      question:
        "How can reefs help protect coastlines?",
      options: [
        "They reduce wave energy",
        "They prevent changes in sea level during tides",
        "They strengthen waves before the waves reach shore",
        "They replace sediment with deeper coastal water"
      ],
      correct: "They reduce wave energy"
    },
    {
      id: "ab4",
      question:
        "What happens during coral bleaching?",
      options: [
        "Corals expel the algae living with them",
        "Corals lose their calcium-carbonate skeletons",
        "Corals release reproductive cells that remove their color",
        "Corals gain extra algae that block their natural pigment"
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
        "Vaccination leaves a permanent supply of every antibody",
        "Vaccination prevents pathogens from ever entering the body",
        "All immune cells become identical after vaccination"
      ],
      correct: "Memory cells recognize the pathogen"
    },
    {
      id: "os2",
      question:
        "What does a vaccine safely present to the immune system?",
      options: [
        "A recognizable form or part of a pathogen",
        "A permanent dose of ready-made antibodies",
        "Only nutrients that make pathogens grow faster",
        "A substance that destroys every pathogen directly"
      ],
      correct: "A recognizable form or part of a pathogen"
    },
    {
      id: "os3",
      question:
        "Which statement best transfers the idea of immune memory?",
      options: [
        "Prior safe exposure prepares a faster later response",
        "Prior exposure makes later recognition unnecessary",
        "Prior exposure prevents every later infection",
        "Prior exposure helps only while the original vaccine remains"
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
        "It evaporates faster as the rising air cools",
        "It immediately falls as liquid rain without condensation",
        "It soaks into the atmosphere as groundwater"
      ],
      correct: "It condenses into droplets that can form clouds"
    },
    {
      id: "nt43",
      question:
        "When does precipitation occur?",
      options: [
        "When water droplets or ice crystals become heavy enough to fall",
        "Whenever liquid water absorbs enough heat to evaporate",
        "Whenever water vapor rises without forming droplets",
        "When clouds absorb water directly from plant roots"
      ],
      correct: "When water droplets or ice crystals become heavy enough to fall"
    },
    {
      id: "nt44",
      question:
        "Which sequence correctly connects four major parts of the water cycle?",
      options: [
        "Evaporation, condensation, precipitation, collection",
        "Evaporation, collection, condensation, precipitation",
        "Condensation, evaporation, collection, precipitation",
        "Precipitation, condensation, collection, evaporation"
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
    { id: "lsp1", question: "Which structure stores DNA?", options: ["Nucleus", "Ribosome", "Cell membrane", "Golgi apparatus"], correct: "Nucleus" },
    { id: "lsp2", question: "Which structure builds proteins?", options: ["Ribosome", "Nucleus", "Mitochondrion", "Cell membrane"], correct: "Ribosome" },
    { id: "lsp3", question: "Which structure controls entry and exit?", options: ["Cell membrane", "Nucleus", "Ribosome", "Mitochondrion"], correct: "Cell membrane" },
    { id: "lsp4", question: "Which structure releases usable energy?", options: ["Mitochondrion", "Cell membrane", "Nucleus", "Ribosome"], correct: "Mitochondrion" }
  ],
  test: [
    { id: "lst1", question: "A cell cannot assemble proteins correctly; which structure is most directly affected?", options: ["Ribosome", "Nucleus", "Cell membrane", "Mitochondrion"], correct: "Ribosome" },
    { id: "lst2", question: "Which structure regulates movement of substances into a cell?", options: ["Cell membrane", "Mitochondrion", "Ribosome", "Nucleus"], correct: "Cell membrane" },
    { id: "lst3", question: "Which pairing is correct?", options: ["Nucleus — stores DNA", "Ribosome ? regulates entry and exit", "Cell membrane ? builds proteins", "Mitochondrion ? packages proteins for secretion"], correct: "Nucleus — stores DNA" }
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
    { id: "st1", question: "What begins primary succession?", options: ["Bare rock with little or no soil", "A disturbance that leaves existing soil intact", "A site already covered with fertile topsoil", "A habitat where mature plants remain established"], correct: "Bare rock with little or no soil" },
    { id: "st2", question: "How do lichens help the sequence continue?", options: ["They help break down rock", "They prevent weathering and keep the rock intact", "They consume all the organic material needed for soil", "They replace soil-forming microbes with mature plants"], correct: "They help break down rock" },
    { id: "st3", question: "What normally becomes established after soil and small plants develop?", options: ["Grasses, shrubs, and eventually trees", "Only bare rock remains as the soil disappears", "Mature trees establish before any pioneer species", "Lichens immediately replace all established shrubs"], correct: "Grasses, shrubs, and eventually trees" },
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
    { id: "cc1", question: "What is opportunity cost?", options: ["The value of the best alternative given up", "The combined value of all alternatives given up", "The money paid for the chosen option alone", "The benefit received from the option selected"], correct: "The value of the best alternative given up" },
    { id: "cc2", question: "Why does opportunity cost exist?", options: ["Resources are limited and choices exclude alternatives", "The chosen option always costs money", "All alternatives provide identical benefits", "Every alternative can be selected at the same time"], correct: "Resources are limited and choices exclude alternatives" },
    { id: "cc3", question: "A student studies instead of working a paid shift; what is the clearest opportunity cost?", options: ["The wages from the shift", "The knowledge gained during the study session", "All wages the student could earn in any future job", "The textbook cost already paid before making the choice"], correct: "The wages from the shift" },
    { id: "cc4", question: "When is this idea most useful?", options: ["When comparing choices that use limited resources", "When evaluating only costs already incurred", "When adding every possible alternative together", "When ignoring the next-best use of time or money"], correct: "When comparing choices that use limited resources" }
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
    { id: "hf1", question: "What normally happens before water enters the public supply?", options: ["It is treated to remove contaminants", "It is distributed before any contaminants are removed", "It is mixed with untreated wastewater for storage", "It is sent through household drains for purification"], correct: "It is treated to remove contaminants" },
    { id: "hf2", question: "What maintains the movement and pressure of treated water?", options: ["Pumps, pipes, and storage tanks", "Rainfall alone after water has entered household pipes", "Drainage pipes carrying used water away from homes", "Household taps without pumps or storage pressure"], correct: "Pumps, pipes, and storage tanks" },
    { id: "hf3", question: "Which heading would contain information about used water?", options: ["Managing wastewater", "Collecting water", "Treating water", "Distributing water"], correct: "Managing wastewater" },
    { id: "hf4", question: "What overall structure do the headings reveal?", options: ["A sequence from sourcing water to handling used water", "A comparison of treatment methods without a distribution stage", "A sequence that ends before treated water reaches users", "A cycle that sends wastewater directly into drinking-water pipes"], correct: "A sequence from sourcing water to handling used water" }
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
    { id: "pq1", question: "How do mangrove roots directly reduce wave damage?", options: ["They slow waves and currents", "They prevent waves by stopping the ocean tides", "They weaken waves mainly by warming coastal water", "They absorb the full volume of every incoming wave"], correct: "They slow waves and currents" },
    { id: "pq2", question: "Why does sediment collect near mangrove roots?", options: ["Slower water drops suspended material", "Roots filter salt out of water to produce the sediment", "Faster flow holds more particles against the roots", "The roots dissolve existing sediment into the water"], correct: "Slower water drops suspended material" },
    { id: "pq3", question: "How do mangroves support young marine animals?", options: ["Their roots create sheltered nursery habitat", "Their roots provide fresh water for all marine young", "Their roots remove every predator from coastal water", "Their roots keep young animals away from available food"], correct: "Their roots create sheltered nursery habitat" },
    { id: "pq4", question: "What central idea connects the material?", options: ["Root structure provides physical protection and ecological habitat", "Roots protect coasts only by taking up rainfall", "Root systems improve habitat by increasing wave speed", "Root systems protect shores by removing all sediment"], correct: "Root structure provides physical protection and ecological habitat" }
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
    { id: "de1", question: "Which organism receives energy directly from grasshoppers?", options: ["Frogs", "Grass", "Rabbits", "Hawks"], correct: "Frogs" },
    { id: "de2", question: "What do arrows represent in this food web?", options: ["The direction of energy transfer", "The direction in which predators move toward prey", "The relative number of organisms in each population", "The direction in which nutrients leave the ecosystem"], correct: "The direction of energy transfer" },
    { id: "de3", question: "How do decomposers support new plant growth?", options: ["They return nutrients to the soil", "They return energy directly to the Sun", "They turn dead matter into new sunlight", "They prevent nutrients from re-entering the soil"], correct: "They return nutrients to the soil" },
    { id: "de4", question: "Which path correctly shows energy movement?", options: ["Grass → rabbit → hawk", "Hawk ? rabbit ? grass", "Frog ? grasshopper ? grass", "Grass ? hawk ? rabbit"], correct: "Grass → rabbit → hawk" }
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
    { id: "et1", question: "Which action has the greatest effect on preventing unusable recycling?", options: ["Teach residents how to avoid contamination", "Empty bins more often without checking what goes into them", "Add more collection points without explaining accepted materials", "Promote the recycling rate without addressing rejected loads"], correct: "Teach residents how to avoid contamination" },
    { id: "et2", question: "Why should accepted materials be identified first?", options: ["It determines what the program can successfully process", "It determines the visual style used on recycling posters", "It allows every material to be placed in the same bin", "It makes contamination checks unnecessary after collection"], correct: "It determines what the program can successfully process" },
    { id: "et3", question: "Which pair represents high-value priorities?", options: ["Convenient bins and reliable collection", "Poster design and frequent slogan changes", "Volunteer uniforms and launch-day decorations", "Logo selection and repeated publicity events"], correct: "Convenient bins and reliable collection" },
    { id: "et4", question: "What does applying 80/20 accomplish here?", options: ["It focuses effort on actions that drive most program success", "It gives every minor task the same amount of effort", "It fixes the useful actions at exactly twenty percent", "It prioritizes the easiest visible tasks regardless of impact"], correct: "It focuses effort on actions that drive most program success" }
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
    { id: "ds1", question: "What normally happens after a bill is introduced?", options: ["A committee studies it", "It becomes law before any legislative review", "It goes directly to enforcement without a vote", "It receives executive approval before committee review"], correct: "A committee studies it" },
    { id: "ds2", question: "Why might approved versions need reconciliation?", options: ["The chambers may approve different wording", "The committee must reconcile executive vetoes before any vote", "The chambers always approve identical wording independently", "The law must be enforced before its wording is compared"], correct: "The chambers may approve different wording" },
    { id: "ds3", question: "Which action occurs before executive consideration?", options: ["The legislature approves a final version", "The final version is enforced before a legislative vote", "The executive rewrites the bill before any chamber votes", "The committee alone replaces the final legislative vote"], correct: "The legislature approves a final version" },
    { id: "ds4", question: "Why is dividing the process into steps useful?", options: ["It reveals the sequence and role of each decision", "It lets intermediate approvals be skipped without consequence", "It makes the sequence of decisions interchangeable", "It replaces each decision with the final outcome alone"], correct: "It reveals the sequence and role of each decision" }
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
    { id: "db1", question: "What determines the buoyant force on an object?", options: ["The weight of displaced water", "The mass of the object regardless of displacement", "The volume of the object above the waterline", "The density of the object without considering the water"], correct: "The weight of displaced water" },
    { id: "db2", question: "Why can a hollow steel ship float?", options: ["Its shape lowers average density and displaces enough water", "Its hollow shape removes the mass of the steel", "Its weight becomes smaller than its mass in air", "Its hull prevents any downward gravitational force"], correct: "Its shape lowers average density and displaces enough water" },
    { id: "db3", question: "What happens when an object's weight exceeds the available buoyant force?", options: ["It sinks", "It floats higher", "It stays suspended", "Its displaced volume decreases"], correct: "It sinks" },
    { id: "db4", question: "Which reasoning chain is valid?", options: ["Greater displaced volume can increase buoyant force and support floating", "Greater mass always creates lower average density", "Smaller displaced volume always increases buoyant force", "The volume above the waterline alone determines buoyancy"], correct: "Greater displaced volume can increase buoyant force and support floating" }
  ]
};

export const kidlinRuleExperiment={method:"kidlin-rule" as const,category:"problem-solving" as const,title:"Kidlin's rule",topic:"Clarifying a delayed group project",vagueProblem:"Our group project is going badly.",context:"The research summary was due Tuesday. Two members are waiting because the source list has not been shared, and no one has been assigned to send it.",questions:[
{id:"kr1",question:"Which rewrite is most actionable?",options:["Assign one member to share the source list today so the waiting summaries can begin","Ask everyone to work harder without assigning the missing source list","Postpone every task until the final deadline becomes clearer","Replace the source list task with a general reminder to collaborate"],correct:"Assign one member to share the source list today so the waiting summaries can begin"},
{id:"kr2",question:"What is the clearest obstacle?",options:["The source list has not been shared or assigned","The summaries are late even though every needed input is available","Every member has too little ability to write summaries","The deadline alone explains why no source list was shared"],correct:"The source list has not been shared or assigned"},
{id:"kr3",question:"Which wording should be removed as ambiguous?",options:["Going badly","Due Tuesday","Two members","Source list"],correct:"Going badly"}]};
export const premackPrincipleExperiment={method:"premack-principle" as const,category:"focus" as const,title:"Premack's principle",topic:"Reviewing cell-division vocabulary",task:"Study the short explanation before taking your preferred activity.",material:"Interphase prepares the cell for division. During mitosis, duplicated chromosomes separate into two nuclei. Cytokinesis then divides the cytoplasm, producing two daughter cells.",preferredExamples:["A short favorite video","A game break","Listening to a preferred song"],questions:[
{id:"pp1",question:"What happens during mitosis?",options:["Duplicated chromosomes separate into two nuclei","The cytoplasm separates before chromosomes are copied","Chromosomes are copied into four genetically different nuclei","Two nuclei fuse to create a cell with twice as many chromosomes"],correct:"Duplicated chromosomes separate into two nuclei"},
{id:"pp2",question:"What does cytokinesis divide?",options:["The cytoplasm","Only the chromosomes","The cell's DNA before replication","The nuclear membrane before chromosomes separate"],correct:"The cytoplasm"},
{id:"pp3",question:"Which pairing follows Premack's principle?",options:["Finish the review, then watch a preferred short video","Watch the preferred video before starting the review","Review while watching the preferred video throughout","Give the video reward whether or not the review is finished"],correct:"Finish the review, then watch a preferred short video"}]};
export const wallStareExperiment={method:"ten-minute-wall-stare" as const,category:"focus" as const,title:"10 min wall stare",topic:"How sleep cycles support memory",material:"Sleep cycles alternate through non-REM and REM stages. Deep non-REM sleep supports stabilization of newly learned facts, while REM sleep is associated with integrating memories and emotional information. Repeated cycles give the brain multiple opportunities to process learning.",questions:[
{id:"ws1",question:"Which stage especially supports stabilizing newly learned facts?",options:["Deep non-REM sleep","Only brief awakenings between cycles","Only the transition from wakefulness into sleep","Only the waking period before the first sleep cycle"],correct:"Deep non-REM sleep"},
{id:"ws2",question:"What is REM sleep associated with here?",options:["Integrating memories and emotional information","Storing memories only by preventing emotional processing","Taking over every function normally performed during non-REM sleep","Keeping the brain in the same stage for the whole night"],correct:"Integrating memories and emotional information"},
{id:"ws3",question:"Why can repeated cycles matter?",options:["They provide repeated opportunities to process learning","They keep all memory processing within the first sleep stage","They remove the need to revisit material while awake","They prevent later sleep stages from contributing to learning"],correct:"They provide repeated opportunities to process learning"}]};
export const strooperEffectExperiment={method:"strooper-effect" as const,category:"focus" as const,title:"Strooper effect",topic:"Selective attention and interference",material:"Selective attention prioritizes task-relevant information while competing information is suppressed. In a Stroop-style task, the automatic tendency to read a word conflicts with naming its ink color. Resolving that conflict engages inhibitory control.",colors:[{name:"red",hsla:"hsl(0 100% 45%)"},{name:"blue",hsla:"hsl(240 100% 50%)"},{name:"green",hsla:"hsl(120 100% 35%)"},{name:"orange",hsla:"hsl(30 100% 45%)"}],questions:[
{id:"se1",question:"What creates interference in a Stroop-style task?",options:["The word meaning conflicts with the ink color","The learner names the word while ignoring its meaning","The ink color matches an unrelated shape on the screen","The task requires reading black text without naming its color"],correct:"The word meaning conflicts with the ink color"},
{id:"se2",question:"What should the learner focus on?",options:["The ink color","The written color word","The position of the word on the screen","The first letter of the displayed word"],correct:"The ink color"},
{id:"se3",question:"Which control process helps resolve the conflict?",options:["Inhibitory control","Automatic reading","Response repetition","Reward tracking"],correct:"Inhibitory control"}]};
export const twoXVideoExperiment={method:"two-x-video-speed" as const,category:"understanding" as const,title:"2X video speed",topic:"A tour of prokaryotic and eukaryotic cells",youtubeId:"jsDxw63QqK0",videoTitle:"A Tour of the Cell: Crash Course Biology #23",channel:"CrashCourse",focusPoints:["Distinguish prokaryotic cells from eukaryotic cells.","Notice how organelles perform specialized jobs.","Connect small cell size with surface-area-to-volume ratio."],questions:[
{id:"vx1",question:"Which cells contain a membrane-bound nucleus?",options:["Eukaryotic cells","Bacterial cells","Archaeal cells","Mature mammalian red blood cells"],correct:"Eukaryotic cells"},
{id:"vx2",question:"What are organelles?",options:["Specialized structures that perform cell functions","Entire cells specialized for different tissues","Only the genetic instructions inside a nucleus","Spaces outside cells that connect neighboring tissues"],correct:"Specialized structures that perform cell functions"},
{id:"vx3",question:"Why does remaining small help many cells?",options:["It maintains a favorable surface-area-to-volume ratio","It reduces the amount of membrane relative to cell volume","It makes the cell's volume increase faster than its surface area","It eliminates the need to exchange nutrients and wastes"],correct:"It maintains a favorable surface-area-to-volume ratio"}]};
