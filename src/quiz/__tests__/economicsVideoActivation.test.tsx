// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import * as videos from "../economics9708/videos";
import { getMethodDefinition } from "../methodRegistry";
import { economicsAssignments } from "../economics9708/allocation";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";
import { economicsContentId } from "../economics9708/selection";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
vi.mock("../../firebase", () => ({ auth: { currentUser: null }, db: {} }));
// Isolate the experiment lifecycle from real playback. Actual API/rate/error
// behavior is covered separately in economicsVideoReview.test.tsx. This fixture
// never approves a registry row or contacts YouTube.
vi.mock("../economics9708/EconomicsYouTubePlayer", () => ({
  default: ({ onPlaybackConfirmed }: { onPlaybackConfirmed: (value: boolean) => void }) => <div>
    <button onClick={() => onPlaybackConfirmed(true)}>TEST ONLY: confirm 2x</button>
    <button onClick={() => onPlaybackConfirmed(false)}>TEST ONLY: lose confirmation</button>
  </div>
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

it.each(["1.5", "2.2"])("enables %s owner-approved video through normal draft creation and allocation", topic => {
  expect(createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", selectedMethods: ["two-x-video-speed"], economicsTopicId: topic, economicsActivityVersion: "mapped-1" }).selectedMethods).toEqual(["two-x-video-speed"]);
  expect(economicsAssignments(["two-x-video-speed"], "lab", topic, "mapped-1")).toHaveLength(1);
});

it.each(["lab", "match"] as const)("retains a full %s completion path when both source review and actual player confirmation are supplied", phase => {
  // Test injection only: no supplied real video has this approval.
  const fixture: videos.ReviewedEconomicsVideo = {
    status: "VERIFIED", topicId: "1.5", youtubeId: "IzccVWouIxM", title: "TEST FIXTURE ONLY", creator: "TEST FIXTURE ONLY",
    OWNER_APPROVED: true, CONTENT_VERIFIED: true, PLAYBACK_VERIFIED: true, CLIP_REVIEWED: true,
    sourceUrl: "https://www.youtube.com/watch?v=IzccVWouIxM", objectiveIds: [1, 2, 3, 4].map(n => `ec9708-objective-1.5.${n}`),
    clip: { startSeconds: 30, endSeconds: 90 }, review: { reviewer: "TEST ONLY", accuracyReviewedAt: "2026-11-12T00:00:00.000Z", embeddingConfirmedAt: "2026-11-12T00:00:00.000Z", playback2xConfirmedAt: "2026-11-12T00:00:00.000Z" }
  };
  vi.spyOn(videos, "economicsVideoEligibilityGap").mockReturnValue(null);
  vi.spyOn(videos, "selectEconomicsVideo").mockReturnValue({ status: "ready", video: fixture, objectiveIds: [...fixture.objectiveIds] });
  const id = economicsAssignments(["two-x-video-speed"], phase, "1.5", "mapped-1")[0];
  const definition = getMethodDefinition("two-x-video-speed"), done = vi.fn();
  render(phase === "lab" ? definition.renderLab(id, done) : definition.renderMatch(id, .5, done));
  if (phase === "lab") click("Start 2x playback");
  const action = phase === "lab" ? "I finished at 2× · test comprehension" : "Continue to comprehension test";
  const next = screen.getByRole("button", { name: action });
  expect(next).toHaveProperty("disabled", true);
  click("TEST ONLY: confirm 2x"); expect(next).toHaveProperty("disabled", false);
  click("TEST ONLY: lose confirmation"); expect(next).toHaveProperty("disabled", true);
  click("TEST ONLY: confirm 2x"); expect(done).not.toHaveBeenCalled();
  click(action);
  const questions = resolveEconomicsAssessment(id).scored;
  for (const [i, q] of questions.entries()) {
    click(q.correct); click(i === questions.length - 1 ? "Finish test" : "Next question");
  }
  if (phase === "lab") {
    for (const prompt of ["How confident were you?", "How manageable was 2x?", `Would you use ${definition.name}?`]) {
      fireEvent.click(within(screen.getByRole("heading", { name: prompt }).nextElementSibling as HTMLElement).getByRole("button", { name: "3" }));
    }
    click("Complete experiment");
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ method: "two-x-video-speed", score: 1, correct: 3, total: 3 }));
  } else {
    click("3"); click("Complete verification");
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ method: "two-x-video-speed", firstScore: .5, verificationScore: 1 }));
  }
  expect(done).toHaveBeenCalledTimes(1);
});

it("retains saved Economics Match drafts and gates progression on fresh runtime playback", () => {
  const id = economicsContentId("1.5", "match-two-x-video-speed");
  const draft = createTrainingDraft({ owner: { kind: "guest" }, mode: "manual", selectedMethods: ["two-x-video-speed"], economicsTopicId: "1.5" });
  expect(validateTrainingDraft(draft)).toMatchObject({ valid: true });
  const done = vi.fn(); render(getMethodDefinition("two-x-video-speed").renderMatch(id, .5, done));
  expect(screen.getByRole("button", { name: "Continue to comprehension test" })).toHaveProperty("disabled", true);
  expect(done).not.toHaveBeenCalled();
});
