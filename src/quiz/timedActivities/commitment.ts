export const EXIT_GRACE_MS = 1500;
export type Commitment = {
  version: 1; attempt: number; rootAttempt: string; durationMs: number; startedAt: number; deadline: number;
  lastSeen: number; hiddenSince: number | null; hiddenCounted: boolean; exits: number;
  status: "running" | "finished" | "invalid"; reason: string | null;
  endedAt: number | null;
};
export function startCommitment(durationMs: number, now: number, previous?: Commitment): Commitment {
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || !Number.isSafeInteger(now) || !Number.isSafeInteger(now + durationMs)) throw new Error("Invalid activity timing.");
  return { version: 1, attempt: (previous?.attempt ?? 0) + 1, rootAttempt: previous?.rootAttempt ?? crypto.randomUUID(),
    durationMs, startedAt: now, deadline: now + durationMs, lastSeen: now, hiddenSince: null, hiddenCounted: false,
    exits: 0, status: "running", reason: null, endedAt: null };
}
export function validCommitment(value: unknown): value is Commitment {
  if (!value || typeof value !== "object") return false;
  const v = value as Commitment;
  return v.version === 1 && Number.isSafeInteger(v.attempt) && v.attempt > 0 && typeof v.rootAttempt === "string" && v.rootAttempt.length > 0 &&
    [v.durationMs, v.startedAt, v.deadline, v.lastSeen, v.exits].every(Number.isSafeInteger) && v.durationMs > 0 &&
    v.deadline === v.startedAt + v.durationMs && v.lastSeen >= v.startedAt && v.exits >= 0 && v.exits <= 3 && (v.exits < 3 || v.status === "invalid") &&
    (v.hiddenSince === null || Number.isSafeInteger(v.hiddenSince) && v.hiddenSince >= v.startedAt) && typeof v.hiddenCounted === "boolean" &&
    ["running", "finished", "invalid"].includes(v.status) && (v.reason === null || typeof v.reason === "string") &&
    (v.status === "running" ? v.endedAt === null : Number.isSafeInteger(v.endedAt) && v.endedAt! >= v.startedAt && v.endedAt! <= v.deadline);
}
/** Wall clock and visibility are browser reports, not sleep/cheating proof. */
export function advanceCommitment(input: Commitment, now: number, hidden: boolean, grace = EXIT_GRACE_MS): Commitment {
  const v = { ...input };
  if (v.status !== "running") return v;
  if (!Number.isSafeInteger(now) || now < v.lastSeen - 1000) return { ...v, status: "invalid", endedAt: Math.min(v.lastSeen, v.deadline), reason: "The device clock moved backward. Restart this attempt." };
  if (v.hiddenSince !== null && !v.hiddenCounted && now - v.hiddenSince >= grace && v.hiddenSince + grace <= v.deadline) {
    v.exits++; v.hiddenCounted = true;
    if (v.exits >= 3) { v.status = "invalid"; v.endedAt = Math.min(now, v.deadline); v.reason = "Three distinct interruptions ended this attempt. No result was scored."; }
  }
  if (v.status === "running" && now >= v.deadline) { v.status = "finished"; v.endedAt = v.deadline; }
  if (v.status === "running") {
    if (hidden && v.hiddenSince === null) { v.hiddenSince = now; v.hiddenCounted = false; }
    if (!hidden) { v.hiddenSince = null; v.hiddenCounted = false; }
  }
  v.lastSeen = now;
  return v;
}

export type LocalActivityIdentity = { owner: string; sessionId: string; project: string };
export const activityPrefix = (identity: LocalActivityIdentity) => `edulience.optional-activities.v1:${JSON.stringify([identity.project, identity.owner])}:`;
export const activityKey = (identity: LocalActivityIdentity, scope: string) => activityPrefix(identity) + JSON.stringify([identity.sessionId, scope]);
export function readLocalActivity<T>(key: string, validate: (value: unknown) => value is T): T | null {
  const text = window.localStorage.getItem(key);
  if (text === null) return null;
  const value: unknown = JSON.parse(text);
  if (!validate(value)) throw new Error("Saved local activity is unreadable. It was not overwritten or scored.");
  return value;
}
export function writeLocalActivity(key: string, value: unknown): void {
  const text = JSON.stringify(value);
  if (new TextEncoder().encode(text).length > 128 * 1024) throw new Error("The local activity capacity was reached.");
  window.localStorage.setItem(key, text);
  if (window.localStorage.getItem(key) !== text) throw new Error("Browser storage did not confirm this activity. Keep the page open.");
}
