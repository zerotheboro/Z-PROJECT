# Unified Learning Profile foundation - repaired Phase 1

Offline only. No production component, endpoint, persistence service, Firebase
rule, quota or profile reader imports this library. Phase 2 remains blocked.
Existing `LearningProfile`, `MethodEvidence`, `profileBuilder`, assessment history,
unfinished drafts, selection/scoring, billing and quotas are unchanged.

## Contracts and entry points

- `learningEvidence.ts`: completed-session evidence **v1**. An additive optional
  `limitations` array carries historical adaptation warnings. Older v1 JSON
  without it remains readable. Lab and Match observations retain separate scores,
  counts, times and self-reports. There is no field for Match.firstScore or a
  blended legacy evidenceScore. Missing values stay null, including independently
  missing correct/total counts and missing scores.
- `legacyAssessmentEvidence.ts`: adapts completed automatic assessments in memory,
  with owner UID and document ID supplied from the trusted record path. It never
  writes or edits old assessments. Historical pomodoro/stopwatch IDs remain valid.
- `completedEvidenceIdentity.ts`: owner/source normalization, deterministic alias
  resolution and bounded history pagination.
- `learningEvidenceExposure.ts`: owner-wide content and question reuse index.
- `cumulativeProfile.ts`: `rebuildCompletedEvidenceHistory` returns the complete
  **offline analysis**, not a storage document. `aggregateCompletedEvidence`
  returns a bounded **v2 materialized summary**, with aggregation version
  `exposure-separated-accuracy-v2`.
- `cumulativeProfileSummary.ts`: summary limits, projection types and byte guard.

The offline cumulative projection changed from v1 to v2 deliberately: it no
longer embeds all observations, session IDs, option arrays or exposure history.
No production cumulative documents exist in this implementation, so no migration
or backfill is required. This does not change the existing production profile.

## Identity, validation and immutability

A source key is a canonical tuple of owner, provenance kind and original source
document ID (or native session ID). The same historical assessment cannot count
again merely because a separately established Training session linkage is added.
Compatible linked/unlinked imports resolve to the linked ID, regenerating matching
observation IDs, irrespective of arrival order. Different contents or conflicting
known linkages fail closed. Different source documents claiming the same Training
session also fail; native/legacy reconciliation is not silently guessed.

Identical duplicate observations collapse; conflicting method/phase identities
are rejected by the same validator used by both factory and aggregator. The
factory copies whitelisted fields, then recursively freezes the result. No
caller-owned nested arrays/objects are retained or frozen. Match count metadata
copies only correct and total; extra score/time/private fields are ignored.
Supplied counts must agree with the actual score within **0.0000005 + epsilon**
(six-decimal rounding). The observed score is never reconstructed or overwritten.

Native timestamps require an ISO date-time with explicit `Z` or numeric offset,
valid calendar/time components, and normalize to UTC ISO milliseconds. Ambiguous
historical strings remain null with `legacy-timestamp-ambiguous`; other unreadable
timestamps carry `legacy-timestamp-unreadable`. Historical createdAt is recordedAt,
never a claimed method completion time or a basis for exposure order.

## Exposure and comparability

Content identity is (content-set ID, version). Question IDs are scoped to that
versioned content, because local q1 IDs in unrelated content are not necessarily
the same question. Identical content/question identities are indexed across ALL
methods and sessions of the owner, after identity deduplication.

Each observation has first-known, repeated or unknown content/question exposure;
full offline analysis also retains each question's exposure state. A prior known
exposure makes it repeated. Ambiguous/tied ordering or unidentified earlier
material makes it unknown. Within a session Lab precedes Match; timestamps only
establish within-Lab method order when actual method times differ. A session
timestamp cannot establish that order. `first-known` means earliest established
in supplied history, **not fresh in the student's lifetime**. History coverage
always remains unknown; the code makes no completeness claim.

One owner-wide exposure count is one session/content/version pair, or one
session/versioned-question pair, not one per method/event. Per-method counters
describe participation and are not additive across methods. Reused material is
flagged even if its exact order is unknown. Match reuse across methods or earlier
sessions is flagged; it is not called unseen verification.

Accuracy is pooled only with known score/counts, versioned content, scoring and
assessment versions, and identical actual question difficulty/retained options.
Source, Lab/Match phase, context, and **content plus per-question exposure states**
must also agree. First-known, repeated and unknown conditions are never mixed
into one accuracy. Missing denominators remain descriptive/unpooled evidence.
Unknown subject/topic cannot establish transfer beyond the identified task.

All rows are descriptive task results, ordered by canonical method ID, not an
overall method-effectiveness leaderboard. Variation and unambiguous chronological
change are retained. Contradictory observations remain in the immutable evidence
and full history; summaries carry variation flags and recommend further testing.
There is no unvalidated confidence/strength percentage or scientific-certainty
label. The deterministic next-action rule is:

1. Reused content/questions: test on different material.
2. Missing conditions or unpooled known scores: repeat under known conditions.
3. Otherwise: collect more independent evidence.

Confidence/ease/willingness and explicit preferences are self-reports, never
performance contributions. AI nominations are selection provenance only; +2.55
is not consumed. A manual Lab and Match yield two observations, one session.
Established session counts are not claims of statistical independence.

## Explicit storage and input limits

All text limits below are UTF-8 bytes. Oversized source evidence is rejected, not
silently truncated. JSON byte guards also account for escaping and multibyte text.

| Item | Limit |
|---|---:|
| Materialized current-profile JSON | **192 KiB (196,608 bytes)** |
| Immutable completed-session JSON | 128 KiB |
| Owner UID/guest scope | 512 bytes |
| Session ID (including encoded historical aliases) | 1,024 bytes |
| Historical document ID | 256 bytes |
| Subject | 128 bytes |
| Topic / exercise topic | 256 bytes each |
| Content-set ID | 160 bytes |
| Content/assessment/scoring version | 64 bytes each |
| Question ID / offered option ID | 160 / 256 bytes |
| Observations per completed session | 50 |
| Questions per observation / options per question | 100 / 16 |
| Method summaries | Current 23 Training IDs + 2 historical IDs |
| Recent observations in summary | 40 total, at most 4 per method |
| Context groups / preference samples in summary | 12 / 10 |
| History page | Default 10, maximum 20 records; **256 KiB** JSON |

Summaries retain all-history counts and limitations but only bounded samples.
Detailed option/question data lives in immutable history, not recent summary
observations. A byte-budget pass can omit additional summary samples/groups;
explicit retention counters disclose every omission. It never removes source
records or changes totals. Projection-local context ordinals are not immutable
event IDs or stable history cursors. Raw full offline analysis must NOT be saved
as the current-profile document.

`pageCompletedEvidenceHistory` pages full records using an owner/source-key
cursor over the same supplied snapshot. Invalid limits/foreign or missing cursors
fail. Rebuilding from all pages is equivalent to rebuilding the original snapshot.
The function is pure: it is not a database query, authorization mechanism, or
implementation of production concurrent pagination.

## Fields available today

| Field | Current code / historical adaptation |
|---|---|
| Lab counts, score, self-reports, time | In results; copied independently |
| Match score, confidence, time | In results; counts null unless actually captured |
| Original session ID | In draft; legacy document ID alone is not proof |
| Structured student subject/topic | Not captured; null |
| Exercise topic | In many content definitions; absent from historical completion payload |
| Selected content-set ID / actual options/difficulty | In controller/runner/draft; not wired to completed evidence |
| Content/scoring/assessment version | Not explicitly captured; null |
| Exact method completion timestamp | Not captured; null |
| Historical save timestamp | recordedAt only |

For example, three-method Test Me contributes five observations; four-method
Test Me contributes six; a one-method manual session contributes two. Combined
they are three established sessions and thirteen observations. Reimporting any
one source does not increase these totals. Reusing the same content changes
exposure interpretation, not the original scores. Different source/phase or
exposure cohorts do not get averaged into a fabricated universal score.

## Phase 2 remains blocked

No production endpoint, transaction, Firestore rule, migration or write was added.
Future integration must derive UID from verified authentication and source paths,
enforce server-side validation/idempotency, store immutable sessions separately
from the bounded summary, and define snapshot/concurrency/rebuild policy. It must
capture real versions and conditions before making stronger comparisons.

The pure rebuild currently processes the supplied history in memory. Large-scale
streaming/incremental rebuilds and real database query pagination are future work.
Legacy/native source reconciliation, guest transfer policy, retention/deletion,
and scientifically validated uncertainty/causal effectiveness remain explicit
design decisions, not silently implemented features. No migration is needed for
existing profiles or unfinished drafts during this offline phase.

## Phase 2B: local durable completion integration (production remains disabled)

The later Phase 2A/2B work is opt-in local development only. Normal production
builds retain the legacy completion path. No rule deployment or data migration
is included. The later local-only Phase 2C history/profile UI is documented below;
production activation and rollout are not implemented.

The version-1 IndexedDB database is
`edulience.training-completion.local.v1.{demoProjectId}`, store `completions`,
compound key `[verified-current-uid, sessionId]`. It retains the exact canonical
JSON request, capture time/timezone, original receipt, activity/cleanup
checkpoints, and a 60-second atomic tab lease. Auth tokens are never stored.
Finalized records are retained, not automatically evicted. This is origin-local
browser storage, not authenticated cloud storage or protection against someone
with access to browser developer tools. Clearing/evicting browser storage can
destroy unsent work; retention/export policy remains a production prerequisite.

Flow: durable freeze -> authoritative reservation lookup -> identical HTTP retries -> verify receipt session/hash ->
persist acknowledgment -> idempotent activity on the original day/timezone ->
delete only the matching active draft -> finalize. A lost reply retries the same
payload and recovers the original server receipt. Activity/cleanup failures do
not resend an acknowledged completion. The landing page and resumed assessment
recover pending entries for the current account; retry and online reconnect are
supported. Logout/account changes stop subsequent effects and leave work owned
by the original account. There is no worker operating while the browser is shut.
Recovery also works when the draft is missing or unavailable. A bare assessment
URL resolves pending work before any new reservation and becomes the existing
`?resume={sessionId}` URL before submission, so refresh cannot restart that work.

Draft schema v1 and production localStorage keys remain unchanged. In local mode
only, draft/recovery keys gain `edulience.local.{demoProjectId}.` so matching demo
and production UIDs cannot share browser recovery copies. Guests remain on the
existing browser-local flow. An authoritative missing reservation grandfathers
an old draft onto legacy completion; lookup failure is not treated as absence.
No completion/retry/recovery reserves or refunds quota.

### Phase 2B integrity repairs (local activation only)

The exact completion payload, original completion timestamp and full final draft
are committed in one strict IndexedDB transaction BEFORE reservation lookup,
token retrieval or completion HTTP. Autosaving remains active until that commit
is confirmed. The canonical request remains capped at 64 KiB; the full browser
draft snapshot is capped at 1 MiB. A failed checkpoint is explicitly unconfirmed,
and ordinary draft recovery is attempted without discarding the completed result.

Optional v1 outbox fields `draftJSON`, `reservationStatus` and `legacySaved` make
this backward-compatible without changing Training draft schema v1. New entries
start pending; existing entries without the new fields retain their previously
verified reservation status. An authoritative missing reservation selects the
existing legacy completion path using the frozen payload, including after refresh.
Legacy completion is labeled separately from cumulative-backend acknowledgment.

Streaks now reconstruct from all immutable activity-day records, not completion
arrival order. The latest day cannot move backward. The signed-in writer fences
its server-only history query against the summary snapshot inside the day/summary transaction;
transaction conflicts reprepare history (up to five attempts). All normal clients
create a day and update its summary atomically. This handles concurrent devices,
but is not a security guarantee against an owner directly forging activity under
the existing rules. It reads the complete day history; no pagination truncation
or approximate counters are used. Large-history read costs need rollout review.

New Manual native evidence rows include additive versioned `completionDetails`
with the validated Introduction result and complete Reflection. These fields are
immutable, covered by the original request hash and existing archive/document
size checks, and excluded from objective aggregation. Manual completion still
does not write an automatic assessment or overwrite the legacy Learning Profile.
Earlier acknowledged Manual rows remain untouched: absent details cannot be
reconstructed from the server alone. No migration/backfill is performed.

Recovery distinguishes confirmed browser checkpoints, persisted backend receipts,
legacy recovery and unverified/failed browser storage. Browser eviction, clearing
site data or losing the device can destroy unsent work; no cloud-backup claim is
made before acknowledgment.

### Safe local startup

Use supported Node 24, a JRE supported by the pinned Firebase CLI, and the pinned
`test-support/firestore` tools (or the existing isolated tools directory).
Do not use Firebase deploy commands or production service-account credentials.

1. Build with `node scripts/run-sanitized.mjs scripts/build-backend.mjs`.
2. Start isolated Emulators in one terminal:
   `node scripts/run-completion-emulator.mjs --phase2b --serve --tools-dir <tools-directory> --java-home <JRE-home> --emulator-cache <cache-directory>`.
3. Start the local backend in a second terminal:
   `node scripts/run-sanitized.mjs scripts/start-local-training.mjs`.
   It requires Auth `127.0.0.1:9099` and Firestore `127.0.0.1:18787`, binds
   `127.0.0.1:3001`, and disables paid AI and billing. Firebase bearer tokens are
   verified by Firebase Admin against the Auth Emulator, including revocation.
4. In a third terminal set only these non-secret process variables, then run
   Vite at `localhost` or `127.0.0.1`:

   ```powershell
   $env:VITE_TRAINING_COMPLETION_PHASE2B = "emulator-only"
   $env:VITE_TRAINING_COMPLETION_PROJECT_ID = "demo-edulience-phase2a"
   $env:VITE_API_BASE_URL = "http://127.0.0.1:3001"
   npm run dev
   ```

   Use synthetic students only. The flag selects a separate named demo Firebase
   app connected to Auth/Firestore Emulators. Production builds ignore this flag;
   remote origins, non-demo projects and non-loopback API URLs fail closed in dev.
   Existing production `.env` values need not be printed or changed.
5. Run the isolated regression suite using the step-2 command without `--serve`.
   It includes real Emulator Auth tokens, HTTP completion and Firestore rules.

Manual checks: complete automatic 3/4-method and manual 1/2/3-method sessions;
disconnect before/after submission; refresh or close/reopen during final save;
recover on `/training`; retry after a lost response; open two tabs; sign out and
switch accounts; interrupt draft deletion; retry after midnight. Confirm one
immutable session, one original receipt, no extra quota charge, no second legacy
automatic save, and no second activity day for the same recovered completion.

Production remains blocked by the Phase 2A 100-evidence/100-assessment,
400-combined-record and 3 MiB ceilings, pre-v2 reconciliation, deployed-rules
verification, browser/outbox retention and a separately approved secure
production transport/rollout. Objective metadata unavailable in current drafts
(exact question conditions, scoring/content versions, individual method times)
stays unknown; no adaptive/scoring changes or guessed metadata were added.

## Phase 2C: read-only cumulative learning evidence UI (local demo only)

The existing `/training/profile` remains the latest-snapshot page by default.
With BOTH local opt-ins enabled, it shows the four-section cumulative dashboard;
`/training/profile?view=latest` still opens the unchanged legacy snapshot. No new
production route, endpoint, completion write, rule or migration was introduced.

Activation: use the isolated Phase 2B launch procedure above and additionally set
`VITE_CUMULATIVE_PROFILE_PHASE2C=emulator-only` in that sanitized local Vite process.
Keep `VITE_TRAINING_COMPLETION_PHASE2B=emulator-only`, the demo project and loopback
API URL required by Phase 2B. Do not edit production `.env` or Render settings.
The UI flag is off by default and rejected in production builds. The reader
checks actual Auth Emulator configuration, Firestore host/SSL/default database
and both SDK project IDs before I/O; SDK inspection changes fail closed.

### Actual sources and missing fields

| UI data | Read source / behavior |
| --- | --- |
| Recorded totals, method coverage, comparable cohorts | `users/{uid}/learningProfiles/cumulative`: `persistenceVersion:1`, `revision`, `profile.schemaVersion:2`, existing aggregation version. Never rebuilt or written by the UI. |
| Dates, modes, subjects/topics, conditions and individual results | `users/{uid}/learningEvidence/{id}`: validated v1 `evidence`. Native rows require a matching stored receipt. Unknown completion dates remain unknown; save times are labeled separately. |
| Manual Introduction / Reflection / surprisedByResults | Optional versioned `completionDetails` on native evidence rows. Reflection text is not rendered until an explicit private reveal. Pre-details rows are not assumed backfilled. |
| Automatic completion details | Introduction/Reflection from the provably linked owner-scoped legacy snapshot, when those fields validate. The snapshot is not counted again and private text still requires explicit reveal. |
| Earlier automatic snapshots and available study context | Owner-scoped `users/{uid}/assessments` reads and the existing legacy adapter. Unprocessed snapshots are labeled separately and never added to the server summary's totals. The root `users/{uid}.learningProfile` is not read as cumulative evidence. |
| Pending versus acknowledged browser work | Owner-scoped Phase 2B outbox, reduced to session ID/acknowledgment/legacy status only. No frozen result or Reflection is exposed in previews. Failed IDB reads show uncertainty, not zero pending completions. |

The summary has no automatic/manual split or latest-completion field. Mode
coverage comes from fully reconciled readable server evidence only, otherwise
it is unavailable. Latest *known* completion is explicitly qualified when dates
are missing. Existing drafts generally capture content-set IDs but not scoring
versions, exact questions/options, subject/topic or observation completion time;
therefore current ordinary sessions normally do **not** produce a progress chart.
No subject, topic, difficulty, objective, version, score or elapsed time is guessed.

### Identity, consistency, progress and privacy

The UI never reads denied identity-event or source-index namespaces. A native
automatic receipt proves the same-ID legacy snapshot belongs to that completion;
the snapshot/retained alias appears once. Separately established original-session
links are honored; unlinked historical records keep their uncertainty. Existing
foundation normalization rejects conflicting identity claims. Malformed rows are
disclosed as incomplete coverage; summary totals are not replaced with zeros.
Unprocessed legacy snapshots also withhold progress charts until coverage is
reconciled, rather than silently treating that older learning history as absent.

The reader double-checks the summary around evidence/snapshot queries, retries
changed snapshots, caps reads at 101 to detect (not hide) the 100-record ceiling,
and rejects over-3-MiB readable histories. A 20-second lookup deadline produces a
retryable error. These are local safeguards, not scalable production pagination.

Charts require a server-materialized comparable cohort plus an unambiguous match
to full readable conditions: same source/phase/method, known subject/topic/exercise
objective, content/version, scoring/assessment versions, questions/difficulty/
option identities and exposure/per-question exposure. Unknown, first-known and
repeated exposure are not blended. Separate sessions need distinct known method
completion times; counts and chronological endpoints must match the server group.
Ambiguous or omitted summary cohorts produce no chart. Charts plot original task
accuracy observations with exact accessible tables, never universal method
effectiveness, causal improvement or overall rankings. Ratings stay separate.

Auth changes erase the previous view and invalidate in-flight reads. The
dashboard remounts by UID to reset private reveals. Guest Training stays unchanged
and no browser-local guest history is imported. Read errors never log document
contents, Reflection or account identifiers. The style is scoped to this UI;
existing Training/latest-snapshot styling is unchanged.

### Validation and review

Run the new `cumulativeProfileView`, `cumulativeProfileReader`,
`localCumulativeProfile`, `CumulativeProfileDashboard`, `LearningProfilePage` and
`useCumulativeProfile` tests plus existing Training regressions. The Phase 2B
Emulator runner also executes `test-support/cumulativeProfileReader.emulator.mjs`
against the complete owner-supplied rules fixture, with actual demo Auth/Firestore
clients and the real completion backend. No production fallback is possible.

Manual browser review remains required at 375px and desktop widths: all sections,
mobile overflow, keyboard focus/skip navigation/disclosures, chart table
alternatives, unknown/empty/error states, account switching and private reveal.
Automated semantic tests are not screen-reader or rendered-viewport certification.
Production remains blocked by all Phase 2A/2B constraints listed above; live
published rules have not been re-verified by this local implementation.
