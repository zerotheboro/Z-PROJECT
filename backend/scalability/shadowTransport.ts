import { createStage2EmulatorTransport, assertStage2Environment } from "./acceptanceTransport";
import { requireContract } from "./values";

/** Separate opt-in only. Reuses the dedicated SDK transport guards, never ADC or
 * the active server's cached Admin client. No Firebase credentials are accepted. */
export function assertShadowEnvironment(env: Readonly<Record<string, string | undefined>> = process.env) {
  requireContract(env.TRAINING_SHADOW_STAGE3A === "emulator-only", "shadow_worker_disabled");
  assertStage2Environment(env);
}
export function createShadowEmulatorTransport(env: Readonly<Record<string, string | undefined>> = process.env) {
  assertShadowEnvironment(env);
  const transport = createStage2EmulatorTransport(env);
  return Object.freeze({ getFirestore() { assertShadowEnvironment(env); return transport.getFirestore(); },
    // Actual registered Stage 2 transport, never caller-supplied auth/DB.
    writerTransport: transport, close: transport.close });
}
