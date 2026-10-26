// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SyntheticProfilePreview from "./SyntheticProfilePreview";

afterEach(cleanup);
const mount = () => render(<MemoryRouter><SyntheticProfilePreview /></MemoryRouter>);
it("renders accepted unpublished fixtures, paginates, filters subjects/topics and clears stale displays on student changes", async () => {
  mount(); await screen.findByText("Showing 10 of 14 readable history records.");
  expect(screen.getByText(/fixtures, not actual backend acceptances/)).toBeTruthy();
  expect(screen.getByLabelText("Acceptance and publication status").textContent).toContain("Not published");
  fireEvent.click(screen.getByRole("button", { name: "Show 10 more history records" }));
  expect(screen.getByText("Showing 14 of 14 readable history records.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "value:Mathematics" } });
  expect(screen.getByText("Showing 4 of 4 readable history records matching these filters.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "value:Probability" } });
  expect(screen.getByText("Showing 4 of 4 readable history records matching these filters.")).toBeTruthy();
  const history = screen.getByRole("heading", { name: "Learning History" }).parentElement!;
  expect(within(history).queryByText(/Cell transport/)).toBeNull();
  fireEvent.change(screen.getByLabelText("Synthetic student"), { target: { value: "student-b" } });
  expect(screen.queryByText("Showing 4 of 4 readable history records matching these filters.")).toBeNull();
  await screen.findByText("Showing 1 of 1 readable history records."); expect(screen.getByLabelText("Subject").getAttribute("value")).toBeNull();
});
it("supports empty, delayed, unavailable and malformed states without stale private disclosures", async () => {
  mount(); await screen.findByText("Showing 10 of 14 readable history records.");
  fireEvent.change(screen.getByLabelText("Synthetic student"), { target: { value: "empty" } });
  await screen.findByText("No readable completed history yet.");
  fireEvent.change(screen.getByLabelText("Preview response"), { target: { value: "delayed" } });
  expect(screen.getByRole("status").textContent).toContain("Loading synthetic");
  fireEvent.change(screen.getByLabelText("Preview response"), { target: { value: "error" } });
  await screen.findByRole("alert"); expect(screen.queryByText("No readable completed history yet.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry preview" })); await screen.findByText("No readable completed history yet.");
  fireEvent.change(screen.getByLabelText("Synthetic student"), { target: { value: "malformed" } });
  await screen.findByText(/Preview totals and progress are unavailable/); expect(screen.queryByRole("img")).toBeNull();
});
it("clears revealed Reflection, pagination and filters on refresh or synthetic owner switching", async () => {
  mount(); await screen.findByText("Showing 10 of 14 readable history records.");
  const reveal = screen.getAllByRole("button", { name: "Show private reflection" })[0]; fireEvent.click(reveal);
  expect(screen.getByText(/Synthetic private reflection for student-a/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refresh recorded evidence" }));
  expect(screen.queryByText(/Synthetic private reflection for student-a/)).toBeNull();
  await screen.findByText("Showing 10 of 14 readable history records.");
  expect(screen.queryByText(/Synthetic private reflection for student-a/)).toBeNull();
  fireEvent.change(screen.getByLabelText("Synthetic student"), { target: { value: "student-b" } });
  expect(screen.queryByText("Showing 10 of 14 readable history records.")).toBeNull();
  await screen.findByText("Showing 1 of 1 readable history records.");
});
