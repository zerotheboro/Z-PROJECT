# Phase 5B1 verification and quality gate

Current-tree local verification. No new phase, question replacement, Training redesign, accepted-evidence schema, collection or permission change.

## Status

| Check | Status | Evidence / practical limit |
| --- | --- | --- |
| Documented isolated launcher | PASS | Started with sanitized Node 24.22.1; loopback `GET /` returned 200 and Vite HTML. Server was stopped afterward. This is not browser evidence. |
| Real-browser PPC/Elasticity A → Training → B; skip, refresh, logout, account switching and incomplete sessions | NOT VERIFIED | Computer-use inventory returned `browsers: []` and `The browser access host is unavailable`. No local page, screenshot or browser interaction was inspected. jsdom results are not substituted. |
| Auth/Firestore Emulator owner/acceptance boundaries | NOT VERIFIED | The pinned runner exited 1 before startup: `test-support/firestore/node_modules/firebase-tools/lib/bin/firebase.js` missing. Sanitized `java -version` returned `ENOENT`; JDK availability elsewhere is unknown. No production fallback. |
| Local exposure classification | FAIL reproduced → corrected; automated regression PASS | A canonical option-order record without a saved answer was ignored. Missing current-session answer detail could retain a weaker no-repeat classification. Now possible display and incomplete evidence are explicit, separate from answered performance. |
| Candidate arithmetic and keyed option membership | PASS — automated scope only | All twelve candidate calculations pass; eleven items still exactly copy their original Training stems/options/keys, one remains the existing isolated draft candidate. This does not certify academic validity. |
| Review annotation accuracy | FAIL reproduced → corrected | PPC B1's “8 adds changes” explanation was false: the actual changes are 6 and 3, whose sum is 9. Only the annotation was corrected. The 8-unit distractor/key/stem/status were not changed. |
| Equivalence, distractor quality, cognitive-demand matching and learning-gain validity | HUMAN REVIEW REQUIRED | All six forms and twelve questions remain DRAFT; `equivalence: not-reviewed`. No promotion or new gain/retention claim. |
| Automated optional-flow, score/quota separation, privacy, completion compatibility and production gating | PASS | 425 focused tests in 23 files; frontend/backend checks pass. Mocked/local tests, not live student, Emulator, proctoring or IAM verification. |

## Corrected defects and source locations

1. **LOW — missed potential display exposure.** Reproduction: a mapped PPC session assigns `lab-9` to Feynman, retains the exact canonical four-option order in that assigned scope, but no corresponding answer. An empty readable accepted-history handoff does not contain this trace. Before repair the Form B display warning was absent; the new regression failed at that assertion. A subsequent result could omit possible current-session exposure.

   `src/quiz/economics9708/progressPilot/model.ts:46` now reads the existing canonical response collector **and** validates option-order traces against the frozen assigned content set/question/options. `formExposure` prioritises saved/accepted answered IDs (`known-repeat`), then canonical render-preparation traces (`possible-repeat`), then incomplete-current-answer uncertainty (`unknown`). Allocation alone, foreign question IDs and malformed orders add no trace. A render-preparation cache can come from an interrupted render: it does **not** establish actual display, attention, a submitted answer, learning or accepted provenance.

   `ProgressPilotBoundary.tsx:41,87` displays the separate possible-exposure warning, retains it in local results and passes current answer completeness. `recordPilotCheck` accepts the new **memory-only** category, with all measurement claims still unavailable. No trusted completion/evidence contract is extended.

   Regression: `economicsProgressPilotUI.test.tsx` case “conservatively flags …” failed before repair and passed afterward. It confirms Form B is offered and not skipped before checking the warning, so the reproduction is not an unavailable-form artifact. It then records `possible-repeat` for the trace and `unknown` for missing detail. Model tests also cover answered-over-display precedence, invalid/unallocated traces, no allocation-to-exposure promotion, read-only draft handling and actual normal-Training overlaps.

2. **LOW — incorrect academic-review rationale.** `forms.ts:54` and the corresponding packet entry formerly said the PPC B1 “8 units” distractor adds changes. Given 30→24 food and 10→13 tools, changes are 6 and 3, not a sum of 8. The review note now explicitly says the distractor has no clear diagnostic derivation and requires academic assessment. No academic item was silently replaced or generated. The keyed 2 units remains correct.

## Exact exposure audit

Below, `L` is the original Lab pool and `V` the original Verification pool consumed by Method Match. Prefix source IDs with `ec9708-{topic}-` and append `-v1`; pilot renderer IDs use a different namespace, but that does not make the content unseen.

| Topic / form | Item 1 source | Item 2 source | Underlying relationship |
| --- | --- | --- | --- |
| PPC A | L2 | V2 | Exact Training copies; ratio from output differences / stated trade-off. |
| PPC B | L9 | V10 | Exact Training copies; same two opportunity-cost calculation patterns. |
| PPC C | L15 | V14 | Exact Training copies; same patterns; not an activated delayed form. |
| Elasticity A | L4 | V7 | Exact Training copies; price-rise and price-fall expenditure calculations. |
| Elasticity B | L19 | V12 | Exact Training copies; same initial/later P × Q calculation pattern. |
| Elasticity C | L26 | Separate existing pilot draft C2 | L26 is an exact copy; C2 has no approved-bank source. Delayed UI remains off. |

Automated exact stem + options + key comparison found **eleven exact Training copies**, **zero Baseline item copies**, and one pre-existing pilot-only draft. No source question was changed. Distinct IDs between phases are insufficient evidence of independent content.

Actual supported allocation reproductions (scored IDs, not only planned objective mappings):

- **PPC automatic three-method example:** Labs ordered Memory Palace → Feynman → Leitner; top-two Match ordered Memory Palace → Leitner. Feynman's Lab range contains **L9**, and Leitner's scored Match range contains **V10**. Both Form B questions can have been answered before Form B. This is a valid possible allocation/verification order, not a change forcing those rankings.
- **Elasticity automatic four-method example:** Labs ordered Memory Palace → Leitner → Active Recall → Feynman; Match ordered Memory Palace → Leitner. Feynman's Lab range contains **L19**, and Leitner's scored Match range contains **V12**. Again both Form B questions can already be familiar.
- Repeating ordinary sessions repeats pool allocations. There is no reserved initial/post/delayed holdout policy. The available 18 supported mapped-1 methods use at most 20 Lab-pool positions in a new four-method session and 12 Verification-pool positions across top-two methods, including practice. Thus PPC C's **V14** and Elasticity C's **L26** are beyond those current new-session bounds; their presence in a bank is not proof a current session displayed them. Historical forms/unknown outside exposure must still not be classified as never seen.

### Underlying content and answer material

- PPC A/B/C are close **isomorphic task families**: subtract output combinations when needed, then divide sacrifice by added output. Each form balances one subtraction task and one stated-change ratio. Context/number changes do not establish transfer or equivalence. PPC B and C both have keyed values 2 and 6.
- Elasticity A/B/C all apply initial and subsequent P × Q. A2 and B2 both yield **$600→$720** despite different stems. That is a familiarity/memorisation risk. The forms do not independently measure PED definitions, coefficient calculation, interpretation or full topic mastery.
- PPC Baseline study material covers point 1.5.2 and opportunity-cost/shape concepts before its own questions. Its post-study performance must not be recast as an unassisted initial check. The pilot A gate remains before current-session instructional components, not before all prior life experience.
- Elasticity Baseline's actual sampled notes cover 2.2.1–5, **not** expenditure point 2.2.7. Do not claim that Baseline specifically taught P × Q. Mapped Labs/Match that assess expenditure include its supporting note (“total expenditure equals price times quantity”), and can contain the exact source items above. `adapter.ts` selects Baseline notes from sampled coverage; `methodContentMapping.ts` adds supporting material for the actual assigned questions; `runtime.ts` limits rendered material to selected/assessed objectives.
- Instructional material, question preparation, reported answers and scored responses remain separate. A presentation record is not proof of attention or learning. A skipped/incomplete local check can itself add question exposure that is not durable or present in accepted history. The safeguard does not solve that cross-refresh/device gap or authorise a new exposure collection.

Form A is labelled **before this session's material**, with previous/outside-study uncertainty. Returning accepted records trigger the not-first-ever warning. Missing, legacy or partial history cannot prove that a student is a first-time learner. Existing fresh-draft and restored-session guards remain intact; no new pre-study claim was added.

## Academic review handoff

| Form | Automated arithmetic / keyed results | Independent approval needed |
| --- | --- | --- |
| PPC A | 6/2 = 3; 20/4 = 5 | Units, wording, distractor diagnosis, comparison with B/C. |
| PPC B | 6/3 = 2; 18/3 = 6 | Especially the non-diagnostic 8-unit distractor; no equivalent-difficulty claim. |
| PPC C | 8/4 = 2; 24/4 = 6 | Non-diagnostic 10-unit distractor, repeated keyed values, delayed-form suitability. |
| Elasticity A | $1,000→$840; $600→$720 | Language, calculation demands and misconception plausibility. |
| Elasticity B | $600→$500; $600→$720 | Repeated final totals, familiarity and comparability with A. |
| Elasticity C | $600→$480; $600→$700 | Independent review of the existing new draft C2 and complete delayed form. |

All twelve have four unique offered strings and exactly one keyed string. These checks cannot prove unique academic interpretation, plausible distractors, reliability or equivalent difficulty. The narrow tasks align with parts of objectives 1.5.2 and 2.2.7, not the whole syllabus topic. Two-item raw counts remain too limited for stable generalised learning-gain conclusions without further review and validation. No automated check is recorded as human academic approval.

## QA blockers and local setup

The launcher was run exactly through the sanitized runtime at `http://127.0.0.1:5174/#/training`. Browser access host failure prevents real journey/keyboard/mobile/logout screenshots. Restore supported browser connectivity before claiming visual QA. The HTTP 200 is only a server smoke check.

The dedicated Emulator package declares `firebase-tools@15.34.0`, `firebase@12.19.0`, `@firebase/rules-unit-testing@6.0.0`. The CLI installation is missing; no dedicated package-lock is present. Java is absent from the sanitized PATH; a JDK may exist elsewhere but was not discovered/assumed. No dependency installation or production service substitution was performed.

In a clean credential-free setup shell, install the dedicated package (`npm install --prefix test-support/firestore --ignore-scripts --no-audit --no-fund`), review the generated lock, and supply an explicit compatible JDK directory, preferably JDK 21+. Then use the existing sanitized demo runner:

```powershell
node scripts/run-sanitized.mjs scripts/run-completion-emulator.mjs --phase2b --java-home 'C:/path/to/jdk-21' --emulator-cache 'C:/path/to/disposable-emulator-cache'
```

Only `demo-edulience-phase2a`, Auth `127.0.0.1:9099` and Firestore `127.0.0.1:18787` are permitted. No Firebase login or production project selection is needed. The full protected journey additionally needs the existing isolated Stage 4E build/server on loopback 18084 and its documented synthetic enrollment; simply starting the frontend or Auth emulator is insufficient. Do not invent trusted origin/IAM guarantees to bypass that boundary.

## Minimum next work — not implemented

1. Independently review exact forms and weak distractors; explicitly approve versioned, sufficiently distinct assessment families. Establish exposure/holdout handling so normal Training cannot consume a comparison item unnoticed. Do not silently replace existing frozen/historical questions.
2. Restore real browser and demo Auth/Firestore QA, including the complete A → normal Training → B journey for both topics and real auth transitions. Current mock tests do not close that gate.
3. Review the smallest server-validated, zero-weight measurement linkage/persistence contract before trusted progress claims. Memory-only outcomes, local render traces and client clocks cannot supply durable accepted chronology or cross-device unseen-item guarantees. Preserve original scores, quotas, immutable evidence, lifecycle fences and idempotency. No such schema or collection was implemented here.

Genuine admission remains **NOT VERIFIED**, production publication remains disabled and independent IAM/origin authority remains unresolved. Continued isolated task-performance prototyping is distinct from credible improvement measurement or production readiness.

## Files changed for this verification

- `src/quiz/economics9708/progressPilot/model.ts` — conservative current-session exposure helper/classification, no accepted evidence changes.
- `src/quiz/economics9708/progressPilot/ProgressPilotBoundary.tsx` — exposure warnings and completeness handoff.
- `src/quiz/economics9708/progressPilot/forms.ts` — one review annotation corrected; no question/key/status changes.
- `src/quiz/__tests__/economicsProgressPilot.test.ts` — five model/content-overlap regressions.
- `src/quiz/__tests__/economicsProgressPilotUI.test.tsx` — original failing exposure reproduction.
- `ECONOMICS_PROGRESS_PILOT_PHASE5B1.md` — matching annotation and current exposure explanation; prior implementation test totals retained as historical.
- This report.

## Final validation

Sanitized Node **24.22.1**, current code:

- **425 tests passed in 23 files**, zero failures in the final regression run. Includes the original exposure reproduction, five model/allocation safeguards, both topic UI checks, actual Assessment gate placement, skip/refresh/account switching, quota-call preservation, 3/4 selection, objective/evidence contracts, V1/V2 completion/retry tests and local SDK isolation. This is a focused run, not a full-suite claim.
- The exposure reproduction was independently run before repair: **one failed**, with Form B present and not skipped. After repair it passes. Initial failure is not hidden by the final pass.
- Frontend TypeScript: **zero errors**. Backend typecheck/build: **passed**. Production frontend build: **passed**, retaining the existing >500 kB chunk warning. The flag was deliberately supplied; `DEV=false` still excludes all pilot implementation markers from production assets.
- Active backend build metadata: **zero scalability imports, zero pilot imports**. No production endpoint, score, ranking, quota, allocation, history, authority or deployed rule was modified.
- Whitespace checks passed for the seven changed files. Existing React render-phase harness warnings and the deliberately mocked billing-error log appeared; their tests passed. No unrelated engine or billing changes were made to suppress them.
- The temporary local frontend was stopped. No actual browser screenshot or live Emulator success is claimed.

**Handoff:** retain the disabled-by-default prototype for isolated task-performance work. Credible improvement/retention measurement remains blocked by form review/comparability, non-holdout exposure and provenance, plus unverified real-browser/Emulator QA. No new phase or production activation is authorised. No deployment, commit, push, paid request, migration, new collection, real-student access or production-rule change.
