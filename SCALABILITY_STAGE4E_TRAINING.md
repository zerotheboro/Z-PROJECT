# Stage 4E: isolated protected Training integration

This is a synthetic-student Emulator implementation. It does **not** establish
trusted admission, independently authenticated inventory provenance, production
IAM, or atomic external revocation. Successful profile publication stays disabled.
No production endpoint, Firebase rules, quota formula, scoring, adaptive difficulty,
billing, AI Recommendation, or Training selection algorithm is changed.

## Acceptance is not publication

The existing v1 request is reused byte-for-byte. A v1 receipt still means
`schemaVersion: 1, status: "completed", profileRevision: ...`. The new local path
requires a v2 receipt with `schemaVersion: 2, status: "accepted", lifecycleEpoch`
and `acceptedRevision`. It never invents `profileRevision` or a published profile.
All original receipt identity/hash fields, retry semantics and timestamps remain.

`assertJournalAccess` continues to reject every protected account, even with the
Stage 4E flag. A **different**, callback-attempt-bound guard check permits only
quarantined development Training. It requires sanitized Node 24, the explicit
Stage 4E opt-in, exact loopback demo transports, a real Firebase owner principal,
matching Stage 4B2 incarnation claims/genesis and fresh active lifecycle/fence
reads. A worker, fabricated result, cached result or another callback cannot use it.
The separate service also observes the origin ledger before preparing completion;
missing, pending or recorded revoked origin rejects. This observation is not an
atomic cross-project revocation guarantee.

## Flow and durable state

1. Existing Test Me or Test Method runs unchanged. Valid confirmed AI context
   still selects three methods; otherwise four. Top two proceed to Match. Manual
   sessions still support one to three methods. The +2.55 bonus is selection-only.
2. Reflection completion freezes the full draft and exact request/timestamp in
   the owner-scoped IndexedDB outbox **before** reservation or HTTP operations.
   Autosave stops only after the strict transaction commits. Failure preserves
   the available draft/results and reports that persistence is unconfirmed.
3. Each new v2 outbox entry adds `target: "protected-v2"`; the existing schema,
   database name and keys remain compatible. Absent target means original v1.
   Changing flags cannot reroute a pending entry. No tokens are persisted.
4. The original reservation must exist. Completion never reserves or charges
   quota. Missing, incompatible or unavailable reservations retain the checkpoint.
   Protected entries cannot use the grandfathered legacy save. The old local v1
   fallback also checks for protected UID/root markers and retained server fences
   before any assessment write; unknown/missing roots fail closed.
   Logout before a client is available cannot fall through to legacy saving.
5. The separate backend verifies Auth, validates the complete request, and uses
   Stage 4D to inventory/seal the initial synthetic account. Unknown or existing
   historical performance sources reject; there is no migration or inferred alias.
6. A guarded transaction reads the current sealed control, handle, manifest and
   complete page set. It establishes only a `quarantined-training-stage4e-v1`
   enrollment in the existing `learningProfiles/journalAdmission` path. Its fields
   explicitly say `authority: "NOT VERIFIED", admitted: false,
   publicationEligible: false`. The original persistenceVersion=3 lifecycle fence
   stays untouched. Initial controls/checkpoint and source-revision advance commit
   atomically. Initial enrollment is limited to eight bounded inventory pages;
   larger/unresolved histories reject without discarding the browser completion.
7. V2 acceptance reuses the existing immutable evidence, Manual completionDetails,
   identity events/indexes, journal hash chain, acceptance batch/checkpoint, archive,
   work signal and automatic assessment/profile compatibility write. Current
   lifecycle, enrollment, revocation fence and original manifest binding are read
   in the transaction before **both** new acceptance and receipt recovery.
   Persisted Stage 4D controls are enforced independently of process flags. Source
   changes and source-revision advancement share the commit. Protected writes have
   an explicit maximum of 16 documents including that control (legacy v2 keeps 15).
8. Identical retries return the exact original receipt. Conflicting payloads reject.
   Concurrent first requests in one process share bounded preparation; Firestore
   remains the authority for commits/retries. Another process may finish enrollment
   during a scan: only a fresh, valid stored enrollment can recover that race.
   An owned, session-bound sealing attempt resumes through guarded recovery reads;
   ordinary source writes stay blocked until sealing succeeds. Invalidated or
   revoked attempts fail closed. No process-local lock constitutes authority.
   Restart recovery uses stored handles/pages/enrollment and original evidence,
   not memory or a replacement Training session ID.
9. The outbox durably stores the receipt before activity recording and conditional
   draft cleanup. These retain the existing idempotent Training activity behavior.
   A cached v2 acknowledgment is revalidated at the backend during recovery. An
   expired token, revoked origin or deleting account cannot replay it as current
   authorization. Failures retain the original receipt, request and draft checkpoint.
10. Recovery UI distinguishes browser persistence, backend durable acceptance and
    profile publication. It does not imply unsent evidence survives storage clearing,
    eviction or device loss. The existing session snapshot remains a compatibility
    contract; it is not a newly published cumulative generation.

Guest Training stays browser-local and unchanged. There is no automatic guest
import. Real Firebase users and production persistence are not connected here.

## Local application and isolation

The separate application exposes only:

- `GET /api/training/access?timezone=...`
- `POST /api/training/reserve` (unchanged quota manager behind the shared guard)
- `POST /api/development/training/complete-protected-v2` (existing completion body)

It has no provisioning, authority-admission, worker, publication, billing or AI
endpoint. Auth derives UID; no endpoint accepts an ownership override or seal
proof from the browser. JSON is bounded at 64 KiB. Errors expose codes rather than
payloads, credentials or Reflection; loopback browser Origins are required when an
Origin is supplied. Requests are bounded to 120/minute per loopback address. The
supplied launcher binds only 127.0.0.1:18084. Disabled application returns 404.

Run the existing credential-free Auth/Firestore launcher with the pinned test tools:

```text
node scripts/run-sanitized.mjs scripts/run-completion-emulator.mjs --phase2b --serve --tools-dir <pinned-tools> --java-home <java21> --emulator-cache <emulators>
node scripts/run-sanitized.mjs scripts/build-stage4e.mjs
node scripts/run-sanitized.mjs scripts/run-stage4e-training.mjs
node scripts/run-sanitized.mjs scripts/run-stage4e-frontend.mjs
```

Use supported Node 24. The launchers set only fixed demo/loopback flags; do not edit
`.env`. The frontend launcher uses `envDir: false` so Vite cannot load `.env`.
Its DEV-only configuration requires both existing Phase 2B and Stage 4E opt-ins and
the exact `demo-edulience-phase2a` project. Production builds unconditionally return
no local configuration. The existing demo Firebase app connects Auth/Firestore
Emulators before use. Tests provision synthetic students through the existing
Stage 4B2 operator API and exchange the custom token in memory; no token is printed
or embedded in the frontend. No public provisioning route or real account is used.

## Files in this stage

New backend modules: `backend/scalability/protectedTrainingPolicy.ts`,
`protectedTraining.ts`, `protectedTrainingApp.ts`, `protectedTraining.emulator.mjs`.
Modified isolated backend: `writerGuard.ts`, `acceptance.ts`.

New frontend contract/tests: `src/services/trainingCompletionReceipt.ts`,
`trainingCompletionV2.test.ts`. Modified client: `trainingCompletion.ts`,
`trainingCompletionOutbox.ts`, `localTrainingCompletion.ts`,
`localTrainingCompletionConfig.ts`, `localTrainingCompletion.test.ts`.
Modified UI/controller: `src/components/TrainingCompletionRecovery.tsx`,
`src/quiz/Assessment.tsx`; tests `aiInformedAssessmentIntegration.test.tsx` and
`durableCompletionIntegration.test.tsx`.

New scripts: `build-stage4e.mjs`, `run-stage4e-emulator-tests.mjs`,
`run-stage4e-training.mjs`, `run-stage4e-frontend.mjs`. This document is new.
No active backend entry, published/demo rules or production configuration changed.

## Validation and remaining blockers

The Stage 4E runner requires live loopback demo Auth/Firestore and never skips or
falls back. It uses real Emulator Auth/HTTP/Firestore plus fake IndexedDB for
deterministic tab/storage recovery. React integration uses the real Assessment
controller, ranking, outbox and profile builder with synthetic section results;
it is not a claim of manual browser, visual or every engine's interactive QA.
Tests cover 3/4 Automatic and 1/3 Manual completions, complete Reflection/Introduction,
backend restart, simultaneous identical/conflicting requests, lost response,
reservation-delay refresh, account changes, revocation/expiry, callback fencing,
deletion on actual SDK retry, protocol confusion and quota preservation.

Successful cumulative aggregation/publication for protected accounts is deliberately
not connected. Independent origin/IAM provenance, closed-world enforcement over all
privileged/legacy/client writers, atomic revocation, verified inventory authority,
historical reconciliation and a separately approved publication protocol remain
production blockers. Existing rules still allow owner compatibility writes and
cannot constrain Admin. This stage provides no new IAM/security-rule guarantee.
There is no backfill, migration, schema rewrite, production activation or capacity
claim for 100/500/1,000 completed sessions. Final executed counts are in the handoff.

Final validation (sanitized Node 24; fixed loopback demo services):

| Check | Result |
| --- | --- |
| Focused scalability contracts, client/outbox, selection and controller tests | 526 passed |
| Additional distinct legacy completion, Manual flow, draft and streak cases | 126 passed |
| Stage 4E real Emulator integration | 17 passed |
| Stage 4D sealing regressions | 44 passed |
| Stage 4C guard regressions | 22 passed |
| Existing Stage 2 acceptance regressions, excluding the large benchmark | 53 passed |
| Backend typecheck and active backend build | Passed; zero scalability inputs |
| Separate Stage 2, 3A, 3B, 4A, 4B1, 4B2, 4C, 4D and 4E builds | Passed |
| Production frontend build with envDir disabled | Passed; existing large-chunk warning |
| Frontend TypeScript | Existing 108 errors remain; none in changed integration files |

The additional compatibility run had 155 passing cases, including 29 client cases
also present in the focused run; the table does not double-count those 29. The
new simultaneous-first-acceptance/backend-restart cases were also rerun separately
after final HTTP changes and passed. The full application suite and expensive
history benchmarks were not rerun. Whole-tree diff checking still reports the
same two pre-existing UI whitespace lines in `AIRecomendation.jsx:501` and
`section_of_each_tips.jsx:322`; unrelated failures were not modified.

## Focused recovery repair

The independent audit reproduced interruptions after the actual begin commit and
after the first page commit. The previous wrapper called the ordinary source-write
barrier before recovery, so a valid `sealing` state prevented its own resumption.
Cancellation advanced the cutoff but the context-only request ID stayed unchanged,
causing `seal_request_conflict`. Evidence was retained locally but could not finish.

The repair adds two backend-only records under the existing server-owned seal root:

- `trainingInventorySeals/{uid}/trainingRecovery/current`: bounded current-round
  pointer, written atomically with its immutable round record.
- `trainingInventorySeals/{uid}/trainingRecoveryAttempts/{attemptId}`: version 1,
  protocol `protected-training-recovery-stage4e-v1`; binds the exact UID, guarded
  incarnation/epoch/fence, frozen session ID and server-computed request hash,
  allocation scope, sequence, previous round ID, attempt ID and seal request ID.

Each record is bounded to 16 KiB and at most 100 rounds are allocated. No raw
Reflection, token or replacement completion payload is stored in these records.
They are outside the inventoried user/lifecycle trees and grant no trusted
admission. Existing client rules deny the seal namespace; no rules were changed.

The session/request binding is committed BEFORE `sealer.begin`. A committed begin
already has Stage 4D's immutable request index and original handle. A fresh guarded
transaction reads that index, the control and original attempt, and verifies owner,
incarnation, lifecycle, request identity, phases, pin and manifest state before
returning a resumption plan. `sealer.run` then performs its unchanged full inventory,
page, ledger and final-CAS checks. Recovery inspection grants no source-write
permission. Enrollment and acceptance still enforce the ordinary barrier, and
enrollment also verifies that the active recovery round matches its real handle.

Allocation scope is a lower bound, not a replacement snapshot: an open cooperating
writer can advance before begin. The actual Stage 4D pin is captured atomically by
begin, and resumption requires its exact current source/lifecycle cutoff. A pending
round with no committed begin keeps its request identity; it is not replaced just
because an open writer advanced. Once an attempt was explicitly cancelled and its
source cutoff advanced, a new immutable round/request ID is allocated with a link
to the old round. The frozen Training session, payload/hash, completion timestamp
and quota reservation remain unchanged. Old pages/rounds are never overwritten.

Concurrent identical requests share preparation and the persisted binding. A
same-session conflicting payload rejects, including after process reconstruction
or after enrollment but before evidence acceptance. Other sessions can use the
account after enrollment; an unfinished first preparation cannot be adopted under
another session. Auth/origin/lifecycle are checked again after preparation before
acceptance. Independent origin/IAM and cross-project revocation still are NOT
VERIFIED, and successful publication stays disabled.

Compatibility: existing enrolled accounts and v1/v2 receipts need no migration or
rewrite. Pre-repair **unenrolled** seals lack a reliable frozen-session binding;
they return `protected_training_recovery_unbound` rather than inventing one. An
explicit authenticated cancellation through the existing isolated sealer permits
a fresh bound round on the next identical completion retry. Invalidated attempts
and expired historical read windows likewise require explicit cancellation/review;
the wrapper never silently changes a pinned snapshot. Corrupt or missing recovery
metadata fails closed. All browser/outbox, Training, quota and production contracts
remain unchanged.

Repair files: `backend/scalability/protectedTraining.ts`,
`protectedTrainingPolicy.ts`, new `protectedTrainingRecovery.ts`, new
`protectedTrainingRecovery.test.js`, `protectedTraining.emulator.mjs`, and this
document. No production endpoint, frontend implementation, rules, receipt format,
scoring or quota algorithm changed.

### Recovery repair validation

All runs used sanitized Node 24 and, for integration, the isolated loopback demo
Auth/Firestore Emulators. The final Stage 4E run passed all 30 cases, including
both real post-commit interruption windows, fresh backend/browser reconstruction,
three identical retries, cancellation from each window, lost acceptance response,
conflicting payloads, account switching, stale epochs, deletion and revocation.
Each successful recovery retained the frozen payload/timestamp and quota counters
and produced exactly one evidence record. The unchanged Automatic 3/4 and Manual
1/3 journeys passed in the same suite.

- 667 focused offline contract, completion, outbox and Training tests passed;
  these include 15 new recovery-contract cases.
- Stage 4C: 22 Emulator cases passed. Stage 4D: 44 passed.
- The existing acceptance suite finished with 54 passing cases and one failing
  legacy operation-count assertion (`acceptance.emulator.mjs:543`). A separate
  three-session diagnostic on the untouched legacy acceptance path measured
  13/16/17 reads and 10 writes per commit; its old assertion allows at most 16
  reads. No acceptance algorithm or old test was changed for this repair. The
  functional acceptance cases, including retries/concurrency and quotas, passed.
- Backend typecheck, active backend build and all nine isolated scalability
  builds passed. The active backend metafile has zero scalability inputs.
- Production frontend build passed with its existing large-chunk warning.
  Frontend typecheck still reports the 108 existing errors, none in the changed
  repair files. The full application suite was not rerun.
- The six repair files have no trailing whitespace. Whole-tree diff checking
  still flags the two pre-existing UI whitespace lines recorded above.

Admission remains `NOT VERIFIED`; successful publication and production
activation remain disabled. These tests establish isolated recovery correctness,
not independent production origin/IAM authority.
