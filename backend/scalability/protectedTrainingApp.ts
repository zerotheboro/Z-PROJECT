import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse, RequestListener, Server } from "node:http";
import { createProtectedTrainingService } from "./protectedTraining";
import { CompletionError } from "../trainingCompletionContract";
import { ScalabilityContractError } from "./values";
import { TrainingQuotaValidationError, TrainingReservationConflictError, TrainingQuotaExceededError } from "../../trainingQuota.js";
type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse & { status(code: number): Response; json(value: unknown): void };
type Handler = (req: Request, res: Response, next: (error?: unknown) => void) => void;
type App = RequestListener & { disable(name: string): void; use(handler: Handler): void; post(path: string, ...handlers: Handler[]): void;
  get(path: string, ...handlers: Handler[]): void; listen(port: number, host: string, callback?: () => void): Server };
const express = createRequire(import.meta.url)("express") as { (): App; raw(options: { type: string; limit: number }): Handler };

/** Separate application and bundle. server.js never imports this module. */
export function createProtectedTrainingApp({ enabled = false }: { enabled?: boolean } = {}) {
  const app = express(); app.disable("x-powered-by");
  const service = enabled ? createProtectedTrainingService() : null;
  app.use((req, res, next) => {
    if (!service) { res.status(404).json({ code: "protected_training_disabled" }); return; }
    const origin = req.headers.origin;
    if (origin) {
      let url: URL; try { url = new URL(origin); } catch { res.status(403).json({ code: "local_origin_required" }); return; }
      if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.origin !== origin) {
        res.status(403).json({ code: "local_origin_required" }); return;
      }
      res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
    next();
  });
  const bursts = new Map<string, { at: number; count: number }>();
  function handler(kind: "complete" | "reserve" | "access"): Handler {
    return async (req, res) => {
      try {
        const header = req.headers.authorization;
        if (typeof header !== "string" || !/^Bearer [^\s]+$/.test(header)) throw new CompletionError(401, "authentication_required");
        const token = header.slice(7);
        // No tokens, payloads or Reflection text are logged or used as map keys.
        // Bound loopback request pressure; authentication still occurs in service.
        const key = req.socket.remoteAddress ?? "local", now = Date.now();
        for (const [id, b] of bursts) if (now - b.at >= 60_000) bursts.delete(id);
        const b = bursts.get(key) ?? { at: now, count: 0 };
        if (++b.count > 120) throw new CompletionError(429, "protected_training_rate_limited"); bursts.set(key, b);
        if (kind === "access") { const url = new URL(req.url!, "http://127.0.0.1"); res.json(await service!.access(token, url.searchParams.get("timezone") ?? "UTC")); return; }
        if (!Buffer.isBuffer(req.body)) throw new CompletionError(400, "invalid_completion_json");
        let body: unknown; try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(req.body)); }
        catch { throw new CompletionError(400, "invalid_completion_json"); }
        res.json(kind === "complete" ? await service!.complete(token, body) : await service!.reserve(token, body));
      } catch (error) {
        const quota = error instanceof TrainingQuotaValidationError || error instanceof TrainingReservationConflictError || error instanceof TrainingQuotaExceededError;
        res.status(error instanceof CompletionError ? error.status : error instanceof ScalabilityContractError ? 409 : quota ? error.status : 503)
          .json({ code: error instanceof CompletionError || error instanceof ScalabilityContractError || quota ? error.code : "protected_training_unavailable" });
      }
    };
  }
  app.get("/api/training/access", handler("access"));
  app.post("/api/training/reserve", express.raw({ type: "application/json", limit: 64 * 1024 }), handler("reserve"));
  app.post("/api/development/training/complete-protected-v2", express.raw({ type: "application/json", limit: 64 * 1024 }), handler("complete"));
  // Suppress Express HTML/parser stack responses; no student data in errors.
  (app.use as unknown as (handler: (e: { type?: string }, req: Request, res: Response, next: (e?: unknown) => void) => void) => void)
    ((e, _req, res, _next) => { res.status(e.type === "entity.too.large" ? 413 : 400).json({ code: "invalid_completion_json" }); });
  return { app, close: async () => { await service?.close(); } };
}
