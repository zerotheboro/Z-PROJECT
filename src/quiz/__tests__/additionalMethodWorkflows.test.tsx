// @vitest-environment jsdom

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

import AbbreviationExperiment
  from "../experiments/AbbreviationExperiment";
import CaptureCreateExperiment
  from "../experiments/CaptureCreateExperiment";
import HeaderFirstExperiment
  from "../experiments/HeaderFirstExperiment";
import LeitnerSystemExperiment
  from "../experiments/LeitnerSystemExperiment";
import StoryTellingExperiment
  from "../experiments/StoryTellingExperiment";
import AbbreviationMatch
  from "../matches/AbbreviationMatch";
import CaptureCreateMatch
  from "../matches/CaptureCreateMatch";
import HeaderFirstMatch
  from "../matches/HeaderFirstMatch";
import LeitnerSystemMatch
  from "../matches/LeitnerSystemMatch";
import StoryTellingMatch
  from "../matches/StoryTellingMatch";
import {
  abbreviationExperiment,
  captureCreateExperiment,
  headerFirstExperiment,
  leitnerSystemExperiment,
  storyTellingExperiment
} from "../methodLabData";
import {
  abbreviationMatchData,
  captureCreateMatchData,
  headerFirstMatchData,
  leitnerSystemMatchData,
  storyTellingMatchData
} from "../methodMatchData";

afterEach(() => {
  cleanup();
});

describe("additional method workflows", () => {
  it("sorts missed Leitner cards for weak-item retesting", () => {
    render(
      <LeitnerSystemExperiment
        method="leitner-system"
        category="memory"
        name="Leitner system"
        data={leitnerSystemExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Start recall"
      })
    );

    leitnerSystemExperiment.practice.forEach(
      (question, index) => {
        const incorrect = question.options.find(
          (option) => option !== question.correct
        );

        fireEvent.click(
          screen.getByRole("button", {
            name: incorrect
          })
        );
        fireEvent.click(
          screen.getByRole("button", {
            name:
              index ===
              leitnerSystemExperiment.practice
                .length -
                1
                ? "Organize levels"
                : "Next card"
          })
        );
      }
    );

    expect(
      screen.getByRole("button", {
        name: "Retest weak items"
      })
    ).toBeTruthy();

    cleanup();

    render(
      <LeitnerSystemMatch
        method="leitner-system"
        name="Leitner system"
        data={leitnerSystemMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: leitnerSystemMatchData.topic
      })
    ).toBeTruthy();
  });

  it("requires a connected story before reconstruction", () => {
    render(
      <StoryTellingExperiment
        method="story-telling"
        category="memory"
        name="Story telling"
        data={storyTellingExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create a story"
      })
    );

    const useStoryButton = screen.getByRole(
      "button",
      { name: "Use my story" }
    ) as HTMLButtonElement;
    expect(useStoryButton.disabled).toBe(true);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Write a connected story..."
      ),
      {
        target: {
          value:
            "A connected story that preserves every step in its original order."
        }
      }
    );
    fireEvent.click(useStoryButton);

    expect(
      screen.getByPlaceholderText(
        "Reconstruct the original sequence..."
      )
    ).toBeTruthy();

    cleanup();

    render(
      <StoryTellingMatch
        method="story-telling"
        name="Story telling"
        data={storyTellingMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: storyTellingMatchData.topic
      })
    ).toBeTruthy();
  });

  it("captures knowledge before the four creation prompts", () => {
    render(
      <CaptureCreateExperiment
        method="capture-create"
        category="understanding"
        name="capture & create"
        data={captureCreateExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Capture the knowledge"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Capture the key knowledge..."
      ),
      {
        target: {
          value:
            "The central idea captured clearly in my own words."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create with it"
      })
    );

    [
      "What is it?",
      "Why does it matter?",
      "How can it be applied?",
      "When would it be useful?"
    ].forEach((prompt) => {
      expect(
        screen.getByRole("heading", {
          name: prompt
        })
      ).toBeTruthy();
    });

    cleanup();

    render(
      <CaptureCreateMatch
        method="capture-create"
        name="capture & create"
        data={captureCreateMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: captureCreateMatchData.topic
      })
    ).toBeTruthy();
  });

  it("requires a mnemonic before item reconstruction", () => {
    render(
      <AbbreviationExperiment
        method="abbreviation"
        category="memory"
        name="ABBREVIATION!"
        data={abbreviationExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create an abbreviation"
      })
    );

    const useMnemonicButton = screen.getByRole(
      "button",
      { name: "Use my mnemonic" }
    ) as HTMLButtonElement;
    expect(useMnemonicButton.disabled).toBe(true);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Create your abbreviation or mnemonic..."
      ),
      { target: { value: "TEMES" } }
    );
    fireEvent.click(useMnemonicButton);

    expect(
      screen.getByPlaceholderText(
        "Recall the original items..."
      )
    ).toBeTruthy();

    cleanup();

    render(
      <AbbreviationMatch
        method="abbreviation"
        name="ABBREVIATION!"
        data={abbreviationMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: abbreviationMatchData.topic
      })
    ).toBeTruthy();
  });

  it("previews HEADER first headings before revealing full text", () => {
    render(
      <HeaderFirstExperiment
        method="header-first"
        category="organization"
        name="HEADER first"
        data={headerFirstExperiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );

    expect(
      screen.queryByText(
        headerFirstExperiment.sections[0].content
      )
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Make a prediction"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Predict the organization and key ideas..."
      ),
      {
        target: {
          value:
            "The headings suggest a sequence for managing a city's water."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Read the full material"
      })
    );

    expect(
      screen.getByText(
        headerFirstExperiment.sections[0].content
      )
    ).toBeTruthy();

    cleanup();

    render(
      <HeaderFirstMatch
        method="header-first"
        name="HEADER first"
        data={headerFirstMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: headerFirstMatchData.topic
      })
    ).toBeTruthy();
  });

  it("uses unseen verification topics for all five methods", () => {
    expect(leitnerSystemMatchData.topic).not.toBe(
      leitnerSystemExperiment.topic
    );
    expect(storyTellingMatchData.topic).not.toBe(
      storyTellingExperiment.topic
    );
    expect(captureCreateMatchData.topic).not.toBe(
      captureCreateExperiment.topic
    );
    expect(abbreviationMatchData.topic).not.toBe(
      abbreviationExperiment.topic
    );
    expect(headerFirstMatchData.topic).not.toBe(
      headerFirstExperiment.topic
    );
  });
});
