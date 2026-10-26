import { collection, doc, getDocFromServer, getDocsFromServer, limit, query } from "firebase/firestore";
import { auth, db } from "../firebase";
import { localCumulativeProfileConfig } from "./localCumulativeProfileConfig";
import { getLocalTrainingCompletionClient } from "./localTrainingCompletion";
import { createCumulativeProfileReader } from "./cumulativeProfileReader";
import { createSyntheticPublishedProfileReader } from "./syntheticPublishedProfile";

function syntheticRequest(owner: NonNullable<typeof auth.currentUser>) {
  return async (path: string, method = "GET") => {
    assertLocalProfileEnvironment(); const config = localCumulativeProfileConfig();
    if (!config?.syntheticPublished || auth.currentUser !== owner) throw new Error("Sign-in changed or synthetic publication is disabled.");
    const token = await owner.getIdToken();
    if (auth.currentUser !== owner) throw new Error("Sign-in changed.");
    const response = await fetch(`${config.apiBase}/api/development/profile/${path}`, { method,
      headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (auth.currentUser !== owner) throw new Error("Sign-in changed.");
    if (!response.ok) throw new Error("The isolated publication service rejected this request. No legacy write was attempted.");
    const text = await response.text();
    if (auth.currentUser !== owner || new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error("Publication response unavailable.");
    return JSON.parse(text) as unknown;
  };
}

/** Explicit local demo action; never called by completion or production routes. */
export async function publishLocalSyntheticProfile() {
  const owner = auth.currentUser; if (!owner) throw new Error("Local demo sign-in required.");
  const request = syntheticRequest(owner), result = await request("aggregate", "POST") as { generationId?: unknown };
  // A ready unchanged generation can be retried via the caller's refresh; no
  // client-generated generation ID, receipt, profile or performance is submitted.
  if (typeof result.generationId !== "string") throw new Error("No new generation is ready. Refresh the recorded publication state.");
  await request(`publish?generationId=${encodeURIComponent(result.generationId)}`, "POST");
}

/** Defense in depth: flags alone are not evidence of a correctly isolated SDK. */
export function assertLocalProfileEnvironment() {
  const config = localCumulativeProfileConfig();
  const emulator = auth.emulatorConfig;
  const database = db as unknown as { _getSettings?: () => { host?: string; ssl?: boolean }; _databaseId?: { database: string } };
  const settings = database._getSettings?.();
  if (!config || auth.app.options.projectId !== config.projectId || db.app.options.projectId !== config.projectId ||
    emulator?.host !== config.authHost || emulator.port !== config.authPort || emulator.protocol !== "http" ||
    settings?.host !== `${config.firestoreHost}:${config.firestorePort}` || settings.ssl !== false || database._databaseId?.database !== "(default)") {
    throw new Error("The cumulative profile is available only with isolated local demo Auth and Firestore Emulators.");
  }
}

export function getLocalCumulativeProfileReader() {
  assertLocalProfileEnvironment();
  const config = localCumulativeProfileConfig()!;
  const owner = auth.currentUser;
  if (!owner) throw new Error("Sign in to the local demo account to view recorded evidence.");
  const check = (uid: string) => {
    assertLocalProfileEnvironment();
    if (auth.currentUser !== owner || uid !== owner.uid) throw new Error("Sign-in changed. Previous account data was not displayed.");
  };
  const rows = async (uid: string, name: "learningEvidence" | "assessments") => {
    check(uid);
    const snapshot = await getDocsFromServer(query(collection(db, "users", uid, name), limit(101))); check(uid);
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) throw new Error("Recorded history has not been confirmed by the local server.");
    return snapshot.docs.map(item => ({ id: item.id, data: item.data() }));
  };
  if (config.syntheticPublished) return createSyntheticPublishedProfileReader(syntheticRequest(owner), check, async uid => {
    check(uid); const entries = await getLocalTrainingCompletionClient()?.list(uid); check(uid);
    if (!entries) throw new Error("Browser recovery storage is unavailable.");
    return entries.map(entry => ({ sessionId: entry.sessionId, acknowledged: entry.receipt !== null, legacy: entry.reservationStatus === "legacy" }));
  });
  return createCumulativeProfileReader({
    async summary(uid) {
      check(uid); const snapshot = await getDocFromServer(doc(db, "users", uid, "learningProfiles", "cumulative")); check(uid);
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) throw new Error("The summary has not been confirmed by the local server.");
      return snapshot.exists() ? snapshot.data() : null;
    },
    evidence: uid => rows(uid, "learningEvidence"), legacy: uid => rows(uid, "assessments"),
    async pending(uid) {
      check(uid); const entries = await getLocalTrainingCompletionClient()?.list(uid); check(uid);
      if (!entries) throw new Error("Browser recovery storage is unavailable.");
      // Do not parse or expose the private frozen payload/reflection in previews.
      return entries.map(entry => ({ sessionId: entry.sessionId, acknowledged: entry.receipt !== null,
        legacy: entry.reservationStatus === "legacy" }));
    }
  }, check, { acceptedPreview: config.acceptedPreview });
}
