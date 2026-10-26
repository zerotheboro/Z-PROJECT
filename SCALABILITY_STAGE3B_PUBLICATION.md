# Stage 3B: independent source verification; publication authority BLOCKED

LOCAL DEMO ONLY. No active backend, endpoint, frontend, outbox, rules, receipt,
quota, scoring, migration or production profile is changed. No Stage 4/5 work.

## Threat model and actual authority boundary

Protect complete historical evidence, private Manual details, deterministic
aggregation, owner/epoch scope and monotonic publication against partial jobs,
stale workers, concurrency, corruption, retries and writer/deletion races.

| Actor/state | Actual protection | Remaining gap |
| --- | --- | --- |
| Authenticated v2 acceptor | Verified demo token UID, real reservation, serializable control/checkpoint/batch, immutable creates | Admission covers fresh synthetic owners only; no historical reconciliation |
| Cooperating v1 completion service | Reads persistenceVersion coordinator; v2 admission fences its commits | Does not fence legacy browser code or arbitrary Admin tools |
| Browser | Repository complete rules deny writes under learningEvidence, identity/index and ALL learningProfiles descendants | Owner can still write users/{uid}, assessments, drafts, activity and streak fields |
| Shadow worker | Immutable pins/pages, account-wide fences, server-time lease, complete snapshot replay | Ready/source verified is not publication authority; artifacts are still Admin-mutable |
| Admin / privileged writer | Transport restricted to loopback demo for this implementation | Admin bypasses client rules and can mutate sources, markers or delete/recreate accounts without coordinating |

Verified source locations: `acceptance.ts` / `acceptanceState.ts`,
`shadowWorker.ts` / `shadowReplay.ts`, `src/services/assessment.ts` (browser
assessment and root profile writes), `src/services/trainingProgress.ts`,
`src/services/trainingStreak.ts`, and `test-support/firestore/owner-supplied.rules`.
Rules here are local supplied source, NOT verification of live published rules.
Current lifecycle checks reject missing roots, deleting controls and wrong epochs;
there is no all-writer deletion tombstone/epoch recreation orchestration.

**Conclusion before implementation:** a stored coordinator/admission/hash cannot
prove its origin or enforce source immutability against these writers. A bounded
final transaction cannot notice an arbitrary earlier source changed after full
verification if that writer does not update an enforced coordinator. Therefore
this stage implements verification and fail-closed final preconditions, not an
artificial successful publisher. No authority flag or injected provider exists.

## States and contracts

`publicationContracts.ts` names three obligations:

1. `STRUCTURALLY_VALID`: persisted artifact envelopes, scope, pin, created fence,
   hashes, canonical IDs, complete page/part/manifest directories and bounded
   profile hash validate. This does not establish source provenance or semantics.
2. `SOURCE_VERIFIED`: independently fetch ALL original journal/batches, receipts,
   archives, evidence, identities/indexes and automatic compatibility snapshots
   at one fresh Firestore readTime. Reconstruct the exact genesis-to-pin chain,
   every batch/checkpoint, accepted count, inventory, exposure and actual profile
   using unchanged Phase 1 aggregation. Compare every persisted packet/output
   with reconstruction. This is **snapshot-scoped** provenance for the supported
   fresh-account protocol, not objective truth of client-reported results.
3. `PUBLICATION_ELIGIBLE`: all above PLUS authoritative full-history origin,
   all-writer source/artifact/lifecycle enforcement and admitted reader policy.
   **Unreachable in this stage.** Runtime report validation rejects a fabricated
   eligible state, `publicationEligible: true`, or authority upgrade.

Reports identify UID/epoch/head, generation, manifest/profile/inventory/artifact
digests, bootstrap/admission digests, server snapshot time, worker fence/sequence,
profile schema 2, `source-replay-stage3b-v1`, `native-evidence-v1-journal-v2` and
`exact-head-stage3b-v1`. Reflection/private source payloads are not in reports/logs.
Stage 1 inventory results remain `NOT VERIFIED`, unmodified.
The `journal-v2` name in the evidence protocol identifies the existing v2 writer/
receipt protocol; individual journal entry and manifest wire schemas remain v1.

Empty-history admission is checked against the actual stored admission, root,
cooperating-writer fence, canonical zero bootstrap, control and checkpoint.
This validates its current contents, **not proof of the admission's creation or
absence of pre-admission deleted history**. Admin fixtures cannot supply origin.
Unknown historical links/pre-v2 records are never invented, upgraded or ignored.
Unexpected assessments/evidence/decisions/indexes/journal/archive/batch IDs fail.
Root compatibility snapshots must refer to a journaled automatic assessment and
match its actual profile. Unlinked root snapshots fail. Any existing draft,
activity or streak document conservatively requires legacy-state reconciliation;
it is not silently treated as empty history. No production client uses this path.

## Separate read-only development service

`createDevelopmentPublisher()` requires `TRAINING_PUBLICATION_STAGE3B=emulator-only`,
Stage 2 opt-in, NODE_ENV=test, fixed demo project, fixed loopback Auth/Firestore,
credential sanitization and dedicated guarded SDK clients. No injectable DB,
owner, authority callback or inventory. No HTTP endpoint or auto-start process.
Methods take an actual demo Firebase token and generation ID; token verification
alone derives UID. No token is accepted as a CLI argument or logged.

- `verifyStructure(token, generationId)` returns the structural report.
- `verify(token, generationId)` independently rebuilds sources and returns the
  snapshot-scoped source report. It does not acquire/renew a worker lease.
- `publish(token, generationId)` performs that same independent verification,
  then the bounded final precondition transaction; valid input returns
  `status: NOT_PUBLISHED`, `code: publication_authority_not_verified`, blockers
  and zero pointer writes. Malformed/unsafe state throws a static contract code.

`publication_head_advanced` and `publication_stale_generation` are scheduling/
candidate outcomes, NOT a corrupted job. No job, attempts, pending-work signal,
source or artifact is mutated. Caller must run later Stage 3A sweeps and retry
the newest generation; no busy retry loop is installed.

## Exact final precondition transaction

1. Read owner root, journal control, admission, v1 fence, acceptance checkpoint,
   pending work, exact shadow job, current worker pointer, development pointer
   and optional development coordinator (10 point reads).
2. Read exact manifest and profile envelopes (2 point reads).
3. Validate verified UID/epoch/active state, bootstrap/writer protocol, versions,
   ready job/fence/sequence, actual lease expiry against Firestore readTime,
   exact current head/checkpoint == generation pin, prior pointer scope/version,
   coordinator description and no deletion/migration transition.
4. Compare all 10 snapshot updateTimes with those used by independent verification.
   Compare final manifest/profile updateTimes, bodies and hash/pin commitments.
5. Require independently established authority. It is **NOT VERIFIED**: return
   the blockers and queue **zero writes**. Transaction retries recompute from
   reads; no hook, Auth request, quota call, scan or external side effect occurs
   inside it. Hooks used for test races run outside transactions.

There is deliberately no dormant `if marker.enabled then tx.set(...)` branch.
The code cannot publish, even if Admin plants a valid-looking coordinator,
authorization digest or existing published pointer. Identical requests never
turn such an untrusted pointer into an original success receipt.

The comparison binds the verified coordinator/job/control and two key artifacts
to the final snapshot. It **does not** lock thousands of earlier source/artifact
documents or prevent phantom legacy writes; those unfenced gaps are precisely
why publication fails closed. Even a source mutation in that gap can only yield
NOT_PUBLISHED with the old report's explicit asOf; a fresh verification detects it.
Do not describe this blocked transaction as successfully implemented publication.

## Development pointer and future reader contract

Reserved paths, already protected by the whole learningProfiles exclusion:

- `users/{uid}/learningProfiles/developmentPublicationStage3b`
- `users/{uid}/learningProfiles/developmentPublicationCoordinatorStage3b`

This stage writes NEITHER. It never touches `learningProfiles/cumulative` or
`journalControl.published` and does not clear `journalWork`.

`parseDevelopmentPublication` is a read-only future contract: schemaVersion 1,
status published, owner, lifecycle epoch, generation ID and source revision/head,
accepted-native count, manifest/profile hash, profile schema/aggregation/execution
versions, verifier/evidence/policy versions, positive pointerVersion, publishedAt,
coordinatorFence and authorizationDigest. It defensively copies/validates and
does NOT authenticate origin or grant publication rights. A future trusted reader
must use owner authorization and trusted Firestore source, not arbitrary JSON.

No timestamp/revision is substituted for actual learning chronology. Manual
Introduction/Reflection/surprisedByResults remain in immutable source/packets,
not performance arithmetic. Existing v1 completed/profileRevision, v2 accepted,
original receipts and the v1-only IndexedDB outbox are unchanged.

## Required authority admission before a successful CAS can be implemented

Separately approved work must establish and test all of:

- Immutable trusted fresh bootstrap origin, or approved complete historical
  reconciliation including unresolved links and pre-v2 limitations.
- All legacy browser/backend writers fenced by enforceable authorization and
  a shared lifecycle/revision protocol; reviewed IAM boundaries for privileged
  tools, and no arbitrary uncoordinated Admin writer in the trusted write set.
- Immutable sealed generation/source commitments tied to that enforcement.
- Publication coordinator lease/fence and durable idempotent authorization,
  linearized with acceptance/deletion/migration and prior pointer version.
- An admitted development reader policy, followed later by separately approved
  generation-aware frontend and dual-receipt outbox work (NOT Stage 3B changes).

Only then may an authorized transaction re-read these bounded records, compare
the exact verified head, expected pointer version, authorization/fence and sealed
manifest commitment, and atomically create an immutable publication receipt and
advance the development pointer once. Lost-response retries must read that
original receipt; conflicts/rollback must fail. This happy path is **NOT TESTED
OR ENABLED**, not simulated by an Admin-set marker. No existing account migration.

## Costs, retention and local validation

Independent verification is O(history) reads and full-generation memory, plus
the unchanged exposure algorithm's possible quadratic CPU cost. It scans artifacts
and seven source namespaces in 20-document pages, reads each source batch in
bounded transactions, and rebuilds semantic output. It is separate from the
12-point-read final check. Repeated attempts intentionally reverify rather than
trust a cached report; this is too expensive for aggressive polling. A future
enforced sealed-generation authority protocol should allow reuse with CAS-bound
revocation/version checks, not skipping verification based on a caller cache.

No additional generation material is retained by Stage 3B. Existing Stage 3A
packets contain private copies; account deletion, retained generations, workers,
leases, receipts and pointer references need approved cleanup/retention policy.
No unsafe deletion/TTL is implemented. Source evidence is never pruned here.

Run supported Node 24 through `scripts/run-sanitized.mjs`. Build separately with
`scripts/build-stage3b.mjs` (ignored `dist-stage2/publication.js` plus metafile).
Start the existing cached demo launcher with `--phase2b --serve`, then run
`scripts/run-stage3b-emulator-tests.mjs --tools-dir <isolated pinned tools dir>`.
Absent Emulator/dependencies/configuration fails; no production fallback.

Tests include real demo Auth/reservations/acceptance, structural-vs-source states,
legacy root/drafts/activity/streak/history, damaged prefixes/counts/batches,
sources/manifests/pages, scope/lifecycle/lease/fence races, concurrent publishers,
retries, interruption/response loss, forged markers/pointers and actual owner
browser permissions. Every successful-looking fresh fixture must still produce
zero pointer writes. A separate 1,000-session lower-level prebuilt input benchmark
measures full independent verification, NOT acceptance throughput or authority.
Execution results are recorded after running tests; contract tests alone do not
prove scalability, production readiness or deployed-rule safety.

### Executed validation (23 October 2026)

Sanitized Node 24.19.0; only demo Auth/Firestore on fixed loopback ports:

- Final Stage 1/2/3A/3B units: **188/188 passed** (21 Stage 3B unit cases).
- Final complete Stage 3B Emulator run: **44/44 passed**, no skips, failures or
  cancellations, including actual root deletion and consistent worker-fence
  takeover between verification and final preconditions. Every service attempt
  wrote zero pointer/source/coordinator/job documents. Adversarial Admin fixture
  mutations are test inputs, never trusted authority.
- Complete unchanged Stage 3A Emulator suite: **56/56 passed**, no cancellations,
  including real five-growth recovery and 100/500/1,000-session cases.
- Existing acceptance, completion/repair, outbox and profile-reader Emulator
  regressions: **129/129 passed**. Original receipts, quotas, Manual details,
  3/4 selections, streaks, exposure and profile compatibility were retained.
- Relevant Training/completion/profile offline regressions: **811 passed**, with
  the **seven existing quota-expectation failures** (six Training, one AI).
  Neither constants nor expectations were changed. No new regression remained.
- Backend typecheck/build and separate Stage 2/3A/3B builds passed. Frontend
  production build with `envDir: false` passed, retaining its existing chunk
  warning. Active backend metafile contains **zero scalability inputs**.

Final measurements (document operations, NOT invoiced reads or production SLA):

| Generation | Independent verification reads | Verification ms | Final reads / attempts / writes | Final ms | Largest artifact Firestore bytes |
| --- | --- | --- | --- | --- | --- |
| Manual, 1 session | 33 | 252 | 12 / 1 / 0 | 45 | 10,641 |
| Automatic, 3 methods | 41 | 241 | 12 / 1 / 0 | 31 | 18,035 |
| Automatic, 4 methods | 41 | 278 | 12 / 1 / 0 | 43 | 20,159 |
| 1,000 Manual sessions | 15,124 | 73,801 | 12 / 1 / 0 | 398 | 16,741 |

The large fixture is lower-level prebuilt input, NOT authenticated acceptance
throughput or proof of authority. It uses actual validated original row/archive/
batch/identity factories; Stage 3A and independent Stage 3B replay them fully.
The final large verification used 1,417 read transactions, about 75.4 seconds
including Auth/final-check overhead, 13,174 maximum serialized artifact JSON
bytes and sampled test-process RSS about **490.7 MiB**. The RSS includes the
worker, verifier, SDKs, harness and prior cases, not verifier-only peak memory.
Full test time including fixture creation and shadow rebuilding was about 284.6
seconds; the complete 44-case file took 390.3 seconds. A previous complete 42-case
run also passed before the final two race tests and allocation guard were added;
the figures above are from the final exact-source run, not a cancelled trial.

Two simultaneous publishers used two final-check attempts / 24 reads / zero
writes; no final-transaction retry was observed in that case. Existing completion
tests additionally exercised real transaction retries. A successful publication,
once-only pointer advancement and original successful publication-receipt
recovery are **NOT TESTED: no legitimate authority exists to exercise them**.
Interruption/lost-response tests prove rejection stays closed and evidence is
retained; they do not pretend a blocked decision is a successful publication.

The inventory count is compared with actually fetched bounded artifacts before
allocating expected IDs. Forged billion/MAX_SAFE_INTEGER counts fail without
count-sized speculative allocation. All seven added task files pass the local
trailing-whitespace scan; whole-tree diff check retains the two unrelated prior
whitespace issues in AIRecomendation.jsx:501 and section_of_each_tips.jsx:322.

Only seven new files were added: this document, publication.ts,
publicationContracts.ts, publication.test.js, publication.emulator.mjs,
scripts/build-stage3b.mjs and scripts/run-stage3b-emulator-tests.mjs. No prior
source/configuration/rule file was edited. Production execution, published rules,
frontend/outbox, receipts, reservations, quotas, billing and scoring are unchanged.

Status: **STAGE 3B PARTIALLY IMPLEMENTED — AUTHORITY BLOCKERS REMAIN**.
