import crypto from 'node:crypto';
import {resolveDisplayMaterialSpec} from './material-source.js';
import {materialDetailKey,materialDetailChannels,resolveMaterialDetail} from './material-detail.js';
import {hashContent} from './storage.js';
import {readBoundedBuffer} from './geometry-cache.js';
import {measureMaterialOutputs} from './material-fidelity.js';
const fail=(message,code='material_detail')=>Object.assign(Error(message),{code});
const convert=x=>Array.isArray(x)?x.map(convert):x&&typeof x==='object'?x.type==='image'&&typeof x.image==='string'?{...Object.fromEntries(Object.entries(x).filter(([k])=>k!=='image').map(([k,v])=>[k,convert(v)])),file:'image-'+x.image+'.png'}:Object.fromEntries(Object.entries(x).map(([k,v])=>[k,convert(v)])):x;
function expectedDetailVariation(spec){const surface=spec.detail.surface,variable=(ref,active=new Set())=>{if(typeof ref!=='string'||active.has(ref))return false;const signal=surface.signals[ref];if(!signal||signal.type==='constant')return false;const next=new Set(active);next.add(ref);if(signal.type==='mix'){if(signal.factor===0)return variable(signal.a,next);if(signal.factor===1)return variable(signal.b,next);if(signal.a===signal.b)return variable(signal.a,next);return variable(signal.a,next)||variable(signal.b,next)||typeof signal.factor==='object'&&variable(signal.factor.signal,next);}if(signal.type==='ramp')return variable(signal.input,next);return true;};const rows=surface.layers.filter(l=>l.mask!==0);return {baseColor:rows.some(l=>typeof l.color==='object'&&l.color.a!==l.color.b&&variable(l.color.signal)||l.color!==undefined&&typeof l.mask==='object'&&variable(l.mask.signal)),roughness:rows.some(l=>typeof l.roughness==='object'&&l.roughness.min!==l.roughness.max&&variable(l.roughness.signal)||l.roughness!==undefined&&typeof l.mask==='object'&&variable(l.mask.signal)),normal:rows.some(l=>l.height?.amplitude>0&&(variable(l.height.signal)||typeof l.mask==='object'&&variable(l.mask.signal)))};}
export function detailSpecs(doc,{ids,ignoreDerivedSlots=false}={}){const wanted=ids?new Set(ids):null,out=new Map(),visit=input=>{if(!input)return;const spec=resolveDisplayMaterialSpec(doc,input);if(spec.detail)out.set(materialDetailKey(spec),spec);},walk=xs=>{for(const o of xs||[]){if(wanted&&!wanted.has(o.id)){walk(o.parts);continue;}visit(o.material);if(!ignoreDerivedSlots)for(const s of o.materialSlots||[])visit(s);for(const f of o.recipe?.params?.features||[])if(f.type==='material')visit(f.material);walk(o.parts);}};walk(doc.objects);return out;}
// Worker groups derive pixels at their own physical scale; canonical source remains intact.
function tileGroups(spec,required){
 if(!spec.detail.channelSizes)return [{size:spec.detail.size,channels:required,spec}];
 const groups=new Map();for(const channel of required){const size=spec.detail.channelSizes[channel]??spec.detail.size;if(!Number.isFinite(size)||size<=0)throw fail('Detail channel size must be positive finite metres.','invalid_material_detail');const group=groups.get(size)||{size,channels:[]};group.channels.push(channel);groups.set(size,group);}
 return [...groups.values()].map(group=>{const worker=JSON.parse(JSON.stringify(spec));worker.detail.size=group.size;delete worker.detail.channelSizes;
  const keys=group.channels.map(c=>c==='baseColor'?'color':c==='normal'?'height':c);worker.detail.surface.layers=worker.detail.surface.layers.map(layer=>Object.fromEntries(Object.entries(layer).filter(([key])=>key==='id'||key==='mask'||keys.includes(key)))).filter(layer=>keys.some(key=>layer[key]!==undefined));return {...group,spec:worker};
 });
}
export async function prepareDetailTiles({backend,appearance,job,persist,doc,args={}}){
 const specs=detailSpecs(doc,{ids:args.ids||(args.id?[args.id]:undefined),ignoreDerivedSlots:args.ignoreDerivedSlots===true}),resolution=args.detailResolution??256,samples=args.samples??4;
 if(args.fidelity!==undefined&&!['warn','strict'].includes(args.fidelity))throw fail('fidelity must be warn or strict','invalid_fidelity_policy');
 if(!Number.isSafeInteger(resolution)||resolution<64||resolution>1024)throw fail('detailResolution must be64..1024','invalid_detail_resolution');
 if(!Number.isSafeInteger(samples)||samples<1||samples>128)throw fail('samples must be1..128','invalid_bake');
 if(!specs.size)return [];
 const caches={...(doc.meta?.materialDetails||{})},images={...(doc.meta?.materialLibrary?.images||{})},results=[];
 let neededPixels=job.materialPixelUsage||0;for(const spec of specs.values()){const key=materialDetailKey(spec),prior=caches[key],valid=resolveMaterialDetail(doc,spec);if(!valid||prior.resolution<resolution)neededPixels+=resolution*resolution*materialDetailChannels(spec).length;}
 if(neededPixels>16*1024*1024)throw fail('Shared detail tile set exceeds16M output pixels','material_budget');
 for(const[detailKey,spec]of specs){
  const required=materialDetailChannels(spec),prior=caches[detailKey];
  if(prior?.resolution>=resolution&&resolveMaterialDetail(doc,spec)){for(const o of prior.outputs)appearance.load(o.image);const expectedVariation=expectedDetailVariation(spec),fidelity=await measureMaterialOutputs(null,prior.outputs,h=>appearance.load(h),{tileFullField:true,expectedVariation});if(args.fidelity==='strict'&&['insufficient','requestedVariationLost','unknown'].includes(fidelity.status))throw Object.assign(fail('Cached detail did not retain declared variation','detail_fidelity'),{detail:fidelity});caches[detailKey]={...prior,fidelity};results.push({detailKey,reused:true,resolution:prior.resolution,fidelity});continue;}
  if(job.controller.signal.aborted)throw fail('detail bake cancelled','cancelled');
  await appearance.prepareBackend(doc,job.assetId);
  const groups=tileGroups(spec,required),outputs=[],receipts=[];
  for(const group of groups){
   if(job.controller.signal.aborted)throw fail('detail bake cancelled','cancelled');
   job.phase='baking-detail';job.activeRequestId=crypto.randomUUID();job.progress={completed:results.length,total:specs.size,detailKey,...(spec.detail.channelSizes?{channels:group.channels,physicalSize:group.size}:{})};persist(job);
   const prefix='bake-detail-'+job.activeRequestId,result=await backend.request(job.assetId,{op:'material_tile',requestId:job.activeRequestId,material:convert(group.spec),resolution,samples,prefix},{signal:job.controller.signal});
   if(!result.ok)throw Object.assign(fail(result.error||'detail tile bake failed',result.code||'detail_bake_failed'),{detail:result.detail});
   if(job.controller.signal.aborted)throw fail('detail bake cancelled','cancelled');
   if(!result.receipt||!result.bakeKey)throw fail('detail tile publication receipt missing','bake_incomplete');
   const published=JSON.parse(readBoundedBuffer(backend.resultFile(job.assetId,result.receipt),2*1024*1024).toString('utf8'));
   if(published.bakeKey!==result.bakeKey||hashContent(published.outputs)!==hashContent(result.outputs))throw fail('detail tile receipt mismatch','bake_integrity');
   if(!Array.isArray(result.outputs)||result.outputs.length!==group.channels.length||new Set(result.outputs.map(o=>o.channel)).size!==group.channels.length||result.outputs.some(o=>!group.channels.includes(o.channel)))throw fail('Incomplete detail tile channels','bake_incomplete');
   receipts.push({size:group.size,channels:group.channels,bakeKey:result.bakeKey,receiptHash:hashContent(published)});
   for(const o of result.outputs){const bytes=readBoundedBuffer(backend.assetFile(job.assetId,o.file),32*1024*1024);if(crypto.createHash('sha256').update(bytes).digest('hex')!==o.sha256)throw fail('detail PNG hash mismatch','bake_integrity');const image=appearance.importBytes(bytes,{name:'Detail '+detailKey.slice(0,10)+' '+o.channel});if(image.width!==resolution||image.height!==resolution)throw fail('detail dimensions mismatch','bake_integrity');images[image.hash]=image;outputs.push({channel:o.channel,image:image.hash,colorSpace:o.channel==='baseColor'?'srgb':'linear',width:image.width,height:image.height});}
  }
  if(outputs.length!==required.length||new Set(outputs.map(o=>o.channel)).size!==required.length||outputs.some(o=>!required.includes(o.channel)))throw fail('Incomplete combined detail channels','bake_incomplete');
  const bakeKey=spec.detail.channelSizes?hashContent({version:1,detailKey,groups:receipts}):receipts[0].bakeKey;
  const expectedVariation=expectedDetailVariation(spec);
  const fidelity=await measureMaterialOutputs(null,outputs,h=>appearance.load(h),{tileFullField:true,expectedVariation});
  if(args.fidelity==='strict'&&['insufficient','requestedVariationLost','unknown'].includes(fidelity.status))throw Object.assign(fail('Detail tile did not retain declared variation','detail_fidelity'),{detail:fidelity});
  caches[detailKey]={version:1,detailKey,resolution,size:spec.detail.size,bakeKey,outputs,fidelity};
  results.push({detailKey,reused:false,resolution,outputs,fidelity});job.materialPixelUsage=(job.materialPixelUsage||0)+resolution*resolution*outputs.length;
 }
 doc.meta={...doc.meta,materialDetails:caches,materialLibrary:{version:1,materials:doc.meta?.materialLibrary?.materials||{},images}};
 appearance.snapshot({doc});await appearance.prepareBackend(doc,job.assetId);return results;
}
