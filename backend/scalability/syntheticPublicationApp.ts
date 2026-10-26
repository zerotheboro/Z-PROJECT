import { createProtectedTrainingApp } from "./protectedTrainingApp";
import { createSyntheticPublicationService } from "./syntheticPublication";
import { ScalabilityContractError } from "./values";
import { CompletionError } from "../trainingCompletionContract";

/** Separate loopback-only development app/bundle. Never imported by server.js. */
export function createSyntheticPublicationApp({ enabled = false }: { enabled?: boolean } = {}) {
  const base = createProtectedTrainingApp({ enabled });
  const publication = enabled ? createSyntheticPublicationService() : null;
  const bursts = new Map<string, { at: number; count: number }>();
  type Handler = Parameters<typeof base.app.get>[1];
  const handler = (kind: "status" | "history" | "aggregate" | "publish"): Handler => async (req, res) => {
    try {
      if (!publication) throw new CompletionError(404, "synthetic_publication_disabled");
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")) throw new CompletionError(403, "local_connection_required");
      const header = req.headers.authorization;
      if (typeof header !== "string" || !/^Bearer [^\s]+$/.test(header)) throw new CompletionError(401, "authentication_required");
      const now = Date.now(), key = req.socket.remoteAddress!;
      for (const [id, b] of bursts) if (now - b.at > 60_000) bursts.delete(id);
      const burst = bursts.get(key) ?? { at: now, count: 0 }; bursts.set(key, burst);
      if (++burst.count > 120) throw new CompletionError(429, "synthetic_publication_rate_limited");
      const token = header.slice(7), url = new URL(req.url!, "http://127.0.0.1");
      res.setHeader("Cache-Control", "no-store");
      if (kind === "status") res.json(await publication.status(token));
      else if (kind === "history") res.json(await publication.history(token, url.searchParams.get("generationId") ?? "",
        Number(url.searchParams.get("after") ?? "0"), Number(url.searchParams.get("limit") ?? "10")));
      else if (kind === "aggregate") {
        const result = await publication.aggregate(token);
        res.json({ generationId: result?.handle.generationId ?? null, state: result?.job.state ?? "unchanged" });
      } else res.json(await publication.publish(token, url.searchParams.get("generationId") ?? ""));
    } catch (e) {
      res.status(e instanceof CompletionError ? e.status : e instanceof ScalabilityContractError ? 409 : 503)
        .json({ code: e instanceof CompletionError || e instanceof ScalabilityContractError ? e.code : "synthetic_publication_unavailable" });
    }
  };
  for (const kind of ["status", "history"] as const) base.app.get(`/api/development/profile/${kind}`, handler(kind));
  for (const kind of ["aggregate", "publish"] as const) base.app.post(`/api/development/profile/${kind}`, handler(kind));
  return { app: base.app, close: async () => { await publication?.close(); await base.close(); } };
}
