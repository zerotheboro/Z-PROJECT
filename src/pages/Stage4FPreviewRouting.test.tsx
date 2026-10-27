// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Keep the actual HashRouter, profile page, preview adapter and dashboard.
// Unrelated routes and Auth hooks are isolated from production services.
vi.mock("../MIDSECTION/section_of_each_tips.jsx", () => ({ default: () => <p>Home route</p> }));
vi.mock("./Library", () => ({ default: () => null }));
vi.mock("./Training", () => ({ default: () => null }));
vi.mock("./Shorts", () => ({ default: () => null }));
vi.mock("../quiz/Assessment", () => ({ default: () => null }));
vi.mock("../quiz/ChooseMethods", () => ({ default: () => null }));
vi.mock("../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
const latestAuth = vi.hoisted(() => ({ signedIn: false }));
vi.mock("../hooks/useUserProfile", () => ({ useUserProfile: () => ({ user: latestAuth.signedIn ? { uid: "synthetic-latest" } : null,
  learningProfile: latestAuth.signedIn ? { strongestVerifiedMethod: null, preferredMethod: null, recommendedMethods: [], methodEvidence: [],
    baseline: { memoryScore: 0.5, understandingScore: 0.75 }, methodKnowledgeScore: 1, priority: "performance" } : null, loading: false }) }));
const cumulative = vi.hoisted(() => vi.fn(() => ({ uid: null, loading: false, signedOut: true, data: null, error: null, refresh: vi.fn() })));
vi.mock("../hooks/useCumulativeProfile", () => ({ useCumulativeProfile: cumulative }));
vi.mock('../hooks/useManualTrainingHistory', () => ({ useManualTrainingHistory: () => ({ records: [], loading: false, error: null, hasMore: false, loadMore: () => {}, refresh: () => {} }) }));
import AppRouter from "../AppRouter.jsx";

beforeEach(() => {
  latestAuth.signedIn = false;
  vi.stubEnv("DEV", true);
  vi.stubEnv("VITE_CUMULATIVE_PROFILE_PHASE2C", "emulator-only");
  vi.stubEnv("VITE_CUMULATIVE_PROFILE_STAGE4F", "emulator-only");
  vi.stubEnv("VITE_TRAINING_COMPLETION_PHASE2B", "emulator-only");
  vi.stubEnv("VITE_TRAINING_PROTECTED_STAGE4E", "emulator-only");
  vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:18084");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({}, "", "/");
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it("the exact advertised synthetic URL opens the real cumulative dashboard through the full HashRouter", async () => {
  const launcher = readFileSync("scripts/run-stage4f-frontend.mjs", "utf8");
  const advertised = launcher.match(/http:\/\/127\.0\.0\.1:5174\/[#/]?[^\s"']*preview=synthetic/)?.[0];
  expect(advertised).toBe("http://127.0.0.1:5174/#/training/profile?preview=synthetic");
  expect(readFileSync("SCALABILITY_STAGE4F_FRONTEND.md", "utf8")).toContain(advertised);
  const url = new URL(advertised!);
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  render(<AppRouter />);
  // Keep the real lazy route/chunks. Cold Sass/module transforms on Windows
  // can exceed Testing Library's 1s DOM timeout while Emulator tests run.
  await screen.findByRole("heading", { name: "Synthetic student preview" }, { timeout: 10_000 });
  await screen.findByRole("heading", { name: "Your learning, over time" });
  await screen.findByRole("heading", { name: "Learning Overview" });
  for (const section of ["Learning Overview", "Study Method Evidence", "Learning History", "Progress Over Time"])
    expect(screen.getByRole("heading", { name: section })).toBeTruthy();
  expect(screen.queryByText("Home route")).toBeNull();
  expect(cumulative).toHaveBeenCalledWith(false);
  expect(window.location.hash).toBe("#/training/profile?preview=synthetic");
  const sections = screen.getByRole("navigation", { name: "Learning profile sections" });
  for (const [link, heading] of [["History", "Learning History"], ["Progress", "Progress Over Time"]]) {
    fireEvent.click(within(sections).getByRole("link", { name: new RegExp(link) }));
    expect(window.location.hash).toBe("#/training/profile?preview=synthetic");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: heading }));
    expect(screen.queryByText("Home route")).toBeNull();
  }
}, 15_000);

it("keeps the old pathname URL on Home rather than changing the routing architecture", () => {
  window.history.replaceState({}, "", "/training/profile?preview=synthetic");
  render(<AppRouter />);
  expect(screen.getByText("Home route")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Learning Overview" })).toBeNull();
});

it("the actual student HashRouter route renders the redesigned latest profile when cumulative activation is off", async () => {
  vi.stubEnv("VITE_CUMULATIVE_PROFILE_PHASE2C", ""); latestAuth.signedIn = true;
  window.history.replaceState({}, "", "/#/training/profile"); render(<AppRouter />);
  await screen.findByRole("heading", { name: "Your Learning Profile" });
  expect(screen.getByRole("main").classList.contains("profile-latest")).toBe(true);
  expect(screen.getByText(/not your complete Training history/)).toBeTruthy();
  expect(screen.queryByText("Home route")).toBeNull(); expect(screen.queryByRole("heading", { name: "Synthetic student preview" })).toBeNull();
  expect(window.location.hash).toBe("#/training/profile");
  fireEvent.click(within(screen.getByRole("navigation", { name: "Learning profile sections" })).getByRole("link", { name: /Method evidence/ }));
  expect(window.location.hash).toBe("#/training/profile");
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Study Method Evidence" }));
});
