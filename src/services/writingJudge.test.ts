import type {
  User
} from "firebase/auth";

import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  WritingJudgeError,
  judgeTrainingWriting
} from "./writingJudge";

const request = {
  sessionId: "session-writing-0001",
  taskId: "explanation",
  methodId: "feynman" as const,
  sourceMaterial:
    "Metal transfers heat faster than wood.",
  userWriting:
    "Metal feels colder because heat leaves the hand faster."
};

const feedback = {
  score: 88,
  accuracy: 95,
  coverage: 80,
  clarity: 90,
  strengths: ["Accurate heat-transfer idea."],
  missingPoints: ["Name thermal conductivity."],
  misconceptions: [],
  verdict: "strong" as const,
  nextAction:
    "Add the name thermal conductivity."
};

function createUser() {
  return {
    getIdToken: vi.fn().mockResolvedValue(
      "verified-firebase-token"
    )
  } as unknown as User;
}

describe("writing judge client service", () => {
  it("sends only the bounded request with a Firebase bearer token", async () => {
    const user = createUser();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(feedback), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    await expect(judgeTrainingWriting(
      user,
      request,
      {
        fetcher,
        apiBase: "https://api.example.test/"
      }
    )).resolves.toEqual(feedback);

    expect(user.getIdToken).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/training/judge-writing",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer verified-firebase-token"
        },
        body: JSON.stringify(request)
      }
    );
  });

  it("does not make a request for a signed-out user", async () => {
    const fetcher = vi.fn();

    await expect(judgeTrainingWriting(
      null,
      request,
      { fetcher }
    )).rejects.toMatchObject({
      name: "WritingJudgeError",
      status: 401
    } satisfies Partial<WritingJudgeError>);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a successful HTTP response with an invalid payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ score: 88 }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    await expect(judgeTrainingWriting(
      createUser(),
      request,
      { fetcher }
    )).rejects.toMatchObject({
      name: "WritingJudgeError",
      status: 502
    } satisfies Partial<WritingJudgeError>);
  });
});
