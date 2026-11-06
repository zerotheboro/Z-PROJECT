// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";

let library: typeof import("./info_every_tips.jsx");
beforeAll(async () => {
  vi.stubGlobal("React", React);
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  });
  library = await import("./info_every_tips.jsx");
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

function restTip() {
  const section = library.get_list_of_tips([], vi.fn()).find(section => section.type === "META-LEARN")!;
  return section.list.find(tip => tip.header.eng === "Post-Learning Rest")!;
}

it("renders wakeful rest, six practical steps and optional relaxation with the existing asset", () => {
  const tip = restTip();
  const { container } = render(tip.paragraph.eng);
  expect(tip.side).toBe("left");
  expect(tip.asset.src).toBe(tip.header.src);
  expect(tip.asset.src).toBe(library.image_importor("whale").src);
  expect(screen.getByRole("heading", { name: "What it is" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Why it may help" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Optional: Relaxation routine if you want to nap" })).toBeTruthy();
  const lists = screen.getAllByRole("list");
  expect(lists.map(list => list.querySelectorAll("li").length)).toEqual([6, 6]);
  const text = container.textContent!.replace(/\s+/g, " ");
  expect(text).toContain("Keep your eyes open or closed, whichever feels comfortable.");
  expect(text).toContain("not a proven optimal duration");
  expect(text).toContain("two-minute sleep claim is not scientifically validated");
  expect(text).toContain("without forcing or holding your breath");
  expect(text).toContain("If you remain awake, quiet rest still counts");
  expect(text).toContain("13–18 generally need 8–10 hours");
  expect(text).toContain("Relaxation guidance does not prove that the military sleep method improves memory");
  expect(container.querySelector('[id="Sleep After Studying"]')).toBeTruthy();
});

it("links each explanation to the four reviewed references", () => {
  render(restTip().paragraph.eng);
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual([
    "https://pubmed.ncbi.nlm.nih.gov/40087245/",
    "https://health.clevelandclinic.org/military-sleep-method",
    "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/how-can-meditation-help-with-sleep/",
    "https://www.cdc.gov/yrbs/youth-health-in-focus/sleep.html"
  ]);
});

it("renders citations 35–40 with the intended sources and qualified explanations", () => {
  const tips = library.get_list_of_tips([], vi.fn()).filter(section => section.type !== "YOUR-SYSTEM").flatMap(section => section.list);
  const prime = tips.find(tip => tip.header.eng === "Prime question")!;
  const calm = tips.find(tip => tip.header.eng === "Calm Start")!;
  const { container } = render(<>{prime.paragraph.eng}{calm.paragraph.eng}{restTip().paragraph.eng}</>);
  expect(Array.from(container.querySelectorAll("a.cite"), link => [link.textContent, link.getAttribute("href")])).toEqual([
    ["(³⁵)", "https://pubmed.ncbi.nlm.nih.gov/37012694/"],
    ["(³⁶)", "https://pubmed.ncbi.nlm.nih.gov/40980898/"],
    ["(³⁷)", "https://pubmed.ncbi.nlm.nih.gov/40087245/"],
    ["(³⁸)", "https://health.clevelandclinic.org/military-sleep-method"],
    ["(³⁹)", "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/how-can-meditation-help-with-sleep/"],
    ["(⁴⁰)", "https://www.cdc.gov/yrbs/youth-health-in-focus/sleep.html"]
  ]);
  const text = container.textContent!.replace(/\s+/g, " ");
  expect(text).toContain("Why can inflation fall while prices are still rising?");
  expect(text).toContain("does not prove that this particular Edulience routine improves grades");
  expect(text).toContain("very low certainty of evidence");
  expect(text).toContain("did not establish the effects of this specific brief routine");
  const { container: moreInfo } = render(prime.more_info);
  expect(moreInfo.querySelector('textarea[name="prime-question"]')).toBeTruthy();
});

it("resolves legacy customized names without rewriting storage or adding another library method", () => {
  const original = JSON.stringify(["Sleep After Studying"]);
  localStorage.setItem("customize_user_list", original);
  const loaded = library.loadcustomized_user_list();
  expect(loaded).toHaveLength(1);
  expect(loaded[0]).toBe(restTip());
  expect(localStorage.getItem("customize_user_list")).toBe(original);
  const methods = library.get_list_of_tips([], vi.fn()).filter(section => section.type !== "YOUR-SYSTEM").flatMap(section => section.list);
  expect(methods.filter(tip => tip.header.eng === "Post-Learning Rest")).toHaveLength(1);
  expect(methods.some(tip => tip.header.eng === "Sleep After Studying")).toBe(false);
});
