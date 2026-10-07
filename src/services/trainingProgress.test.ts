// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const firestore = vi.hoisted(() => ({
  activeSessionId: null as string | null,
  cloudData: null as Record<string, unknown> | null,
  delete: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  set: vi.fn(),
  runTransaction: vi.fn()
}));

vi.mock("firebase/firestore", () => ({
  deleteDoc: firestore.deleteDoc,
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  runTransaction: firestore.runTransaction,
  serverTimestamp: firestore.serverTimestamp
}));

vi.mock("../firebase", () => ({
  db: { name: "test-db" }
}));

import {
  discardTrainingDraft,
  loadTrainingDraft,
  readLocalTrainingDraft,
  saveTrainingDraft,
  TrainingDraftConflictError
} from "./trainingProgress";
import {
  createTrainingDraft
} from "../quiz/trainingProgress";
import {
  getMethodDefinition
} from "../quiz/methodRegistry";

import type {
  TrainingDraft,
  TrainingMode
} from "../quiz/trainingProgress";
import type {
  TrainingMethodId
} from "../quiz/type";

const TEST_METHODS: readonly TrainingMethodId[] = [
  "active-recall",
  "feynman",
  "cornell"
];

function hasDirectNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return (
      value.some(Array.isArray) ||
      value.some(hasDirectNestedArray)
    );
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    return Object.values(value).some(
      hasDirectNestedArray
    );
  }

  return false;
}

function labResult(method: TrainingMethodId) {
  return {
    method,
    category: getMethodDefinition(method).category,
    score: 0,
    correct: 0,
    total: 1,
    confidence: 1,
    ease: 1,
    willingnessToUse: 1,
    timeSpentMs: 0
  } as const;
}

function matchResult(method: TrainingMethodId) {
  return {
    method,
    firstScore: 0,
    verificationScore: 0,
    confidence: 1,
    timeSpentMs: 0
  } as const;
}

type CloudStage =
  | "introduction"
  | "lab-mount"
  | "lab-interaction"
  | "lab-completion"
  | "match-mount"
  | "match-interaction"
  | "match-completion"
  | "reflection";

function stageDraft(
  mode: TrainingMode,
  methodCount: number,
  stage: CloudStage
): TrainingDraft {
  const methods = TEST_METHODS.slice(
    0,
    methodCount
  );
  const draft = createTrainingDraft({
    owner: { kind: "user", uid: "user-a" },
    mode,
    selectedMethods: [...methods]
  });
  const labIds = methods.map(method =>
    getMethodDefinition(method).labContentSetIds[0]
  );
  const verificationMethods = methods.slice(
    0,
    Math.min(2, methods.length)
  );
  const matchIds = verificationMethods.map(method =>
    getMethodDefinition(method).matchContentSetIds[0]
  );

  draft.selectedMethods = [...methods];
  draft.currentMethod = methods[0];
  draft.currentMethodIndex = 0;

  if (stage === "introduction") {
    draft.section = 3;
    draft.phase = "introduction";
    draft.internalState = {
      introduction: {
        slots: ["knowledge", 0, 0, {}],
        named: {
          "answer-option-orders": {
            introduction: [...methods]
          }
        }
      }
    };
    return draft;
  }

  draft.section = 4;
  draft.phase = "lab";
  draft.labContentSetIds = labIds;
  draft.completed.methodIntroduction = {
    methods: [...methods],
    correct: 0,
    total: methods.length,
    score: 0
  };
  const labResults = methods.map(labResult);
  const savedLabResults = stage === "lab-mount"
    ? []
    : stage === "lab-interaction"
      ? labResults.slice(0, 1)
      : labResults;
  draft.internalState = {
    "lab-controller": {
      slots: [0, savedLabResults, labIds],
      named: {}
    }
  };

  if (stage.startsWith("lab")) {
    return draft;
  }

  draft.section = 5;
  draft.phase = "match";
  draft.completed.methodLab = {
    experiments: labResults
  };
  draft.verificationMethodOrder = [
    ...verificationMethods
  ];
  draft.matchContentSetIds = matchIds;
  const matchResults = verificationMethods.map(
    matchResult
  );
  const savedMatchResults = stage === "match-mount"
    ? []
    : stage === "match-interaction"
      ? matchResults.slice(0, 1)
      : matchResults;
  draft.internalState = {
    "match-controller": {
      slots: [0, savedMatchResults, matchIds],
      named: {}
    }
  };

  if (stage.startsWith("match")) {
    return draft;
  }

  draft.section = 6;
  draft.phase = "reflection";
  draft.completed.methodMatch = {
    methods: matchResults
  };
  draft.internalState = {
    reflection: {
      slots: [null, false, null, null, ""],
      named: {}
    }
  };
  return draft;
}

function latestCloudPayload(): Record<string, unknown> {
  return firestore.set.mock.calls.at(-1)?.[1] as
    Record<string, unknown>;
}

describe("cloud training draft safety", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) =>
          values.get(key) ?? null,
        removeItem: (key: string) =>
          values.delete(key),
        setItem: (key: string, value: string) =>
          values.set(key, value)
      }
    });

    firestore.activeSessionId = null;
    firestore.cloudData = null;
    firestore.doc.mockReturnValue("active-draft-ref");
    firestore.getDoc.mockImplementation(async () => ({
      exists: () => firestore.cloudData !== null,
      data: () => firestore.cloudData
    }));
    firestore.serverTimestamp.mockReturnValue(
      "server-time"
    );
    firestore.runTransaction.mockImplementation(
      async (_db, callback) => callback({
        get: vi.fn().mockResolvedValue({
          exists: () =>
            firestore.activeSessionId !== null,
          data: () => ({
            sessionId: firestore.activeSessionId
          })
        }),
        set: firestore.set,
        delete: firestore.delete
      })
    );
  });

  it("writes only the authenticated user's active draft path", async () => {
    const draft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });

    await saveTrainingDraft(draft, {
      allowCreate: true
    });

    expect(firestore.doc).toHaveBeenCalledWith(
      { name: "test-db" },
      "users",
      "user-a",
      "trainingProgress",
      "active"
    );
    expect(firestore.set).toHaveBeenCalledWith(
      "active-draft-ref",
      expect.objectContaining({
        sessionId: draft.sessionId,
        owner: {
          kind: "user",
          uid: "user-a"
        }
      })
    );
  });

  it("rejects stale saves and removes their local recovery copy", async () => {
    const draft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });
    firestore.activeSessionId = "newer-session";

    await expect(
      saveTrainingDraft(draft)
    ).rejects.toBeInstanceOf(
      TrainingDraftConflictError
    );

    expect(firestore.set).not.toHaveBeenCalled();
    expect(readLocalTrainingDraft(draft.owner))
      .toBeNull();
  });

  it.each(["manual", "auto"] as const)(
    "encodes every %s training stage for 1, 2, and 3 methods at the cloud boundary",
    async mode => {
      const stages: CloudStage[] = [
        "introduction",
        "lab-mount",
        "lab-interaction",
        "lab-completion",
        "match-mount",
        "match-interaction",
        "match-completion",
        "reflection"
      ];

      for (const methodCount of [1, 2, 3]) {
        for (const stage of stages) {
          firestore.set.mockClear();
          const draft = stageDraft(
            mode,
            methodCount,
            stage
          );

          await saveTrainingDraft(draft, {
            allowCreate: true
          });

          const cloudPayload = latestCloudPayload();
          expect(
            hasDirectNestedArray(cloudPayload),
            `${mode}, ${methodCount} methods, ${stage}`
          ).toBe(false);
          expect(cloudPayload).toHaveProperty(
            "cloudUpdatedAt",
            "server-time"
          );
        }
      }
    }
  );

  it.each([
    "lab-mount",
    "match-mount"
  ] as const)(
    "round-trips exact %s state through cloud save, load, validation, and local recovery",
    async stage => {
      const draft = stageDraft("manual", 1, stage);

      await saveTrainingDraft(draft, {
        allowCreate: true
      });

      const cloudPayload = latestCloudPayload();
      firestore.cloudData = cloudPayload;

      const loaded = await loadTrainingDraft(
        draft.owner
      );
      const local = readLocalTrainingDraft(
        draft.owner
      );

      expect(loaded).toEqual({
        valid: true,
        draft
      });
      expect(local).toEqual({
        valid: true,
        draft
      });
      expect(
        local?.valid &&
        local.draft.internalState[
          stage === "lab-mount"
            ? "lab-controller"
            : "match-controller"
        ].slots
      ).toEqual(
        stage === "lab-mount"
          ? [0, [], ["active-recall-lab-1"]]
          : [0, [], ["active-recall-match-1"]]
      );
    }
  );

  it("loads an older unencoded cloud draft without migration", async () => {
    const draft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });
    firestore.cloudData = {
      ...draft,
      cloudUpdatedAt: "legacy-cloud-time"
    };

    await expect(
      loadTrainingDraft(draft.owner)
    ).resolves.toEqual({
      valid: true,
      draft
    });
  });

  it("keeps cloud-first loading and local recovery fallback behavior", async () => {
    const localDraft = createTrainingDraft({
      owner: { kind: "user", uid: "user-a" },
      mode: "auto"
    });
    const cloudDraft = createTrainingDraft({
      owner: localDraft.owner,
      mode: "auto"
    });
    cloudDraft.revision = 2;
    firestore.cloudData = {
      ...cloudDraft,
      cloudUpdatedAt: "cloud-time"
    };

    await saveTrainingDraft(localDraft, {
      allowCreate: true
    });
    firestore.cloudData = {
      ...cloudDraft,
      cloudUpdatedAt: "cloud-time"
    };

    await expect(
      loadTrainingDraft(localDraft.owner)
    ).resolves.toEqual({
      valid: true,
      draft: cloudDraft
    });

    firestore.getDoc.mockRejectedValueOnce(
      new Error("offline")
    );
    await expect(
      loadTrainingDraft(localDraft.owner)
    ).resolves.toEqual({
      valid: true,
      draft: localDraft
    });
  });

  it("deletes only a matching active session", async () => {
    const owner = {
      kind: "user",
      uid: "user-a"
    } as const;
    firestore.activeSessionId = "replacement";

    await discardTrainingDraft(owner, "older-session");
    expect(firestore.delete).not.toHaveBeenCalled();

    await discardTrainingDraft(owner, "replacement");
    expect(firestore.doc).toHaveBeenCalledWith(
      { name: "test-db" },
      "users",
      "user-a",
      "trainingProgress",
      "active"
    );
    expect(firestore.delete).toHaveBeenCalledWith(
      "active-draft-ref"
    );
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
  });
});
