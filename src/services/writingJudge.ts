import type {
  User
} from "firebase/auth";

import {
  isWritingJudgeResult
} from "../quiz/writingJudgeState";

import type {
  WritingJudgeResult
} from "../quiz/writingJudgeState";
import type {
  TrainingMethodId
} from "../quiz/type";

const DEFAULT_API_BASE =
  "https://z-project-ba3t.onrender.com";

export type WritingJudgeRequest = {
  sessionId: string;
  taskId: string;
  methodId: TrainingMethodId;
  sourceMaterial: string;
  userWriting: string;
};

type RequestContext = {
  fetcher?: typeof fetch;
  apiBase?: string;
};

export class WritingJudgeError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "WritingJudgeError";
    this.status = status;
  }
}

function apiBase(context: RequestContext) {
  return (
    context.apiBase ??
    import.meta.env.VITE_API_BASE_URL ??
    DEFAULT_API_BASE
  ).replace(/\/$/, "");
}

async function responseJson(
  response: Response
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function judgeTrainingWriting(
  user: User | null,
  input: WritingJudgeRequest,
  context: RequestContext = {}
): Promise<WritingJudgeResult> {
  if (!user) {
    throw new WritingJudgeError(
      "Sign in to judge your writing.",
      401
    );
  }

  const idToken = await user.getIdToken();
  const fetcher = context.fetcher ?? fetch;
  const response = await fetcher(
    `${apiBase(context)}/api/training/judge-writing`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(input)
    }
  );
  const body = await responseJson(response);

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "Writing evaluation failed. Please try again.";

    throw new WritingJudgeError(
      message,
      response.status
    );
  }

  if (!isWritingJudgeResult(body)) {
    throw new WritingJudgeError(
      "The writing feedback response was invalid.",
      502
    );
  }

  return body;
}
