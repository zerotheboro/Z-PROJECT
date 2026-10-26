// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { syntheticProfileSnapshot } from "../services/syntheticProfilePreview";
const mocks = vi.hoisted(() => ({ enabled: true, publish: vi.fn(), refresh: vi.fn() }));
vi.mock("../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock("../services/localCumulativeProfileConfig", () => ({ localCumulativeProfileConfig: () => mocks.enabled ? { syntheticPublished: true } : null }));
vi.mock("../hooks/useCumulativeProfile", () => ({ useCumulativeProfile: () => ({ uid: "synthetic", loading: false, signedOut: false, error: null,
  data: syntheticProfileSnapshot("student-b"), refresh: mocks.refresh, publishSynthetic: mocks.publish }) }));
import CumulativeLearningProfilePage from "./CumulativeLearningProfilePage";
beforeEach(() => { mocks.enabled = true; mocks.publish.mockReset(); mocks.refresh.mockReset(); });
afterEach(cleanup);
const mount = () => render(<MemoryRouter><CumulativeLearningProfilePage /></MemoryRouter>);
it("only exposes the action inside the explicit local boundary", () => {
  mocks.enabled = false; mount(); expect(screen.queryByRole("button", { name: "Aggregate and publish synthetic profile" })).toBeNull();
});
it("blocks duplicate clicks and refreshes only after a confirmed publication response", async () => {
  let resolve!: () => void; mocks.publish.mockImplementation(() => new Promise<void>(r => { resolve = r; })); mount();
  fireEvent.click(screen.getByRole("button", { name: "Aggregate and publish synthetic profile" }));
  const busy = screen.getByRole("button", { name: "Verifying synthetic generation..." }); expect(busy.hasAttribute("disabled")).toBe(true);
  fireEvent.click(busy); expect(mocks.publish).toHaveBeenCalledTimes(1); expect(mocks.refresh).not.toHaveBeenCalled();
  await act(async () => resolve()); expect(mocks.refresh).toHaveBeenCalledOnce();
});
it("shows an accurate failed-publication state while retaining accepted evidence", async () => {
  mocks.publish.mockRejectedValue(new Error("local rejected")); mount();
  fireEvent.click(screen.getByRole("button", { name: "Aggregate and publish synthetic profile" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Accepted evidence remains recorded"));
  expect(mocks.refresh).not.toHaveBeenCalled(); expect(screen.getByRole("heading", { name: "Learning History" })).toBeTruthy();
});
