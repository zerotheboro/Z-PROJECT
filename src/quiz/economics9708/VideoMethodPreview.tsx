import { useState } from "react";
import { economicsVideoRegistry, economicsVideoReviewBlockers } from "./videos";
import { economicsTopic } from "./syllabus";
import OwnerVideoPreviewPlayer, { untestedVideo } from "./OwnerVideoPreviewPlayer";
import type { VideoPlaybackProbe } from "./OwnerVideoPreviewPlayer";
import { ownerVideoPreviewEnabled } from "./videoPreviewAccess";
import "./VideoMethodPreview.scss";

type ReviewNote = { verdict: string; notes: string };
type Run = VideoPlaybackProbe & { lastSuccessfulAt?: string };
function ReviewWorkspace() {
  const [selected, setSelected] = useState("nOlOf_KEnrw"); // PED first; no approval inferred.
  const [runs, setRuns] = useState<Record<string, Run>>({}), [notes, setNotes] = useState<Record<string, ReviewNote>>({});
  const video = economicsVideoRegistry.find(row => row.youtubeId === selected)!;
  const note = notes[selected] ?? { verdict: "not-reviewed", notes: "" };
  const receive = (probe: VideoPlaybackProbe) => setRuns(current => ({ ...current, [probe.youtubeId]: {
    ...probe, lastSuccessfulAt: probe.PLAYBACK_VERIFIED ? probe.testedAt ?? undefined : current[probe.youtubeId]?.lastSuccessfulAt
  } }));
  const run = runs[selected] ?? untestedVideo(selected);
  function selectVideo(id: string) {
    // Retain the last result/error for the report; player cleanup stops playback.
    // Returning to a video starts a fresh attempt, with old successes listed separately.
    setSelected(id);
  }
  function download() {
    const report = { reportVersion: 1, scope: "owner-local-video-preview-only", exportedAt: new Date().toISOString(),
      scoredEvidence: false, videos: economicsVideoRegistry.map(candidate => ({
        youtubeId: candidate.youtubeId, topicId: candidate.topicId, sourceUrl: candidate.sourceUrl,
        OWNER_APPROVED: candidate.OWNER_APPROVED, CONTENT_VERIFIED: candidate.CONTENT_VERIFIED,
        CLIP_REVIEWED: candidate.CLIP_REVIEWED, PLAYBACK_VERIFIED: runs[candidate.youtubeId]?.PLAYBACK_VERIFIED ?? false,
        runtime: runs[candidate.youtubeId] ?? untestedVideo(candidate.youtubeId),
        ownerFeedback: notes[candidate.youtubeId] ?? { verdict: "not-reviewed", notes: "" }
      })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "edulience-local-video-review.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main className="training-page owner-video-preview">
    <h1>2× Video Method preview</h1>
    <p><strong>Owner-approved local review only.</strong> Full videos are available here for inspection. This page does not create Training scores, accepted evidence or quota charges.</p>
    <label>Video candidate <select value={selected} onChange={event => selectVideo(event.target.value)}>
      {economicsVideoRegistry.map(candidate => <option key={candidate.youtubeId} value={candidate.youtubeId}>{candidate.topicId} · {candidate.title}</option>)}
    </select></label>
    <h2>{video.topicId} {economicsTopic(video.topicId)?.title}: {video.title}</h2>
    <p>Title and creator attribution are supplied candidates. Creator: {video.creator ?? ("proposedCreator" in video ? video.proposedCreator : null) ?? "not confirmed"} — not independently verified.</p>
    <dl className="video-review-flags">
      <div><dt>OWNER_APPROVED</dt><dd>{video.OWNER_APPROVED ? "Yes — normal Training" : "No"}</dd></div>
      <div><dt>CONTENT_VERIFIED</dt><dd>{video.CONTENT_VERIFIED ? "Yes" : "No"}</dd></div>
      <div><dt>CLIP_REVIEWED</dt><dd>{video.CLIP_REVIEWED ? "Yes" : "No — full video preview"}</dd></div>
      <div><dt>PLAYBACK_VERIFIED</dt><dd>{run.PLAYBACK_VERIFIED ? "Yes — runtime check passed" : "No — " + run.state}</dd></div>
    </dl>
    <OwnerVideoPreviewPlayer key={selected} video={video} onProbe={receive} />
    <label>Your review <select value={note.verdict} onChange={event => setNotes(current => ({ ...current, [selected]: { ...note, verdict: event.target.value } }))}>
      <option value="not-reviewed">Not reviewed</option><option value="appears-suitable">Appears suitable — provisional feedback</option>
      <option value="incorrect-or-unsuitable">Incorrect or unsuitable content</option><option value="technical-problem">Playback/embedding problem</option>
    </select></label>
    <label>Notes and defective sections <textarea value={note.notes} maxLength={4000} placeholder="What failed, was incorrect, or needs a different clip?"
      onChange={event => setNotes(current => ({ ...current, [selected]: { ...note, notes: event.target.value } }))} /></label>
    <p>Notes and runtime checks stay in this tab. Download the report before refreshing. Feedback never automatically verifies content or clips.</p>
    <button type="button" onClick={download}>Download review report</button>
    <details><summary>Independent checks not recorded</summary><ul>{economicsVideoReviewBlockers(video).map(reason => <li key={reason}>{reason}</li>)}</ul></details>
    <h2>All 12 candidates</h2>
    <div className="video-review-table"><table><caption>Runtime results from this tab; untested means unknown, not failed.</caption>
      <thead><tr><th>Topic</th><th>Video</th><th>Last runtime state</th><th>Last successful 2× check</th><th>Reason</th></tr></thead>
      <tbody>{economicsVideoRegistry.map(candidate => { const probe = runs[candidate.youtubeId]; return <tr key={candidate.youtubeId}>
        <td>{candidate.topicId}</td><td>{candidate.title}</td><td>{probe?.state ?? "not-tested"}</td><td>{probe?.lastSuccessfulAt ?? "None"}</td><td>{probe?.reason ?? "No runtime playback test yet."}</td>
      </tr>; })}</tbody>
    </table></div>
  </main>;
}

export default function VideoMethodPreview() {
  return ownerVideoPreviewEnabled() ? <ReviewWorkspace /> : <main><h1>Local video preview disabled</h1><p>Use the dedicated loopback development launcher.</p></main>;
}
