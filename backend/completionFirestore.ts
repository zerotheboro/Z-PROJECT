import { Firestore } from "firebase-admin/firestore";
import { CompletionError } from "./trainingCompletionContract";

type Environment = Readonly<Record<string, string | undefined>>;
export type CompletionEmulatorConfig = Readonly<{ projectId: string; hostname: string; port: number }>;

export function completionEmulatorConfig(env: Environment = process.env): CompletionEmulatorConfig {
  const projectId = env.FIREBASE_PROJECT_ID ?? "";
  const match = /^(127\.0\.0\.1|localhost):([0-9]{1,5})$/.exec(env.FIRESTORE_EMULATOR_HOST ?? "");
  if (!/^demo-[a-z0-9-]+$/.test(projectId) || !match || Number(match[2]) < 1 || Number(match[2]) > 65535) {
    throw new CompletionError(503, "completion_emulator_only");
  }
  return Object.freeze({ projectId, hostname: match[1], port: Number(match[2]) });
}

/** Inspect the initialized transport, never credentials or settings.toJSON().
 * _settings is intentionally fail-closed: an incompatible SDK must not silently
 * weaken this emulator-only boundary. No Firestore operation is needed here.
 */
export function assertCompletionEmulatorClient(client: Firestore, config: CompletionEmulatorConfig): void {
  const initialized = client as unknown as { projectId?: unknown; _settings?: Record<string, unknown> };
  const settings = initialized._settings;
  if (initialized.projectId !== config.projectId || client.databaseId !== "(default)" ||
    settings?.projectId !== config.projectId || settings.servicePath !== config.hostname ||
    settings.port !== config.port || settings.ssl !== false || settings.apiEndpoint !== undefined || settings.host !== undefined) {
    throw new CompletionError(503, "completion_emulator_client_mismatch");
  }
}

/** Dedicated, credential-free transport. Never calls getApp()/getFirestore()
 * on the general Firebase Admin manager, even if an incompatible app is cached.
 */
export function createCompletionEmulatorFirestore(env: Environment = process.env) {
  const config = completionEmulatorConfig(env);
  const client = new Firestore({ projectId: config.projectId, databaseId: "(default)",
    host: `${config.hostname}:${config.port}`, ssl: false });
  // Freeze SDK settings through its public API before any references/RPCs exist.
  client.settings({});
  assertCompletionEmulatorClient(client, config);
  return {
    getFirestore() {
      const current = completionEmulatorConfig(env);
      if (current.projectId !== config.projectId || current.hostname !== config.hostname || current.port !== config.port) {
        throw new CompletionError(503, "completion_emulator_client_mismatch");
      }
      assertCompletionEmulatorClient(client, config);
      return client;
    },
    close: () => client.terminate()
  };
}
