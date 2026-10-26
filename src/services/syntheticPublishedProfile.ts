import { buildCumulativeProfileView } from "../quiz/cumulativeProfileView";
import type { ProfileRow } from "../quiz/cumulativeProfileView";
import type { CumulativeProfileSnapshot, PendingCompletionStatus } from "./cumulativeProfileReader";

export const SYNTHETIC_PUBLICATION_PROTOCOL = "synthetic-emulator-publication-stage4g-v1";
export type SyntheticPublicationStatus = { kind: "synthetic-emulator-publication"; authority: "NOT VERIFIED";
  publication: "published" | "not-published"; generationId: string | null; acceptedSessions: number;
  publishedSessions: number; pendingSessions: number; publishedAt: string | null };
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const digest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const requireValue = (ok: unknown): void => { if (!ok) throw new Error("Synthetic publication data could not be verified. No partial profile was displayed."); };

/** Browser implementation of the existing versioned typed-hash encoding.
 * Strict JSON only; bounded per value, not a single document budget for history. */
export async function syntheticProfileHash(domain: string, value: unknown) {
  let nodes = 0;
  const string = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      const n = s.charCodeAt(i);
      if (n >= 0xd800 && n <= 0xdbff) { const next = s.charCodeAt(++i); requireValue(next >= 0xdc00 && next <= 0xdfff); }
      else requireValue(n < 0xdc00 || n > 0xdfff);
    }
    return s;
  };
  function tag(v: unknown, depth = 0): unknown {
    requireValue(++nodes < 100_000 && depth < 48);
    if (v === null) return ["null"];
    if (Array.isArray(v)) {
      const out: unknown[] = [];
      for (let i = 0; i < v.length; i++) { requireValue(Object.hasOwn(v, i)); out.push(tag(v[i], depth + 1)); }
      return ["array", out];
    }
    if (record(v)) return ["map", Object.keys(v).sort().map(k => [string(k), tag(v[k], depth + 1)])];
    if (typeof v === "string") return ["string", string(v)];
    requireValue(typeof v === "boolean" || typeof v === "number" && Number.isFinite(v));
    return [typeof v, typeof v === "number" && Object.is(v, -0) ? "-0" : v];
  }
  const bytes = new TextEncoder().encode(JSON.stringify(["edulience-scalability", 1, string(domain), tag(value)]));
  requireValue(bytes.length <= 2 * 1024 * 1024);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(n => n.toString(16).padStart(2, "0")).join("");
}

/** Injected authenticated loopback transport. Every page is pinned to an
 * immutable generation; neither acceptance revisions nor pagination are profiles.
 * No client aggregation or profile writes. */
export function createSyntheticPublishedProfileReader(request: (path: string) => Promise<unknown>, check: (uid: string) => void,
  pending: (uid: string) => Promise<PendingCompletionStatus[]>) {
  return async (uid: string): Promise<CumulativeProfileSnapshot> => {
    check(uid); const status = await request("status"); check(uid);
    requireValue(record(status) && status.protocol === SYNTHETIC_PUBLICATION_PROTOCOL && status.uid === uid && status.authority === "NOT VERIFIED" &&
      record(status.accepted) && count(status.accepted.sessionCount) && count(status.accepted.revision));
    const s = status as Record<string, unknown>, accepted = s.accepted as { sessionCount: number; revision: number };
    const publication = s.publication;
    const rows: ProfileRow[] = [], legacy: ProfileRow[] = [];
    let publishedSessions = 0, generationId: string | null = null, publishedAt: string | null = null;
    if (publication !== null) {
      requireValue(record(publication)); const p = publication as Record<string, unknown>;
      requireValue(p.schemaVersion === 1 && p.protocol === SYNTHETIC_PUBLICATION_PROTOCOL && p.status === "synthetic-published" &&
        p.uid === uid && p.authority === "NOT VERIFIED" && p.productionPublication === false && record(p.context) && p.context.uid === uid &&
        digest(p.generationId) && digest(p.publicationHash) && digest(p.profileHash) && digest(p.historyHash) && count(p.sessionCount) && p.sessionCount > 0 &&
        record(p.source) && p.source.uid === uid && count(p.source.revision) && p.source.revision <= accepted.revision &&
        typeof p.publishedAt === "string" && Number.isFinite(Date.parse(p.publishedAt)));
      const { publicationHash, ...body } = p;
      requireValue(publicationHash === await syntheticProfileHash("synthetic-publication-record-stage4g-v1", body)); check(uid);
      requireValue(p.profileHash === await syntheticProfileHash("shadow-profile-v1", s.profile)); check(uid);
      publishedSessions = Number(p.sessionCount); generationId = String(p.generationId); publishedAt = String(p.publishedAt);
      requireValue(publishedSessions <= accepted.sessionCount && publishedSessions <= 10_000);
      let offset = 0, historyHash = await syntheticProfileHash("synthetic-history-start-stage4g-v1", { uid, generationId });
      const ids = new Set<string>(), sessions = new Set<string>(), revisions = new Set<number>();
      while (offset < publishedSessions) {
        const page = await request(`history?generationId=${generationId}&after=${offset}&limit=20`); check(uid);
        requireValue(record(page) && page.protocol === SYNTHETIC_PUBLICATION_PROTOCOL && page.uid === uid && page.generationId === generationId &&
          page.publicationHash === p.publicationHash && page.offset === offset && page.total === publishedSessions && Array.isArray(page.rows));
        const data = page as { rows: unknown[]; next: unknown };
        requireValue(data.rows.length > 0 && data.rows.length <= 20 && offset + data.rows.length <= publishedSessions);
        for (const value of data.rows) {
          requireValue(record(value)); const row = value as Record<string, unknown>;
          requireValue(typeof row.id === "string" && record(row.data) && record(row.data.evidence) && typeof row.data.evidence.sessionId === "string" &&
            !ids.has(row.id) && !sessions.has(row.data.evidence.sessionId));
          const receipt = (row.data as Record<string, unknown>).receipt;
          requireValue(record(receipt) && count(receipt.acceptedRevision) && receipt.acceptedRevision > 0 &&
            receipt.acceptedRevision <= (p.source as { revision: number }).revision && !revisions.has(receipt.acceptedRevision) &&
            receipt.lifecycleEpoch === (p.context as { lifecycleEpoch?: number }).lifecycleEpoch);
          revisions.add((receipt as { acceptedRevision: number }).acceptedRevision);
          ids.add(String(row.id)); sessions.add(String((row.data as { evidence: { sessionId: string } }).evidence.sessionId));
          historyHash = await syntheticProfileHash("synthetic-history-fold-stage4g-v1", { previous: historyHash, index: offset++, row }); check(uid);
          rows.push({ id: String(row.id), data: row.data });
          if (record(row.data) && record(row.data.evidence) && row.data.evidence.mode === "auto")
            legacy.push({ id: String(row.data.evidence.sessionId), data: row.details });
        }
        requireValue(data.next === (offset < publishedSessions ? offset : null));
      }
      requireValue(historyHash === p.historyHash);
    } else requireValue(s.profile === null);
    const view = buildCumulativeProfileView(uid, publication === null ? null : { kind: "synthetic-published-generation", profile: s.profile },
      rows, legacy, { syntheticPublished: true });
    if (publication !== null) requireValue(view.coverageComplete && view.summary?.sessionCount === publishedSessions);
    let local: PendingCompletionStatus[] = [], browserStorageVerified = true;
    try { local = await pending(uid); } catch { browserStorageVerified = false; } check(uid);
    return { ...view, pending: local, browserStorageVerified, publication: { kind: "synthetic-emulator-publication", authority: "NOT VERIFIED",
      publication: publication === null ? "not-published" : "published", generationId, acceptedSessions: accepted.sessionCount,
      publishedSessions, pendingSessions: accepted.sessionCount - publishedSessions, publishedAt } };
  };
}
