import {wholeTaskRoute} from './whole-task.js';
import {createSurfaceWorkflow} from './surface-workflow.js';
import {recommendCapability} from './capability-guidance.js';
import {designPlan,attachDesignPlan} from './design-plan.js';
import {plasticEditOperations} from './plastic-edit.js';
import {createModelJobs} from './model-jobs.js';
import {assemblyFeedback,setContactIntentOperation} from './assembly-feedback.js';
import path from 'node:path';
import {getActionHelp} from './action-help.js';
import {createSourceStore,sourceFailure} from './source-store.js';
import {runModelerScript} from './script.js';
import {normalizeDoc} from './workspace.js';
import {analyzeDoc} from './analyze.js';
import {diagnoseDoc} from './diagnostics.js';
import {createTrials} from './trials.js';
import {findModule,moduleReplacement,moduleDescriptor} from './module-source.js';
import {inspectAssembly} from './assembly.js';
import {checkRolesDoc} from './role-checks.js';
const fail=(message,code='validation')=>Object.assign(new Error(message),{code});
export function createWorkflowOperations({service,projectDir,resourceContext,sourceDirectory,renderSnapshot,evidenceDirectory,buildInfo,identity,receipt}){
 const drafts=new Map();
  const sources=createSourceStore({directory:sourceDirectory||null}),trials=createTrials({service,sources,renderSnapshot,directory:evidenceDirectory,buildInfo});
 const jobs=resourceContext?createModelJobs({resources:resourceContext.resources,sessionId:resourceContext.sessionId,renderSnapshot,evidenceDirectory,buildInfo}):null;
 const meta=()=>service.metadata();
 const surfaces=createSurfaceWorkflow({service,trials,guard,receipt,identity});
 function sourcePlan(args,before){if(args.plan===null)return null;if(args.plan!==undefined)return designPlan(args.plan).plan;return drafts.get(meta().assetId)||before?.meta?.designPlan||null;}
 function didCommitPlan(args,snapshot){if(args.plan===null){drafts.delete(snapshot.assetId);return;}if(snapshot.doc.meta?.designPlan)drafts.set(snapshot.assetId,snapshot.doc.meta.designPlan);}
 function applyPlan(doc,args,before){const plan=sourcePlan(args,before);if(plan)return attachDesignPlan(doc,plan);if(args.plan===null&&doc.meta?.designPlan){doc={...doc,meta:{...doc.meta}};delete doc.meta.designPlan;}return doc;}

 function guard(args,required=false){const s=meta();if(args.assetId!==undefined&&s.assetId!==args.assetId)throw fail('会话当前资源已改变','binding_conflict');if(required&&args.expectedRevision===undefined&&!args.expectedHash)throw fail('需要expectedRevision或expectedHash','missing_base');if(args.expectedRevision!==undefined&&args.expectedRevision!==s.revision||args.expectedHash!==undefined&&args.expectedHash!==s.contentHash)throw fail('当前资源基线不匹配','conflict');return s;}
 function codeFor(args){
  const current=service.snapshot();
  if(args.code!==undefined&&args.sourceId!==undefined)throw fail('code与sourceId只选一个');
  if(args.code!==undefined&&typeof args.code!=='string')throw fail('code必须是源码字符串');
  if(args.sourceId!==undefined&&(typeof args.sourceId!=='string'||!args.sourceId))throw fail('sourceId必须是非空源码标识');
  return {snapshot:current,code:args.code!==undefined?args.code:args.sourceId!==undefined?sources.get(current.assetId,args.sourceId,current.doc.meta?.script):current.doc.meta?.script||''};
 }
 function validate(code){const start=performance.now();try{const doc=normalizeDoc(runModelerScript(code));return {valid:true,summary:analyzeDoc(doc).summary,elapsedMs:+(performance.now()-start).toFixed(2),changedCurrentAsset:false};}catch(error){return {valid:false,error:sourceFailure(error),elapsedMs:+(performance.now()-start).toFixed(2),changedCurrentAsset:false};}}
 async function dispatch(action,args={}){
   if(action==='surface')return surfaces.dispatch(args);
   if(action==='trial_get')return {ok:true,...trials.get(args.id)};
   if(action==='trial_list')return {ok:true,...trials.list(args)};
   if(action==='trial_observe'){guard(args);const {assetId,expectedRevision,expectedHash,...capture}=args;return trials.observe(capture);}
   if(action==='trial_compare'){guard(args);return trials.compare(args);}
   if(action==='trial_diagnose')return trials.diagnose(args.id,args.query||{query:'part',id:args.target});
  if(action==='advise'){guard(args);return {ok:true,...identity(meta()),recommendation:recommendCapability({intent:args.intent??args.query??args.task??'',doc:service.snapshot().doc,id:args.id||null,radius:args.radius}),changedCurrentAsset:false};}
   if(action==='plan'){const result=designPlan(args);if(result.plan){if(args.assetId!==undefined&&args.assetId!==meta().assetId)throw fail('草案资源已切换','binding_conflict');drafts.set(meta().assetId,result.plan);while(drafts.size>16)drafts.delete(drafts.keys().next().value);}return {...result,...identity(meta()),changedCurrentAsset:false,planStorage:result.plan?'asset-scoped in-process draft; persisted when generator commits':'none'};}
  if(action==='catalog'&&args.query!==undefined)return getActionHelp({query:args.query});
   if(['source','save_source','patch_source','validate'].includes(action)){
   const s=guard(args,['save_source','patch_source'].includes(action)),current=codeFor(args);let code=current.code,source;
   if(action==='source'){if(!code)throw fail('当前资源没有生成源码；可用save_source新建','source_not_found');return {ok:true,...identity(s),...sources.read(s.assetId,code,args)};}
   if(action==='save_source'){if(typeof args.code!=='string')throw fail('save_source需要code');source=sources.put(s.assetId,args.code);code=args.code;}
   if(action==='patch_source'){const changed=sources.patch(s.assetId,code,args.patches);code=changed.code;source={sourceId:changed.sourceId,sourceHash:changed.sourceHash,characters:changed.characters,patchesApplied:changed.patchesApplied};}
   const validation=validate(code);return {ok:action==='validate'?validation.valid:true,...identity(s),...(source||{}),validation,committable:validation.valid,changedCurrentAsset:false,next:validation.valid&&source?{action:'script',args:{assetId:s.assetId,expectedHash:s.contentHash,sourceId:source.sourceId}}:{action:'help',args:{topic:'api'}}};
  }
  if(['batch','job','retry_job','cancel_job'].includes(action)){if(!jobs)throw fail('batch resources unavailable');if(action==='batch')return jobs.start(args);if(action==='retry_job')return jobs.retry(args.id);if(action==='cancel_job')return jobs.cancel(args.id);return args.id?jobs.get(args.id,args):jobs.list();}
  if(action==='sculpt'||action==='bevel'){
   guard(args,true);const snapshot=service.snapshot(),prepared=plasticEditOperations(snapshot.doc,{...args,kind:action==='bevel'?'bevel':'brush'});
   if(args.preview===true)return {...await trials.stage({...args,operations:prepared.operations}),plastic:prepared.resolved};
   const result=await service.apply({expectedHash:snapshot.contentHash,expectedRevision:snapshot.revision,operations:prepared.operations,label:args.label||action});return {...receipt(result,{before:snapshot.doc}),plastic:prepared.resolved};
  }
  if(action==='classes'){const s=service.snapshot(),definitions=s.doc.meta?.classDefinitions||[],selected=args.name?definitions.filter(d=>d.className===args.name):definitions;return {ok:true,...identity(s),definitions:selected.slice(0,16).map(({buildSource,...d})=>({...d,sourceCharacters:buildSource?.length||0,...(args.includeSource?{buildSource:String(buildSource||'').slice(0,12000)}:{})})),total:selected.length,note:'Construction definitions and parameter snapshots; local controls do not rewrite source.'};}
  if(action==='assembly_check'){const s=service.snapshot();return {ok:true,...identity(s),assembly:assemblyFeedback(s.doc,args),changedCurrentAsset:false};}
  if(action==='contact_intent'){guard(args,true);const s=service.snapshot(),doc=setContactIntentOperation(s.doc,args);return receipt(await service.replace(doc,{expectedHash:s.contentHash,source:'edit',label:'contact intent'}),{before:s.doc});}
  if(action==='solid_combine'){
   const s=guard(args,true),snapshot=service.snapshot(),all=[];const walk=xs=>{for(const o of xs){all.push(o);if(o.parts)walk(o.parts);}};walk(snapshot.doc.objects);const a=all.find(o=>o.id===args.a),b=all.find(o=>o.id===args.b);if(!a||!b||a===b||a.parts||b.parts||typeof args.id!=='string'||!args.id||all.some(o=>o.id===args.id))throw fail('solid_combine needs distinct leaf a/b and a new exact result id');
   const object={id:args.id,semanticId:args.id,name:args.name||'Solid result',kind:'custom',recipe:{type:'meshBoolean',params:{targets:[a.id,b.id],operation:args.operation||'union',tolerance:args.tolerance??1e-6}},material:args.material||a.material,meta:{sourceIds:[a.id,b.id],sourcePolicy:'inputs retained hidden; result uses one material'}};
   const operations=[{op:'add',object},{op:'visibility',id:a.id,visible:false},{op:'visibility',id:b.id,visible:false}];
   return {...await trials.stage({...args,operations,observe:args.observe,diagnostics:args.diagnostics}),solidOperation:object.recipe.params.operation,inputsRetained:true};
  }
  if(action==='tree'){const s=service.snapshot();return {ok:true,...identity(s),...inspectAssembly(s.doc,{...args,depth:args.depth??2}),changedCurrentAsset:false};}
  if(action==='check_roles'){const s=service.snapshot();return {ok:true,...identity(s),...checkRolesDoc(s.doc,args),changedCurrentAsset:false};}
  if(action==='module_source'||action==='save_module_source'){
   const s=guard(args,action==='save_module_source'),snapshot=service.snapshot(),id=args.moduleId||args.id,object=findModule(snapshot.doc,id),descriptor=moduleDescriptor(snapshot.doc,id);
   if(action==='module_source'){
     if(!descriptor.available&&!args.sourceId)return {ok:true,...identity(s),module:descriptor,available:false,next:{action:'save_module_source',args:{moduleId:id,assetId:s.assetId,expectedHash:s.contentHash,code:`const p=m.box().key('${id}.part');return m.scene('Module',[m.merge([p],'Module').key('${id}')]);`}}};
     const code=args.sourceId?sources.get(s.assetId,args.sourceId,object.module?.sourceCode):object.module.sourceCode;
     return {ok:true,...identity(s),available:true,module:descriptor,...sources.read(s.assetId,code,args),sourceSpace:'module-local'};
   }
   if(args.code!==undefined&&args.sourceId!==undefined)throw fail('code与sourceId只选一个');
   if(args.code!==undefined&&typeof args.code!=='string')throw fail('code必须源码字符串');
   const code=args.code!==undefined?args.code:sources.get(s.assetId,args.sourceId,object.module?.sourceCode),source=sources.put(s.assetId,code);let validation;
   try{const operation=moduleReplacement(snapshot.doc,id,runModelerScript(code,{params:snapshot.doc.meta?.generatorParams??{}}),code,args),candidate=service.candidate({operations:[operation],expectedHash:s.contentHash});validation={valid:true,candidateHash:candidate.contentHash};}catch(error){validation={valid:false,error:sourceFailure(error)};}
   return {ok:true,...identity(s),moduleId:id,sourceSpace:'module-local',frameMode:args.frameMode||'preserve',...source,validation,committable:validation.valid,changedCurrentAsset:false,next:{action:'trial',args:{moduleId:id,frameMode:args.frameMode||'preserve',sourceId:source.sourceId,assetId:s.assetId,expectedHash:s.contentHash,observe:{view:'iso',mode:'clay',isolate:id}}}};
  }
  if(action==='diagnose'){const s=service.snapshot();return {ok:true,...identity(s),...diagnoseDoc(s.doc,args),changedCurrentAsset:false};}
  if(action==='trial'){const before=service.snapshot().doc;return {...await trials.stage({...args,...(args.code!==undefined||args.sourceId!==undefined?{designPlan:sourcePlan(args,before)}:{})}),...identity(meta())};}
  if(action==='accept_trial'){const result=await trials.accept(args);if(Object.hasOwn(result,'designPlanApplied'))didCommitPlan({plan:result.designPlanApplied},result.snapshot);return {...receipt(result.snapshot),trialId:result.trialId,acceptedCandidateHash:result.acceptedCandidateHash,selectedObservation:result.observation||null,acceptReason:result.reason||null,selectionReceipt:result.selectionPath||null,selectionWarning:result.selectionWarning||null};}
  if(action==='discard_trial')return {...trials.discard(args.id),...identity(meta())};
  return null;
 }
 function sourceCode(args){if(args.code===undefined&&args.sourceId===undefined)throw fail('script需要code或sourceId');return codeFor(args).code;}
 return {dispatch,sourceCode,sourcePlan,applyPlan,didCommitPlan,sources,trials,close:()=>jobs?.close()};
}
