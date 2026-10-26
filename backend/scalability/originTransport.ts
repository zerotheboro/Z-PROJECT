import { createCompletionEmulatorFirestore } from "../completionFirestore";
import { assertAuthorityEnvironment } from "./authority";
import { assertBootstrapEnvironment, createBootstrapTransport } from "./bootstrapTransport";
import { ORIGIN_REALM } from "./originContracts";
import { requireContract } from "./values";

export function assertOriginEnvironment() {
  requireContract(process.versions.node.split(".")[0] === "24" && process.env.TRAINING_ORIGIN_STAGE4B2 === "emulator-only", "origin_disabled");
  assertBootstrapEnvironment(); assertAuthorityEnvironment();
}
const transports = new WeakSet<object>();
/** Real separate demo project/storage, NOT separate IAM. Emulator Admin access
 * can cross both realms: no credentials or boolean can upgrade that limitation. */
export function createOriginTransport() {
  assertOriginEnvironment();
  const application = createBootstrapTransport();
  const authority = createCompletionEmulatorFirestore(Object.freeze({ FIREBASE_PROJECT_ID: ORIGIN_REALM, FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787" }));
  const transport = Object.freeze({ application,
    authorityFirestore() { assertOriginEnvironment(); const db = authority.getFirestore(); requireContract((db as unknown as { projectId: unknown }).projectId === ORIGIN_REALM, "origin_realm_mismatch"); return db; },
    async close() { await application.close(); await authority.close(); }
  });
  transports.add(transport); return transport;
}
export function assertOriginTransport(value: object) { requireContract(transports.has(value), "origin_transport_required"); assertOriginEnvironment(); }
export type OriginTransport = ReturnType<typeof createOriginTransport>;
