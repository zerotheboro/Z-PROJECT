# Economics Method Lab media — local implementation

**Latest owner decision (12 November 2026), superseding the historical gate descriptions below:** all twelve videos are approved for normal Training. The normal picker has selectable video cards, with no separate unscored buttons/panels or technical review notices. The 2× Video Lab is video-first: a full-width responsive player, short guidance, optional student notes, focus bullets and its original comprehension action. The Lab does not inject an educational picture, full passage or supplemental topic reference; other methods and Match retain their existing study content. Available rates, actual 2× rate and advancing playback are checked at runtime. Errors revoke readiness and offer retry. Full videos use their existing source without invented clip timestamps. Independent review flags are retained as factual metadata, not manual activation gates. See [the current instructions](ECONOMICS_VIDEO_OWNER_PREVIEW.md). The sections below record earlier implementation/verification stages, not current blocking requirements.

**100-SECOND DELAY** replaces the incorrect student-facing Post-Sleep workflow. It is a normal Memory method (`hundred-second-delay`) in the existing grid, uses the normal method-count allowance, and may be selected with other methods. The normal Lab displays its mapped passage/illustration, hides both on **I'm ready**, waits exactly 100 seconds using the existing commitment timer, then unlocks the allocated questions and original result/rating interface. Monitoring is active only during the wait: 1.5-second grace, two warnings, third-exit invalidation, preserved deadline/exits after refresh, and explicit restudy/restart without scoring an invalid attempt. Lab and Match use their separate existing Economics question pools; old methods' allocations and saved slots are unchanged. This is immediate delayed recall, not a sleep, learning-gain or long-term retention measure.

The former overnight pilot files/local records are retained for compatibility but are no longer listed or automatically scheduled by ordinary Training. The old student URL redirects to the method picker. Its legacy developer preview requires both development mode and `VITE_POST_SLEEP_PILOT=local-only`; it cannot block or supply results for the new method. No permanent Post-Sleep or owner-preview panels are rendered on Training/completion screens.

The restored Edulience palette, heading roles, cards and shadows are preserved. The media work adds a Doodling-only pointer canvas, responsive study illustrations, and reviewed-video infrastructure. The follow-up correction activates mapped Economics Doodling and replaces the permanent video exclusion with a content-review gate.

## Drawing and study images

`DoodleCanvas.tsx` uses Pointer Events and a pixel-density-aware backing canvas. Desktop mouse/trackpad movement draws without holding a button, only inside the pad. Mouse is not captured; leaving the pad ends a stroke. Touch/stylus contact uses pointer capture but discards out-of-bounds points. Pause/Resume, Undo and Clear operate on memory only. Drawings are not interpreted, graded, logged, included in draft slots, or uploaded. They disappear on refresh/unmount. Only the Doodling Lab and Doodling Match mount the pad; other methods do not.

The corrected activity is **study with optional free-form scribbling → independent knowledge questions → existing ratings/confidence**. There are no description, interpretation, justification or reconstruction prompts. The Training introduction now explains scribbling rather than concept drawing. Old text slots remain reserved and unchanged, preserving saved answer/rating/timer indices and the draft schema. Old `doodle`/`reconstruct` stages resume at study, while saved tests and completed evidence retain their existing meaning and scores. Old private descriptions are not displayed or logged.

`EconomicsStudyLayout.tsx` still controls other methods' responsive illustrations. Doodling overrides only its own layout: 2:1 (about 67%/33%) reading/pad columns, a compact floated illustration alongside the opening paragraph, then full-width subsequent reading paragraphs. The pad stays beside the passage on wide screens. Mobile DOM order is image → passage → pad → action. `DoodleStudyContent.tsx` splits the existing double-newline passage into paragraphs and omits exact repeated relationship notes; every distinct educational paragraph is retained verbatim. No question-specific SVG, answer key or closed-note assessment changes.

## Video review gate

All twelve supplied rows in `videos.ts` are **UNVERIFIED**. Proposed titles, creators and objective references are review aids, not confirmed metadata. No clip boundaries, creator verification, embedding permission or actual playback checks have been invented. Failed page retrieval, limited YouTube metadata and a rate-limited retrieval do not prove that a video is deleted or embedding-disabled.

| Topic | Candidate YouTube ID(s) | Current status |
|---|---|---|
| 1.3 Factors | `8Xg9rRmskHg` | UNVERIFIED |
| 1.4 Systems | `7cKh7SEUCDw` | UNVERIFIED |
| 1.5 PPC | `IzccVWouIxM` | UNVERIFIED |
| 1.6 Goods | `nsWuzS_dEM8`, `wiHjVeX3DKc` | UNVERIFIED |
| 2.1 Demand/supply | `g9aDizJpd_s` | UNVERIFIED |
| 2.2 PED/YED/XED | `nOlOf_KEnrw`, `8eMn4h4JpqI`, `5cW7xdanyd0` | UNVERIFIED |
| 2.3 PES | `ICjglEvPL44` | UNVERIFIED |
| 2.4 Interaction | `tm1R2Bns8c4` | UNVERIFIED |
| 2.5 Surplus | `r1Xq9FcxDB8` | UNVERIFIED |

Activation requires manual review of the actual creator/title, academic accuracy, the exact objectives, start/end boundaries, embedding availability and actual 2× playback, with reviewer and review dates. The selector resolves the existing content-set and assessed question identities and requires a reviewed clip covering their objectives; topic similarity alone cannot select a video. There are no verified rows and no flag that promotes candidates.

The new Economics player reuses the official YouTube IFrame API loader. It requests 2× only when listed by `getAvailablePlaybackRates()`, reads actual playback rate and handles rate-change events, unavailable embeds, API timeouts, retries and stale callbacks. Reviewed clip start/end bounds are configured; seeking before the start is corrected and playback at/after the end is paused. Player readiness never completes a Lab. Automated player tests use explicitly synthetic approval fixtures and do not approve any real candidate.

Existing general 2× video behavior and progress slots are retained. Both Economics Lab and Match playback now fail closed when no reviewed clip exists, without using the older pack's unrelated/incomplete fallback. Reviewed Economics experiments require current player confirmation of 2× before entering their comprehension test; errors or a changed rate revoke that readiness. This is transient UI state, not a new saved/evidence field or proof that a clip was watched. Existing scored questions and results are unchanged, including already-resumed assessment stages.

## Corrected Economics eligibility

The static Doodling exclusion is removed. The corrected free-form pad is reached through actual `-mapped1` content sets. Pack/form validation still rejects missing content, foreign questions, exhausted pools and unsupported topics. Drawing itself is not scored or saved as evidence. The original knowledge-question identities/counts, answer keys, scoring formulas, result contracts and allocations remain unchanged.

All 43 existing mapped objectives are eligible as Doodling learning material:

| Topic | Existing objective suffixes (`ec9708-objective-…`) | Doodling | 2× Video |
|---|---|---|---|
| 1.3 Factors of production | 1.3.1–1.3.5 | Eligible | Review pending |
| 1.4 Economic systems | 1.4.1–1.4.2 | Eligible | Review pending |
| 1.5 PPC | 1.5.1–1.5.4 | Eligible | Review pending |
| 1.6 Classification of goods | 1.6.1–1.6.4 | Eligible | Review pending |
| 2.1 Demand and supply | 2.1.1–2.1.7 | Eligible | Review pending |
| 2.2 Elasticity of demand | 2.2.1–2.2.8 | Eligible | Review pending |
| 2.3 PES | 2.3.1–2.3.5 | Eligible | Review pending |
| 2.4 Interaction of demand and supply | 2.4.1–2.4.4 | Eligible | Review pending |
| 2.5 Consumer and producer surplus | 2.5.1–2.5.4 | Eligible | Review pending |

Each short activity still presents only the material associated with its actual assigned questions. Eligibility across the topic is not a claim that one session covers every objective, that drawings demonstrate mastery, or that Doodling causes improvement. Numeric exercises retain their original answer keys and scoring; visualising relationships is not a replacement calculation/scoring procedure.

`economicsVideoEligibilityGap` replaces the blanket video/procedure exclusion. It is owner-independent content availability: for the selected topic it checks reviewed clips for the existing allocator's possible three-question Lab and Match windows. This conservative pre-allocation check avoids offering a method that would later fail at a different question offset or top-two verification. A clip for only the first Lab form cannot unlock the whole journey. The compiler/player additionally check the exact assigned questions/objectives. No selection weights, 3/4 rules, offsets or frozen assignments are rewritten.

There are currently **zero eligible Economics video objectives**, because all twelve real candidates lack manual review, not because Economics is intrinsically unsuitable. The registry must receive genuine creator/title, objective, clip, academic, embedding and actual 2× review before a topic can pass. Runtime playback must then confirm 2× too. Synthetic approval fixtures demonstrate that the full Lab and Match flows can complete; they do not approve a real video. The general AI library is unchanged; only the incorrect Training Doodling instructions were corrected.

## Current three-issue correction and video blockers

For **each** of the twelve candidate IDs in the table above, the same five facts remain missing: original-source creator/title confirmation, academic/precise objective review, start/end clip review, permission/availability for embedding, and observed actual 2× playback. Their stored `creator`, `clip` and `review` remain null. `economicsVideoReviewBlockers()` exposes those exact gaps for review tooling/tests. No candidate was promoted.

PED (`nOlOf_KEnrw`) was prioritised again. The original watch page failed to fetch; official oEmbed and embed URL retrieval returned cache misses. Browser inventory reported `The browser access host is unavailable`. Third-party references to this ID are not original-source identity, academic or playback verification. No timestamps or creator confirmation were invented. These access failures do not prove that the creator disallows embedding.

The picker now labels Video **“Video review pending”**, with a specific student-facing explanation that lesson content, creator, clip timing, playback here and 2× speed still need checking. Exact-content mismatch and incomplete journey coverage have different explanations. No unrelated fallback video is played. The real-player implementation checks available rates, reads `getPlaybackRate()` and handles playback-rate events; mocked tests confirm rejection of a requested-but-unconfirmed rate, but real playback is NOT VERIFIED.

PED-only approval must not imply YED/XED coverage: objective 2.2.1 explicitly combines all three definitions, and several other existing objective notes also combine elasticities. A genuinely reviewed PED clip can only cover the objectives it actually teaches. The unchanged whole-topic allocator can assign other objectives in Lab/Match, so a partial clip cannot unlock the entire 2.2 journey. No assessment/allocation protocol was silently replaced to avoid that constraint.

### Original HTML5 video alternative assessment

An Edulience-produced, academically reviewed PED clip is a viable alternative using a standard `<video>` element: set `playbackRate = 2`, read it back and verify `ratechange`/`playing`, maintain reviewed clip bounds, and keep the knowledge test separate. Reference: [HTMLMediaElement.playbackRate](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate).

No original Edulience Economics/PED video is supplied or registered. The repository video inventory contains `google.mp4`, `Instruction.mp4` and `Leitner_vid.mp4`; none is registered as a reviewed Economics clip, and their names do not establish authorship, rights or suitability. They were not substituted. The minimum remaining prerequisite is an original/authorised PED media asset with reviewed narration/visuals, exact objective scope, clip boundaries and a real local playback check. An HTML5 source variant can then reuse the review/availability gates. No third-party video was downloaded/rehosted, no unreviewed asset was fabricated, and no unused alternative player was activated.

### Files changed for the current correction

- `src/quiz/experiments/DoodleEffectExperiment.tsx`
- `src/quiz/matches/DoodleEffectMatch.tsx`
- `src/quiz/engines/shared/DoodleCanvas.tsx`
- `src/quiz/engines/shared/DoodleStudyContent.tsx` (new)
- `src/quiz/methodIntroductionData.ts`
- `src/quiz/TrainingExperience.scss` (Doodling-scoped rules only)
- `src/quiz/economics9708/methodContentMapping.ts` (comment only)
- `src/quiz/economics9708/videos.ts`
- `src/quiz/ChooseMethods.tsx` (Video pending label only)
- `src/quiz/experiments/TwoXVideoSpeedExperiment.tsx` and `src/quiz/matches/TwoXVideoSpeedMatch.tsx` (blocked-state copy only)
- `src/quiz/__tests__/economicsLabMedia.test.tsx`
- `src/quiz/__tests__/economicsRuntime.test.tsx`
- `src/quiz/__tests__/nextMethodWorkflows.test.tsx`
- `src/quiz/__tests__/economicsVideoReview.test.tsx`
- `src/quiz/__tests__/economicsVideoActivation.test.tsx`
- `src/quiz/ChooseMethods.test.tsx`
- `src/services/startTrainingSession.test.ts`
- `ECONOMICS_LAB_MEDIA.md`

Earlier working-tree changes are preserved. The validation sections below describe earlier tasks unless explicitly labelled current correction.

### Current correction validation

- Final focused run: **580 tests passed across 22 files** under sanitized Node 24. Includes all nine mapped Doodling Lab completions, PPC/Elasticity Match, four old-stage draft-resume cases, source paragraph preservation on all nine topics, mouse hover/touch/pen drawing, canvas confinement and controls, existing 3/4 selection, Baseline, evidence, receipt, access and content regressions.
- The four saved-slot tests verify old descriptions remain undisplayed and unchanged, with existing answer indices and accumulated timers intact. No saved-draft schema or validator was changed.
- Frontend TypeScript: zero errors. Backend typecheck/build: passed. Frontend production build without environment-file loading: passed, with Vite's large-chunk warning.
- Existing Training harness render-phase warnings and jsdom's unavailable native canvas warnings appear in passing regressions. Pointer/canvas and YouTube behavior are mocked; jsdom is not a substitute for a real device or real playback.
- **Desktop/mobile visual QA and actual PED/YouTube 2× playback: NOT VERIFIED.** Browser host unavailable. No real video approval or student publication was enabled, no production Firebase was accessed and no third-party media was downloaded.
- Tasks 1/2 are implemented; Task 3 remains review-blocked, with specific UI explanations and the original-video alternative assessed above.

On this correction's verification attempt, browser inventory again reported `The browser access host is unavailable`. Direct PPC/PED YouTube page retrieval also failed. No real clip was watched, timed, attributed or promoted; link retrieval failure is not evidence that the videos themselves are unavailable.

## Follow-up correction: exact files changed

- `src/quiz/economics9708/methodContentMapping.ts`
- `src/quiz/economics9708/runtime.ts`
- `src/quiz/economics9708/allocation.ts`
- `src/quiz/economics9708/assessmentEvidence.ts` (topic-scoped guard only; contract unchanged)
- `src/quiz/economics9708/videos.ts`
- `src/quiz/economics9708/EconomicsYouTubePlayer.tsx`
- `src/quiz/ChooseMethods.tsx`
- `src/quiz/Assessment.tsx` (topic-scoped eligibility only)
- `src/quiz/trainingProgress.ts` (pre-reservation eligibility only; schema unchanged)
- `src/quiz/methodEngineTypes.ts` (optional frontend Match content identity)
- `src/quiz/methodRegistry.tsx`
- `src/quiz/experiments/TwoXVideoSpeedExperiment.tsx`
- `src/quiz/matches/TwoXVideoSpeedMatch.tsx`
- `src/quiz/ChooseMethods.test.tsx`
- `src/quiz/__tests__/economicsRuntime.test.tsx`
- `src/quiz/__tests__/economicsLabMedia.test.tsx` (pointer drawing through the actual mapped registry path)
- `src/quiz/__tests__/economicsObjectiveMapping.test.ts`
- `src/quiz/__tests__/economicsVideoReview.test.tsx`
- `src/quiz/__tests__/economicsVideoActivation.test.tsx` (new)
- `src/services/startTrainingSession.test.ts`
- `ECONOMICS_LAB_MEDIA.md`

## Follow-up correction validation

Sanitized Node 24, no production services or paid APIs:

- 386 tests passed in 14 focused Economics, picker, media, objective/evidence, AI selection, draft, image and theme files.
- 144 tests passed in seven startup, access, receipt, completion and backend presentation/repair files. Total: 530 tests across 21 files.
- Final mapped-pointer path rerun: all 17 media tests passed (overlap, not additional unique tests). Frontend typecheck and changed-file whitespace checks passed again afterward.
- Mapped Doodling completes all nine topic Labs; a deliberate wrong answer retains the original 3/4 = 0.75 score. PPC and Elasticity Match complete with unchanged verification scoring. Four additional automatic/manual completion fixtures exercise Doodling through existing backend validation and preserve request hashes.
- Bounded form enumeration resolves all 43 source objectives without changing questions. Missing material rejects. Picker and real startup-service tests cover all nine topics: one original method reservation, one draft save, no video reservation when review is missing.
- Synthetic-only review/player fixtures exercise a complete 2× Lab and Match, speed-confirmation loss, and unavailable fallback prevention. Real videos remain unreviewed and blocked.
- Frontend TypeScript: zero errors. Backend typecheck/build: passed. Frontend production build: passed with Vite's large-chunk warning. Tracked diff and new-file whitespace checks: passed. Active backend build: zero scalability inputs.
- Browser/device/real-video QA remains NOT VERIFIED for the precise access/retrieval blockers above. No Emulator was used or needed for these pure eligibility, rendering and existing-contract regressions; this does not establish real Firebase persistence or independent video review.

Two initial new-test failures were fixture expectations, corrected without weakening product validation: a completed Lab must advance its parent to Match before draft validation; missing source notes already throw a fail-closed error rather than returning an unsupported plan. Existing render-phase progress-harness warnings remain visible in passing tests.

## Original media change files

- `src/quiz/TrainingExperience.scss`
- `src/quiz/economics9708/MappedActivity.tsx`
- `src/quiz/economics9708/EconomicsStudyLayout.tsx` (new)
- `src/quiz/economics9708/videos.ts` (new)
- `src/quiz/economics9708/EconomicsYouTubePlayer.tsx` (new)
- `src/quiz/engines/shared/StudyPanel.tsx`
- `src/quiz/engines/shared/DoodleCanvas.tsx` (new)
- `src/quiz/engines/shared/YouTubeTrainingPlayer.tsx` (type/API exports only)
- `src/quiz/experiments/DoodleEffectExperiment.tsx`
- `src/quiz/experiments/TwoXVideoSpeedExperiment.tsx`
- `src/quiz/methodEngineTypes.ts`
- `src/quiz/methodRegistry.tsx`
- `src/quiz/__tests__/economicsLabMedia.test.tsx` (new)
- `src/quiz/__tests__/economicsVideoReview.test.tsx` (new)
- `ECONOMICS_LAB_MEDIA.md` (new)

Other existing working-tree changes were preserved. The original media change did not edit allocation; the follow-up correction above explicitly changes eligibility. Neither changes scoring, result contracts, draft schema, Firebase rules, quotas or billing. No backend entry point is activated.

## Original media validation (previous task)

Sanitized Node 24:

- Broad focused run: 353 tests passed in 13 files, including the 36 new media/video tests, Economics runtime/objectives, images, draft validation/scopes, AI selection integration and restored-theme regressions.
- After the final legacy-activity image wiring: 147 tests passed in the five affected media, video, runtime, image and draft-scope files. These overlap the broad run; they are not additional unique tests.
- Frontend TypeScript: zero errors.
- Backend typecheck/build: passed.
- Frontend production build with environment-file loading disabled: passed; Vite reported its large-chunk warning.
- Tracked diff whitespace check: passed.

React emitted render-phase state-update warnings from the existing Training progress harness while tests passed. The drawing tests use mocked canvas/Pointer Events, and player tests use a mocked IFrame API: neither establishes real-device drawing quality or actual YouTube playback.

**Real-browser desktop/mobile/trackpad/touch and real-video 2× QA: NOT VERIFIED.** The browser access host was unavailable. No screenshots were inspected or captured. All twelve real videos still need manual review; automated tests do not substitute for creator, academic, clip, embedding or playback checks.
