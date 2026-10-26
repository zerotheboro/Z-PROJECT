# Stage 4C: shared writer protection (isolated development only)

Stage 4C adds a reusable transactional lifecycle guard to the existing isolated
writers. It does **not** admit protected accounts, complete protected Training,
publish profiles, change production writers or establish independent IAM.

## Security repairs: attempt lifetime and snapshot provenance

The independent audit reproduced two defects in the initial guard API. Both
are repaired without changing persisted evidence, receipts, quotas or schemas:

| Reproduction | Before repair | Required repaired result |
| --- | --- | --- |
| Mint a valid result, force SDK ABORTED, genuinely protect and transition the owner to deleting before retry, then reuse the cached result | The SDK reused the raw Transaction object; a diagnostic write committed in deleting state | Same raw SDK object, **different private facade**, cached result rejected, zero diagnostic writes |
| Capture genuine root/fence snapshots, delete the root, pass those snapshots to a new transaction | A fresh result authorized an orphan diagnostic write | Snapshot-input overload rejected; normal guard-owned fresh reads reject missing root; zero diagnostic writes |

The actual Emulator regressions assert raw SDK object reuse and facade
inequality, and use real Stage 4A protection/deletion transactions between
attempts. Additional regressions cover raw/fabricated transactions, result
clones, normal return and exceptional exit, saved read/write methods, chained
writes, and read-only write denial. Existing positive SDK retry tests ensure
fresh guard checks still complete with the original receipt and quota charge.

There is no private-SDK-ID heuristic. The guard owns each callback boundary and
keeps a private active-attempt capability. It is invalidated before the callback
returns to the SDK, including errors; SDK retries mint a new capability. Root,
fence and lifecycle are read by the guard itself. Metrics/budget hooks replace
caller-created transaction proxies so wrappers cannot accidentally lose the
attempt identity. Raw transactions are not passed to callbacks or hooks.

## Guard and trust model

`backend/scalability/writerGuard.ts` provides:

* `authenticate(token)`: obtain UID from the registered, guarded Firebase Auth
  transport with revoked-token checking. Read current server Auth creation time
  and the Stage 4B2 incarnation/protocol claims. No owner or claims are accepted
  from the request body. Disabled/missing users fail authentication.
* `worker(uid)`: scope a backend Emulator supervisor operation to a validated
  owner path. This is explicitly **not** Firebase owner authentication or an
  independently enforced worker service identity. A caller-created principal
  or a principal from another guard instance is rejected.
* `transaction(callback, options?, onAttempt?)`: own the SDK callback and mint
  a fresh private attempt/facade on every invocation, even if the SDK reuses its
  raw Transaction object. Revoke the attempt in `finally` on success, error and
  retry. Only public reads/writes are delegated; write chaining returns the
  facade, never the raw SDK object. Optional per-attempt hooks observe metrics
  and enforce budgets without receiving the raw transaction or capability.
* `read(transaction, principal, expectedContext?)`: require a live facade issued
  by this guard. Read root, lifecycle and fence internally in that callback
  attempt. Caller-supplied snapshots are no longer an accepted input. Return
  the fresh snapshots for the caller's remaining validation without duplicate
  root/fence reads. Validate protected root
  incarnation, root/lifecycle creation metadata, exact writer protocol and
  namespace, epoch, active state and current lifecycle fence. An optional
  expected context additionally rejects stale roots, epochs and fences.
* `assertJournalAccess(result, transaction)`: accept only a result minted by
  this guard for the currently live callback attempt. Copied, fabricated,
  prior-transaction and prior-retry results cannot authorize an operation. Saved
  facade methods also reject after callback exit. Protected accounts are always denied
  with `writer_protected_admission_not_verified`.
* `lifecycle(transaction, principal, allowMissingClosedRoot?)`: perform the
  guard-owned reads for Stage 4A observation/deletion helpers and invoke the
  common pure `validateLifecycleSnapshots` validator. The pure validator itself
  does not issue authorization results. Closed lifecycle observation is explicitly
  separate from permission to write; missing root is permitted only for a known
  closed lifecycle when the existing coordinator requests tombstone observation.

Protection detection includes an existing lifecycle, reserved B1 cohort UID,
root lifecycle-binding property, persistence-version-3 fence or observed B2
Auth incarnation/protocol claim. Missing or malformed protection cannot fall
back to the old development journal route. For B2 Auth claim snapshots, the
nonce-derived root binding and original Auth creation time must match the real
genesis and its creation metadata. Restoring both Auth metadata and claims is
still not an independently authenticated incarnation proof.

The bounded, immutable version-1 `WriterGuardContext` contains exact UID,
protection kind, epoch, root binding/creation metadata, lifecycle fence, writer
protocol and namespace. It is a comparison pin, **not an authorization token**.
Root creation metadata is read from Firestore, never a client timestamp field.
Guard results always contain:

```
authority: NOT VERIFIED
independentRevocation: NOT VERIFIED
protectedAdmissionEligible: false
publicationEligible: false
```

Existing Stage 2 accounts without protection retain their **legacy-demo**
protocol. Their existing admission, control, reservation, immutable identity,
counter and receipt validations still run. This compatibility path is not an
upgrade to trusted admission, a migration, or proof of production provenance.

## Integration and transaction ordering

| Isolated writer | Integration |
| --- | --- |
| V2 acceptance, `acceptance.ts` | Authenticate once per service operation; guard both admission and completion before new writes **and before original-receipt recovery**; preserve v1/v2 receipt bytes and hashes |
| Shadow worker, `shadowWorker.ts` | Guard control loading for claims, heartbeats, artifact/checkpoint writes, verification and rescheduling; preserve separate worker lease/fencing-token checks |
| Shadow failure handler | Guard before changing retry/blocked state, even when damaged source/counter validation is intentionally bypassed; never touch a deleted/protected owner or replaced job |
| Publication, `publication.ts` | Verified principal flows through initial verification and final CAS; shared protection is reread in final transaction; every publication write remains deliberately prohibited |
| Stage 4A coordinator, `authority.ts` | Reuse common snapshot/incarnation validation; existing complete event/probe-ledger verification, context revision matching and deletion-slot rules remain intact |

All shared checks occur before writes. Each SDK retry receives a new live
attempt and repeats the guard-owned root/fence/lifecycle reads and validation;
it cannot reuse a prior attempt's guard result. The exact SDK object identity
is not treated as an attempt identity. Attempt capabilities never persist.
Reading an absent lifecycle also establishes a transaction dependency: an
intervening protection/deletion marker prevents an old prepared transaction
from committing through a stale absence check.

New shadow handles carry a transient `writerContext` capturing the root at
claim time. The original context is retained through verification callbacks,
heartbeats and error handling; it is never replaced by a freshly observed root
to make a stale handle pass. Restart must reclaim a new handle under the
existing server-time lease/fence protocol. Persisted jobs, receipts, generation
IDs, journal hashes and accepted evidence schemas are unchanged.

This transient context is not durable provenance for historical unprotected
demo roots across process restarts. Those roots have no independently verified
incarnation. Protected roots have lifecycle/creation binding and remain denied
Training admission. A future admitted protocol must persist its independently
verified incarnation in job/source identities before enabling protected work.

Cost: normal V2 acceptance/receipt retry adds **one Firestore lifecycle read**
and no writes. Authenticated operations additionally observe current Auth
metadata. Worker control loads add one lifecycle read; failure handling also
reads the existing cumulative fence. Protected inspection can read genesis to
check B2 claim binding. Existing read-budget assertions were updated by the
single lifecycle read (original retry: 7 to 8; final mixed acceptance: 16 to 17).
Publication's final read-only CAS similarly grows from 12 to 13 reads while
retaining zero pointer writes; its budget assertions are updated accordingly.

## Real guarantees and unenforced boundaries

Firestore lifecycle transitions serialize with guarded application transactions.
Known deleting/deleted state, epoch/fence mismatch, protocol incompatibility and
root recreation fail closed. Existing worker takeover fencing remains separate
from account lifecycle fencing. Transactions fail atomically without changing
evidence, identity records, receipts or quotas.

Firebase token revocation and disabled-user checks are real SDK checks at the
authentication boundary. They are **not atomic with a later Firestore commit**.
A token/user could change after verification. Future protected authorization
needs an enforceable credential-revocation/lifecycle fence in the committing
transaction, not only a preflight Auth call.

The B2 authority ledger lives in a separate demo project. Firestore cannot
atomically read that project and commit application writes in this transaction.
Therefore the guard does not claim a current atomic independent-origin
revocation witness. Even after a recorded B2 revocation, a structurally active
local lifecycle inspection can succeed, but **all protected journal and
publication access remains denied**. A test explicitly asserts this boundary.

Unrestricted Admin can bypass the guard, roll back/delete data and impersonate
Emulator workers. Client rules do not restrict Admin. Separate project IDs,
hashes and opaque in-process objects do not enforce production IAM. Trusted
admission, independently verified origin, authoritative inventory sealing and
successful publication remain unavailable.

## Production writers inspected; requirements only (no code changes)

| Current writer / paths | Required future integration |
| --- | --- |
| `backend/trainingCompletion.ts`; evidence, source indexes/events, assessments, cumulative/root compatibility fields | Verify owner/authentication at boundary and the approved incarnation/epoch/fence inside **every** commit and original-receipt path; replace the incompatible v1 writer for protected accounts; preserve original receipts and bounded write plans |
| `src/services/assessment.ts`, `src/services/user.ts`; assessments, root profile/onboarding merges | Existing direct browser writes cannot be made safe by a backend helper alone. Preserve non-protected behavior; route protected performance/profile writes through an approved server protocol and independently reviewed complete rules. No client-created root may establish origin |
| `trainingQuota.js`; usage, reservation index and daily reservation records | Gate mutations against the same lifecycle/credential epoch in their transaction. Preserve server day, original reservations, idempotency, no completion re-charge and no discard refund. A quota writer must not recreate a deleted account/namespace |
| `billing.js`; billing accounts, environment-specific customer mappings, webhook event records and user entitlements | Preserve webhook signature verification and idempotency. Keep payment/audit records according to approved retention; prevent delayed subscription events from recreating protected/deleted user state. Define reconciliation rather than silently discarding legitimate payment events |
| `aiRecommendationQuota.js`; daily counters and entitlement reads | Retain current limits and identities. Define lifecycle gating for authenticated owners without altering guest quotas or allowing AI data to establish Training evidence authority |
| `src/services/trainingProgress.ts` and `trainingStreak.ts`; draft, activity and streak records | Preserve existing draft schema/Save & Exit and historical activity semantics. Coordinate protected-owner server writes or reviewed client permissions with lifecycle closure; draft deletion must never delete accepted evidence |
| Deletion / retention / privileged operators | Implement one authenticated deletion workflow that fences acceptance/workers/publication first, records durable independent revocation/tombstone and credential revocation, then performs retryable cleanup. Do not erase the only anti-reuse/anti-rollback witness. No production deletion workflow is implemented here |

No active completion, quota, billing, AI, frontend, onboarding or published rules
were changed. The existing enabled-by-explicit-demo-flags development harnesses
are the only execution paths using the shared guard.

## Next dependency toward protected Training

1. Independently enforce authority service identities/IAM, restricted Auth
   provisioning/import/delete/claim access, anti-rollback and retained tombstones.
2. Establish authenticated origin plus a revision-pinned authoritative inventory
   seal and an application-transaction-verifiable admission/revocation fence.
   A mutable local mirror or caller-provided proof cannot establish authority.
3. Specify and audit the protected writer protocol/admission identity, including
   durable worker/publication incarnation pins and credential-fence semantics.
4. Implement protected acceptance behind a separate disabled flag, with the
   shared guard in the **same** evidence/journal transaction. Preserve session
   idempotency/receipts and independent quota reservation; verify deletion races
   and every legacy/privileged writer before allowing any protected account.

Stage 4C intentionally provides no successful protected Training/admission or
publication branch. These steps require separate approval and verification.
The Stage 4A bounded diagnostic probe ledger is not a Training history journal;
its 100-probe capacity must not be repurposed as the real completion counter.

## Repair files and validation

This repair changes exactly seven files: `writerGuard.ts`, `acceptance.ts`,
`shadowWorker.ts`, `publication.ts`, `authority.ts`, and
`writerGuard.emulator.mjs` under `backend/scalability/`, plus this document.
Existing Stage 4C transport modules, unit tests, build scripts, Emulator rules,
and acceptance/publication read-budget assertions need no further changes.

Tests use sanitized Node 24, actual loopback demo Auth/Firestore services and
synthetic identities. No production credentials or paid APIs are used. No new
rules/configuration are needed; the new suite does not replace Emulator rules.
No Stage 4B2 general audit or large-history benchmarks are repeated.

Repair validation: 393 offline scalability tests passed, including the existing
23 shared-guard unit tests. The real Emulator guard suite now has 22 passing
tests: 16 existing cases adapted to the owned API and six new attack/expiry
regressions. All 53 non-benchmark V2 acceptance, 53 non-benchmark shadow worker,
43 non-benchmark publication and 50 Stage 4A lifecycle Emulator tests passed.
The publication CAS still performs 13 reads and cannot write a pointer.
No expensive large-history benchmarks or general Stage 4B2 audit were repeated.

All 139 selected completion/Training regressions passed. Expected simulated
offline, lost-response and full-storage errors were exercised by passing
recovery tests. Backend TypeScript, the active backend build, and all separate
Stage 2/3A/3B/4A/4B1/4B2/4C builds passed. The repair does not change the frontend.
The full application suite and frontend build/typecheck were not rerun for this
backend-only repair.

The active backend metafile contains zero scalability inputs. No receipt or
evidence schema/hash changes, data migration, quota changes, or production
activation are required. Existing unrelated quota expectations and the two
pre-existing tracked whitespace issues were left unchanged.
