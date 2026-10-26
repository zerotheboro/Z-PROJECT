export type LocalCompletionConfig = {
  projectId: string;
  apiBase: string;
  authHost: string;
  authPort: number;
  firestoreHost: string;
  firestorePort: number;
  target?: "v1" | "protected-v2";
};

/** Never enable this path in a production bundle, even with a mistaken flag. */
export function resolveLocalCompletionConfig(
  env: Readonly<Record<string, unknown>>,
  hostname: string
): LocalCompletionConfig | null {
  if (env.DEV !== true || env.VITE_TRAINING_COMPLETION_PHASE2B !== "emulator-only") return null;
  const loopback = (value: string) => ["127.0.0.1", "localhost", "[::1]"].includes(value);
  const projectId = String(env.VITE_TRAINING_COMPLETION_PROJECT_ID ?? "demo-edulience-phase2a");
  const api = new URL(String(env.VITE_API_BASE_URL ?? ""));
  const protectedV2 = env.VITE_TRAINING_PROTECTED_STAGE4E === "emulator-only";
  if (!loopback(hostname) || !/^demo-[a-z0-9-]+$/.test(projectId) || api.protocol !== "http:" ||
    !loopback(api.hostname) || api.username || api.password || api.pathname !== "/" || api.search || api.hash ||
    protectedV2 && projectId !== "demo-edulience-phase2a") {
    throw new Error("Local Training completion requires loopback services and a demo Firebase project.");
  }
  return { projectId, apiBase: api.origin, authHost: "127.0.0.1", authPort: 9099,
    firestoreHost: "127.0.0.1", firestorePort: 18787, ...(protectedV2 ? { target: "protected-v2" as const } : {}) };
}

export function localCompletionConfig(): LocalCompletionConfig | null {
  return resolveLocalCompletionConfig(import.meta.env,
    typeof window === "undefined" ? "" : window.location?.hostname ?? "");
}
