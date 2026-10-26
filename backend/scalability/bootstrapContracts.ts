import { AUTHORITY_PROTOCOL, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { trainingOwnerUID } from "./ownerUID";
import { parseJournalAnchor } from "./journal";
import type { JournalAnchor } from "./journal";
import { parseReadTime } from "./shadowContracts";
import { createInventoryBootstrap } from "./inventory";
import { bounded, copyJSON, hash, integer, jsonBytes, object, requireContract, text, timestamp, typedHash } from "./values";

export const BOOTSTRAP_PROTOCOL = "protected-synthetic-origin-stage4b1-v1" as const;
export const BOOTSTRAP_COLLECTION = "trainingBootstrapOrigins";
export const COHORT_PREFIX = "b1_";
export const BOOTSTRAP_STATES = Object.freeze(["UNVERIFIED_ORIGIN", "ORIGIN_VERIFIED", "INVENTORY_VERIFIED",
  "WRITER_FENCING_VERIFIED", "ADMISSION_ELIGIBLE", "ADMITTED"] as const);
export const BOOTSTRAP_LIMITS = Object.freeze({ pageRecords: 20, pageBytes: 128 * 1024,
  records: 10_000, depth: 12, listingCalls: 30_000, transactionBytes: 128 * 1024 });
export type Genesis = Readonly<{ schemaVersion: 1; protocol: typeof BOOTSTRAP_PROTOCOL; uid: string; lifecycleEpoch: 1;
  writerProtocol: typeof AUTHORITY_PROTOCOL; catalog: typeof SOURCE_NAMESPACE_VERSION; requestId: string;
  rootBinding: string; authCreatedAt: string; initialState: "active"; initialFence: 1; initialRevision: 0;
  bootstrapDigest: string; genesisHash: string }>;
export function parseGenesis(value: unknown): Genesis {
  const d = object(value, ["schemaVersion", "protocol", "uid", "lifecycleEpoch", "writerProtocol", "catalog", "requestId",
    "rootBinding", "authCreatedAt", "initialState", "initialFence", "initialRevision", "bootstrapDigest", "genesisHash"]);
  trainingOwnerUID(d.uid); text(d.requestId, 100); timestamp(d.authCreatedAt);
  hash(d.rootBinding); hash(d.bootstrapDigest); hash(d.genesisHash);
  requireContract(d.schemaVersion === 1 && d.protocol === BOOTSTRAP_PROTOCOL && d.uid.startsWith(COHORT_PREFIX) &&
    d.lifecycleEpoch === 1 && d.writerProtocol === AUTHORITY_PROTOCOL && d.catalog === SOURCE_NAMESPACE_VERSION &&
    d.initialState === "active" && d.initialFence === 1 && d.initialRevision === 0, "bootstrap_genesis_invalid");
  requireContract(d.bootstrapDigest === createInventoryBootstrap({ uid: d.uid, lifecycleEpoch: 1, revision: 0, headHash: null }, []).bootstrapDigest,
    "bootstrap_genesis_scope");
  const { genesisHash, ...body } = d;
  requireContract(genesisHash === typedHash("bootstrap-genesis-stage4b1-v1", body), "bootstrap_genesis_invalid");
  return bounded(d, 8 * 1024) as unknown as Genesis;
}
export type InventoryPin = Readonly<{ uid: string; lifecycleEpoch: number | null; lifecycleRevision: number | null;
  lifecycleHead: string | null; lifecycleFence: number | null; writerProtocol: string | null; genesisHash: string | null;
  lifecycleState: string | null; journal: JournalAnchor | null; writerFenceHash: string | null;
  rootCreatedAt: { seconds: number; nanoseconds: number } | null;
  scopeVersion: "all-user-descendants-stage4b1-v1"; readTime: { seconds: number; nanoseconds: number } }>;
export type InventoryRecord = Readonly<{ path: string; category: string; exists: boolean; fingerprint: string | null;
  createdAt: { seconds: number; nanoseconds: number } | null; updatedAt: { seconds: number; nanoseconds: number } | null;
  issues: readonly string[]; links: readonly { kind: string; recordId: string; target: string | null; fingerprint: string | null }[] }>;
export type BootstrapInventoryPage = Readonly<{ schemaVersion: 1; pin: InventoryPin; index: number;
  previousHash: string | null; records: readonly InventoryRecord[]; pageHash: string }>;
export type BootstrapInventoryManifest = Readonly<{ schemaVersion: 1; pin: InventoryPin; pageCount: number;
  recordCount: number; inventoryDigest: string; manifestHash: string }>;

/** Snapshot only the container here: a whole history may exceed a single JSON
 * value's budget. Check dense own data properties before processing any entry;
 * never read untrusted indices or invoke their map/forEach/iterator overrides.
 * Record/page parsers subsequently make bounded defensive copies separately. */
function inventoryArray(value: unknown, maximum: number): readonly unknown[] {
  requireContract(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype, "bootstrap_inventory_array");
  const length = Object.getOwnPropertyDescriptor(value, "length");
  requireContract(length && "value" in length, "bootstrap_inventory_array");
  integer(length.value);
  requireContract(length.value <= maximum, "bootstrap_inventory_capacity");
  requireContract(Reflect.ownKeys(value).length === length.value + 1, "bootstrap_inventory_array");
  const entries: unknown[] = [];
  for (let index = 0; index < length.value; index++) {
    const item = Object.getOwnPropertyDescriptor(value, String(index));
    requireContract(item && "value" in item && item.enumerable, "bootstrap_inventory_array");
    entries.push(item.value);
  }
  return Object.freeze(entries);
}

export function parseInventoryPin(value: unknown): InventoryPin {
  const d = object(value, ["uid", "lifecycleEpoch", "lifecycleRevision", "lifecycleHead", "lifecycleFence", "writerProtocol", "genesisHash",
    "lifecycleState", "journal", "writerFenceHash", "rootCreatedAt", "scopeVersion", "readTime"]);
  trainingOwnerUID(d.uid); parseReadTime(d.readTime);
  for (const k of ["lifecycleEpoch", "lifecycleRevision", "lifecycleFence"]) if (d[k] !== null) integer(d[k], k === "lifecycleRevision" ? 0 : 1);
  for (const k of ["lifecycleHead", "genesisHash"]) if (d[k] !== null) hash(d[k]);
  if (d.writerFenceHash !== null) requireContract(typeof d.writerFenceHash === "string" && /^v2:[a-f0-9]{64}$/.test(d.writerFenceHash), "bootstrap_inventory_scope");
  if (d.rootCreatedAt !== null) parseReadTime(d.rootCreatedAt);
  if (d.lifecycleState !== null) requireContract(["active", "deleting", "deleted"].some(s => s === d.lifecycleState), "bootstrap_inventory_scope");
  if (d.journal !== null) { const j = parseJournalAnchor(d.journal); requireContract(j.uid === d.uid, "bootstrap_inventory_scope"); }
  if (d.writerProtocol !== null) text(d.writerProtocol, 100);
  requireContract(d.scopeVersion === "all-user-descendants-stage4b1-v1", "bootstrap_inventory_scope");
  return d as unknown as InventoryPin;
}
function record(value: unknown, pin: InventoryPin): InventoryRecord {
  const d = object(value, ["path", "category", "exists", "fingerprint", "createdAt", "updatedAt", "issues", "links"]);
  text(d.path, 6 * 1024); text(d.category, 80);
  const path = d.path.split("/");
  requireContract(path.length % 2 === 0 && path.every(s => s.length > 0 && s !== "." && s !== "..") &&
    (d.path === `users/${pin.uid}` || d.path.startsWith(`users/${pin.uid}/`) ||
      d.path === `trainingLifecycleAuthorities/${pin.uid}` || d.path.startsWith(`trainingLifecycleAuthorities/${pin.uid}/`)), "bootstrap_inventory_scope");
  requireContract(typeof d.exists === "boolean" && Array.isArray(d.issues) && d.issues.length <= 20 && Array.isArray(d.links) && d.links.length <= 4,
    "bootstrap_inventory_record");
  for (const issue of d.issues) text(issue, 100);
  if (d.exists) {
    requireContract(typeof d.fingerprint === "string" && /^v2:[a-f0-9]{64}$/.test(d.fingerprint), "bootstrap_inventory_record");
    parseReadTime(d.createdAt); parseReadTime(d.updatedAt);
  } else requireContract(d.fingerprint === null && d.createdAt === null && d.updatedAt === null, "bootstrap_inventory_record");
  for (const link of d.links) {
    const l = object(link, ["kind", "recordId", "target", "fingerprint"]); text(l.kind, 40); text(l.recordId, 1024);
    if (l.target !== null) text(l.target, 1024); if (l.fingerprint !== null) text(l.fingerprint, 200);
  }
  return d as unknown as InventoryRecord;
}
export function inventoryRecord(value: unknown, pin: InventoryPin): InventoryRecord { return record(value, parseInventoryPin(pin)); }
export function createBootstrapInventoryPage(pinValue: InventoryPin, index: number, previousHash: string | null, records: readonly InventoryRecord[]): BootstrapInventoryPage {
  const pin = parseInventoryPin(pinValue); integer(index); if (previousHash !== null) hash(previousHash);
  const values = inventoryArray(records, BOOTSTRAP_LIMITS.pageRecords);
  const body = { schemaVersion: 1, pin, index, previousHash, records: values.map(r => record(r, pin)) };
  return parseBootstrapInventoryPage({ ...body, pageHash: typedHash("bootstrap-inventory-page-stage4b1-v1", body) });
}
export function parseBootstrapInventoryPage(value: unknown): BootstrapInventoryPage {
  const d = object(value, ["schemaVersion", "pin", "index", "previousHash", "records", "pageHash"]), pin = parseInventoryPin(d.pin);
  integer(d.index); hash(d.pageHash); if (d.previousHash !== null) hash(d.previousHash);
  requireContract(d.schemaVersion === 1 && Array.isArray(d.records) && d.records.length >= 1 && d.records.length <= BOOTSTRAP_LIMITS.pageRecords, "bootstrap_inventory_page");
  let previous = "";
  for (const r of d.records) { const row = record(r, pin); requireContract(row.path > previous, "bootstrap_inventory_duplicate"); previous = row.path; }
  const { pageHash, ...body } = d;
  requireContract(pageHash === typedHash("bootstrap-inventory-page-stage4b1-v1", body), "bootstrap_inventory_hash");
  return bounded(d, BOOTSTRAP_LIMITS.pageBytes) as unknown as BootstrapInventoryPage;
}
export function createBootstrapInventory(pinValue: InventoryPin, rows: readonly InventoryRecord[]) {
  const pin = parseInventoryPin(pinValue), values = inventoryArray(rows, BOOTSTRAP_LIMITS.records);
  const records = values.map(r => record(r, pin)).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const pages: BootstrapInventoryPage[] = [];
  for (let i = 0; i < records.length; i += BOOTSTRAP_LIMITS.pageRecords)
    pages.push(createBootstrapInventoryPage(pin, pages.length, pages.at(-1)?.pageHash ?? null, records.slice(i, i + BOOTSTRAP_LIMITS.pageRecords)));
  const body = { schemaVersion: 1, pin, pageCount: pages.length, recordCount: records.length,
    inventoryDigest: pages.at(-1)?.pageHash ?? typedHash("bootstrap-empty-inventory-stage4b1-v1", pin) };
  const manifest = copyJSON({ ...body, manifestHash: typedHash("bootstrap-inventory-manifest-stage4b1-v1", body) }) as unknown as BootstrapInventoryManifest;
  verifyBootstrapInventory(manifest, pages); return Object.freeze({ manifest, pages: Object.freeze(pages) });
}
/** Structural consistency only. A caller-created list NEVER proves completeness. */
export function verifyBootstrapInventory(manifestValue: unknown, pageValues: readonly unknown[]) {
  const d = object(manifestValue, ["schemaVersion", "pin", "pageCount", "recordCount", "inventoryDigest", "manifestHash"]), pin = parseInventoryPin(d.pin);
  integer(d.pageCount); integer(d.recordCount); hash(d.inventoryDigest); hash(d.manifestHash);
  const pages = inventoryArray(pageValues, BOOTSTRAP_LIMITS.records);
  requireContract(d.schemaVersion === 1 && d.recordCount <= BOOTSTRAP_LIMITS.records && d.pageCount <= BOOTSTRAP_LIMITS.records &&
    pages.length === d.pageCount, "bootstrap_inventory_incomplete");
  const { manifestHash, ...body } = d;
  requireContract(manifestHash === typedHash("bootstrap-inventory-manifest-stage4b1-v1", body), "bootstrap_inventory_hash");
  let previous: string | null = null, lastPath = "", count = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = parseBootstrapInventoryPage(pages[i]);
    requireContract(p.index === i && p.previousHash === previous && typedHash("bootstrap-pin-stage4b1-v1", p.pin) === typedHash("bootstrap-pin-stage4b1-v1", pin), "bootstrap_inventory_incomplete");
    for (const r of p.records) { requireContract(r.path > lastPath, "bootstrap_inventory_duplicate"); lastPath = r.path; count++; }
    previous = p.pageHash;
  }
  requireContract(count === d.recordCount && (previous ?? typedHash("bootstrap-empty-inventory-stage4b1-v1", pin)) === d.inventoryDigest, "bootstrap_inventory_incomplete");
  return Object.freeze({ consistency: "STRUCTURALLY_VALID" as const, authority: "NOT VERIFIED" as const,
    publicationEligible: false as const, manifestBytes: jsonBytes(d) });
}
