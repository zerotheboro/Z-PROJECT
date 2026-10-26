# Stage 4B1: protected synthetic origin and pinned inventory foundation

LOCAL DEMO ONLY. Production execution, published rules, IAM, current profiles,
completion endpoints, outbox, quotas, scoring, billing and AI are unchanged.
Stage 1 authority stays NOT VERIFIED. Stage 3B still has no publication write
branch. No historical account is admitted, migrated, repaired or backfilled.

## Delivered files and isolation

- `backend/scalability/bootstrapContracts.ts`: versioned genesis, source pins,
  bounded descriptor pages/manifests, structural validation, future state names.
- `bootstrapTransport.ts`: dedicated guarded demo clients and bounded, genuinely
  readTime-pinned SDK metadata pagination (including missing parent documents).
- `bootstrapInventory.ts`: complete scoped traversal, typed fingerprints,
  classification and conservative read-only reconciliation planning.
- `bootstrap.ts`: operator-only new-identity/atomic-genesis protocol, private
  observed-creation witness, inventory verification and fail-closed admission.
- `bootstrap.test.js`, `bootstrap.emulator.mjs`: offline and real Auth/Web SDK/
  Firestore adversarial tests, unchanged-state checks and benchmarks.
- `scripts/build-stage4b1.mjs`, `scripts/run-stage4b1-emulator-tests.mjs`.
- `firebase.stage4b1-emulator.json`, `test-support/firestore/stage4b1-demo.rules`.
- This document.

All eleven files are new. No existing Stage 1–4A implementation, demo rule,
owner-supplied rule, production entry, frontend or deployment configuration is
edited. The separate build writes only ignored `dist-stage2/bootstrap.js` and
its metafile. The active backend build entry remains `trainingCompletion.ts`.

Requires sanitized Node 24, NODE_ENV=test, explicit
TRAINING_BOOTSTRAP_STAGE4B1=emulator-only, Stage 4A/Stage 2 opt-ins, the fixed
demo-edulience-phase2a project, Auth 127.0.0.1:9099 and Firestore 127.0.0.1:18787.
Inherited credential/proxy/debug configurations fail the existing transport
guards. No ADC/general cached Firebase app, remote transport, injected authority
provider, HTTP endpoint, scheduler or automatic activation is added.

## Origin: what is and is not established

1. An operator calls `prepareSyntheticIdentity({requestId, identityForm})`.
   The only forms are ascii, unicode58 and unicode128. The service generates a
   cryptographically random NEW `b1_` UID; no caller-selected UID or suffix is
   accepted. The Unicode forms preserve well-formed text without normalization.
   The 58-unit form has 50 BMP CJK characters and 8 ASCII characters (158 bytes).
2. The service must actually receive a successful Emulator Auth `createUser`
   result. It does NOT adopt an existing Auth user using current empty history.
   The request map coalesces identical concurrent requests; conflicting inputs
   fail. An operator receives an Emulator-only custom token to sign in through
   the real Web SDK. Tokens are never persisted in Firestore or logged.
3. The separate COMPLETE demo policy reserves the entire `b1_` cohort BEFORE
   root/genesis creation: browsers cannot create roots, assessments, quizAttempts
   or unknown history in that interval. This is not a change to published rules.
4. `bootstrap(token,{requestId})` derives UID only from verified authentication.
   It requires this process's private successful-creation witness, matching Auth
   incarnation and request. It rejects preexisting roots, lifecycle/genesis,
   historical/unknown/orphan descendants, then rechecks classified history in a
   real Firestore transaction. Absence is a safety check, NOT origin proof.
5. One transaction creates exactly four documents: owner root; the unchanged
   schema-1 Stage 4A lifecycle; its version-3 incompatible v1/v2 writer fence;
   and immutable version-1 `trainingBootstrapOrigins/{uid}` genesis. Their actual
   Firestore createTimes must agree. No event is rewritten or removed.
6. Genesis binds UID, epoch 1, Stage 4A writer protocol, source catalog, immutable
   request ID, root binding, server-observed Auth creation time, initial active/
   fence-1/revision-0 state and the existing Stage 1 empty-bootstrap commitment.
   Domain-separated canonical hashing uses existing strict Unicode/JSON helpers.
   No client timestamp, origin boolean or supplied inventory is accepted.
7. Within this observed process, identical bootstrap retries return the original
   genesis, including after response loss. A precommit interruption leaves no
   Firestore authority documents; the same prepared identity can retry. SDK
   contention retries use frozen values and no Auth/clock/hook inside callbacks.

The witness is deliberately NOT reconstructed from Admin-written markers or
matching digests. A new service instance/restarted process returns
UNVERIFIED_ORIGIN even for a well-shaped stored genesis. A self-consistent
rehashed replacement, root incarnation change, wrong epoch/protocol or closed
lifecycle also cannot establish current verified origin. The durable genesis is
preserved; no implicit repair/reset is provided.

This is a narrow **observed-demo-process** origin guarantee, not a durable
production attestation service or proof against arbitrary privileged deletion/
recreation. Auth and Firestore are not one atomic transaction: an interruption
after creating Auth but before genesis may leave a reserved, write-closed Auth
identity. Recovery after losing the private process witness needs an approved
durable-origin protocol/operator decision; emptiness never authorizes adoption.
No existing real student should be placed in this cohort.

## Writer fencing: actual guarantees and gaps

| Writer | Current behavior for the protected cohort |
| --- | --- |
| Legacy browser assessment/quiz/root-profile writes | Denied before and after genesis by complete demo rules and catch-all exclusions |
| Browser evidence, identities/indexes, ALL learningProfiles descendants, receipts/archives/artifacts, genesis/lifecycle | Denied; other-owner/unauthenticated reads remain denied |
| Root name/preferences and existing reserved drafts/activity/streak/AI recommendation schemas | Compatible after valid active genesis/lifecycle/fence; closed while lifecycle is missing, invalid, deleting or deleted |
| Stage 4A cooperating probes and lifecycle transitions | Existing epoch/protocol/revision/root/ledger checks; quarantined, never objective evidence |
| Existing v1 completion | Version-3 fence rejects; no quotas charged or automatic profile overwritten |
| Existing v2 admission/acceptance | Incompatible admission/fence rejects; not silently upgraded |
| Existing Stage 3A worker | Cannot claim the incompatible cohort; no legitimate running protected-owner job exists yet |
| Quota, AI quota, Paddle webhook and arbitrary Admin writers | NOT collectively lifecycle-fenced; Admin bypasses client rules |

Current root provisioning is `src/services/auth.ts -> user.ts`; legacy automatic
completion writes `src/services/assessment.ts` assessments and root profile in
separate browser writes. The older `quiz.js` remains a possible legacy client.
V1 backend writes are in `backend/trainingCompletion.ts`; v2 in `acceptance.ts`;
worker/artifact writes in `shadowWorker.ts`; publication has zero writes.
Draft, activity and recommendation writers remain in their existing service
files. `trainingQuota.js` and `billing.js` do not check the Stage 4A tombstone.
No production account-deletion orchestrator was found.

Tests explicitly demonstrate the REAL quota manager can reserve after a
synthetic deletion, and a webhook-like Admin fixture can write an entitlement.
The latter is not a live Paddle webhook test. These are unresolved enforcement
gaps, NOT successful security guarantees. Existing quota arithmetic/billing
behavior is intentionally not changed here.

Consequently `studentReady`, `admissionEligible`, `admitted` and
`publicationEligible` are always false. Protected owners cannot currently finish
Training using the old completion writers. A replacement lifecycle-aware,
reservation-compatible completion writer, worker sealing and reader/outbox
rollout must be reviewed before students can enter this cohort. Merely disabling
legacy Training is not student readiness.

## Inventory scope, pinning and completeness boundary

The versioned scope is the COMPLETE `users/{verifiedUid}` document tree plus the
independent lifecycle/event tree. It includes native/frozen evidence, assessments,
quizAttempts, root profile/user fields, identity events/indexes, all profile
controls/generations/manifests, completion archives/receipts, journal/batches,
drafts, activity/streaks, preserved quota/reservations/entitlements and AI selection
context. Genesis is independently bound by the pin and observed-origin check.
Unknown namespaces/descendants are enumerated and explicitly labeled unsupported;
missing ancestors are retained as descriptors, not silently skipped.

A pin binds actual UID, known epoch/lifecycle state/revision/head/fence, writer
protocol, genesis digest, known acceptance journal cutoff, typed writer-fence
fingerprint, root creation metadata, scope version and genuine server readTime.
Missing or malformed historical controls remain null/unknown; raw records still
appear in classification. Journal order never becomes learning chronology.

Metadata collection-ID and showMissing document listings AND typed document reads
use the SAME server snapshot readTime. Public SDK list-all helpers are not used.
The reviewed SDK pool adapter requests 20 records with autoPaginate=false, honors
opaque nextPageToken to exhaustion (including empty terminal pages), and refuses
repeated tokens, unexpected return shapes or transport changes. It validates the
existing guarded pool and initialized client's loopback/project/port/fallback
before metadata RPCs. No REST/latest-read fallback exists. The Emulator REST list
endpoint rejected historical readTime during investigation; the actual gRPC SDK
path was separately tested to exclude a later inserted orphan collection.

Traversal is queue-based with at most eight parent enumerations in flight, depth
12, 10,000 source references and 30,000 listing calls per service metrics budget.
Exhaustion throws rather than truncating or deleting history. These are isolated
prototype bounds, NOT new Training completion limits. A working set of bounded
descriptors is retained; this is not an infinite-memory streaming implementation.

Each descriptor contains only actual path, category, existence, typed-v2 source
fingerprint, real create/update metadata, bounded diagnostic issues and identity
references. It never includes Reflection, raw answers, ratings or performance
arithmetic. Original stored sources are neither copied to new evidence nor altered.
Timestamp/map/array/null distinctions reuse completionFirestoreValues.ts; no old
fingerprint is upgraded. Pages contain at most 20 descriptors and 128 KiB canonical
UTF-8 including envelope/escaping, index, full pin, predecessor hash and page hash.
A versioned manifest binds total pages/records and terminal digest. Missing,
altered, duplicate, reordered, substituted or cross-owner descriptors/pages fail.

The service independently enumerates TWO complete server snapshots, compares
every path/fingerprint/create/updateTime, and rechecks lifecycle/origin/cutoff
after verification. Concurrent inserts, updates, deletes, new orphan namespaces,
ordinary browser profile edits and lifecycle transitions are detected. The
inventory operations themselves are entirely read-only.

**This establishes revision-pinned snapshot consistency, NOT all-writer historical
completeness.** An unfenced Admin mutation in the final gap, or deletion of old
history before the first snapshot, cannot be ruled out by another digest or page
cursor. A test injects that final-gap write and verifies authority/admission stay
blocked. Returned `completenessAuthority` is literally NOT VERIFIED and
`privilegedMutationGap` is true. A self-consistent caller-generated truncated
manifest remains STRUCTURALLY_VALID at most; it cannot create a capability or
activate Stage 1/3B publication. No inventory input is accepted by admission.

## Authority states reached

All six obligations are explicitly named: UNVERIFIED_ORIGIN, ORIGIN_VERIFIED,
INVENTORY_VERIFIED, WRITER_FENCING_VERIFIED, ADMISSION_ELIGIBLE and ADMITTED.

This stage issues only the first two: ORIGIN_VERIFIED for an actually observed
new identity plus exact atomic genesis/current incarnation in the SAME process;
UNVERIFIED_ORIGIN for historical, reloaded, forged, closed or inconsistent state.
Snapshot consistency has its separate REVISION_PINNED_SNAPSHOT_VERIFIED label.
It does NOT advance to INVENTORY_VERIFIED. The missing privileged-writer/source
history authority and completion/worker integration prevent later transitions.
No client boolean, hash, marker or test fixture can enable those states.

## Historical reconciliation: diagnostic only

The report lists all scoped descriptors, actual fingerprint versions, malformed
records, unknown historical linkage/timing, missing ancestors/targets/decisions,
unsupported scope and invalid journal cutoffs/gaps. Existing evidence/receipt,
journal, batch, page and manifest validators are reused. Immutable identity-event
hashes and chains are validated with the EXISTING rebuildSourceIndex helper;
legitimate multi-step aliases are not falsely called conflicting solely because
they contain two targets. Terminal indexes are compared with their event chains.

A matching native session/legacy document identifier is reported as a POSSIBLE
duplicate, never automatically established from that coincidence. Pre-v2 hashes
stay unverified; conflicting aliases have no chosen winner. The diagnostic never
deduplicates/aggregates objective scores, synthesizes evidence, repairs counters,
changes a profile or authorizes migration. Human decisions are required for
historical origin, actual alias reconciliation, pre-v2 proofs, orphan retention
and privileged writers. Malformed historical data is retained as observed unknown
data, not fabricated success or zero performance.

## Scoped deletion orchestration design — NOT IMPLEMENTED/ACTIVATED

1. Authenticate an approved deletion request; read the independent lifecycle and
   irreversibly transition active -> deleting using the existing monotonic fence.
2. All cooperating acceptors, worker/job writes, future publisher, provisioning,
   quota and relevant billing/account writers must read that epoch/protocol/fence
   in their transactions. Reject resurrection/old-epoch work. Do not refund quotas.
3. Stop/reclaim leases and preserve acknowledged evidence/outbox recovery policy
   before destructive cleanup. Decide when to disable Auth/revoke refresh tokens
   and stop owner reads; the current tombstone is not full access revocation.
4. Run separately approved bounded, restartable owner-scoped cleanup with durable
   cursors over sources, identities, archives/receipts, artifacts, drafts, AI and
   account data. Legal billing/usage retention needs explicit policy. Never infer
   completeness from a missing root; include orphan descendants.
5. Retain independent genesis/tombstone and monotonic fences outside user-root
   cleanup; finish deleting -> deleted without deleting coordination history.
   Do not reset UID/epoch, TTL the tombstone or allow browser root recreation.
6. Gate late quota/webhook writes on the agreed lifecycle/retention policy to
   avoid orphan resurrection. Existing writers do NOT yet do this. No production
   deletion, recursive cleanup, Auth deletion or migration is added in this stage.

## Running validation

Use Node 24 through scripts/run-sanitized.mjs. Build backend plus the separate
build-stage4b1.mjs. Start the existing sanitized demo Auth/Firestore launcher with
its cached tools/JRE/cache options. Run run-stage4b1-emulator-tests.mjs with the
pinned tools directory. The runner refuses absent loopback Emulators and the
suite loads the COMPLETE new policy, restoring owner-supplied LOCAL rules after
itself. Never run rule-swapping/clear-database suites concurrently.

Validation executed with sanitized Node 24.19.0 and the isolated loopback demo
Auth/Firestore Emulators (no production fallback):

- Stage 1-4B1 offline scalability contracts: 291/291 passed, including 34 new
  bootstrap contract/diagnostic tests.
- Final Stage 4B1 Auth/Web SDK/Firestore suite: 39/39 passed, including the real
  creation/history-write race, forced transaction retry/interruption, response
  loss, forged/restarted origin, lifecycle and inventory races, historical v1/v2
  compatibility, full-policy browser permissions and all three benchmarks.
- Existing Stage 4A authority/repair Emulator tests: 50/50 passed.
- Existing Stage 3B publication Emulator tests: 43/43 passed. Its separate
  1,000-session publication benchmark was not rerun.
- Existing Stage 3A worker/recovery Emulator tests: 53/53 passed. Its separate
  100/500/1,000-session worker benchmarks were not rerun.
- Existing Stage 2 acceptance/counter repairs plus Phase 2A/2B/2C completion,
  outbox and reader Emulator regressions: 129/129 passed.
- Relevant offline completion/Training/evidence/draft/profile/streak/quota
  regressions: 819 passed and seven unrelated existing quota expectation
  mismatches failed. Six trainingQuota tests still expect Free limits 1/3 while
  the pre-existing working tree uses 2/4; one server test expects Free AI 4 while
  that working tree uses 3. No quota/test expectation was edited here. This was
  a targeted run, not a claim that the whole existing suite is green.
- Backend TypeScript and build, separate Stage 2/3A/3B/4A/4B1 builds, and frontend
  production build passed. The existing Vite large-chunk warning remains.
- Active backend metafile: ZERO scalability inputs. All pre-existing tracked
  changes remain at 31 files / 1,494 insertions / 169 deletions, unchanged by this
  task. Whole-tree diff-check still reports the two pre-existing whitespace
  lines in AIRecomendation.jsx:501 and section_of_each_tips.jsx:322; new Stage
  4B1 files have no trailing whitespace.

The NEW protected-cohort sample uses exactly four atomic document creates, a
maximum measured transaction budget of 1,787 bytes, 18 read/query operations,
four writes, and a largest subsequently read source document of 496 bytes.
Metrics are test instrumentation, not invoiced Firestore operations: empty-query
charging, Auth calls, independent coordinator validation and SDK overhead are not
fully represented. All history benchmarks are UNTRUSTED synthetic legacy
fixtures, not successfully admitted students. RSS is the whole test/SDK process,
not an isolated inventory heap measurement. No production-throughput claim is
made.

Final two-snapshot diagnostic measurements (synthetic untrusted quizAttempts;
all completeness authority results NOT VERIFIED; all inventory writes ZERO):

| History records | Wall time | Document reads | Listing RPCs | Read transactions | Inventory pages | Max page bytes | Whole-process RSS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 2,865 ms | 219 | 216 | 15 | 6 | 7,667 | 255,909,888 bytes |
| 500 | 11,825 ms | 1,019 | 1,056 | 55 | 26 | 7,628 | 272,781,312 bytes |
| 1,000 | 23,598 ms | 2,019 | 2,106 | 105 | 51 | 7,629 | 319,107,072 bytes |

Maximum metadata/read page: 20 records. Maximum transaction read count: 20.
Largest source document in these fixtures: 138 budgeted bytes. Canonical
inventory pages remain below 128 KiB; source documents use the existing complete
document-size validator rather than the page budget. These observations do not
prove all-writer completeness, successful admission or production scalability.

The demo Emulators were stopped after validation; all five task ports closed.
Running the new test launcher afterward failed explicitly with "Required demo
Emulator unavailable; no fallback." No published rules, production database,
real student, live webhook or paid API was contacted.

## Exact blockers before genuine publication eligibility

- Independently approved, durable origin provenance across process loss, not
  recovery of authority from a mutable marker or an empty current account.
- Reviewed all-writer/IAM/credential boundaries; arbitrary Admin rewrite is not
  stopped by client rules. Published production rules/IAM remain unverified.
- Complete lifecycle-aware replacements for old completion/worker/publication
  paths, plus coherent source/artifact exclusion or revision coordination across
  auxiliary and privileged writers. No canonical pointer can be published yet.
- Approved historical-origin/alias/pre-v2/orphan reconciliation and dry run;
  current reports are NOT migration plans that may be executed automatically.
- Full account deletion/retention and late webhook/quota coordination.
- Separately approved frontend v2 receipt/outbox/generation-reader compatibility
  and staged activation. No real student is admitted by this prototype.

Until these are independently enforceable, admission and publication remain
disabled regardless of successful Emulator measurements or matching hashes.
