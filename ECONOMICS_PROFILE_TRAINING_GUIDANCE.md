# Learning Profile → Training guidance (isolated development)

## Student experience

The existing `Your Study Strategy` panel still uses the Phase 4A deterministic engine. With the new explicit opt-in, **Open Training** navigates to `/#/training?studyTopic=1.5` (PPC), `2.2` (Elasticity), or another playable whole Economics topic. It does not send a method, objective, evidence, UID, recommendation result or receipt.

Training independently reloads the signed-in owner's evidence through `useStudyStrategyEvidence` → `getLocalCumulativeProfileReader`, then recomputes the same engine. The reader retains its actual demo SDK/project/transport checks, owner checks, accepted-record validation and generation-pinned history verification. The current destination result may differ from the earlier Profile suggestion if evidence changed.

An optional card shows the whole topic, focus concept, suggested canonical method, concrete action, explanation, evidence strength and limitations. **Use this topic** explicitly selects the whole topic only, not a method, for a future new session. **Dismiss guidance** removes the topic hint and leaves normal Training available. Students may change the topic again. No method is forced, and the proposed question/content set is not installed as a session allocation.

After this topic action, the manual picker can show **Suggested by your Learning Profile** beside that method only when it is already visible, Economics-compatible and currently selectable under the existing access/slot limits. The card order and all checked states are unchanged. Automatic Test Me keeps its existing allocations and AI rules; there is no suggestion-driven selection or injection.

This optional badge uses the card's already-validated suggestion in the existing owner-scoped tab-memory cache. It adds **no reader, API or persistence call**. The hint expires after ten minutes (including while the picker stays open), and clears on dismissal, topic/account/auth-instance change, a replacement guidance snapshot or a new Profile handoff. Refresh loses it. It describes a recent suggestion, not a continuously refreshed recommendation or a durable receipt. An unavailable suggestion is simply not marked.

Automatic Training still starts through `startTrainingSession` with an empty method list, followed by the unchanged situation/Baseline/AI-confirmation/selection journey. Individual practice still opens `/training/choose?economics=...` and lets the student choose methods. Quota reservation only occurs through the existing normal start path.

## Refresh, drafts, ownership and evidence

- The URL contains a public whole-topic hint only. Refresh reruns authenticated reads and policy; it restores neither consent nor a cached method. No new storage or database collection is used.
- Topic choices made in this opted-in flow are scoped to the exact authenticated User instance and UID. Account changes reset the choice. The existing reader hook fences asynchronous success/error/finalization and unmounts. Old-account recommendations and Reflection are not passed into the handoff.
- Saved drafts retain their session ID, topic, content, answers and frozen allocations. Resume uses its original route. Using guidance does not save, discard or replace a draft. Starting a new session retains the existing discard confirmation.
- Empty **confirmed accepted history** can produce a clearly labelled task-suitability suggestion. Missing, malformed, wrong-owner or inaccessible accepted sources withhold guidance; legacy browser reports and pending-only evidence are not promoted to accepted evidence. Unsupported topics produce no handoff; unsupported methods cannot be installed from query parameters or router state.
- Accepted evidence and profile publication remain distinct. If the verified reader supplies a published-generation snapshot, newer accepted-but-pending records are expressly excluded from that advice until existing profile preparation makes them available. Returning to/refreshing Profile recomputes advice from the latest readable snapshot.
- Phase 5A's memory-only display/open tracking is reused unchanged. Opening Training or using the topic suggestion proves neither a method attempt, recommendation compliance, learning improvement nor causality. There is no new durable recommendation receipt.
- Entry reads verify a snapshot, not continuous authority after a read. Guidance has no write authority; actual Training reservations/completions remain protected by their existing authenticated lifecycle, fencing and idempotency mechanisms.

## Local launch

Use sanitized Node 24:

```powershell
node scripts/run-sanitized.mjs scripts/run-study-training-guidance.mjs
```

Open `http://127.0.0.1:5174/#/training/profile` after signing in as a synthetic Emulator account. The launcher sets `VITE_STUDY_TRAINING_GUIDANCE=emulator-only` and reuses the existing isolated Stage 4G frontend configuration. It does not start the backend/Emulators, enroll students, aggregate or publish a profile automatically.

Existing local dependencies are still required: demo Auth on `127.0.0.1:9099`, demo Firestore on `127.0.0.1:18787`, and the separate Stage 4G synthetic backend on `127.0.0.1:18084`, with the established synthetic account provisioning and publication steps. There is no production fallback. See the existing Stage 4G setup rather than running the active production backend for this flow.

Without the new flag, the Profile link stays `/training`. `DEV=false` disables the handoff even if the flag is supplied. The guidance component is lazy-loaded only under the development gate; production publication and genuine admission are unchanged. Real-student admission remains **NOT VERIFIED**.

## Files changed

- `src/components/YourStudyStrategy.tsx` — gated whole-topic navigation hint; existing policy and follow-through click handler retained.
- `src/pages/Training.tsx` — optional lazy guidance card and account-scoped topic choice under the opt-in; normal start/resume functions retained.
- `src/components/TrainingStudyGuidance.tsx` and `.scss` — current-owner recomputation, advisory actions, source/limitations and existing-brand styling.
- `src/services/studyTrainingGuidance.ts` — opt-in and validated playable topic navigation helper.
- `src/pages/StudyTrainingGuidance.test.tsx` — focused route, ownership, recovery and actual-picker regressions.
- `scripts/run-study-training-guidance.mjs` — isolated local frontend launcher.
- This document.

## Initial handoff validation (before this UX correction)

The first focused route/Profile/Training run passed **55 tests**. After the final additions, **342 tests across 21 files passed**, including all **18 new guidance tests**. The final run included Profile strategy/privacy, Training entry, Phase 5A follow-through, recommendation/objective evidence, Economics runtime, automatic three/four-method integration, existing progress-pilot boundaries, reader isolation/integrity, completion retries/V2 compatibility, normal reservation/session creation and backend completion contracts.

Frontend typecheck finished with zero errors. Backend build (including backend typecheck) passed. Frontend production build passed with the existing large-chunk warning. The guidance flag was deliberately supplied during production building: the output contains none of the guidance component/UI/handoff markers. Active backend build metadata contains zero `backend/scalability/` inputs. Changed-file whitespace checks passed. Existing render-phase test-harness warnings and the intentionally failed mocked billing request were emitted by passing unchanged regression tests.

The documented isolated launcher started successfully. HTTP smoke requests for `/` and the actual Training, guidance component and navigation helper modules all returned **200**, with no compiler error. The server was stopped after the check. This verifies serving/compilation only, not rendered browser behavior or a live authenticated journey.

The new route suite uses the actual Learning Profile and Training components, actual deterministic policy, canonical completion validation/projections in synthetic fixtures, and actual `startTrainingSession` with injected quota/save functions. It verifies PPC/Elasticity, newer accepted records between navigation, accept/dismiss/topic override, refresh, saved-session resume, no-history fallback, wrong-owner/unsupported records, failed/retried/stale/unmounted reads, account changes, pending versus published sources and opt-in/production gates. It is not a live Firebase or real-browser claim.

Browser interaction is currently **NOT VERIFIED**: the available automation inventory reports `The browser access host is unavailable`. Auth/Firestore Emulator execution is **NOT VERIFIED**: the pinned `test-support/firestore/node_modules/firebase-tools/lib/bin/firebase.js` dependency is missing and the isolated runner exits before startup. No production service is substituted.

Production IAM/origin authority, genuine admission/publication, and approval for durable recommendation-to-session receipts remain separate existing blockers. The prototype neither resolves nor weakens them. No scoring, ranking, quota policy, assessment bank, accepted evidence schema, canonical HOW, backend endpoint, rules or historical record is changed.

## Handoff UX correction and manual smoke checklist

Correction files: `TrainingStudyGuidance.tsx`, `ChooseMethods.tsx`, `studyFollowThroughSession.ts`, their two focused test files and this document. Previous implementation changes remain preserved.

The new route cases render the **actual manual picker** and cover eligible PPC/Elasticity suggestions, unchecked defaults, selecting a different method, unchanged reservation arguments, unavailable/unsupported/full-slot options, initial access loading, stale and expired suggestions, account/topic changes and dismissal. Memory unit cases check defensive copies, expiry, reset and separation from follow-through evidence. No new assessment, recommendation policy, method procedure, schema or API was introduced.

Current correction validation: **118 tests passed across nine files**, including **11 added cases** (nine route/picker cases and two memory cases). Frontend and backend typechecks passed with zero errors. The production frontend build passed with the existing chunk-size warning; the new badge/action-copy markers are absent even with the development opt-in supplied during the production build. The unchanged active backend metadata still has zero scalability inputs. Whitespace checks passed. The expected mocked Checkout failure log came from a passing existing test.

An intermediate rerun exposed an intermittent missing Elasticity badge. Hint invalidation now runs at the card's commit phase, before the topic action becomes available, so a delayed passive reset cannot erase a newly recorded hint. The final nine-file run passed all 118 tests; two additional isolated runs each passed all 27 guidance cases. The bundle check also caught unreachable badge text remaining in production output; explicit development guards on the markup removed it, and the production-disabled picker assertion passes.

Manual local-browser smoke test: **NOT VERIFIED**. The browser automation host still reports `The browser access host is unavailable`; no screenshots or browser interactions are claimed. To check manually when the isolated synthetic services are available:

1. Run the launcher above and sign in as the synthetic demo student. Open `/#/training/profile`, choose PPC or Elasticity and click **Open Training**.
2. Confirm the card says **Use this topic** and explains that no method will be selected. Click it, then **Choose methods**. Verify the badge sits beside the suggested eligible option, every checkbox remains unchecked and **Start training** is disabled.
3. Choose a different supported method and confirm it alone is selected. Verify the normal start/resume flow and quota display are unchanged. Automatic Test Me must retain its existing three/four-method rules.
4. Return through the guidance card, use the topic, then dismiss guidance before opening the picker. There should be no badge. Repeat with changed topic/account, reload, unavailable allowance and a ten-minute wait; stale hints must not persist or reappear.
5. Test keyboard focus/selection and a narrow/mobile viewport. Check existing saved-draft Resume leaves its original topic and methods intact.

Auth/Firestore Emulator checks remain **NOT VERIFIED** until the documented pinned CLI dependencies and synthetic services are available. No production service substitutes for these checks.
