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

import StrooperEffectExperiment
  from "../experiments/StrooperEffectExperiment";
import TwoXVideoSpeedExperiment
  from "../experiments/TwoXVideoSpeedExperiment";
import {
  strooperEffectExperiment,
  twoXVideoExperiment
} from "../methodLabData";
import {
  TrainingProgressStateProvider,
  TrainingStateScope
} from "../trainingProgressState";

import type {
  TrainingInternalState
} from "../trainingProgress";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  MockYouTubePlayer.instances = [];
  delete (
    window as unknown as { YT?: unknown }
  ).YT;
});

type MockYouTubeEvent = {
  target: MockYouTubePlayer;
  data: number;
};

type MockYouTubeEvents = {
  onReady: (event: MockYouTubeEvent) => void;
  onStateChange: (
    event: MockYouTubeEvent
  ) => void;
};

class MockYouTubePlayer {
  static instances: MockYouTubePlayer[] = [];

  currentTime = 0;
  playbackRate = 1;
  events: MockYouTubeEvents;
  destroy = vi.fn();
  seekTo = vi.fn((seconds: number) => {
    this.currentTime = seconds;
  });
  setPlaybackRate = vi.fn((rate: number) => {
    this.playbackRate = rate;
  });

  constructor(
    _element: HTMLIFrameElement,
    options: { events: MockYouTubeEvents }
  ) {
    this.events = options.events;
    MockYouTubePlayer.instances.push(this);
    queueMicrotask(() => {
      this.events.onReady({
        target: this,
        data: -1
      });
    });
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getPlaybackRate() {
    return this.playbackRate;
  }

  emitState(data: number) {
    this.events.onStateChange({
      target: this,
      data
    });
  }
}

function installYouTubePlayerMock() {
  (
    window as unknown as { YT: unknown }
  ).YT = {
    Player: MockYouTubePlayer,
    PlayerState: {
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2
    }
  };
}

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

describe("resumable method media interactions", () => {
  it("restores the exact Stroop word, ink color, trial index, and attempt count", async () => {
    const scope = "lab:strooper-effect:resume-test";
    let snapshot: TrainingInternalState = {};
    const random = vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5);

    const first = render(
      <StateHarness
        initialState={snapshot}
        scope={scope}
        onState={state => {
          snapshot = state;
        }}
      >
        <StrooperEffectExperiment
          method="strooper-effect"
          category="focus"
          name="Strooper effect"
          data={strooperEffectExperiment}
          onComplete={vi.fn()}
        />
      </StateHarness>
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Start attention task"
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "press for first stimulus"
    }));

    const stimulus = screen.getByRole("button", {
      name: "green"
    });
    const savedText = stimulus.textContent;
    const savedColor = stimulus.style.color;

    expect(screen.getByText("1 / 8")).toBeTruthy();
    await waitFor(() => {
      expect(snapshot[scope]?.slots[1]).toBe(1);
      expect(snapshot[scope]?.slots[8]).toEqual({
        inkIndex: 0,
        wordIndex: 2
      });
    });
    first.unmount();

    random.mockClear();
    random.mockImplementation(() => {
      throw new Error(
        "resume must not generate a replacement stimulus"
      );
    });

    render(
      <StateHarness
        initialState={snapshot}
        scope={scope}
        onState={state => {
          snapshot = state;
        }}
      >
        <StrooperEffectExperiment
          method="strooper-effect"
          category="focus"
          name="Strooper effect"
          data={strooperEffectExperiment}
          onComplete={vi.fn()}
        />
      </StateHarness>
    );

    const restored = screen.getByRole("button", {
      name: savedText ?? ""
    });
    expect(restored.style.color).toBe(savedColor);
    expect(screen.getByText("1 / 8")).toBeTruthy();
    expect(random).not.toHaveBeenCalled();
  });

  it("restores 2x video paused at its saved position without false completion", async () => {
    installYouTubePlayerMock();
    const scope = "lab:two-x-video-speed:resume-test";
    let snapshot: TrainingInternalState = {};
    const renderExperiment = () => render(
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

    const first = renderExperiment();
    fireEvent.click(screen.getByRole("button", {
      name: "Start 2x playback"
    }));

    await waitFor(() => {
      expect(
        MockYouTubePlayer.instances
      ).toHaveLength(1);
    });
    const firstVideo =
      MockYouTubePlayer.instances[0];
    firstVideo.currentTime = 42;
    firstVideo.emitState(1);
    firstVideo.emitState(2);

    await waitFor(() => {
      expect(snapshot[scope]?.slots[7]).toEqual({
        currentTime: 42,
        started: true,
        completed: false
      });
    });
    first.unmount();

    const second = renderExperiment();
    await waitFor(() => {
      expect(
        MockYouTubePlayer.instances
      ).toHaveLength(2);
    });
    const restoredVideo =
      MockYouTubePlayer.instances[1];

    expect(restoredVideo.seekTo).toHaveBeenCalledWith(
      42,
      true
    );
    expect(
      restoredVideo.setPlaybackRate
    ).toHaveBeenCalledWith(2);
    expect(
      screen.getByTitle(
        new RegExp(twoXVideoExperiment.videoTitle)
      ).getAttribute("src")
    ).not.toContain("autoplay=1");
    expect(snapshot[scope]?.slots[7]).toEqual({
      currentTime: 42,
      started: true,
      completed: false
    });
    second.unmount();
  });
});
