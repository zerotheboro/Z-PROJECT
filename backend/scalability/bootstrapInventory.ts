import { Timestamp } from "firebase-admin/firestore";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { fingerprintFirestoreSource, assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { completionSourceIdentity, legacyAssessmentFingerprint, rebuildSourceIndex, nativeCompletionIdentity } from "../trainingCompletion";
import { digest } from "../trainingCompletionContract";
import { assertCompletedSessionEvidence } from "../../src/quiz/learningEvidence";
import { adaptLegacyAutomaticAssessment } from "../../src/quiz/legacyAssessmentEvidence";
import { inventorySourceReference } from "./inventory";
import { parseJournalEntry } from "./journal";
import { parseAcceptanceBatch } from "./acceptanceBatches";
import { parseAcceptanceReceipt } from "./receipts";
import { parseAccountRevisionControl } from "./controls";
import { parseGenerationPage, parseGenerationManifest, parseManifestPart } from "./generations";
import { SOURCE_CATALOG, LIFECYCLE_COLLECTION } from "./authorityContracts";
import { BOOTSTRAP_LIMITS, createBootstrapInventory, inventoryRecord } from "./bootstrapContracts";
import type { InventoryPin, InventoryRecord } from "./bootstrapContracts";
import type { BootstrapTransport } from "./bootstrapTransport";
import { canonicalJSON, object, requireContract, text, typedHash } from "./values";

export const metadataTime = (value: Timestamp) => ({ seconds: value.seconds, nanoseconds: value.nanoseconds });
const safeText = (value: unknown, max = 1024): value is string => { try { text(value, max); return true; } catch { return false; } };
/** Path identity, not a field supplied by the student, selects the namespace. */
export function classifyInventoryPath(uid: string, path: string): string {
  if (path === `users/${uid}`) return "root-profile-and-user-fields";
  if (path.startsWith(`${LIFECYCLE_COLLECTION}/${uid}`)) return "lifecycle-coordination";
  const p = path.split("/").slice(2), top = p[0];
  if (top === "trainingUsage" && p.length === 4 && p[2] === "reservations") return "preserved-reservation";
  if (top === "learningProfiles") {
    if (p[1] === "journalControl" && p[2] === "journal") return "acceptance-journal";
    if (p[1] === "journalControl" && p[2] === "acceptanceBatches") return "acceptance-batch";
    if (p[1] === "journalControl" && p[2] === "completionArchives") return "completion-archive-and-receipt";
    if (p[1]?.startsWith("shadow-") && p[2] === "artifacts") return "generation-artifact-and-manifest";
    if (p[1] === "authorityStage4a" && p[2] === "probes") return "quarantined-nonperformance-probe";
    if (p.length === 2) return "profile-and-generation-control";
    return "unsupported-profile-descendant";
  }
  if (p.length !== 2) return "unsupported-descendant";
  return ({ learningEvidence: "native-or-frozen-performance", assessments: "legacy-assessment", quizAttempts: "legacy-unclassified-quiz",
    learningEvidenceIdentityEvents: "identity-event", learningEvidenceSourceIndex: "source-index", trainingProgress: "unfinished-draft",
    trainingActivity: "activity-history", trainingStats: "streak-summary", aiRecommendations: "selection-context-only",
    trainingUsage: "preserved-quota", trainingReservations: "preserved-reservation", entitlements: "preserved-entitlement" } as Record<string, string>)[top] ??
    (top === "trainingUsage" && p[2] === "reservations" ? "preserved-reservation" : "unsupported-namespace");
}
function describe(row: DocumentSnapshot, pin: InventoryPin): InventoryRecord {
  const path = row.ref.path, category = classifyInventoryPath(pin.uid, path), issues: string[] = [], links: InventoryRecord["links"][number][] = [];
  const data = row.data(), id = row.id;
  const knownEpoch = pin.lifecycleEpoch ?? pin.journal?.lifecycleEpoch ?? null;
  const link = (kind: string, recordId: unknown, target: unknown, fingerprint: unknown) => {
    if (!safeText(recordId) || target !== null && !safeText(target) || fingerprint !== null && !safeText(fingerprint, 200)) {
      issues.push("malformed-historical-identity"); return;
    }
    links.push({ kind, recordId, target, fingerprint });
  };
  if (!row.exists) issues.push("missing-parent-with-descendants");
  else {
    assertCompletionDocumentBudget(path, data);
    if (category.startsWith("unsupported")) issues.push("unsupported-source-scope");
    if (data!.uid !== undefined && data!.uid !== pin.uid || data!.owner?.kind === "user" && data!.owner.uid !== pin.uid)
      issues.push("source-owner-disagreement");
    try {
      if (category === "native-or-frozen-performance") {
        if (knownEpoch !== null) inventorySourceReference({ schemaVersion: 1, uid: pin.uid, lifecycleEpoch: knownEpoch,
          namespace: "learningEvidence", id, payload: data }, { uid: pin.uid, lifecycleEpoch: knownEpoch, revision: 0, headHash: null });
        else {
          // Existing v1 evidence has no account lifecycle epoch. Validate its
          // actual legacy contracts without inventing an epoch-1 source wrapper.
          requireContract(data!.schemaVersion === 1, "evidence_version"); assertCompletedSessionEvidence(data!.evidence);
          const evidence = data!.evidence;
          requireContract(evidence.owner.kind === "user" && evidence.owner.uid === pin.uid && id ===
            (evidence.provenance.kind === "native" ? nativeCompletionIdentity(evidence.sessionId) : `legacy-${digest(evidence.provenance.recordId)}`), "evidence_identity");
          if (evidence.provenance.kind === "native") {
            const receipt = parseAcceptanceReceipt(data!.receipt);
            requireContract(receipt.evidenceId === id && receipt.sessionId === evidence.sessionId && receipt.mode === evidence.mode &&
              receipt.requestHash === data!.requestHash, "evidence_receipt");
          }
          issues.push("historical-lifecycle-epoch-unknown");
        }
        if (data!.evidence.provenance.kind === "native") link("native-session", data!.evidence.sessionId, path, data!.requestHash);
        else { link("unresolved-legacy-source", data!.evidence.provenance.recordId, path, null); issues.push("historical-linkage-unresolved"); }
      } else if (category === "legacy-assessment") {
        const result = adaptLegacyAutomaticAssessment({ ownerUid: pin.uid, assessmentId: id, assessment: data });
        if (!result.valid) issues.push("malformed-legacy-assessment");
        else { issues.push(...result.warnings.map(() => "historical-metadata-unknown").slice(0, 1)); issues.push("historical-linkage-unresolved"); }
        link("legacy-source", id, null, legacyAssessmentFingerprint(data!));
      } else if (category === "identity-event" || category === "source-index") {
        const d = data!;
        if (category === "identity-event") {
          if (knownEpoch !== null) inventorySourceReference({ schemaVersion: 1, uid: pin.uid, lifecycleEpoch: knownEpoch,
            namespace: "learningEvidenceIdentityEvents", id, payload: d }, { uid: pin.uid, lifecycleEpoch: knownEpoch, revision: 0, headHash: null });
          else {
            const event = object(d, ["schemaVersion", "sourceKind", "recordId", "sourceHash", "fromEvidenceId", "toEvidenceId", "fingerprint"]);
            requireContract(event.schemaVersion === 1 && (event.sourceKind === "native" || event.sourceKind === "legacy") && safeText(event.recordId) &&
              event.sourceHash === completionSourceIdentity(event.sourceKind, event.recordId) && id === digest(event) &&
              typeof event.fingerprint === "string" && (event.sourceKind === "native" ? /^[a-f0-9]{64}$/ : /^(?:v2:)?[a-f0-9]{64}$/).test(event.fingerprint) &&
              safeText(event.toEvidenceId) && (event.fromEvidenceId === null || safeText(event.fromEvidenceId)), "identity_event_invalid");
          }
        }
        else requireContract((d.sourceKind === "native" || d.sourceKind === "legacy") && safeText(d.recordId) &&
          id === completionSourceIdentity(d.sourceKind, d.recordId) && safeText(d.decisionId), "invalid_source_index");
        if (d.sourceKind === "legacy" && typeof d.fingerprint === "string" && !d.fingerprint.startsWith("v2:")) issues.push("pre-v2-fingerprint-unverified");
        link(d.sourceKind === "native" ? "native-claim" : "legacy-claim", d.recordId, d.toEvidenceId ?? d.evidenceId ?? null, d.fingerprint);
        if (category === "identity-event" && d.fromEvidenceId !== null) link("identity-predecessor", d.recordId, d.fromEvidenceId, null);
        if (category === "source-index") link("decision-reference", d.recordId, d.decisionId, null);
      } else if (category === "acceptance-journal") {
        const entry = parseJournalEntry(data); requireContract(entry.uid === pin.uid && (knownEpoch === null || entry.lifecycleEpoch === knownEpoch), "journal_scope");
        link("journal-position", String(entry.revision), entry.previousHash, entry.entryHash);
      } else if (category === "acceptance-batch") {
        const batch = parseAcceptanceBatch(data); requireContract(batch.uid === pin.uid && (knownEpoch === null || batch.lifecycleEpoch === knownEpoch), "batch_scope");
      } else if (category === "completion-archive-and-receipt") {
        const receipt = parseAcceptanceReceipt(data!.receipt);
        requireContract(data!.uid === pin.uid && data!.evidenceId === receipt.evidenceId && data!.sessionId === receipt.sessionId &&
          data!.requestHash === receipt.requestHash, "archive_identity");
        link("archive-session", receipt.sessionId, receipt.evidenceId, receipt.requestHash);
      } else if (category === "profile-and-generation-control" && id === "journalControl") {
        const c = parseAccountRevisionControl(data); requireContract(c.uid === pin.uid, "control_owner");
      } else if (category === "generation-artifact-and-manifest") {
        requireContract(data!.uid === pin.uid && data!.bodyHash === typedHash("shadow-artifact-v1", data!.body), "artifact_hash");
        if (data!.kind === "manifest") parseGenerationManifest(data!.body);
        if (data!.kind === "references") parseGenerationPage(data!.body);
        if (data!.kind === "part") parseManifestPart(data!.body);
      } else if (category === "root-profile-and-user-fields" && data!.learningProfile != null && !safeText(data!.latestAssessmentId))
        issues.push("unlinked-root-profile");
    } catch { issues.push("malformed-or-conflicting-source"); }
  }
  return inventoryRecord({ path, category, exists: row.exists, fingerprint: row.exists ? fingerprintFirestoreSource(data) : null,
    createdAt: row.exists ? metadataTime(row.createTime!) : null, updatedAt: row.exists ? metadataTime(row.updateTime!) : null,
    issues: [...new Set(issues)].sort(), links }, pin);
}
export type InventoryMetrics = { documentReads: number; listingCalls: number; readTransactions: number; writes: number;
  maximumPageRecords: number; maximumTransactionReads: number; maximumTransactionBytes: number; maximumTransactionWrites: number;
  maximumDocumentBytes: number; snapshotMs: number; peakRssBytes: number };
export function newInventoryMetrics(): InventoryMetrics { return { documentReads: 0, listingCalls: 0, readTransactions: 0, writes: 0,
  maximumPageRecords: 0, maximumTransactionReads: 0, maximumTransactionBytes: 0, maximumTransactionWrites: 0,
  maximumDocumentBytes: 0, snapshotMs: 0, peakRssBytes: 0 }; }

/** Exact snapshot enumeration, including missing ancestors. Bounded SDK metadata
 * pages AND document reads use the SAME genuine server readTime. No list-all SDK
 * helper, unpinned fallback, growing document, or silent truncation. */
export async function readBootstrapInventory(transport: BootstrapTransport, pin: InventoryPin, metrics: InventoryMetrics,
  onPage?: (paths: readonly string[]) => Promise<void>) {
  const start = performance.now(), at = new Timestamp(pin.readTime.seconds, pin.readTime.nanoseconds), db = () => transport.getFirestore();
  const rows: InventoryRecord[] = [], seen = new Set<string>(), queue: { path: string; depth: number }[] = [];
  // Per-traversal budget; cumulative public telemetry must not decide validity.
  // The synchronous increment is shared by this traversal's concurrent branches.
  let listingCalls = 0;
  async function capture(paths: string[], depth: number) {
    requireContract(paths.length <= BOOTSTRAP_LIMITS.pageRecords && depth <= BOOTSTRAP_LIMITS.depth && seen.size + paths.length <= BOOTSTRAP_LIMITS.records,
      "bootstrap_inventory_capacity");
    for (const path of paths) { requireContract(!seen.has(path), "bootstrap_inventory_duplicate"); seen.add(path); }
    const saved = await db().runTransaction(tx => tx.getAll(...paths.map(path => db().doc(path))), { readOnly: true, readTime: at });
    metrics.readTransactions++; metrics.documentReads += saved.length; metrics.maximumTransactionReads = Math.max(metrics.maximumTransactionReads, saved.length);
    for (const row of saved) {
      if (row.exists) metrics.maximumDocumentBytes = Math.max(metrics.maximumDocumentBytes, assertCompletionDocumentBudget(row.ref.path, row.data()));
      rows.push(describe(row, pin)); queue.push({ path: row.ref.path, depth });
    }
    metrics.peakRssBytes = Math.max(metrics.peakRssBytes, process.memoryUsage().rss);
    await onPage?.(paths);
  }
  async function pages(kind: "collections" | "documents", parent: string, collection: string | null, visit: (paths: string[]) => Promise<void>) {
    const tokens = new Set<string>(); let token: string | null = null;
    do {
      metrics.listingCalls++;
      requireContract(++listingCalls <= BOOTSTRAP_LIMITS.listingCalls, "bootstrap_listing_capacity");
      const page = await transport.list(kind, parent, collection, at, token);
      metrics.maximumPageRecords = Math.max(metrics.maximumPageRecords, page.rows.length);
      await visit(page.rows);
      token = page.next;
      if (token !== null) { requireContract(!tokens.has(token), "bootstrap_listing_cursor_repeated"); tokens.add(token); }
    } while (token !== null);
  }
  await capture([`users/${pin.uid}`, `${LIFECYCLE_COLLECTION}/${pin.uid}`], 0);
  while (queue.length) {
    // Fixed concurrency: do not recursively multiply promises by tree depth.
    const batch = queue.splice(0, 8);
    await Promise.all(batch.map(async ({ path, depth }) => pages("collections", path, null, async names => {
      for (const name of names) await pages("documents", path, name, async paths => { if (paths.length) await capture(paths, depth + 1); });
    })));
  }
  metrics.snapshotMs += Math.round(performance.now() - start);
  return createBootstrapInventory(pin, rows);
}

/** Read-only reconciliation PLAN. No synthesized aliases, aggregates, subjective
 * ranking or raw Reflection is included; no source is rewritten or rehashed. */
export function reconciliationPlan(records: readonly InventoryRecord[], pin?: InventoryPin) {
  records = [...records].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const existing = new Set(records.filter(r => r.exists).map(r => r.path)), warnings = new Set<string>(), facts: { kind: string; sources: string[] }[] = [];
  const claims = new Map<string, Set<string>>(), natives = new Map<string, string[]>();
  const decisions: { id: string; data: Record<string, unknown> }[] = [], journal: { revision: number; previous: string | null; hash: string | null }[] = [];
  for (const row of records) {
    row.issues.forEach(i => warnings.add(i));
    for (const l of row.links) {
      if (l.kind === "native-session") natives.set(l.recordId, [...(natives.get(l.recordId) ?? []), row.path]);
      if (l.kind.endsWith("-claim") && l.target) {
        const k = l.kind + ":" + l.recordId; claims.set(k, new Set([...(claims.get(k) ?? []), l.target]));
        const expected = `users/${row.path.split("/")[1]}/learningEvidence/${l.target}`;
        if (!existing.has(expected)) warnings.add("identity-target-missing");
      }
      if (l.kind === "decision-reference" && !existing.has(`users/${row.path.split("/")[1]}/learningEvidenceIdentityEvents/${l.target}`)) warnings.add("identity-decision-missing");
      if (l.kind === "journal-position") journal.push({ revision: Number(l.recordId), previous: l.target, hash: l.fingerprint });
      if (row.category === "identity-event" && (l.kind === "native-claim" || l.kind === "legacy-claim")) {
        const sourceKind = l.kind === "native-claim" ? "native" : "legacy";
        decisions.push({ id: row.path.split("/").at(-1)!, data: { schemaVersion: 1, sourceKind, recordId: l.recordId,
          sourceHash: completionSourceIdentity(sourceKind, l.recordId), fromEvidenceId: row.links.find(link => link.kind === "identity-predecessor")?.target ?? null,
          toEvidenceId: l.target, fingerprint: l.fingerprint } });
      }
    }
  }
  let rebuilt: ReturnType<typeof rebuildSourceIndex> | null = null;
  try { rebuilt = rebuildSourceIndex(decisions); }
  catch { warnings.add("conflicting-historical-aliases"); }
  // A valid immutable alias chain may contain multiple historical targets. Do
  // not mislabel that as a conflict; compare its terminal claim to the index.
  for (const row of records.filter(r => r.category === "source-index")) for (const l of row.links.filter(l => l.kind.endsWith("-claim"))) {
    const expected = rebuilt?.get(completionSourceIdentity(l.kind === "native-claim" ? "native" : "legacy", l.recordId));
    const decisionId = row.links.find(l => l.kind === "decision-reference")?.target;
    if (!expected || expected.evidenceId !== l.target || expected.fingerprint !== l.fingerprint || expected.decisionId !== decisionId)
      warnings.add("source-index-and-identity-chain-disagree");
  }
  // Non-event partial descriptors cannot establish a chain; do not choose one
  // of their contradictory claims either.
  if (!decisions.length) for (const targets of claims.values()) if (targets.size > 1) warnings.add("conflicting-historical-aliases");
  journal.sort((a, b) => a.revision - b.revision);
  let previous: string | null = null;
  for (const [i, entry] of journal.entries()) {
    if (entry.revision !== i + 1 || entry.previous !== previous) warnings.add("journal-prefix-gap-or-conflict");
    previous = entry.hash;
  }
  if (pin?.journal && (journal.length !== pin.journal.revision || previous !== pin.journal.headHash)) warnings.add("journal-prefix-gap-or-conflict");
  if (records.some(r => r.path.endsWith("/learningProfiles/journalControl") && r.exists) && pin && !pin.journal) warnings.add("unknown-journal-cutoff");
  for (const row of records.filter(r => r.category === "legacy-assessment" && r.exists)) {
    const id = row.path.split("/").at(-1)!;
    if (natives.has(id)) facts.push({ kind: "possible-native-legacy-duplicate-not-established", sources: [row.path, ...natives.get(id)!] });
  }
  for (const paths of natives.values()) if (paths.length > 1) warnings.add("duplicate-native-session-identity");
  return Object.freeze({ schemaVersion: 1, authority: "NOT VERIFIED" as const, migrationAuthorized: false as const,
    facts: facts.sort((a, b) => canonicalJSON(a) < canonicalJSON(b) ? -1 : 1), warnings: [...warnings].sort(),
    sourceDigest: records.reduce((digest, row) => typedHash("bootstrap-diagnostic-fold-stage4b1-v1", { digest, row }), "0".repeat(64)),
    requiredDecisions: ["approve-authenticated-historical-origin", "resolve-aliases-and-pre-v2-sources", "review-missing-and-orphan-history", "review-all-privileged-writers"] });
}
