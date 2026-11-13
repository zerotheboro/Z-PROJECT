import { learningObjectiveId } from "./objectives";
import { syllabusPointIds } from "./syllabus";
import type { EconomicsTopicId } from "./syllabus";

type TopicImage = {
  topicId: EconomicsTopicId;
  filename: string;
  objectiveIds: readonly string[];
  alt: string;
  caption?: string;
};

function image(topicId: EconomicsTopicId, filename: string, alt: string,
  points?: readonly number[], caption?: string): TopicImage {
  return { topicId, filename, alt, caption,
    objectiveIds: (points ? points.map(point => `${topicId}.${point}`) : syllabusPointIds(topicId)).map(learningObjectiveId) };
}

/** Single asset inventory for the supplied ZIP. Objective IDs scope reference
 * display only: they do not assert assessment coverage or recorded exposure.
 * Topic illustrations supplement notes; they never replace assessment figures. */
export const economicsImageRequests: readonly TopicImage[] = [
  image("1.3", "1-3-factors-of-production.png", "The four factors of production: land, labour, capital and enterprise."),
  image("1.4", "1-4-economic-systems.png", "Market, mixed and planned economic systems illustrated side by side."),
  image("1.5", "1-5-ppc.png", "A production possibility curve for wine and apples, with frontier, inefficient and unattainable positions."),
  image("1.6", "1-6-classification-of-goods.png", "Illustrative examples of private, public, merit and demerit goods."),
  image("2.1", "2-1-demand-and-supply.png", "Demand and supply curves intersect at equilibrium E, with price Pe and quantity Qe."),
  image("2.2", "2-2-ped.png", "Price elasticity of demand: percentage-change formula, demand curve and elastic/inelastic illustrations."),
  image("2.2", "2-2-yed-xed.png", "Income elasticity examples of normal and inferior goods, and cross elasticity examples of substitutes and complements.", [1, 2, 3, 4, 6, 8]),
  image("2.3", "2-3-pes.png", "Price and quantity axes with three supply lines labelled S2, S and S1.", undefined,
    "Use percentage changes to calculate PES. Straight supply lines through the origin have unit elasticity; steepness alone does not establish elasticity."),
  image("2.4", "2-4-interaction-of-demand-and-supply.png", "Demand and supply shifts showing the corresponding directions of equilibrium price and quantity changes."),
  image("2.5", "2-5-consumer-producer-surplus.png", "Consumer surplus above the equilibrium price and below demand; producer surplus below price and above supply.")
];

export function resolveEconomicsImages(topicId: string, objectiveIds: readonly string[], assets: Readonly<Record<string, string>>) {
  const scope = new Set(objectiveIds);
  return economicsImageRequests.filter(image => image.topicId === topicId && image.objectiveIds.some(id => scope.has(id)))
    .flatMap(image => {
      const key = `../../image/economics9708/${image.filename}`;
      return Object.hasOwn(assets, key) && typeof assets[key] === "string" && assets[key] ? [{ ...image, src: assets[key] }] : [];
    });
}
