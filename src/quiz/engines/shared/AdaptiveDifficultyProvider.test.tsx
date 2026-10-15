// @vitest-environment jsdom

import React, {
  useState
} from "react";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";

import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import MultipleChoiceRunner
  from "./MultipleChoiceRunner";
import {
  AdaptiveDifficultyProvider,
  AdaptiveDifficultyScope
} from "./AdaptiveDifficultyProvider";
import {
  createAdaptiveDifficultyState
} from "./adaptiveDifficulty";

import type {
  MultipleChoiceQuestion
} from "../../methodEngineTypes";

const questions: MultipleChoiceQuestion[] =
  Array.from({ length: 4 }, (_, index) => ({
    id: `adaptive-${index + 1}`,
    question: `Adaptive question ${index + 1}`,
    options: [
      `Correct ${index + 1}`,
      `Wrong A ${index + 1}`,
      `Wrong B ${index + 1}`,
      `Wrong C ${index + 1}`
    ],
    correct: `Correct ${index + 1}`
  }));

afterEach(() => {
  cleanup();
});

function AdaptiveRunnerHarness() {
  const [state, setState] = useState(
    createAdaptiveDifficultyState
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});
  const current = questions[index];

  return (
    <>
      <output aria-label="difficulty">
        {state.level}
      </output>
      <output aria-label="processed events">
        {state.processedEventIds.length}
      </output>
      <AdaptiveDifficultyProvider
        state={state}
        onChange={setState}
      >
        <AdaptiveDifficultyScope name="lab:test:set-1">
          <MultipleChoiceRunner
            question={current}
            selectedAnswer={answers[current.id]}
            onSelect={option =>
              setAnswers(previous => ({
                ...previous,
                [current.id]: option
              }))
            }
            onBack={() =>
              setIndex(previous =>
                Math.max(0, previous - 1)
              )
            }
            backDisabled={index === 0}
            onNext={() =>
              setIndex(previous =>
                Math.min(
                  questions.length - 1,
                  previous + 1
                )
              )
            }
            nextLabel="Next question"
            random={() => 0.999}
          />
        </AdaptiveDifficultyScope>
      </AdaptiveDifficultyProvider>
    </>
  );
}

function optionCount() {
  return document.querySelectorAll(
    ".option-grid button"
  ).length;
}

function answerCurrentCorrectly(number: number) {
  fireEvent.click(screen.getByRole("button", {
    name: `Correct ${number}`
  }));
  fireEvent.click(screen.getByRole("button", {
    name: "Next question"
  }));
}

describe("adaptive multiple-choice integration", () => {
  it("applies a committed window to the next challenge", async () => {
    render(<AdaptiveRunnerHarness />);

    expect(optionCount()).toBe(3);
    answerCurrentCorrectly(1);
    expect(optionCount()).toBe(3);
    answerCurrentCorrectly(2);
    expect(optionCount()).toBe(3);
    answerCurrentCorrectly(3);

    await waitFor(() => {
      expect(
        screen.getByLabelText("difficulty")
          .textContent
      ).toBe("hard");
    });
    expect(screen.getByRole("heading", {
      name: "Adaptive question 4"
    })).toBeTruthy();
    expect(optionCount()).toBe(4);

    fireEvent.click(screen.getByRole("button", {
      name: "Back"
    }));
    expect(screen.getByRole("heading", {
      name: "Adaptive question 3"
    })).toBeTruthy();
    expect(optionCount()).toBe(3);
    expect(screen.getByRole("button", {
      name: "Correct 3"
    }).classList.contains("selected")).toBe(true);

    fireEvent.click(screen.getByRole("button", {
      name: "Next question"
    }));
    expect(
      screen.getByLabelText("processed events")
        .textContent
    ).toBe("3");
    expect(optionCount()).toBe(4);
  });

  it("does not count a previously committed question again after Back", async () => {
    render(<AdaptiveRunnerHarness />);

    answerCurrentCorrectly(1);
    await waitFor(() => {
      expect(
        screen.getByLabelText("processed events")
          .textContent
      ).toBe("1");
    });

    fireEvent.click(screen.getByRole("button", {
      name: "Back"
    }));
    expect(screen.getByRole("button", {
      name: "Correct 1"
    }).classList.contains("selected")).toBe(true);
    fireEvent.click(screen.getByRole("button", {
      name: "Next question"
    }));

    expect(
      screen.getByLabelText("processed events")
        .textContent
    ).toBe("1");
    expect(
      screen.getByLabelText("difficulty")
        .textContent
    ).toBe("medium");
  });
});
