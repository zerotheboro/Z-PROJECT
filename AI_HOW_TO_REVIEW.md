# AI recommendation HOW implementation — local review

> Phase 1 snapshot. Current Phase 2 routing, test results and release blockers are documented in [AI_RECOMMENDATION_RELEASE_VERIFICATION.md](AI_RECOMMENDATION_RELEASE_VERIFICATION.md). AI_HOW_TO_CHANGES.patch remains the Phase 1 feature snapshot; its hardcoded routing excerpt is superseded by Phase 2.

Date: 30 October 2026 (Asia/Bangkok). Local implementation only; not live.

## 1. Summary and dependency map

Each recognized recommendation now presents Why this fits you → How to use it → Keep in mind. HOW is an ordered list of reviewed catalog instructions, not another generated model answer. The personalized reason, warning, study plan, final note and selection order remain intact.

Authoritative METHOD_POOL (37 entries) → existing compact field projection with two approved catalog additions and the unchanged strict model-selection schema → existing server-selected OpenAI Responses model → parse/validate selection → exact catalog identity/branch validation and canonical HOW enrichment → validate enriched API response → existing frontend validator → recommendation cards.

Saving still passes through the existing persistence whitelist. It stores the original four method fields only. On restore/display, the same canonical catalog supplies HOW without rewriting historical documents. Guest storage remains edulience.aiRecommendation.latest.v1; authenticated storage remains users/{uid}/aiRecommendations/latest. Schema version stays 1. HOW text is labeled Reviewed method instructions, not historical AI output.

Library.tsx renders the shared AIRecommendation component. Standard, Deep, restored guest and restored signed-in results use its single recommendation-card rendering path. Apply Methods still navigates to /training/assessment. Assessment loads the existing saved recommendation; aiRecommendationContext resolves method names using the existing Training registry and aliases. No mapping, selection signal or score was changed.

## 2. File inventory

| File | Responsibility | Status | Reason |
| --- | --- | --- | --- |
| methodPool.js | Authoritative AI-recommendable catalog | Modified | Add 144 HOW steps across 37 methods; preserve the original 35 entries and relative ordering |
| recommendationHowTo.js | Canonical lookup/enrichment/validation | New | Reject unknown, ambiguous, duplicate or wrong-branch new selections; override untrusted HOW |
| server.js | Prompt, model, quota and Responses orchestration | Modified | Attach and validate HOW before existing quota finalization |
| server.test.js | Mocked HTTP/API contracts | Modified | Five enrichment/rejection tests; correct pre-existing noncanonical test selections and additive response expectations |
| src/MIDSECTION/AIRecomendation.jsx | Shared cards and interactions | Modified | Visible ordered guide between reason and warning; safe unavailable state |
| src/MIDSECTION/AISTYLE.scss | Scoped recommendation presentation | Modified | Responsive list spacing/wrapping using existing tokens |
| src/MIDSECTION/AIRecomendation.test.tsx | Shared card UI, restoration, mode and navigation tests | Modified | Six new tests; supply the real router contract missing from the existing harness |
| src/services/aiRecommendationPersistence.ts | Validation, cloud/guest save and restore | Inspected only | Its existing whitelist intentionally strips HOW; no schema/rules change needed |
| src/services/aiRecommendationPersistence.test.ts | Persistence compatibility tests | Modified | Prove enriched API results retain the four-field saved representation |
| src/services/recommendationHowTo.test.ts | Catalog and enrichment tests | New | 42 cases including all methods, ambiguous identities, malicious overrides and formula accuracy |
| src/MIDSECTION/info_every_tips.jsx | Longer educational library definitions | Modified: two section-list registrations only; owner content edits preserved | Enroll Calm_start in PRE-LEARN and Sleep_after_studying in META-LEARN using the approved existing definitions |
| src/pages/Library.tsx | Actual AI card mount | Inspected only | Confirm one shared renderer |
| src/MIDSECTION/section_of_each_tips.jsx | Homepage/library integration | Inspected only | Trace existing import; no alternative card renderer found |
| src/AppRouter.jsx | HashRouter and Training destinations | Inspected only | Preserve routing |
| src/quiz/Assessment.tsx | Existing Test Me controller and saved advice lookup | Inspected only | Verify completion/selection flow is untouched |
| src/quiz/aiRecommendationContext.ts | Advice ownership/relevance and Training ID mapping | Inspected only | HOW is neither a selection signal nor a score |
| src/quiz/aiRecommendationLookup.ts | Bounded saved-advice lookup | Inspected only | Unchanged fallback/timing behavior |
| src/services/aiRecommendationAccess.ts | Authenticated quota access | Inspected only | Preserve request and access logic |
| firestore.ai-recommendation.rules | Saved method-field allowlist | Inspected only | Explicitly permits name/branch/reason/warning only; left unchanged |
| aiRecommendationQuota.js; aiRecommendationQuota.test.js | Backend AI reservations/limits | Inspected/tested only | No changes; existing quota test mismatch reproduced on HEAD |
| trainingQuota.js; trainingQuota.test.js | Training reservation limits | Inspected/tested only | No changes; six existing failures reproduced on HEAD |
| billing.test.js; billingServer.test.js | Billing regressions | Tested only | Passed without billing changes |
| src/quiz/__tests__/aiRecommendationContext.test.ts | Test Me mapping regression | Modified | Verify that the two newly recommendable routines do not fabricate Training-engine mappings |
| src/quiz/__tests__/aiRecommendationLookup.test.ts; aiInformedAssessmentIntegration.test.tsx | Test Me compatibility | Tested only | Existing eligibility, 3/4 selection and complete profile journeys pass |
| src/services/aiRecommendationAccess.test.ts | Access response compatibility | Tested only | Passed |
| package.json; tsconfig.json; scripts/build-backend.mjs; eslint.config.js | Existing checks/build tooling | Inspected only | No dependency or configuration changes |
| AI_HOW_TO_REVIEW.md | Full review and measured checks | New | This document |
| AI_HOW_TO_CHANGES.patch | Exact feature-only source/test patch | New | Includes new files; excludes unrelated owner changes and these review artifacts |

## 3. Exact method-pool changes

Before: 35 methods. After: 37 methods, 144 steps. The owner approved Calm Start under PRE-LEARN and Sleep After Studying under META-LEARN. All original 35 names, branches, categories, difficulty, best_for, descriptions, warnings and relative ordering were compared to committed HEAD using deep equality after filtering the two additions and removing only how_to_use. They are unchanged.

The three revised methods follow the current owner-edited library: Divide Steps sequences worked actions and gradually removes hints; Derive Basics reconstructs and checks formulas and uses A = 1/2 ab sin(C); Everything in 1 Place covers resources, workspace, distractions and visible next actions.

Calm Start and Sleep After Studying are now registered in both METHOD_POOL and the approved library section lists. Their concise instructions follow the existing owner-edited definitions. Calm Start remains an optional settling routine, not anxiety treatment or a guaranteed focus boost. Sleep After Studying protects sufficient sleep without requiring study immediately before bedtime. The longer definitions were not rewritten.

Actual git diff:

```diff
diff --git a/methodPool.js b/methodPool.js
index 52a24e5..3e31a1f 100644
--- a/methodPool.js
+++ b/methodPool.js
@@ -7,6 +7,11 @@ category:"motivation",
 difficulty:"beginner",
 best_for:"students who don't know why they are learning something",
 description:"Ask yourself why the topic matters before studying to increase attention and motivation.",
+how_to_use: [
+  "Choose the topic or task you are about to study.",
+  "Ask how it connects to something you need or care about.",
+  "Write one specific goal or question to guide this study session."
+],
 warning:"Less useful if you already have a very clear purpose."
 },
 
@@ -17,6 +22,12 @@ category:"focus",
 difficulty:"beginner",
 best_for:"students who get distracted easily",
 description:"Study in short focused sessions followed by short breaks.",
+how_to_use: [
+  "Choose one specific study task.",
+  "Set a timer for 25 minutes and focus on that task.",
+  "Take a 5-minute break when the timer ends.",
+  "Repeat, taking a longer break after about four rounds."
+],
 warning:"May interrupt deep creative work that requires long uninterrupted focus."
 },
 
@@ -27,6 +38,12 @@ category:"reading",
 difficulty:"intermediate",
 best_for:"students wanting faster visual reading",
 description:"Train peripheral vision to collect more visual information while reading.",
+how_to_use: [
+  "Choose a short, familiar paragraph and look at a word near the middle.",
+  "Without moving your gaze, notice nearby words; do not force yourself to read distant text.",
+  "Read the paragraph normally, then summarize it to check understanding.",
+  "Stop if your eyes feel strained; widen your view only while meaning stays clear."
+],
 warning:"Does not replace comprehension."
 },
 
@@ -37,6 +54,12 @@ category:"organization",
 difficulty:"beginner",
 best_for:"students with messy notes and scattered resources",
 description:"Keep everything related to studying in one organized location.",
+how_to_use: [
+  "Keep subject notes, assignments, deadlines and useful links in one easy-to-find place.",
+  "Prepare only the materials needed for your next task and close unrelated tabs or notifications.",
+  "Keep a short, visible list of what to do next, what is in progress and what is finished.",
+  "After studying, update the list and prepare your first step for next time."
+],
 warning:"Organization alone will not improve learning."
 },
 
@@ -47,6 +70,11 @@ category:"environment",
 difficulty:"beginner",
 best_for:"students who repeatedly open the same study websites",
 description:"Automatically open study tabs when starting the browser.",
+how_to_use: [
+  "Choose the few websites you regularly need for a study task.",
+  "Use your browser's startup settings or a bookmarks folder to open those pages together.",
+  "Before studying, close unrelated tabs and open only the pages needed for your next task."
+],
 warning:"Avoid opening too many tabs."
 },
 
@@ -57,6 +85,11 @@ category:"energy",
 difficulty:"beginner",
 best_for:"students feeling sleepy",
 description:"Drink water and splash water on your face to become more alert.",
+how_to_use: [
+  "Pause your work and take a drink of water if you are thirsty.",
+  "If comfortable, gently splash water on your face and dry it.",
+  "Return to one small task; if you remain sleepy, take a suitable rest rather than using water to replace sleep."
+],
 warning:"Cannot replace proper sleep."
 },
 
@@ -67,6 +100,12 @@ category:"rest",
 difficulty:"beginner",
 best_for:"students overwhelmed by digital stimulation",
 description:"Take a boring break without screens to reset attention.",
+how_to_use: [
+  "Set aside up to 10 minutes for a quiet, screen-free break.",
+  "Sit comfortably and let your eyes rest on a plain wall or another neutral spot.",
+  "Put your phone aside and let thoughts pass without adding another activity.",
+  "When the break ends, return to one clear study task."
+],
 warning:"Don't replace studying with long breaks."
 },
 
@@ -77,6 +116,12 @@ category:"brain warm-up",
 difficulty:"beginner",
 best_for:"students preparing their attention to handle information disorder before studying",
 description:"Warm up executive control by reading colours instead of words.",
+how_to_use: [
+  "Use a short set of colour words printed in mismatched ink colours.",
+  "Say each ink colour aloud instead of reading the word.",
+  "Check mistakes and try one more short round at a comfortable pace.",
+  "Move on to your study task; the exercise is a warm-up, not a measure of intelligence."
+],
 warning:"Not a replacement for actual studying."
 },
 
@@ -87,6 +132,11 @@ category:"energy",
 difficulty:"beginner",
 best_for:"students feeling physically sluggish",
 description:"Perform a few minutes of exercise before studying.",
+how_to_use: [
+  "Choose a few minutes of comfortable movement, such as walking or gentle stretches.",
+  "Move at a pace that leaves you able to speak comfortably; stop if it hurts or makes you dizzy.",
+  "Get settled, then begin one specific study task without turning the warm-up into a long workout."
+],
 warning:"Avoid exhausting yourself."
 },
 
@@ -97,6 +147,12 @@ category:"health",
 difficulty:"beginner",
 best_for:"students wanting long-term cognitive improvement",
 description:"Exercise regularly to support learning and brain health.",
+how_to_use: [
+  "Choose physical activities you enjoy and can do safely.",
+  "Plan regular opportunities to move during the week, starting with a manageable routine.",
+  "Build up gradually, allow rest and adapt the activity to your needs.",
+  "Keep exercise separate from your study checklist; it supports wellbeing rather than replacing practice."
+],
 warning:"Benefits are gradual."
 },
 
@@ -107,6 +163,12 @@ category:"planning",
 difficulty:"beginner",
 best_for:"students who procrastinate because they don't know what to do next",
 description:"Plan your day beforehand to reduce decision fatigue.",
+how_to_use: [
+  "List the tasks and deadlines that matter today.",
+  "Choose a realistic order and reserve time for the most important tasks.",
+  "Leave room for meals, breaks and unexpected delays.",
+  "At the end of the day, move unfinished tasks to a realistic next step."
+],
 warning:"Don't over-plan every minute."
 },
 
@@ -117,6 +179,12 @@ category:"motivation",
 difficulty:"beginner",
 best_for:"students who lose motivation",
 description:"Record completed work to see improvement over time.",
+how_to_use: [
+  "Choose something concrete to track, such as questions attempted and checked.",
+  "After studying, record what you completed and any gaps you noticed.",
+  "Review the record regularly and choose your next practice task.",
+  "Compare similar tasks where possible; time spent alone does not show understanding."
+],
 warning:"Don't spend more time tracking than studying."
 },
 
@@ -127,11 +195,33 @@ category:"health",
 difficulty:"beginner",
 best_for:"students wanting healthier long-term brain performance",
 description:"Eat foods associated with supporting brain function.",
+how_to_use: [
+  "Plan regular meals using a variety of foods available to you.",
+  "Include familiar options such as vegetables, fruit, grains and a source of protein where possible.",
+  "Keep drinking water available and notice whether hunger is interrupting study.",
+  "Keep eating routines practical and suited to your needs; no special food or supplement replaces sleep and practice."
+],
 warning:"Nutrition cannot compensate for poor study habits."
 },
 
 
 
+{
+name:"Calm Start",
+branch:"pre-learn",
+category:"study preparation",
+difficulty:"beginner",
+best_for:"students who want an optional settling routine before starting a task",
+description:"Take an optional moment to settle, set aside distractions and choose one manageable study task.",
+how_to_use: [
+  "Find a comfortable position and put aside avoidable distractions.",
+  "Relax your shoulders and breathe naturally at a comfortable pace for about a minute.",
+  "Notice what is distracting you and jot down reminders you can return to later.",
+  "Choose one small, clear task and begin for five minutes, then decide how to continue."
+],
+warning:"This optional study-start routine is not anxiety treatment or a guaranteed focus boost. Do not force uncomfortable breathing or use preparation to avoid studying."
+},
+
 {
 name:"Header First",
 branch:"meta-learn",
@@ -139,6 +229,12 @@ category:"reading",
 difficulty:"beginner",
 best_for:"students reading textbooks",
 description:"Read headings first to build a mental framework.",
+how_to_use: [
+  "Preview the chapter title, headings, diagrams and summary.",
+  "Turn the headings into questions you expect the chapter to answer.",
+  "Read the full section, using those questions to connect the details.",
+  "Close the book and outline the main ideas, then check what you missed."
+],
 warning:"Still requires reading the full content."
 },
 
@@ -149,6 +245,12 @@ category:"reading",
 difficulty:"beginner",
 best_for:"students losing their place while reading",
 description:"Guide your eyes with a finger or pen.",
+how_to_use: [
+  "Place a finger or pen just below the line you are reading.",
+  "Move it along at a comfortable pace and follow the words.",
+  "Pause or move back whenever the meaning is unclear.",
+  "At the end of a paragraph, summarize it before continuing."
+],
 warning:"Not necessary for everyone."
 },
 
@@ -159,6 +261,12 @@ category:"memory",
 difficulty:"beginner",
 best_for:"students forgetting information quickly",
 description:"Review information over increasing intervals.",
+how_to_use: [
+  "Study a small set of material, then test yourself without looking.",
+  "Schedule another self-test after a gap, such as the next day.",
+  "Check answers and review what you missed.",
+  "Lengthen the gap when recall is reliable and shorten it for material you keep missing."
+],
 warning:"Requires consistent review."
 },
 
@@ -169,6 +277,12 @@ category:"attention",
 difficulty:"beginner",
 best_for:"students who become bored during lectures",
 description:"Simple doodling helps reduce mind wandering.",
+how_to_use: [
+  "Keep your notes and a small blank space beside you during a familiar listening task.",
+  "If simple doodling helps you stay with the talk, use small repeated shapes without planning a detailed drawing.",
+  "Keep recording the main points and check that you can summarize what was said.",
+  "Stop doodling if it competes with listening or note-taking."
+],
 warning:"Don't use when already fully focused."
 },
 
@@ -179,6 +293,12 @@ category:"problem solving",
 difficulty:"intermediate",
 best_for:"students stuck on difficult problems",
 description:"Take a break after trying so unconscious processing can continue.",
+how_to_use: [
+  "Make a genuine attempt at the problem and write down where you are stuck.",
+  "Take a short break or work on something different without repeatedly checking the problem.",
+  "Return and try another approach using your earlier notes.",
+  "Check any new idea against the question; a break does not guarantee a solution."
+],
 warning:"Works only after genuine effort."
 },
 
@@ -189,6 +309,12 @@ category:"memory",
 difficulty:"intermediate",
 best_for:"students rereading instead of testing themselves",
 description:"Retrieve information from memory instead of rereading.",
+how_to_use: [
+  "Study a small section, then close your notes.",
+  "Answer questions or explain the key ideas from memory.",
+  "Check your answers and identify what you missed.",
+  "Test yourself again on the missed material later."
+],
 warning:"Can feel difficult initially."
 },
 
@@ -199,6 +325,12 @@ category:"listening",
 difficulty:"intermediate",
 best_for:"students reviewing familiar material",
 description:"Increase playback speed to better match processing speed.",
+how_to_use: [
+  "Choose a video covering material you already know something about.",
+  "Try a modest speed increase first, moving toward 2x only if you can still follow it.",
+  "Pause to explain the main idea from memory or answer a question.",
+  "Slow down and replay difficult sections instead of trading understanding for speed."
+],
 warning:"Not recommended for completely new topics."
 },
 
@@ -209,6 +341,12 @@ category:"motivation",
 difficulty:"beginner",
 best_for:"students struggling to start studying",
 description:"Reward studying with a preferred activity afterward.",
+how_to_use: [
+  "Choose a specific, manageable study task and an activity you enjoy.",
+  "Decide in advance what counts as finishing the study task.",
+  "Complete and check that task before starting the chosen activity.",
+  "Keep the reward proportionate and choose the next task after the break."
+],
 warning:"Reward should come after work."
 },
 
@@ -219,6 +357,12 @@ category:"practice",
 difficulty:"intermediate",
 best_for:"students solving mixed problem sets",
 description:"Alternate between related topics instead of blocking one topic.",
+how_to_use: [
+  "Learn the basics of two or more related problem types first.",
+  "Mix examples from those types in one practice set.",
+  "For each question, decide which approach fits before solving it.",
+  "Check both your method choice and your answer, then revisit the types you confused."
+],
 warning:"Learn the basics first."
 },
 
@@ -229,6 +373,12 @@ category:"memory",
 difficulty:"beginner",
 best_for:"students memorizing sequences",
 description:"Turn information into memorable stories.",
+how_to_use: [
+  "List the facts or steps you need to remember in their correct order.",
+  "Link them in a short story with clear, memorable events.",
+  "Retell the story without looking and translate each event back into the real fact.",
+  "Check the original material so the story does not replace or distort its meaning."
+],
 warning:"Stories should still preserve accuracy."
 },
 
@@ -239,6 +389,12 @@ category:"understanding",
 difficulty:"intermediate",
 best_for:"students wanting deep understanding",
 description:"Explain concepts simply to reveal knowledge gaps.",
+how_to_use: [
+  "Choose one concept you have already studied.",
+  "Explain it aloud or in writing as if teaching someone new to it.",
+  "Notice gaps, unclear terms or steps you cannot justify and check a reliable source.",
+  "Explain it again simply, keeping necessary technical details accurate."
+],
 warning:"Requires prior study."
 },
 
@@ -249,6 +405,12 @@ category:"memory",
 difficulty:"advanced",
 best_for:"students memorizing ordered information",
 description:"Associate vivid images with familiar locations.",
+how_to_use: [
+  "Choose a familiar route and list a few distinct locations in order.",
+  "Turn each item to remember into a vivid image and place it at one location.",
+  "Walk through the route mentally and retrieve each item.",
+  "Check the original list and revisit weak images; learn the meaning of unfamiliar ideas separately."
+],
 warning:"Not ideal for learning concepts from scratch."
 },
 
@@ -259,9 +421,31 @@ category:"prioritization",
 difficulty:"beginner",
 best_for:"students with limited study time",
 description:"Focus on the most valuable content first.",
+how_to_use: [
+  "Check the learning objectives, upcoming tasks and any feedback you have.",
+  "Identify important ideas or skills that several tasks depend on.",
+  "Practise those priorities first and check your understanding.",
+  "Return to supporting material and remaining requirements rather than assuming an exact 80/20 split."
+],
 warning:"Don't ignore important supporting knowledge."
 },
 
+{
+name:"Sleep After Studying",
+branch:"meta-learn",
+category:"memory",
+difficulty:"beginner",
+best_for:"students who cram late and want to protect sleep while reviewing",
+description:"Adequate sleep supports newly learned information; protect sleep after studying without requiring study immediately before bed.",
+how_to_use: [
+  "Study a manageable amount of material and focus on understanding it.",
+  "Test yourself briefly without looking at your notes.",
+  "Finish with time for a relaxing bedtime routine and sufficient sleep instead of staying up late to cram.",
+  "Check what you remember the next day and review what you missed."
+],
+warning:"Sleep supports memory but does not replace learning or practice. Do not cut sleep short or assume studying immediately before bedtime is necessary."
+},
+
 {
 name:"One Sentence",
 branch:"note-take",
@@ -269,6 +453,12 @@ category:"summarization",
 difficulty:"beginner",
 best_for:"students writing too many notes",
 description:"Compress an idea into one meaningful sentence.",
+how_to_use: [
+  "Read a small section and identify its main claim.",
+  "Write one sentence capturing that claim and its essential connection or condition.",
+  "Compare it with the source and restore any important meaning you left out.",
+  "Use the sentence as a review cue, keeping extra detail elsewhere when needed."
+],
 warning:"Avoid oversimplifying."
 },
 
@@ -279,6 +469,12 @@ category:"organization",
 difficulty:"beginner",
 best_for:"students solving multi-step problems",
 description:"Break complex tasks into simple sequential steps.",
+how_to_use: [
+  "Read the question and identify what you need to find or explain.",
+  "List the actions in order, using a worked example to identify the information or reasoning each step needs.",
+  "Complete the steps and check that the answer addresses the question.",
+  "Try a similar problem with fewer hints until you can solve it independently."
+],
 warning:"Some creative work isn't linear."
 },
 
@@ -289,6 +485,12 @@ category:"understanding",
 difficulty:"intermediate",
 best_for:"students learning formulas",
 description:"Break complex ideas into simpler foundations.",
+how_to_use: [
+  "Choose a formula or concept and identify the basic definitions it depends on.",
+  "Rebuild it step by step, explaining why each connection is valid; check a reliable explanation when needed.",
+  "Hide the derivation and try reconstructing it rather than only copying the final formula.",
+  "Apply the result to a new question and check it; for triangle sides a and b enclosing angle C, A = 1/2 ab sin(C)."
+],
 warning:"Time-consuming for simple topics."
 },
 
@@ -299,6 +501,12 @@ category:"memory",
 difficulty:"intermediate",
 best_for:"students memorizing vocabulary or facts",
 description:"Organize flashcards into review boxes.",
+how_to_use: [
+  "Make flashcards with a clear question on the front and a checked answer on the back.",
+  "Start cards in the first box and try to answer each one before turning it over.",
+  "Move correct cards to the next box; return missed cards to the first box.",
+  "Review early boxes more often and later boxes less often, adjusting the schedule to your recall."
+],
 warning:"Should be combined with understanding and takes a lot of time to implement"
 },
 
@@ -309,6 +517,12 @@ category:"organization",
 difficulty:"beginner",
 best_for:"students preferring structured notes",
 description:"Split each idea into four supporting ideas.",
+how_to_use: [
+  "Write the central idea at the top of your notes.",
+  "Divide it into up to four useful supporting ideas.",
+  "Under each supporting idea, add up to four key details or examples where they fit.",
+  "Check the structure against the source; do not invent points to fill empty spaces."
+],
 warning:"Not every topic fits this format."
 },
 
@@ -319,6 +533,12 @@ category:"memory",
 difficulty:"beginner",
 best_for:"students memorizing lists",
 description:"Create memorable abbreviations using first letters.",
+how_to_use: [
+  "Write the accurate list of terms you need to remember.",
+  "Use their first letters to make a memorable abbreviation or phrase.",
+  "Cover the list and expand the abbreviation back into the full terms.",
+  "Check for omissions or confusing letters and practise the meanings as well as the initials."
+],
 warning:"Avoid confusing abbreviations."
 },
 
@@ -329,6 +549,12 @@ category:"active recall",
 difficulty:"intermediate",
 best_for:"students checking understanding",
 description:"Write from memory, compare with the book, and correct mistakes.",
+how_to_use: [
+  "Study a short section, then close the book.",
+  "Write or explain what you remember without checking the source.",
+  "Compare your attempt with the book and mark missing or inaccurate points.",
+  "Study those gaps, close the book and try again."
+],
 warning:"Requires honesty during self-testing."
 },
 
@@ -339,6 +565,12 @@ category:"note-taking",
 difficulty:"beginner",
 best_for:"students taking lecture notes",
 description:"Separate notes into keywords, main notes, and summaries.",
+how_to_use: [
+  "Divide a page into a main notes area, a narrow cue column and a summary area at the bottom.",
+  "Record the main ideas and examples in the notes area during the lesson or reading.",
+  "Afterward, add questions or keywords in the cue column and write a short summary.",
+  "Cover the notes, answer the cue questions from memory and check your answers."
+],
 warning:"Can feel restrictive during very fast lectures."
 },
 
@@ -349,6 +581,12 @@ category:"reading",
 difficulty:"beginner",
 best_for:"students reviewing textbooks",
 description:"Highlight only key information after understanding the topic.",
+how_to_use: [
+  "Read a short section before marking it.",
+  "Identify the few words or sentences that carry its main ideas.",
+  "Highlight those points sparingly and add a brief question or note if useful.",
+  "Close the text and recall the ideas; use the highlights to check rather than only rereading them."
+],
 warning:"Avoid highlighting everything."
 },
```

## 4. Exact AI prompt changes

No system or Deep instruction wording changed. The generated method context now includes the two newly approved catalog entries.

| Prompt/context | Before versus after | Why |
| --- | --- | --- |
| SYSTEM_PROMPT | Identical | Existing selection/personalization/safety rules already suffice |
| DEEP_RECOMMENDATION_PROMPT | Identical | Deep analysis and planning behavior remain intact |
| METHOD_CONTEXT / COMPACT_METHOD_POOL | Same template/field projection; catalog expanded from 35 to 37 | All entries sent as n, b, c, f, d, w; HOW never sent |
| buildUserPrompt | Identical | Student inputs and treatment unchanged |

The compact data for the original 35 entries remains identical. The complete pool grew from 7,219 to 8,043 UTF-8 bytes when the two approved entries were enrolled: 824 bytes, roughly 206 input tokens at four bytes/token. This is a heuristic, not tokenizer telemetry. Full raw METHOD_POOL objects and HOW instructions are not sent. The original system/Deep prompt wording remains unchanged.

## 5. Backend and schema diffs

The strict OpenAI output schema remains name, branch, reason and warning for each of 1–3 methods. New successful API responses add how_to_use. isRecommendationResult now optionally requires a canonical guide; the backend enables that requirement after enrichment, before finalizing the existing reservation.

Canonical identity matching uses full catalog names with case/outer-whitespace tolerance. No fuzzy, substring or punctuation-stripping aliases are guessed. Backend branch mismatch, duplicate methods and unknown names fail through the existing error/release path. A supplied how_to_use field cannot overwrite the reviewed instructions.

Display-time lookup uses the unique known name, so older records whose branch was a category label still receive the correct guide. Unknown or ambiguous saved names receive an unavailable message. Neither the older payload nor its timestamp is changed.

There are no production persistence service changes. Existing frontend validation strips extra HOW before both guest and cloud saving; therefore existing Firestore permissions remain compatible.

```diff
diff --git a/server.js b/server.js
index e892ad4..dc48935 100644
--- a/server.js
+++ b/server.js
@@ -34,6 +34,7 @@ import {
   PREMIUM_AI_DAILY_LIMIT
 } from "./aiRecommendationQuota.js";
 import { METHOD_POOL } from "./methodPool.js";
+import { attachRecommendationHowTo, hasReviewedHowTo } from "./recommendationHowTo.js";
 import {
   createFirebaseTrainingQuotaManager,
   TrainingQuotaExceededError,
@@ -381,7 +382,7 @@ function validateRecommendationInput(body) {
   return { value: validated };
 }
 
-function isRecommendationResult(value) {
+function isRecommendationResult(value, requireReviewedHowTo = false) {
   if (
     !value
     || typeof value !== "object"
@@ -404,6 +405,7 @@ function isRecommendationResult(value) {
     && typeof method.branch === "string"
     && typeof method.reason === "string"
     && typeof method.warning === "string"
+    && (!requireReviewedHowTo || hasReviewedHowTo(method))
   );
 }
 
@@ -1297,13 +1299,17 @@ export function createRecommendationApp({
           });
         }
 
-        const result = JSON.parse(response.output_text);
+        const selection = JSON.parse(response.output_text);
 
-        if (!isRecommendationResult(result)) {
+        if (!isRecommendationResult(selection)) {
           throw new Error(
             "OpenAI returned an invalid recommendation payload"
           );
         }
+        const result = attachRecommendationHowTo(selection);
+        if (!isRecommendationResult(result, true)) {
+          throw new Error("Invalid reviewed recommendation instructions");
+        }
 
         try {
           await aiRecommendationQuota.finalize(
```

New shared enrichment module:

```diff
diff --git a/recommendationHowTo.js b/recommendationHowTo.js
new file mode 100644
--- /dev/null
+++ b/recommendationHowTo.js
@@ -0,0 +1,50 @@
+import { METHOD_POOL } from "./methodPool.js";
+
+// Names are the existing catalog identities. Case/outer whitespace are harmless;
+// do not guess aliases, strip punctuation, or match substrings.
+const identity = value => typeof value === "string" ? value.trim().toLowerCase() : null;
+
+/** @param {readonly { name: string, branch: string, how_to_use: string[] }[]} pool */
+export function createMethodInstructionLookup(pool) {
+  const methods = new Map();
+  for (const method of pool) {
+    const key = identity(method.name);
+    if (!key || methods.has(key)) throw new Error("Ambiguous method catalog identity");
+    if (!Array.isArray(method.how_to_use) || method.how_to_use.length < 3 || method.how_to_use.length > 4
+      || Array.from(method.how_to_use).some(step => typeof step !== "string" || !step.trim() || step.length > 400)) {
+      throw new Error("Invalid reviewed method instructions");
+    }
+    methods.set(key, { name: method.name, branch: method.branch, steps: [...method.how_to_use] });
+  }
+  /** @param {unknown} name @param {unknown} [branch] */
+  function lookup(name, branch) {
+    const method = methods.get(identity(name));
+    if (!method || (branch !== undefined && identity(branch) !== identity(method.branch))) return null;
+    return [...method.steps];
+  }
+  return lookup;
+}
+
+export const getReviewedHowTo = createMethodInstructionLookup(METHOD_POOL);
+
+/** Enrich only after validating model output. Canonical steps always win.
+ * @template {{recommended_methods: {name: string, branch: string}[]}} T
+ * @param {T} result
+ */
+export function attachRecommendationHowTo(result) {
+  const seen = new Set();
+  return { ...result, recommended_methods: result.recommended_methods.map(method => {
+    const key = identity(method.name);
+    const steps = getReviewedHowTo(method.name, method.branch);
+    if (!steps || seen.has(key)) throw new Error("Unknown, ambiguous or repeated recommended method");
+    seen.add(key);
+    return { ...method, how_to_use: steps };
+  }) };
+}
+
+export function hasReviewedHowTo(method) {
+  const steps = getReviewedHowTo(method.name, method.branch);
+  return steps !== null && Array.isArray(method.how_to_use)
+    && steps.length === method.how_to_use.length
+    && steps.every((step, index) => step === method.how_to_use[index]);
+}
```

Persistence compatibility regression:

```diff
diff --git a/src/services/aiRecommendationPersistence.test.ts b/src/services/aiRecommendationPersistence.test.ts
index 858b0f8..945cb03 100644
--- a/src/services/aiRecommendationPersistence.test.ts
+++ b/src/services/aiRecommendationPersistence.test.ts
@@ -79,6 +79,14 @@ beforeEach(() => {
 });
 
 describe("AI recommendation persistence", () => {
+  it("keeps display-only HOW out of guest and cloud storage, preserving existing rules and saved fields", async () => {
+    const enriched = { ...result, recommended_methods: result.recommended_methods.map(method => ({ ...method, how_to_use: ["Display-only steps"] })) };
+    expect(validateRecommendationResult(enriched)).toEqual(result);
+    await saveAIRecommendation({ kind: "guest" }, inputs, enriched);
+    expect(JSON.parse(window.localStorage.getItem(GUEST_AI_RECOMMENDATION_STORAGE_KEY)!).result).toEqual(result);
+    await saveAIRecommendation({ kind: "user", uid: "how-test-user" }, inputs, enriched);
+    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ result }));
+  });
   it("stores a successful guest recommendation under the versioned key", async () => {
     await saveAIRecommendation(
       { kind: "guest" },
```

## 6. Frontend diffs

The same native ordered list is visible on each recognized card in both modes and after restoration. Existing layout, typography, colors, methods order, Start Again and Apply Methods remain. Scoped wrapping/spacing is added; no global design variables or mobile breakpoints changed.

```diff
diff --git a/src/MIDSECTION/AIRecomendation.jsx b/src/MIDSECTION/AIRecomendation.jsx
index 00c2579..8f4f32d 100644
--- a/src/MIDSECTION/AIRecomendation.jsx
+++ b/src/MIDSECTION/AIRecomendation.jsx
@@ -11,6 +11,7 @@ import {
   validateRecommendationResult
 } from "../services/aiRecommendationPersistence";
 import './AISTYLE.scss';
+import { getReviewedHowTo } from "../../recommendationHowTo.js";
 
 import {
   NavLink,
@@ -18,6 +19,15 @@ import {
   useNavigate
 } from "react-router-dom";
 
+function MethodHowTo({ name }) {
+  const steps = getReviewedHowTo(name);
+  return <div className="method-how-to">
+    <strong>How to use it</strong>
+    {steps ? <ol>{steps.map(step => <li key={step}>{step}</li>)}</ol>
+      : <p>Practical steps are unavailable for this saved method.</p>}
+    {steps && <small>Reviewed method instructions</small>}
+  </div>;
+}
 
 
 export default function AIRecommendation() {
@@ -627,6 +637,8 @@ export default function AIRecommendation() {
                           {method.reason}
                         </p>
 
+                        <MethodHowTo name={method.name} />
+
                         <p className="warning">
                           <strong>Keep in mind</strong>
                           {method.warning}
```

```diff
diff --git a/src/MIDSECTION/AISTYLE.scss b/src/MIDSECTION/AISTYLE.scss
index 2cb9c60..be4d126 100644
--- a/src/MIDSECTION/AISTYLE.scss
+++ b/src/MIDSECTION/AISTYLE.scss
@@ -507,6 +507,19 @@
       }
     }
 
+    .method-how-to {
+      margin-top: var(--space-1);
+      min-width: 0;
+      overflow-wrap: anywhere;
+      font-size: clamp(0.95rem, 0.3vw + 0.9rem, 1.1rem);
+      line-height: 1.65;
+
+      > strong { display: block; color: var(--darker-black); }
+      ol { margin: 0.4rem 0; padding-left: 1.5rem; list-style: decimal outside; }
+      li { margin-top: 0.35rem; }
+      small { display: block; font-size: 0.8em; }
+    }
+
     .warning {
       padding: var(--space-1);
```

Library enrollment delta only (the existing owner-authored definition changes are deliberately excluded from this feature-only patch):

```diff
diff --git a/src/MIDSECTION/info_every_tips.jsx b/src/MIDSECTION/info_every_tips.jsx
index 490f087..7ff25d4 100644
--- a/src/MIDSECTION/info_every_tips.jsx
+++ b/src/MIDSECTION/info_every_tips.jsx
@@ -1232,6 +1344,7 @@ export const preLearnTips = [
   describe_problems,
   Flowtime_technique,
   Everything_in_1_place,
+  Calm_start,
   Auto_google,
   Water_ur_face_body,
  real_music,
@@ -1261,6 +1374,7 @@ export const metaLearnTips = [
   FEYNMAN_technique,
   Memory_Palace,
   twenty_eighty_rule,
+  Sleep_after_studying,
   Summary_and_print_meta
 
 ]
```

## 7. Example recommendation

Mocked illustration only — not genuine model output or real student data.

**Active Recall**

**Why this fits you**

You said you reread science notes but struggle to remember them in tests. Practising retrieval gives you a way to check what you can recall without the notes.

**How to use it**

1. Study a small section, then close your notes.
2. Answer questions or explain the key ideas from memory.
3. Check your answers and identify what you missed.
4. Test yourself again on the missed material later.

*Reviewed method instructions.*

**Keep in mind**

Understand the material first and check your answers afterward. Difficulty recalling something identifies a practice gap; it does not show that you cannot learn it.

## 8. Cost comparison

Configured provider: OpenAI Responses API through the existing SDK. Standard: gpt-6-luna. Deep: gpt-6.1-sol. Writing Judge stays gpt-5.6-luna and is unaffected. No models, service tiers, reasoning settings, tools or retry settings changed. Existing SDK maxRetries is 0.

Official short-context Standard rates checked on 30 October 2026:

| Model | Input / 1M | Output / 1M | Cached read / 1M | 30m cache write / 1M |
| --- | --- | --- | --- | --- |
| gpt-6-luna | $0.10 | $0.50 | $0.01 | $0.125 |
| gpt-6.1-sol | $2.00 | $10.00 | $0.10 | $2.50 |

Sources: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [API pricing](https://developers.openai.com/api/docs/pricing).

No historical production dataset was accessed: measured sample size 0; mean and median unavailable. The user's 2,000 input / 600 output figures are illustrative, not a verified average. Scenario A assumes the original 35-entry catalog. B adds approximately 206 input tokens for the two approved catalog entries; HOW attachment adds none. All scenarios assume uncached short-context requests, no explicit cache writes, no tools, and output counts including all billable generated tokens.

For C only: full name+HOW JSON for 37 methods is 12,259 characters; HOW JSON for the three original example methods is 985 characters. At a deliberately rough four characters/token, C adds 3,065 input and 247 output tokens on top of B. This is a size-based estimate, not tokenizer measurement, and excludes potential new schema/instruction overhead and any change in reasoning usage. C is not implemented.

| Model | Scenario | Input tokens | Billable output tokens | Per request | Per 100 | Per 1,000 | Per 10,000 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-luna | A: previous | 2000 | 600 | $0.0005 | $0.05 | $0.5 | $5 |
| gpt-6-luna | B: backend HOW | 2206 | 600 | $0.0005206 | $0.05206 | $0.5206 | $5.206 |
| gpt-6-luna | C: generate HOW | 5271 | 847 | $0.0009506 | $0.09506 | $0.9506 | $9.506 |
| gpt-6.1-sol | A: previous | 2000 | 600 | $0.01 | $1 | $10 | $100 |
| gpt-6.1-sol | B: backend HOW | 2206 | 600 | $0.010412 | $1.0412 | $10.412 | $104.12 |
| gpt-6.1-sol | C: generate HOW | 5271 | 847 | $0.019012 | $1.9012 | $19.012 | $190.12 |

Formula: input_tokens / 1,000,000 × input_rate + output_tokens / 1,000,000 × output_rate.

When applicable, split total input into uncached reads, cached reads and cache writes and apply their respective rates without double-counting. No cache-hit/write ratio has been measured here. Reasoning tokens are billed at the output rate and are included in usage.output_tokens; if 600 describes only visible text, add reasoning tokens before estimating. [Official reasoning billing guidance](https://developers.openai.com/api/docs/guides/reasoning).

Existing recommendation telemetry logs selected/returned model, request attribution, input_tokens, output_tokens and total_tokens. It does not currently break out cached/reasoning categories. This task adds no monitoring system. Client resubmission can incur another request charge; backend SDK automatic retries remain disabled.

HOW attachment adds zero model tokens and zero model calls. Compared with the original 35-method system, B's estimated extra 206 input tokens come solely from the two approved compact catalog entries. HTTP/bundle text for displayed guides is not model generation output.

## 9. Self-audit

### Automated results

Sanitized Node 24.22.1; injected OpenAI/Firebase mocks; no real student data, live Firebase writes or paid requests.

- New HOW coverage: 58 new cases passed (46 catalog/helper, 5 server, 6 card/navigation, 1 persistence).
- Latest enrolled-catalog checks: 99 passed (27 shared AI UI, 46 catalog/helper, 11 persistence, 15 Training mapping/context). Another 8 targeted backend contract tests passed in Standard/Deep mode; other backend tests were intentionally skipped in that focused rerun.
- Feature/frontend subset: 84 passed (27 shared AI UI, 46 catalog/helper, 11 persistence).
- Initial 35-method-stage broader regression command: 171 passed, 11 failed across 10 files.
- Initial 35-method-stage server command: 43 passed, 1 failed; billingServer's 10 tests also passed.
- Initial stage unique focused cases: 224 passed, 12 existing quota failures. This is not a full-suite result; the current 37-method follow-up checks above passed without new failures.
- Eleven quota failures reproduced against committed HEAD using an in-memory source loader: five AI quota and six Training quota failures. Their source files and tests are byte-for-byte unchanged in this task.
- The remaining server quota mismatch also reproduced against HEAD: test expects Free=4; current committed implementation returns Free=3. Current AI constants are Guest=1, Free=3, Premium=10 and Deep=1; deliberately unchanged.
- Existing UI harness on HEAD fails because useNavigate lacks a Router. The feature tests now supply MemoryRouter and separately verify Apply Methods reaches /training/assessment; no product routing was altered.
- Frontend typecheck: passed, zero errors.
- Backend typecheck and build: passed.
- Frontend production build with envDir:false: passed; existing >500 kB chunk warning remains.
- Relevant JavaScript ESLint check: passed; existing browser-mapping-data freshness notice remains.
- git diff --check: passed at validation.
- Existing dev-only logs from mocked access failures and the pre-existing maxlength React attribute warning remain; unrelated runtime code was not changed.

Tests check canonical coverage/identity preservation, sparse/invalid instructions, wrong branches, duplicates, hostile HOW overrides, response ordering, all three cards, fresh and restored Standard/Deep results, legacy/unrecognized records, read-only restoration, unchanged saved keys/fields, one model request/reservation, failed-output reservation release, Start Again, Apply Methods and existing AI-informed Test Me behavior.

### Browser and live limits

Browser inventory returned no browsers or native app connection. Desktop/mobile visual QA, screenshots and real-browser interaction are NOT VERIFIED. Ordered-list rendering is tested in jsdom and the existing responsive layout is preserved; no mobile layout claim is made from jsdom.

Live OpenAI and the deployed backend were not tested. No deployment has occurred.

### Preserved work and scope

Existing owner content modifications in src/MIDSECTION/info_every_tips.jsx and src/footer.jsx, and the untracked src/image/tiktok.png, were preserved. Only two section-list enrollment lines were added to info_every_tips.jsx in this follow-up. No Training/scoring/profile aggregation, quota, billing, Firebase-rule or production-configuration source was modified.

Every feature-created/modified source and test is included in AI_HOW_TO_CHANGES.patch. This report and that patch are the only additional review artifacts.

## 10. Approval boundary

All changes remain local. No commit, push, deployment, migration, student-data modification or Firebase rule update. Genuine V2 admission and production publication were not activated.

The owner approved both new catalog branches; both methods are enrolled. User review remains necessary for instruction wording and browser/mobile presentation. The quota mismatches are a separate pre-existing matter, not repaired here.

AI HOW-TO FEATURE IMPLEMENTED LOCALLY — AWAITING USER REVIEW.

