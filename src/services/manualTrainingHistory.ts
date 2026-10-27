import { collection, doc, documentId, getDocsFromServer, limit, orderBy, query, runTransaction, startAfter } from "firebase/firestore";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from "../firebase";
import { createTrainingDraft } from "../quiz/trainingProgress";
import type { TrainingDraft } from "../quiz/trainingProgress";
import { isTrainingMethodId } from "../quiz/type";
import type { TrainingMethodId, MethodIntroductionResult, MethodLabResult, MethodMatchResult, ReflectionResult } from "../quiz/type";
import { completionFromDraft } from "./trainingCompletion";
import { canonicalCompletionJSON } from "./trainingCompletionOutbox";
import { normalizeEvidenceTimestamp } from "../quiz/learningEvidence";
import { localCompletionConfig } from "./localTrainingCompletionConfig";
import { adaptLegacyAutomaticAssessment } from "../quiz/legacyAssessmentEvidence";
import type { CompletedSessionEvidence } from "../quiz/learningEvidence";

/** Owner-editable legacy practice, NOT cumulative evidence or a V2 receipt. */
export type ManualTrainingRecord = { schemaVersion: 1; kind: "legacy-manual"; sessionId: string; completedAt: string | null; payloadJSON: string };
export type LegacyAssessmentRecord = { id: string; evidence: CompletedSessionEvidence; reflection: { text: string; surprised: boolean | null } | null };
export type ManualHistoryPage = { records: ManualTrainingRecord[]; assessments: LegacyAssessmentRecord[]; warnings?: string[]; cursor: QueryDocumentSnapshot<DocumentData> | null; assessmentCursor: QueryDocumentSnapshot<DocumentData> | null; more: boolean; manualMore: boolean; assessmentMore: boolean };
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new Error(message); };
const validId = (id: string) => id.length >= 8 && id.length <= 200 && !/[/.]/.test(id) && id.trim() === id;
const score = (v: unknown) => v === null || typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const rating = (v: unknown) => count(v) && v >= 1 && v <= 5;
const time = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
function results(p: Record<string, unknown>): p is Record<string, unknown> & { selectedMethods: TrainingMethodId[]; methodIntroduction: MethodIntroductionResult; methodLab: MethodLabResult; methodMatch: MethodMatchResult; reflection: ReflectionResult } {
  const ids = p.selectedMethods, intro = p.methodIntroduction, lab = p.methodLab, match = p.methodMatch, reflection = p.reflection;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || !ids.every(isTrainingMethodId) || new Set(ids).size !== ids.length ||
    !object(intro) || canonicalCompletionJSON(intro.methods) !== canonicalCompletionJSON(ids) || !count(intro.correct) || !count(intro.total) || !score(intro.score) || intro.score === null ||
    !object(lab) || !Array.isArray(lab.experiments) || lab.experiments.length !== ids.length ||
    !object(match) || !Array.isArray(match.methods) || match.methods.length !== Math.min(2, ids.length) || !object(reflection)) return false;
  const labIds = new Set<string>(), matchIds = new Set<string>();
  for (const row of lab.experiments) {
    if (!object(row) || !isTrainingMethodId(row.method) || !ids.includes(row.method) || labIds.has(row.method) ||
      typeof row.category !== "string" || !["memory", "understanding", "organization", "problem-solving", "focus"].includes(row.category) || !score(row.score) ||
      row.correct !== null && !count(row.correct) || row.total !== null && !count(row.total) || !rating(row.confidence) || !rating(row.ease) || !rating(row.willingnessToUse) || !time(row.timeSpentMs)) return false;
    labIds.add(row.method);
  }
  for (const row of match.methods) {
    if (!object(row) || !isTrainingMethodId(row.method) || !ids.includes(row.method) || matchIds.has(row.method) ||
      !score(row.firstScore) || !score(row.verificationScore) || !rating(row.confidence) || !time(row.timeSpentMs) ||
      lab.experiments.find(v => object(v) && v.method === row.method)?.score !== row.firstScore) return false;
    matchIds.add(row.method);
  }
  return (reflection.preferredMethod === null || typeof reflection.preferredMethod === "string" && matchIds.has(reflection.preferredMethod)) &&
    typeof reflection.priority === "string" && ["performance", "ease", "confidence", "realistic-use"].includes(reflection.priority) &&
    (reflection.surprisedByResults === null || typeof reflection.surprisedByResults === "boolean") && typeof reflection.reflectionText === "string" && reflection.reflectionText.length <= 10000;
}

export function readManualTrainingRecord(value: unknown, uid: string): { record: ManualTrainingRecord; draft: TrainingDraft } {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== "legacy-manual" || typeof value.sessionId !== "string" ||
    !validId(value.sessionId) || typeof value.payloadJSON !== "string" ||
    value.completedAt !== null && (typeof value.completedAt !== "string" || normalizeEvidenceTimestamp(value.completedAt) !== value.completedAt) ||
    new TextEncoder().encode(JSON.stringify(value)).length > 256 * 1024) return fail("An individual Training record is invalid; it was not displayed or overwritten.");
  const p: unknown = JSON.parse(value.payloadJSON);
  if (!object(p) || p.schemaVersion !== 1 || p.mode !== "manual" || p.sessionId !== value.sessionId || p.completedAt !== value.completedAt)
    return fail("The individual Training record identity is inconsistent.");
  if (!results(p)) return fail("The saved individual Training results are invalid.");
  const base = createTrainingDraft({ owner: { kind: "user", uid }, mode: "manual", sessionId: value.sessionId });
  const draft: TrainingDraft = { ...base, phase: "final-save", section: 6, selectedMethods: p.selectedMethods,
    verificationMethodOrder: p.methodMatch.methods.map(m => m.method).filter(isTrainingMethodId), completed: { ...base.completed,
      methodIntroduction: p.methodIntroduction, methodLab: p.methodLab, methodMatch: p.methodMatch, reflection: p.reflection } };
  return { record: { schemaVersion: 1, kind: "legacy-manual", sessionId: value.sessionId, completedAt: value.completedAt as string | null, payloadJSON: value.payloadJSON }, draft };
}

function owner(uid: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return fail("Sign in to the original account to save this individual session. Its draft was kept.");
  return () => { if (auth.currentUser !== user) fail("The account changed. This session was not shown or saved to another account."); };
}
function storageKey(uid: string, sessionId: string) {
  const project = auth.app.options.projectId;
  if (!project) return fail("The Training project could not be identified. Keep this draft and retry.");
  return `edulience.manual-completion.v1.${encodeURIComponent(project)}.${encodeURIComponent(uid)}.${encodeURIComponent(sessionId)}`;
}

/** Synchronous browser checkpoint BEFORE Firestore/network. Exact payload survives refresh. */
export function freezeManualTraining(draft: TrainingDraft, completedAt: string | null): ManualTrainingRecord {
  if (draft.mode !== "manual" || draft.owner.kind === "user" && localCompletionConfig()) return fail("This session must use its existing completion protocol.");
  const uid = draft.owner.kind === "user" ? draft.owner.uid : "guest";
  const check = draft.owner.kind === "user" ? owner(uid) : () => { if (auth.currentUser) fail("Guest completion belongs only to this browser, not the signed-in account."); };
  check();
  const record: ManualTrainingRecord = { schemaVersion: 1, kind: "legacy-manual", sessionId: draft.sessionId,
    completedAt: normalizeEvidenceTimestamp(completedAt), payloadJSON: canonicalCompletionJSON(completionFromDraft(draft, completedAt)) };
  readManualTrainingRecord(record, uid);
  const key = storageKey(uid, draft.sessionId);
  try {
    const previous = localStorage.getItem(key);
    if (previous) {
      const frozen = readManualTrainingRecord(JSON.parse(previous), uid).record;
      const requested = { ...JSON.parse(record.payloadJSON), completedAt: frozen.completedAt };
      if (canonicalCompletionJSON(requested) !== frozen.payloadJSON) return fail("Different results already exist for this session. The original checkpoint was retained.");
      return frozen;
    }
    localStorage.setItem(key, JSON.stringify(record));
    if (localStorage.getItem(key) !== JSON.stringify(record)) return fail("Browser checkpoint could not be confirmed.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Browser storage failed. Keep this page open; results are not safely saved.");
  }
  check(); return record;
}

export function restoreManualTraining(draft: TrainingDraft): { draft: TrainingDraft; completedAt: string | null; error: string | null } {
  const empty = { draft, completedAt: null, error: null };
  if (draft.mode !== "manual" || draft.owner.kind !== "user" || localCompletionConfig()) return empty;
  try {
    owner(draft.owner.uid)();
    const raw = localStorage.getItem(storageKey(draft.owner.uid, draft.sessionId));
    if (!raw) return empty;
    const saved = readManualTrainingRecord(JSON.parse(raw), draft.owner.uid);
    if (canonicalCompletionJSON(saved.draft.selectedMethods) !== canonicalCompletionJSON(draft.selectedMethods)) return fail("The saved completion and active draft select different methods.");
    return { draft: { ...draft, phase: "final-save", section: 6, completed: saved.draft.completed }, completedAt: saved.record.completedAt, error: null };
  } catch { return { ...empty, error: "The browser completion checkpoint could not be verified. Keep the draft and retry; no completed record was replaced." }; }
}

export async function saveManualTraining(uid: string, input: ManualTrainingRecord): Promise<ManualTrainingRecord> {
  const check = owner(uid), record = readManualTrainingRecord(input, uid).record;
  if (localCompletionConfig() || uid.startsWith("b1_")) return fail("Protected Training cannot fall back to legacy practice saves.");
  const result = await runTransaction(db, async tx => {
    check();
    const root = doc(db, "users", uid), profile = doc(root, "learningProfiles", "cumulative"), target = doc(root, "manualTrainingSessions", record.sessionId);
    const [account, cumulative, prior] = await Promise.all([tx.get(root), tx.get(profile), tx.get(target)]); check();
    if (!account.exists() || account.data().trainingLifecycleBinding !== undefined || cumulative.exists() && cumulative.data().persistenceVersion !== 1)
      return fail("This account cannot use legacy practice saving. The completion checkpoint and draft were retained; no protected write was attempted.");
    if (prior.exists()) {
      const original = readManualTrainingRecord(prior.data(), uid).record;
      if (canonicalCompletionJSON(original) !== canonicalCompletionJSON(record)) return fail("This session already has different saved results. No record was overwritten.");
      return original;
    }
    tx.set(target, record); return record;
  });
  check(); return result;
}

export async function loadManualTrainingHistory(uid: string, previous?: ManualHistoryPage): Promise<ManualHistoryPage> {
  const check = owner(uid);
  // This reader never queries or reconstructs the protected cumulative namespace.
  const ref = collection(db, "users", uid, "manualTrainingSessions");
  const [snapshot, automatic] = await Promise.all([
    previous && !previous.manualMore ? null : getDocsFromServer(query(ref, orderBy("completedAt", "desc"), ...(previous?.cursor ? [startAfter(previous.cursor)] : []), limit(11))),
    // Document ID pagination includes old records without timestamp fields.
    previous && !previous.assessmentMore ? null : getDocsFromServer(query(collection(db, "users", uid, "assessments"), orderBy(documentId()), ...(previous?.assessmentCursor ? [startAfter(previous.assessmentCursor)] : []), limit(11)))
  ]); check();
  const docs = snapshot?.docs.slice(0, 10) ?? [];
  const warnings: string[] = [], records: ManualTrainingRecord[] = [];
  for (const d of docs) try { const r = readManualTrainingRecord(d.data(), uid).record; if (r.sessionId !== d.id) throw new Error(); records.push(r); }
  catch { warnings.push("An individual practice record could not be validated. History is incomplete; no result was invented or overwritten."); }
  const autoDocs = automatic?.docs.slice(0, 10) ?? [];
  const assessments: LegacyAssessmentRecord[] = [];
  for (const d of autoDocs) {
    const raw = d.data(), result = adaptLegacyAutomaticAssessment({ ownerUid: uid, assessmentId: d.id, assessment: raw });
    if (!result.valid) { warnings.push("A saved Test Me assessment could not be validated. History is incomplete; no result was invented or overwritten."); continue; }
    const r = raw.reflection;
    assessments.push({ id: d.id, evidence: result.session, reflection: object(r) && typeof r.reflectionText === "string" && r.reflectionText.length <= 10000
      ? { text: r.reflectionText, surprised: typeof r.surprisedByResults === "boolean" ? r.surprisedByResults : null } : null });
  }
  const manualMore = (snapshot?.size ?? 0) > 10, assessmentMore = (automatic?.size ?? 0) > 10;
  return { records, assessments, warnings, cursor: docs.at(-1) ?? previous?.cursor ?? null, assessmentCursor: autoDocs.at(-1) ?? previous?.assessmentCursor ?? null, more: manualMore || assessmentMore, manualMore, assessmentMore };
}
