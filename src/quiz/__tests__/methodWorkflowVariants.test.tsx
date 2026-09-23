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

import ActiveBlurtingExperiment
  from "../experiments/ActiveBlurtingExperiment";
import OneSentenceExperiment
  from "../experiments/OneSentenceExperiment";
import NoteTaking4x4Experiment
  from "../experiments/NoteTaking4x4Experiment";
import ActiveBlurtingMatch
  from "../matches/ActiveBlurtingMatch";
import OneSentenceMatch
  from "../matches/OneSentenceMatch";
import NoteTaking4x4Match
  from "../matches/NoteTaking4x4Match";
import {
  activeBlurtingExperiment,
  noteTaking4x4Experiment,
  oneSentenceExperiment
} from "../methodLabData";
import {
  activeBlurtingMatchData,
  noteTaking4x4MatchData,
  oneSentenceMatchData
} from "../methodMatchData";

afterEach(() => {
  cleanup();
});

function fillFourFields(
  placeholderPrefix: string,
  valuePrefix: string
) {
  [1, 2, 3, 4].forEach((index) => {
    fireEvent.change(
      screen.getByPlaceholderText(
        `${placeholderPrefix} ${index}...`
      ),
      {
        target: {
          value: `${valuePrefix} ${index}`
        }
      }
    );
  });
}

describe("configured method workflow variants", () => {
  it("adds gap checking to the Active Blurting Lab and Match workflows", () => {
    render(
      <ActiveBlurtingExperiment
        method="active-blurting"
        category="memory"
        name="Active Blurting"
        data={activeBlurtingExperiment}
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
        name: "I'm ready"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Blurt everything you remember..."
      ),
      {
        target: {
          value: "Everything I remember"
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
        name:
          "Compare your blurt with the original material."
      })
    ).toBeTruthy();

    cleanup();

    render(
      <ActiveBlurtingMatch
        method="active-blurting"
        name="Active Blurting"
        data={activeBlurtingMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: activeBlurtingMatchData.topic
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Blurt everything you remember..."
      ),
      {
        target: {
          value: "Everything I remember"
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
        name:
          "Compare your blurt with the source material."
      })
    ).toBeTruthy();
  });

  it("enforces and refines one concise sentence in Lab and Match", () => {
    render(
      <OneSentenceExperiment
        method="one-sentence"
        category="understanding"
        name="1 sentence"
        data={oneSentenceExperiment}
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
        name: "I'm ready"
      })
    );

    const response =
      screen.getByPlaceholderText(
        "Write one concise sentence..."
      );
    const continueButton =
      screen.getByRole("button", {
        name: "Continue"
      }) as HTMLButtonElement;

    fireEvent.change(response, {
      target: {
        value: "This is one sentence. This is another."
      }
    });
    expect(continueButton.disabled).toBe(true);

    fireEvent.change(response, {
      target: {
        value:
          "Vaccination prepares immune memory for a faster response."
      }
    });
    expect(continueButton.disabled).toBe(false);
    fireEvent.click(continueButton);

    expect(
      screen.getByPlaceholderText(
        "Refine your one sentence..."
      )
    ).toBeTruthy();

    cleanup();

    render(
      <OneSentenceMatch
        method="one-sentence"
        name="1 sentence"
        data={oneSentenceMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: oneSentenceMatchData.topic
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "I'm ready"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Write one concise sentence..."
      ),
      {
        target: {
          value:
            "Greenhouse gases slow heat loss to space."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );
    expect(
      screen.getByPlaceholderText(
        "Refine your one sentence..."
      )
    ).toBeTruthy();
  });

  it("requires four sub-ideas and four supporting-detail groups in Lab and Match", () => {
    render(
      <NoteTaking4x4Experiment
        method="note-taking-4x4"
        category="organization"
        name="Note-taking 4x4"
        data={noteTaking4x4Experiment}
        onComplete={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Start experiment"
      })
    );
    fillFourFields("Main point", "Idea");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );

    expect(
      screen.getAllByPlaceholderText(
        /Supporting details [1-4]\.\.\./
      )
    ).toHaveLength(4);

    cleanup();

    render(
      <NoteTaking4x4Match
        method="note-taking-4x4"
        name="Note-taking 4x4"
        data={noteTaking4x4MatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: noteTaking4x4MatchData.topic
      })
    ).toBeTruthy();
    expect(
      screen.getAllByPlaceholderText(
        /Main point [1-4]\.\.\./
      )
    ).toHaveLength(4);
    fillFourFields("Main point", "Layer");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );
    expect(
      screen.getAllByPlaceholderText(
        /Supporting details [1-4]\.\.\./
      )
    ).toHaveLength(4);
  });

  it("uses unseen verification topics for all three methods", () => {
    expect(activeBlurtingMatchData.topic).not.toBe(
      activeBlurtingExperiment.topic
    );
    expect(oneSentenceMatchData.topic).not.toBe(
      oneSentenceExperiment.topic
    );
    expect(noteTaking4x4MatchData.topic).not.toBe(
      noteTaking4x4Experiment.topic
    );
  });
});
