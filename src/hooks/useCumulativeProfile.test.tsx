// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";
const mocks = vi.hoisted(() => ({ listener: null as ((user: User | null) => void) | null, read: vi.fn() }));
vi.mock("../services/auth", () => ({ subscribeToAuth: (fn: (u: User | null) => void) => { mocks.listener = fn; return () => {}; } }));
vi.mock("../services/localCumulativeProfile", () => ({ getLocalCumulativeProfileReader: () => mocks.read }));
import { useCumulativeProfile } from "./useCumulativeProfile";
function Harness() { const value = useCumulativeProfile(); return <div>{value.loading ? "Loading" : value.signedOut ? "Signed out" : value.error ?? `Account ${value.uid}: ${value.data?.revision}`}</div>; }
const user = (uid: string) => ({ uid }) as User;
beforeEach(() => { mocks.read.mockReset(); }); afterEach(cleanup);
it("discards a previous account's late read and clears data immediately on logout", async () => {
  let resolve!: (value: CumulativeProfileSnapshot) => void;
  mocks.read.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce({ revision: 2 });
  render(<Harness />); act(() => mocks.listener!(user("first"))); act(() => mocks.listener!(user("second")));
  await screen.findByText("Account second: 2");
  await act(async () => resolve({ revision: 1 } as CumulativeProfileSnapshot));
  expect(screen.queryByText("Account first: 1")).toBeNull();
  act(() => mocks.listener!(null)); expect(screen.getByText("Signed out")).toBeTruthy(); expect(screen.queryByText("Account second: 2")).toBeNull();
});
it("renders a safe permission error without logging private data", async () => {
  const log = vi.spyOn(console, "error"); mocks.read.mockRejectedValue({ code: "permission-denied", privateData: "never log" });
  render(<Harness />); act(() => mocks.listener!(user("first")));
  await screen.findByText(/does not have permission/); expect(log).not.toHaveBeenCalled(); log.mockRestore();
});
it("clears existing data while another account's read is still pending", async () => {
  mocks.read.mockResolvedValueOnce({ revision: 1 }).mockImplementationOnce(() => new Promise(() => {}));
  render(<Harness />); act(() => mocks.listener!(user("first"))); await screen.findByText("Account first: 1");
  act(() => mocks.listener!(user("second"))); await waitFor(() => expect(screen.getByText("Loading")).toBeTruthy());
  expect(screen.queryByText("Account first: 1")).toBeNull();
});
it("withholds previous data and shows the existing safe error when acceptance integrity checks reject a refresh", async () => {
  const log = vi.spyOn(console, "error"), owner = user("first");
  mocks.read.mockResolvedValueOnce({ revision: 1 }).mockRejectedValueOnce({ code: "acceptance_checkpoint_invalid", privateData: "do not display" });
  render(<Harness />); act(() => mocks.listener!(owner)); await screen.findByText("Account first: 1");
  act(() => mocks.listener!(owner));
  await screen.findByText(/Recorded evidence could not be loaded safely/);
  expect(screen.queryByText("Account first: 1")).toBeNull(); expect(screen.queryByText(/do not display/)).toBeNull();
  expect(log).not.toHaveBeenCalled(); log.mockRestore();
});
