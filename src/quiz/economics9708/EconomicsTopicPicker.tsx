import { economicsCoverageManifest } from "./packs";

export default function EconomicsTopicPicker({ value, onChange, disabled = false }: {
  value: string; onChange: (id: string) => void; disabled?: boolean;
}) {
  const available = economicsCoverageManifest.filter(topic => topic.status === "playable");
  return <section className="training-resume-card" aria-label="Study content options">
    <h2>Choose your study content</h2>
    <label>Subject <select aria-label="Training subject" value={value ? "9708" : "general"} disabled={disabled}
      onChange={event => onChange(event.target.value === "9708" ? available[0]?.id ?? "" : "")}>
      <option value="general">General Training</option><option value="9708" disabled={!available.length}>Economics 9708 AS — controlled pilot</option>
    </select></label>
    {value && <>
      <label>Topic <select aria-label="Economics topic" value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
        {economicsCoverageManifest.map(topic => <option key={topic.id} value={topic.id} disabled={topic.status !== "playable"}>
          {topic.id} {topic.title}{topic.status !== "playable" ? " — not available yet" : ""}
        </option>)}
      </select></label>
      <p>This short session samples one topic. It is not a complete syllabus test or proof that a study method causes better learning.</p>
    </>}
  </section>;
}
