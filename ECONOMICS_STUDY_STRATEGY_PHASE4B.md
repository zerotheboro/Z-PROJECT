# Economics Phase 4B — Your Study Strategy

Local frontend integration of the unchanged Phase 4A deterministic engine. No Phase 5 feedback loop, production activation, backend change, paid API call, database write, migration or rules change.

## Actual route and placement

The application uses HashRouter. The student-facing route is `/#/training/profile`, rendered by `LearningProfilePage.tsx`. Its ordinary latest/saved-history dashboard and locally gated cumulative dashboard are separate existing renderers. Both now accept the same strategy section, placed before Overview, method evidence/rankings and history. Their four existing sections and scores are preserved. The genuine empty latest-profile page also offers the strategy section.

The section is **development-only** (`import.meta.env.DEV`); it is not loaded by production builds. Accepted-data loading additionally reuses the existing loopback demo Auth/Firestore configuration checks. With those gates unavailable, the ordinary local profile shows an honest unavailable state rather than reading production evidence or deriving personalised advice from legacy scores. Anonymous synthetic fixtures are not presented as an authenticated student's strategy.

Using the existing Stage 4E/4G development setup:

- `http://127.0.0.1:5174/#/training/profile` — current local demo account's cumulative profile.
- `http://127.0.0.1:5174/#/training/profile?view=latest` — existing latest/saved-history profile, with the same local accepted-evidence strategy reader.
- Launch frontend with sanitized Node 24: `node scripts/run-sanitized.mjs scripts/run-stage4g-frontend.mjs`. The existing separate synthetic backend and demo Emulators must also be available. This task did not activate them or create accounts.

## Evidence integration

1. The current account is supplied by the existing profile authentication hooks. The strategy additionally fences reads by **both UID and exact Firebase User instance**, with a request-generation token and cleanup. Late success/error callbacks, logout, account changes and old readers cannot populate a new owner's advice.
2. `getLocalCumulativeProfileReader` remains the only loader. It checks demo project, loopback Auth/Firestore endpoints, transport settings and current owner. No new database queries or endpoints were added.
3. The two existing frontend readers previously discarded the raw objective sidecar when producing display history. A narrowly scoped, optional **read-model field** now retains reconciled active sources after the existing summary/receipt or generation/hash/coverage checks. This is not an evidence-acceptance, receipt, publication or persisted-data contract change.
4. The handoff omits Reflection/completion details and unrelated payload fields. Legacy browser assessments and individual-practice payloads are not converted into native evidence. Persisted historical accepted sources without objective metadata remain unknown, as required by Phase 4A.
5. The panel calls `recommendEconomicsStudy` with the current owner, selected whole topic and only those accepted source rows. No-history advice requires a confirmed empty accepted read; failed/partial reads do not become empty history. A published-generation recommendation uses that verified generation only and discloses newer accepted sessions still pending.
6. If sessions are accepted but no readable generation exists in the synthetic published reader, advice is unavailable. It does not substitute browser outbox data or pretend those sessions are published. Full generation-pinned pagination, hash folding, coverage and existing safety ceilings are unchanged.

The existing engine is unchanged. It determines focus, method, action, reasons, source references, strength and limitations; the UI translates those into student-facing labels. It does not interpret a method's sequential score as personal effectiveness or infer independent improvement from repeated familiar questions.

## Verified rendered outputs (jsdom, not browser screenshots)

**PPC fixture** — a canonical wrong spare-capacity answer in accepted Memory Palace evidence renders:

- Your Study Strategy / Economics topic.
- Review this concept: **Distinguish utilisation from capacity**.
- Try **Feynman Technique**.
- A specific action naming the reviewed spare-capacity question and expandable canonical HOW steps.
- **Limited recorded answer evidence**, explanation of task suitability, a carryover/repeated-question caution and source-labelled supporting tasks.

**Elasticity fixture** — a canonical wrong expenditure answer renders:

- **Relate PED to expenditure**.
- Try **divide steps** (the existing registry's display name).
- The reviewed price/quantity expenditure question, canonical Divide Steps procedure and a calculation-based explanation.

**Confirmed empty or missing-objective history** renders a **Task-based suggestion · not personalised performance evidence**. Legacy-only records are not upgraded. Invalid/unsupported source metadata renders an insufficient-evidence state while existing history remains accessible.

Raw objective, session, form, journal and generation IDs are not printed in this section. Source references are shown as human-readable phase, method, completion date and recorded answer status. Private Reflection is never included in the strategy handoff or rendered by it. Existing history's deliberate Reflection disclosure is unchanged.

## Interaction and branding

The only content selector is a whole Economics topic; no objective-selection screen was added. The section shows concept names, method, next action, explanation, evidence strength, prominent limitations and optional source/HOW disclosures. Loading, refresh, retry, unavailable, no-history and insufficient-evidence states are distinct.

`Open Training` links to the **existing `/training` entry**, with no forced method, route state or frozen allocation. That page does not currently support a safe topic/method deep-link contract. The section therefore tells the student to choose the topic normally and states that the method is a suggestion. Quotas, AI eligibility, draft recovery, reservations and session checks remain on their existing paths.

Styles are scoped to this section and use Edulience's existing CSS variables, heading/body fonts, colours, native disclosure arrows and button design. The two-column desktop card stacks below 700px; native select/summary/link controls have explicit labels and focus outlines. Actual desktop/mobile layout, contrast and screen-reader behaviour still require browser QA.

## Files changed

Added:

- `src/components/YourStudyStrategy.tsx`
- `src/components/YourStudyStrategy.scss`
- `src/hooks/useStudyStrategyEvidence.ts`
- `src/pages/LearningProfileStrategy.test.tsx`
- `src/services/studyStrategySources.test.ts`
- `test-support/economicsStrategyUIFixtures.ts`
- This document.

Updated:

- `src/pages/LearningProfilePage.tsx`
- `src/pages/CumulativeLearningProfilePage.tsx`
- `src/components/LatestProfileDashboard.tsx`
- `src/components/CumulativeProfileDashboard.tsx`
- `src/services/cumulativeProfileReader.ts`
- `src/services/syntheticPublishedProfile.ts`
- `src/services/syntheticPublishedProfile.test.ts`

Existing uncommitted work is preserved. Phase 3 acceptance, Phase 4A policy, scoring, ranking, quotas, billing, aggregation, canonical methods and Training routing were not edited.

## Verification and production-gate status

Tests use sanitized Node 24, synthetic canonical fixtures and injected authenticated readers. They cover actual profile-route rendering, PPC/Elasticity, whole-topic changes, empty/legacy/missing data, unsupported records, account switching and rapid A→B→A callbacks, logout, error/retry, same-owner refresh, native keyboard controls, source redaction, normal Training navigation, original scores and existing profile/history features. Reader regressions verify generation pinning, corruption rejection, account fencing and accepted/pending/published separation. Training completion and 3/4-selection regressions are also run.

Final results: **199 distinct tests passed across 20 files**, including 15 new actual-profile UI tests and four new source-handoff tests. The last focused rerun passed all 19 new tests. Frontend and backend typechecks passed with zero errors; both builds passed. Vite retains the existing >500 kB chunk warning. Scoped whitespace checks passed. The production assets contain neither the new strategy markup nor its styles, and the active backend build contains zero scalability imports. Initial test failures from the lazy module's cold-load timing and a case-sensitive assertion against the existing `divide steps` registry name were corrected without changing product logic or increasing test timeouts.

**Browser QA NOT VERIFIED:** browser access host unavailable. No desktop/mobile screenshots, layout pass or screen-reader pass is claimed from jsdom.

**Firestore/Auth Emulator QA NOT VERIFIED:** the existing isolated runner exited because pinned `test-support/firestore` Firebase CLI dependencies are missing. It explicitly refused production fallback. No live database/Emulator transaction or rules pass is claimed.

This implementation is ready for independent local review and production-gate assessment, **not production activation**. Remaining gates include actual browser/mobile/accessibility QA, live demo Auth/Firestore verification, the existing independent origin/IAM/admission/publication approvals, and an authorised genuine-account accepted-evidence rollout. Legacy-only genuine accounts do not acquire personalised accepted-evidence recommendations through this change. Current genuine admission remains NOT VERIFIED and production publication remains disabled.
