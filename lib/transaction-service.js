import {hashContent} from './storage.js';
// The public service keeps reads synchronous; every write stages and evaluates
// under the same per-asset lock as native feature edits before one CAS commit.
export function transactionalService(raw,engine,{appearance,materialTask}={}){
 const snapshot=(options)=>{const s=raw.snapshot(options),visible=appearance?appearance.snapshot(s):s;return materialTask?{...visible,materialTask:materialTask(s)}:visible;};
 const find=(doc,id)=>{for(const o of doc.objects||[]){if(o.id===id)return o;if(o.parts){const hit=find({objects:o.parts},id);if(hit)return hit;}}};
 const controls=(value={})=>{const out={...value};delete out.nativeMaterialized;return out;};
 const guarded=(base,options={})=>{if(options.expectedHash===undefined&&options.expectedRevision===undefined)throw Object.assign(Error('write requires expectedRevision or expectedHash'),{code:'missing_base'});return {expectedHash:base.contentHash,expectedRevision:base.revision,...options};};
 const apply=async request=>engine.transact(raw,{
  prepare:base=>raw.candidate({...request,...guarded(base,request)}),
  commit:(doc,base,candidate)=>({...raw.replace(doc,{...guarded(base,request),source:'edit',nativeMaterialized:true,label:request.label||'Edit transaction'}),results:candidate.results||[]})
 });
 const replace=async(doc,options={},extra)=>{const opts=controls(typeof options==='number'?{expectedRevision:options,...extra}:options);return engine.transact(raw,{
  prepare:base=>raw.candidateReplace(doc,guarded(base,opts)),
  commit:(evaluated,base)=>raw.replace(evaluated,{...guarded(base,opts),...(opts.source==='edit'?{nativeMaterialized:true}:{})})
 });};
 const wrappers={snapshot,replace,apply,displaySnapshot:()=>engine.displaySnapshot(raw),
  add:async args=>{const object={kind:'box',...Object.fromEntries(Object.entries(args).filter(([k])=>!['expectedHash','expectedRevision','assetId','label'].includes(k)))};object.position??=[0,object.kind==='plane'?.01:.5,0];const result=await apply({...args,operations:[{op:'add',object}]});return {...result,object:find(result.doc,result.results[0].id)};},
  update:async args=>{const result=await apply({...args,operations:[{op:'update',...Object.fromEntries(Object.entries(args).filter(([k])=>!['expectedHash','expectedRevision','assetId','label'].includes(k)))}]});return {...result,object:find(result.doc,args.id)};},
  remove:args=>apply({...args,operations:[{op:'remove',id:args.id}]}),
  checkpoint:async options=>engine.transact(raw,{prepare:base=>{guarded(base,options);raw.snapshot(options);return {doc:base.doc};},commit:()=>raw.checkpoint(options)}),
  restore:async(id,options={})=>engine.transact(raw,{historicalSnapshot:true,prepare:base=>{guarded(base,options);raw.snapshot(options);const entry=raw.history({includeDoc:true,allAssets:true}).find(e=>e.id===id);if(!entry)throw Object.assign(Error('history entry not found'),{code:'not_found'});return {doc:entry.doc,expectedSnapshotHash:entry.hash||entry.contentHash};},commit:(evaluated,_base,candidate)=>{if(hashContent(evaluated)!==hashContent(candidate.doc))throw Object.assign(Error('Historical source requires a changed evaluation; restore rejected without changing the original version'),{code:'restore_evaluation_changed'});return raw.restore(id,options);}}),
  openProject:async(key,options={})=>engine.transact(raw,{historicalSnapshot:true,prepare:base=>{guarded(base,options);raw.snapshot(options);const entry=raw.history({includeDoc:true,allAssets:true}).filter(e=>e.projectKey===key||e.assetId===key).at(-1);if(!entry)throw Object.assign(Error('project head not found'),{code:'not_found'});return {doc:entry.doc,expectedSnapshotHash:entry.hash||entry.contentHash};},commit:(evaluated,_base,candidate)=>{if(hashContent(evaluated)!==hashContent(candidate.doc))throw Object.assign(Error('Project head evaluation changed; opening rejected'),{code:'restore_evaluation_changed'});return raw.openProject(key,options);}})
 };
 return new Proxy({},{get(_target,key){if(Object.hasOwn(wrappers,key))return wrappers[key];const value=raw[key];return typeof value==='function'?value.bind(raw):value;}});
}
