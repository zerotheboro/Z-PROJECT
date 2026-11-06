import type { EconomicsTopicId } from "./syllabus";
import type { QuestionSeed } from "./types";

// Capacity for the largest legal selection: 26 Lab tasks and 15 Match tasks.
export const parallelExtra: Partial<Record<EconomicsTopicId, { lab: readonly QuestionSeed[]; verification: readonly QuestionSeed[] }>> = {
  "1.3": { lab: [
    ["An architect uses a design tablet. Which pairing is correct?", "The architect supplies labour; the tablet is capital", "The architect supplies land; the tablet is labour", "Both inputs are natural resources", "Both inputs are human capital", [1,2]],
    ["Which activity directly builds a worker's human capital?", "Learning a productive skill", "Buying a warehouse", "Purchasing a delivery truck", "Discovering a mineral deposit", [2]],
    ["Why may a specialised worker become less adaptable?", "Practice is concentrated on a narrower set of tasks", "Specialisation requires mastery of every occupation", "Repetition removes all need for knowledge", "Every specialised task is identical across industries", [4]],
    ["A business owner must choose a product and accept uncertain sales. Which factor function is involved?", "Enterprise", "Supplying land alone", "Supplying paid routine hours alone", "Providing a produced machine alone", [5]]
  ], verification: [
    ["A vineyard uses a natural hillside and a purchased pressing machine. Which classification fits?", "The hillside is land; the machine is capital", "Both resources are produced capital", "Both resources are human capital", "The hillside is labour; the machine is enterprise", [1,2]],
    ["Which conventional factor-reward pairing is correct?", "Labour and wages", "Land and interest", "Enterprise and wages only", "Capital and land rent", [3]],
    ["What can interrupt the productivity benefits of task specialisation?", "A bottleneck at a task on which others depend", "Less time spent switching between tasks", "Greater dexterity in a repeated task", "Better coordination of connected tasks", [4]]
  ]},
  "1.4": { lab: [
    ["A mixed economy changes its balance of private and public provision. What is being changed?", "Its allocation arrangements", "Whether resources are scarce at all", "Whether households can have preferences", "Whether production uses inputs at all", [1,2]],
    ["Which arrangement gives a central authority the main allocation role?", "It sets output priorities and distributes key inputs", "Independent firms respond only to private sales", "Households independently choose all national production targets", "Only competitive price bidding assigns every resource", [1,2]],
    ["What limitation can affect decentralised forecasts of demand?", "Firms can misjudge future customer preferences", "Private ownership ensures perfect information", "Every market purchase is determined by a central quota", "Prices guarantee that no resources are ever misallocated", [2]],
    ["Which choice is the 'for whom' allocation question?", "Who receives the goods and services produced", "Which technique combines inputs", "Which final goods are produced", "Which machine produces the output fastest", [2]]
  ], verification: [
    ["Who makes decentralised allocation choices in a market model?", "Households and firms through exchange", "Only a single national planning office", "Only a government output committee", "Only a compulsory national resource board", [1]],
    ["Which combination demonstrates mixed allocation?", "Market purchases and government-funded services", "Only compulsory production quotas for every good", "Only private purchases with no public allocation", "Only identical rations unrelated to purchases", [1,2]],
    ["Why do relative prices matter for resource allocation?", "They can signal which uses attract greater demand relative to supply", "They guarantee identical outcomes for every household", "They remove the need to organise production", "They make opportunity cost disappear", [2]]
  ]},
  "1.5": { lab: [
    ["A country has idle workers and output inside its PPC. What could raise output without shifting the frontier?", "Putting existing workers into productive employment", "Losing usable machines", "Reducing the stock of skills", "Destroying productive farmland", [4]],
    ["Producing 2 more generators sacrifices 14 units of food on a frontier. What is the cost per generator?", "7 food units", "14 food units", "2 food units", "28 food units", [2]],
    ["Which change is a resource increase rather than reallocation along a PPC?", "An addition to the productive labour force", "Moving current workers between two sectors", "Switching machines between existing products", "Changing the efficient output combination with fixed inputs", [3]],
    ["Why is a point beyond a PPC not currently feasible?", "It requires more productive capacity than is presently available", "It always uses fewer resources than an interior point", "It represents an inefficient use of existing resources", "It necessarily has equal quantities of both goods", [1]]
  ], verification: [
    ["A move along a frontier increases one output. What must happen to the other output?", "Some of it is forgone", "It must also increase", "Its opportunity cost must become zero", "It must reach its maximum intercept", [1,2]],
    ["Food output falls by 24 units to produce 4 extra vehicles. What is the cost per vehicle?", "6 food units", "24 food units", "4 food units", "96 food units", [2]],
    ["Which observation alone establishes greater use of current capacity rather than a capacity shift?", "An interior point moves onto the same frontier", "Technology improves in every sector", "New productive resources are acquired", "The maximum feasible output of both goods rises", [3,4]]
  ]},
  "1.6": { lab: [
    ["A limited concert ticket can exclude non-payers and one person's seat cannot be used by another. What is it?", "A private good", "A pure public good", "A free good", "A non-rival good", [1]],
    ["Why might pure public-good provision face difficulty through voluntary charges?", "Non-payers may still receive the benefit", "Every beneficiary is necessarily excluded without payment", "An extra user must consume all remaining output", "The service has no resource costs", [2]],
    ["How does a merit-good information problem affect a fully informed comparison?", "Current consumption may be lower than with better information", "Current consumption must be greater than with better information", "The good must be free in the economic sense", "The good must be non-rival in every setting", [3]],
    ["Which description identifies a demerit-good information issue?", "Users underestimate harmful private consequences", "Non-payers cannot be excluded from every benefit", "Additional users never reduce availability", "Consumers fully understand all costs and benefits", [4]]
  ], verification: [
    ["What must be checked before calling a zero-price product economically free?", "Whether it is scarce relative to demand", "Whether a government paid for it", "Whether any seller made a profit", "Whether its consumption is non-rival", [1]],
    ["Why does non-rival consumption matter for a pure public good?", "An extra user does not reduce the amount available to others", "It guarantees that no producer uses resources", "It means non-payers can always be excluded", "It means every user receives a private appointment", [2]],
    ["A consumer lacks information about a product's private health risks. Which conclusion is justified?", "Consumption may exceed the level with better information", "The product must be non-rival", "The product must have no opportunity cost", "The consumer must already be fully informed", [4]]
  ]},
  "2.1": { lab: [
    ["A firm's technology worsens, raising the resources needed per unit. What is the usual supply effect?", "A leftward supply shift", "A rightward supply shift", "A rightward demand shift", "Only an own-price movement along supply", [4,6]],
    ["At a common price, two consumers want and can buy 11 and 16 units. What is combined effective demand?", "27 units", "13.5 units", "5 units", "32 units", [1,2]],
    ["Which event is an own-price movement rather than a demand shift?", "Buyers purchase less after the product's price rises, other things equal", "Buyers purchase less at every price after tastes change", "Buyers purchase more at every price after incomes rise", "More consumers enter the market at unchanged prices", [3,5,7]],
    ["A more expensive complement reduces a product's appeal. What is the likely demand effect?", "Demand shifts left", "Demand shifts right", "Supply shifts right by definition", "Only movement along unchanged supply occurs", [3,5]]
  ], verification: [
    ["Suppliers offer 9, 14 and 20 units at one price. What is total quantity supplied?", "43 units", "14.33 units", "34 units", "6 units", [2]],
    ["A change in fashion makes a product more popular. What is the demand effect at a given price?", "A larger quantity is demanded", "A smaller quantity is demanded", "Only input costs must change", "Only production technology must improve", [3,5]],
    ["Why is a shift of supply different from a movement along supply?", "A shift changes quantity offered at a given price", "A shift is caused only by the good's own price", "A movement always changes technology", "A movement replaces the whole schedule at every price", [6,7]]
  ]},
  "2.2": { lab: [
    ["Demand quantity falls 15% after own price rises 5%. What is PED?", "−3", "+3", "−0.33", "+0.33", [2,3]],
    ["Income rises 4% and demand rises 10%. What is YED?", "+2.5", "+0.4", "−2.5", "−0.4", [2,3]],
    ["Another good's price rises 6% and demand for this good falls 3%. What is XED?", "−0.5", "+0.5", "−2", "+2", [2,3]],
    ["Price rises from $6 to $8 while sales fall from 100 to 60. What is the expenditure change?", "From $600 to $480", "From $600 to $800", "From $600 to $360", "From $600 to $600", [7]]
  ], verification: [
    ["Income increases 5% and quantity demanded increases 15%. What is YED?", "+3", "+0.33", "−3", "−0.33", [2,3]],
    ["The price of a related good falls 8% and demand for this good falls 4%. What is XED?", "+0.5", "−0.5", "+2", "−2", [2,3]],
    ["Why should a business check adjustment time before using a PED estimate?", "Customers' opportunities to change purchases can vary over time", "PED always measures changes in income", "Every product has the same elasticity permanently", "Adjustment time determines only supply, never demand", [6,8]]
  ]},
  "2.3": { lab: [
    ["A 6% price rise produces a 3% quantity-supply rise. What is PES?", "0.5", "2", "−0.5", "−2", [2,3]],
    ["How can a longer adjustment period affect supply?", "Firms can change more inputs and capacity", "Firms must keep every input fixed forever", "The definition stops using percentage changes", "Every good becomes perfectly inelastic", [4,5]],
    ["Which stock can help a firm meet an immediate increase in sales?", "Saleable finished output in storage", "Work in progress requiring six more months", "Equipment already running at full capacity", "Materials awaiting unavailable specialised labour", [4]],
    ["Price increases 2% while quantity supplied increases 8%. What is PES?", "4", "0.25", "6", "−4", [2,3]]
  ], verification: [
    ["Price rises 12% and quantity supplied rises 9%. What is PES?", "0.75", "1.33", "−0.75", "−1.33", [2,3]],
    ["Which immediate constraint can explain a small supply response?", "All usable production capacity is already occupied", "Spare machines are ready to operate", "Trained workers can be hired immediately", "Saleable stocks are readily available", [4,5]],
    ["What is the correct interpretation of PES greater than one?", "Quantity supplied changes more proportionately than price", "Quantity supplied changes less proportionately than price", "Quantity supplied remains fixed", "Income changes more proportionately than demand", [1,3]]
  ]},
  "2.4": { lab: [
    ["At a price, quantity demanded is 55 and quantity supplied is 35. What exists?", "A shortage of 20 units", "A surplus of 20 units", "A shortage of 90 units", "Equilibrium at 55 units", [1]],
    ["What normally happens if supply rises and demand remains unchanged?", "The equilibrium price falls while quantity rises", "The equilibrium price rises while quantity falls", "Both equilibrium price and quantity fall", "Both equilibrium price and quantity rise", [2]],
    ["More demand for steelmaking increases demand for iron ore. Which link is involved?", "Derived demand", "Joint supply of steel and ore", "Alternative demand for ore and steel", "Demand independent of steel output", [3]],
    ["What can a rising market price encourage a producer to do?", "Consider expanding supply in response to the incentive", "Assume all extra production is immediately costless", "Ignore every change in consumer demand", "Treat profit as guaranteed regardless of costs", [4]]
  ], verification: [
    ["At $5, suppliers offer 90 units and buyers want 70. What exists?", "Excess supply of 20 units", "Excess demand of 20 units", "Excess supply of 160 units", "Equilibrium at 90 units", [1]],
    ["Supply falls while demand is unchanged and downward sloping. Which equilibrium change follows?", "Price rises and quantity falls", "Price falls and quantity rises", "Both price and quantity rise", "Both price and quantity fall", [2]],
    ["Two different drinks can meet the same consumer need. Which relationship is this?", "Alternative demand", "Joint demand", "Joint supply", "Derived demand for an input", [3]]
  ]},
  "2.5": { lab: [
    ["A buyer would pay $34 but pays $23. What is consumer surplus?", "$11", "$23", "$34", "$57", [1]],
    ["A seller receives $18 and would accept $11. What is producer surplus?", "$7", "$11", "$18", "$29", [2]],
    ["Linear demand has price intercept $18; price is $10 and quantity is 25. What is consumer surplus?", "$100", "$200", "$250", "$450", [1,3]],
    ["Linear supply has price intercept $5; price is $13 and quantity is 30. What is producer surplus?", "$120", "$240", "$390", "$150", [2,3]]
  ], verification: [
    ["A buyer values a unit at $31 and pays $20. What surplus is obtained?", "$11", "$20", "$31", "$51", [1]],
    ["A seller accepts $24 for a unit it would supply for $15. What is its surplus?", "$9", "$15", "$24", "$39", [2]],
    ["A linear demand intercept is $26; transaction price is $16 and quantity is 22. What is consumer surplus?", "$110", "$220", "$352", "$572", [1,3]]
  ]}
};
