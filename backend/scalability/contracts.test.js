import { describe, expect, it } from "vitest";
import { CONTRACT_LIMITS, canonicalJSON, compareRevisions, copyJSON, jsonBytes, nextRevision, typedHash, typedHashInput } from "./values.ts";
import { parseAcceptanceReceipt, requireIdenticalReceipt } from "./receipts.ts";
import { createJournalEntry, journalIdentity, parseJournalAnchor, parseJournalEntry, verifyJournalContinuity } from "./journal.ts";
import { aggregateCompletedEvidence } from "../../src/quiz/cumulativeProfile.ts";
import { adaptLegacyAutomaticAssessment } from "../../src/quiz/legacyAssessmentEvidence.ts";
import { completedSession, evidenceOwner, legacyAssessment } from "../../src/quiz/__tests__/learningEvidenceFixtures.ts";

export const UID = "stage1-offline-student", NOW = "2026-10-22T10:00:00.000Z";
export const anchor = (revision = 0, headHash = null) => ({ uid: UID, lifecycleEpoch: 1, revision, headHash });
export function receipt(revision = 1, sessionId = "training-session-one") {
  return { schemaVersion: 2, status: "accepted", sessionId, mode: "manual", evidenceId: `session-${typedHash("fixture", sessionId)}`,
    requestHash: typedHash("request-fixture", sessionId), lifecycleEpoch: 1, acceptedRevision: revision, recordedAt: NOW,
    legacyAssessmentId: null, legacyProfileUpdated: false };
}
export function accepted(previous = anchor(), sessionId = "training-session-one") {
  return createJournalEntry(previous, { kind: "session-accepted", receipt: receipt(previous.revision + 1, sessionId), evidenceHash: typedHash("evidence-fixture", sessionId) }, NOW);
}
export const end = entry => anchor(entry.revision, entry.entryHash);
const rehash = entry => { const { entryHash: _, ...body } = entry; return { ...body, entryHash: typedHash("journal-entry-v1", body) }; };

describe("scalability offline wire values", () => {
  it("canonicalizes maps without losing scalar/container identity or domain separation", () => {
    expect(typedHash("a", { b: [1, null], a: true })).toBe(typedHash("a", { a: true, b: [1, null] }));
    const candidates = [null, "null", ["null"], { type: "null" }, 1, "1", true, { number: 1 }, [], {}, -0, 0, { a: null }, {}];
    expect(new Set(candidates.slice(0, -1).map(value => typedHash("a", value))).size).toBe(candidates.length - 1);
    expect(typedHash("a", {})).not.toBe(typedHash("b", {}));
    expect(typedHashInput("a", { timestamp: [1, 2] })).toContain("map");
  });
  it.each([undefined, NaN, Infinity, 1n, new Date(), new Map(), new Set(), () => 1, [, 1], { a: undefined }])("rejects unsupported wire value %#", value => {
    expect(() => copyJSON(value)).toThrow();
  });
  it("rejects getters, symbols, non-enumerable data and cycles without invoking getters", () => {
    let calls = 0;
    expect(() => copyJSON({ get value() { calls++; return 1; } })).toThrow();
    expect(calls).toBe(0);
    expect(() => copyJSON({ [Symbol("hidden")]: 1 })).toThrow();
    expect(() => copyJSON(Object.defineProperty({}, "hidden", { value: 1 }))).toThrow();
    const cyclic = {}; cyclic.a = cyclic; expect(() => copyJSON(cyclic)).toThrow();
  });
  it("deep-freezes a defensive copy without freezing or changing caller data", () => {
    const input = { nested: [{ name: "original" }] }, output = copyJSON(input);
    expect(Object.isFrozen(output.nested[0])).toBe(true);
    expect(Object.isFrozen(input.nested[0])).toBe(false);
    input.nested[0].name = "changed"; expect(output.nested[0].name).toBe("original");
  });
  it("counts UTF-8, escaping and property names, rejecting excessive depth/text", () => {
    expect(jsonBytes({ "😀": "\u0000é" })).toBe(Buffer.byteLength(canonicalJSON({ "😀": "\u0000é" }), "utf8"));
    expect(jsonBytes("😀")).toBe(6); expect(jsonBytes("\u0000")).toBe(8);
    expect(() => copyJSON("x".repeat(CONTRACT_LIMITS.pageBytes + 1))).toThrow();
    let nested = null; for (let i = 0; i < 22; i++) nested = { nested };
    expect(() => copyJSON(nested)).toThrow("structure_limit");
  });
  it("uses safe integer revision ordering and rejects exhaustion", () => {
    expect(compareRevisions(9, 10)).toBe(-1); expect(compareRevisions(10, 9)).toBe(1); expect(compareRevisions(9, 9)).toBe(0);
    expect(nextRevision(0)).toBe(1);
    for (const value of [-1, -0, 1.5, Number.MAX_SAFE_INTEGER + 1, "1"]) expect(() => nextRevision(value)).toThrow();
    expect(() => nextRevision(Number.MAX_SAFE_INTEGER)).toThrow("revision_exhausted");
  });
});

describe("versioned acceptance receipts", () => {
  it("retains v1 fields and exact JSON bytes on identical retry without reinterpretation", () => {
    const { lifecycleEpoch: _, acceptedRevision: __, ...base } = receipt();
    const original = { ...base, schemaVersion: 1, status: "completed", profileRevision: 17 };
    const snapshot = JSON.stringify(original);
    const parsed = requireIdenticalReceipt(original, original);
    expect(JSON.stringify(parsed)).toBe(snapshot); expect(parsed.profileRevision).toBe(17);
    expect(parsed).not.toHaveProperty("acceptedRevision"); expect(Object.isFrozen(original)).toBe(false);
    expect(requireIdenticalReceipt(parsed, original)).toEqual(original);
  });
  it("v2 states durable acceptance, not profile publication", () => {
    const value = parseAcceptanceReceipt(receipt());
    expect(value.status).toBe("accepted"); expect(value.acceptedRevision).toBe(1);
    expect(value).not.toHaveProperty("profileRevision"); expect(value).not.toHaveProperty("published");
  });
  it.each([
    value => ({ ...value, schemaVersion: 3 }), value => ({ ...value, profileRevision: 1 }),
    value => ({ ...value, status: "completed" }), value => ({ ...value, acceptedRevision: 0 }),
    value => ({ ...value, lifecycleEpoch: 0 }), value => ({ ...value, recordedAt: "2026-10-22 10:00" }),
    value => ({ ...value, legacyProfileUpdated: true }), value => ({ ...value, requestHash: "bad" }),
    value => ({ ...value, owner: UID })
  ])("rejects incompatible or malformed receipt %#", mutate => expect(() => parseAcceptanceReceipt(mutate(receipt()))).toThrow());
  it("rejects conflicting retry identity without replacing the original receipt", () => {
    const value = receipt();
    for (const change of [{ sessionId: "different" }, { requestHash: "a".repeat(64) }, { mode: "auto" }, { evidenceId: "other" }]) {
      expect(() => requireIdenticalReceipt(value, { ...value, ...change })).toThrow("completion_conflict");
    }
    expect(value).toEqual(receipt());
  });
});

describe("append-only journal contracts", () => {
  it("pins exact interval endpoints and verifies independently of delivery order", () => {
    const first = accepted(), second = accepted(end(first), "second-session"), third = accepted(end(second), "third-session");
    const expected = verifyJournalContinuity(anchor(), end(third), [first, second, third]);
    expect(verifyJournalContinuity(anchor(), end(third), [third, first, second])).toEqual(expected);
    expect(verifyJournalContinuity(end(first), end(third), [third, second]).acceptanceUniqueness).toBe("interval-only");
    expect(verifyJournalContinuity(end(third), end(third), []).acceptedSessionIds).toEqual([]);
    expect(journalIdentity(anchor(), 2) < journalIdentity(anchor(), 10)).toBe(true);
    expect(journalIdentity({ uid: UID, lifecycleEpoch: 2 }, 1)).not.toBe(first.entryId);
  });
  it("rejects gaps, duplicates, truncation, wrong pins and another owner", () => {
    const first = accepted(), second = accepted(end(first), "second-session"), third = accepted(end(second), "third-session");
    for (const entries of [[first, third], [first, first, second, third], [first, second], [second, third]]) {
      expect(() => verifyJournalContinuity(anchor(), end(third), entries)).toThrow();
    }
    expect(() => verifyJournalContinuity(anchor(), { ...end(third), headHash: "a".repeat(64) }, [first, second, third])).toThrow();
    expect(() => verifyJournalContinuity({ ...anchor(), uid: "other" }, end(first), [first])).toThrow();
    expect(() => parseJournalAnchor(anchor(0, "a".repeat(64)))).toThrow();
  });
  it("rejects hash corruption and rehashed identity/receipt changes", () => {
    const first = accepted();
    expect(() => parseJournalEntry({ ...first, entryHash: "0".repeat(64) })).toThrow("journal_hash_mismatch");
    expect(() => parseJournalEntry(rehash({ ...first, entryId: "forged" }))).toThrow("journal_identity_mismatch");
    expect(() => parseJournalEntry(rehash({ ...first, event: { ...first.event, receipt: { ...first.event.receipt, acceptedRevision: 2 } } }))).toThrow("receipt_revision_mismatch");
    expect(() => parseJournalEntry(rehash({ ...first, event: { ...first.event, score: 999, aiBonus: 2.55 } }))).toThrow("invalid_fields");
  });
  it("rejects even identical acceptance at a second revision, rather than counting it again", () => {
    const first = accepted(), repeated = accepted(end(first));
    expect(() => verifyJournalContinuity(anchor(), end(repeated), [first, repeated])).toThrow("duplicate_journal_event");
  });
  it("keeps native request proofs distinct and rejects reusing accepted evidence for another session", () => {
    const decision = { kind: "identity-decided", decisionId: "b".repeat(64), sourceKind: "native", recordId: "training-session-one",
      fromEvidenceId: null, toEvidenceId: "session-existing-id", linkage: "established", proof: { version: "request-v1", digest: "c".repeat(64) } };
    expect(createJournalEntry(anchor(), decision, NOW).event.proof.version).toBe("request-v1");
    expect(() => createJournalEntry(anchor(), { ...decision, proof: { ...decision.proof, version: "v2" } }, NOW)).toThrow("source_proof_protocol_mismatch");
    expect(() => createJournalEntry(anchor(), { ...decision, sourceKind: "legacy" }, NOW)).toThrow("source_proof_protocol_mismatch");
    const first = accepted();
    const next = createJournalEntry(end(first), { ...first.event, receipt: { ...receipt(2, "different-session"), evidenceId: first.event.receipt.evidenceId } }, NOW);
    expect(() => verifyJournalContinuity(anchor(), end(next), [first, next])).toThrow("duplicate_evidence_acceptance");
  });
  it("preserves historical unknowns and pre-v2 proof limitations without inventing linkage", () => {
    const old = createJournalEntry(anchor(), { kind: "historical-imported", recordId: "old-document", evidenceId: "legacy-old",
      originalSessionId: null, completedAt: null, proof: { version: "pre-v2-unverified", digest: "a".repeat(64) } }, NOW);
    expect(old.event.originalSessionId).toBeNull(); expect(old.event.completedAt).toBeNull();
    expect(() => createJournalEntry(anchor(), { ...old.event, completedAt: "2026-10-19 10:00" }, NOW)).toThrow();
    const unresolved = { kind: "identity-decided", decisionId: "b".repeat(64), sourceKind: "legacy", recordId: "old-document",
      fromEvidenceId: null, toEvidenceId: "legacy-old", linkage: "unresolved", proof: old.event.proof };
    expect(createJournalEntry(end(old), unresolved, NOW).event.linkage).toBe("unresolved");
    expect(() => createJournalEntry(end(old), { ...unresolved, toEvidenceId: "session-invented" }, NOW)).toThrow("invented_identity");
  });
  it("does not use journal acceptance order for chronology, exposure or performance", () => {
    const earlier = completedSession({ id: "earlier-session", date: "2026-10-19T10:00:00.000Z" });
    const later = completedSession({ id: "later-session", mode: "auto", date: "2026-10-20T10:00:00.000Z" });
    const first = accepted(anchor(), later.sessionId), recovered = accepted(end(first), earlier.sessionId);
    expect(verifyJournalContinuity(anchor(), end(recovered), [recovered, first]).entries[0].event.receipt.sessionId).toBe(later.sessionId);
    expect(aggregateCompletedEvidence(evidenceOwner, [earlier, later])).toEqual(aggregateCompletedEvidence(evidenceOwner, [later, earlier]));
    const legacy = legacyAssessment(); legacy.createdAt = "2026-10-19 10:00";
    const adapted = adaptLegacyAutomaticAssessment({ ownerUid: evidenceOwner.uid, assessmentId: "unlinked", assessment: legacy });
    expect(adapted.valid).toBe(true); expect(adapted.session.originalSessionId).toBeNull(); expect(adapted.session.completedAt).toBeNull();
    const subjective = { ...later, selectionContext: { kind: "ai-confirmed", nominatedMethodIds: ["active-recall"] },
      preference: { methodId: "feynman", priority: "performance" }, observations: later.observations.map(row => ({ ...row,
        selfReport: { confidence: 1, ease: 1, willingnessToUse: 1 } })) };
    expect(aggregateCompletedEvidence(evidenceOwner, [later]).performanceGroups).toEqual(aggregateCompletedEvidence(evidenceOwner, [subjective]).performanceGroups);
  });
});
