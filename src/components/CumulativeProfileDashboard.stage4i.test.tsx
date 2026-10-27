// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import { syntheticProfileSnapshot } from "../services/syntheticProfilePreview";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("reuses unchanged history transformations for pagination and recomputes context filters", () => {
  const data = syntheticProfileSnapshot("student-a"), transform = vi.spyOn(data.history, "flatMap");
  render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  const initial = transform.mock.calls.length; expect(initial).toBe(1);
  const history = screen.getByRole("heading", { name: "Learning History" }).closest("section")!;
  fireEvent.click(within(history).getByRole("button", { name: "Show 10 more history records" }));
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(14);
  expect(transform).toHaveBeenCalledTimes(initial);
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "value:Mathematics" } });
  fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "value:Probability" } });
  expect(within(history).queryByText(/Cell transport/)).toBeNull();
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(10);
});

it("updates reused chart keys and method records for new immutable data without revealing Reflection", () => {
  const data = syntheticProfileSnapshot("student-a");
  const mounted = render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  const progress = screen.getByRole("heading", { name: "Progress Over Time" }).closest("section")!;
  const previous = within(progress).getAllByRole("table").map(table => table.textContent);
  const next = { ...data, progress: data.progress.map(series => ({ ...series,
    points: series.points.map(point => ({ ...point, score: 0.125, correct: 1, total: 8 })) })) };
  mounted.rerender(<MemoryRouter><CumulativeProfileDashboard data={next} refresh={() => {}} /></MemoryRouter>);
  const tables = within(progress).getAllByRole("table");
  expect(tables.map(table => table.textContent)).not.toEqual(previous);
  for (const table of tables) for (const row of table.querySelectorAll("tbody tr")) expect(row.lastElementChild?.textContent).toBe("13%");
  expect(screen.queryByText(/Synthetic private reflection for/)).toBeNull();
});
