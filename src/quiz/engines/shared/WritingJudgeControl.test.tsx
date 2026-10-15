// @vitest-environment jsdom

import React, {
  useState
} from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import TextResponse from "./TextResponse";
import {
  WritingJudgeProvider,
  WritingJudgeScope
} from "./WritingJudgeProvider";
import {
  AdaptiveDifficultyProvider
} from "./AdaptiveDifficultyProvider";
import {
  createAdaptiveDifficultyState
} from "./adaptiveDifficulty";

import type {
  WritingJudgeResult,
  WritingJudgeState
} from "../../writingJudgeState";

const mocks = vi.hoisted(() => ({
  judgeTrainingWriting: vi.fn(),
  user: {
    uid: "writing-user",
    getIdToken: vi.fn().mockResolvedValue(
      "firebase-token"
    )
  }
}));

vi.mock("../../../firebase", () => ({
  auth: {
    currentUser: mocks.user
  }
}));

vi.mock(
  "../../../services/writingJudge",
  () => ({
    judgeTrainingWriting:
      mocks.judgeTrainingWriting
  })
);

const feedback: WritingJudgeResult = {
  score: 88,
  accuracy: 95,
  coverage: 80,
  clarity: 90,
  strengths: ["Accurate central idea."],
  missingPoints: ["Name the key process."],
  misconceptions: [],
  verdict: "strong",
  nextAction: "Add the missing process name."
};

let latestState: WritingJudgeState = {};

function Harness({
  initialState = {},
  initialWriting =
    "Metal transfers heat away from the hand faster."
}: {
  initialState?: WritingJudgeState;
  initialWriting?: string;
}) {
  const [state, setState] = useState(
    initialState
  );
  const [writing, setWriting] = useState(
    initialWriting
  );

  return (
    <WritingJudgeProvider
      sessionId="session-writing-0001"
      state={state}
      onChange={next => {
        latestState = next;
        setState(next);
      }}
    >
      <WritingJudgeScope
        name="lab:feynman:set-1"
        methodId="feynman"
      >
        <TextResponse
          value={writing}
          onChange={setWriting}
          placeholder="Explain the concept..."
          judge={{
            taskId: "explanation",
            sourceMaterial:
              "Metal conducts heat faster than wood."
          }}
        />
      </WritingJudgeScope>
    </WritingJudgeProvider>
  );
}

beforeEach(() => {
  latestState = {};
  mocks.judgeTrainingWriting.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("Training writing judge UI", () => {
  it("prevents duplicate submissions while judging", async () => {
    let resolveRequest:
      ((result: WritingJudgeResult) => void) |
      undefined;
    mocks.judgeTrainingWriting.mockReturnValue(
      new Promise<WritingJudgeResult>(resolve => {
        resolveRequest = resolve;
      })
    );
    render(<Harness />);

    const button = screen.getByRole("button", {
      name: "Judge my writing"
    });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mocks.judgeTrainingWriting)
      .toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", {
      name: "Judging..."
    }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveRequest?.(feedback);
    });
  });

  it("preserves writing and shows a retryable error after failure", async () => {
    mocks.judgeTrainingWriting.mockRejectedValue(
      new Error(
        "Writing evaluation failed. Please try again."
      )
    );
    render(<Harness />);

    const writing = screen.getByRole(
      "textbox"
    ) as HTMLTextAreaElement;
    const before = writing.value;
    fireEvent.click(screen.getByRole("button", {
      name: "Judge my writing"
    }));

    expect((await screen.findByRole("alert"))
      .textContent).toContain(
      "Writing evaluation failed. Please try again."
    );
    expect(writing.value).toBe(before);
    expect((screen.getByRole("button", {
      name: "Judge my writing"
    }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders validated successful feedback", async () => {
    mocks.judgeTrainingWriting.mockResolvedValue(
      feedback
    );
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", {
      name: "Judge my writing"
    }));

    const panel = await screen.findByRole(
      "region",
      { name: "AI writing feedback" }
    );
    expect(panel.textContent).toContain(
      "Overall score: 88/100"
    );
    expect(panel.textContent).toContain(
      "Accuracy: 95/100"
    );
    expect(panel.textContent).toContain(
      "Coverage: 80/100"
    );
    expect(panel.textContent).toContain(
      "Clarity: 90/100"
    );
    expect(panel.textContent).toContain(
      "Accurate central idea."
    );
    expect(panel.textContent).toContain(
      "Add the missing process name."
    );
  });

  it("keeps previous successful feedback when a retry fails", async () => {
    const writing =
      "Metal transfers heat away from the hand faster.";
    const persisted: WritingJudgeState = {
      "lab:feynman:set-1:explanation": {
        methodId: "feynman",
        taskId: "explanation",
        userWriting: writing,
        result: feedback
      }
    };
    mocks.judgeTrainingWriting.mockRejectedValue(
      new Error("Temporary evaluation failure")
    );

    render(
      <Harness
        initialState={persisted}
        initialWriting={writing}
      />
    );
    expect(screen.getByText(
      "Accurate central idea."
    )).toBeTruthy();

    fireEvent.click(screen.getByRole("button", {
      name: "Judge my writing"
    }));

    await screen.findByRole("alert");
    expect(screen.getByText(
      "Accurate central idea."
    )).toBeTruthy();
    expect(screen.getByRole("textbox"))
      .toHaveProperty("value", writing);
  });

  it("does not update Adaptive Difficulty when feedback succeeds", async () => {
    const adaptiveChange = vi.fn();
    mocks.judgeTrainingWriting.mockResolvedValue(
      feedback
    );

    render(
      <AdaptiveDifficultyProvider
        state={createAdaptiveDifficultyState()}
        onChange={adaptiveChange}
      >
        <Harness />
      </AdaptiveDifficultyProvider>
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Judge my writing"
    }));
    await screen.findByText(
      "Accurate central idea."
    );

    expect(adaptiveChange).not.toHaveBeenCalled();
  });

  it("restores persisted feedback after Back or remount without another request", async () => {
    mocks.judgeTrainingWriting.mockResolvedValue(
      feedback
    );
    const first = render(<Harness />);
    fireEvent.click(screen.getByRole("button", {
      name: "Judge my writing"
    }));
    await screen.findByText(
      "Accurate central idea."
    );
    const persisted = latestState;
    first.unmount();
    mocks.judgeTrainingWriting.mockClear();

    const restored = render(
      <Harness initialState={persisted} />
    );

    expect(screen.getByText(
      "Accurate central idea."
    )).toBeTruthy();
    expect(mocks.judgeTrainingWriting)
      .not.toHaveBeenCalled();

    restored.rerender(
      <Harness initialState={persisted} />
    );
    await waitFor(() => {
      expect(mocks.judgeTrainingWriting)
        .not.toHaveBeenCalled();
    });
  });
});
