// @vitest-environment jsdom

import React from "react";

import {
  cleanup,
  render,
  waitFor
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  getMethodDefinition
} from "../methodRegistry";
import {
  createTrainingDraft,
  validateTrainingDraft
} from "../trainingProgress";
import {
  TrainingProgressStateProvider
} from "../trainingProgressState";
import {
  TRAINING_METHOD_IDS
} from "../type";

import type {
  TrainingInternalState
} from "../trainingProgress";
import type {
  TrainingMethodId
} from "../type";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function resultFor(method: TrainingMethodId) {
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

function baseManualDraft(method: TrainingMethodId) {
  const draft = createTrainingDraft({
    owner: { kind: "guest" },
    mode: "manual",
    selectedMethods: [method]
  });
  draft.completed.methodIntroduction = {
    methods: [method],
    correct: 0,
    total: 1,
    score: 0
  };
  return draft;
}

async function captureState(
  child: React.ReactNode,
  scope: string
): Promise<TrainingInternalState> {
  let snapshot: TrainingInternalState = {};
  const view = render(
    <TrainingProgressStateProvider
      state={snapshot}
      onChange={state => {
        snapshot = state;
      }}
    >
      {child}
    </TrainingProgressStateProvider>
  );

  await waitFor(() => {
    expect(snapshot[scope]?.slots.length)
      .toBeGreaterThan(0);
  });
  view.unmount();
  return snapshot;
}

describe("method-specific resumable scope validation", () => {
  it.each(TRAINING_METHOD_IDS)(
    "accepts the real initial Lab state for %s",
    async method => {
      const definition = getMethodDefinition(method);
      const contentId = definition.labContentSetIds[0];
      const scope = `lab:${method}:${contentId}`;
      const internalState = await captureState(
        definition.renderLab(contentId, vi.fn()),
        scope
      );
      const draft = baseManualDraft(method);

      draft.section = 4;
      draft.phase = "lab";
      draft.labContentSetIds = [contentId];
      draft.internalState = internalState;

      expect(validateTrainingDraft(draft)).toMatchObject({
        valid: true
      });
    }
  );

  it.each(TRAINING_METHOD_IDS)(
    "accepts the real initial Match state for %s",
    async method => {
      const definition = getMethodDefinition(method);
      const labContentId = definition.labContentSetIds[0];
      const matchContentId = definition.matchContentSetIds[0];
      const scope = `match:${method}:${matchContentId}`;
      const internalState = await captureState(
        definition.renderMatch(
          matchContentId,
          0,
          vi.fn()
        ),
        scope
      );
      const draft = baseManualDraft(method);

      draft.section = 5;
      draft.phase = "match";
      draft.labContentSetIds = [labContentId];
      draft.completed.methodLab = {
        experiments: [resultFor(method)]
      };
      draft.verificationMethodOrder = [method];
      draft.matchContentSetIds = [matchContentId];
      draft.internalState = internalState;

      expect(validateTrainingDraft(draft)).toMatchObject({
        valid: true
      });
    }
  );
});
