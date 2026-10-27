// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import LatestProfileDashboard from "./LatestProfileDashboard";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import { syntheticProfileSnapshot } from "../services/syntheticProfilePreview";
import { getMethodName } from "../quiz/methodRegistry";
import type { LearningProfile } from "../quiz/type";

afterEach(cleanup);
const latest: LearningProfile = { strongestVerifiedMethod: "active-recall", preferredMethod: "feynman", recommendedMethods: ["active-recall"],
  baseline: { memoryScore: 0.5, understandingScore: 0.75 }, methodKnowledgeScore: 1, priority: "ease",
  methodEvidence: [
    { method: "active-recall", labScore: 0.75, verificationScore: 0.5, labConfidence: 4,
      verificationConfidence: 3, ease: 3, willingnessToUse: 4, evidenceScore: 0.6 },
    { method: "feynman", labScore: 0.5, verificationScore: null, labConfidence: 3,
      verificationConfidence: null, ease: 4, willingnessToUse: 5, evidenceScore: 0.5 }
  ] };

it("redesigns the actual snapshot presentation without inventing cumulative history or a progress score", () => {
  render(<MemoryRouter><LatestProfileDashboard profile={latest} cumulativeAvailable={false} /></MemoryRouter>);
  expect(screen.getByRole("main").classList.contains("profile-latest")).toBe(true);
  expect(within(screen.getByRole("main")).getAllByRole("heading")[0].tagName).toBe("H1");
  for (const name of ["Learning Overview", "Study Method Evidence", "Learning History", "Progress Over Time"])
    expect(screen.getByRole("heading", { name })).toBeTruthy();
  expect(screen.getByText(/not your complete Training history/)).toBeTruthy();
  expect(screen.getByText("Methods in latest Test Me snapshot").nextElementSibling?.textContent).toBe("2");
  expect(screen.getByText(/Methods with verification in latest snapshot: 1/)).toBeTruthy();
  expect(screen.getByText("Not enough comparable results yet.")).toBeTruthy();
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("link", { name: /View cumulative/ })).toBeNull();
});

it("keeps original Lab/verification scores associated with their methods and missing scores unknown", () => {
  render(<MemoryRouter><LatestProfileDashboard profile={latest} cumulativeAvailable /></MemoryRouter>);
  const cards = document.querySelectorAll(".profile-method-card");
  expect(within(cards[0] as HTMLElement).getByRole("heading", { name: "Active Recall" })).toBeTruthy();
  expect(within(cards[0] as HTMLElement).getByText("75%")).toBeTruthy();
  expect(within(cards[0] as HTMLElement).getByText("50%")).toBeTruthy();
  expect(within(cards[1] as HTMLElement).getByText("Not recorded")).toBeTruthy();
  expect(screen.getByRole("link", { name: /View cumulative learning evidence/ }).getAttribute("href")).toBe("/training/profile");
});

it("only compares methods from one existing comparable cohort and updates scores on context selection", () => {
  const data = syntheticProfileSnapshot("student-a");
  render(<MemoryRouter><CumulativeProfileDashboard data={data} refresh={() => {}} /></MemoryRouter>);
  const comparison = screen.getByRole("article", { name: "Comparable method results" });
  const control = within(comparison).getByLabelText("Comparison context") as HTMLSelectElement;
  for (const option of [...control.options]) {
    fireEvent.change(control, { target: { value: option.value } });
    const [groupId] = JSON.parse(option.value) as string[];
    const group = data.summary!.performanceGroups.find(g => g.groupId === groupId)!;
    expect(within(comparison).getByText(`${group.context.subject} / ${group.context.topic} · ${group.phase === "lab" ? "Lab practice" : "Match verification"} · ${group.source === "test-methods" ? "Test Methods" : "Test Me"}`)).toBeTruthy();
    for (const row of within(comparison).getAllByRole("listitem")) {
      const label = row.querySelector(".profile-score-bar span")!.textContent;
      const result = group.results.find(r => getMethodName(r.methodId) === label)!;
      expect(result).toBeTruthy(); expect(within(row).getByText(`${Math.round(result.score * 100)}%`)).toBeTruthy();
      expect(within(row).getByText(`${result.correct} / ${result.total} correct across ${result.sessionCount} sessions`)).toBeTruthy();
    }
  }
  const subject = screen.getByLabelText("Subject"); fireEvent.change(subject, { target: { value: "value:Mathematics" } });
  const filtered = screen.queryByRole("article", { name: "Comparable method results" });
  if (filtered) expect(within(filtered).queryByText(/Biology \/ Cell transport/)).toBeNull();
});

it("withholds comparisons and charts for incomplete coverage without changing authoritative totals", () => {
  const data = syntheticProfileSnapshot("student-a");
  render(<MemoryRouter><CumulativeProfileDashboard data={{ ...data, coverageComplete: false }} refresh={() => {}} /></MemoryRouter>);
  expect(screen.queryByRole("article", { name: "Comparable method results" })).toBeNull(); expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByText("Synthetic session fixtures (not saved)").nextElementSibling?.textContent).toBe("14");
});

it("keeps navigation, timestamps and private reflection intact across student changes", () => {
  const data = syntheticProfileSnapshot("student-a");
  const mounted = render(<MemoryRouter><CumulativeProfileDashboard key="student-a" data={data} refresh={() => {}} /></MemoryRouter>);
  const nav = screen.getByRole("navigation", { name: "Learning profile sections" });
  fireEvent.click(within(nav).getByRole("link", { name: /History/ }));
  expect(within(nav).getByRole("link", { name: /History/ }).getAttribute("aria-current")).toBe("location");
  const reveal = screen.getAllByRole("button", { name: "Show private reflection", hidden: true })[0];
  reveal.closest("details")!.setAttribute("open", ""); fireEvent.click(reveal);
  expect(screen.getByText(/Synthetic private reflection for student-a/)).toBeTruthy();
  mounted.rerender(<MemoryRouter><CumulativeProfileDashboard key="student-b" data={syntheticProfileSnapshot("student-b")} refresh={() => {}} /></MemoryRouter>);
  expect(screen.queryByText(/Synthetic private reflection for student-a/)).toBeNull();
  expect(screen.getByRole("heading", { name: /Test Me.*Oct 10, 2026/ })).toBeTruthy();
});
