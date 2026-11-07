import {hydrateDisplay} from './client.transport.js';
import {CaptureRenderer,captureDimensions,normalizeObservation} from './client.render.js';

// A real, single-job browser entry. All resources are bundled locally; the Host
// owns the browser process and tokenized HTTP scope, then closes both per batch.
window.__captureDone=false;
window.__captureStatus='running';
window.__captureError=null;
const compiledBuild=typeof __MODELER_CLIENT_BUILD__==='undefined'?null:__MODELER_CLIENT_BUILD__;
const endpoint=name=>new URL(name,location.href);
async function post(name,payload) {
 const response=await fetch(endpoint(name),{method:'POST',cache:'no-store',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
 if(!response.ok)throw new Error('Capture '+name+' upload failed: HTTP '+response.status);
}

async function run() {
 let renderer;
 try{
  const response=await fetch(endpoint('job.json'),{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw new Error('Capture job fetch failed: HTTP '+response.status);
  const job=await response.json(),jobBuild=job.clientBuildId??job.build;
  if(!compiledBuild||jobBuild!==compiledBuild)throw new Error('Capture worker/client build mismatch');
  const requests=job.requests??(job.request?[job.request]:null);
  if(!Array.isArray(requests)||requests.length<1||requests.length>4)throw new Error('A capture batch requires 1–4 requests');
  const snapshot=await hydrateDisplay(job.snapshot);
  if(!snapshot||typeof snapshot.assetId!=='string'||!Number.isSafeInteger(snapshot.revision)||typeof snapshot.contentHash!=='string')throw new Error('Capture job is missing snapshot identity');
  for(const request of requests){
   if(!request||typeof request!=='object'||Array.isArray(request))throw new Error('Capture request must be an object');
   captureDimensions(request);normalizeObservation(request);
   for(const field of ['assetId','revision','contentHash'])if(request[field]!==undefined&&request[field]!==snapshot[field])throw new Error('Capture job '+field+' mismatch');
  }
  renderer=new CaptureRenderer({canvas:document.getElementById('capture')||undefined,pixelRatio:1});
  const frames=[];
  for(const request of requests){renderer.load(snapshot,request.mode||'material',request);frames.push(await renderer.capture(request));}
  // Dispose GPU allocations before acknowledging completion to the Host.
  renderer.dispose();renderer=null;
  await post('result',{frames});
  window.__captureStatus='complete';
 }catch(error){
  const message=String(error?.message||error).slice(0,1800);window.__captureError=message;window.__captureStatus='failed';
  try{await post('error',{error:message,message});}catch(uploadError){window.__captureError=message+'; '+String(uploadError?.message||uploadError);}
 }finally{
  try{renderer?.dispose();}finally{window.__captureDone=true;}
 }
}
void run();
