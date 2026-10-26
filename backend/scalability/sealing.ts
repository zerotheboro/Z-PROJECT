import { Timestamp } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";
import { createStage2EmulatorTransport, assertStage2Environment } from "./acceptanceTransport";
import { createSharedWriterGuard, assertWriterGuardContext } from "./writerGuard";
import type { WriterPrincipal } from "./writerGuard";
import { parseStoredLifecycle } from "./authorityContracts";
import { BOOTSTRAP_COLLECTION, BOOTSTRAP_LIMITS, parseGenesis, parseInventoryPin, verifyBootstrapInventory, parseBootstrapInventoryPage } from "./bootstrapContracts";
import type { BootstrapInventoryManifest, BootstrapInventoryPage } from "./bootstrapContracts";
import { createBootstrapTransport } from "./bootstrapTransport";
import { metadataTime, newInventoryMetrics, readBootstrapInventory, reconciliationPlan } from "./bootstrapInventory";
import { parseAccountRevisionControl } from "./controls";
import { fingerprintFirestoreSource, assertCompletionDocumentBudget } from "../completionFirestoreValues";
import { createOriginPrototype } from "./origin";
import { createAuthorityPrototype } from "./authority";
import { SEAL_COLLECTION, SEAL_LIMITS, initialSealControl, parseSealControl, parseSealPin, makeSealHandle,
  parseSealHandle, sameSealPin, verifySealPages, verifySealInventoryPin, parseSealManifest, admissionDecision } from "./sealingContracts";
import type { SealControl, SealHandle } from "./sealingContracts";
import { canonicalJSON, jsonBytes, nextRevision, object, requireContract, text, typedHash } from "./values";

type Event = "begun" | "inventory-page" | "page-stored" | "pages-stored" | "second-pass" | "before-finalize" | "sealed";
/** Test/supervisor interruption preserves the durable lock and immutable pages. */
export class SealInterruption extends Error {}
export function assertSealEnvironment() {
  assertStage2Environment(); requireContract(process.versions.node.split(".")[0] === "24" &&
    process.env.TRAINING_SEAL_STAGE4D === "emulator-only", "seal_disabled");
  requireContract(["TRAINING_AUTHORITY_STAGE4A", "TRAINING_BOOTSTRAP_STAGE4B1", "TRAINING_ORIGIN_STAGE4B2"]
    .every(key => process.env[key] === "emulator-only"), "seal_dependencies_disabled");
}
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b);
const key = (index: number) => String(index).padStart(8, "0");
const version = (row: { updateTime?: Timestamp }) => row.updateTime ? metadataTime(row.updateTime) : null;
const pageMaximum = Math.ceil(BOOTSTRAP_LIMITS.records / BOOTSTRAP_LIMITS.pageRecords);

/** Isolated operator service; no endpoint, database/authority-provider injection,
 * source migration, admission write or publisher. Matching hashes are ONLY
 * consistency observations. The independent authority gap is never promoted. */
export function createInventorySealer(options: { onEvent?: (event: Event, handle: SealHandle) => Promise<void> } = {}) {
  assertSealEnvironment();
  const transport = createStage2EmulatorTransport(), guard = createSharedWriterGuard(transport);
  const listing = createBootstrapTransport(), origin = createOriginPrototype(), lifecycle = createAuthorityPrototype();
  const db = () => { assertSealEnvironment(); return transport.getFirestore(); };
  const metrics = newInventoryMetrics();
  const refs = (uid: string, id?: string) => {
    const control = db().doc(`${SEAL_COLLECTION}/${uid}`), attempt = control.collection("attempts").doc(id ?? "none");
    return { control, attempt, pages: attempt.collection("pages") };
  };
  const write = (tx: Transaction, ref: ReturnType<typeof refs>["control"], data: object, create = false) => {
    assertCompletionDocumentBudget(ref.path, data); requireContract(jsonBytes(data) <= SEAL_LIMITS.transactionBytes, "seal_document_capacity");
    if (create) tx.create(ref, data); else tx.set(ref, data);
  };
  async function observeOrigin(token: string) {
    try { return (await origin.recover(token)).state; }
    catch { return "ORIGIN_UNAVAILABLE"; } // Unavailable evidence never proves origin/revocation clearance.
  }
  async function capture(tx: Transaction, principal: WriterPrincipal, control?: SealControl) {
    const result = await guard.read(tx, principal);
    requireContract(result.context.protection === "protected", "seal_protected_owner_required");
    requireContract(result.root.data()!.learningProfile == null && result.root.data()!.latestAssessmentId == null &&
      result.root.data()!.learningProfileUpdatedAt == null, "seal_unadmitted_history");
    if (control) assertWriterGuardContext(result.context, control.context);
    const life = parseStoredLifecycle(result.life.data());
    const [genesis, journal] = await tx.getAll(db().doc(`${BOOTSTRAP_COLLECTION}/${principal.uid}`),
      result.root.ref.collection("learningProfiles").doc("journalControl"));
    let genesisHash: string | null = null;
    if (genesis.exists) {
      const g = parseGenesis(genesis.data());
      requireContract(g.uid === principal.uid && g.rootBinding === life.rootBinding && g.lifecycleEpoch === life.lifecycleEpoch &&
        genesis.createTime!.isEqual(result.root.createTime!), "seal_origin_mismatch"); genesisHash = g.genesisHash;
    }
    const j = journal.exists ? parseAccountRevisionControl(journal.data()) : null;
    if (j) requireContract(j.uid === principal.uid && j.lifecycleEpoch === life.lifecycleEpoch && j.lifecycle === "active", "seal_journal_invalid");
    const pin = parseSealPin({ context: result.context, lifecycleRevision: life.revision, lifecycleHead: life.headHash, genesisHash,
      journalCutoff: j ? { uid: j.uid, lifecycleEpoch: j.lifecycleEpoch, revision: j.headRevision, headHash: j.headHash } : null,
      sourceRevision: control?.sourceRevision ?? 0, revocationFence: control?.revocationFence ?? 1,
      participantsHash: initialSealControl(result.context).participantsHash });
    const inventoryPin = parseInventoryPin({ uid: principal.uid, lifecycleEpoch: life.lifecycleEpoch, lifecycleRevision: life.revision,
      lifecycleHead: life.headHash, lifecycleFence: life.fence, writerProtocol: life.writerProtocol, genesisHash,
      lifecycleState: life.state, journal: pin.journalCutoff, writerFenceHash: fingerprintFirestoreSource(result.fence.data()),
      rootCreatedAt: metadataTime(result.root.createTime!), scopeVersion: "all-user-descendants-stage4b1-v1", readTime: metadataTime(result.root.readTime) });
    return { pin, inventoryPin, result };
  }
  function attemptData(value: unknown) {
    const d = object(value, ["handle", "inventoryPin", "phase", "manifest"]);
    const handle = parseSealHandle(d.handle), inventoryPin = parseInventoryPin(d.inventoryPin);
    verifySealInventoryPin(handle, inventoryPin);
    requireContract(["sealing", "sealed"].some(p => p === d.phase), "seal_attempt_invalid");
    requireContract(d.phase === "sealed" ? d.manifest !== null : d.manifest === null, "seal_attempt_manifest_invalid");
    const manifest = d.phase === "sealed" ? parseSealManifest(d.manifest, handle, inventoryPin) : null;
    return { handle, inventoryPin, phase: d.phase, manifest };
  }
  async function current(tx: Transaction, principal: WriterPrincipal, handle: SealHandle) {
    requireContract(principal.uid === handle.uid, "seal_owner_mismatch");
    const r = refs(principal.uid, handle.sealId), [saved, savedAttempt] = await tx.getAll(r.control, r.attempt);
    const control = parseSealControl(saved.data()), attempt = attemptData(savedAttempt.data());
    requireContract(same(attempt.handle, handle) && control.sealId === handle.sealId &&
      (control.phase === "sealing" || control.phase === "sealed"), "seal_stale_attempt");
    requireContract(control.phase === attempt.phase, "seal_attempt_phase_mismatch");
    const captured = await capture(tx, principal, control);
    requireContract(sameSealPin(captured.pin, handle.pin), "seal_cutoff_changed");
    return { r, control, attempt, captured };
  }
  function clean(inventory: Awaited<ReturnType<typeof readBootstrapInventory>>) {
    verifyBootstrapInventory(inventory.manifest, inventory.pages);
    const records = inventory.pages.flatMap(p => p.records);
    // Stage 4A deliberately writes nested diagnostic probes without a parent
    // document. Preserve that absent-container fact in the immutable manifest.
    // Only this exact container is reviewed here, after actual ledger validation;
    // missing performance/unknown parents retain their blocking issues.
    const reviewed = records.map(row => row.path === `users/${inventory.manifest.pin.uid}/learningProfiles/authorityStage4a` &&
      !row.exists && same(row.issues, ["missing-parent-with-descendants"]) ? { ...row, issues: [] } : row);
    const plan = reconciliationPlan(reviewed, inventory.manifest.pin);
    requireContract(plan.warnings.length === 0, "seal_history_unresolved");
    for (const row of records) {
      // Protected Training is NOT admitted yet. Existing performance/aliases/
      // archives cannot be attributed to this coordinated writer protocol.
      requireContract(!row.exists || !["native-or-frozen-performance", "legacy-assessment", "legacy-unclassified-quiz", "identity-event", "source-index",
        "completion-archive-and-receipt", "acceptance-journal", "acceptance-batch"].includes(row.category), "seal_unadmitted_history");
      requireContract(!row.category.startsWith("unsupported"), "seal_unknown_source");
      if (row.exists && row.category === "profile-and-generation-control") requireContract(row.path.endsWith("/learningProfiles/cumulative"), "seal_unknown_source");
    }
    return records;
  }
  async function invalidate(principal: WriterPrincipal, handle: SealHandle, revoke = false) {
    await guard.transaction(async tx => {
      const r = refs(principal.uid), row = await tx.get(r.control);
      if (!row.exists) return; const c = parseSealControl(row.data());
      requireContract(principal.uid === handle.uid, "seal_owner_mismatch");
      if (c.phase === "revoked" || c.sealId !== handle.sealId || c.phase === "invalidated" && !revoke) return;
      write(tx, r.control, parseSealControl({ ...c, revision: nextRevision(c.revision), phase: revoke ? "revoked" : "invalidated",
        revocationFence: revoke ? nextRevision(c.revocationFence) : c.revocationFence }));
    });
  }
  async function begin(token: string, input: unknown) {
    const request = object(input, ["requestId"]); text(request.requestId, 100);
    requireContract(/^[A-Za-z0-9_-]{8,100}$/.test(request.requestId), "seal_request_invalid");
    const principal = await guard.authenticate(token);
    const originState = await observeOrigin(token); requireContract(originState !== "ORIGIN_REVOKED", "seal_origin_revoked");
    const handle = await guard.transaction(async tx => {
      const r = refs(principal.uid), saved = await tx.get(r.control);
      const c = saved.exists ? parseSealControl(saved.data()) : undefined, observed = await capture(tx, principal, c);
      const control = c ?? initialSealControl(observed.result.context);
      requireContract(control.phase !== "revoked" && control.phase !== "invalidated", "seal_control_closed");
      const h = makeSealHandle(request.requestId as string, observed.pin), target = refs(principal.uid, h.sealId);
      // Stable request index makes changed-cutoff retries conflicting, rather
      // than creating a second attempt with a new pin under the same request.
      const requestRef = r.control.collection("requests").doc(typedHash("seal-request-stage4d-v1", request));
      const [existing, priorRequest] = await tx.getAll(target.attempt, requestRef);
      if (priorRequest.exists) requireContract(priorRequest.data()!.sealId === h.sealId, "seal_request_conflict");
      if (existing.exists) { const old = attemptData(existing.data()); requireContract(same(old.handle, h) && control.sealId === h.sealId &&
        (control.phase === "sealing" || control.phase === "sealed"), "seal_request_conflict");
        requireContract(control.phase === old.phase, "seal_attempt_phase_mismatch"); return old.handle; }
      requireContract(control.phase === "open" || control.phase === "sealed", "seal_busy");
      requireContract(control.attemptCount < SEAL_LIMITS.attempts, "seal_attempt_capacity");
      write(tx, target.attempt, { handle: h, inventoryPin: observed.inventoryPin, phase: "sealing", manifest: null }, true);
      write(tx, requestRef, { schemaVersion: 1, requestId: request.requestId, sealId: h.sealId }, true);
      write(tx, r.control, parseSealControl({ ...control, revision: nextRevision(control.revision), attemptCount: control.attemptCount + 1,
        phase: "sealing", sealId: h.sealId })); return h;
    });
    await options.onEvent?.("begun", handle); return handle;
  }
  async function run(token: string, handleValue: unknown) {
    const handle = parseSealHandle(handleValue), principal = await guard.authenticate(token);
    requireContract(principal.uid === handle.uid, "seal_owner_mismatch");
    try {
      const start = await guard.transaction(tx => current(tx, principal, handle), { readOnly: true });
      const ledger = await lifecycle.read(token);
      requireContract(ledger.revision === handle.pin.lifecycleRevision && ledger.headHash === handle.pin.lifecycleHead, "seal_cutoff_changed");
      const originState = await observeOrigin(token);
      if (originState === "ORIGIN_REVOKED") { await invalidate(principal, handle, true); requireContract(false, "seal_origin_revoked"); }
      const first = await readBootstrapInventory(listing, start.attempt.inventoryPin, metrics, () => options.onEvent?.("inventory-page", handle) ?? Promise.resolve());
      const records = clean(first); verifySealPages(handle, first.manifest, first.pages);
      for (const page of first.pages) {
        await guard.transaction(async tx => {
          const now = await current(tx, principal, handle), ref = now.r.pages.doc(key(page.index)), old = await tx.get(ref);
          if (old.exists) requireContract(same(parseBootstrapInventoryPage(old.data()), page), "seal_page_changed");
          else { requireContract(now.control.phase === "sealing", "seal_page_missing"); write(tx, ref, page, true); }
        });
        await options.onEvent?.("page-stored", handle);
      }
      await options.onEvent?.("pages-stored", handle);
      const next = await guard.transaction(tx => current(tx, principal, handle), { readOnly: true });
      const second = await readBootstrapInventory(listing, next.captured.inventoryPin, metrics); const observed = clean(second);
      requireContract(records.length === observed.length && records.every((row, index) => same(row, observed[index])), "seal_sources_changed");
      const checkedLedger = await lifecycle.read(token);
      requireContract(checkedLedger.revision === handle.pin.lifecycleRevision && checkedLedger.headHash === handle.pin.lifecycleHead, "seal_cutoff_changed");
      await options.onEvent?.("second-pass", handle);
      const stored: BootstrapInventoryPage[] = [], versions: unknown[] = [];
      for (let index = 0; index < first.pages.length; index++) {
        const row = await guard.transaction(async tx => {
          const now = await current(tx, principal, handle), saved = await tx.get(now.r.pages.doc(key(index)));
          requireContract(saved.exists, "seal_page_missing"); return { page: parseBootstrapInventoryPage(saved.data()), version: version(saved) };
        }, { readOnly: true });
        stored.push(row.page); versions.push(row.version);
      }
      verifySealPages(handle, first.manifest, stored);
      if (await observeOrigin(token) === "ORIGIN_REVOKED") { await invalidate(principal, handle, true); requireContract(false, "seal_origin_revoked"); }
      await options.onEvent?.("before-finalize", handle);
      const decision = await guard.transaction(async tx => {
        const now = await current(tx, principal, handle);
        const names = await tx.get(now.r.pages.orderBy("__name__").select().limit(pageMaximum + 1));
        requireContract(names.size === stored.length && names.docs.every((d, index) => d.id === key(index) && same(version(d), versions[index])), "seal_pages_changed");
        if (now.control.phase === "sealed") requireContract(same(now.attempt.manifest, first.manifest), "seal_manifest_changed");
        else {
          write(tx, now.r.attempt, { ...now.attempt, phase: "sealed", manifest: first.manifest });
          write(tx, now.r.control, parseSealControl({ ...now.control, revision: nextRevision(now.control.revision), phase: "sealed" }));
        }
        return Object.freeze({ handle, manifest: first.manifest, consistency: "COORDINATED_SNAPSHOT_SEALED" as const,
          inventoryAuthority: "NOT VERIFIED" as const, privilegedMutationGap: true as const,
          ...admissionDecision({ lifecycle: true, inventory: true, coordination: true, revocationClear: false, origin: originState }) });
      });
      await options.onEvent?.("sealed", handle); return decision;
    } catch (error) {
      // Network uncertainty and explicit interruptions retain the checkpoint.
      // Integrity failures close this attempt; no pages or source evidence are deleted.
      if (!(error instanceof SealInterruption) && error && typeof error === "object" && "code" in error &&
        typeof error.code === "string" && !/^(unavailable|deadline|14|4)$/.test(error.code)) await invalidate(principal, handle);
      throw error;
    }
  }
  return Object.freeze({ begin, run, metrics,
    async check(token: string, value: unknown) { return run(token, value); }, // Revalidate sources, never trust stored sealed=true.
    async cancel(token: string, value: unknown) {
      const handle = parseSealHandle(value), principal = await guard.authenticate(token); requireContract(principal.uid === handle.uid, "seal_owner_mismatch");
      return guard.transaction(async tx => {
        const r = refs(principal.uid), row = await tx.get(r.control), c = parseSealControl(row.data()); await capture(tx, principal, c);
        requireContract(c.sealId === handle.sealId && c.phase !== "revoked", "seal_stale_attempt");
        const next = parseSealControl({ ...c, phase: "open", sealId: null, revision: nextRevision(c.revision), sourceRevision: nextRevision(c.sourceRevision) });
        write(tx, r.control, next); return next;
      });
    },
    async revoke(token: string, value: unknown) {
      const handle = parseSealHandle(value), principal = await guard.authenticate(token); requireContract(principal.uid === handle.uid, "seal_owner_mismatch");
      return guard.transaction(async tx => {
        const r = refs(principal.uid), saved = await tx.get(r.control), c = parseSealControl(saved.data());
        assertWriterGuardContext(c.context, handle.pin.context); await capture(tx, principal, c);
        if (c.phase === "revoked") return c;
        const next = parseSealControl({ ...c, phase: "revoked", revision: nextRevision(c.revision), revocationFence: nextRevision(c.revocationFence) });
        write(tx, r.control, next); return next;
      });
    },
    async close() { await lifecycle.close(); await origin.close(); await listing.close(); await transport.close(); }
  });
}
