import {attachDesignPlan} from './design-plan.js';
import {runModelerScript} from './script.js';
import {normalizeDoc} from './workspace.js';
import {createEvidenceStore} from './evidence.js';
import {assemblyFeedback} from './assembly-feedback.js';
import {observationForEdit} from './observation-purpose.js';
import crypto from 'node:crypto';
const clone=v=>JSON.parse(JSON.stringify(v));
export function createModelJobs({resources,sessionId,renderSnapshot,evidenceDirectory,buildInfo}={}){
 const jobs=new Map();let tail=Promise.resolve(),disposed=false;
 const view=(j,{offset=0,limit=8}={})=>{if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>24)throw new Error('job pagination invalid');return {id:j.id,status:j.status,createdAt:j.createdAt,finishedAt:j.finishedAt||null,total:j.items.length,completed:j.items.filter(x=>x.status==='completed').length,failed:j.items.filter(x=>x.status==='failed').length,nextOffset:offset+limit<j.items.length?offset+limit:null,items:j.items.slice(offset,offset+limit).map(({capture,assembly,...i})=>({...clone(i),...(assembly?{assembly:{status:assembly.status,complete:assembly.complete,candidatePairs:assembly.candidatePairs,checks:assembly.checks.filter(x=>x.attention).slice(0,2),next:assembly.next}}:{}),...(capture?{capture:{path:capture.path,id:capture.id,assetId:capture.assetId,revision:capture.revision,contentHash:capture.contentHash,clientBuildId:capture.clientBuildId,imageHash:capture.imageHash,camera:capture.camera,width:capture.width,height:capture.height,mode:capture.mode,displayMode:capture.displayMode,observationSelection:capture.observationSelection}}:{})})),workBindingUnchangedByJob:true};};
 function start(args){
  if(disposed)throw new Error('job context closed');
  if(typeof args.code!=='string'||!args.code.trim())throw new Error('batch needs one generator code; read variant values from params');
  if(!Array.isArray(args.variants)||!args.variants.length||args.variants.length>24)throw new Error('batch variants needs1..24 JSON parameter objects');
  for(const v of args.variants){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('batch variant must be an object');if(v.assetId!==undefined)throw new Error('minimal batch creates detached new assets; it never overwrites an asset');}
  const normalized=clone(args.variants),job={id:'job_'+crypto.randomUUID(),status:'queued',createdAt:new Date().toISOString(),items:normalized.map((v,index)=>({index,title:v.title||'Variant '+(index+1),status:'queued',assetId:null,revision:null,contentHash:null}))};
  jobs.set(job.id,job);while(jobs.size>24){const key=[...jobs.keys()].find(k=>['completed','partial','cancelled'].includes(jobs.get(k).status));if(!key)throw new Error('batch job queue full');jobs.delete(key);}
  const code=args.code,capture=args.capture?clone(args.capture):null,responsibilities=args.plan?clone(args.plan):null;
  const execute=async()=>{job.status='running';for(const item of job.items){if(item.status==='completed')continue;if(job.cancel||disposed){item.status='cancelled';continue;}item.status='running';try{
    const variant=normalized[item.index],doc=normalizeDoc(runModelerScript(code,{params:variant.params??variant}));doc.meta.title=variant.title||doc.meta.title;if(responsibilities){const checked=attachDesignPlan(doc,responsibilities);doc.meta=checked.meta;item.planVerified=true;}
    if(!item.assetId){const resource=resources.create(sessionId,{title:doc.meta.title,doc,bind:false});item.assetId=resource.assetId;}
    const target=resources.forAsset(item.assetId),base=target.metadata();if(item.contentHash&&item.contentHash!==base.contentHash)throw new Error('batch target changed outside this job');const s=target.replace(doc,{expectedRevision:base.revision,expectedHash:base.contentHash,source:'generated',discardOverrides:true,label:'batch '+job.id});item.revision=s.revision;item.contentHash=s.contentHash;item.assembly=assemblyFeedback(s.doc,{maxCandidates:12,maxPairs:2});
    if(capture){if(!renderSnapshot)throw new Error('batch renderer unavailable');const evidence=createEvidenceStore({directory:evidenceDirectory,snapshot:()=>target.metadata(),expectedBuildId:buildInfo?.clientBuildId,requestCapture:r=>renderSnapshot(s,r)});const result=await evidence.capture({...observationForEdit({op:'program'},capture),expectedHash:s.contentHash});item.capture=result;}
    item.status='completed';delete item.error;
   }catch(error){item.status='failed';item.error={message:error.message,code:error.code||'batch_item_failed'};}}
   job.status=job.cancel?'cancelled':job.items.some(i=>i.status==='failed')?'partial':'completed';job.finishedAt=new Date().toISOString();};
  job.execute=execute;tail=tail.then(execute,execute);return {ok:true,...view(job),next:{action:'job',args:{id:job.id}}};
 }
 return {close(){disposed=true;for(const j of jobs.values())j.cancel=true;},start,retry(id){if(disposed)throw new Error('job context closed');const j=jobs.get(id);if(!j||!['partial','cancelled'].includes(j.status))throw new Error('only finished failed/cancelled items can be retried');j.cancel=false;for(const i of j.items)if(i.status!=='completed')i.status='queued';j.status='queued';tail=tail.then(j.execute,j.execute);return {ok:true,...view(j)};},get(id,options){const j=jobs.get(id);if(!j)throw new Error('job unavailable (session/plugin lifetime); created assets remain in the resource library');return {ok:true,...view(j,options)};},cancel(id){const j=jobs.get(id);if(!j)throw new Error('job not found');j.cancel=true;return {ok:true,...view(j)};},list(){return {ok:true,jobs:[...jobs.values()].map(view)};}};
}
