import { pack } from "./types";

export const unit2Packs = [
  pack("2.1", [
    "Effective demand requires both willingness and ability to buy at a stated price over a period. A wish without purchasing power is not effective demand.",
    "Individual curves describe one buyer or seller. Market demand and supply add individual quantities horizontally at each common price, not the prices themselves.",
    "Demand can change with income, tastes, population, expectations and the prices of substitutes or complements. An income rise raises demand for a normal good but can reduce demand for an inferior good.",
    "Supply can change with input costs, technology, productivity, taxes, subsidies, the number of firms and production conditions. Lower unit costs generally allow more output at each price.",
    "A non-price demand determinant shifts the demand curve. A rise in the price of a substitute may shift demand right; a rise in the price of a complement may shift it left, other things equal.",
    "A non-price supply determinant shifts the supply curve. A cost increase normally shifts supply left; an improvement in productive technology normally shifts it right, other things equal.",
    "Changing a good's own price causes movement along its existing demand or supply curve. A curve shift means a different quantity is wanted or offered at the same price; it is not the same event as a movement along a curve."
  ], ["Effective demand", "Market aggregation", "Demand shifts", "Supply shifts", "Own-price movements"],
  "A bicycle market has several shops and many buyers. A rise in buyers' incomes may raise demand for these normal goods, whereas cheaper components can increase supply. A change in bicycle price alone changes quantities demanded and supplied along the existing curves.",
  ["Identify the market and time period", "Separate price from non-price changes", "Choose demand or supply", "State the direction", "Hold other influences constant"],
  [
    ["What makes demand effective?", "Willingness and ability to pay", "A wish regardless of income", "A producer's planned output", "A government's production target", [1]],
    ["How is market demand obtained at a common price?", "Add individual quantities demanded", "Add all individual prices", "Average individual prices only", "Subtract supply from each buyer's demand", [2]],
    ["A change in a good's own price causes what on an unchanged demand curve?", "A movement along the curve", "A shift of the whole curve", "A change in consumer income", "A change in the number of buyers", [7]],
    ["Which is a non-price determinant of supply?", "Input costs", "The product's own price alone", "Buyers' incomes alone", "Buyers' tastes alone", [4]]
  ], [
    ["Household income rises and bicycles are normal goods. What is the demand effect, other things equal?", "Demand shifts right", "Demand shifts left", "Only movement down unchanged demand", "Only movement up unchanged supply", [3,5]],
    ["Component costs fall for bicycle producers. What is the supply effect, other things equal?", "Supply shifts right", "Supply shifts left", "Demand shifts right", "Movement along unchanged supply only", [4,6]],
    ["Bicycle price falls while all non-price demand determinants stay fixed. What happens?", "Quantity demanded rises along the curve", "The demand curve shifts right", "The demand curve shifts left", "Consumer income necessarily rises", [7]]
  ], [
    ["At $5, two buyers demand 12 and 18 units. What is their total demand at $5?", "30 units", "15 units", "6 units", "60 units", [2]],
    ["Which event shifts demand for normal restaurant meals left, other things equal?", "A fall in consumer incomes", "A fall in the meals' own price", "A fall in restaurants' wage costs", "An improvement in kitchen technology", [3,5]],
    ["Which event shifts supply of bread left?", "Higher flour costs", "Lower bakery energy costs", "More productive ovens", "An increase in the number of bakeries", [4,6]],
    ["In the figure, what does D0 to D1 represent?", "More demand at each given price", "More supply at each given price", "Only an own-price movement along D0", "Less demand at each given price", [5,7], {kind:"market",variant:"demand-shift",label:"Demand shifts right from D0 to D1; supply remains S"}],
    ["Tea and coffee are substitutes. Coffee becomes more expensive. What is the likely demand effect for tea?", "A rightward shift of tea demand", "A leftward shift of tea demand", "A movement along tea supply only", "No demand effect is possible", [3,5]],
    ["Printers and ink are complements. Printer prices rise. What is the likely effect on ink demand?", "Ink demand shifts left", "Ink demand shifts right", "Ink supply shifts right by definition", "Ink quantity demanded rises at every price", [3,5]],
    ["Which observation demonstrates a supply shift rather than an own-price movement?", "More units offered at the same price", "More units offered after the price rises", "Fewer units offered after the price falls", "A new point on the unchanged supply curve", [4,6,7]],
    ["Someone wants a car but cannot pay for one. What is missing for effective demand?", "Ability to buy", "A preference for the product", "A wish to own the product", "Awareness of the product", [1]],
    ["At the same market price, one seller offers 14 and another 22 units. What is total supply?", "36 units", "18 units", "8 units", "44 units", [2]],
    ["A per-unit subsidy lowers producers' net costs. What is the likely supply effect?", "Supply shifts right", "Supply shifts left", "Only movement down unchanged demand occurs", "Only consumer preferences change", [4,6]]
  ], [
    ["At $8, three firms supply 10, 15 and 25 units. What is market quantity supplied?", "50 units", "25 units", "16.67 units", "40 units", [2]],
    ["A successful advertising campaign changes tastes toward a good. What occurs, other things equal?", "Demand shifts right", "Only quantity demanded changes along old demand", "Supply shifts left by definition", "Demand shifts left", [3,5]],
    ["A new machine lowers production cost per unit. What happens to supply?", "More is supplied at each price", "Less is supplied at each price", "Only movement along unchanged demand occurs", "Consumer willingness to pay must fall", [4,6]],
    ["The figure shows S0 moving to S1. Which event could explain it?", "Lower unit production costs", "Higher unit production costs", "A rise in the good's own price alone", "A fall in buyers' incomes alone", [4,6,7], {kind:"market",variant:"supply-shift",label:"Supply shifts right from S0 to S1; demand remains D"}],
    ["Demand for an inferior good responds to higher income in what way, other things equal?", "It shifts left", "It must shift right", "It changes only through the good's own price", "It becomes identical to supply", [3]],
    ["What distinguishes a curve shift from a movement along demand?", "A shift changes quantity wanted at a given price", "A shift can only be caused by own-price changes", "A movement requires a change in preferences", "A movement changes every point on the curve", [5,7]],
    ["The number of suppliers in a market falls. What is the likely effect at each price?", "A lower market quantity supplied", "A higher market quantity supplied", "A higher market quantity demanded by definition", "An unchanged supply curve by definition", [2,4,6]],
    ["A product's price rises with all other supply determinants fixed. What is this?", "Movement up its existing supply curve", "A rightward shift of its supply curve", "A leftward shift of its supply curve", "A change in production technology", [7]]
  ], {youtubeId:"5g-jDN1dEK0",title:"Demand and Supply | GCSE Economics Live Revision",channel:"tutor2u",source:"https://www.youtube.com/watch?v=5g-jDN1dEK0"}),

  pack("2.2", [
    "PED measures the percentage response of quantity demanded to a percentage change in the good's own price. YED measures the response to income; XED measures the response to another good's price.",
    "Calculate each elasticity as percentage change in quantity demanded divided by the relevant percentage change in price or income. Use the stated percentage changes; if levels are given, this pilot uses initial values as the percentage base unless otherwise stated.",
    "PED is normally negative; its absolute size measures price responsiveness. Positive YED identifies a normal good and negative YED an inferior good. Positive XED indicates substitutes and negative XED complements; size shows responsiveness, other things equal.",
    "An absolute elasticity above one is elastic, below one inelastic and equal to one unit elastic. Zero is perfectly inelastic. Perfectly elastic demand is horizontal at a given price; perfect inelasticity is vertical.",
    "A straight downward demand line has constant slope but changing PED: the upper section is elastic, its midpoint unit elastic and the lower section inelastic. Slope and elasticity are different measurements.",
    "PED depends on substitute availability, necessity, budget share and adjustment time. YED depends on whether a product is a necessity, luxury or inferior alternative. XED depends on the closeness of substitutes or strength of complementarity.",
    "Total expenditure equals price times quantity. For a price rise along demand, expenditure falls when demand is price elastic, rises when inelastic and is locally unchanged at unit elasticity. Use actual price and quantity for finite changes.",
    "Businesses use PED when considering pricing, YED when forecasting income-related sales and XED when assessing related markets. Estimates depend on context and time; they do not guarantee future demand."
  ], ["PED", "YED", "XED", "Coefficient", "Expenditure"],
  "A cafe studies how its sales react to its own price, household incomes and a nearby cafe's price. Those are three different elasticities. It keeps percentage bases consistent and checks price times quantity before claiming that a price change will raise revenue.",
  ["Choose the relevant elasticity", "Calculate percentage changes consistently", "Divide quantity change by its cause", "Interpret sign and magnitude", "Apply the result with its limitations"],
  [
    ["Which denominator is used for YED?", "Percentage change in income", "Percentage change in own price", "Percentage change in another price", "Percentage change in quantity supplied", [1,2]],
    ["A negative XED usually identifies which relationship?", "Complementary goods", "Substitute goods", "Inferior goods", "Luxury goods", [3]],
    ["Demand with absolute PED below one is described as what?", "Price inelastic", "Price elastic", "Unit price elastic", "Perfectly price elastic", [4]],
    ["What sign does YED have for a normal good?", "Positive", "Negative", "Always zero", "Always minus one", [3]]
  ], [
    ["Price rises 10% and quantity demanded falls 20%. What is PED?", "−2", "−0.5", "+2", "+0.5", [2,3]],
    ["Income rises 5% and demand rises 10%. What is YED?", "+2", "+0.5", "−2", "−0.5", [2,3]],
    ["A straight downward-sloping demand line has what property?", "Constant slope but varying elasticity", "Constant elasticity at every point", "Zero elasticity at every point", "Infinite elasticity at every point", [5]]
  ], [
    ["A rival's price rises 8% and demand for a product rises 12%. What is XED?", "+1.5", "−1.5", "+0.67", "−0.67", [1,2,3]],
    ["Income rises 10% and demand for a product falls 4%. What does YED indicate?", "An inferior good with YED −0.4", "A normal good with YED +0.4", "A substitute with XED +2.5", "A complement with XED −2.5", [2,3]],
    ["Which condition normally makes demand more price elastic?", "More close substitutes are available", "The good becomes harder to substitute", "Consumers have less time to adjust", "The purchase takes a smaller budget share", [6]],
    ["Price rises from $10 to $12 and sales fall from 100 to 70. What happens to expenditure?", "It falls from $1000 to $840", "It rises from $1000 to $1200", "It stays at $1000", "It falls from $1000 to $700", [7]],
    ["Which describes perfectly price-inelastic demand?", "Quantity demanded stays fixed when price changes", "Price stays fixed for any quantity demanded", "Quantity changes by the same percentage as price", "Quantity changes more proportionately than price", [4]],
    ["Why can PED change along a straight demand line?", "The price-to-quantity ratio changes along the line", "The line's slope must change at every point", "Income must rise along the line", "The good becomes a substitute for itself", [5]],
    ["Which elasticity helps forecast sales after a household-income change?", "YED", "XED", "PES", "Own-price PED alone", [1,8]],
    ["A large negative XED is most consistent with what?", "Strong complementarity between the products", "Close substitutability between the products", "An inferior classification for both products", "No demand relationship between the products", [3,6,8]],
    ["A 10% income rise causes a 3% demand rise for a necessity. What is YED?", "+0.3", "+3.33", "−0.3", "−3.33", [2,3,6]],
    ["A nearby substitute becomes easier to obtain. What is a likely effect on own-price PED magnitude?", "It increases as switching becomes easier", "It must fall to zero", "It becomes a measure of income changes", "It must become exactly one", [6,8]]
  ], [
    ["Price falls 6% and quantity demanded rises 9%. What is PED?", "−1.5", "+1.5", "−0.67", "+0.67", [2,3]],
    ["Income rises 12% and demand rises 6%. What is the coefficient and classification?", "YED +0.5; normal good", "YED −0.5; inferior good", "YED +2; luxury good", "XED +0.5; substitute good", [1,2,3]],
    ["The price of ink rises 10% and demand for a printer falls 5%. What is XED?", "−0.5", "+0.5", "−2", "+2", [2,3]],
    ["Which demand curve is perfectly elastic?", "A horizontal line at a given price", "A vertical line at a given quantity", "Every straight downward-sloping line", "Every curved downward-sloping line", [4]],
    ["Where is demand unit elastic on a standard straight downward demand line?", "At its midpoint", "At every point", "At the price-axis intercept", "At the quantity-axis intercept", [5]],
    ["Why can demand become more elastic over time?", "Buyers have more opportunities to find alternatives", "Every product must become an inferior good", "Household incomes must remain constant", "The definition of PED stops using percentages", [6]],
    ["Price falls from $15 to $12 and sales rise from 40 to 60. What happens to expenditure?", "It rises from $600 to $720", "It falls from $600 to $480", "It remains at $600", "It rises from $600 to $900", [7]],
    ["A firm has a PED estimate from another country and year. Which judgement is most justified?", "Check local conditions before applying the estimate", "The estimate guarantees the same revenue change", "PED cannot vary between products or time periods", "The estimate establishes the firm's YED as well", [6,8]]
  ], {youtubeId:"6qH0N1Ircfc",title:"Price Elasticity of Demand",channel:"tutor2u",source:"https://www.youtube.com/watch?v=6qH0N1Ircfc"}),

  pack("2.3", [
    "Price elasticity of supply (PES) measures the responsiveness of quantity supplied to a change in the product's own price, other things equal.",
    "PES equals percentage change in quantity supplied divided by percentage change in price. When levels are used here, percentages use the initial values unless another base is explicitly stated.",
    "For an ordinary upward supply curve PES is positive. A value above one means elastic supply, below one inelastic supply and one unit elastic. Perfectly inelastic supply is vertical; perfectly elastic supply is horizontal.",
    "Spare capacity, stocks, mobile factors and a short production period can make supply more responsive. Growing crops or building specialised capacity takes time. The time available to adjust is central; slope alone is not the elasticity coefficient.",
    "An elastic supplier can usually expand quantity more readily after a price incentive. An inelastic supplier faces constraints and may respond mainly through higher prices in the short run. Greater responsiveness is about percentage quantity response, not a guarantee of higher profit."
  ], ["PES", "Percentage response", "Spare capacity", "Stocks", "Adjustment time"],
  "A furniture workshop has spare machines and stored materials, while a fruit grower must wait for a growing season. After prices rise, their ability to expand quantity differs. More adjustment time or usable stocks can change that response.",
  ["Identify own-price change", "Calculate quantity response", "Divide percentage changes", "Interpret magnitude", "Explain the relevant capacity or time constraint"],
  [
    ["What does PES measure?", "Quantity supplied response to own-price change", "Quantity demanded response to income change", "Quantity demanded response to own-price change", "Price response to another product's income change", [1]],
    ["Which calculation gives PES?", "% change in quantity supplied ÷ % change in price", "% change in price ÷ % change in quantity supplied", "% change in income ÷ % change in price", "% change in quantity demanded ÷ % change in income", [2]],
    ["What does PES of 0.4 indicate?", "Price-inelastic supply", "Price-elastic supply", "Unit-elastic supply", "Perfectly elastic supply", [3]],
    ["How is perfectly elastic supply represented?", "A horizontal line", "A vertical line", "Any upward straight line", "Any downward curve", [3]]
  ], [
    ["Price rises 5% and quantity supplied rises 15%. What is PES?", "3", "0.33", "10", "−3", [2,3]],
    ["Why can spare production capacity make supply more elastic?", "Output can expand without first building a new plant", "It prevents firms using more inputs", "It removes every production cost", "It changes demand into a vertical line", [4,5]],
    ["Why might fresh fruit supply be inelastic immediately after a price rise?", "Extra crops take time to grow", "Quantity supplied must equal zero", "Consumers have many substitute products", "Fruit prices cannot change", [4,5]]
  ], [
    ["Quantity supplied rises 12% after price rises 8%. What is PES?", "1.5", "0.67", "4", "−1.5", [2,3]],
    ["A supplier has large saleable stocks. How can this affect short-run PES?", "Stocks allow a faster increase in quantity supplied", "Stocks prevent any increase in sales", "Stocks necessarily reduce output responsiveness", "Stocks make all supply perfectly inelastic", [4,5]],
    ["What does a vertical supply curve mean?", "Quantity supplied does not change with price", "Price is fixed for every quantity", "Quantity changes by the same percentage as price", "Quantity changes more proportionately than price", [3]],
    ["A factory can hire suitably trained workers quickly. Which determinant can raise responsiveness?", "Factor mobility", "A longer compulsory production period", "The absence of spare capacity", "An inability to obtain materials", [4]],
    ["Which situation most strongly constrains immediate quantity adjustment?", "Production requires a fixed growing season", "Finished goods are readily available in storage", "Machines are idle and ready for use", "Workers can be reassigned at short notice", [4,5]],
    ["PES is 1 and price rises 6%. What quantity response is implied by that estimate?", "A 6% rise", "A 1% rise", "A 6% fall", "No change", [2,3]],
    ["Why can supply be more elastic in the long run?", "Firms have time to expand productive capacity", "The own-price change must disappear", "All input prices must fall to zero", "Every supply curve must become horizontal", [4,5]],
    ["Which interpretation of PES 2 is correct?", "A 1% price rise is associated with a 2% quantity-supply rise", "A $1 price rise always adds two physical units", "A 2% price rise causes a 1% demand increase", "A 1% income rise causes a 2% supply increase", [1,2,3]],
    ["Price falls 10% and quantity supplied falls 15%. What is PES?", "1.5", "−1.5", "0.67", "−0.67", [2,3]],
    ["Which comparison best illustrates a time constraint on supply?", "A crop needs a season; stored manufactured output can be released now", "A crop and stored output must adjust at identical speeds", "Stored output cannot be supplied at any market price", "The growing season determines only consumers' incomes", [4,5]]
  ], [
    ["Price rises 4% and quantity supplied rises 2%. What is PES?", "0.5", "2", "6", "−0.5", [2,3]],
    ["What type of supply does PES 1.8 describe?", "Elastic supply", "Inelastic supply", "Unit-elastic supply", "Perfectly inelastic supply", [3]],
    ["Which change could increase a manufacturer's short-run supply responsiveness?", "Obtaining usable spare machinery", "Losing access to materials", "Increasing the time needed to train staff", "Removing all finished-goods stocks", [4,5]],
    ["A concert has a fixed number of seats for tonight. What is the immediate seat supply like?", "Perfectly inelastic", "Perfectly elastic", "Unit elastic by definition", "Income elastic by definition", [3,4]],
    ["Quantity supplied increases from 200 to 220 after price rises from $10 to $12. Using initial bases, what is PES?", "0.5", "2", "1", "0.1", [2]],
    ["Why does easy storage matter for supply responsiveness?", "Stored output can be released when market conditions change", "It ensures every product has identical demand", "It eliminates the need for productive resources", "It makes supply independent of every cost", [4,5]],
    ["Which statement about PES and slope is correct?", "PES uses percentage changes; slope uses changes in units", "Equal supply slopes always imply equal PES everywhere", "PES is always the inverse of demand slope", "A steep supply line always has negative PES", [2,3]],
    ["A firm needs years to install specialised equipment. What does this suggest?", "Its immediate quantity response may be limited", "Its supply must be infinitely elastic immediately", "Its product must be an inferior good", "Its demand must have zero price elasticity", [4,5]]
  ], {youtubeId:"sSeByVLztJg",title:"Price Elasticity of Supply",channel:"tutor2u",source:"https://www.youtube.com/watch?v=sSeByVLztJg"}),

  pack("2.4", [
    "Market equilibrium occurs where quantity demanded equals quantity supplied at a price. Below that price, excess demand creates upward pressure; above it, excess supply creates downward pressure, assuming prices can adjust.",
    "With other things equal and ordinary slopes, higher demand raises equilibrium price and quantity; higher supply lowers price and raises quantity. Simultaneous shifts may leave one outcome ambiguous unless their relative sizes are known.",
    "Joint demand concerns complements used together; alternative demand concerns substitutes. Derived demand arises because an input helps produce another product. Joint supply occurs when producing one product also yields another, such as beef and hides.",
    "Prices ration scarce output, signal relative scarcity and preferences, and create incentives for changes in production and consumption. A signal is not a guarantee of a quick response: capacity and adjustment time still matter."
  ], ["Equilibrium", "Shortage", "Surplus", "Linked markets", "Price signals"],
  "A market for school notebooks initially clears. More students increase demand while cheaper paper may increase supply. Higher notebook output can raise derived demand for paper. The final price depends on which curves move and by how much.",
  ["Locate the initial intersection", "Identify the changed determinant", "Shift the appropriate curve", "Find the new intersection", "Explain price adjustment and linked effects"],
  [
    ["When is a market in equilibrium?", "Quantity demanded equals quantity supplied", "Price equals zero", "Every buyer wants unlimited units", "Every firm has identical costs", [1]],
    ["What is excess demand?", "Quantity demanded exceeds quantity supplied at the price", "Quantity supplied exceeds quantity demanded at the price", "Demand equals supply at every possible price", "Output exceeds every producer's capacity", [1]],
    ["Demand for timber used to make furniture is what type of demand?", "Derived demand", "Joint supply", "Demand for a substitute by definition", "Perfectly inelastic demand by definition", [3]],
    ["Which relationship describes complementary goods used together?", "Joint demand", "Alternative demand", "Joint supply", "Derived supply", [3]]
  ], [
    ["Demand rises with supply unchanged and upward sloping. What happens at equilibrium?", "Price and quantity both rise", "Price falls and quantity rises", "Price rises and quantity falls", "Price and quantity both fall", [2]],
    ["A price above equilibrium creates which pressure, other things equal?", "Unsold supply encourages a price reduction", "Unmet demand encourages a price increase", "All trading necessarily stops permanently", "Quantity demanded must exceed quantity supplied", [1]],
    ["How does a higher price ration a scarce product in a market?", "It reduces the quantity buyers are willing and able to purchase", "It gives every buyer an equal physical ration", "It removes all differences in purchasing power", "It guarantees more resources immediately exist", [4]]
  ], [
    ["At a price of $4, demand is 90 and supply is 60. What exists?", "A shortage of 30 units", "A surplus of 30 units", "Equilibrium at 150 units", "A shortage of 150 units", [1]],
    ["In the figure, what is the effect of D0 shifting to D1?", "A higher equilibrium price and quantity", "A lower equilibrium price and higher quantity", "A higher equilibrium price and lower quantity", "A lower equilibrium price and quantity", [2], {kind:"market",variant:"demand-shift",label:"An unchanged upward supply curve and a rightward demand shift"}],
    ["Supply increases while demand is unchanged and downward sloping. What is the outcome?", "Price falls and quantity rises", "Price rises and quantity falls", "Price and quantity both rise", "Price and quantity both fall", [2]],
    ["A fall in demand for cars reduces demand for car-assembly labour. What link is illustrated?", "Derived demand", "Joint supply", "Alternative demand for labour and cars", "A fixed equilibrium at every wage", [3]],
    ["More beef production also yields more hides. What relationship is this?", "Joint supply", "Joint demand", "Alternative demand", "Derived demand for beef from hides by definition", [3]],
    ["What does a rising price signal to potential producers, other things equal?", "Greater potential reward from supplying the product", "A compulsory instruction to stop producing", "That consumers no longer value the product", "That producing it has no opportunity cost", [4]],
    ["Demand and supply both shift right. Which outcome is certain with ordinary slopes?", "Equilibrium quantity rises", "Equilibrium price rises", "Equilibrium price falls", "Equilibrium price is unchanged", [2]],
    ["Cars and fuel are used together. Which term describes this demand relationship?", "Joint demand", "Alternative demand", "Joint supply", "Derived supply", [3]],
    ["At $6, demand and supply are each 45 units. What is the market state at that price?", "Equilibrium", "Excess demand of 45", "Excess supply of 45", "A shortage of 90", [1]],
    ["Demand falls and supply rises simultaneously. Which result is certain with ordinary slopes?", "Equilibrium price falls", "Equilibrium quantity falls", "Equilibrium quantity rises", "Equilibrium quantity is unchanged", [2]]
  ], [
    ["At $9, quantity supplied is 75 and quantity demanded is 55. What exists?", "A surplus of 20 units", "A shortage of 20 units", "Equilibrium at 130 units", "A shortage of 130 units", [1]],
    ["In the figure, what does a rightward supply shift do to equilibrium?", "Lowers price and raises quantity", "Raises price and lowers quantity", "Raises both price and quantity", "Lowers both price and quantity", [2], {kind:"market",variant:"supply-shift",label:"Unchanged downward demand and a rightward supply shift"}],
    ["A fall in demand occurs with supply unchanged. What happens under ordinary slopes?", "Equilibrium price and quantity fall", "Equilibrium price and quantity rise", "Price rises while quantity falls", "Price falls while quantity rises", [2]],
    ["Coffee and tea compete as alternative drinks. What relationship is illustrated?", "Alternative demand", "Joint demand", "Joint supply", "Derived demand for an input", [3]],
    ["Construction expands and demand for bricks rises. Which relationship is central?", "Derived demand", "Joint supply", "Demand for substitutes", "Demand unrelated to final output", [3]],
    ["Demand rises and supply falls simultaneously. Which outcome is certain with ordinary slopes?", "Equilibrium price rises", "Equilibrium quantity rises", "Equilibrium quantity falls", "Equilibrium quantity stays fixed", [2]],
    ["A higher price encourages entry into a market. Which price function is illustrated?", "Incentivising production", "Guaranteeing equal income", "Removing resource scarcity", "Fixing all future output levels", [4]],
    ["Why need a shortage not persist when prices can adjust?", "A rising price can reduce demand and increase supply quantities", "A shortage means supply exceeds demand", "A rising price necessarily shifts demand right", "A shortage removes every producer's capacity constraint", [1,4]]
  ], {youtubeId:"5g-jDN1dEK0",title:"Demand and Supply | GCSE Economics Live Revision",channel:"tutor2u",source:"https://www.youtube.com/watch?v=5g-jDN1dEK0"}),

  pack("2.5", [
    "Consumer surplus is the difference between willingness to pay and actual payment. For a market with a downward demand curve, it is the area below demand and above the transaction price for the units bought.",
    "Producer surplus is receipts above the minimum prices sellers would accept for the units supplied. It is the area above supply and below the transaction price. It is not generally identical to profit, because fixed costs need not be deducted in this measure.",
    "A price change alters surplus on existing units and can change the number traded. Curve shifts also change willingness to pay or minimum supply prices, so their effects cannot be inferred from price alone. For a straight line, a triangular area is one half times base times height.",
    "Demand and supply responsiveness influence quantity changes and the size of surplus changes following a shock. Greater or smaller elasticity does not by itself determine every surplus total; initial curves, intercepts and the size of the shock matter."
  ], ["Willingness to pay", "Minimum acceptable price", "Consumer surplus", "Producer surplus", "Elasticity"],
  "At a market price, some buyers would have paid more and some sellers would have accepted less. The gaps generate consumer and producer surplus. Compare areas using the actual curves; do not equate producer surplus with accounting profit or assume one elasticity determines all welfare outcomes.",
  ["Locate price and quantity", "Identify willingness or reservation prices", "Find the relevant area", "Calculate using consistent units", "Explain what changes when curves or price move"],
  [
    ["What is consumer surplus on one purchased unit?", "Willingness to pay minus price paid", "Price paid minus minimum supply price", "Total sales revenue minus fixed cost", "Price paid multiplied by all market output", [1]],
    ["Where is producer surplus on a standard market diagram?", "Above supply and below the market price", "Above demand and below supply", "Below demand and above the market price", "The whole rectangle of market revenue", [2]],
    ["What formula gives the area of a triangle?", "One half × base × height", "Base × height", "Base ÷ height", "Two × base × height", [3]],
    ["What is producer surplus on a supplied unit?", "Price received minus minimum acceptable price", "Willingness to pay minus price paid", "Sales revenue minus every fixed and variable cost", "The entire market price regardless of supply costs", [2]]
  ], [
    ["A buyer would pay $18 and pays $12. What is consumer surplus?", "$6", "$18", "$12", "$30", [1]],
    ["A seller receives $15 and would accept $9. What is producer surplus on that unit?", "$6", "$15", "$9", "$24", [2]],
    ["Why is producer surplus not generally the same as profit?", "It need not deduct fixed costs", "It always excludes all sales revenue", "It measures only buyers' willingness to pay", "It must always equal total production cost", [2]]
  ], [
    ["In the figure, which shaded area is consumer surplus?", "The upper area between D and P*", "The lower area between S and P*", "The whole rectangle below P*", "The area to the right of Q*", [1], {kind:"surplus",label:"Demand D and supply S intersect at P*, Q*; upper and lower surplus triangles are shaded"}],
    ["A linear demand curve has price intercept $20; market price is $12 and quantity is 40. What is consumer surplus?", "$160", "$320", "$480", "$800", [1,3]],
    ["A linear supply curve starts at $4; price is $10 and quantity is 30. What is producer surplus?", "$90", "$180", "$300", "$120", [2,3]],
    ["Along unchanged demand, a lower price normally has which effect on existing buyers' consumer surplus?", "It increases surplus on the units they already bought", "It reduces surplus on every unit already bought", "It leaves willingness minus payment unchanged", "It converts consumer surplus into fixed production cost", [1,3]],
    ["Why must the demand curve be considered when price changes?", "The quantity bought can change as well", "Consumer surplus depends only on the label of the good", "Every price change leaves quantity fixed", "The demand curve measures only seller costs", [3,4]],
    ["A seller is paid $14 for a unit with minimum acceptable price $10. What is its producer surplus?", "$4", "$10", "$14", "$24", [2]],
    ["Which fact is insufficient by itself to calculate total consumer surplus?", "Demand is price elastic", "The complete demand schedule and transaction price", "A linear curve's intercept, price and quantity", "Willingness and payments for every unit bought", [1,4]],
    ["What does a buyer with willingness to pay exactly equal to price receive on that unit?", "Zero consumer surplus", "Consumer surplus equal to the whole price", "Negative surplus equal to the price", "Producer surplus equal to willingness to pay", [1]],
    ["A buyer values a ticket at $16 and pays $11. What is the buyer's surplus?", "$5", "$11", "$16", "$27", [1]],
    ["Why does total producer surplus use an area rather than price alone?", "Minimum acceptable prices can vary across supplied units", "All supplied units necessarily have zero cost", "Every seller always has the same reservation price", "Producer surplus is independent of the number of units", [2,3]]
  ], [
    ["In the figure, which shaded area is producer surplus?", "The lower area between S and P*", "The upper area between D and P*", "The whole rectangle below P*", "The area above the demand intercept", [2], {kind:"surplus",label:"Supply and demand meet at the marked equilibrium; both surplus areas are shaded"}],
    ["Linear demand intercepts price at $30; price is $18 and quantity is 50. What is consumer surplus?", "$300", "$600", "$900", "$1500", [1,3]],
    ["Linear supply intercepts price at $6; price is $14 and quantity is 20. What is producer surplus?", "$80", "$160", "$280", "$120", [2,3]],
    ["A consumer values a unit at $25 but pays $17. What is the surplus?", "$8", "$17", "$25", "$42", [1]],
    ["A supply improvement lowers price while the demand curve stays fixed. What normally happens to consumer surplus?", "It increases as payment falls and purchases expand", "It must disappear because price is lower", "It becomes identical to total revenue", "It can be inferred from supply elasticity alone", [1,3,4]],
    ["Why may a price rise not establish the direction of total producer surplus after a shock?", "The supply curve and traded quantity may also change", "Producer surplus excludes the transaction price", "Producer surplus is defined only for one buyer", "Fixed costs always equal total revenue", [2,3,4]],
    ["Which comparison correctly relates the two surplus measures?", "One uses buyers' valuations; the other uses sellers' reservation prices", "Both subtract fixed costs from firms' sales", "Both measure only buyers' total expenditure", "Both always equal accounting profit", [1,2]],
    ["Why does elasticity matter for a surplus change after a market shock?", "It affects the quantity response and hence affected areas", "It gives the surplus value without knowing any price", "It ensures demand and supply shifts are identical", "It makes willingness to pay equal to fixed cost", [3,4]]
  ], {youtubeId:"_6kwhF6hoqQ",title:"Consumer surplus introduction",channel:"Khan Academy",source:"https://www.youtube.com/watch?v=_6kwhF6hoqQ"})
];
