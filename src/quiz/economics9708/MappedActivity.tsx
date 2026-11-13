import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useResumableNamedRecord, useTrainingStage, useTrainingProgressCheckpoint } from "../trainingProgressState";
import type { MappedRuntime } from "./runtime";
import type { MaterialPresentation } from "./presentationRecords";
import EconomicsTopicImages from "./EconomicsTopicImages";
import { EconomicsPassageLayout, EconomicsStudyPanels } from "./EconomicsStudyLayout";
import { getEconomicsObjectiveMapping } from "./adapter";

const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
export function renderedMaterialText(element: HTMLElement, primaryOnly = false): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const text: string[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    let visible = true;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (primaryOnly && parent.hasAttribute("data-supplemental-material")) { visible = false; break; }
      const style = getComputedStyle(parent);
      if (parent.hidden || parent.getAttribute("aria-hidden") === "true" || style.display === "none" || ["hidden", "collapse"].includes(style.visibility) ||
        parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector("summary")?.contains(node)) { visible = false; break; }
    }
    if (visible) text.push(node.textContent ?? "");
  }
  return normalized(text.join(" "));
}

/** Render telemetry, not evidence that a learner read/understood the material. */
export default function MappedActivity({ runtime, children, contentSetId, questionIds = [], videoOnly = false, managedStudy = false }: {
  runtime?: MappedRuntime; children: ReactNode; contentSetId?: string; questionIds?: readonly string[]; videoOnly?: boolean; managedStudy?: boolean;
}) {
  const stage = useTrainingStage();
  const root = useRef<HTMLDivElement>(null);
  const record = useResumableNamedRecord<MaterialPresentation>("material-presentations");
  const [review, setReview] = useState(false);
  const [visible, setVisible] = useState("");
  const canReview = Boolean(runtime && stage && ["explain", "simplify", "reconstruct", "reflection", "confidence"].includes(stage));
  const isStudy = Boolean(stage && ["study", "restudy", "learn", "encode", "read", "inspect", "watch"].includes(stage));
  const scan = () => {
    if (!runtime || !root.current || !stage || !isStudy && !(canReview && review)) return;
    const elements = [...root.current.querySelectorAll<HTMLElement>("[data-material-surface]")];
    const text = elements.map(element => renderedMaterialText(element)).join(" ");
    const primary = root.current.querySelector<HTMLElement>("[data-primary-material]");
    const primaryText = primary ? renderedMaterialText(primary, true) : "";
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
  const topic = /^ec9708-(\d+)_(\d+)-/.exec(runtime?.contentSetId ?? contentSetId ?? "");
  // Legacy activities may display a public topic illustration without being
  // promoted to mapped activity evidence or gaining presentation records.
  let objectiveIds = runtime?.materials.filter(m => m.id.endsWith(":note")).flatMap(m => m.objectiveIds) ?? [];
  if (!runtime && topic) {
    try {
      const mapping = getEconomicsObjectiveMapping(`${topic[1]}.${topic[2]}`);
      const selected = mapping.questions.filter(q => questionIds.includes(q.questionId));
      if (selected.length === new Set(questionIds).size) objectiveIds = selected.flatMap(q => q.objectiveIds);
    } catch { /* Unknown legacy material has no invented image/objective scope. */ }
  }
  const illustrations = topic && !videoOnly ? <EconomicsTopicImages topicId={`${topic[1]}.${topic[2]}`}
    objectiveIds={objectiveIds} /> : null;
  // Video is the instructional source in this Lab. Do not inject pictures or
  // reference notes, or record unseen source notes as presented material.
  // The 100-second activity owns source visibility so recovery cannot briefly
  // inject notes/pictures while its durable countdown is still being checked.
  if (videoOnly || managedStudy) return <div ref={root}><div data-material-surface data-primary-material>{children}</div></div>;
  if (!runtime) return topic && objectiveIds.length ? <EconomicsStudyPanels enabled={isStudy} image={illustrations} reference={null}>{children}</EconomicsStudyPanels> : <>{children}</>;
  const supplemental = isStudy ? runtime.materials.filter(m => !m.id.endsWith(":cue") && !visible.includes(normalized(m.text))) : [];
  // Only source notes, never answer keys. Review is unavailable during testing
  // and closed-note recall; phase/stage changes close the disclosure.
  return <div ref={root}>
    <EconomicsStudyPanels enabled={isStudy} image={illustrations}
      reference={supplemental.length > 0 && <aside data-material-surface data-supplemental-material><h3>Topic reference</h3>{supplemental.map(m => <p key={m.id}>{m.text}</p>)}</aside>}>
      <div data-material-surface data-primary-material>{children}</div>
    </EconomicsStudyPanels>
    {canReview && <button type="button" onClick={() => setReview(v => !v)}>{review ? "Close source" : "Check source"}</button>}
    {canReview && review && <aside className="study-content" data-material-surface><EconomicsPassageLayout image={illustrations}>
      <h3>Check your explanation against the source</h3>{runtime.materials.map(m => <p key={m.id}>{m.text}</p>)}
    </EconomicsPassageLayout></aside>}
  </div>;
}
