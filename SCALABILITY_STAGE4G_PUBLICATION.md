# Stage 4G — synthetic Emulator publication

This is a **local synthetic pipeline**, not production authority. Production admission remains `NOT VERIFIED`; production publication stays disabled. The original Stage 3B publisher still returns `NOT_PUBLISHED`. `server.js` and the active backend bundle have no scalability imports.

## Boundary and stored contracts

Only sanitized Node 24, `NODE_ENV=test`, the fixed `demo-edulience-phase2a` project and Auth `127.0.0.1:9099` / Firestore `127.0.0.1:18787` are allowed. The separate origin realm is also a demo project on that loopback Emulator. All existing Stage 4E flags, Stage 3A/3B flags and the additional `TRAINING_PUBLICATION_STAGE4G=synthetic-emulator-only` are required. Tokens, source payloads and Reflection are never logged.

Each operation authenticates the actual Emulator owner and checks the durable Stage 4B2 origin ledger. The owner must have the generated synthetic incarnation and a live Stage 4C guard result. Neither an arbitrary UID nor a matching caller-supplied hash grants access. Existing real users and unverified legacy accounts have no successful branch. This test boundary does **not** establish enforceable production IAM or independent origin trust.

New server-owned demo documents:

- `users/{uid}/learningProfiles/syntheticPublicationStage4g`: current synthetic pointer, atomically replaced.
- `users/{uid}/learningProfiles/syntheticGeneration-{generationId}`: create-only original publication record.

The protocol is `synthetic-emulator-publication-stage4g-v1`, status `synthetic-published`, authority `NOT VERIFIED`, and `productionPublication:false`. It binds the real root incarnation/epoch/fence, journal head, acceptance count, manifest/profile/inventory/artifact hashes, worker fence, checkpoint sequence and Stage 4D coordination state plus immutable enrollment manifest hash. Its hash-chained history commits each full evidence row and frozen session details. Publication records have their own `pointerVersion`; they are neither V1 completion receipts nor V2 acceptance receipts.

No root legacy profile, reservation, quota counter, completion receipt, admission record, `journalControl.published` or cumulative lifecycle fence is changed by publication. Manual completion details remain private source data and never enter objective aggregation.

## Pipeline and atomicity

1. Existing Stage 4E completion freezes and accepts Automatic 3/4 or Manual 1/3 journeys. V2 receipts are unchanged.
2. The existing durable Stage 3A worker has an additional explicit synthetic-owner option. Its default protected-account rejection is unchanged. The option requires the isolated boundary, genuine authenticated owner, lifecycle checks, persisted Stage 4D barrier and protected enrollment checks on every guarded operation.
3. The existing Stage 3B source verifier independently replays all acceptance batches, journal entries, archives, decisions, indexes, native evidence and automatic legacy snapshots at a pinned server read time. It rebuilds via the existing pure aggregator and compares every artifact. Training drafts/activity/streak metadata are not performance evidence and are preserved; the default verifier's legacy handling is unchanged.
4. A separate coordinator reauthenticates and performs fresh guarded reads. Its final transaction compares every relevant control/job/worker version, queries every expected source namespace and artifact collection in bounded pages, rejects missing/extra/changed records and verifies current Stage 4D coordination. These query reads also protect against phantoms during this transaction. It creates the immutable record and replaces the pointer atomically.
5. Competing acceptance, lifecycle changes or worker takeover invalidate the candidate. Identical simultaneous publishers recover the same original record. Interruption before commit writes neither document; loss of the successful response is recovered from the immutable record. An older already-published generation can be replayed after newer acceptance without moving the pointer backward. Deleted or revoked owners cannot recover or read through the service.

A completed ready job does not need a live worker lease: publication is a new independently guarded transaction, never a write authorized by an expired worker capability. Fresh worker/job version comparisons fence takeover. This permits recovery after the worker process or response is lost.

This stage uses a **synthetic snapshot seal** binding the existing Stage 4D control and enrollment seal to the final transaction's complete source verification. It does not forge a new trusted Stage 4D admission manifest or claim that the original empty enrollment inventory contains later accepted sessions. Persisted sealing barriers remain authoritative even without process flags; `sealing`, invalidated and revoked controls reject.

## Reader and dashboard

The separate loopback app exposes authenticated, `no-store`, bounded routes:

- `POST /api/development/profile/aggregate`
- `POST /api/development/profile/publish?generationId=...`
- `GET /api/development/profile/status`
- `GET /api/development/profile/history?generationId=...&after=0&limit=20`

UID is always token-derived. There is no owner parameter or client profile payload. History cursors are ordinals within an immutable published generation, not completion dates. The reader pins all pages to that generation/publication hash, verifies the typed publication/profile hashes and complete history hash chain, rejects duplicates or broken cursors, and only then presents reconciled totals. Display order uses actual completion timestamps; unknown metadata is kept unknown.

The four Stage 4F sections and privacy controls are reused. The dashboard separately labels accepted sessions, published sessions and sessions awaiting aggregation/publication **at the last refresh**. A V2 acceptance revision is never assigned to `profileRevision`; the legacy presentation `revision` remains null for this protocol. A clearly marked local-only action runs aggregation/publication. Empty, error and signed-out states remain available. Auth-user object checks fence every token lookup, fetch, page read, hash result and final return. Logout or account switching invalidates old readers and the dashboard resets private disclosure state.

## Local launch and tests

Use the existing isolated demo Auth/Firestore launcher and Stage 4B2 synthetic-owner provisioning. Do not use a real Firebase account or copy any production credentials.

```text
node scripts/run-sanitized.mjs scripts/build-stage4g.mjs
node scripts/run-sanitized.mjs scripts/run-stage4g-training.mjs
node scripts/run-sanitized.mjs scripts/run-stage4g-frontend.mjs
```

Profile URL: `http://127.0.0.1:5174/#/training/profile` (HashRouter). Sign in to a provisioned synthetic Emulator account. Complete Training, then explicitly aggregate/publish. This launcher does not enable the Stage 4F memory-fixture adapter.

```text
node scripts/run-sanitized.mjs scripts/run-stage4g-emulator-tests.mjs
```

The test runner probes both local Emulator ports and fails without fallback. Tests use synthetic complete journey fixtures, real Auth/Firestore, the real existing aggregator, real HTTP routes and actual browser Firebase SDK bindings. There are no paid API calls.

## Limits and production blockers

- Verification remains a full-generation rebuild. The final synthetic transaction has a 6 MiB source/artifact verification budget and 12,000-document per-namespace ceiling; records additionally obey actual document limits. Exceeding a budget rejects publication without deleting accepted source evidence. This does **not** establish 1,000-session production capacity or constant-cost CAS.
- History is read in bounded generation-pinned pages, with no old 100-record truncation. The frontend currently collects all pages before claiming complete reconciliation; large-history streaming/memory optimization remains future work. The local reader explicitly rejects over 10,000 sessions rather than silently truncating.
- Emulator Admin can cross realms and mutate stored records. External Auth/origin reads are not atomic with the application Firestore transaction. A revocation detected before a retry/final transaction rejects; external revocation occurring after its final independent read cannot be claimed atomically fenced. Production requires independently enforced IAM, origin/revocation admission, an approved production writer protocol and reviewed deployment/rules. This gap is why production authority remains `NOT VERIFIED`.
- No production migration, backfill, data access, IAM/rules change, endpoint activation or deployment is included. Published production rules remain outside this local verification.
- Real-browser visual QA is separate from Emulator/DOM integration tests and must be reported honestly when unavailable.

## Files changed in Stage 4G

New backend: `backend/scalability/syntheticPublicationBoundary.ts`, `syntheticPublication.ts`, `syntheticPublicationApp.ts`.

Existing isolated backend integration: `backend/scalability/shadowWorker.ts`, `publication.ts`. Default authority/publication behavior is preserved.

New frontend: `src/services/syntheticPublishedProfile.ts`.

Existing frontend integration: `src/services/cumulativeProfileReader.ts`, `localCumulativeProfileConfig.ts`, `localCumulativeProfile.ts`; `src/quiz/cumulativeProfileView.ts`; `src/hooks/useCumulativeProfile.ts`; `src/components/CumulativeProfileDashboard.tsx`; `src/pages/CumulativeLearningProfilePage.tsx`.

New tests: `src/services/syntheticPublishedProfile.test.ts`; `src/components/CumulativeProfileDashboard.stage4g.test.tsx`; `src/pages/CumulativeLearningProfilePage.stage4g.test.tsx`; `test-support/stage4gPublication.emulator.mjs`.

Existing test: `src/pages/Stage4FPreviewRouting.test.tsx` retains the real HashRouter and every route/content assertion. Its initial lazy-chunk DOM wait is now bounded at 10 seconds instead of 1 second: cold Windows module/Sass transformation took 3–5 seconds locally. No routing implementation was changed.

New scripts: `scripts/build-stage4g.mjs`, `run-stage4g-training.mjs`, `run-stage4g-frontend.mjs`, `run-stage4g-emulator-tests.mjs`.

Documentation: this file. Total: 23 files. Existing unrelated working-tree changes were preserved.

## Executed validation (26 October 2026)

- Sanitized Node **24.19.0**; fixed loopback demo Auth/Firestore only.
- Consolidated contracts/Training/completion/profile/privacy/routing/UI run: **680 passed, 33 files, zero failures**. Includes 20 new frontend tests, four real Assessment component integration variants, unchanged V1/V2 completion/outbox regressions, all existing scalability unit suites and 105-session paginated-reader validation.
- New Stage 4G Emulator suite: **18/18 passed**, then a targeted final run passed the enhanced four-journey/conflicting-retry scenario and the added non-synthetic-origin rejection scenario. **19 distinct Stage 4G tests verified** overall. Tests include actual SDK `ABORTED`, concurrent deletion, two publishers, acceptance races, immutable source/artifact mutation, phantom history, worker takeover, recorded origin revocation, lost response, crash recovery, ready-job lease expiry, empty accounts and real browser Firebase SDK bindings. No new quota charges or receipt/timestamp changes occurred.
- Existing focused Emulator regressions: Stage 3A **4 passed**, Stage 3B **5 passed**, Stage 4C **5 passed**, Stage 4D **6 passed**. Large Emulator benchmarks were not rerun.
- Backend typecheck, active backend build, separate Stage 3A/3B/4C/4D/4E/4G builds: **passed**.
- Production frontend build with `.env` loading disabled: **passed**, existing chunk-size warning remains.
- Frontend typecheck: **108 pre-existing errors**, 106 in `src/MIDSECTION/info_every_tips.tsx`, 2 in `src/pages/Library.tsx`; no Stage 4G errors.
- Active backend metafile: **0 scalability inputs**; `server.js`: no scalability imports.
- All 23 Stage 4G files have no trailing whitespace. Whole-worktree `git diff --check` still reports the two pre-existing unrelated whitespace lines in `AIRecomendation.jsx:501` and `section_of_each_tips.jsx:322`.
- Initial test-setup assertions were corrected (the protected `cumulative` document is a lifecycle fence, not a profile; deletion requires the actual writer context). Final tests pass. No unrelated full-suite failures were repaired or reclassified; the full suite was not rerun.
- Real interactive-browser desktop/mobile visual QA: **NOT VERIFIED**. The browser Firebase SDK and DOM tests are not screenshots or interactive browser testing.

No production Firebase, paid API, migration, deployed-rule change, commit, push or deployment was used.
