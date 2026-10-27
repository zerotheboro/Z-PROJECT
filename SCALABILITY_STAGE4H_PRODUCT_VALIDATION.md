# Stage 4H — isolated product validation and polish

No production activation. Genuine admission remains **NOT VERIFIED** and genuine
publication remains disabled. No backend contract, endpoint, quota, scoring,
billing, deployed rule or migration changed. Existing uncommitted Stage 4G
repairs are preserved.

## Changes

- `src/MIDSECTION/info_every_tips.tsx`: explicit class, asset, English-content,
  saved-tip, quiz and setter types; correct React attribute spellings. Preserve
  `header.eng`, object defaults, the historically ignored seventh constructor
  argument, citations, content, ordering, quiz behavior and storage keys. This is
  the TypeScript copy resolved by the checker; the runtime `.jsx` file is untouched.
  Type erasure produces the identical pre-cleanup program after normalizing only
  equivalent React attribute names. No error suppression or compiler weakening.
  `Library.tsx` needs no edit: its two callback errors disappear through the
  correctly typed return value.
- `src/components/CumulativeProfileDashboard.tsx`: memoize `ProgressChart` with
  React's default shallow comparison. Expanding history does not recalculate
  unchanged chart points/date tables. Fresh generation objects still update
  charts. No custom comparator, cached account data, changed scores or styling.
- `src/components/CumulativeProfileDashboard.stage4h.test.tsx`: five product
  regressions for mixed journeys, evidence associations, filters, pagination,
  explicit Reflection disclosure, refresh, delayed ownership changes, interrupted
  reads and chart reuse/refresh.
- `test-support/stage4hProfileFixture.ts`: strictly test/measurement-only,
  explicitly synthetic mixed Automatic 3/4 and Manual 1/3 histories. Existing
  evidence validation, aggregation and reader hashes are reused. No Firebase
  writes or claim of authority.
- `scripts/run-stage4h-performance.mjs`: reproducible offline reader, static
  markup and jsdom measurements. Firebase initialization and fetch are blocked.
- `scripts/run-stage4h-emulator-profile.mjs`: reproducible fresh synthetic
  four-journey account, actual acceptance/aggregation/publication/HTTP reader and
  transactional snapshot measurements using loopback demo Auth/Firestore only.
- This report.

## Journey and usability evidence

The existing 29-test Stage 4G Emulator suite passed. It includes Automatic 3/4 and
Manual 1/3 completion, V2 accepted receipts, pending then synthetic publication,
duplicate/conflicting retries, lost responses, backend reconstruction, pinned
history, deletion, revocation, account switching and no extra quota charges.
These are automated fixture-based completions through the actual services, not
manual browser exercise of every question. Existing Assessment integration tests
exercise the real component/controller through Baseline, experiments, verification
and Reflection, including protected V2 three/four-method routes.

The new DOM product checks use the real cumulative reader/view/dashboard. All four
sections, mixed method counts, exact method/subject/topic/phase/score associations,
comparable-only charts, history expansion, filters, refresh, private Reflection
and transient read recovery are checked. Existing routing, empty/loading/error,
keyboard skip-link, account/privacy and durable completion tests are also run.

**Interactive browser QA: NOT VERIFIED.** The native Computer Use pipe is
unavailable and browser inventory was empty. No desktop/mobile screenshots,
actual screen-reader inspection, real-browser layout, focus traversal or touch
interaction is claimed. jsdom, static markup and real browser Firebase SDK tests
are not substitutes for those checks.

## Performance observations

Sanitized Node 24.19.0 on the local Windows workspace. Values below are observed
single-run samples, not SLAs, browser timings, production capacity or billed-read
estimates. Background load and runtime pauses affect absolute times. Fixture
construction/aggregation/hashing is measured separately from reader time.

Before chart memoization, the offline adapter measured:

| Sessions | Reader ms | Transport requests | History rows | UTF-8 payload bytes | Heap delta MiB | History expansion ms (jsdom) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 33 | 2 | 4 | 44,689 | 3.76 | n/a |
| 100 | 154 | 6 | 100 | 641,851 | 24.60 | 278 |
| 500 | 962 | 26 | 500 | 3,096,110 | 25.70 | 488 |
| 1,000 | 2,735 | 51 | 1,000 | 6,164,316 | 41.58 | 1,046 |

The same 100-session workload with an injected **100 ms per request** measured
777 ms reader time over six requests, compared with 154 ms without delay. This
simulates sequential transport latency; it is not a real throttled network.
Interrupted requests reject instead of displaying a partial profile; identical
pinned retries recover the same generation.

An initial post-memoization sample observed history expansion at 236 ms (100),
185 ms (500), and 234 ms (1,000). The deterministic regression separately checks
that unchanged chart tables are not recomputed, and that new generation data
does render. Measurements do not justify a guaranteed speedup ratio.

The final standalone rerun, with every fixture completion before its synthetic
publication timestamp, recorded the following. The substantial timing variation
is retained here rather than selecting only the faster run:

| Sessions | Reader ms | jsdom initial render ms | History expansion ms | Requests | Heap delta MiB | Process RSS MiB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 107 | 422 | n/a | 2 | 3.76 | 163.68 |
| 100 | 620 | 1,341 | 523 | 6 | 24.82 | 247.22 |
| 500 | 3,229 | 3,636 | 531 | 26 | 25.72 | 310.30 |
| 1,000 | 12,325 | 4,895 | 400 | 51 | 42.28 | 399.47 |

At 100 sessions with the same injected 100 ms/request delay, this rerun measured
1,187 ms initial reading and 502 ms history expansion. Payload sizes and returned
record counts matched the earlier run. RSS is for the whole Node/jsdom process;
heap deltas are reader allocations after explicit GC, not browser peak memory.
Initial loading at 1,000 sessions is a material remaining product-performance
concern. Chart reuse does not resolve it, and no safety limit was increased.

The real loopback four-session measurement passed all four journey variants and
read the synthetic published profile via two authenticated HTTP requests in
**1,066 ms**. Instrumentation recorded **56 transactional read operations and 91
returned document snapshots**, including repeated metadata/origin/lifecycle
reads. This excludes nontransactional Auth operations and is not a count of
unique documents, RPCs or billable Firestore reads. Async-local instrumentation
avoids double-counting nested SDK get/getAll calls while retaining parallel reads.
Duplicate completion/publication retries preserved original receipts, four
evidence records and unchanged quota documents.

The final composed rerun also passed the actual returned Emulator profile into
the real dashboard renderer: all four sections, original per-method scores and
hidden Reflection text were verified in static markup. Its reader sample was
2,039 ms, with the same 56 transactional operations/91 returned snapshots and two
HTTP requests. This is service-to-reader-to-component composition, not browser
visual QA; CSS and frontend Firebase initialization are excluded from the static
rendering harness.

Bounded costs: a history response contains at most 20 rows, immutable generation
pinning remains intact, and the initial visible history is 10 rows. Growing
costs: the reader fetches **all N rows** before exposing a verified snapshot
(`1 + ceil(N / 20)` requests), validates/hashes/reconciles all history, and retains
that history in memory. Comparable chart points/tables grow with observations.
History expansion adds 10 visible rows; memoization removes unchanged chart
recomputation but does not make initial loading, filtering or rendering constant
cost. The 1,000-session **frontend adapter** test does not prove that the existing
full-generation Emulator backend can accept/publish that history within its
unchanged capacity limits.

## Reproduction commands

Use the pinned Node 24 executable in this workspace, abbreviated as `node` here:

```powershell
node scripts/run-sanitized.mjs --expose-gc scripts/run-stage4h-performance.mjs
node scripts/run-sanitized.mjs scripts/run-stage4h-emulator-profile.mjs
node scripts/run-sanitized.mjs node_modules/vitest/vitest.mjs run --maxWorkers=1 src/components/CumulativeProfileDashboard.stage4h.test.tsx
node scripts/run-sanitized.mjs node_modules/typescript/bin/tsc --noEmit
```

The Emulator command requires the existing isolated demo Auth/Firestore launcher
on 127.0.0.1:9099/18787. It explicitly refuses an unavailable Emulator and uses
only the fixed demo project. It is not imported by the active server or frontend.

## Remaining activation blockers

Interactive desktop/mobile/accessibility QA remains required on a supported
browser. Independent production origin/IAM/revocation authority is unresolved.
Production-scale publication, initial-reader costs, memory and real-device/network
performance remain unproven. Published production rules and production IAM were
not accessed or verified. This stage grants no deployment or real-student
publication approval and changes none of the existing safety limits.

## Executed checks and run limitations

- Frontend TypeScript: **108 errors before, zero after**. Full `tsc --noEmit`
  passes; the two Library errors were downstream inference errors.
- Backend typecheck/build and separate Stage 4G build: passed. Final frontend
  production build with `.env` loading disabled: passed with the existing
  chunk-size warning. The active server and completion bundle each have **zero
  scalability inputs**.
- Real demo Auth/Firestore Stage 4G suite: **29/29 passed**. The additional
  instrumented four-journey reader measurement also passed all identity, quota,
  receipt and history assertions.
- New Stage 4H tests: **5/5 passed**, including chart reuse followed by a refresh
  containing new observations. No timeout or product capacity limit was raised.
- Combined focused test batches were unstable: one recorded 156/159 passes with
  three failures in two existing files. Both files passed unchanged on immediate
  isolated rerun (five tests). Another batch reported an existing publication
  button timeout and privacy-worker startup failure; the corresponding unchanged
  files passed 12/12 on isolated rerun. These failures are disclosed rather than
  relabeled as the historical unrelated full-suite failures.
- A final repeat with **one fresh process per file passed all 159 tests across
  14 files**, zero failures, retaining the default timeouts. This verifies the
  focused cases but does not explain or erase the earlier shared-run instability.
- Initial new test-harness mistakes (raw rather than encoded select values, and
  a mocked native date constructor) were corrected. Broad interaction coverage
  was split into focused tests; the production behavior and default timeouts were
  retained. The first measurement omitted the required explicit synthetic origin
  identity form; the corrected script uses the existing strict contract.
- The unrelated full suite and production-scale backend benchmarks were not
  rerun. No new conclusion is drawn about the previously reported 15 failures.
- `git diff --check` passes. Existing Stage 4G modifications are preserved.

## Targeted repairs after independent Stage 4H review

This follow-up changes only these five files, preserving the earlier worktree:

- `src/MIDSECTION/info_every_tips.tsx`
- `src/components/CumulativeProfileDashboard.stage4h.test.tsx`
- `scripts/check-study-tip-types.mjs` (new)
- `test-support/studyTipConstructor.type-cases.mjs` (new)
- This report.

### Constructor omission safety

Before the repair, all 14 invalid compiler examples were accepted, including
`new DetailOfTips<TipHeader, TipParagraph>()`. Its actual defaults are the strings
`"header"` and `"p"`, not English-content objects. The earlier "object defaults"
description above must not be read as changing those runtime defaults.

The public constructor signature now permits omission/undefined only when the
corresponding default literal is assignable to its generic type. Otherwise it
requires an explicit value. `NoInfer` keeps this validation from widening the
types inferred from supplied arguments. Object, literal, mixed-union and
contextual `StudyTip` cases are covered. The constructor implementation, existing
default assertions and historical ignored seventh argument remain unchanged; no
new casts or suppression directives were added.

The dedicated check creates temporary positive and negative compiler projects
outside the repository and removes them afterward. **16 valid constructions
compile; all 14 invalid constructions fail**. The original omitted-object example
now reports **TS2345**. Expected negative diagnostics do not enter the application's
typecheck. Executing the actual isolated constructor confirms the exact defaults,
explicit object identity and remaining arguments. Type-erased constructor output
matches the unchanged Library `.jsx` runtime. Comparing the complete type-erased
tips program against HEAD, allowing only the prior equivalent React attribute
spellings, also confirms identical content, citations, handlers and ordering.

Reproduce with sanitized Node 24:

```powershell
node scripts/run-sanitized.mjs scripts/check-study-tip-types.mjs
```

### Focused dashboard tests

The earlier five-test file is now seven focused tests. The expensive combined UI
scenario is split into section headings, pagination/reset, subject/topic filters
and deliberate Reflection disclosure/refresh. Role queries are scoped to the
relevant form, header, history, progress section or session details. The headings
and privacy cases use four sessions, still including all Automatic 3/4 and Manual
1/3 variants; pagination/filter cases retain fourteen sessions. Exact evidence
associations, ownership/interruption retry and chart memoization/new-data
invalidation assertions are retained. No product code, assertion or timeout was
removed to make the tests pass.

The independent review's original combined case exceeded 5,000 ms (5,759 ms).
After splitting, five fresh isolated executions passed **35/35 tests**, with
slowest individual cases of **744, 723, 731, 735 and 895 ms**, respectively. The
default five-second test timeout is unchanged. These are Node/jsdom observations,
not real-browser performance measurements.

### Executed repair validation

- Compiler contract: **16 positive and 14 negative cases passed**, plus runtime
  default/explicit-value and emitted-constructor compatibility checks.
- Repeated Stage 4H dashboard checks: **35/35 passed**, zero failures.
- Existing Library-section and Stage 4F/4G/profile regressions: **84/84 passed**
  across twelve files, each in a fresh process with the original timeouts.
- Full frontend and backend typechecks: **zero errors**.
- Frontend production build with `.env` loading disabled: **passed**, retaining
  the existing large-chunk warning. Backend build: **passed**.
- Active server and completion bundle checks: **zero scalability inputs**.
- `git diff --check`: **passed**. Existing unrelated modifications are preserved.

No backend dependency or production execution path changed. Genuine admission
remains **NOT VERIFIED**; production publication remains disabled. The known
all-history initial read and growing repeated-exposure work remain outside this
repair. Interactive browser QA and production IAM/origin verification remain
unverified. The full suite and its previously reported unrelated failures were
not rerun or reclassified. No Emulator, production data, deployment, migration,
commit or push was used for these focused repairs.
