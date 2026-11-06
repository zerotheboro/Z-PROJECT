# Economics Phase 4A — actionable study recommendations

Implemented locally as a pure advisory module. No UI, endpoint, persistence, scoring, ranking, quota, billing, acceptance or aggregation changes. No existing working-tree file was edited for this phase.

## Files

- `src/quiz/economics9708/studyRecommendations.ts`: exported types and deterministic `recommendEconomicsStudy(ownerUid, topicId, rows)`.
- `src/quiz/__tests__/economicsStudyRecommendations.test.ts`: canonical synthetic fixtures and policy/security regressions.
- This document.

## Input and authority boundary

Students still select a whole topic. The only learning-content input is its topic ID; targets are chosen internally. The caller supplies existing, owner-scoped, reconciled **active accepted source rows**, not a browser-generated summary or a raw draft. The module reuses Phase 3 `buildEconomicsObjectiveHistory`, including canonical answer/objective validation, receipt consistency, duplicate handling, owner isolation and prior-method sequence interpretation. Conflicting source IDs/hashes also reject. Invalid input produces a redacted `insufficient-evidence` result without private payloads.

The pure module cannot authenticate a caller, verify IAM, establish source completeness, detect revocation or prove an account incarnation. A matching receipt-shaped object is not authority. Phase 4B must fetch through the existing authenticated repository, fence asynchronous reads/account changes, and supply only current active reconciled sources. No new authority provider is introduced. Production admission remains NOT VERIFIED and production publication remains disabled.

The existing cumulative profile stays descriptive and unchanged. Its pooled totals cannot manufacture missing objective context; this policy uses actual canonical question responses in accepted history. Legacy records without those details remain unknown. The history scope is always partial/unknown, not a lifetime-total claim.

## Typed output

`StudyRecommendationResult` is a discriminated union:

```ts
{
  schemaVersion: 1;
  policyVersion: "ec9708-study-actions-1";
  ownerUid: string;
  topicId: string;
} & (
  { status: "recommended"; recommendation: StudyRecommendation }
  | { status: "insufficient-evidence";
      reason: "invalid-owner-or-evidence" | "unsupported-topic" | "no-compatible-content" }
)
```

`StudyRecommendation` contains topic/objective IDs and label, an existing `TrainingMethodId`, purpose, a specific action, explanation, evidence strength, explicit task-suitability basis, limitations, bounded source references and a versioned content suggestion. References retain evidence/session/form/question IDs, response role, original correctness, Baseline/Lab/Match stage, client timing, method and prior-method sequence. The total reference count and truncation flag are explicit; output is capped at 16 references and prioritizes the error that supports the action. The input is never modified.

The content suggestion includes the source/mapping/activity versions, actual compatible Lab form, question and note IDs, content type and an unchanged copy of the canonical HOW. Its status is `planned-suggestion-not-session-allocation-or-observed-evidence`. It is **not** a command to replace a reserved/frozen session or bypass the existing allocator or three-/four-method selection.

## Deterministic policy

1. Review a recorded wrong **scored** answer attributable to a single reviewed objective. This supports a targeted task review, not a diagnosis of a lasting weakness. More distinct error questions sort first; syllabus order breaks ties. Repeated attempts on one question do not increase evidence strength.
2. Otherwise, cover the first compatible objective with no scored response in the available objective-linked history. This does not claim no previous/outside study. Formative practice, retests, completion totals and presentation do not establish scored coverage.
3. Otherwise, consolidate mixed results, or suggest a retrieval check at a later study session when responses are correct. Prefer objectives with fewer distinct scored questions, without inferring mastery or retention.
4. If no reviewed, compatible material exists, return explicit insufficient evidence. Unsupported topics and invalid/foreign/malformed sources also fail closed.

An incorrect multi-objective question cannot localize a weakness. Such errors are disclosed, but do not independently nominate one weak objective. A known later correct response can remove an immediate error-review prompt; cross-session ordering requires the earlier reported completion to be strictly before the later reported start. Ties, overlapping/missing timestamps and journal order do not establish improvement or ordering. All timing remains client-reported.

Method selection uses small fixed task families, filtered through the existing supported-method inventory, `mapMethodLearningContent` and `compileMappedEconomics`. A proposed objective must be primary material in a supported form, appear in an actual scored question and have a compiled source note. Diagram review requires a real diagram item. Calculation uses Divide Steps; explanation/diagram tasks use Feynman or One Sentence; recall uses Active Recall/Leitner/Memory Palace; application uses existing supported application procedures. Non-trainable and out-of-scope pool entries and the five unsupported Economics engines never enter the choices. Prior use can choose another equally suitable procedure for variety; no personal effectiveness score is calculated.

## Realistic examples from tested canonical fixtures

| Available accepted evidence | Recommendation | Meaning/uncertainty |
| --- | --- | --- |
| PPC Memory Palace: correct responses plus an incorrect `ec9708-1.5-lab-1-v1` diagram answer about spare capacity. | Objective `ec9708-objective-1.5.4`, **Feynman**: use the reviewed PPC utilisation note, explain it with the canonical procedure, then attempt the actual spare-capacity figure question. | `review-recorded-error`, `limited-recorded-answers`; reference identifies the original wrong Lab answer. No lasting-weakness or method-failure claim. |
| Elasticity: wrong single-objective classification response on `ec9708-2.2-lab-5-v1`. | Objective `ec9708-objective-2.2.4`, **Active Recall**: retrieve the responsiveness classifications and check the reviewed classification question. | Recall suitability; not a claim that retrieval is this student's best method. |
| Elasticity: wrong expenditure application on `ec9708-2.2-lab-4-v1`. | Objective `ec9708-objective-2.2.7`, **Divide Steps**: work through the reviewed expenditure question using the canonical steps and check the answer. | Calculation/application suitability; source correctness is client-reported and server-validated against the canonical key. |
| Elasticity: scored answers cover objectives 1, 3, 4, 5, 6 and 8; no scored response covers objective 2 in the supplied history. | Objective `ec9708-objective-2.2.2`, **Divide Steps**: practise a reviewed elasticity calculation. | `cover-unassessed-content`, `task-suitability-only`; no invented supporting answer or outside-study assumption. |
| No accepted history for a playable topic. | Begin a compatible task for its first supported objective, e.g. PPC boundary retrieval with **Active Recall**. | Task-based suggestion, empty evidence references; no invented student statistic. |

The exact action names its objective and a real question stem. Canonical HOW steps remain a separate typed array for later accessible presentation.

## Limitations and Phase 4B

- Evidence strength means distinct **recorded tasks**, not independent/proctored corroboration. Client-reported answers, timestamps and selected methods retain their actual trust level.
- Post-study Baseline is never pre-study knowledge. Lab and top-two-selected Match remain different sources. Sequential methods, reused questions, practice/retests and prior exposure remain limitations, not causal method comparisons.
- Mixed or partial history, unknown historical objective context and missing times are disclosed. Joint questions cannot support precise error attribution. An old error may remain reviewable where chronology cannot establish a later response; it is not claimed to be a current deficit.
- No mastery scores, gains, optimal review intervals, definitive method ranking or absence of outside learning are inferred. Reflection/preferences/AI bonuses are not recommendation performance inputs.
- This returns one actionable next suggestion. It does not change the Training allocator. Phase 4B must verify that any eventual session allocation covers the suggested objective before promising it, and must preserve saved-session decisions.

Phase 4B can consume the typed advisory result for **local development after independent review**, provided it renders uncertainty/provenance, uses authenticated/current-owner sources, distinguishes planned content from observed evidence and leaves scoring/selection untouched. This is not approval for real-student activation or production authority/publication. No browser or live database behavior is claimed by these pure-module tests.

## Validation

Sanitized Node 24 tests exercise all nine playable topics, PPC correct/error/diagram cases, Elasticity recall/calculation and unassessed coverage, no history, missing/legacy context, repeated attempts, sequential carryover, Baseline/Verification provenance, duplicate/conflicting sources, unsupported activities, ownership, missing/tied times, bounded references, deterministic ordering and defensive copies.

Final run: **144 tests passed across six files**, including all **28 new recommendation tests**, 25 Phase 3 integrity tests, 37 mapping tests, 30 cumulative-profile tests, 18 timestamp-integrity tests and six selector regressions. Frontend and backend typechecks passed with zero errors. Frontend production build and backend build passed; Vite retains the existing >500 kB chunk warning. No paid AI or production Firebase calls were used. Existing source files remain untouched; the module has no production callers and no scalability input appears in the active backend build.
