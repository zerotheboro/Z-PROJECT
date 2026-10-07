// @vitest-environment jsdom

import React from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen
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

const flowMocks = vi.hoisted(() => ({
  authUser: null as { uid: string } | null,
  buildLearningProfile: vi.fn(),
  discardTrainingDraft: vi.fn(),
  loadTrainingDraft: vi.fn(),
  reserveTrainingAccess: vi.fn(),
  recordTrainingCompletion: vi.fn(),
  saveTrainingDraft: vi.fn(),
  saveAssessment: vi.fn(),
  selectMethods: vi.fn()
}));

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
            goal: "exam",
            difficulties: [
              "forgetting"
            ],
            contentTypes: ["facts"],
            currentApproach: "reading",
            sessionLength: "30",
            learningContext: "alone"
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
  createTrainingDraft
} from "../trainingProgress";

beforeEach(() => {
  flowMocks.authUser = null;
  flowMocks.loadTrainingDraft.mockReset();
  flowMocks.loadTrainingDraft.mockResolvedValue(null);
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
      </Routes>
    </MemoryRouter>
  );
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
      }));
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

    expect(
      flowMocks.selectMethods
    ).toHaveBeenCalledTimes(1);
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
