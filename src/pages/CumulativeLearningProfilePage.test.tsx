// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
import { profileView } from "../quiz/__tests__/cumulativeProfileViewFixtures";
import { completedSession } from "../quiz/__tests__/learningEvidenceFixtures";
const mock = vi.hoisted(() => ({ state: { uid: null as string | null, loading: false, signedOut: true,
  data: null as CumulativeProfileSnapshot | null, error: null as string | null, refresh: vi.fn() } }));
vi.mock("../hooks/useCumulativeProfile", () => ({ useCumulativeProfile: () => mock.state }));
vi.mock("../HEADER/header", () => ({ default: () => <nav><a href="#navigation-target">Main navigation link</a></nav> }));
vi.mock("../MIDSECTION/section_of_each_tips.jsx", () => ({ default: () => null }));
vi.mock("./Library", () => ({ default: () => null }));
vi.mock("./LearningProfilePage", () => ({ default: () => null }));
vi.mock("./Training", () => ({ default: () => null }));
vi.mock("./Shorts", () => ({ default: () => null }));
vi.mock("../quiz/Assessment", () => ({ default: () => null }));
vi.mock("../quiz/ChooseMethods", () => ({ default: () => null }));
import { ScrollToTop } from "../AppRouter.jsx";
import CumulativeLearningProfilePage from "./CumulativeLearningProfilePage";
function Location() { const location = useLocation(); return <output aria-label="Current route">{location.pathname}{location.search}{location.hash}</output>; }
beforeEach(() => {
  Object.assign(mock.state, { uid: null, loading: false, signedOut: true, data: null, error: null });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(cleanup);

it.each(["signed-out", "loading", "error", "recorded"])("moves keyboard activation to main before navigation in the %s state without changing the route", state => {
  if (state === "loading") Object.assign(mock.state, { loading: true, signedOut: false });
  if (state === "error") Object.assign(mock.state, { signedOut: false, error: "Safe synthetic error" });
  if (state === "recorded") Object.assign(mock.state, { uid: "demo", signedOut: false,
    data: { ...profileView([completedSession()]), pending: [], browserStorageVerified: true } });
  render(<MemoryRouter initialEntries={["/training/profile"]}><ScrollToTop /><CumulativeLearningProfilePage /><Location /></MemoryRouter>);
  const skip = screen.getByRole("link", { name: "Skip to learning evidence" }), main = screen.getByRole("main");
  expect(screen.getAllByRole("link", { name: "Skip to learning evidence" })).toHaveLength(1);
  expect(skip.compareDocumentPosition(screen.getByRole("link", { name: "Main navigation link" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(main.getAttribute("tabindex")).toBe("-1");
  skip.focus(); fireEvent.keyDown(skip, { key: "Enter" });
  // Native anchor keyboard activation dispatches a click with detail=0.
  fireEvent.click(skip, { detail: 0 });
  expect(document.activeElement).toBe(main); expect(main.scrollIntoView).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("Current route").textContent).toBe("/training/profile");
});
