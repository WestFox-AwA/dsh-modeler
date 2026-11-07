import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createEvidenceStore,normaliseCapture} from '../lib/evidence.js';
import {createRenderWorker} from '../lib/render-worker.js';
import {encodePng} from '../lib/png.js';
import {KERNEL_VERSION} from '../lib/kernel.js';
import {resolveCamera} from '../lib/camera.js';
const here=path.dirname(fileURLToPath(import.meta.url)),temp=fs.mkdtempSync(path.join(here,'.capture-')),tests=[];
async function check(name,fn){try{await fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});}}
const identity={assetId:'capture-test',contentHash:'a'.repeat(64),revision:1};const cam={projection:'perspective',eye:[3,2,4],target:[0,0,0],up:[0,1,0],fov:42};
const png=encodePng({width:64,height:64,data:new Uint8Array(64*64*4).fill(180)}).toString('base64');
const frame=(overrides={})=>({...identity,kernelVersion:KERNEL_VERSION,clientBuildId:'build-test',renderer:'three-r160',mode:'material',camera:cam,data:'data:image/png;base64,'+png,...overrides});
try{
 await check('legacy eye/target and explicit orbit camera are forwarded without losing coordinates',()=>{
  const a=normaliseCapture({eye:[4,2,7],target:[0,.7,0],fov:30});assert.equal(a.requests[0].view,'custom');assert.deepEqual(a.requests[0].camera,{eye:[4,2,7],target:[0,.7,0],fov:30});
  const b=normaliseCapture({camera:{azimuth:135,elevation:-20,projection:'orthographic',span:2}});assert.equal(b.requests[0].camera.span,2);assert.deepEqual(Object.keys(normaliseCapture({section:{value:0,axis:'x'}}).requests[0].section),['axis','value']);
 });
 await check('invalid dimensions and ambiguous camera controls fail before starting a renderer',()=>{
  for(const args of [{width:2401},{width:12},{width:128.5},{camera:{eye:[0,0,0],target:[0,0,0]}},{camera:{eye:[0,0,1],azimuth:40}},{camera:{up:[0,0,0]}},{camera:{fov:180}},{camera:{projection:'fake'}},{views:['fake']},{views:['front','side'],camera:{span:2}},{view:'custom'},{view:'current',source:'isolated'}])assert.throws(()=>normaliseCapture(args));
 });
 await check('multi-view capture evaluates one bound snapshot request and returns per-camera evidence',async()=>{
  let calls=0,metaReads=0;const e=createEvidenceStore({directory:temp,snapshot:()=>{metaReads++;return {...identity};},expectedBuildId:'build-test',requestCapture:async req=>{calls++;assert.equal(req.requests.length,3);assert.equal(req.assetId,identity.assetId);return {frames:req.requests.map(r=>frame({requestId:r.requestId,view:r.view,bounds:{min:[-1,-.5,-1],max:[1,.5,1]},camera:resolveCamera({min:[-1,-.5,-1],max:[1,.5,1]},{view:r.view,camera:r.camera||{},aspect:1}),isolate:r.isolate,section:r.section}))};}});
  const r=await e.capture({views:['front','side','top'],width:64,height:64});assert.equal(calls,1);assert.equal(r.captures.length,3);assert.equal(new Set(r.captures.map(c=>c.id)).size,3);assert(r.captures.every(c=>fs.existsSync(c.path)&&c.reviewed===false));assert.equal(e.list().length,3);assert(metaReads>=1);
 });
 await check('asset switch or concurrent content changes cannot become mislabeled successful images',async()=>{
  let changed=false;const e=createEvidenceStore({directory:temp,snapshot:()=>changed?{...identity,revision:2}:identity,expectedBuildId:'build-test',requestCapture:async()=>{changed=true;return {frames:[frame()]};}});
  await assert.rejects(()=>e.capture({width:64,height:64}),e=>e.code==='stale_evidence');assert.equal(e.list().length,0);
  const wrong=createEvidenceStore({directory:temp,snapshot:()=>identity,requestCapture:async()=>({frames:[frame({assetId:'another'})]})});await assert.rejects(()=>wrong.capture({width:64,height:64}),e=>e.code==='stale_evidence');
 });
 await check('a provider cannot swap camera, mode, dimensions or the original requested revision',async()=>{
  const bounds={min:[-1,-.5,-1],max:[1,.5,1]};
  for(const mutate of [f=>({...f,mode:'material'}),f=>({...f,view:'side'}),f=>({...f,camera:{...f.camera,eye:[9,9,9]}}),f=>({...f,requestId:'another-request'})]){
   const e=createEvidenceStore({directory:temp,snapshot:()=>identity,requestCapture:async r=>{const q=r.requests[0];return {frames:[mutate(frame({requestId:q.requestId,view:q.view,mode:q.mode,bounds,camera:resolveCamera(bounds,{view:q.view,camera:q.camera,aspect:1}),isolate:null,section:null}))]};}});
   await assert.rejects(()=>e.capture({view:'top',mode:'clay',width:64,height:64}),e=>e.code==='capture_mismatch');
  }
  let changed=false;const e=createEvidenceStore({directory:temp,snapshot:()=>({...identity,revision:changed?2:1}),requestCapture:async()=>{changed=true;return {frames:[frame({revision:2})]};}});
  await assert.rejects(()=>e.capture({expectedRevision:1,width:64,height:64}),e=>e.code==='stale_evidence');
 });
 await check('orthographic frames need their actual span and a complete valid PNG',()=>{
  const e=createEvidenceStore({directory:temp,snapshot:()=>identity});assert.throws(()=>e.accept(frame({camera:{...cam,projection:'orthographic'}})),/span/);const r=e.accept(frame({camera:{...cam,projection:'orthographic',span:4}}));assert.equal(r.camera.span,4);assert.equal(r.reviewed,false);
 });
 await check('missing browser errors release the job and owned temporary resources',async()=>{
  const r=createRenderWorker({root:path.resolve(here,'..'),buildInfo:{clientBuildId:'build-test'},snapshot:()=>({...identity,doc:{version:1,objects:[]}}),browserPath:path.join(temp,'missing.exe'),temporaryDirectory:temp,timeoutMs:1000});
  await assert.rejects(()=>r.capture({...identity,requests:[{width:64,height:64}]}));assert.equal(r.state().busy,false);assert.equal(r.state().lastCleanup,'removed');await r.close();assert.equal(r.state().disposed,true);
 });
}finally{if(path.dirname(temp)===here&&path.basename(temp).startsWith('.capture-'))fs.rmSync(temp,{recursive:true,force:true});}
const failed=tests.filter(t=>!t.passed);console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.length-failed.length,failed:failed.length},tests},null,2));process.exitCode=failed.length?1:0;
