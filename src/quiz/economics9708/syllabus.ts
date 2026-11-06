// Cambridge 9708, 2026–2028, Version 2, printed pp. 16–22.
// These short coverage labels are an index, not copied teaching material.
export const ECONOMICS_SYLLABUS = {
  code: "9708", level: "AS", years: "2026–2028", version: 2,
  url: "https://www.cambridgeinternational.org/Images/697423-2026-2028-syllabus.pdf"
} as const;

export const economicsTopics = [
  { id: "1.3", title: "Factors of production", points: ["Inputs", "Capital types", "Rewards", "Specialisation", "Entrepreneurs"] },
  { id: "1.4", title: "Resource allocation in different economic systems", points: ["Decisions", "Allocation"] },
  { id: "1.5", title: "Production possibility curves", points: ["Frontiers", "Costs", "Shifts", "Underutilisation"] },
  { id: "1.6", title: "Classification of goods and services", points: ["Free/private", "Public", "Merit", "Demerit"] },
  { id: "2.1", title: "Demand and supply curves", points: ["Effective demand", "Aggregation", "Demand determinants", "Supply determinants", "Demand shifts", "Supply shifts", "Movements"] },
  { id: "2.2", title: "Price elasticity, income elasticity and cross elasticity of demand", points: ["Definitions", "Calculations", "Signs/magnitudes", "Categories", "Linear demand", "Determinants", "Expenditure", "Applications"] },
  { id: "2.3", title: "Price elasticity of supply", points: ["Definition", "Calculation", "Interpretation", "Determinants", "Responsiveness"] },
  { id: "2.4", title: "The interaction of demand and supply", points: ["Equilibrium", "Shifts", "Linked markets", "Price functions"] },
  { id: "2.5", title: "Consumer and producer surplus", points: ["Consumers", "Producers", "Changes", "Elasticities"] },
  { id: "3.1", title: "Reasons for government intervention in markets", points: ["Public provision", "Consumption information", "Prices"] },
  { id: "3.2", title: "Methods and effects of government intervention in markets", points: ["Tax incidence", "Subsidy incidence", "Provision", "Price controls", "Buffer stocks", "Information"] },
  { id: "3.3", title: "Addressing income and wealth inequality", points: ["Flows/stocks", "Gini interpretation", "Causes", "Redistribution"] },
  { id: "4.1", title: "National income statistics", points: ["Income", "GDP/GNI/NNI", "Basic prices", "Depreciation"] },
  { id: "4.2", title: "Introduction to the circular flow of income", points: ["Sectors", "Injections/leakages", "Equilibrium"] },
  { id: "4.3", title: "Aggregate Demand and Aggregate Supply analysis", points: ["AD", "Components", "Determinants", "AD shape", "AD shifts", "AS", "AS determinants", "SRAS/LRAS shapes", "AS shifts", "Movements", "Equilibrium", "Shift effects"] },
  { id: "4.4", title: "Economic growth", points: ["Definition", "Measurement", "Nominal/real", "Causes", "Consequences"] },
  { id: "4.5", title: "Unemployment", points: ["Definition", "Measurement", "Types", "Consequences"] },
  { id: "4.6", title: "Price stability", points: ["Definitions", "CPI", "Nominal/real", "Causes", "Consequences"] },
  { id: "5.1", title: "Government macroeconomic policy objectives", points: ["Stability/jobs/growth"] },
  { id: "5.2", title: "Fiscal policy", points: ["Budget", "Balances", "Debt", "Taxation", "Spending", "Stance", "AD/AS effects"] },
  { id: "5.3", title: "Monetary policy", points: ["Definition", "Tools", "Stance", "AD/AS effects"] },
  { id: "5.4", title: "Supply-side policy", points: ["LRAS", "Productivity/capacity", "Tools", "AD/AS effects"] }
] as const;

export type EconomicsTopicId = typeof economicsTopics[number]["id"];
export function economicsTopic(id: string) { return economicsTopics.find(topic => topic.id === id) ?? null; }
export function syllabusPointIds(id: EconomicsTopicId): string[] {
  return economicsTopic(id)!.points.map((_, index) => `${id}.${index + 1}`);
}

// Keep nested bullet coverage explicit; a parent ID alone does not prove it.
export const syllabusDetails: Partial<Record<EconomicsTopicId, readonly string[]>> = {
  "1.3": ["land/labour/capital/enterprise", "human/physical", "rent/wages/interest/profit", "division/specialisation", "risk/organisation"],
  "1.4": ["market/planned/mixed decisions", "market/planned/mixed allocation"],
  "1.5": ["capacity combinations", "constant/increasing opportunity costs", "causes/consequences", "idle resources"],
  "1.6": ["scarcity/excludability/rivalry", "non-excludability/non-rivalry", "information/underconsumption", "information/overconsumption"],
  "2.1": ["willingness/ability", "individual/market", "income/preferences/substitutes/complements", "costs/technology/taxes/subsidies", "non-price demand", "non-price supply", "own-price movements"],
  "2.2": ["PED/YED/XED", "percentage formulae", "sign/relative change", "zero/unit/infinite values", "changing elasticity", "substitutes/time/budget/necessities/relationships", "PED/revenue", "pricing/income/competitors"],
  "2.3": ["responsiveness", "percentage formula", "positive magnitude", "stocks/capacity/mobility/time", "speed/ease"],
  "2.4": ["shortage/surplus", "price/quantity", "joint/alternative/derived demand; joint supply", "ration/signalling/incentives"],
  "2.5": ["willingness/payment", "receipts/reservation price", "price/curve shifts", "PED/PES responsiveness"],
  "3.1": ["unprovided public goods", "demerit overuse/merit underuse", "price control"],
  "3.2": ["specific indirect tax impact/incidence", "subsidy impact/incidence", "direct provision", "maximum/minimum prices", "buffer stocks", "information"],
  "3.3": ["stock/flow", "Gini (no calculation)", "assets/skills/inheritance", "minimum wage/transfers/progressive income/inheritance/capital taxes; essential services"],
  "4.1": ["output/income", "GDP/GNI/NNI", "taxes/subsidies", "gross/net"],
  "4.2": ["closed/open; households/firms/government/overseas", "investment/government/exports; saving/tax/imports", "injections versus leakages"],
  "4.3": ["planned spending", "C/I/G/X−M", "spending influences (component detail excluded)", "downward", "non-price influences", "output supplied", "costs/capacity", "upward SRAS; vertical/three-section LRAS", "cost/capacity changes", "price versus other influences", "output/prices/employment", "AD/SRAS/LRAS changes"],
  "4.5": ["available/seeking work", "claimants/surveys/difficulties", "frictional/structural/cyclical/seasonal/technological", "individual/fiscal/output effects"],
  "4.6": ["inflation/deflation/disinflation", "CPI/weights/measurement difficulties", "purchasing power", "demand-pull/cost-push", "redistribution/uncertainty/competitiveness"],
  "5.2": ["revenue/spending", "deficit/surplus", "accumulated borrowing", "direct/indirect; progressive/regressive/proportional; marginal/average; purposes", "capital/current; purposes", "expansion/contraction", "income/output/prices/employment"],
  "5.3": ["monetary conditions", "interest/money/credit", "expansion/contraction", "income/output/prices/employment"],
  "5.4": ["capacity curve", "productivity/capacity", "training/infrastructure/technology", "income/output/prices/employment"]
};
export const economicsExclusions = ["Gini calculation", "Multiplier", "Marginal/average propensities", "5.1 policy conflicts/trade-offs", "Units 6–11"] as const;
