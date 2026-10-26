# Scalability Stage 2: isolated atomic acceptance

LOCAL DEVELOPMENT ONLY. Default disabled. No production activation, migration,
worker, generation, publisher, frontend/outbox integration or rule change.
Stage 1 inventory authority remains **NOT VERIFIED**, even for a consistent
replay of journal entries created here. Acceptance is not profile publication.

## Entry and trusted transport

The separate `createStage2AcceptanceApp({ enabled: true })` development application
exposes only `POST /api/development/training/accept-v2`. It is not imported by
`server.js`, npm start, the active backend build or any frontend code.

Both app enablement and `TRAINING_JOURNAL_STAGE2=emulator-only` are required.
`NODE_ENV=test`, project `demo-edulience-phase2a`, Firestore
`127.0.0.1:18787` and Auth `127.0.0.1:9099` are mandatory. Conflicting project
variables, credential/token variables and remote hosts fail closed. The existing
test preload's public dummy OpenAI key is the only API-key exception; no AI
client is created. Use sanitized Node 24, never an ordinary credential-bearing
shell environment. No environment values, bearer tokens or private payloads are
logged by this code.

Firestore uses the existing dedicated Phase 2A transport and its initialized SDK
project/database/host/SSL guards. Auth uses a separate named app, a public dummy
Emulator credential (not ADC), captured Emulator-mode/host/app checks and
`verifyIdToken(token, true)`. Changed environment or unexpected SDK structures
reject before verification/database work. The verified token UID alone chooses
paths. Emulator unsigned tokens are valid only in this explicitly isolated demo
context; this is **not** a production authentication configuration.

Request: the unchanged frozen `CompletionRequest` v1, maximum 64 KiB. Existing
validation, evidence factory, request hashing, method selection checks and legacy
session profile builder are reused. Stage 1 defensive copying additionally rejects
accessors, malformed UTF-16 and non-JSON inputs before hashing. AI nominations and
preferences remain client-advisory selection context, never performance bonuses.

Response: the original v1 receipt on a read-only v1 retry, otherwise receipt v2
with `status: accepted`, original session/request identity, `lifecycleEpoch: 1`,
`acceptedRevision`, `recordedAt` and compatibility-write results. There is no
`profileRevision` or publication promise in v2. HTTP success is 200, including
identical retries. The current Phase 2B outbox still accepts **v1 only** and must
not be pointed at this app.

Errors contain static codes only: 401 authentication; 400 invalid request;
413 request limit; 403 missing reservation; 409 conflicting completion,
bootstrap/writer/lifecycle/identity/journal/capacity state; 429 local per-UID burst
limit; 503 unavailable/unsafe transport. Disabled app requests return 404.
Unexpected database failures never return a success acknowledgment.
Counter/checkpoint/batch disagreement returns HTTP 409 `stage2_counter_integrity`
before any acceptance write is queued. No counter repair is performed implicitly.

## Fresh-owner admission and writer ownership

`service.admitFreshOwner(token)` is an operator/test-harness method, **not an HTTP
endpoint**. It accepts no client bootstrap or owner argument. Its serializable
transaction checks the real owner root and bounded `limit(1)` queries for existing
evidence, assessments, identity events, source indexes, profile documents,
activity/streaks, unfinished drafts and orphaned journal/archive subcollections.
Legacy Manual completion could leave activity without an assessment. Existing legacy profile pointers also
block admission. Any existing history is rejected: Stage 4 reconciliation is
required, including pre-v2 fingerprint handling. An existing active admission can
be retrieved idempotently without rewriting it.

Admission creates exactly four owner-scoped documents:

- `learningProfiles/journalAdmission`: immutable empty-history admission protocol,
  UID, epoch, timestamp and Stage 1 bootstrap commitment.
- `learningProfiles/journalControl`: Stage 1 `AccountRevisionControl`, initially
  revision zero, null head/publication and zero newly accepted sessions.
- `learningProfiles/cumulative`: **fresh-owner writer fence only**,
  `persistenceVersion: 2`, protocol/UID/epoch/admission digest. No profile/totals.
- `learningProfiles/acceptanceCheckpoint`: genesis ordinal zero, null batch/hash,
  revision zero and null journal head. This is created only by fresh admission,
  never reconstructed from a possibly corrupted control counter.

The existing v1 `revision()` requires `persistenceVersion: 1`. Its transaction
already reads the coordinator before writing. This fence therefore rejects even
a v1 completion prepared before admission; if v1 commits first, admission sees
nonempty history and rejects. No v1 endpoint or callback behavior was changed.
`trainingCompletion.ts` only exports its existing private compatibility helpers
for reuse; no new writer is imported into the active bundle.

Only epoch 1 and this fresh-empty Emulator protocol are supported. There is no
admission of existing accounts, migration state supplied over HTTP, lifecycle
reset, implicit fingerprint upgrade or fabricated historical alias.

IMPORTANT: this fences the existing cooperating v1 completion backend, not
arbitrary Admin scripts or legacy browser assessment/root writes permitted by
old rules. Do not use real/legacy clients with these synthetic admitted owners.
Production admission needs separately approved writer/rules fencing, deletion
tombstones, migration inventory and authenticated source authority. This stage
neither proves full-history publication authority nor silently adds late legacy
documents to its acceptance journal. A same-session late legacy document blocks
acceptance pending reconciliation.

## Paths and transaction

All paths below are under `users/{verifiedUid}`:

| Data | Path |
| --- | --- |
| Native evidence + original receipt | `learningEvidence/{existingNativeId}` |
| Complete frozen completion archive | `learningProfiles/journalControl/completionArchives/{existingNativeId}` |
| Immutable identity decisions | `learningEvidenceIdentityEvents/{existingDecisionHash}` |
| Bounded direct source claims | `learningEvidenceSourceIndex/{existingSourceHash}` |
| Immutable journal | `learningProfiles/journalControl/journal/{canonicalJournalId}` |
| Immutable acceptance batch | `learningProfiles/journalControl/acceptanceBatches/{canonicalBatchId}` |
| Current committed ordinal/checkpoint | `learningProfiles/acceptanceCheckpoint` |
| Revision/head/lifecycle | `learningProfiles/journalControl` |
| Pending-work signal | `learningProfiles/journalWork` |
| Automatic compatibility snapshot | `assessments/{originalSessionId}` |
| Applicable latest automatic profile | existing root fields on `users/{verifiedUid}` |

New nested paths use the already excluded `learningProfiles` namespace rather
than creating a permissive top-level collection. No published rules are changed.
Current source-file rules are not a claim about live deployed rules.

For each authenticated request, capture/validate once outside the transaction.
The retry callback performs no clocks, Auth requests, quota charges, logs, hooks,
worker calls or full-history reads/rebuilds:

1. Read control, admission, v1 fence, exact native identity and owner root.
2. If completed, validate the stored evidence/receipt and request identity.
   Return v1 unchanged. For v2, also verify the original archive, acceptance entry
   and evidence digest. Retry does not reread/require a reservation or write.
3. Otherwise read the stored acceptance checkpoint, compare its ordinal with the
   control counter, and require active epoch and compatible admission/fence.
   Validate the referenced immutable batch, its complete 2/3-entry journal range,
   and its direct immutable predecessor. The checkpoint's head must equal control.
4. Read the exact existing reservation, same-session legacy record and work
   signal. Verify the current journal tail. Reject unexpected legacy/source claims.
5. Read only the 1-2 necessary identity claims/decisions and, for an automatic
   display update, at most two previous source identities/decisions/evidence rows.
6. Derive the original receipt, immutable row/archive, claims, journal batch,
   hash-chained acceptance batch, next checkpoint, control and pending-work signal.
   The next ordinal comes from the verified checkpoint, not the control counter.
   Check all document and transaction
   budgets before queuing **any** write.
7. Atomically create evidence/archive/decisions/claims/journal/acceptance batch;
   advance checkpoint, control and pending work; create the automatic legacy snapshot and conservatively
   merge its root display profile when applicable.

All reads precede all writes. Creates have existence preconditions. Contention on
the owner control serializes distinct acceptances; Firestore retries recompute
from transactional reads with the same frozen payload and ingestion timestamp.
Conflicting same-session requests use existing `completion_conflict` semantics.

Manual commits use 10 writes and two journal revisions: acceptance then native
identity decision. Automatic commits use 14-15 writes and three revisions:
acceptance, native decision, legacy-alias decision. `acceptedRevision` names the
acceptance entry; control head names the final entry. The whole batch is atomic.
No entry can acknowledge evidence that was not committed with it.

New manual acceptances read 11 documents initially / at most 16 thereafter.
The 16-read case is Manual -> Automatic -> Manual: the final Manual checks the
three-entry automatic tail and its predecessor. Consecutive Manual batches use
at most 15. The Stage 3A regression measures this mixed sequence explicitly.
Automatic paths use a fixed bound (up to 24 targeted reads, no history-length dependency).
Identical v2 retries use 7 reads, zero writes. Fresh admission uses five point reads
and eleven bounded empty-history probes (including orphan batches), then four creates. Retry attempts may
repeat billed reads; no growing owner-wide arrays are used.

Each non-root record is capped at 128 KiB logical JSON including receipts/details;
actual Firestore document/name/depth limits are checked too. The exact recursive
root profile merge must remain below Firestore's document limit. Total planned
storage is capped at 2 MiB and writes at 15. Acceptance batches/checkpoints are
included in these budgets, not exempt side writes. These per-acceptance limits replace
neither source retention nor future generation capacity planning. The old Phase
2A 100/400-document/full-history limits remain unchanged on the v1 flow.

Manual Introduction, Reflection and surprisedByResults remain in immutable
completionDetails and the complete archive, outside objective arithmetic. Manual
completion never writes the automatic profile. Automatic display ordering reuses
the conservative v1 helper: known strictly newer completions may advance it;
older, tied, unknown, conflicting or unresolved bounds preserve it. Acceptance
revision/ingestion time is not learning chronology. Cumulative totals are not
computed or updated.

Reservations are read only from the verified owner's existing direct index.
There is no new reservation, refund, quota increment, entitlement/day recheck or
streak/activity write. Existing reservations have **no expiration field/TTL**:
previous-day sessions and expired Premium remain valid. Unknown `expiresAt` or
`revokedAt` extensions fail closed rather than inventing expiry semantics.

## Authority and recovery boundaries

Authenticated transactions establish the owner-scoped admission snapshot,
cooperating-writer fence, contiguous acceptance batch, immutable source claims
and original receipt. The journal commits the full scoped evidence document hash,
including private details and receipt; decision entries commit the existing
decision identities and fingerprint protocols. Complete offline replay verifies
these references but still returns `authority: NOT VERIFIED`.

Acceptance checks its trusted current control and immediate predecessor, not the
entire prefix on every request. Earlier storage corruption must be detected by
future pinned full-generation verification, never silently published. No existing
pre-v2 source is admitted/upgraded by this writer.

Before commit, interruption aborts every queued write. After commit, response loss
is recovered using the original receipt, without quotas or profile revisions.
An identical retry remains possible after reservation deletion. Lifecycle/root
reads conflict with concurrent deletion transitions; a deleting epoch cannot
accept new work. Durable deletion orchestration and epoch reuse are future work.
No worker consumes pending work and no accepted result is claimed aggregated.

## Counter-integrity checkpoint repair (23 October 2026)

`acceptanceBatches.ts` is an isolated Stage 2 extension. No Stage 1 receipt,
journal or control schema/meaning changes. Every committed completion has one
immutable batch containing schema version, verified UID, lifecycle epoch, exact
accepted-session ordinal, canonical owner/epoch/ordinal batch ID, full original
v2 receipt/source identity, evidence hash, first/last journal revision, final
journal hash, and the complete previous checkpoint (including predecessor hash).
The domain-separated batch digest commits all of these fields. Manual batches
contain two entries, automatic batches three; both increment the ordinal once.

The invariant for a nonempty admitted account is:

`control.nativeAcceptedCount == checkpoint.ordinal == immutableBatch.ordinal`

The checkpoint's batch ID/hash and journal head must match the actual stored
batch; its journal range is verified against the actual persisted entries. The
batch's previous checkpoint must match its actual immutable predecessor, and
`batch.ordinal == predecessor.ordinal + 1`. Genesis is the explicit server-created
zero checkpoint. New batches, evidence, receipt, archive, journal entries,
checkpoint/control and compatibility writes are one transaction. Batch creates
have existence preconditions; concurrent attempts conflict/retry against the same
read control/checkpoint. No external side effects are added to retried callbacks.

The original reproduction now fails with `stage2_counter_integrity`: after two
automatic completions (head 6/count 2), changing only count to 3 cannot accept a
third Manual completion or propagate count 4. Zero writes are queued, no stored
evidence/receipts/checkpoints are changed, and reservations/usage are untouched.

Identical retries remain read-only and preserve exact original v1/v2 receipts.
A valid-shaped unrelated counter mismatch (including the demonstrated 2 -> 3),
or missing/damaged checkpoint/batch, does not prevent v2 original receipt recovery
when the original evidence/archive/acceptance entry and existing active
admission/fence/control checks still pass. This does NOT authorize a new write or
repair any control state. Malformed controls, deleting lifecycle, missing owner,
wrong epoch and corrupt original receipt sources still fail closed as before.

Previously admitted local v2 fixtures without checkpoints cannot accept NEW
sessions. They are not silently reinitialized, scanned, migrated or backfilled;
eligible original receipts remain recoverable. Use newly admitted synthetic
owners for this protocol. Reconciliation of any retained old fixtures requires
separate approval, not fabrication of a checkpoint from `nativeAcceptedCount`.

Integrity limit: bounded tail/checkpoint verification detects counter-only
corruption and the tested immediate-batch/predecessor damage. It is not a full
history proof and cannot defeat privileged coordinated rewriting of every
relevant commitment or detect every earlier missing/corrupt prefix record.
Stage 3 MUST replay the complete pinned journal, verify all batches and immutable
sources, independently reconstruct accepted counts, and reconcile them before
publication. Journal/ordinal order is not completion/exposure chronology.
Caller-created hashes/checkpoints have no authority; these helpers acquire none.
Only authenticated, fenced Firestore transactions persist accepted provenance.
Stage 1 inventory authority remains NOT VERIFIED and publication stays disabled.

## Local checks and measurements

Run under the supported Node 24 executable:

1. `scripts/run-sanitized.mjs scripts/build-backend.mjs`
2. `scripts/run-sanitized.mjs scripts/build-stage2.mjs`
3. Start the existing cached isolated launcher with `--phase2b --serve` and its
   tools/JRE/cache arguments. It binds only the demo Emulators and uses empty CLI
   credential directories.
4. `scripts/run-sanitized.mjs scripts/run-stage2-emulator-tests.mjs`
5. For an explicitly enabled standalone local app only:
   `scripts/run-sanitized.mjs scripts/start-stage2-acceptance.mjs --enable-stage2`
   (binds `127.0.0.1:3002`; no admission HTTP route).

The integration test uses real demo Auth tokens and Firestore transactions,
including conflicts, retries, interrupted commits, lifecycle changes, legacy
ordering, Unicode, oversized merges and the v1/admission race. It measures a
72-session **lower-level writer** workloads, not HTTP end-to-end throughput: the
real quota manager reserves four manual methods/day over 18 injected server
clock days, and separately two automatic Test Me sessions/day over 36 days.
The automatic case retains 432 documents in the old four history namespaces,
exceeding the old 400-source ceiling, plus 72 archives and 216 journal entries.
A third automatic reservation on a full day is still rejected. No fabricated
Premium allowance or relaxed quota is used. This is not a 500/1,000-session
scalability or production-contention claim.

Stage 3 still needs durable fenced jobs, pinned source enumeration, complete
identity/exposure replay, artifact verification and atomic publication authority.
Stage 4 needs approved existing-history reconciliation/bootstrap, pre-v2 handling
and all-writer migration fences. Production also needs dual-version outbox/UI,
rule verification, deletion/retention policy and production transport/security
review. None is activated here.

### Recorded local verification before the counter repair (22 October 2026)

Sanitized Node 24.19.0, cached isolated demo Auth/Firestore Emulators:

- 111 Emulator tests passed, zero failures/skips: 37 Stage 2 tests plus 74 existing
  Stage 1/completion/outbox/reader regressions.
- Focused Vitest regression run: 458 passed, six unrelated quota expectation
  failures. Those unchanged tests expect Free limits 1/3 while the preexisting
  worktree uses 2/4. Neither quota implementation nor its tests were changed.
- All 119 Stage 1 unit tests and 15 new Stage 2 boundary tests passed.
- Backend typecheck/build, separate Stage 2 build and frontend production build
  (`envDir: false`, no developer environment file) passed. Existing chunk warning.
- Active backend metafile contains zero scalability inputs. No new writer import
  is present in the active server, frontend or existing backend build script.
- Existing unrelated trailing whitespace remains in AIRecomendation.jsx:501 and
  section_of_each_tips.jsx:322; new Stage 2 files have no trailing whitespace.

Final representative measurements (Firestore point reads / queued writes):

| Path | Reads | Writes |
| --- | --- | --- |
| Manual, first / subsequent | 10 / 11 | 8 |
| Automatic, first / newer subsequent | 12 / 18 | 13 |
| Identical v2 retry | 7 | 0 |

72 manual acceptances used 72 transaction attempts; local service latency was
54-132 ms, median 92 ms, p95 122 ms. 72 automatic acceptances exceeded the old
400-source ceiling; latency was 99-225 ms, median 176 ms, p95 221 ms. These timings
include Auth verification and exclude initial quota reservation; they are not
network/HTTP production benchmarks. Two simultaneous automatic sessions used
three transaction attempts in 2,791 ms; the forced-retry test used two attempts
and committed once. Retried/aborted attempts can incur additional reads.

### Counter-repair verification (23 October 2026)

Sanitized Node 24.19.0; only isolated `demo-edulience-phase2a` Auth/Firestore:

- The new original-reproduction test was run BEFORE repair and failed with
  `Missing expected rejection`: the old writer accepted the third completion.
  The same test now passes, including zero queued writes, unchanged full stored
  state/reservations/usage, exact original receipt recovery and blocked re-admission.
- 128 Emulator tests passed, zero failures/skips: 54 Stage 2 (17 new repair
  regressions) plus 74 existing Stage 1/completion/outbox/reader regressions.
  Coverage includes first/mixed/consecutive batches, counterfeit/missing/malformed
  checkpoints and batches, missing predecessor, damaged journal range/tail,
  concurrent distinct/identical/conflicting requests, forced retry, precommit
  interruption, deleting lifecycle and an epoch change before transaction retry.
- All 16 new batch unit tests, 119 existing Stage 1 unit tests, and 15 Stage 2
  boundary tests passed (150 total; included in the focused run below).
- Focused regression run: 474 passed / 6 existing Training quota expectation
  failures, 480 tests total. Both Training integration files passed without the
  parallel-load timeouts seen during the independent audit. Additional legacy,
  AI-context and server compatibility run: 123 passed / 1 existing AI Free-quota
  expectation failure (expected 4, current unrelated worktree value 3).
  No quota implementation or expectations were changed by this repair.
- Backend typecheck/build, separate Stage 2 build and frontend production build
  (`envDir: false`) passed. The existing frontend chunk-size warning remains.
  Active backend metafile: zero scalability inputs. No production activation.
- All six repair files pass the local trailing-whitespace check. Whole-worktree
  diff check still reports only existing unrelated whitespace at
  AIRecomendation.jsx:501 and section_of_each_tips.jsx:322.

Post-repair local measurements: automatic first/second accepts used 13/22 point
reads and 15 writes; identical retry remained 7 reads / zero writes. The 72-manual
run used 11-15 reads, 10 writes and 72 attempts (median 120 ms, p95 136 ms).
The 72-automatic run retained 432 old-history documents and 216 journal entries,
plus the new 72 immutable batches; median 201 ms, p95 238 ms. Both full replay
checks matched all 72 committed ordinals and the final checkpoint. Two concurrent
automatic accepts required four attempts in 3,381 ms; synthetic forced retry used
two attempts and committed once. These are local service measurements, not
production/HTTP/worker throughput or a 500/1,000-session scale claim.
