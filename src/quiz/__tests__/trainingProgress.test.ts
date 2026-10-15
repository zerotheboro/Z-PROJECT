// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  createTrainingDraft,
  getGuestDraftStorageKey,
  getUserRecoveryStorageKey,
  validateTrainingDraft
} from "../trainingProgress";
import {
  getMethodDefinition
} from "../methodRegistry";
import {
  deleteLocalTrainingDraft,
  readLocalTrainingDraft,
  writeLocalTrainingDraft
} from "../../services/trainingProgress";
import {
  GUEST_TRAINING_STREAK_STORAGE_KEY
} from "../../services/trainingStreak";
import {
  recordAdaptivePerformance
} from "../engines/shared/adaptiveDifficulty";

describe("training progress contracts", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) =>
          values.get(key) ?? null,
        removeItem: (key: string) =>
          values.delete(key),
        setItem: (key: string, value: string) =>
          values.set(key, value)
      }
    });
  });

  it("starts a new draft at medium adaptive difficulty", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });

    expect(draft.adaptiveDifficulty).toEqual({
      level: "medium",
      recentPerformance: [],
      processedEventIds: [],
      challengeLevels: {}
    });
    expect(draft.writingJudgeResults)
      .toEqual({});
  });

  it("preserves adaptive difficulty through local save and resume", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });

    draft.adaptiveDifficulty = [
      "adaptive-1",
      "adaptive-2",
      "adaptive-3"
    ].reduce(
      (state, eventId) =>
        recordAdaptivePerformance(
          state,
          eventId,
          { correct: 1, total: 1 }
        ),
      draft.adaptiveDifficulty
    );

    writeLocalTrainingDraft(draft);

    const resumed = readLocalTrainingDraft({
      kind: "guest"
    });

    expect(resumed).toMatchObject({
      valid: true,
      draft: {
        adaptiveDifficulty: {
          level: "hard",
          recentPerformance: [],
          processedEventIds: [
            "adaptive-1",
            "adaptive-2",
            "adaptive-3"
          ]
        }
      }
    });

    if (!resumed?.valid) {
      throw new Error(
        "Expected the saved Training draft to resume."
      );
    }

    const repeatedAfterResume =
      recordAdaptivePerformance(
        resumed.draft.adaptiveDifficulty,
        "adaptive-3",
        { correct: 0, total: 1 }
      );

    expect(repeatedAfterResume).toBe(
      resumed.draft.adaptiveDifficulty
    );
  });

  it("loads a legacy draft without adaptive state at medium", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });
    const {
      adaptiveDifficulty: _adaptiveDifficulty,
      ...legacyDraft
    } = draft;
    const validation = validateTrainingDraft(
      legacyDraft
    );

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.draft.adaptiveDifficulty)
        .toEqual({
          level: "medium",
          recentPerformance: [],
          processedEventIds: [],
          challengeLevels: {}
        });
    }
  });

  it("rejects malformed persisted adaptive state", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });

    expect(validateTrainingDraft({
      ...draft,
      adaptiveDifficulty: {
        ...draft.adaptiveDifficulty,
        level: "impossible"
      }
    }).valid).toBe(false);
  });

  it("persists writing feedback and restores it without a request", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["feynman"]
    });
    draft.writingJudgeResults[
      "lab:feynman:set-1:explanation"
    ] = {
      methodId: "feynman",
      taskId: "explanation",
      userWriting:
        "Metal moves heat away from a hand faster.",
      result: {
        score: 88,
        accuracy: 95,
        coverage: 80,
        clarity: 90,
        strengths: ["Accurate heat-transfer idea."],
        missingPoints: ["Name thermal conductivity."],
        misconceptions: [],
        verdict: "strong",
        nextAction:
          "Add the name thermal conductivity."
      }
    };

    writeLocalTrainingDraft(draft);
    const resumed = readLocalTrainingDraft({
      kind: "guest"
    });

    expect(resumed).toMatchObject({
      valid: true,
      draft: {
        writingJudgeResults:
          draft.writingJudgeResults
      }
    });
  });

  it("loads a legacy draft without writing feedback as empty", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });
    const {
      writingJudgeResults: _writingJudgeResults,
      ...legacyDraft
    } = draft;
    const validation = validateTrainingDraft(
      legacyDraft
    );

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.draft.writingJudgeResults)
        .toEqual({});
    }
  });

  it("rejects malformed persisted writing feedback", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });

    expect(validateTrainingDraft({
      ...draft,
      writingJudgeResults: {
        invalid: {
          methodId: "feynman",
          taskId: "explanation",
          userWriting: "Some writing",
          result: {
            score: 101
          }
        }
      }
    }).valid).toBe(false);
  });

  it.each([
    [["active-recall"]],
    [[
      "active-recall",
      "feynman",
      "cornell"
    ]]
  ] as const)(
    "accepts a resumable manual session with ordered methods: %j",
    methods => {
      const draft = createTrainingDraft({
        owner: { kind: "guest" },
        mode: "manual",
        selectedMethods: [...methods]
      });
      draft.internalState = {
        introduction: {
          slots: ["knowledge", 0, 0, {}],
          named: {
            "answer-option-orders": {
              [methods[0]]: [...methods]
            }
          }
        }
      };

      const validation = validateTrainingDraft(
        draft,
        { kind: "guest" }
      );

      expect(validation.valid).toBe(true);
      if (validation.valid) {
        expect(validation.draft.selectedMethods)
          .toEqual(methods);
        expect(validation.draft.internalState)
          .toEqual(draft.internalState);
      }
    }
  );

  it("rejects incompatible, cross-owner, and unknown-method drafts", () => {
    const draft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });

    expect(validateTrainingDraft({
      ...draft,
      schemaVersion: 99
    }).valid).toBe(false);

    expect(validateTrainingDraft(
      draft,
      { kind: "user", uid: "user-b" }
    ).valid).toBe(false);

    expect(validateTrainingDraft({
      ...draft,
      selectedMethods: ["not-a-method"]
    }).valid).toBe(false);
  });

  it("keeps guest and signed-in recovery copies isolated", () => {
    const guest = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });
    const user = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "manual",
      selectedMethods: ["feynman"]
    });

    writeLocalTrainingDraft(guest);
    writeLocalTrainingDraft(user);

    expect(getGuestDraftStorageKey()).not.toBe(
      getUserRecoveryStorageKey("user-a")
    );
    expect(
      readLocalTrainingDraft({ kind: "guest" })
    ).toMatchObject({
      valid: true,
      draft: { sessionId: guest.sessionId }
    });
    expect(
      readLocalTrainingDraft({
        kind: "user",
        uid: "user-a"
      })
    ).toMatchObject({
      valid: true,
      draft: { sessionId: user.sessionId }
    });
  });

  it("discards only the matching active local session", () => {
    const owner = {
      kind: "guest"
    } as const;
    const first = createTrainingDraft({
      owner,
      mode: "auto"
    });
    const replacement = createTrainingDraft({
      owner,
      mode: "auto"
    });

    writeLocalTrainingDraft(replacement);
    deleteLocalTrainingDraft(owner, first.sessionId);
    expect(readLocalTrainingDraft(owner)).not.toBeNull();

    deleteLocalTrainingDraft(
      owner,
      replacement.sessionId
    );
    expect(readLocalTrainingDraft(owner)).toBeNull();
  });

  it("does not remove unrelated browser storage while discarding", () => {
    const owner = { kind: "guest" } as const;
    const draft = createTrainingDraft({
      owner,
      mode: "auto"
    });

    window.localStorage.setItem(
      "edulience.preferences",
      "keep-me"
    );
    window.localStorage.setItem(
      GUEST_TRAINING_STREAK_STORAGE_KEY,
      "keep-streak"
    );
    writeLocalTrainingDraft(draft);
    deleteLocalTrainingDraft(owner, draft.sessionId);

    expect(
      window.localStorage.getItem(
        "edulience.preferences"
      )
    ).toBe("keep-me");
    expect(
      window.localStorage.getItem(
        GUEST_TRAINING_STREAK_STORAGE_KEY
      )
    ).toBe("keep-streak");
  });

  it.each([
    ["section 7", { section: 7, phase: "final-save" }],
    ["phase mismatch", { section: 1, phase: "lab" }],
    ["negative revision", { revision: -1 }],
    ["invalid timestamp", { updatedAt: "not-a-date" }]
  ])("rejects an impossible top-level draft: %s", (_label, change) => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "auto"
    });

    expect(validateTrainingDraft({
      ...draft,
      ...change
    }).valid).toBe(false);
  });

  it("rejects manual drafts containing automatic Baseline evidence", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["active-recall"]
    });

    draft.baselineContentSetIds = {
      memory: "baseline-memory-01",
      understanding: "baseline-concept-01"
    };

    expect(validateTrainingDraft(draft).valid)
      .toBe(false);
  });

  it("rejects malformed completed evidence and unknown result methods", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["active-recall"]
    });
    const contentSetId = getMethodDefinition(
      "active-recall"
    ).labContentSetIds[0];

    draft.section = 5;
    draft.phase = "match";
    draft.labContentSetIds = [contentSetId];
    draft.completed.methodIntroduction = {
      methods: ["active-recall"],
      correct: 1,
      total: 1,
      score: 1
    };
    draft.completed.methodLab = {
      experiments: [{
        method: "pomodoro",
        category: "memory",
        score: 1,
        correct: 1,
        total: 1,
        confidence: 5,
        ease: 5,
        willingnessToUse: 5,
        timeSpentMs: 1
      }]
    };

    expect(validateTrainingDraft(draft).valid)
      .toBe(false);
  });

  it("rejects verification state for a method that was not selected", () => {
    const draft = createTrainingDraft({
      owner: { kind: "guest" },
      mode: "manual",
      selectedMethods: ["active-recall"]
    });

    draft.verificationMethodOrder = ["feynman"];

    expect(validateTrainingDraft(draft).valid)
      .toBe(false);
  });

  it("rejects invalid question indices, ratings, timers, and answer orders", () => {
    const contentSetId = getMethodDefinition(
      "active-recall"
    ).labContentSetIds[0];
    const makeDraft = () => {
      const draft = createTrainingDraft({
        owner: { kind: "guest" },
        mode: "manual",
        selectedMethods: ["active-recall"]
      });
      draft.section = 4;
      draft.phase = "lab";
      draft.labContentSetIds = [contentSetId];
      draft.completed.methodIntroduction = {
        methods: ["active-recall"],
        correct: 1,
        total: 1,
        score: 1
      };
      draft.internalState = {
        "lab-controller": {
          slots: [0, [], [contentSetId]],
          named: {}
        },
        [`lab:active-recall:${contentSetId}`]: {
          slots: [
            "test",
            "written recall",
            {},
            0,
            null,
            null,
            null,
            { accumulatedMs: 1, running: true },
            10,
            10
          ],
          named: {}
        }
      };
      return draft;
    };

    const badIndex = makeDraft();
    badIndex.internalState[
      `lab:active-recall:${contentSetId}`
    ].slots[3] = 99;
    expect(validateTrainingDraft(badIndex).valid)
      .toBe(false);

    const badRating = makeDraft();
    badRating.internalState[
      `lab:active-recall:${contentSetId}`
    ].slots[4] = 6;
    expect(validateTrainingDraft(badRating).valid)
      .toBe(false);

    const badTimer = makeDraft();
    badTimer.internalState[
      `lab:active-recall:${contentSetId}`
    ].slots[7] = {
      accumulatedMs: -1,
      running: true
    };
    expect(validateTrainingDraft(badTimer).valid)
      .toBe(false);

    const badOrder = makeDraft();
    badOrder.internalState[
      `lab:active-recall:${contentSetId}`
    ].named = {
      "answer-option-orders": {
        ar1: [
          "A waggle dance",
          "A waggle dance",
          "Building a second hive",
          "Sleeping near the food"
        ]
      }
    };
    expect(validateTrainingDraft(badOrder).valid)
      .toBe(false);
  });
});
