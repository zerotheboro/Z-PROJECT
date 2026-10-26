# Stage 4F: isolated cumulative Learning Profile frontend

This stage reuses `/training/profile`, the four existing dashboard sections and
their scoped design. It does not activate a production reader or publisher.

## Local activation

Run the existing demo Auth/Firestore Emulators and Stage 4E backend using the
sanitized Node 24 scripts. Start the frontend with:

```
node scripts/run-sanitized.mjs scripts/run-stage4f-frontend.mjs
```

- `http://127.0.0.1:5174/#/training/profile`: the current authenticated demo owner's
  real server-readable evidence and browser completion checkpoints.
- `http://127.0.0.1:5174/#/training/profile?preview=synthetic`: explicitly labeled UI fixtures. Student
  A, Student B, empty and malformed histories plus ready/delayed/error scenarios
  require no login and never write to any account, IndexedDB or localStorage.
- `http://127.0.0.1:5174/#/training/profile?view=latest` preserves the existing latest-snapshot page.

The application uses HashRouter: browser URLs include `/#/` before the route,
and the preview/query parameters follow that hash route. In-app React Router
`Link` targets remain `/training/profile?...`; HashRouter creates the browser URL.

Stage 4F requires the existing local completion, protected V2 and Phase 2C flags
plus `VITE_CUMULATIVE_PROFILE_STAGE4F=emulator-only`. The launcher sets these only
in its isolated process and disables `.env` loading. Production `DEV=false`, a
remote host, a non-demo Firebase project or a mismatched SDK transport cannot
enable the reader. No production endpoint or published rule was changed.

## Data binding

`acceptedProfilePreview.ts` validates native evidence ownership and exact V2
receipt shape, payload-hash association, mode, session/document identity, epoch
and unique acceptance revision. Identical records deduplicate; conflicting,
foreign or malformed records cannot produce totals or trends. Native automatic
compatibility snapshots are not counted again. Unlinked historical snapshots
remain separately labeled, with uncertain coverage.

The adapter uses the existing pure Phase 1 aggregator to make an explicitly
read-only local projection. It never stores this result, creates a receipt,
changes a score or assigns `profileRevision`. The projection's `revision` is
null. `acceptedRevision` remains acceptance ordering and never determines the
chronological learning history. No journal inventory authority is inferred.

The actual reader uses owner-only `learningEvidence`, `assessments` and the
permitted `learningProfiles/cumulative` root. It does not read private journal
controls or source indexes. All SDK reads must be server-confirmed. Preview
loads bracket history with repeated evidence/legacy reads; changed snapshots
retry up to three times. This is a bounded preview consistency check, not an
atomic published-generation proof. The existing 100 records per collection,
3 MiB history and 20-second timeout limits fail closed instead of truncating.

Accepted evidence, browser-only pending work, backend-acknowledged cleanup and
unavailable storage have separate labels. Every Stage 4F projection says that
publication is unavailable and trusted admission is `NOT VERIFIED`. Fixtures
explicitly say they are not actual acceptances and do not inspect browser storage.

## Dashboard interaction

- Overview: readable accepted session/method/observation counts; no invented
  publication, mastery, causal claim or effectiveness ranking.
- Method evidence: original method scores and conditions, session counts and
  separately disclosed personal ratings; Lab/Match are not independent attempts.
- History: completion dates in descending chronological order, unknown dates
  last, Automatic and Manual shapes, method/score/context rows and 10-record
  incremental display pagination. Pagination never changes full-history counts.
- Progress: existing strict comparable-condition/exposure grouping, SVG names
  and exact-value table alternatives. Unknown/different conditions never pool.
- Subject/topic filters narrow records and trends; overview and method totals
  remain explicitly labeled as covering all contexts. Unknown context is never
  fabricated. Changing subject resets topic and pagination.

Auth changes clear old data and fence all late responses. Dashboard remounts
clear private Reflection disclosures. Fixture student/scenario switches and
refresh likewise remove prior data immediately and cancel late fixture results.

## Verification and remaining boundaries

Use `scripts/run-stage4f-emulator-tests.mjs` through `run-sanitized.mjs` against
the dedicated loopback demo Emulators. It creates synthetic protected owners,
uses the real Stage 4E reservation/acceptance HTTP flow, and loads results through
the actual Firebase browser SDK and frontend reader under owner-only rules.
It never falls back to production, installs rules or changes security permissions.

Browser controls were unavailable in this environment (native pipe unavailable;
browser inventory empty and in-app browser creation unavailable). Desktop/mobile
visual QA and actual keyboard/screen-reader testing are NOT VERIFIED. Component
tests cover controls, accessible chart/table markup, privacy and state changes;
they do not replace that visual QA.

Real-student activation remains blocked on independent audit, visual QA,
authoritative origin/IAM admission, inventory/generation publication, scalable
history reads and approved production rules/deployment. No Phase 4G or production
activation is included in this stage.

## Files in this stage

Modified existing local frontend files:

- `src/quiz/cumulativeProfileView.ts`
- `src/services/cumulativeProfileReader.ts`
- `src/services/localCumulativeProfile.ts`
- `src/services/localCumulativeProfileConfig.ts`
- `src/components/CumulativeProfileDashboard.tsx`
- `src/components/CumulativeProfile.scss`
- `src/pages/CumulativeLearningProfilePage.tsx`
- `src/hooks/useCumulativeProfile.ts`

Added:

- `src/services/acceptedProfilePreview.ts`
- `src/services/acceptedProfilePreview.test.ts`
- `src/services/syntheticProfilePreview.ts`
- `src/components/SyntheticProfilePreview.tsx`
- `src/components/SyntheticProfilePreview.test.tsx`
- `src/pages/Stage4FPreviewRouting.test.tsx`
- `scripts/run-stage4f-frontend.mjs`
- `scripts/run-stage4f-emulator-tests.mjs`
- `test-support/stage4fProfile.emulator.mjs`
- `SCALABILITY_STAGE4F_FRONTEND.md`

## Local validation results

- Broad frontend, profile, privacy/routing, Foundation and Training regression run:
  226 passing tests. Final changed-file regression run: 73 passing tests,
  including the extra strict preview-opt-in case added afterward. These runs
  overlap and their counts must not be added together.
- Three real demo Emulator tests pass. All four Automatic 3/4 and Manual 1/3
  shapes accumulate, identical retry produces no duplicate evidence, quota
  counters remain unchanged during reads/retry, client profile writes and
  cross-owner reads are denied, and logout/another Auth owner cannot reuse a
  captured reader. No rule files are installed by this suite.
- Frontend production build passes with the existing large-chunk warning.
  Backend typecheck/build passes; its metafile contains zero scalability inputs.
- Frontend typecheck retains 108 existing errors, zero in Stage 4F files.
- Stage 4F files pass whitespace checks. Whole-tree `git diff --check`
  still reports the pre-existing trailing whitespace in
  `src/MIDSECTION/AIRecomendation.jsx:501` and
  `src/MIDSECTION/section_of_each_tips.jsx:322`.
- Full application tests and expensive scalability benchmarks were not rerun.
  Actual desktop/mobile/keyboard/screen-reader browser QA remains NOT VERIFIED
  for the tool-availability reasons above; no screenshots are claimed.

## Focused final repairs

The launcher and all browser instructions now use HashRouter URLs, including
`http://127.0.0.1:5174/#/training/profile?preview=synthetic`. The old pathname-only
URL still selects Home, as required by the unchanged routing architecture.
`Stage4FPreviewRouting.test.tsx` reads the exact advertised URL from the launcher
and renders the actual AppRouter, LearningProfilePage, cumulative page and
synthetic dashboard. Only unrelated routes and Auth hooks are mocked. It verifies
all four dashboard sections and confirms the fixture view does not load an
authenticated profile. A separate regression retains the old pathname behavior.

SVG accessible names and exact-value table captions now include the actual
subject, topic, method, Lab/Match phase and Test Me/Test Methods source. Missing
metadata is labeled `Subject not recorded` or `Topic not recorded`; no topic is
inferred. The chart data, comparison rules and visible method headings are
unchanged. New accessibility tests cover Biology/Mathematics, three topics, two
methods and both phases, plus nullable topic metadata. Before repair, 12 charts
had only four distinct accessible names; afterward all 12 names/captions differ.

Files changed for this repair: `scripts/run-stage4f-frontend.mjs`, this document,
`src/components/CumulativeProfileDashboard.tsx`, its `.test.tsx`, and new
`src/pages/Stage4FPreviewRouting.test.tsx`.

Validation: all 16 targeted routing/dashboard tests pass, and the broader final
run passes 231 tests across 18 files. Frontend production build and backend
typecheck/build pass; the active backend contains zero scalability imports.
Frontend typecheck retains the existing 108 unrelated errors, with no diagnostics
in the repair files. Browser discovery returned no browsers and in-app browser
creation was unavailable, so desktop/mobile visual QA remains NOT VERIFIED.
Trusted admission remains NOT VERIFIED and publication remains disabled.
