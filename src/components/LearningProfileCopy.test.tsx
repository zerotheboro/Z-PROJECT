// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import LatestProfileDashboard from "./LatestProfileDashboard";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import type { ManualPracticeState } from "./ManualPracticeHistory";
import { savedProfileConsistencyFixture } from "../../test-support/savedProfileConsistencyFixture";
import { completedSession } from "../quiz/__tests__/learningEvidenceFixtures";
import { profileView } from "../quiz/__tests__/cumulativeProfileViewFixtures";

const explanation = "Your practice sessions are saved. As you complete more comparable assessments, your progress trends will appear here.";
const historyExplanation = "Your available Test Me and individual practice history appears here. Some older records may contain less detail.";
afterEach(cleanup);

function latest(overrides: Partial<ManualPracticeState> = {}) {
  const fixture = savedProfileConsistencyFixture();
  const manual: ManualPracticeState = { uid: "consistency-student", records: fixture.records, assessments: fixture.page.assessments,
    loading: false, error: null, hasMore: false, loadMore: vi.fn(), refresh: vi.fn(), ...overrides };
  render(<MemoryRouter><LatestProfileDashboard profile={fixture.profile} manual={manual} cumulativeAvailable={false} /></MemoryRouter>);
}

it("uses simple student copy on the saved profile without changing counts, source labels or chart eligibility", () => {
  latest();
  const overview = within(screen.getByRole("region", { name: "Learning Overview" }));
  for (const [label, count] of [["Saved Test Me assessments (loaded)", "1"], ["Individual practice sessions (loaded)", "2"], ["Task observations in loaded history", "10"]])
    expect(overview.getByText(label).nextElementSibling?.textContent).toBe(count);
  const progress = within(screen.getByRole("region", { name: "Progress Over Time" }));
  expect(progress.getByRole("heading", { name: "Not enough comparable results yet." })).toBeTruthy();
  expect(progress.getByText(explanation)).toBeTruthy();
  expect(progress.getByText("10 observations recorded")).toBeTruthy();
  expect(progress.queryByText(/sessions recorded/)).toBeNull();
  expect(progress.queryByRole("img")).toBeNull();
  expect(screen.getByText(historyExplanation)).toBeTruthy();
  expect(screen.queryByText(/excluded from progress charts|scoring versions|question exposure|loaded, validated source records|All readable source pages/)).toBeNull();
  expect(overview.queryByText(/Latest Test Me snapshot only:|memory baseline/i)).toBeNull();
  // Retain the original values once, inside the existing assessment disclosure.
  expect(screen.getByText("Memory baseline: 50%. Understanding baseline: 50%.").closest("details")?.open).toBe(false);
  expect(screen.getByText("Methods with verification in latest snapshot: 2.").closest("details")?.open).toBe(false);
  const history = screen.getByRole("region", { name: "Saved Training history" });
  expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(3);
  expect(within(history).getAllByText("SAVED INDIVIDUAL PRACTICE · LEGACY")).toHaveLength(2);
  expect(within(history).getByText("SAVED TEST ME ASSESSMENT · LEGACY SNAPSHOT")).toBeTruthy();
});

it.each([
  { hasMore: true }, { loading: true }, { error: "Some history could not be loaded." }, { ownerUid: "another-student" }
])("does not present an unconfirmed observation total for incomplete or wrong-owner history: %j", overrides => {
  latest(overrides);
  const progress = within(screen.getByRole("region", { name: "Progress Over Time" }));
  expect(progress.getByText(explanation)).toBeTruthy();
  expect(progress.queryByText(/\d+ observations recorded/)).toBeNull();
  expect(progress.queryByRole("img")).toBeNull();
});

it("simplifies the cumulative empty state while retaining authoritative counts and withholding incomplete comparisons", () => {
  const view = profileView([completedSession()]);
  const props = { data: { ...view, pending: [], browserStorageVerified: true }, refresh: vi.fn() };
  const mounted = render(<MemoryRouter><CumulativeProfileDashboard {...props} /></MemoryRouter>);
  const progress = () => within(screen.getByRole("region", { name: "Progress Over Time" }));
  expect(progress().getByText("Not enough comparable results yet.")).toBeTruthy();
  expect(progress().getByText(explanation)).toBeTruthy();
  expect(progress().getByText(`${view.summary!.observationCount} observations recorded`)).toBeTruthy();
  expect(screen.getByText(historyExplanation)).toBeTruthy();
  expect(progress().queryByText(/scoring version|exposure conditions|bounded projection/)).toBeNull();
  expect(progress().queryByRole("img")).toBeNull();
  mounted.rerender(<MemoryRouter><CumulativeProfileDashboard {...props} data={{ ...props.data, coverageComplete: false }} /></MemoryRouter>);
  expect(progress().queryByText(/\d+ observations recorded/)).toBeNull();
  expect(progress().queryByRole("img")).toBeNull();
  expect(screen.getByText("Recorded completed sessions").nextElementSibling?.textContent).toBe("1");
});

it("leaves existing comparable progress series and their exact table values unchanged", () => {
  const sessions = [0, 1, 2].map(i => completedSession({ id: `copy-check-${i}`, correct: i + 1, date: `2026-10-${19 + i}T10:00:00Z` }));
  const view = profileView(sessions);
  render(<MemoryRouter><CumulativeProfileDashboard data={{ ...view, pending: [], browserStorageVerified: true }} refresh={vi.fn()} /></MemoryRouter>);
  const progress = within(screen.getByRole("region", { name: "Progress Over Time" }));
  expect(progress.getAllByRole("img")).toHaveLength(view.progress.length);
  expect(progress.getAllByRole("table")).toHaveLength(view.progress.length);
  expect(progress.queryByText("Not enough comparable results yet.")).toBeNull();
  for (const series of view.progress) for (const point of series.points)
    expect(progress.getAllByText(`${Math.round(point.score! * 100)}%`).length).toBeGreaterThan(0);
});
