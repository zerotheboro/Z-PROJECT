// @vitest-environment jsdom

import React from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes
} from "react-router-dom";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  BaselineResult,
  LearningSituation,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult,
  TrainingMethodId
} from "../type";
import type { SavedAIRecommendation } from "../../services/aiRecommendationPersistence";
import type { TrainingDraft } from "../trainingProgress";
import { getAIRecommendationKey } from "../aiRecommendationContext";

const flowMocks = vi.hoisted(() => ({
  authUser: null as { uid: string } | null,
  buildLearningProfile: vi.fn(),
  loadAIRecommendation: vi.fn(),
  discardTrainingDraft: vi.fn(),
  loadTrainingDraft: vi.fn(),
  reserveTrainingAccess: vi.fn(),
  recordTrainingCompletion: vi.fn(),
  saveTrainingDraft: vi.fn(),
  saveAssessment: vi.fn(),
  selectMethods: vi.fn()
}));

vi.mock('../../services/manualTrainingHistory', () => ({ restoreManualTraining: (draft: unknown) => ({draft, completedAt: null, error: null}), freezeManualTraining: (_draft: unknown, completedAt: string | null) => ({completedAt}), saveManualTraining: async () => {} }));
vi.mock("../../HEADER/header", () => ({
  default: () => <nav>Navigation</nav>
}));

vi.mock("../../firebase", () => ({
  auth: {
    currentUser: null
  }
}));

vi.mock("../../services/auth", () => ({
  subscribeToAuth: (
    callback: (
      user: { uid: string } | null
    ) => void
  ) => {
    callback(flowMocks.authUser);
    return () => undefined;
  }
}));

vi.mock("../../services/trainingProgress", () => ({
  TrainingDraftConflictError: class extends Error {},
  writeLocalTrainingDraft: vi.fn(),
  loadTrainingDraft: flowMocks.loadTrainingDraft,
  saveTrainingDraft: flowMocks.saveTrainingDraft,
  discardTrainingDraft: flowMocks.discardTrainingDraft,
  forceDiscardTrainingDraft: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../services/trainingStreak", () => ({
  recordTrainingCompletion:
    flowMocks.recordTrainingCompletion
}));

vi.mock("../../services/trainingAccess", () => ({
  reserveTrainingAccess:
    flowMocks.reserveTrainingAccess
}));

vi.mock("../../services/assessment", () => ({
  saveAssessment:
    flowMocks.saveAssessment
}));

vi.mock("../../services/aiRecommendationPersistence", () => ({
  loadAIRecommendation:
    flowMocks.loadAIRecommendation
}));

vi.mock("../profileBuilder", () => ({
  buildLearningProfile:
    flowMocks.buildLearningProfile
}));

vi.mock("../methodSelector", () => ({
  selectMethods:
    flowMocks.selectMethods
}));

vi.mock(
  "../sections/LearningSituation",
  () => ({
    default: ({
      onComplete
    }: {
      onComplete: (
        result: LearningSituation
      ) => void;
    }) => (
      <button
        type="button"
        onClick={() =>
          onComplete({
            goal: "exam-preparation",
            difficulties: [
              "forgetting"
            ],
            contentTypes: ["facts"],
            currentApproach: "rereading",
            sessionLength: "20-45",
            learningContext: "school"
          })
        }
      >
        Complete situation
      </button>
    )
  })
);

vi.mock(
  "../sections/BaselineChallenge",
  () => ({
    default: ({
      onComplete
    }: {
      onComplete: (
        result: BaselineResult
      ) => void;
    }) => (
      <button
        type="button"
        onClick={() =>
          onComplete({
            memory: {
              score: 0.5,
              correct: 1,
              total: 2,
              confidence: 3,
              timeSpentMs: 100
            },
            understanding: {
              score: 0.5,
              correct: 1,
              total: 2,
              confidence: 3,
              timeSpentMs: 100
            }
          })
        }
      >
        Complete baseline
      </button>
    )
  })
);

vi.mock(
  "../sections/MethodIntroduction",
  () => ({
    default: ({
      methods,
      onComplete
    }: {
      methods: TrainingMethodId[];
      onComplete: (
        result: MethodIntroductionResult
      ) => void;
    }) => (
      <div>
        <p>
          intro:{methods.join(",")}
        </p>
        <button
          type="button"
          onClick={() =>
            onComplete({
              methods,
              correct: methods.length,
              total: methods.length,
              score: 1
            })
          }
        >
          Complete introduction
        </button>
      </div>
    )
  })
);

vi.mock("../sections/MethodLab", () => ({
  default: ({
    methods,
    onComplete
  }: {
    methods: TrainingMethodId[];
    onComplete: (
      result: MethodLabResult
    ) => void;
  }) => (
    <div>
      <p>lab:{methods.join(",")}</p>
      <button
        type="button"
        onClick={() =>
          onComplete({
            experiments:
              methods.map(method => ({
                method,
                category: "memory",
                score: 0.75,
                correct: 3,
                total: 4,
                confidence: 4,
                ease: 4,
                willingnessToUse: 4,
                timeSpentMs: 200
              }))
          })
        }
      >
        Complete lab
      </button>
    </div>
  )
}));

vi.mock(
  "../sections/MethodMatchChallenge",
  () => ({
    default: ({
      methodLab,
      onComplete
    }: {
      methodLab: MethodLabResult;
      onComplete: (
        result: MethodMatchResult
      ) => void;
    }) => (
      <div>
        <p>
          match:
          {methodLab.experiments
            .map(result => result.method)
            .join(",")}
        </p>
        <button
          type="button"
          onClick={() =>
            onComplete({
              methods:
                methodLab.experiments
                  .slice(0, 2)
                  .map(result => ({
                    method: result.method,
                    firstScore: result.score,
                    verificationScore: 0.75,
                    confidence: 4,
                    timeSpentMs: 100
                  }))
            })
          }
        >
          Complete match
        </button>
      </div>
    )
  })
);

vi.mock("../sections/Reflection", () => ({
  default: ({
    onComplete
  }: {
    onComplete: (
      result: ReflectionResult
    ) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onComplete({
          preferredMethod: null,
          priority: "performance",
          surprisedByResults: false,
          reflectionText: ""
        })
      }
    >
      Complete reflection
    </button>
  )
}));

import Assessment from "../Assessment";
import {
  createTrainingDraft,
  validateTrainingDraft
} from "../trainingProgress";
import {
  baselineConceptContentSets,
  baselineMemoryContentSets
} from "../assessmentData";

beforeEach(() => {
  flowMocks.authUser = null;
  flowMocks.loadTrainingDraft.mockReset();
  flowMocks.loadTrainingDraft.mockResolvedValue(null);
  flowMocks.loadAIRecommendation.mockReset();
  flowMocks.loadAIRecommendation.mockResolvedValue(null);
  flowMocks.recordTrainingCompletion.mockReset();
  flowMocks.recordTrainingCompletion.mockResolvedValue({
    currentStreak: 1,
    longestStreak: 1,
    lastCompletedDay: "2026-10-06",
    totalActiveDays: 1,
    completedToday: true,
    wasNewDay: true
  });
  flowMocks.selectMethods.mockReturnValue([
    "active-recall"
  ]);
  flowMocks.reserveTrainingAccess.mockReset();
  flowMocks.reserveTrainingAccess.mockResolvedValue(
    undefined
  );
  flowMocks.saveTrainingDraft.mockResolvedValue(
    undefined
  );
  flowMocks.discardTrainingDraft.mockResolvedValue(
    undefined
  );
  flowMocks.buildLearningProfile.mockReturnValue({
    strongestVerifiedMethod: "active-recall",
    preferredMethod: null,
    recommendedMethods: ["active-recall"],
    methodEvidence: [],
    baseline: {
      memoryScore: 0.5,
      understandingScore: 0.5
    },
    methodKnowledgeScore: 1,
    priority: "performance"
  });
});

afterEach(() => {
  cleanup();
});

function renderAssessment(
  selectedMethods?: TrainingMethodId[]
) {
  const manual =
    selectedMethods !== undefined;

  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname:
            "/training/assessment",
          search: manual
            ? "?mode=manual"
            : "",
          state: manual
            ? { selectedMethods }
            : null
        }
      ]}
    >
      <Routes>
        <Route
          path="/training/assessment"
          element={<Assessment />}
        />
        <Route
          path="/training/choose"
          element={<p>Method picker route</p>}
        />
        <Route path="/training" element={<p>Training landing</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function matchingAdvice(): SavedAIRecommendation {
  return {
    schemaVersion: 1,
    mode: "standard",
    inputs: {
      biggestProblem: "I forget biology facts.",
      methodQuestion: "How should I study biology?",
      extraContext: "Biology revision"
    },
    result: {
      user_problem: "Forgetting biology facts",
      recommended_methods: [{
        name: "Active Recall", branch: "meta-learn",
        reason: "Retrieval helps.", warning: "Check gaps."
      }],
      study_plan: "Practice recall.", final_note: "Review."
    },
    updatedAt: {
      seconds: Math.floor(Date.now() / 1000), nanoseconds: 0
    }
  };
}

function renderResume(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[
      `/training/assessment?resume=${sessionId}`
    ]}>
      <Routes>
        <Route path="/training/assessment" element={<Assessment />} />
        <Route path="/training" element={<p>Training landing</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function lastSavedDraft(
  predicate: (draft: TrainingDraft) => boolean
): TrainingDraft | undefined {
  return flowMocks.saveTrainingDraft.mock.calls
    .map(call => call[0] as TrainingDraft)
    .reverse()
    .find(predicate);
}

function completeManualSession() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Complete introduction"
    })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Complete lab"
    })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Complete match"
    })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Complete reflection"
    })
  );
}

describe("manual assessment entry", () => {
  async function saveAtAIConfirmation() {
    flowMocks.authUser = { uid: "user-123" };
    const advice = matchingAdvice();
    flowMocks.loadAIRecommendation.mockResolvedValue(advice);
    flowMocks.saveTrainingDraft.mockClear();
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));
    expect(await screen.findByRole("heading", {
      name: "Use your recent AI Recommendation?"
    })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: "Save and exit"
    }));
    expect(await screen.findByText("Training landing"))
      .toBeTruthy();
    const saved = lastSavedDraft(
      draft => Boolean(draft.pendingAIConfirmation?.recommendationKey)
    );
    if (!saved) throw new Error("The pending AI draft was not saved.");
    expect(saved.completed.baseline?.memory.score).toBe(0.5);
    expect(saved.pendingAIConfirmation?.recommendationKey)
      .toBe(getAIRecommendationKey(advice));
    expect(saved.selectedMethods).toEqual([]);
    expect(saved.section).toBe(2);
    expect(saved.owner).toEqual({ kind: "user", uid: "user-123" });
    const baselineCheckpoint = flowMocks.saveTrainingDraft.mock.calls
      .map(call => call[0] as TrainingDraft)
      .find(draft => draft.pendingAIConfirmation?.recommendationKey === null);
    expect(baselineCheckpoint?.sessionId).toBe(saved.sessionId);
    expect(baselineCheckpoint?.completed.baseline).toEqual(saved.completed.baseline);
    const validation = validateTrainingDraft(saved, saved.owner);
    if (!validation.valid) throw new Error(validation.reason);
    expect(flowMocks.selectMethods).not.toHaveBeenCalled();
    expect(flowMocks.reserveTrainingAccess).toHaveBeenCalledTimes(1);
    return { advice, saved };
  }

  it("saves completed Baseline and the unanswered AI decision without selecting methods", async () => {
    await saveAtAIConfirmation();
  });

  it.each([
    { decision: "confirms", confirm: true },
    { decision: "rejects", confirm: false }
  ])(
    "resumes pending AI confirmation and $decision the recommendation without another quota reservation",
    async ({ confirm }) => {
      const { saved } = await saveAtAIConfirmation();
      const sessionId = saved.sessionId;
      cleanup();
      flowMocks.loadTrainingDraft.mockResolvedValue(
        validateTrainingDraft(saved, saved.owner)
      );
      flowMocks.reserveTrainingAccess.mockClear();
      flowMocks.selectMethods.mockClear();
      renderResume(sessionId);
      expect(await screen.findByRole("heading", {
        name: "Use your recent AI Recommendation?"
      })).toBeTruthy();
      expect(screen.queryByRole("button", {
        name: "Complete baseline"
      })).toBeNull();
      fireEvent.click(screen.getByRole("button", {
        name: confirm ? "Use this recommendation" : "Use standard selection"
      }));
      await waitFor(() => expect(flowMocks.selectMethods)
        .toHaveBeenCalledTimes(1));
      expect(flowMocks.selectMethods.mock.calls[0][2])
        .toEqual(confirm ? ["active-recall"] : []);
      expect(flowMocks.reserveTrainingAccess).not.toHaveBeenCalled();
      expect(await screen.findByText("intro:active-recall"))
        .toBeTruthy();
      const selected = lastSavedDraft(draft => draft.section === 3);
      if (selected) {
        expect(selected.sessionId).toBe(sessionId);
        expect(selected.pendingAIConfirmation).toBeUndefined();
      }
    }
  );

  it("keeps Baseline but falls back when the saved recommendation expired or changed", async () => {
    const { advice, saved } = await saveAtAIConfirmation();
    cleanup();
    flowMocks.loadTrainingDraft.mockResolvedValue(
      validateTrainingDraft(saved, saved.owner)
    );
    flowMocks.loadAIRecommendation.mockResolvedValue({
      ...advice,
      updatedAt: { seconds: 1, nanoseconds: 0 }
    });
    flowMocks.reserveTrainingAccess.mockClear();
    flowMocks.selectMethods.mockClear();
    renderResume(saved.sessionId);
    expect(await screen.findByText(/previous AI recommendation is no longer available/))
      .toBeTruthy();
    expect(await screen.findByText("intro:active-recall"))
      .toBeTruthy();
    expect(screen.queryByRole("button", {
      name: "Complete baseline"
    })).toBeNull();
    expect(flowMocks.selectMethods)
      .toHaveBeenCalledWith(expect.anything(), saved.completed.baseline, []);
    expect(flowMocks.selectMethods).toHaveBeenCalledTimes(1);
    expect(flowMocks.reserveTrainingAccess).not.toHaveBeenCalled();
  });

  it("rejects a replacement recommendation for the same owner on resume", async () => {
    const { advice, saved } = await saveAtAIConfirmation();
    cleanup();
    flowMocks.loadTrainingDraft.mockResolvedValue(
      validateTrainingDraft(saved, saved.owner)
    );
    flowMocks.loadAIRecommendation.mockResolvedValue({
      ...advice,
      inputs: { ...advice.inputs, extraContext: "New subject" }
    });
    flowMocks.reserveTrainingAccess.mockClear();
    flowMocks.selectMethods.mockClear();
    renderResume(saved.sessionId);
    expect(await screen.findByText(/previous AI recommendation is no longer available/))
      .toBeTruthy();
    expect(flowMocks.selectMethods).toHaveBeenCalledWith(
      expect.anything(), saved.completed.baseline, []
    );
    expect(flowMocks.reserveTrainingAccess).not.toHaveBeenCalled();
  });

  it("times out an unavailable recommendation on resume and ignores its late completion", async () => {
    const { advice, saved } = await saveAtAIConfirmation();
    cleanup();
    flowMocks.loadTrainingDraft.mockResolvedValue(
      validateTrainingDraft(saved, saved.owner)
    );
    let release!: (value: SavedAIRecommendation) => void;
    flowMocks.loadAIRecommendation.mockReturnValue(new Promise(resolve => {
      release = resolve;
    }));
    flowMocks.reserveTrainingAccess.mockClear();
    flowMocks.selectMethods.mockClear();
    renderResume(saved.sessionId);
    expect(await screen.findByText(/previous AI recommendation is no longer available/, {}, {
      timeout: 3_500
    })).toBeTruthy();
    expect(flowMocks.selectMethods).toHaveBeenCalledTimes(1);
    release(advice);
    await Promise.resolve();
    expect(flowMocks.selectMethods).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", {
      name: "Use your recent AI Recommendation?"
    })).toBeNull();
    expect(flowMocks.reserveTrainingAccess).not.toHaveBeenCalled();
  });

  it("retains pending Baseline after a failed cloud save for retry", async () => {
    flowMocks.authUser = { uid: "user-123" };
    flowMocks.loadAIRecommendation.mockResolvedValue(matchingAdvice());
    flowMocks.saveTrainingDraft.mockRejectedValueOnce(new Error("offline"));
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));
    expect(await screen.findByRole("heading", {
      name: "Use your recent AI Recommendation?"
    })).toBeTruthy();
    expect(screen.getByRole("button", {
      name: "Save and exit"
    })).toBeTruthy();
    expect(await screen.findByText(/Cloud save failed\. A browser recovery copy/))
      .toBeTruthy();
    expect(screen.getByRole("heading", {
      name: "Use your recent AI Recommendation?"
    })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: "Save and exit"
    }));
    expect(await screen.findByText("Training landing"))
      .toBeTruthy();
    const saved = lastSavedDraft(
      draft => Boolean(draft.pendingAIConfirmation?.recommendationKey)
    );
    if (!saved) throw new Error("The pending AI draft was not saved.");
    expect(saved.completed.baseline).not.toBeNull();
  });

  it("does not mount a new assessment when reservation is denied", async () => {
    flowMocks.reserveTrainingAccess.mockRejectedValue(
      new Error("Daily training limit reached")
    );

    renderAssessment();

    expect(await screen.findByRole("heading", {
      name: "Training could not start"
    }, {
      timeout: 5_000
    })).toBeTruthy();
    expect(screen.getByText("Daily training limit reached"))
      .toBeTruthy();
    expect(flowMocks.saveTrainingDraft)
      .not.toHaveBeenCalled();
  });

  it.each([
    [["active-recall"]],
    [[
      "active-recall",
      "feynman",
      "cornell"
    ]]
  ] as [TrainingMethodId[]][])(
    "trains supplied methods without selector or fabricated baseline evidence: %j",
    async (methods) => {
      renderAssessment(methods);

      expect(
        await screen.findByText(
          `intro:${methods.join(",")}`
        )
      ).toBeTruthy();
      expect(flowMocks.reserveTrainingAccess)
        .toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            mode: "manual",
            methodIds: methods
          })
        );
      expect(
        screen.queryByRole("button", {
          name: "Complete situation"
        })
      ).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: "Complete baseline"
        })
      ).toBeNull();
      expect(
        flowMocks.selectMethods
      ).not.toHaveBeenCalled();
      expect(flowMocks.loadAIRecommendation)
        .not.toHaveBeenCalled();

      completeManualSession();

      expect(
        await screen.findByRole("heading", {
          name: "Session complete"
        })
      ).toBeTruthy();
      expect(
        flowMocks.buildLearningProfile
      ).not.toHaveBeenCalled();
      expect(
        flowMocks.saveAssessment
      ).not.toHaveBeenCalled();
      expect(
        flowMocks.recordTrainingCompletion
      ).toHaveBeenCalledTimes(1);
      expect(
        flowMocks.recordTrainingCompletion
      ).toHaveBeenCalledWith(expect.objectContaining({
        mode: "manual",
        methodIds: methods
      }), expect.objectContaining({ now: expect.any(Date) }));
      expect(
        flowMocks.reserveTrainingAccess
      ).toHaveBeenCalledTimes(1);
    }
  );

  it("preserves the automatic Situation and Baseline selector path", async () => {
    renderAssessment();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Complete situation"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Complete baseline"
      })
    );

    await waitFor(() => expect(
      flowMocks.selectMethods
    ).toHaveBeenCalledTimes(1));
    expect(flowMocks.selectMethods).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulties: ["forgetting"]
      }),
      expect.objectContaining({
        memory: expect.objectContaining({ score: 0.5 })
      }),
      []
    );
    expect(
      await screen.findByText(
        "intro:active-recall"
      )
    ).toBeTruthy();
    expect(
      flowMocks.saveAssessment
    ).not.toHaveBeenCalled();
    expect(
      flowMocks.buildLearningProfile
    ).not.toHaveBeenCalled();
    expect(
      flowMocks.recordTrainingCompletion
    ).not.toHaveBeenCalled();
  });

  it("keeps guest Test Me traditional because local advice has no verified owner", async () => {
    flowMocks.loadAIRecommendation.mockResolvedValue({
      schemaVersion: 1,
      mode: "standard",
      inputs: {
        biggestProblem: "I forget facts.",
        methodQuestion: "How should I study?",
        extraContext: ""
      },
      result: {
        user_problem: "Forgetting facts",
        recommended_methods: [{
          name: "Active Recall",
          branch: "meta-learn",
          reason: "Retrieval helps.",
          warning: "Check your answers."
        }],
        study_plan: "Practise recall.",
        final_note: "Review your gaps."
      },
      updatedAt: new Date().toISOString()
    });

    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));

    await waitFor(() => expect(flowMocks.selectMethods)
      .toHaveBeenCalledWith(
        expect.anything(), expect.anything(), []
      ));
    expect(flowMocks.loadAIRecommendation)
      .not.toHaveBeenCalled();
    expect(await screen.findByText("intro:active-recall"))
      .toBeTruthy();
    expect(flowMocks.reserveTrainingAccess)
      .toHaveBeenCalledTimes(1);
    expect(flowMocks.reserveTrainingAccess)
      .toHaveBeenCalledWith(null, expect.objectContaining({
        mode: "auto",
        methodIds: []
      }));
  });

  it("requires signed-in users to confirm recent AI inputs before the bonus applies", async () => {
    flowMocks.authUser = { uid: "user-123" };
    flowMocks.loadAIRecommendation.mockResolvedValue({
      schemaVersion: 1,
      mode: "standard",
      inputs: {
        biggestProblem: "I forget biology facts.",
        methodQuestion: "How should I study biology?",
        extraContext: "Biology revision"
      },
      result: {
        user_problem: "Forgetting biology facts",
        recommended_methods: [{
          name: "Active Recall", branch: "meta-learn",
          reason: "Retrieval helps.", warning: "Check gaps."
        }],
        study_plan: "Practice recall.", final_note: "Review."
      },
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    });
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));

    expect(await screen.findByRole("heading", {
      name: "Use your recent AI Recommendation?"
    })).toBeTruthy();
    expect(screen.getByText("Previous study context: Biology revision"))
      .toBeTruthy();
    expect(flowMocks.selectMethods).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {
      name: "Use this recommendation"
    }));
    await waitFor(() => expect(flowMocks.selectMethods)
      .toHaveBeenCalledWith(
        expect.anything(), expect.anything(), ["active-recall"]
      ));
    expect(flowMocks.selectMethods).toHaveBeenCalledTimes(1);
  });

  it("lets a signed-in user reject an unrelated saved subject", async () => {
    flowMocks.authUser = { uid: "user-123" };
    flowMocks.loadAIRecommendation.mockResolvedValue({
      schemaVersion: 1, mode: "standard",
      inputs: {
        biggestProblem: "I forget biology facts.",
        methodQuestion: "How should I study biology?",
        extraContext: "Biology"
      },
      result: {
        user_problem: "Forgetting biology facts",
        recommended_methods: [{
          name: "Active Recall", branch: "meta-learn",
          reason: "Retrieval helps.", warning: "Check gaps."
        }],
        study_plan: "Practice recall.", final_note: "Review."
      },
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    });
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Use standard selection"
    }));
    await waitFor(() => expect(flowMocks.selectMethods)
      .toHaveBeenCalledWith(
        expect.anything(), expect.anything(), []
      ));
  });

  it("reads a signed-in recommendation from that user's identity", async () => {
    flowMocks.authUser = { uid: "user-123" };
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));

    await waitFor(() => expect(flowMocks.loadAIRecommendation)
      .toHaveBeenCalledWith({ kind: "user", uid: "user-123" }));
    expect(await screen.findByText("intro:active-recall"))
      .toBeTruthy();
  });

  it("falls back to the traditional selector when saved AI cannot load", async () => {
    flowMocks.loadAIRecommendation.mockRejectedValue(
      new Error("offline")
    );
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));

    expect(await screen.findByText("intro:active-recall"))
      .toBeTruthy();
    expect(flowMocks.selectMethods)
      .toHaveBeenCalledWith(
        expect.anything(), expect.anything(), []
      );
  });

  it("waits at Baseline and selects only once while the saved context loads", async () => {
    flowMocks.authUser = { uid: "user-123" };
    let release!: (value: null) => void;
    flowMocks.loadAIRecommendation.mockReturnValue(
      new Promise<null>(resolve => {
        release = resolve;
      })
    );

    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));

    expect(screen.getByText("Choosing your methods..."))
      .toBeTruthy();
    expect(screen.queryByText("intro:active-recall"))
      .toBeNull();
    expect(flowMocks.selectMethods).not.toHaveBeenCalled();
    expect(screen.getByRole("button", {
      name: "Save and exit"
    }).hasAttribute("disabled")).toBe(true);

    release(null);
    expect(await screen.findByText("intro:active-recall"))
      .toBeTruthy();
    expect(flowMocks.selectMethods).toHaveBeenCalledTimes(1);
  });

  it("continues with traditional selection after a stalled signed-in lookup", async () => {
    flowMocks.authUser = { uid: "user-123" };
    let release!: (value: SavedAIRecommendation) => void;
    flowMocks.loadAIRecommendation.mockReturnValue(
      new Promise<SavedAIRecommendation>(resolve => { release = resolve; })
    );
    renderAssessment();
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));

    expect(await screen.findByText("intro:active-recall", {}, {
      timeout: 3_500
    })).toBeTruthy();
    expect(flowMocks.selectMethods).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), []
    );
    release({
      schemaVersion: 1, mode: "standard",
      inputs: {
        biggestProblem: "I forget biology facts.",
        methodQuestion: "How should I study biology?",
        extraContext: "Biology revision"
      },
      result: {
        user_problem: "Forgetting biology facts",
        recommended_methods: [{
          name: "Active Recall", branch: "meta-learn",
          reason: "Retrieval helps.", warning: "Check gaps."
        }],
        study_plan: "Practice recall.", final_note: "Review."
      },
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    });
    await Promise.resolve();
    expect(flowMocks.selectMethods).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", {
      name: "Use your recent AI Recommendation?"
    })).toBeNull();
  });

  it("resumes an existing four-method assessment without reading AI or reselecting", async () => {
    const methods: TrainingMethodId[] = [
      "active-recall", "feynman", "cornell", "interleaving"
    ];
    const draft = createTrainingDraft({
      owner: { kind: "guest" }, mode: "auto"
    });
    draft.section = 3;
    draft.phase = "introduction";
    draft.selectedMethods = methods;
    draft.currentMethod = methods[0];
    draft.currentMethodIndex = 0;
    draft.baselineContentSetIds = {
      memory: baselineMemoryContentSets[0].id,
      understanding: baselineConceptContentSets[0].id
    };
    draft.completed.learningSituation = {
      goal: "remember-longer",
      difficulties: ["forgetting"],
      contentTypes: ["facts"],
      currentApproach: "rereading",
      sessionLength: "20-45",
      learningContext: "school"
    };
    draft.completed.baseline = {
      memory: {
        score: 0.5, correct: 2, total: 4,
        confidence: 3, timeSpentMs: 100
      },
      understanding: {
        score: 0.5, correct: 2, total: 4,
        confidence: 3, timeSpentMs: 100
      }
    };
    const validation = validateTrainingDraft(draft, draft.owner);
    expect(validation.valid).toBe(true);
    flowMocks.loadTrainingDraft.mockResolvedValue(validation);

    render(
      <MemoryRouter initialEntries={[
        `/training/assessment?resume=${draft.sessionId}`
      ]}>
        <Routes>
          <Route path="/training/assessment" element={<Assessment />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(`intro:${methods.join(",")}`))
      .toBeTruthy();
    expect(flowMocks.loadAIRecommendation)
      .not.toHaveBeenCalled();
    expect(flowMocks.selectMethods)
      .not.toHaveBeenCalled();
    expect(flowMocks.reserveTrainingAccess)
      .not.toHaveBeenCalled();
  });

  it("redirects a manual URL with missing navigation state", async () => {
    renderAssessment([]);

    expect(
      await screen.findByText("Method picker route")
    ).toBeTruthy();
  });

  it("retains a signed-in draft after final-save failure and retries with the same session ID", async () => {
    flowMocks.authUser = { uid: "user-123" };
    flowMocks.saveAssessment
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("assessment-id");
    renderAssessment();

    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete introduction"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete lab"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete match"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete reflection"
    }));

    expect(
      await screen.findByRole("button", {
        name: "Retry final save"
      })
    ).toBeTruthy();
    expect(
      flowMocks.discardTrainingDraft
    ).not.toHaveBeenCalled();
    expect(
      flowMocks.recordTrainingCompletion
    ).not.toHaveBeenCalled();

    const firstSessionId =
      flowMocks.saveAssessment.mock.calls[0][0]
        .sessionId;
    fireEvent.click(screen.getByRole("button", {
      name: "Retry final save"
    }));

    expect(
      await screen.findByRole("heading", {
        name: "Your Learning Profile"
      })
    ).toBeTruthy();
    expect(
      flowMocks.saveAssessment.mock.calls[1][0]
        .sessionId
    ).toBe(firstSessionId);
    expect(
      flowMocks.discardTrainingDraft
    ).toHaveBeenCalledTimes(1);
    expect(
      flowMocks.recordTrainingCompletion
    ).toHaveBeenCalledTimes(1);
    expect(
      flowMocks.recordTrainingCompletion
    ).toHaveBeenCalledWith(expect.objectContaining({
        owner: { kind: "user", uid: "user-123" },
        sessionId: firstSessionId,
        mode: "auto",
        methodIds: ["active-recall"]
      }));
  });

  it("records a completed guest automatic assessment without creating a cloud assessment", async () => {
    renderAssessment();

    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete introduction"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete lab"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete match"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete reflection"
    }));

    expect(await screen.findByRole("heading", {
      name: "Your Learning Profile"
    })).toBeTruthy();
    expect(flowMocks.saveAssessment).not.toHaveBeenCalled();
    expect(flowMocks.recordTrainingCompletion)
      .toHaveBeenCalledWith(expect.objectContaining({
        owner: { kind: "guest" },
        mode: "auto",
        methodIds: ["active-recall"]
      }));
  });

  it("keeps an automatic draft retryable when assessment saving succeeds but streak recording fails", async () => {
    flowMocks.authUser = { uid: "user-123" };
    flowMocks.saveAssessment.mockResolvedValue("assessment-id");
    flowMocks.recordTrainingCompletion
      .mockRejectedValueOnce(new Error("streak offline"))
      .mockResolvedValueOnce({
        currentStreak: 2,
        longestStreak: 2,
        lastCompletedDay: "2026-10-06",
        totalActiveDays: 2,
        completedToday: true,
        wasNewDay: true
      });
    renderAssessment();

    fireEvent.click(await screen.findByRole("button", {
      name: "Complete situation"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete baseline"
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Complete introduction"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete lab"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete match"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete reflection"
    }));

    const retry = await screen.findByRole("button", {
      name: "Retry final save"
    });
    expect(flowMocks.saveAssessment).toHaveBeenCalledTimes(1);
    expect(flowMocks.discardTrainingDraft).not.toHaveBeenCalled();

    fireEvent.click(retry);
    expect(await screen.findByRole("heading", {
      name: "Your Learning Profile"
    })).toBeTruthy();

    expect(flowMocks.saveAssessment).toHaveBeenCalledTimes(2);
    expect(
      flowMocks.saveAssessment.mock.calls[1][0].sessionId
    ).toBe(
      flowMocks.saveAssessment.mock.calls[0][0].sessionId
    );
    expect(flowMocks.recordTrainingCompletion)
      .toHaveBeenCalledTimes(2);
    expect(flowMocks.discardTrainingDraft)
      .toHaveBeenCalledTimes(1);
  });

  it("does not record activity for save-and-exit, resume, or discard", async () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["active-recall"]
    });
    flowMocks.loadTrainingDraft.mockResolvedValue({
      valid: true,
      draft
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={[
        `/training/assessment?resume=${draft.sessionId}`
      ]}>
        <Routes>
          <Route
            path="/training/assessment"
            element={<Assessment />}
          />
          <Route
            path="/training"
            element={<p>Training route</p>}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("intro:active-recall"))
      .toBeTruthy();
    expect(flowMocks.recordTrainingCompletion)
      .not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", {
      name: "Save and exit"
    }));
    expect(await screen.findByText("Training route"))
      .toBeTruthy();
    expect(flowMocks.recordTrainingCompletion)
      .not.toHaveBeenCalled();

    unmount();
    flowMocks.loadTrainingDraft.mockResolvedValue({
      valid: true,
      draft
    });
    render(
      <MemoryRouter initialEntries={[
        `/training/assessment?resume=${draft.sessionId}`
      ]}>
        <Routes>
          <Route
            path="/training/assessment"
            element={<Assessment />}
          />
          <Route
            path="/training"
            element={<p>Training route</p>}
          />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("intro:active-recall");
    fireEvent.click(screen.getByRole("button", {
      name: "Discard current training"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Discard training"
    }));

    expect(await screen.findByText("Training route"))
      .toBeTruthy();
    expect(flowMocks.recordTrainingCompletion)
      .not.toHaveBeenCalled();
    expect(flowMocks.reserveTrainingAccess)
      .not.toHaveBeenCalled();
  });
});
