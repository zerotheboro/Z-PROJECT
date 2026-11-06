import type { EconomicsTopicId } from "./syllabus";
import type { QuestionSeed } from "./types";

export const parallelUnit2: Partial<Record<EconomicsTopicId, { lab: readonly QuestionSeed[]; verification: readonly QuestionSeed[] }>> = {
  "2.1": { lab: [
    ["Demand for a normal good responds to a fall in income in which way?", "The demand curve shifts left", "The demand curve shifts right", "Only movement along the original curve occurs", "The supply curve must shift right", [3,5]],
    ["A production tax raises the cost of supplying each unit. What is the direct curve effect?", "A leftward supply shift", "A rightward supply shift", "A rightward demand shift", "Only a movement along unchanged supply", [4,6]],
    ["More consumers enter a market. What is likely at each given price?", "A higher market quantity demanded", "A lower market quantity demanded", "A lower market quantity supplied by definition", "No possible change in market demand", [2,3,5]],
    ["Two suppliers offer 8 and 17 units at $3. What is total market supply at that price?", "25 units", "12.5 units", "9 units", "34 units", [2]],
    ["What does a demand schedule hold fixed when comparing own price and quantity?", "Other determinants of demand", "The quantity demanded itself", "The product's own price itself", "The total number of units supplied by every firm", [3,7]],
    ["A change in tastes increases demand while own price is initially unchanged. What describes it?", "A shift of demand", "A movement along demand only", "A shift of supply only", "A change in production technology by definition", [3,5]],
    ["Why can a cheaper substitute reduce demand for a product?", "Buyers can switch to the alternative at each product price", "The product's own price must rise by the same percentage", "Suppliers must become fewer by definition", "The product becomes non-scarce", [3,5]],
    ["Energy costs fall for a manufacturer's production process. What is likely?", "A larger quantity supplied at each price", "A smaller quantity supplied at each price", "Only a decrease in consumer income", "Only a reduction in effective demand", [4,6]],
    ["A buyer is willing to pay but lacks the money required. What does this show?", "Willingness alone does not establish effective demand", "Demand does not require purchasing power", "The buyer determines market supply", "Every unfulfilled wish is an effective purchase", [1]],
    ["A rise in the product's price leads firms to offer more with costs unchanged. Which change is this?", "Movement along the supply curve", "A shift of the entire supply curve", "A fall in every input cost", "A change in consumer tastes", [7]],
    ["Which change directly affects demand rather than production costs?", "A change in consumers' preferences", "A change in factory energy charges", "A change in manufacturers' unit tax", "A change in machinery productivity", [3,4]],
    ["A market has two buyers demanding 7 and 13 units at a price. What is market demand at that price?", "20 units", "10 units", "6 units", "26 units", [2]]
  ], verification: [
    ["A new group of buyers wants and can afford a product at each price. What changes?", "Market demand shifts right", "Market demand shifts left", "Only an own-price movement occurs", "Market supply necessarily shifts left", [1,2,5]],
    ["An improved production technique lets firms offer more at every given price. Which change is consistent?", "A rightward supply shift", "A leftward supply shift", "A leftward demand shift", "Only movement along unchanged supply", [4,6]],
    ["The price of a good falls with tastes and income unchanged. What describes buyers' response on a normal downward demand curve?", "An increase in quantity demanded along the curve", "An increase in the entire demand curve", "A decrease in the entire demand curve", "A necessary change in income", [7]],
    ["Three consumers demand 4, 9 and 12 units at the same price. What is their combined quantity?", "25 units", "12 units", "8.33 units", "21 units", [2]]
  ]},
  "2.2": { lab: [
    ["Own price rises 4% and demand quantity falls 6%. What is PED?", "−1.5", "+1.5", "−0.67", "+0.67", [1,2,3]],
    ["Income rises 8% and demand rises 4%. What is YED?", "+0.5", "+2", "−0.5", "−2", [2,3]],
    ["Another good's price falls 5% and demand for this good rises 10%. What is XED?", "−2", "+2", "−0.5", "+0.5", [2,3]],
    ["Which PED magnitude indicates the larger percentage response?", "2.4", "0.8", "0.3", "0", [3,4]],
    ["What does zero PED mean in the model?", "Quantity demanded is unchanged by own-price changes", "Price stays fixed for every quantity demanded", "Quantity changes exactly proportionately with price", "Demand rises whenever income falls", [4]],
    ["What is the usual sign of XED for close substitutes?", "Positive", "Negative", "Necessarily zero", "Necessarily minus one", [3,6]],
    ["A product with no close substitutes is likely to have what, other things equal?", "Less price-responsive demand", "More price-responsive demand", "An automatically negative YED", "A guaranteed positive XED with every good", [6]],
    ["A good has YED above one and positive. What does this indicate?", "Demand rises more proportionately than income", "Demand falls when income rises", "Demand rises less proportionately than income", "Demand is perfectly price inelastic", [3,4,6]],
    ["Price is $8 with 75 sales, then $10 with 50 sales. What happens to expenditure?", "It falls from $600 to $500", "It rises from $600 to $750", "It remains at $600", "It rises from $500 to $600", [7]],
    ["Why can close substitutes matter for a firm's pricing decision?", "Customers can more readily switch after its price rises", "They ensure price changes never affect quantity", "They make YED identical to PED", "They guarantee the firm's profit after any price change", [6,8]],
    ["At which part of an ordinary straight demand line is demand more elastic?", "The higher-price, lower-quantity part", "The lower-price, higher-quantity part", "Every point has identical elasticity", "Only the point at zero price", [5]],
    ["Which variable distinguishes XED from own-price PED?", "The denominator uses another good's price change", "The numerator uses the firm's fixed costs", "The denominator uses household income", "The numerator uses quantity supplied", [1,2]]
  ], verification: [
    ["Price rises 3% and quantity demanded falls 9%. What is PED?", "−3", "−0.33", "+3", "+0.33", [2,3]],
    ["Income increases 6% and demand falls 3%. Which classification follows?", "Inferior good; YED −0.5", "Normal good; YED +0.5", "Luxury good; YED +2", "Substitute good; XED +2", [2,3]],
    ["A substitute's price increases 7% and demand increases 14%. What is XED?", "+2", "−2", "+0.5", "−0.5", [2,3]],
    ["Price falls from $20 to $18 while sales rise from 30 to 40. What is the expenditure change?", "From $600 to $720", "From $600 to $540", "From $600 to $800", "From $600 to $600", [7]]
  ]},
  "2.3": { lab: [
    ["Price increases 10% and quantity supplied increases 25%. What is PES?", "2.5", "0.4", "15", "−2.5", [2,3]],
    ["Quantity supplied rises 3% following a 12% price rise. Which statement fits?", "PES is 0.25 and supply is inelastic", "PES is 4 and supply is elastic", "PES is −0.25 and supply is inelastic", "PES is 1 and supply is unit elastic", [2,3]],
    ["Which constraint can reduce a firm's short-run PES?", "A lack of spare capacity", "Readily available finished-goods stocks", "Easily recruited trained workers", "A short production lead time", [4]],
    ["Why can mobile productive resources support more elastic supply?", "They can be moved toward increased production more easily", "They prevent production from responding to price", "They make consumers' income irrelevant to demand", "They guarantee all production is immediately costless", [4,5]],
    ["Which statement about unit-elastic supply is correct?", "Percentage quantity change equals percentage price change", "Unit quantity change always equals unit price change", "Quantity supplied never changes", "Price can never change", [2,3]],
    ["A crop cannot be harvested sooner when its market price rises. What limits the response?", "The production period", "The number of close consumer substitutes only", "The sign of income elasticity alone", "The absence of any price incentive", [4,5]],
    ["A supplier can promptly release warehouse stocks. What is most likely, other things equal?", "A larger immediate quantity response", "No possible immediate response", "A necessarily negative PES", "A perfectly vertical supply curve", [4,5]],
    ["Price rises from $5 to $6 and quantity rises from 100 to 140. Using initial bases, what is PES?", "2", "0.5", "4", "0.2", [2]],
    ["Which statement avoids confusing PES with demand elasticity?", "PES relates quantity supplied to the good's own price", "PES relates quantity demanded to income", "PES relates quantity demanded to a substitute's price", "PES measures only consumers' willingness to pay", [1]],
    ["Why does needing specialist training constrain expansion?", "Suitable labour cannot always be increased quickly", "Specialist skills make every supply curve horizontal", "Training fixes all output permanently at zero", "The constraint removes the meaning of a price change", [4,5]],
    ["A 5% price fall accompanies a 5% supply-quantity fall. What is PES?", "1", "−1", "0", "5", [2,3]],
    ["Which business is better placed to respond quickly to a price rise, other things equal?", "One with spare usable equipment and available inputs", "One with no equipment space and scarce inputs", "One needing years to build specialised capacity", "One unable to store or increase output this season", [4,5]]
  ], verification: [
    ["Quantity supplied increases 18% after price increases 9%. What is PES?", "2", "0.5", "9", "−2", [2,3]],
    ["A seller cannot increase tonight's fixed number of seats. Which description fits the immediate supply?", "Unresponsive quantity despite a higher price", "Infinite quantity response at the current price", "An equal percentage response of quantity and price", "A response determined only by household income", [3,4]],
    ["What can make a firm's supply more responsive over several years?", "Time to train workers and add equipment", "A permanent inability to change any input", "A requirement that all production remain fixed", "A complete loss of access to resources", [4,5]],
    ["Price falls 8% and quantity supplied falls 4%. What is PES?", "0.5", "−0.5", "2", "−2", [2,3]]
  ]},
  "2.4": { lab: [
    ["At a price, demand is 120 and supply is 100. Which adjustment pressure is likely?", "Upward price pressure from a shortage", "Downward price pressure from a surplus", "No imbalance because both quantities are positive", "A necessary rightward demand shift", [1]],
    ["At a price, supply is 80 and demand is 50. How large is excess supply?", "30 units", "130 units", "50 units", "80 units", [1]],
    ["Supply falls with demand unchanged. What happens under ordinary slopes?", "Equilibrium price rises and quantity falls", "Equilibrium price falls and quantity rises", "Both equilibrium price and quantity rise", "Both equilibrium price and quantity fall", [2]],
    ["Which is a complement relationship?", "Demand for game consoles and compatible game software", "Demand for two alternative brands of the same drink", "Supply of beef and hides from one animal", "Demand for steel because car output rises", [3]],
    ["Higher demand for bread increases demand for flour. Which mechanism is involved?", "Derived demand", "Alternative demand between bread and flour", "Joint supply of bread and flour", "Demand unrelated to production", [3]],
    ["Why can price increases lead consumers to reconsider purchases?", "Prices ration available output through willingness and ability to pay", "Every consumer must receive the same physical amount", "The increase removes all scarcity", "Only government targets can affect purchases", [4]],
    ["Two products can be used instead of one another. What relationship fits?", "Alternative demand", "Joint demand", "Joint supply", "Derived demand between an input and final output", [3]],
    ["A factory produces two outputs from the same process. Which relationship may exist?", "Joint supply", "Joint demand", "Alternative demand only", "Perfectly inelastic demand by definition", [3]],
    ["Demand and supply both decrease. Which outcome is certain with ordinary slopes?", "Equilibrium quantity falls", "Equilibrium price falls", "Equilibrium price rises", "Equilibrium price stays fixed", [2]],
    ["A rising price conveys that consumers value an output more relative to its availability. Which function is this?", "Signalling", "Guaranteeing equal purchasing power", "Eliminating production costs", "Fixing every future output decision", [4]],
    ["Why can excess supply create downward price pressure?", "Sellers may cut prices to attract buyers", "There are more buyers than available units", "A surplus always means demand exceeds supply", "Every firm must immediately stop production forever", [1]],
    ["With a demand rise and supply rise, what determines the direction of the price change?", "Their relative effects on the market", "Price must rise whenever demand increases", "Price must fall whenever supply increases", "The model guarantees both shifts are equally large", [2]]
  ], verification: [
    ["At $7, demand is 65 and supply is 40. What imbalance exists?", "Excess demand of 25 units", "Excess supply of 25 units", "Excess demand of 105 units", "Equilibrium at 65 units", [1]],
    ["Demand rises while supply remains fixed and upward sloping. What new equilibrium is expected?", "Higher price and higher quantity", "Lower price and higher quantity", "Higher price and lower quantity", "Lower price and lower quantity", [2]],
    ["Orders for new houses fall and fewer construction workers are required. What relationship explains it?", "Derived demand for labour", "Joint supply of houses and workers", "Alternative demand for workers and houses", "Demand unrelated to final output", [3]],
    ["What incentive can a higher market price provide to a potential entrant?", "A greater potential return from supplying the good", "A guaranteed profit regardless of costs", "An obligation to keep every input idle", "An end to the need to organise production", [4]]
  ]},
  "2.5": { lab: [
    ["A buyer values a book at $22 and pays $15. What is consumer surplus?", "$7", "$15", "$22", "$37", [1]],
    ["A supplier receives $19 for an item it would supply for $13. What is producer surplus on the item?", "$6", "$13", "$19", "$32", [2]],
    ["A straight demand curve intercepts price at $16; price is $10 and quantity is 60. What is consumer surplus?", "$180", "$360", "$600", "$960", [1,3]],
    ["A straight supply curve intercepts price at $2; price is $8 and quantity is 50. What is producer surplus?", "$150", "$300", "$400", "$100", [2,3]],
    ["Along unchanged demand, a price increase directly changes which gap for units still bought?", "It narrows willingness to pay minus payment", "It widens willingness to pay minus payment", "It removes willingness to pay from the calculation", "It makes payment equal to fixed production cost", [1,3]],
    ["Which information is needed to calculate a seller's surplus on a unit?", "Price received and minimum acceptable price", "Only the buyer's total income", "Only the firm's fixed cost for all output", "Only the number of firms in the economy", [2]],
    ["Why can a demand shift change consumer surplus even if one observed price is unchanged?", "Willingness to pay and purchases may change", "Consumer surplus depends only on money paid per unit", "A demand shift can never affect valuations", "All surplus is always the full revenue rectangle", [1,3]],
    ["What determines the height of a consumer-surplus triangle with linear demand?", "The demand price-intercept minus transaction price", "The transaction price minus the supply intercept", "The total quantity minus the number of firms", "The transaction price plus the demand intercept", [1,3]],
    ["What determines the height of a producer-surplus triangle with linear supply?", "Transaction price minus the supply price-intercept", "The demand price-intercept minus transaction price", "The transaction price plus fixed costs", "The number of consumers minus quantity supplied", [2,3]],
    ["Which result follows when a buyer pays exactly their maximum willingness for a unit?", "Consumer surplus on that unit is zero", "Consumer surplus equals all expenditure", "Producer surplus must equal zero as well", "The unit has no resource cost", [1]],
    ["Why do more responsive quantities change the geometry of a surplus effect?", "Different numbers of units are affected by a price change", "Elasticity alone supplies every price intercept", "All linear triangles must have identical areas", "Quantity changes cannot alter any surplus area", [3,4]],
    ["A cost reduction shifts supply. Why should producer surplus be evaluated using the new curve?", "Minimum acceptable prices have changed", "Only buyers' incomes define producer surplus", "Producer surplus excludes supply conditions", "Every cost reduction leaves all supply prices fixed", [2,3]]
  ], verification: [
    ["A buyer is willing to pay $28 for a unit and pays $19. What is consumer surplus?", "$9", "$19", "$28", "$47", [1]],
    ["A unit sells for $21 and the seller would accept $16. What is producer surplus?", "$5", "$16", "$21", "$37", [2]],
    ["Linear demand has price intercept $24; the market price is $14 and quantity is 18. What is consumer surplus?", "$90", "$180", "$252", "$432", [1,3]],
    ["Linear supply starts at $3; the market price is $11 and quantity is 24. What is producer surplus?", "$96", "$192", "$264", "$72", [2,3]]
  ]}
};
