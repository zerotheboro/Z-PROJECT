import { describe, expect, it } from "vitest";
import { digest } from "../trainingCompletionContract";
import { createJournalEntry } from "./journal";
import { initialControl } from "./acceptanceState";
import { acceptanceBatchIdentity, checkpointForBatch, createAcceptanceBatch, initialAcceptanceCheckpoint,
  parseAcceptanceBatch, parseAcceptanceCheckpoint, verifyAcceptanceCheckpoint } from "./acceptanceBatches";
import { typedHash } from "./values";

const UID = "offline-batch-owner", NOW = "2026-10-23T10:00:00.000Z";
const origin = () => initialAcceptanceCheckpoint({ uid: UID, lifecycleEpoch: 1 });
function accepted(previous = origin(), mode = "manual") {
  const sessionId = `offline-batch-session-${previous.ordinal + 1}`, evidenceId = `session-${digest(sessionId)}`;
  const receipt = { schemaVersion: 2, status: "accepted", sessionId, mode, evidenceId, requestHash: "a".repeat(64),
    lifecycleEpoch: 1, acceptedRevision: previous.headRevision + 1, recordedAt: NOW,
    legacyAssessmentId: mode === "auto" ? sessionId : null, legacyProfileUpdated: false };
  const entries = [createJournalEntry({ uid: UID, lifecycleEpoch: 1, revision: previous.headRevision, headHash: previous.headHash },
    { kind: "session-accepted", receipt, evidenceHash: "e".repeat(64) }, NOW)];
  for (const sourceKind of mode === "auto" ? ["native", "legacy"] : ["native"]) {
    const fingerprint = sourceKind === "native" ? receipt.requestHash : `v2:${"b".repeat(64)}`;
    const decision = { schemaVersion: 1, sourceKind, recordId: sessionId,
      sourceHash: digest(["training-source-v1", sourceKind, sessionId]), fromEvidenceId: null, toEvidenceId: evidenceId, fingerprint };
    const tail = entries.at(-1);
    entries.push(createJournalEntry({ uid: UID, lifecycleEpoch: 1, revision: tail.revision, headHash: tail.entryHash }, {
      kind: "identity-decided", decisionId: digest(decision), sourceKind, recordId: sessionId, fromEvidenceId: null,
      toEvidenceId: evidenceId, linkage: "established", proof: { version: sourceKind === "native" ? "request-v1" : "v2",
        digest: sourceKind === "native" ? receipt.requestHash : "b".repeat(64) }
    }, NOW));
  }
  const batch = createAcceptanceBatch(previous, entries), checkpoint = checkpointForBatch(batch);
  const control = { ...initialControl(UID), nativeAcceptedCount: checkpoint.ordinal, headRevision: checkpoint.headRevision, headHash: checkpoint.headHash };
  return { batch, checkpoint, control, entries };
}
const rehash = batch => {
  const { batchHash: _hash, ...body } = batch;
  return { ...body, batchHash: typedHash("stage2-acceptance-batch-v1", body) };
};

describe("committed Stage 2 acceptance ordinals (not inventory authority)", () => {
  it("validates the origin and both first-batch journal widths without changing receipts", () => {
    expect(verifyAcceptanceCheckpoint(initialControl(UID), origin())).toEqual(origin());
    for (const mode of ["manual", "auto"]) {
      const x = accepted(origin(), mode);
      expect(x.batch.ordinal).toBe(1); expect(x.batch.lastRevision).toBe(mode === "auto" ? 3 : 2);
      expect(verifyAcceptanceCheckpoint(x.control, x.checkpoint, x.batch, x.entries)).toEqual(x.checkpoint);
      expect(x.batch.receipt).toEqual(x.entries[0].event.receipt);
      expect(x.batch.receipt).not.toHaveProperty("profileRevision");
    }
  });
  it("increments ordinals once across mixed batches and binds the direct predecessor", () => {
    const a = accepted(origin(), "auto"), b = accepted(a.checkpoint, "manual"), c = accepted(b.checkpoint, "auto");
    expect([a.batch.ordinal, b.batch.ordinal, c.batch.ordinal]).toEqual([1, 2, 3]);
    expect([a.batch.lastRevision, b.batch.lastRevision, c.batch.lastRevision]).toEqual([3, 5, 8]);
    expect(c.batch.previous.batchHash).toBe(b.batch.batchHash);
    expect(verifyAcceptanceCheckpoint(c.control, c.checkpoint, c.batch, c.entries, b.batch)).toEqual(c.checkpoint);
  });
  it.each([0, 2, 99, "1", [1]])("does not accept a control counter independent of the committed ordinal: %j", count => {
    const x = accepted();
    expect(() => verifyAcceptanceCheckpoint({ ...x.control, nativeAcceptedCount: count }, x.checkpoint, x.batch, x.entries)).toThrow();
  });
  it.each([undefined, null, {}, { ...origin(), ordinal: 1 }, { ...origin(), headRevision: 1 }])("rejects missing/malformed checkpoints %#", checkpoint => {
    expect(() => verifyAcceptanceCheckpoint(initialControl(UID), checkpoint)).toThrow();
  });
  it("rejects changed owner, epoch, journal head, or substituted batch", () => {
    const x = accepted(), other = accepted(origin(), "auto");
    for (const changed of [{ uid: "other-owner" }, { lifecycleEpoch: 2 }, { headHash: "f".repeat(64) }, { headRevision: 999 }])
      expect(() => verifyAcceptanceCheckpoint({ ...x.control, ...changed }, x.checkpoint, x.batch, x.entries)).toThrow();
    expect(() => verifyAcceptanceCheckpoint(x.control, x.checkpoint, other.batch, x.entries)).toThrow();
    expect(() => verifyAcceptanceCheckpoint(x.control, x.checkpoint, undefined, x.entries)).toThrow();
  });
  it("rejects incomplete/altered journal entries and source substitution", () => {
    const x = accepted();
    expect(() => verifyAcceptanceCheckpoint(x.control, x.checkpoint, x.batch, x.entries.slice(0, 1))).toThrow();
    expect(() => verifyAcceptanceCheckpoint(x.control, x.checkpoint, x.batch, [{ ...x.entries[0], entryHash: "f".repeat(64) }, x.entries[1]])).toThrow();
    expect(() => parseAcceptanceBatch(rehash({ ...x.batch, receipt: { ...x.batch.receipt, evidenceId: `session-${"f".repeat(64)}` } }))).toThrow();
  });
  it("requires the actual persisted predecessor even when a replacement is rehashed consistently", () => {
    const a = accepted(), b = accepted(a.checkpoint, "auto");
    expect(() => verifyAcceptanceCheckpoint(b.control, b.checkpoint, b.batch, b.entries)).toThrow();
    const altered = rehash({ ...b.batch, previous: { ...b.batch.previous, batchHash: "f".repeat(64) } });
    expect(() => verifyAcceptanceCheckpoint(b.control, checkpointForBatch(altered), altered, b.entries, a.batch)).toThrow();
  });
  it("rejects accessors without invocation and does not mutate/freeze caller-owned data", () => {
    let calls = 0;
    expect(() => parseAcceptanceCheckpoint({ ...origin(), get ordinal() { calls++; return 0; } })).toThrow();
    const entries = [];
    Object.defineProperty(entries, "0", { enumerable: true, get() { calls++; return {}; } });
    expect(() => createAcceptanceBatch(origin(), entries)).toThrow();
    expect(calls).toBe(0);
    const x = accepted(), caller = structuredClone(x.batch), snapshot = structuredClone(caller);
    expect(parseAcceptanceBatch(caller)).toEqual(snapshot); expect(caller).toEqual(snapshot);
    expect(Object.isFrozen(caller.previous)).toBe(false);
    expect(() => parseAcceptanceBatch({ ...caller, ordinal: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => acceptanceBatchIdentity({ uid: "bad-\ud800", lifecycleEpoch: 1 }, 1)).toThrow();
  });
});
