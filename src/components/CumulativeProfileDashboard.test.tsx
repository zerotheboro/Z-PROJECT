// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import CumulativeProfileDashboard from "./CumulativeProfileDashboard";
import { completedSession, evidenceOwner, legacyAssessment, sessionInput } from "../quiz/__tests__/learningEvidenceFixtures";
import { createCompletedSessionEvidence } from "../quiz/learningEvidence";
import { profileView, savedEvidence, summaryFor } from "../quiz/__tests__/cumulativeProfileViewFixtures";
import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";
import type { CumulativeProfileSnapshot } from "../services/cumulativeProfileReader";

afterEach(cleanup);
function data(): CumulativeProfileSnapshot { return { ...profileView([completedSession()]), pending: [], browserStorageVerified: true }; }
const mount = (snapshot = data()) => render(<MemoryRouter><CumulativeProfileDashboard data={snapshot} refresh={vi.fn()} /></MemoryRouter>);
it("renders four named, navigable sections and descriptive non-ranking results", () => {
  mount();
  for (const title of ["Learning Overview", "Study Method Evidence", "Learning History", "Progress Over Time"]) expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Learning profile sections" })).toBeTruthy();
  expect(screen.getByText("More comparable learning sessions are needed to assess progress.", { selector: ".cumulative-notice p" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "View latest assessment snapshot" }).getAttribute("href")).toBe("/training/profile?view=latest");
});
it("keeps private Reflection out of the DOM until explicit reveal", () => {
  const session = completedSession();
  const view = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([session]), [savedEvidence(session, { schemaVersion: 1,
    methodIntroduction: { correct: 1, total: 1, score: 1 }, reflection: { reflectionText: "VERY PRIVATE SYNTHETIC REFLECTION", surprisedByResults: true } })], []);
  mount({ ...view, pending: [], browserStorageVerified: true });
  expect(screen.queryByText("VERY PRIVATE SYNTHETIC REFLECTION")).toBeNull();
  const sessionDetails = screen.getByText("View session observations and details").parentElement!;
  sessionDetails.setAttribute("open", "");
  fireEvent.click(within(sessionDetails).getByRole("button", { name: "Show private reflection" }));
  expect(screen.getByText("VERY PRIVATE SYNTHETIC REFLECTION")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Hide private reflection" })); expect(screen.queryByText("VERY PRIVATE SYNTHETIC REFLECTION")).toBeNull();
});
it("distinguishes pending browser-only work, acknowledgment and unverified storage", () => {
  mount({ ...data(), pending: [{ sessionId: "pending", acknowledged: false, legacy: false }, { sessionId: "ack", acknowledged: true, legacy: false }] });
  expect(screen.getByText("Browser checkpoint saved; backend acknowledgment is not confirmed.")).toBeTruthy();
  expect(screen.getByText("Backend acknowledgment saved; activity or cleanup is pending.")).toBeTruthy();
  expect(screen.getByText(/Browser-only checkpoints are not added/)).toBeTruthy(); cleanup();
  mount({ ...data(), browserStorageVerified: false }); expect(screen.getByText(/Browser recovery storage could not be verified/)).toBeTruthy();
});
it("gives a non-invented empty state and keeps the latest snapshot accessible", () => {
  mount({ ...buildCumulativeProfileView(evidenceOwner.uid, null, [], []), pending: [], browserStorageVerified: true });
  expect(screen.getByText(/No server-recorded cumulative profile yet/)).toBeTruthy();
  expect(screen.getByText("No readable completed history yet.")).toBeTruthy();
  expect(screen.getAllByText("Not available")).toHaveLength(2);
});
it("offers accessible SVG names and exact table alternatives only for comparable series", () => {
  const sessions = [0, 1, 2].map(i => completedSession({ id: `plot-${i}`, date: `2026-10-${19 + i}T10:00:00Z`, correct: i + 1 }));
  mount({ ...profileView(sessions), pending: [], browserStorageVerified: true });
  const charts = screen.getAllByRole("img"); expect(charts.length).toBeGreaterThan(0);
  expect(charts.every(chart => chart.getAttribute("aria-label")?.includes("Exact values follow"))).toBe(true);
  expect(screen.getAllByRole("table").length).toBe(charts.length);
  expect(screen.getAllByRole("columnheader").some(header => header.textContent === "Task accuracy")).toBe(true);
  expect(screen.getAllByText(/does not show that a learning method caused/).length).toBe(charts.length);
});

it("distinguishes chart and table names across subjects, topics, methods and comparison phases", () => {
  const sessions = Array.from({ length: 9 }, (_, i) => {
    const subject = i < 6 ? "Biology" : "Mathematics";
    const topic = i < 3 ? "Cell transport" : i < 6 ? "Genetics" : "Probability";
    const input = sessionInput({ id: `chart-context-${i}`, methods: ["active-recall", "feynman"],
      correct: 1 + i % 3, date: new Date(Date.UTC(2026, 9, 10 + i)).toISOString() });
    return createCompletedSessionEvidence({ ...input, metadata: input.metadata!.map(item => ({ ...item,
      context: { ...item.context, subject, topic, exerciseTopic: topic, contentSetId: `${topic}-${item.phase}` } })) });
  });
  mount({ ...profileView(sessions), pending: [], browserStorageVerified: true });
  const charts = screen.getAllByRole("img"), tables = screen.getAllByRole("table");
  const names = charts.map(chart => chart.getAttribute("aria-label")!);
  const captions = tables.map(table => table.querySelector("caption")!.textContent!);
  expect(charts.length).toBeGreaterThanOrEqual(4);
  expect(new Set(names).size).toBe(charts.length);
  expect(new Set(captions).size).toBe(tables.length);
  for (const context of ["Biology", "Mathematics", "Cell transport", "Genetics", "Probability", "Active Recall", "Feynman", "Lab practice", "Match verification"])
    expect(names.some(name => name.includes(context))).toBe(true);
  charts.forEach((chart, index) => {
    const article = chart.closest("article")!;
    expect(captions[index]).toContain(article.querySelector("h3")!.textContent!);
    expect(names[index]).toContain(article.querySelector("h3")!.textContent!);
  });
});

it("does not invent a topic in the accessible name when chart metadata has none", () => {
  const sessions = [0, 1, 2].map(i => completedSession({ id: `chart-unknown-topic-${i}`,
    correct: i + 1, date: new Date(Date.UTC(2026, 9, 10 + i)).toISOString() }));
  const view = profileView(sessions);
  // Exercise the renderer's nullable metadata contract; the real view builder
  // continues to withhold unknown-condition comparisons.
  const series = view.progress[0];
  mount({ ...view, progress: [{ ...series, group: { ...series.group, context: { ...series.group.context, topic: null } } }],
    pending: [], browserStorageVerified: true });
  expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Topic not recorded");
  expect(screen.getByRole("table").querySelector("caption")!.textContent).toContain("Topic not recorded");
});
it("expands original condition records without creating a score ranking", () => {
  mount(); fireEvent.click(screen.getByRole("button", { name: "View Active Recall records" }));
  expect(screen.getAllByText(/3 \/ 4 correct/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Self-reported confidence/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/overall effectiveness.*\d+%/)).toBeNull();
});

it("withholds contradictory method figures while retaining the authoritative global total and original observations", () => {
  const session = completedSession(), original = summaryFor([session]);
  const summary = { ...original, profile: { ...original.profile,
    methods: original.profile.methods.map(m => ({ ...m, sessionCount: 99 })) } };
  mount({ ...buildCumulativeProfileView(evidenceOwner.uid, summary, [savedEvidence(session)], []), pending: [], browserStorageVerified: true });
  expect(screen.queryByText(/99 recorded session/)).toBeNull();
  expect(screen.getByText(/Method summary figures are withheld/)).toBeTruthy();
  expect(screen.getByText("Recorded completed sessions").nextElementSibling?.textContent).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "View Active Recall records" }));
  expect(screen.getAllByText(/3 \/ 4 correct/).length).toBeGreaterThan(0); expect(screen.queryByRole("img")).toBeNull();
});

it("discloses incomplete method details without inventing a contradiction or replacing server figures", () => {
  const first = completedSession({ id: "first" }), second = completedSession({ id: "second" });
  mount({ ...buildCumulativeProfileView(evidenceOwner.uid, summaryFor([first, second]), [savedEvidence(first)], []), pending: [], browserStorageVerified: true });
  expect(screen.getByText(/Readable method coverage is incomplete/)).toBeTruthy();
  expect(screen.getByText(/2 recorded session\(s\)/)).toBeTruthy();
  expect(screen.queryByText(/Method summary figures are withheld/)).toBeNull();
});

it("does not call a dated unprocessed legacy snapshot a server-recorded completion", () => {
  mount({ ...buildCumulativeProfileView(evidenceOwner.uid, null, [], [{ id: "legacy-only", data: {
    ...legacyAssessment(), completedAt: "2026-10-19T10:00:00Z"
  } }]), pending: [], browserStorageVerified: true });
  expect(screen.getByText(/Latest server-recorded completion/).textContent).toContain("No server-recorded sessions");
  expect(screen.getByRole("heading", { name: /Test Me.*Oct 19, 2026/ })).toBeTruthy();
});

it("distinguishes unknown recorded completion dates from no recorded sessions", () => {
  const unknown = createCompletedSessionEvidence({ ...sessionInput({ known: false }), completedAt: null });
  mount({ ...profileView([unknown]), pending: [], browserStorageVerified: true });
  expect(screen.getByText(/Latest server-recorded completion/).textContent).toContain("Completion date unknown");
  expect(screen.getByText(/Latest server-recorded completion/).textContent).not.toContain("No server-recorded sessions");
});

it("labels a known server completion accurately and does not infer missing history dates", () => {
  mount(); expect(screen.getByText(/Latest server-recorded completion/).textContent).toContain("Oct 10, 2026"); cleanup();
  const session = completedSession();
  mount({ ...buildCumulativeProfileView(evidenceOwner.uid, summaryFor([session]), [], []), pending: [], browserStorageVerified: true });
  expect(screen.getByText(/Latest server-recorded completion/).textContent).toContain("Completion dates unavailable in readable evidence");
});

it("does not confuse display pagination with missing immutable evidence", () => {
  const sessions = Array.from({ length: 11 }, (_, i) => completedSession({ id: `page-${i}` }));
  mount({ ...profileView(sessions), pending: [], browserStorageVerified: true });
  expect(screen.getAllByText("View session observations and details")).toHaveLength(10);
  expect(screen.queryByText(/Readable method coverage is incomplete/)).toBeNull();
  expect(screen.getByText(/11 recorded session\(s\)/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show 10 more history records" }));
  expect(screen.getAllByText("View session observations and details")).toHaveLength(11);
  expect(screen.getByText(/11 recorded session\(s\)/)).toBeTruthy();
});
