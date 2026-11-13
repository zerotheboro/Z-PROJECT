# Owner-approved Economics video preview

Latest owner decision, 12 November 2026: all twelve supplied videos have `OWNER_APPROVED: true` for normal Training. No additional manual content or clip approval is required. Independent content/creator/clip review fields remain factual and are not fabricated. Actual advancing 2× playback is still required in the current Lab/Match before continuing to its knowledge questions.

Normal student entry: `/#/training/choose?economics=2.2`. Select **2X video speed**, then **Start training**. The video uses the normal method allowance and appears full-width inside the Method Lab, without an educational picture or full Topic Notes passage. Short guidance, optional student notes, focus bullets and **I finished at 2× · test comprehension** remain. The separate unscored picker buttons/panel have been removed. The standalone developer preview below remains optional and development-only.

## Open locally

Use Node 24 from the project directory:

```powershell
node scripts/run-sanitized.mjs scripts/run-economics-video-preview.mjs
```

Open **http://127.0.0.1:5175/__economics-video-preview/**. PED is selected first. The launcher binds loopback only, ignores environment files and opts into the preview explicitly. This is a standalone review page, not a replacement for HashRouter or a production Training route. It imports no Firebase or backend integration.

Select any of the twelve full videos and press Play. The player requests 2× but only sets the local `PLAYBACK_VERIFIED` result after time actually advances in the API's PLAYING state while `getPlaybackRate()` reports 2. A stopped video retains a successful local check; wrong speed, errors and retries clear current verification. Returning to a video starts a fresh test. Previous successful timestamps and errors remain visible in the report.

Record incorrect/unsuitable content or technical failures under **Your review** and **Notes**, then select **Download review report**. Notes/results stay in this tab until downloaded; refresh loses them. Feedback does not automatically approve content or clips. The JSON contains all twelve statuses, technical reason/error code, last successful runtime timestamp and owner feedback. It is not accepted Training evidence.

## Registry and observed status

`CONTENT_VERIFIED` and `CLIP_REVIEWED` remain false for all candidates. Registry `PLAYBACK_VERIFIED` starts false; preview runtime checks are separate, local observations and do not mutate the canonical source or promote scored eligibility.

| Topic | Candidate ID | OWNER_APPROVED | CONTENT_VERIFIED | CLIP_REVIEWED | Real playback observed by this implementation session |
|---|---|---|---|---|---|
| 1.3 | `8Xg9rRmskHg` | Yes | No | No | NOT TESTED |
| 1.4 | `7cKh7SEUCDw` | Yes | No | No | NOT TESTED |
| 1.5 | `IzccVWouIxM` | Yes | No | No | NOT TESTED |
| 1.6 | `nsWuzS_dEM8` | Yes | No | No | NOT TESTED |
| 1.6 | `wiHjVeX3DKc` | Yes | No | No | NOT TESTED |
| 2.1 | `g9aDizJpd_s` | Yes | No | No | NOT TESTED |
| 2.2 PED | `nOlOf_KEnrw` | Yes | No | No | NOT TESTED |
| 2.2 YED | `8eMn4h4JpqI` | Yes | No | No | NOT TESTED |
| 2.2 XED | `5cW7xdanyd0` | Yes | No | No | NOT TESTED |
| 2.3 | `ICjglEvPL44` | Yes | No | No | NOT TESTED |
| 2.4 | `tm1R2Bns8c4` | Yes | No | No | NOT TESTED |
| 2.5 | `r1Xq9FcxDB8` | Yes | No | No | NOT TESTED |

The local preview HTML and both player/page modules returned HTTP 200 and were compiled by Vite. That verifies access to the application, not YouTube playback. Browser inventory still reported **“The browser access host is unavailable”**. Therefore this session confirmed no real candidate as working or failed. Prior fetch failures are not proof that YouTube embedding is prohibited. Owner testing in the running page can now establish per-video results without waiting for content approval.

Technical error messages distinguish invalid request (2), HTML5 player error (5), unavailable/private/deleted (100), embedding disabled (101/150), rejected client/referrer identification (153), API timeout and unsupported/wrong playback rate. Error-code branches are tested with mocks; they are not claims that a real candidate returned those errors.

## Scored experiment safeguards

- The owner preview has no Training progress controller, result callback, scoring, quota, authenticated data or evidence writes.
- Normal selectors resolve the existing content set and assigned question identities, then choose an owner-approved video from the same topic. Multiple candidates are matched using the existing question context and registry objective mappings. No arbitrary video ID from navigation is accepted.
- The normal player requires observed advancing 2× playback in the current attempt. Readiness, a requested speed, stalled time or an ENDED event alone cannot record successful 2× completion. Wrong/unknown speed or player errors revoke readiness; retry starts at the source beginning (or existing reviewed clip start). This is not proof that the entire video was watched.
- Full owner-approved videos now use normal Training under the owner's latest instruction. No timestamps are invented. Existing knowledge scores, result/evidence contracts, saved-draft schema, allocations, quotas and production authority/publication gates are unchanged.

## Files changed

- `src/quiz/economics9708/videos.ts`
- `src/quiz/economics9708/EconomicsYouTubePlayer.tsx`
- `src/quiz/economics9708/videoPreviewAccess.ts` (new)
- `src/quiz/economics9708/OwnerVideoPreviewPlayer.tsx` (new)
- `src/quiz/economics9708/VideoMethodPreview.tsx` (new)
- `src/quiz/economics9708/VideoMethodPreview.scss` (new)
- `scripts/run-economics-video-preview.mjs` (new)
- `src/quiz/__tests__/economicsVideoPreview.test.tsx` (new)
- `src/quiz/__tests__/economicsVideoReview.test.tsx`
- `src/quiz/__tests__/economicsVideoActivation.test.tsx`
- `ECONOMICS_LAB_MEDIA.md`
- `ECONOMICS_VIDEO_OWNER_PREVIEW.md` (new)

## Validation in this task

- Sanitized Node 24: **330 tests passed in 14 files** covering preview/player behavior, mapped Training, objective evidence, drafts, receipts, startup and access. After final preview/retry changes, **40 tests passed in the three affected video files** (overlapping rerun, not 40 additional unique tests).
- Frontend TypeScript: zero errors. Backend typecheck/build: passed. Frontend production build: passed with the existing Vite large-chunk warning.
- Preview HTML, page module and player module: HTTP 200 from the loopback launcher. Dependency graph: zero Firebase/backend/persistence-service inputs. Production chunks contain no preview entry/UI. Active backend: zero scalability imports. Diff/new-file whitespace checks passed.
- Mocked tests cover all twelve candidate selections, separate approval flags, actual rate plus advancing playback, paused success retention, wrong-speed revocation, API errors 2/5/100/101/150/153, API timeout/retry, stale callbacks, per-video feedback, and report export without verification promotion.
- **Real browser/mobile layout and each real video's playback remain NOT VERIFIED** because browser access was unavailable. No actual candidate is classified working or failed on the strength of mocks. The server remains running for owner testing.
- No deployment, commit, push, migration, paid API call or production Firebase access.
