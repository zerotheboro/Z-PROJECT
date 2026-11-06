import { describe, expect, it } from "vitest";
import { economicsStrategyFixture } from "../../test-support/economicsStrategyUIFixtures";
import { createCumulativeProfileReader } from "./cumulativeProfileReader";
import { recommendEconomicsStudy } from "../quiz/economics9708/studyRecommendations";

const uid = "strategy-student-a";
function repository(row?: ReturnType<typeof economicsStrategyFixture>["row"]) {
  return { summary: async () => null, evidence: async () => row ? [row] : [], legacy: async () => [], pending: async () => [] };
}
describe("verified reader handoff to the study strategy", () => {
  it("preserves canonical objective sidecars after existing accepted-receipt verification while stripping Reflection", async () => {
    const f = economicsStrategyFixture(), result = await createCumulativeProfileReader(repository(f.row), () => {}, { acceptedPreview: true })(uid);
    expect(result.strategyEvidence?.rows).toHaveLength(1);
    expect(result.strategyEvidence?.acceptanceHead).toEqual({ revision: 1, lifecycleEpoch: 1, basis: "visible-v2-receipts" });
    expect(JSON.stringify(result.strategyEvidence)).not.toContain("PRIVATE SYNTHETIC REFLECTION");
    expect(JSON.stringify(result.strategyEvidence)).not.toContain("completionDetails");
    expect(recommendEconomicsStudy(uid, "1.5", result.strategyEvidence!.rows)).toMatchObject({ status: "recommended", recommendation: { methodId: "feynman" } });
  });
  it("does not expose malformed/unreconciled rows as a partial accepted source snapshot", async () => {
    const f = economicsStrategyFixture(), row = structuredClone(f.row);
    Object.assign(row.data as object, { receipt: { status: "pending" } });
    const result = await createCumulativeProfileReader(repository(row), () => {}, { acceptedPreview: true })(uid);
    expect(result.strategyEvidence).toBeUndefined();
  });
  it("allows confirmed empty accepted history but never upgrades owner-editable legacy reports", async () => {
    const r = repository();
    const result = await createCumulativeProfileReader({ ...r, legacy: async () => [{ id: "legacy", data: { economicsResponses: "untrusted" } }] }, () => {})(uid);
    expect(result.strategyEvidence).toEqual({ ownerUid: uid, scope: "accepted-history", rows: [], pendingAcceptedSessions: 0, legacyReportsExcluded: true });
  });
  it("rejects account switching during source reads", async () => {
    let current = uid; const r = repository(economicsStrategyFixture().row);
    await expect(createCumulativeProfileReader({ ...r, evidence: async () => { current = "another-student"; return r.evidence(); } },
      owner => { if (owner !== current) throw new Error("owner changed"); }, { acceptedPreview: true })(uid)).rejects.toThrow("owner changed");
  });
});
