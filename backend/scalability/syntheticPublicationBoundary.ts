import { assertProtectedTrainingEnvironment } from "./protectedTrainingPolicy";
import { createOriginPrototype } from "./origin";
import { requireContract } from "./values";
import type { SharedWriterGuard } from "./writerGuard";

/** An explicitly synthetic test boundary, NOT admission or production IAM proof.
 * Both SDK transports independently enforce fixed loopback demo projects. */
export function assertSyntheticPublicationEnvironment() {
  assertProtectedTrainingEnvironment();
  requireContract(process.env.TRAINING_PUBLICATION_STAGE4G === "synthetic-emulator-only" &&
    process.env.TRAINING_SHADOW_STAGE3A === "emulator-only" && process.env.TRAINING_PUBLICATION_STAGE3B === "emulator-only",
  "synthetic_publication_disabled");
}
export function createSyntheticPublicationBoundary(token: string, guard: SharedWriterGuard) {
  assertSyntheticPublicationEnvironment();
  const origin = createOriginPrototype();
  return Object.freeze({
    async principal(uid?: string) {
      assertSyntheticPublicationEnvironment();
      const recovered = await origin.recover(token);
      requireContract(recovered.state === "EXTERNAL_TRUST_NOT_ENFORCED", "synthetic_origin_required");
      const principal = await guard.authenticate(token);
      requireContract(uid === undefined || principal.uid === uid, "synthetic_owner_mismatch");
      return principal;
    },
    close: origin.close
  });
}
