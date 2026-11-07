import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { KERNEL_VERSION } from './kernel.js';
import {decodePng} from './png.js';
import {resolveCamera,observationCameraClipping} from './camera.js';
import {resolveCaptureSelection} from './observation-purpose.js';
import {OBSERVATION_MODES,DISPLAY_MODES,normalizeObservationLighting,observationStagePolicy} from './observation-stage.js';
const modes=OBSERVATION_MODES;
const presets=['front','back','side','left','top','bottom','iso','custom','current'];
const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const failure=(text,code='invalid_capture')=>Object.assign(new Error(text),{code});
// Verify the renderer's effective observation plan against the explicit request
// axes. This is stronger than comparing an echoed request object; the plan is
// the merge of studio defaults/asset stage/transient fields actually applied.
function effectivePlanMatches(plan,wanted){
 if(!plan||plan.schema!=='dsh-modeler.observation-plan'||plan.mode!==wanted.mode||plan.displayMode!==wanted.displayMode)return false;
 const lighting=wanted.lighting;
 if(JSON.stringify(plan.explicit)!==JSON.stringify(lighting.explicit)||JSON.stringify(plan.policy)!==JSON.stringify(lighting.policy))return false;
 if(lighting.explicit.background&&plan.background?.value!==lighting.background)return false;
 if(lighting.explicit.exposure&&plan.exposure!==lighting.exposure)return false;
 if(lighting.explicit.shadowEnabled&&plan.shadows?.enabled!==lighting.shadows.enabled)return false;
 if(lighting.explicit.environment&&plan.environment?.override!==lighting.environment.intensity)return false;
 if(lighting.explicit.floor){
  if(lighting.policy.floorAllowed){if(plan.floor?.source!=='observation'||plan.floor.enabled!==lighting.floor.enabled)return false;}
  else if(plan.floor?.enabled!==false||plan.floor.source!=='display-mode')return false;
 }
 const explicitLights=['key','fill','rim','hemisphere'].filter(role=>lighting.explicit[role]);
 if(explicitLights.length){
  if(plan.lightOwner!=='observation')return false;
  for(const role of explicitLights)if(JSON.stringify(plan.lights?.[role])!==JSON.stringify(lighting[role]))return false;
 }
 return true;
}
function dimensions(value,fallback,name){const n=value??fallback;if(!Number.isInteger(n)||n<64||n>2400)throw failure(name+'需要64–2400整数像素');return n;}
export function normaliseCapture(args={}){
 const width=dimensions(args.width,1000,'width'),height=dimensions(args.height,700,'height');
 const source=args.source??(args.view==='current'?'viewport':'isolated');if(!['isolated','viewport'].includes(source))throw failure('source需isolated或viewport');
   const observationSelection=resolveCaptureSelection(args),{mode,displayMode}=observationSelection;
let lighting;try{lighting=normalizeObservationLighting(args.lighting,{mode,displayMode});}catch(error){throw failure(error.message);}
 let camera=args.camera;
 if(camera!==undefined&&(!camera||typeof camera!=='object'||Array.isArray(camera)))throw failure('camera需相机参数对象');
 if(args.eye!==undefined||args.target!==undefined||args.fov!==undefined){if(camera)throw failure('camera与旧eye/target/fov参数不能混用');camera={...(args.eye!==undefined?{eye:args.eye}:{}),...(args.target!==undefined?{target:args.target}:{}),...(args.fov!==undefined?{fov:args.fov}:{})};}
 if(camera){
  const allowed=['eye','target','up','azimuth','elevation','distance','projection','fov','span'];for(const k of Object.keys(camera))if(!allowed.includes(k))throw failure('未知camera字段 '+k);
  for(const k of ['eye','target','up'])if(camera[k]!==undefined&&!finite3(camera[k]))throw failure('camera.'+k+'需有限数字三元数组');
  for(const k of ['azimuth','elevation','distance','fov','span','near','far'])if(camera[k]!==undefined&&!Number.isFinite(camera[k]))throw failure('camera.'+k+'需有限数字');
  if(camera.eye&&['azimuth','elevation','distance'].some(k=>camera[k]!==undefined))throw failure('eye与角度/distance互斥');
  if(camera.eye&&camera.target&&camera.eye.every((v,i)=>v===camera.target[i]))throw failure('eye和target不能相同');
  if(camera.up&&Math.hypot(...camera.up)===0)throw failure('camera.up不能为零');
  if(camera.fov!==undefined&&(camera.fov<=0||camera.fov>=179))throw failure('camera.fov需要0–179度之间');
  if(camera.projection!==undefined&&!['orthographic','perspective'].includes(camera.projection))throw failure('camera.projection需orthographic或perspective');
  for(const k of ['span','distance','near','far'])if(camera[k]!==undefined&&camera[k]<=0)throw failure('camera.'+k+'必须大于0');
 }
 const list=args.views===undefined?[args.view??(camera?'custom':'iso')]:(Array.isArray(args.views)?args.views:String(args.views).split(','));
 if(args.views!==undefined&&args.view!==undefined)throw failure('view与views只能选一个');
 if(!list.length||list.length>4||new Set(list).size!==list.length||list.some(v=>!presets.includes(v)))throw failure('每批需1–4个不同机位：front/side/top/iso/back/left/bottom/custom');
 if(camera&&list.length!==1)throw failure('自定义camera对应一个机位；多机位使用views');
 if(list.includes('custom')&&!camera)throw failure('custom机位需要camera参数');
 if(list.includes('current')&&(source!=='viewport'||list.length!==1||camera))throw failure('current只用于当前面板单帧截图');
 const isolate=args.isolate??null;if(isolate!==null&&(typeof isolate!=='string'||!isolate))throw failure('isolate需语义部件ID');
 const context=args.context??[];if(!Array.isArray(context)||context.length>12||context.some(id=>typeof id!=='string'||!id))throw failure('context需最多12个精确部件ID');const normalizedContext=[...new Set(context)].sort();
 const section=args.section??null;if(section&&(!['x','y','z'].includes(section.axis)||!Number.isFinite(section.value)))throw failure('section需{axis:x/y/z,value:有限数字}');
 if(width*height*list.length>16000000)throw failure('批量截图超出1600万像素预算','render_budget');
 const overlay=args.overlay||null;if(overlay){if(!overlay.assetId||!overlay.contentHash||overlay.space!=='world')throw failure('overlay需要当前世界空间选区身份');const n=['points','segments','triangles'].reduce((s,k)=>s+(overlay[k]?.length||0),0);if(n>49152||['points','segments','triangles'].some(k=>overlay[k]&&(!Array.isArray(overlay[k])||overlay[k].length%3||overlay[k].some(v=>!Number.isFinite(v)))))throw failure('选区覆盖几何超预算或无效');}if(args.focusSelection&&!overlay)throw failure('局部选区取景需要先定位选区');return {source,mode,displayMode,lighting,observationSelection,requests:list.map(view=>({width,height,view,camera,mode,displayMode,...(args.purpose!==undefined?{purpose:args.purpose}:{}),isolate,context:normalizedContext,section:section?{axis:section.axis,value:section.value}:null,lighting,...(overlay?{overlay,focusSelection:args.focusSelection!==false}:{})}))};
}

// Captured pixels are evidence for exactly one immutable source and camera, never
// an appearance approval. Sidecar receipts remain bounded in memory; base64 is
// consumed once and never retained with the returned history.
export function createEvidenceStore({ directory, snapshot, requestCapture, expectedBuildId=null }) {
 const entries=new Map();
 function accept(body,{observationSelection}={}){
  const now=snapshot();
  if(body.assetId!==undefined&&body.assetId!==now.assetId||body.contentHash!==now.contentHash||body.revision!==now.revision)throw failure('图像版本已过期；重新获取当前版本再采集','stale_evidence');
  if(expectedBuildId&&body.clientBuildId!==expectedBuildId)throw failure('客户端构建已过期，请刷新建模台');
  if(body.kernelVersion!==KERNEL_VERSION||body.renderer!=='three-r160')throw failure('图像求值器/渲染器版本不匹配');
  const c=body.camera;if(!finite3(c?.eye)||!finite3(c?.target)||!Number.isFinite(c?.fov)||c.fov<=0||c.fov>=179||c.eye.every((v,i)=>v===c.target[i]))throw failure('采集缺少有效实际相机');
  if(c.projection==='orthographic'&&(!Number.isFinite(c.span)||c.span<=0))throw failure('正交采集缺少span');
  if(!modes.includes(body.mode))throw failure('未知观察模式');
  const hit=/^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(body.data||'');if(!hit)throw failure('采集必须返回PNG');
  const bytes=Buffer.from(hit[1],'base64');if(bytes.length<33||bytes.length>16*1024*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw failure('PNG无效或超出图像预算');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(width<32||height<32||width>4096||height>4096)throw failure('图像尺寸超出预算');
  const decoded=decodePng(bytes,{strict:true,maxPixels:4096*4096});if(decoded.width!==width||decoded.height!==height)throw failure('PNG decoded dimensions differ');
  const imageHash=crypto.createHash('sha256').update(bytes).digest('hex');
  const id=crypto.createHash('sha256').update(JSON.stringify([now.assetId,now.contentHash,c,body.mode,body.displayMode||null,body.isolate||null,body.context||[],body.section||null,body.lighting||null,imageHash])).digest('hex').slice(0,24);
  const selected=observationSelection||resolveCaptureSelection({mode:body.mode,displayMode:body.displayMode,...(body.purpose!==undefined?{purpose:body.purpose}:{})});
   if(selected.mode!==body.mode||selected.displayMode!==(body.displayMode||'normal'))throw failure('观察用途与实际显示模式不一致','capture_mismatch');
   const dir=path.join(directory,String(now.assetId).replace(/[^a-zA-Z0-9_-]/g,'_'));fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,now.contentHash.slice(0,16)+'-'+id+'.png');fs.writeFileSync(file,bytes);
  const receipt={observationSelection:selected,id,assetId:now.assetId,revision:now.revision,contentHash:now.contentHash,kernelVersion:KERNEL_VERSION,clientBuildId:body.clientBuildId||null,renderConfig:body.renderConfig||null,lighting:body.lighting||null,lightingEchoed:body.lightingEchoed===true,displayMode:body.displayMode||'normal',displayModeEchoed:body.displayModeEchoed===true,effectivePlanVerified:body.effectivePlanVerified===true,...(body.selectionObservation?{selectionObservation:body.selectionObservation}:{}),
   source:body.source||'viewport',requestId:body.requestId||null,renderer:body.renderer,view:body.view||null,mode:body.mode,camera:c,isolate:body.isolate||null,context:body.context||[],section:body.section||null,width,height,imageHash,path:file,
   capturedAt:new Date().toISOString(),captured:true,reviewed:false,proves:observationStagePolicy(body.mode,body.displayMode||'normal').floorAllowed?'指定版本与机位的Three材质图像已采集；未作外观验收':'指定版本的诊断模式图像已采集；不证明PBR外观'};
  fs.writeFileSync(file+'.json',JSON.stringify(receipt,null,2));entries.set(id,receipt);while(entries.size>64)entries.delete(entries.keys().next().value);return receipt;
 }
 function list(){const s=snapshot();return [...entries.values()].filter(v=>v.assetId===s.assetId).map(v=>({...v,current:v.contentHash===s.contentHash})).slice(-12).reverse();}
 async function capture(args={}){
  const s=snapshot();if(args.expectedHash&&args.expectedHash!==s.contentHash||args.expectedRevision!==undefined&&args.expectedRevision!==s.revision)throw failure('采集请求版本冲突','conflict');
  const spec=normaliseCapture(args);spec.requests=spec.requests.map(r=>({...r,requestId:crypto.randomUUID()}));const r=await requestCapture({...spec,revision:s.revision,contentHash:s.contentHash,assetId:s.assetId,kernelVersion:KERNEL_VERSION});if(r.error)throw failure(r.error);
  const now=snapshot();if(now.assetId!==s.assetId||now.revision!==s.revision||now.contentHash!==s.contentHash)throw failure('采集期间当前资产版本已变化','stale_evidence');
  const frames=r.frames||[r];if(frames.length!==spec.requests.length)throw failure('返回机位数量不匹配');
  const planVerified=[];
  for(let i=0;i<frames.length;i++){
   const f=frames[i],wanted=spec.requests[i];if(wanted.overlay&&(wanted.overlay.assetId!==s.assetId||wanted.overlay.contentHash!==s.contentHash||f.selectionObservation?.contentHash!==s.contentHash||f.selectionObservation?.id!==wanted.overlay.id))throw failure('选区覆盖不属于当前采集版本','stale_evidence');if(f.error)throw failure(f.error);
   if(f.assetId!==s.assetId||f.revision!==s.revision||f.contentHash!==s.contentHash)throw failure('渲染器返回的资产或版本不属于发起时基线','stale_evidence');
   if(f.requestId!==wanted.requestId||f.view!==(wanted.view==='current'?'custom':wanted.view))throw failure('渲染器返回的机位请求身份不匹配','capture_mismatch');
   if(f.mode!==wanted.mode||JSON.stringify(f.isolate??null)!==JSON.stringify(wanted.isolate)||JSON.stringify(f.section??null)!==JSON.stringify(wanted.section)||JSON.stringify(f.context??[])!==JSON.stringify(wanted.context||[]))throw failure('渲染器返回的观察模式/隔离/截面不匹配','capture_mismatch');
   const frameDisplayMode=f.displayMode===undefined?wanted.displayMode:f.displayMode;if(frameDisplayMode!==wanted.displayMode)throw failure('渲染器返回的displayMode与请求不一致','capture_mismatch');
   const frameLighting=f.lighting===undefined?wanted.lighting:f.lighting;if(JSON.stringify(frameLighting)!==JSON.stringify(wanted.lighting))throw failure('渲染器返回的观察灯光/地板与请求不一致','capture_mismatch');
   const effectivePlan=f.renderConfig?.observationStage?.plan||null,verified=effectivePlan?effectivePlanMatches(effectivePlan,wanted):false;if(effectivePlan&&!verified)throw failure('渲染器返回的有效观察计划与请求不一致','capture_mismatch');planVerified.push(verified);
   const png=/^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(f.data||'');if(!png)throw failure('采集必须返回PNG');const bytes=Buffer.from(png[1],'base64');
   if(bytes.length<24||bytes.readUInt32BE(16)!==wanted.width||bytes.readUInt32BE(20)!==wanted.height)throw failure('返回PNG尺寸与请求不一致','capture_mismatch');
   if(wanted.view!=='current'){
    const expected=resolveCamera(f.bounds,{view:wanted.view,camera:wanted.camera||{},aspect:wanted.width/wanted.height,front:f.modelFront||[0,0,1]});
    const same=(a,b)=>Array.isArray(a)?Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i])):typeof a==='number'?typeof b==='number'&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a)):a===b;
    if(['model-and-ground-v1','model-and-ground-v2'].includes(f.renderConfig?.cameraClipping?.policy)){
      const clipping=f.renderConfig.cameraClipping,observed=f.renderConfig.observationStage;
      if(!observed||observed.schemaVersion!==2||JSON.stringify(observed.floor)!==JSON.stringify(f.renderConfig.floor))throw failure('地面裁剪回执不一致','capture_mismatch');
      if(!same(clipping.resolved?.near,expected.near)||!same(clipping.resolved?.far,expected.far))throw failure('原始相机裁剪回执不一致','capture_mismatch');
      const sceneBounds=f.renderConfig.sceneBounds||f.bounds;
      if(!finite3(sceneBounds?.min)||!finite3(sceneBounds?.max)||sceneBounds.min.some((v,i)=>v>sceneBounds.max[i]))throw failure('无效的可见场景包围','capture_mismatch');
      const clip=observationCameraClipping(sceneBounds,expected,observed.floor);
      if(!same(clipping.effective?.near,clip.near)||!same(clipping.effective?.far,clip.far))throw failure('有效相机裁剪回执不一致','capture_mismatch');
      expected.near=clip.near;expected.far=clip.far;
     }
     if(!['eye','target','up','projection','fov','span','near','far','aspect'].every(k=>same(expected[k],f.camera?.[k])))throw failure('返回实际相机与请求机位不一致','capture_mismatch');
   }
  }
  const receipts=frames.map((f,i)=>{const wanted=spec.requests[i];return accept({...f,displayMode:f.displayMode===undefined?wanted.displayMode:f.displayMode,displayModeEchoed:f.displayMode!==undefined,lighting:f.lighting===undefined?wanted.lighting:f.lighting,lightingEchoed:f.lighting!==undefined,effectivePlanVerified:planVerified[i]===true},{observationSelection:spec.observationSelection});});if(r.runtime)for(const receipt of receipts){receipt.runtime=r.runtime;fs.writeFileSync(receipt.path+'.json',JSON.stringify(receipt,null,2));}
  return receipts.length===1?receipts[0]:{captures:receipts,runtime:r.runtime||null,captured:true,reviewed:false};
 }
 function get(id){
   if(typeof id!=='string'||!/^[a-f0-9]{24}$/.test(id))throw failure('需要当前作品的真实evidence ID','invalid_evidence_id');
   const current=snapshot(),folder=path.join(directory,String(current.assetId).replace(/[^a-zA-Z0-9_-]/g,'_')),file=path.join(folder,current.contentHash.slice(0,16)+'-'+id+'.png'),receiptFile=file+'.json';
   if(!fs.existsSync(receiptFile)||!fs.existsSync(file))throw failure('当前版本不存在该图像证据','evidence_not_found');
   const st=fs.lstatSync(receiptFile),im=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>2*1024*1024||!im.isFile()||im.isSymbolicLink()||im.size>16*1024*1024)throw failure('证据文件无效或超预算','invalid_evidence');
   const r=JSON.parse(fs.readFileSync(receiptFile,'utf8'));if(r.id!==id||r.assetId!==current.assetId||r.contentHash!==current.contentHash||r.path!==file)throw failure('证据身份与当前作品不一致','stale_evidence');
   if(expectedBuildId&&r.clientBuildId!==expectedBuildId)throw failure('证据客户端构建已过期','stale_evidence');
   if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==r.imageHash)throw failure('证据图像hash改变','evidence_integrity');return r;
  }
  return {accept,list,capture,get};
}
