import { economicsPacks, requireEconomicsPack } from "./packs";
import { learningObjectiveId, mapTopicLearningContent } from "./objectives";
import type { EconomicsTopicId } from "./syllabus";

type VideoIdentity = {
  topicId: EconomicsTopicId; youtubeId: string; title: string; sourceUrl: string;
  OWNER_APPROVED: boolean; CONTENT_VERIFIED: boolean; PLAYBACK_VERIFIED: boolean; CLIP_REVIEWED: boolean;
};
export type ReviewedEconomicsVideo = VideoIdentity & {
  status: "VERIFIED"; creator: string; objectiveIds: readonly string[];
  clip: { startSeconds: number; endSeconds: number };
  review: { reviewer: string; accuracyReviewedAt: string; embeddingConfirmedAt: string; playback2xConfirmedAt: string };
};
export type EconomicsVideo = ReviewedEconomicsVideo | VideoIdentity & {
  status: "UNVERIFIED"; proposedCreator: string | null; proposedObjectiveIds: readonly string[];
  creator: null; clip: null; review: null;
};
function candidate(topicId: EconomicsTopicId, youtubeId: string, title: string, proposedCreator: string | null,
  points: number[]): EconomicsVideo {
  return { topicId, youtubeId, title, sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    OWNER_APPROVED: true, CONTENT_VERIFIED: false, PLAYBACK_VERIFIED: false, CLIP_REVIEWED: false,
    status: "UNVERIFIED", proposedCreator, proposedObjectiveIds: points.map(n => learningObjectiveId(`${topicId}.${n}`)),
    creator: null, clip: null, review: null };
}
/** Owner decision: all twelve mapped videos may be used in normal Training.
 * This does not invent independent review, clip boundaries or live playback.
 * Titles/creators remain proposals until actually checked. */
export const economicsVideoRegistry: readonly EconomicsVideo[] = [
  candidate("1.3", "8Xg9rRmskHg", "Factors of Production", "Federal Reserve Bank of St. Louis", [1,2,3,4,5]),
  candidate("1.4", "7cKh7SEUCDw", "Economic Systems — Market, Command and Mixed", null, [1,2]),
  candidate("1.5", "IzccVWouIxM", "Production Possibility Curves", "EconplusDal", [1,2,3,4]),
  candidate("1.6", "nsWuzS_dEM8", "Public and private goods", null, [1,2]),
  candidate("1.6", "wiHjVeX3DKc", "Merit and demerit goods", null, [3,4]),
  candidate("2.1", "g9aDizJpd_s", "Supply and Demand", "Crash Course Economics", [1,2,3,4,5,6,7]),
  candidate("2.2", "nOlOf_KEnrw", "Price Elasticity of Demand", "EconplusDal", [1,2,3,4,5,6,7,8]),
  candidate("2.2", "8eMn4h4JpqI", "Income Elasticity of Demand", null, [1,2,3,4,6,8]),
  candidate("2.2", "5cW7xdanyd0", "Cross Elasticity of Demand", null, [1,2,3,4,6,8]),
  candidate("2.3", "ICjglEvPL44", "Price Elasticity of Supply", "EconplusDal", [1,2,3,4,5]),
  candidate("2.4", "tm1R2Bns8c4", "Microeconomic Equilibrium Shifts", "EconplusDal", [1,2,4]),
  candidate("2.5", "r1Xq9FcxDB8", "Consumer and Producer Surplus", "EconplusDal", [1,2,3,4])
];

export function canPreviewEconomicsVideo(video: EconomicsVideo): boolean {
  return video.OWNER_APPROVED === true && /^[\w-]{11}$/.test(video.youtubeId) &&
    video.sourceUrl === `https://www.youtube.com/watch?v=${video.youtubeId}` &&
    economicsPacks.some(pack => pack.topicId === video.topicId);
}

/** Proposed metadata is not confirmation. These are the missing checks for
 * each supplied candidate; failed page retrieval does not prove embed denial. */
export function economicsVideoReviewBlockers(video: EconomicsVideo): readonly string[] {
  if (video.status === "UNVERIFIED") return [
    "Creator/title not confirmed from the original source",
    "Academic accuracy and exact objective coverage not reviewed",
    "Start/end clip boundaries not reviewed",
    "Embedding availability/permission not confirmed",
    "Actual 2× playback not confirmed"
  ];
  return isReviewedEconomicsVideo(video) ? [] : ["Review metadata is incomplete or invalid"];
}

export function isReviewedEconomicsVideo(video: EconomicsVideo): video is ReviewedEconomicsVideo {
  if (video.status !== "VERIFIED" || video.CONTENT_VERIFIED !== true || video.CLIP_REVIEWED !== true || video.PLAYBACK_VERIFIED !== true) return false;
  try {
    const known = mapTopicLearningContent(requireEconomicsPack(video.topicId)).objectives.map(o => o.id);
    const date = (value: string) => typeof value === "string" && new Date(value).toISOString() === value;
    return /^[\w-]{11}$/.test(video.youtubeId) && video.sourceUrl === `https://www.youtube.com/watch?v=${video.youtubeId}` &&
      Boolean(video.title?.trim() && video.creator?.trim() && video.review?.reviewer?.trim()) &&
      Array.isArray(video.objectiveIds) && video.objectiveIds.length > 0 && new Set(video.objectiveIds).size === video.objectiveIds.length &&
      video.objectiveIds.every(id => known.includes(id)) &&
      Number.isFinite(video.clip?.startSeconds) && Number.isFinite(video.clip?.endSeconds) &&
      video.clip.startSeconds >= 0 && video.clip.endSeconds > video.clip.startSeconds &&
      date(video.review.accuracyReviewedAt) && date(video.review.embeddingConfirmedAt) && date(video.review.playback2xConfirmedAt);
  } catch { return false; }
}

export function selectEconomicsVideo(contentSetId: string, questionIds: readonly string[], registry = economicsVideoRegistry):
  { status: "ready"; video: EconomicsVideo; objectiveIds: string[] } | { status: "unavailable"; reason: string } {
  try {
    const match = /^ec9708-(\d+)_(\d+)-2026-v2-pilot-1-(lab|match)-two-x-video-speed(?:-mapped1)?(?:-q[1-9]\d*)?$/.exec(contentSetId);
    if (!match || !questionIds.length || new Set(questionIds).size !== questionIds.length) throw new Error();
    const topicId = `${match[1]}.${match[2]}`, mapped = mapTopicLearningContent(requireEconomicsPack(topicId));
    const questions = questionIds.map(id => mapped.questions.find(q => q.questionId === id && q.phase === (match[3] === "lab" ? "lab" : "verification")));
    if (questions.some(q => !q)) throw new Error();
    const objectiveIds = [...new Set(questions.flatMap(q => q!.objectiveIds))].sort();
    const pack = requireEconomicsPack(topicId), pool = match[3] === "lab" ? pack.lab : pack.verification;
    const text = questionIds.map(id => pool.find(q => q.id === id)!.question.toLowerCase());
    const relevance = (row: EconomicsVideo) => {
      const objectives = row.status === "VERIFIED" ? row.objectiveIds : row.proposedObjectiveIds;
      const focus = row.youtubeId === "8eMn4h4JpqI" ? /\byed\b|income|inferior|luxury/ : row.youtubeId === "5cW7xdanyd0" ? /\bxed\b|cross.elasticity|substitut|complement|another good/ : /\bped\b|own.price|expenditure|revenue|price.elast|demand line/;
      return text.filter(t => focus.test(t)).length * 100 + objectiveIds.filter(id => objectives.includes(id)).length;
    };
    const video = registry.filter(row => row.topicId === topicId && canPreviewEconomicsVideo(row))
      .map((row, index) => ({ row, index, score: relevance(row) })).sort((a, b) => b.score - a.score || a.index - b.index)[0]?.row;
    return video ? { status: "ready", video, objectiveIds } : { status: "unavailable", reason: "No approved video is available for this topic." };
  } catch {
    return { status: "unavailable", reason: "The video cannot be matched safely to this activity's learning objectives." };
  }
}

/** Owner approval permits ordinary Training. Live availability and 2× playback
 * are required at runtime; no clip boundaries or review timestamps are invented. */
export function economicsVideoEligibilityGap(topicId?: string, registry = economicsVideoRegistry): string | null {
  const topics = topicId ? economicsPacks.filter(pack => pack.topicId === topicId) : economicsPacks;
  return topics.length && topics.every(pack => registry.some(video => video.topicId === pack.topicId && canPreviewEconomicsVideo(video)))
    ? null : "No approved video is available for this Economics topic.";
}
