# Stage 4A: isolated authority and writer-fencing foundation

LOCAL DEVELOPMENT ONLY. No production writer, endpoint, rule, reader, receipt,
outbox, quota, scoring, billing or publication behavior is changed. Stage 3B still
cannot publish. This is a protection prototype, NOT a trusted bootstrap provider.

## Verified boundary and contracts

The separate service requires sanitized Node 24, `NODE_ENV=test`, both
`TRAINING_AUTHORITY_STAGE4A=emulator-only` and `TRAINING_JOURNAL_STAGE2=emulator-only`,
the fixed `demo-edulience-phase2a` project, Auth `127.0.0.1:9099`, Firestore
`127.0.0.1:18787`, and the existing dedicated credential-free guarded clients.
It accepts an actually verified Emulator bearer token, never a body UID or
caller-provided database/auth/authority provider. There is no HTTP entry point.

New wire contracts (`authorityContracts.ts`) have schemaVersion 1:

- UID, positive lifecycle epoch, active/deleting/deleted state.
- Writer protocol `stage4a-protection-only-v1`, server writer identity
  `stage4a-isolated-coordinator-v1`, source catalog `training-source-catalog-v1`.
- Admission eligibility is literally **NOT VERIFIED**, never true/eligible.
- Root binding, actual Firestore root creation timestamp (seconds/nanoseconds),
  fencing token, coordination revision and domain-separated ledger head digest.
- Strict copied/frozen JSON, exact keys, safe integers, malformed-Unicode/getter
  rejection, and bounded quarantine probe payloads. A writer context contains
  expected UID/epoch/protocol/catalog/fence/revision, not a transferable authority.

The dedicated owner validator (`ownerUID.ts`) is shared by Emulator token
verification, lifecycle fields, writer contexts and authority path construction.
It accepts exact, well-formed Unicode text: 1-128 UTF-16 code units, at most 512
UTF-8 bytes (matching existing journal/evidence budgets), not whitespace-only.
No trimming, normalization or replacement is performed. Slash, `.` and `..`,
and reserved `__...__` document IDs are unsupported and rejected before writes.
This deliberately documents a Firestore/source-contract subset of Auth UIDs.
Generic `text()` byte limits, schema versions and hash encodings are unchanged.

`parseStoredLifecycle()` validates and freezes every persisted lifecycle field
before initial protection opens its write transaction; document-byte preflight
also occurs before that transaction. Only genuine Firestore creation metadata
is learned afterward, not stored or synthesized. State-dependent transition
fields are recomputed from transactional reads and validated/budgeted before
queued writes on EVERY retry. The token always determines the UID.

## Storage and lifecycle

`trainingLifecycleAuthorities/{verifiedUid}` is a new protected TOP-LEVEL
namespace. Keeping it under a deletable user root would not establish an
independent lifecycle boundary. Its `events/{paddedRevision}` append-only records
detect uncoordinated changes to this prototype's ledger and probe payloads.

`protectSyntheticOwner()` is operator/test-harness-only. It refuses an existing
root, lifecycle record, incompatible writer fence, visible historical sources,
unknown user namespaces, orphan lifecycle events and orphan descendants. It does
not migrate, delete, repair or replace them. A missing root is created atomically
with lifecycle protection and an incompatible v1/v2 fence at
`users/{uid}/learningProfiles/cumulative` (persistenceVersion 3). No profile is
written to that fence. Its isolated purpose is to make existing cooperating v1
and v2 backends fail closed, including a v1 request prepared before protection.

The root binding and genuine root `DocumentSnapshot.createTime` must match the
independent lifecycle document's genuine creation metadata: both are created by
the SAME transaction. The wire contract exposes that metadata as rootCreatedAt;
the stored document has NO caller-supplied rootCreatedAt field. A timestamp field
is not a substitute (Emulator serverTimestamp transforms round to milliseconds,
while creation metadata retains microseconds). Privileged delete/recreate with
copied root fields is detected. A normal profile edit changes updateTime but not
createTime and remains supported.

Transitions are active -> deleting -> deleted only, with incremented fence and
revision in one transaction. Every coordinated probe mutation reads/validates
the lifecycle, root incarnation and writer fence, verifies the bounded ledger,
then performs all writes atomically. Stale epochs, revisions, protocols and
fences fail before writes. A race linearizes before deletion or rejects.

`transition(..., "deleted")` records a durable tombstone even if the deleting
root has disappeared. It does NOT delete Auth users, roots, old evidence,
assessments or any other records. Complete recursive cleanup and Auth deletion
orchestration are deliberately not implemented. No resurrection/reset API or TTL
exists. Tombstones must survive future approved cleanup and root recreation.

## No invented source authority

`assessFreshAuthority()` always returns **NOT VERIFIED**, publicationEligible
false. It cannot prove that records were not deleted before lifecycle creation,
that arbitrary Admin writers were fenced, or that a marker originated from the
intended code. Even perfect current state and an empty scan cannot prove those
facts. An old root with a null profile is not treated as newly created.

The catalog explicitly covers assessments, **quizAttempts**, immutable evidence,
identity events/indexes, profile snapshots, drafts, activity, streaks, and the
learningProfiles hierarchy containing journals, batches, archives, checkpoints,
worker jobs and generation artifacts. Quotas/reservations, entitlements and AI
recommendations are separately classified as preserved nonperformance data,
not evidence of a fresh account or objective performance.

The bounded diagnostic walk uses Admin listCollections/listDocuments, including
missing parent documents, then reads descendants. This catches orphan journals,
archives, batches and artifacts that a normal collection query misses. Every
catalog namespace gets an explicit observed-document count, including zero.
Traversal is capped at 200 document references/depth 12; exhaustion throws
`authority_scan_incomplete`, never returns a misleading complete inventory.
Those counts describe observed state, not a historical-completeness attestation.
List traversal is not revision-pinned or a serializable proof against privileged
phantoms. Protection also transactionally checks classified history and the
legacy writer fence; that is still NOT bootstrap authority.
The SDK list calls can enumerate references before the visited-reference limit
is checked. This is a small-demo diagnostic, not a bounded-memory scalable
inventory implementation; Stage 4B needs separately approved bounded pagination
and authoritative revision coordination.

`createImmutableProbe()` writes only quarantined
`users/{uid}/learningProfiles/authorityStage4a/probes/{scopedHash}` records and
their lifecycle coordination events. Both evidence-probe and artifact-probe
envelopes say acceptedTrainingEvidence=false. They are NOT native completed
evidence, session receipts, acceptance journal entries, scoring inputs or profile
generations. No reservation is created or consumed by a probe. Matching retries
with a refreshed current context return the same record; conflicting payloads
fail. This foundation does not add another Training completion protocol.

Ledger verification detects an Admin mutation of a probe without its committed
event. It does NOT prevent Admin edits or authenticate an Admin-planted,
self-consistently rehashed ledger. Separate probe and lifecycle-event budgets
are checked before writes; no real Training capacity is changed.

### Repaired deletion-capacity invariant

The former shared 100-event ceiling is replaced by **100 probe events plus two
exclusively reserved deletion events**. This is NOT an unrestricted increase:

| State | Probe events permitted | Maximum revision | Fence | Legal next event |
| --- | --- | --- | --- | --- |
| active | Up to 100 total | 100 | 1 | source within probe budget, or deleting |
| deleting | No additional probes | 101 | 2 | deleted |
| deleted | No additional probes | 102 | 3 | none |

The immutable ledger must contain exactly the lifecycle revision's events and
the corresponding complete probe set. Sources can occur only before deletion;
the only legal transitions are active -> deleting -> deleted. Readers reject
extra sources/events, invalid fences, illegal transitions and forged counters.
Probe 101 cannot consume either reserve. At exhaustion, deletion reaches
revisions 101/102 and fences 2/3. The original 99-probe reproduction now reaches
deleting/revision 100 and deleted/revision 101 without changing an earlier event.
Pre-existing valid <=100-event ledgers keep their original fields/hashes and
remain readable; no migration, reset, event deletion or historical rewrite is
performed. Reserved logical capacity does not bypass physical Firestore limits:
document-size guards and atomic transaction failure remain authoritative. Failed
commits retain the complete prior ledger and lifecycle for safe retry.

## Complete writer-to-path inventory

U = users/{verified UID}; P = U/learningProfiles; JC = P/journalControl.
Active means a reachable existing code path, not proof of deployment or traffic.

| Writer / inspected source | Status and trust | Paths | Coordination / required future action |
| --- | --- | --- | --- |
| `src/quiz/Assessment.tsx:983` -> `src/services/assessment.ts:85,113` | Active browser automatic completion and legacy fallback, owner-rule authorization | U/assessments/{sessionId or generated ID}; U.learningProfile/latestAssessmentId/learningProfileUpdatedAt | Separate merge writes; no lifecycle/journal fence. Demo policy blocks them for protected owners. Production frontend and rollout transition still need approval. |
| `src/services/quiz.js:11` | Exported, apparently unused: source search finds no current caller; older clients/raw SDK still matter | U/quizAttempts/{id}; U.learningProfile | Catch-all previously allowed all writes. Demo explicitly excludes and gates the namespace. Preserve historical records; classify them before bootstrap. |
| `src/services/auth.ts:22` -> `src/services/user.ts:18` | Active Google sign-in provisioning, browser | U initial identity/contact fields, createdAt, learningProfile:null | Read-then-create does not establish lifecycle freshness. Demo blocks recreation after a lifecycle record exists; ordinary edits preserve server fields. |
| `backend/trainingCompletion.ts:304,334` via `server.js:855` | V1 Admin completion, production disabled; isolated local endpoint | U/learningEvidence; identity events/indexes; P/cumulative; U/assessments; root compatibility fields | Transactional fingerprint/revision protocol; original receipts preserved. Prototype version-3 fence blocks new v1 commits without modifying v1 code. |
| `backend/scalability/acceptance.ts:126,183,257` | Separate Emulator-only authenticated Admin v2 admission/acceptance | Evidence, identity events/indexes, JC/journal, JC/completionArchives, JC/acceptanceBatches, P/journalAdmission/acceptanceCheckpoint/journalWork/journalControl/cumulative; automatic legacy/root compatibility | Atomic accepted-session/checkpoint protocol. Not production authority. Version-3 fence refuses v2; no quotas charged again. Future protocol upgrade must include lifecycle. |
| `backend/scalability/shadowWorker.ts:163,199,402` | Explicit local Admin worker | P/shadowWorker; P/shadow-{generation}; nested artifacts | Job fences/leases and create-or-compare artifacts, not IAM immutability. Must adopt lifecycle and sealing before authority. |
| `backend/scalability/publication.ts:228` | Emulator-only read/precondition checks | Reads sources and reserved development pointer/coordinator | Zero publication writes. No successful branch or authority provider is introduced. |
| `src/services/trainingProgress.ts:268,305,324` | Active browser drafts; guest/user local recovery | U/trainingProgress/active; owner-scoped localStorage | Session-conditional transactions/cleanup. Demo retains reserved create, update, delete while active; deleting owners require recovery policy. No draft schema changes. |
| `src/services/trainingStreak.ts:304` | Active browser activity/streak and guest localStorage | U/trainingActivity/{day}; U/trainingStats/streak | History/summary CAS under normal code; not an all-writer lifecycle fence. Demo preserves active-owner create/update rules, stops writes during deleting/deleted. |
| `src/services/trainingCompletionOutbox.ts:82`, `trainingCompletion.ts:69`, `localTrainingCompletion.ts:35` | Local-only IndexedDB/client retry integration | Owner/session-scoped local outbox; delegates v1 completion or legacy assessment, activity, matching draft cleanup | Frozen payload/ID/time, v1 receipt and local claim checks remain unchanged. Must NOT point this outbox at v2/Stage 4A. |
| `src/services/aiRecommendationPersistence.ts:348` | Active owner browser writer; guest localStorage | U/aiRecommendations/latest | Existing schema/mode/reads preserved in demo for active owners; selection context is not objective performance. |
| `trainingQuota.js:484` | Active server Admin, authenticated UID | U/trainingUsage/{day}, nested reservations, U/trainingReservations/{session} | Quota transaction, no profile source mutation. Client writes remain denied. Future deletion coordination must prevent orphan resurrection without changing quota arithmetic. |
| `aiRecommendationQuota.js:423,518,567` | Active server Admin, verified-user or guest identity | aiRecommendationDailyUsage/{usageId} | Separate quota reservations/commit/release. No evidence authority. Future account-deletion policy needed, no changes here. |
| `billing.js:179,586` | Active privileged server Paddle mapping/webhook paths | billingAccounts/{uid}, paddleCustomers/{customer}, paddleWebhookEvents/{event}, U/entitlements/current | Billing-specific identity/transaction checks, Admin bypasses rules. No performance source mutation; separate lifecycle/IAM/retention review required without changing billing semantics. |
| `scripts/start-local-training.mjs`, `start-stage2-acceptance.mjs`, `start-stage3a-worker.mjs` | Explicit demo launchers | Delegate the above local Admin writers | Sanitized loopback-only; not migration or production writer entry points. |
| Account deletion / migrations | No production orchestrator/backfill found; Auth sign-out is not account deletion | Potentially all U descendants and external billing/usage records | Root owner delete was broadly authorized in supplied rules. Prototype denies it for protected owners, preserves independent tombstone. Complete cleanup remains unimplemented. |
| Console, IAM principals, unknown external services | UNKNOWN: no production inspection authorized | Any paths allowed by their privileged access | Client rules cannot constrain Admin. Requires owner-reviewed least privilege at supported IAM granularity, controlled code paths, credentials isolation, break-glass procedures and audit logs. |

## Separate demo policy, not deployed security

`firebase.stage4a-emulator.json` points ONLY to
`test-support/firestore/stage4a-demo.rules`, a complete candidate derived from the
unchanged owner-supplied complete LOCAL rules. Neither that source nor either
existing fragment/config was overwritten. Published rules/IAM remain unverified.

- Browser reads/writes to the independent lifecycle/events namespace are denied.
- Existing whole learningProfiles exclusion protects all journal, checkpoint,
  archive, generation and prototype descendants; all four Phase 2 namespaces
  retain their write restrictions and owner/cross-account read policy.
- Assessments and quizAttempts are explicitly excluded from the recursive allow;
  their explicit write rules permit only accounts WITHOUT lifecycle protection.
  A separate deny would NOT override the old overlapping broad allow.
- Protected owners cannot create/delete the root, alter/remove root profile or
  identity/binding fields, or mutate data when lifecycle/protocol is incompatible.
  Name/photo/preferences and unrelated ordinary root fields remain editable.
- Active-owner draft, activity/streak and AI-recommendation validators are retained;
  activeOwnerWrites additionally checks lifecycle, root binding and writer fence.
  During deleting/deleted, mutations stop; no implicit server-mediated replacement
  is claimed. Existing server-owned quota/entitlement write denials remain.
- Unprotected accounts retain their legacy root/assessment/quiz contracts. This
  is a compatibility fixture, NOT a suggested production loophole after migration.
- Owner reads of existing evidence/profile/history remain, including after marking
  deletion; actual data/Auth deletion and access-revocation sequencing need policy.

## Validation and remaining approvals

Run through `scripts/run-sanitized.mjs` with Node 24. Build separately with
`scripts/build-stage4a.mjs`. Start the existing sanitized demo Auth/Firestore
launcher; once OTHER suites have finished, run
`scripts/run-stage4a-emulator-tests.mjs --tools-dir <pinned cached tools directory>`.
The runner checks loopback availability, loads the COMPLETE policy named by the
separate config into the demo Emulator, and restores the supplied local policy
afterward. Never run policy-swapping suites concurrently on the same project.
No production fallback, tokens in CLI arguments, paid calls or inherited secrets.
The JSON config is not a deployment guard: do NOT deploy it. Isolation is enforced
by the separate sanitized runner and service transport, not by a claim that a
Firebase configuration file cannot be used with an unsafe CLI command.

Tests inspect persisted state after every denied mutation; use actual Web SDK,
Emulator Auth, real quota reservations, and real Firestore transactions. Cover
historical/orphaned sources, malformed protocols, cross-account access, old
browser behavior, v1/v2 races, a prepared v1 commit, root reincarnation, deletion,
tombstones, immutable probes/tampering, drafts/codecs, streak/activity, AI schema
compatibility, and legacy unprotected profiles. No successful publication test is
possible or invented. The service is unused by all active execution paths.

Stage 4B still requires separate approval for authoritative new-account origin
and complete source inventory admission, all-writer/IAM enforcement, existing
history reconciliation/dry runs, pre-v2/conflicting identity handling, and full
deletion orchestration. Historical creation, completeness or missing scores are
never inferred from current emptiness. Publication, canonical-pointer protocol,
generation-aware readers and dual-version outboxes remain later work.

Initial implementation validation (before the two audit repairs), executed
locally on sanitized Node 24.19.0:

| Check | Result |
| --- | --- |
| Stage 1/2/3A/3B/4A offline contracts | 207 passed, including 19 new Stage 4A tests |
| New Stage 4A real Auth/Web SDK/Firestore suite | 40 passed, 0 failed/skipped |
| Existing Stage 3B Emulator suite | 44 passed |
| Existing Stage 3A Emulator suite | 56 passed |
| Existing acceptance, repairs, v1 completion/repair, outbox and reader Emulator suites | 129 passed |
| Relevant completion, Training, profile, draft and quota regressions | 811 passed, 7 unrelated existing quota-expectation failures |
| Backend TypeScript/build; separate Stage 2, 3A, 3B and 4A builds | Passed |
| Frontend production build with envDir:false | Passed; existing large-chunk warning |
| Active backend esbuild input graph | 0 scalability inputs |
| New nine files: whitespace check | Passed |
| Whole working-tree git diff --check | Existing trailing whitespace in AIRecomendation.jsx:501 and section_of_each_tips.jsx:322; left unchanged |
| Runner after shutting down both demo Emulators | Explicit unavailable-Emulator rejection, no fallback |

The seven unrelated failures are six trainingQuota.test.js expectations for the
working tree's already-changed Free Training limits and one server.test.js
expectation for its already-changed Free AI quota. Those runtime values, tests
and their changes were not edited in Stage 4A. This was a targeted regression
run, not a claim that the entire repository test suite is green.

The first prototype run exposed an invalid precision assumption about timestamp
fields. The final implementation instead uses genuine creation metadata and all
40 Emulator cases passed after that correction. Two subsequent test-harness
issues (Admin/Web Timestamp conversion and late rejection handlers in a race)
were corrected before the final complete passing run; no cases were skipped.

Only the nine new Stage 4A source/test/config/documentation files were added.
Existing tracked changes remained 31 files, 1,494 insertions and 169 deletions.
No production source, existing rule/config, deployment, live data, migration or
publication was changed. Existing v1/v2 writers intentionally reject only the
new isolated protected fixture's incompatible fence; migrating real owners to a
coordinated writer remains separate approved work. No Stage 4B work was begun.

## Independent-audit repairs (24 October 2026)

Repository files changed in this repair task only:

- `backend/scalability/ownerUID.ts` (new shared isolated owner validator).
- `backend/scalability/authorityContracts.ts` (stored-field validation and reserved-capacity reducer).
- `backend/scalability/authority.ts` (pre-transaction preparation, validated state updates and bounded ledger reads).
- `backend/scalability/acceptanceTransport.ts` (same UID validator after verified authentication).
- `backend/scalability/authorityRepairs.test.js` (50 new offline regression cases).
- `backend/scalability/authority.emulator.mjs` (10 new real Emulator cases and supporting fixtures).
- This document.

Both original defects were reproduced against an ignored frozen bundle of the
unchanged pre-repair source, using new synthetic demo owners. The Unicode request
returned `invalid_text` AFTER committing root/lifecycle/fence documents, and
99 probes plus deleting/revision 100 prevented the final deleted transition with
`authority_prototype_capacity`. No production data or accounts were involved.

The repaired constructor now prevalidates all stored lifecycle fields, including
the exact 58-code-unit/158-byte UID, before its initial write transaction. This UID
and ASCII/multibyte/supplementary boundary identities commit and round-trip under
the SAME schema version. Malformed surrogates and unsupported path identities
are rejected with zero write transactions and unchanged persisted state. A
pre-repair-shaped Unicode record is also readable without rewriting its data.
No data migration or historical alias/identity change is required.

Both deletion boundaries now succeed: 99 probes -> deleting/100 -> deleted/101,
and 100 probes -> deleting/101 -> deleted/102. Rejected extra probes cannot steal
the reserves; duplicate transitions and revival reject. Complete earlier event
IDs and contents remain identical. New tests compare actual server snapshots of
every document in the coordinator write set after each rejected mutation, not
just counters. A real SDK retry (ABORTED once after queued writes) commits once;
an injected nonretryable document-limit rejection before commit leaves all prior
events/probes/lifecycle fields intact. This is NOT a claim to have physically
exhausted Emulator disk or production quota. Actual SDK/storage failures remain
fail-closed and do not justify deleting history to make room.

Concurrent probe/deletion and concurrent Unicode-protection tests retain one
legal history/incarnation. Tombstones survive root deletion and browser
recreation remains denied. Quarantined probes remain nonperformance data, and
Stage 2 Unicode evidence/journal acceptance retains its existing identity/hash
contracts and Manual legacy-profile behavior. No rule was loosened or edited.

Final exact-source validation, sanitized Node 24.19.0, loopback demo only:

| Check | Repair-run result |
| --- | --- |
| All scalability unit tests | 257 passed (including 19 original authority and 50 new repair cases) |
| Focused new Emulator cases | 10 passed |
| Complete Stage 4A Emulator suite | 50 passed, no skips/failures |
| Complete Stage 3B Emulator suite | 44 passed, no skips/failures; publication still writes nothing |
| Complete Stage 3A Emulator suite | 56 passed, no skips/failures |
| Acceptance/repair/v1 completion/outbox/profile-reader Emulator suites | 129 passed, no skips/failures |
| Targeted Training/completion/profile/draft/streak/quota regressions | 819 passed, the same 7 unrelated quota-expectation failures |
| Backend typecheck/build and separate Stage 2/3A/3B/4A builds | Passed |
| Frontend production build, envDir:false | Passed, existing chunk-size warning |
| Active backend bundle | 0 scalability inputs; active source search also found no scalability imports |
| Repair-file whitespace | Passed; the two unrelated whole-worktree whitespace errors remain unchanged |

The runner's name filter retained the large benchmark cases, so the totals above
include the actual 100/500/1,000-session replays rather than claiming exclusions.
Those are existing test fixtures, not a new production scalability or authority
guarantee. The whole repository suite was not claimed green. Earlier trial runs
caught a prepared-fence variable shadowing error (corrected before the final
passing runs) and an unnecessarily retryable storage-error test injection; the
final bounded snapshot/nonretryable-limit fixture preserves all integrity checks.

Trusted admission is still NOT VERIFIED. Publication is still disabled. Trusted
bootstrap provenance, all-writer/IAM enforcement, authoritative historical/orphan
reconciliation and full deletion orchestration remain separately approved Stage
4B work. No active endpoint, frontend/outbox, existing rule/config, receipt,
quota, scoring, adaptive-difficulty or billing code was changed. Existing tracked
work remained 31 files / 1,494 insertions / 169 deletions. No commit, push,
deployment, migration, production access or paid API call occurred.
