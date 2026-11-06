# Economics 9708 controlled Training pilot

Batch A is implemented locally: **9 playable topics out of the 22-topic target**. Batches B–D are registered but unavailable. This is not a completed 22-topic release or full AS syllabus coverage.

The scope index was checked against the detailed AS content in the [official Cambridge 2026–2028 syllabus, Version 2](https://www.cambridgeinternational.org/Images/697423-2026-2028-syllabus.pdf), printed pages 15–22. Questions and teaching notes are original; no Cambridge examination questions were copied. This pilot is not Cambridge-endorsed.

## Availability and coverage checklist

`src/quiz/economics9708/syllabus.ts` indexes all **105 numbered subpoints** in the selected scope. Its `syllabusDetails` records nested scope, including tax classifications/rates, inequality policies, the alternative LRAS shapes and all named unemployment types. `economicsCoverageManifest` in `packs.ts` joins each numbered subpoint to its original teaching note, question IDs and readiness status. An index entry without teaching material is not coverage.

| Topic | Name | Subpoints | Teaching notes | Status |
| --- | --- | --- | ---: | --- |
| 1.3 | Factors of production | 1.3.1–1.3.5 | 5 | Playable |
| 1.4 | Resource allocation in different economic systems | 1.4.1–1.4.2 | 2 | Playable |
| 1.5 | Production possibility curves | 1.5.1–1.5.4 | 4 | Playable |
| 1.6 | Classification of goods and services | 1.6.1–1.6.4 | 4 | Playable |
| 2.1 | Demand and supply curves | 2.1.1–2.1.7 | 7 | Playable |
| 2.2 | Price elasticity, income elasticity and cross elasticity of demand | 2.2.1–2.2.8 | 8 | Playable |
| 2.3 | Price elasticity of supply | 2.3.1–2.3.5 | 5 | Playable |
| 2.4 | The interaction of demand and supply | 2.4.1–2.4.4 | 4 | Playable |
| 2.5 | Consumer and producer surplus | 2.5.1–2.5.4 | 4 | Playable |
| 3.1 | Reasons for government intervention in markets | 3.1.1–3.1.3 | 0 | Unavailable — Batch B |
| 3.2 | Methods and effects of government intervention in markets | 3.2.1–3.2.6 | 0 | Unavailable — Batch B |
| 3.3 | Addressing income and wealth inequality | 3.3.1–3.3.4 | 0 | Unavailable — Batch B |
| 4.1 | National income statistics | 4.1.1–4.1.4 | 0 | Unavailable — Batch C |
| 4.2 | Introduction to the circular flow of income | 4.2.1–4.2.3 | 0 | Unavailable — Batch C |
| 4.3 | Aggregate Demand and Aggregate Supply analysis | 4.3.1–4.3.12 | 0 | Unavailable — Batch C |
| 4.4 | Economic growth | 4.4.1–4.4.5 | 0 | Unavailable — Batch C |
| 4.5 | Unemployment | 4.5.1–4.5.4 | 0 | Unavailable — Batch C |
| 4.6 | Price stability | 4.6.1–4.6.5 | 0 | Unavailable — Batch C |
| 5.1 | Government macroeconomic policy objectives | 5.1.1 | 0 | Unavailable — Batch D |
| 5.2 | Fiscal policy | 5.2.1–5.2.7 | 0 | Unavailable — Batch D |
| 5.3 | Monetary policy | 5.3.1–5.3.4 | 0 | Unavailable — Batch D |
| 5.4 | Supply-side policy | 5.4.1–5.4.4 | 0 | Unavailable — Batch D |

Batch A supplies teaching notes for **43 subpoints**. The other **62 subpoints** are explicitly pending. Notes introduce the listed scope; neither a note nor one sampled question establishes exam mastery or exhaustive assessment of every nested concept.

No selectable 1.1, 1.2, Unit 6 or Units 7–11 were added. The manifest explicitly excludes Gini calculation, the multiplier, marginal/average propensities and the policy conflicts/trade-offs excluded from AS 5.1. No A Level-only macro content is playable.

## Content inventory and session sampling

Each playable topic has **48 original MCQs**: 4 Baseline Memory, 3 Baseline Understanding, 26 Lab-pool items and 15 verification-pool items. Total: **432 new MCQs**. Every item has four distinct options, one keyed answer and subpoint tags. Numeric regression checks cover calculations; the complete authored banks remain available for academic review.

Each topic also supplies its teaching notes (counts above), one application scenario, a five-term concept index, reasoning steps, and a related video resource. Baseline study material is limited to the subpoints sampled by that Baseline task; full topic notes remain available in the Labs. A single reusable adapter provides Baseline content and the existing 23 Lab/23 Match engine formats. Forms are resolved lazily; there are no separately authored React engines or 23 copies of a topic lesson.

Session question counts are unchanged. Automatic sessions retain four Memory questions and three Understanding questions. Each method retains its existing ordinary/practice/final-test counts, pinned in `formats.ts`. The largest four-method selection needs 26 Lab tasks; the largest two-method verification needs 15 tasks. A session samples subsets of the bank, not all 48 items. Manual Training keeps its existing Introduction → Labs → Match/verification → Reflection flow.

`allocation.ts` assigns disjoint question blocks in the frozen method order. Baseline, Lab and verification use different items; different methods in one session receive disjoint items. Intentional weak-item retests within Leitner are preserved. Versions, question IDs and form offsets remain fixed after refresh. Forms are not statistically equated: no causal claim about method effectiveness or cross-topic raw-score comparison is justified.

Original accessible SVGs support actual PPC, demand/supply-shift and surplus-area questions. Axes, curves and positions are labelled. They are schematic, not numerical scales. Text-only questions are not labelled as diagram assessment.

## Entry, persistence and compatibility

In the local application, open `/#/training`, choose **Economics 9708 AS — controlled pilot**, choose an enabled topic, then use Test Me or Choose methods. The individual-method picker also has the subject/topic control. General Training remains the default and selects exclusively from its unchanged general banks. Incomplete topics are disabled and rejected before quota reservation even if requested programmatically.

The existing draft schema stays version 1. `internalState.curriculum` stores `{topicId, version}` inside the existing slots/named structure. Existing Baseline/Lab/Match content-ID fields retain the assigned materials and form offsets. Resume validation rejects unknown versions, missing topic metadata, mixed topics, repeated/incorrect form allocations and out-of-range forms. Historical general drafts remain valid; they are not rewritten.

The real Assessment route passes the selected content through Baseline, method introductions, Labs and Match. Economics examples replace unrelated-subject introduction examples only for pilot sessions. Generic learning-situation questions, method-identification checks, the Stroop colour exercise, quiet breaks, ratings and leisure examples remain intentionally subject-independent. Academic study material and academic questions in pilot tasks are Economics-specific.

Completion uses the existing pathways. `completionFromDraft` fills the already-supported observation context with subject, topic, content version, actual engine/form ID and a shared topic/phase pool identity for cross-method exposure tracking. Scored option conditions are recorded only when their saved shuffled orders establish them. Difficulty labels do not assert calibrated item difficulty. Existing scoring versions are not invented.

Interleaving and Leitner have unscored practice exposure that the current evidence schema cannot represent separately from scored questions. Their question-condition list remains unknown; this conservatively prevents false fresh-question claims. Scores and counts retain the existing final-test semantics. No evidence schema or calculation was changed to conceal this limitation.

Ordinary automatic completion saves optional metadata with the existing assessment and updates the existing latest profile. Ordinary individual completion retains metadata in its existing frozen payload/history. Readers show the recorded context, preserve original scores/timestamps and continue labelling these owner-editable records **legacy**, not verified V2 evidence. Missing, contradictory and old unknown context is not reconstructed. Legacy progress charts continue applying their existing comparison exclusions.

The existing local durable completion/outbox receives the same context through its existing request contract. This does not activate genuine V2 admission, synthetic publication for real accounts, or production publication. No migrations/backfills, rules, endpoints, authentication, quotas, billing or scoring formulas changed. Existing AI confirmation after Baseline, advice revalidation/expiry, 3/4 selection, top-two verification, option shuffling, auto-advance and sounds remain in place.

One existing compatibility bug was corrected: Recall draft validation now uses its selected content's configured study/retrieval duration instead of a stale 30-second bound. Existing shorter remainders remain valid. No countdown duration or deadline was changed. Baseline and Feynman 60-second behaviour has direct component coverage.

Treat released content versions as immutable. Future question/option, form-layout or source-material changes need a new pack version with the old version retained for unfinished drafts and historical evidence. Do not reinterpret old content IDs or rebuild receipt payloads from a newer pack.

## Related media and academic limits

The video engine retains its existing 2x player and optional notes; pilot notes teach the complete pilot lesson while the related video reinforces part of it. Linked videos are supplementary and may discuss wider Economics context. Their public metadata/topic relevance was checked; full video playback, embedding availability and desktop/mobile visual QA were not performed. Do not treat those checks as passed or these external assets as immutable hosted media.

- 1.3: [Federal Reserve Bank of St. Louis — Factors of Production](https://www.youtube.com/watch?v=8Xg9rRmskHg)
- 1.4: [CrashCourse — Economic Systems and Macroeconomics](https://www.youtube.com/watch?v=B43YEW2FvDs)
- 1.5: [tutor2u — Production Possibility Curves](https://www.youtube.com/watch?v=FmameMMT8rw)
- 1.6: [tutor2u — Merit and Demerit Goods](https://www.youtube.com/watch?v=llKtR3Atul8)
- 2.1/2.4: [tutor2u — Demand and Supply](https://www.youtube.com/watch?v=5g-jDN1dEK0)
- 2.2: [tutor2u — Price Elasticity of Demand](https://www.youtube.com/watch?v=6qH0N1Ircfc)
- 2.3: [tutor2u — Price Elasticity of Supply](https://www.youtube.com/watch?v=sSeByVLztJg)
- 2.5: [Khan Academy — Consumer Surplus Introduction](https://www.youtube.com/watch?v=_6kwhF6hoqQ)

Independent subject-teacher review, calibrated parallel forms and full media/browser QA remain outstanding. The questions sample knowledge/application and bounded reasoning; they do not provide AI essay marking or certify full AO3 attainment. Batches B–D still require original stage content, suitable method adaptations and academic validation. No generic placeholder questions make them playable.

## Files changed by this task

New topic-pack directory, `src/quiz/economics9708/`:
`syllabus.ts`, `types.ts`, `version.ts`, `formats.ts`, `unit1.ts`, `unit2.ts`, `parallelUnit1.ts`, `parallelUnit2.ts`, `parallelExtra.ts`, `packs.ts`, `selection.ts`, `allocation.ts`, `adapter.ts`, `introduction.ts`, `evidenceMetadata.ts`, `recordedContext.ts`, `EconomicsDiagram.tsx`, `EconomicsTopicPicker.tsx`.

New integration/test files: `src/quiz/trainingContent.ts`, `src/quiz/__tests__/economics9708.test.tsx`.

Updated existing files:

- `src/pages/Training.tsx`, `src/pages/Training.test.tsx`
- `src/quiz/ChooseMethods.tsx`, `src/quiz/ChooseMethods.test.tsx`
- `src/quiz/Assessment.tsx`, `src/quiz/TrainingExperience.scss`
- `src/quiz/methodRegistry.tsx`, `src/quiz/methodEngineTypes.ts`
- `src/quiz/trainingProgress.ts`, `src/quiz/trainingDraftValidation.ts`
- `src/quiz/sections/BaselineChallenge.tsx`, `src/quiz/sections/MethodIntroduction.tsx`, `src/quiz/sections/MethodLab.tsx`, `src/quiz/sections/MethodMatchChallenge.tsx`
- `src/quiz/engines/shared/MultipleChoiceRunner.tsx`
- `src/quiz/experiments/TwoXVideoSpeedExperiment.tsx`, `src/quiz/matches/TwoXVideoSpeedMatch.tsx`
- `src/quiz/legacyAssessmentEvidence.ts`, `src/quiz/savedLearningProfileView.ts`
- `src/services/startTrainingSession.ts`, `src/services/startTrainingSession.test.ts`
- `src/services/trainingCompletion.ts`, `src/services/assessment.ts`, `src/services/manualTrainingHistory.ts`
- `src/components/ManualPracticeHistory.tsx`
- This report: `ECONOMICS_9708_PILOT.md`

Unrelated working-tree edits were preserved. All five existing general question-bank files, intake, ranking selectors and profile builder were compared against the task's starting snapshot and are byte-for-byte unchanged by this task.

## Validation record

Sanitized Node 24; Firebase/network dependencies mocked. No paid AI requests or production records were used.

- Main focused run: **387 tests passed in 15 files** (including the then-current 85 Economics tests, general content, method scopes, drafts, AI selection/confirmation/sounds, completion/outbox V1/V2, individual history and legacy profile compatibility).
- Follow-up: **86 Economics tests and the actual Training-entry test passed** (87 selected tests; 20 unrelated Training-page tests not selected by that focused command).
- Backend contract/ranking follow-up: **134 passed** (86 Economics, 42 backend completion contract/loopback HTTP checks, 6 method-selection tests). These overlap the earlier run; they are not additive totals.
- Across these focused runs: **422 distinct passing tests** (deduplicated by file and full test name). No new failing test remains.
- Frontend and backend typechecks: zero errors. Local frontend and backend builds passed; frontend reported the existing bundle-size warning. Backend build metadata contains zero scalability inputs.
- An earlier full Training-page run had one pre-existing failure: `src/pages/Training.test.tsx` expects “Choose my methods” but the starting snapshot already displays “Individual methods”. That unrelated copy/assertion mismatch was not changed.
- Real-browser and full external-video QA: **NOT VERIFIED**. No production services were started, and no deployment, migration, commit or push was performed.
