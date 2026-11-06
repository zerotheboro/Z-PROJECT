# Economics topic-content mapping — Phase 1

Students still select an entire topic. This phase adds internal, on-demand mapping APIs for the nine existing playable packs; it adds no objective picker, recommendation logic, upload route or persistence schema.

## Scope and source identities

`objectives.ts` maps all 43 numbered subpoints across 1.3–1.6 and 2.1–2.5. Objective IDs are stable source identities such as `ec9708-objective-1.5.2`, with a separate `ec9708-objectives-1` mapping version and existing `2026-v2-pilot-1` content version. Each objective references the exact existing note and question memberships. Notes, questions, answer keys and content-set IDs are not rewritten.

Content types distinguish recall, conceptual explanation, formulas, calculations, relationships, causal explanation, application and diagram interpretation. They describe source capabilities, not calibrated item difficulty or proof of mastery. A question's existing coverage links objectives; it does not prove the question separately measures every content type of those objectives. Diagram references require an actual supplied figure. Text about a curve alone never becomes a diagram assessment.

| Topic | Mapped objectives | Examples |
| --- | ---: | --- |
| 1.3 Factors of production | 5 | Inputs, capital, rewards, specialisation, entrepreneurship |
| 1.4 Resource allocation | 2 | System decisions and allocation mechanisms |
| 1.5 PPC | 4 | Definitions/boundary, opportunity cost, capacity shifts, utilisation; actual figure-linked items |
| 1.6 Goods and services | 4 | Free/private, public, merit and demerit goods |
| 2.1 Demand and supply | 7 | Effective demand, aggregation, determinants, shifts and movements |
| 2.2 Elasticity of demand | 8 | PED/YED/XED, calculations, signs, classifications, relationships, determinants, expenditure, application |
| 2.3 Elasticity of supply | 5 | Definition, calculation, interpretation, constraints and applications |
| 2.4 Market interaction | 4 | Equilibrium, adjustment, linked markets and price functions |
| 2.5 Surplus | 4 | Consumer/producer definitions and figures, calculations, changes and relationships |

The thirteen unimplemented topics remain unavailable.

## API and integration boundary

- `getEconomicsObjectiveMapping(topicId)` resolves a whole topic's reviewed source map, including Baseline question links.
- `getEconomicsMethodLearningContent(sets, contentSetId)` resolves the exact existing Lab/Match form, including its allocation offset, then constructs a plan. It does not allocate new questions.
- `mapMethodLearningContent(pack, method, phase, form)` selects primary objective material suited to the existing procedure. Supporting notes cover every assigned assessment objective that is not primary. It preserves separate ordinary, unscored-practice and final-test memberships.
- `requireSupportedLearningContent(plan)` throws for an unsupported plan. Unsupported plans contain reasons and source/assessment metadata, but no selected study material.

Plans copy the existing Training registry's HOW (`methodIntroductionData`) and, where a genuine name match exists, the reviewed AI library HOW (`METHOD_POOL`). Active Blurting, Capture & Create and Kidlin's Rule have no separate entry in that pool; their Training HOW remains the source. No replacement procedure or alias is invented.

Abbreviation references the existing terms, Story Telling references existing ordered reasoning steps, and Divide Steps references those process steps. Term-to-objective and step-to-objective membership is currently unknown, so those topic-level resources carry no fabricated objective IDs. Explanatory methods prioritise conceptual/causal material; their assigned calculation questions retain the relevant supporting notes. A whole-topic session can therefore contain several aspects without claiming exhaustive coverage.

**Existing v1 rendering is deliberately preserved.** These APIs sit alongside the existing content resolver. They do not replace the study material behind saved v1 IDs, filter the selector, remove Labs, change question counts or change 3/4-method and top-two rules. No per-method copy of the full objective map is eagerly added to engine data. A future consumer of the new material plans must require a supported result before use and must version any changed student-visible form. This phase does not claim existing legacy engine activities have acquired the stricter mapping guarantees merely because a map exists.

## Unsupported structured mappings

For all nine packs, these five plans fail closed rather than fabricate the required resources:

| Method | Missing compatibility condition |
| --- | --- |
| Interleaving | Reviewed grouping of assigned examples into distinct problem types/approaches |
| Derive Basics | A checked, step-by-step derivation; generic reasoning steps are insufficient |
| Doodle Effect | Reviewed HOW requires familiar listening; existing Training uses relationship drawings |
| 80/20 Rule | Reviewed priorities/dependencies; array position does not establish importance |
| 2X Video Speed | Familiarity and the reviewed adjustable-playback procedure are not established |

The other 18 methods have source-material plans in both phases. This is content compatibility, not an effectiveness claim, a complete audit of every engine's enactment of HOW, or a guarantee of prior knowledge. Missing material, incorrect counts, exhausted forms, repeated items, cross-topic questions, cross-phase questions and unknown versions reject. The existing eight-location palace capacity remains a constraint, not an automatically expanded list.

## Evidence boundary and remaining work

Every plan is labelled `planned-not-observed`. Existing evidence can resolve its known content version and question IDs to this source map, but this phase does not add objective IDs to completed evidence, alter profile arithmetic or retroactively claim what historical students studied. No new fields are written to Firestore or the outbox.

Before objective-level evidence collection: capture actual material presentation and actual assessed items; distinguish study, unscored practice and scored testing; retain immutable mapping/procedure versions; review missing resource-to-objective links; resolve unsupported plans; and define comparable objective-level assessment conditions. Interleaving/Leitner still retain unknown question exposure where the current evidence schema cannot represent unscored practice. No short session establishes whole-topic mastery. No coverage rotation/recommendation scheduler is implemented.

Any future change to mappings or HOW bindings requires version review. A source map alone must never reconstruct historical observation claims, establish authenticated ownership or promote legacy practice to verified evidence.

## Changed files and validation

Changed by this task: `src/quiz/economics9708/adapter.ts`; new `objectives.ts`, `methodContentMapping.ts`, `src/quiz/__tests__/economicsObjectiveMapping.test.ts`, and this report. Earlier working-tree changes are preserved.

Sanitized Node 24 validation: **393 tests passed across 14 files**, including **37 new mapping tests**. The mapping tests check all nine topics, 43 source objectives, 23 methods and both phases, including allocated forms and unsupported plans. Existing Economics, canonical method/content, 3/4 selection, drafts, scoring, completion/outbox V1/V2, saved profile and individual-history regressions passed.

Frontend/backend typechecks have zero errors. Frontend and backend builds passed. The frontend retains the existing bundle-size warning. Initial sandbox/config-loader build attempts failed on path access / the existing Vite `__dirname` configuration; the normal sanitized builds subsequently passed outside that filesystem sandbox without changing configuration. Changed-file whitespace checks passed. No production Firebase or paid AI calls were used; no migration, commit, push or deployment occurred. Browser QA was not performed because this task changes no visible interface.
