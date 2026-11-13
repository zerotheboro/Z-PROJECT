import StudyPanel from "./StudyPanel";

/** Preserve source wording; mapped relationships repeat the passage notes. */
export default function DoodleStudyContent({ material, relationships }: {
  material: string; relationships: readonly string[];
}) {
  const paragraphs = material.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
  const seen = new Set(paragraphs.map(normalized));
  for (const text of relationships) {
    if (!seen.has(normalized(text))) { paragraphs.push(text); seen.add(normalized(text)); }
  }
  return <StudyPanel>{paragraphs.map((text, i) => <p key={i}>{text}</p>)}</StudyPanel>;
}
