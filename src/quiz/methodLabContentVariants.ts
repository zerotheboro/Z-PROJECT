import type {
  TrainingMethodId
} from "./type";
import { FEYNMAN_STUDY_SECONDS } from "./methodLabData";

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
      studyTime: 60,
      retrievalTime: 60,
      facts: [
        "Pollination moves pollen from an anther to a stigma.",
        "Bees and other animals can carry pollen between flowers.",
        "Wind pollinates some plants, including many grasses.",
        "After successful pollination and fertilization, an ovule can develop into a seed.",
        "Flowers often use color, scent, or nectar to attract animal pollinators."
      ],
      questions: [
        question("arl2q1", "Where must pollen arrive during pollination?", "A stigma", "An anther", "An ovule", "A petal"),
        question("arl2q2", "What can carry pollen between flowers?", "Bees and other animals", "Pollen tubes growing between separate flowers", "Roots transporting pollen through the stems", "Seeds opening and releasing pollen inside a flower"),
        question("arl2q3", "What may an ovule become after fertilization?", "A seed", "A fruit wall", "A pollen grain", "A petal"),
        question("arl2q4", "What can attract animal pollinators?", "Color, scent, or nectar", "Pollen carried only inside roots", "Extra water stored beneath the seed coat", "Roots releasing nectar into surrounding soil")
      ]
    },
    {
      method: "active-recall" as const,
      category: "memory" as const,
      title: "Active Recall",
      topic: "Tectonic plate boundaries",
      studyTime: 60,
      retrievalTime: 60,
      facts: [
        "Earth's outer shell is divided into moving tectonic plates.",
        "At divergent boundaries, plates move apart and new crust can form.",
        "At convergent boundaries, plates move toward one another.",
        "At transform boundaries, plates slide past one another.",
        "Earthquakes can occur when built-up stress is released along faults."
      ],
      questions: [
        question("arl3q1", "What happens at a divergent boundary?", "Plates move apart", "Plates move toward one another", "Plates slide horizontally past one another", "Plates remain fixed while the crust beneath them moves"),
        question("arl3q2", "At which boundary do plates slide past each other?", "A transform boundary", "A divergent boundary", "A convergent boundary", "A subduction boundary"),
        question("arl3q3", "What can happen when fault stress is released?", "An earthquake", "Permanent plate locking", "Unchanged fault stress", "Complete removal of friction"),
        question("arl3q4", "What can form where plates move apart?", "New crust", "A subducted plate", "A compressed crustal slab", "A locked transform fault")
      ]
    }
  ],
  feynman: [
    {
      method: "feynman" as const,
      category: "understanding" as const,
      title: "Feynman Technique",
      topic: "Why does the daytime sky often look blue?",
      studyTime: FEYNMAN_STUDY_SECONDS,
      explanation: "Sunlight contains many colors. When sunlight enters Earth's atmosphere, tiny gas molecules scatter shorter blue wavelengths more strongly than longer red wavelengths. Scattered blue light reaches our eyes from many directions, so much of the clear daytime sky appears blue.",
      questions: [
        question("fyl2q1", "Why does a clear daytime sky often appear blue?", "Blue wavelengths are scattered strongly by the atmosphere", "Blue wavelengths are absorbed while red wavelengths reach our eyes", "The atmosphere reflects a blue image of the oceans", "The Sun emits blue light without other visible wavelengths"),
        question("fyl2q2", "What interacts with sunlight to produce this scattering?", "Gas molecules in the atmosphere", "Water at the ocean surface", "Only the largest cloud droplets", "Solid rock beneath the atmosphere"),
        question("fyl2q3", "Why can blue light reach an observer from many directions?", "It is scattered through the atmosphere", "It is reflected only along a direct line from the Sun", "It is absorbed before reaching the observer", "It travels around Earth without interacting with air"),
        question("fyl2q4", "Which wavelengths are scattered more strongly in this explanation?", "Shorter blue wavelengths", "Longer red wavelengths", "Only infrared wavelengths", "All wavelengths identically")
      ]
    },
    {
      method: "feynman" as const,
      category: "understanding" as const,
      title: "Feynman Technique",
      topic: "Why does sweating cool the body?",
      studyTime: FEYNMAN_STUDY_SECONDS,
      explanation: "Sweat is mostly water released onto the skin. The fastest-moving water molecules can escape into the air as vapor. Evaporation requires energy, and some of that energy comes from heat at the skin's surface. As heat leaves with the evaporating water, the skin cools. Sweating is less effective when humid air slows evaporation.",
      questions: [
        question("fyl3q1", "What process makes sweat cool the skin?", "Evaporation", "Freezing", "Condensation", "Melting"),
        question("fyl3q2", "Where does some energy for evaporation come from?", "Heat at the skin's surface", "Heat produced only after the sweat has evaporated", "Cold energy released by the water molecules", "Energy supplied solely by increased air pressure"),
        question("fyl3q3", "Why can humid air reduce the cooling effect?", "It slows sweat evaporation", "It speeds sweat evaporation without transferring heat", "It makes sweat release heat during evaporation", "It makes the skin cool mainly by condensation instead"),
        question("fyl3q4", "Which molecules are most likely to escape during evaporation?", "Faster-moving water molecules", "The slowest-moving water molecules", "Salt particles dissolved in the sweat", "All water molecules regardless of their energy")
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
        question("col2q1", "Which organelle carries out photosynthesis?", "The chloroplast", "The mitochondrion", "The ribosome", "The nucleus"),
        question("col2q2", "Which gas enters a leaf for photosynthesis?", "Carbon dioxide", "Oxygen", "Nitrogen", "Water vapor alone"),
        question("col2q3", "What energy-rich product does photosynthesis make?", "Sugar", "Oxygen", "Carbon dioxide", "Water"),
        question("col2q4", "What do stomata allow carbon dioxide to do?", "Enter the leaf", "Enter through the roots", "Turn into chlorophyll", "Travel only through veins")
      ]
    },
    {
      method: "cornell" as const,
      category: "organization" as const,
      title: "Cornell Notes",
      topic: "How kidneys form urine",
      content: "Blood enters each kidney and passes through many microscopic filtering units called nephrons. Filtration moves water and small dissolved substances out of the blood. Useful substances and much of the water are then reabsorbed. Additional wastes can be secreted into the forming urine. Urine travels through ureters to the bladder before leaving through the urethra.",
      questions: [
        question("col3q1", "What are the kidney's microscopic filtering units called?", "Nephrons", "Alveoli", "Neurons", "Villi"),
        question("col3q2", "What happens to many useful filtered substances?", "They are reabsorbed", "They are excreted", "They enter the bladder first", "They are chemically destroyed"),
        question("col3q3", "Where is urine stored before it leaves the body?", "The bladder", "The renal pelvis", "The urethra", "The ureters"),
        question("col3q4", "Which tubes carry urine from kidneys to the bladder?", "Ureters", "The urethra", "Renal arteries", "Renal veins")
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
        question("inl3p1", "What is 2/5 + 1/5?", "3/5", "3/10", "1/5", "2/5"),
        question("inl3p2", "What is the area of a triangle with base 8 and height 3?", "12", "24", "11", "16"),
        question("inl3p3", "What is the probability of rolling a 3 on a fair six-sided die?", "1/6", "1/3", "3/6", "5/6"),
        question("inl3p4", "What is 1/6 + 4/6?", "5/6", "5/12", "3/6", "4/12"),
        question("inl3p5", "What is the area of a triangle with base 12 and height 2?", "12", "24", "14", "10"),
        question("inl3p6", "A spinner has 3 equal sections and one is green. What is P(green)?", "1/3", "2/3", "1/2", "1/6")
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
        question("abl2q1", "What light makes the Moon visible?", "Reflected sunlight", "Lunar light emission", "Transmitted sunlight", "Atmospheric light emission"),
        question("abl2q2", "Why does the Moon appear to change shape?", "We see different portions of its illuminated half", "The Moon changes its physical diameter during each orbit", "Earth's shadow covers the Moon during every ordinary phase", "The Sun changes how much of the Moon it illuminates each month"),
        question("abl2q3", "About how long does a phase cycle take?", "One month", "One week", "Two weeks", "One year"),
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
        question("abl3q1", "Where does the right ventricle send blood?", "The lungs", "The body via the aorta", "The left atrium directly", "The coronary arteries"),
        question("abl3q2", "What does blood gain in the lungs?", "Oxygen", "Carbon dioxide", "Glucose", "Urea"),
        question("abl3q3", "Which chamber pumps oxygen-rich blood to the body?", "The left ventricle", "The right atrium", "The right ventricle", "The left atrium only"),
        question("abl3q4", "What does blood release in the lungs?", "Carbon dioxide", "Oxygen", "Nitrogen as its main waste gas", "Carbon monoxide as its normal waste gas")
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
        question("osl2q1", "What outgoing energy do greenhouse gases absorb?", "Infrared radiation", "Visible radiation", "Ultraviolet radiation", "Convection currents"),
        question("osl2q2", "What is the main effect of this absorption and re-emission?", "Heat loss to space is slowed", "Earth stops absorbing any incoming sunlight", "The surface stops emitting thermal radiation", "All outgoing energy immediately escapes to space"),
        question("osl2q3", "Which sentence best summarizes the mechanism?", "Greenhouse gases slow the escape of outgoing heat", "Greenhouse gases supply the Sun's incoming energy", "Greenhouse gases prevent every transfer of heat", "Greenhouse gases accelerate the escape of outgoing heat")
      ]
    },
    {
      method: "one-sentence" as const,
      category: "understanding" as const,
      title: "1 sentence",
      topic: "How antibiotic resistance spreads",
      explanation: "An antibiotic may kill susceptible bacteria while resistant bacteria survive. The survivors reproduce and can pass resistance traits to later generations or other bacteria. Misusing antibiotics increases selection for resistant bacteria, but it does not make a person's body resistant.",
      questions: [
        question("osl3q1", "Which bacteria are most likely to survive an antibiotic?", "Bacteria with resistance", "Susceptible bacteria exposed to an effective dose", "Bacteria lacking the resistance trait that matters", "Bacteria damaged by the antibiotic beyond recovery"),
        question("osl3q2", "What can surviving resistant bacteria do?", "Reproduce and spread resistance traits", "Lose the resistance trait whenever they reproduce", "Pass resistance only to the human host instead of bacteria", "Prevent any future variation within the bacterial population"),
        question("osl3q3", "What becomes resistant?", "The bacteria", "The person's tissues", "The antibiotic itself", "The immune system")
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
        question("n4l2q1", "Which organisms capture energy first?", "Producers", "Decomposers", "Primary consumers", "Secondary consumers"),
        question("n4l2q2", "What do primary consumers eat?", "Producers", "Secondary consumers", "Higher-level predators", "Other primary consumers only"),
        question("n4l2q3", "What do decomposers return to ecosystems?", "Nutrients", "Heat", "Sunlight", "New energy"),
        question("n4l2q4", "What happens to some energy at each transfer?", "It is lost as heat", "It is entirely transferred to the next organism", "It is completely recycled back to the producer", "It becomes nutrients without any heat loss")
      ]
    },
    {
      method: "note-taking-4x4" as const,
      category: "organization" as const,
      title: "Note-taking 4x4",
      topic: "Four stages of breathing and gas transport",
      content: "Ventilation moves air into and out of the lungs. Gas exchange at the alveoli moves oxygen into blood and carbon dioxide out. Circulation transports these gases between lungs and tissues. Cellular respiration uses oxygen to release usable energy, producing carbon dioxide that returns to the lungs.",
      questions: [
        question("n4l3q1", "What does ventilation do?", "Moves air into and out of the lungs", "Moves oxygen through the blood to tissues", "Transfers oxygen across the alveolar membrane", "Uses oxygen to release energy inside cells"),
        question("n4l3q2", "Where does oxygen enter the blood?", "At the alveoli", "At the trachea", "At the bronchi", "At the nasal passages"),
        question("n4l3q3", "Which process uses oxygen to release usable energy?", "Cellular respiration", "Ventilation", "Gas diffusion", "Blood circulation"),
        question("n4l3q4", "What carries gases between lungs and tissues?", "Circulation", "Ventilation", "Digestion", "Filtration")
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
        question("lsl3p1", "What is a version of a gene?", "An allele", "A chromosome", "A genome", "A nucleotide"),
        question("lsl3p2", "What molecule stores genetic information?", "DNA", "Protein", "Glucose", "A phospholipid"),
        question("lsl3p3", "What packages DNA with proteins?", "A chromosome", "A ribosome", "A cell-surface receptor", "A membrane pore"),
        question("lsl3p4", "What is a segment of DNA that contributes to a product?", "A gene", "A whole chromosome", "A nitrogenous base", "An amino-acid chain")
      ],
      test: [
        question("lsl3t1", "Two versions of the same gene are called what?", "Alleles", "Chromosomes", "Nucleotides", "Proteins"),
        question("lsl3t2", "A gene is best described as what?", "A segment of DNA", "An entire cell containing chromosomes", "A protein chain made by a ribosome", "A membrane surrounding the nucleus"),
        question("lsl3t3", "Genetic information is stored in which molecule?", "DNA", "Protein", "Cellulose", "A phospholipid")
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
        question("stl2q1", "What usually begins germination?", "The seed absorbs water", "The seed begins photosynthesis before absorbing water", "The seed loses water until its tissues harden", "The seed flowers before the embryo begins growing"),
        question("stl2q2", "Which structure normally emerges first?", "The first root", "The first flower", "The first fruit", "A woody side branch"),
        question("stl2q3", "What can new leaves begin doing?", "Photosynthesis", "Pollination", "Fertilization", "Seed dispersal"),
        question("stl2q4", "What becomes more active after water is absorbed?", "Metabolism", "Dormancy", "Desiccation", "Seed-coat hardening")
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
        question("stl3q1", "What helps small particles form larger clumps?", "Coagulation", "Filtration", "Sedimentation", "Disinfection"),
        question("stl3q2", "What follows settling in this sequence?", "Filtration", "Coagulation", "Disinfection", "Final distribution"),
        question("stl3q3", "Why is disinfection used?", "To inactivate harmful microorganisms", "To join small particles into larger clumps", "To settle heavy particles to the bottom", "To remove large visible debris by screening"),
        question("stl3q4", "What happens after disinfection in this sequence?", "Storage and distribution", "The first raw-water collection stage", "The initial coagulation and clumping stage", "The sedimentation stage before filtration")
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
        question("ccl2q1", "What does demand describe?", "Buyer willingness and ability to purchase", "Seller willingness and ability to offer products", "The number of products factories can supply", "The amount already sold regardless of buyer preferences"),
        question("ccl2q2", "Other things equal, what does a higher price tend to do to quantity demanded?", "Reduce it", "Increase it", "Keep it unchanged", "Make it fluctuate randomly"),
        question("ccl2q3", "What is true at a market equilibrium?", "Quantity supplied equals quantity demanded", "Quantity supplied exceeds quantity demanded", "Quantity demanded exceeds quantity supplied", "The market price is fixed above every buyer's willingness to pay"),
        question("ccl2q4", "Other things equal, what does a higher price tend to do to quantity supplied?", "Increase it", "Reduce it", "Leave it unchanged", "Make it fluctuate randomly")
      ]
    },
    {
      method: "capture-create" as const,
      category: "understanding" as const,
      title: "capture & create",
      topic: "Negative feedback in body temperature",
      content: "Negative feedback opposes a change and moves a condition toward a set range. If body temperature rises, sensors and control centers trigger responses such as sweating and increased skin blood flow. If temperature falls, responses such as shivering and reduced skin blood flow help conserve or generate heat.",
      questions: [
        question("ccl3q1", "What does negative feedback do?", "Opposes a change", "Amplifies a change", "Maintains a deviation by reinforcing it", "Reverses the direction of every response regardless of the change"),
        question("ccl3q2", "Which response helps cool a warm body?", "Sweating", "Shivering", "Reduced skin blood flow", "Increasing metabolic heat production"),
        question("ccl3q3", "Which response can generate heat when cold?", "Shivering", "Sweating", "Vasodilation", "Reduced metabolism"),
        question("ccl3q4", "What does negative feedback move a condition toward?", "A set range", "A progressively larger deviation", "A different range after every response", "The most extreme value the system can reach")
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
        question("hfl2q1", "Where does glycolysis occur?", "In the cytoplasm", "In the mitochondrial matrix", "In the inner mitochondrial membrane", "In the nucleus"),
        question("hfl2q2", "What is oxygen's role in aerobic respiration?", "It accepts electrons at the end of the transport chain", "It donates the first electrons during glycolysis", "It becomes the carbon atoms in glucose", "It directly replaces the electron transport chain"),
        question("hfl2q3", "Which heading covers carbon dioxide and water?", "Main products", "Glycolysis", "Oxygen's role", "Mitochondrial reactions"),
        question("hfl2q4", "Where do later aerobic reactions occur?", "Inside mitochondria", "In the cytoplasm only", "On the cell's outer membrane only", "In the nucleus only")
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
        question("hfl3q1", "What supplies current atmospheric measurements?", "Stations, balloons, radar, and satellites", "Only records of past climate averages", "Only the dates and seasons on a calendar", "Only long-term records preserved in rocks"),
        question("hfl3q2", "What do forecast models calculate?", "Possible future atmospheric conditions", "Only the historical averages from earlier years", "Only the conditions measured at the current moment", "Only the previous day's pattern repeated unchanged"),
        question("hfl3q3", "Who compares model guidance with local patterns?", "Meteorologists", "Climatologists", "Geologists", "Oceanographers"),
        question("hfl3q4", "What happens before data enter forecast models?", "Measurements are checked and prepared", "Uncertainty is removed by discarding every unusual observation", "Future weather is selected before measurements are examined", "Local observations are replaced with one historical average")
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
        question("pql2q1", "Why do bees visit flowers?", "To collect nectar and pollen", "To deposit honey directly into the petals", "To collect seeds after they have already developed", "To gather the flower's roots as a food source"),
        question("pql2q2", "What can stick to a bee's body?", "Pollen grains", "Ovules", "Immature seeds", "Root hairs"),
        question("pql2q3", "What can pollen transfer enable?", "Fertilization and seed development", "Seed dispersal before fertilization occurs", "Fruit ripening without any reproductive process", "Vegetative growth that replaces fertilization"),
        question("pql2q4", "How can both bee and plant benefit?", "The bee gains food and the plant gains pollen transfer", "The bee gains pollen transfer while the plant gains nectar", "The bee gains seeds while the plant receives honey", "The bee gains nectar while the plant loses its reproductive function")
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
        question("pql3q1", "Why is trapped air useful in insulation?", "It conducts heat poorly and limits convection", "It transfers heat rapidly by conduction", "It increases convection by allowing free circulation", "It supplies heat without using any energy"),
        question("pql3q2", "What does insulation do?", "Slows heat transfer", "Generates new heat", "Accelerates heat transfer", "Prevents all heat transfer"),
        question("pql3q3", "Why are small air pockets better than freely moving air?", "They limit bulk convection", "They allow faster bulk circulation through the material", "They increase heat transfer by carrying warmer air away", "They replace convection with heat production inside the material"),
        question("pql3q4", "Does insulation create heat?", "No, it slows heat transfer", "Yes, it generates heat whenever the outside is colder", "Yes, it converts trapped air directly into heat", "No, it accelerates the loss of heat to the surroundings")
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
        question("del2q1", "What makes atmospheric nitrogen usable to plants?", "Nitrogen fixation", "Denitrification", "Plant uptake of nitrogen gas directly", "Evaporation of water from leaves"),
        question("del2q2", "How do animals obtain nitrogen?", "By eating plants or other animals", "By breathing in nitrogen gas for direct protein synthesis", "By using sunlight to produce nitrogen atoms", "By absorbing atmospheric nitrogen directly through their skin"),
        question("del2q3", "What returns nitrogen gas to the atmosphere?", "Denitrification", "Nitrogen fixation", "Nitrification", "Plant assimilation"),
        question("del2q4", "What returns nitrogen compounds to soil from dead matter?", "Decomposition", "Photosynthesis", "Transpiration", "Direct uptake of nitrogen gas by animals")
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
        question("del3q1", "What energy conversion begins in the battery?", "Chemical to electrical", "Electrical to chemical", "Chemical to light directly", "Thermal to electrical"),
        question("del3q2", "What does a lamp produce from electrical energy?", "Light and thermal energy", "Electrical and chemical energy only", "Mechanical and chemical energy only", "Light energy with no thermal energy"),
        question("del3q3", "Why does an open switch stop current?", "It breaks the conducting path", "It increases the number of complete conducting paths", "It makes the current flow through the surrounding air", "It removes the need for a continuous return path"),
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
        question("e8l2q1", "Which item is the most basic survival priority?", "Safe drinking water", "Extra spare batteries", "A larger snack selection", "A detailed packing inventory"),
        question("e8l2q2", "Which pair has high practical value?", "Medicines and a flashlight", "Extra chargers and multiple duplicate shopping lists", "Several spare notebooks and a large collection of games", "Replacement bags and repeated copies of a decorative inventory"),
        question("e8l2q3", "What does the 80/20 approach prioritize here?", "A few supplies that address essential needs", "All supplies equally regardless of the needs they address", "The largest number of items regardless of usefulness", "Exactly twenty objects chosen without checking their functions"),
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
        question("e8l3q1", "Which issue most directly affects photosynthesis?", "Insufficient light", "Inconsistent plant labels", "Mismatched gardening gloves", "Disorganized tool storage"),
        question("e8l3q2", "Which action targets plant access to water?", "Water roots consistently", "Water the signs", "Wet leaves without watering roots", "Water only the paths"),
        question("e8l3q3", "Which items are lower-value details?", "Sign colors and matching gloves", "Water and soil", "Light and pest control", "Roots and nutrients"),
        question("e8l3q4", "Which action targets the largest pest-related impact?", "Control the pests causing the most damage", "Treat every harmless insect before checking the damaged plants", "Replace all bed labels before investigating pest damage", "Apply the same response to every species regardless of its impact")
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
        question("dsl2q1", "What should be changed deliberately?", "The independent variable", "The dependent variable", "The controlled variables together", "The measurement units after results are collected"),
        question("dsl2q2", "Why repeat observations?", "To make the evidence more reliable", "To force every measurement to equal the hypothesis", "To replace measuring with estimates after the first trial", "To change the independent variable randomly in every repeat"),
        question("dsl2q3", "What follows data collection?", "Analysis and a conclusion", "Selecting a conclusion without comparing the measurements", "Changing the hypothesis so it must match every result", "Discarding measurements that do not support the prediction"),
        question("dsl2q4", "What comes before running the procedure?", "A testable question and hypothesis", "A final conclusion and confirmed result", "A publication of results before any measurements", "An analysis of data that have not yet been collected")
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
        question("dsl3q2", "What happens in the stomach?", "Food mixes with acid and enzymes", "Most absorption of nutrients into the blood", "Most absorption of water from undigested material", "Storage of food without chemical digestion"),
        question("dsl3q3", "What is a major role of the large intestine?", "Absorbing water", "Absorbing most nutrients", "Mixing food with acid", "Moving food into the stomach"),
        question("dsl3q4", "What happens before food reaches the stomach?", "It travels through the esophagus", "It passes through the small intestine first", "It mixes with bile in the large intestine first", "It enters the trachea as part of the digestive pathway")
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
        question("dbl2q1", "What does a parachute increase most directly?", "Surface area and drag", "The falling object's gravitational weight", "The mass of the falling person", "The downward gravitational acceleration"),
        question("dbl2q2", "Which force opposes downward motion?", "Air drag", "Weight", "An inward centripetal force", "A forward propulsive thrust"),
        question("dbl2q3", "Why is the new terminal speed lower?", "Drag balances weight at a slower speed", "The parachute reduces the person's mass until weight disappears", "The downward gravitational force must become zero", "The air ceases to exert a force at the lower speed"),
        question("dbl2q4", "What happens when forces balance?", "Velocity becomes constant", "Speed increases continuously", "The object immediately stops", "The object reverses direction")
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
        question("dbl3q1", "Where does dissolving begin?", "At the crystal surface", "At the dry crystal's center", "Only at the container's base", "Only at the water's top surface"),
        question("dbl3q2", "How does warming affect water molecules?", "They move faster", "Their average speed falls", "Their average speed stays fixed", "Their motion stops"),
        question("dbl3q3", "Why can stirring speed dissolving?", "It brings fresh water to the crystal surface", "It permanently changes the salt's chemical identity", "It stops water molecules from colliding with the crystal", "It moves saturated water back against the crystal without replacement"),
        question("dbl3q4", "What pulls ions away from the salt crystal?", "Attractions from water molecules", "Repulsion from every nearby water molecule", "Only the weight of the crystal pressing downward", "Only light reflected from the crystal surface")
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
        question("krl2q1", "Which rewrite is most actionable?", "Choose sources two days early and schedule each task", "Try to work harder on every assignment without planning a start", "Make a longer task list without assigning any start dates", "Wait for the due date and then decide which sources to use"),
        question("krl2q2", "What repeated behavior is visible?", "Starting on the due date", "Choosing sources several days before each deadline", "Allocating every task to a different study period", "Submitting work before reading the assignment instructions"),
        question("krl2q3", "Which boundary makes the problem measurable?", "The last three assignments", "All schoolwork across an unspecified period", "Every difficulty the student might ever encounter", "A general feeling that assignments are always late")
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
        question("krl3q1", "Which rewrite identifies a concrete change?", "Require task owners to post file links before each handoff", "Encourage better communication without assigning a handoff action", "Add more meetings without specifying which files are needed", "Ask everyone to cooperate without naming a missing update"),
        question("krl3q2", "What is the observable missing behavior?", "Posting status updates and file links", "Holding a meeting before every individual task", "Replacing every file with a long written report", "Changing every task owner during each handoff"),
        question("krl3q3", "Which context is specific?", "The last two weekly handoffs", "Every team task across all past projects", "Any future project that might have a problem", "Teamwork in general without a defined observation period")
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
        question("ppl2q1", "What is a coefficient?", "A number multiplying a variable", "A constant term without a variable", "An exponent written above a variable", "The sign that joins two sides of an equation"),
        question("ppl2q2", "Which terms can be combined directly?", "Like terms", "Terms with different exponents", "Any constant-variable pair", "Terms with different variables"),
        question("ppl2q3", "When should the preferred activity occur?", "After the review task", "Instead of completing the review task", "Before the review task has been agreed", "Whether or not the review task is completed")
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
        question("ppl3q1", "What did the printing press make easier?", "Producing many copies of text", "Producing every copy only by handwriting", "Restricting each text to a single original copy", "Replacing written texts with spoken messages only"),
        question("ppl3q2", "What helped ideas reach more places?", "Wider circulation of books and pamphlets", "Limiting each work to one handwritten original", "Restricting circulation to the original printer alone", "Preventing copies from moving between towns"),
        question("ppl3q3", "How is the preferred activity used?", "As a consequence after the study task", "As a substitute for completing the study task", "As a reward delivered before the study task is defined", "As an activity available regardless of task completion")
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
        question("wsl2q1", "Which tissue carries water upward?", "Xylem", "Phloem", "The epidermis", "The cambium"),
        question("wsl2q2", "What creates upward tension?", "Evaporation from leaves", "Condensation inside leaves", "Movement of sugar through phloem alone", "Water freezing inside the roots"),
        question("wsl2q3", "What helps the water column remain connected?", "Cohesion", "Surface evaporation", "Gravity", "Molecular repulsion")
      ]
    },
    {
      method: "ten-minute-wall-stare" as const,
      category: "focus" as const,
      title: "10 min wall stare",
      topic: "How surface currents move in the ocean",
      material: "Winds transfer energy to the ocean surface and help drive surface currents. Earth's rotation deflects large-scale motion, while continents redirect flow. Together these factors form broad circulation patterns that move heat around the planet.",
      questions: [
        question("wsl3q1", "What provides energy for many surface currents?", "Wind", "Continental drift", "Ocean-floor friction", "Reflected moonlight"),
        question("wsl3q2", "What deflects large-scale motion?", "Earth's rotation", "Earth's yearly orbit", "The Moon's orbit", "The Sun's rotation"),
        question("wsl3q3", "What can surface currents redistribute?", "Heat", "Earth's rotational direction", "Magnetic north's position", "Tectonic plate motion")
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
        question("sel2q1", "What does working memory do?", "Temporarily holds and manipulates information", "Stores every experience permanently without change", "Holds information without allowing any processing", "Replaces the need to retrieve information from long-term memory"),
        question("sel2q2", "Why can notifications interfere?", "They compete for limited attention", "They increase the available working-memory capacity", "They complete the current task's processing automatically", "They prevent any competing goal from entering awareness"),
        question("sel2q3", "What can support the current goal?", "Reducing competing input", "Adding unrelated tasks to the current goal", "Switching goals whenever a notification appears", "Increasing the number of competing inputs")
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
        question("sel3q1", "What can repeated practice produce?", "A faster automatic response", "A slower response with no learning from earlier attempts", "The removal of every automatic response", "A response that requires more conscious steps each time"),
        question("sel3q2", "When is controlled attention especially needed?", "When a rule conflicts with an automatic response", "When every cue supports the same practiced response", "When the task requires no selection between responses", "Only after the task and all its rules have ended"),
        question("sel3q3", "What must happen in an interference task?", "The automatic response must be inhibited", "The current rule must be replaced by the automatic response", "Both conflicting responses must be executed together", "The learner must follow the most familiar response regardless of the rule")
      ]
    }
  ],
  "two-x-video-speed": [
    {
      method: "two-x-video-speed" as const,
      category: "understanding" as const,
      title: "2X video speed",
      topic: "How supply and demand influence prices",
      youtubeId: "g9aDizJpd_s",
      videoTitle: "Supply and Demand: Crash Course Economics #4",
      channel: "CrashCourse",
      focusPoints: [
        "Follow how buyers and sellers respond to price changes.",
        "Identify equilibrium where supply and demand meet.",
        "Notice how market signals affect production decisions."
      ],
      questions: [
        question("vxl2q1", "When price rises, what generally happens to quantity demanded?", "It decreases", "It increases", "It stays fixed", "It changes randomly"),
        question("vxl2q2", "What is the market equilibrium?", "The point where supply and demand meet", "The highest price a seller could request", "The price at which quantity demanded is always zero", "A point where quantity supplied permanently exceeds demand"),
        question("vxl2q3", "What can a higher market price signal to producers?", "An incentive to supply more", "An incentive to reduce supply under the usual supply relationship", "A signal that production costs no longer matter", "An incentive to keep supply fixed regardless of price")
      ]
    }
  ]
} satisfies Record<
  MethodWithGeneratedVariants,
  readonly [unknown, unknown]
> & Record<
  "two-x-video-speed",
  readonly [unknown]
>;
