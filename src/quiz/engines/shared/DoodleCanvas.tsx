import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent } from "react";

export type DoodleStroke = { x: number; y: number }[];
export default function DoodleCanvas({ strokes }: { strokes: MutableRefObject<DoodleStroke[]> }) {
  const canvas = useRef<HTMLCanvasElement>(null), pointer = useRef<number | null>(null);
  const [count, setCount] = useState(strokes.current.length), [full, setFull] = useState(false);
  const [paused, setPaused] = useState(false);
  function redraw() {
    const node = canvas.current, context = node?.getContext("2d");
    if (!node || !context) return;
    const { width, height } = node.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    node.width = Math.round(width * ratio); node.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.strokeStyle = "#FFD63A"; context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round";
    for (const stroke of strokes.current) {
      context.beginPath();
      stroke.forEach((point, index) => index ? context.lineTo(point.x * width, point.y * height) : context.moveTo(point.x * width, point.y * height));
      if (stroke.length === 1) context.lineTo(stroke[0].x * width + .1, stroke[0].y * height + .1);
      context.stroke();
    }
  }
  useEffect(() => {
    redraw();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(redraw) : null;
    if (canvas.current) observer?.observe(canvas.current);
    window.addEventListener("resize", redraw);
    return () => { observer?.disconnect(); window.removeEventListener("resize", redraw); };
  }, [strokes]);
  function point(event: { clientX: number; clientY: number }) {
    const rect = canvas.current!.getBoundingClientRect();
    if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }
  function stop() {
    const id = pointer.current; pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture?.(id)) canvas.current.releasePointerCapture(id);
  }
  function begin(event: PointerEvent<HTMLCanvasElement>) {
    const start = point(event);
    if (paused || !start || pointer.current !== null) return false;
    if (strokes.current.length >= 100) { setFull(true); return false; }
    pointer.current = event.pointerId; strokes.current.push([start]); setCount(strokes.current.length); redraw();
    return true;
  }
  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== event.pointerId) return;
    stop();
  }
  return <section className="doodle-canvas-panel" aria-label="Doodling workspace">
    <h3>Doodle pad</h3>
    <canvas ref={canvas} aria-label="Freehand doodling canvas"
      onPointerDown={event => {
        if (event.button !== 0 || paused) return;
        event.preventDefault();
        if (pointer.current === event.pointerId) stop();
        if (begin(event) && event.pointerType !== "mouse") event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={event => {
        if (paused) return;
        // Desktop mouse/trackpad hover is enough. Touch and pen require contact.
        // Mouse is never captured, so leaving the pad ends the stroke.
        if (event.pointerType === "mouse" && (event.buttons === 0 || event.buttons === 1) && pointer.current === null) { begin(event); return; }
        if (pointer.current !== event.pointerId) return;
        if (event.pointerType === "mouse" && event.buttons > 1) { stop(); return; }
        if (!point(event)) { stop(); return; }
        event.preventDefault();
        const stroke = strokes.current[strokes.current.length - 1];
        const coalesced = event.nativeEvent.getCoalescedEvents?.();
        const events = coalesced?.length ? coalesced : [event];
        const node = event.currentTarget, rect = node.getBoundingClientRect(), context = node.getContext("2d");
        for (const sample of events) {
          if (stroke.length >= 4096) { setFull(true); break; }
          const next = point(sample), previous = stroke[stroke.length - 1];
          if (!next) continue;
          stroke.push(next);
          if (context) { context.beginPath(); context.moveTo(previous.x * rect.width, previous.y * rect.height);
            context.lineTo(next.x * rect.width, next.y * rect.height); context.stroke(); }
        }
      }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onPointerLeave={finish}>
      Drawing is unavailable. You can still continue to the knowledge check.
    </canvas>
    <div className="doodle-canvas-actions">
      <button type="button" aria-pressed={!paused} onClick={() => { stop(); setPaused(value => !value); }}>{paused ? "Resume doodling" : "Pause doodling"}</button>
      <button type="button" disabled={!count} onClick={() => { stop(); strokes.current.pop(); setCount(strokes.current.length); setFull(false); redraw(); }}>Undo</button>
      <button type="button" disabled={!count} onClick={() => { stop(); strokes.current.length = 0; setCount(0); setFull(false); redraw(); }}>Clear</button>
    </div>
    {full && <p role="status">Canvas is full. Undo or clear to keep drawing.</p>}
  </section>;
}
