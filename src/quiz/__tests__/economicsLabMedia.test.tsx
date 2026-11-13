// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { compile } from "sass";
import DoodleCanvas from "../engines/shared/DoodleCanvas";
import type { DoodleStroke } from "../engines/shared/DoodleCanvas";
import { economicsContentId } from "../economics9708/selection";
import { economicsCoverageManifest } from "../economics9708/packs";
import { getMethodDefinition } from "../methodRegistry";
import { TrainingProgressStateProvider } from "../trainingProgressState";
import type { TrainingInternalState } from "../trainingProgress";
import { economicsAssignments } from "../economics9708/allocation";
import { getTrainingContentSet } from "../economics9708/adapter";
import { trainingLabContentSets } from "../trainingContent";
vi.mock("../../firebase", () => ({ auth: { currentUser: null }, db: {} }));

const original = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext")!;
const context = { setTransform: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() };
beforeEach(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => context });
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON: () => ({}) });
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; pointerType: string;
    constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "mouse";
    }
    getCoalescedEvents() { return [this]; }
  });
});
afterEach(() => { cleanup(); Object.defineProperty(HTMLCanvasElement.prototype, "getContext", original); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(["mouse", "touch", "pen"])("draws %s strokes, keeps resize coordinates, and supports Undo and Clear", pointerType => {
  const strokes = { current: [] as DoodleStroke[] };
  render(<DoodleCanvas strokes={strokes} />);
  const canvas = screen.getByLabelText("Freehand doodling canvas");
  const draw = (id: number) => {
    fireEvent.pointerDown(canvas, { pointerId: id, pointerType, clientX: 40, clientY: 30, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: id, pointerType, clientX: 200, clientY: 150 });
    fireEvent.pointerUp(canvas, { pointerId: id, pointerType });
  };
  draw(1); draw(2);
  expect(strokes.current).toHaveLength(2);
  expect(strokes.current[0]).toEqual([{ x: .1, y: .1 }, { x: .5, y: .5 }]);
  const before = JSON.stringify(strokes.current); fireEvent(window, new Event("resize"));
  expect(JSON.stringify(strokes.current)).toBe(before);
  expect(context.lineTo).toHaveBeenCalledWith(200, 150);
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(strokes.current).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Clear" })); expect(strokes.current).toEqual([]);
  expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true);
});
it("ignores a second pointer and secondary clicks, and handles interrupted strokes", () => {
  const strokes = { current: [] as DoodleStroke[] };
  render(<DoodleCanvas strokes={strokes} />); const canvas = screen.getByLabelText("Freehand doodling canvas");
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 5, clientY: 5, button: 2 }); expect(strokes.current).toEqual([]);
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 5, clientY: 5, button: 0 });
  fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 5, clientY: 5, button: 0 });
  fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 99, clientY: 99 });
  expect(strokes.current).toHaveLength(1); expect(strokes.current[0]).toHaveLength(1);
  fireEvent.pointerCancel(canvas, { pointerId: 1 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 99, clientY: 99 }); expect(strokes.current[0]).toHaveLength(1);
});
it("keeps mapped Economics scribbling beside the complete source and never asks for a drawing description", () => {
  const id = economicsContentId("1.5", "lab-doodle-effect-mapped1");
  const done = vi.fn();
  function Activity() {
    const [state, setState] = React.useState<TrainingInternalState>({});
    return <TrainingProgressStateProvider state={state} onChange={setState}>
      {getMethodDefinition("doodle-effect").renderLab(id, done)}
    </TrainingProgressStateProvider>;
  }
  render(<Activity />);
  fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
  const row = document.querySelector(".doodle-study-layout")!;
  expect(row.firstElementChild?.classList.contains("study-content")).toBe(true);
  expect(row.firstElementChild?.querySelector("img")).toBeTruthy(); expect(row.lastElementChild?.querySelector("canvas")).toBeTruthy();
  const source = getTrainingContentSet(trainingLabContentSets["doodle-effect"], id).data;
  const paragraphs = [...row.querySelectorAll(".economics-study-passage > p")].map(p => p.textContent);
  expect(paragraphs).toEqual(source.material.split(/\n\s*\n/));
  expect(row.querySelectorAll(".economics-study-illustration")).toHaveLength(1);
  const canvas = screen.getByLabelText("Freehand doodling canvas");
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10, button: 0 }); fireEvent.pointerUp(canvas, { pointerId: 1 });
  expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByText(/describe.*doodle|reconstruct.*doodle/i)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Continue to test" }));
  expect(document.querySelector("canvas")).toBeNull();
  expect(screen.getByText("STEP 2 · KNOWLEDGE CHECK")).toBeTruthy();
  expect(done).not.toHaveBeenCalled();
});
it.each(economicsCoverageManifest.filter(t => t.status === "playable"))("retains every assigned $id Doodling note once, in image/passage/pad/action DOM order", topic => {
  const id = economicsAssignments(["doodle-effect"], "lab", topic.id, "mapped-1")[0];
  function Activity() {
    const [state, setState] = React.useState<TrainingInternalState>({});
    return <TrainingProgressStateProvider state={state} onChange={setState}>{getMethodDefinition("doodle-effect").renderLab(id, vi.fn())}</TrainingProgressStateProvider>;
  }
  render(<Activity />); fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
  const image = document.querySelector(".economics-study-illustration")!, passage = document.querySelector(".economics-study-passage")!, pad = document.querySelector("canvas")!;
  const data = getTrainingContentSet(trainingLabContentSets["doodle-effect"], id).data;
  expect([...passage.querySelectorAll(":scope > p")].map(p => p.textContent)).toEqual(data.material.split(/\n\s*\n/));
  expect(image.compareDocumentPosition(passage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(passage.compareDocumentPosition(pad) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(pad.compareDocumentPosition(screen.getByRole("button", { name: "Continue to test" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it.each(economicsCoverageManifest.filter(t => t.status === "playable"))("places $id images inside the actual passage panel, above the action in DOM order", topic => {
  const id = economicsContentId(topic.id, "lab-feynman");
  function Activity() {
    const [state, setState] = React.useState<TrainingInternalState>({});
    return <TrainingProgressStateProvider state={state} onChange={setState}>
      {getMethodDefinition("feynman").renderLab(`${id}-mapped1`, vi.fn())}
    </TrainingProgressStateProvider>;
  }
  render(<Activity />);
  fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
  const layout = document.querySelector(".economics-study-layout")!;
  expect(layout.closest(".study-content")).toBeTruthy();
  expect(layout.firstElementChild?.classList.contains("economics-study-illustration")).toBe(true);
  expect(layout.querySelectorAll("img")).toHaveLength(topic.id === "2.2" ? 2 : 1);
  expect(document.querySelectorAll("img").length).toBe(layout.querySelectorAll("img").length);
  const action = screen.getByRole("button", { name: "I'm ready" });
  expect(layout.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(document.querySelector("canvas")).toBeNull();
  fireEvent.click(action); expect(document.querySelector(".economics-study-layout")).toBeNull();
});
it.each(["active-recall", "two-x-video-speed"] as const)("does not add a doodle canvas to %s", method => {
  const definition = getMethodDefinition(method), id = definition.labContentSetIds.find(id => !id.startsWith("ec9708-"))!;
  render(definition.renderLab(id, vi.fn()));
  fireEvent.click(screen.getByRole("button", { name: method === "active-recall" ? "Start experiment" : "Start 2x playback" }));
  expect(document.querySelector("canvas")).toBeNull(); expect(screen.queryByRole("region", { name: "Doodling workspace" })).toBeNull();
});
it("scopes responsive order and touch-scroll prevention without changing the brand palette", () => {
  const css = compile("src/quiz/TrainingExperience.scss").css;
  expect(css).toContain('grid-template-areas: "passage illustration"');
  expect(css).toContain('grid-template-areas: "illustration" "passage"');
  expect(css).toContain("touch-action: none"); expect(css).toContain(".doodle-study-layout");
  expect(css).toContain("grid-template-columns: minmax(0, 2fr) minmax(0, 1fr)");
  expect(css).toContain("width: min(32%, 13rem)");
  expect(css).toContain("max-height: 10rem");
  expect(css).toContain("clear: both");
});

it("draws desktop cursor movements without mouse pressure, stops at the pad edge, and can pause", () => {
  const strokes = { current: [] as DoodleStroke[] };
  render(<DoodleCanvas strokes={strokes} />);
  const pad = screen.getByLabelText("Freehand doodling canvas");
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 20, clientY: 30 });
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 100, clientY: 150 });
  expect(strokes.current[0]).toEqual([{ x: .05, y: .1 }, { x: .25, y: .5 }]);
  fireEvent.pointerLeave(pad, { pointerId: 1, pointerType: "mouse" });
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 450, clientY: 150 });
  expect(strokes.current).toHaveLength(1);
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 10, clientY: 10 });
  expect(strokes.current).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Pause doodling" }));
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 100, clientY: 150 });
  expect(strokes.current).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Resume doodling" }));
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 40, clientY: 40 });
  expect(strokes.current).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(strokes.current).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Clear" })); expect(strokes.current).toHaveLength(0);
});
it.each(["touch", "pen"])("does not draw %s hover or connect points outside the pad", pointerType => {
  const strokes = { current: [] as DoodleStroke[] };
  render(<DoodleCanvas strokes={strokes} />); const pad = screen.getByLabelText("Freehand doodling canvas");
  fireEvent.pointerMove(pad, { pointerId: 2, pointerType, clientX: 50, clientY: 50 });
  expect(strokes.current).toHaveLength(0);
  fireEvent.pointerDown(pad, { pointerId: 2, pointerType, button: 0, clientX: 50, clientY: 50 });
  fireEvent.pointerMove(pad, { pointerId: 2, pointerType, clientX: 500, clientY: 50 });
  expect(strokes.current[0]).toHaveLength(1);
});
