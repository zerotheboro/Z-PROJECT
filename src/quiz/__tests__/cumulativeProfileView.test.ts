import { describe, expect, it } from "vitest";
import { buildCumulativeProfileView } from "../cumulativeProfileView";
import { createCompletedSessionEvidence } from "../learningEvidence";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import { completedSession, evidenceOwner, legacyAssessment, sessionInput } from "./learningEvidenceFixtures";
import { profileView, savedEvidence, summaryFor } from "./cumulativeProfileViewFixtures";

describe("read-only cumulative profile presentation", () => {
  it("does not invent zeros when a new account has no materialized profile", () => {
    const result = buildCumulativeProfileView(evidenceOwner.uid, null, [], []);
    expect(result.summary).toBeNull(); expect(result.history).toEqual([]); expect(result.automaticSessions).toBeNull();
  });
  it.each([3, 4])("shows one %i-method Test Me without adding AI or duplicate Match.firstScore", count => {
    const methods = ["active-recall", "feynman", "cornell", "memory-palace"] as const;
    const session = completedSession({ mode: "auto", methods: methods.slice(0, count) });
    const result = profileView([session]);
    expect(result.summary?.sessionCount).toBe(1); expect(result.summary?.methods.length).toBe(count);
    expect(result.summary?.observationCount).toBe(count + 2); expect(result.automaticSessions).toBe(1);
    expect(result.progress).toEqual([]); expect(result.history[0].evidence.observations[0].performance.score).toBe(0.75);
  });
  it("shows Manual Introduction and Reflection separately from objective observations", () => {
    const session = completedSession();
    const details = { schemaVersion: 1, methodIntroduction: { correct: 1, total: 1, score: 1 },
      reflection: { reflectionText: "Private writing", surprisedByResults: true } };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([session]), [savedEvidence(session, details)], []);
    expect(result.manualSessions).toBe(1); expect(result.history[0].details).toEqual(details);
    expect(result.summary?.observationCount).toBe(2); expect(result.history[0].evidence.observations[0].performance.score).toBe(0.75);
  });
  it("orders late completions by completion time and leaves unknown completion timing unknown", () => {
    const early = completedSession({ id: "early", date: "2026-10-19T10:00:00Z" });
    const late = completedSession({ id: "late", date: "2026-10-21T10:00:00Z" });
    const unknown = createCompletedSessionEvidence({ ...sessionInput({ id: "unknown", known: false }), completedAt: null, recordedAt: "2026-10-22T12:00:00Z" });
    const result = profileView([late, unknown, early]);
    expect(result.history.map(item => item.evidence.sessionId)).toEqual(["late", "early", "unknown"]);
    expect(result.latestKnownCompletion).toBe("2026-10-21T10:00:00.000Z"); expect(result.unknownCompletionCount).toBe(1);
  });
  it("does not duplicate a native session and its proven legacy snapshot or retained legacy evidence", () => {
    const native = completedSession({ id: "linked-session", mode: "auto", methods: ["active-recall", "feynman", "cornell"] });
    const adapted = adaptLegacyAutomaticAssessment({ ownerUid: evidenceOwner.uid, assessmentId: native.sessionId, assessment: legacyAssessment() });
    if (!adapted.valid) throw new Error("Invalid fixture");
    const row = { id: native.sessionId, data: legacyAssessment() };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([native]), [savedEvidence(native), savedEvidence(adapted.session), savedEvidence(native)], [row]);
    expect(result.history).toHaveLength(1); expect(result.coverageComplete).toBe(true); expect(result.automaticSessions).toBe(1);
  });
  it("retains unlinked historical snapshots separately without counting them as server-recorded completions", () => {
    const native = completedSession();
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([native]), [savedEvidence(native)], [{ id: "unlinked-old-document", data: legacyAssessment() }]);
    expect(result.history).toHaveLength(2); expect(result.summary?.sessionCount).toBe(1);
    expect(result.history.find(item => !item.serverRecorded)?.evidence.originalSessionId).toBeNull();
    expect(result.coverageComplete).toBe(false); expect(result.progress).toEqual([]);
  });
  it("reads available automatic details only from the linked snapshot without duplicating the session", () => {
    const native = completedSession({ mode: "auto", id: "auto-detail-session", methods: ["active-recall", "feynman", "cornell"] });
    const snapshot = { ...legacyAssessment(), methodIntroduction: { correct: 3, total: 3, score: 1 },
      reflection: { ...legacyAssessment().reflection, surprisedByResults: false } };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([native]), [savedEvidence(native)], [{ id: native.sessionId, data: snapshot }]);
    expect(result.history).toHaveLength(1); expect(result.history[0].details?.reflection.reflectionText).toBe("Private writing");
    expect(result.history[0].studyContext.join(" ")).toContain("school");
  });
  it("does not discard valid partial legacy observations or infer missing scores", () => {
    const old = legacyAssessment(); delete (old as Partial<typeof old>).methodMatch;
    const result = buildCumulativeProfileView(evidenceOwner.uid, null, [], [{ id: "partial-old", data: old }]);
    expect(result.history).toHaveLength(1); expect(result.history[0].evidence.observations).toHaveLength(1);
    expect(result.summary).toBeNull();
  });
  it("reports malformed and foreign-owner evidence without false coverage or charts", () => {
    const valid = completedSession();
    const foreign = { ...valid, owner: { kind: "user", uid: "someone-else" } } as const;
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([valid]), [savedEvidence(foreign), { id: "bad", data: {} }], [{ id: "bad-old", data: {} }]);
    expect(result.coverageComplete).toBe(false); expect(result.manualSessions).toBeNull(); expect(result.history).toEqual([]); expect(result.warnings.length).toBeGreaterThan(0);
    expect(() => buildCumulativeProfileView("someone-else", summaryFor([valid]), [], [])).toThrow();
  });
  it("requires a native receipt before describing native results as acknowledged", () => {
    const session = completedSession(), row = savedEvidence(session); delete (row.data as Record<string, unknown>).receipt;
    expect(buildCumulativeProfileView(evidenceOwner.uid, summaryFor([session]), [row], []).coverageComplete).toBe(false);
  });
  it("tracks repeated content across methods without blending fresh and repeated task results", () => {
    const first = completedSession({ id: "first", date: "2026-10-19T10:00:00Z", methods: ["active-recall"] });
    const second = completedSession({ id: "second", date: "2026-10-20T10:00:00Z", methods: ["feynman"] });
    const result = profileView([second, first]);
    expect(result.exposure.get(second.observations[0].observationId)?.content).toBe("repeated"); expect(result.progress).toEqual([]);
  });
  it("charts only server-established comparable observations in separate sessions", () => {
    const sessions = [1, 2, 3].map((day, i) => completedSession({ id: `day-${day}`, date: `2026-10-${19 + i}T10:00:00Z`, correct: i + 1 }));
    const result = profileView(sessions.reverse());
    const lab = result.progress.find(item => item.group.phase === "lab")!;
    expect(lab.points.map(p => p.score)).toEqual([0.5, 0.75]); expect(lab.group.exposure.content).toBe("repeated");
    expect(lab.points.map(p => p.date)).toEqual(["2026-10-20T10:00:00.000Z", "2026-10-21T10:00:00.000Z"]);
  });
  it.each(["subject", "topic", "exerciseTopic", "contentVersion", "scoringVersion", "assessmentVersion", "difficulty", "optionIdentities", "timestamps"])("withholds trends with missing or differing %s", field => {
    const sessions = [1, 2, 3].map((day, i) => {
      const input = sessionInput({ id: `day-${day}`, date: `2026-10-${19 + i}T10:00:00Z` });
      const metadata = input.metadata!.map(m => ({ ...m, context: { ...m.context }, protocol: { ...m.protocol, questions: m.protocol!.questions!.map(q => ({ ...q })) } }));
      for (const m of metadata) {
        if (["subject", "topic", "exerciseTopic", "contentVersion"].includes(field)) (m.context as Record<string, unknown>)[field] = i === 2 ? "different" : null;
        if (field === "scoringVersion" || field === "assessmentVersion") m.protocol[field] = i === 2 ? "different" : null;
        if (field === "difficulty") m.protocol.questions[0].difficulty = i === 2 ? "hard" : "medium";
        if (field === "optionIdentities") m.protocol.questions[0].offeredOptionIds = i === 2 ? ["x", "y", "z"] : ["a", "b", "c"];
        if (field === "timestamps") m.completedAt = null;
      }
      return createCompletedSessionEvidence({ ...input, metadata, ...(field === "timestamps" ? { completedAt: null } : {}) });
    });
    expect(profileView(sessions).progress).toEqual([]);
  });
  it("withholds conflicting native aliases instead of selecting a convenient version", () => {
    const one = completedSession(), other = structuredClone(one);
    (other.observations[0].performance as { score: number }).score = 0.5;
    (other.observations[0].performance as { correct: number }).correct = 2;
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([one]), [savedEvidence(one), savedEvidence(other)], []);
    expect(result.history).toEqual([]); expect(result.coverageComplete).toBe(false); expect(result.warnings.join(" ")).toContain("Conflicting session identities");
  });

  it("rejects a 99-session method counter within a one-session summary without changing server totals", () => {
    const session = completedSession(), original = summaryFor([session]);
    const summary = { ...original, profile: { ...original.profile,
      methods: original.profile.methods.map(m => ({ ...m, sessionCount: 99 })) } };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summary, [savedEvidence(session)], []);
    expect(result.summary?.sessionCount).toBe(1); expect(result.summary?.methods[0].sessionCount).toBe(99);
    expect(result.coverageComplete).toBe(false); expect(result.methodCoverage.get("active-recall")).toBe("contradictory");
    expect(result.warnings.join(" ")).toContain("contradict"); expect(result.progress).toEqual([]);
    expect(summary.profile.methods[0].sessionCount).toBe(99);
  });

  it("detects different method identities despite identical global totals", () => {
    const original = completedSession(), other = completedSession({ methods: ["feynman"] });
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([original]), [savedEvidence(other)], []);
    expect(result.methodCoverage.get("active-recall")).toBe("contradictory");
    expect(result.methodCoverage.get("feynman")).toBe("contradictory");
    expect(result.coverageComplete).toBe(false); expect(result.progress).toEqual([]);
  });

  it("detects 2+2 observations redistributed to 3+1 despite identical global totals", () => {
    const session = completedSession({ methods: ["active-recall", "feynman"] });
    const original = summaryFor([session]);
    const summary = { ...original, profile: { ...original.profile,
      methods: original.profile.methods.map((m, i) => ({ ...m, observationCount: i === 0 ? 3 : 1 })) } };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summary, [savedEvidence(session)], []);
    expect(result.summary?.observationCount).toBe(4); expect(result.coverageComplete).toBe(false);
    expect([...result.methodCoverage.values()]).toEqual(["contradictory", "contradictory"]);
  });

  it("counts distinct session membership rather than Lab/Match observation count", () => {
    const sessions = [completedSession({ id: "one" }), completedSession({ id: "two" })];
    const original = summaryFor(sessions);
    const summary = { ...original, profile: { ...original.profile,
      methods: original.profile.methods.map(m => ({ ...m, sessionCount: 1 })) } };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summary, sessions.map(s => savedEvidence(s)), []);
    expect(result.methodCoverage.get("active-recall")).toBe("contradictory");
    expect(profileView(sessions).methodCoverage.get("active-recall")).toBe("verified");
  });

  it("treats missing immutable history as incomplete, not a zero-count contradiction", () => {
    const one = completedSession({ id: "one" }), two = completedSession({ id: "two", methods: ["feynman"] });
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([one, two]), [savedEvidence(one)], []);
    expect(result.summary?.sessionCount).toBe(2); expect(result.coverageComplete).toBe(false);
    expect(result.methodCoverage.get("active-recall")).toBe("incomplete");
    expect(result.methodCoverage.get("feynman")).toBe("incomplete");
    expect(result.warnings.join(" ")).not.toContain("contradict"); expect(result.progress).toEqual([]);
  });

  it("does not treat absent mutable legacy snapshots or unprocessed snapshots as contradictory method evidence", () => {
    const native = completedSession({ mode: "auto", methods: ["active-recall", "feynman", "cornell"] });
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([native]), [savedEvidence(native)],
      [{ id: "unprocessed-legacy", data: legacyAssessment() }]);
    expect(result.methodCoverage.get("active-recall")).toBe("verified");
    expect(result.warnings.join(" ")).not.toContain("contradict"); expect(result.history).toHaveLength(2);
    expect(profileView([native]).coverageComplete).toBe(true);
  });

  it("verifies retained historical evidence without inventing original session linkage", () => {
    const adapted = adaptLegacyAutomaticAssessment({ ownerUid: evidenceOwner.uid, assessmentId: "unlinked", assessment: legacyAssessment() });
    if (!adapted.valid) throw new Error("Invalid fixture");
    const result = profileView([adapted.session]);
    expect(result.methodCoverage.get("active-recall")).toBe("verified");
    expect(result.history[0].evidence.originalSessionId).toBeNull(); expect(result.coverageComplete).toBe(true);
  });

  it("compares full counters, not the bounded summary's recent observation sample", () => {
    const sessions = Array.from({ length: 25 }, (_, i) => completedSession({ id: `bounded-${i}` }));
    const result = profileView(sessions);
    expect(result.summary?.retention.observationsNotEmbedded).toBeGreaterThan(0);
    expect(result.summary?.methods[0].observationCount).toBe(50);
    expect(result.methodCoverage.get("active-recall")).toBe("verified"); expect(result.coverageComplete).toBe(true);
  });

  it("does not claim a newer receipt is included in an older summary even when global counts happen to match", () => {
    const session = completedSession(), row = savedEvidence(session);
    const data = row.data as Record<string, unknown>;
    const newer = { ...row, data: { ...data, receipt: { ...(data.receipt as Record<string, unknown>), profileRevision: 2 } } };
    const result = buildCumulativeProfileView(evidenceOwner.uid, summaryFor([session]), [newer], []);
    expect(result.history).toHaveLength(1); expect(result.coverageComplete).toBe(false);
    expect(result.methodCoverage.get("active-recall")).toBe("incomplete");
    expect(result.warnings.join(" ")).not.toContain("contradict"); expect(result.progress).toEqual([]);
  });
});
