import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Timestamp } from "firebase-admin/firestore";
import { createStage2EmulatorTransport, assertStage2Environment, STAGE2_AUTH, STAGE2_PROJECT } from "./acceptanceTransport";
import { requireContract, text } from "./values";
import { BOOTSTRAP_LIMITS } from "./bootstrapContracts";

export function assertBootstrapEnvironment() {
  requireContract(process.versions.node.split(".")[0] === "24" && process.env.TRAINING_BOOTSTRAP_STAGE4B1 === "emulator-only", "bootstrap_disabled");
  assertStage2Environment();
}
type ListingClient = { _opts?: { servicePath?: unknown; port?: unknown; projectId?: unknown; fallback?: unknown; apiEndpoint?: unknown };
  listDocuments: (request: object, options: object) => Promise<[unknown[], unknown, { nextPageToken?: unknown }]>;
  listCollectionIds: (request: object, options: object) => Promise<[unknown[], unknown, { nextPageToken?: unknown }]> };

/** Separate operator-only transport. No ADC, general Admin app, arbitrary host,
 * database injection, remote REST fallback, or HTTP bootstrap endpoint. */
export function createBootstrapTransport() {
  assertBootstrapEnvironment(); const transport = createStage2EmulatorTransport();
  const credential = { getAccessToken: async () => ({ access_token: "owner", expires_in: 3600 }) };
  const app = initializeApp({ projectId: STAGE2_PROJECT, credential }, "stage4b1-" + randomUUID()), auth = getAuth(app);
  const getFirestore = () => { assertBootstrapEnvironment(); return transport.getFirestore(); };
  function getAuthClient() {
    getFirestore();
    const internal = auth as unknown as { emulatorMode?: unknown; authRequestHandler?: { emulatorHostValue?: unknown; app?: unknown } };
    requireContract(app.options.projectId === STAGE2_PROJECT && app.options.credential?.getAccessToken === credential.getAccessToken &&
      app.options.httpAgent === undefined && internal.emulatorMode === true && internal.authRequestHandler?.emulatorHostValue === STAGE2_AUTH &&
      internal.authRequestHandler.app === app, "bootstrap_auth_transport_mismatch");
    return auth;
  }
  // Public listCollections/listDocuments auto-paginate without a readTime. Use
  // the SAME guarded SDK pool, explicit bounded pages and protobuf readTime.
  // This SDK-dependent adapter fails closed when its reviewed shape changes.
  const candidatePool = (getFirestore() as unknown as { _clientPool?: { run<T>(tag: string, grpc: boolean, f: (client: ListingClient) => Promise<T>): Promise<T> } })._clientPool;
  requireContract(candidatePool && typeof candidatePool.run === "function", "bootstrap_listing_transport_mismatch");
  const pool = candidatePool;
  const run = pool.run;
  const prefix = `projects/${STAGE2_PROJECT}/databases/(default)/documents/`;
  async function list(kind: "collections" | "documents", parent: string, collectionId: string | null, at: Timestamp, pageToken: string | null) {
    getFirestore(); text(parent, 6 * 1024);
    requireContract(parent.split("/").every(s => s.length > 0 && s !== "." && s !== ".."), "bootstrap_listing_path");
    if (pageToken !== null) text(pageToken, 16 * 1024);
    const internal = getFirestore() as unknown as { _clientPool?: unknown };
    requireContract(internal._clientPool === pool && pool.run === run, "bootstrap_listing_transport_mismatch");
    return pool.run("stage4b1-bounded-inventory", false, async client => {
      getFirestore();
      requireContract(client._opts?.servicePath === "127.0.0.1" && client._opts.port === 18787 &&
        client._opts.projectId === STAGE2_PROJECT && client._opts.fallback === false && client._opts.apiEndpoint === undefined &&
        typeof client.listDocuments === "function" && typeof client.listCollectionIds === "function", "bootstrap_listing_transport_mismatch");
      const request = { parent: prefix + parent, pageSize: BOOTSTRAP_LIMITS.pageRecords,
        ...(pageToken === null ? {} : { pageToken }), readTime: { seconds: at.seconds, nanos: at.nanoseconds },
        ...(kind === "documents" ? { collectionId, showMissing: true, mask: { fieldPaths: ["__name__"] } } : {}) };
      const result = await client[kind === "documents" ? "listDocuments" : "listCollectionIds"](request,
        { autoPaginate: false, timeout: 10_000, otherArgs: { headers: { Authorization: "Bearer owner" } } });
      getFirestore();
      requireContract(Array.isArray(result) && Array.isArray(result[0]) && result[0].length <= BOOTSTRAP_LIMITS.pageRecords,
        "bootstrap_listing_capacity");
      const next = result[2]?.nextPageToken;
      requireContract(next === undefined || typeof next === "string", "bootstrap_listing_invalid");
      if (typeof next === "string" && next.length) text(next, 16 * 1024);
      const rows = result[0].map(value => {
        if (kind === "collections") {
          text(value, 1500); requireContract(!value.includes("/") && value !== "." && value !== "..", "bootstrap_listing_invalid"); return value;
        }
        const name = (value as { name?: unknown } | null)?.name; text(name, 8 * 1024);
        const expected = prefix + parent + "/" + collectionId + "/";
        requireContract(name.startsWith(expected) && name.slice(expected.length).length > 0 && !name.slice(expected.length).includes("/"), "bootstrap_listing_scope");
        return name.slice(prefix.length);
      });
      return { rows, next: typeof next === "string" && next.length ? next : null };
    });
  }
  return Object.freeze({ getFirestore, getAuthClient, verifyToken: transport.verifyToken, list,
    async close() { await transport.close(); await deleteApp(app); } });
}
export type BootstrapTransport = ReturnType<typeof createBootstrapTransport>;
