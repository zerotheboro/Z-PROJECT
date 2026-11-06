import { requireEconomicsPack } from "./packs";
import { economicsTopic } from "./syllabus";
import type { TrainingMethodId } from "../type";

export function economicsIntroductionExample(method: TrainingMethodId, topicId: string): string {
  const p = requireEconomicsPack(topicId), topic = `${p.topicId} ${economicsTopic(topicId)!.title}`;
  const examples: Record<TrainingMethodId, string> = {
    "active-recall": `Study ${topic}, close the notes and recall the economic ideas without looking.`,
    feynman: `Explain an idea from ${topic} to a younger student, then revisit any unclear reasoning.`,
    cornell: `Take notes on ${topic}, add economic questions in the cue column and write a short summary.`,
    interleaving: `Alternate definition and application questions within ${topic}, identifying the reasoning each needs.`,
    "memory-palace": `Place the economic ideas from ${topic} at familiar locations and mentally revisit them.`,
    "active-blurting": `Read ${topic}, close the notes and write every economic idea you remember before checking gaps.`,
    "one-sentence": `Summarise an important relationship from ${topic} accurately in one sentence.`,
    "note-taking-4x4": `Organise ${topic} into four useful branches, with economic definitions and examples beneath them.`,
    "leitner-system": `Use flashcards for ${topic}, revisiting economic ideas you could not recall.`,
    "story-telling": `Connect the economic ideas in ${topic} into a memorable story, keeping the facts accurate.`,
    "capture-create": `Capture the ideas in ${topic} on one side of a page; create economic applications on the other.`,
    abbreviation: `Use the initial letters of the main ideas in ${topic} as cues, then explain each idea fully.`,
    "header-first": `Preview the subheadings in ${topic}, predict their relationships and then read to check them.`,
    "prime-question": `Choose an economic question about ${topic}, study the notes and explain your answer.`,
    "doodle-effect": `Make a simple drawing of relationships in ${topic}, then check that the economics is accurate.`,
    "eighty-twenty-rule": `Identify central ideas in ${topic} before adding supporting details; do not assume a literal 80/20 ratio.`,
    "divide-steps": `Divide an application of ${topic} into smaller reasoning steps and reconstruct the explanation.`,
    "derive-basics": `Use the basic economic principles in ${topic} to rebuild an explanation rather than memorising its wording.`,
    "kidlin-rule": `Clarify the economic situation in ${topic} by separating known facts, the question and missing information.`,
    "premack-principle": `Complete the agreed study task in ${topic} before taking your chosen enjoyable break.`,
    "ten-minute-wall-stare": `Take the existing quiet-break activity before studying ${topic}; the break is not a guarantee of better results.`,
    "strooper-effect": `Complete the existing attention exercise, then study ${topic} and test your economic understanding.`,
    "two-x-video-speed": `Review the topic notes and watch the related ${topic} video at 2x before checking comprehension.`
  };
  return examples[method];
}
