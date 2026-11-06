# Economics Phase 5A — recommendation follow-through

Isolated local implementation. No durable recommendation receipts, new collection, backend endpoint, acceptance-contract change, database write or production activation. The Phase 4A recommendation policy is unchanged.

## Behaviour and evidence distinctions

The Learning Profile still calls the existing deterministic engine on the latest verified, owner-scoped source snapshot. A separate follow-through report compares that snapshot with a local earlier recommendation observation:

| Signal | What establishes it | What it does not establish |
| --- | --- | --- |
| Suggestion displayed | A committed render of the strategy in this browser session; local clock. | Reading, understanding, durable delivery or server authority. |
| Training opened | Unmodified primary activation of the normal Training link arms a short-lived local handoff; the actual `/training` route observes arrival for the same Firebase User instance. | Starting/reserving a session, attempting a method, completing an assessment, or following advice. |
| Method attempted | The suggested method appears in the canonical activity details of a newly visible accepted native session. | Independently observed effort or method fidelity; completion is still client-reported. |
| Target assessed | Actual **scored** canonical answers cover the target objective. Presentation, plans, formative practice and completion totals do not create this claim. | Full objective mastery, or objective-specific correctness on a multi-objective question. |
| New performance | New accepted activity contains recorded scored answers; original correctness is retained. | Demonstrated improvement, independent corroboration or a causal method effect. |
| Qualified matching activity | Topic, method, target assessment and content/mapping/activity versions match **in the same activity**, the acceptance revision exceeds the earlier source cutoff, and reported session start is strictly after the local display time. | Proof the recommendation was followed, true chronology from independent clocks, or causality. This is reported-sequence consistency only. |

Another method, objective or topic is reported as such, never as intentional disregard. No new accepted identity means no new accepted evidence, even after opening Training or retrying a completion.

## Snapshot and ordering integrity

The existing readers preserve their receipt, owner, lifecycle, summary, full hash-chain, generation pinning and coverage checks. Their frontend-only strategy handoff now also carries a V2 acceptance cutoff where available:

- Accepted-history preview: cutoff from the complete readable V2 receipts, explicitly labelled `visible-v2-receipts`.
- Synthetic published reader: the independently read **current accepted journal head**, not merely the older displayed generation's last receipt. This prevents previously accepted-but-pending records from being labelled later acceptance when they finally become visible.
- Historical V1 completion receipts retain their original `profileRevision`. It is never used as an acceptance revision. Without the relevant V2 ordering information, follow-through remains inconclusive.

“Newly visible” is distinct from “accepted after the earlier source snapshot,” which is still distinct from “started after the recommendation.” Acceptance/journal order is never learning chronology. Tied, missing, overlapping or earlier reported starts cannot qualify as a matching subsequent activity. Outside learning is always unknown.

Duplicate identities count once. Before comparing, the module revalidates owner-scoped Phase 3 objective history. It retains canonical signatures of previously seen native core/sidecar/receipt data; removal, substitution or mutation fails closed. Conflicting identity, epoch or cutoff information is withheld. Local signatures are change detectors, not a source of IAM/origin authority. Existing trusted readers and server-owned immutable records remain the authority boundary.

Responses to familiar questions are explicitly marked non-independent. Prior method/objective carryover remains visible, including Memory Palace followed by Feynman. Baseline remains post-study; Lab and selected Match remain separate activity stages. Correct/incorrect counters refer to whole scored questions covering the target, not a new objective score or a cross-method performance formula. The report always returns `demonstratedImprovement: not-established`, `causalMethodEffectiveness: not-established` and `recommendationIntent: unknown`.

## Local lifecycle and UI

One active topic comparison is kept in process/tab memory, keyed by the **exact authenticated User object**, not just a UID. It survives ordinary SPA navigation to Training and back. A topic switch starts another comparison. Reload, tab closure, sign-out, a new auth instance or account switching resets it; nothing is restored as a fabricated receipt. The existing auth subscription/login/logout adapters only clear/rotate this **development-only** cache; authentication, tokens and permissions are unchanged.

The first shown suggestion is the comparison point. If later evidence changes the displayed advice, the panel identifies the earlier comparison focus separately from the latest recommendation. Clicking the Training link re-anchors to the suggestion actually on screen. The click only arms navigation; the route arrival records opening. Abandoned handoffs expire after ten minutes; modified/new-tab link activations do not arm a handoff.

The normal Training route receives no forced method, topic, allocation or new query/state contract. Arrival tracking writes only memory and never calls session reservation. Existing drafts, quota checks and 3/4 selection stay on their existing paths. The new Learning Profile follow-through block is development-only, like Phase 4B.

## Tested before/after examples

**PPC:** earlier accepted Memory Palace evidence has an incorrect spare-capacity figure answer. The displayed suggestion targets utilisation versus capacity using Feynman. A new accepted Feynman session, with a later reported start and V2 acceptance revision, records a correct response on that familiar question. The unchanged Phase 4A policy now suggests a later check on productive-capacity changes. The follow-through panel says new performance was recorded and marks question familiarity; it does **not** say Feynman improved learning.

**Elasticity:** earlier accepted Memory Palace evidence has an incorrect expenditure application answer. The suggestion is Divide Steps for PED/expenditure. A later accepted Divide Steps Lab covers that target with a correct answer. The latest engine result is recomputed from all available accepted evidence. The matching activity is reported as consistent with the suggestion; improvement, intent and causality remain unknown/not established.

**Different choice / incomplete outcome:** a later Active Recall session may assess the PPC target without attempting suggested Feynman. Alternatively, Feynman may be reported while only another concept is assessed. These signals remain separate, with no matched follow-through conclusion. An accepted session lacking historical objective/start details also remains inconclusive. Later wrong answers can leave the review focus in place without establishing method failure.

## Files changed for this phase

Added:

- `src/quiz/economics9708/recommendationFollowThrough.ts`
- `src/hooks/useStudyFollowThrough.ts`
- `src/services/studyFollowThroughSession.ts`
- `src/quiz/__tests__/recommendationFollowThrough.test.ts`
- `src/services/studyFollowThroughSession.test.ts`
- `src/pages/StudyFollowThroughJourney.test.tsx`
- `test-support/economicsFollowThroughFixtures.ts`
- This document.

Updated:

- `src/components/YourStudyStrategy.tsx` — separate local comparison/status display and optional navigation observation.
- `src/pages/Training.tsx` — development-only, memory-only route-arrival observation.
- `src/services/auth.ts` — development-only local cache reset/rotation; no auth policy change.
- `src/services/cumulativeProfileReader.ts` and `src/services/syntheticPublishedProfile.ts` — frontend-only V2 cutoff handoff; no new requests or stored fields.
- `src/services/studyStrategySources.test.ts` and `src/services/syntheticPublishedProfile.test.ts` — cutoff regressions.

All earlier working-tree changes are preserved. No edits to the Phase 4A engine, scoring, cumulative aggregation, completion acceptance, backend routes, canonical HOW, existing evidence or rules.

## Validation and limitations

Sanitized Node 24 focused tests exercise PPC/Elasticity, matching and other-method/objective activity, same-activity binding, sequential carryover, inconclusive results, unfamiliar/known repeated answers, duplicate retries, source conflicts, previously accepted pending records, missing/tied timestamps, V1 compatibility, owner switching, navigation and memory reset. Actual route tests render the real Training entry and assert zero session-start calls merely from opening it. Profile privacy, reader integrity, recommendation, completion and selection regressions are included.

Results: **213 distinct focused tests passed** across 16 files, including **25 new follow-through tests** (15 pure evidence cases, six memory/handoff cases and four actual-route/UI cases). The final new-test rerun passed all 25. The existing broader Training suite separately passed 20 tests and failed one pre-existing heading assertion described below. Frontend typecheck and backend typecheck/build passed with zero TypeScript errors. The frontend production build passed with the existing large-chunk warning. Scoped changed-file whitespace checks passed. The active backend build metadata contains zero scalability inputs, and the production frontend assets contain none of the new follow-through feature markers.

Browser QA **NOT VERIFIED**: browser access host unavailable. Firestore/Auth Emulator QA **NOT VERIFIED**: the isolated runner found missing pinned `test-support/firestore` CLI dependencies and refused production fallback. Mocked route/reader tests are not a live Emulator, visual-layout or IAM verification.

There is one independently identified pre-existing Training test failure: `src/pages/Training.test.tsx:256` expects the heading “Choose my methods,” while both Git HEAD and the current unchanged product heading say “Individual methods.” The remaining 20 tests in that file passed. The stale assertion was not edited, and the product label was not changed to satisfy it.

## What Phase 5B needs

Phase 5B can consume these bounded descriptive signals in isolated development. Two separate gaps remain:

1. **Assessment material/conditions:** stronger evidence about retention or improvement needs reviewed, comparable assessments with suitable parallel/unseen items, known scoring/assessment conditions and explicit exposure limitations. The current familiar, sequential tasks do not establish an independent gain. No compulsory Baseline, new score or causal method model is introduced here.
2. **Durable linkage/authorization:** a cross-refresh/device or trusted intent claim needs an explicitly approved server-owned immutable recommendation receipt and persistence location. It must bind authenticated UID, incarnation/epoch, policy and content versions, source cutoff, target and method; use server issuance time and idempotency; and link a later reservation/session/completion transaction without changing quota charges. It also needs authenticated read/write endpoints, owner-read/server-write rule review, fencing, retention and deletion handling. Existing owner-editable root fields, legacy assessments, browser state and outboxes cannot supply that authority. No such receipt contract or persistence path is currently approved; this phase creates none.

Matching activity would still not prove reading, compliance with the method or causality even with a durable receipt. Independent IAM/origin enforcement and genuine production admission/publication remain blocked under the existing gates. No Phase 5B feature, production activation, migration, deployment, commit, push or paid call is performed.
