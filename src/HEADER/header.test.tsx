// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type HeaderUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

const authMocks = vi.hoisted(() => ({
  currentUser: null as HeaderUser | null,
  listener: null as ((user: HeaderUser | null) => void) | null,
  unsubscribe: vi.fn(),
  loginWithGoogle: vi.fn(),
  logoutUser: vi.fn(),
  subscribeToAuth: vi.fn()
}));

vi.mock("../services/auth", () => ({
  getCurrentUser: () => authMocks.currentUser,
  loginWithGoogle: authMocks.loginWithGoogle,
  logoutUser: authMocks.logoutUser,
  subscribeToAuth: authMocks.subscribeToAuth
}));

vi.mock("./ANIMATION", () => ({
  the_animation_obj: {
    the_nav_anime: vi.fn()
  }
}));

import NAV from "./header";

function renderHeader(pathname = "/") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <NAV />
    </MemoryRouter>
  );
}

beforeEach(() => {
  authMocks.currentUser = null;
  authMocks.listener = null;
  authMocks.unsubscribe.mockReset();
  authMocks.loginWithGoogle.mockReset();
  authMocks.logoutUser.mockReset();
  authMocks.subscribeToAuth.mockReset();
  authMocks.subscribeToAuth.mockImplementation(
    (callback: (user: HeaderUser | null) => void) => {
      authMocks.listener = callback;
      callback(authMocks.currentUser);
      return authMocks.unsubscribe;
    }
  );
  authMocks.logoutUser.mockImplementation(async () => {
    authMocks.currentUser = null;
    authMocks.listener?.(null);
  });
});

afterEach(() => {
  cleanup();
});

describe("NAV authentication", () => {
  it("shows Sign in while signed out", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });

  it("shows signed-in account details and a fallback initial", () => {
    authMocks.currentUser = {
      uid: "user-1",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      photoURL: null
    };
    const { container } = renderHeader();

    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(container.querySelector(".nav-avatar-fallback")?.textContent).toBe("A");

    fireEvent.click(screen.getByRole("button", {
      name: "Open account menu for Ada Lovelace"
    }));

    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
  });

  it("restores signed-out state after Sign out", async () => {
    authMocks.currentUser = {
      uid: "user-1",
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      photoURL: "https://example.com/avatar.png"
    };
    const { container } = renderHeader();

    expect(container.querySelector(".nav-avatar")?.getAttribute("src"))
      .toBe("https://example.com/avatar.png");

    fireEvent.click(screen.getByRole("button", {
      name: "Open account menu for Ada Lovelace"
    }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    });
    expect(authMocks.logoutUser).toHaveBeenCalledTimes(1);
  });
});

describe("NAV route state", () => {
  it("marks Library active on /library", () => {
    renderHeader("/library");

    expect(screen.getByText("Library").closest("a")?.classList.contains("active"))
      .toBe(true);
  });

  it("navigates to Shorts and applies the active route state", () => {
    renderHeader("/");

    fireEvent.click(screen.getByRole("link", {
      name: "Shorts"
    }));

    expect(
      screen.getByText("Shorts")
        .closest("a")
        ?.classList.contains("active")
    ).toBe(true);
  });

  it.each([
    "/training/assessment",
    "/training/profile"
  ])("keeps Training active on %s", (pathname) => {
    renderHeader(pathname);

    expect(screen.getByText("Training").closest("a")?.classList.contains("active"))
      .toBe(true);
  });

  it("keeps Home linked to the root route", () => {
    renderHeader("/training");

    expect(screen.getByText("Home").closest("a")?.getAttribute("href"))
      .toBe("/");
  });
});
