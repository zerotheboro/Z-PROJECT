// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { compileString } from "sass";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import LatestProfileDashboard from "./LatestProfileDashboard";
import type { ManualPracticeState } from "./ManualPracticeHistory";
import { savedProfileConsistencyFixture } from "../../test-support/savedProfileConsistencyFixture";

afterEach(cleanup);
function mount(count = 2) {
  const fixture = savedProfileConsistencyFixture();
  const manual: ManualPracticeState = { uid: "consistency-student", records: fixture.records.slice(0, count), assessments: fixture.page.assessments,
    loading: false, error: null, hasMore: false, loadMore: vi.fn(), refresh: vi.fn() };
  render(<MemoryRouter><LatestProfileDashboard profile={fixture.profile} manual={manual} cumulativeAvailable={false} /></MemoryRouter>);
  const card = screen.getByRole("article", { name: "Active Recall evidence" });
  const summary = within(card).getByText(`${count} saved individual practice session${count === 1 ? "" : "s"}`, { selector: "summary" });
  const details = summary.closest("details")!;
  return { manual, card, summary, details };
}

it("collapses individual practice by default and toggles all saved attempts without altering results or timestamps", () => {
  const { manual, card, summary, details } = mount();
  const original = JSON.stringify(manual.records);
  const content = within(card).getByRole("region", { name: "Legacy individual practice results" });
  // jsdom role queries do not model the closed-details rendering boundary.
  // Check native state and containment rather than claiming layout visibility.
  expect(details.open).toBe(false);
  expect(details.hasAttribute("open")).toBe(false);
  expect(content.closest("details")).toBe(details);
  fireEvent.click(summary);
  expect(details.open).toBe(true);
  const practice = within(within(card).getByRole("region", { name: "Legacy individual practice results" }));
  expect(practice.getAllByRole("listitem")).toHaveLength(2);
  for (const score of ["25%", "50%", "75%", "100%"]) expect(practice.getByText(score)).toBeTruthy();
  expect(practice.getByText(/Oct 20, 2026, 9:00 AM UTC/)).toBeTruthy();
  expect(practice.getByText(/Oct 21, 2026, 9:00 AM UTC/)).toBeTruthy();
  fireEvent.click(summary);
  expect(details.open).toBe(false);
  expect(details.hasAttribute("open")).toBe(false);
  expect(details.contains(content)).toBe(true);
  fireEvent.click(summary);
  expect(within(card).getByRole("region", { name: "Legacy individual practice results" })).toBe(content);
  expect(JSON.stringify(manual.records)).toBe(original);
  expect(manual.refresh).not.toHaveBeenCalled();
  expect(manual.loadMore).not.toHaveBeenCalled();
  expect(screen.queryByText(/PRIVATE consistency-student/)).toBeNull();
});

it("uses the same native, keyboard-focusable disclosure contract as Test Me", () => {
  const { card, summary, details } = mount(1);
  const testMeSummary = within(card).getByText("1 saved Test Me assessment record (loaded)", { selector: "summary" });
  expect(details.className).toBe(testMeSummary.parentElement!.className);
  expect(details.firstElementChild).toBe(summary);
  expect(details.hasAttribute("open")).toBe(false);
  // Native summary provides Enter/Space activation. Do not replace it with a
  // custom role or cancel keyboard defaults; jsdom does not emulate that UA action.
  expect(summary.getAttribute("role")).toBeNull();
  expect(summary.getAttribute("tabindex")).toBeNull();
  summary.focus();
  expect(document.activeElement).toBe(summary);
  for (const key of ["Enter", " "]) {
    expect(fireEvent.keyDown(summary, { key })).toBe(true);
    expect(fireEvent.keyUp(summary, { key })).toBe(true);
    expect(document.activeElement).toBe(summary);
  }
  fireEvent.click(summary);
  expect(details.open).toBe(true);
  expect(testMeSummary.parentElement!.hasAttribute("open")).toBe(false);
});

it("keeps profile disclosure arrows and suppresses the global summary divider pseudo-elements", () => {
  const { css } = compileString(readFileSync("src/components/CumulativeProfile.scss", "utf8"));
  expect(css).toMatch(/\.cumulative-profile summary\s*\{[^}]*display: list-item;[^}]*list-style: disclosure-closed inside;/);
  expect(css).toMatch(/\.cumulative-profile details\[open\] > summary\s*\{[^}]*list-style-type: disclosure-open;/);
  expect(css).toMatch(/\.cumulative-profile summary::before, \.cumulative-profile summary::after\s*\{[^}]*content: none;[^}]*display: none;[^}]*width: 0;[^}]*height: 0;/);
});
