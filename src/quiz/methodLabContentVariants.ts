import type {
  TrainingMethodId
} from "./type";

const question = (
  id: string,
  prompt: string,
  correct: string,
  distractor1: string,
  distractor2: string,
  distractor3: string
) => ({
  id,
  question: prompt,
  options: [
    correct,
    distractor1,
    distractor2,
    distractor3
  ],
  correct
});

type MethodWithGeneratedVariants = Exclude<
  TrainingMethodId,
  "two-x-video-speed"
>;

export const methodLabContentVariants = {
  "active-recall": [
    {
      method: "active-recall" as const,
      category: "memory" as const,
      title: "Active Recall",
      topic: "How flowering plants are pollinated",
      studyTime: 30,
      retrievalTime: 30,
      facts: [
        "Pollination moves pollen from an anther to a stigma.",
        "Bees and other animals can carry pollen between flowers.",
        "Wind pollinates some plants, including many grasses.",
        "After successful pollination and fertilization, an ovule can develop into a seed.",
        "Flowers often use color, scent, or nectar to attract animal pollinators."
      ],
      questions: [
        question("arl2q1", "Where must pollen arrive during pollination?", "A stigma", "A root tip", "A leaf vein", "A seed coat"),
        question("arl2q2", "What can carry pollen between flowers?", "Bees and other animals", "Only groundwater", "Only moonlight", "Rock particles"),
        question("arl2q3", "What may an ovule become after fertilization?", "A seed", "A petal", "A root hair", "A thorn"),
        question("arl2q4", "What can attract animal pollinators?", "Color, scent, or nectar", "Only deep roots", "Frozen soil", "Rock fragments")
      ]
    },
    {
      method: "active-recall" as const,
      category: "memory" as const,
      title: "Active Recall",
      topic: "Tectonic plate boundaries",
      studyTime: 30,
      retrievalTime: 30,
      facts: [
        "Earth's outer shell is divided into moving tectonic plates.",
        "At divergent boundaries, plates move apart and new crust can form.",
        "At convergent boundaries, plates move toward one another.",
        "At transform boundaries, plates slide past one another.",
        "Earthquakes can occur when built-up stress is released along faults."
      ],
      questions: [
        question("arl3q1", "What happens at a divergent boundary?", "Plates move apart", "Plates stop permanently", "Plates become clouds", "Plates orbit the Moon"),
        question("arl3q2", "At which boundary do plates slide past each other?", "A transform boundary", "A divergent boundary only", "A shoreline", "A river boundary"),
        question("arl3q3", "What can happen when fault stress is released?", "An earthquake", "A lunar eclipse", "Photosynthesis", "Condensation"),
        question("arl3q4", "What can form where plates move apart?", "New crust", "A new atmosphere", "Plant tissue", "Ocean salt")
      ]
    }
  ],
  feynman: [
    {
      method: "feynman" as const,
      category: "understanding" as const,
      title: "Feynman Technique",
      topic: "Why does the daytime sky often look blue?",
      studyTime: 35,
      explanation: "Sunlight contains many colors. When sunlight enters Earth's atmosphere, tiny gas molecules scatter shorter blue wavelengths more strongly than longer red wavelengths. Scattered blue light reaches our eyes from many directions, so much of the clear daytime sky appears blue.",
      questions: [
        question("fyl2q1", "Why does a clear daytime sky often appear blue?", "Blue wavelengths are scattered strongly by the atmosphere", "The ocean paints the air blue", "Clouds produce blue light", "The Sun emits only blue light"),
        question("fyl2q2", "What interacts with sunlight to produce this scattering?", "Gas molecules in the atmosphere", "Only ocean waves", "Earth's inner core", "Tree roots"),
        question("fyl2q3", "Why can blue light reach an observer from many directions?", "It is scattered through the atmosphere", "It stops moving", "It becomes sound", "It travels only underground"),
        question("fyl2q4", "Which wavelengths are scattered more strongly in this explanation?", "Shorter blue wavelengths", "Longer red wavelengths", "Only infrared wavelengths", "All wavelengths identically")
      ]
    },
    {
      method: "feynman" as const,
      category: "understanding" as const,
      title: "Feynman Technique",
      topic: "Why does sweating cool the body?",
      studyTime: 35,
      explanation: "Sweat is mostly water released onto the skin. The fastest-moving water molecules can escape into the air as vapor. Evaporation requires energy, and some of that energy comes from heat at the skin's surface. As heat leaves with the evaporating water, the skin cools. Sweating is less effective when humid air slows evaporation.",
      questions: [
        question("fyl3q1", "What process makes sweat cool the skin?", "Evaporation", "Freezing", "Condensation onto the skin", "Combustion"),
        question("fyl3q2", "Where does some energy for evaporation come from?", "Heat at the skin's surface", "Sound in the air", "Hair color", "Gravity alone"),
        question("fyl3q3", "Why can humid air reduce the cooling effect?", "It slows sweat evaporation", "It freezes sweat instantly", "It removes all water", "It stops blood flow"),
        question("fyl3q4", "Which molecules are most likely to escape during evaporation?", "Faster-moving water molecules", "Only salt molecules", "Skin cells", "The slowest air molecules")
      ]
    }
  ],
  cornell: [
    {
      method: "cornell" as const,
      category: "organization" as const,
      title: "Cornell Notes",
      topic: "How photosynthesis stores energy",
      content: "Plants absorb light with pigments such as chlorophyll. In chloroplasts, light energy helps convert carbon dioxide and water into energy-rich sugars. Oxygen is released as a by-product. The sugars can be used in respiration, growth, or storage. Stomata in leaves allow carbon dioxide to enter and oxygen to leave.",
      questions: [
        question("col2q1", "Which organelle carries out photosynthesis?", "The chloroplast", "The nucleus only", "The ribosome", "The cell membrane only"),
        question("col2q2", "Which gas enters a leaf for photosynthesis?", "Carbon dioxide", "Helium", "Hydrogen only", "Neon"),
        question("col2q3", "What energy-rich product does photosynthesis make?", "Sugar", "Rock", "Nitrogen gas", "Salt"),
        question("col2q4", "What do stomata allow carbon dioxide to do?", "Enter the leaf", "Become chlorophyll", "Leave only through roots", "Turn into oxygen outside the plant")
      ]
    },
    {
      method: "cornell" as const,
      category: "organization" as const,
      title: "Cornell Notes",
      topic: "How kidneys form urine",
      content: "Blood enters each kidney and passes through many microscopic filtering units called nephrons. Filtration moves water and small dissolved substances out of the blood. Useful substances and much of the water are then reabsorbed. Additional wastes can be secreted into the forming urine. Urine travels through ureters to the bladder before leaving through the urethra.",
      questions: [
        question("col3q1", "What are the kidney's microscopic filtering units called?", "Nephrons", "Alveoli", "Neurons", "Tendons"),
        question("col3q2", "What happens to many useful filtered substances?", "They are reabsorbed", "They become bones", "They enter the lungs", "They are always discarded"),
        question("col3q3", "Where is urine stored before it leaves the body?", "The bladder", "The stomach", "The liver", "The pancreas"),
        question("col3q4", "Which tubes carry urine from kidneys to the bladder?", "Ureters", "Arteries", "Bronchi", "Tendons")
      ]
    }
  ],
  interleaving: [
    {
      method: "interleaving" as const,
      category: "problem-solving" as const,
      title: "Interleaving",
      instructions: [
        { type: "perimeter", name: "Perimeter", rule: "Add the lengths of every outside edge.", example: "Rectangle 3 by 5: 3 + 5 + 3 + 5 = 16" },
        { type: "unit-rate", name: "Unit rate", rule: "Divide the total quantity by the number of units.", example: "$12 for 3 items = $4 per item" },
        { type: "equation", name: "Multiplication equation", rule: "Divide both sides by the coefficient of x.", example: "4x = 20, so x = 5" }
      ],
      practice: [
        question("inl2p1", "What is the perimeter of a 4 by 6 rectangle?", "20", "24", "10", "18"),
        question("inl2p2", "$18 for 6 notebooks is what unit price?", "$3", "$6", "$12", "$24"),
        question("inl2p3", "Solve 5x = 35.", "7", "5", "30", "40"),
        question("inl2p4", "What is the perimeter of a 3 by 8 rectangle?", "22", "24", "11", "19"),
        question("inl2p5", "$28 for 7 pens is what unit price?", "$4", "$7", "$21", "$35"),
        question("inl2p6", "Solve 6x = 54.", "9", "6", "48", "60")
      ],
      test: [
        question("inl2t1", "What is the perimeter of a 7 by 2 rectangle?", "18", "14", "9", "16"),
        question("inl2t2", "Solve 8x = 48.", "6", "8", "40", "56"),
        question("inl2t3", "15 kilometers in 3 hours is what unit rate?", "5 km/h", "12 km/h", "18 km/h", "45 km/h"),
        question("inl2t4", "What is the perimeter of a 9 by 4 rectangle?", "26", "36", "13", "22")
      ]
    },
    {
      method: "interleaving" as const,
      category: "problem-solving" as const,
      title: "Interleaving",
      instructions: [
        { type: "fraction", name: "Fraction addition", rule: "Use a common denominator before adding numerators.", example: "1/4 + 2/4 = 3/4" },
        { type: "area", name: "Triangle area", rule: "Multiply base by height, then divide by two.", example: "Base 6, height 4: 6 x 4 / 2 = 12" },
        { type: "probability", name: "Simple probability", rule: "Divide favorable outcomes by all equally likely outcomes.", example: "One even face on a two-face spinner = 1/2" }
      ],
      practice: [
        question("inl3p1", "What is 2/5 + 1/5?", "3/5", "3/10", "1/5", "2/10"),
        question("inl3p2", "What is the area of a triangle with base 8 and height 3?", "12", "24", "11", "16"),
        question("inl3p3", "What is the probability of rolling a 3 on a fair six-sided die?", "1/6", "1/3", "3/6", "5/6"),
        question("inl3p4", "What is 1/6 + 4/6?", "5/6", "5/12", "3/6", "4/12"),
        question("inl3p5", "What is the area of a triangle with base 12 and height 2?", "12", "24", "14", "10"),
        question("inl3p6", "A spinner has 3 equal sections and one is green. What is P(green)?", "1/3", "2/3", "1/2", "3")
      ],
      test: [
        question("inl3t1", "What is 3/8 + 2/8?", "5/8", "5/16", "1/8", "6/8"),
        question("inl3t2", "What is the area of a triangle with base 10 and height 5?", "25", "50", "15", "30"),
        question("inl3t3", "A bag has 2 red and 6 blue counters. What is P(red)?", "1/4", "1/2", "2/6", "3/4"),
        question("inl3t4", "What is 2/7 + 3/7?", "5/7", "5/14", "1/7", "6/7")
      ]
    }
  ],
  "memory-palace": [
    {
      method: "memory-palace" as const,
      category: "memory" as const,
      title: "Memory Palace",
      topic: "Remembering ocean zones",
      locations: ["Front gate", "Hallway", "Desk", "Window", "Bookshelf"],
      items: ["Sunlight zone", "Twilight zone", "Midnight zone", "Abyss", "Trenches"],
      pairings: [
        { location: "Front gate", item: "Sunlight zone" },
        { location: "Hallway", item: "Twilight zone" },
        { location: "Desk", item: "Midnight zone" },
        { location: "Window", item: "Abyss" },
        { location: "Bookshelf", item: "Trenches" }
      ],
      questions: [
        question("mpl2q1", "Which zone was at the front gate?", "Sunlight zone", "Abyss", "Trenches", "Midnight zone"),
        question("mpl2q2", "What was paired with the desk?", "Midnight zone", "Twilight zone", "Sunlight zone", "Trenches"),
        question("mpl2q3", "Where were trenches placed?", "Bookshelf", "Window", "Hallway", "Front gate"),
        question("mpl2q4", "What was paired with the hallway?", "Twilight zone", "Abyss", "Sunlight zone", "Trenches"),
        question("mpl2q5", "Where was the abyss placed?", "Window", "Desk", "Bookshelf", "Front gate")
      ]
    },
    {
      method: "memory-palace" as const,
      category: "memory" as const,
      title: "Memory Palace",
      topic: "Remembering the digestive path",
      locations: ["Door", "Coat rack", "Sofa", "Sink", "Bed"],
      items: ["Mouth", "Esophagus", "Stomach", "Small intestine", "Large intestine"],
      pairings: [
        { location: "Door", item: "Mouth" },
        { location: "Coat rack", item: "Esophagus" },
        { location: "Sofa", item: "Stomach" },
        { location: "Sink", item: "Small intestine" },
        { location: "Bed", item: "Large intestine" }
      ],
      questions: [
        question("mpl3q1", "What was paired with the sofa?", "Stomach", "Mouth", "Large intestine", "Esophagus"),
        question("mpl3q2", "Where was the small intestine placed?", "Sink", "Door", "Bed", "Coat rack"),
        question("mpl3q3", "Which organ was at the coat rack?", "Esophagus", "Stomach", "Mouth", "Large intestine"),
        question("mpl3q4", "What was placed at the door?", "Mouth", "Stomach", "Small intestine", "Large intestine"),
        question("mpl3q5", "Where was the large intestine placed?", "Bed", "Sink", "Sofa", "Coat rack")
      ]
    }
  ],
  "active-blurting": [
    {
      method: "active-blurting" as const,
      category: "memory" as const,
      title: "Active Blurting",
      topic: "Why the Moon has phases",
      facts: [
        "The Moon reflects sunlight rather than producing its own visible light.",
        "Half of the Moon is illuminated by the Sun at any moment.",
        "As the Moon orbits Earth, we see different portions of its illuminated half.",
        "A full cycle of phases takes about one month.",
        "Moon phases are not normally caused by Earth's shadow."
      ],
      questions: [
        question("abl2q1", "What light makes the Moon visible?", "Reflected sunlight", "Light made by lunar oceans", "Lightning", "City lights"),
        question("abl2q2", "Why does the Moon appear to change shape?", "We see different portions of its illuminated half", "The Moon physically changes size", "Clouds carve its surface", "Earth switches off the Sun"),
        question("abl2q3", "About how long does a phase cycle take?", "One month", "One day", "One hour", "One decade"),
        question("abl2q4", "What normally does not cause the monthly phases?", "Earth's shadow", "The Moon's orbit", "Reflected sunlight", "The changing viewing angle")
      ]
    },
    {
      method: "active-blurting" as const,
      category: "memory" as const,
      title: "Active Blurting",
      topic: "The path of blood through the heart",
      facts: [
        "The right side of the heart receives oxygen-poor blood from the body.",
        "The right ventricle pumps blood to the lungs.",
        "In the lungs, blood releases carbon dioxide and gains oxygen.",
        "The left side of the heart receives oxygen-rich blood from the lungs.",
        "The left ventricle pumps oxygen-rich blood to the body."
      ],
      questions: [
        question("abl3q1", "Where does the right ventricle send blood?", "The lungs", "The stomach", "The kidneys only", "The left hand only"),
        question("abl3q2", "What does blood gain in the lungs?", "Oxygen", "Bone tissue", "Food", "Sunlight"),
        question("abl3q3", "Which chamber pumps oxygen-rich blood to the body?", "The left ventricle", "The right atrium", "The right ventricle", "The left atrium only"),
        question("abl3q4", "What does blood release in the lungs?", "Carbon dioxide", "Oxygen", "Glucose", "Bone marrow")
      ]
    }
  ],
  "one-sentence": [
    {
      method: "one-sentence" as const,
      category: "understanding" as const,
      title: "1 sentence",
      topic: "How the greenhouse effect warms Earth",
      explanation: "Earth's surface absorbs energy from sunlight and releases some energy as infrared radiation. Greenhouse gases absorb and re-emit part of that outgoing infrared energy. This slows heat loss to space and keeps the lower atmosphere and surface warmer than they would otherwise be.",
      questions: [
        question("osl2q1", "What outgoing energy do greenhouse gases absorb?", "Infrared radiation", "Sound waves", "Ocean currents", "Visible objects"),
        question("osl2q2", "What is the main effect of this absorption and re-emission?", "Heat loss to space is slowed", "Sunlight stops reaching Earth", "Gravity becomes weaker", "The atmosphere disappears"),
        question("osl2q3", "Which sentence best summarizes the mechanism?", "Greenhouse gases slow the escape of outgoing heat", "Greenhouse gases create all solar energy", "Only clouds warm Earth", "Earth receives no infrared energy")
      ]
    },
    {
      method: "one-sentence" as const,
      category: "understanding" as const,
      title: "1 sentence",
      topic: "How antibiotic resistance spreads",
      explanation: "An antibiotic may kill susceptible bacteria while resistant bacteria survive. The survivors reproduce and can pass resistance traits to later generations or other bacteria. Misusing antibiotics increases selection for resistant bacteria, but it does not make a person's body resistant.",
      questions: [
        question("osl3q1", "Which bacteria are most likely to survive an antibiotic?", "Bacteria with resistance", "Every susceptible bacterium", "Only viruses", "Human blood cells"),
        question("osl3q2", "What can surviving resistant bacteria do?", "Reproduce and spread resistance traits", "Turn into human cells", "Remove all other genes", "Stop evolution"),
        question("osl3q3", "What becomes resistant?", "The bacteria", "The person's entire body", "The antibiotic bottle", "All viruses")
      ]
    }
  ],
  "note-taking-4x4": [
    {
      method: "note-taking-4x4" as const,
      category: "organization" as const,
      title: "Note-taking 4x4",
      topic: "Four parts of ecosystem energy flow",
      content: "Producers capture energy, usually from sunlight, and store it in organic molecules. Primary consumers eat producers. Higher-level consumers obtain energy by eating other consumers. Decomposers break down dead material and return nutrients, although energy is lost as heat at each transfer. These four roles connect food chains into food webs.",
      questions: [
        question("n4l2q1", "Which organisms capture energy first?", "Producers", "Decomposers only", "Higher-level consumers", "Parasites only"),
        question("n4l2q2", "What do primary consumers eat?", "Producers", "Only decomposers", "Sunlight", "Minerals alone"),
        question("n4l2q3", "What do decomposers return to ecosystems?", "Nutrients", "All lost heat", "New sunlight", "Gravity"),
        question("n4l2q4", "What happens to some energy at each transfer?", "It is lost as heat", "It becomes new sunlight", "It is fully recycled", "It turns into minerals")
      ]
    },
    {
      method: "note-taking-4x4" as const,
      category: "organization" as const,
      title: "Note-taking 4x4",
      topic: "Four stages of breathing and gas transport",
      content: "Ventilation moves air into and out of the lungs. Gas exchange at the alveoli moves oxygen into blood and carbon dioxide out. Circulation transports these gases between lungs and tissues. Cellular respiration uses oxygen to release usable energy, producing carbon dioxide that returns to the lungs.",
      questions: [
        question("n4l3q1", "What does ventilation do?", "Moves air into and out of the lungs", "Makes blood cells", "Digests food", "Filters urine"),
        question("n4l3q2", "Where does oxygen enter the blood?", "At the alveoli", "In the stomach", "At a joint", "In the bladder"),
        question("n4l3q3", "Which process uses oxygen to release usable energy?", "Cellular respiration", "Condensation", "Filtration", "Reflection"),
        question("n4l3q4", "What carries gases between lungs and tissues?", "Circulation", "Digestion", "The skeleton alone", "Skin pigment")
      ]
    }
  ],
  "leitner-system": [
    {
      method: "leitner-system" as const,
      category: "memory" as const,
      title: "Leitner system",
      topic: "Changes of state",
      cards: [
        { id: "lsl2c1", front: "Melting", back: "Solid to liquid." },
        { id: "lsl2c2", front: "Freezing", back: "Liquid to solid." },
        { id: "lsl2c3", front: "Evaporation", back: "Liquid to gas at a surface." },
        { id: "lsl2c4", front: "Condensation", back: "Gas to liquid." }
      ],
      practice: [
        question("lsl2p1", "What is liquid changing to gas at a surface?", "Evaporation", "Freezing", "Condensation", "Melting"),
        question("lsl2p2", "What is gas changing to liquid?", "Condensation", "Melting", "Freezing", "Evaporation"),
        question("lsl2p3", "What is solid changing to liquid?", "Melting", "Freezing", "Condensation", "Evaporation"),
        question("lsl2p4", "What is liquid changing to solid?", "Freezing", "Melting", "Evaporation", "Condensation")
      ],
      test: [
        question("lsl2t1", "Water droplets form from water vapor. Which change occurred?", "Condensation", "Evaporation", "Melting", "Freezing"),
        question("lsl2t2", "Ice becomes liquid water. Which change occurred?", "Melting", "Condensation", "Freezing", "Evaporation"),
        question("lsl2t3", "Liquid water becomes solid ice. Which change occurred?", "Freezing", "Melting", "Evaporation", "Condensation")
      ]
    },
    {
      method: "leitner-system" as const,
      category: "memory" as const,
      title: "Leitner system",
      topic: "Basic genetics vocabulary",
      cards: [
        { id: "lsl3c1", front: "DNA", back: "Molecule that stores genetic information." },
        { id: "lsl3c2", front: "Gene", back: "A DNA segment that contributes to a functional product." },
        { id: "lsl3c3", front: "Chromosome", back: "Packaged DNA associated with proteins." },
        { id: "lsl3c4", front: "Allele", back: "A version of a gene." }
      ],
      practice: [
        question("lsl3p1", "What is a version of a gene?", "An allele", "A tissue", "An organ", "A lipid"),
        question("lsl3p2", "What molecule stores genetic information?", "DNA", "Water", "Glucose only", "Calcium"),
        question("lsl3p3", "What packages DNA with proteins?", "A chromosome", "A rib", "A hormone", "A membrane pore"),
        question("lsl3p4", "What is a segment of DNA that contributes to a product?", "A gene", "A tissue", "An organ", "A mineral")
      ],
      test: [
        question("lsl3t1", "Two versions of the same gene are called what?", "Alleles", "Organs", "Tissues", "Enzymes"),
        question("lsl3t2", "A gene is best described as what?", "A segment of DNA", "A whole organism", "A mineral", "A blood vessel"),
        question("lsl3t3", "Genetic information is stored in which molecule?", "DNA", "Water", "Calcium", "Cellulose only")
      ]
    }
  ],
  "story-telling": [
    {
      method: "story-telling" as const,
      category: "memory" as const,
      title: "Story telling",
      topic: "The sequence of seed germination",
      orderedItems: [
        "A seed absorbs water.",
        "Metabolism becomes more active.",
        "The first root emerges.",
        "A shoot grows upward.",
        "Leaves begin photosynthesis."
      ],
      questions: [
        question("stl2q1", "What usually begins germination?", "The seed absorbs water", "Leaves make fruit", "The root dries", "Flowers open"),
        question("stl2q2", "Which structure normally emerges first?", "The first root", "A flower", "A fruit", "A branch"),
        question("stl2q3", "What can new leaves begin doing?", "Photosynthesis", "Digestion", "Erosion", "Freezing"),
        question("stl2q4", "What becomes more active after water is absorbed?", "Metabolism", "Rock weathering", "Moonlight", "Ocean tides")
      ]
    },
    {
      method: "story-telling" as const,
      category: "memory" as const,
      title: "Story telling",
      topic: "The stages of drinking-water treatment",
      orderedItems: [
        "Coagulants help small particles clump together.",
        "Larger clumps settle from the water.",
        "Filters remove remaining particles.",
        "Disinfection inactivates harmful microorganisms.",
        "Treated water enters storage and distribution."
      ],
      questions: [
        question("stl3q1", "What helps small particles form larger clumps?", "Coagulation", "Distribution", "Evaporation", "Combustion"),
        question("stl3q2", "What follows settling in this sequence?", "Filtration", "Collection from homes", "Freezing", "Weathering"),
        question("stl3q3", "Why is disinfection used?", "To inactivate harmful microorganisms", "To add large debris", "To create sediment", "To remove all oxygen"),
        question("stl3q4", "What happens after disinfection in this sequence?", "Storage and distribution", "Coagulation begins again", "Raw water is collected", "Filters are removed")
      ]
    }
  ],
  "capture-create": [
    {
      method: "capture-create" as const,
      category: "understanding" as const,
      title: "capture & create",
      topic: "Supply and demand",
      content: "Demand describes how much buyers are willing and able to purchase at different prices. Supply describes how much sellers are willing and able to offer. Other things equal, a higher price tends to reduce quantity demanded and increase quantity supplied. A market price can move toward a point where quantities supplied and demanded are equal.",
      questions: [
        question("ccl2q1", "What does demand describe?", "Buyer willingness and ability to purchase", "Only factory size", "Government ownership", "Weather alone"),
        question("ccl2q2", "Other things equal, what does a higher price tend to do to quantity demanded?", "Reduce it", "Always double it", "Leave it legally fixed", "Turn it into supply"),
        question("ccl2q3", "What is true at a market equilibrium?", "Quantity supplied equals quantity demanded", "No buyer exists", "Every product is free", "Supply is always zero"),
        question("ccl2q4", "Other things equal, what does a higher price tend to do to quantity supplied?", "Increase it", "Reduce it to zero", "Turn it into demand", "Make sellers disappear")
      ]
    },
    {
      method: "capture-create" as const,
      category: "understanding" as const,
      title: "capture & create",
      topic: "Negative feedback in body temperature",
      content: "Negative feedback opposes a change and moves a condition toward a set range. If body temperature rises, sensors and control centers trigger responses such as sweating and increased skin blood flow. If temperature falls, responses such as shivering and reduced skin blood flow help conserve or generate heat.",
      questions: [
        question("ccl3q1", "What does negative feedback do?", "Opposes a change", "Amplifies every change", "Stops all sensing", "Removes control centers"),
        question("ccl3q2", "Which response helps cool a warm body?", "Sweating", "Shivering", "Reduced skin blood flow", "Producing thicker bones"),
        question("ccl3q3", "Which response can generate heat when cold?", "Shivering", "Sweating", "Faster evaporation only", "Opening every skin vessel"),
        question("ccl3q4", "What does negative feedback move a condition toward?", "A set range", "An unlimited extreme", "A random value", "Permanent change")
      ]
    }
  ],
  abbreviation: [
    {
      method: "abbreviation" as const,
      category: "memory" as const,
      title: "ABBREVIATION!",
      topic: "The first five planets from the Sun",
      items: ["Mercury", "Venus", "Earth", "Mars", "Jupiter"],
      questions: [
        question("ablb2q1", "Which planet is third from the Sun?", "Earth", "Mars", "Mercury", "Jupiter"),
        question("ablb2q2", "Which planet comes directly after Venus?", "Earth", "Mercury", "Mars", "Jupiter"),
        question("ablb2q3", "Which is fifth in this sequence?", "Jupiter", "Mars", "Venus", "Earth"),
        question("ablb2q4", "Which sequence starts correctly from the Sun?", "Mercury, Venus, Earth", "Earth, Venus, Mercury", "Mars, Earth, Jupiter", "Jupiter, Mercury, Venus")
      ]
    },
    {
      method: "abbreviation" as const,
      category: "memory" as const,
      title: "ABBREVIATION!",
      topic: "Five major ocean basins",
      items: ["Pacific", "Atlantic", "Indian", "Southern", "Arctic"],
      questions: [
        question("ablb3q1", "Which basin is listed first?", "Pacific", "Indian", "Southern", "Arctic"),
        question("ablb3q2", "Which basin follows the Atlantic?", "Indian", "Pacific", "Arctic", "Southern"),
        question("ablb3q3", "Which basin is fifth in the sequence?", "Arctic", "Southern", "Atlantic", "Indian"),
        question("ablb3q4", "Which sequence begins correctly?", "Pacific, Atlantic, Indian", "Indian, Pacific, Arctic", "Southern, Atlantic, Pacific", "Arctic, Indian, Atlantic")
      ]
    }
  ],
  "header-first": [
    {
      method: "header-first" as const,
      category: "organization" as const,
      title: "HEADER first",
      topic: "How cells release energy from food",
      sections: [
        { heading: "Glycolysis", content: "Glucose is split in the cytoplasm, producing a small amount of ATP." },
        { heading: "Mitochondrial reactions", content: "Later reactions transfer energy through carriers inside mitochondria." },
        { heading: "Oxygen's role", content: "Oxygen accepts electrons at the end of the electron transport chain." },
        { heading: "Main products", content: "Aerobic respiration produces ATP, carbon dioxide, and water." }
      ],
      questions: [
        question("hfl2q1", "Where does glycolysis occur?", "In the cytoplasm", "In bone", "Outside the organism", "Only in the nucleus"),
        question("hfl2q2", "What is oxygen's role in aerobic respiration?", "It accepts electrons at the end of the transport chain", "It becomes glucose", "It stores DNA", "It blocks ATP formation"),
        question("hfl2q3", "Which heading covers carbon dioxide and water?", "Main products", "Glycolysis", "Oxygen's role", "Mitochondrial reactions"),
        question("hfl2q4", "Where do later aerobic reactions occur?", "Inside mitochondria", "Outside the cell", "In bone marrow", "Only in the nucleus")
      ]
    },
    {
      method: "header-first" as const,
      category: "organization" as const,
      title: "HEADER first",
      topic: "How a weather forecast is made",
      sections: [
        { heading: "Observations", content: "Stations, balloons, radar, and satellites measure current conditions." },
        { heading: "Data processing", content: "Measurements are checked and prepared for computer models." },
        { heading: "Forecast models", content: "Models calculate possible future atmospheric conditions." },
        { heading: "Meteorologist review", content: "Forecasters compare guidance with local patterns and communicate uncertainty." }
      ],
      questions: [
        question("hfl3q1", "What supplies current atmospheric measurements?", "Stations, balloons, radar, and satellites", "Only calendars", "Tree rings alone", "Ocean fossils only"),
        question("hfl3q2", "What do forecast models calculate?", "Possible future atmospheric conditions", "Past rock ages only", "Plant growth", "Earth's core temperature"),
        question("hfl3q3", "Who compares model guidance with local patterns?", "Meteorologists", "Only astronauts", "Dentists", "Architects"),
        question("hfl3q4", "What happens before data enter forecast models?", "Measurements are checked and prepared", "All observations are deleted", "Weather is stopped", "The atmosphere is replaced")
      ]
    }
  ],
  "prime-question": [
    {
      method: "prime-question" as const,
      category: "understanding" as const,
      title: "Prime question",
      topic: "How bees help flowering plants reproduce",
      guidingQuestion: "How does a bee's search for food also help a plant reproduce?",
      material: "Bees visit flowers to collect nectar and pollen. Pollen grains can stick to a bee's body. When the bee visits another flower of the same species, some pollen may reach its stigma. This transfer can enable fertilization and seed development, so the bee gains food while the plant gains a means of pollen transfer.",
      questions: [
        question("pql2q1", "Why do bees visit flowers?", "To collect nectar and pollen", "To build roots", "To create rain", "To cool the soil"),
        question("pql2q2", "What can stick to a bee's body?", "Pollen grains", "Seeds only", "Roots", "Cloud droplets"),
        question("pql2q3", "What can pollen transfer enable?", "Fertilization and seed development", "Rock formation", "Evaporation", "Leaf freezing"),
        question("pql2q4", "How can both bee and plant benefit?", "The bee gains food and the plant gains pollen transfer", "Both receive soil", "The plant makes honey", "The bee grows roots")
      ]
    },
    {
      method: "prime-question" as const,
      category: "understanding" as const,
      title: "Prime question",
      topic: "How insulation slows heat transfer",
      guidingQuestion: "Why can trapped air make an insulating layer effective?",
      material: "Heat moves by conduction, convection, and radiation. Many insulating materials contain small pockets of trapped air. Air conducts heat poorly, and trapping it limits bulk movement that would carry heat by convection. The insulation therefore slows heat transfer rather than creating heat.",
      questions: [
        question("pql3q1", "Why is trapped air useful in insulation?", "It conducts heat poorly and limits convection", "It creates unlimited heat", "It removes all radiation", "It becomes a metal"),
        question("pql3q2", "What does insulation do?", "Slows heat transfer", "Stops energy from existing", "Raises gravity", "Creates sunlight"),
        question("pql3q3", "Why are small air pockets better than freely moving air?", "They limit bulk convection", "They increase combustion", "They dissolve solids", "They produce electricity"),
        question("pql3q4", "Does insulation create heat?", "No, it slows heat transfer", "Yes, without energy", "Only when painted", "It creates sunlight")
      ]
    }
  ],
  "doodle-effect": [
    {
      method: "doodle-effect" as const,
      category: "understanding" as const,
      title: "the Doodle effect",
      topic: "Main transfers in the nitrogen cycle",
      material: "Nitrogen gas in the atmosphere is converted into usable compounds by nitrogen-fixing microbes. Plants take up nitrogen compounds through roots. Animals obtain nitrogen by eating plants or other animals. Decomposers return nitrogen compounds to soil, and denitrifying microbes return nitrogen gas to the atmosphere.",
      relationships: [
        "Atmospheric nitrogen -> fixation -> soil compounds",
        "Soil compounds -> plant uptake -> animals",
        "Dead material -> decomposition -> soil compounds",
        "Soil compounds -> denitrification -> atmospheric nitrogen"
      ],
      questions: [
        question("del2q1", "What makes atmospheric nitrogen usable to plants?", "Nitrogen fixation", "Evaporation", "Combustion only", "Erosion"),
        question("del2q2", "How do animals obtain nitrogen?", "By eating plants or other animals", "By absorbing sunlight", "From rocks only", "By condensation"),
        question("del2q3", "What returns nitrogen gas to the atmosphere?", "Denitrification", "Plant uptake", "Feeding", "Filtration"),
        question("del2q4", "What returns nitrogen compounds to soil from dead matter?", "Decomposition", "Photosynthesis", "Evaporation", "Freezing")
      ]
    },
    {
      method: "doodle-effect" as const,
      category: "understanding" as const,
      title: "the Doodle effect",
      topic: "Energy transfers in a simple electric circuit",
      material: "A battery converts stored chemical energy into electrical energy. A closed conducting path allows electric current. A lamp transfers electrical energy into light and thermal energy. An open switch breaks the path, so current stops.",
      relationships: [
        "Battery chemical energy -> electrical energy",
        "Closed path -> current flows",
        "Lamp electrical energy -> light + thermal energy",
        "Open switch -> broken path -> current stops"
      ],
      questions: [
        question("del3q1", "What energy conversion begins in the battery?", "Chemical to electrical", "Light to nuclear", "Thermal to gravity", "Sound to chemical"),
        question("del3q2", "What does a lamp produce from electrical energy?", "Light and thermal energy", "Only chemical energy", "Mass", "Gravity"),
        question("del3q3", "Why does an open switch stop current?", "It breaks the conducting path", "It adds a second battery", "It creates light", "It increases gravity"),
        question("del3q4", "What is required for current in this simple circuit?", "A closed conducting path", "An open switch", "A broken wire", "No energy source")
      ]
    }
  ],
  "eighty-twenty-rule": [
    {
      method: "eighty-twenty-rule" as const,
      category: "organization" as const,
      title: "80/20 rule",
      topic: "Preparing a household emergency kit",
      details: ["Store safe drinking water.", "Include nonperishable food.", "Add essential medicines and first aid supplies.", "Keep a flashlight and communication supplies.", "Match every container color.", "Decorate labels.", "Alphabetize snack flavors."],
      coreConcepts: ["Water", "Food", "Essential medicines", "Light and communication"],
      questions: [
        question("e8l2q1", "Which item is the most basic survival priority?", "Safe drinking water", "Decorative labels", "Matching containers", "Alphabetized snacks"),
        question("e8l2q2", "Which pair has high practical value?", "Medicines and a flashlight", "Labels and colors", "Fonts and stickers", "Decorations and ribbons"),
        question("e8l2q3", "What does the 80/20 approach prioritize here?", "A few supplies that address essential needs", "Every decorative detail", "Only entertainment", "Exactly twenty objects"),
        question("e8l2q4", "Which pair is mainly decorative?", "Matching containers and decorated labels", "Water and food", "Medicines and first aid", "Flashlight and communication supplies")
      ]
    },
    {
      method: "eighty-twenty-rule" as const,
      category: "organization" as const,
      title: "80/20 rule",
      topic: "Improving a school garden",
      details: ["Test whether plants receive enough light.", "Water roots consistently.", "Improve compacted or nutrient-poor soil.", "Control the pests causing the most damage.", "Repaint every sign weekly.", "Rename each bed monthly.", "Buy matching gloves."],
      coreConcepts: ["Light", "Water", "Soil", "Major pest control"],
      questions: [
        question("e8l3q1", "Which issue most directly affects photosynthesis?", "Insufficient light", "Mismatched gloves", "Old sign paint", "Bed names"),
        question("e8l3q2", "Which action targets plant access to water?", "Water roots consistently", "Rename beds", "Paint signs", "Sort gloves"),
        question("e8l3q3", "Which items are lower-value details?", "Sign colors and matching gloves", "Water and soil", "Light and pest control", "Roots and nutrients"),
        question("e8l3q4", "Which action targets the largest pest-related impact?", "Control the pests causing the most damage", "Rename every bed", "Match glove colors", "Repaint signs weekly")
      ]
    }
  ],
  "divide-steps": [
    {
      method: "divide-steps" as const,
      category: "organization" as const,
      title: "divide steps",
      topic: "A controlled scientific investigation",
      overview: "A controlled investigation turns a question into a testable procedure, changes one independent variable, measures a dependent variable, holds relevant conditions constant, and uses repeated observations to support a conclusion.",
      referenceSteps: ["Ask a testable question.", "State a hypothesis.", "Change one independent variable while controlling others.", "Measure and repeat observations.", "Analyze evidence and draw a conclusion."],
      questions: [
        question("dsl2q1", "What should be changed deliberately?", "The independent variable", "Every condition", "The conclusion", "The recorded data"),
        question("dsl2q2", "Why repeat observations?", "To make the evidence more reliable", "To change the question", "To avoid measurement", "To guarantee a hypothesis"),
        question("dsl2q3", "What follows data collection?", "Analysis and a conclusion", "Deleting the question", "Changing every control", "Skipping evidence"),
        question("dsl2q4", "What comes before running the procedure?", "A testable question and hypothesis", "The final conclusion", "Deleting controls", "Publishing without evidence")
      ]
    },
    {
      method: "divide-steps" as const,
      category: "organization" as const,
      title: "divide steps",
      topic: "How food is digested and absorbed",
      overview: "Digestion begins with chewing and saliva, continues as the stomach mixes food with acid and enzymes, and is completed mainly in the small intestine. Nutrients cross the small-intestine lining into blood or lymph, while the large intestine absorbs water and forms waste.",
      referenceSteps: ["Chew and mix food with saliva.", "Move food through the esophagus.", "Mix it with acid and enzymes in the stomach.", "Complete digestion and absorb nutrients in the small intestine.", "Absorb water and form waste in the large intestine."],
      questions: [
        question("dsl3q1", "Where are most nutrients absorbed?", "The small intestine", "The esophagus", "The mouth only", "The large intestine only"),
        question("dsl3q2", "What happens in the stomach?", "Food mixes with acid and enzymes", "Most oxygen enters blood", "Urine is stored", "Bones are formed"),
        question("dsl3q3", "What is a major role of the large intestine?", "Absorbing water", "Producing sunlight", "Pumping blood", "Filtering air"),
        question("dsl3q4", "What happens before food reaches the stomach?", "It travels through the esophagus", "It enters the large intestine", "It becomes urine", "It enters the lungs")
      ]
    }
  ],
  "derive-basics": [
    {
      method: "derive-basics" as const,
      category: "understanding" as const,
      title: "derive basics",
      topic: "Why a parachute slows a fall",
      prompt: "Derive how a parachute changes the forces on a falling person.",
      source: "Gravity pulls a falling person downward. Moving through air creates drag in the opposite direction. Opening a parachute greatly increases surface area, which increases drag at a given speed. The person slows until forces approach a new balance at a lower terminal speed.",
      basicPrinciples: ["Gravity acts downward.", "Drag opposes motion through air.", "More area can create more drag.", "Balanced forces produce constant velocity."],
      questions: [
        question("dbl2q1", "What does a parachute increase most directly?", "Surface area and drag", "Mass", "Gravity", "Air temperature"),
        question("dbl2q2", "Which force opposes downward motion?", "Air drag", "Weight", "Magnetism", "Buoyancy in water"),
        question("dbl2q3", "Why is the new terminal speed lower?", "Drag balances weight at a slower speed", "Gravity vanishes", "Mass becomes zero", "Air stops moving"),
        question("dbl2q4", "What happens when forces balance?", "Velocity becomes constant", "Acceleration increases forever", "Mass disappears", "The parachute closes")
      ]
    },
    {
      method: "derive-basics" as const,
      category: "understanding" as const,
      title: "derive basics",
      topic: "Why salt dissolves faster in warm water",
      prompt: "Derive how temperature can affect the rate at which salt dissolves.",
      source: "Water molecules attract ions at the surface of a salt crystal and pull them into solution. In warmer water, molecules move faster and collide with the crystal more often. Stirring also brings fresh water into contact with the crystal. These factors can increase dissolving rate without changing the identity of the salt.",
      basicPrinciples: ["Water attracts ions.", "Dissolving begins at a crystal surface.", "Warmer molecules move faster.", "Stirring renews contact at the surface."],
      questions: [
        question("dbl3q1", "Where does dissolving begin?", "At the crystal surface", "Only at the container bottom", "Inside a vacuum", "In the air"),
        question("dbl3q2", "How does warming affect water molecules?", "They move faster", "They stop", "They become salt", "They lose all energy"),
        question("dbl3q3", "Why can stirring speed dissolving?", "It brings fresh water to the crystal surface", "It changes salt into sugar", "It freezes the water", "It removes all collisions"),
        question("dbl3q4", "What pulls ions away from the salt crystal?", "Attractions from water molecules", "Sound waves", "Air pressure alone", "Light reflection")
      ]
    }
  ],
  "kidlin-rule": [
    {
      method: "kidlin-rule" as const,
      category: "problem-solving" as const,
      title: "Kidlin's rule",
      topic: "Clarifying repeated assignment delays",
      vagueProblem: "I always submit assignments late.",
      context: "The last three assignments were started on the due date. Instructions had not been broken into tasks, and the required sources were not chosen until the final evening.",
      questions: [
        question("krl2q1", "Which rewrite is most actionable?", "Choose sources two days early and schedule each task", "Assignments are impossible", "Time is bad", "Everything is always late"),
        question("krl2q2", "What repeated behavior is visible?", "Starting on the due date", "Finishing a week early", "Using too many sources", "Submitting before instructions arrive"),
        question("krl2q3", "Which boundary makes the problem measurable?", "The last three assignments", "Always and everything", "All schoolwork forever", "No specific cases")
      ]
    },
    {
      method: "kidlin-rule" as const,
      category: "problem-solving" as const,
      title: "Kidlin's rule",
      topic: "Clarifying a team communication problem",
      vagueProblem: "Our team never communicates.",
      context: "During the last two weekly handoffs, task owners did not post status updates, so the next person discovered missing files after work was scheduled to begin.",
      questions: [
        question("krl3q1", "Which rewrite identifies a concrete change?", "Require task owners to post file links before each handoff", "Communication is terrible", "Teams never work", "People should try harder"),
        question("krl3q2", "What is the observable missing behavior?", "Posting status updates and file links", "Having any meetings", "Writing long reports", "Changing every task"),
        question("krl3q3", "Which context is specific?", "The last two weekly handoffs", "All teamwork everywhere", "Never", "Every future project")
      ]
    }
  ],
  "premack-principle": [
    {
      method: "premack-principle" as const,
      category: "focus" as const,
      title: "Premack's principle",
      topic: "Practising algebra vocabulary",
      task: "Complete the algebra review before the preferred activity.",
      material: "A coefficient multiplies a variable. A constant has no variable. Like terms have the same variable part and can be combined by adding or subtracting coefficients.",
      preferredExamples: ["Ten minutes of a favorite game", "A social-media break", "A preferred snack"],
      questions: [
        question("ppl2q1", "What is a coefficient?", "A number multiplying a variable", "A variable-free number only", "An equals sign", "A unit of time"),
        question("ppl2q2", "Which terms can be combined directly?", "Like terms", "Any unrelated terms", "Only constants with variables", "No terms"),
        question("ppl2q3", "When should the preferred activity occur?", "After the review task", "Instead of the task", "Before choosing a task", "During every question")
      ]
    },
    {
      method: "premack-principle" as const,
      category: "focus" as const,
      title: "Premack's principle",
      topic: "Reading a short history explanation",
      task: "Read and answer the history check before the preferred activity.",
      material: "The printing press made it faster and cheaper to reproduce many copies of text. Wider circulation of books and pamphlets helped ideas travel beyond the places where they were first written.",
      preferredExamples: ["Listen to a favorite song", "Take a short walk", "Message a friend"],
      questions: [
        question("ppl3q1", "What did the printing press make easier?", "Producing many copies of text", "Stopping written communication", "Making paper unnecessary", "Preventing ideas from moving"),
        question("ppl3q2", "What helped ideas reach more places?", "Wider circulation of books and pamphlets", "Fewer copies", "Removing written text", "Closing trade routes"),
        question("ppl3q3", "How is the preferred activity used?", "As a consequence after the study task", "As a replacement for learning", "Before any task is defined", "During every sentence")
      ]
    }
  ],
  "ten-minute-wall-stare": [
    {
      method: "ten-minute-wall-stare" as const,
      category: "focus" as const,
      title: "10 min wall stare",
      topic: "How plants move water upward",
      material: "Water enters roots and moves into xylem. Evaporation from leaf surfaces creates tension that pulls a continuous column of water upward. Cohesion between water molecules helps keep that column connected, while stomata regulate water vapor leaving the leaf.",
      questions: [
        question("wsl2q1", "Which tissue carries water upward?", "Xylem", "Phloem only", "Bark only", "Pollen"),
        question("wsl2q2", "What creates upward tension?", "Evaporation from leaves", "Root freezing", "Flower color", "Seed dispersal"),
        question("wsl2q3", "What helps the water column remain connected?", "Cohesion", "Combustion", "Erosion", "Radiation")
      ]
    },
    {
      method: "ten-minute-wall-stare" as const,
      category: "focus" as const,
      title: "10 min wall stare",
      topic: "How surface currents move in the ocean",
      material: "Winds transfer energy to the ocean surface and help drive surface currents. Earth's rotation deflects large-scale motion, while continents redirect flow. Together these factors form broad circulation patterns that move heat around the planet.",
      questions: [
        question("wsl3q1", "What provides energy for many surface currents?", "Wind", "Earth's core directly", "Fish movement", "Moonlight"),
        question("wsl3q2", "What deflects large-scale motion?", "Earth's rotation", "Ocean color", "Cloud height", "Mountain roots"),
        question("wsl3q3", "What can surface currents redistribute?", "Heat", "Continents", "Gravity", "The Moon")
      ]
    }
  ],
  "strooper-effect": [
    {
      method: "strooper-effect" as const,
      category: "focus" as const,
      title: "Strooper effect",
      topic: "Working memory and distraction",
      material: "Working memory temporarily holds and manipulates a limited amount of information. Irrelevant sounds, messages, or competing tasks can consume attention and interfere with that processing. Reducing competing input can make it easier to maintain the current goal.",
      colors: [{ name: "navy", hsla: "hsl(220 80% 35%)" }, { name: "lime", hsla: "hsl(100 70% 40%)" }, { name: "maroon", hsla: "hsl(350 75% 35%)" }, { name: "amber", hsla: "hsl(42 95% 45%)" }],
      questions: [
        question("sel2q1", "What does working memory do?", "Temporarily holds and manipulates information", "Stores every memory permanently", "Controls digestion", "Produces light"),
        question("sel2q2", "Why can notifications interfere?", "They compete for limited attention", "They increase memory capacity", "They remove all goals", "They stop hearing"),
        question("sel2q3", "What can support the current goal?", "Reducing competing input", "Adding unrelated tasks", "Switching constantly", "Increasing notifications")
      ]
    },
    {
      method: "strooper-effect" as const,
      category: "focus" as const,
      title: "Strooper effect",
      topic: "Automatic and controlled processing",
      material: "Practice can make some responses fast and automatic. A controlled task requires attention when its rule conflicts with an automatic response. In interference tasks, the automatic response must be inhibited so the rule-relevant response can be selected.",
      colors: [{ name: "teal", hsla: "hsl(175 80% 32%)" }, { name: "violet", hsla: "hsl(270 70% 48%)" }, { name: "coral", hsla: "hsl(12 85% 55%)" }, { name: "olive", hsla: "hsl(70 65% 35%)" }],
      questions: [
        question("sel3q1", "What can repeated practice produce?", "A faster automatic response", "No learning", "A new organ", "Less experience"),
        question("sel3q2", "When is controlled attention especially needed?", "When a rule conflicts with an automatic response", "When no response is possible", "Only during sleep", "When every cue agrees"),
        question("sel3q3", "What must happen in an interference task?", "The automatic response must be inhibited", "The rule must be ignored", "Every stimulus must be removed", "The task must stop")
      ]
    }
  ]
} satisfies Record<
  MethodWithGeneratedVariants,
  readonly [unknown, unknown]
>;
