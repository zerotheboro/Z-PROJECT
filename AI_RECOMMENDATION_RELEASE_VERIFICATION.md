# Phase 2 — Recommendation routing and release verification

Date: 30 October 2026 (Asia/Bangkok).
Status: **BLOCKED — deployed backend parity and real-browser/live verification remain unverified.**

Routing implementation is complete locally. This report does not authorize deployment or paid model calls.

## Files modified in this phase

| File | Change |
| --- | --- |
| src/services/recommendationApi.ts | New shared, validated environment-configurable API base resolver |
| src/services/recommendationApi.test.ts | New production/development routing and malformed-configuration tests |
| src/services/aiRecommendationAccess.ts | Access GET uses the shared resolver; remove duplicate default/base logic |
| src/services/aiRecommendationAccess.test.ts | Verify explicit local configuration and unchanged guest headers |
| src/MIDSECTION/AIRecomendation.jsx | Recommendation POST uses the same shared resolver |
| src/MIDSECTION/AIRecomendation.test.tsx | Verify local Standard/Deep GET+POST parity, Firebase headers, production defaults and fail-closed configuration |
| src/quiz/__tests__/aiRecommendationContext.test.ts | Explicit new-routines-only four-method fallback and mixed supported-method exclusion regression |
| AI_RECOMMENDATION_RELEASE_VERIFICATION.md | This release matrix, parity procedure and remaining blockers |
| AI_HOW_TO_REVIEW.md | Mark the previous packet as the Phase 1 snapshot and link this current routing report |

All earlier HOW implementation changes and unrelated owner work remain in the worktree. This phase does not edit server.js, methodPool.js, recommendationHowTo.js, scoring, quotas, billing, production configuration or Firestore rules.

## Exact routing change

Previously POST ignored environment configuration:

```js
fetch("https://z-project-ba3t.onrender.com/api/recommend", options)
```

Now:

```js
fetch(`${resolveRecommendationApiBase()}/api/recommend`, options)
```

Access GET now uses:

```ts
fetcher(`${resolveRecommendationApiBase(context.apiBase)}/api/recommend/access`, options)
```

Both import the same resolver from src/services/recommendationApi.ts. Production and development default to https://z-project-ba3t.onrender.com; localhost is never inferred.

Configuration precedence is an existing service-test override, then VITE_API_BASE_URL, then the Render default. Normal app callers supply no override. The existing access-service fetcher injection remains available for tests.

The shared resolver:

- Accepts a trusted HTTPS backend configuration and normalizes trailing slashes.
- Allows HTTP only for an explicitly configured loopback backend in a development build.
- Rejects production loopback targets, including common IPv4/IPv6/encoded aliases.
- Rejects loopback from a public frontend hostname even if a development build is accidentally hosted there.
- Rejects unspecified addresses, non-HTTP(S) schemes, relative URLs, URL credentials, query strings, fragments, inner whitespace and backslashes.
- Fails closed with a generic configuration error before fetch; it never echoes the configured value.
- Does not choose a backend from location, user inputs, localStorage or recommendation output. The page hostname is only an additional rejection guard.

Firebase token retrieval, Authorization headers, JSON inputs, mode, responses, reservation handling, persistence format and existing error handling are preserved. Both endpoints share the configured origin; an access GET can no longer silently use a local target while the recommendation POST goes to Render.

### Explicit local configuration

In a local development shell only, after preparing an isolated/mock local backend:

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:3001"
npm run dev
```

server.js defaults to port 3001; use the actual local backend port if different. With Vite's default frontend port, the adviser is on http://127.0.0.1:5173/#/library.

This task did not start the real server entrypoint, load its credentials, or configure its Firebase dependencies. A local backend URL alone does not isolate its database or AI provider. Use mocks or separately approved isolated dependencies, and do not submit a real model request without explicit paid-request approval.

Use a clean production build environment with VITE_API_BASE_URL unset or explicitly set to the HTTPS Render origin. Do not carry the local value into a production build. Configuration is build-time Vite configuration; changing it requires restarting the development server or rebuilding the frontend. Invalid production local configuration fails requests rather than silently falling back.

No .env file, deployment setting or provider configuration was changed here.

## Local versus deployed backend

| Requirement | Local evidence | Deployed Render |
| --- | --- | --- |
| Canonical catalog | 37 unique methods | NOT VERIFIED |
| Reviewed HOW instructions | 144 total steps | NOT VERIFIED |
| Canonical enrichment and validation | All 37 validated; mocked Standard/Deep HTTP tests pass | NOT VERIFIED |
| Calm Start | pre-learn, canonical steps present | NOT VERIFIED |
| Sleep After Studying | meta-learn, canonical steps present | NOT VERIFIED |

An unauthenticated GET to the Render root was attempted through sanitized Node fetch; it returned a fetch error before usable HTTP evidence. A separate web read also reported the URL inaccessible. This does not prove Render is down or outdated. No running revision or catalog metadata was obtained.

The repository's backend has no public version/catalog manifest route. The available tools do not provide authenticated Render deployment inspection. No live AI, access/quota, billing or student-data endpoint was called.

Consequently, there is no defensible claim that Render matches or differs from the local feature. Successful local tests cannot fill this evidence gap.

### Local reference manifest

Only public method data and normalized source-file content were hashed. No credentials, environment files, private student data or runtime secrets were inspected.

```json
{
  "methodCount": 37,
  "howStepCount": 144,
  "canonicalValid": true,
  "approvedBranches": [
    {
      "name": "Calm Start",
      "branch": "pre-learn"
    },
    {
      "name": "Sleep After Studying",
      "branch": "meta-learn"
    }
  ],
  "catalogSha256": "c22c0102c490e181868f9e154f2b14219ef1253c3a84517272c177f7ce8f219e",
  "sourceHashes": {
    "server.js": "7e6d2996d68cf728a971cd1def6164453c724fb109071a53d9b713fe4f42b3c9",
    "methodPool.js": "9ad681eefbb85b5a4ffd39b05525b576c868634604e21583ab804cdc9c5565f2",
    "recommendationHowTo.js": "57929032c189fdfed64ace3475e9da581a5954f88bc9d51c1c59d8528a57ec35"
  }
}
```

### Read-only procedure to finish parity verification

The owner can run the following from the actual running backend's project root using an authorized Render Shell. It imports only the catalog and pure HOW helper; it does not import server.js, initialize Firebase, call OpenAI, read .env or write files. If the HOW module is absent, that itself is useful deployment evidence.

```js
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { METHOD_POOL } from "./methodPool.js";
import { attachRecommendationHowTo, hasReviewedHowTo } from "./recommendationHowTo.js";

const hash = value => createHash("sha256").update(value).digest("hex");
const catalog = METHOD_POOL.map(({ name, branch, how_to_use }) => ({ name, branch, how_to_use }));
console.log(JSON.stringify({
  methodCount: METHOD_POOL.length,
  howStepCount: catalog.reduce((n, m) => n + m.how_to_use.length, 0),
  canonicalValid: METHOD_POOL.every(method => hasReviewedHowTo(
    attachRecommendationHowTo({ recommended_methods: [{
      name: method.name, branch: method.branch,
      reason: "Verification fixture", warning: "Verification fixture"
    }] }).recommended_methods[0]
  )),
  approvedBranches: catalog
    .filter(m => ["Calm Start", "Sleep After Studying"].includes(m.name))
    .map(({ name, branch }) => ({ name, branch })),
  catalogSha256: hash(JSON.stringify(catalog)),
  sourceHashes: Object.fromEntries(
    ["server.js", "methodPool.js", "recommendationHowTo.js"].map(file => [
      file, hash(readFileSync(file, "utf8").replace(/\r\n/g, "\n"))
    ])
  )
}, null, 2));
```

Run it as a Node ES module, for example through node --input-type=module. Compare all manifest fields, then bind that evidence to the Render deployment record, entrypoint and running revision. A hash from another checkout or an unbound caller-supplied manifest is not proof of what the running service serves. No production authority, entitlement or IAM guarantee follows from this comparison.

## Prepared end-to-end release matrix

PASS below means mocked/local automated evidence, not a live-student claim.

| Scenario | Local result | Evidence | Remaining live/browser check |
| --- | --- | --- | --- |
| Standard recommendation | PASS | server.test.js and AIRecomendation.test.tsx select Standard and render fresh guides | Authenticated controlled request pending explicit paid-call approval |
| Deep recommendation | PASS | Premium-authorized Deep uses its existing server-selected model; local GET/POST share base | Verified Premium live canary pending |
| Canonical HOW | PASS | recommendationHowTo.test.ts covers all 37; hostile supplied HOW cannot override catalog | Deployed catalog/helper parity pending |
| Card order | PASS | Reason, semantic ordered HOW list, then warning asserted in DOM | Desktop/mobile visual QA pending |
| Saved restoration | PASS | Guest/user and Standard/Deep restore; no historical rewrite or new request | Browser refresh with synthetic isolated account pending |
| Apply Methods to Test Me | PASS at tested boundaries | Existing route target and full mocked assessment journeys | One browser workflow with isolated services pending |
| Non-trainable exclusions | PASS | Calm Start and Sleep After Studying resolve to no Training engine ID | No engine registration introduced |
| Traditional four-method fallback | PASS | Both routines alone produce zero nominations and the unchanged four-method selection; mixed advice retains only Active Recall | Covered by existing full traditional journey tests |
| Authentication/access restrictions | PASS | Same bearer headers; backend auth/Deep denials; invalid production routing transmits nothing | Real Auth/backend integration pending |
| Mobile layout/readability | NOT VERIFIED | Existing scoped responsive CSS preserved; no browser connection available | Manual/browser QA required |

### Browser/mobile plan

Use synthetic accounts and an isolated mocked backend. Do not use a real student account or let mock/browser testing contact production endpoints.

1. Open the adviser at the HashRouter Library URL; verify all GET/POST requests target the explicit mock origin.
2. At desktop width and 375/390-pixel mobile widths, render three guides including Calm Start, Sleep After Studying and a long-name method.
3. Check no horizontal clipping, readable ordered steps, correct section order and accessible keyboard navigation.
4. Generate mocked Standard and Deep results; verify visible steps, cautions, loading, safe errors and retry behavior.
5. Refresh saved results, switch synthetic accounts, and verify no stale recommendation from another owner remains.
6. Use Start Again and Apply Methods. Verify the two routines are excluded from Training and routine-only advice yields the traditional four methods.
7. Check the same layout in a production build using an HTTPS mock/staging origin, never production localhost.
8. Capture desktop/mobile screenshots and record actual request destinations before marking this matrix complete.

Computer-use inventory returned no browsers/apps and an unavailable native pipe. No screenshots or actual mobile/browser tests were performed; jsdom results are not visual QA.

## Automated validation

Sanitized Node 24, disabled test caching, in-memory Vite config loader and injected API/Firebase mocks. No paid calls.

- Final frontend/catalog/Training release matrix: 145 passed across eight files.
  - Shared API-base rules: 32.
  - Access service: 5.
  - Recommendation UI/restoration/routing: 29.
  - Canonical instructions: 46.
  - Persistence: 11.
  - AI context and fallback: 16.
  - Bounded lookup: 2.
  - Full mocked Training/profile journeys: 4.
- Existing backend recommendation/auth suite: 43 passed, 1 known pre-existing failure.
- Billing-server regressions selected alongside that suite: 10 passed.
- The known failure expects Free limit/usage 4 while the current backend constant is 3 (server.test.js daily-limit case). It was reproduced against HEAD in the earlier audit and is untouched by this phase. No quota value or unrelated test expectation was changed.
- Frontend TypeScript check: passed, zero errors.
- Backend typecheck/build: passed.
- Frontend production build (envDir:false): passed; existing >500 kB chunk warning remains.
- Relevant JSX lint: passed; existing browser-mapping-data freshness notice remains.
- git diff --check: passed.

This is focused validation, not a full-suite pass. Existing unrelated quota failures documented in the Phase 1 packet were not repaired or hidden.

## Security and compatibility boundaries

- VITE_API_BASE_URL is trusted build configuration, not user input. HTTPS validation does not authenticate an arbitrary configured public host; keep deployment settings restricted and review the intended backend origin.
- Production localhost/insecure URLs fail before fetch. No new guest-to-user promotion, entitlement bypass, token persistence or logging of configuration values.
- Production still defaults to Render. Local development must explicitly select its local backend; leaving it unset still targets Render.
- The existing 37 methods, 144 guides, Standard/Deep selection behavior, schema, model IDs, scoring, quotas, billing and Training engines remain unchanged.
- Saved HOW remains display-time canonical enrichment; current Firestore fields/rules and storage keys are unchanged.
- No synthetic publication or genuine V2 admission was activated.
- Existing worktree modifications, including educational library/footer/asset work, were preserved.
- No deployment, commit, push, migration, production environment change or production data write.

## Release decision

**BLOCKED**

1. Deployed Render catalog, guide data and enrichment/validation parity cannot yet be established from available read-only evidence.
2. Real-browser/mobile and controlled authenticated end-to-end verification remain incomplete. No paid Standard/Deep canary was authorized.
3. The existing backend quota expectation mismatch remains a separate unresolved baseline issue for the release owner; this phase does not change quotas to make that test green.

To unblock: obtain the running-service manifest and deployment binding, complete isolated browser/mobile QA, and explicitly approve any bounded paid live canary before it is attempted. Do not infer readiness from the mocked tests alone.

