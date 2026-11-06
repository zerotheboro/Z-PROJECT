import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const mocks = vi.hoisted(() => ({
  readLocal: vi.fn(),
  reserve: vi.fn(),
  save: vi.fn()
}));

vi.mock("./trainingAccess", () => ({
  reserveTrainingAccess: mocks.reserve
}));

vi.mock("./trainingProgress", () => ({
  readLocalTrainingDraft: mocks.readLocal,
  saveTrainingDraft: mocks.save
}));

import {
  startTrainingSession
} from "./startTrainingSession";

beforeEach(() => {
  mocks.readLocal.mockReset();
  mocks.reserve.mockReset();
  mocks.reserve.mockResolvedValue(undefined);
  mocks.save.mockReset();
  mocks.save.mockResolvedValue(undefined);
});

describe("new Training session startup", () => {
  it("rejects incomplete Economics topics before reserving or saving anything", async () => {
    await expect(startTrainingSession({ user:null, owner:{kind:"guest"}, mode:"auto", methodIds:[], sessionId:"economics-unready", economicsTopicId:"4.3" })).rejects.toThrow(/not ready/);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(["auto", "manual"] as const)("keeps a %s Economics topic on the original reservation and saved draft", async mode => {
    const methodIds = mode === "manual" ? ["active-recall" as const] : [];
    const d = await startTrainingSession({ user:null,owner:{kind:"guest"},mode,methodIds,sessionId:"economics-start",economicsTopicId:"2.2" });
    expect(mocks.reserve).toHaveBeenCalledExactlyOnceWith(null,{sessionId:"economics-start",mode,methodIds});
    expect(d.internalState.curriculum.named.economics9708).toEqual({topicId:"2.2",version:"2026-v2-pilot-1",activityVersion:"mapped-1"});
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith(d,{allowCreate:true});
  });
  it("rejects unsupported new Economics methods before charging a reservation", async () => {
    await expect(startTrainingSession({ user:null, owner:{kind:"guest"}, mode:"manual", methodIds:["doodle-effect"], economicsTopicId:"1.5" })).rejects.toThrow(/not supported/);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("reserves and saves the exact same session ID", async () => {
    const draft = await startTrainingSession({
      user: null,
      owner: { kind: "guest" },
      mode: "manual",
      methodIds: ["active-recall", "feynman"],
      sessionId: "session-0001"
    });

    expect(mocks.reserve).toHaveBeenCalledWith(
      null,
      {
        sessionId: "session-0001",
        mode: "manual",
        methodIds: ["active-recall", "feynman"]
      }
    );
    expect(draft.sessionId).toBe("session-0001");
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-0001"
      }),
      { allowCreate: true }
    );
  });

  it("does not create or save a draft after reservation denial", async () => {
    mocks.reserve.mockRejectedValue(
      new Error("Daily training limit reached")
    );

    await expect(startTrainingSession({
      user: null,
      owner: { kind: "guest" },
      mode: "auto",
      methodIds: [],
      sessionId: "session-0001"
    })).rejects.toThrow("Daily training limit reached");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("continues with the same local recovery after a cloud save failure", async () => {
    let attemptedDraft: unknown;
    mocks.save.mockImplementation(async draft => {
      attemptedDraft = draft;
      throw new Error("cloud unavailable");
    });
    mocks.readLocal.mockImplementation(() => ({
      valid: true,
      draft: attemptedDraft
    }));

    await expect(startTrainingSession({
      user: null,
      owner: { kind: "guest" },
      mode: "auto",
      methodIds: [],
      sessionId: "session-0001"
    })).resolves.toMatchObject({
      sessionId: "session-0001"
    });
    expect(mocks.reserve).toHaveBeenCalledTimes(1);
  });
});
