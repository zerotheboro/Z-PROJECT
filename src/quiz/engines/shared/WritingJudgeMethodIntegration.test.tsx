// @vitest-environment jsdom

import React, {
  useState
} from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen
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
} from "../../methodRegistry";
import type {
  TrainingMethodId
} from "../../type";
import type {
  WritingJudgeState
} from "../../writingJudgeState";
import {
  WritingJudgeProvider
} from "./WritingJudgeProvider";

type Stage = "lab" | "match";

function IntegratedMethod({
  method,
  stage,
  onComplete = vi.fn()
}: {
  method: TrainingMethodId;
  stage: Stage;
  onComplete?: (result: unknown) => void;
}) {
  const [state, setState] =
    useState<WritingJudgeState>({});
  const definition = getMethodDefinition(method);
  const contentSetId = stage === "lab"
    ? definition.labContentSetIds[0]
    : definition.matchContentSetIds[0];

  if (!contentSetId) {
    throw new Error(
      `Missing ${stage} content for ${method}`
    );
  }

  const engine = stage === "lab"
    ? definition.renderLab(
        contentSetId,
        onComplete
      )
    : definition.renderMatch(
        contentSetId,
        0,
        onComplete
      );

  return (
    <WritingJudgeProvider
      sessionId="session-writing-0001"
      state={state}
      onChange={setState}
    >
      {engine}
    </WritingJudgeProvider>
  );
}

function reachWritingStage(
  method: TrainingMethodId,
  stage: Stage
) {
  render(
    <IntegratedMethod
      method={method}
      stage={stage}
    />
  );

  if (stage === "lab") {
    fireEvent.click(screen.getByRole("button", {
      name: "Start experiment"
    }));
  }

  if (
    method === "active-recall" ||
    method === "feynman"
  ) {
    fireEvent.click(screen.getByRole("button", {
      name: "I'm ready"
    }));
  }
}

afterEach(() => {
  cleanup();
});

describe("Writing Judge method integration", () => {
  it.each([
    ["active-recall", "lab"],
    ["active-recall", "match"],
    ["feynman", "lab"],
    ["feynman", "match"],
    ["cornell", "lab"],
    ["cornell", "match"]
  ] as const)(
    "exposes an explicit Judge action for %s %s writing",
    (method, stage) => {
      reachWritingStage(method, stage);

      const controls = screen.getAllByRole(
        "button",
        { name: "Judge my writing" }
      );

      expect(controls).toHaveLength(
        method === "cornell" ? 2 : 1
      );
    }
  );

  it("does not complete or score an engine merely by opening its Judge control", () => {
    const onComplete = vi.fn();
    render(
      <IntegratedMethod
        method="cornell"
        stage="match"
        onComplete={onComplete}
      />
    );

    expect(screen.getAllByRole("button", {
      name: "Judge my writing"
    })).toHaveLength(2);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
