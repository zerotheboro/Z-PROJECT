import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useResumableNamedRecord, useTrainingStage, useTrainingProgressCheckpoint } from "../trainingProgressState";
import type { MappedRuntime } from "./runtime";
import type { MaterialPresentation } from "./presentationRecords";

const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
export function renderedMaterialText(element: HTMLElement): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const text: string[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    let visible = true;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (parent.hidden || parent.getAttribute("aria-hidden") === "true" || style.display === "none" || ["hidden", "collapse"].includes(style.visibility) ||
        parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector("summary")?.contains(node)) { visible = false; break; }
    }
    if (visible) text.push(node.textContent ?? "");
  }
  return normalized(text.join(" "));
}

/** Render telemetry, not evidence that a learner read/understood the material. */
export default function MappedActivity({ runtime, children }: { runtime?: MappedRuntime; children: ReactNode }) {
  const stage = useTrainingStage();
  const root = useRef<HTMLDivElement>(null);
  const record = useResumableNamedRecord<MaterialPresentation>("material-presentations");
  const [review, setReview] = useState(false);
  const [visible, setVisible] = useState("");
  const canReview = Boolean(runtime && stage && ["explain", "simplify", "reconstruct", "reflection", "confidence"].includes(stage));
  const isStudy = Boolean(stage && ["study", "learn", "encode", "read", "inspect"].includes(stage));
  const scan = () => {
    if (!runtime || !root.current || !stage || !isStudy && !(canReview && review)) return;
    const elements = [...root.current.querySelectorAll<HTMLElement>("[data-material-surface]")];
    const text = elements.map(renderedMaterialText).join(" ");
    const primary = root.current.querySelector<HTMLElement>("[data-primary-material]");
    const primaryText = primary ? renderedMaterialText(primary) : "";
    setVisible(previous => previous === primaryText ? previous : primaryText);
    for (const material of runtime.materials) {
      if (!text.includes(normalized(material.text)) || record.get(material.id)) continue;
      record.set(material.id, { materialId: material.id, materialVersion: material.version, mappingVersion: "ec9708-objectives-1",
        contentSetId: runtime.contentSetId, methodId: runtime.methodId, phase: runtime.phase,
        objectiveIds: [...material.objectiveIds], presentedAt: new Date().toISOString() });
    }
  };
  const scanRef = useRef(scan); scanRef.current = scan;
  useTrainingProgressCheckpoint(() => scanRef.current());
  useEffect(() => {
    if (!runtime || !root.current) return;
    scanRef.current();
    const observer = new MutationObserver(() => scanRef.current());
    observer.observe(root.current, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [runtime, stage, review]);
  useEffect(() => { setReview(false); setVisible(""); }, [stage]);
  if (!runtime) return <>{children}</>;
  const supplemental = isStudy ? runtime.materials.filter(m => !m.id.endsWith(":cue") && !visible.includes(normalized(m.text))) : [];
  // Only source notes, never answer keys. Review is unavailable during testing
  // and closed-note recall; phase/stage changes close the disclosure.
  return <div ref={root}>
    {stage === "intro" && <details><summary>How to use this method</summary><ol>{runtime.howTo.map(step => <li key={step}>{step}</li>)}</ol></details>}
    <div data-material-surface data-primary-material>{children}</div>
    {supplemental.length > 0 && <aside className="study-content" data-material-surface><h3>Topic reference</h3>{supplemental.map(m => <p key={m.id}>{m.text}</p>)}</aside>}
    {canReview && <button type="button" onClick={() => setReview(v => !v)}>{review ? "Close source" : "Check source"}</button>}
    {canReview && review && <aside className="study-content" data-material-surface><h3>Check your explanation against the source</h3>{runtime.materials.map(m => <p key={m.id}>{m.text}</p>)}</aside>}
  </div>;
}
