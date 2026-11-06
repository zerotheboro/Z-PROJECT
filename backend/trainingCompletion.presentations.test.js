import { describe, expect, it } from "vitest";
import { completionFixture } from "./completionFixtures.mjs";
import { createTrainingCompletionService, validateCompletion } from "../dist-backend/backend/trainingCompletion.js";
import { economicsEvidenceFixture } from "../test-support/economicsEvidenceFixtures";
import { aggregateCompletedEvidence } from "../src/quiz/cumulativeProfile";
import { buildEconomicsObjectiveHistory } from "../src/quiz/economics9708/objectiveHistory";
import { digest } from "./trainingCompletionContract";
import { initialAdmission, initialControl } from "./scalability/acceptanceState";
import { initialAcceptanceCheckpoint, createAcceptanceBatch, checkpointForBatch } from "./scalability/acceptanceBatches";
import { createJournalEntry } from "./scalability/journal";
import { inventorySourceReference } from "./scalability/inventory";
import { shadowPin } from "./scalability/shadowContracts";
import { parseReplayPacket, rebuildShadow } from "./scalability/shadowReplay";

// Offline transactional test double. This is not a Firebase Emulator or an IAM test.
function database() {
  let rows=new Map();
  const snapshot=path=>({id:path.split("/").at(-1),exists:rows.has(path),data:()=>structuredClone(rows.get(path))});
  const collection=path=>({path,doc:id=>ref(`${path}/${id}`),limit:n=>({path,maximum:n, get:()=>query(path,n)}),get:()=>query(path)});
  const query=async(path,maximum=Infinity)=>({docs:[...rows.keys()].filter(k=>k.startsWith(`${path}/`)&&!k.slice(path.length+1).includes("/")).sort().slice(0,maximum).map(snapshot)});
  const ref=path=>({path,id:path.split("/").at(-1),collection:name=>collection(`${path}/${name}`),get:async()=>snapshot(path)});
  return { collection, rows:()=>structuredClone([...rows]), seed:(path,value)=>rows.set(path,structuredClone(value)),
    runTransaction:async callback=>{
      const writes=[];
      const transaction={get:target=>target.maximum!==undefined||target.doc ? query(target.path,target.maximum) : target.get(),
        create:(target,data)=>{writes.push({target,data,create:true});return transaction},
        set:(target,data,options)=>{writes.push({target,data,merge:options?.merge});return transaction}};
      const result=await callback(transaction);
      const next=new Map(rows);
      for(const {target,data,create,merge} of writes){if(create&&next.has(target.path))throw new Error("already exists");next.set(target.path,structuredClone(merge?{...next.get(target.path),...data}:data))}
      rows=next;return result;
    }
  };
}
function input(mode) {
  const request=completionFixture({mode,count:mode==="manual"?1:3});
  const contentSetId="ec9708-1_5-2026-v2-pilot-1-lab-active-recall-mapped1";
  request.metadata[0].context={subject:"Economics 9708 AS",topic:"1.5 Production possibility curves",exerciseTopic:contentSetId,contentSetId:"ec9708-1_5-2026-v2-pilot-1-lab-pool",contentVersion:"2026-v2-pilot-1"};
  request.materialPresentations={schemaVersion:1,kind:"client-rendered",records:[{materialId:"ec9708-objective-1.5.1:note",materialVersion:"2026-v2-pilot-1",mappingVersion:"ec9708-objectives-1",contentSetId,methodId:"active-recall",phase:"lab",objectiveIds:["ec9708-objective-1.5.1"],presentedAt:"2026-10-19T09:00:00.000Z"}]};
  return request;
}
describe("bounded client-rendered material retention",()=>{
  it.each(["auto","manual"])("retains %s material records atomically and returns the original retry receipt",async mode=>{
    const db=database(),uid="synthetic-presentation-student",request=input(mode),prefix=`users/${uid}`;
    db.seed(prefix,{name:"Synthetic student"});
    db.seed(`${prefix}/trainingReservations/${request.sessionId}`,{sessionId:request.sessionId,mode,methodIds:mode==="auto"?[]:request.selectedMethods});
    const service=createTrainingCompletionService({getFirestore:()=>db,now:()=>Date.parse("2026-10-20T10:00:00Z")});
    const receipt=await service.complete(uid,request);
    const after=db.rows();
    const native=after.find(([path])=>path===`${prefix}/learningEvidence/${receipt.evidenceId}`)[1];
    expect(native.materialPresentations).toEqual(request.materialPresentations);
    expect(native.evidence.observations.every(row=>!("materialPresentations" in row))).toBe(true);
    if(mode==="auto")expect(after.find(([path])=>path===`${prefix}/assessments/${request.sessionId}`)[1].materialPresentations).toEqual(request.materialPresentations);
    expect(await service.complete(uid,structuredClone(request))).toEqual(receipt);
    expect(db.rows()).toEqual(after);
    const conflict=structuredClone(request);conflict.materialPresentations.records[0].presentedAt="2026-10-19T08:00:00.000Z";
    await expect(service.complete(uid,conflict)).rejects.toMatchObject({code:"completion_conflict"});
    expect(db.rows()).toEqual(after);
    expect(after.filter(([path])=>path.includes("trainingReservations/"))).toHaveLength(1);
    expect(after.filter(([path])=>path.includes("trainingUsage/"))).toHaveLength(0);
  });
  it("rejects telemetry ownership/assignment/timestamp/size corruption before persistence",()=>{
    const value=input("manual"),now="2026-10-20T10:00:00Z";
    for(const mutate of [r=>{r.records[0].owner="forged"},r=>{r.records[0].presentedAt="2027-01-01T00:00:00.000Z"},r=>{r.records[0].methodId="feynman"},r=>{r.records=Array(97).fill(r.records[0])}]){
      const copy=structuredClone(value);mutate(copy.materialPresentations);expect(()=>validateCompletion("synthetic-presentation-student",copy,now)).toThrow();
    }
  });
});

describe("canonical Economics answer retention through the completion transaction",()=>{
  it.each(["auto","manual"])("persists %s objective details separately from unchanged performance and preserves original retries",async mode=>{
    const uid="synthetic-objective-persistence",prefix=`users/${uid}`,db=database();
    const request=economicsEvidenceFixture({mode,methods:mode==="auto"?["memory-palace","feynman","active-recall"]:["memory-palace","feynman"]});
    const previousProfile={legacy:"Existing automatic profile"};
    db.seed(prefix,{name:"Synthetic student",learningProfile:previousProfile});
    db.seed(`${prefix}/trainingReservations/${request.sessionId}`,{sessionId:request.sessionId,mode,methodIds:mode==="auto"?[]:request.selectedMethods});
    const service=createTrainingCompletionService({getFirestore:()=>db,now:()=>Date.parse("2026-11-05T10:00:00Z")});
    const receipt=await service.complete(uid,request),after=db.rows(),values=new Map(after);
    const row=values.get(`${prefix}/learningEvidence/${receipt.evidenceId}`);
    expect(row.objectiveEvidence).toEqual(validateCompletion(uid,request,"2026-11-05T10:00:00Z").objectiveEvidence);
    expect(row.evidence.completedAt).toBe(request.completedAt);
    expect(row.evidence.observations.every(o=>!("objectiveEvidence" in o))).toBe(true);
    expect(values.get(`${prefix}/learningProfiles/cumulative`).profile).toEqual(aggregateCompletedEvidence({kind:"user",uid},[row.evidence]));
    if(mode==="auto")expect(values.get(`${prefix}/assessments/${request.sessionId}`).economicsResponses).toEqual(request.economicsResponses);
    else {
      expect(values.get(prefix).learningProfile).toEqual(previousProfile);
      expect(after.some(([path])=>path.includes("/assessments/"))).toBe(false);
    }
    const view=buildEconomicsObjectiveHistory(uid,[{id:receipt.evidenceId,data:row}]);
    expect(view.sessions).toBe(1);
    expect(view.activities.find(a=>a.methodId==="feynman"&&a.stage==="method-lab").priorMethodsInSession).toEqual(["memory-palace"]);
    expect(await service.complete(uid,structuredClone(request))).toEqual(receipt);
    expect(db.rows()).toEqual(after);
    const conflict=structuredClone(request);conflict.economicsResponses.sessionStartedAt="2026-11-02T09:00:00.000Z";
    await expect(service.complete(uid,conflict)).rejects.toMatchObject({code:"completion_conflict"});
    expect(db.rows()).toEqual(after);
    expect(after.filter(([path])=>path.includes("/trainingUsage/"))).toHaveLength(0);
    expect(after.filter(([path])=>path.includes("/trainingReservations/"))).toHaveLength(1);
  });
  it("replays archived objective answers through isolated V2 aggregation without dropping or promoting metadata",async()=>{
    const uid="synthetic-objective-replay",prefix=`users/${uid}`,db=database(),request=economicsEvidenceFixture(),now="2026-11-05T10:00:00.000Z";
    request.materialPresentations={schemaVersion:1,kind:"client-rendered",records:[{materialId:"ec9708-objective-1.5.1:note",materialVersion:"2026-v2-pilot-1",mappingVersion:"ec9708-objectives-1",
      contentSetId:request.economicsResponses.activities[0].contentSetId,methodId:"memory-palace",phase:"lab",objectiveIds:["ec9708-objective-1.5.1"],presentedAt:"2026-11-03T09:30:00.000Z"}]};
    db.seed(prefix,{});db.seed(`${prefix}/trainingReservations/${request.sessionId}`,{sessionId:request.sessionId,mode:request.mode,methodIds:request.selectedMethods});
    const completed=await createTrainingCompletionService({getFirestore:()=>db,now:()=>Date.parse(now)}).complete(uid,request);
    const rows=db.rows(),row=rows.find(([path])=>path===`${prefix}/learningEvidence/${completed.evidenceId}`)[1];
    const receipt={schemaVersion:2,status:"accepted",sessionId:request.sessionId,mode:request.mode,evidenceId:completed.evidenceId,requestHash:completed.requestHash,
      lifecycleEpoch:1,acceptedRevision:1,recordedAt:now,legacyAssessmentId:null,legacyProfileUpdated:false};
    row.receipt=receipt;
    const source={uid,lifecycleEpoch:1,revision:0,headHash:null};
    const evidenceHash=inventorySourceReference({schemaVersion:1,uid,lifecycleEpoch:1,namespace:"learningEvidence",id:receipt.evidenceId,payload:row},source).contentHash;
    const decisionRow=rows.find(([path])=>path.includes("/learningEvidenceIdentityEvents/"));
    const decision={id:decisionRow[0].split("/").at(-1),data:decisionRow[1]};
    const entries=[createJournalEntry(source,{kind:"session-accepted",receipt,evidenceHash},now)];
    entries.push(createJournalEntry({...source,revision:entries[0].revision,headHash:entries[0].entryHash},{kind:"identity-decided",decisionId:decision.id,
      sourceKind:"native",recordId:request.sessionId,fromEvidenceId:null,toEvidenceId:receipt.evidenceId,linkage:"established",proof:{version:"request-v1",digest:receipt.requestHash}},now));
    expect(digest(decision.data)).toBe(decision.id);
    const batch=createAcceptanceBatch(initialAcceptanceCheckpoint(source),entries),cp=checkpointForBatch(batch),admission=initialAdmission(uid,now);
    const pin=shadowPin({...initialControl(uid),nativeAcceptedCount:1,headRevision:cp.headRevision,headHash:cp.headHash},cp,admission,{seconds:Date.parse(now)/1000,nanoseconds:0});
    const packet={schemaVersion:1,ordinal:1,batch,entries,row,decisions:[decision],indexes:rows.filter(([path])=>path.includes("/learningEvidenceSourceIndex/")).map(([path,data])=>({id:path.split("/").at(-1),data})),
      archive:{schemaVersion:1,uid,lifecycleEpoch:1,sessionId:request.sessionId,evidenceId:receipt.evidenceId,requestHash:receipt.requestHash,payload:request,receipt,archivedAt:now},legacyFingerprint:null};
    expect(parseReplayPacket(packet,pin).row.objectiveEvidence).toEqual(row.objectiveEvidence);
    const rebuilt=rebuildShadow(pin,admission.bootstrap,[packet]);
    expect(rebuilt.profile).toEqual(aggregateCompletedEvidence({kind:"user",uid},[row.evidence]));
    expect(rebuilt.inventory.authority).toBe("NOT VERIFIED");
    const corrupt=structuredClone(packet);corrupt.row.objectiveEvidence.activities[0].answers[0].correct=false;
    expect(()=>parseReplayPacket(corrupt,pin)).toThrow("shadow_evidence_archive_mismatch");
  });
});
