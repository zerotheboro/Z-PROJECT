// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { TrainingDraft } from "../trainingProgress";
import { createTrainingDraft } from "../trainingProgress";
import { armProgressPilot, readProgressPilot, resetProgressPilot } from "../../services/economicsProgressPilotSession";

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, draft: null as TrainingDraft | null,
  reserve: vi.fn(), save: vi.fn(), introduction: vi.fn() }));
vi.mock("../../firebase", () => ({ auth: mocks.auth, db: {} }));
vi.mock("../../HEADER/header", () => ({ default: () => <nav>Existing navigation</nav> }));
vi.mock("../../services/auth", () => ({ subscribeToAuth: (cb: (u: User | null) => void) => { cb(mocks.auth.currentUser); return () => {}; } }));
vi.mock("../../services/economicsProgressPilot", () => ({ progressPilotEnabled: () => true }));
vi.mock("../../hooks/useStudyStrategyEvidence", () => ({ useStudyStrategyEvidence: () => ({ data: null, loading: false, error: true }) }));
vi.mock("../../services/localTrainingCompletionConfig", () => ({ localCompletionConfig: () => null }));
vi.mock("../../services/trainingAccess", () => ({ reserveTrainingAccess: mocks.reserve }));
vi.mock("../../services/trainingProgress", () => ({ saveTrainingDraft: mocks.save, discardTrainingDraft: vi.fn(), forceDiscardTrainingDraft: vi.fn(),
  writeLocalTrainingDraft: vi.fn(), TrainingDraftConflictError: class extends Error {} }));
vi.mock("../useAvailableTrainingDraft", () => ({ useAvailableTrainingDraft: () => ({ loading: false, user: mocks.auth.currentUser,
  owner: mocks.draft!.owner, validation: { valid: true, draft: mocks.draft }, error: null, reload: vi.fn() }) }));
vi.mock("../sections/LearningSituation", () => ({ default: () => <h1>Existing Learning Situation</h1> }));
vi.mock("../sections/MethodIntroduction", () => ({ default: ({ methods }: { methods: string[] }) => {
  mocks.introduction(methods); return <h1>Existing Method Introduction</h1>;
} }));
import Assessment from "../Assessment";

beforeEach(() => { vi.stubEnv("DEV", true); vi.stubEnv("VITE_ECONOMICS_PROGRESS_PILOT", "memory-only");
  resetProgressPilot(); vi.clearAllMocks(); mocks.save.mockResolvedValue(undefined); mocks.auth.currentUser = { uid: "actual-pilot-owner" } as User; });
afterEach(() => { cleanup(); resetProgressPilot(); vi.unstubAllEnvs(); });

it.each(["auto", "manual"] as const)("the actual %s Assessment route renders the optional initial gate before its normal first section", async mode => {
  const d = createTrainingDraft({ owner: { kind: "user", uid: mocks.auth.currentUser!.uid }, mode, selectedMethods: mode === "manual" ? ["active-recall"] : [],
    sessionId: "actual-pilot-session", economicsTopicId: "1.5", economicsActivityVersion: "mapped-1" });
  mocks.draft = d; const originalCompleted = structuredClone(d.completed); armProgressPilot(mocks.auth.currentUser!, d, "1.5");
  render(<MemoryRouter initialEntries={[`/training/assessment?resume=${d.sessionId}`]}><Assessment /></MemoryRouter>);
  await screen.findByRole("region", { name: "Optional initial check" });
  expect(screen.queryByText("Existing Learning Situation")).toBeNull(); expect(screen.queryByText("Existing Method Introduction")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip initial check and continue Training" }));
  await screen.findByText(mode === "auto" ? "Existing Learning Situation" : "Existing Method Introduction");
  expect(d.completed).toEqual(originalCompleted); expect(mocks.reserve).not.toHaveBeenCalled();
  expect(readProgressPilot(mocks.auth.currentUser, d.sessionId)?.initialSkipped).toBe(true);
  if (mode === "manual") expect(mocks.introduction).toHaveBeenLastCalledWith(["active-recall"]);
});
