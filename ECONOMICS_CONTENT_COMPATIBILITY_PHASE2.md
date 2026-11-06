# Economics content–method compatibility activation (local Phase 2)

New Economics sessions created through the real Training entry now opt into `mapped-1` activities. The student still chooses a whole topic. No objective-selection screen, extra mandatory question, prior-knowledge test, recommendation engine or upload system was added.

## Runtime and historical compatibility

New Lab and Match content IDs contain `-mapped1`, before any existing question offset. The source/question-bank version remains `2026-v2-pilot-1`; the activity has its own version. Old IDs resolve to the original adapter, with their original content, stages, state slots, question/option identities and saved method decisions. Unknown activity versions reject.

The compiler requires a supported Phase 1 plan, then selects the approved source notes required by that form's assigned questions (including unscored practice). It does not change the questions, counts, keys, timers or scoring. Match still uses the existing top-two selector. New assessment-version metadata distinguishes changed presentation conditions; the shared source-pool identity and original question IDs retain cross-method/repeated-content exposure identity. No historical evidence is rewritten or retroactively marked observed.

Automatic selection retains its original ranking weights and +2.55 selection-only bonus, with incompatible candidates filtered before taking three or four. Only eligible, explicitly confirmed, compatible AI nominations can trigger three; otherwise four. Existing saved decisions and General Training retain their original path. The individual-method picker disables five unsupported methods for Economics. Programmatic startup rejects them before reserving any allowance. A forged new mapped content ID for an unsupported method also rejects; there is no legacy fallback for a mapped form.

## Actual activities

The existing engines enact the methods: Memory Palace uses a route, spatial encoding, closed-note reconstruction and a scored check; Feynman uses study, an explanation for a novice, simplification and objective questions; Active Recall uses study, closed-note retrieval and objective questions. Those stages were not replaced by a general note page.

Memory Palace now separates a short source-checked mnemonic cue from its exact supporting meaning. Students create their own vivid images. The route length follows the selected material (at most eight locations). The original five-location label remains unchanged for legacy five-location data. Feynman exposes an optional source-check control during explanation/simplification; closed-note retrieval and testing do not expose that control. Necessary supporting notes are available during study even for an engine whose task focuses on short terms.

Representative PPC outputs: `Door → Feasible-output boundary`, `Desk → Opportunity-cost trade-off`, `Window → Expanding or contracting capacity`, `Bookshelf → Idle resources inside the frontier`, each with its approved meaning. Feynman explains PPC feasibility/cost/utilisation, checks the source if needed, then simplifies. Active Recall hides the source before reconstructing those ideas and taking its unchanged four-item test.

Representative Elasticity outputs: cues such as `PED, YED, XED`, `Percentage response divided by percentage cause`, `Signs and economic relationships`, and `Price times quantity`, with the approved definitions/formulas/qualifications. Each assigned form retains supporting calculation material. Feynman and Active Recall use the same original question bank while employing their different explanation/retrieval procedures.

“Practice Testing” is not a separate entry in the canonical 37-method pool. In this implementation it describes Active Recall's existing practice-testing workflow. No 38th method or new score identity was invented. Active Blurting, Capture & Create and Kidlin's Rule remain three additional Training-only registry entries, with their existing HOW procedures.

## Complete canonical 37-method inventory

| Canonical method | Economics runtime status |
| --- | --- |
| Prime Question | Supported |
| Pomodoro Technique | Out of scope: separate timing protocol |
| Peripheral Vision | Non-trainable: no existing topic engine |
| Everything in 1 Place | Non-trainable |
| Auto Google | Non-trainable |
| Water Your Face / Body | Non-trainable |
| 10 Minute Wall Stare | Supported |
| Stroop Effect Exercise | Supported |
| Short Workout | Non-trainable |
| Long-term Workout | Non-trainable |
| Structure Your Day | Non-trainable |
| Track Progress | Non-trainable |
| Brain Diet | Non-trainable |
| Calm Start | Non-trainable |
| Header First | Supported |
| Use a Pointer | Non-trainable |
| Spaced Learning | Out of scope: requires scheduling over time |
| Doodle Effect | Unsupported: reviewed listening HOW differs from the current drawing engine |
| Incubation Effect | Non-trainable |
| Active Recall | Supported |
| 2X Video Speed | Unsupported: familiarity and reviewed playback conditions not established |
| Premack's Principle | Supported |
| Interleaved Practice | Unsupported: reviewed problem-type grouping missing |
| Story Telling | Supported |
| Feynman Technique | Supported |
| Memory Palace | Supported |
| 80/20 Rule | Unsupported: reviewed priorities/dependencies missing |
| Post-Learning Rest | Out of scope: no existing topic Lab; remains non-trainable globally |
| One Sentence | Supported |
| Divide Steps | Supported |
| Derive Basics | Unsupported: checked derivation missing |
| Leitner System | Supported |
| Note-taking 4x4 | Supported |
| Abbreviation | Supported |
| You vs Book Cycle | Non-trainable: no separate canonical Training engine |
| Cornell Method | Supported |
| Highlight | Non-trainable |

Totals: 15 supported canonical entries, 5 unsupported, 14 non-trainable and 3 out of scope. Including the three Training-only entries, 18 existing engine IDs have compatible plans across all nine packs. These are bounded topic-session adaptations, not proof of a method's long-term effectiveness. Existing global trainability and the canonical HOW pool were not edited.

## Actual presentation records

`MappedActivity` observes mounted, visible source surfaces. Merely constructing a plan or completing a fixture does not emit a presentation. Hidden text, hidden ancestors and closed disclosures are excluded. Rendered cues have their own stable `:cue` IDs and `mapped-1` material version; original notes retain their `:note` IDs and source version. Objective/mapping IDs, activity/form IDs, method/phase and first presentation timestamps are retained. Source material is closed during retrieval/testing.

Records use the existing draft's named map (no new state slots), survive its codec and refresh, and retain their original first timestamps on revisits. They are bounded to 96 records / 32 KiB, contain no learner-written explanation or Reflection, and are explicitly `client-rendered`. They establish neither attention, reading, comprehension, mastery nor trusted server observation.

An optional `materialPresentations` request field is validated, included in the existing request hash and retained outside objective performance in immutable native envelopes and legacy automatic snapshots. Manual legacy records already retain the whole frozen payload. Source identities must match the assigned method/phase/context; future timestamps, unknown fields, duplicate records and oversized data reject. Existing document/history capacity checks include the additional data. Identical retries return the original receipt; changed telemetry conflicts. Pre-field v1 requests/receipts remain compatible because the field is omitted when no actual presentations were recorded.

No new collection, rules, quota charge, scoring input, profile aggregation input, genuine admission pathway or successful publication pathway was added. Isolated V2 acceptance retains the same optional field without changing acceptance/lifecycle/fencing logic.

## Verification and limitations

The focused regression run passed 476 tests in 18 files, including 25 runtime tests, 3 new injected-transaction retention tests and the pre-reservation rejection test. Tests cover all nine topics, supported engine data, frozen legacy forms, Automatic 3/4 and Manual 1/3 completion, top-two/scoring preservation, refresh, owner switching, rendered-only capture, hidden text, immutable retries/conflicts, limits and existing profile/history behavior.

Six temporary jsdom output probes were used to inspect the actual rendered text for Memory Palace, Feynman and Active Recall on PPC and Elasticity. They are component output inspection, not browser visual QA. A real Chrome inspection was attempted using the computer-use skill but the automation service stopped because it could not establish the current Windows browser URL confidently. Browser visual/manual interaction QA is **NOT VERIFIED**. The temporary isolated preview was stopped; no production app/backend was started.

The pinned Firebase Emulator CLI/dependencies are unavailable at `test-support/firestore/node_modules/firebase-tools/lib/bin/firebase.js`. Firestore Emulator tests were **NOT RUN**. The new persistence tests use an explicitly labelled in-memory transactional test double; they do not prove Firebase IAM, deployed rules or real SDK concurrency. Emulator verification remains required before release.

Frontend/backend typechecks and frontend/backend/isolated Stage 2 builds were run with sanitized Node 24. Production admission remains NOT VERIFIED and publication disabled. Independent academic review, equal-workload/calibrated parallel forms and browser usability review remain outstanding. No short-session objective selection or material-render telemetry establishes full-topic mastery. Unsupported procedures must be resolved through reviewed material/engine compatibility before enabling them; none was silently redefined.

## Files changed

The exact task file list follows. Unrelated working-tree changes were preserved.

- `src/quiz/Assessment.tsx`
- `src/quiz/ChooseMethods.tsx`
- `src/quiz/economics9708/adapter.ts`
- `src/quiz/economics9708/allocation.ts`
- `src/quiz/economics9708/evidenceMetadata.ts`
- `src/quiz/economics9708/methodContentMapping.ts`
- `src/quiz/economics9708/recordedContext.ts`
- `src/quiz/economics9708/selection.ts`
- `src/quiz/experiments/MemoryPalaceExperiment.tsx`
- `src/quiz/matches/MemoryPalaceMatch.tsx`
- `src/quiz/methodEngineTypes.ts`
- `src/quiz/methodRegistry.tsx`
- `src/quiz/methodSelector.ts`
- `src/quiz/sections/MethodLab.tsx`
- `src/quiz/sections/MethodMatchChallenge.tsx`
- `src/quiz/trainingDraftValidation.ts`
- `src/quiz/trainingProgress.ts`
- `src/quiz/trainingProgressState.tsx`
- `src/services/assessment.ts`
- `src/services/startTrainingSession.test.ts`
- `src/services/startTrainingSession.ts`
- `src/services/trainingCompletion.ts`
- `backend/trainingCompletion.ts`
- `backend/trainingCompletionContract.ts`
- `backend/scalability/acceptance.ts`
- `src/quiz/economics9708/MappedActivity.tsx`
- `src/quiz/economics9708/mnemonicCues.ts`
- `src/quiz/economics9708/presentationRecords.ts`
- `src/quiz/economics9708/runtime.ts`
- `src/quiz/__tests__/economicsRuntime.test.tsx`
- `backend/trainingCompletion.presentations.test.js`
- `ECONOMICS_CONTENT_COMPATIBILITY_PHASE2.md`
