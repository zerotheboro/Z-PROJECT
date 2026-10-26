import { parseWriterGuardContext, assertWriterGuardContext } from "./writerGuard";
import type { WriterGuardContext } from "./writerGuard";
import { parseSealHandle } from "./sealingContracts";
import type { SealHandle } from "./sealingContracts";
import { bounded, canonicalJSON, hash, integer, nextRevision, object, requireContract, text, typedHash } from "./values";

export const TRAINING_RECOVERY_PROTOCOL = "protected-training-recovery-stage4e-v1";
export const TRAINING_RECOVERY_LIMITS = Object.freeze({ attempts: 100, bytes: 16 * 1024 });
export type FrozenCompletionIdentity = Readonly<{ sessionId: string; requestHash: string }>;
export type RecoveryScope = Readonly<{ sealRevision: number; sourceRevision: number; revocationFence: number;
  lifecycleRevision: number; lifecycleHead: string | null }>;
export type TrainingRecoveryAttempt = Readonly<{ schemaVersion: 1; protocol: typeof TRAINING_RECOVERY_PROTOCOL;
  uid: string; context: WriterGuardContext; completion: FrozenCompletionIdentity; scope: RecoveryScope;
  sequence: number; previousAttemptId: string | null; attemptId: string; requestId: string }>;

export function parseFrozenCompletionIdentity(value: unknown): FrozenCompletionIdentity {
  const d = object(value, ["sessionId", "requestHash"]); text(d.sessionId, 200); hash(d.requestHash);
  return d as unknown as FrozenCompletionIdentity;
}
export function parseRecoveryScope(value: unknown): RecoveryScope {
  const d = object(value, ["sealRevision", "sourceRevision", "revocationFence", "lifecycleRevision", "lifecycleHead"]);
  integer(d.sealRevision); integer(d.sourceRevision); integer(d.revocationFence, 1); integer(d.lifecycleRevision);
  requireContract(d.sourceRevision <= d.sealRevision && d.revocationFence - 1 <= d.sealRevision, "protected_training_recovery_scope_invalid");
  if (d.lifecycleRevision === 0) requireContract(d.lifecycleHead === null, "protected_training_recovery_scope_invalid"); else hash(d.lifecycleHead);
  return d as unknown as RecoveryScope;
}
export function parseTrainingRecoveryAttempt(value: unknown): TrainingRecoveryAttempt {
  const d = object(value, ["schemaVersion", "protocol", "uid", "context", "completion", "scope", "sequence", "previousAttemptId", "attemptId", "requestId"]);
  const context = parseWriterGuardContext(d.context); parseFrozenCompletionIdentity(d.completion); parseRecoveryScope(d.scope);
  integer(d.sequence, 1); hash(d.attemptId);
  requireContract(d.schemaVersion === 1 && d.protocol === TRAINING_RECOVERY_PROTOCOL && d.uid === context.uid && context.protection === "protected" &&
    d.sequence <= TRAINING_RECOVERY_LIMITS.attempts, "protected_training_recovery_invalid");
  if (d.sequence === 1) requireContract(d.previousAttemptId === null, "protected_training_recovery_invalid"); else hash(d.previousAttemptId);
  const { attemptId, requestId, ...body } = d;
  requireContract(attemptId === typedHash("protected-training-recovery-attempt-v1", body) &&
    requestId === `stage4e-recovery-${attemptId}`, "protected_training_recovery_identity_invalid");
  return bounded(d, TRAINING_RECOVERY_LIMITS.bytes) as unknown as TrainingRecoveryAttempt;
}
export function assertRecoveryScopeAdvance(beforeValue: RecoveryScope, afterValue: RecoveryScope) {
  const before = parseRecoveryScope(beforeValue), after = parseRecoveryScope(afterValue);
  requireContract(after.sealRevision >= before.sealRevision && after.sourceRevision >= before.sourceRevision &&
    after.lifecycleRevision >= before.lifecycleRevision && after.revocationFence === before.revocationFence &&
    (after.lifecycleRevision !== before.lifecycleRevision || after.lifecycleHead === before.lifecycleHead), "protected_training_recovery_scope_changed");
}
export function createTrainingRecoveryAttempt(contextValue: WriterGuardContext, completionValue: FrozenCompletionIdentity,
  scopeValue: RecoveryScope, previousValue: TrainingRecoveryAttempt | null = null): TrainingRecoveryAttempt {
  const context = parseWriterGuardContext(contextValue), completion = parseFrozenCompletionIdentity(completionValue), scope = parseRecoveryScope(scopeValue);
  const previous = previousValue && parseTrainingRecoveryAttempt(previousValue);
  if (previous) {
    assertWriterGuardContext(context, previous.context);
    requireContract(canonicalJSON(completion) === canonicalJSON(previous.completion), "completion_conflict");
    assertRecoveryScopeAdvance(previous.scope, scope);
    requireContract(canonicalJSON(previous.scope) !== canonicalJSON(scope), "protected_training_recovery_restart_unchanged");
  }
  const body = { schemaVersion: 1, protocol: TRAINING_RECOVERY_PROTOCOL, uid: context.uid, context, completion, scope,
    sequence: previous ? nextRevision(previous.sequence) : 1, previousAttemptId: previous?.attemptId ?? null };
  const attemptId = typedHash("protected-training-recovery-attempt-v1", body);
  return parseTrainingRecoveryAttempt({ ...body, attemptId, requestId: `stage4e-recovery-${attemptId}` });
}
export function assertRecoveryHandle(attemptValue: TrainingRecoveryAttempt, handleValue: unknown): SealHandle {
  const attempt = parseTrainingRecoveryAttempt(attemptValue), handle = parseSealHandle(handleValue);
  assertWriterGuardContext(attempt.context, handle.pin.context);
  requireContract(handle.uid === attempt.uid && handle.requestId === attempt.requestId &&
    handle.pin.sourceRevision >= attempt.scope.sourceRevision && handle.pin.revocationFence === attempt.scope.revocationFence &&
    handle.pin.lifecycleRevision >= attempt.scope.lifecycleRevision &&
    (handle.pin.lifecycleRevision !== attempt.scope.lifecycleRevision || handle.pin.lifecycleHead === attempt.scope.lifecycleHead),
  "protected_training_recovery_handle_mismatch");
  return handle;
}
