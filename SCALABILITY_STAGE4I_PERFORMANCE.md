# Stage 4I — cumulative profile performance

Local development only. Genuine admission remains **NOT VERIFIED** and production
publication remains disabled. No endpoint, quota, billing, rule, evidence schema,
scoring formula, receipt or publication contract changed. Earlier worktree changes
are preserved.

## Files in this repair

- `src/quiz/learningEvidenceExposure.ts`: indexed temporal range counts and
  optional numeric diagnostics, replacing observation-pair filtering.
- `src/quiz/cumulativeProfile.ts`: append to private grouping arrays instead of
  copying every accumulated prefix; index same-session Lab membership.
- `src/quiz/cumulativeProfileView.ts`: index first legacy snapshots by ID, keeping
  the original `find()` first-match semantics, including duplicate IDs.
- `src/services/syntheticPublishedProfile.ts`: one-page lookahead while verifying
  the current page. No cross-call cache or partial profile is introduced.
- `src/components/CumulativeProfileDashboard.tsx`: memoize context preparation;
  index per-method observations, topics and session membership once per snapshot
  and filter change. All labels, section IDs, privacy controls and markup remain.
- `test-support/referenceExposure.stage4i.ts`: the pre-change implementation,
  instrumented only for offline equivalence/operation measurements. Never imported
  by production code.
- `src/quiz/__tests__/learningEvidenceExposure.stage4i.test.ts`: equivalence,
  ordering, unknown/tied times, duplicate-ID exclusion and operation-growth tests.
- `src/services/syntheticPublishedProfile.stage4i.test.ts`: bounded lookahead,
  ordered hashing, failed prefetch, retry, ownership, generation and legacy-detail
  regressions.
- `src/components/CumulativeProfileDashboard.stage4i.test.tsx`: preparation reuse,
  filters, changed chart values under reused keys and Reflection privacy.
- `scripts/run-stage4i-performance.mjs`: paired offline before/after measurements.
- This report.

## Complexity and unchanged meaning

The original exposure function allocated a filtered copy of the full shared
content/question bucket for every observation, then searched those copies and the
unidentified buckets. With repeated content this is quadratic, even when an early
prior observation makes subsequent `some()` calls short-circuit.

The replacement builds owner-wide content/question indexes with sorted exact
observation times and sorted known upper bounds for undated observations. Binary
range counts establish before/after/unknown relations. Per-session/phase indexes
remove the cross-session formula for same-session observations, restoring the
existing Lab-before-Match rule and conservative same-phase ordering. Self-ID
exclusion is exact, including an indexed duplicate-ID path rather than a fallback
pair scan. Ties are never broken by save/journal order. Unknown history remains
unknown; different methods still share the owner-wide exposure index.

For M content/question memberships (including unidentified observations), work is
**O(M log M)** with **O(M)** temporary storage, instead of worst-case O(M²). For
fixed bounded question counts this is O(N log N) in sessions/observations. Input
objects are not sorted or modified. Output insertion order and all exposure
fields are checked against the reference implementation. Aggregation still has
its existing bounded-method scans and ordering work; no performance arithmetic
or version changes. Private array appends and Lab membership sets preserve the
same order, flags and scores.

On the measured repeated-content dataset:

| Sessions | Observations | Old filter candidates | Old relation checks | Indexed memberships + comparisons + range steps + queries |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 450 | 266,050 | 8,075 | 57,795 |
| 500 | 2,250 | 6,641,050 | 40,575 | 342,000 |
| 1,000 | 4,500 | 26,562,500 | 81,200 | 728,890 |

These counters describe different explicit algorithmic operations, not CPU
instructions, milliseconds or Firestore reads. They demonstrate growth: a 10x
history increased old candidate filtering about 100x and indexed work about 12.6x.
Diagnostics contain numbers only and are not persisted or used in scoring.

## Reader integrity and initial-loading decision

Stage 4G publishes one final ordered history-chain digest, not independently
verifiable page digests or completeness proofs for a partial history. The current
view also checks global and per-method membership/counts and determines exposure
using the full readable history. A matching summary hash alone cannot establish
that incomplete rows reconcile with those counters and charts.

Therefore this stage deliberately retains the full-history verification barrier.
It does **not** label partial history complete, infer zeros, omit sessions, invent
`profileRevision`, or display a summary/chart before required verification.
`cumulativeProfileReader.ts` is unchanged: its bounded legacy snapshot/retry checks
cannot safely be removed for mutable, unversioned historical reads.

The independently safe improvement overlaps transfer of **at most one next page**
with ordered cryptographic folding of the current page. The next cursor comes
from validated actual row count and `next`, including short pages. Each response
is bound to UID, immutable generation, publication digest, expected offset and
total. Every existing row/receipt/epoch/duplicate check and final chain/profile/
coverage check remains. Ownership is checked before and after requests and hashes.
All prefetch rejections are handled even if the current page also fails. No late
promise publishes data; the hook retains its stale-account request fence.

Healthy loads make the same requests and return byte-identical transport data.
An invalid current page can have one already-started next request; its result is
never displayed. No partial cache survives retry, refresh or account switching.
Transfer remains O(N), ordered chain verification O(N), and a slow unavailable
page still prevents a complete verified snapshot. Further summary-first UI would
need a separately approved completeness/presentation contract; none is added here.

## Paired measurements

Sanitized Node **24.19.0**, same Windows machine, same four mixed journey variants,
same fixture bytes and same reader/DOM methodology for both versions. The five
pre-change source modules were captured before editing in the ignored local
`dist-stage2/stage4i-baseline.json`. The benchmark prints their SHA-256 identities
and fails if that snapshot is absent rather than substituting another baseline.
The preserved reference function is also available for independent unit tests.

Three paired zero-latency runs alternate variant order. Fixture construction and
server-aggregation emulation are outside reader timing. Before aggregation is
asserted identical to the fixture profile; each complete returned snapshot,
including maps, progress, scores and history, is deeply equal across variants.
Synthetic fetch is blocked globally; the injected transport clones real-shaped
rows, serializes/counts UTF-8 payloads and enforces the pinned generation.

Median milliseconds, with reader min–max across three runs:

| Sessions | Reader before | Reader after | Initial jsdom render before → after | Expand 10→20 rows before → after |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 461 (445–526) | 412 (406–455) | 731 → 662 | 331 → 285 |
| 500 | 2,831 (2,688–2,842) | 1,860 (1,710–1,982) | 2,214 → 2,172 | 284 → 381 |
| 1,000 | 7,216 (7,091–9,851) | 3,562 (3,439–3,782) | 3,779 → 3,666 | 352 → 320 |

History expansion performs **zero additional requests**, but growing charts/DOM
still cost time. The slower 500-session pagination median is retained: these runs
do not establish a universal pagination improvement or browser responsiveness.

| Sessions | Requests, both | History rows returned, both | UTF-8 response bytes, both | Median retained reader heap MiB before → after | Uncollected heap delta MiB before → after |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 6 | 100 | 641,851 | 0.91 → 0.96 | 25.14 → 20.51 |
| 500 | 26 | 500 | 3,096,110 | 5.04 → 5.04 | 26.01 → 54.05 |
| 1,000 | 51 | 1,000 | 6,164,316 | 10.03 → 10.05 | 42.88 → 102.83 |

Retained deltas use explicit GC with the returned snapshot still live; uncollected
deltas include temporary indexes and garbage. The indexed implementation has a
visible transient allocation tradeoff at 500/1,000 sessions, despite similar
retained snapshot size. Neither number measures peak browser memory. Whole-process
RSS varied approximately 228–653 MiB across these paired Node/jsdom runs; it
includes both bundles, fixtures and rendered tables, not just reader storage.

One additional paired sample with **100 ms injected delay per request**:

| Sessions | Reader before ms | Reader after ms | Requests before → after |
| ---: | ---: | ---: | ---: |
| 100 | 1,216 | 1,005 | 6 → 6 |
| 500 | 6,595 | 4,505 | 26 → 26 |
| 1,000 | 12,479 | 8,614 | 51 → 51 |

These are Node/jsdom and injected-delay results, **not browser measurements**,
network SLAs, backend capacity tests or billable-read estimates. History rows and
one status response are measured transport records. Actual Firestore document
reads for the 100/500/1,000 workloads are **NOT MEASURED**: the offline adapter
does not touch Firestore, and no existing backend capacity limit was raised.

The existing four-session loopback measurement was also executed against actual
demo Auth/Firestore and authenticated HTTP. Automatic 3/4 and Manual 1/3 sessions
passed through acceptance, aggregation, synthetic publication, the reader and
static dashboard markup. The sample measured **955 ms**, **2 HTTP requests**,
**56 transactional read operations and 91 returned Firestore document snapshots**.
Repeated metadata reads are included; nested SDK get/getAll calls are not counted
twice. This is not a billable-read estimate or a 100/500/1,000-session measurement.
Original receipts, exact scores, four evidence records, hidden Reflection and
unchanged quota documents were checked.

Raw local results: `dist-stage2/stage4i-measurements-0.json` (18 samples) and
`dist-stage2/stage4i-measurements-100.json` (6 samples). Reproduce in the current
workspace with the captured pre-repair snapshot:

```powershell
node scripts/run-sanitized.mjs --expose-gc scripts/run-stage4i-performance.mjs --runs 3
node scripts/run-sanitized.mjs --expose-gc scripts/run-stage4i-performance.mjs --runs 1 --latency 100
```

## Validation and remaining limits

- New equivalence/operation tests plus existing timestamp/repair regressions:
  **65/65 passed**.
- New reader/dashboard tests plus existing Stage 4G reader and Stage 4H dashboard
  regressions: **31/31 passed**.
- Broader evidence, profile, Training, outbox and backend completion regressions:
  **301/301 passed** across 20 fresh-process files.
- Frontend/backend TypeScript: **zero errors**. Backend and separate Stage 4G
  builds passed. Active server and completion graphs have **zero scalability
  imports**.
- Real loopback demo Auth/Firestore Stage 4G suite: **29/29 passed**, including
  concurrent acceptance/publication, worker takeover, real SDK retries, lost
  responses, deletion, origin revocation, account switching and hash corruption.
- Frontend production build: **passed**, retaining the existing chunk-size
  warning. `git diff --check` and new-file whitespace checks: **passed**.
- The retained reference exactly matches the captured original source after
  removing only its instrumentation and adjusting the import path.

No full unrelated suite or large backend benchmark was run. Interactive browser
performance/layout QA remains **NOT VERIFIED**. Full-history initial transfer,
retained history, chart/table DOM and context filtering still grow with N.
Independent production IAM/origin/revocation authority, real-student publication,
production-scale capacity, production rules verification and any future partial
history contract remain separate blockers. No migration, deployment, commit,
push, paid API call or production database access occurred.
