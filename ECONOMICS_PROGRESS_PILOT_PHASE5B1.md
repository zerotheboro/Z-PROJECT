# Economics Phase 5B1 — limited, memory-only progress pilot

Local development only. Scope: **PPC opportunity cost per additional unit (within 1.5.2)** and **Elasticity expenditure calculation (within 2.2.7)**. This prototype records task performance before this session's new instructional UI and after ordinary Training completion. It does not establish prior absence of study, equivalent forms, learning gains, retention or causal method effectiveness.

For the subsequent verification, corrected exposure classification and current QA blockers, see [the Phase 5B1 quality gate](ECONOMICS_PROGRESS_PILOT_PHASE5B1_QUALITY_GATE.md). The implementation-run validation totals below are retained as historical results.

## Academic review status

Six forms / twelve questions: two items each in A (initial), B (subsequent) and C (delayed candidate), for each of the two concepts. **Every question and form is DRAFT for measurement use.** Eleven questions copy existing Training stems, options and keys; one additional Expenditure C2 is a new DRAFT candidate confined to this pilot. It is not added to the approved Training bank. The original bank remains 432 items.

`AcademicStatus` explicitly supports `draft`, `reviewed`, `unavailable`. Structural validation rejects incomplete/unavailable forms and a reviewed form label containing draft items. Existing Training content approval is not interpreted as independent approval of a measurement form. No reviewer identity/sign-off or calibrated equivalence has been supplied. All form equivalence fields remain `not-reviewed`. Even a future reviewed status alone cannot enable a gain or retention claim: memory-only provenance remains unaccepted.

### Blueprint and difficulty considerations

- PPC forms each contain one task deriving changes from two output combinations and one task with the sacrifice/additional output explicitly stated. This balances the number of arithmetic steps more closely than placing both subtraction tasks in A. They assess a narrow marginal-output ratio, not PPC curvature, graph interpretation or mastery of all 1.5.2.
- Expenditure forms each contain one price-rise and one price-fall task. Compute initial and later price × quantity; no PED estimate or causal conclusion is inferred. They do not assess every definition, coefficient interpretation or business implication in the Elasticity topic.
- All items use four options. Language length, contexts, units, arithmetic fluency and distractor quality still differ. PPC B/C share keyed values 2 and 6; Expenditure A2/B2 both yield $600→$720. Different IDs/contexts do not establish independent transfer or equivalent difficulty.
- PPC C1 retains an existing weak distractor (10 units) with no clear diagnostic rationale; it is explicitly flagged below for academic review. It is not silently replaced in the Training bank. Review all distractors, not only whether the key occurs once.
- Two items give very coarse task coverage. No reliability estimate, gain threshold, difficulty calibration or power claim is supplied. Independent subject/assessment review must approve question correctness, unique answers, intended reasoning, accessible wording, difficulty and the complete form blueprint before stronger measurement use.

### Candidate question packet

The following packet is generated from the exact local pilot definitions. Canonical source IDs identify existing questions for exposure matching; pilot renderer IDs have a separate namespace and are never sent as canonical Training answer IDs. Distractor annotations are review notes, not student feedback. No answer explanations are shown during initial capture; correct/total results are displayed only after ordinary Training completion. The initial questions themselves still constitute retrieval exposure.

#### 1.5 ? Form A (initial) ? DRAFT
Form: `ec-progress-draft-1-1.5-A`; objective: `ec9708-objective-1.5.2`; equivalence: **not-reviewed**.

**1. On a PPC, food falls from 50 to 44 when machines rise from 10 to 12. What is the cost per extra machine?**
Item: `ec-progress-1.5-A-1-draft1` ? **DRAFT**. Source: `ec9708-1.5-lab-2-v1` (2026-v2-pilot-1).

- 3 units of food
- 6 units of food
- 2 units of food
- 12 units of food

Correct answer: **3 units of food**.
Expected reasoning: Food forgone = 50−44 = 6; extra machines = 12−10 = 2; cost = 6/2 = 3 food per machine.

Distractor review notes:
- 6 is the total food sacrificed, not the cost per machine.
- 2 is the extra machine count, not the food cost.
- 12 is the final machine output, not a marginal cost.

**2. Moving along a PPC adds 4 vehicles but sacrifices 20 tonnes of grain. What is the cost per vehicle?**
Item: `ec-progress-1.5-A-2-draft1` ? **DRAFT**. Source: `ec9708-1.5-verification-2-v1` (2026-v2-pilot-1).

- 5 tonnes of grain
- 20 tonnes of grain
- 4 tonnes of grain
- 80 tonnes of grain

Correct answer: **5 tonnes of grain**.
Expected reasoning: 20 tonnes of grain forgone / 4 additional vehicles = 5 tonnes per vehicle.

Distractor review notes:
- 20 is the total sacrifice.
- 4 is the added vehicle count.
- 80 multiplies the two changes instead of dividing.

#### 1.5 ? Form B (subsequent) ? DRAFT
Form: `ec-progress-draft-1-1.5-B`; objective: `ec9708-objective-1.5.2`; equivalence: **not-reviewed**.

**1. Two efficient combinations are 30 food/10 tools and 24 food/13 tools. What is forgone per extra tool?**
Item: `ec-progress-1.5-B-1-draft1` ? **DRAFT**. Source: `ec9708-1.5-lab-9-v1` (2026-v2-pilot-1).

- 2 units of food
- 6 units of food
- 3 units of food
- 8 units of food

Correct answer: **2 units of food**.
Expected reasoning: Food forgone = 30−24 = 6; extra tools = 13−10 = 3; cost = 6/3 = 2 food per tool.

Distractor review notes:
- 6 is the total sacrifice.
- 3 counts the additional tools.
- 8 has no clear diagnostic derivation from changes of 6 food and 3 tools; academic review should assess this distractor.

**2. A PPC trade-off adds 3 boats while sacrificing 18 bicycles. What is the opportunity cost per boat?**
Item: `ec-progress-1.5-B-2-draft1` ? **DRAFT**. Source: `ec9708-1.5-verification-10-v1` (2026-v2-pilot-1).

- 6 bicycles
- 18 bicycles
- 3 bicycles
- 54 bicycles

Correct answer: **6 bicycles**.
Expected reasoning: 18 bicycles forgone / 3 additional boats = 6 bicycles per boat.

Distractor review notes:
- 18 is the total sacrifice.
- 3 is the extra boat count.
- 54 multiplies changes instead of dividing.

#### 1.5 ? Form C (delayed) ? DRAFT
Form: `ec-progress-draft-1-1.5-C`; objective: `ec9708-objective-1.5.2`; equivalence: **not-reviewed**.

**1. Tools rise from 5 to 9 while food falls from 40 to 32. What is food forgone per extra tool?**
Item: `ec-progress-1.5-C-1-draft1` ? **DRAFT**. Source: `ec9708-1.5-lab-15-v1` (2026-v2-pilot-1).

- 2 units
- 8 units
- 4 units
- 10 units

Correct answer: **2 units**.
Expected reasoning: Food forgone = 40−32 = 8; extra tools = 9−5 = 4; cost = 8/4 = 2 food per tool.

Distractor review notes:
- 8 is the total sacrifice.
- 4 is the added tool count.
- 10 has no clear diagnostic interpretation; academic review should consider replacing this distractor.

**2. Food output falls by 24 units to produce 4 extra vehicles. What is the cost per vehicle?**
Item: `ec-progress-1.5-C-2-draft1` ? **DRAFT**. Source: `ec9708-1.5-verification-14-v1` (2026-v2-pilot-1).

- 6 food units
- 24 food units
- 4 food units
- 96 food units

Correct answer: **6 food units**.
Expected reasoning: 24 food units forgone / 4 extra vehicles = 6 food units per vehicle.

Distractor review notes:
- 24 is the total sacrifice.
- 4 counts vehicles rather than opportunity cost.
- 96 multiplies changes instead of dividing.

#### 2.2 ? Form A (initial) ? DRAFT
Form: `ec-progress-draft-1-2.2-A`; objective: `ec9708-objective-2.2.7`; equivalence: **not-reviewed**.

**1. Price rises from $10 to $12 and sales fall from 100 to 70. What happens to expenditure?**
Item: `ec-progress-2.2-A-1-draft1` ? **DRAFT**. Source: `ec9708-2.2-lab-4-v1` (2026-v2-pilot-1).

- It falls from $1000 to $840
- It rises from $1000 to $1200
- It stays at $1000
- It falls from $1000 to $700

Correct answer: **It falls from $1000 to $840**.
Expected reasoning: Initial expenditure = 10×100 = $1,000; later expenditure = 12×70 = $840.

Distractor review notes:
- $1,200 holds quantity at 100.
- $1,000 assumes unchanged expenditure.
- $700 holds price at $10.

**2. Price falls from $15 to $12 and sales rise from 40 to 60. What happens to expenditure?**
Item: `ec-progress-2.2-A-2-draft1` ? **DRAFT**. Source: `ec9708-2.2-verification-7-v1` (2026-v2-pilot-1).

- It rises from $600 to $720
- It falls from $600 to $480
- It remains at $600
- It rises from $600 to $900

Correct answer: **It rises from $600 to $720**.
Expected reasoning: Initial expenditure = 15×40 = $600; later expenditure = 12×60 = $720.

Distractor review notes:
- $480 keeps the original quantity.
- $600 assumes expenditure is unchanged.
- $900 keeps the original price.

#### 2.2 ? Form B (subsequent) ? DRAFT
Form: `ec-progress-draft-1-2.2-B`; objective: `ec9708-objective-2.2.7`; equivalence: **not-reviewed**.

**1. Price is $8 with 75 sales, then $10 with 50 sales. What happens to expenditure?**
Item: `ec-progress-2.2-B-1-draft1` ? **DRAFT**. Source: `ec9708-2.2-lab-19-v1` (2026-v2-pilot-1).

- It falls from $600 to $500
- It rises from $600 to $750
- It remains at $600
- It rises from $500 to $600

Correct answer: **It falls from $600 to $500**.
Expected reasoning: Initial expenditure = 8×75 = $600; later expenditure = 10×50 = $500.

Distractor review notes:
- $750 keeps the original quantity.
- $600 assumes unchanged expenditure.
- The reversed $500→$600 puts the two observations in the wrong order.

**2. Price falls from $20 to $18 while sales rise from 30 to 40. What is the expenditure change?**
Item: `ec-progress-2.2-B-2-draft1` ? **DRAFT**. Source: `ec9708-2.2-verification-12-v1` (2026-v2-pilot-1).

- From $600 to $720
- From $600 to $540
- From $600 to $800
- From $600 to $600

Correct answer: **From $600 to $720**.
Expected reasoning: Initial expenditure = 20×30 = $600; later expenditure = 18×40 = $720.

Distractor review notes:
- $540 keeps the original quantity.
- $800 keeps the original price.
- $600 assumes unchanged expenditure.

#### 2.2 ? Form C (delayed) ? DRAFT
Form: `ec-progress-draft-1-2.2-C`; objective: `ec9708-objective-2.2.7`; equivalence: **not-reviewed**.

**1. Price rises from $6 to $8 while sales fall from 100 to 60. What is the expenditure change?**
Item: `ec-progress-2.2-C-1-draft1` ? **DRAFT**. Source: `ec9708-2.2-lab-26-v1` (2026-v2-pilot-1).

- From $600 to $480
- From $600 to $800
- From $600 to $360
- From $600 to $600

Correct answer: **From $600 to $480**.
Expected reasoning: Initial expenditure = 6×100 = $600; later expenditure = 8×60 = $480.

Distractor review notes:
- $800 keeps the original quantity.
- $360 keeps the original price.
- $600 assumes unchanged expenditure.

**2. Price falls from $12 to $10 while sales rise from 50 to 70 units. What happens to total expenditure?**
Item: `ec-progress-2.2-C-2-draft1` ? **DRAFT**. Source: NEW DRAFT candidate (ec-progress-draft-1).

- From $600 to $700
- From $600 to $500
- From $600 to $840
- From $600 to $600

Correct answer: **From $600 to $700**.
Expected reasoning: Initial expenditure = 12×50 = $600; later expenditure = 10×70 = $700.

Distractor review notes:
- $500 keeps the original quantity.
- $840 keeps the original price.
- $600 assumes unchanged expenditure.


### Answer exposure and comparability checklist for independent review

1. None of the existing eleven source questions is a reserved holdout. Ordinary Lab/Match allocation can expose them before or between checks; unchanged allocation repeats pools in later sessions. Do not remove or reassign historical Training items in place to create a fictitious holdout.
2. The pilot reads only the existing validated, owner-scoped `strategyEvidence` handoff via `useStudyStrategyEvidence`. Phase 3 revalidation supplies known answered question IDs. A matching canonical ID is a known repeat; absence is only **no repeat in available records**, never proof of no exposure. Missing historical objective data, pending acceptance, unpublished records, browser-only attempts and outside studying remain unknown.
3. Form B also checks actual saved answer IDs using `collectEconomicsResponses` on the completed draft. A canonical option-order record in an assigned question scope is conservatively classified as **possible prior display**, separately from an answer. It may come from an interrupted render and does not prove that the student saw the question or answered it. Planned material/allocated forms alone add no exposure record. Missing/incomplete current answers remain unknown rather than becoming an unseen-question claim.
4. Exposure is captured when the student starts the form, including accepted history that arrives while the offer is visible. Later history updates do not rewrite that frozen local report. Delayed history means incomplete exposure knowledge; it is not retrospectively promoted into verified novelty.
5. The pilot itself adds unpersisted exposure to questions that may subsequently appear in ordinary Training. It does not modify the accepted evidence schema to record that extra exposure. Any controlled analysis of pilot-involved Training must therefore disclose this missing exposure record; it cannot treat those tasks as untouched controls.
6. An initial check is placed before **this new session's** instructional components mount. Returning students, earlier study, prior recommendations, other tabs and outside assistance are not controlled. This is not a first-ever knowledge test or proof of unassisted work.
7. Form C is a packet only. There is no delayed scheduler, delayed UI, elapsed-time verification, persistence or retention calculation in Phase 5B1.

## Prototype flow and isolation

- Default off. Requires `DEV === true` and `VITE_ECONOMICS_PROGRESS_PILOT=memory-only`, the existing local completion/profile flags, a `demo-...` project and loopback services. `progressPilotEnabled` calls the existing **actual SDK environment assertion**: Auth/Firestore project IDs, Auth Emulator host/port, Firestore loopback host, insecure Emulator transport and default database must agree. Configuration or SDK disagreement disables the pilot before any pilot reader request. Production `DEV=false` wins over an accidentally supplied flag.
- `startTrainingSession` keeps its normal reservation/save/recovery path. Only afterward, a guarded dynamic import arms an owner-and-session-scoped memory marker for a fresh mapped-1 PPC/Elasticity draft. Exact current Firebase User and UID must match; guests and other topics are unchanged. No new quota request or session is created. A missing pilot must not turn successful ordinary startup into failure.
- The actual `AssessmentSession` wraps its original experience in a lazily loaded boundary outside the writing-judge, adaptive, resumable-draft and question-interaction providers. The optional renderer therefore cannot store pilot answers or shuffled options into a Training draft or alter its score state.
- Before Learning Situation/Baseline (automatic) or Method Introduction (manual), the student can try Form A or skip it immediately. Relevant new Training content is unmounted until either choice is finished. The first check's local result is not inserted into Baseline; Baseline remains its original post-study activity.
- Baseline, AI confirmation, 3/4 selection, frozen Lab/Match allocation, top-two Verification, Reflection and existing saving/acceptance then proceed unchanged. Form B is offered only at section 7, **after** normal completion handling. It cannot delay the existing Reflection checkpoint, backend request or acknowledgment. Form B can be skipped; no initial result is invented when Form A was skipped.
- Results show separate **initial X of 2** and **subsequent Y of 2** task counts. No difference, percentage gain, topic mastery, retention score, method ranking or causal method label is calculated/displayed. Every result is typed `unaccepted-browser-report` / `memory-only` and carries explicit unavailable measurement claims, draft review status, form/version, actual selected answers, source question IDs, known-exposure category and client clock. The renderer shuffles options in its own local state; an ordered option-presentation trace is not exported or persisted.
- No background worker, backend endpoint, DB collection, rules change, durable recommendation receipt or prototype outbox is added. No pilot answers/results enter `completed`, `economicsResponses`, `evidence.observations`, legacy profiles, cumulative aggregation, journal acceptance or existing outbox payloads.

### Privacy, refresh and interruption

One current session is retained in tab/process memory, scoped by the exact authenticated User object plus separately captured UID and original Training session ID. Repeating the startup marker for the same session cannot reset its initial result or instruction marker. Wrong topic bindings and drafts already past the fresh start reject arming.

Logout/login adapters clear prototype memory before their asynchronous operations; existing auth notifications clear it for another owner, null owner or replacement User instance. UI callbacks fence current auth identity and the same memory entry before recording anything. The original parent Training owner guard still operates. No account's data is restored using a UID-only browser cache key.

Refresh, tab closure, sign-out, a new auth instance or starting another session loses this prototype state. An existing Training draft still resumes normally, but it **does not restore** pilot results or re-offer an initial check as if it preceded previous instruction. The UI says memory is unavailable. Partial check answers can also be lost on navigation/unmount. This is intentional, disclosed non-durable behaviour; Training's existing durable drafts/outbox remain unchanged. No saved historical result is retroactively treated as a pre-study measurement.

The boundary rechecks the **current** draft's fresh stage, empty completion fields, curriculum binding and absence of instructional state. Even if a stale fresh-session marker survives while an in-progress draft is restored, Form A is not offered and no pre-study result is recorded. During an auth mismatch the boundary shows a redacted pause message, rather than mounting the previous owner's Training children as a fallback.

## Local launch and QA

With sanitized Node 24 and existing isolated demo Auth/Firestore/protected Training services available:

```powershell
node scripts/run-sanitized.mjs scripts/run-economics-progress-pilot.mjs
```

Open **`http://127.0.0.1:5174/#/training`**, sign in only to a synthetic Emulator account, choose the whole PPC or Elasticity topic, and start a **new** Test Me or individual-method session using the normal controls. No objective picker is added. Existing real accounts, production Firebase and production publication must not be used. `scripts/run-stage4f-frontend.mjs` alone leaves the new pilot flag off; the new launcher deliberately opts in and still disables `.env` loading.

Validation performed with sanitized Node **24.22.1**:

- **419 distinct focused tests passed across 23 files**, across the broad regression run and final focused runs. This is not a full-suite claim. The broad run passed 386 tests; local isolation/readiness added 31 distinct cases; final candidate arithmetic and restored-session timing added two cases. Repeated tests are not counted twice.
- Final five-file pilot/auth run: **42 passed** (15 form/model/memory tests, 11 component/UI tests, two real Assessment-route integration tests, seven gate/startup tests and seven existing auth-adapter tests extended for pilot cleanup). A final auth-only rerun passed all seven after additional cleanup assertions.
- Covered high initial performance; no matched history; returning students; known repeated items; delayed accepted-history arrival; skipped/incomplete/unavailable/draft forms; task counts without gain claims; owner/UID/auth-instance changes; refresh/reset; stale restored drafts; unchanged draft contents; reservation/save order; no extra quota call; and failure/disabled isolation paths.
- Existing regressions include Economics content/runtime and objective derivation, 3/4 AI selection, V1/V2 completion and outbox retries, recommendation follow-through, real profile strategy/privacy, Training entry and existing local SDK isolation. Known existing Economics harness render-phase warnings (`Harness` / `Saved`) and the deliberately mocked billing-error log still appear; their tests passed. No experiment, Baseline or billing implementation was changed to suppress them.
- Frontend typecheck: **zero errors**. Backend typecheck/build: **passed**. Frontend production build: **passed**, with the existing >500 kB chunk warning. The pilot flag was deliberately supplied in production mode to verify `DEV=false` wins. Production assets contain no pilot form version, DRAFT UI, initial-check UI or measurement-claim implementation markers. The supplied environment flag name remains ordinary configuration data, not activation.
- Active `dist-backend/metafile.json`: **zero scalability imports and zero pilot inputs**. Changed-file whitespace checks passed. The academic packet contains all six forms and no unresolved generation placeholder.
- Launcher smoke: the new sanitized loopback/demo-only launcher started; `GET http://127.0.0.1:5174/` returned **200** and Vite HTML. The temporary server was then stopped. This is an HTTP startup check, not visual or authenticated journey QA.
- **Browser/visual QA NOT VERIFIED:** the available computer-use inventory returned no browser controls and `The browser access host is unavailable`. No page or screenshot was inspected. Native Chrome windows being listed does not prove browser interaction succeeded.
- **Auth/Firestore Emulator QA NOT VERIFIED:** the existing isolated runner exited 1 before startup because `test-support/firestore/node_modules/firebase-tools/lib/bin/firebase.js` is missing. It refused production fallback. No genuine account, production credential, production request or paid API was substituted. See the exact test-tool/JDK setup instructions in [Phase 5B0](ECONOMICS_ASSESSMENT_READINESS_PHASE5B0.md#browser-and-emulator-attempts).

Unit/UI tests use injected/mock local readers and transports; they are not Emulator, independent academic, IAM or real-browser evidence. The two actual Assessment-route tests mock network/services and the first ordinary section to verify gate placement; they do not constitute a live full Training-to-Firestore pilot journey.

## Minimum future persistence and measurement requirements — not implemented

1. Independent academic review/sign-off of exact versioned item/form families, difficulty/condition comparability and distractor quality; suitable additional unseen/parallel items where review requires them. Approve an exposure/holdout policy without rewriting old Training forms. Two-item raw results are not by themselves a stable objective-gain measure.
2. A separately reviewed **zero-weight, versioned measurement sidecar** in the existing immutable completion-evidence path for initial/subsequent checks. Bind current authenticated UID, account incarnation/epoch, reservation/session, reviewed form and objective/subskill IDs, actual offered option order and answers, source cutoff/exposure limitations and explicit measurement role. Derive correctness from canonical reviewed keys server-side. Include it in request identity, size limits, immutable fingerprints, transaction fencing, retries and original receipt recovery while leaving current Training score/observation/aggregate meanings unchanged. Current completion contracts reject unapproved extra fields; do not smuggle this data into Reflection, existing Baseline or Match.
3. Server-issued check identity/timing would be required for stronger chronology than a local clock and UI placement. Accepted means validated reported answers, not proctoring or proof that outside study/assistance did not occur. Durable recommendation-to-check linkage is a separate receipt/authorization decision; no such receipt is created here.
4. A delayed check cannot be appended to an acknowledged immutable source. It needs an explicitly approved later accepted record/link—possibly a zero-weight sidecar of a later normally authorised Training session—or a separately reviewed assessment-only acceptance operation in an approved existing namespace. Standalone checks must not fake a Training reservation or bypass quota semantics. New endpoint/schema/rules compatibility, lifecycle/deletion/revocation, owner reads, retention and outbox recovery require separate approval. No new collection is assumed or implemented.
5. Distinguish accepted correct performance, an observed change on reviewed comparable measurements, delayed retrieval under known conditions and causal method effectiveness. Sequential Memory Palace/Feynman or self-selected study is not a controlled causal comparison. Genuine admission remains **NOT VERIFIED**, production publication remains disabled and independent IAM/origin authority remains unresolved.

## Exact files changed in Phase 5B1

Added:

- `src/quiz/economics9708/progressPilot/forms.ts`
- `src/quiz/economics9708/progressPilot/model.ts`
- `src/quiz/economics9708/progressPilot/ProgressPilotBoundary.tsx`
- `src/services/economicsProgressPilotSession.ts`
- `src/services/economicsProgressPilot.ts`
- `src/quiz/__tests__/economicsProgressPilot.test.ts`
- `src/quiz/__tests__/economicsProgressPilotUI.test.tsx`
- `src/quiz/__tests__/economicsProgressPilotAssessment.test.tsx`
- `src/services/economicsProgressPilot.test.ts`
- `scripts/run-economics-progress-pilot.mjs`
- This report / academic packet.

Modified, preserving all earlier working-tree changes:

- `src/services/startTrainingSession.ts`: development-only optional marker after existing reservation/save.
- `src/quiz/Assessment.tsx`: development-only lazy boundary around the existing Training experience.
- `src/services/auth.ts`: clear/rotate development-only pilot memory alongside existing 5A memory cleanup.
- `src/services/auth.followThrough.test.ts`: cover pilot memory reset and production no-op alongside existing auth assertions.

No deployment, migration, commit, push, paid API call, production data access or deployed-rule change is performed.
