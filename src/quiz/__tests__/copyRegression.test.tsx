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

import FeynmanExperiment
  from "../experiments/FeynmanExperiment";
import CornellMatch
  from "../matches/CornellMatch";
import FeynmanMatch
  from "../matches/FeynmanMatch";
import {
  feynmanExperiment
} from "../methodLabData";
import {
  activeRecallMatchData,
  cornellMatchData,
  feynmanMatchData,
  interleavingMatchData,
  memoryPalaceMatchData
} from "../methodMatchData";
import {
  methodRegistry
} from "../methodRegistry";
import {
  TRAINING_METHOD_IDS
} from "../type";
import type {
  TrainingMethodId
} from "../type";

const EXISTING_METHOD_IDS = [
  "active-recall",
  "feynman",
  "cornell",
  "interleaving",
  "memory-palace"
] as const satisfies readonly TrainingMethodId[];

afterEach(() => {
  cleanup();
});

function answerQuestions(
  questions: readonly {
    options: readonly string[];
  }[],
  nextLabel: string,
  finishLabel: string
) {
  questions.forEach((question, index) => {
    fireEvent.click(
      screen.getByRole("button", {
        name: question.options[0]
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name:
          index === questions.length - 1
            ? finishLabel
            : nextLabel
      })
    );
  });
}

describe("current method copy", () => {
  it("keeps metadata, introductions, and verification headings stable for all five methods", () => {
    const matchData = {
      "active-recall": activeRecallMatchData,
      feynman: feynmanMatchData,
      cornell: cornellMatchData,
      interleaving: interleavingMatchData,
      "memory-palace": memoryPalaceMatchData
    };

    const copy = EXISTING_METHOD_IDS.map((id) => ({
      id,
      name: methodRegistry[id].name,
      shortName: methodRegistry[id].shortName,
      introduction: methodRegistry[id].introduction,
      verificationHeading:
        matchData[id].title.toUpperCase()
    }));

    expect(copy).toMatchSnapshot();
  });

  it("registers exactly the three approved new display names", () => {
    expect(
      TRAINING_METHOD_IDS.slice(5, 8).map(
        (id) => ({
          id,
          name: methodRegistry[id].name
        })
      )
    ).toEqual([
      {
        id: "active-blurting",
        name: "Active Blurting"
      },
      {
        id: "one-sentence",
        name: "1 sentence"
      },
      {
        id: "note-taking-4x4",
        name: "Note-taking 4x4"
      }
    ]);
  });

  it("registers exactly the five approved additional display names", () => {
    expect(
      TRAINING_METHOD_IDS.slice(8, 13).map(
        (id) => ({
          id,
          name: methodRegistry[id].name
        })
      )
    ).toEqual([
      {
        id: "leitner-system",
        name: "Leitner system"
      },
      {
        id: "story-telling",
        name: "Story telling"
      },
      {
        id: "capture-create",
        name: "capture & create"
      },
      {
        id: "abbreviation",
        name: "ABBREVIATION!"
      },
      {
        id: "header-first",
        name: "HEADER first"
      }
    ]);
  });

  it("registers exactly the five newest approved display names", () => {
    expect(TRAINING_METHOD_IDS.slice(13).map((id) => ({ id, name: methodRegistry[id].name }))).toEqual([
      { id: "prime-question", name: "Prime question" },
      { id: "doodle-effect", name: "the Doodle effect" },
      { id: "eighty-twenty-rule", name: "80/20 rule" },
      { id: "divide-steps", name: "divide steps" },
      { id: "derive-basics", name: "derive basics" }
    ]);
  });

  it("preserves the Feynman verification heading", () => {
    render(
      <FeynmanMatch
        method="feynman"
        name="Feynman Technique"
        data={feynmanMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    expect(
      screen.getByText("FEYNMAN · ROUND 2")
    ).toBeTruthy();
  });

  it("preserves the Feynman reflection prompt", () => {
    render(
      <FeynmanExperiment
        method="feynman"
        category="understanding"
        name="Feynman Technique"
        data={feynmanExperiment}
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
        "Explain the concept..."
      ),
      {
        target: {
          value:
            "A sufficiently detailed explanation."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Explain it simply..."
      ),
      {
        target: {
          value: "A simple explanation."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to test"
      })
    );

    answerQuestions(
      feynmanExperiment.questions,
      "Next question",
      "Finish test"
    );

    expect(
      screen.getByRole("heading", {
        name:
          "How did the Feynman Technique feel?"
      })
    ).toBeTruthy();
  });

  it("preserves the Cornell verification prompt", () => {
    render(
      <CornellMatch
        method="cornell"
        name="Cornell Notes"
        shortName="Cornell"
        data={cornellMatchData}
        originalScore={0.5}
        onComplete={vi.fn()}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        "Important words or questions..."
      ),
      {
        target: {
          value: "Important cues"
        }
      }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Organize the important information..."
      ),
      {
        target: {
          value:
            "Detailed notes long enough to continue."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue"
      })
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Short summary..."
      ),
      {
        target: {
          value:
            "A summary long enough to continue."
        }
      }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue to test"
      })
    );

    answerQuestions(
      cornellMatchData.questions,
      "Next question",
      "Finish test"
    );

    expect(
      screen.getByRole("heading", {
        name:
          "How confident are you that Cornell helped you organize and understand the material?"
      })
    ).toBeTruthy();
  });
});
