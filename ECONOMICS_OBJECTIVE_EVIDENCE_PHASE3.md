# Economics Phase 3 — objective evidence

Local implementation; no genuine admission, production publication, recommendation engine, migration or new collection. Existing scoring, ranking, quotas and cumulative aggregation are unchanged.

## What is captured

For new `mapped-1` Economics drafts, `collectAssessmentResponses.ts` reads the **existing saved answer slots** and frozen form IDs. Rendering or allocating a question does not create an answer. The optional versioned `economicsResponses` completion field contains topic, activity IDs, question IDs, selected canonical option IDs, known offered option IDs (or null), response role and the client-reported session start. The existing outbox freezes it with the original session ID and completion time. Old frozen payloads are not regenerated or upgraded.

`assessmentEvidence.ts` validates this report against the reviewed packs, mapping version, selected methods, allocated question offsets, canonical contexts and existing top-two selector. It rejects unsupported methods, cross-topic/phase questions, duplicate responses, invented objective/correctness fields, altered source membership and inconsistent score/count reports. Missing answers remain missing. The existing 64 KiB request limit also applies; this field is additionally limited to eight activities, 64 responses and 24 KiB. Existing document/history budgets include the entire stored envelope.

Only the backend derives `objectiveEvidence` from canonical question coverage and answer keys. It is stored beside, **not inside**, the unchanged performance evidence. It distinguishes:

- `materialPresentations`: reported rendering/exposure, never an assessment or proof of attention.
- `completion: client-reported-completed`: existing completion report, not an independent observation of effort or explanation quality.
- Answered canonical questions, their objective membership and correctness; `scored`, formative `practice` and Leitner `retest` remain separate.
- `baseline-post-study`, `method-lab` and `method-match`. Match is the existing top-two verification stage, not another independent third performance observation.
- Missing, partial and complete answer capture. A completed activity without saved answers has **unavailable** objective assessment details; its planned form is not promoted to observed answers.

Client-reported answers and timestamps are not proctored evidence or authenticated clocks. The server validates source membership and consistency, not whether a student independently knew the answer. Reflection, preferences, AI nominations and bonuses do not enter these calculations.

### Example: PPC Memory Palace

For canonical form `ec9708-1_5-2026-v2-pilot-1-lab-memory-palace-mapped1`, the actually answered question `ec9708-1.5-lab-1-v1` asks which plotted point shows spare capacity. A saved selection of canonical `option-0` yields:

```json
{
  "questionId": "ec9708-1.5-lab-1-v1",
  "objectiveIds": ["ec9708-objective-1.5.4"],
  "role": "scored",
  "answerOptionId": "ec9708-1.5-lab-1-v1:option-0",
  "correct": true
}
```

The real record also retains the known offered option IDs or explicit null. Membership comes from that question's reviewed `coverage: ["1.5.4"]`, not all objectives in the lesson. Source content is `2026-v2-pilot-1`, mapping `ec9708-objectives-1`, activity `mapped-1`. The enclosing provenance is `server-validated-canonical-questions-and-client-answers`, with client timing and no causal method attribution.

## Confirmed code paths

1. Actual Baseline/Lab/Match engines already save answers in the versioned draft scopes. The collector reuses the validator's slot bindings and the saved option orders, without changing state slots, stages or questions.
2. `completionFromDraft` includes the raw optional response report. The existing owner-scoped IndexedDB outbox freezes it before reservation lookup and sends identical retries.
3. The existing local `/api/training/complete` route verifies Firebase authentication and supplies the UID. `validateCompletion` derives the sidecar; the existing transaction stores it at `users/{uid}/learningEvidence/{evidenceId}`. Its atomic `users/{uid}/learningProfiles/cumulative` projection still aggregates **only the existing core observations**. Automatic compatibility snapshots remain at `users/{uid}/assessments/{sessionId}`; Manual never overwrites the automatic root profile.
4. The isolated protected V2 writer stores the same sidecar in its existing native envelope, alongside the existing immutable request archive and acceptance journal. Journal/source hashes cover the full envelope. Shadow replay independently re-derives the sidecar from the archived request and rejects alterations before rebuilding the existing profile. V2 acceptance remains distinct from publication; only the pre-existing synthetic Emulator publication boundary can publish.
5. Default legacy browser saves remain separate: Automatic `assessments/{sessionId}` retains the **raw client report**; Individual Practice `manualTrainingSessions/{sessionId}.payloadJSON` retains the frozen request. These owner-editable records are not server-validated native evidence and are not silently promoted. Their existing latest-snapshot/saved-practice profile views keep working.
6. Existing cumulative readers continue reading the same summary and source collections, or generation-pinned synthetic history. No objective recommendation/UI integration is activated. `buildEconomicsObjectiveHistory` is a pure, read-only interpretation API for a caller's authenticated, reconciled **active accepted source snapshot**, not an authorization provider or a replacement for repository identity resolution.

Offline transaction/replay tests verify persistence and projection equivalence. A live Emulator end-to-end path could not be executed in this environment; see validation limits below.

## Previous exposure and historical uncertainty

The read-only interpretation reuses the existing owner checks, source identity normalization and cross-method exposure index. Same-session sequence distinguishes Memory Palace followed by Feynman and tracks shared objectives without attributing a gain to either method. Across sessions it indexes accepted native completions; only a known completion **strictly before** the current reported start is counted as earlier. Ties, overlaps and missing dates establish no earlier relationship. Journal acceptance order and save times never substitute for learning chronology.

Counts are lower bounds in the supplied accepted history, always labeled partial/unknown and client-timed. Unresolved legacy snapshots do not increase distinct-native-session counts. Outside study is always unknown. Old native records without the optional field remain usable without invented objective IDs, responses or session starts. Legacy snapshots do not acquire a native sidecar. Repository-level native/legacy reconciliation must happen before supplying active sources; the helper does not invent identity links.

## Files changed for Phase 3

- Added `src/quiz/economics9708/assessmentEvidence.ts`, `collectAssessmentResponses.ts`, `objectiveHistory.ts`.
- Updated `src/quiz/trainingDraftValidation.ts` to export existing answer bindings; no new slots.
- Updated `src/services/trainingCompletion.ts`, `src/services/assessment.ts`, `src/quiz/Assessment.tsx` to retain raw reports.
- Updated `backend/trainingCompletionContract.ts`, `backend/trainingCompletion.ts`, `backend/scalability/acceptance.ts`, `backend/scalability/shadowReplay.ts` for validation, atomic retention and replay.
- Added `test-support/economicsEvidenceFixtures.ts` and `src/quiz/__tests__/economicsObjectiveEvidence.test.ts`; extended `economicsRuntime.test.tsx` and `backend/trainingCompletion.presentations.test.js`.
- Added this document. Earlier uncommitted work is preserved.

## Validation and limits

Focused checks cover PPC/Elasticity, Automatic 3/4 and Manual 1/3 completion, all 18 supported Lab/Match answer bindings for both representative topics, actual rendered answer selection, Memory Palace → Feynman, canonical objective/correctness derivation, practice/retest separation, missing/partial/historical data, malformed reports, changed source membership, receipt retries/conflicts, refresh/account isolation, unchanged profiles and isolated journal/archive replay. Existing nine-topic mapping, content, selection, draft, recovery and aggregation regressions are included.

Browser QA: **NOT VERIFIED** — the computer-use browser access host is unavailable. jsdom engine interaction tests are not browser visual QA.

Firestore Emulator QA: **NOT VERIFIED** — the existing demo-only runner exited because the pinned `test-support/firestore` Firebase CLI dependencies are absent. It did not fall back to production. The injected transactional database and pure journal/replay tests are not Firestore concurrency, rules or IAM tests.

Executed with sanitized Node 24:

- 695 distinct tests across 28 focused files passed (453 Training/client tests and 237 backend/foundation tests, followed by a final 58-test rerun containing five additional integrity regressions). The final rerun passed all 25 objective-integrity, 27 rendered-runtime and six offline persistence/replay tests. It also exercised the final validation changes. An initial test-worker startup timeout was resolved by running outside the Windows filesystem sandbox. One newly added fixture incorrectly assumed PPC Memory Palace omitted an objective; it was corrected to test a genuinely unassigned material, and passed on rerun.
- Frontend `tsc --noEmit`: zero errors. Backend typecheck and `build-backend.mjs`: passed. Frontend production build and separate `build-stage2.mjs`: passed. Vite still warns about chunks larger than 500 kB. Test import/transform startup was slow on the final rerun; these timings are not a browser performance claim.
- Scoped `git diff --check`: passed (Git emitted line-ending notices only). The completion build metafile contains zero scalability inputs. Core evidence, exposure, cumulative aggregator, profile builder, selectors, scoring and IndexedDB outbox files are byte-identical to the before-task snapshot.

Production admission remains **NOT VERIFIED**, production publication disabled. No production Firebase, paid API, deployment, commit, push, migration or rules modification was used.

## Phase 4 consumption boundary

Phase 4 can develop descriptive, uncertainty-aware objective coverage and prior-exposure interpretation against accepted records after independent review. It must use the authenticated/reconciled immutable sources and preserve the field versions, response roles, post-study Baseline meaning and top-two selection bias. It cannot infer full-topic mastery, absence of outside study, pre-study knowledge, independently verified explanation quality or causal method effectiveness. Older records, free-text activities without a verified rubric and insufficient comparable assessment evidence remain gaps. Real-student activation additionally requires the existing authority/IAM/publication approvals and successful browser/Emulator QA; this phase grants none of those.
