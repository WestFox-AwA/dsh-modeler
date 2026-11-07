import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {resolveCaptureSelection,CAPTURE_PURPOSES,PURPOSE_DISPLAY_MODES,purposeForEdit,observationForEdit,editObservationRequest} from '../lib/observation-purpose.js';
import {createModelerOperations} from '../lib/operations.js';
import {createEvidenceStore,normaliseCapture} from '../lib/evidence.js';
import {normalizeObservation,createSnapshotMeshes,disposeMeshes} from '../client.render.js';
import {runModelerScript} from '../lib/script.js';import {KERNEL_VERSION} from '../lib/kernel.js';import {resolveCamera} from '../lib/camera.js';import {encodePng} from '../lib/png.js';
const tests=[];async function check(name,fn){try{await fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});}}
const temp=fs.mkdtempSync(path.resolve('tests/.observation-purpose-'));
const identity={assetId:'purpose-fixture',revision:1,contentHash:'a'.repeat(64)},bounds={min:[-1,-1,-1],max:[1,1,1]},doc=runModelerScript("return m.scene('Selection',[m.box().shade('flat').key('panel')]);");
const png='data:image/png;base64,'+encodePng({width:64,height:64,data:new Uint8Array(64*64*4).fill(180)}).toString('base64');
let renders=[],metadataReads=0;
const evidence=createEvidenceStore({directory:temp,snapshot:()=>({...identity}),expectedBuildId:'purpose-build',requestCapture:async request=>{renders.push(request);return {frames:request.requests.map(r=>({...identity,kernelVersion:KERNEL_VERSION,clientBuildId:'purpose-build',renderer:'three-r160',data:png,requestId:r.requestId,view:r.view,mode:r.mode,displayMode:r.displayMode,lighting:r.lighting,isolate:r.isolate,context:r.context,section:r.section,bounds,camera:resolveCamera(bounds,{view:r.view,camera:r.camera||{},aspect:r.width/r.height})}))};}});
const service={metadata:()=>{metadataReads++;return identity;},snapshot:()=>({...identity,doc})};
const nativeControl={execute:async()=>({ok:true,changedCurrentAsset:true,contentHash:identity.contentHash,sourceIds:['panel'],feedback:{}})};
const operations=createModelerOperations(service,{projectDir:temp,evidence,nativeControl});
try{
 await check('single authoritative mapping covers all three semantic purposes',()=>{assert.deepEqual(CAPTURE_PURPOSES,['shape','topology','appearance']);for(const purpose of CAPTURE_PURPOSES){const selected=resolveCaptureSelection({purpose},{requireSelection:true});assert.equal(selected.displayMode,PURPOSE_DISPLAY_MODES[purpose]);assert.equal(selected.source,'purpose');assert.equal(selected.purpose,purpose);assert.equal(selected.explicitOverride,false);}});
 await check('public business entry rejects an unselected capture before reading an asset or rendering',async()=>{
  const r=renders.length,m=metadataReads;for(const args of [{},{mode:'material'},{width:64,height:64,views:['front','top']}])await assert.rejects(()=>operations.execute('capture',args),e=>e.code==='capture_purpose_required'&&e.detail.choices.length===3);
  assert.equal(renders.length,r);assert.equal(metadataReads,m);assert.equal(evidence.list().length,0);
 });
 await check('purpose selects the actual renderer input with one request and truthful receipts',async()=>{
  for(const purpose of CAPTURE_PURPOSES){const before=renders.length,result=await operations.execute('capture',{purpose,view:'iso',width:64,height:64});assert.equal(renders.length,before+1);assert.equal(renders.at(-1).requests.length,1);assert.equal(renders.at(-1).requests[0].displayMode,PURPOSE_DISPLAY_MODES[purpose]);assert.equal(result.evidence.displayMode,PURPOSE_DISPLAY_MODES[purpose]);assert.equal(result.evidence.observationSelection.purpose,purpose);assert.equal(result.observationSelection.source,'purpose');assert.equal('observationHint'in result,false);assert(!result.shape&&!result.triangulation);}
 });
 await check('explicit display override is honored and reported, not silently reinterpreted',async()=>{
  const result=await operations.execute('capture',{purpose:'shape',displayMode:'normal',view:'iso',width:64,height:64});assert.equal(result.evidence.displayMode,'normal');assert.equal(result.observationSelection.purpose,'appearance');assert.equal(result.observationSelection.requestedPurpose,'shape');assert.equal(result.observationSelection.explicitOverride,true);
 });
 await check('explicit old diagnostic channels retain their original surface treatment',()=>{
  for(const mode of ['normal','clay','wire','orientation','final_normal','albedo','metalness','roughness']){const selected=resolveCaptureSelection({mode},{requireSelection:true});assert.equal(selected.mode,mode);assert.equal(selected.displayMode,'normal');assert.equal(selected.purpose,'channel');assert.equal(selected.source,'channel');}
  assert.equal(resolveCaptureSelection({}).source,'legacy-default');assert.equal(normaliseCapture({}).displayMode,'normal');
 });
 await check('Host normalization and Client rendering use the same selection for semantic inputs',()=>{
  for(const purpose of CAPTURE_PURPOSES){const args={purpose,width:64,height:64,lighting:{floor:{enabled:true}}},host=normaliseCapture(args),client=normalizeObservation(args);assert.deepEqual(host.observationSelection,client.observationSelection);assert.equal(host.requests[0].purpose,purpose);assert.equal(host.requests[0].displayMode,client.displayMode);assert.equal(host.lighting.floor.enabled,purpose==='appearance');
   const mesh=createSnapshotMeshes({...identity,doc},client.mode,{displayMode:client.displayMode}).meshes;try{assert.equal(mesh[0].material.color.getHexString(),purpose==='appearance'?'c0c7d4':'f4f5f7');}finally{disposeMeshes(mesh);}}
 });
 await check('edit context is classified once, before optional capture, with explicit choices preserved',()=>{
  assert.equal(purposeForEdit({op:'create'}),'shape');assert.equal(purposeForEdit({op:'program'}),'shape');assert.equal(purposeForEdit({op:'material_finish'}),'appearance');assert.equal(purposeForEdit({op:'update',material:{color:'#fff'}}),'appearance');assert.equal(purposeForEdit({op:'feature',feature:{type:'triangulate'}}),'topology');
  assert.deepEqual(observationForEdit({op:'create'},{}),{purpose:'shape'});assert.deepEqual(observationForEdit({op:'create'},{purpose:'appearance'}),{purpose:'appearance'});assert.deepEqual(observationForEdit({op:'create'},{displayMode:'surface_wireframe'}),{displayMode:'surface_wireframe'});
  const next=editObservationRequest(identity,'panel',{op:'create'});assert.equal(next.args.purpose,'shape');assert.equal(next.args.expectedHash,identity.contentHash);assert.equal(next.args.isolate,'panel');
 });
 await check('actual geometry auto-capture consumes operation purpose without an extra render',async()=>{
  for(const [feature,purpose]of [[{type:'bevel'},'shape'],[{type:'subdivide'},'topology'],[{type:'material'},'appearance']]){const before=renders.length,result=await operations.execute('geometry',{op:'feature',id:'panel',feature,observe:{capture:true,width:64,height:64}});assert.equal(renders.length,before+1);assert.equal(result.feedback.capture.displayMode,PURPOSE_DISPLAY_MODES[purpose]);assert.equal(result.feedback.capture.observationSelection.requestedPurpose,purpose);}
 });
 await check('selection resolution is pure, bounded and rejects invalid purpose/modes',()=>{
  const input={purpose:'shape',lighting:{key:{intensity:2}}},before=JSON.stringify(input);const selection=resolveCaptureSelection(input);assert.equal(JSON.stringify(input),before);assert(JSON.stringify(selection).length<400);for(const args of [{purpose:'guess'},{purpose:''},{displayMode:'mesh'},{mode:'shaded'}])assert.throws(()=>resolveCaptureSelection(args));
 });
}finally{operations.close();if(path.dirname(temp)===path.resolve('tests')&&path.basename(temp).startsWith('.observation-purpose-'))fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed).length},tests},null,2));if(tests.some(t=>!t.passed))process.exitCode=1;
