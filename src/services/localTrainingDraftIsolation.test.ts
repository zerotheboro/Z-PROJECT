// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
const settings = vi.hoisted(() => ({ local: false }));
vi.mock("../firebase", () => ({ db: {} }));
vi.mock("./localTrainingCompletionConfig", () => ({ localCompletionConfig: () => settings.local ? { projectId: "demo-isolation" } : null }));
import { createTrainingDraft } from "../quiz/trainingProgress";
import { deleteLocalTrainingDraft, readLocalTrainingDraft, writeLocalTrainingDraft } from "./trainingProgress";

beforeEach(() => { localStorage.clear(); settings.local = false; });
it("does not recover or delete production browser drafts for a colliding demo UID", () => {
  const owner = { kind: "user", uid: "same-uid-in-two-projects" } as const;
  const production = createTrainingDraft({ owner, mode: "auto", sessionId: "production-session-001" });
  writeLocalTrainingDraft(production);
  settings.local = true;
  expect(readLocalTrainingDraft(owner)).toBeNull();
  const demo = createTrainingDraft({ owner, mode: "auto", sessionId: "demo-session-001" });
  writeLocalTrainingDraft(demo);
  expect(readLocalTrainingDraft(owner)).toEqual({ valid: true, draft: demo });
  deleteLocalTrainingDraft(owner, demo.sessionId);
  settings.local = false;
  expect(readLocalTrainingDraft(owner)).toEqual({ valid: true, draft: production });
});
it("keeps guest browser drafts separate between local demo and the unchanged legacy namespace", () => {
  const owner = { kind: "guest" } as const;
  const production = createTrainingDraft({ owner, mode: "auto", sessionId: "guest-production-001" }); writeLocalTrainingDraft(production);
  settings.local = true;
  expect(readLocalTrainingDraft(owner)).toBeNull();
  const demo = createTrainingDraft({ owner, mode: "auto", sessionId: "guest-demo-001" }); writeLocalTrainingDraft(demo);
  settings.local = false;
  expect(readLocalTrainingDraft(owner)).toEqual({ valid: true, draft: production });
});
