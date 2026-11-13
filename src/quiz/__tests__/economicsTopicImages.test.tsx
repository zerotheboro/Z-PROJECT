// @vitest-environment jsdom
import React from "react";
import { readFileSync, readdirSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { economicsImageRequests, resolveEconomicsImages } from "../economics9708/topicImages";
import { economicsCoverageManifest, requireEconomicsPack } from "../economics9708/packs";
import { mapTopicLearningContent, learningObjectiveId } from "../economics9708/objectives";
import { economicsContentId } from "../economics9708/selection";
import { economicsAssignments } from "../economics9708/allocation";
import { getTrainingContentSet } from "../economics9708/adapter";
import type { EconomicsTemplate } from "../economics9708/adapter";
import { trainingLabContentSets, trainingMatchContentSets } from "../trainingContent";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import BaselineChallenge from "../sections/BaselineChallenge";
import MultipleChoiceRunner from "../engines/shared/MultipleChoiceRunner";
import MappedActivity from "../economics9708/MappedActivity";

import EconomicsTopicImages from "../economics9708/EconomicsTopicImages";

afterEach(cleanup);
const playable = economicsCoverageManifest.filter(t => t.status === "playable");
const assets = Object.fromEntries(economicsImageRequests.map(image => [`../../image/economics9708/${image.filename}`, `/synthetic-assets/${image.filename}`]));
it("maps a unique, optional image inventory to real objectives across all nine playable topics", () => {
  expect(playable).toHaveLength(9);
  expect(economicsImageRequests).toHaveLength(10);
  expect([...new Set(economicsImageRequests.map(i => i.topicId))].sort()).toEqual(playable.map(t => t.id).sort());
  expect(new Set(economicsImageRequests.map(i => i.filename)).size).toBe(economicsImageRequests.length);
  for (const topic of playable) {
    const objectives = mapTopicLearningContent(requireEconomicsPack(topic.id)).objectives;
    const requests = economicsImageRequests.filter(i => i.topicId === topic.id);
    expect(objectives.every(o => requests.some(i => i.objectiveIds.includes(o.id)))).toBe(true);
    for (const image of requests) {
      expect(image.filename).toMatch(new RegExp(`^${topic.id.replace(".", "-")}-[a-z-]+\\.png$`));
      expect(image.objectiveIds.every(id => objectives.some(o => o.id === id))).toBe(true);
      expect(image.alt.length).toBeGreaterThan(25);
    }
  }
});
it.each(playable)("renders no broken image, caption or placeholder when $id files are missing", topic => {
  const ids = mapTopicLearningContent(requireEconomicsPack(topic.id)).objectives.map(o => o.id);
  const page = render(<EconomicsTopicImages topicId={topic.id} objectiveIds={ids} assets={{}} />);
  expect(page.container.innerHTML).toBe("");
});
it("deduplicates the shared PPC illustration without falling back to generic or cross-topic images", () => {
  const ids = [learningObjectiveId("1.5.2"), learningObjectiveId("1.5.4")];
  expect(resolveEconomicsImages("1.5", ids, assets).map(i => i.filename)).toEqual(["1-5-ppc.png"]);
  expect(resolveEconomicsImages("1.5", [learningObjectiveId("2.2.7")], assets)).toEqual([]);
  expect(resolveEconomicsImages("1.5", [], assets)).toEqual([]);
  expect(resolveEconomicsImages("99", ids, assets)).toEqual([]);
  render(<EconomicsTopicImages topicId="1.5" objectiveIds={ids} assets={assets} />);
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(screen.getAllByRole("img").every(image => image.getAttribute("loading") === "lazy" && Boolean(image.getAttribute("alt")))).toBe(true);
});
it("hides a failed supplied file, including its caption, rather than retaining a broken image", () => {
  render(<EconomicsTopicImages topicId="1.5" objectiveIds={[learningObjectiveId("1.5.1")]} assets={assets} />);
  const image = screen.getByRole("img"), alt = image.getAttribute("alt")!;
  fireEvent.error(image);
  expect(screen.queryByRole("img")).toBeNull(); expect(screen.queryByText(alt)).toBeNull();
});
it.each(playable.map(topic => topic.id))("uses real bundled %s PNGs in Baseline study, then removes them during testing", topic => {
  render(<BaselineChallenge contentIds={{ memory: economicsContentId(topic, "memory"), understanding: economicsContentId(topic, "understanding") }} onComplete={vi.fn()} />);
  expect(document.querySelector("img")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start challenge" }));
  expect(document.querySelectorAll(".economics-topic-image img").length).toBeGreaterThan(0);
  expect([...document.querySelectorAll("img")].every(i => i.getAttribute("src")?.includes(topic.replace(".", "-")))).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "I'm ready" }));
  expect(document.querySelector(".economics-topic-images")).toBeNull();
  expect(document.querySelectorAll(".option-grid button")).toHaveLength(4);
});
it("keeps all ten supplied assets as PNGs with their original dimensions and no unmapped PNG files", () => {
  const folder = "src/image/economics9708";
  expect(readdirSync(folder).filter(file => file.endsWith(".png")).sort())
    .toEqual(economicsImageRequests.map(image => image.filename).sort());
  for (const image of economicsImageRequests) {
    const png = readFileSync(`${folder}/${image.filename}`);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1254, 1254]);
  }
});
it.each(playable)("bundles the correct real assets for $id without extra headings", topic => {
  const ids = mapTopicLearningContent(requireEconomicsPack(topic.id)).objectives.map(o => o.id);
  const page = render(<EconomicsTopicImages topicId={topic.id} objectiveIds={ids} />);
  const expected = economicsImageRequests.filter(image => image.topicId === topic.id);
  expect(screen.getAllByRole("img")).toHaveLength(expected.length);
  for (const image of expected) {
    expect(screen.getByRole("img", { name: image.alt }).getAttribute("src")).toContain(image.filename);
  }
  expect(page.container.querySelector("h1, h2, h3, h4")).toBeNull();
});
it("separates PED and YED/XED references without adding unrelated images to the expenditure objective", () => {
  expect(resolveEconomicsImages("2.2", [learningObjectiveId("2.2.1")], assets).map(image => image.filename))
    .toEqual(["2-2-ped.png", "2-2-yed-xed.png"]);
  expect(resolveEconomicsImages("2.2", [learningObjectiveId("2.2.7")], assets).map(image => image.filename))
    .toEqual(["2-2-ped.png"]);
});
it("clarifies the supplied PES picture without modifying its PNG or inferring elasticity from steepness", () => {
  render(<EconomicsTopicImages topicId="2.3" objectiveIds={[learningObjectiveId("2.3.1")]} />);
  expect(screen.getByText(/straight supply lines through the origin have unit elasticity/i)).toBeTruthy();
});
it.each(["lab", "match"] as const)("keeps images in mapped %s study/source review and out of closed-note recall and scored questions", phase => {
  const id = economicsAssignments(["feynman"], phase, "1.5", "mapped-1")[0];
  const sets = phase === "lab" ? trainingLabContentSets.feynman : trainingMatchContentSets.feynman;
  const runtime = getTrainingContentSet<EconomicsTemplate>(sets, id).data.runtime!;
  const scope = `${phase}:feynman:${id}`;
  const activity = (stage: string) => <TrainingProgressStateProvider state={{ [scope]: { slots: [stage], named: {} } }} onChange={() => {}}>
    <TrainingStateScope name={scope}><MappedActivity runtime={runtime}><p>{runtime.materials[0].text}</p></MappedActivity></TrainingStateScope>
  </TrainingProgressStateProvider>;
  const page = render(activity("study")); expect(document.querySelector("img")).not.toBeNull();
  page.rerender(activity("explain")); expect(document.querySelector("img")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check source" })); expect(document.querySelector("img")).not.toBeNull();
  page.rerender(activity("test")); expect(document.querySelector("img")).toBeNull();
  expect(screen.queryByRole("button", { name: "Check source" })).toBeNull();
  page.rerender(activity("retrieval")); expect(document.querySelector("img")).toBeNull();
  expect(screen.queryByRole("button", { name: "Check source" })).toBeNull();
});
it("retains an actual question-specific PPC SVG, labels, options and answer key without reference-image substitution", () => {
  const question = requireEconomicsPack("1.5").lab.find(q => q.diagram)!;
  const original = JSON.stringify(question);
  render(<MultipleChoiceRunner question={question} selectedAnswer={undefined} onSelect={vi.fn()} onBack={vi.fn()}
    backDisabled onNext={vi.fn()} nextLabel="Continue" />);
  const diagram = screen.getByRole("img", { name: question.diagram!.label }); expect(diagram.tagName.toLowerCase()).toBe("svg");
  for (const text of ["Food", "Machines", "PPC", "A", "B", "C"]) expect(diagram.textContent).toContain(text);
  expect(document.querySelector("img")).toBeNull();
  expect([...document.querySelectorAll(".option-grid button")].map(b => b.textContent).sort()).toEqual([...question.options].sort());
  expect(JSON.stringify(question)).toBe(original);
});
it.each(["2.1", "2.5"])("preserves %s market/surplus question figures and their price/quantity labels", topic => {
  const question = requireEconomicsPack(topic).lab.find(q => q.diagram)!;
  const original = JSON.stringify(question);
  render(<MultipleChoiceRunner question={question} selectedAnswer={undefined} onSelect={vi.fn()} onBack={vi.fn()}
    backDisabled onNext={vi.fn()} nextLabel="Continue" />);
  const diagram = screen.getByRole("img", { name: question.diagram!.label });
  for (const label of ["Price", "Quantity", "D", "S"]) expect(diagram.textContent).toContain(label);
  if (question.diagram?.kind === "surplus") { expect(diagram.textContent).toContain("P*"); expect(diagram.textContent).toContain("Q*"); }
  expect(document.querySelector("img")).toBeNull(); expect(JSON.stringify(question)).toBe(original);
});
