import type { EconomicsTopicId } from "./syllabus";
// Short, source-checked retrieval cues. Learners create their own vivid images;
// the accompanying approved note retains the precise economic meaning.
export const mnemonicCues: Partial<Record<EconomicsTopicId, readonly string[]>> = {
  "1.3": ["Land, labour, capital, enterprise", "Skills versus equipment", "Rent, wages, interest, profit", "Specialists on a production line", "Entrepreneur bearing uncertainty"],
  "1.4": ["Market, planned, mixed", "Prices and public allocation"],
  "1.5": ["Feasible-output boundary", "Opportunity-cost trade-off", "Expanding or contracting capacity", "Idle resources inside the frontier"],
  "1.6": ["Free versus scarce private goods", "Non-rival and non-excludable", "Underestimated merit-good benefits", "Underestimated demerit-good harms"],
  "2.1": ["Willingness and ability to pay", "Add quantities at a common price", "Demand determinants", "Supply determinants", "Demand curve shifts", "Supply curve shifts", "Own-price movement along a curve"],
  "2.2": ["PED, YED, XED", "Percentage response divided by percentage cause", "Signs and economic relationships", "Above one, below one, equal to one", "Slope differs from elasticity", "Substitutes, time and other determinants", "Price times quantity", "Context-dependent estimates"],
  "2.3": ["PES responsiveness", "Percentage quantity divided by percentage price", "Elastic, inelastic, unit elastic", "Capacity, stocks and adjustment time", "Constraints on quantity response"],
  "2.4": ["Equilibrium, shortage, surplus", "Adjustment after curve shifts", "Linked demand and supply", "Rationing, signalling, incentives"],
  "2.5": ["Willingness to pay minus price", "Price minus minimum acceptable price", "Surplus changes and triangle areas", "Elasticity and surplus relationships"]
};
