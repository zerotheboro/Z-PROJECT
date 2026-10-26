import { describe, expect, it } from "vitest";
import { AUTHORITY_PROTOCOL, SOURCE_NAMESPACE_VERSION } from "./authorityContracts";
import { makeSealHandle } from "./sealingContracts";
import { participantsHash } from "./sealingContracts";
import { createTrainingRecoveryAttempt, parseTrainingRecoveryAttempt, assertRecoveryHandle, assertRecoveryScopeAdvance } from "./protectedTrainingRecovery";

const context = { schemaVersion: 1, uid: "b1_recovery_contract", protection: "protected", lifecycleEpoch: 1,
  rootBinding: "a".repeat(64), rootCreatedAt: { seconds: 1792886400, nanoseconds: 0 }, fence: 1,
  writerProtocol: AUTHORITY_PROTOCOL, namespaceVersion: SOURCE_NAMESPACE_VERSION };
const completion = { sessionId: "frozen-completion-session", requestHash: "b".repeat(64) };
const scope = { sealRevision: 0, sourceRevision: 0, revocationFence: 1, lifecycleRevision: 0, lifecycleHead: null };
const handle = attempt => makeSealHandle(attempt.requestId, { context, lifecycleRevision: 0, lifecycleHead: null, genesisHash: null,
  journalCutoff: null, sourceRevision: 0, revocationFence: 1, participantsHash: participantsHash() });

describe("frozen completion / durable sealing round binding", () => {
  it("allocates deterministic, bounded records without altering a caller's objects", () => {
    const inputs = structuredClone({ context, completion, scope }), first = createTrainingRecoveryAttempt(inputs.context, inputs.completion, inputs.scope);
    expect(first).toEqual(createTrainingRecoveryAttempt(context, completion, scope)); expect(parseTrainingRecoveryAttempt(first)).toEqual(first);
    expect(Object.isFrozen(inputs.context)).toBe(false); expect(first.completion).toEqual(completion); expect(first.requestId.length).toBeLessThanOrEqual(100);
  });
  it("a changed-cutoff round gets a new request identity and preserves the frozen completion identity", () => {
    const first = createTrainingRecoveryAttempt(context, completion, scope);
    const second = createTrainingRecoveryAttempt(context, completion, { ...scope, sealRevision: 2, sourceRevision: 1 }, first);
    expect(second.sequence).toBe(2); expect(second.previousAttemptId).toBe(first.attemptId);
    expect(second.requestId).not.toBe(first.requestId); expect(second.completion).toEqual(first.completion);
  });
  it.each(["uid", "context", "completion", "scope", "sequence", "previousAttemptId", "attemptId", "requestId"])("rejects altered %s rather than adopting the record", field => {
    const first = createTrainingRecoveryAttempt(context, completion, scope);
    const altered = { ...first, [field]: field === "sequence" ? 2 : field === "scope" ? { ...scope, sourceRevision: 1 } : "substituted" };
    expect(() => parseTrainingRecoveryAttempt(altered)).toThrow();
  });
  it("does not execute metadata accessors", () => {
    let calls = 0; const input = { get schemaVersion() { calls++; return 1; } };
    expect(() => parseTrainingRecoveryAttempt(input)).toThrow(); expect(calls).toBe(0);
  });
  it("rejects a conflicting frozen payload or another owner's/incarnation's predecessor", () => {
    const first = createTrainingRecoveryAttempt(context, completion, scope), next = { ...scope, sealRevision: 2, sourceRevision: 1 };
    expect(() => createTrainingRecoveryAttempt(context, { ...completion, requestHash: "c".repeat(64) }, next, first)).toThrow("completion_conflict");
    expect(() => createTrainingRecoveryAttempt({ ...context, rootBinding: "c".repeat(64) }, completion, next, first)).toThrow();
    expect(() => createTrainingRecoveryAttempt({ ...context, uid: "b1_another" }, completion, next, first)).toThrow();
  });
  it("rejects rollback, revocation fence changes and contradictory lifecycle heads", () => {
    const current = { ...scope, sealRevision: 4, sourceRevision: 2, lifecycleRevision: 1, lifecycleHead: "c".repeat(64) };
    for (const changed of [{ ...current, sealRevision: 3 }, { ...current, sourceRevision: 1 }, { ...current, revocationFence: 2 },
      { ...current, lifecycleRevision: 0, lifecycleHead: null }, { ...current, lifecycleHead: "d".repeat(64) }])
      expect(() => assertRecoveryScopeAdvance(current, changed)).toThrow();
  });
  it("binds the real handle and allows a later actual pin when an open writer raced allocation", () => {
    const first = createTrainingRecoveryAttempt(context, completion, scope), same = handle(first);
    expect(assertRecoveryHandle(first, same)).toEqual(same);
    const later = makeSealHandle(first.requestId, { ...same.pin, sourceRevision: 1, lifecycleRevision: 1, lifecycleHead: "c".repeat(64) });
    expect(assertRecoveryHandle(first, later)).toEqual(later);
    expect(() => assertRecoveryHandle(first, makeSealHandle("wrong-request-id", same.pin))).toThrow();
    expect(() => assertRecoveryHandle(first, makeSealHandle(first.requestId, { ...same.pin, revocationFence: 2 }))).toThrow();
  });
  it("refuses a new round without a changed scope", () => {
    const first = createTrainingRecoveryAttempt(context, completion, scope);
    expect(() => createTrainingRecoveryAttempt(context, completion, scope, first)).toThrow("protected_training_recovery_restart_unchanged");
  });
});
