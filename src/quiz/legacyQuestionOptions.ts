import type { MultipleChoiceQuestion } from "./methodEngineTypes";

// Read-only prior bank text for unfinished drafts. Never rewrite saved answers.
const priorOptions: Readonly<Record<string, { readonly correct: string; readonly options: readonly string[] }>> = {
  "bm3": {
    "correct": "A salty ocean",
    "options": [
      "A salty ocean",
      "A liquid iron layer",
      "A dense atmosphere",
      "Large forests"
    ]
  },
  "bm-penguin-1": {
    "correct": "On sea ice",
    "options": [
      "On sea ice",
      "In forest nests",
      "On tropical beaches",
      "Inside freshwater caves"
    ]
  },
  "bm-penguin-2": {
    "correct": "On his feet beneath a brood pouch",
    "options": [
      "On his feet beneath a brood pouch",
      "Under the sea ice",
      "Inside a nest made from branches",
      "Between rocks at the shoreline"
    ]
  },
  "bm-penguin-3": {
    "correct": "To reduce heat loss",
    "options": [
      "To reduce heat loss",
      "To build a shared nest",
      "To search for fish",
      "To make the ice melt"
    ]
  },
  "bm-penguin-4": {
    "correct": "By regurgitating food collected at sea",
    "options": [
      "By regurgitating food collected at sea",
      "By bringing it seaweed",
      "By teaching it to hunt immediately",
      "By feeding it pieces of ice"
    ]
  },
  "bm-octopus-2": {
    "correct": "The gills",
    "options": [
      "The gills",
      "The arms only",
      "The skin",
      "The eyes"
    ]
  },
  "bm-octopus-3": {
    "correct": "It contains hemocyanin",
    "options": [
      "It contains hemocyanin",
      "It absorbs seawater",
      "It contains chlorophyll",
      "It has no oxygen-carrying protein"
    ]
  },
  "bm-octopus-4": {
    "correct": "Chromatophores in its skin",
    "options": [
      "Chromatophores in its skin",
      "A rigid outer shell",
      "Feathers around its body",
      "Air stored in its arms"
    ]
  },
  "bc1": {
    "correct": "Ice is less dense than liquid water",
    "options": [
      "Ice is less dense than liquid water",
      "Ice contains no molecules",
      "Liquid water pushes everything upward",
      "Ice becomes heavier when frozen"
    ]
  },
  "bc2": {
    "correct": "Its molecules form a more open structure",
    "options": [
      "Its molecules form a more open structure",
      "Its molecules disappear",
      "Its molecules become heavier",
      "Its molecules collapse closer together"
    ]
  },
  "bc3": {
    "correct": "The solid could become denser and sink",
    "options": [
      "The solid could become denser and sink",
      "The solid would contain no mass",
      "The water would stop freezing",
      "Density would no longer matter"
    ]
  },
  "bc-seasons-1": {
    "correct": "Earth's axis is tilted as Earth orbits the Sun",
    "options": [
      "Earth's axis is tilted as Earth orbits the Sun",
      "Earth repeatedly moves much closer to the Sun",
      "The Sun changes size during the year",
      "Clouds permanently move between hemispheres"
    ]
  },
  "bc-seasons-2": {
    "correct": "It receives more direct sunlight and has longer days",
    "options": [
      "It receives more direct sunlight and has longer days",
      "It receives no sunlight",
      "Its oceans stop absorbing energy",
      "Its distance from the Sun doubles"
    ]
  },
  "bc-seasons-3": {
    "correct": "It is tilted away and receives less direct sunlight",
    "options": [
      "It is tilted away and receives less direct sunlight",
      "It is also tilted toward the Sun",
      "It has no day-and-night cycle",
      "It becomes permanently colder"
    ]
  },
  "bc-dew-1": {
    "correct": "The air cools",
    "options": [
      "The air cools",
      "The air loses all its gases",
      "The air immediately becomes warmer",
      "The air stops containing water vapor"
    ]
  },
  "bc-dew-2": {
    "correct": "Water vapor condenses into liquid droplets",
    "options": [
      "Water vapor condenses into liquid droplets",
      "Liquid water turns into sunlight",
      "The surface begins producing water",
      "All moisture disappears from the air"
    ]
  },
  "bc-dew-3": {
    "correct": "It allows surfaces to cool effectively",
    "options": [
      "It allows surfaces to cool effectively",
      "It prevents surfaces from losing heat",
      "It removes all water vapor",
      "It keeps grass warmer than the air"
    ]
  },
  "ar1": {
    "correct": "A waggle dance",
    "options": [
      "A waggle dance",
      "Changing wing color",
      "Building a second hive",
      "Sleeping near the food"
    ]
  },
  "ar2": {
    "correct": "The direction of the food",
    "options": [
      "The direction of the food",
      "The age of the bee",
      "The size of the hive",
      "The temperature outside"
    ]
  },
  "ar3": {
    "correct": "Distance to the food",
    "options": [
      "Distance to the food",
      "Number of bees in the hive",
      "Age of the queen",
      "Amount of honey already stored"
    ]
  },
  "ar4": {
    "correct": "Scent",
    "options": [
      "Scent",
      "Written symbols",
      "Color changes in their wings",
      "Changes in hive shape"
    ]
  },
  "fy1": {
    "correct": "Metal removes heat from your hand faster",
    "options": [
      "Metal removes heat from your hand faster",
      "Metal always has a lower temperature",
      "Wood produces heat",
      "Metal contains cold energy"
    ]
  },
  "fy2": {
    "correct": "Thermal conductivity",
    "options": [
      "Thermal conductivity",
      "Mass",
      "Color",
      "Shape"
    ]
  },
  "fy3": {
    "correct": "Even colder to the touch",
    "options": [
      "Even colder to the touch",
      "Warmer than your hand",
      "Exactly like wood",
      "Temperature would become irrelevant"
    ]
  },
  "fy4": {
    "correct": "Heat leaves your hand more slowly",
    "options": [
      "Heat leaves your hand more slowly",
      "Wood is always warmer than the room",
      "Wood creates heat when touched",
      "Wood stops heat from existing"
    ]
  },
  "co1": {
    "correct": "The plates continue moving while rocks are temporarily stuck",
    "options": [
      "The plates continue moving while rocks are temporarily stuck",
      "Tectonic plates completely stop moving",
      "Seismic waves prevent the rocks from moving",
      "The epicenter pulls the plates together"
    ]
  },
  "co2": {
    "correct": "The rocks suddenly move along the fault",
    "options": [
      "The rocks suddenly move along the fault",
      "The tectonic plates disappear",
      "The epicenter moves underground",
      "The rocks permanently stop storing energy"
    ]
  },
  "co3": {
    "correct": "As seismic waves",
    "options": [
      "As seismic waves",
      "As tectonic plates",
      "As atmospheric pressure",
      "As ocean currents"
    ]
  },
  "co4": {
    "correct": "The surface point directly above the earthquake focus",
    "options": [
      "The surface point directly above the earthquake focus",
      "The underground point where movement begins",
      "The boundary of every tectonic plate",
      "The strongest seismic wave"
    ]
  },
  "ab1": {
    "correct": "They provide shelter and nursery areas",
    "options": [
      "They provide shelter and nursery areas",
      "They remove all predators from the ocean",
      "They make seawater warmer",
      "They prevent animals from moving"
    ]
  },
  "ab2": {
    "correct": "Energy produced through photosynthesis",
    "options": [
      "Energy produced through photosynthesis",
      "Sand for the ocean floor",
      "Protection from every disease",
      "Fresh water for the coral"
    ]
  },
  "ab3": {
    "correct": "They reduce wave energy",
    "options": [
      "They reduce wave energy",
      "They stop the tides completely",
      "They increase coastal wind speed",
      "They remove all coastal sediment"
    ]
  },
  "ab4": {
    "correct": "Corals expel the algae living with them",
    "options": [
      "Corals expel the algae living with them",
      "Corals turn into sand immediately",
      "Corals begin producing their own sunlight",
      "Corals move into deeper water"
    ]
  },
  "os1": {
    "correct": "Memory cells recognize the pathogen",
    "options": [
      "Memory cells recognize the pathogen",
      "The pathogen can no longer enter the body",
      "Vaccines permanently raise body temperature",
      "Antibodies replace every immune cell"
    ]
  },
  "os2": {
    "correct": "A recognizable form or part of a pathogen",
    "options": [
      "A recognizable form or part of a pathogen",
      "A completely unrelated nutrient",
      "Only healthy human cells",
      "A permanent supply of antibodies"
    ]
  },
  "os3": {
    "correct": "Prior safe exposure prepares a faster later response",
    "options": [
      "Prior safe exposure prepares a faster later response",
      "Every immune response starts from the beginning",
      "Memory cells prevent all future infections",
      "The body responds only while a vaccine is present"
    ]
  },
  "nt42": {
    "correct": "It condenses into droplets that can form clouds",
    "options": [
      "It condenses into droplets that can form clouds",
      "It immediately becomes groundwater",
      "It stops participating in the water cycle",
      "It turns directly into runoff"
    ]
  },
  "nt43": {
    "correct": "When water droplets or ice crystals become heavy enough to fall",
    "options": [
      "When water droplets or ice crystals become heavy enough to fall",
      "Whenever liquid water absorbs energy",
      "Only when groundwater reaches the ocean",
      "When plants absorb water through their roots"
    ]
  },
  "nt44": {
    "correct": "Evaporation, condensation, precipitation, collection",
    "options": [
      "Evaporation, condensation, precipitation, collection",
      "Collection, precipitation, evaporation, condensation only once",
      "Condensation, collection, erosion, combustion",
      "Precipitation, photosynthesis, condensation, respiration"
    ]
  },
  "lsp1": {
    "correct": "Nucleus",
    "options": [
      "Nucleus",
      "Ribosome",
      "Cell membrane",
      "Mitochondrion"
    ]
  },
  "lst3": {
    "correct": "Nucleus — stores DNA",
    "options": [
      "Nucleus — stores DNA",
      "Ribosome — controls entry",
      "Cell membrane — builds proteins",
      "Mitochondrion — stores DNA"
    ]
  },
  "st1": {
    "correct": "Bare rock with little or no soil",
    "options": [
      "Bare rock with little or no soil",
      "A mature forest",
      "Deep fertile soil",
      "Large grazing animals"
    ]
  },
  "st2": {
    "correct": "They help break down rock",
    "options": [
      "They help break down rock",
      "They remove all soil",
      "They prevent plant growth",
      "They create mature trees immediately"
    ]
  },
  "st3": {
    "correct": "Grasses, shrubs, and eventually trees",
    "options": [
      "Grasses, shrubs, and eventually trees",
      "Only bare rock",
      "Ocean currents",
      "Glaciers"
    ]
  },
  "cc1": {
    "correct": "The value of the best alternative given up",
    "options": [
      "The value of the best alternative given up",
      "The price of every available option",
      "A reward received after any decision",
      "The total number of alternatives"
    ]
  },
  "cc2": {
    "correct": "Resources are limited and choices exclude alternatives",
    "options": [
      "Resources are limited and choices exclude alternatives",
      "Every resource is unlimited",
      "All choices have identical results",
      "Alternatives can always be selected together"
    ]
  },
  "cc3": {
    "correct": "The wages from the shift",
    "options": [
      "The wages from the shift",
      "The knowledge gained",
      "Every future job",
      "The cost of the textbook only"
    ]
  },
  "cc4": {
    "correct": "When comparing choices that use limited resources",
    "options": [
      "When comparing choices that use limited resources",
      "When no alternatives exist",
      "When every option can be chosen",
      "Only after a choice has no consequences"
    ]
  },
  "hf1": {
    "correct": "It is treated to remove contaminants",
    "options": [
      "It is treated to remove contaminants",
      "It is sent directly to sewers",
      "It is mixed with wastewater",
      "It is stored only in homes"
    ]
  },
  "hf2": {
    "correct": "Pumps, pipes, and storage tanks",
    "options": [
      "Pumps, pipes, and storage tanks",
      "Only natural rainfall",
      "Wastewater facilities alone",
      "Household drains"
    ]
  },
  "hf4": {
    "correct": "A sequence from sourcing water to handling used water",
    "options": [
      "A sequence from sourcing water to handling used water",
      "A list of unrelated weather events",
      "A comparison of four cities",
      "A history of household plumbing"
    ]
  },
  "pq1": {
    "correct": "They slow waves and currents",
    "options": [
      "They slow waves and currents",
      "They increase tidal height",
      "They remove all seawater",
      "They harden the ocean floor"
    ]
  },
  "pq2": {
    "correct": "Slower water drops suspended material",
    "options": [
      "Slower water drops suspended material",
      "Roots manufacture sand",
      "Fish carry every particle",
      "The water becomes warmer"
    ]
  },
  "pq3": {
    "correct": "Their roots create sheltered nursery habitat",
    "options": [
      "Their roots create sheltered nursery habitat",
      "They eliminate all predators",
      "They stop animals from moving",
      "They turn salt water fresh"
    ]
  },
  "pq4": {
    "correct": "Root structure provides physical protection and ecological habitat",
    "options": [
      "Root structure provides physical protection and ecological habitat",
      "Mangroves protect shores only by absorbing rain",
      "Coastal protection requires removing wildlife",
      "Sediment prevents roots from growing"
    ]
  },
  "de1": {
    "correct": "Frogs",
    "options": [
      "Frogs",
      "Grass",
      "Rabbits",
      "Decomposers only"
    ]
  },
  "de2": {
    "correct": "The direction of energy transfer",
    "options": [
      "The direction of energy transfer",
      "The size of each organism",
      "Where each organism sleeps",
      "The amount of rainfall"
    ]
  },
  "de3": {
    "correct": "They return nutrients to the soil",
    "options": [
      "They return nutrients to the soil",
      "They create sunlight",
      "They remove every consumer",
      "They stop energy transfer"
    ]
  },
  "de4": {
    "correct": "Grass → rabbit → hawk",
    "options": [
      "Grass → rabbit → hawk",
      "Hawk → rabbit → grass",
      "Frog → grasshopper → grass",
      "Soil → fox → sunlight"
    ]
  },
  "et1": {
    "correct": "Teach residents how to avoid contamination",
    "options": [
      "Teach residents how to avoid contamination",
      "Change the slogan monthly",
      "Choose a decorative font",
      "Print matching shirts"
    ]
  },
  "et2": {
    "correct": "It determines what the program can successfully process",
    "options": [
      "It determines what the program can successfully process",
      "It selects the poster font",
      "It removes the need for collection",
      "It guarantees every item is recyclable"
    ]
  },
  "et3": {
    "correct": "Convenient bins and reliable collection",
    "options": [
      "Convenient bins and reliable collection",
      "T-shirts and changing slogans",
      "Fonts and T-shirts",
      "Monthly slogans and poster colors"
    ]
  },
  "et4": {
    "correct": "It focuses effort on actions that drive most program success",
    "options": [
      "It focuses effort on actions that drive most program success",
      "It requires memorizing every minor detail equally",
      "It removes the need to prioritize",
      "It guarantees exactly eighty participants"
    ]
  },
  "ds1": {
    "correct": "A committee studies it",
    "options": [
      "A committee studies it",
      "It immediately becomes law",
      "The courts rewrite it",
      "Voters must approve every clause"
    ]
  },
  "ds2": {
    "correct": "The chambers may approve different wording",
    "options": [
      "The chambers may approve different wording",
      "A committee cannot read a bill",
      "The bill has already become law",
      "Executive approval happens first"
    ]
  },
  "ds3": {
    "correct": "The legislature approves a final version",
    "options": [
      "The legislature approves a final version",
      "The law is enforced for a year",
      "A new bill replaces it automatically",
      "All committees are dissolved"
    ]
  },
  "ds4": {
    "correct": "It reveals the sequence and role of each decision",
    "options": [
      "It reveals the sequence and role of each decision",
      "It makes the order irrelevant",
      "It removes intermediate decisions",
      "It turns every stage into the same action"
    ]
  },
  "db1": {
    "correct": "The weight of displaced water",
    "options": [
      "The weight of displaced water",
      "The object's color",
      "The water's surface shape only",
      "The time of day"
    ]
  },
  "db2": {
    "correct": "Its shape lowers average density and displaces enough water",
    "options": [
      "Its shape lowers average density and displaces enough water",
      "Steel stops having mass",
      "Water loses density near ships",
      "Gravity does not act on hollow objects"
    ]
  },
  "db3": {
    "correct": "It sinks",
    "options": [
      "It sinks",
      "It becomes massless",
      "It always evaporates",
      "Its density becomes zero"
    ]
  },
  "db4": {
    "correct": "Greater displaced volume can increase buoyant force and support floating",
    "options": [
      "Greater displaced volume can increase buoyant force and support floating",
      "Greater mass always creates lower density",
      "Smaller volume always increases buoyant force",
      "Density has no relationship to floating"
    ]
  },
  "kr1": {
    "correct": "Assign one member to share the source list today so the waiting summaries can begin",
    "options": [
      "Assign one member to share the source list today so the waiting summaries can begin",
      "The project is always a disaster",
      "Everyone should try harder sometime",
      "Group work is difficult"
    ]
  },
  "kr2": {
    "correct": "The source list has not been shared or assigned",
    "options": [
      "The source list has not been shared or assigned",
      "The whole project is bad",
      "Every member lacks motivation",
      "The deadline should not exist"
    ]
  },
  "pp1": {
    "correct": "Duplicated chromosomes separate into two nuclei",
    "options": [
      "Duplicated chromosomes separate into two nuclei",
      "The cytoplasm divides first",
      "The cell stops preparing",
      "Two cells fuse"
    ]
  },
  "pp2": {
    "correct": "The cytoplasm",
    "options": [
      "The cytoplasm",
      "Only the chromosomes",
      "The cell's DNA before replication",
      "The preferred activity"
    ]
  },
  "pp3": {
    "correct": "Finish the review, then watch a preferred short video",
    "options": [
      "Finish the review, then watch a preferred short video",
      "Watch the video instead of reviewing",
      "Take the reward first",
      "Avoid both activities"
    ]
  },
  "ws1": {
    "correct": "Deep non-REM sleep",
    "options": [
      "Deep non-REM sleep",
      "Only waking",
      "The first minute of sleep",
      "No sleep stage"
    ]
  },
  "ws2": {
    "correct": "Integrating memories and emotional information",
    "options": [
      "Integrating memories and emotional information",
      "Preventing memory formation",
      "Replacing non-REM sleep",
      "Stopping sleep cycles"
    ]
  },
  "ws3": {
    "correct": "They provide repeated opportunities to process learning",
    "options": [
      "They provide repeated opportunities to process learning",
      "They keep the brain in one stage",
      "They remove memories",
      "They make study unnecessary"
    ]
  },
  "se1": {
    "correct": "The word meaning conflicts with the ink color",
    "options": [
      "The word meaning conflicts with the ink color",
      "The word and ink always match",
      "The screen has no text",
      "The learner closes their eyes"
    ]
  },
  "se2": {
    "correct": "The ink color",
    "options": [
      "The ink color",
      "The written word",
      "The button shape",
      "The number of letters"
    ]
  },
  "se3": {
    "correct": "Inhibitory control",
    "options": [
      "Inhibitory control",
      "Random guessing",
      "Reward tracking",
      "Visual avoidance"
    ]
  },
  "vx1": {
    "correct": "Eukaryotic cells",
    "options": [
      "Eukaryotic cells",
      "All prokaryotic cells",
      "Viruses",
      "Every protein"
    ]
  },
  "vx2": {
    "correct": "Specialized structures that perform cell functions",
    "options": [
      "Specialized structures that perform cell functions",
      "Organisms living outside every cell",
      "Only the DNA inside bacteria",
      "The spaces between tissues"
    ]
  },
  "vx3": {
    "correct": "It maintains a favorable surface-area-to-volume ratio",
    "options": [
      "It maintains a favorable surface-area-to-volume ratio",
      "It removes the need for energy",
      "It prevents all material exchange",
      "It makes organelles unnecessary"
    ]
  },
  "arm1": {
    "correct": "The production of light by an organism",
    "options": [
      "The production of light by an organism",
      "The reflection of sunlight",
      "A way animals produce oxygen",
      "The movement of ocean currents"
    ]
  },
  "arm2": {
    "correct": "To detect very small amounts of light",
    "options": [
      "To detect very small amounts of light",
      "To reduce water pressure",
      "To store more energy",
      "To breathe underwater"
    ]
  },
  "arm3": {
    "correct": "Food can be scarce",
    "options": [
      "Food can be scarce",
      "The water contains too much oxygen",
      "They receive too much sunlight",
      "They constantly swim at high speed"
    ]
  },
  "arm4": {
    "correct": "High water pressure",
    "options": [
      "High water pressure",
      "Low gravity",
      "Extremely dry air",
      "Constant wind"
    ]
  },
  "fym1": {
    "correct": "The tilt of Earth's axis",
    "options": [
      "The tilt of Earth's axis",
      "Large changes in Earth's distance from the Sun",
      "Changes in the Moon",
      "Changes in Earth's rotation speed"
    ]
  },
  "fym2": {
    "correct": "It receives more direct sunlight and generally longer days",
    "options": [
      "It receives more direct sunlight and generally longer days",
      "It moves significantly closer to the Sun",
      "Its gravity becomes weaker",
      "It stops rotating"
    ]
  },
  "fym3": {
    "correct": "When one tilts toward the Sun, the other tilts away",
    "options": [
      "When one tilts toward the Sun, the other tilts away",
      "The hemispheres orbit the Sun separately",
      "Only one hemisphere rotates",
      "The Sun heats only one hemisphere each year"
    ]
  },
  "com1": {
    "correct": "It can be less dense than surrounding rock",
    "options": [
      "It can be less dense than surrounding rock",
      "It contains no mass",
      "Gravity pushes it upward",
      "The crust always moves downward"
    ]
  },
  "com2": {
    "correct": "Pressure can increase",
    "options": [
      "Pressure can increase",
      "Gravity disappears",
      "The magma immediately becomes rock",
      "The crust stops existing"
    ]
  },
  "com4": {
    "correct": "They build layers of volcanic material",
    "options": [
      "They build layers of volcanic material",
      "They remove all rock from the area",
      "They stop magma from rising",
      "They eliminate pressure underground"
    ]
  },
  "abm1": {
    "correct": "They absorb and temporarily store excess water",
    "options": [
      "They absorb and temporarily store excess water",
      "They prevent all rain from reaching the ground",
      "They permanently remove rivers",
      "They increase the speed of runoff"
    ]
  },
  "abm2": {
    "correct": "Slow it and trap sediment",
    "options": [
      "Slow it and trap sediment",
      "Turn it into salt water",
      "Stop evaporation everywhere",
      "Remove all organisms from it"
    ]
  },
  "abm3": {
    "correct": "Plants and microorganisms remove some nutrients and pollutants",
    "options": [
      "Plants and microorganisms remove some nutrients and pollutants",
      "They replace water with dry soil",
      "They prevent microorganisms from living",
      "They add sediment to every water source"
    ]
  },
  "abm4": {
    "correct": "Reduced flood protection and wildlife habitat",
    "options": [
      "Reduced flood protection and wildlife habitat",
      "More habitat for wetland species",
      "Complete prevention of runoff",
      "Permanent improvement of water quality"
    ]
  },
  "osm1": {
    "correct": "Outgoing infrared radiation",
    "options": [
      "Outgoing infrared radiation",
      "All incoming visible sunlight",
      "Sound waves from Earth's surface",
      "Energy from ocean tides only"
    ]
  },
  "osm2": {
    "correct": "They slow the rate at which heat escapes",
    "options": [
      "They slow the rate at which heat escapes",
      "They stop Earth from absorbing sunlight",
      "They make the surface release no energy",
      "They reflect all heat directly into space"
    ]
  },
  "osm3": {
    "correct": "The greenhouse effect strengthens and average temperatures rise",
    "options": [
      "The greenhouse effect strengthens and average temperatures rise",
      "The natural greenhouse effect disappears",
      "Earth receives no sunlight",
      "Infrared radiation changes into gravity"
    ]
  },
  "nt4m2": {
    "correct": "Its dense roof of leaves supports many animals",
    "options": [
      "Its dense roof of leaves supports many animals",
      "It is the darkest layer",
      "It contains no plant life",
      "It receives less light than the forest floor"
    ]
  },
  "nt4m3": {
    "correct": "They are adapted to limited sunlight",
    "options": [
      "They are adapted to limited sunlight",
      "They grow above every emergent tree",
      "They receive constant strong winds",
      "They do not require water"
    ]
  },
  "nt4m4": {
    "correct": "Decomposers return nutrients to the soil",
    "options": [
      "Decomposers return nutrients to the soil",
      "The tallest trees capture the strongest winds",
      "Most sunlight is stored permanently",
      "Leaves form the rainforest canopy"
    ]
  },
  "lsmp1": {
    "correct": "Red blood cells",
    "options": [
      "Red blood cells",
      "Platelets",
      "Plasma",
      "White blood cells"
    ]
  },
  "lsmp3": {
    "correct": "Platelets",
    "options": [
      "Platelets",
      "Plasma",
      "Red blood cells",
      "White blood cells"
    ]
  },
  "lsmt1": {
    "correct": "Platelets",
    "options": [
      "Platelets",
      "Plasma",
      "Red blood cells",
      "White blood cells"
    ]
  },
  "lsmt2": {
    "correct": "White blood cells — defense against infection",
    "options": [
      "White blood cells — defense against infection",
      "Platelets — oxygen transport",
      "Plasma — blood clotting only",
      "Red blood cells — hormone production"
    ]
  },
  "lsmt3": {
    "correct": "Transporting dissolved materials and blood cells",
    "options": [
      "Transporting dissolved materials and blood cells",
      "Producing all antibodies",
      "Carrying oxygen with hemoglobin",
      "Sealing wounds by itself"
    ]
  },
  "stm1": {
    "correct": "A protostar",
    "options": [
      "A protostar",
      "A white dwarf",
      "A red giant",
      "A planet"
    ]
  },
  "stm2": {
    "correct": "Nuclear fusion",
    "options": [
      "Nuclear fusion",
      "The loss of all gravity",
      "Planetary motion",
      "The immediate white-dwarf stage"
    ]
  },
  "ccm1": {
    "correct": "A system's output influences its later behavior",
    "options": [
      "A system's output influences its later behavior",
      "A system never responds to its output",
      "Every process stops after one step",
      "Only outside forces can affect a system"
    ]
  },
  "ccm2": {
    "correct": "It can stabilize a system by counteracting change",
    "options": [
      "It can stabilize a system by counteracting change",
      "It always accelerates change",
      "It removes every system input",
      "It prevents any response"
    ]
  },
  "ccm4": {
    "correct": "When predicting how a system responds to change",
    "options": [
      "When predicting how a system responds to change",
      "Only when a system has no outputs",
      "When comparing unrelated definitions",
      "Only after a system permanently stops"
    ]
  },
  "abbrm4": {
    "correct": "Huron, Ontario, Michigan, Erie, Superior",
    "options": [
      "Huron, Ontario, Michigan, Erie, Superior",
      "Hudson, Ohio, Maine, Erie, Saskatchewan",
      "Huron, Ottawa, Manitoba, Erie, Superior",
      "Huron, Ontario, Michigan, Everest, Superior"
    ]
  },
  "hfm2": {
    "correct": "To protect food quality and safety during transport",
    "options": [
      "To protect food quality and safety during transport",
      "To make farms produce faster",
      "To replace processing",
      "To eliminate retail stores"
    ]
  },
  "hfm4": {
    "correct": "Production through processing and distribution to consumption",
    "options": [
      "Production through processing and distribution to consumption",
      "Consumption before production",
      "Four unrelated farming methods",
      "Retail followed by crop growth"
    ]
  },
  "pqm1": {
    "correct": "It blocks part of the Sun's radiation",
    "options": [
      "It blocks part of the Sun's radiation",
      "It produces cold pavement",
      "It removes every building",
      "It stops air movement"
    ]
  },
  "pqm2": {
    "correct": "Evaporation uses heat energy",
    "options": [
      "Evaporation uses heat energy",
      "Water vapor creates sunlight",
      "Roots reflect all radiation",
      "Leaves stop using water"
    ]
  },
  "pqm3": {
    "correct": "Areas with heat-storing paved surfaces",
    "options": [
      "Areas with heat-storing paved surfaces",
      "Areas with no sunlight ever",
      "Only inside sealed buildings",
      "Places without soil or water"
    ]
  },
  "pqm4": {
    "correct": "Trees shade surfaces and cool air through transpiration",
    "options": [
      "Trees shade surfaces and cool air through transpiration",
      "Trees cool only by changing road color",
      "Trees eliminate solar energy",
      "Trees cool only after losing all leaves"
    ]
  },
  "dem3": {
    "correct": "Existing rock plus heat and pressure",
    "options": [
      "Existing rock plus heat and pressure",
      "Magma plus weathering",
      "Sediment plus melting",
      "Igneous rock plus sunlight"
    ]
  },
  "etm1": {
    "correct": "The assessed learning objectives",
    "options": [
      "The assessed learning objectives",
      "Matching stationery",
      "Page-border colors",
      "The number of available fonts"
    ]
  },
  "etm2": {
    "correct": "Retrieval practice followed by error checking",
    "options": [
      "Retrieval practice followed by error checking",
      "Rewriting decorative headings",
      "Sorting pens by color",
      "Changing the timetable font"
    ]
  },
  "etm3": {
    "correct": "Practising weak key skills and protecting sleep",
    "options": [
      "Practising weak key skills and protecting sleep",
      "Color coding and matching stationery",
      "Fonts and borders",
      "Decorating and recopying schedules"
    ]
  },
  "etm4": {
    "correct": "Time goes first to the few actions with greatest learning value",
    "options": [
      "Time goes first to the few actions with greatest learning value",
      "Every task receives equal time",
      "Only easy details are studied",
      "Twenty separate schedules are created"
    ]
  },
  "dsm1": {
    "correct": "The package is scanned and sorted at origin",
    "options": [
      "The package is scanned and sorted at origin",
      "The final delivery scan is recorded",
      "The recipient returns it",
      "The label is removed"
    ]
  },
  "dsm2": {
    "correct": "They update location and support correct routing",
    "options": [
      "They update location and support correct routing",
      "They make transport unnecessary",
      "They replace package labels",
      "They guarantee same-minute delivery"
    ]
  },
  "dsm3": {
    "correct": "Sorting onto a local delivery route",
    "options": [
      "Sorting onto a local delivery route",
      "Creating the original label",
      "Returning to the origin automatically",
      "Removing all tracking data"
    ]
  },
  "dbm1": {
    "correct": "Light reaches the ground at a shallow angle",
    "options": [
      "Light reaches the ground at a shallow angle",
      "Light stops moving in straight lines",
      "Objects become taller",
      "Earth stops rotating"
    ]
  },
  "dbm2": {
    "correct": "Sunlight strikes the ground more steeply",
    "options": [
      "Sunlight strikes the ground more steeply",
      "The object loses height",
      "Opaque objects become transparent",
      "The Sun produces less light"
    ]
  },
  "dbm3": {
    "correct": "Earth's rotation",
    "options": [
      "Earth's rotation",
      "The object's color",
      "The shadow pulling the Sun",
      "Daily changes in gravity"
    ]
  },
  "dbm4": {
    "correct": "Lower apparent Sun angle leads to a longer blocked region",
    "options": [
      "Lower apparent Sun angle leads to a longer blocked region",
      "Higher Sun angle always makes shadows longer",
      "Straight-line light eliminates shadows",
      "Rotation makes objects change size"
    ]
  },
  "krm1": {
    "correct": "Choose tomorrow's subject tonight and begin a 30-minute session after dinner",
    "options": [
      "Choose tomorrow's subject tonight and begin a 30-minute session after dinner",
      "There is never any time",
      "Phones ruin everything",
      "Studying is generally hard"
    ]
  },
  "krm2": {
    "correct": "Unplanned media switching during the available period",
    "options": [
      "Unplanned media switching during the available period",
      "Time does not exist",
      "Every subject is impossible",
      "The week has too few days"
    ]
  },
  "krm3": {
    "correct": "The two hours after dinner on three weekdays",
    "options": [
      "The two hours after dinner on three weekdays",
      "Never",
      "Everything",
      "Enough"
    ]
  },
  "ppm1": {
    "correct": "Find a common denominator",
    "options": [
      "Find a common denominator",
      "Add the denominators",
      "Delete one fraction",
      "Multiply only numerators"
    ]
  },
  "ppm2": {
    "correct": "Add the numerators",
    "options": [
      "Add the numerators",
      "Add denominators again",
      "Ignore the result",
      "Change the task"
    ]
  },
  "ppm3": {
    "correct": "After the agreed practice task",
    "options": [
      "After the agreed practice task",
      "Before choosing the task",
      "Instead of practice",
      "During every problem"
    ]
  },
  "wsm1": {
    "correct": "Through roots and fallen material",
    "options": [
      "Through roots and fallen material",
      "Through mineral evaporation",
      "By removing decomposers",
      "Through sunlight alone"
    ]
  },
  "wsm2": {
    "correct": "Stabilization in organic matter or binding to minerals",
    "options": [
      "Stabilization in organic matter or binding to minerals",
      "Eliminating plant growth",
      "Constant soil removal",
      "Preventing roots"
    ]
  },
  "wsm3": {
    "correct": "Return some carbon to the atmosphere",
    "options": [
      "Return some carbon to the atmosphere",
      "Destroy every mineral",
      "Stop all carbon movement",
      "Create carbon from nothing"
    ]
  },
  "sem1": {
    "correct": "The previous rule still competes for control",
    "options": [
      "The previous rule still competes for control",
      "The new rule removes attention",
      "Switching eliminates conflict",
      "The old rule vanishes"
    ]
  },
  "sem2": {
    "correct": "Response inhibition",
    "options": [
      "Response inhibition",
      "Repeating the old rule",
      "Ignoring the new task",
      "Removing every stimulus"
    ]
  },
  "sem3": {
    "correct": "The rule guiding the response",
    "options": [
      "The rule guiding the response",
      "The profile shape",
      "The hours in a day",
      "Every word's meaning"
    ]
  },
  "vxm1": {
    "correct": "Interference patterns",
    "options": [
      "Interference patterns",
      "Light having no measurable effects",
      "All colors moving at different speeds in a vacuum",
      "Objects producing no shadows"
    ]
  },
  "vxm2": {
    "correct": "Diffraction",
    "options": [
      "Diffraction",
      "Combustion",
      "Conduction",
      "Compression only"
    ]
  },
  "vxm3": {
    "correct": "Their wavelength and frequency",
    "options": [
      "Their wavelength and frequency",
      "Whether they are made of different matter",
      "Their need for air",
      "Whether gravity turns off"
    ]
  },
  "arl2q1": {
    "correct": "A stigma",
    "options": [
      "A stigma",
      "A root tip",
      "A leaf vein",
      "A seed coat"
    ]
  },
  "arl2q2": {
    "correct": "Bees and other animals",
    "options": [
      "Bees and other animals",
      "Only groundwater",
      "Only moonlight",
      "Rock particles"
    ]
  },
  "arl2q3": {
    "correct": "A seed",
    "options": [
      "A seed",
      "A petal",
      "A root hair",
      "A thorn"
    ]
  },
  "arl2q4": {
    "correct": "Color, scent, or nectar",
    "options": [
      "Color, scent, or nectar",
      "Only deep roots",
      "Frozen soil",
      "Rock fragments"
    ]
  },
  "arl3q1": {
    "correct": "Plates move apart",
    "options": [
      "Plates move apart",
      "Plates stop permanently",
      "Plates become clouds",
      "Plates orbit the Moon"
    ]
  },
  "arl3q2": {
    "correct": "A transform boundary",
    "options": [
      "A transform boundary",
      "A divergent boundary only",
      "A shoreline",
      "A river boundary"
    ]
  },
  "arl3q3": {
    "correct": "An earthquake",
    "options": [
      "An earthquake",
      "A lunar eclipse",
      "Photosynthesis",
      "Condensation"
    ]
  },
  "arl3q4": {
    "correct": "New crust",
    "options": [
      "New crust",
      "A new atmosphere",
      "Plant tissue",
      "Ocean salt"
    ]
  },
  "fyl2q1": {
    "correct": "Blue wavelengths are scattered strongly by the atmosphere",
    "options": [
      "Blue wavelengths are scattered strongly by the atmosphere",
      "The ocean paints the air blue",
      "Clouds produce blue light",
      "The Sun emits only blue light"
    ]
  },
  "fyl2q2": {
    "correct": "Gas molecules in the atmosphere",
    "options": [
      "Gas molecules in the atmosphere",
      "Only ocean waves",
      "Earth's inner core",
      "Tree roots"
    ]
  },
  "fyl2q3": {
    "correct": "It is scattered through the atmosphere",
    "options": [
      "It is scattered through the atmosphere",
      "It stops moving",
      "It becomes sound",
      "It travels only underground"
    ]
  },
  "fyl3q1": {
    "correct": "Evaporation",
    "options": [
      "Evaporation",
      "Freezing",
      "Condensation onto the skin",
      "Combustion"
    ]
  },
  "fyl3q2": {
    "correct": "Heat at the skin's surface",
    "options": [
      "Heat at the skin's surface",
      "Sound in the air",
      "Hair color",
      "Gravity alone"
    ]
  },
  "fyl3q3": {
    "correct": "It slows sweat evaporation",
    "options": [
      "It slows sweat evaporation",
      "It freezes sweat instantly",
      "It removes all water",
      "It stops blood flow"
    ]
  },
  "fyl3q4": {
    "correct": "Faster-moving water molecules",
    "options": [
      "Faster-moving water molecules",
      "Only salt molecules",
      "Skin cells",
      "The slowest air molecules"
    ]
  },
  "col2q1": {
    "correct": "The chloroplast",
    "options": [
      "The chloroplast",
      "The nucleus only",
      "The ribosome",
      "The cell membrane only"
    ]
  },
  "col2q2": {
    "correct": "Carbon dioxide",
    "options": [
      "Carbon dioxide",
      "Helium",
      "Hydrogen only",
      "Neon"
    ]
  },
  "col2q3": {
    "correct": "Sugar",
    "options": [
      "Sugar",
      "Rock",
      "Nitrogen gas",
      "Salt"
    ]
  },
  "col2q4": {
    "correct": "Enter the leaf",
    "options": [
      "Enter the leaf",
      "Become chlorophyll",
      "Leave only through roots",
      "Turn into oxygen outside the plant"
    ]
  },
  "col3q1": {
    "correct": "Nephrons",
    "options": [
      "Nephrons",
      "Alveoli",
      "Neurons",
      "Tendons"
    ]
  },
  "col3q2": {
    "correct": "They are reabsorbed",
    "options": [
      "They are reabsorbed",
      "They become bones",
      "They enter the lungs",
      "They are always discarded"
    ]
  },
  "col3q3": {
    "correct": "The bladder",
    "options": [
      "The bladder",
      "The stomach",
      "The liver",
      "The pancreas"
    ]
  },
  "col3q4": {
    "correct": "Ureters",
    "options": [
      "Ureters",
      "Arteries",
      "Bronchi",
      "Tendons"
    ]
  },
  "abl2q1": {
    "correct": "Reflected sunlight",
    "options": [
      "Reflected sunlight",
      "Light made by lunar oceans",
      "Lightning",
      "City lights"
    ]
  },
  "abl2q2": {
    "correct": "We see different portions of its illuminated half",
    "options": [
      "We see different portions of its illuminated half",
      "The Moon physically changes size",
      "Clouds carve its surface",
      "Earth switches off the Sun"
    ]
  },
  "abl2q3": {
    "correct": "One month",
    "options": [
      "One month",
      "One day",
      "One hour",
      "One decade"
    ]
  },
  "abl3q1": {
    "correct": "The lungs",
    "options": [
      "The lungs",
      "The stomach",
      "The kidneys only",
      "The left hand only"
    ]
  },
  "abl3q2": {
    "correct": "Oxygen",
    "options": [
      "Oxygen",
      "Bone tissue",
      "Food",
      "Sunlight"
    ]
  },
  "abl3q4": {
    "correct": "Carbon dioxide",
    "options": [
      "Carbon dioxide",
      "Oxygen",
      "Glucose",
      "Bone marrow"
    ]
  },
  "osl2q1": {
    "correct": "Infrared radiation",
    "options": [
      "Infrared radiation",
      "Sound waves",
      "Ocean currents",
      "Visible objects"
    ]
  },
  "osl2q2": {
    "correct": "Heat loss to space is slowed",
    "options": [
      "Heat loss to space is slowed",
      "Sunlight stops reaching Earth",
      "Gravity becomes weaker",
      "The atmosphere disappears"
    ]
  },
  "osl2q3": {
    "correct": "Greenhouse gases slow the escape of outgoing heat",
    "options": [
      "Greenhouse gases slow the escape of outgoing heat",
      "Greenhouse gases create all solar energy",
      "Only clouds warm Earth",
      "Earth receives no infrared energy"
    ]
  },
  "osl3q1": {
    "correct": "Bacteria with resistance",
    "options": [
      "Bacteria with resistance",
      "Every susceptible bacterium",
      "Only viruses",
      "Human blood cells"
    ]
  },
  "osl3q2": {
    "correct": "Reproduce and spread resistance traits",
    "options": [
      "Reproduce and spread resistance traits",
      "Turn into human cells",
      "Remove all other genes",
      "Stop evolution"
    ]
  },
  "osl3q3": {
    "correct": "The bacteria",
    "options": [
      "The bacteria",
      "The person's entire body",
      "The antibiotic bottle",
      "All viruses"
    ]
  },
  "n4l2q1": {
    "correct": "Producers",
    "options": [
      "Producers",
      "Decomposers only",
      "Higher-level consumers",
      "Parasites only"
    ]
  },
  "n4l2q2": {
    "correct": "Producers",
    "options": [
      "Producers",
      "Only decomposers",
      "Sunlight",
      "Minerals alone"
    ]
  },
  "n4l2q3": {
    "correct": "Nutrients",
    "options": [
      "Nutrients",
      "All lost heat",
      "New sunlight",
      "Gravity"
    ]
  },
  "n4l2q4": {
    "correct": "It is lost as heat",
    "options": [
      "It is lost as heat",
      "It becomes new sunlight",
      "It is fully recycled",
      "It turns into minerals"
    ]
  },
  "n4l3q1": {
    "correct": "Moves air into and out of the lungs",
    "options": [
      "Moves air into and out of the lungs",
      "Makes blood cells",
      "Digests food",
      "Filters urine"
    ]
  },
  "n4l3q2": {
    "correct": "At the alveoli",
    "options": [
      "At the alveoli",
      "In the stomach",
      "At a joint",
      "In the bladder"
    ]
  },
  "n4l3q3": {
    "correct": "Cellular respiration",
    "options": [
      "Cellular respiration",
      "Condensation",
      "Filtration",
      "Reflection"
    ]
  },
  "n4l3q4": {
    "correct": "Circulation",
    "options": [
      "Circulation",
      "Digestion",
      "The skeleton alone",
      "Skin pigment"
    ]
  },
  "lsl3p1": {
    "correct": "An allele",
    "options": [
      "An allele",
      "A tissue",
      "An organ",
      "A lipid"
    ]
  },
  "lsl3p2": {
    "correct": "DNA",
    "options": [
      "DNA",
      "Water",
      "Glucose only",
      "Calcium"
    ]
  },
  "lsl3p3": {
    "correct": "A chromosome",
    "options": [
      "A chromosome",
      "A rib",
      "A hormone",
      "A membrane pore"
    ]
  },
  "lsl3p4": {
    "correct": "A gene",
    "options": [
      "A gene",
      "A tissue",
      "An organ",
      "A mineral"
    ]
  },
  "lsl3t1": {
    "correct": "Alleles",
    "options": [
      "Alleles",
      "Organs",
      "Tissues",
      "Enzymes"
    ]
  },
  "lsl3t2": {
    "correct": "A segment of DNA",
    "options": [
      "A segment of DNA",
      "A whole organism",
      "A mineral",
      "A blood vessel"
    ]
  },
  "lsl3t3": {
    "correct": "DNA",
    "options": [
      "DNA",
      "Water",
      "Calcium",
      "Cellulose only"
    ]
  },
  "stl2q1": {
    "correct": "The seed absorbs water",
    "options": [
      "The seed absorbs water",
      "Leaves make fruit",
      "The root dries",
      "Flowers open"
    ]
  },
  "stl2q2": {
    "correct": "The first root",
    "options": [
      "The first root",
      "A flower",
      "A fruit",
      "A branch"
    ]
  },
  "stl2q3": {
    "correct": "Photosynthesis",
    "options": [
      "Photosynthesis",
      "Digestion",
      "Erosion",
      "Freezing"
    ]
  },
  "stl2q4": {
    "correct": "Metabolism",
    "options": [
      "Metabolism",
      "Rock weathering",
      "Moonlight",
      "Ocean tides"
    ]
  },
  "stl3q1": {
    "correct": "Coagulation",
    "options": [
      "Coagulation",
      "Distribution",
      "Evaporation",
      "Combustion"
    ]
  },
  "stl3q2": {
    "correct": "Filtration",
    "options": [
      "Filtration",
      "Collection from homes",
      "Freezing",
      "Weathering"
    ]
  },
  "stl3q3": {
    "correct": "To inactivate harmful microorganisms",
    "options": [
      "To inactivate harmful microorganisms",
      "To add large debris",
      "To create sediment",
      "To remove all oxygen"
    ]
  },
  "stl3q4": {
    "correct": "Storage and distribution",
    "options": [
      "Storage and distribution",
      "Coagulation begins again",
      "Raw water is collected",
      "Filters are removed"
    ]
  },
  "ccl2q1": {
    "correct": "Buyer willingness and ability to purchase",
    "options": [
      "Buyer willingness and ability to purchase",
      "Only factory size",
      "Government ownership",
      "Weather alone"
    ]
  },
  "ccl2q2": {
    "correct": "Reduce it",
    "options": [
      "Reduce it",
      "Always double it",
      "Leave it legally fixed",
      "Turn it into supply"
    ]
  },
  "ccl2q3": {
    "correct": "Quantity supplied equals quantity demanded",
    "options": [
      "Quantity supplied equals quantity demanded",
      "No buyer exists",
      "Every product is free",
      "Supply is always zero"
    ]
  },
  "ccl2q4": {
    "correct": "Increase it",
    "options": [
      "Increase it",
      "Reduce it to zero",
      "Turn it into demand",
      "Make sellers disappear"
    ]
  },
  "ccl3q1": {
    "correct": "Opposes a change",
    "options": [
      "Opposes a change",
      "Amplifies every change",
      "Stops all sensing",
      "Removes control centers"
    ]
  },
  "ccl3q2": {
    "correct": "Sweating",
    "options": [
      "Sweating",
      "Shivering",
      "Reduced skin blood flow",
      "Producing thicker bones"
    ]
  },
  "ccl3q3": {
    "correct": "Shivering",
    "options": [
      "Shivering",
      "Sweating",
      "Faster evaporation only",
      "Opening every skin vessel"
    ]
  },
  "ccl3q4": {
    "correct": "A set range",
    "options": [
      "A set range",
      "An unlimited extreme",
      "A random value",
      "Permanent change"
    ]
  },
  "hfl2q1": {
    "correct": "In the cytoplasm",
    "options": [
      "In the cytoplasm",
      "In bone",
      "Outside the organism",
      "Only in the nucleus"
    ]
  },
  "hfl2q2": {
    "correct": "It accepts electrons at the end of the transport chain",
    "options": [
      "It accepts electrons at the end of the transport chain",
      "It becomes glucose",
      "It stores DNA",
      "It blocks ATP formation"
    ]
  },
  "hfl2q4": {
    "correct": "Inside mitochondria",
    "options": [
      "Inside mitochondria",
      "Outside the cell",
      "In bone marrow",
      "Only in the nucleus"
    ]
  },
  "hfl3q1": {
    "correct": "Stations, balloons, radar, and satellites",
    "options": [
      "Stations, balloons, radar, and satellites",
      "Only calendars",
      "Tree rings alone",
      "Ocean fossils only"
    ]
  },
  "hfl3q2": {
    "correct": "Possible future atmospheric conditions",
    "options": [
      "Possible future atmospheric conditions",
      "Past rock ages only",
      "Plant growth",
      "Earth's core temperature"
    ]
  },
  "hfl3q3": {
    "correct": "Meteorologists",
    "options": [
      "Meteorologists",
      "Only astronauts",
      "Dentists",
      "Architects"
    ]
  },
  "hfl3q4": {
    "correct": "Measurements are checked and prepared",
    "options": [
      "Measurements are checked and prepared",
      "All observations are deleted",
      "Weather is stopped",
      "The atmosphere is replaced"
    ]
  },
  "pql2q1": {
    "correct": "To collect nectar and pollen",
    "options": [
      "To collect nectar and pollen",
      "To build roots",
      "To create rain",
      "To cool the soil"
    ]
  },
  "pql2q2": {
    "correct": "Pollen grains",
    "options": [
      "Pollen grains",
      "Seeds only",
      "Roots",
      "Cloud droplets"
    ]
  },
  "pql2q3": {
    "correct": "Fertilization and seed development",
    "options": [
      "Fertilization and seed development",
      "Rock formation",
      "Evaporation",
      "Leaf freezing"
    ]
  },
  "pql2q4": {
    "correct": "The bee gains food and the plant gains pollen transfer",
    "options": [
      "The bee gains food and the plant gains pollen transfer",
      "Both receive soil",
      "The plant makes honey",
      "The bee grows roots"
    ]
  },
  "pql3q1": {
    "correct": "It conducts heat poorly and limits convection",
    "options": [
      "It conducts heat poorly and limits convection",
      "It creates unlimited heat",
      "It removes all radiation",
      "It becomes a metal"
    ]
  },
  "pql3q2": {
    "correct": "Slows heat transfer",
    "options": [
      "Slows heat transfer",
      "Stops energy from existing",
      "Raises gravity",
      "Creates sunlight"
    ]
  },
  "pql3q3": {
    "correct": "They limit bulk convection",
    "options": [
      "They limit bulk convection",
      "They increase combustion",
      "They dissolve solids",
      "They produce electricity"
    ]
  },
  "pql3q4": {
    "correct": "No, it slows heat transfer",
    "options": [
      "No, it slows heat transfer",
      "Yes, without energy",
      "Only when painted",
      "It creates sunlight"
    ]
  },
  "del2q1": {
    "correct": "Nitrogen fixation",
    "options": [
      "Nitrogen fixation",
      "Evaporation",
      "Combustion only",
      "Erosion"
    ]
  },
  "del2q2": {
    "correct": "By eating plants or other animals",
    "options": [
      "By eating plants or other animals",
      "By absorbing sunlight",
      "From rocks only",
      "By condensation"
    ]
  },
  "del2q3": {
    "correct": "Denitrification",
    "options": [
      "Denitrification",
      "Plant uptake",
      "Feeding",
      "Filtration"
    ]
  },
  "del2q4": {
    "correct": "Decomposition",
    "options": [
      "Decomposition",
      "Photosynthesis",
      "Evaporation",
      "Freezing"
    ]
  },
  "del3q1": {
    "correct": "Chemical to electrical",
    "options": [
      "Chemical to electrical",
      "Light to nuclear",
      "Thermal to gravity",
      "Sound to chemical"
    ]
  },
  "del3q2": {
    "correct": "Light and thermal energy",
    "options": [
      "Light and thermal energy",
      "Only chemical energy",
      "Mass",
      "Gravity"
    ]
  },
  "del3q3": {
    "correct": "It breaks the conducting path",
    "options": [
      "It breaks the conducting path",
      "It adds a second battery",
      "It creates light",
      "It increases gravity"
    ]
  },
  "e8l2q1": {
    "correct": "Safe drinking water",
    "options": [
      "Safe drinking water",
      "Decorative labels",
      "Matching containers",
      "Alphabetized snacks"
    ]
  },
  "e8l2q2": {
    "correct": "Medicines and a flashlight",
    "options": [
      "Medicines and a flashlight",
      "Labels and colors",
      "Fonts and stickers",
      "Decorations and ribbons"
    ]
  },
  "e8l2q3": {
    "correct": "A few supplies that address essential needs",
    "options": [
      "A few supplies that address essential needs",
      "Every decorative detail",
      "Only entertainment",
      "Exactly twenty objects"
    ]
  },
  "e8l3q1": {
    "correct": "Insufficient light",
    "options": [
      "Insufficient light",
      "Mismatched gloves",
      "Old sign paint",
      "Bed names"
    ]
  },
  "e8l3q2": {
    "correct": "Water roots consistently",
    "options": [
      "Water roots consistently",
      "Rename beds",
      "Paint signs",
      "Sort gloves"
    ]
  },
  "e8l3q4": {
    "correct": "Control the pests causing the most damage",
    "options": [
      "Control the pests causing the most damage",
      "Rename every bed",
      "Match glove colors",
      "Repaint signs weekly"
    ]
  },
  "dsl2q1": {
    "correct": "The independent variable",
    "options": [
      "The independent variable",
      "Every condition",
      "The conclusion",
      "The recorded data"
    ]
  },
  "dsl2q2": {
    "correct": "To make the evidence more reliable",
    "options": [
      "To make the evidence more reliable",
      "To change the question",
      "To avoid measurement",
      "To guarantee a hypothesis"
    ]
  },
  "dsl2q3": {
    "correct": "Analysis and a conclusion",
    "options": [
      "Analysis and a conclusion",
      "Deleting the question",
      "Changing every control",
      "Skipping evidence"
    ]
  },
  "dsl2q4": {
    "correct": "A testable question and hypothesis",
    "options": [
      "A testable question and hypothesis",
      "The final conclusion",
      "Deleting controls",
      "Publishing without evidence"
    ]
  },
  "dsl3q2": {
    "correct": "Food mixes with acid and enzymes",
    "options": [
      "Food mixes with acid and enzymes",
      "Most oxygen enters blood",
      "Urine is stored",
      "Bones are formed"
    ]
  },
  "dsl3q3": {
    "correct": "Absorbing water",
    "options": [
      "Absorbing water",
      "Producing sunlight",
      "Pumping blood",
      "Filtering air"
    ]
  },
  "dsl3q4": {
    "correct": "It travels through the esophagus",
    "options": [
      "It travels through the esophagus",
      "It enters the large intestine",
      "It becomes urine",
      "It enters the lungs"
    ]
  },
  "dbl2q1": {
    "correct": "Surface area and drag",
    "options": [
      "Surface area and drag",
      "Mass",
      "Gravity",
      "Air temperature"
    ]
  },
  "dbl2q2": {
    "correct": "Air drag",
    "options": [
      "Air drag",
      "Weight",
      "Magnetism",
      "Buoyancy in water"
    ]
  },
  "dbl2q3": {
    "correct": "Drag balances weight at a slower speed",
    "options": [
      "Drag balances weight at a slower speed",
      "Gravity vanishes",
      "Mass becomes zero",
      "Air stops moving"
    ]
  },
  "dbl2q4": {
    "correct": "Velocity becomes constant",
    "options": [
      "Velocity becomes constant",
      "Acceleration increases forever",
      "Mass disappears",
      "The parachute closes"
    ]
  },
  "dbl3q1": {
    "correct": "At the crystal surface",
    "options": [
      "At the crystal surface",
      "Only at the container bottom",
      "Inside a vacuum",
      "In the air"
    ]
  },
  "dbl3q2": {
    "correct": "They move faster",
    "options": [
      "They move faster",
      "They stop",
      "They become salt",
      "They lose all energy"
    ]
  },
  "dbl3q3": {
    "correct": "It brings fresh water to the crystal surface",
    "options": [
      "It brings fresh water to the crystal surface",
      "It changes salt into sugar",
      "It freezes the water",
      "It removes all collisions"
    ]
  },
  "dbl3q4": {
    "correct": "Attractions from water molecules",
    "options": [
      "Attractions from water molecules",
      "Sound waves",
      "Air pressure alone",
      "Light reflection"
    ]
  },
  "krl2q1": {
    "correct": "Choose sources two days early and schedule each task",
    "options": [
      "Choose sources two days early and schedule each task",
      "Assignments are impossible",
      "Time is bad",
      "Everything is always late"
    ]
  },
  "krl2q2": {
    "correct": "Starting on the due date",
    "options": [
      "Starting on the due date",
      "Finishing a week early",
      "Using too many sources",
      "Submitting before instructions arrive"
    ]
  },
  "krl2q3": {
    "correct": "The last three assignments",
    "options": [
      "The last three assignments",
      "Always and everything",
      "All schoolwork forever",
      "No specific cases"
    ]
  },
  "krl3q1": {
    "correct": "Require task owners to post file links before each handoff",
    "options": [
      "Require task owners to post file links before each handoff",
      "Communication is terrible",
      "Teams never work",
      "People should try harder"
    ]
  },
  "krl3q2": {
    "correct": "Posting status updates and file links",
    "options": [
      "Posting status updates and file links",
      "Having any meetings",
      "Writing long reports",
      "Changing every task"
    ]
  },
  "krl3q3": {
    "correct": "The last two weekly handoffs",
    "options": [
      "The last two weekly handoffs",
      "All teamwork everywhere",
      "Never",
      "Every future project"
    ]
  },
  "ppl2q1": {
    "correct": "A number multiplying a variable",
    "options": [
      "A number multiplying a variable",
      "A variable-free number only",
      "An equals sign",
      "A unit of time"
    ]
  },
  "ppl2q2": {
    "correct": "Like terms",
    "options": [
      "Like terms",
      "Any unrelated terms",
      "Only constants with variables",
      "No terms"
    ]
  },
  "ppl2q3": {
    "correct": "After the review task",
    "options": [
      "After the review task",
      "Instead of the task",
      "Before choosing a task",
      "During every question"
    ]
  },
  "ppl3q1": {
    "correct": "Producing many copies of text",
    "options": [
      "Producing many copies of text",
      "Stopping written communication",
      "Making paper unnecessary",
      "Preventing ideas from moving"
    ]
  },
  "ppl3q2": {
    "correct": "Wider circulation of books and pamphlets",
    "options": [
      "Wider circulation of books and pamphlets",
      "Fewer copies",
      "Removing written text",
      "Closing trade routes"
    ]
  },
  "ppl3q3": {
    "correct": "As a consequence after the study task",
    "options": [
      "As a consequence after the study task",
      "As a replacement for learning",
      "Before any task is defined",
      "During every sentence"
    ]
  },
  "wsl2q1": {
    "correct": "Xylem",
    "options": [
      "Xylem",
      "Phloem only",
      "Bark only",
      "Pollen"
    ]
  },
  "wsl2q2": {
    "correct": "Evaporation from leaves",
    "options": [
      "Evaporation from leaves",
      "Root freezing",
      "Flower color",
      "Seed dispersal"
    ]
  },
  "wsl2q3": {
    "correct": "Cohesion",
    "options": [
      "Cohesion",
      "Combustion",
      "Erosion",
      "Radiation"
    ]
  },
  "wsl3q1": {
    "correct": "Wind",
    "options": [
      "Wind",
      "Earth's core directly",
      "Fish movement",
      "Moonlight"
    ]
  },
  "wsl3q2": {
    "correct": "Earth's rotation",
    "options": [
      "Earth's rotation",
      "Ocean color",
      "Cloud height",
      "Mountain roots"
    ]
  },
  "wsl3q3": {
    "correct": "Heat",
    "options": [
      "Heat",
      "Continents",
      "Gravity",
      "The Moon"
    ]
  },
  "sel2q1": {
    "correct": "Temporarily holds and manipulates information",
    "options": [
      "Temporarily holds and manipulates information",
      "Stores every memory permanently",
      "Controls digestion",
      "Produces light"
    ]
  },
  "sel2q2": {
    "correct": "They compete for limited attention",
    "options": [
      "They compete for limited attention",
      "They increase memory capacity",
      "They remove all goals",
      "They stop hearing"
    ]
  },
  "sel2q3": {
    "correct": "Reducing competing input",
    "options": [
      "Reducing competing input",
      "Adding unrelated tasks",
      "Switching constantly",
      "Increasing notifications"
    ]
  },
  "sel3q1": {
    "correct": "A faster automatic response",
    "options": [
      "A faster automatic response",
      "No learning",
      "A new organ",
      "Less experience"
    ]
  },
  "sel3q2": {
    "correct": "When a rule conflicts with an automatic response",
    "options": [
      "When a rule conflicts with an automatic response",
      "When no response is possible",
      "Only during sleep",
      "When every cue agrees"
    ]
  },
  "sel3q3": {
    "correct": "The automatic response must be inhibited",
    "options": [
      "The automatic response must be inhibited",
      "The rule must be ignored",
      "Every stimulus must be removed",
      "The task must stop"
    ]
  },
  "vxl2q1": {
    "correct": "It decreases",
    "options": [
      "It decreases",
      "It always doubles",
      "It becomes supply",
      "It cannot change"
    ]
  },
  "vxl2q2": {
    "correct": "The point where supply and demand meet",
    "options": [
      "The point where supply and demand meet",
      "The highest possible price",
      "A market with no buyers",
      "The cost of every input"
    ]
  },
  "vxl2q3": {
    "correct": "An incentive to supply more",
    "options": [
      "An incentive to supply more",
      "A requirement to stop production",
      "That demand no longer exists",
      "That all resources are free"
    ]
  },
  "arm2q1": {
    "correct": "An echo",
    "options": [
      "An echo",
      "Sunlight",
      "A magnetic field",
      "A scent trail"
    ]
  },
  "arm2q2": {
    "correct": "Distance",
    "options": [
      "Distance",
      "Object color",
      "Air composition only",
      "The bat's age"
    ]
  },
  "arm2q4": {
    "correct": "Movement and shape",
    "options": [
      "Movement and shape",
      "Object ownership",
      "The Moon's phase",
      "Plant age"
    ]
  },
  "arm3q1": {
    "correct": "Ground frozen for at least two consecutive years",
    "options": [
      "Ground frozen for at least two consecutive years",
      "Daily frost on leaves",
      "Only sea ice",
      "A summer rain layer"
    ]
  },
  "arm3q2": {
    "correct": "Cold and wind limit tall growth",
    "options": [
      "Cold and wind limit tall growth",
      "There is no sunlight",
      "All soil is liquid",
      "Animals remove every tree"
    ]
  },
  "arm3q3": {
    "correct": "The active layer",
    "options": [
      "The active layer",
      "Earth's core",
      "All bedrock",
      "The entire Arctic Ocean"
    ]
  },
  "arm3q4": {
    "correct": "They migrate or develop insulation",
    "options": [
      "They migrate or develop insulation",
      "They stop needing energy",
      "They become plants",
      "They remove permafrost"
    ]
  },
  "fym2q1": {
    "correct": "Half",
    "options": [
      "Half",
      "None",
      "One quarter always",
      "All sides equally"
    ]
  },
  "fym2q2": {
    "correct": "The Moon's orbital position changes",
    "options": [
      "The Moon's orbital position changes",
      "The Moon changes shape",
      "Earth turns off sunlight",
      "Clouds orbit the Moon"
    ]
  },
  "fym2q3": {
    "correct": "A lunar eclipse",
    "options": [
      "A lunar eclipse",
      "Every crescent phase",
      "A new orbit",
      "Sunrise"
    ]
  },
  "fym3q1": {
    "correct": "Its molecules form a more open structure",
    "options": [
      "Its molecules form a more open structure",
      "It loses all mass",
      "Gravity stops",
      "It becomes a gas"
    ]
  },
  "fym3q2": {
    "correct": "It increases",
    "options": [
      "It increases",
      "It becomes zero",
      "It always halves",
      "It becomes unrelated to density"
    ]
  },
  "fym3q3": {
    "correct": "Buoyant force",
    "options": [
      "Buoyant force",
      "Magnetism",
      "Sound",
      "Friction with air only"
    ]
  },
  "com2q1": {
    "correct": "Warm ocean water",
    "options": [
      "Warm ocean water",
      "Mountain snow",
      "Dry desert air",
      "Sea-floor rock"
    ]
  },
  "com2q2": {
    "correct": "Energy is released",
    "options": [
      "Energy is released",
      "Gravity ends",
      "The ocean freezes",
      "Pressure always rises immediately"
    ]
  },
  "com2q4": {
    "correct": "Inflow toward low pressure plus Earth's rotation",
    "options": [
      "Inflow toward low pressure plus Earth's rotation",
      "Dry air alone",
      "Ocean-floor friction only",
      "Mountain snow"
    ]
  },
  "com3q1": {
    "correct": "Innate immunity",
    "options": [
      "Innate immunity",
      "Memory only",
      "Bone growth",
      "Digestion"
    ]
  },
  "com3q3": {
    "correct": "Memory cells",
    "options": [
      "Memory cells",
      "Stomach acid alone",
      "Hair cells",
      "Bone minerals"
    ]
  },
  "com3q4": {
    "correct": "Destroy infected cells or coordinate responses",
    "options": [
      "Destroy infected cells or coordinate responses",
      "Carry most oxygen",
      "Form blood clots",
      "Digest all pathogens in the stomach"
    ]
  },
  "abm2q1": {
    "correct": "The ice's own weight",
    "options": [
      "The ice's own weight",
      "Only ocean tides",
      "Plant roots",
      "Earth's magnetic field"
    ]
  },
  "abm2q2": {
    "correct": "A U shape",
    "options": [
      "A U shape",
      "A perfect circle",
      "A flat disk",
      "A spiral"
    ]
  },
  "abm2q3": {
    "correct": "Till",
    "options": [
      "Till",
      "Magma",
      "Pollen",
      "Plasma"
    ]
  },
  "abm2q4": {
    "correct": "They abrade it",
    "options": [
      "They abrade it",
      "They make sunlight",
      "They stop ice motion",
      "They form clouds"
    ]
  },
  "abm3q1": {
    "correct": "Along the axon",
    "options": [
      "Along the axon",
      "Through bone",
      "Only through blood",
      "Across a tendon"
    ]
  },
  "abm3q2": {
    "correct": "Speed signal conduction",
    "options": [
      "Speed signal conduction",
      "Digest food",
      "Make red blood cells",
      "Stop every signal"
    ]
  },
  "abm3q3": {
    "correct": "Neurotransmitters",
    "options": [
      "Neurotransmitters",
      "Whole neurons",
      "Bones",
      "Air bubbles"
    ]
  },
  "abm3q4": {
    "correct": "Receptors",
    "options": [
      "Receptors",
      "Red blood cells",
      "Bone marrow",
      "Tendons"
    ]
  },
  "osm2q1": {
    "correct": "Inherited variation",
    "options": [
      "Inherited variation",
      "Identical traits only",
      "No reproduction",
      "A planned goal"
    ]
  },
  "osm2q2": {
    "correct": "Its carriers leave more offspring",
    "options": [
      "Its carriers leave more offspring",
      "Individuals choose new genes",
      "The environment writes genes",
      "Every organism changes at once"
    ]
  },
  "osm2q3": {
    "correct": "The population",
    "options": [
      "The population",
      "A single individual because it needs to",
      "Only the weather",
      "The definition of inheritance"
    ]
  },
  "osm3q1": {
    "correct": "A fulcrum",
    "options": [
      "A fulcrum",
      "A battery",
      "A magnet only",
      "A spring only"
    ]
  },
  "osm3q2": {
    "correct": "Apply it farther from the fulcrum",
    "options": [
      "Apply it farther from the fulcrum",
      "Move it closer than the load",
      "Remove the fulcrum",
      "Stop rotation"
    ]
  },
  "osm3q3": {
    "correct": "The effort moves farther",
    "options": [
      "The effort moves farther",
      "Energy is created",
      "The load loses mass",
      "Gravity disappears"
    ]
  },
  "n4m2q1": {
    "correct": "Protection",
    "options": [
      "Protection",
      "Digestion",
      "Gas exchange",
      "Filtration"
    ]
  },
  "n4m2q2": {
    "correct": "Blood cells",
    "options": [
      "Blood cells",
      "Air",
      "Bile",
      "Urine"
    ]
  },
  "n4m2q3": {
    "correct": "Minerals",
    "options": [
      "Minerals",
      "Sunlight",
      "Sound",
      "Carbon dioxide only"
    ]
  },
  "n4m2q4": {
    "correct": "It works with muscles and joints",
    "options": [
      "It works with muscles and joints",
      "It produces all energy",
      "It replaces nerves",
      "It circulates blood alone"
    ]
  },
  "n4m3q1": {
    "correct": "Solar heating",
    "options": [
      "Solar heating",
      "Moonlight only",
      "Earth's core only",
      "Sound"
    ]
  },
  "n4m3q2": {
    "correct": "Wind",
    "options": [
      "Wind",
      "Rocks",
      "DNA",
      "Tides only"
    ]
  },
  "n4m3q3": {
    "correct": "Water changing state and moving in air",
    "options": [
      "Water changing state and moving in air",
      "Mountain roots",
      "Magnetism",
      "Soil alone"
    ]
  },
  "n4m3q4": {
    "correct": "Earth's rotation and landforms",
    "options": [
      "Earth's rotation and landforms",
      "Only plant color",
      "The skeleton",
      "Ocean salt alone"
    ]
  },
  "lsm2p2": {
    "correct": "Platelets",
    "options": [
      "Platelets",
      "Red blood cells",
      "Plasma only",
      "Neurons"
    ]
  },
  "lsm2p3": {
    "correct": "Plasma",
    "options": [
      "Plasma",
      "Lymph nodes",
      "Bone",
      "Cartilage"
    ]
  },
  "lsm2p4": {
    "correct": "White blood cells",
    "options": [
      "White blood cells",
      "Red blood cells",
      "Platelets only",
      "Bone minerals"
    ]
  },
  "lsm2t1": {
    "correct": "Clot formation",
    "options": [
      "Clot formation",
      "Oxygen binding",
      "Nerve impulses",
      "Digestion"
    ]
  },
  "lsm2t2": {
    "correct": "White blood cells",
    "options": [
      "White blood cells",
      "Red blood cells only",
      "Platelets",
      "Minerals"
    ]
  },
  "lsm2t3": {
    "correct": "Plasma",
    "options": [
      "Plasma",
      "Cartilage",
      "Bone",
      "Skin"
    ]
  },
  "lsm3p3": {
    "correct": "Cumulonimbus",
    "options": [
      "Cumulonimbus",
      "Cirrus",
      "Stratus",
      "Fog only"
    ]
  },
  "lsm3p4": {
    "correct": "Cumulus",
    "options": [
      "Cumulus",
      "Stratus",
      "Cirrus",
      "Cumulonimbus only"
    ]
  },
  "lsm3t1": {
    "correct": "Cumulonimbus",
    "options": [
      "Cumulonimbus",
      "Cirrus",
      "Stratus",
      "Cumulus only"
    ]
  },
  "lsm3t2": {
    "correct": "Cumulus",
    "options": [
      "Cumulus",
      "Stratus",
      "Cirrus only",
      "Cumulonimbus always"
    ]
  },
  "stm2q1": {
    "correct": "Gas and magma pressure",
    "options": [
      "Gas and magma pressure",
      "Ocean salinity only",
      "Plant roots",
      "Ice sheets only"
    ]
  },
  "stm2q2": {
    "correct": "Through cracks or a conduit",
    "options": [
      "Through cracks or a conduit",
      "Through sunlight",
      "Inside clouds",
      "Only through rivers"
    ]
  },
  "stm2q3": {
    "correct": "It cools and alters the landscape",
    "options": [
      "It cools and alters the landscape",
      "It becomes invisible",
      "It stops having mass",
      "It returns instantly to the core"
    ]
  },
  "stm2q4": {
    "correct": "Lava, ash, or gas",
    "options": [
      "Lava, ash, or gas",
      "Only groundwater",
      "Plant roots",
      "Glacial ice"
    ]
  },
  "stm3q1": {
    "correct": "A receptor",
    "options": [
      "A receptor",
      "A muscle",
      "A motor neuron",
      "A bone"
    ]
  },
  "stm3q2": {
    "correct": "A sensory neuron",
    "options": [
      "A sensory neuron",
      "A motor neuron",
      "A red blood cell",
      "A tendon"
    ]
  },
  "stm3q3": {
    "correct": "A muscle",
    "options": [
      "A muscle",
      "A receptor",
      "The skin alone",
      "A sensory neuron alone"
    ]
  },
  "stm3q4": {
    "correct": "A motor neuron",
    "options": [
      "A motor neuron",
      "A sensory neuron",
      "A receptor",
      "A blood cell"
    ]
  },
  "ccm2q1": {
    "correct": "Friction locks rocks while plates keep moving",
    "options": [
      "Friction locks rocks while plates keep moving",
      "Plates stop forever",
      "Seismic waves prevent motion",
      "The epicenter pulls rocks"
    ]
  },
  "ccm2q2": {
    "correct": "Rocks slip",
    "options": [
      "Rocks slip",
      "The fault disappears",
      "Gravity ends",
      "The atmosphere freezes"
    ]
  },
  "ccm2q3": {
    "correct": "The surface point above the focus",
    "options": [
      "The surface point above the focus",
      "The underground starting point",
      "Every plate boundary",
      "The largest wave"
    ]
  },
  "ccm2q4": {
    "correct": "As seismic waves",
    "options": [
      "As seismic waves",
      "As sunlight",
      "As ocean salt",
      "As plant roots"
    ]
  },
  "ccm3q1": {
    "correct": "A broad rise in prices over time",
    "options": [
      "A broad rise in prices over time",
      "A fall in every price",
      "A change in one product only",
      "An increase in physical money size"
    ]
  },
  "ccm3q2": {
    "correct": "Purchasing power falls",
    "options": [
      "Purchasing power falls",
      "Money buys more automatically",
      "Every price becomes equal",
      "Income becomes irrelevant"
    ]
  },
  "ccm3q3": {
    "correct": "No, individual changes can differ",
    "options": [
      "No, individual changes can differ",
      "Yes, always exactly",
      "Only free products change",
      "Prices never change"
    ]
  },
  "ccm3q4": {
    "correct": "The same money buys fewer goods and services",
    "options": [
      "The same money buys fewer goods and services",
      "Money becomes physically smaller",
      "Every wage falls to zero",
      "Prices stop changing"
    ]
  },
  "abm3xq2": {
    "correct": "Community",
    "options": [
      "Community",
      "Organism",
      "Biosphere only",
      "Cell"
    ]
  },
  "hfm2q1": {
    "correct": "Preclinical research",
    "options": [
      "Preclinical research",
      "Ongoing monitoring only",
      "Mass distribution",
      "Advertising"
    ]
  },
  "hfm2q2": {
    "correct": "Safety, immune responses, and effectiveness",
    "options": [
      "Safety, immune responses, and effectiveness",
      "Only package color",
      "Hospital architecture",
      "Weather"
    ]
  },
  "hfm2q3": {
    "correct": "It continues after use begins",
    "options": [
      "It continues after use begins",
      "Before clinical trials",
      "At the first laboratory idea",
      "It is never started"
    ]
  },
  "hfm2q4": {
    "correct": "Evidence and manufacturing quality",
    "options": [
      "Evidence and manufacturing quality",
      "Only package color",
      "Weather forecasts",
      "School schedules"
    ]
  },
  "hfm3q1": {
    "correct": "Water removes sediment",
    "options": [
      "Water removes sediment",
      "Sediment always settles",
      "The river freezes",
      "Water stops"
    ]
  },
  "hfm3q2": {
    "correct": "When flow loses enough energy",
    "options": [
      "When flow loses enough energy",
      "Only when flow speeds up",
      "Before any erosion",
      "When gravity ends"
    ]
  },
  "hfm3q3": {
    "correct": "Banks, bars, and bends",
    "options": [
      "Banks, bars, and bends",
      "Earth's orbit",
      "The Moon's phases",
      "Atomic mass"
    ]
  },
  "hfm3q4": {
    "correct": "Current carries material downstream",
    "options": [
      "Current carries material downstream",
      "All sediment settles",
      "The river stops",
      "Rock becomes sunlight"
    ]
  },
  "pqm2q1": {
    "correct": "Water and mineral nutrients",
    "options": [
      "Water and mineral nutrients",
      "Sunlight",
      "Animal tissue",
      "Atmospheric oxygen only"
    ]
  },
  "pqm2q2": {
    "correct": "Sugars",
    "options": [
      "Sugars",
      "Rocks",
      "Soil particles",
      "Moonlight"
    ]
  },
  "pqm2q3": {
    "correct": "They exchange different resources",
    "options": [
      "They exchange different resources",
      "They become one organism",
      "Neither gives anything",
      "The fungus makes sunlight"
    ]
  },
  "pqm2q4": {
    "correct": "Phosphorus",
    "options": [
      "Phosphorus",
      "Helium",
      "Gold",
      "Sodium chloride only"
    ]
  },
  "pqm3q1": {
    "correct": "They store and slow it",
    "options": [
      "They store and slow it",
      "They always remove all water",
      "They create storms",
      "They stop gravity"
    ]
  },
  "pqm3q2": {
    "correct": "Peak flow downstream",
    "options": [
      "Peak flow downstream",
      "Soil volume",
      "All evaporation",
      "Plant growth"
    ]
  },
  "pqm3q3": {
    "correct": "No",
    "options": [
      "No",
      "Yes, without exception",
      "Only at night",
      "Only without plants"
    ]
  },
  "pqm3q4": {
    "correct": "Wetland vegetation",
    "options": [
      "Wetland vegetation",
      "A lack of plants",
      "Sunlight alone",
      "Dry air"
    ]
  },
  "dem2q2": {
    "correct": "Feeding",
    "options": [
      "Feeding",
      "Freezing",
      "Reflection",
      "Sedimentation only"
    ]
  },
  "dem3q1": {
    "correct": "The drivetrain",
    "options": [
      "The drivetrain",
      "Air resistance",
      "Gravity alone",
      "The handlebar"
    ]
  },
  "dem3q2": {
    "correct": "Air and rolling resistance",
    "options": [
      "Air and rolling resistance",
      "Forward tire friction only",
      "Pedaling force",
      "No forces"
    ]
  },
  "dem3q3": {
    "correct": "Velocity stays constant",
    "options": [
      "Velocity stays constant",
      "Speed must increase",
      "Mass becomes zero",
      "Gravity stops"
    ]
  },
  "e8m2q1": {
    "correct": "Heating or cooling",
    "options": [
      "Heating or cooling",
      "Switch-plate polish",
      "Cable colors",
      "Decorations"
    ]
  },
  "e8m2q2": {
    "correct": "The largest energy loads",
    "options": [
      "The largest energy loads",
      "Every label font",
      "Decoration positions",
      "Cable color count"
    ]
  },
  "e8m2q4": {
    "correct": "Turn off equipment running unnecessarily",
    "options": [
      "Turn off equipment running unnecessarily",
      "Relabel every cable",
      "Move decorations",
      "Polish switches"
    ]
  },
  "e8m3q1": {
    "correct": "The main message",
    "options": [
      "The main message",
      "The number of fonts",
      "Word animations",
      "Icon colors"
    ]
  },
  "e8m3q2": {
    "correct": "Rehearsing transitions",
    "options": [
      "Rehearsing transitions",
      "Animating every word",
      "Changing every font",
      "Adding unrelated icons"
    ]
  },
  "e8m3q4": {
    "correct": "A few strong pieces of evidence",
    "options": [
      "A few strong pieces of evidence",
      "Unrelated animations",
      "Ten fonts",
      "Decorative icons only"
    ]
  },
  "dsm2q1": {
    "correct": "DNS",
    "options": [
      "DNS",
      "HTML",
      "CSS",
      "A battery"
    ]
  },
  "dsm2q2": {
    "correct": "An HTTP request",
    "options": [
      "An HTTP request",
      "A paper letter",
      "Only an image",
      "A power signal"
    ]
  },
  "dsm2q3": {
    "correct": "Rendering or processing resources",
    "options": [
      "Rendering or processing resources",
      "Deleting the connection before reading",
      "Changing DNS records",
      "Building hardware"
    ]
  },
  "dsm2q4": {
    "correct": "A connection is established",
    "options": [
      "A connection is established",
      "The page is fully rendered",
      "The server response is deleted",
      "Hardware is rebuilt"
    ]
  },
  "dsm3q1": {
    "correct": "Pulp",
    "options": [
      "Pulp",
      "Glass",
      "Metal",
      "Fuel"
    ]
  },
  "dsm3q2": {
    "correct": "Contaminants are removed",
    "options": [
      "Contaminants are removed",
      "The final paper is printed",
      "Trees are planted",
      "The sheet is burned"
    ]
  },
  "dsm3q3": {
    "correct": "Drying and finishing",
    "options": [
      "Drying and finishing",
      "Collecting unsorted waste",
      "Adding metal",
      "Freezing pulp"
    ]
  },
  "dsm3q4": {
    "correct": "A sheet is formed and pressed",
    "options": [
      "A sheet is formed and pressed",
      "Paper is collected",
      "The sheet is discarded",
      "Water is never removed"
    ]
  },
  "dbm2q1": {
    "correct": "From hotter to cooler regions",
    "options": [
      "From hotter to cooler regions",
      "Only from cooler to hotter",
      "Toward greater mass only",
      "It never moves"
    ]
  },
  "dbm2q2": {
    "correct": "The metal conducts energy along the spoon",
    "options": [
      "The metal conducts energy along the spoon",
      "The handle creates fire",
      "Gravity heats it",
      "Soup teleports"
    ]
  },
  "dbm2q3": {
    "correct": "High thermal conductivity",
    "options": [
      "High thermal conductivity",
      "Transparency",
      "Color",
      "Solubility"
    ]
  },
  "dbm2q4": {
    "correct": "Energy from the hot soup",
    "options": [
      "Energy from the hot soup",
      "The cool handle",
      "Sound",
      "Gravity alone"
    ]
  },
  "dbm3q1": {
    "correct": "Its energy is distributed across a larger area",
    "options": [
      "Its energy is distributed across a larger area",
      "Its energy becomes concentrated",
      "It stops being a wave",
      "It gains unlimited energy"
    ]
  },
  "dbm3q2": {
    "correct": "Absorption and scattering",
    "options": [
      "Absorption and scattering",
      "Only gravity",
      "Photosynthesis",
      "Freezing"
    ]
  },
  "dbm3q3": {
    "correct": "The wave energy has spread and partly dissipated",
    "options": [
      "The wave energy has spread and partly dissipated",
      "The source becomes larger",
      "Air creates silence instantly",
      "Distance removes frequency"
    ]
  },
  "dbm3q4": {
    "correct": "Energy",
    "options": [
      "Energy",
      "Matter permanently from source to listener",
      "Light only",
      "Gravity"
    ]
  },
  "krm2q1": {
    "correct": "Share an agenda and park new topics after 40 minutes",
    "options": [
      "Share an agenda and park new topics after 40 minutes",
      "Meetings are endless",
      "People talk too much",
      "Time is impossible"
    ]
  },
  "krm2q2": {
    "correct": "No agenda and late new topics",
    "options": [
      "No agenda and late new topics",
      "The room was too large",
      "All decisions were final",
      "Meetings ended early"
    ]
  },
  "krm2q3": {
    "correct": "The last four planning meetings",
    "options": [
      "The last four planning meetings",
      "All meetings forever",
      "Everything",
      "Never"
    ]
  },
  "krm3q1": {
    "correct": "Food-delivery spending used the final week's transport budget",
    "options": [
      "Food-delivery spending used the final week's transport budget",
      "Money is always bad",
      "Budgets never work",
      "Everything costs too much"
    ]
  },
  "krm3q2": {
    "correct": "Unplanned food-delivery purchases",
    "options": [
      "Unplanned food-delivery purchases",
      "Transport becoming free",
      "Income disappearing",
      "Every purchase increasing"
    ]
  },
  "krm3q3": {
    "correct": "The last two months",
    "options": [
      "The last two months",
      "All time",
      "Never",
      "The distant future"
    ]
  },
  "ppm2q2": {
    "correct": "Map distance and real distance",
    "options": [
      "Map distance and real distance",
      "Temperature and time",
      "Color and height",
      "Mass and speed"
    ]
  },
  "ppm2q3": {
    "correct": "After completing practice",
    "options": [
      "After completing practice",
      "Before the task exists",
      "Instead of practice",
      "During each calculation"
    ]
  },
  "ppm3q2": {
    "correct": "New substances form",
    "options": [
      "New substances form",
      "Only shape changes",
      "No atoms rearrange",
      "Temperature never changes"
    ]
  },
  "ppm3q3": {
    "correct": "Finishing the review first",
    "options": [
      "Finishing the review first",
      "Skipping the review",
      "Starting with the reward",
      "Avoiding a clear task"
    ]
  },
  "wsm2q1": {
    "correct": "Wind",
    "options": [
      "Wind",
      "Moonlight",
      "Plant roots only",
      "Groundwater only"
    ]
  },
  "wsm2q2": {
    "correct": "When wind slows or meets an obstacle",
    "options": [
      "When wind slows or meets an obstacle",
      "When wind always speeds up",
      "When gravity ends",
      "Only underwater"
    ]
  },
  "wsm2q3": {
    "correct": "Downwind",
    "options": [
      "Downwind",
      "Toward Earth's core",
      "Only north",
      "Opposite every wind"
    ]
  },
  "wsm3q1": {
    "correct": "Stomata",
    "options": [
      "Stomata",
      "Nephrons",
      "Alveoli",
      "Axons"
    ]
  },
  "wsm3q2": {
    "correct": "Carbon dioxide",
    "options": [
      "Carbon dioxide",
      "Helium",
      "Nitrogen only",
      "Hydrogen"
    ]
  },
  "wsm3q3": {
    "correct": "Guard cells",
    "options": [
      "Guard cells",
      "Red blood cells",
      "Root hairs only",
      "Petals"
    ]
  },
  "sem2q1": {
    "correct": "Goal-relevant information",
    "options": [
      "Goal-relevant information",
      "Every signal equally",
      "Only memories",
      "Unrelated movement"
    ]
  },
  "sem2q2": {
    "correct": "A meaningful cue such as one's name",
    "options": [
      "A meaningful cue such as one's name",
      "No cue ever",
      "Only silence",
      "Gravity"
    ]
  },
  "sem2q3": {
    "correct": "When competing signals resemble the target",
    "options": [
      "When competing signals resemble the target",
      "When no competitors exist",
      "During perfect silence",
      "When the task is absent"
    ]
  },
  "sem3q1": {
    "correct": "A dominant action that conflicts with the rule",
    "options": [
      "A dominant action that conflicts with the rule",
      "Every planned action",
      "All perception",
      "Memory formation"
    ]
  },
  "sem3q2": {
    "correct": "The current rule",
    "options": [
      "The current rule",
      "An unrelated habit",
      "No goal",
      "Only a color name"
    ]
  },
  "vxm3q1": {
    "correct": "Permanent settlements",
    "options": [
      "Permanent settlements",
      "A complete end to work",
      "Universal nomadism",
      "The disappearance of trade"
    ]
  },
  "vxm3q2": {
    "correct": "Supporting specialized roles",
    "options": [
      "Supporting specialized roles",
      "Preventing population growth",
      "Eliminating social organization",
      "Ending all storage"
    ]
  },
  "vxm3q3": {
    "correct": "It brought benefits alongside health and social costs",
    "options": [
      "It brought benefits alongside health and social costs",
      "It changed nothing about society",
      "It guaranteed equal outcomes",
      "It removed every source of disease"
    ]
  },
  "inl3p6": {
    "correct": "1/3",
    "options": [
      "1/3",
      "2/3",
      "1/2",
      "3"
    ]
  },
  "imm3p4": {
    "correct": "8:14",
    "options": [
      "8:14",
      "12:18",
      "6:9",
      "16:21"
    ]
  },
  "imm3t2": {
    "correct": "15:6",
    "options": [
      "15:6",
      "10:5",
      "20:10",
      "7:4"
    ]
  },
  "lsmp2": {
    "correct": "White blood cells",
    "options": [
      "White blood cells",
      "Plasma",
      "Platelets",
      "Red blood cells"
    ]
  },
  "com3": {
    "correct": "Lava",
    "options": [
      "Lava",
      "Sediment",
      "Steam",
      "Mantle"
    ]
  },
  "inl3p1": {
    "correct": "3/5",
    "options": [
      "3/5",
      "3/10",
      "1/5",
      "2/10"
    ]
  }
};

export function legacyQuestionOptions(question: MultipleChoiceQuestion): readonly string[] | null {
  const previous = priorOptions[question.id];
  return previous?.correct === question.correct ? previous.options : null;
}

export function isCompatibleQuestionAnswer(question: MultipleChoiceQuestion, answer: unknown): answer is string {
  return typeof answer === "string" && (question.options.includes(answer) || legacyQuestionOptions(question)?.includes(answer) === true);
}
