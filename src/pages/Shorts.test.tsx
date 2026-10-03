// @vitest-environment jsdom

import React from "react";

import {
  act,
  cleanup,
  render
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

vi.mock("../HEADER/header", () => ({
  default: () => <nav>Navigation</nav>
}));

import Shorts from "./Shorts";
import {
  getShortEmbedUrl,
  SHORT_VIDEOS
} from "../shorts/shortVideos";

type ObservedEntry = {
  target: Element;
  ratio: number;
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly root: Element | Document | null;
  readonly rootMargin = "0px";
  readonly thresholds: readonly number[];
  readonly observed: Element[] = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {}
  ) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    MockIntersectionObserver.instances.push(this);
  }

  observe = (target: Element) => {
    this.observed.push(target);
  };

  unobserve = (target: Element) => {
    const index = this.observed.indexOf(target);
    if (index >= 0) {
      this.observed.splice(index, 1);
    }
  };

  disconnect = () => {
    this.observed.length = 0;
  };

  takeRecords = (): IntersectionObserverEntry[] => [];

  trigger(entries: ObservedEntry[]) {
    this.callback(
      entries.map(({ target, ratio }) => ({
        target,
        isIntersecting: ratio > 0,
        intersectionRatio: ratio,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: 0
      })),
      this as unknown as IntersectionObserver
    );
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    MockIntersectionObserver
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Edulience Shorts", () => {
  it("keeps exactly the approved videos in one ordered source list", () => {
    expect(SHORT_VIDEOS.map(video => video.youtubeId))
      .toEqual([
        "qW63_zEqnJw",
        "mC5T9H9rj94",
        "KkWofMnrlBU",
        "XhXGsHC7ZxA"
      ]);
    expect(SHORT_VIDEOS.map(video => video.id))
      .toEqual([
        "short-1",
        "short-2",
        "short-3",
        "short-4"
      ]);
  });

  it("generates safe muted inline YouTube embed URLs", () => {
    const activeUrl = new URL(
      getShortEmbedUrl("qW63_zEqnJw", true)
    );
    const inactiveUrl = new URL(
      getShortEmbedUrl("mC5T9H9rj94", false)
    );

    expect(activeUrl.pathname)
      .toBe("/embed/qW63_zEqnJw");
    expect(activeUrl.searchParams.get("autoplay"))
      .toBe("1");
    expect(activeUrl.searchParams.get("mute")).toBe("1");
    expect(activeUrl.searchParams.get("playsinline"))
      .toBe("1");
    expect(inactiveUrl.pathname)
      .toBe("/embed/mC5T9H9rj94");
    expect(inactiveUrl.searchParams.get("autoplay"))
      .toBe("0");
  });

  it("renders the four Shorts in order with the first item active", () => {
    const { container } = render(<Shorts />);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-short-id]"
      )
    );
    const frames = Array.from(
      container.querySelectorAll<HTMLIFrameElement>(
        ".shorts-player-shell iframe"
      )
    );

    expect(items.map(item => item.dataset.shortId))
      .toEqual(SHORT_VIDEOS.map(video => video.id));
    expect(frames).toHaveLength(4);
    expect(frames.map(frame => new URL(frame.src).pathname))
      .toEqual(SHORT_VIDEOS.map(
        video => `/embed/${video.youtubeId}`
      ));
    expect(items[0].dataset.active).toBe("true");
    expect(items.slice(1).every(
      item => item.dataset.active === "false"
    )).toBe(true);
    expect(
      container.querySelector<HTMLElement>(".shorts-feed")
        ?.scrollTop
    ).toBe(0);
  });

  it("uses one observer to activate the dominant Short and stop the previous autoplay", () => {
    const { container } = render(<Shorts />);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-short-id]"
      )
    );
    const observer = MockIntersectionObserver.instances[0];

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(observer.observed).toHaveLength(4);

    act(() => {
      observer.trigger([
        { target: items[0], ratio: 0.2 },
        { target: items[1], ratio: 0.8 }
      ]);
    });

    const frames = Array.from(
      container.querySelectorAll<HTMLIFrameElement>(
        ".shorts-player-shell iframe"
      )
    );
    expect(items[0].dataset.active).toBe("false");
    expect(items[1].dataset.active).toBe("true");
    expect(new URL(frames[0].src).searchParams.get("autoplay"))
      .toBe("0");
    expect(new URL(frames[1].src).searchParams.get("autoplay"))
      .toBe("1");
  });
});
