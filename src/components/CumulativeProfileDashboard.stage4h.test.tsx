// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import { stage4hProfileFixture } from "../../test-support/stage4hProfileFixture";
import { createSyntheticPublishedProfileReader } from "../services/syntheticPublishedProfile";

afterEach(cleanup);
async function loaded(size = 14) {
  const fixture = await stage4hProfileFixture(size);
  const data = await createSyntheticPublishedProfileReader(fixture.request, uid => expect(uid).toBe(fixture.uid), async () => [])(fixture.uid);
  return { fixture, data };
}
function section(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing dashboard section: ${id}`);
  return element;
}
function filters() {
  return within(screen.getByRole("form", { name: "Evidence context filters" }));
}
function selectOption(control: HTMLElement, name: string) {
  const value = within(control).getByRole("option", { name }).getAttribute("value");
  if (value === null) throw new Error(`Missing value for ${name}`);
  fireEvent.change(control, { target: { value } });
}
it("preserves Automatic 3/4 and Manual 1/3 method, score, subject and phase associations through the real reader", async () => {
  const { fixture, data } = await loaded();
  expect(data.history).toHaveLength(14); expect(data.warnings).toEqual([]); expect(data.coverageComplete).toBe(true);
  expect(data.revision).toBeNull(); expect(data.publication).toMatchObject({ acceptedSessions: 14, publishedSessions: 14, pendingSessions: 0, authority: "NOT VERIFIED" });
  expect(new Set(data.history.map(row => `${row.evidence.mode}:${row.evidence.observations.filter(o => o.phase === "lab").length}`)))
    .toEqual(new Set(["auto:3", "auto:4", "manual:1", "manual:3"]));
  for (const row of data.history) expect(row.evidence).toEqual(fixture.history.find(original => original.data.evidence.sessionId === row.evidence.sessionId)!.data.evidence);
  for (const series of data.progress) for (const point of series.points) {
    expect(data.history.some(row => row.evidence.observations.some(o => o.methodId === series.methodId && o.phase === series.group.phase &&
      o.context.subject === series.group.context.subject && o.context.topic === series.group.context.topic &&
      o.completedAt === point.date && o.performance.score === point.score))).toBe(true);
  }
});
it("renders all four named dashboard sections", async () => {
  const { data } = await loaded(4);
  render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  for (const [id, name] of [["learning-overview", "Learning Overview"], ["method-evidence", "Study Method Evidence"],
    ["learning-history", "Learning History"], ["learning-progress", "Progress Over Time"]])
    expect(within(section(id)).getByRole("heading", { level: 2, name })).toBeTruthy();
});
it("expands history and resets its visible count when context filters are cleared", async () => {
  const { data } = await loaded();
  render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  const history = section("learning-history"), controls = filters();
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(10);
  fireEvent.click(within(history).getByRole("button", { name: "Show 10 more history records" }));
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(14);
  selectOption(controls.getByLabelText("Subject"), "Biology");
  selectOption(controls.getByLabelText("Topic"), "Cell transport");
  fireEvent.click(controls.getByRole("button", { name: "Clear filters" }));
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(10);
});
it("filters history and comparable charts by the selected subject and topic", async () => {
  const { data } = await loaded();
  render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  const history = section("learning-history"), controls = filters();
  selectOption(controls.getByLabelText("Subject"), "Biology");
  selectOption(controls.getByLabelText("Topic"), "Cell transport");
  expect(within(history).queryByText(/Probability/)).toBeNull();
  expect(within(section("learning-progress")).getAllByRole("img").every(chart => chart.getAttribute("aria-label")!.includes("Biology"))).toBe(true);
});
it("requires deliberate Reflection disclosure and offers refresh", async () => {
  const { data } = await loaded(4), refresh = vi.fn();
  render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={refresh} /></MemoryRouter>);
  expect(screen.queryByText(/PRIVATE SYNTHETIC REFLECTION/)).toBeNull();
  const details = within(section("learning-history")).getAllByText("View session observations and details")[0].closest("details");
  if (!details) throw new Error("Missing session details");
  details.setAttribute("open", "");
  fireEvent.click(within(details).getByRole("button", { name: "Show private reflection" }));
  expect(within(details).getByText(/PRIVATE SYNTHETIC REFLECTION/)).toBeTruthy();
  fireEvent.click(within(details).getByRole("button", { name: "Hide private reflection" }));
  expect(screen.queryByText(/PRIVATE SYNTHETIC REFLECTION/)).toBeNull();
  const header = section("cumulative-profile-main").querySelector("header");
  if (!header) throw new Error("Missing profile header");
  fireEvent.click(within(header).getByRole("button", { name: "Refresh recorded evidence" })); expect(refresh).toHaveBeenCalledOnce();
});
it("rejects a delayed account change or interrupted page and can retry the identical pinned generation", async () => {
  const { fixture } = await loaded(); let current = fixture.uid;
  const reader = createSyntheticPublishedProfileReader(async path => { const value = await fixture.request(path, 1);
    if (path !== "status") current = "different-synthetic-student"; return value;
  }, uid => { if (uid !== current) throw new Error("Sign-in changed"); }, async () => []);
  await expect(reader(fixture.uid)).rejects.toThrow("Sign-in changed");
  let fail = true;
  const retry = createSyntheticPublishedProfileReader(async path => {
    if (path !== "status" && fail) { fail = false; throw new Error("temporary local transport failure"); }
    return fixture.request(path);
  }, () => {}, async () => []);
  await expect(retry(fixture.uid)).rejects.toThrow("temporary local transport failure");
  const restored = await retry(fixture.uid); expect(restored.history).toHaveLength(14);
  expect(restored.publication?.generationId).toBe(fixture.generationId); expect(restored.warnings).toEqual([]);
});
it("does not recompute unchanged chart date tables when expanding history", async () => {
  const f = await stage4hProfileFixture(32);
  const data = await createSyntheticPublishedProfileReader(f.request, () => {}, async () => [])(f.uid);
  const DateFormatter = Intl.DateTimeFormat;
  const formatter = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function(locales, options) {
    return new DateFormatter(locales, options);
  });
  const mounted = render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  const initialCalls = formatter.mock.calls.length;
  expect(initialCalls).toBeGreaterThan(60); formatter.mockClear();
  const history = section("learning-history");
  fireEvent.click(within(history).getByRole("button", { name: "Show 10 more history records" }));
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(20);
  expect(formatter.mock.calls.length).toBeLessThan(initialCalls / 2);
  formatter.mockRestore();
  const nextFixture = await stage4hProfileFixture(33);
  const next = await createSyntheticPublishedProfileReader(nextFixture.request, () => {}, async () => [])(nextFixture.uid);
  mounted.rerender(<MemoryRouter><CumulativeProfileDashboard data={next} refresh={() => {}} /></MemoryRouter>);
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
    .format(new Date(nextFixture.history[32].data.evidence.completedAt!)) + " UTC";
  expect(within(section("learning-progress")).getAllByText(date).length).toBeGreaterThan(0);
});
