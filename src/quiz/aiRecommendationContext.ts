import {
  matchesSelectionSignal,
  methodDefinitions,
  getMethodDefinition
} from "./methodRegistry";
import { isTrainingMethodId } from "./type";

import type {
  SavedAIRecommendation
} from "../services/aiRecommendationPersistence";
import type {
  BaselineResult,
  LearningSituation,
  TrainingMethodId
} from "./type";

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// These are the names used by the existing AI method catalog where the
// Training registry uses a different display name.
const catalogAliases: readonly [string, TrainingMethodId][] = [
  ["10 Minute Wall Stare", "ten-minute-wall-stare"],
  ["Stroop Effect Exercise", "strooper-effect"],
  ["Interleaved Practice", "interleaving"],
  ["One Sentence", "one-sentence"],
  ["Cornell Method", "cornell"],
  ["Doodle Effect", "doodle-effect"]
];

const methodNames = new Map<string, Set<TrainingMethodId>>();
const MAX_RECOMMENDATION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

function registerName(name: string, id: TrainingMethodId) {
  const key = normalizeName(name);
  const matches = methodNames.get(key) ?? new Set<TrainingMethodId>();
  matches.add(id);
  methodNames.set(key, matches);
}

for (const definition of methodDefinitions) {
  registerName(definition.id, definition.id);
  registerName(definition.name, definition.id);
  if (definition.shortName) {
    registerName(definition.shortName, definition.id);
  }
}

for (const [name, id] of catalogAliases) {
  registerName(name, id);
}

export function resolveAITrainingMethodId(
  name: string
): TrainingMethodId | null {
  const matches = methodNames.get(normalizeName(name));
  return matches?.size === 1
    ? [...matches][0]
    : null;
}

function recommendationTime(value: unknown): number {
  if (typeof value === "string") {
    return Date.parse(value);
  }
  if (typeof value === "object" && value !== null &&
    "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return Number.NaN;
}

// Identifies the exact saved advice that the learner was asked to confirm.
// No recommendation text is used for selection until it is fetched again
// from the current draft owner's account and revalidated on resume.
export function getAIRecommendationKey(
  saved: SavedAIRecommendation
): string | null {
  const timestamp = saved.updatedAt;
  const stamp = typeof timestamp === "string"
    ? `local:${timestamp}`
    : typeof timestamp === "object" && timestamp !== null &&
      "seconds" in timestamp && typeof timestamp.seconds === "number" &&
      "nanoseconds" in timestamp && typeof timestamp.nanoseconds === "number"
      ? `cloud:${timestamp.seconds}:${timestamp.nanoseconds}`
      : null;

  return stamp === null ? null : JSON.stringify([
    stamp,
    saved.inputs,
    saved.result.recommended_methods.map(method => method.name)
  ]);
}

// A selection-signal match is only a candidate. The situation has no
// subject/topic field, so the learner must confirm the saved inputs still
// describe this session before these IDs can influence selection.
export function getAIRecommendationCandidates(
  saved: SavedAIRecommendation | null,
  situation: LearningSituation,
  baseline: BaselineResult,
  now = Date.now()
): TrainingMethodId[] {
  if (!saved || !situation.goal || !situation.contentTypes.length ||
    !saved.inputs.biggestProblem.trim() ||
    !saved.inputs.methodQuestion.trim()) {
    return [];
  }

  const age = now - recommendationTime(saved.updatedAt);
  if (!Number.isFinite(age) || age > MAX_RECOMMENDATION_AGE_MS ||
    age < -CLOCK_SKEW_MS) {
    return [];
  }

  const relevant = new Set<TrainingMethodId>();

  for (const recommendation of saved.result.recommended_methods) {
    const id = resolveAITrainingMethodId(recommendation.name);
    if (!id || !isTrainingMethodId(id)) {
      continue;
    }

    const definition = getMethodDefinition(id);
    if (definition.selectionSignals.some(signal =>
      matchesSelectionSignal(signal, situation, baseline)
    )) {
      relevant.add(id);
    }
  }

  return [...relevant];
}

export function getRelevantAIRecommendedMethods(
  saved: SavedAIRecommendation | null,
  situation: LearningSituation,
  baseline: BaselineResult,
  confirmedCurrentContext = false,
  now = Date.now()
): TrainingMethodId[] {
  return confirmedCurrentContext
    ? getAIRecommendationCandidates(saved, situation, baseline, now)
    : [];
}
