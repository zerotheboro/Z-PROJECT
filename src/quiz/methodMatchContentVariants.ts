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

export const methodMatchContentVariants = {
  "active-recall": [
    {
      method: "active-recall" as const,
      title: "Active Recall · Round 2",
      topic: "How bats use echolocation",
      facts: [
        "Many bats emit high-frequency calls while flying.",
        "Sound waves reflect from objects and return as echoes.",
        "The delay before an echo returns gives information about distance.",
        "Changes in an echo can provide information about movement and shape.",
        "Bats use hearing to interpret returning echoes."
      ],
      questions: [
        question("arm2q1", "What returns to a bat after sound reflects from an object?", "An echo", "Sunlight", "A magnetic field", "A scent trail"),
        question("arm2q2", "What can echo delay indicate?", "Distance", "Object color", "Air composition only", "The bat's age"),
        question("arm2q3", "Which sense interprets returning echoes?", "Hearing", "Taste", "Touch alone", "Smell"),
        question("arm2q4", "What can echo changes reveal besides distance?", "Movement and shape", "Object ownership", "The Moon's phase", "Plant age")
      ]
    },
    {
      method: "active-recall" as const,
      title: "Active Recall · Round 2",
      topic: "Life in the Arctic tundra",
      facts: [
        "Permafrost is ground that remains frozen for at least two consecutive years.",
        "The tundra has a short growing season.",
        "Low plants are common because cold and wind limit tall growth.",
        "A thin active layer above permafrost thaws during warmer months.",
        "Many animals migrate or develop insulation to cope with seasonal cold."
      ],
      questions: [
        question("arm3q1", "What is permafrost?", "Ground frozen for at least two consecutive years", "Daily frost on leaves", "Only sea ice", "A summer rain layer"),
        question("arm3q2", "Why are low plants common in tundra?", "Cold and wind limit tall growth", "There is no sunlight", "All soil is liquid", "Animals remove every tree"),
        question("arm3q3", "What can thaw above permafrost in warmer months?", "The active layer", "Earth's core", "All bedrock", "The entire Arctic Ocean"),
        question("arm3q4", "How do some tundra animals cope with cold?", "They migrate or develop insulation", "They stop needing energy", "They become plants", "They remove permafrost")
      ]
    }
  ],
  feynman: [
    {
      method: "feynman" as const,
      title: "Feynman · Round 2",
      topic: "Why does the Moon show phases?",
      explanation: "The Sun always illuminates half of the Moon. As the Moon orbits Earth, the angle among the Sun, Moon, and Earth changes. We therefore see different fractions of the illuminated half. Earth's shadow causes a lunar eclipse, not the ordinary monthly phases.",
      questions: [
        question("fym2q1", "What fraction of the Moon is illuminated by the Sun at a time?", "Half", "None", "One quarter always", "All sides equally"),
        question("fym2q2", "Why does the visible illuminated fraction change?", "The Moon's orbital position changes", "The Moon changes shape", "Earth turns off sunlight", "Clouds orbit the Moon"),
        question("fym2q3", "What does Earth's shadow cause?", "A lunar eclipse", "Every crescent phase", "A new orbit", "Sunrise")
      ]
    },
    {
      method: "feynman" as const,
      title: "Feynman · Round 2",
      topic: "Why does ice float in liquid water?",
      explanation: "When water freezes, hydrogen bonds arrange molecules into a more open structure. The same mass then occupies more volume, so ice has a lower density than liquid water. An object less dense than the surrounding liquid can float because it displaces enough liquid for buoyant force to balance its weight.",
      questions: [
        question("fym3q1", "Why is ice less dense than liquid water?", "Its molecules form a more open structure", "It loses all mass", "Gravity stops", "It becomes a gas"),
        question("fym3q2", "What happens to volume when the same water mass freezes?", "It increases", "It becomes zero", "It always halves", "It becomes unrelated to density"),
        question("fym3q3", "What balances the weight of floating ice?", "Buoyant force", "Magnetism", "Sound", "Friction with air only")
      ]
    }
  ],
  cornell: [
    {
      method: "cornell" as const,
      title: "Cornell Notes · Round 2",
      topic: "How a tropical cyclone develops",
      content: "Warm ocean water supplies heat and moisture to rising air. As water vapor condenses, released energy can strengthen rising motion and lower surface pressure. Air flows toward the low pressure and is deflected by Earth's rotation, helping create circulation. Strong vertical wind shear can disrupt the storm's organization.",
      questions: [
        question("com2q1", "What supplies heat and moisture to a tropical cyclone?", "Warm ocean water", "Mountain snow", "Dry desert air", "Sea-floor rock"),
        question("com2q2", "What happens when water vapor condenses?", "Energy is released", "Gravity ends", "The ocean freezes", "Pressure always rises immediately"),
        question("com2q3", "What can disrupt storm organization?", "Strong vertical wind shear", "Warm water", "Condensation", "Low pressure"),
        question("com2q4", "What helps create storm circulation?", "Inflow toward low pressure plus Earth's rotation", "Dry air alone", "Ocean-floor friction only", "Mountain snow")
      ]
    },
    {
      method: "cornell" as const,
      title: "Cornell Notes · Round 2",
      topic: "How the immune system responds to a pathogen",
      content: "Physical barriers help prevent pathogens from entering. Innate immune responses act quickly and broadly. Antigen-presenting cells can activate specific lymphocytes. B cells can produce antibodies, while some T cells destroy infected cells or coordinate responses. Memory cells can support a faster response after later exposure.",
      questions: [
        question("com3q1", "Which defense acts quickly and broadly?", "Innate immunity", "Memory only", "Bone growth", "Digestion"),
        question("com3q2", "Which cells can produce antibodies?", "B cells", "Red blood cells", "Platelets", "Muscle cells"),
        question("com3q3", "What supports a faster later response?", "Memory cells", "Stomach acid alone", "Hair cells", "Bone minerals"),
        question("com3q4", "What can some T cells do?", "Destroy infected cells or coordinate responses", "Carry most oxygen", "Form blood clots", "Digest all pathogens in the stomach")
      ]
    }
  ],
  interleaving: [
    {
      method: "interleaving" as const,
      title: "Interleaving · Round 2",
      instructions: [
        { type: "discount", name: "Discount", rule: "Multiply the original price by the discount rate, then subtract.", example: "20% off $50 gives $40" },
        { type: "speed", name: "Average speed", rule: "Divide distance by time.", example: "120 km / 2 h = 60 km/h" },
        { type: "equation", name: "Two-step equation", rule: "Undo addition or subtraction, then multiplication or division.", example: "2x + 3 = 11 gives x = 4" }
      ],
      practice: [
        question("imm2p1", "$80 with a 25% discount costs what?", "$60", "$20", "$55", "$100"),
        question("imm2p2", "150 km in 3 hours gives what average speed?", "50 km/h", "153 km/h", "450 km/h", "147 km/h"),
        question("imm2p3", "Solve 3x + 2 = 14.", "4", "6", "12", "16"),
        question("imm2p4", "$60 with a 15% discount costs what?", "$51", "$9", "$45", "$69")
      ],
      test: [
        question("imm2t1", "$40 with a 10% discount costs what?", "$36", "$4", "$30", "$44"),
        question("imm2t2", "Solve 4x - 5 = 15.", "5", "10", "4", "20"),
        question("imm2t3", "210 km in 3 hours gives what average speed?", "70 km/h", "207 km/h", "630 km/h", "213 km/h"),
        question("imm2t4", "Solve 2x + 7 = 19.", "6", "12", "13", "5")
      ]
    },
    {
      method: "interleaving" as const,
      title: "Interleaving · Round 2",
      instructions: [
        { type: "volume", name: "Rectangular-prism volume", rule: "Multiply length, width, and height.", example: "2 x 3 x 4 = 24" },
        { type: "ratio", name: "Equivalent ratio", rule: "Multiply or divide both terms by the same nonzero value.", example: "2:3 = 4:6" },
        { type: "median", name: "Median", rule: "Order values and take the middle value.", example: "2, 5, 9 has median 5" }
      ],
      practice: [
        question("imm3p1", "What is the volume of a 2 by 3 by 5 prism?", "30", "10", "15", "25"),
        question("imm3p2", "Which ratio equals 3:4?", "6:8", "4:5", "9:10", "12:20"),
        question("imm3p3", "What is the median of 2, 7, 9?", "7", "6", "9", "18"),
        question("imm3p4", "Which ratio equals 4:7?", "8:14", "12:18", "6:9", "16:21")
      ],
      test: [
        question("imm3t1", "What is the volume of a 4 by 2 by 6 prism?", "48", "12", "24", "36"),
        question("imm3t2", "Which ratio equals 5:2?", "15:6", "10:5", "20:10", "7:4"),
        question("imm3t3", "What is the median of 4, 8, 11, 15, 20?", "11", "8", "15", "58"),
        question("imm3t4", "What is the volume of a 3 by 5 by 2 prism?", "30", "10", "15", "25")
      ]
    }
  ],
  "memory-palace": [
    {
      method: "memory-palace" as const,
      title: "Memory Palace · Round 2",
      topic: "Remembering electromagnetic waves",
      locations: ["Mailbox", "Doormat", "Chair", "Table", "Lamp"],
      items: ["Radio", "Microwave", "Infrared", "Visible", "Ultraviolet"],
      pairings: [
        { location: "Mailbox", item: "Radio" },
        { location: "Doormat", item: "Microwave" },
        { location: "Chair", item: "Infrared" },
        { location: "Table", item: "Visible" },
        { location: "Lamp", item: "Ultraviolet" }
      ],
      questions: [
        question("mpm2q1", "What was paired with the chair?", "Infrared", "Radio", "Visible", "Ultraviolet"),
        question("mpm2q2", "Where was visible light placed?", "Table", "Lamp", "Mailbox", "Doormat"),
        question("mpm2q3", "Which wave was at the doormat?", "Microwave", "Infrared", "Radio", "Visible"),
        question("mpm2q4", "Where was ultraviolet placed?", "Lamp", "Chair", "Table", "Mailbox"),
        question("mpm2q5", "What was paired with the mailbox?", "Radio", "Microwave", "Visible", "Ultraviolet")
      ]
    },
    {
      method: "memory-palace" as const,
      title: "Memory Palace · Round 2",
      topic: "Remembering atmospheric layers",
      locations: ["Gate", "Steps", "Hall", "Kitchen", "Roof"],
      items: ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere", "Exosphere"],
      pairings: [
        { location: "Gate", item: "Troposphere" },
        { location: "Steps", item: "Stratosphere" },
        { location: "Hall", item: "Mesosphere" },
        { location: "Kitchen", item: "Thermosphere" },
        { location: "Roof", item: "Exosphere" }
      ],
      questions: [
        question("mpm3q1", "Which layer was at the gate?", "Troposphere", "Exosphere", "Mesosphere", "Thermosphere"),
        question("mpm3q2", "What was paired with the kitchen?", "Thermosphere", "Stratosphere", "Troposphere", "Exosphere"),
        question("mpm3q3", "Where was the exosphere placed?", "Roof", "Hall", "Steps", "Gate"),
        question("mpm3q4", "Which layer was paired with the hall?", "Mesosphere", "Troposphere", "Thermosphere", "Exosphere"),
        question("mpm3q5", "Where was the stratosphere placed?", "Steps", "Gate", "Kitchen", "Roof")
      ]
    }
  ],
  "active-blurting": [
    {
      method: "active-blurting" as const,
      title: "Active Blurting · Round 2",
      topic: "How glaciers shape landscapes",
      facts: [
        "Glaciers move slowly under their own weight.",
        "Moving ice can pluck rock from the ground.",
        "Rock fragments in ice can abrade the surface below.",
        "Glaciers often carve broad U-shaped valleys.",
        "Deposited glacial material is called till."
      ],
      questions: [
        question("abm2q1", "What drives glacier movement?", "The ice's own weight", "Only ocean tides", "Plant roots", "Earth's magnetic field"),
        question("abm2q2", "What valley shape is commonly carved by glaciers?", "A U shape", "A perfect circle", "A flat disk", "A spiral"),
        question("abm2q3", "What is deposited glacial material called?", "Till", "Magma", "Pollen", "Plasma"),
        question("abm2q4", "How can rock fragments in ice change the ground?", "They abrade it", "They make sunlight", "They stop ice motion", "They form clouds")
      ]
    },
    {
      method: "active-blurting" as const,
      title: "Active Blurting · Round 2",
      topic: "How neurons send a signal",
      facts: [
        "A neuron receives inputs through dendrites and its cell body.",
        "An action potential travels along the axon.",
        "Myelin can speed signal conduction along many axons.",
        "At a chemical synapse, neurotransmitters cross a small gap.",
        "Receptors on the next cell respond to particular neurotransmitters."
      ],
      questions: [
        question("abm3q1", "Where does an action potential travel?", "Along the axon", "Through bone", "Only through blood", "Across a tendon"),
        question("abm3q2", "What can myelin do?", "Speed signal conduction", "Digest food", "Make red blood cells", "Stop every signal"),
        question("abm3q3", "What crosses a chemical synapse?", "Neurotransmitters", "Whole neurons", "Bones", "Air bubbles"),
        question("abm3q4", "What receives particular neurotransmitters on the next cell?", "Receptors", "Red blood cells", "Bone marrow", "Tendons")
      ]
    }
  ],
  "one-sentence": [
    {
      method: "one-sentence" as const,
      title: "1 sentence · Round 2",
      topic: "How natural selection changes populations",
      explanation: "Individuals vary in inherited traits. If a trait helps its carriers survive or reproduce in a particular environment, those carriers may leave more offspring. Across generations, the helpful trait can become more common in the population; individuals do not evolve because they need to.",
      questions: [
        question("osm2q1", "What must exist for natural selection to act?", "Inherited variation", "Identical traits only", "No reproduction", "A planned goal"),
        question("osm2q2", "Why can a helpful trait become more common?", "Its carriers leave more offspring", "Individuals choose new genes", "The environment writes genes", "Every organism changes at once"),
        question("osm2q3", "What changes over generations?", "The population", "A single individual because it needs to", "Only the weather", "The definition of inheritance")
      ]
    },
    {
      method: "one-sentence" as const,
      title: "1 sentence · Round 2",
      topic: "How a lever creates mechanical advantage",
      explanation: "A lever rotates around a fulcrum. Applying an effort farther from the fulcrum creates more turning effect for the same force, so a smaller force can balance a larger load closer to the fulcrum, though the effort moves through a greater distance.",
      questions: [
        question("osm3q1", "What does a lever rotate around?", "A fulcrum", "A battery", "A magnet only", "A spring only"),
        question("osm3q2", "How can a smaller effort balance a larger load?", "Apply it farther from the fulcrum", "Move it closer than the load", "Remove the fulcrum", "Stop rotation"),
        question("osm3q3", "What tradeoff accompanies the smaller force?", "The effort moves farther", "Energy is created", "The load loses mass", "Gravity disappears")
      ]
    }
  ],
  "note-taking-4x4": [
    {
      method: "note-taking-4x4" as const,
      title: "Note-taking 4x4 · Round 2",
      topic: "Four functions of the human skeleton",
      content: "The skeleton supports the body's shape, protects organs, enables movement with muscles and joints, and performs internal functions. Bone marrow forms blood cells, while bone tissue stores minerals such as calcium and phosphorus. These roles connect structure, protection, movement, and regulation.",
      questions: [
        question("n4m2q1", "Which skeletal role shields organs?", "Protection", "Digestion", "Gas exchange", "Filtration"),
        question("n4m2q2", "What does bone marrow form?", "Blood cells", "Air", "Bile", "Urine"),
        question("n4m2q3", "What does bone tissue store?", "Minerals", "Sunlight", "Sound", "Carbon dioxide only"),
        question("n4m2q4", "How does the skeleton contribute to movement?", "It works with muscles and joints", "It produces all energy", "It replaces nerves", "It circulates blood alone")
      ]
    },
    {
      method: "note-taking-4x4" as const,
      title: "Note-taking 4x4 · Round 2",
      topic: "Four drivers of weather",
      content: "Solar heating varies across Earth's surface. Temperature differences help create pressure differences and wind. Water changes state, moving moisture and latent energy through the atmosphere. Earth's rotation and landforms redirect moving air. Together, energy, pressure, water, and motion produce changing weather.",
      questions: [
        question("n4m3q1", "What is the main energy source for weather?", "Solar heating", "Moonlight only", "Earth's core only", "Sound"),
        question("n4m3q2", "What can pressure differences create?", "Wind", "Rocks", "DNA", "Tides only"),
        question("n4m3q3", "What moves moisture through the atmosphere?", "Water changing state and moving in air", "Mountain roots", "Magnetism", "Soil alone"),
        question("n4m3q4", "What can redirect moving air?", "Earth's rotation and landforms", "Only plant color", "The skeleton", "Ocean salt alone")
      ]
    }
  ],
  "leitner-system": [
    {
      method: "leitner-system" as const,
      title: "Leitner system · Round 2",
      topic: "Blood components",
      cards: [
        { id: "lsm2c1", front: "Red blood cells", back: "Transport oxygen using hemoglobin." },
        { id: "lsm2c2", front: "White blood cells", back: "Contribute to immune defense." },
        { id: "lsm2c3", front: "Platelets", back: "Help form blood clots." },
        { id: "lsm2c4", front: "Plasma", back: "Liquid that carries cells and dissolved substances." }
      ],
      practice: [
        question("lsm2p1", "Which component transports most oxygen?", "Red blood cells", "Platelets", "Plasma alone", "White blood cells"),
        question("lsm2p2", "Which component helps clotting?", "Platelets", "Red blood cells", "Plasma only", "Neurons"),
        question("lsm2p3", "Which liquid carries blood cells?", "Plasma", "Lymph nodes", "Bone", "Cartilage"),
        question("lsm2p4", "Which component contributes to immune defense?", "White blood cells", "Red blood cells", "Platelets only", "Bone minerals")
      ],
      test: [
        question("lsm2t1", "Low platelets most directly affect what?", "Clot formation", "Oxygen binding", "Nerve impulses", "Digestion"),
        question("lsm2t2", "Which component contributes directly to immune defense?", "White blood cells", "Red blood cells only", "Platelets", "Minerals"),
        question("lsm2t3", "Which fluid carries dissolved substances?", "Plasma", "Cartilage", "Bone", "Skin")
      ]
    },
    {
      method: "leitner-system" as const,
      title: "Leitner system · Round 2",
      topic: "Cloud types",
      cards: [
        { id: "lsm3c1", front: "Cirrus", back: "High, thin clouds often made of ice crystals." },
        { id: "lsm3c2", front: "Cumulus", back: "Puffy clouds with vertical development." },
        { id: "lsm3c3", front: "Stratus", back: "Low, layered cloud cover." },
        { id: "lsm3c4", front: "Cumulonimbus", back: "Deep storm cloud associated with thunderstorms." }
      ],
      practice: [
        question("lsm3p1", "Which cloud is high and thin?", "Cirrus", "Stratus", "Cumulonimbus", "Cumulus"),
        question("lsm3p2", "Which cloud forms a low layer?", "Stratus", "Cirrus", "Cumulus", "Cumulonimbus"),
        question("lsm3p3", "Which cloud is associated with thunderstorms?", "Cumulonimbus", "Cirrus", "Stratus", "Fog only"),
        question("lsm3p4", "Which cloud is commonly puffy?", "Cumulus", "Stratus", "Cirrus", "Cumulonimbus only")
      ],
      test: [
        question("lsm3t1", "A deep cloud producing thunder is what type?", "Cumulonimbus", "Cirrus", "Stratus", "Cumulus only"),
        question("lsm3t2", "A puffy fair-weather cloud is commonly what type?", "Cumulus", "Stratus", "Cirrus only", "Cumulonimbus always"),
        question("lsm3t3", "A widespread low cloud layer is what type?", "Stratus", "Cirrus", "Cumulus", "Cumulonimbus")
      ]
    }
  ],
  "story-telling": [
    {
      method: "story-telling" as const,
      title: "Story telling · Round 2",
      topic: "The sequence of a volcanic eruption",
      orderedItems: ["Magma forms or collects below the surface.", "Gas and magma pressure build.", "Magma rises through cracks or a conduit.", "Lava, ash, or gas reaches the surface.", "Erupted material cools and alters the landscape."],
      questions: [
        question("stm2q1", "What can build below a volcano before eruption?", "Gas and magma pressure", "Ocean salinity only", "Plant roots", "Ice sheets only"),
        question("stm2q2", "How can magma move upward?", "Through cracks or a conduit", "Through sunlight", "Inside clouds", "Only through rivers"),
        question("stm2q3", "What happens to erupted material afterward?", "It cools and alters the landscape", "It becomes invisible", "It stops having mass", "It returns instantly to the core"),
        question("stm2q4", "What reaches the surface during an eruption?", "Lava, ash, or gas", "Only groundwater", "Plant roots", "Glacial ice")
      ]
    },
    {
      method: "story-telling" as const,
      title: "Story telling · Round 2",
      topic: "The sequence of a nerve reflex",
      orderedItems: ["A receptor detects a stimulus.", "A sensory neuron carries an impulse.", "The spinal cord processes the signal.", "A motor neuron carries an output.", "A muscle produces a response."],
      questions: [
        question("stm3q1", "What detects the stimulus first?", "A receptor", "A muscle", "A motor neuron", "A bone"),
        question("stm3q2", "Which neuron carries information toward the spinal cord?", "A sensory neuron", "A motor neuron", "A red blood cell", "A tendon"),
        question("stm3q3", "What produces the final movement?", "A muscle", "A receptor", "The skin alone", "A sensory neuron alone"),
        question("stm3q4", "Which neuron carries the output from the spinal cord?", "A motor neuron", "A sensory neuron", "A receptor", "A blood cell")
      ]
    }
  ],
  "capture-create": [
    {
      method: "capture-create" as const,
      title: "capture & create · Round 2",
      topic: "Plate tectonics and earthquakes",
      content: "Tectonic plates move slowly, but friction can lock rocks along a fault. Continued motion builds elastic stress. When stress overcomes friction, rocks slip and release energy as seismic waves. The underground starting point is the focus, and the surface point above it is the epicenter.",
      questions: [
        question("ccm2q1", "Why can stress build on a fault?", "Friction locks rocks while plates keep moving", "Plates stop forever", "Seismic waves prevent motion", "The epicenter pulls rocks"),
        question("ccm2q2", "What happens when stress overcomes friction?", "Rocks slip", "The fault disappears", "Gravity ends", "The atmosphere freezes"),
        question("ccm2q3", "What is the epicenter?", "The surface point above the focus", "The underground starting point", "Every plate boundary", "The largest wave"),
        question("ccm2q4", "How does released earthquake energy travel?", "As seismic waves", "As sunlight", "As ocean salt", "As plant roots")
      ]
    },
    {
      method: "capture-create" as const,
      title: "capture & create · Round 2",
      topic: "How inflation changes purchasing power",
      content: "Inflation is a broad rise in prices over time. If income does not rise as quickly, the same amount of money buys fewer goods and services, so purchasing power falls. Inflation rates summarize average price changes, although individual products can change by different amounts.",
      questions: [
        question("ccm3q1", "What is inflation?", "A broad rise in prices over time", "A fall in every price", "A change in one product only", "An increase in physical money size"),
        question("ccm3q2", "What happens if income rises more slowly than prices?", "Purchasing power falls", "Money buys more automatically", "Every price becomes equal", "Income becomes irrelevant"),
        question("ccm3q3", "Do all product prices change by the same amount?", "No, individual changes can differ", "Yes, always exactly", "Only free products change", "Prices never change"),
        question("ccm3q4", "What does lower purchasing power mean?", "The same money buys fewer goods and services", "Money becomes physically smaller", "Every wage falls to zero", "Prices stop changing")
      ]
    }
  ],
  abbreviation: [
    {
      method: "abbreviation" as const,
      title: "ABBREVIATION! · ROUND 2",
      topic: "Five stages of mitosis and cell division",
      items: ["Prophase", "Metaphase", "Anaphase", "Telophase", "Cytokinesis"],
      questions: [
        question("abm2xq1", "Which stage follows prophase?", "Metaphase", "Telophase", "Cytokinesis", "Anaphase"),
        question("abm2xq2", "Which stage follows metaphase?", "Anaphase", "Prophase", "Cytokinesis", "Telophase"),
        question("abm2xq3", "What is last in this sequence?", "Cytokinesis", "Metaphase", "Prophase", "Anaphase"),
        question("abm2xq4", "Which order is correct?", "Prophase, Metaphase, Anaphase", "Anaphase, Prophase, Metaphase", "Cytokinesis, Prophase, Telophase", "Telophase, Metaphase, Prophase")
      ]
    },
    {
      method: "abbreviation" as const,
      title: "ABBREVIATION! · ROUND 2",
      topic: "Five levels of ecological organization",
      items: ["Organism", "Population", "Community", "Ecosystem", "Biosphere"],
      questions: [
        question("abm3xq1", "What follows organism?", "Population", "Biosphere", "Ecosystem", "Community"),
        question("abm3xq2", "Which level includes interacting populations?", "Community", "Organism", "Biosphere only", "Cell"),
        question("abm3xq3", "Which is broadest in this sequence?", "Biosphere", "Population", "Organism", "Community"),
        question("abm3xq4", "What follows community?", "Ecosystem", "Organism", "Population", "Cell")
      ]
    }
  ],
  "header-first": [
    {
      method: "header-first" as const,
      title: "HEADER FIRST · ROUND 2",
      topic: "How a vaccine is tested and monitored",
      sections: [
        { heading: "Preclinical research", content: "Researchers study a candidate before testing it in people." },
        { heading: "Clinical trials", content: "Phased studies evaluate safety, immune responses, and effectiveness." },
        { heading: "Regulatory review", content: "Evidence and manufacturing quality are reviewed before authorization or approval." },
        { heading: "Ongoing monitoring", content: "Safety and performance continue to be tracked after use begins." }
      ],
      questions: [
        question("hfm2q1", "What occurs before human trials?", "Preclinical research", "Ongoing monitoring only", "Mass distribution", "Advertising"),
        question("hfm2q2", "What do clinical trials evaluate?", "Safety, immune responses, and effectiveness", "Only package color", "Hospital architecture", "Weather"),
        question("hfm2q3", "When does safety monitoring end?", "It continues after use begins", "Before clinical trials", "At the first laboratory idea", "It is never started"),
        question("hfm2q4", "What is reviewed before authorization or approval?", "Evidence and manufacturing quality", "Only package color", "Weather forecasts", "School schedules")
      ]
    },
    {
      method: "header-first" as const,
      title: "HEADER FIRST · ROUND 2",
      topic: "How a river shapes its channel",
      sections: [
        { heading: "Erosion", content: "Flowing water removes and entrains sediment." },
        { heading: "Transport", content: "Current carries dissolved material and sediment downstream." },
        { heading: "Deposition", content: "Sediment settles where flow loses enough energy." },
        { heading: "Changing channel", content: "Repeated erosion and deposition shift banks, bars, and bends." }
      ],
      questions: [
        question("hfm3q1", "What happens during erosion?", "Water removes sediment", "Sediment always settles", "The river freezes", "Water stops"),
        question("hfm3q2", "When is sediment deposited?", "When flow loses enough energy", "Only when flow speeds up", "Before any erosion", "When gravity ends"),
        question("hfm3q3", "What can repeated erosion and deposition change?", "Banks, bars, and bends", "Earth's orbit", "The Moon's phases", "Atomic mass"),
        question("hfm3q4", "What happens during transport?", "Current carries material downstream", "All sediment settles", "The river stops", "Rock becomes sunlight")
      ]
    }
  ],
  "prime-question": [
    {
      method: "prime-question" as const,
      title: "PRIME QUESTION · ROUND 2",
      topic: "How roots and fungi can exchange resources",
      guidingQuestion: "How can a plant and a mycorrhizal fungus both benefit from their association?",
      material: "Mycorrhizal fungi grow around or within plant roots. Their fine filaments explore a large soil volume and can deliver water and mineral nutrients, especially phosphorus. The plant supplies the fungus with sugars made by photosynthesis. The exchange can benefit both partners, although outcomes depend on conditions.",
      questions: [
        question("pqm2q1", "What can fungal filaments deliver to a plant?", "Water and mineral nutrients", "Sunlight", "Animal tissue", "Atmospheric oxygen only"),
        question("pqm2q2", "What does the plant supply?", "Sugars", "Rocks", "Soil particles", "Moonlight"),
        question("pqm2q3", "Why can both partners benefit?", "They exchange different resources", "They become one organism", "Neither gives anything", "The fungus makes sunlight"),
        question("pqm2q4", "Which nutrient is especially noted in the passage?", "Phosphorus", "Helium", "Gold", "Sodium chloride only")
      ]
    },
    {
      method: "prime-question" as const,
      title: "PRIME QUESTION · ROUND 2",
      topic: "How wetlands reduce flooding",
      guidingQuestion: "How can a wetland change the movement of storm water?",
      material: "Wetland soils, plants, and shallow basins can store and slow incoming water. Slower release reduces peak flow downstream. Vegetation adds resistance, and stored water may infiltrate soil or evaporate. A wetland cannot prevent every flood, but it can reduce flood intensity under suitable conditions.",
      questions: [
        question("pqm3q1", "How do wetlands affect incoming water?", "They store and slow it", "They always remove all water", "They create storms", "They stop gravity"),
        question("pqm3q2", "What can slower release reduce?", "Peak flow downstream", "Soil volume", "All evaporation", "Plant growth"),
        question("pqm3q3", "Do wetlands prevent every flood?", "No", "Yes, without exception", "Only at night", "Only without plants"),
        question("pqm3q4", "What adds resistance to flowing water?", "Wetland vegetation", "A lack of plants", "Sunlight alone", "Dry air")
      ]
    }
  ],
  "doodle-effect": [
    {
      method: "doodle-effect" as const,
      title: "THE DOODLE EFFECT · ROUND 2",
      topic: "Connections in the carbon cycle",
      material: "Photosynthesis moves carbon dioxide into organic matter. Feeding moves carbon through food webs. Respiration and decomposition return carbon dioxide to air or water. Burial can store carbon, while combustion rapidly releases carbon from fuels or biomass.",
      relationships: ["Atmospheric carbon dioxide -> photosynthesis -> plants", "Plants -> feeding -> animals", "Organisms -> respiration/decomposition -> carbon dioxide", "Fuels or biomass -> combustion -> carbon dioxide"],
      questions: [
        question("dem2q1", "Which process moves carbon into plants?", "Photosynthesis", "Combustion", "Respiration", "Erosion"),
        question("dem2q2", "How does carbon move through a food web?", "Feeding", "Freezing", "Reflection", "Sedimentation only"),
        question("dem2q3", "Which process rapidly releases fuel carbon?", "Combustion", "Photosynthesis", "Burial", "Plant uptake"),
        question("dem2q4", "What can return carbon dioxide from organisms?", "Respiration and decomposition", "Photosynthesis only", "Burial only", "Mineral uptake")
      ]
    },
    {
      method: "doodle-effect" as const,
      title: "THE DOODLE EFFECT · ROUND 2",
      topic: "Forces on a moving bicycle",
      material: "A rider pushes the pedals, the drivetrain turns the rear wheel, and friction with the road provides forward force. Air resistance and rolling resistance oppose motion. When forward and opposing forces balance, speed stays constant; an unbalanced net force changes velocity.",
      relationships: ["Pedals -> drivetrain -> rear wheel", "Tire-road friction -> forward force", "Air + rolling resistance -> opposing forces", "Balanced forces -> constant velocity"],
      questions: [
        question("dem3q1", "What transfers pedal motion to the rear wheel?", "The drivetrain", "Air resistance", "Gravity alone", "The handlebar"),
        question("dem3q2", "Which forces oppose motion?", "Air and rolling resistance", "Forward tire friction only", "Pedaling force", "No forces"),
        question("dem3q3", "What happens when forces balance?", "Velocity stays constant", "Speed must increase", "Mass becomes zero", "Gravity stops"),
        question("dem3q4", "What provides the bicycle's forward external force?", "Friction between tire and road", "Air resistance", "Rolling resistance", "Gravity alone")
      ]
    }
  ],
  "eighty-twenty-rule": [
    {
      method: "eighty-twenty-rule" as const,
      title: "80/20 RULE · ROUND 2",
      topic: "Reducing household energy use",
      details: ["Improve major heating or cooling losses.", "Use efficient high-use appliances and lighting.", "Turn off equipment that runs unnecessarily.", "Track the largest energy loads.", "Polish switch plates.", "Label every cable by color.", "Rearrange low-use decorations."],
      coreConcepts: ["Heating and cooling", "High-use equipment", "Unnecessary runtime", "Largest loads"],
      questions: [
        question("e8m2q1", "Which area is often a major energy load?", "Heating or cooling", "Switch-plate polish", "Cable colors", "Decorations"),
        question("e8m2q2", "What should be measured first?", "The largest energy loads", "Every label font", "Decoration positions", "Cable color count"),
        question("e8m2q3", "Which action is low priority?", "Polishing switch plates", "Reducing unnecessary runtime", "Improving major heat loss", "Efficient high-use lighting"),
        question("e8m2q4", "Which action targets wasted runtime?", "Turn off equipment running unnecessarily", "Relabel every cable", "Move decorations", "Polish switches")
      ]
    },
    {
      method: "eighty-twenty-rule" as const,
      title: "80/20 RULE · ROUND 2",
      topic: "Preparing for a presentation",
      details: ["Define the main message.", "Support it with a few strong pieces of evidence.", "Rehearse the opening, transitions, and conclusion.", "Check that visuals are readable.", "Try ten decorative fonts.", "Animate every word.", "Match every icon color exactly."],
      coreConcepts: ["Main message", "Strong evidence", "Rehearsal", "Readable visuals"],
      questions: [
        question("e8m3q1", "What should guide the whole presentation?", "The main message", "The number of fonts", "Word animations", "Icon colors"),
        question("e8m3q2", "Which preparation improves delivery?", "Rehearsing transitions", "Animating every word", "Changing every font", "Adding unrelated icons"),
        question("e8m3q3", "Which is a lower-value detail?", "Matching every icon color", "Readable visuals", "Strong evidence", "A clear conclusion"),
        question("e8m3q4", "What should support the main message?", "A few strong pieces of evidence", "Unrelated animations", "Ten fonts", "Decorative icons only")
      ]
    }
  ],
  "divide-steps": [
    {
      method: "divide-steps" as const,
      title: "DIVIDE STEPS · ROUND 2",
      topic: "How a web request reaches a server",
      overview: "A browser resolves a domain name, establishes a network connection, sends an HTTP request, receives an HTTP response, and renders or processes the returned resources.",
      referenceSteps: ["Resolve the domain with DNS.", "Establish a connection.", "Send an HTTP request.", "Receive the server response.", "Render or process returned resources."],
      questions: [
        question("dsm2q1", "What maps a domain name to an address?", "DNS", "HTML", "CSS", "A battery"),
        question("dsm2q2", "What does the browser send after connecting?", "An HTTP request", "A paper letter", "Only an image", "A power signal"),
        question("dsm2q3", "What follows receiving a response?", "Rendering or processing resources", "Deleting the connection before reading", "Changing DNS records", "Building hardware"),
        question("dsm2q4", "What happens before the HTTP request is sent?", "A connection is established", "The page is fully rendered", "The server response is deleted", "Hardware is rebuilt")
      ]
    },
    {
      method: "divide-steps" as const,
      title: "DIVIDE STEPS · ROUND 2",
      topic: "How recycled paper is made",
      overview: "Collected paper is sorted, mixed with water to form pulp, cleaned of contaminants, spread and pressed into a sheet, then dried and finished for reuse.",
      referenceSteps: ["Collect and sort paper.", "Mix it with water into pulp.", "Remove inks and contaminants.", "Form and press a sheet.", "Dry and finish the paper."],
      questions: [
        question("dsm3q1", "What is made by mixing paper with water?", "Pulp", "Glass", "Metal", "Fuel"),
        question("dsm3q2", "What happens before a sheet is formed?", "Contaminants are removed", "The final paper is printed", "Trees are planted", "The sheet is burned"),
        question("dsm3q3", "What is the final major step?", "Drying and finishing", "Collecting unsorted waste", "Adding metal", "Freezing pulp"),
        question("dsm3q4", "What happens after cleaning the pulp?", "A sheet is formed and pressed", "Paper is collected", "The sheet is discarded", "Water is never removed")
      ]
    }
  ],
  "derive-basics": [
    {
      method: "derive-basics" as const,
      title: "DERIVE BASICS · ROUND 2",
      topic: "Why a metal spoon heats in soup",
      prompt: "Derive how heat moves along a spoon placed in hot soup.",
      source: "Particles in the submerged part of the spoon gain energy from the hot soup. In metal, energetic electrons and vibrating particles transfer energy through the material. Energy moves from hotter regions toward cooler regions, so the handle warms even without touching the soup directly.",
      basicPrinciples: ["Thermal energy moves from hotter to cooler regions.", "Metals conduct thermal energy well.", "Particles transfer energy through interactions.", "The handle is connected to the heated end."],
      questions: [
        question("dbm2q1", "In which direction does thermal energy move?", "From hotter to cooler regions", "Only from cooler to hotter", "Toward greater mass only", "It never moves"),
        question("dbm2q2", "Why does the handle warm?", "The metal conducts energy along the spoon", "The handle creates fire", "Gravity heats it", "Soup teleports"),
        question("dbm2q3", "What property of metal matters?", "High thermal conductivity", "Transparency", "Color", "Solubility"),
        question("dbm2q4", "What first heats the submerged end?", "Energy from the hot soup", "The cool handle", "Sound", "Gravity alone")
      ]
    },
    {
      method: "derive-basics" as const,
      title: "DERIVE BASICS · ROUND 2",
      topic: "Why sound becomes quieter with distance",
      prompt: "Derive why the intensity of sound generally decreases farther from a source.",
      source: "A sound source transfers energy into waves. As waves spread outward, their energy is distributed across a larger area. Air and surrounding materials also absorb and scatter some energy. Less wave energy therefore reaches a small detector farther away.",
      basicPrinciples: ["Sound waves carry energy.", "Waves spread from a source.", "A larger area shares the energy.", "Materials absorb and scatter some sound."],
      questions: [
        question("dbm3q1", "What happens as sound spreads outward?", "Its energy is distributed across a larger area", "Its energy becomes concentrated", "It stops being a wave", "It gains unlimited energy"),
        question("dbm3q2", "What else reduces arriving sound energy?", "Absorption and scattering", "Only gravity", "Photosynthesis", "Freezing"),
        question("dbm3q3", "Why does a distant detector receive less energy?", "The wave energy has spread and partly dissipated", "The source becomes larger", "Air creates silence instantly", "Distance removes frequency"),
        question("dbm3q4", "What do sound waves carry?", "Energy", "Matter permanently from source to listener", "Light only", "Gravity")
      ]
    }
  ],
  "kidlin-rule": [
    {
      method: "kidlin-rule" as const,
      title: "KIDLIN'S RULE · ROUND 2",
      topic: "Clarifying repeated meeting overruns",
      vagueProblem: "Our meetings take forever.",
      context: "The last four planning meetings exceeded 45 minutes because no agenda was shared and decisions were revisited after new topics were introduced near the end.",
      questions: [
        question("krm2q1", "Which rewrite is actionable?", "Share an agenda and park new topics after 40 minutes", "Meetings are endless", "People talk too much", "Time is impossible"),
        question("krm2q2", "What observable pattern caused overruns?", "No agenda and late new topics", "The room was too large", "All decisions were final", "Meetings ended early"),
        question("krm2q3", "Which boundary is specific?", "The last four planning meetings", "All meetings forever", "Everything", "Never")
      ]
    },
    {
      method: "kidlin-rule" as const,
      title: "KIDLIN'S RULE · ROUND 2",
      topic: "Clarifying a recurring budget shortfall",
      vagueProblem: "I am bad with money.",
      context: "For each of the last two months, unplanned food-delivery purchases used the amount reserved for transport during the final week.",
      questions: [
        question("krm3q1", "Which statement is most precise?", "Food-delivery spending used the final week's transport budget", "Money is always bad", "Budgets never work", "Everything costs too much"),
        question("krm3q2", "What is the recurring behavior?", "Unplanned food-delivery purchases", "Transport becoming free", "Income disappearing", "Every purchase increasing"),
        question("krm3q3", "Which period defines the sample?", "The last two months", "All time", "Never", "The distant future")
      ]
    }
  ],
  "premack-principle": [
    {
      method: "premack-principle" as const,
      title: "PREMACK'S PRINCIPLE · ROUND 2",
      topic: "Learning map-scale calculations",
      task: "Complete the map-scale practice before the preferred activity.",
      material: "A map scale relates distance on a map to distance in the real world. If 1 centimeter represents 5 kilometers, a 4-centimeter map distance represents 20 kilometers.",
      preferredExamples: ["A short video break", "A favorite drink", "Five minutes of music"],
      questions: [
        question("ppm2q1", "If 1 cm represents 5 km, what does 3 cm represent?", "15 km", "8 km", "2 km", "25 km"),
        question("ppm2q2", "What does a map scale connect?", "Map distance and real distance", "Temperature and time", "Color and height", "Mass and speed"),
        question("ppm2q3", "When is the preferred activity available?", "After completing practice", "Before the task exists", "Instead of practice", "During each calculation")
      ]
    },
    {
      method: "premack-principle" as const,
      title: "PREMACK'S PRINCIPLE · ROUND 2",
      topic: "Reviewing chemical and physical changes",
      task: "Complete the change-classification review before the preferred activity.",
      material: "A physical change alters form or state without creating a new substance. A chemical change rearranges atoms into new substances. Melting ice is physical; rusting iron is chemical.",
      preferredExamples: ["Check messages briefly", "Sketch for five minutes", "Have a favorite snack"],
      questions: [
        question("ppm3q1", "Which is a physical change?", "Melting ice", "Rusting iron", "Burning wood", "Digesting food"),
        question("ppm3q2", "What defines a chemical change?", "New substances form", "Only shape changes", "No atoms rearrange", "Temperature never changes"),
        question("ppm3q3", "What is paired with the preferred activity?", "Finishing the review first", "Skipping the review", "Starting with the reward", "Avoiding a clear task")
      ]
    }
  ],
  "ten-minute-wall-stare": [
    {
      method: "ten-minute-wall-stare" as const,
      title: "10 MIN WALL STARE · ROUND 2",
      topic: "How dunes move",
      material: "Wind lifts or rolls loose sand grains. When wind slows or encounters an obstacle, grains settle. More sand tends to accumulate on the windward side and move over the crest, so a dune can migrate downwind over time.",
      questions: [
        question("wsm2q1", "What moves loose sand grains?", "Wind", "Moonlight", "Plant roots only", "Groundwater only"),
        question("wsm2q2", "When do grains settle?", "When wind slows or meets an obstacle", "When wind always speeds up", "When gravity ends", "Only underwater"),
        question("wsm2q3", "In which direction can a dune migrate?", "Downwind", "Toward Earth's core", "Only north", "Opposite every wind")
      ]
    },
    {
      method: "ten-minute-wall-stare" as const,
      title: "10 MIN WALL STARE · ROUND 2",
      topic: "How leaves exchange gases",
      material: "Small pores called stomata connect internal leaf spaces with the air. Carbon dioxide diffuses inward for photosynthesis, while oxygen and water vapor can diffuse outward. Guard cells adjust pore opening and help balance gas exchange with water loss.",
      questions: [
        question("wsm3q1", "What are leaf pores called?", "Stomata", "Nephrons", "Alveoli", "Axons"),
        question("wsm3q2", "Which gas enters for photosynthesis?", "Carbon dioxide", "Helium", "Nitrogen only", "Hydrogen"),
        question("wsm3q3", "What adjusts pore opening?", "Guard cells", "Red blood cells", "Root hairs only", "Petals")
      ]
    }
  ],
  "strooper-effect": [
    {
      method: "strooper-effect" as const,
      title: "STROOPER EFFECT · ROUND 2",
      topic: "Selective attention in a noisy room",
      material: "Selective attention enhances information relevant to a current goal while reducing processing of competing input. A person's name or another meaningful cue can still capture attention. Performance worsens when competing signals are similar to the target or require the same response system.",
      colors: [{ name: "indigo", hsla: "hsl(245 70% 45%)" }, { name: "mint", hsla: "hsl(150 55% 42%)" }, { name: "rust", hsla: "hsl(15 75% 42%)" }, { name: "yellow", hsla: "hsl(52 95% 43%)" }],
      questions: [
        question("sem2q1", "What does selective attention prioritize?", "Goal-relevant information", "Every signal equally", "Only memories", "Unrelated movement"),
        question("sem2q2", "What may capture attention despite another focus?", "A meaningful cue such as one's name", "No cue ever", "Only silence", "Gravity"),
        question("sem2q3", "When is interference often stronger?", "When competing signals resemble the target", "When no competitors exist", "During perfect silence", "When the task is absent")
      ]
    },
    {
      method: "strooper-effect" as const,
      title: "STROOPER EFFECT · ROUND 2",
      topic: "Response inhibition and impulse control",
      material: "Response inhibition pauses or stops a dominant action when it conflicts with the current rule. The process depends on detecting conflict, maintaining the rule, and selecting a different response. Fatigue or distraction can make consistent inhibition harder.",
      colors: [{ name: "magenta", hsla: "hsl(315 80% 45%)" }, { name: "sky", hsla: "hsl(198 85% 45%)" }, { name: "brown", hsla: "hsl(25 60% 35%)" }, { name: "emerald", hsla: "hsl(145 70% 35%)" }],
      questions: [
        question("sem3q1", "What does response inhibition stop?", "A dominant action that conflicts with the rule", "Every planned action", "All perception", "Memory formation"),
        question("sem3q2", "What must be maintained?", "The current rule", "An unrelated habit", "No goal", "Only a color name"),
        question("sem3q3", "What can make inhibition harder?", "Fatigue or distraction", "Clear rules", "Adequate focus", "Removing conflict")
      ]
    }
  ]
} satisfies Record<
  MethodWithGeneratedVariants,
  readonly [unknown, unknown]
>;
