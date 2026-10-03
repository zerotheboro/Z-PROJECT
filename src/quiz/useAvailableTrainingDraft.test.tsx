// @vitest-environment jsdom

import React from "react";

import {
  act,
  cleanup,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import type { User } from "firebase/auth";

import {
  createTrainingDraft
} from "./trainingProgress";

import type {
  DraftValidation,
  TrainingDraftOwner
} from "./trainingProgress";

type PendingLoad = {
  owner: TrainingDraftOwner;
  resolve: (
    value: DraftValidation | null
  ) => void;
};

const mocks = vi.hoisted(() => ({
  authCallback: null as
    ((user: User | null) => void) | null,
  pending: [] as PendingLoad[],
  unsubscribe: vi.fn()
}));

vi.mock("../services/auth", () => ({
  subscribeToAuth: (
    callback: (user: User | null) => void
  ) => {
    mocks.authCallback = callback;
    return mocks.unsubscribe;
  }
}));

vi.mock("../services/trainingProgress", () => ({
  loadTrainingDraft: (
    owner: TrainingDraftOwner
  ) => new Promise<DraftValidation | null>(resolve => {
    mocks.pending.push({ owner, resolve });
  })
}));

import {
  useAvailableTrainingDraft
} from "./useAvailableTrainingDraft";

function Probe() {
  const state = useAvailableTrainingDraft();

  return (
    <div>
      <span data-testid="loading">
        {String(state.loading)}
      </span>
      <span data-testid="owner">
        {state.owner?.kind === "user"
          ? `user:${state.owner.uid}`
          : state.owner?.kind ?? "none"}
      </span>
      <span data-testid="session">
        {state.validation?.valid
          ? state.validation.draft.sessionId
          : "none"}
      </span>
    </div>
  );
}

function user(uid: string): User {
  return { uid } as User;
}

function validDraft(
  owner: TrainingDraftOwner
): DraftValidation {
  return {
    valid: true,
    draft: createTrainingDraft({
      owner,
      mode: "auto"
    })
  };
}

async function publishAuth(
  firebaseUser: User | null
) {
  await vi.waitFor(() => {
    expect(mocks.authCallback).not.toBeNull();
  });
  await act(async () => {
    mocks.authCallback?.(firebaseUser);
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.authCallback = null;
  mocks.pending.length = 0;
  mocks.unsubscribe.mockReset();
});

describe("useAvailableTrainingDraft auth load isolation", () => {
  it("clears resolved User A content immediately while User B loads", async () => {
    render(<Probe />);
    await publishAuth(user("user-a"));

    const a = validDraft({
      kind: "user",
      uid: "user-a"
    });
    mocks.pending[0].resolve(a);
    await screen.findByText(
      a.valid ? a.draft.sessionId : ""
    );

    await publishAuth(user("user-b"));

    expect(screen.getByTestId("loading").textContent)
      .toBe("true");
    expect(screen.getByTestId("owner").textContent)
      .toBe("user:user-b");
    expect(screen.getByTestId("session").textContent)
      .toBe("none");
  });

  it("discards an A load that resolves after the newer B load", async () => {
    render(<Probe />);
    await publishAuth(user("user-a"));
    await publishAuth(user("user-b"));

    const a = validDraft({
      kind: "user",
      uid: "user-a"
    });
    const b = validDraft({
      kind: "user",
      uid: "user-b"
    });

    mocks.pending[1].resolve(b);
    await screen.findByText(
      b.valid ? b.draft.sessionId : ""
    );
    mocks.pending[0].resolve(a);

    await Promise.resolve();
    expect(screen.getByTestId("owner").textContent)
      .toBe("user:user-b");
    expect(screen.getByTestId("session").textContent)
      .toBe(b.valid ? b.draft.sessionId : "");
  });

  it("discards a signed-in load after sign-out", async () => {
    render(<Probe />);
    await publishAuth(user("user-a"));
    await publishAuth(null);

    const guest = validDraft({ kind: "guest" });
    mocks.pending[1].resolve(guest);
    await screen.findByText(
      guest.valid ? guest.draft.sessionId : ""
    );

    mocks.pending[0].resolve(validDraft({
      kind: "user",
      uid: "user-a"
    }));
    await Promise.resolve();

    expect(screen.getByTestId("owner").textContent)
      .toBe("guest");
    expect(screen.getByTestId("session").textContent)
      .toBe(guest.valid ? guest.draft.sessionId : "");
  });

  it("discards a guest load after sign-in", async () => {
    render(<Probe />);
    await publishAuth(null);
    await publishAuth(user("user-b"));

    const signedIn = validDraft({
      kind: "user",
      uid: "user-b"
    });
    mocks.pending[1].resolve(signedIn);
    await screen.findByText(
      signedIn.valid
        ? signedIn.draft.sessionId
        : ""
    );

    mocks.pending[0].resolve(validDraft({
      kind: "guest"
    }));
    await Promise.resolve();

    expect(screen.getByTestId("owner").textContent)
      .toBe("user:user-b");
  });

  it("does not publish a load after unmount", async () => {
    const consoleError = vi.spyOn(
      console,
      "error"
    ).mockImplementation(() => undefined);
    const view = render(<Probe />);
    await publishAuth(user("user-a"));

    view.unmount();
    mocks.pending[0].resolve(validDraft({
      kind: "user",
      uid: "user-a"
    }));
    await Promise.resolve();

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
