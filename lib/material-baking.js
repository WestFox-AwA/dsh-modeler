import fs from 'node:fs';import crypto from 'node:crypto';
import {hashContent} from './storage.js';
import {materialBakeFingerprint,MATERIAL_CHANNELS,resolveDisplayMaterialSpec} from './material-source.js';
import {materialSurfaceRequiredChannels} from './material-surface.js';
import {materialDetailChannels} from './material-detail.js';
import {assessMaterialSampling,measureMaterialOutputs} from './material-fidelity.js';
import {readBoundedBuffer} from './geometry-cache.js';
const fail=(m,c='invalid_bake')=>{throw Object.assign(Error(m),{code:c});};
const find=(xs,id)=>{for(const o of xs){if(o.id===id)return o;const hit=o.parts&&find(o.parts,id);if(hit)return hit;}};
export async function bakeMaterialObjects({backend,appearance,job,persist,doc,args={},ids}){
 const resolution=args.resolution??256,samples=args.samples??4,margin=args.margin??8;
 if(!Number.isSafeInteger(resolution)||resolution<64||resolution>2048)fail('resolution must be64..2048');if(!Number.isSafeInteger(samples)||samples<1||samples>128)fail('samples must be1..128');if(!Number.isSafeInteger(margin)||margin<0||margin>64)fail('margin must be0..64');
 if(!Array.isArray(ids)||!ids.length||ids.length>32||new Set(ids).size!==ids.length)fail('baking needs1..32 distinct native objects');
 const plans=new Map();let outputPixels=job.materialPixelUsage||0;
 for(const id of ids){const o=find(doc.objects,id);if(!o||o.recipe?.type!=='nativeMesh')fail('bake target is not a native leaf:'+id);const required=new Set(),defaults=new Set();
  for(const input of [o.material,...(o.materialSlots||[]),...(o.recipe.params.features||[]).filter(f=>f.type==='material').map(f=>f.material)].filter(Boolean)){const spec=resolveDisplayMaterialSpec(doc,input),detail=new Set(materialDetailChannels(spec));for(const c of (args.finishAuto&&!spec.surface&&!spec.procedural?[]:['baseColor','roughness','metalness','normal']))if(!detail.has(c)&&!(detail.has('roughness')&&c==='metalness'))defaults.add(c);for(const c of materialSurfaceRequiredChannels(spec))if(!detail.has(c)&&!(detail.has('roughness')&&c==='metalness'))required.add(c);if(spec.procedural){required.add('baseColor');required.add('roughness');if(spec.procedural.bumpDistance)required.add('normal');}}
  const channels=args.channels||[...new Set([...defaults,...required])];if(!Array.isArray(channels)||(args.channels!==undefined&&!channels.length)||channels.length>8||new Set(channels).size!==channels.length||channels.some(c=>!MATERIAL_CHANNELS.includes(c)))fail('bake channels must be distinct supported PBR channels');for(const channel of required)if(!channels.includes(channel))fail('Incomplete surface bake: missing required channel '+channel,'bake_missing_required_channel');
  const sampling=assessMaterialSampling(doc,id,{resolution,detailResolution:args.detailResolution??256});if(args.fidelity==='strict'&&sampling.status!=='sufficient')throw Object.assign(Error('Declared detail exceeds available sampling'),{code:'material_sampling_insufficient',detail:sampling});plans.set(id,{channels,sampling});outputPixels+=resolution*resolution*channels.length;
 }
 if(outputPixels>16*1024*1024)fail('Batch atlas and new detail tiles exceed16M output pixels','material_budget');
 const images={...(doc.meta?.materialLibrary?.images||{})},bakes={...(doc.meta?.materialBakes||{})},results=[];
 for(let index=0;index<ids.length;index++){
  if(job.controller.signal.aborted)fail('material bake cancelled','cancelled');const owner=find(doc.objects,ids[index]);if(!owner||owner.recipe?.type!=='nativeMesh')fail('bake target is not a native leaf: '+ids[index]);
  const p=owner.recipe.params,{channels,sampling}=plans.get(owner.id);if(!channels.length){bakes[owner.id]={sourceHash:p.sourceHash,topologyStamp:p.topologyStamp,appearanceKey:materialBakeFingerprint(doc,owner.id),bakeKey:null,outputs:[],fidelity:{version:1,sampling,outputs:{version:1,status:'not-required',complete:true,channels:[],warnings:[]}}};results.push({id:owner.id,...bakes[owner.id],warnings:sampling.warnings});continue;}job.phase='baking';job.activeRequestId=crypto.randomUUID();job.progress={completed:index,total:ids.length,id:owner.id};persist(job);
  const prefix='bake-'+job.activeRequestId,result=await backend.request(job.assetId,{op:'material_bake',id:owner.id,requestId:job.activeRequestId,channels,resolution,samples,margin,prefix,...(args.uvName?{uvName:args.uvName}:{})},{signal:job.controller.signal});
  if(!result.ok)fail(result.error||'native bake failed',result.code||'bake_failed');if(!result.receipt)fail('bake publication receipt missing','bake_incomplete');
  const published=JSON.parse(readBoundedBuffer(backend.resultFile(job.assetId,result.receipt),2*1024*1024).toString('utf8'));
  if(published.bakeKey!==result.bakeKey||hashContent(published.outputs)!==hashContent(result.outputs))fail('bake publication receipt mismatch','bake_integrity');
  if(result.sourceHash!==undefined&&result.sourceHash!==p.sourceHash||result.topologyStamp!==undefined&&result.topologyStamp!==p.topologyStamp)fail('bake input no longer matches materialized source','bake_stale');
  if(job.controller.signal.aborted)fail('material bake cancelled','cancelled');if(!Array.isArray(result.outputs)||result.outputs.length!==channels.length||new Set(result.outputs.map(o=>o.channel)).size!==channels.length||result.outputs.some(o=>!channels.includes(o.channel)))fail('incomplete bake channels','bake_incomplete');
  const outputs=[];for(const out of result.outputs){const data=readBoundedBuffer(backend.assetFile(job.assetId,out.file),32*1024*1024);if(crypto.createHash('sha256').update(data).digest('hex')!==out.sha256)fail('bake image checksum mismatch','bake_integrity');const image=appearance.importBytes(data,{name:owner.id+' '+out.channel});if(image.width!==resolution||image.height!==resolution)fail('bake dimensions mismatch','bake_integrity');images[image.hash]=image;outputs.push({channel:out.channel,image:image.hash,colorSpace:out.colorSpace,width:image.width,height:image.height});}
  const expectedVariation=Object.fromEntries(channels.map(c=>[c,sampling.spatialChannels.includes(c)])),measurement=await measureMaterialOutputs(p.mesh,outputs,h=>appearance.load(h),{expectedVariation});if(args.fidelity==='strict'&&['unknown','requestedVariationLost'].includes(measurement.status))throw Object.assign(Error('Bake did not retain declared variation'),{code:'material_variation_lost',detail:measurement});
   bakes[owner.id]={fidelity:{version:1,sampling,outputs:measurement},sourceHash:p.sourceHash,topologyStamp:p.topologyStamp,bakeKey:result.bakeKey,geometryHash:result.geometryHash,uvHash:result.uvHash,appearanceHash:result.appearanceHash,appearanceKey:materialBakeFingerprint(doc,owner.id),outputs};
  results.push({id:owner.id,...bakes[owner.id],warnings:[...(result.warnings||[]),...sampling.warnings,...measurement.warnings]});
 }
 doc.meta={...doc.meta,materialLibrary:{version:1,materials:doc.meta?.materialLibrary?.materials||{},images},materialBakes:bakes};
 // The final reference set is checked before publication, including original maps.
 appearance.snapshot({doc});job.materialPixelUsage=outputPixels;return results;
}
