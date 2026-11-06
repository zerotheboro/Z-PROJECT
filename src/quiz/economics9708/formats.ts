import type { TrainingMethodId } from "../type";

// Pilot-1 question counts are pinned, not inferred from future general banks.
// Tuple = ordinary questions, unscored practice, final test. Retain this table
// with v1 packs if a future content/engine format receives a new version.
export const economicsFormats: Record<TrainingMethodId, { lab: readonly [number, number, number]; match: readonly [number, number, number] }> = {
  "active-recall": {lab:[4,0,0],match:[4,0,0]},
  feynman: {lab:[4,0,0],match:[3,0,0]},
  cornell: {lab:[4,0,0],match:[4,0,0]},
  interleaving: {lab:[0,6,4],match:[0,4,4]},
  "memory-palace": {lab:[5,0,0],match:[5,0,0]},
  "active-blurting": {lab:[4,0,0],match:[4,0,0]},
  "one-sentence": {lab:[3,0,0],match:[3,0,0]},
  "note-taking-4x4": {lab:[4,0,0],match:[4,0,0]},
  "leitner-system": {lab:[0,4,3],match:[0,4,3]},
  "story-telling": {lab:[4,0,0],match:[4,0,0]},
  "capture-create": {lab:[4,0,0],match:[4,0,0]},
  abbreviation: {lab:[4,0,0],match:[4,0,0]},
  "header-first": {lab:[4,0,0],match:[4,0,0]},
  "prime-question": {lab:[4,0,0],match:[4,0,0]},
  "doodle-effect": {lab:[4,0,0],match:[4,0,0]},
  "eighty-twenty-rule": {lab:[4,0,0],match:[4,0,0]},
  "divide-steps": {lab:[4,0,0],match:[4,0,0]},
  "derive-basics": {lab:[4,0,0],match:[4,0,0]},
  "kidlin-rule": {lab:[3,0,0],match:[3,0,0]},
  "premack-principle": {lab:[3,0,0],match:[3,0,0]},
  "ten-minute-wall-stare": {lab:[3,0,0],match:[3,0,0]},
  "strooper-effect": {lab:[3,0,0],match:[3,0,0]},
  "two-x-video-speed": {lab:[3,0,0],match:[3,0,0]}
};
