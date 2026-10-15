// @vitest-environment jsdom

import React from "react";

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
  it,
  vi
} from "vitest";

import CornellExperiment
  from "../experiments/CornellExperiment";
import NoteTaking4x4Experiment
  from "../experiments/NoteTaking4x4Experiment";
import TwoXVideoSpeedExperiment
  from "../experiments/TwoXVideoSpeedExperiment";
import NoteTaking4x4Match
  from "../matches/NoteTaking4x4Match";
import TwoXVideoSpeedMatch
  from "../matches/TwoXVideoSpeedMatch";
import {
  cornellExperiment,
  noteTaking4x4Experiment,
  twoXVideoExperiment
} from "../methodLabData";
import {
  noteTaking4x4MatchData,
  twoXVideoMatchData
} from "../methodMatchData";
import {
  methodLabContentSets,
  methodMatchContentSets
} from "../methodContentSets";
import {
  TrainingProgressStateProvider,
  TrainingStateScope
} from "../trainingProgressState";

import type {
  MultipleChoiceQuestion
} from "../methodEngineTypes";
import type {
  TrainingInternalState
} from "../trainingProgress";

afterEach(() => {
  cleanup();
});

function StateHarness({
  initialState,
  scope,
  onState,
  children
}: {
  initialState: TrainingInternalState;
  scope: string;
  onState: (state: TrainingInternalState) => void;
  children: React.ReactNode;
}) {
  return (
    <TrainingProgressStateProvider
      state={initialState}
      onChange={onState}
    >
      <TrainingStateScope name={scope}>
        {children}
      </TrainingStateScope>
    </TrainingProgressStateProvider>
  );
}

function answerQuestions(
  questions: readonly MultipleChoiceQuestion[]
) {
  questions.forEach((question, index) => {
    fireEvent.click(screen.getByRole("button", {
      name: question.correct
    }));
    fireEvent.click(screen.getByRole("button", {
      name: index === questions.length - 1
        ? "Finish test"
        : "Next question"
    }));
  });
}

function fillFourByFour() {
  [1, 2, 3, 4].forEach(index => {
    fireEvent.change(
      screen.getByPlaceholderText(
        `Main point ${index}...`
      ),
      {
        target: { value: `Idea ${index}` }
      }
    );
  });
  fireEvent.click(screen.getByRole("button", {
    name: "Continue"
  }));
  [1, 2, 3, 4].forEach(index => {
    fireEvent.change(
      screen.getByPlaceholderText(
        `Supporting details ${index}...`
      ),
      {
        target: {
          value: `Supporting detail ${index}`
        }
      }
    );
  });
}

describe("Cornell writing layout", () => {
  it("preserves all four fields through forward, back, and resume navigation", async () => {
    const scope = "lab:cornell:ui-fix";
    let snapshot: TrainingInternalState = {};
    const renderCornell = () => render(
      <StateHarness
        initialState={snapshot}
        scope={scope}
        onState={state => {
          snapshot = state;
        }}
      >
        <CornellExperiment
          method="cornell"
          category="organization"
          name="Cornell Notes"
          data={cornellExperiment}
          onComplete={vi.fn()}
        />
      </StateHarness>
    );

    const first = renderCornell();
    fireEvent.click(screen.getByRole("button", {
      name: "Start experiment"
    }));

    const title = screen.getByLabelText(
      "Short Title"
    );
    const cues = screen.getByPlaceholderText(
      "Key words, questions, important ideas..."
    );
    const notes = screen.getByPlaceholderText(
      "Write the important information here..."
    );
    const summary = screen.getByPlaceholderText(
      "Your summary..."
    );

    expect(title.tagName).toBe("INPUT");
    expect(document.querySelector(
      ".cornell-columns"
    )).toBeTruthy();
    expect(document.querySelector(
      ".cornell-summary"
    )).toBeTruthy();

    fireEvent.change(title, {
      target: { value: "Earthquakes" }
    });
    fireEvent.change(cues, {
      target: { value: "Fault? Focus?" }
    });
    fireEvent.change(notes, {
      target: {
        value: "Stress builds until rocks move along a fault."
      }
    });
    fireEvent.change(summary, {
      target: {
        value: "Stored stress is released as seismic waves."
      }
    });

    fireEvent.click(screen.getByRole("button", {
      name: "Continue"
    }));

    expect((screen.getByLabelText(
      "Short Title"
    ) as HTMLInputElement).value).toBe("Earthquakes");
    expect((screen.getByPlaceholderText(
      "Your summary..."
    ) as HTMLTextAreaElement).value).toContain(
      "seismic waves"
    );

    await waitFor(() => {
      expect(snapshot[scope]?.slots[10]).toBe(
        "Earthquakes"
      );
    });
    first.unmount();

    renderCornell();
    expect(
      (screen.getByLabelText(
        "Short Title"
      ) as HTMLInputElement).value
    ).toBe("Earthquakes");
    expect(
      (screen.getByPlaceholderText(
        "Key words, questions, important ideas..."
      ) as HTMLTextAreaElement).value
    ).toBe("Fault? Focus?");
    expect(
      (screen.getByPlaceholderText(
        "Write the important information here..."
      ) as HTMLTextAreaElement).value
    ).toContain("Stress builds");
    expect(
      (screen.getByPlaceholderText(
        "Your summary..."
      ) as HTMLTextAreaElement).value
    ).toContain("seismic waves");

    fireEvent.click(screen.getByRole("button", {
      name: "Continue to test"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: cornellExperiment.questions[0].correct
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Next question"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Back"
    }));

    expect(snapshot[scope]?.slots[1]).toContain(
      "Stress builds"
    );
    expect(snapshot[scope]?.slots[2]).toBe(
      "Fault? Focus?"
    );
    expect(snapshot[scope]?.slots[3]).toContain(
      "seismic waves"
    );
    expect(snapshot[scope]?.slots[10]).toBe(
      "Earthquakes"
    );
  });
});

describe("Note-taking 4x4 layout", () => {
  it("uses dedicated 4x4 classes in Experiment and Match", () => {
    render(
      <NoteTaking4x4Experiment
        method="note-taking-4x4"
        category="organization"
        name="Note-taking 4x4"
        data={noteTaking4x4Experiment}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Start experiment"
    }));

    expect(document.querySelector(
      ".four-by-four-layout .four-by-four-grid"
    )).toBeTruthy();
    expect(document.querySelector(
      "[class*='cornell']"
    )).toBeNull();

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

    expect(document.querySelector(
      ".four-by-four-grid"
    )).toBeTruthy();
    expect(document.querySelector(
      "[class*='cornell']"
    )).toBeNull();
  });

  it("preserves the four-part workflow and objective scoring", () => {
    const onComplete = vi.fn();
    render(
      <NoteTaking4x4Experiment
        method="note-taking-4x4"
        category="organization"
        name="Note-taking 4x4"
        data={noteTaking4x4Experiment}
        onComplete={onComplete}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Start experiment"
    }));
    fillFourByFour();
    fireEvent.click(screen.getByRole("button", {
      name: "Continue to test"
    }));
    answerQuestions(noteTaking4x4Experiment.questions);
    screen.getAllByRole("button", {
      name: "5"
    }).forEach(button => {
      fireEvent.click(button);
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Complete experiment"
    }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "note-taking-4x4",
        correct:
          noteTaking4x4Experiment.questions.length,
        total:
          noteTaking4x4Experiment.questions.length,
        score: 1
      })
    );
  });

  it("preserves Match answers and verification scoring", () => {
    const onComplete = vi.fn();
    render(
      <NoteTaking4x4Match
        method="note-taking-4x4"
        name="Note-taking 4x4"
        data={noteTaking4x4MatchData}
        originalScore={0.5}
        onComplete={onComplete}
      />
    );
    fillFourByFour();
    fireEvent.click(screen.getByRole("button", {
      name: "Continue to test"
    }));
    answerQuestions(noteTaking4x4MatchData.questions);
    fireEvent.click(screen.getByRole("button", {
      name: "5"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete verification"
    }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "note-taking-4x4",
        firstScore: 0.5,
        verificationScore: 1,
        confidence: 5
      })
    );
  });
});

describe("2X Video content and notes", () => {
  it("uses four real, validly shaped YouTube configurations", () => {
    const dataSets = [
      ...methodLabContentSets[
        "two-x-video-speed"
      ],
      ...methodMatchContentSets[
        "two-x-video-speed"
      ]
    ].map(({ data }) => data as {
      youtubeId: string;
      videoTitle: string;
      channel: string;
    });

    expect(dataSets).toHaveLength(4);
    expect(new Set(
      dataSets.map(({ youtubeId }) => youtubeId)
    ).size).toBe(4);
    dataSets.forEach(data => {
      expect(data.youtubeId).toMatch(
        /^[A-Za-z0-9_-]{11}$/
      );
      expect(data.videoTitle.length).toBeGreaterThan(0);
      expect(data.channel).toBe("CrashCourse");
    });
  });

  it("renders the configured video with optional notes directly below it", () => {
    render(
      <TwoXVideoSpeedExperiment
        method="two-x-video-speed"
        category="understanding"
        name="2X video speed"
        data={twoXVideoExperiment}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Start 2x playback"
    }));

    const video = screen.getByTitle(
      new RegExp(twoXVideoExperiment.videoTitle)
    );
    const notes = screen.getByPlaceholderText(
      "Optional notes or thoughts..."
    );

    expect(video.getAttribute("src")).toContain(
      twoXVideoExperiment.youtubeId
    );
    expect(video.getAttribute(
      "data-playback-speed"
    )).toBe("2");
    expect(
      video.compareDocumentPosition(notes) &
      Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.change(notes, {
      target: { value: "Cells have specialized parts." }
    });
    expect((notes as HTMLTextAreaElement).value).toBe(
      "Cells have specialized parts."
    );
  });

  it("persists optional notes through the normal Training state", async () => {
    const scope =
      "lab:two-x-video-speed:notes-test";
    let snapshot: TrainingInternalState = {};
    const renderVideo = () => render(
      <StateHarness
        initialState={snapshot}
        scope={scope}
        onState={state => {
          snapshot = state;
        }}
      >
        <TwoXVideoSpeedExperiment
          method="two-x-video-speed"
          category="understanding"
          name="2X video speed"
          data={twoXVideoExperiment}
          onComplete={vi.fn()}
        />
      </StateHarness>
    );

    const first = renderVideo();
    fireEvent.click(screen.getByRole("button", {
      name: "Start 2x playback"
    }));
    fireEvent.change(screen.getByPlaceholderText(
      "Optional notes or thoughts..."
    ), {
      target: { value: "My saved video notes" }
    });

    await waitFor(() => {
      expect(snapshot[scope]?.slots[8]).toBe(
        "My saved video notes"
      );
    });
    first.unmount();
    renderVideo();

    expect((screen.getByPlaceholderText(
      "Optional notes or thoughts..."
    ) as HTMLTextAreaElement).value).toBe(
      "My saved video notes"
    );
  });

  it("allows empty notes and preserves existing completion scoring", () => {
    const onComplete = vi.fn();
    render(
      <TwoXVideoSpeedExperiment
        method="two-x-video-speed"
        category="understanding"
        name="2X video speed"
        data={twoXVideoExperiment}
        onComplete={onComplete}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Start 2x playback"
    }));

    const continueButton = screen.getByRole(
      "button",
      {
        name:
          "I finished at 2x · test comprehension"
      }
    ) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(false);
    fireEvent.click(continueButton);

    answerQuestions(twoXVideoExperiment.questions);
    screen.getAllByRole("button", {
      name: "5"
    }).forEach(button => {
      fireEvent.click(button);
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Complete experiment"
    }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "two-x-video-speed",
        correct: twoXVideoExperiment.questions.length,
        total: twoXVideoExperiment.questions.length,
        score: 1
      })
    );
  });

  it("keeps Match notes optional and preserves verification scoring", () => {
    const onComplete = vi.fn();
    render(
      <TwoXVideoSpeedMatch
        method="two-x-video-speed"
        name="2X video speed"
        data={twoXVideoMatchData}
        originalScore={0.5}
        onComplete={onComplete}
      />
    );

    expect(screen.getByPlaceholderText(
      "Optional notes or thoughts..."
    )).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: "I finished at 2x · test comprehension"
    }));
    answerQuestions(twoXVideoMatchData.questions);
    fireEvent.click(screen.getByRole("button", {
      name: "5"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Complete verification"
    }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "two-x-video-speed",
        firstScore: 0.5,
        verificationScore: 1,
        confidence: 5
      })
    );
  });
});
