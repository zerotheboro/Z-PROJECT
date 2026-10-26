import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse, Server, RequestListener } from "node:http";
import { createStage2EmulatorTransport } from "./acceptanceTransport";
import { createStage2AcceptanceService } from "./acceptance";
import { CompletionError } from "../trainingCompletionContract";

// The repository does not install @types/express. Describe only the narrow local
// adapter surface instead of adding a dependency or propagating untyped values.
type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse & { status(code: number): Response; json(value: unknown): void };
type Handler = (req: Request, res: Response) => void;
type ErrorHandler = (error: { type?: string }, req: Request, res: Response, next: (error?: unknown) => void) => void;
type LocalApp = RequestListener & { disable(name: string): void; post(path: string, ...handlers: Handler[]): void;
  use(handler: ErrorHandler): void; listen(port: number, host: string, callback?: () => void): Server };
const express = createRequire(import.meta.url)("express") as {
  (): LocalApp; raw(options: { type: string; limit: number }): Handler
};

/** Separate development application. Never imported by server.js. No bootstrap,
 * reservation, billing, AI, profile publication or worker endpoint is exposed. */
export function createStage2AcceptanceApp({ enabled = false }: { enabled?: boolean } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const transport = enabled ? createStage2EmulatorTransport() : null;
  const service = transport ? createStage2AcceptanceService(transport) : null;
  // Bound per-UID burst protection, independent of existing Training quotas.
  const requests = new Map<string, { startsAt: number; count: number }>();
  app.post("/api/development/training/accept-v2", express.raw({ type: "application/json", limit: 64 * 1024 }), async (req, res) => {
    if (!service || !transport) { res.status(404).json({ code: "stage2_disabled" }); return; }
    try {
      const authorization = req.headers.authorization;
      if (typeof authorization !== "string" || !/^Bearer [^\s]+$/.test(authorization)) throw new CompletionError(401, "authentication_required");
      const token = authorization.slice(7);
      const uid = await transport.verifyToken(token);
      const now = Date.now();
      for (const [key, value] of requests) if (now - value.startsAt >= 60_000) requests.delete(key);
      const limit = requests.get(uid) ?? { startsAt: now, count: 0 };
      if (limit.count >= 6 || !requests.has(uid) && requests.size >= 1024) throw new CompletionError(429, "stage2_rate_limited");
      limit.count++; requests.set(uid, limit);
      if (!Buffer.isBuffer(req.body)) throw new CompletionError(400, "invalid_completion_json");
      let body: unknown;
      try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(req.body)); }
      catch { throw new CompletionError(400, "invalid_completion_json"); }
      // Service verifies again rather than accepting an injectable/body UID.
      res.json(await service.accept(token, body));
    } catch (error) {
      const known = error instanceof CompletionError;
      res.status(known ? error.status : 503).json({ code: known ? error.code : "stage2_acceptance_unavailable" });
    }
  });
  app.use((error, _req, res, _next) => {
    res.status(error.type === "entity.too.large" ? 413 : 400).json({ code: error.type === "entity.too.large" ? "completion_too_large" : "invalid_completion_json" });
  });
  return { app, close: async () => { if (transport) await transport.close(); } };
}
