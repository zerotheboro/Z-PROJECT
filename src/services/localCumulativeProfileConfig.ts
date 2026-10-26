import { resolveLocalCompletionConfig } from "./localTrainingCompletionConfig";

/** UI-only opt-in; never creates a production read or write path. */
export function resolveLocalCumulativeProfileConfig(env: Readonly<Record<string, unknown>>, hostname: string) {
  if (env.DEV !== true || env.VITE_CUMULATIVE_PROFILE_PHASE2C !== "emulator-only") return null;
  const config = resolveLocalCompletionConfig(env, hostname);
  if (!config) throw new Error("The cumulative profile requires isolated Phase 2B demo Emulators.");
  const acceptedPreview = env.VITE_CUMULATIVE_PROFILE_STAGE4F === "emulator-only";
  const syntheticPublished = env.VITE_CUMULATIVE_PROFILE_STAGE4G === "synthetic-emulator-only";
  if (syntheticPublished && config.target !== "protected-v2") throw new Error("Synthetic publication requires isolated Stage 4E completion.");
  if (acceptedPreview && config.target !== "protected-v2") throw new Error("The accepted-evidence preview requires isolated Stage 4E completion.");
  return { ...config, acceptedPreview, ...(syntheticPublished ? { syntheticPublished: true } : {}) };
}

export function localCumulativeProfileConfig() {
  return resolveLocalCumulativeProfileConfig(import.meta.env, typeof window === "undefined" ? "" : window.location.hostname);
}
