// @vitest-environment jsdom

import React from "react";

import {
  act,
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
  methodLabContentSets,
  methodMatchContentSets
} from "../methodContentSets";
import {
  selectMethodContentSet
} from "../methodContentSelector";
import MethodLab
  from "../sections/MethodLab";
import MethodMatchChallenge
  from "../sections/MethodMatchChallenge";
import {
  TRAINING_METHOD_IDS
} from "../type";

import type {
  MultipleChoiceQuestion
} from "../methodEngineTypes";
import type {
  MethodContentSet
} from "../methodContentSelector";
import type {
  MethodLabResult
} from "../type";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function randomValueForIndex(
  index: number,
  length: number
) {
  return (index + 0.5) / length;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null;
}

function isQuestion(
  value: unknown
): value is MultipleChoiceQuestion {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.question === "string" &&
    Array.isArray(value.options) &&
    value.options.every(
      option => typeof option === "string"
    ) &&
    typeof value.correct === "string";
}

function questionGroups(
  data: unknown
) {
  if (!isRecord(data)) {
    return [];
  }

  return ["questions", "practice", "test"]
    .map(key => data[key])
    .filter(
      (value): value is unknown[] =>
        Array.isArray(value)
    )
    .map(group => {
      expect(group.every(isQuestion)).toBe(true);
      return group.filter(isQuestion);
    });
}

function allQuestions(
  data: unknown
) {
  return questionGroups(data).flat();
}

function completeActiveRecallQuestions(
  questions:
    readonly MultipleChoiceQuestion[]
) {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Start experiment"
    })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "I'm ready"
    })
  );
  fireEvent.change(
    screen.getByPlaceholderText(
      "Write what you remember..."
    ),
    {
      target: {
        value: "A valid retrieval response"
      }
    }
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Continue"
    })
  );

  questions.forEach((question, index) => {
    expect(
      screen.getByRole("heading", {
        name: question.question
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: question.correct
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name:
          index === questions.length - 1
            ? "Finish test"
            : "Next question"
      })
    );
  });

  screen.getAllByRole("button", {
    name: "5"
  }).forEach(button => {
    fireEvent.click(button);
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Complete experiment"
    })
  );
}

describe("method content sets", () => {
  it("provides three Lab and Match sets for every non-media method", () => {
    TRAINING_METHOD_IDS.forEach(method => {
      const expectedLength =
        method === "two-x-video-speed"
          ? 1
          : 3;

      expect(
        methodLabContentSets[method]
      ).toHaveLength(expectedLength);
      expect(
        methodMatchContentSets[method]
      ).toHaveLength(expectedLength);
    });
  });

  it("can select every content set deterministically", () => {
    TRAINING_METHOD_IDS.forEach(method => {
      const contentGroups: readonly (
        readonly MethodContentSet<unknown>[]
      )[] = [
        methodLabContentSets[method],
        methodMatchContentSets[method]
      ];

      contentGroups.forEach(contentSets => {
        contentSets.forEach(
          (contentSet, index) => {
            expect(
              selectMethodContentSet(
                contentSets,
                () => randomValueForIndex(
                  index,
                  contentSets.length
                )
              )
            ).toBe(contentSet);
          }
        );
      });
    });
  });

  it("keeps questions paired with valid content and unique IDs", () => {
    const allIds: string[] = [];

    TRAINING_METHOD_IDS.forEach(method => {
      [
        ...methodLabContentSets[method],
        ...methodMatchContentSets[method]
      ].forEach(({ data }) => {
        expect(isRecord(data)).toBe(true);

        if (!isRecord(data)) {
          return;
        }

        expect(data.method).toBe(method);

        const questions = allQuestions(data);
        expect(questions.length).toBeGreaterThan(0);

        questions.forEach(question => {
          expect(question.options).toContain(
            question.correct
          );
          expect(
            question.options.filter(
              option =>
                option === question.correct
            )
          ).toHaveLength(1);
          allIds.push(question.id);
        });
      });
    });

    expect(new Set(allIds).size).toBe(
      allIds.length
    );
  });

  it.each(TRAINING_METHOD_IDS)(
    "%s keeps its existing objective-question count",
    method => {
      const labGroupLengths = questionGroups(
        methodLabContentSets[method][0].data
      ).map(group => group.length);
      const matchGroupLengths = questionGroups(
        methodMatchContentSets[method][0].data
      ).map(group => group.length);

      methodLabContentSets[method].forEach(
        ({ data }) => {
          expect(
            questionGroups(data).map(
              group => group.length
            )
          ).toEqual(labGroupLengths);
        }
      );
      methodMatchContentSets[method].forEach(
        ({ data }) => {
          expect(
            questionGroups(data).map(
              group => group.length
            )
          ).toEqual(matchGroupLengths);
        }
      );
    }
  );

  it("uses material in Match that is separate from every Lab set", () => {
    TRAINING_METHOD_IDS.forEach(method => {
      const labPayloads =
        methodLabContentSets[method].map(
          ({ data }) => JSON.stringify(data)
        );

      methodMatchContentSets[method].forEach(
        ({ data }) => {
          expect(labPayloads).not.toContain(
            JSON.stringify(data)
          );
        }
      );
    });
  });

  it("keeps a selected Lab set stable across rerenders and timer updates", () => {
    vi.useFakeTimers();

    const contentSets =
      methodLabContentSets["active-recall"];
    const selected = contentSets[1].data;
    const random = vi.fn(() =>
      randomValueForIndex(1, contentSets.length)
    );
    const props = {
      methods: ["active-recall"] as const,
      random,
      onComplete: vi.fn()
    };
    const { rerender } = render(
      <MethodLab
        methods={[...props.methods]}
        random={props.random}
        onComplete={props.onComplete}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );

    expect(
      screen.getByRole("heading", {
        name: selected.topic
      })
    ).toBeTruthy();

    rerender(
      <MethodLab
        methods={[...props.methods]}
        random={props.random}
        onComplete={props.onComplete}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      screen.getByRole("heading", {
        name: selected.topic
      })
    ).toBeTruthy();
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("keeps a selected Match set stable and routes its matching questions", () => {
    const contentSets =
      methodMatchContentSets["active-recall"];
    const selected = contentSets[2].data;
    const random = vi.fn(() =>
      randomValueForIndex(2, contentSets.length)
    );
    const methodLab: MethodLabResult = {
      experiments: [{
        method: "active-recall",
        category: "memory",
        correct: 3,
        total: 3,
        score: 1,
        confidence: 4,
        ease: 4,
        willingnessToUse: 4,
        timeSpentMs: 1000
      }]
    };
    const { rerender } = render(
      <MethodMatchChallenge
        methodLab={methodLab}
        random={random}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: selected.topic
      })
    ).toBeTruthy();

    rerender(
      <MethodMatchChallenge
        methodLab={methodLab}
        random={random}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "What do you remember?"
      ),
      {
        target: {
          value: "A remembered detail"
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );

    expect(
      screen.getByRole("heading", {
        name: selected.questions[0].question
      })
    ).toBeTruthy();
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("scores the selected Match set B through MethodMatchChallenge", () => {
    const selected =
      methodMatchContentSets["active-recall"][1]
        .data;
    const onComplete = vi.fn();
    const methodLab: MethodLabResult = {
      experiments: [{
        method: "active-recall",
        category: "memory",
        correct: 2,
        total: 4,
        score: 0.5,
        confidence: 3,
        ease: 3,
        willingnessToUse: 3,
        timeSpentMs: 1000
      }]
    };

    render(
      <MethodMatchChallenge
        methodLab={methodLab}
        random={() => randomValueForIndex(1, 3)}
        onComplete={onComplete}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "What do you remember?"
      ),
      {
        target: {
          value: "A valid verification retrieval"
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );

    selected.questions.forEach(
      (question, index) => {
        fireEvent.click(
          screen.getByRole("button", {
            name: question.correct
          })
        );
        fireEvent.click(
          screen.getByRole("button", {
            name:
              index ===
                selected.questions.length - 1
                ? "Finish test"
                : "Next question"
          })
        );
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "5"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Complete verification"
      })
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(
      onComplete.mock.calls[0][0].methods[0]
    ).toMatchObject({
      method: "active-recall",
      firstScore: 0.5,
      verificationScore: 1,
      confidence: 5
    });
  });

  it("renders and scores the selected Lab set B through MethodLab", () => {
    const selected =
      methodLabContentSets["active-recall"][1]
        .data;
    const onComplete = vi.fn();

    render(
      <MethodLab
        methods={["active-recall"]}
        random={() => randomValueForIndex(1, 3)}
        onComplete={onComplete}
      />
    );

    completeActiveRecallQuestions(
      selected.questions
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(
      onComplete.mock.calls[0][0]
        .experiments[0]
    ).toMatchObject({
      method: "active-recall",
      category: "memory",
      correct: selected.questions.length,
      total: selected.questions.length,
      score: 1,
      confidence: 5,
      ease: 5,
      willingnessToUse: 5
    });
  });

  it("resets method-local state when MethodLab advances to the next method", () => {
    const selected =
      methodLabContentSets["active-recall"][1]
        .data;

    render(
      <MethodLab
        methods={[
          "active-recall",
          "feynman"
        ]}
        random={() => randomValueForIndex(1, 3)}
        onComplete={vi.fn()}
      />
    );

    completeActiveRecallQuestions(
      selected.questions
    );

    expect(
      screen.getByRole("heading", {
        name: "Feynman Technique"
      })
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );

    expect(
      (
        screen.getByPlaceholderText(
          "Explain the concept..."
        ) as HTMLTextAreaElement
      ).value
    ).toBe("");
  });
});
