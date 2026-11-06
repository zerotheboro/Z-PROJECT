# Economics Phase 5B0 — assessment readiness and QA blockers

Status: suitable for designing a small, reviewed **isolated retrieval-check pilot**. Not ready to claim objective learning gains, retention rates or causal method effectiveness. No assessment engine, receipt persistence, collection or production activation is implemented here.

## Changes and QA

- `src/pages/Training.test.tsx:256`: changed the expected heading from `Choose my methods` to `Individual methods`. Before repair, the isolated suite reproduced 20 passes / one failure. Both `git show HEAD:src/pages/Training.tsx` and the current page already contain `Individual methods`; HEAD's test contains the obsolete expectation. Only the assertion was corrected; no assertion disabled, product label or Training navigation changed. After repair all 21 Training tests passed.
- `src/services/auth.followThrough.test.ts`: seven tests of the **actual auth adapters** and actual local comparison store, mocking Firebase/network only. Pending/failed sign-out, successful/failed login, user creation, callback ordering, logout notification, new auth instance for the same UID, unsubscribe identity and `DEV=false` behaviour are covered.
- `src/quiz/__tests__/economicsAssessmentReadiness.test.ts`: six inventory/readiness tests, including additional independently calculated answer keys, persistent question reuse, multi-objective limitations and actual Verification question counts.
- This report. All other existing working-tree work is preserved. No runtime source is modified in this phase.

Auth review: `src/services/auth.ts:16,30,39` clears/rotates memory before asynchronous login/sign-out and before notifying existing subscribers, only in development. It does not create a new auth subscription, bypass Google auth, change credentials or change `createUserIfNeeded`. The memory store keys the exact User object **and separately captured UID**, resets on account changes and contains no durable receipt. `src/hooks/useStudyStrategyEvidence.ts:20` fences reads by request generation, current User object and UID; stale success/error callbacks cannot install old evidence. Profile/privacy and route tests pass. A token refresh that changes the User instance may conservatively lose the local comparison; it must not restore it as trusted intent.

Validation run under sanitized Node **24.22.1**:

- 222 tests passed across 11 files: Training (21), auth adapter (7), readiness (6), Economics curriculum/runtime integration, Phase 3 objective evidence, Phase 4A recommendations, Phase 5A follow-through/store/journey, actual profile strategy and profile privacy.
- Frontend typecheck: zero errors. Backend typecheck/build: passed. Frontend production build: see final validation entry below.
- Existing Economics refresh harness emits a React render-phase update warning (`Saved` / `BaselineChallenge`); assertions pass. No Baseline or harness runtime was edited here. The Training billing-error test deliberately emits its mocked failure message. Neither output represents a live request.
- No full-suite or expensive history benchmark rerun; those results are not implied by these focused tests.

### Browser and Emulator attempts

The existing sanitized launcher started successfully at `http://127.0.0.1:5174` with the **demo** project, explicit loopback API target and environment-file loading disabled. Windows browser inventory was available, but Computer Use stopped at the new-tab action: it could not determine the current browser URL sufficiently to enforce policy. No local screen was reached or inspected, no screenshots were taken, and automation was stopped. **Browser/visual QA NOT VERIFIED**, including authenticated account switching.

`node scripts/run-sanitized.mjs scripts/run-completion-emulator.mjs --phase2b` exited **1**, before startup: missing `test-support/firestore/node_modules/firebase-tools/lib/bin/firebase.js`. The dedicated package declares `firebase-tools@15.34.0`, `firebase@12.19.0`, `@firebase/rules-unit-testing@6.0.0`; neither its installed CLI nor its package-lock is present. A sanitized `java -version` probe also returned `ENOENT`: Java is not on the runner's sanitized PATH. This does not establish whether a JDK exists elsewhere on the machine. **Auth/Firestore Emulator QA NOT VERIFIED.** No production fallback was attempted.

Local setup steps (not executed; no dependency/configuration changes made):

1. In a clean, credential-free shell, install the declared test-only dependencies: `npm install --prefix test-support/firestore --ignore-scripts --no-audit --no-fund`. Top-level versions are pinned; absent a reviewed lock, transitive reproducibility is not established. Review the generated lock separately. Do not use `npm ci` until that lock exists.
2. Supply a known JDK directory, preferably JDK 21 or later, and an explicit disposable emulator cache. Firebase currently warns that Firestore Emulator is moving to Java 21. See [Firebase Emulator setup](https://firebase.google.com/docs/emulator-suite/install_and_configure) and [Firestore Emulator requirements](https://firebase.google.com/docs/emulator-suite/connect_firestore).
3. With the supported Node 24 executable, run:

```powershell
node scripts/run-sanitized.mjs scripts/build-backend.mjs
node scripts/run-sanitized.mjs scripts/run-completion-emulator.mjs --phase2b --java-home 'C:/path/to/jdk-21' --emulator-cache 'C:/path/to/disposable-emulator-cache'
```

The checked-in runner creates isolated HOME/config folders, uses `demo-edulience-phase2a`, `127.0.0.1:18787` Firestore / `127.0.0.1:9099` Auth and explicitly supplied config. No Firebase login, default project change, `firebase init`, production credentials or deployed-rule changes are needed. Emulator binaries may need downloading. Startup/port/dependency failures must remain failures.

For subsequent browser QA, first restore supported browser automation/URL detection, then start demo Emulators and use `node scripts/run-sanitized.mjs scripts/run-stage4f-frontend.mjs`. Inspect `http://127.0.0.1:5174/#/training` and `/#/training/profile`; `/#/training/profile?preview=synthetic` is a labelled rendering fixture, not an authenticated end-to-end substitute. A protected synthetic completion/publication test additionally needs the existing isolated Stage 4E/4G runners; this frontend launcher alone does not provide them. Do not sign in with real students.

## Inventory and interpretation

Inspected `unit1.ts`, `unit2.ts`, `parallelUnit1.ts`, `parallelUnit2.ts`, `parallelExtra.ts`, `packs.ts`, `types.ts`, `objectives.ts`, `allocation.ts`, `adapter.ts`, `formats.ts`, actual Baseline/Match runners, Phase 3 derivation/history and Phase 4A/5A consumers.

There are **nine playable topics, 43 mapped objectives and 432 item identities**: per topic, four Memory, three Understanding, 26 Lab and 15 Verification items. Of 432 items, 258 declare exactly one objective and 174 declare multiple objectives. There are ten diagram-bearing items across the entire bank. All topic packs pass existing structural validation; options are four distinct strings with exactly one keyed answer. There are no exact repeated prompts within a pack. New-session options are shuffled; the canonical key's first-array position is not the displayed answer position.

The [official 2026–2028 Cambridge syllabus](https://www.cambridgeinternational.org/Images/697423-2026-2028-syllabus.pdf), sections 1.3–2.5, supports the broad topic/subpoint alignment. These are **local original pilot items**, not Cambridge-authored or Cambridge-approved test forms. Syllabus alignment does not validate every distractor, response process or parallel-form difficulty.

No difficulty calibration, equivalence-group version, form-level academic sign-off, protected holdout designation or delayed-test schedule exists in these packs. Easy/Medium/Hard is a display-only label, not a calibrated item difficulty. A different question ID, different numbers or different wording does not establish equal difficulty or independent transfer. This review verifies structural coverage and specified calculations, and identifies academic-review candidates; it is not independent examiner certification of all 432 questions.

### Objective-by-objective matrix

Counts are **Memory / Understanding / Lab / Verification** memberships, not delivered/scored counts. Memberships overlap for joint questions; never sum these rows into a student total. Lab pools can be practice/retest or scored depending on the frozen method form. `Solo` counts items mapped only to this objective, followed by how many are in Verification. Having no solo item does not make a joint question invalid; it means a correct/incorrect joint answer cannot isolate which concept the student understands.

Readiness categories:

- **A — comparable sets available/verified:** none yet. No item family has documented equivalent-form review/calibration and reserved, exposure-checked initial/post/delayed forms.
- **R — available, requiring academic review:** enough direct candidate items to review a small three-stage sequence (inventory triage: at least three solo items, including at least one Verification item). This threshold is not a reliability, difficulty or validity guarantee. No forms are actually reserved.
- **I — insufficient for a separated three-stage objective claim:** too few direct items by that triage, no direct Verification item, or wholly joint membership. A reviewer may identify a valid narrower skill within joint items, but must explicitly approve that interpretation and form blueprint; do not automatically re-label historical evidence.
- **E — insufficient/previously exposed for this student:** applies to **every** row when history reports familiarity, partial exposure history cannot establish unseen status, or the remaining reviewed equivalent items are exhausted. It is a per-owner assessment, not a global bank property.
- **U — unsupported for improvement claims now:** **all 43 rows**, regardless of R/I. No true historical pre-study check or reviewed equivalence/condition pairing exists. Current delayed-retention measurement is also unavailable for all rows. Recorded correctness and observed task performance remain usable.

The triage yields **29 R and 14 I objectives**. For every row, a separate unassisted initial-check workflow and optional delayed-check workflow are absent; current post-study task observations exist, subject to the membership/role limitations above. R identifies material to review for those future workflows, not an already available measurement sequence. A returning student's E classification can override either category.

| Objective | Internal concept label | M / U / L / V | Solo / solo V | Figures | Three-stage candidate / current gain |
| --- | --- | --- | --- | --- | --- |
| 1.3.1 | Identify the factors of production | 2 / 1 / 7 / 3 | 4 / 1 | 0 | R; U |
| 1.3.2 | Distinguish human and physical capital | 1 / 1 / 8 / 4 | 8 / 2 | 0 | R; U |
| 1.3.3 | Associate factors with their rewards | 1 / 0 / 5 / 4 | 7 / 3 | 0 | R; U |
| 1.3.4 | Explain division of labour and specialisation | 0 / 1 / 7 / 4 | 10 / 3 | 0 | R; U |
| 1.3.5 | Explain entrepreneurship and uncertainty | 1 / 1 / 7 / 4 | 5 / 2 | 0 | R; U |
| 1.4.1 | Distinguish allocation decisions in economic systems | 3 / 2 / 15 / 10 | 10 / 4 | 0 | R; U |
| 1.4.2 | Explain allocation through prices and planning | 2 / 3 / 22 / 11 | 18 / 5 | 0 | R; U |
| 1.5.1 | Define and interpret the PPC boundary | 1 / 1 / 6 / 3 | 6 / 1 | 2 | R; U |
| 1.5.2 | Explain opportunity cost and PPC shape | 1 / 1 / 10 / 7 | 17 / 6 | 1 | R; U |
| 1.5.3 | Explain changes in productive capacity | 1 / 1 / 8 / 5 | 11 / 3 | 0 | R; U |
| 1.5.4 | Distinguish utilisation from capacity | 1 / 1 / 6 / 4 | 5 / 1 | 2 | R; U |
| 1.6.1 | Distinguish free and private goods | 1 / 2 / 12 / 7 | 14 / 4 | 0 | R; U |
| 1.6.2 | Explain public-good characteristics | 1 / 1 / 7 / 6 | 9 / 2 | 0 | R; U |
| 1.6.3 | Explain merit-good under-consumption | 1 / 0 / 7 / 3 | 7 / 2 | 0 | R; U |
| 1.6.4 | Explain demerit-good over-consumption | 1 / 1 / 4 / 4 | 9 / 3 | 0 | R; U |
| 2.1.1 | Define effective demand | 1 / 0 / 3 / 1 | 3 / 0 | 0 | I; U |
| 2.1.2 | Aggregate individual quantities | 1 / 0 / 6 / 5 | 8 / 3 | 0 | R; U |
| 2.1.3 | Explain determinants of demand | 0 / 1 / 11 / 3 | 1 / 1 | 0 | I; U |
| 2.1.4 | Explain determinants of supply | 1 / 1 / 7 / 4 | 1 / 0 | 1 | I; U |
| 2.1.5 | Interpret demand shifts | 0 / 1 / 10 / 4 | 0 / 0 | 1 | I; U |
| 2.1.6 | Interpret supply shifts | 0 / 1 / 6 / 5 | 0 / 0 | 1 | I; U |
| 2.1.7 | Distinguish shifts from movements | 1 / 1 / 5 / 5 | 5 / 2 | 2 | R; U |
| 2.2.1 | Define PED, YED and XED | 1 / 0 / 4 / 1 | 0 / 0 | 0 | I; U |
| 2.2.2 | Calculate elasticity with consistent percentage bases | 1 / 2 / 10 / 8 | 0 / 0 | 0 | I; U |
| 2.2.3 | Interpret elasticity signs and magnitudes | 2 / 2 / 13 / 8 | 2 / 0 | 0 | I; U |
| 2.2.4 | Classify responsiveness | 1 / 0 / 4 / 1 | 4 / 1 | 0 | R; U |
| 2.2.5 | Distinguish slope from elasticity | 0 / 1 / 2 / 1 | 4 / 1 | 0 | R; U |
| 2.2.6 | Explain determinants of elasticity | 0 / 0 / 8 / 3 | 3 / 1 | 0 | R; U |
| 2.2.7 | Relate PED to expenditure | 0 / 0 / 3 / 2 | 5 / 2 | 0 | R; U |
| 2.2.8 | Apply elasticity estimates with limitations | 0 / 0 / 4 / 2 | 0 / 0 | 0 | I; U |
| 2.3.1 | Define PES | 1 / 0 / 2 / 1 | 2 / 0 | 0 | I; U |
| 2.3.2 | Calculate PES | 1 / 1 / 11 / 6 | 3 / 1 | 0 | R; U |
| 2.3.3 | Interpret PES coefficients | 2 / 1 / 11 / 9 | 4 / 1 | 0 | R; U |
| 2.3.4 | Explain supply responsiveness constraints | 0 / 2 / 13 / 7 | 3 / 0 | 0 | I; U |
| 2.3.5 | Apply PES to capacity and time | 0 / 2 / 10 / 5 | 0 / 0 | 0 | I; U |
| 2.4.1 | Explain equilibrium and disequilibrium | 2 / 1 / 6 / 4 | 12 / 3 | 0 | R; U |
| 2.4.2 | Explain adjustment after demand and supply changes | 0 / 1 / 8 / 5 | 14 / 5 | 2 | R; U |
| 2.4.3 | Distinguish linked markets | 2 / 0 / 8 / 4 | 14 / 4 | 0 | R; U |
| 2.4.4 | Explain the functions of prices | 0 / 1 / 4 / 3 | 7 / 2 | 0 | R; U |
| 2.5.1 | Define and interpret consumer surplus | 1 / 1 / 14 / 8 | 11 / 3 | 1 | R; U |
| 2.5.2 | Define and interpret producer surplus | 2 / 2 / 10 / 7 | 11 / 3 | 1 | R; U |
| 2.5.3 | Calculate and explain changes in surplus | 1 / 0 / 15 / 8 | 1 / 0 | 0 | I; U |
| 2.5.4 | Explain elasticity and surplus relationships | 0 / 0 / 3 / 3 | 0 / 0 | 0 | I; U |

Additional skill-specific gaps override R for the affected subskill:

- PPC 1.5 has only four diagram-bearing items: Lab 1/5 and Verification 1/4. Lab 1 and Verification 1/4 reuse the same straight PPC A/B/C geometry for spare-capacity, infeasibility and efficiency prompts. They are distinct IDs, not three independent equivalent diagrams. The one bowed figure has no matched delayed bowed interpretation form. Objective 1.5.3 has no diagram item at all; its reviewed prose questions do not validate diagram-shift skill.
- Demand/supply 2.1 has only one demand-shift and one supply-shift figure. Equilibrium 2.4 has two figures. Surplus 2.5 has one figure asking about consumer surplus and one asking about producer surplus on the same diagram template. These do not form three equivalent assessments of any one diagram skill. Elasticity 2.2/2.3 has no supplied figure item.
- A single syllabus objective can bundle several skills: 1.5.2 includes arithmetic opportunity cost **and** PPC shape; 2.2.1–3 combine PED, YED and XED. A calculation item cannot establish every aspect of that broad objective. The matrix does not treat one correct answer as mastery of the row.
- Diagram captions/accessibility labels can disclose semantic facts (e.g. A inside / B on / C outside). Review accessible and visual versions as one assessment before using them for graph-interpretation claims; do not remove accessibility descriptions to inflate difficulty.

### Answer keys, reuse and exposure

Existing `economics9708.test.tsx` independently computes 25 original numeric keys. The new readiness suite checks 16 additional keys from parallel PPC, aggregation and elasticity forms (41 specified numeric checks total). No mismatch reproduced in those calculations. These do not certify all distractors or the untested numeric items. The other readiness checks validate all 432 option/key memberships, IDs and objective mappings. Qualitative spot inspection across the nine topics found no additional demonstrated answer-key defect; complete academic/ambiguity review remains outstanding.

`allocation.ts:9` resets offsets for every session. It prevents repeated IDs across methods **within** a session, but identical methods/order in another session receive the same items. The repeated-ID regression demonstrates that behaviour; it is an exposure limitation, not a change to allocation in this phase. Distinct IDs can also be near-parallel repetitions: `2.2-understanding-1` and `2.2-verification-9` are the same percentage-ratio prompt pattern with changed numbers; `2.3-understanding-1`, `verification-1` and `verification-13` similarly share a PES calculation pattern. A numeric-normalized prompt scan flags four such groups; that heuristic neither proves equivalence nor finds every semantic near-duplicate.

`objectiveHistory.ts` preserves actual answer roles, known item IDs, earlier within-session methods and a lower bound of prior accepted sessions. `learningEvidenceExposure.ts` and 5A familiar-question checks supplement that history. No source establishes absence of outside study. Partial/missing legacy history, missing answer/option details or unsubmitted browser-only attempts must remain **unknown**, not zero exposure. A locally displayed question can have been seen without a completed accepted record; durable unseen-item guarantees are therefore unavailable.

## Why current Baseline/Verification cannot prove progress

`BaselineChallenge.tsx:448,615` first presents study material. `adapter.ts:105,109` selects notes covering its questions and gives 60-second Economics study entries. Phase 3 explicitly persists `baselineMeaning: post-study-not-prior-knowledge` (`assessmentEvidence.ts:142`). Historical Baseline must stay post-study. Do not rename it as an unassisted initial check or compare it to later different-objective tasks as a gain.

The current Economics Verification is **up to two selected methods**, not a universal two-question test (`methodMatchSelector.ts:65`). For example, Memory Palace plus Feynman has five plus three scored Match questions; one-method Active Recall has four. Some other formats also have unscored practice/retests. Correcting this premise does not establish measurement adequacy: target-objective coverage may still be zero, one or two questions, top-two selection is conditional, and sequential study/task differences confound comparisons.

Where only **two questions cover a target**, one answer changes a two-item proportion by 50 percentage points; with four equally likely options, random guessing gives a 1/16 chance of two correct under that model. These are arithmetic illustrations, not an estimated student guessing rate or a confidence threshold. Two items cannot establish whole-topic mastery, stable objective competence, delayed retention or a method effect. More selected-method questions about other concepts do not increase the target's sample. Method Lab and Method Match scores/ratings remain unchanged and separate.

Repeated testing can itself influence subsequent retention; an optional check is an intervention as well as a measurement. The [original retrieval-practice study](https://pubmed.ncbi.nlm.nih.gov/16507066/) reports different results at immediate versus delayed testing. It does not validate Edulience forms, prescribe a universal delay or establish a causal effect for these students.

## Two concrete measurement candidates — not activated forms

### PPC: a narrow opportunity-cost calculation (within 1.5.2)

Candidate initial item `ec9708-1.5-lab-2-v1`: food 50→44, machines 10→12, key **3 food per extra machine**. Candidate subsequent item `ec9708-1.5-verification-2-v1`: 20 grain sacrificed for four vehicles, key **5 grain per vehicle**. Candidate delayed item `ec9708-1.5-verification-10-v1`: 18 bicycles sacrificed for three boats, key **6 bicycles per boat**. These all ask a stated output-change ratio and have checked keys, but wording, units, distractors and equivalence still require academic review. They are not withheld from existing Training, and a returning student may have seen any of them.

For a synthetic example, incorrect initial → correct subsequent means **a higher recorded result on the later candidate item**. With one item per point, unreviewed equivalence or prior exposure, no demonstrated improvement should be displayed. A later correct answer at a documented interval would be delayed retrieval performance on that task; it would not establish a retention percentage or Feynman/Memory Palace causality. This sequence measures neither PPC shape nor diagram interpretation. A separate reviewed diagram family is needed for those skills.

### Elasticity: expenditure application (within 2.2.7)

Candidate initial `ec9708-2.2-lab-4-v1`: price $10→$12, sales 100→70, expenditure **$1,000→$840**. Subsequent `ec9708-2.2-verification-7-v1`: $15→$12 and 40→60, **$600→$720**. Delayed candidate `ec9708-2.2-verification-12-v1`: $20→$18 and 30→40, **$600→$720**. The changed price directions, percentage magnitudes and matching answer totals must be reviewed; these are candidates, not equivalent forms. Prefer a reviewer-approved pair with comparable directions/distractors, reserving another family for delay rather than assuming these three are sufficient.

Keep recall of PED/YED/XED definitions (2.2.1), percentage computation (2.2.2–3) and expenditure application separate. A later correct expenditure answer does not prove the learner recalls the definitions, calculated PED or mastered all of Elasticity. Current calculation items mostly have joint 2.2.2/3 membership; do not assign an isolated arithmetic deficit from a wrong joint response. Two or three reviewed items per short check would support more descriptive coverage than a single example, but are not automatically sufficient for a generalised improvement claim.

## Smallest Phase 5B proposal — requires a separate implementation review

1. Keep whole-topic selection and frozen allocations. Offer **Skip / Try a short retrieval check** before any new study material is shown. Select a narrow suitable target internally from the existing deterministic recommendation, not a compulsory objective picker. Reuse the existing MCQ renderer, shuffle and answer capture; no new scoring engine or forced method. Record that this is an unassisted-by-the-UI check, not proof of no outside assistance or no previous study. Do not repurpose existing Baseline.
2. Start with reviewed PPC opportunity-cost and Elasticity application families only. Freeze a versioned two-/three-item check form, objective/subskill membership, actual offered option IDs, order and known exposure classification. A reviewer must approve answer uniqueness, distractors, computation bases, accessible diagrams where applicable, language and difficulty comparability. Keep approved initial/post/delayed forms separate from normal Lab/Match allocation; that small new blueprint/holdout policy requires review and a new version, not an in-place replacement of old questions. If no remaining suitable form is available, offer ordinary practice with **no comparison claim**.
3. Keep the original Learning Situation → post-study Baseline → method selection/Labs → top-two Match → Reflection journey unchanged. Offer the optional subsequent check after the ordinary journey. Report raw correct/total, item/skill coverage and limitations separately from Training scores and rankings. No extra reservation/charge, bonus, quota allowance, AI engine or ranking input is introduced. Check feedback timing must be frozen: feedback can teach and therefore changes the interpretation of later responses.
4. An optional delayed check can be offered at a chosen, recorded interval (for example 48–72 hours as a **pilot scheduling choice**, not a proven optimal interval). Record actual elapsed time, any known intervening Edulience exposure, and missing/outside-study uncertainty. A familiar item supports labelled repeated retrieval, not independent improvement. Do not infer adherence from link opening, missing check results or a browser clock alone.
5. **Evidence integration is currently blocked by an explicit contract gap.** `backend/trainingCompletionContract.ts:97` rejects unknown request fields; Phase 3 (`assessmentEvidence.ts:56–78`) permits only the assigned Baseline/Lab/Match activities (max eight), with score reconciliation against original Training counts. Do not smuggle a retrieval check into `economicsResponses`, existing Match results, Reflection, subjective ratings or a zero-score fake session.
6. Minimal reviewed persistence change for initial/post checks: a versioned **optional zero-weight measurement sidecar** on the same existing immutable completion evidence document, bound to its authenticated owner, reservation/session, accepted evidence ID, frozen content/form versions, exact answers/roles, provenance and original receipt. Derive correctness on the server from reviewed canonical items; keep existing `evidence.observations`, original scoring, method rankings and cumulative profile projection byte-for-byte semantically unchanged. Add strict size/count limits, idempotent retry/hash coverage, owner/lifecycle/fence checks, source-fingerprint compatibility and reader validation. No new collection is needed in principle, but this is an acceptance-contract and authorization review, **not already supported or implemented**. Never mutate acknowledged evidence to append a check.
7. A delayed result after acknowledgment cannot be written back into that immutable record. Smallest restricted option: include it as an approved sidecar of a **later normally authorised Training completion**, before its new study, linking the earlier accepted evidence ID; its normal Training reservation retains existing quota semantics and the check adds no charge. This cannot serve students who only want a standalone delayed check. Standalone durable checks need a separately reviewed authenticated assessment-only acceptance operation, identity/idempotency/journal semantics and storage/rules compatibility; do not bypass quotas with a fake Training reservation or silently add a collection/endpoint.
8. Use existing trusted owner-scoped accepted readers and 5A reassessment. Local in-progress results remain provisional until acknowledged. Freeze payloads before submission and keep outbox recovery safe under refresh/logout; never promote legacy/browser-only reports. Server acceptance time bounds receipt timing, not proof of attention or exact client answer time. Stronger chronology would need reviewed server-issued check identity/timing. Durable recommendation receipts remain a separate authorization proposal and are **not required merely to report accepted performance**, but are required for durable cross-device linkage to a particular prior recommendation.

Permitted meanings after review:

| Claim | Minimum evidence / limitation |
| --- | --- |
| Correct performance | Accepted answers match canonical keys for those exact items; still client-reported, not proctored. |
| Observed improvement | Reviewed comparable forms/conditions and objective/subskill coverage with baseline-before-study chronology, adequate evidence and disclosed prior exposure; report uncertainty, not an unvalidated threshold. Current bank does not satisfy this gate. |
| Delayed retrieval / retention evidence | A later accepted check, known interval, reviewed conditions and intervening-exposure limitations. A single later correct answer is a recorded retrieval result, not a retention rate. |
| Causal method effectiveness | Not established by sequential, self-selected or incomparable Training. No causal claim or definitive best-method label is authorised. |

## Production limitations and next approval gates

Genuine admission remains **NOT VERIFIED**, production publication remains disabled and independent IAM/origin enforcement remains unresolved. Synthetic publication cannot be enabled for real students. Active backend build inputs must remain free of scalability modules. This phase changes only tests and this report; endpoints, rules, quotas, billing, scoring, content, historical evidence and auth runtime are untouched. No production database access, paid AI calls, migrations, commits, pushes or deployment.

Before Phase 5B implementation: approve a narrow question/form blueprint and exposure policy, complete academic/equivalence review, restore real browser and demo Auth/Firestore QA, and review the optional evidence sidecar and any durable delayed-check operation. Before stronger measurement claims: validate those forms and their comparability with suitable data. Isolated unit/Emulator success alone does not establish production authorization or educational validity.

Final validation entry: frontend production build passed (existing >500 kB chunk warning only). Frontend/backend TypeScript checks have zero errors. Changed-file whitespace checks passed. Active `dist-backend/metafile.json` has **zero `backend/scalability/` inputs**; production frontend assets have none of the new Phase 5A follow-through markers. The temporary loopback frontend was stopped after the browser attempt. No browser or Emulator pass is claimed.
