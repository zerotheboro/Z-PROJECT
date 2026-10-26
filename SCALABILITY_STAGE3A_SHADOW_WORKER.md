# Scalability Stage 3A durable shadow aggregation worker

LOCAL DEMO ONLY. This is not a publisher, migration, scheduler deployment or
production authority-admission provider. No active endpoint, frontend, outbox,
quota, scoring, billing, AI, rules or profile pointer is changed.

## Files and activation

`backend/scalability/shadowContracts.ts`, `shadowTransport.ts`, `shadowReplay.ts`,
`shadowWorker.ts` and `shadowWorkerEntry.ts` are new, isolated modules. The separate
build is `scripts/build-stage3a.mjs`, writing to the existing ignored
`dist-stage2/` directory, never the active backend bundle. `shadow.test.js` and
`shadow.emulator.mjs` contain offline and real Emulator regression tests.

Use the supported Node 24 executable through `scripts/run-sanitized.mjs`:

1. Build the existing backend and `scripts/build-stage3a.mjs`.
2. Start the existing isolated `run-completion-emulator.mjs --phase2b --serve`
   launcher with its pinned cached tools/JRE/cache paths.
3. Run `scripts/run-stage3a-emulator-tests.mjs`.
4. For an operator-started development worker sweep only, run
   `scripts/start-stage3a-worker.mjs --enable-stage3a [syntheticOwnerUid]`.
   Without an owner argument it paginates the pending-work discovery query to
   exhaustion, so already-completed owners cannot starve later owners. Re-run a
   sweep after backoff or new work. The journal signal is never removed.

Both `TRAINING_SHADOW_STAGE3A=emulator-only` and Stage 2's explicit isolated
configuration are mandatory. Only `NODE_ENV=test`, project
`demo-edulience-phase2a`, Firestore `127.0.0.1:18787`, Auth `127.0.0.1:9099` and
the dedicated SDK transport are accepted. Captured project/default-database,
host/SSL/Auth transport guards run before RPCs. No ADC/service-account/inherited
token/proxy/debug configuration is accepted. The test preload's public dummy
OpenAI key is not a credential and no AI client is constructed by the worker.

No worker API accepts a caller-provided database, inventory proof, bootstrap,
manifest or arbitrary remote endpoint. Operator/discovery UIDs only locate state;
the actual root, UID, epoch, admission, fence and checkpoint must validate.

## Durable state and namespaces

Everything below is under `users/{verifiedStoredUid}/learningProfiles`, already
excluded from the legacy permissive recursive client rules:

| Document | Meaning |
| --- | --- |
| `shadowWorker` | Current generation and monotonically increasing account-wide fence |
| `shadow-{generationId}` | Version 1 job, immutable pin, Stage 1 checkpoint, lease, retry/reschedule/blocked status, verification outcome |
| `shadow-{generationId}/artifacts/packet-{zeroBasedIndex}` | Frozen batch/journal inputs, full evidence/receipt/Manual details, archive, decision/index rows and legacy fingerprint; complete prefix verification precedes ready |
| `.../profile-0000000000000000` | Bounded existing cumulative summary, shadow only |
| `.../references-{page}` | Existing Stage 1 bounded reference pages |
| `.../part-{index}` | Existing Stage 1 manifest parts |
| `.../manifest-0000000000000000` | Immutable existing Stage 1 manifest |

Every artifact envelope binds schema, UID, epoch, generation, full pin digest,
kind/index, creating fence, body and domain-separated body hash. Body identities
are deterministic and independent of lease takeover. Existing pages are compared,
never overwritten. A replacement fence may reuse an identical older page after
validating its scope/hash. Conflicting or additional pages block verification.
Artifact indices are zero-based, padded to 16 digits; a packet's index is its
one-based accepted batch ordinal minus one.

The pin commits the full accepted checkpoint, origin admission/bootstrap digests,
source revision/head, owner/epoch, semantic/execution versions and server snapshot
readTime (seconds/nanoseconds). Generation identity remains Stage 1's existing
owner/epoch/head/version identity. A job cannot silently repin on retry.

The job embeds the existing Stage 1 `AggregationCheckpoint`. Journal cursor
counts accepted batches, not question progress or performance. Each packet and
its cursor advancement commit together. Verification records bounded source
progress checkpoints every 20 sessions and at its last session. After interruption
it rechecks from zero without regressing the saved cursor or treating a prior
partial pass as complete.
No hidden deletion or pruning of source history occurs.

## Claim heartbeat recovery and fencing

Claim is a Firestore transaction reading the actual root, immutable fresh-owner
admission, writer fence, current control/checkpoint/work signal and previous
pointer/job. Only the supported empty-history Stage 2 epoch-1 protocol is
admitted. Missing, legacy, unverified or incompatible history is migration
required, not an empty bootstrap fabricated by this worker.

A live lease prevents a competing claim. After expiry, reclaim increments the
persisted fence and checkpoint sequence, retaining the original pin and pages.
Every page/job write transaction re-reads root/lifecycle, pointer, lease, fence,
scope and current checkpoint before writing. Stale workers cannot heartbeat,
write pages, mark a job ready, or change a replacement job's error state.

Lease decisions use Firestore snapshot readTime, not worker wall-clock authority.
Heartbeats extend expiry from that server time. Worker wall-clock skew never
acquires a lease or overrides a fence. A long CPU pause can lose a lease: its next
write then fails. The local default lease is two minutes; heartbeats occur during bounded
replay/verification work. This is not a global-clock synchronization claim.

Firestore contention retries re-run read-only computations and bounded write
plans. No external hook, clock, quota charge or side effect runs inside a retried
transaction. The SDK retries a transaction up to five times. Retryable RPC
failures persist exponential backoff (2/4 seconds), and stop after three failed
job attempts. Verified acceptance growth uses the separate rescheduling protocol
below and never consumes this failure budget. Integrity failures persist
`blocked` with static codes. A deleted
root, changed epoch, deleting lifecycle or lost fence forbids further writes,
including error updates; orphan cleanup needs future deletion orchestration.

The sweep uses a bounded `processOwner` supervisor. A process suspension that
outlives its lease does not renew the expired handle: the supervisor re-enters
the ordinary server-time claim transaction and obtains a new fence. A live
replacement worker makes claim return busy instead. At most three claims are
attempted per sweep; transient retries observe bounded backoff. Further work
remains durable for a later sweep. No safety check is bypassed for availability.

### Concurrent-head recovery repair

Before this repair, three valid acceptances between verification and the ready
transaction produced `blocked / shadow_head_changed_retry`; every later sweep
failed with `shadow_job_blocked`. The exact three-attempt reproduction was run
against the current worker before editing, with real demo Auth, real reservations
and normal backoff (no privileged changes to retry or lease fields).

Error taxonomy:

- **Verified scheduling growth:** the final ready CAS did not match; a fresh
  authoritative control/checkpoint snapshot strictly advances both accepted count
  and journal revision with unchanged account/version settings. The worker then
  replays the entire journal, source coverage and original pinned packet contents
  at that new snapshot. Only successful replay can create the private
  `VerifiedHeadGrowth` outcome. A caller-supplied error code is not proof.
- **Transient RPC failures:** gRPC 4/8/10/13/14 retain the existing bounded failure
  attempts and backoff. Exhaustion still blocks the affected job.
- **Integrity failures:** missing/changed journals, batches, sources, receipts,
  archives, bootstrap, inventory or checkpoint/counter inconsistencies block,
  never become scheduling growth merely because the head also changed.
- **Lost ownership/lifecycle:** expired or replaced fences cannot write pages,
  error states or rescheduling decisions. Deleted roots/deleting lifecycles/epoch
  changes forbid writes; a later authorized lifecycle/deletion process is needed.

The rescheduling transaction rechecks the live lease, pointer/fence, account,
admission and checkpoint; validates the actual current tail batch, predecessor
and journal entries; and rechecks the batch commitment at the newly replayed
snapshot. All reads precede writes. It writes ONLY the old job:

`state: reschedule`, `error: shadow_head_changed_retry`, `retryAt: serverReadTime
+ 4000ms`, unchanged `attempts`, null lease, queued phase, advanced checkpoint
sequence, and null verification. The old pin, cursor and all artifacts remain
unchanged. It never writes `journalWork` or the active profile pointer.

Acceptance can advance again during this operation. The stored pending signal
already contains that highest accepted revision and is never overwritten. The
extra bounded tail check is coordination validation, NOT full-source attestation
of a tail arriving after the replay snapshot. No `ready`/verified outcome is
issued for it; the next generation independently replays and verifies all sources.
Existing snapshot-scoped/Admin-mutation limitations below remain applicable.

One successful reschedule ends this owner's `processOwner` sweep immediately.
Claims before `retryAt` return busy. Once eligible, claim atomically creates a
new deterministic generation at the latest server head, carrying the account-wide
fence forward; it does not repin the old generation. Concurrent claimants cannot
create duplicates. Redundant intermediate cutoffs are coalesced. A crash before
the transaction retains the old lease/checkpoints for takeover; a crash after it
retains the durable scheduling decision and eligibility time.

This is an additive local shadow-job v1 enum value, not a completion-receipt or
Stage 1 checkpoint schema change. Older worker executables must be stopped before
using the repaired executable; they fail closed on the new state. Previously
blocked pre-repair jobs are NOT blindly upgraded from an untrusted error string.
They require explicit local operator review/reconstruction, not a production
migration or an automatic integrity-budget reset.

Fairness assumes later sweeps and a sufficiently long acceptance-quiescent window
for a full verified rebuild under a valid lease. Under indefinite acceptance,
work remains pending with a four-second server-time minimum between scheduling
attempts; no fixed failure budget permanently blocks legitimate growth. This
does not promise starvation freedom under continuous writes, nor deploy a
scheduler. Source retention, immutable pins and no publication remain unchanged.

An interruption before a packet transaction leaves no packet/cursor. After it,
both are durable. A restarted process rehydrates validated packets and rebuilds
deterministically. Output pages written before a crash are reused exactly.

## Complete pinned replay and verification

1. Fetch each canonical batch and its 2/3 canonical journal entries plus exact
   archive/evidence/decision/index/optional legacy snapshot in bounded read-only
   transactions at one explicit server readTime for the attempt. The journal
   cutoff/head/count/admission pin never changes. After a long outage a new
   snapshot can retrieve the same hash-committed immutable prefix; recovery is
   not made dependent on an expired historical Firestore readTime. Newer sessions
   are excluded by exact pinned batch IDs/count/revisions and full-chain checks.
2. Validate original v2 receipts, unchanged v1 completion request hashes, actual
   `validateCompletion` reconstruction, full evidence including private Manual
   details, original decision IDs, typed legacy fingerprints and original
   archive contents. No score or identity is fabricated.
3. Replay every batch from the explicit zero checkpoint. Verify predecessor
   checkpoints against actual preceding batches, full journal hash continuity,
   unique accepted sessions and identity references. Reconstruct total accepted
   sessions and compare the complete pinned checkpoint/control commitments.
4. Use Stage 1 `verifyInventoryProof`, `inventoryDigest`, reference/page/manifest
   contracts. Its result remains **authority: NOT VERIFIED**. Structural proof
   consistency alone is never treated as database provenance.
5. Use the unchanged `rebuildPersistedProjection` and Phase 1 aggregation, exposure,
   comparability and bounded-summary functions on original frozen evidence.
   Journal ordinals/receipt ingestion dates never substitute for learning dates.
   Unknown metadata stays unknown. Match.firstScore is not counted again, AI
   nominations are selection context, and Reflection/preferences/ratings are not
   objective performance arithmetic. Reflection remains private in packets and
   immutable source records, not logs or an exposed new reader.
6. Before ready, take a fresh consistent server snapshot, reread all original
   source payloads and all batch chains, and compare pinned packets exactly.
   Paginate *every* source namespace to check exact identity coverage: evidence,
   decisions, indexes, assessments, journal, archives and batches. Unexpected late
   legacy/unlinked rows require migration. Missing/substituted sources fail.
7. Later accepted sessions are verified for current snapshot coverage/ancestry,
   but never added to the older pinned profile. The unchanged pending-work signal
   preserves follow-up work. A changed head during final verification requires
   a durable reschedule rather than changing the candidate inventory or exhausting
   the integrity/RPC attempt budget.
8. Reread every stored packet/output, verify all hashes and exact deterministic
   rebuild equality, complete page/part/manifest coverage and absence of extra
   artifacts. Final transaction CAS-checks the current control/checkpoint and
   live lease/fence, then records the shadow outcome only.

Trusted source provenance does not certify student-reported performance as
objectively true. Existing client-reported evidence limitations remain intact.
The durable outcome says `trusted-source-shadow-verified`, records its server
snapshot `asOf`, inventory/manifest hashes and reconstructed accepted count, and
explicitly retains `stage1Authority: NOT VERIFIED` and
`publicationAuthorized: false`. No active publication field is written.

### Precise trust boundary

This is verification of supported, server-stored fresh-account Emulator history,
at explicit consistent snapshot times. It is **not** an authority upgrade for
arbitrary historical accounts, nor a proof against a privileged Admin attacker
coordinately rewriting every source/commitment. A source tampered before the fresh
verification snapshot is rejected. Arbitrary Admin mutation *after* a verified
snapshot is not prevented by hashes or leases. Publication must separately
establish all-writer immutable-source/lifecycle fencing and revalidate its source
and artifact commitments; this shadow status alone never authorizes publication.
Legacy browser root/assessment writers are not production-fenced by Stage 2.

## Bounds costs and remaining work

All persisted JSON envelopes are <=256 KiB; exact serialized UTF-8/escaping and
actual Firestore document budgets are checked before writes. Source references
use existing <=128 KiB record limits; reference pages use at most 20 records,
manifest parts at most 128 descriptors. Worker write transactions are capped at
12 writes / 2 MiB (observed two writes), point-read packet transactions at a
single accepted batch, and query/rehydration pages at 20 documents. A legal but
too-large combined packet is explicitly blocked, never split unsafely or lost;
original acceptance/evidence remains untouched.

Total source enumeration, RPCs, output storage and replay scale with history.
Exact aggregation retains the full generation in process memory and the existing
exposure implementation can have quadratic CPU behavior for heavily reused
content. This is not a constant-total-cost or production throughput claim.
Verification may also read newer accepted tail sessions for complete coverage.
Each generation currently duplicates full private packet material: retention,
encrypted access policy and account-deletion cleanup must be approved before
production. No retention duration or cleanup job is implemented here.

Before publication/production: independently review this worker; implement a
separately approved publisher with authority/lifecycle/source/artifact CAS;
establish all-writer fencing and trusted existing-history bootstrap/pre-v2
reconciliation; review snapshot lifetime/retry/rebuild policy, scheduling,
privacy/retention/deletion, cost and index requirements; verify published rules;
add separately approved generation-aware readers/outbox support. None is enabled.

## Original pre-repair validation record

Read/write counters count document operations including retried transactions and
empty query minimums, not billing estimates or all transport RPCs. Maximum write
bytes use exact Firestore document sizes, not full wire request overhead. Memory
is sampled process RSS (including the test harness), not isolated worker peak.
Latency is local Emulator wall time, not production or endpoint throughput.

100 sessions use real Auth Emulator tokens, real Stage 2 service acceptance and
the real quota manager over injected server days; this is not HTTP throughput.
500/1,000 use explicitly labeled lower-level prebuilt histories generated with
the exact validated completion/evidence/receipt/decision/journal/batch factories.
They do not bypass quotas in an endpoint and are NOT authenticated-acceptance or
HTTP benchmarks. The actual worker independently validates every fixture source
and its complete chains; output is compared with the unchanged Phase 1 oracle.

Sanitized Node 24.19.0, loopback demo Auth/Firestore, 23 October 2026:

- Final complete Stage 3A Emulator suite: **39/39 passed**, no skips,
  cancellations or failures. Includes empty/mixed histories, actual 3/4 automatic
  selections, crash/restart, competing/stale workers, server-time heartbeats,
  bounded backoff, fresh-fence supervision, old-job recovery, source coverage,
  damaged prefixes/checkpoints/archives/identities, missing/tampered/cross-owner
  artifacts, late acceptance before/after verification and lifecycle deletion.
- Existing complete Emulator regressions: **129/129 passed**, including the new
  Manual -> Automatic -> Manual read-budget regression. It measured 11/16/16
  reads and 10/15/10 writes. Stage 2 runtime code was not changed.
- Stage 1/2/shadow offline units: **165 passed**; existing completion/repair units:
  **68 passed**. Focused Training/outbox/evidence/selection/draft/adaptive run:
  **295 passed, 6 pre-existing quota-expectation failures**. Those unchanged tests
  expect Free 1/3; the original worktree's quota constants are 2/4. No quota code
  or expectations were edited. This is not a claim that the full suite is green.
- Backend typecheck/build, separate worker build, and frontend production build
  (`envDir: false`) passed. The existing frontend chunk warning remains. Active
  backend metafile contains **zero scalability inputs**; no worker import occurs
  in the active server, frontend or existing completion entry.
- All 13 task files pass the trailing-whitespace scan. Whole-worktree
  `git diff --check` still reports existing unrelated whitespace at
  `src/MIDSECTION/AIRecomendation.jsx:501` and
  `src/MIDSECTION/section_of_each_tips.jsx:322`.
- After stopping both demo Emulators, the runner correctly failed its loopback
  preflight with `Required loopback demo Emulator unavailable; no fallback.`
  No test was skipped and no SDK/production fallback was attempted. Both local
  Emulator ports were confirmed closed.

Final combined-run measurements (fixture creation and test oracle excluded from
worker time; original source counts include archives, journal, batches, evidence,
decisions, indexes and applicable legacy snapshots):

| Sessions | Journal entries | Original source docs | Packet + reference pages | Worker reads | Worker writes | Worker seconds | Sampled process RSS MiB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 225 | 800 | 112 | 3,964 | 253 | 25.7 | 379.7 |
| 500 | 1,000 | 3,500 | 551 | 17,617 | 1,171 | 137.2 | 408.4 |
| 1,000 | 2,000 | 7,000 | 1,101 | 35,067 | 2,321 | 287.9 | 442.0 |

Each case produced one manifest part. Total artifact documents were 115 / 554 /
1,104, including the profile, manifest and part. Maximum observed transaction
reads were 20, writes two, and document-write bytes 25,600. Maximum document size
was 23,689 bytes. Rebuild plus test-oracle wall times were 26.3 / 138.6 / 291.3
seconds. Total full-suite wall time was 576.1 seconds. These are local samples,
not capacity guarantees or production latency estimates.

Two-session crash recovery resumed in 1.8 / 1.7 seconds before/after a packet
commit, respectively, excluding the test-forced lease expiry and reclaim claim.
The dedicated supervisor test expired its own lease after a committed page,
reclaimed fence 2 with the identical generation pin and completed without
duplicating packets. The final scale run required zero lease recoveries.

Earlier combined runs exposed a test timeout and, separately, an expired lease
following a long processing gap. Per-test SDK client cleanup prevents unnecessary
idle client accumulation; its role in the original timeout is not proven. The
runner previously stopped on lease loss. It now uses bounded, ordinary
transactional reclaim rather than renewing a stale handle. The forced-expiry
regression and final 39-test run pass. The cause of the long host/RPC scheduling
gap remains unproven; production hosting and latency still require review.

## Exact task file changes

Added:

- `backend/scalability/shadowContracts.ts`
- `backend/scalability/shadowTransport.ts`
- `backend/scalability/shadowReplay.ts`
- `backend/scalability/shadowWorker.ts`
- `backend/scalability/shadowWorkerEntry.ts`
- `backend/scalability/shadow.test.js`
- `backend/scalability/shadow.emulator.mjs`
- `scripts/build-stage3a.mjs`
- `scripts/start-stage3a-worker.mjs`
- `scripts/run-stage3a-emulator-tests.mjs`
- `SCALABILITY_STAGE3A_SHADOW_WORKER.md`

Modified only for the approved Stage 2 documentation/read-budget regression:

- `SCALABILITY_STAGE2_ACCEPTANCE.md`
- `backend/scalability/acceptance.emulator.mjs`

No production data, active execution paths, rules, reservations, receipts, quota
policies, frontend behavior, outbox or existing aggregation/scoring semantics
were changed. No commit, push, deployment, migration, backfill or paid API call.

## Concurrent-head repair validation

Sanitized Node 24.19.0; only demo Auth/Firestore on loopback:

- Stage 1/2/3A offline contracts: **167/167 passed**.
- Existing acceptance/completion/outbox/profile Emulator regressions:
  **129/129 passed**. Manual -> Automatic -> Manual remains 11/16/16 reads
  and 10/15/10 writes; Stage 2 source and its approved documentation were unchanged.
- Repaired Stage 3A suite: **55 passed, one 1,000-session test cancelled by its
  900-second timeout** in the combined run. An isolated rerun on fresh demo
  Emulators then passed that test **1/1**, with no cancellations. Thus every one
  of the 56 cases passed across these runs, NOT in one fully green combined run.
  No test deadline, lease duration or failure-attempt cap was increased.
- Five normal growth sweeps used actual server-time backoff, preserved all old
  pins/artifacts, retained zero failure attempts, and then built the exact latest
  six-session generation. Additional tests cover crashes before/after scheduling,
  expired-lease takeover, competing successor claims, stale cancellation attempts,
  growth during scheduling, source/journal/counter/checkpoint corruption, lifecycle
  changes, forged error codes, and identical completion retries.
- The final 100/500 workloads passed at approximately 22/102 worker seconds.
  The isolated 1,000 lower-level fixture run passed at 200.3 worker seconds,
  35,067 document reads, 2,321 write operations, sampled process RSS 417.3 MiB,
  and zero lease recoveries. Fixture scope and measurement limitations above
  still apply; these are not production throughput guarantees.
- The 818-case targeted Training/completion/profile/backend run had 809 passes,
  seven existing quota-expectation failures, and two unrelated UI timeouts.
  Both affected unchanged UI files passed on rerun (12/12). Quota constants and
  expectations were not edited. Initial combined validation also experienced
  substantial scheduling stalls; it was not reported as a green run.
- Backend typecheck/build, separate Stage 2/3A builds and frontend production
  build with `envDir: false` passed. Active backend metafile: zero scalability
  inputs. All five repair files pass the trailing-whitespace check; whole-tree
  diff check retains the two pre-existing whitespace failures documented above.

Repair files only: `shadowWorker.ts`, `shadowContracts.ts`, `shadow.test.js`,
`shadow.emulator.mjs`, and this document. Production activation, Stage 3B
publication, migration and historical reconciliation remain unimplemented and
require separate approval. Pre-repair blocked local jobs still require explicit
review, as explained above; no records were automatically reclassified.
