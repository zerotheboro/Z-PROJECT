# Economics images, method cards and Learning Profile UX

Local implementation only. Prior uncommitted Profile → Training work is preserved. No deployment, commit, push, database/rule/permission change, paid API call, scoring or quota-policy change was made.

## Images

Upload reviewed PNGs into **`src/image/economics9708/`**. The exact current Windows folder and all **21 missing filenames**, topic/objective bindings, academic content, axes/curves/labels and current file status are in [ECONOMICS_IMAGE_REQUIREMENTS.md](ECONOMICS_IMAGE_REQUIREMENTS.md). No image was generated or substituted; only a README exists in the asset folder.

`topicImages.ts` is the metadata source of truth. All nine playable topics and all their mapped objectives have an image request. Vite discovers exact uploaded filenames; restart the local server and refresh after upload/replacement. Missing files create no image/placeholder; a load failure hides the figure and caption. Figures have alt text, lazy loading and responsive dimensions.

Baseline images are restricted to the existing study screens and the objectives sampled by their actual question coverage. Mapped activities use their actual runtime note-objective IDs; images appear during study/encoding or an explicitly opened source review, never as a replacement for an assessed SVG or during closed-note recall/testing. Existing SVG labels, curves, answer options and keys are unchanged.

Images are optional instructional context, not newly accepted evidence. No image-specific presentation record is invented and no historical exposure is inferred. Uploaded files need academic/accessibility review and must not reveal answer keys. Materially changed instruction needs the existing content-version review before claiming equivalent assessment conditions; filename presence alone proves neither academic correctness nor exposure.

## Method cards and theme

Before: conditional notices could take the `span:last-child` description styling, while disabled cards used dark surfaces. After: the original canonical description stays in `.method-picker-description`; the original name stays visible with a compact `.method-availability-badge` saying **Unavailable**, plus **Not available for this Economics topic yet.** Eligibility, disabled state, ordering and checked state are unchanged. Introduction text also has an explicit description class; its content is unchanged.

Training and Profile use the existing `--tomato: #F75A5A` for primary accents, selected controls and relevant buttons, with warm light surfaces and dark text. Original global tokens, fonts and button geometry/shadow conventions are preserved. Disabled states remain readable, focus outlines remain visible, and names/badges can wrap. Sass/contrast checks are static verification, not real-browser visual approval.

## Study Strategy states

The existing owner-fenced reader, canonical recommendation engine and handoff remain unchanged in authority and selection semantics. The presentation now distinguishes:

| State | Student-facing behavior |
|---|---|
| Reader not configured | Explains that personal advice is not connected in this local setup. Can show an explicitly general curriculum/task-based starting suggestion without reading legacy browser reports as evidence. |
| No accepted objective answers for the topic | Labels the starting point as task suitability, not proven personal results. Historical records without objective details stay historical/uncertain. |
| Accepted sessions pending preparation/publication | Explains the pending state; a general starting suggestion uses only curriculum compatibility, not pending scores. Newer pending records are not included in advice from an older readable generation. |
| Loading/read failure | Loading status or redacted error with retry; failed evidence is not replaced with invented personal advice. |
| Accepted objective evidence available | Runs the unchanged engine over the current owner's validated readable source and presents its recommendation/limits. |
| Insufficient, incompatible or mismatched source | Withholds unsafe advice. No “the method is a suggestion” copy appears when no method was suggested. |

The whole selected topic and Open Training action are explicit. Without the isolated handoff gate, the student is told to choose that topic normally in Training; with it, the existing topic-only advisory handoff is reused. General suggestions without an accepted source do not fabricate Phase 5A follow-through observations. No forced methods, new API calls, recommendations from another account or production admission pathway were added.

Progress copy now describes **recorded accuracy on comparable tasks**, explains that some history cannot be compared fairly, and separates it from learning gain or causal effectiveness. The latest-snapshot page explicitly does not build progress charts, and no longer promises that trends will appear there. The cumulative page can show its existing comparable series. Counts, score associations, chart eligibility, original history and private Reflection controls are unchanged.

## Files changed for this request

Images:

- `src/quiz/economics9708/topicImages.ts` (new)
- `src/quiz/economics9708/EconomicsTopicImages.tsx` (new)
- `src/quiz/economics9708/MappedActivity.tsx`
- `src/quiz/sections/BaselineChallenge.tsx`
- `src/image/economics9708/README.md` (new)
- `ECONOMICS_IMAGE_REQUIREMENTS.md` (new)

Method/Profile presentation:

- `src/quiz/ChooseMethods.tsx`
- `src/quiz/sections/MethodIntroduction.tsx`
- `src/quiz/TrainingExperience.scss`
- `src/components/CumulativeProfile.scss`
- `src/components/YourStudyStrategy.scss`
- `src/components/YourStudyStrategy.tsx`
- `src/components/LatestProfileDashboard.tsx`
- `src/components/CumulativeProfileDashboard.tsx`

Tests and this report:

- `src/quiz/__tests__/economicsTopicImages.test.tsx` (new)
- `src/quiz/__tests__/studentLearningTheme.test.ts` (new)
- `src/quiz/ChooseMethods.test.tsx`
- `src/pages/LearningProfileStrategy.test.tsx`
- `src/components/LearningProfileCopy.test.tsx`
- `src/pages/LearningProfileConsistency.test.tsx`
- This document (new).

## Current validation

- Sanitized Node **24.22.1**; no inherited credentials logged or used.
- Initial focused run: **81 passed across seven files**. After adding market/surplus figure checks, the broader run executed **485 tests across 29 files: 483 passed, two failed**. All **23 added cases** pass (18 image, three theme, one method-card and one production-strategy gate), with enhanced assertions on the existing strategy-state and Profile copy/consistency cases.
- The two failures are unrelated, unchanged HEAD tests in `src/quiz/__tests__/configuredStageTimers.test.tsx:65` and `:140`: expected `30s`, actual `Time remaining: 60s`. `git show HEAD:src/quiz/methodLabData.ts` already defines Active Recall study/retrieval at 60 seconds; the implementation, data, test and shared helpers match HEAD. The isolated rerun reproduced the same two failures (four other timer tests passed). Neither timers nor these assertions were altered.
- Frontend typecheck: zero errors. Backend typecheck/build: passed. Frontend production build: passed with the existing large-chunk warning. Production assets contain no new strategy/badge activation markers; active backend build metadata contains zero scalability inputs.
- Regression coverage includes all nine topic mappings, missing/failed files, unchanged PPC/market/surplus question SVGs and keys, whole-topic selection, Automatic 3/4 and Manual 1/3 compatibility, current scores, original draft codecs/allocations, acceptance/retries, owner switching, source privacy, Profile pagination/memoization and handoff. Existing render-phase test-harness warnings and the intentionally mocked Checkout error came from passing tests.
- Global `src/index.scss`, the question SVG component, canonical registry/descriptions, recommendation engine, cumulative view/reader and owner-fencing hook are unchanged.
- Real-browser desktop/mobile/keyboard/image QA: **NOT VERIFIED**. The browser automation host reports **The browser access host is unavailable**. No screenshot or real-browser layout pass is claimed.
- Auth/Firestore Emulator QA: **NOT VERIFIED**. `node scripts/run-sanitized.mjs scripts/run-completion-emulator.mjs --phase2b` exits before startup because `test-support/firestore/node_modules/firebase-tools/lib/bin/firebase.js` is missing. No production fallback was attempted. Install the documented pinned test-support dependencies and provide the documented Java/cache setup before rerunning isolated demo QA.

## Local smoke review

Use the existing sanitized launcher: `node scripts/run-sanitized.mjs scripts/run-study-training-guidance.mjs`. It serves only the configured isolated frontend at `http://127.0.0.1:5174`; the separate synthetic backend/Auth/Firestore services are still required for authenticated accepted evidence. Do not use genuine accounts or production Firebase as a substitute.

Review `/#/training`, `/#/training/choose?economics=1.5`, `/#/training/profile` and `/#/training/profile?view=latest` at desktop and mobile widths. Check original descriptions on disabled choices, tomato accents/focus, topic/strategy states, normal topic-only handoff, private Reflection and saved-session Resume. Once actual reviewed images are uploaded, check legible figure labels in study and explicit source review, disappearance in recall/tests, and unchanged assessed SVGs. This manual browser checklist has not been executed because the browser host is unavailable.

Production admission remains **NOT VERIFIED** and genuine publication remains disabled. Actual image delivery/review, real-browser QA, live isolated Emulator QA and the existing timer-test mismatch remain outstanding; no production release is authorized by these local results.
