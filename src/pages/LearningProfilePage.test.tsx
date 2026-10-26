// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({ enabled: false }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => config.enabled ? {} : null }));
vi.mock("../hooks/useUserProfile", () => ({ useUserProfile: () => ({ user: { uid: "demo" }, learningProfile: {}, loading: false }) }));
vi.mock("../HEADER/header", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("../quiz/sections/Results", () => ({ default: () => <h1>Existing latest snapshot</h1> }));
vi.mock("./CumulativeLearningProfilePage", () => ({ default: () => <h1>Local cumulative view</h1> }));
import LearningProfilePage from "./LearningProfilePage";
afterEach(() => { config.enabled = false; cleanup(); });
it("keeps the current latest-snapshot route unchanged when the local flag is disabled", () => {
  render(<MemoryRouter><LearningProfilePage /></MemoryRouter>); expect(screen.getByText("Existing latest snapshot")).toBeTruthy();
  expect(screen.queryByText("Local cumulative view")).toBeNull();
});
it("opts into the local view without adding a production route", async () => {
  config.enabled = true; render(<MemoryRouter><LearningProfilePage /></MemoryRouter>); await screen.findByText("Local cumulative view");
});
it("still exposes the unchanged latest snapshot in local cumulative mode", () => {
  config.enabled = true; render(<MemoryRouter initialEntries={["/training/profile?view=latest"]}><LearningProfilePage /></MemoryRouter>);
  expect(screen.getByText("Existing latest snapshot")).toBeTruthy();
});
