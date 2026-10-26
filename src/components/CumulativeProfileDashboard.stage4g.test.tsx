// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import { syntheticProfileSnapshot } from "../services/syntheticProfilePreview";
afterEach(cleanup);
it("distinguishes synthetic publication and accepted pending work without claiming production authority", () => {
  const { preview: _, ...data } = syntheticProfileSnapshot("student-a");
  render(<MemoryRouter><CumulativeProfileDashboard refresh={() => {}} data={{ ...data,
    publication: { kind: "synthetic-emulator-publication", authority: "NOT VERIFIED", publication: "published", generationId: "e".repeat(64),
      acceptedSessions: 16, publishedSessions: 14, pendingSessions: 2, publishedAt: "2026-10-26T10:00:00Z" } }} /></MemoryRouter>);
  for (const name of ["Learning Overview", "Study Method Evidence", "Learning History", "Progress Over Time"]) expect(screen.getByRole("heading", { name })).toBeTruthy();
  expect(screen.getByRole("complementary", { name: "Synthetic publication status" }).textContent).toContain("16 durably accepted sessions; 14 included");
  expect(screen.getByText(/This is not a real student publication/)).toBeTruthy();
  expect(screen.queryByText(/Synthetic private reflection for/)).toBeNull();
  expect(screen.queryByText(/aggregation pending; no published generation/)).toBeNull();
});
