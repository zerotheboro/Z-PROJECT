# Scalable Learning Profile — Stage 1 offline contracts

Status: **offline foundation only**. No active endpoint, persistence service,
frontend, reader, outbox, rules, scoring, quota or worker imports these modules.
Nothing here authorizes a write or activates production completion. The existing
Phase 2A limits remain in effect. Contract tests do not establish 100/500/1,000
session scalability, Firestore throughput, or production readiness.

## Files and versions

`backend/scalability/values.ts` provides strict JSON copying, deterministic typed
SHA-256 inputs, UTF-8 budgets and safe integer revisions. `receipts.ts` defines
the v1/v2 union. `journal.ts` defines the append-only acceptance/identity/import
journal. `controls.ts` defines lifecycle, revision, publication and job state.
`generations.ts` defines bounded reference pages and two-level manifests.
`references.ts` validates reference identities; `inventory.ts` derives replay
proofs and explicitly separates consistency from unavailable authority.

New journal/control/checkpoint/page/manifest formats start at `schemaVersion: 1`;
these are new namespaces/contracts, **not** replacements for Phase 2A's existing
`persistenceVersion: 1` coordinator or Phase 1 evidence v1/profile v2. Receipt v2
is an independent wire version. Unknown versions and extra/missing fields fail
closed. Semantic aggregation and execution versions are separately pinned.

## Receipts and exact retry compatibility

- Existing receipt **v1** stays `status: "completed"`, with its original
  `profileRevision`, `recordedAt`, compatibility-write results and request hash.
  Do not recast that revision as journal order. Do not rewrite stored receipts.
  Validation copies/freezes without changing JSON values/property order.
- New receipt **v2** is `status: "accepted"`, with `acceptedRevision` and
  `lifecycleEpoch`, plus the same session/mode/evidence/request-hash/recorded-time
  and legacy-write fields. It deliberately has **no** `profileRevision`,
  `published` flag or promise that aggregation is current.
- The independent published status identifies generation ID, pinned journal
  revision/hash, accepted-native count, manifest hash and both algorithm versions.
  Journal lag and newly accepted completions pending incorporation are distinct.
  Neither is necessarily the increase in canonical sessions after alias merging.
- `requireIdenticalReceipt` validates and returns the stored version unchanged
  when session/mode/evidence/request hash agree. Conflicts fail. Future acceptance
  must read the original immutable receipt before history/capacity/quota checks.
  This helper neither allocates a revision nor looks up a reservation.

The frozen completion request remains **v1**, and its current
`training-complete-v1` request hash and native evidence ID algorithm must remain
unchanged. New typed hashes are domain-specific protocols, **not replacements**
for existing request, source, decision or evidence identity hashes.

## Journal contract and ordering

Each entry binds `uid`, `lifecycleEpoch`, positive safe-integer `revision`, canonical
`entryId`, previous hash, canonical UTC ingestion time, event and entry hash.
The first entry has revision 1 and null predecessor; an explicit revision-0 anchor
has null head. Entry ID is an owner/epoch-scoped digest plus padded revision.

Event variants:

1. `session-accepted`: v2 receipt and immutable evidence hash. Receipt epoch,
   acceptance revision and ingestion time must match the enclosing entry.
2. `identity-decided`: existing decision ID, source kind/record, old/new evidence
   references, fingerprint proof and explicit established/unresolved linkage.
3. `historical-imported`: original source identity, immutable legacy evidence
   reference, nullable established session linkage/time and fingerprint proof.

Proofs distinguish typed legacy-source `v2`, native `request-v1`, and
**`pre-v2-unverified`**. Native and legacy proof protocols cannot be interchanged.
The unverified label does not upgrade an old fingerprint or assert that mutable
historical data matches its original.
Unresolved identity cannot be converted into a native alias. Missing/ambiguous
historical timing must remain null through the existing legacy adapter.

`verifyJournalContinuity` checks an explicit start anchor AND expected end pin,
sorts by numeric revision, verifies every entry/predecessor, and rejects gaps,
duplicates, truncation, wrong owners/epochs/hashes and repeated session acceptance,
evidence acceptance, decision IDs or imported source IDs within the interval.
An empty interval is valid only when both pins match. Its uniqueness guarantee is
explicitly **interval-only**: the future transaction's stable session document
must prevent a duplicate against all earlier intervals. It does not establish
source existence or validate historical alias proof semantics.

Accepted-native counters count `session-accepted` events since this journal's
origin, not canonical historical sessions. An approved bootstrap inventory may
reference existing v1 native evidence at revision 0 without re-accepting it or
converting its receipt. Such evidence remains in the full aggregation input.

Journal/ingestion order is never session-completion chronology. Feed only resolved
Phase 1 evidence to the existing aggregator. Keep actual observation timestamps,
within-session phase order, tied/unknown times and owner-wide content/question
exposure rules unchanged. Do not use revision, receipt time or cursor order to
declare material fresh. The journal carries no objective score, AI bonus,
Reflection or self-report arithmetic.

## Manifests, pages and verification

A generation identity hashes the owner/epoch, exact source revision/head hash,
semantic aggregation version and execution version. A root manifest names:

- That source pin and accepted-native count.
- Ordered manifest-part descriptors (hash, count and serialized byte size).
- Complete page/reference totals, bounded profile artifact hash and root hash.

Each part lists ordered page descriptors. Each page contains sorted, unique
`{namespace, id, contentHash}` references to immutable evidence, identity decisions,
or generation artifacts. `generation-artifact/profile` is required exactly once.
These are **reference pages**, not new stored student evidence or replacement
performance schemas. Artifact payloads remain subject to their separate Phase 1
and future artifact contracts, privacy checks and Firestore document budgets.

`verifyGenerationStructure` checks every part/page, count, serialized byte size,
hash, ordering and duplicate reference. `verifyGenerationManifest` additionally
compares a supplied list, for compatibility with offline structural tests only.
Neither establishes authority. **Publication no longer consumes that list.**

### Inventory replay and origin: two different guarantees

`createInventoryBootstrap` creates a commitment, NOT a trust anchor. The root
contains a revision-0 owner/epoch anchor, record count, canonical inventory digest
and bootstrap digest. `verifyInventoryProof` accepts that root, the exact bootstrap
references, a complete journal prefix through an explicit expected cutoff, and
complete immutable source documents in owner/epoch-scoped wrappers. It:

- Verifies the bootstrap digest/list, complete journal continuity and pinned head.
- Reads each bounded source defensively and rejects missing, duplicate, extra,
  substituted, incorrectly identified or cross-owner/epoch source records.
- Validates Phase 1 evidence and actual Phase 2A native/legacy evidence IDs.
  Native receipts/request hashes retain their existing versions and identities.
- Verifies acceptance receipt equality and the journal's evidence hash against
  `typedHash("inventory-source-v1", completeScopedSourceRecord)`; this commits the
  full document, including private Manual completionDetails, without scoring it.
- Verifies original decision IDs/source hashes, journal decision fields/proof
  protocols, available target evidence and non-forking identity chains.
- Retains immutable alias records as source history, not extra performance
  contributions. It performs no scoring, exposure classification or aggregation.
- Derives a proof bound to UID, epoch, source revision/head digest, bootstrap
  digests, source count, native acceptance count and canonical inventory digest.
  The deterministic digest is a sorted, domain-separated fold rather than an
  ever-growing digest-array document. The returned proof is bounded; full source
  references are an offline working set, not embedded in the stored proof.

An optional `claimedProof` must match the newly replayed proof exactly; it is
never accepted instead of replay. The proof contains references/digests, not
Reflection text or other source payloads. Unknown historical metadata remains
unknown. Existing historical-import events do not commit a full frozen-row hash;
their missing payload attestation and pre-v2 proof limitations are disclosed,
never inferred or silently upgraded.

**All Stage 1 inventory authority results are `NOT VERIFIED`.** A complete,
consistent replay has `consistency: "verified"`, but that does NOT prove where its
bootstrap or journal-head facts came from. Missing/malformed inputs have
`consistency: "not-verified"`. A caller-generated root, matching inventory, proof,
authority flag, callback or signed-looking object cannot upgrade either result.
There is deliberately no trusted-origin admission factory/provider in Stage 1.

Consequently **`profilePublicationEligibility` returns `eligible: false` for
every Stage 1 candidate**, with `inventory_authority_not_verified`. Its separate
`structurallyEligible` result describes protocol consistency only. With a replay
proof, source membership/counts must also match the manifest exactly. Thus the
original attack (omit an accepted session and change the expected list to match)
is no longer publication-eligible, even if every structural hash is recomputed.

Stage 2 must establish the following from authenticated server-side Firestore
transactions/immutable stored records, NOT from HTTP input, local storage, a
client-supplied UID, or the output of these commitment factories:

1. Verified Firebase UID; current lifecycle epoch/state and pinned journal head.
2. An approved immutable bootstrap commitment with independently established
   complete coverage; an empty bootstrap is not proof of an empty account.
3. Full journal prefix and exact immutable source paths/payloads/versions,
   including reservation-validated original acceptance and identity decisions.
4. Resolution or explicit unknown status for historical links/attestations.
5. Actual derived artifact payload hashes and semantic aggregation-oracle parity.
6. Current publication/job state, worker fence, lease, versions and checkpoints,
   rechecked atomically before writing a summary/pointer.

A separately reviewed authority-admission boundary can be designed then. It is
not implemented here and must not simply change an origin flag to VERIFIED.
No PKI, secret key, Firebase provider, worker or production publisher was added.

Bounds (canonical JSON UTF-8, including escaping, keys and envelopes):

| Item | Limit |
| --- | --- |
| Individual record / journal entry / control / job | 128 KiB |
| Reference page | 1–50 records, 256 KiB |
| Manifest part / root | 192 KiB each |
| Page descriptors per part / part descriptors per root | 128 each |
| JSON shape | depth 20, 50,000 nodes, 256 KiB raw text/key budget |

The two-level directory can describe up to 16,384 pages/819,200 references, subject
to byte limits. This is a versioned directory bound, not evidence deletion or a
claim that a builder can process that history. A future larger directory format
must be introduced before that bound, never silently truncate references. JSON
budgets do not replace Firestore's actual document/index/transaction byte checks.
Factory output is defensively copied/deep-frozen; caller-owned objects are not
mutated/frozen. Unsupported types, getters, custom prototypes, cycles, undefined,
sparse arrays, non-finite numbers and unsafe revisions are rejected.
All hashed/persisted strings and keys must contain well-formed UTF-16. Unpaired
surrogates fail before hashing, ID creation or UTF-8 measurement; valid pairs are
preserved without normalization. Page capacity checks first copy/validate a plain
envelope and actual records array, never invoke property getters, and count/measure
only the validated copy.

## Jobs, fencing and publication

Controls bind owner, lifecycle epoch, active/deleting state, journal head,
accepted-native count, optional published status and desired versions. Job state
pins a generation/source, target revision, phase, cursor, checkpoint sequence,
**persistent monotonic fencing counter**, optional lease and candidate manifest hash.
An expired/absent lease never resets the counter.

`proposeCheckpointLease` creates a pure next-token/sequence proposal after lease
expiry. `verifyCheckpointAdvance` checks the same live owner/token/pin/versions,
monotonic checkpoint/cursor/target, legal phase progression and stable manifest.
No function acquires a lock, calls a clock, starts a worker or persists anything.
Phase, namespace and cursor-stage enums are strict strings (arrays/objects are
never coerced). Within a stage, processedCount and afterKey cannot move backward.
A cursor may reset only when entering the immediately following stage, and that
entry must start at `(afterKey: null, processedCount: 0)`. A worker must checkpoint
that entry before advancing work in the new stage; it cannot skip stages.

`profilePublicationEligibility` re-verifies structural manifests and replay inputs,
requires a ready job with matching manifest, live fence/worker/checkpoint, active
epoch, desired versions and non-regressing publication. A journal-tail proof from
the candidate pin to the current head establishes ancestry and accepted-count
delta. A valid older generation may be structurally eligible while new completions
arrive; pending work remains visible. Same-pin algorithm/execution regeneration
requires desired versions. Republishing the same generation is not advancing.
Malformed/corrupt structural inputs throw; valid but ineligible state returns
explicit reasons. These checks are necessary but not sufficient: the authority
gate above remains closed, including when every structural check passes.

**Eligibility is not an atomic publish.** A later transaction must re-read and
compare the exact epoch, lifecycle, head, job fence/checkpoint and publication
pointer used by the proof; then swap verified summary/pointer/status together.
A changed head requires a new tail proof. Claim/advance writes likewise need CAS;
offline helpers cannot stop an unauthorized caller or stale database writer.

## Phase 2A / 2B / 2C compatibility gates — not implemented here

1. Preserve existing evidence, decisions, source indexes, receipts, manual
   `completionDetails`, automatic legacy snapshots/root profile and conservative
   historical timestamp policy. Native/legacy aliases require established proof;
   unknown identities remain unresolved. No automatic migration/re-fingerprinting.
2. Add a new version-gated transactional acceptor only after approval. Derive UID
   from verified auth, validate existing reservations without charging again,
   atomically append evidence/original receipt/identity decisions/journal/control/
   durable job and necessary legacy compatibility writes. Fence old writers.
3. Current Phase 2B transport, IndexedDB entry type and receipt validator accept
   **v1 only**. Before any server emits v2, add separately approved dual-version
   support, owner-fenced receipt persistence, and retain exact frozen payload/time.
   Treat v2 as durable acceptance only. Do not separately repeat the automatic
   legacy assessment write; keep activity and matching-draft cleanup idempotent.
   Preserve grandfathered legacy sessions and browser-local guests.
4. Implement durable workers, checkpoints, source verification, typed historical
   attestation, complete identity/exposure replay and full-generation oracle parity.
   AI nominations/preferences/self-reports/private Reflection stay outside
   objective performance. Manual completion details remain private immutable data.
5. Add transactional fenced publication, recovery, lifecycle/deletion races and
   generation-pinned history cursors. Update Phase 2C readers/UI to distinguish
   browser-only, server-accepted pending, published, partial and unresolved data.
6. Execute isolated Emulator concurrency/failure/capacity tests and realistic
   100/500/1,000-session benchmarks before claiming scale. Production provider,
   security-rule verification, worker hosting, retention, bootstrap/reconciliation
   and activation require separate owner approval.

No dependency or build-script change is needed: existing backend typecheck covers
these TypeScript files; Vitest discovers all three `.test.js` suites. The active
backend bundle entry remains `backend/trainingCompletion.ts` and excludes this
folder. Run the supported Node 24 runtime through `scripts/run-sanitized.mjs`.

## Repair regression commands

Run the three `backend/scalability/*.test.js` suites with the sanitized Node 24
Vitest runner. `repairFixtures.js` contains synthetic offline data only. No test
fixture, new module or repair is imported by the active backend bundle/frontend.

`repairs.emulator.mjs` uses Node's test runner, loads contracts in memory, requires
Node 24 plus exactly `demo-edulience-phase2a` / `127.0.0.1:18787`, and fails if
configuration or the Emulator is absent. Start the existing isolated launcher
with `--phase2b --serve`; run this file through the sanitized runner with only the
two fixed public Emulator variables explicitly set in its child process. It
tests valid Unicode/hash round-trips, local rejection of unpaired surrogates,
complete Manual source hashing and original v1 receipt recovery without quota
writes. Stop the local Emulators afterward. No production fallback is permitted.
