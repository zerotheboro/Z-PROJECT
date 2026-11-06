// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../firebase", () => ({
  auth: { currentUser: null, app: { options: { projectId: "demo-economics9708" } } }, db: {}
}));
import { economicsTopics, syllabusPointIds, syllabusDetails } from "../economics9708/syllabus";
import { economicsPacks, economicsCoverageManifest, packProblems, requireEconomicsPack } from "../economics9708/packs";
import { economicsContentId, readEconomicsSelection, economicsMetadata } from "../economics9708/selection";
import { trainingLabContentSets, trainingMatchContentSets } from "../trainingContent";
import { methodLabContentSets, methodMatchContentSets } from "../methodContentSets";
import { baselineMemoryContentSets, baselineConceptContentSets } from "../assessmentData";
import { getMethodDefinition } from "../methodRegistry";
import { TRAINING_METHOD_IDS } from "../type";
import type { TrainingMethodId } from "../type";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import type { TrainingInternalState } from "../trainingProgress";
import { TrainingProgressStateProvider, TrainingStateScope } from "../trainingProgressState";
import { encodeFirestoreTrainingDraft, decodeFirestoreTrainingDraft } from "../../services/trainingDraftFirestoreCodec";
import BaselineChallenge from "../sections/BaselineChallenge";
import MultipleChoiceRunner from "../engines/shared/MultipleChoiceRunner";
import { AdaptiveDifficultyProvider, AdaptiveDifficultyScope } from "../engines/shared/AdaptiveDifficultyProvider";
import { createAdaptiveDifficultyState } from "../engines/shared/adaptiveDifficulty";
import { scoreMultipleChoice } from "../engines/shared/scoring";
import { selectMethods } from "../methodSelector";
import { selectMethodsForVerification } from "../methodMatchSelector";
import { completionFromDraft } from "../../services/trainingCompletion";
import { validateCompletion } from "../../../backend/trainingCompletionContract";
import { buildLearningProfile } from "../profileBuilder";
import { adaptLegacyAutomaticAssessment } from "../legacyAssessmentEvidence";
import { buildSavedLearningProfileView } from "../savedLearningProfileView";
import EconomicsTopicPicker from "../economics9708/EconomicsTopicPicker";
import MethodIntroduction from "../sections/MethodIntroduction";
import { recordedEconomicsMetadata } from "../economics9708/recordedContext";
import { economicsAssignments } from "../economics9708/allocation";
import { getTrainingContentSet } from "../economics9708/adapter";
import type { EconomicsTemplate } from "../economics9708/adapter";

afterEach(() => { cleanup(); vi.useRealTimers(); });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const tick = (ms = 300) => act(() => vi.advanceTimersByTime(ms));
const situation = { goal: "remember-longer", difficulties: ["forgetting"], contentTypes: ["facts"], currentApproach: "rereading", sessionLength: "20-45", learningContext: "school" };
const baseline = { memory: { score: 1, correct: 4, total: 4, confidence: 3, timeSpentMs: 60000 }, understanding: { score: 1, correct: 3, total: 3, confidence: 3, timeSpentMs: 60000 } };

function completed(mode: "auto" | "manual", methods: TrainingMethodId[], topic = "1.3") {
  const d = createTrainingDraft({ owner: { kind: "user", uid: "economics-owner" }, mode, selectedMethods: methods, sessionId: `economics-${mode}-${methods.length}`, economicsTopicId: topic });
  d.labContentSetIds = economicsAssignments(methods, "lab", topic);
  d.completed.methodIntroduction = { methods, correct: methods.length, total: methods.length, score: 1 };
  d.completed.methodLab = { experiments: methods.map((method, i) => {
    const data = getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets[method], d.labContentSetIds[i]).data;
    const qs = data.test?.length ? data.test : data.questions ?? [];
    const graded = scoreMultipleChoice(qs, Object.fromEntries(qs.map(q => [q.id, q.correct])));
    return { method, category: getMethodDefinition(method).category, ...graded, confidence: 3, ease: 3, willingnessToUse: 3, timeSpentMs: 61000 };
  }) };
  d.verificationMethodOrder = selectMethodsForVerification(d.completed.methodLab.experiments);
  d.matchContentSetIds = economicsAssignments(d.verificationMethodOrder, "match", topic);
  d.completed.methodMatch = { methods: d.verificationMethodOrder.map(method => ({ method, firstScore: 1, verificationScore: .75, confidence: 4, timeSpentMs: 60000 })) };
  d.completed.reflection = { preferredMethod: null, priority: "performance", surprisedByResults: false, reflectionText: "Private Economics reflection" };
  if (mode === "auto") {
    d.completed.learningSituation = situation; d.completed.baseline = baseline;
    d.completed.learningProfile = buildLearningProfile({ baseline, methodIntroduction: d.completed.methodIntroduction,
      methodLab: d.completed.methodLab, methodMatch: d.completed.methodMatch, reflection: d.completed.reflection });
  }
  d.section = 6; d.phase = "final-save"; d.currentMethod = d.verificationMethodOrder[0]; d.currentMethodIndex = 0;
  return d;
}

describe("9708 curriculum and readiness", () => {
  it("has exactly the requested 22 topics and all 105 numbered subpoints", () => {
    expect(economicsTopics.map(t => t.id)).toEqual(["1.3","1.4","1.5","1.6","2.1","2.2","2.3","2.4","2.5","3.1","3.2","3.3","4.1","4.2","4.3","4.4","4.5","4.6","5.1","5.2","5.3","5.4"]);
    expect(economicsCoverageManifest.flatMap(t => t.coverage)).toHaveLength(105);
    expect(economicsCoverageManifest.filter(t => t.status === "playable").map(t => t.id)).toEqual(economicsTopics.slice(0, 9).map(t => t.id));
    expect(syllabusDetails["3.3"]?.join(" ")).toContain("inheritance/capital taxes");
    expect(syllabusDetails["4.3"]).toHaveLength(12);
    expect(syllabusDetails["5.2"]).toHaveLength(7);
  });
  it.each(economicsPacks)("validates complete stage content and individual coverage for $topicId", p => {
    expect(packProblems(p)).toEqual([]);
    expect(p.notes).toHaveLength(syllabusPointIds(p.topicId).length);
    expect(p.baselineMemory).toHaveLength(baselineMemoryContentSets[0].questions.length);
    expect(p.baselineUnderstanding).toHaveLength(baselineConceptContentSets[0].questions.length);
    const qs = [...p.baselineMemory, ...p.baselineUnderstanding, ...p.lab, ...p.verification];
    expect(qs).toHaveLength(48);
    for (const q of qs) {
      expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter(o => o === q.correct)).toHaveLength(1);
      expect(q.coverage.every(id => syllabusPointIds(p.topicId).includes(id))).toBe(true);
      const numeric = q.options.map(option => /^[+$−\-]?\d+(\.\d+)?$/.test(option) ? Number(option.replace("$", "").replace("−", "-")) : null);
      if (numeric.every(value => value !== null)) expect(new Set(numeric).size).toBe(4);
    }
    expect(new Set(qs.map(q => q.question)).size).toBe(qs.length);
    const early = new Set([...p.baselineMemory, ...p.baselineUnderstanding, ...p.lab].map(q => q.id));
    expect(p.verification.every(q => !early.has(q.id))).toBe(true);
  });
  it.each(economicsTopics.slice(9))("cannot start incomplete topic $id", topic => {
    expect(() => requireEconomicsPack(topic.id)).toThrow(/not ready/);
    expect(() => createTrainingDraft({ owner: { kind: "guest" }, mode: "auto", economicsTopicId: topic.id })).toThrow(/not ready/);
  });
  it("does not mark invalid packs ready after removing material, keys or a stage", () => {
    const p = economicsPacks[0];
    expect(packProblems({ ...p, notes: p.notes.slice(1) }).length).toBeGreaterThan(0);
    expect(packProblems({ ...p, verification: [] }).length).toBeGreaterThan(0);
    expect(packProblems({ ...p, lab: [{ ...p.lab[0], correct: "not offered" }, ...p.lab.slice(1)] }).length).toBeGreaterThan(0);
  });
  it("checks original numerical answer keys against the stated calculations", () => {
    const cases: [string, string, number][] = [
      ["1.5","lab-2",(50-44)/(12-10)],["1.5","lab-9",(30-24)/(13-10)],["1.5","verification-2",20/4],
      ["2.1","lab-1",12+18],["2.1","lab-9",14+22],["2.1","verification-1",10+15+25],
      ["2.2","understanding-1",-20/10],["2.2","understanding-2",10/5],["2.2","lab-1",12/8],["2.2","lab-9",3/10],
      ["2.2","verification-1",9/-6],["2.2","verification-3",-5/10],
      ["2.3","understanding-1",15/5],["2.3","lab-1",12/8],["2.3","lab-9",-15/-10],["2.3","verification-1",2/4],
      ["2.3","verification-5",((220-200)/200)/((12-10)/10)],
      ["2.5","understanding-1",18-12],["2.5","understanding-2",15-9],["2.5","lab-2",.5*(20-12)*40],
      ["2.5","lab-3",.5*(10-4)*30],["2.5","lab-6",14-10],["2.5","lab-9",16-11],
      ["2.5","verification-2",.5*(30-18)*50],["2.5","verification-3",.5*(14-6)*20],["2.5","verification-4",25-17]
    ];
    for (const [topic, suffix, expected] of cases) {
      const p=requireEconomicsPack(topic), q=[...p.baselineMemory,...p.baselineUnderstanding,...p.lab,...p.verification].find(q=>q.id===`ec9708-${topic}-${suffix}-v1`)!;
      expect(q.correct.replace("−","-").replace(/[$+]/g,"").match(/-?\d+(\.\d+)?/)?.[0],q.id).toBe(String(expected));
    }
  });
});

describe("same engines and counts, topic-specific material", () => {
  it.each(economicsPacks)("allocates disjoint items for the largest legal session at $topicId", p => {
    const labs:TrainingMethodId[]=["interleaving","leitner-system","memory-palace","active-recall"];
    const matches:TrainingMethodId[]=["interleaving","leitner-system"];
    for(const[phase,methods,expected]of [["lab",labs,26],["match",matches,15]] as const){
      const ids=economicsAssignments(methods,phase,p.topicId);
      const qs=ids.flatMap((id,i)=>{
        const sets=phase === "lab" ? trainingLabContentSets[methods[i]] : trainingMatchContentSets[methods[i]];
        const data=getTrainingContentSet<EconomicsTemplate>(sets,id).data;
        return [...data.questions??[],...data.practice??[],...data.test??[]];
      });
      expect(qs).toHaveLength(expected);expect(new Set(qs.map(q=>q.id)).size).toBe(expected);
      expect(new Set(qs.map(q=>q.question)).size).toBe(expected);
      for(const id of ids) expect(id).toContain(p.topicId.replace(".","_"));
    }
  });
  it.each(economicsPacks)("adapts all 23 methods without unrelated material or changed question counts: $topicId", p => {
    for (const m of TRAINING_METHOD_IDS) for (const phase of ["lab", "match"] as const) {
      const general = (phase === "lab" ? methodLabContentSets[m] : methodMatchContentSets[m])[0].data;
      const sets = phase === "lab" ? trainingLabContentSets[m] : trainingMatchContentSets[m];
      const data = sets.find(set => set.id === economicsContentId(p.topicId, `${phase}-${m}`))!.data;
      for (const key of ["questions", "practice", "test"] as const) {
        const original: Partial<Record<"questions" | "practice" | "test", readonly unknown[]>> = general;
        const updated: Partial<Record<"questions" | "practice" | "test", readonly unknown[]>> = data;
        const old = original[key] ?? [];
        const next = updated[key] ?? [];
        expect(next?.length ?? 0, `${m}:${phase}:${key}`).toBe(old?.length ?? 0);
      }
      const text = JSON.stringify(data);
      expect(text).not.toMatch(/honeybee|Europa|tectonic|coral reef|cell division|prokaryot|mitochondri|vaccine|mangrove/i);
      // Check the fields the existing study screens actually consume.
      const fields: Record<string, string[]> = { "active-recall":["facts"], feynman:["explanation"], cornell:["content"], interleaving:["instructions"],
        "memory-palace":["pairings"], "active-blurting":["facts"], "one-sentence":["explanation"], "note-taking-4x4":["content"],
        "leitner-system":["cards"], "story-telling":["orderedItems"], "capture-create":["content"], abbreviation:["items"], "header-first":["sections"],
        "prime-question":["material"], "doodle-effect":["material"], "eighty-twenty-rule":["details"], "divide-steps":["overview"], "derive-basics":["source"],
        "kidlin-rule":["context"], "premack-principle":["material"], "ten-minute-wall-stare":["material"], "strooper-effect":["material"], "two-x-video-speed":["reading"] };
      const record = data as Record<string, unknown>;
      const studied = JSON.stringify(fields[m].map(key => record[key]));
      for (const note of p.notes) expect(studied, `${m}:${phase}`).toContain(JSON.stringify(note).slice(1, -1));
    }
  });
  it("keeps default selection in the original general banks", () => {
    for (const m of TRAINING_METHOD_IDS) for (const random of [0, .5, .999]) {
      expect(methodLabContentSets[m].some(s => s.id === getMethodDefinition(m).selectLabContentSetId(() => random))).toBe(true);
      expect(methodMatchContentSets[m].some(s => s.id === getMethodDefinition(m).selectMatchContentSetId(() => random))).toBe(true);
    }
  });
  it("keeps three/four selection, top-two verification and non-trainable exclusions", () => {
    expect(selectMethods(situation, baseline)).toHaveLength(4);
    expect(selectMethods(situation, baseline, ["active-recall"])).toHaveLength(3);
    expect(TRAINING_METHOD_IDS).not.toContain("calm-start"); expect(TRAINING_METHOD_IDS).not.toContain("post-learning-rest");
    expect(selectMethodsForVerification(completed("auto", selectMethods(situation, baseline)).completed.methodLab!.experiments)).toHaveLength(2);
  });
  it.each(["easy", "medium", "hard"] as const)("shows four Economics answers, independent of the %s label", level => {
    const q = economicsPacks[0].lab[0], changed = vi.fn();
    render(<AdaptiveDifficultyProvider state={{ ...createAdaptiveDifficultyState(), level }} onChange={changed}>
      <AdaptiveDifficultyScope name="economics-label"><MultipleChoiceRunner question={q} selectedAnswer={undefined} onSelect={() => {}} onBack={() => {}} backDisabled onNext={() => {}} nextLabel="Next" random={() => .9} /></AdaptiveDifficultyScope>
    </AdaptiveDifficultyProvider>);
    expect(document.querySelectorAll(".option-grid button")).toHaveLength(4); expect(changed).not.toHaveBeenCalled();
  });
});

describe("draft and completion compatibility", () => {
  it.each([["auto",3],["auto",4],["manual",1],["manual",3]] as const)("freezes the same topic and scores through %s %s-method completion and codec resume", (mode, n) => {
    const d = completed(mode, [...TRAINING_METHOD_IDS.slice(0,n)]);
    expect(validateTrainingDraft(d)).toMatchObject({ valid:true });
    const restored = decodeFirestoreTrainingDraft(encodeFirestoreTrainingDraft(d));
    expect(restored).toEqual(d); expect(validateTrainingDraft(restored)).toMatchObject({valid:true});
    const at = "2026-11-03T09:00:00Z";
    const payload = completionFromDraft(d, at);
    expect(completionFromDraft(JSON.parse(JSON.stringify(d)), at)).toEqual(payload);
    const result = validateCompletion("economics-owner", payload, "2026-11-03T10:00:00Z");
    expect(result.request.methodLab).toEqual(d.completed.methodLab);
    expect(result.evidence.observations).toHaveLength(n + Math.min(2,n));
    for (const o of result.evidence.observations) {
      expect(o.context.subject).toBe("Economics 9708 AS"); expect(o.context.topic).toBe("1.3 Factors of production");
      expect(o.context.contentVersion).toBe("2026-v2-pilot-1"); expect(o.protocol.scoringVersion).toBeNull();
    }
    expect(result.evidence.selectionContext.nominatedMethodIds).toEqual([]);
    if(mode === "manual") expect(result.legacy).toBeNull();
  });
  it("rejects mixed topics, missing selection and unknown versions on resume", () => {
    const d = completed("auto", ["active-recall", "feynman", "cornell", "interleaving"]);
    const mixed = structuredClone(d); mixed.labContentSetIds[0] = economicsContentId("2.1", "lab-active-recall");
    expect(validateTrainingDraft(mixed).valid).toBe(false);
    const missing = structuredClone(d); delete missing.internalState.curriculum;
    expect(validateTrainingDraft(missing).valid).toBe(false);
    const version = JSON.parse(JSON.stringify(d)); version.internalState.curriculum.named.economics9708.version = "future";
    expect(validateTrainingDraft(version).valid).toBe(false);
  });
  it("rejects overlapping, noncanonical and oversized allocated forms", () => {
    const d=completed("auto",["interleaving","leitner-system","memory-palace","active-recall"]);
    expect(validateTrainingDraft(d)).toMatchObject({valid:true});
    const repeated=structuredClone(d);repeated.labContentSetIds[1]=economicsContentId("1.3","lab-leitner-system");
    expect(validateTrainingDraft(repeated).valid).toBe(false);
    const sets=trainingLabContentSets["active-recall"];
    for(const suffix of ["-q0","-q01","-q99999999999999999999","-q25"]){
      expect(()=>getTrainingContentSet(sets,economicsContentId("1.3","lab-active-recall")+suffix)).toThrow();
    }
    const payload=completionFromDraft(d);
    expect(payload.metadata?.filter(row=>["interleaving","leitner-system"].includes(row.methodId)).every(row=>row.protocol?.questions===null)).toBe(true);
    expect(validateCompletion("economics-owner",payload,"2026-11-03T10:00:00Z").evidence.observations.length).toBe(6);
  });
  it("uses a shared content identity across methods without inventing exposure order", () => {
    const a = economicsMetadata(economicsContentId("2.2", "lab-active-recall"))!;
    const b = economicsMetadata(economicsContentId("2.2", "lab-cornell"))!;
    expect(a.contentSetId).toBe(b.contentSetId); expect(a.exerciseTopic).not.toBe(b.exerciseTopic);
    expect(economicsMetadata(economicsContentId("2.3", "lab-cornell"))!.contentSetId).not.toBe(a.contentSetId);
  });
  it("does not guess historical topics from missing, conflicting or forged metadata", () => {
    const a={methodId:"active-recall",phase:"lab",context:economicsMetadata(economicsContentId("1.3","lab-active-recall"))};
    const b={methodId:"feynman",phase:"lab",context:economicsMetadata(economicsContentId("2.2","lab-feynman"))};
    expect(recordedEconomicsMetadata(undefined)).toEqual([]);
    expect(recordedEconomicsMetadata([a,b])).toEqual([]);
    expect(recordedEconomicsMetadata([a,a])).toEqual([]);
    expect(recordedEconomicsMetadata([{...a,context:{...a.context,topic:"Unrecorded topic"}}])).toEqual([]);
  });
  it("retains Economics context in legacy Test Me and individual-practice views without claiming V2 verification", () => {
    const auto = completed("auto", [...TRAINING_METHOD_IDS.slice(0,4)]);
    const automatic = adaptLegacyAutomaticAssessment({ ownerUid: "economics-owner", assessmentId: "saved-auto",
      assessment: { status:"completed", ...auto.completed, metadata: completionFromDraft(auto).metadata } });
    expect(automatic.valid).toBe(true); if (!automatic.valid) throw new Error(automatic.reason);
    expect(automatic.session.provenance.kind).toBe("legacy-assessment");
    expect(automatic.session.observations[0].context.subject).toBe("Economics 9708 AS");
    const manual = completed("manual", ["active-recall"]);
    const record = { schemaVersion:1 as const, kind:"legacy-manual" as const, sessionId: manual.sessionId, completedAt:null, payloadJSON:JSON.stringify(completionFromDraft(manual)) };
    const view = buildSavedLearningProfileView("economics-owner", auto.completed.learningProfile, { uid:"economics-owner", records:[record], assessments:[{id:"saved-auto", evidence:automatic.session, reflection:null}], loading:false,error:null,hasMore:false });
    expect(view.counts).toMatchObject({ individualSessions:1, testMeRecords:1 });
    expect(view.methods.find(m=>m.methodId === "active-recall")!.individual[0].topic).toBe("1.3 Factors of production");
    expect(view.progress.excludedIndividualObservations).toBe(2);
    expect(buildSavedLearningProfileView("other-owner", null, { uid:"economics-owner",records:[record],loading:false,error:null,hasMore:false }).history).toHaveLength(0);
  });
});

describe("actual student screens", () => {
  it("keeps an allocated Feynman form's real 60-second deadline through rerenders", () => {
    vi.useFakeTimers(); const id=economicsContentId("2.2","lab-feynman")+"-q10";
    const element=()=>getMethodDefinition("feynman").renderLab(id,()=>{});
    const page=render(element());click("Start experiment");expect(screen.getByRole("timer").textContent).toContain("01:00");
    tick(10000);page.rerender(element());expect(screen.getByRole("timer").textContent).toContain("00:50");
    tick(49999);expect(screen.queryByPlaceholderText("Explain the concept...")).toBeNull();
    tick(1);expect(screen.queryByRole("timer")).toBeNull();expect(screen.getByPlaceholderText("Explain the concept...")).toBeTruthy();
  });
  it.each(TRAINING_METHOD_IDS)("checkpoints the real %s Economics Lab and Match engine through the existing draft codec", async method => {
    for (const phase of ["lab", "match"] as const) {
      const d=completed("manual",[method]);d.phase=phase;d.section=phase === "lab" ? 4 : 5;
      d.completed.reflection=null;d.completed.methodMatch=null;
      if(phase === "lab") {d.completed.methodLab=null;d.verificationMethodOrder=[];d.matchContentSetIds=[];}
      let internal=d.internalState;
      const definition=getMethodDefinition(method), node=phase === "lab" ? definition.renderLab(d.labContentSetIds[0],()=>{}) : definition.renderMatch(d.matchContentSetIds[0],1,()=>{});
      const page=render(<TrainingProgressStateProvider state={internal} onChange={next=>{internal=next;}}>{node}</TrainingProgressStateProvider>);
      await waitFor(()=>expect(Object.keys(internal).length).toBeGreaterThan(1));
      d.internalState=structuredClone(internal);
      expect(validateTrainingDraft(d),method+phase).toMatchObject({valid:true});
      const restored=decodeFirestoreTrainingDraft(encodeFirestoreTrainingDraft(d));expect(restored).toEqual(d);
      expect(validateTrainingDraft(restored)).toMatchObject({valid:true});page.unmount();
      if(method === "active-recall" && phase === "lab") {
        const invalid=structuredClone(d);invalid.internalState[`lab:${method}:${d.labContentSetIds[0]}`].slots[8]=61;
        expect(validateTrainingDraft(invalid).valid).toBe(false);
      }
    }
  });
  it("uses Economics examples in the real method introduction", () => {
    render(<MethodIntroduction methods={["active-recall"]} mode="manual" economicsTopicId="2.2" onComplete={()=>{}}/>);
    expect(screen.getByText(/Study 2.2 Price elasticity/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/photosynthesis|biology|coral reefs|vaccines/);
  });
  it("offers only ready topics and leaves incomplete options disabled", () => {
    function Picker() { const [value,set] = useState(""); return <EconomicsTopicPicker value={value} onChange={set}/>; }
    render(<Picker/>); fireEvent.change(screen.getByRole("combobox", {name:"Training subject"}), {target:{value:"9708"}});
    expect(screen.getByLabelText("Economics topic").querySelectorAll("option")).toHaveLength(22);
    expect(screen.getByLabelText("Economics topic").querySelectorAll("option:disabled")).toHaveLength(13);
  });
  it("runs the four-plus-three Economics Baseline with independent 60-second study entries", () => {
    vi.useFakeTimers(); const pack=economicsPacks[0], done=vi.fn();
    const d=createTrainingDraft({owner:{kind:"guest"},mode:"auto",economicsTopicId:pack.topicId});
    render(<BaselineChallenge contentIds={d.baselineContentSetIds} onComplete={done}/>);
    click("Start challenge"); expect(screen.getByRole("timer").textContent).toBe("60s"); tick(5000); click("I'm ready");
    pack.baselineMemory.forEach(q=>{click(q.correct);tick();}); click("3");tick();
    expect(screen.getByRole("timer").textContent).toBe("60s"); click("I'm ready");
    pack.baselineUnderstanding.forEach(q=>{click(q.correct);tick();}); click("4");tick();
    expect(done).toHaveBeenCalledOnce(); expect(done.mock.calls[0][0]).toMatchObject({memory:{correct:4,total:4,score:1},understanding:{correct:3,total:3,score:1}});
  });
  it("keeps topic content, current answers and shuffled choices after a real Baseline checkpoint/refresh", () => {
    vi.useFakeTimers(); const p=economicsPacks[2];
    const d=createTrainingDraft({owner:{kind:"guest"},mode:"auto",economicsTopicId:p.topicId});
    d.section=2;d.phase="baseline";d.completed.learningSituation=situation;
    let saved=d.internalState;
    function Saved({initial}:{initial:TrainingInternalState}) {const[state,set]=useState(initial);return <TrainingProgressStateProvider state={state} onChange={next=>{saved=next;set(next);}}><TrainingStateScope name="baseline"><BaselineChallenge contentIds={d.baselineContentSetIds} onComplete={()=>{}} random={()=>.99}/></TrainingStateScope></TrainingProgressStateProvider>;}
    const page=render(<Saved initial={saved}/>);click("Start challenge");tick(1200);click("I'm ready");click(p.baselineMemory[0].correct);
    d.internalState=structuredClone(saved);expect(validateTrainingDraft(d)).toMatchObject({valid:true});
    const restored=validateTrainingDraft(decodeFirestoreTrainingDraft(encodeFirestoreTrainingDraft(d)));page.unmount();
    if (!restored.valid) throw new Error(restored.reason);
    render(<Saved initial={restored.draft.internalState}/>);
    expect(readEconomicsSelection(saved)?.topicId).toBe("1.5");
    expect(screen.getByRole("heading",{name:p.baselineMemory[0].question})).toBeTruthy();
    expect(screen.getByRole("button",{name:p.baselineMemory[0].correct}).className).toContain("selected");
    expect(document.querySelectorAll(".option-grid button")).toHaveLength(4);
  });
  it("provides a real labelled figure for diagram questions", () => {
    const q=economicsPacks[2].lab[0];render(<MultipleChoiceRunner question={q} selectedAnswer={undefined} onSelect={()=>{}} onBack={()=>{}} backDisabled onNext={()=>{}} nextLabel="Next"/>);
    expect(screen.getByRole("img",{name:q.diagram!.label})).toBeTruthy();expect(screen.getByText(/Schematic, not to scale/)).toBeTruthy();
  });
});
