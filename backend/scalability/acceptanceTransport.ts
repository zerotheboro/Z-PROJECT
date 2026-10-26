import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createCompletionEmulatorFirestore } from "../completionFirestore";
import { CompletionError, requireCompletion } from "../trainingCompletionContract";
import { trainingOwnerUID } from "./ownerUID";

export const STAGE2_PROJECT = "demo-edulience-phase2a";
export const STAGE2_FIRESTORE = "127.0.0.1:18787";
export const STAGE2_AUTH = "127.0.0.1:9099";
type Environment = Readonly<Record<string, string | undefined>>;

/** No ADC, service accounts, inherited tokens, remote hosts or implicit enablement.
 * Error messages deliberately contain no environment values or token details. */
export function assertStage2Environment(env: Environment = process.env): void {
  requireCompletion(env.TRAINING_JOURNAL_STAGE2 === "emulator-only" && env.NODE_ENV === "test",
    "stage2_disabled", 503);
  requireCompletion(env.FIREBASE_PROJECT_ID === STAGE2_PROJECT &&
    [env.GCLOUD_PROJECT, env.GOOGLE_CLOUD_PROJECT].every(value => value === undefined || value === STAGE2_PROJECT) &&
    env.FIRESTORE_EMULATOR_HOST === STAGE2_FIRESTORE && env.FIREBASE_AUTH_EMULATOR_HOST === STAGE2_AUTH,
    "stage2_emulator_only", 503);
  for (const key of Object.keys(env)) {
    if (/TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE_KEY|SERVICE_ACCOUNT|API_KEY|ACCESS_KEY|AUTHORIZATION|PROXY|^GRPC_|^GOOGLE_API_USE_|^NODE_EXTRA_CA_CERTS$|^SSL_CERT_|^SSH_AUTH_SOCK$|^GH_|^GITHUB_|^PADDLE_|^STRIPE_|^FIREBASE_CONFIG$|^DEBUG$/i.test(key)) {
      requireCompletion(key === "OPENAI_API_KEY" && env[key] === "offline-test-placeholder-not-a-real-key",
        "stage2_credentials_forbidden", 503);
    }
  }
}

const transports = new WeakSet<object>();
export function assertStage2Transport(value: object): void {
  requireCompletion(transports.has(value), "stage2_transport_required", 503);
}

/** Dedicated clients, never the general cached Admin app. Captured Auth transport
 * internals are checked fail-closed before verification RPCs, like Phase 2A's
 * Firestore guard. An SDK upgrade that changes these structures requires review. */
export function createStage2EmulatorTransport(env: Environment = process.env) {
  assertStage2Environment(env);
  const firestore = createCompletionEmulatorFirestore(env);
  // Public emulator-only placeholder, NOT an application/default credential.
  const credential = { getAccessToken: async () => ({ access_token: "owner", expires_in: 3600 }) };
  const app = initializeApp({ projectId: STAGE2_PROJECT, credential }, `stage2-${randomUUID()}`);
  const auth = getAuth(app);
  function assertTransport() {
    assertStage2Environment(env);
    const internal = auth as unknown as { emulatorMode?: unknown;
      authRequestHandler?: { emulatorHostValue?: unknown; app?: unknown } };
    // Admin defensively copies the options object; compare the installed dummy
    // credential method, not the copied container's object identity.
    requireCompletion(app.options.projectId === STAGE2_PROJECT && app.options.credential?.getAccessToken === credential.getAccessToken &&
      app.options.httpAgent === undefined && internal.emulatorMode === true &&
      internal.authRequestHandler?.emulatorHostValue === STAGE2_AUTH && internal.authRequestHandler.app === app,
    "stage2_auth_transport_mismatch", 503);
    return firestore.getFirestore();
  }
  const transport = Object.freeze({
    getFirestore: assertTransport,
    async verifyToken(token: unknown): Promise<string> {
      assertTransport();
      requireCompletion(typeof token === "string" && token.length > 0 && token.length <= 16_384, "authentication_required", 401);
      try {
        const decoded = await auth.verifyIdToken(token, true);
        assertTransport();
        requireCompletion(decoded.aud === STAGE2_PROJECT && decoded.iss === `https://securetoken.google.com/${STAGE2_PROJECT}` &&
          decoded.firebase?.tenant === undefined, "authentication_required", 401);
        trainingOwnerUID(decoded.uid);
        return decoded.uid;
      } catch (error) {
        if (error instanceof CompletionError) throw error;
        throw new CompletionError(401, "authentication_required");
      }
    },
    /** Server-observed Auth facts, never client ownership/claim input. This is
     * an authentication snapshot, not an atomic Auth/Firestore incarnation proof. */
    async verifyWriterIdentity(token: unknown) {
      const uid = await transport.verifyToken(token);
      assertTransport();
      let user;
      try { user = await auth.getUser(uid); }
      catch { throw new CompletionError(401, "authentication_required"); }
      assertTransport();
      requireCompletion(!user.disabled, "authentication_required", 401);
      const claims = user.customClaims ?? {};
      for (const key of ["originStage4b2Incarnation", "originStage4b2Protocol"]) requireCompletion(
        !Object.hasOwn(claims, key) || typeof claims[key] === "string", "authentication_required", 401);
      return Object.freeze({ uid, authCreatedAt: new Date(user.metadata.creationTime).toISOString(),
        originIncarnation: typeof user.customClaims?.originStage4b2Incarnation === "string" ? user.customClaims.originStage4b2Incarnation : null,
        originProtocol: typeof user.customClaims?.originStage4b2Protocol === "string" ? user.customClaims.originStage4b2Protocol : null });
    },
    async close() { await firestore.close(); await deleteApp(app); }
  });
  transports.add(transport);
  try { assertTransport(); } catch (error) { void transport.close(); throw error; }
  return transport;
}
export type Stage2Transport = ReturnType<typeof createStage2EmulatorTransport>;
