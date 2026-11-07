import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {hashContent} from './storage.js';
import {readBoundedBuffer,assertSafePath} from './geometry-cache.js';
import {decodePng} from './png.js';
import {assessMaterialTask,materialTaskTargets,validMaterialRole} from './material-task.js';
import {transformPoint} from './relations.js';
import {resolveMaterialSpec} from './material-source.js';

const HASH=/^[a-f0-9]{64}$/,SCOPES=['working','close'],VERDICTS=['accept','reject','unknown'];
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const copy=v=>JSON.parse(JSON.stringify(v));
const fail=(message,code='invalid_material_review')=>Object.assign(Error(message),{code});
const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const tuple=r=>JSON.stringify([r.assetId,r.contentHash,r.role,r.scope]);
function identity(assetId,contentHash){
 if(typeof assetId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(assetId)||!HASH.test(contentHash||''))throw fail('Exact safe assetId and SHA256 contentHash required.');
}
function input(args,doc){
 if(!record(args))throw fail('Review needs an argument object.');
 const allowed=['assetId','contentHash','role','scope','verdict','note','evidenceId','expectedHash','expectedRevision','expectedAssetId'];
 if(Object.keys(args).some(k=>!allowed.includes(k)))throw fail('Unknown review argument.');
 identity(args.assetId,args.contentHash);
 if(!validMaterialRole(args.role)||!SCOPES.includes(args.scope)||!VERDICTS.includes(args.verdict))throw fail('Review needs exact role, working|close scope and accept|reject|unknown verdict.');
 if(typeof args.note!=='string'||!args.note.trim()||args.note.length>512||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(args.note))throw fail('Review note needs 1..512 printable characters.');
 if(typeof args.evidenceId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(args.evidenceId))throw fail('Exact evidenceId required.');
 if(args.expectedHash!==undefined&&args.expectedHash!==args.contentHash||args.expectedAssetId!==undefined&&args.expectedAssetId!==args.assetId)throw fail('Review baseline differs from current tuple.','conflict');
 if(hashContent(doc)!==args.contentHash)throw fail('Document no longer matches review contentHash.','stale_evidence');
 const task=assessMaterialTask(doc,{assetId:args.assetId,contentHash:args.contentHash,limit:32});
 let row=task.roles.find(r=>r.role===args.role);for(let offset=32;!row&&offset<task.total;offset+=32)row=assessMaterialTask(doc,{assetId:args.assetId,contentHash:args.contentHash,limit:32,offset}).roles.find(r=>r.role===args.role);
 if(!row||row.issues.length||!row.ids.length)throw fail('Role is missing, unused or has inconsistent actual slots.','invalid_review_role');
 return row;
}
function worldPoints(entry){
 const mesh=entry.object.recipe?.params?.mesh,v=mesh?.vertices;
 if(!Array.isArray(v)&&!ArrayBuffer.isView(v))throw fail('Actual target mesh is unavailable.','review_geometry_unknown');
 if(v.length>3000000||v.length%3||!v.length)throw fail('Actual target geometry exceeds review budget.');
 const out=[];for(let i=0;i<v.length;i+=3){const p=transformPoint(Array.from(v.slice(i,i+3)),entry.matrix);if(!finite3(p))throw fail('Target geometry is not finite.');out.push(p);}return out;
}
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v);if(!n)throw fail('Camera direction is degenerate.');return v.map(x=>x/n);};
function camera(receipt){
 const c=receipt.camera;if(!finite3(c?.eye)||!finite3(c?.target)||!Number.isFinite(c.fov)||c.fov<=0||c.fov>=179||!['perspective','orthographic'].includes(c.projection))throw fail('Evidence lacks an actual physical camera.');
 const distance=Math.hypot(...sub(c.eye,c.target));if(!distance)throw fail('Camera eye equals target.');
 const span=c.projection==='orthographic'?c.span:2*distance*Math.tan(c.fov*Math.PI/360);
 if(!Number.isFinite(span)||span<=0||c.span!==undefined&&(!Number.isFinite(c.span)||c.span<=0))throw fail('Camera physical span is unknown.');
 const front=unit(sub(c.target,c.eye)),up=unit(c.up??[0,1,0]),right=unit(cross(front,up)),vertical=unit(cross(right,front));
 return {span,front,right,vertical,aspect:receipt.width/receipt.height};
}
function projectionContains(receipt,c,p,tolerance=1.01){
 const v=sub(p,receipt.camera.eye),depth=dot(v,c.front);if(depth<=0)return false;
 const span=receipt.camera.projection==='orthographic'?c.span:2*depth*Math.tan(receipt.camera.fov*Math.PI/360);
 if(Number.isFinite(receipt.camera.near)&&depth<receipt.camera.near||Number.isFinite(receipt.camera.far)&&depth>receipt.camera.far)return false;
 return Math.abs(dot(v,c.right))<=span*c.aspect/2*tolerance&&Math.abs(dot(v,c.vertical))<=span/2*tolerance;
}
function validateEvidence(receipt,args,role,doc,expectedBuildId){
 if(!record(receipt)||receipt.id!==args.evidenceId||receipt.assetId!==args.assetId||receipt.contentHash!==args.contentHash)throw fail('Evidence asset/hash/id differs from the current tuple.','stale_evidence');
 if(expectedBuildId!==null&&receipt.clientBuildId!==expectedBuildId)throw fail('Evidence belongs to a different client build.','stale_evidence');
 if(args.expectedRevision!==undefined&&receipt.revision!==args.expectedRevision)throw fail('Evidence revision differs from the guarded baseline.','stale_evidence');
 if(receipt.mode!=='material'||receipt.captured!==true||receipt.preview===true||receipt.source==='preview'||receipt.candidateId!=null||receipt.candidateHash!=null||receipt.renderConfig?.preview===true||receipt.section!=null)throw fail('Only current, unsectioned PBR scene evidence can be reviewed.','review_requires_pbr');
 if(receipt.source!==undefined&&!['isolated','isolated-webgl','viewport'].includes(receipt.source))throw fail('Preview or unknown evidence source is not reviewable.','review_requires_pbr');
 if(!HASH.test(receipt.imageHash||'')||typeof receipt.path!=='string'||!path.isAbsolute(receipt.path)||receipt.path.length>4096)throw fail('Evidence needs its owned absolute regular PNG file.');
 const bytes=readBoundedBuffer(receipt.path,16*1024*1024);
 if(digest(bytes)!==receipt.imageHash)throw fail('Evidence PNG bytes no longer match its immutable receipt.','evidence_integrity');
 let image;try{image=decodePng(bytes,{strict:true,maxPixels:16*1024*1024});}catch(error){throw fail('Evidence PNG cannot be strictly decoded: '+error.message,'evidence_integrity');}
 if(image.width!==receipt.width||image.height!==receipt.height||image.width<32||image.height<32||image.width>4096||image.height>4096)throw fail('Evidence dimensions differ from its PNG.','evidence_integrity');
 const c=camera(receipt),{leaves,entries}=materialTaskTargets(doc),targets=leaves.filter(e=>role.ids.includes(e.object.id));
 if(args.scope==='working'){
  if(receipt.isolate!=null||receipt.context?.length)throw fail('Working review requires the full scene without isolation.','review_scope_mismatch');
  for(const entry of leaves)if(worldPoints(entry).some(p=>!projectionContains(receipt,c,p)))throw fail('Working camera does not cover every visible part.','review_coverage_missing');
 }else{
  let selected=targets;
  if(receipt.isolate!=null){
   const isolated=entries.get(receipt.isolate);if(!isolated||!isolated.visible)throw fail('Close isolate is not a current visible role target.','review_scope_mismatch');
   const visible=leaves.filter(e=>e.object.id===receipt.isolate||e.ancestors.some(a=>a.id===receipt.isolate));
   if(!visible.length||visible.some(e=>!role.ids.includes(e.object.id)))throw fail('Close isolate contains a different material role.','review_scope_mismatch');selected=visible;
  }
  let targetHit=false;for(const entry of selected){
   const points=worldPoints(entry),mesh=entry.object.recipe.params.mesh;
   if(!Array.isArray(mesh.indices)&&!ArrayBuffer.isView(mesh.indices))throw fail('Close target actual triangle membership is unknown.');
   if(mesh.indices.length>3000000||mesh.indices.length%3)throw fail('Close target triangle budget exceeded.');
   for(let i=0;i<mesh.indices.length;i+=3){const slot=mesh.triangleMaterialIndices?.[i/3]??0,actual=resolveMaterialSpec(doc,entry.object.materialSlots?.[slot]||entry.object.material||{});if(hashContent(actual)!==role.specHash)continue;const tri=Array.from(mesh.indices.slice(i,i+3)).map(n=>points[n]);if(tri.some(p=>!p))throw fail('Invalid target mesh index.');
    const q=closestPoint(receipt.camera.target,...tri);if(Math.hypot(...sub(q,receipt.camera.target))<=Math.max(1e-6,c.span*1e-4)&&projectionContains(receipt,c,q)){targetHit=true;break;}
   }if(targetHit)break;
  }
  if(!targetHit)throw fail('Close camera target is not on an actual visible role surface.','review_target_mismatch');
 }
 return {physicalSpan:c.span,width:image.width,height:image.height};
}
// Imported below for a bounded, exact triangle-membership test (no AABB substitute).
import {closestPointOnTriangle as closestPoint} from './spatial-query.js';

/** One bounded sidecar, keyed by asset/hash/role/scope. No document/evidence writes. */
export function createMaterialReviewStore({directory,evidenceLookup,expectedBuildId=null}={}){
 if(typeof directory!=='string'||!directory||typeof evidenceLookup!=='function')throw fail('directory and evidenceLookup are required.');
 if(expectedBuildId!==null&&(typeof expectedBuildId!=='string'||!expectedBuildId||expectedBuildId.length>256))throw fail('expectedBuildId must be a short build id.');
 const root=path.resolve(directory),file=path.join(root,'material-reviews-v1.json');assertSafePath(root);
 const read=()=>{
  let data;try{data=readBoundedBuffer(file,2*1024*1024);}catch(error){if(!fs.existsSync(file))return {rows:[],ref:null};throw error;}
  let parsed;try{parsed=JSON.parse(data.toString('utf8'));}catch{throw fail('Review sidecar is invalid JSON.','review_store_integrity');}
  if(parsed?.version!==1||!Array.isArray(parsed.rows)||parsed.rows.length>512)throw fail('Review sidecar schema or row budget is invalid.','review_store_integrity');
  const seen=new Set();for(const row of parsed.rows){identity(row?.assetId,row?.contentHash);if(!validMaterialRole(row.role)||!SCOPES.includes(row.scope)||seen.has(tuple(row)))throw fail('Review sidecar contains invalid or duplicate tuple.','review_store_integrity');seen.add(tuple(row));}
  return {rows:parsed.rows,ref:digest(data)};
 };
 const list=({assetId,contentHash}={})=>{if(assetId!==undefined&&(typeof assetId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(assetId)))throw fail('Invalid assetId.');if(contentHash!==undefined&&!HASH.test(contentHash))throw fail('Invalid contentHash.');return copy(read().rows.filter(r=>(assetId===undefined||r.assetId===assetId)&&(contentHash===undefined||r.contentHash===contentHash)&&(expectedBuildId===null||r.evidence?.clientBuildId===expectedBuildId)));};
 async function review(args,doc){
  const role=input(args,doc),baseline=read();
  const looked=await evidenceLookup(args.evidenceId,{assetId:args.assetId,contentHash:args.contentHash});
  const receipt=looked?.receipt?{...looked.receipt,...(looked.path?{path:looked.path}:{})}:looked;
  const checked=validateEvidence(receipt,args,role,doc,expectedBuildId);
  input(args,doc);if(read().ref!==baseline.ref)throw fail('Review sidecar changed while evidence was being checked.','conflict');
  const evidence={id:receipt.id,assetId:receipt.assetId,contentHash:receipt.contentHash,imageHash:receipt.imageHash,mode:receipt.mode,clientBuildId:receipt.clientBuildId??null};
  const row={version:1,assetId:args.assetId,contentHash:args.contentHash,role:args.role,specHash:role.specHash,scope:args.scope,verdict:args.verdict,note:args.note.trim(),evidenceId:args.evidenceId,imageHash:receipt.imageHash,mode:'material',...checked,assertion:'authored',validated:true,evidence,reviewedAt:new Date().toISOString()};
  const rows=baseline.rows.filter(r=>tuple(r)!==tuple(row));rows.push(row);while(rows.length>512)rows.shift();
  assertSafePath(root);fs.mkdirSync(root,{recursive:true});assertSafePath(file);
  const temp=path.join(root,'material-reviews-'+crypto.randomUUID()+'.tmp'),lock=path.join(root,'material-reviews-v1.lock');let locked=false;
  try{const fd=fs.openSync(lock,'wx',0o600);locked=true;fs.closeSync(fd);if(read().ref!==baseline.ref)throw fail('Review store changed before publication.','conflict');
   const serialized=JSON.stringify({version:1,rows});if(Buffer.byteLength(serialized)>2*1024*1024-1)throw fail('Review metadata exceeds2MiB bounded budget.','review_store_budget');fs.writeFileSync(temp,serialized+'\n',{flag:'wx',mode:0o600});fs.renameSync(temp,file);
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);if(locked)fs.unlinkSync(lock);}
  return {version:1,review:copy(row),changedCanonical:false,note:'Explicit authored observation assertion; not automatic visual certification.'};
 }
 async function validate(query,doc){
   identity(query.assetId,query.contentHash);if(hashContent(doc)!==query.contentHash)throw fail('Current completion document hash changed.','stale_evidence');const baseline=read(),rows=list(query),groups=new Map(),issues=[],taskRoles=new Map();
   for(let offset=0;;offset+=32){const task=assessMaterialTask(doc,{...query,limit:32,offset});for(const role of task.roles)taskRoles.set(role.role,role);if(task.nextOffset===null)break;}
   for(const row of rows){const role=taskRoles.get(row.role);if(!role?.used||row.verdict!=='accept')continue;const key=JSON.stringify([row.evidenceId,row.scope,row.scope==='close'?row.role:'*']);if(!groups.has(key)){try{const looked=await evidenceLookup(row.evidenceId,query),receipt=looked?.receipt?{...looked.receipt,...(looked.path?{path:looked.path}:{})}:looked;validateEvidence(receipt,{...query,evidenceId:row.evidenceId,scope:row.scope},role,doc,expectedBuildId);groups.set(key,null);}catch(error){groups.set(key,{code:error.code||'evidence_invalid',message:error.message});}}const issue=groups.get(key);if(issue){row.validated=false;issues.push({role:row.role,scope:row.scope,evidenceId:row.evidenceId,...issue});}}
   if(read().ref!==baseline.ref)throw fail('Observation verdicts changed during completion validation.','conflict');return {rows,issues,scope:'Revalidated current accepted PNG bytes, tuple, renderer build and physical observation scope without rewriting observations.'};
  }
  return {review,list,validate};
}
