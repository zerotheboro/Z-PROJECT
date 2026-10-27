// @vitest-environment jsdom
import React from "react";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, inMemoryPersistence, setPersistence } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, terminate, setDoc, doc, getDocFromServer, getDocsFromServer, collection } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { cleanup, fireEvent, render, screen, waitFor, act, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { completionDraftFixture } from "../../../test-support/completionDraftFixture";
import { savedProfileConsistencyFixture } from "../../../test-support/savedProfileConsistencyFixture";
import type { MethodIntroductionResult, MethodLabResult, MethodMatchResult, TrainingMethodId } from "../type";

const emu = vi.hoisted(() => ({ auth: null as Auth | null, db: null as Firestore | null, reserve: vi.fn(), count: 1, hold: null as Promise<void> | null }));
vi.mock("../../firebase", () => ({ get auth() { return emu.auth; }, get db() { return emu.db; } }));
vi.mock("../../HEADER/header", () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock("../../pages/Library", () => ({ default: () => null }));
vi.mock("../../pages/Training", () => ({ default: () => <p>Training landing</p> }));
vi.mock("../../pages/Shorts", () => ({ default: () => null }));
vi.mock("../../MIDSECTION/section_of_each_tips.jsx", () => ({ default: () => null }));
vi.mock("../../hooks/useTrainingAccess", () => ({ useTrainingAccess: () => ({ user: emu.auth!.currentUser, loading: false, unlimited: true, error: null, refreshAccess: () => {} }) }));
vi.mock("../../services/trainingAccess", () => ({ reserveTrainingAccess: (...args: unknown[]) => emu.reserve(...args) }));
// Exercise the real picker, controller, Reflection, draft/streak persistence and profile reader.
// Only long-running method engines use deterministic synthetic task results.
vi.mock("../sections/MethodIntroduction", () => ({ default: ({ methods, onComplete }: { methods: TrainingMethodId[]; onComplete: (v: MethodIntroductionResult) => void }) => <button onClick={() => onComplete({ methods, correct: methods.length, total: methods.length, score: 1 })}>Finish synthetic introduction</button> }));
vi.mock("../sections/MethodLab", () => ({ default: ({ onComplete }: { onComplete: (v: MethodLabResult) => void }) => <button onClick={() => onComplete(completionDraftFixture("manual", emu.count).completed.methodLab!)}>Finish synthetic experiments</button> }));
vi.mock("../sections/MethodMatchChallenge", () => ({ default: ({ onComplete }: { onComplete: (v: MethodMatchResult) => void }) => <button onClick={() => onComplete(completionDraftFixture("manual", emu.count).completed.methodMatch!)}>Finish synthetic verification</button> }));
import AppRouter from "../../AppRouter.jsx";
import { freezeManualTraining, saveManualTraining } from "../../services/manualTrainingHistory";
import { saveAssessment } from "../../services/assessment";
vi.mock("../../services/manualTrainingHistory", async importActual => {
  const actual = await importActual<typeof import("../../services/manualTrainingHistory")>();
  return { ...actual, saveManualTraining: async (...args: Parameters<typeof actual.saveManualTraining>) => {
    if (emu.hold) await emu.hold;
    return actual.saveManualTraining(...args);
  } };
});

describe.runIf(process.env.EDULIENCE_MANUAL_PRODUCT_EMULATOR === "1")("actual legacy Manual route with demo Auth/Firestore", () => {
  let app: FirebaseApp, rules: { clearFirestore: () => Promise<void>; cleanup: () => Promise<void>; withSecurityRulesDisabled: (fn: (ctx: { firestore: () => { doc: (path: string) => { set: (data: unknown) => Promise<void> } } }) => Promise<void>) => Promise<void> };
  let email: string, uid: string;
  beforeAll(async () => {
    if (process.versions.node.split(".")[0] !== "24" || process.env.FIREBASE_PROJECT_ID !== "demo-edulience-phase2a" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18787" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Isolated Node24 demo Emulators required; no fallback.");
    const require = createRequire(process.env.EDULIENCE_TEST_TOOLS_DIRECTORY + "/package.json");
    const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
    rules = await initializeTestEnvironment({ projectId: "demo-edulience-phase2a", firestore: { host: "127.0.0.1", port: 18787, rules: readFileSync("test-support/firestore/owner-supplied.rules", "utf8") } });
    app = initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-local-only" }, "manual-product-test");
    emu.auth = getAuth(app); connectAuthEmulator(emu.auth, "http://127.0.0.1:9099", { disableWarnings: true }); await setPersistence(emu.auth, inMemoryPersistence);
    emu.db = getFirestore(app); connectFirestoreEmulator(emu.db, "127.0.0.1", 18787);
  }, 30000);
  beforeEach(async () => {
    cleanup(); localStorage.clear(); emu.hold = null; await rules.clearFirestore();
    email = `manual-${crypto.randomUUID()}@example.test`;
    await createUserWithEmailAndPassword(emu.auth!, email, "synthetic-demo-password"); uid = emu.auth!.currentUser!.uid;
    await setDoc(doc(emu.db!, "users", uid), { learningProfile: null });
    emu.reserve.mockReset().mockImplementation(async (_user, request) => {
      await rules.withSecurityRulesDisabled(async ctx => { await ctx.firestore().doc(`users/${uid}/trainingReservations/${request.sessionId}`).set({ sessionId: request.sessionId, mode: request.mode, methodIds: request.methodIds }); });
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubEnv("VITE_TRAINING_COMPLETION_PHASE2B", ""); vi.stubEnv("VITE_CUMULATIVE_PROFILE_PHASE2C", "");
  });
  afterAll(async () => { cleanup(); if (emu.db) await terminate(emu.db); if (app) await deleteApp(app); if (rules) await rules.cleanup(); vi.unstubAllEnvs(); });
  const mount = (hash: string) => { window.history.replaceState({}, "", "/#" + hash); return render(<AppRouter />); };
  it.each([1,3])("picker → %i Manual methods → real Reflection → persistent history → refresh/logout/login", async count => {
    emu.count = count; mount("/training/choose");
    for (const name of ["Active Recall", "Feynman", "Cornell"].slice(0,count)) fireEvent.click(await screen.findByRole("checkbox", { name: new RegExp(name, "i") }));
    fireEvent.click(screen.getByRole("button", { name: "Start training" }));
    for (const name of ["Finish synthetic introduction", "Finish synthetic experiments", "Finish synthetic verification"]) fireEvent.click(await screen.findByRole("button", { name }, { timeout: 15000 }));
    await screen.findByRole("heading", { name: "Your Reflection" });
    fireEvent.click(screen.getByRole("button", { name: "Neither of these" })); fireEvent.click(screen.getByRole("button", { name: "It helps me perform better" })); fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private synthetic student reflection" } });
    let release: (() => void) | undefined;
    if (count === 1) emu.hold = new Promise<void>(resolve => { release = resolve; });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    if (count === 1) {
      await waitFor(() => expect(Object.keys(localStorage).some(key => key.startsWith("edulience.manual-completion.v1."))).toBe(true));
      const key = Object.keys(localStorage).find(key => key.startsWith("edulience.manual-completion.v1."))!, frozen = localStorage.getItem(key);
      expect(screen.queryByRole("heading", { name: "Session complete" })).toBeNull();
      const resume = window.location.hash.slice(1); cleanup(); mount(resume);
      await screen.findByRole("heading", { name: "Finish closing your training session" }, { timeout: 15000 });
      expect(localStorage.getItem(key)).toBe(frozen); expect(screen.queryByRole("heading", { name: "Your Reflection" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Retry final save" })); emu.hold = null; release!();
    }
    await screen.findByRole("heading", { name: "Session complete" }, { timeout: 15000 });
    const saved = await getDocsFromServer(collection(emu.db!, "users", uid, "manualTrainingSessions")); expect(saved.size).toBe(1);
    const record = saved.docs[0].data(); const payload = JSON.parse(record.payloadJSON);
    expect(payload.selectedMethods).toHaveLength(count); expect(payload.methodLab.experiments).toHaveLength(count); expect(payload.reflection.reflectionText).toBe("Private synthetic student reflection");
    expect((await getDocFromServer(doc(emu.db!, "users", uid))).data()!.learningProfile).toBeNull();
    expect((await getDocFromServer(doc(emu.db!, "users", uid, "trainingProgress", "active"))).exists()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "View Learning Profile" }));
    await screen.findByRole("heading", { name: /Individual Training ·/ }, { timeout: 15000 });
    const history = screen.getByRole("region", { name: "Saved Training history" });
    const details = within(history).getByText("View individual session results").closest("details")!; details.setAttribute("open", "");
    expect(screen.queryByText("Private synthetic student reflection")).toBeNull();
    fireEvent.click(within(history).getByRole("button", { name: "Show private reflection" })); expect(screen.getByText("Private synthetic student reflection")).toBeTruthy();
    cleanup(); mount("/training/profile"); await screen.findByRole("heading", { name: /Individual Training ·/ }, { timeout: 15000 }); expect(screen.queryByText("Private synthetic student reflection")).toBeNull();
    await act(async () => signOut(emu.auth!)); await screen.findByRole("heading", { name: "Sign in to view your learning profile" }); expect(screen.queryByRole("heading", { name: /Individual Training ·/ })).toBeNull();
    await act(async () => { await signInWithEmailAndPassword(emu.auth!, email, "synthetic-demo-password"); });
    await screen.findByRole("heading", { name: /Individual Training ·/ }, { timeout: 15000 });
    expect(emu.reserve).toHaveBeenCalledOnce();
    // Delete browser recovery state and rebuild SDK clients: saved results survive.
    cleanup(); localStorage.clear(); await terminate(emu.db!); await deleteApp(app);
    app = initializeApp({ projectId: "demo-edulience-phase2a", apiKey: "demo-local-only" }, `manual-restart-${count}`);
    emu.auth = getAuth(app); connectAuthEmulator(emu.auth, "http://127.0.0.1:9099", { disableWarnings: true }); emu.db = getFirestore(app); connectFirestoreEmulator(emu.db, "127.0.0.1", 18787);
    await signInWithEmailAndPassword(emu.auth, email, "synthetic-demo-password"); mount("/training/profile");
    await screen.findByRole("heading", { name: /Individual Training ·/ }, { timeout: 15000 });
    expect((await getDocsFromServer(collection(emu.db, "users", uid, "manualTrainingSessions"))).size).toBe(1);
  }, 45000);
  it("identical retries recover original results, conflicting retries reject, cross-owner reads deny", async () => {
    const draft = completionDraftFixture("manual", 1); draft.owner = {kind:"user",uid};
    const record = freezeManualTraining(draft, "2026-10-20T09:00:00Z");
    const [a,b] = await Promise.all([saveManualTraining(uid, record), saveManualTraining(uid, record)]); expect(a).toEqual(b);
    await expect(saveManualTraining(uid, {...record, payloadJSON: record.payloadJSON.replace("Synthetic offline reflection", "Conflicting") })).rejects.toThrow("different saved results");
    const before = (await getDocsFromServer(collection(emu.db!, "users", uid, "manualTrainingSessions"))).size; expect(before).toBe(1);
    await createUserWithEmailAndPassword(emu.auth!, `other-${crypto.randomUUID()}@example.test`, "synthetic-demo-password");
    await expect(getDocsFromServer(collection(emu.db!, "users", uid, "manualTrainingSessions"))).rejects.toThrow();
    await expect(saveManualTraining(uid, record)).rejects.toThrow("original account");
  }, 30000);
  it("reads Test Me and Test Method into one chronological history without counting the latest root snapshot again", async () => {
    const draft = completionDraftFixture("manual",1,"unified-manual-session"); draft.owner = {kind:"user",uid};
    await saveManualTraining(uid, freezeManualTraining(draft, "2026-10-20T09:00:00Z"));
    const automatic = completionDraftFixture("auto",3);
    const input = { userId: uid, learningSituation: automatic.completed.learningSituation!, baseline: automatic.completed.baseline!, methodIntroduction: automatic.completed.methodIntroduction!, methodLab: automatic.completed.methodLab!, methodMatch: automatic.completed.methodMatch!, reflection: automatic.completed.reflection!, learningProfile: automatic.completed.learningProfile! };
    await saveAssessment({...input,sessionId:"unified-dated-assessment"});
    await setDoc(doc(emu.db!,"users",uid,"assessments","unified-dated-assessment"),{completedAt:"2026-10-25T09:00:00Z"},{merge:true});
    await saveAssessment({...input,sessionId:"unified-unknown-completion"});
    await setDoc(doc(emu.db!,"users",uid,"assessments","unreadable-historical-record"),{status:"completed"});
    mount("/training/profile");
    await screen.findByRole("heading",{name:/Individual Training ·/},{timeout:15000});
    const region=screen.getByRole("region",{name:"Saved Training history"});
    const rows=region.querySelectorAll(".cumulative-history > li"); expect(rows).toHaveLength(3);
    expect(rows[0].querySelector("h3")!.textContent).toContain("Test Me · Oct 25");
    expect(rows[1].querySelector("h3")!.textContent).toContain("Individual Training · Oct 20");
    expect(rows[2].querySelector("h3")!.textContent).toBe("Test Me · Completion time not recorded");
    expect(within(region).getByRole("alert").textContent).toContain("History is incomplete");
    expect(region.textContent).not.toContain("All readable source pages have been loaded");
    expect(screen.getByText("LATEST SAVED SNAPSHOT · NOT AN ADDITIONAL HISTORY EVENT")).toBeTruthy();
  },30000);
  it("the actual profile reconciles four Test Me labs and two saved Active Recall practices in all four sections", async () => {
    const f = savedProfileConsistencyFixture(uid), completed = f.automatic.completed;
    await saveAssessment({ userId: uid, sessionId: f.automatic.sessionId, learningSituation: completed.learningSituation!, baseline: completed.baseline!,
      methodIntroduction: completed.methodIntroduction!, methodLab: completed.methodLab!, methodMatch: completed.methodMatch!, reflection: completed.reflection!, learningProfile: f.profile });
    await setDoc(doc(emu.db!,"users",uid,"assessments",f.automatic.sessionId),{completedAt:f.assessmentDocument.completedAt},{merge:true});
    for (const record of f.records) await saveManualTraining(uid, record);
    const check = async () => {
      await screen.findByText("2 individual practice attempts · 2 saved sessions (loaded).", {}, {timeout:15000});
      const overview = within(screen.getByRole("region",{name:"Learning Overview"}));
      for (const [label,value] of [["Saved Test Me assessments (loaded)","1"],["Individual practice sessions (loaded)","2"],["Methods in latest Test Me snapshot","4"],["Task observations in loaded history","10"]])
        expect(overview.getByText(label).nextElementSibling?.textContent).toBe(value);
      const evidence = within(screen.getByRole("region",{name:"Study Method Evidence"})), recall = within(evidence.getByRole("article",{name:"Active Recall evidence"}));
      fireEvent.click(recall.getByText("2 saved individual practice sessions"));
      const practice = within(recall.getByRole("region",{name:"Legacy individual practice results"}));
      for (const score of ["25%","100%","50%","75%"]) expect(practice.getByText(score)).toBeTruthy();
      expect(recall.getByText("1 saved Test Me assessment record (loaded)")).toBeTruthy();
      const history = screen.getByRole("region",{name:"Saved Training history"}); expect(history.querySelectorAll(".cumulative-history > li")).toHaveLength(3);
      expect(within(history).getByRole("heading",{name:/Individual Training · Oct 20, 2026/})).toBeTruthy();
      expect(within(history).getByRole("heading",{name:/Individual Training · Oct 21, 2026/})).toBeTruthy();
      const progress = within(screen.getByRole("region",{name:"Progress Over Time"}));
      expect(progress.getByText("10 observations recorded")).toBeTruthy();
      expect(progress.getByText("Not enough comparable results yet.")).toBeTruthy(); expect(progress.queryByRole("img")).toBeNull();
      expect(screen.queryByText(new RegExp(`PRIVATE ${uid}`))).toBeNull();
    };
    mount("/training/profile"); await check(); cleanup(); mount("/training/profile"); await check();
    expect((await getDocsFromServer(collection(emu.db!,"users",uid,"manualTrainingSessions"))).size).toBe(2);
    expect((await getDocsFromServer(collection(emu.db!,"users",uid,"assessments"))).size).toBe(1); expect(emu.reserve).not.toHaveBeenCalled();
  },30000);
});
