import { createCompletedSessionEvidence } from "../src/quiz/learningEvidence";
import { aggregateCompletedEvidence } from "../src/quiz/cumulativeProfile";
import { syntheticProfileHash, SYNTHETIC_PUBLICATION_PROTOCOL } from "../src/services/syntheticPublishedProfile";
import type { MethodId } from "../src/quiz/type";

/** Test/measurement adapter only. No Firebase, account authority, writes or real
 * publication. Even its internally consistent generation remains synthetic. */
export async function stage4hProfileFixture(size: number, uid = "stage4h-synthetic-measurement") {
  if (!Number.isSafeInteger(size) || size < 1 || size > 1000) throw new Error("Synthetic measurement size must be 1..1000.");
  let headRevision = 0;
  const history = Array.from({ length: size }, (_, i) => {
    const mode = i % 4 < 2 ? "auto" as const : "manual" as const;
    const methods = (["active-recall", "feynman", "cornell", "interleaving"] as MethodId[]).slice(0, [3, 4, 1, 3][i % 4]);
    // Keep even the 1,000-session workload before its synthetic publication date.
    const date = new Date(Date.UTC(2022, 0, 1) + i * 86400000).toISOString();
    const subject = i % 8 < 4 ? "Biology" : "Mathematics";
    const topic = subject === "Biology" ? "Cell transport" : "Probability", correct = 1 + i % 4;
    const evidence = createCompletedSessionEvidence({ sessionId: `${uid}-${i}`, owner: { kind: "user", uid }, mode,
      completedAt: date, recordedAt: date,
      methodLab: { experiments: methods.map(method => ({ method, score: correct / 4, correct, total: 4, timeSpentMs: 1000,
        confidence: 4, ease: 3, willingnessToUse: 5 })) },
      methodMatch: { methods: methods.slice(0, 2).map(method => ({ method, verificationScore: correct / 4, confidence: 4, timeSpentMs: 500 })) },
      metadata: methods.flatMap(methodId => (["lab", ...(methods.slice(0, 2).includes(methodId) ? ["match" as const] : [])] as const).map(phase => ({
        methodId, phase, completedAt: date,
        context: { subject, topic, exerciseTopic: topic, contentSetId: `stage4h-${subject}-${phase}`, contentVersion: "synthetic-1" },
        protocol: { assessmentVersion: "synthetic-product-validation-v1", scoringVersion: "mcq-accuracy-v1",
          questions: Array.from({ length: 4 }, (_, n) => ({ questionId: `q${n}`, difficulty: "medium" as const,
            offeredOptionCount: 3, offeredOptionIds: ["a", "b", "c"] })) },
        ...(phase === "match" ? { matchCounts: { correct, total: 4 } } : {})
      }))),
      selectionContext: { kind: mode === "manual" ? "manual" : methods.length === 3 ? "ai-confirmed" : "traditional",
        nominatedMethodIds: mode === "auto" && methods.length === 3 ? ["active-recall"] : [] } });
    const id = `session-${i.toString(16).padStart(64, "0")}`, acceptedRevision = headRevision + 1;
    headRevision += mode === "auto" ? 3 : 2;
    const details = { schemaVersion: 1, methodIntroduction: { correct: 1, total: 1, score: 1 },
      reflection: { reflectionText: `PRIVATE SYNTHETIC REFLECTION ${uid} ${i}`, surprisedByResults: true } };
    return { id, data: { schemaVersion: 1, evidence, requestHash: "d".repeat(64), completionDetails: details,
      receipt: { schemaVersion: 2, status: "accepted", sessionId: evidence.sessionId, mode, evidenceId: id, requestHash: "d".repeat(64),
        lifecycleEpoch: 1, acceptedRevision, recordedAt: date, legacyAssessmentId: mode === "auto" ? evidence.sessionId : null,
        legacyProfileUpdated: mode === "auto" } }, details };
  });
  const profile = aggregateCompletedEvidence({ kind: "user", uid }, history.map(row => row.data.evidence));
  const generationId = await syntheticProfileHash("stage4h-test-generation", { uid, size });
  let historyHash = await syntheticProfileHash("synthetic-history-start-stage4g-v1", { uid, generationId });
  for (let index = 0; index < history.length; index++) historyHash = await syntheticProfileHash("synthetic-history-fold-stage4g-v1", { previous: historyHash, index, row: history[index] });
  const body = { schemaVersion: 1, protocol: SYNTHETIC_PUBLICATION_PROTOCOL, status: "synthetic-published", uid,
    context: { uid, lifecycleEpoch: 1 }, generationId, authority: "NOT VERIFIED", productionPublication: false,
    source: { uid, revision: headRevision }, sessionCount: size, historyHash, publishedAt: "2026-10-26T10:00:00Z",
    profileHash: await syntheticProfileHash("shadow-profile-v1", profile) };
  const publication = { ...body, publicationHash: await syntheticProfileHash("synthetic-publication-record-stage4g-v1", body) };
  const status = { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid, authority: "NOT VERIFIED",
    accepted: { sessionCount: size, revision: headRevision }, publication, profile };
  const calls: { path: string; records: number; bytes: number; milliseconds: number }[] = [];
  async function request(path: string, delayMs = 0): Promise<unknown> {
    const start = performance.now();
    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
    let result: unknown = status, records = 1;
    if (path !== "status") {
      const url = new URL(path, "http://127.0.0.1/");
      if (url.pathname !== "/history" || url.searchParams.get("generationId") !== generationId) throw new Error("Unpinned fixture read.");
      const offset = Number(url.searchParams.get("after")), page = history.slice(offset, offset + 20);
      result = { protocol: SYNTHETIC_PUBLICATION_PROTOCOL, uid, generationId, publicationHash: publication.publicationHash,
        offset, rows: page, next: offset + page.length < size ? offset + page.length : null, total: size };
      records = page.length;
    }
    const copied: unknown = structuredClone(result);
    calls.push({ path, records, bytes: new TextEncoder().encode(JSON.stringify(copied)).length, milliseconds: performance.now() - start });
    return copied;
  }
  return { uid, history, status, generationId, calls, request };
}
