// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../firebase", () => ({ auth: { currentUser: null, app: { options: { projectId: "demo-economics-runtime" } } }, db: {} }));
import { METHOD_POOL } from "../../../methodPool.js";
import { getMethodDefinition } from "../methodRegistry";
import { selectMethods, rankMethodsForSelection } from "../methodSelector";
import { selectMethodsForVerification } from "../methodMatchSelector";
import { createTrainingDraft, validateTrainingDraft } from "../trainingProgress";
import type { TrainingDraft } from "../trainingProgress";
import { TrainingProgressStateProvider } from "../trainingProgressState";
import { trainingLabContentSets } from "../trainingContent";
import { getTrainingContentSet } from "../economics9708/adapter";
import type { EconomicsTemplate } from "../economics9708/adapter";
import { economicsAssignments } from "../economics9708/allocation";
import { economicsMethodInventory, supportedEconomicsMethods } from "../economics9708/runtime";
import { readEconomicsActivityVersion } from "../economics9708/selection";
import { assertMaterialPresentations, collectMaterialPresentations } from "../economics9708/presentationRecords";
import { economicsPacks } from "../economics9708/packs";
import { completionFromDraft } from "../../services/trainingCompletion";
import { validateCompletion } from "../../../backend/trainingCompletionContract";
import type { TrainingMethodId } from "../type";
import { scoreMultipleChoice } from "../engines/shared/scoring";
import { encodeFirestoreTrainingDraft, decodeFirestoreTrainingDraft } from "../../services/trainingDraftFirestoreCodec";
import { renderedMaterialText } from "../economics9708/MappedActivity";
import { buildLearningProfile } from "../profileBuilder";
import { recordedEconomicsMetadata } from "../economics9708/recordedContext";
import { collectEconomicsResponses } from "../economics9708/collectAssessmentResponses";
import { trainingAnswerBindings } from "../trainingDraftValidation";
import { resolveEconomicsAssessment } from "../economics9708/assessmentEvidence";

afterEach(cleanup);
const situation = { goal:"remember-longer", difficulties:["forgetting"], contentTypes:["facts"], currentApproach:"rereading", sessionLength:"20-45", learningContext:"school" };
const baseline = { memory:{score:1,correct:4,total:4,confidence:3,timeSpentMs:60000}, understanding:{score:1,correct:3,total:3,confidence:3,timeSpentMs:60000} };
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function draftFor(method: TrainingMethodId, topic = "1.5", mapped = true): TrainingDraft {
  const d = createTrainingDraft({ owner:{kind:"user",uid:"synthetic-student-a"}, mode:"manual", sessionId:"economics-runtime-0001", selectedMethods:[method], economicsTopicId:topic,
    ...(mapped ? { economicsActivityVersion:"mapped-1" as const } : {}) });
  d.labContentSetIds = economicsAssignments([method], "lab", topic, mapped ? "mapped-1" : undefined);
  d.section=4; d.phase="lab";
  d.completed.methodIntroduction={methods:[method],correct:1,total:1,score:1};
  return d;
}
function Harness({ initial, capture, done = () => {} }: { initial: TrainingDraft; capture: (d: TrainingDraft) => void; done?: () => void }) {
  const [draft,setDraft] = useState(initial); capture(draft);
  return <TrainingProgressStateProvider state={draft.internalState} onChange={state=>setDraft(d=>({...d, internalState:state}))}>
    {getMethodDefinition(initial.selectedMethods[0]).renderLab(initial.labContentSetIds[0], done)}
  </TrainingProgressStateProvider>;
}

describe("new Economics compatibility activation", () => {
  it("resolves all 37 canonical entries, with explicit training-only methods and no invented Practice Testing entry", () => {
    expect(economicsMethodInventory.map(m=>m.name)).toEqual(METHOD_POOL.map(m=>m.name));
    expect(economicsMethodInventory).toHaveLength(37);
    expect(economicsMethodInventory.filter(m=>m.status==="supported")).toHaveLength(15);
    expect(economicsMethodInventory.filter(m=>m.status==="unsupported")).toHaveLength(5);
    expect(economicsMethodInventory.filter(m=>m.status==="non-trainable")).toHaveLength(14);
    expect(economicsMethodInventory.filter(m=>m.status==="out-of-scope")).toHaveLength(3);
    expect(supportedEconomicsMethods()).toHaveLength(18);
    expect(economicsMethodInventory.find(m=>m.name==="Calm Start")?.status).toBe("non-trainable");
    expect(economicsMethodInventory.find(m=>m.name==="Post-Learning Rest")?.status).toBe("out-of-scope");
    expect(economicsMethodInventory.some(m=>m.name==="Practice Testing")).toBe(false);
  });
  it("keeps ranking weights and 3/4 counts while excluding unsupported candidates only for new Economics activities", () => {
    const allowed = supportedEconomicsMethods();
    for (const advice of [[],["active-recall"]] as const) {
      const selected=selectMethods(situation,baseline,advice,allowed);
      expect(selected).toHaveLength(advice.length ? 3 : 4);
      expect(selected).toEqual(rankMethodsForSelection(situation,baseline,advice).filter(row=>allowed.includes(row.method)).slice(0,selected.length).map(row=>row.method));
    }
    expect(selectMethods(situation,baseline,["doodle-effect"],allowed)).toHaveLength(4);
    expect(selectMethods(situation,baseline,["doodle-effect"])).toHaveLength(3);
  });
  it.each(economicsPacks)("builds actual compatible engine data without changing question scores for $topicId", p => {
    const methods=supportedEconomicsMethods();
    for(const method of methods) {
      const id=economicsAssignments([method],"lab",p.topicId,"mapped-1")[0];
      const oldId=economicsAssignments([method],"lab",p.topicId)[0];
      const data=getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets[method],id).data;
      const old=getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets[method],oldId).data;
      expect(data.runtime?.version).toBe("mapped-1");
      expect(data.questions).toEqual(old.questions); expect(data.practice).toEqual(old.practice); expect(data.test).toEqual(old.test);
      const qs=data.test?.length ? data.test : data.questions ?? [];
      expect(scoreMultipleChoice(qs,Object.fromEntries(qs.map(q=>[q.id,q.correct]))).score).toBe(1);
    }
  });
  it("rejects new unsupported IDs while preserving old saved activities and draft decisions", () => {
    for(const method of ["interleaving","derive-basics","doodle-effect","eighty-twenty-rule","two-x-video-speed"] as const) {
      const old=draftFor(method,"1.5",false);
      expect(readEconomicsActivityVersion(old.internalState)).toBeUndefined();
      expect(validateTrainingDraft(old)).toMatchObject({valid:true});
      expect(getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets[method],old.labContentSetIds[0]).data.runtime).toBeUndefined();
      expect(()=>draftFor(method)).toThrow(/not supported/);
      expect(()=>getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets[method],old.labContentSetIds[0]+"-mapped1")).toThrow(/Unsupported/);
    }
  });
});

describe.each(["1.5","2.2"])("actual %s activities and presentation capture", topic => {
  it("runs Memory Palace through route, spatial encoding, hidden recall and objective test", async () => {
    let current=draftFor("memory-palace",topic);
    render(<Harness initial={current} capture={d=>{current=d}}/>);
    expect(collectMaterialPresentations(current)).toBeUndefined();
    click("Start experiment");
    await waitFor(()=>expect(collectMaterialPresentations(current)?.records.length).toBeGreaterThan(0));
    click("Continue");
    const pairs=[...document.querySelectorAll(".memory-pair")];
    expect(pairs.length).toBeGreaterThan(0); expect(pairs.length).toBeLessThanOrEqual(8);
    expect(pairs.map(p=>p.textContent).join(" ")).toMatch(topic==="1.5" ? /PPC|opportunity cost/i : /elasticity|responsiveness/i);
    expect(pairs[0].querySelector(":scope > div > strong")?.textContent).toBe(topic==="1.5" ? "Feasible-output boundary" : "PED, YED, XED");
    await waitFor(()=>expect(collectMaterialPresentations(current)?.records.some(r=>r.materialId.endsWith(":cue")&&r.materialVersion==="mapped-1")).toBe(true));
    click("I've pictured them");
    expect(document.querySelector(".memory-pair")).toBeNull();
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Recall the economic ideas using my route."}});
    click("Continue to test");
    expect(document.querySelectorAll(".option-grid button")).toHaveLength(4);
    expect(screen.queryByRole("button",{name:"Check source"})).toBeNull();
    expect(validateTrainingDraft(current)).toMatchObject({valid:true});
  });
  it("runs Feynman learning, own explanation, optional source check and simplification", async () => {
    let current=draftFor("feynman",topic);
    render(<Harness initial={current} capture={d=>{current=d}}/>);
    click("Start experiment");
    expect(screen.getByRole("timer").textContent).toContain("01:00");
    await waitFor(()=>expect(collectMaterialPresentations(current)?.records.length).toBeGreaterThan(0));
    const before=collectMaterialPresentations(current)!;
    click("I'm ready");
    expect(screen.getByRole("textbox").getAttribute("placeholder")).toBe("Explain the concept...");
    click("Check source");
    expect(screen.getByText("Check your explanation against the source")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Explain the economic relationship accurately in my own words."}});
    click("Continue");
    expect(screen.getByRole("textbox").getAttribute("placeholder")).toBe("Explain it simply...");
    expect(screen.queryByText("Check your explanation against the source")).toBeNull();
    expect(collectMaterialPresentations(current)).toEqual(before);
    expect(validateTrainingDraft(current)).toMatchObject({valid:true});
  });
  it("uses Active Recall for practice testing and closes source during retrieval and testing", async () => {
    let current=draftFor("active-recall",topic);
    render(<Harness initial={current} capture={d=>{current=d}}/>);
    click("Start experiment");
    await waitFor(()=>expect(collectMaterialPresentations(current)?.records.length).toBeGreaterThan(0));
    click("I'm ready");
    expect(screen.queryByRole("button",{name:"Check source"})).toBeNull();
    expect(document.querySelector(".study-content")).toBeNull();
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Recall the key economic definitions and relationships."}});
    click("Continue");
    expect(document.querySelectorAll(".option-grid button")).toHaveLength(4);
    expect(screen.queryByRole("button",{name:"Check source"})).toBeNull();
    expect(validateTrainingDraft(current)).toMatchObject({valid:true});
    expect(collectEconomicsResponses(current)?.activities[0].responses).toEqual([]);
    const data=getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets["active-recall"],current.labContentSetIds[0]).data;
    const question=data.questions![0];
    fireEvent.click(screen.getByRole("button",{name:question.options[0]}));
    expect(collectEconomicsResponses(current)?.activities[0].responses).toMatchObject([{questionId:question.id,answerOptionId:`${question.id}:option-0`,role:"scored"}]);
  });
});

describe("presentation persistence and evidence separation", () => {
  it.each(["1.5", "2.2"])("captures each supported %s Lab and Match answer from its existing saved slot after refresh", topic => {
    for (const method of supportedEconomicsMethods()) {
      const draft = draftFor(method, topic);
      draft.verificationMethodOrder = [method]; draft.matchContentSetIds = economicsAssignments([method], "match", topic, "mapped-1");
      draft.completed.methodMatch = { methods: [{ method, firstScore: 1, verificationScore: 1, confidence: 3, timeSpentMs: 60000 }] };
      for (const phase of ["lab", "match"] as const) {
        const id = (phase === "lab" ? draft.labContentSetIds : draft.matchContentSetIds)[0], form = resolveEconomicsAssessment(id);
        const slots: unknown[] = [];
        for (const binding of trainingAnswerBindings(method, phase)) {
          const questions = binding.role === "scored" ? form.scored : form.practice;
          slots[binding.answerSlot] = Object.fromEntries(questions.map(q => [q.id, q.correct]));
        }
        draft.internalState[`${phase}:${method}:${id}`] = { slots, named: {} };
      }
      const captured = collectEconomicsResponses(draft)!;
      expect(captured.activities).toHaveLength(2);
      captured.activities.forEach(a => {
        const form = resolveEconomicsAssessment(a.contentSetId);
        expect(a.responses.filter(q => q.role === "scored").map(q => q.questionId)).toEqual(form.scored.map(q => q.id));
        expect(a.responses.every(q => q.answerOptionId === `${q.questionId}:option-0` && q.offeredOptionIds === null)).toBe(true);
      });
      const refreshed = JSON.parse(JSON.stringify(draft)) as TrainingDraft;
      expect(collectEconomicsResponses(refreshed)).toEqual(captured);
      const other = draftFor(method, topic); other.owner = { kind: "user", uid: "synthetic-student-b" };
      expect(collectEconomicsResponses(other)!.activities.every(a => a.responses.length === 0)).toBe(true);
    }
  });
  it.each([["auto",3],["auto",4],["manual",1],["manual",3]] as const)("retains %s/%i completion, scores and frozen mapped forms without inventing presentations", (mode,count) => {
    const allMethods:TrainingMethodId[]=["active-recall","feynman","cornell","memory-palace"];
    const methods=allMethods.slice(0,count);
    const d=createTrainingDraft({owner:{kind:"user",uid:"synthetic-student-a"},mode,selectedMethods:methods,sessionId:`mapped-${mode}-${count}`,economicsTopicId:"2.2",economicsActivityVersion:"mapped-1"});
    d.createdAt="2026-11-04T08:00:00.000Z";
    d.labContentSetIds=economicsAssignments(methods,"lab","2.2","mapped-1");
    d.completed.methodIntroduction={methods,correct:count,total:count,score:1};
    d.completed.methodLab={experiments:methods.map((method,i)=>{
      const data=getTrainingContentSet<EconomicsTemplate>(trainingLabContentSets[method],d.labContentSetIds[i]).data;
      const qs=data.test?.length?data.test:data.questions??[];
      return {method,category:getMethodDefinition(method).category,...scoreMultipleChoice(qs,Object.fromEntries(qs.map(q=>[q.id,q.correct]))),confidence:3,ease:3,willingnessToUse:3,timeSpentMs:60000};
    })};
    d.verificationMethodOrder=selectMethodsForVerification(d.completed.methodLab.experiments);
    d.matchContentSetIds=economicsAssignments(d.verificationMethodOrder,"match","2.2","mapped-1");
    d.completed.methodMatch={methods:d.verificationMethodOrder.map(method=>({method,firstScore:1,verificationScore:.75,confidence:3,timeSpentMs:60000}))};
    d.completed.reflection={preferredMethod:null,priority:"performance",surprisedByResults:false,reflectionText:"Synthetic completion"};
    if(mode==="auto"){
      d.completed.learningSituation=situation;d.completed.baseline=baseline;
      d.completed.learningProfile=buildLearningProfile({baseline,methodIntroduction:d.completed.methodIntroduction,methodLab:d.completed.methodLab,methodMatch:d.completed.methodMatch,reflection:d.completed.reflection});
    }
    d.section=6;d.phase="final-save";d.currentMethod=d.verificationMethodOrder[0];d.currentMethodIndex=0;
    expect(validateTrainingDraft(d)).toMatchObject({valid:true});
    const decoded=validateTrainingDraft(decodeFirestoreTrainingDraft(JSON.parse(JSON.stringify(encodeFirestoreTrainingDraft(d)))));
    expect(decoded).toMatchObject({valid:true});if(!decoded.valid)throw new Error(decoded.reason);
    const payload=completionFromDraft(decoded.draft,"2026-11-04T09:00:00.000Z");
    expect(recordedEconomicsMetadata(payload.metadata)).toHaveLength(count+Math.min(2,count));
    expect(payload.materialPresentations).toBeUndefined();
    const result=validateCompletion("synthetic-student-a",payload,"2026-11-04T10:00:00.000Z");
    expect(result.evidence.observations.filter(o=>o.phase==="lab").map(o=>o.performance.score)).toEqual(methods.map(()=>1));
    expect(result.requestHash).toBe(validateCompletion("synthetic-student-a",completionFromDraft(d,"2026-11-04T09:00:00.000Z"),"2026-11-04T10:00:00.000Z").requestHash);
  });
  it("does not treat hidden text, closed disclosures or hidden ancestors as rendered material", () => {
    const root=document.createElement("div");document.body.appendChild(root);
    root.innerHTML='<p>visible note</p><p hidden>hidden note</p><span aria-hidden="true">aria note</span><details><summary>summary</summary><p>closed note</p></details><div style="display:none">CSS note</div>';
    expect(renderedMaterialText(root)).toBe("visible note summary");
    root.hidden=true;expect(renderedMaterialText(root)).toBe("");root.remove();
  });
  it("preserves first presentation timestamps through checkpoint, codec refresh and owner switching", async () => {
    let current=draftFor("feynman");
    const first=render(<Harness initial={current} capture={d=>{current=d}}/>);
    click("Start experiment");
    await waitFor(()=>expect(collectMaterialPresentations(current)?.records.length).toBeGreaterThan(0));
    const recorded=collectMaterialPresentations(current);
    const encoded=encodeFirestoreTrainingDraft(current);
    const decoded=validateTrainingDraft(decodeFirestoreTrainingDraft(JSON.parse(JSON.stringify(encoded))));
    expect(decoded).toMatchObject({valid:true}); if(!decoded.valid) throw new Error(decoded.reason);
    first.unmount();
    const second=render(<Harness initial={decoded.draft} capture={d=>{current=d}}/>);
    await act(async()=>{await Promise.resolve()});
    expect(collectMaterialPresentations(current)).toEqual(recorded);
    second.unmount();
    const b=draftFor("feynman");b.owner={kind:"user",uid:"synthetic-student-b"};
    render(<Harness initial={b} capture={d=>{current=d}}/>);
    expect(collectMaterialPresentations(current)).toBeUndefined();
  });
  it("binds bounded telemetry to the frozen request and retains objective performance unchanged", async () => {
    let current=draftFor("active-recall");
    render(<Harness initial={current} capture={d=>{current=d}}/>);click("Start experiment");
    await waitFor(()=>expect(collectMaterialPresentations(current)?.records.length).toBeGreaterThan(0));
    const method="active-recall" as const;
    current.completed.methodLab={experiments:[{method,category:"memory",score:1,correct:4,total:4,confidence:3,ease:3,willingnessToUse:3,timeSpentMs:60000}]};
    current.verificationMethodOrder=selectMethodsForVerification(current.completed.methodLab.experiments);
    current.matchContentSetIds=economicsAssignments(current.verificationMethodOrder,"match","1.5","mapped-1");
    current.completed.methodMatch={methods:[{method,firstScore:1,verificationScore:.75,confidence:3,timeSpentMs:60000}]};
    current.completed.reflection={preferredMethod:null,priority:"performance",surprisedByResults:false,reflectionText:"Synthetic reflection"};
    const now=new Date(Date.now()+1000).toISOString(), input=completionFromDraft(current,now);
    const recordedAt=new Date(Date.now()+2000).toISOString();
    const validated=validateCompletion("synthetic-student-a",input,recordedAt);
    expect(validated.request.materialPresentations).toEqual(collectMaterialPresentations(current));
    const without=structuredClone(input);delete without.materialPresentations;
    expect(validated.evidence).toEqual(validateCompletion("synthetic-student-a",without,recordedAt).evidence);
    expect(validateCompletion("synthetic-student-a",input,recordedAt).requestHash).toBe(validated.requestHash);
    const changed=structuredClone(input);changed.materialPresentations!.records[0].presentedAt=new Date(Date.now()+500).toISOString();
    expect(validateCompletion("synthetic-student-a",changed,recordedAt).requestHash).not.toBe(validated.requestHash);
    const cross=structuredClone(input);cross.materialPresentations!.records[0].contentSetId=cross.materialPresentations!.records[0].contentSetId.replace("1_5","2_2");
    expect(()=>validateCompletion("synthetic-student-a",cross,recordedAt)).toThrow();
    const duplicate=structuredClone(input.materialPresentations!);duplicate.records.push(duplicate.records[0]);
    expect(()=>assertMaterialPresentations(duplicate)).toThrow(/Duplicate/);
    const tooMany={...duplicate,records:Array.from({length:97},()=>duplicate.records[0])};expect(()=>assertMaterialPresentations(tooMany)).toThrow();
  });
});
