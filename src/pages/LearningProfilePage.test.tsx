// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({ enabled: false }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => config.enabled ? {} : null }));
vi.mock("../hooks/useUserProfile", () => ({ useUserProfile: () => ({ user: { uid: "demo" }, learningProfile: {
  strongestVerifiedMethod: null, preferredMethod: null, recommendedMethods: [], methodEvidence: [],
  baseline: { memoryScore: 0.5, understandingScore: 0.75 }, methodKnowledgeScore: 1, priority: "performance"
}, loading: false }) }));
vi.mock("../HEADER/header", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("./CumulativeLearningProfilePage", () => ({ default: () => <h1>Local cumulative view</h1> }));
vi.mock('../hooks/useManualTrainingHistory', () => ({ useManualTrainingHistory: () => ({ records: [], loading: false, error: null, hasMore: false, loadMore: () => {}, refresh: () => {} }) }));
import LearningProfilePage from "./LearningProfilePage";
afterEach(() => { config.enabled = false; cleanup(); });
it("renders the redesigned actual latest-snapshot route when the local cumulative flag is disabled", () => {
  render(<MemoryRouter><LearningProfilePage /></MemoryRouter>); expect(screen.getByRole("heading", { name: "Your Learning Profile" })).toBeTruthy();
  expect(screen.getByText(/not your complete Training history/)).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Learning Overview" })).toBeTruthy();
  expect(screen.queryByText("Local cumulative view")).toBeNull();
});
it("opts into the local view without adding a production route", async () => {
  config.enabled = true; render(<MemoryRouter><LearningProfilePage /></MemoryRouter>); await screen.findByText("Local cumulative view");
});
it("still exposes the latest snapshot with its correct scope in local cumulative mode", () => {
  config.enabled = true; render(<MemoryRouter initialEntries={["/training/profile?view=latest"]}><LearningProfilePage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Your Learning Profile" })).toBeTruthy();
  expect(screen.queryByText("Local cumulative view")).toBeNull();
});
