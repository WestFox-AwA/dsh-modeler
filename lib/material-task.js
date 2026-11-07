import {hashContent} from './storage.js';
import {compileMaterialIntent} from './material-intent.js';
import {resolveMaterialSpec,renderMaterialSpec,validateMaterialSpec,materialBakeFingerprint} from './material-source.js';
import {materialDetailKey,materialDetailChannels} from './material-detail.js';
import {identityMatrix,objectMatrix,multiplyMatrix,transformPoint} from './relations.js';

// Host-only. Assessment reads canonical source/cache metadata; it does not render or mutate.
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const HASH=/^[a-f0-9]{64}$/;
const ROLE=/^[A-Za-z0-9_-]{1,64}$/;
const FORBIDDEN=new Set(['__proto__','prototype','constructor']);
const problem=(code,message,extra={})=>({code,message,...extra});
const fail=(message,code='invalid_material_task')=>Object.assign(Error(message),{code});
const array=v=>Array.isArray(v)||ArrayBuffer.isView(v);
const fingerprint=v=>hashContent(v);
const jsonEqual=(a,b)=>fingerprint(a)===fingerprint(b);
export const MATERIAL_TASK_STATES=Object.freeze(['DRAFT','NEEDS_MATERIALS','NEEDS_REPAIR','NEEDS_OBSERVATION','REVIEW_FAILED','READY']);
export const validMaterialRole=role=>typeof role==='string'&&ROLE.test(role)&&!FORBIDDEN.has(role);

/** Visible source leaves, honoring ancestor visibility. Hidden Boolean operands stay excluded. */
export function materialTaskTargets(doc){
 if(!record(doc)||!Array.isArray(doc.objects))throw fail('doc.objects must be an array');
 const leaves=[],entries=new Map();let count=0;
 const walk=(xs,parent,visible,ancestors,depth)=>{
  if(depth>64||!Array.isArray(xs))throw fail('invalid or overdeep object hierarchy');
  for(const object of xs){
   if(++count>65536||!record(object))throw fail('invalid object or hierarchy budget');
   if(typeof object.id!=='string'||!object.id||entries.has(object.id))throw fail('objects require unique exact ids');
   const matrix=multiplyMatrix(parent,objectMatrix(object)),shown=visible&&object.visible!==false&&object.hidden!==true;
   const entry={object,matrix,visible:shown,ancestors};entries.set(object.id,entry);
   if(object.parts!==undefined)walk(object.parts,matrix,shown,[...ancestors,object],depth+1);
   else if(shown)leaves.push(entry);
  }
 };
 walk(doc.objects,identityMatrix(),true,[],0);return {leaves,entries};
}
function usedSlots(object){
 const slots=Array.isArray(object.materialSlots)&&object.materialSlots.length?object.materialSlots:[object.material??{}];
 if(slots.length>256)throw fail('material slot budget exceeded');
 const mesh=object.recipe?.params?.mesh,indices=mesh?.triangleMaterialIndices,total=mesh?.indices?.length/3;
 if(array(indices)&&Number.isSafeInteger(total)&&indices.length===total){
  const used=[...new Set(indices)];
  if(used.some(n=>!Number.isSafeInteger(n)||n<0||n>=slots.length))return {rows:slots.map((input,slot)=>({input,slot})),issue:problem('INVALID_SLOT_ASSIGNMENT','Actual triangle material index is outside the slot table.')};
  return {rows:used.sort((a,b)=>a-b).map(slot=>({input:slots[slot],slot})),issue:null};
 }
 return {rows:slots.map((input,slot)=>({input,slot})),issue:slots.length>1?problem('SLOT_ASSIGNMENT_UNKNOWN','Multiple material slots lack exact actual triangle assignments.'):null};
}

// Constant propagation follows the active DAG, including mix endpoints and zero masks.
// Symbolic expression identity also discards overwritten or equal-valued layers.
function surfaceRequirements(surface,spec={}){
 const memo=new Map(),active=new Set(),spatial=new Map();
 const constant=value=>({value,key:JSON.stringify(value),uses:new Set()});
 const variable=(key,...args)=>({value:null,key,uses:new Set(args.flatMap(x=>[...x.uses]))});
 const same=(a,b)=>a.key===b.key;
 const sig=name=>{
  if(typeof name==='number')return constant(name);
  if(memo.has(name))return memo.get(name);
  const s=surface.signals?.[name];if(!s||active.has(name))throw fail('source references missing or cyclic signal');
  active.add(name);let out;
  if(s.type==='constant')out=constant(s.value);
  else if(s.type==='mix')out=mix(sig(s.a),sig(s.b),mask(s.factor));
  else if(s.type==='ramp')out=remap(sig(s.input),s.min??0,s.max??1,s.invert===true);
  else if(['noise','voronoi','wave','weave','image'].includes(s.type)){
   out={value:null,key:'signal:'+name,uses:new Set([name])};spatial.set(name,s);
  }else throw fail('unknown source signal type');
  active.delete(name);memo.set(name,out);return out;
 };
 const remap=(v,min,max,invert=false)=>{
  if(v.value!==null){const n=Math.max(0,Math.min(1,(v.value-min)/(max-min)));return constant(invert?1-n:n);}
  return variable(JSON.stringify(['remap',v.key,min,max,invert]),v);
 };
 const mask=(v=1)=>typeof v==='number'?constant(v):remap(sig(v.signal),v.min??0,v.max??1,v.invert===true);
 const mix=(a,b,f)=>{
  if(f.value===0||same(a,b))return a;if(f.value===1)return b;
  if(a.value!==null&&b.value!==null&&f.value!==null&&typeof a.value==='number'&&typeof b.value==='number')return constant(a.value+(b.value-a.value)*f.value);
  return variable(JSON.stringify(['mix',a.key,b.key,f.key]),a,b,f);
 };
 const scalar=v=>typeof v==='number'?constant(v):v.min===v.max?constant(v.min):mix(constant(v.min),constant(v.max),sig(v.signal));
 const color=v=>typeof v==='string'?constant(v):v.a===v.b?constant(v.a):mix(constant(v.a),constant(v.b),sig(v.signal));
 const values={baseColor:constant(spec.color??'#b3b3b3'),roughness:constant(spec.roughness??.5),metalness:constant(spec.metalness??.1),clearcoat:constant(spec.clearcoat??0),clearcoatRoughness:constant(spec.clearcoatRoughness??0),normal:constant(0)};
 for(const l of surface.layers||[]){
  const m=mask(l.mask);if(m.value===0)continue;
  for(const key of ['color','roughness','metalness','clearcoat','clearcoatRoughness'])if(l[key]!==undefined){const c=key==='color'?'baseColor':key;values[c]=mix(values[c],key==='color'?color(l[key]):scalar(l[key]),m);}
  if(l.height?.amplitude>0){const h=sig(l.height.signal);if(h.uses.size||m.uses.size)values.normal=variable(JSON.stringify(['height',values.normal.key,h.key,m.key,l.height.amplitude]),values.normal,h,m);}
 }
 const requirements=[];
 for(const [channel,value]of Object.entries(values))if(value.uses.size)requirements.push({channel,signals:[...value.uses].map(name=>({name,...spatial.get(name)}))});
 return requirements;
}
function requirements(spec){
 const rows=[];for(const domain of ['atlas','detail']){const surface=domain==='detail'?spec.detail?.surface:spec.surface;if(surface)for(const r of surfaceRequirements(surface,spec))rows.push({...r,domain});}
 if(spec.procedural)for(const c of ['baseColor','roughness',...(spec.procedural.bumpDistance?['normal']:[])])rows.push({channel:c,domain:'atlas',signals:[{name:'procedural',type:spec.procedural.type}],unknown:true});
 return rows;
}
function validateRole(role,definition,doc){
 const issues=[];
 if(!validMaterialRole(role)||!record(definition))return [problem('INVALID_ROLE','Role definitions require a stable 1..64 ASCII identifier and object.')];
 try{
  const allowed=['id','role','kind','recipe','reason','source','sourceHash','specHash','spec','specSource','materialId','recipeVersion','options','semantics','plan'];
  if(Object.keys(definition).some(k=>!allowed.includes(k)))issues.push(problem('INVALID_ROLE_FIELDS','Role definition contains unknown fields.'));
  const compiled=compileMaterialIntent(definition.source,{recipeVersion:definition.recipeVersion});
  if(definition.id!==role||compiled.id!==role||compiled.kind!==definition.kind||compiled.specHash!==definition.specHash||compiled.sourceHash!==definition.sourceHash||definition.kind==='process'&&compiled.recipeVersion!==definition.recipeVersion)issues.push(problem('ROLE_COMPILE_MISMATCH','Registered role differs from its exact canonical compiled source.'));
  if(!record(definition.spec)||fingerprint(validateMaterialSpec(definition.spec))!==definition.specHash)issues.push(problem('ROLE_SPEC_HASH_MISMATCH','Stored role spec does not match its canonical fingerprint.'));
  if(definition.kind==='uniform'&&(definition.reason!==compiled.reason||definition.source.reason!==compiled.reason))issues.push(problem('INVALID_UNIFORM_INTENT','Uniform intent needs its exact optical source and explicit reason.'));
  if(definition.kind==='process'&&definition.recipe!==compiled.recipe)issues.push(problem('PROCESS_MECHANISM_MISSING','Process recipe differs from its compiled mechanism source.'));
  const entry=doc.meta?.materialLibrary?.materials?.[definition.materialId];
  if(typeof definition.materialId!=='string'||!entry||fingerprint(entry.spec)!==definition.specHash||entry.hash!==definition.specHash||!Number.isSafeInteger(entry.revision)||entry.revision<1)issues.push(problem('ROLE_LIBRARY_MISMATCH','Role library entry is missing or differs from the expected concrete source.'));
 }catch(error){issues.push(problem('INVALID_ROLE_SOURCE',error.message));}
 return issues;
}
function fidelityFor(doc,object,slot,spec,required){
 const issues=[],p=object.recipe?.params||{},bake=doc.meta?.materialBakes?.[object.id];
 const add=(code,message,extra={})=>issues.push(problem(code,message,{id:object.id,slot,...extra}));
 let rendered;
 try{rendered=renderMaterialSpec(doc,object.materialSlots?.length?object.materialSlots[slot]:object.material??{}, {objectId:object.id,sourceHash:p.sourceHash,topologyStamp:p.topologyStamp});}
 catch(error){add(error.code||'MATERIAL_RENDER_UNAVAILABLE',error.message);return issues;}
 for(const [channel,t]of Object.entries(rendered.textures||{})){
  const image=doc.meta?.materialLibrary?.images?.[t.image];
  if(!HASH.test(t.image||'')||!record(image)||image.hash!==t.image||!Number.isSafeInteger(image.width)||image.width<1||!Number.isSafeInteger(image.height)||image.height<1||image.mime!==undefined&&image.mime!=='image/png')add('RENDER_IMAGE_UNAVAILABLE','Rendered texture is missing a valid published image descriptor.',{channel});
 }
 if(!required.length)return issues;
 let detail=null;try{if(spec.detail)detail=doc.meta?.materialDetails?.[materialDetailKey(spec)];}catch(error){add('DETAIL_SOURCE_INVALID',error.message);}
 const sampling=bake?.fidelity?.sampling;
 for(const req of required){
  const {channel,domain}=req,cache=domain==='detail'?detail:bake,outputs=cache?.outputs,measurement=domain==='detail'?cache?.fidelity:cache?.fidelity?.outputs;
  if(!p.sourceHash||!p.topologyStamp||bake?.sourceHash!==p.sourceHash||bake?.topologyStamp!==p.topologyStamp||bake?.appearanceKey!==materialBakeFingerprint(doc,object.id))add('STALE_FIDELITY_CACHE','Source sampling is not bound to current source, topology and appearance.',{channel,domain});
  const output=Array.isArray(outputs)?outputs.find(o=>o.channel===channel):null;
  if(!output||output.image!==rendered.textures?.[channel]?.image)add('REQUIRED_OUTPUT_MISSING','Active varying channel has no exact rendered output.',{channel,domain});
  const measured=measurement?.channels?.find(c=>c.channel===channel);
  if(!measurement||measurement.complete!==true||['unknown','insufficient','requestedVariationLost'].includes(measurement.status)||!measured||measured.status!=='sufficient'||measured.width!==output?.width||measured.height!==output?.height)add('CHANNEL_FIDELITY_UNPROVEN','Active varying channel needs current sufficient effective pixel measurements.',{channel,domain,status:measured?.status||measurement?.status||'unknown'});
  const activeSignals=req.signals.filter(s=>['noise','voronoi','wave','weave','image'].includes(s.type));
  if(req.unknown||!sampling||sampling.complete!==true||['unknown','insufficient','requestedVariationLost'].includes(sampling.status))add('SAMPLING_UNPROVEN','Active process sampling is missing, insufficient or unknown.',{channel,domain,status:sampling?.status||'unknown'});
  for(const s of activeSignals){const samples=sampling?.signals?.filter(r=>r.signal===s.name&&r.domain===domain&&(r.materialIndex===slot||r.materialIndex===null)&&r.channels?.includes(channel));
   if(!samples?.length||samples.some(r=>r.status!=='sufficient'))add('SIGNAL_SAMPLING_UNPROVEN','An active source signal lacks sufficient physical sampling.',{channel,domain,signal:s.name,status:samples?.[0]?.status||'unknown'});
  }
 }
 return issues;
}
function reviewRows(reviews,assetId,contentHash){
 if(reviews===undefined||reviews===null)return [];
 const rows=Array.isArray(reviews)?reviews:typeof reviews.list==='function'?reviews.list({assetId,contentHash}):null;
 if(!Array.isArray(rows)||rows.length>512)throw fail('reviews must be at most 512 plain review rows or a store with synchronous list({assetId,contentHash})');
 return rows;
}
function observation(rows,assetId,contentHash,role,scope,specHash){
 const candidates=rows.filter(r=>record(r)&&r.assetId===assetId&&r.contentHash===contentHash&&r.role===role&&r.scope===scope);
 if(!candidates.length)return {status:'missing'};
 const row=candidates.at(-1);
 const valid=row.version===1&&row.assertion==='authored'&&row.validated===true&&row.specHash===specHash&&['accept','reject','unknown'].includes(row.verdict)&&typeof row.note==='string'&&row.note.trim()&&row.note.length<=512&&typeof row.evidenceId==='string'&&row.evidenceId.length>0&&row.evidenceId.length<=128&&HASH.test(row.imageHash||'')&&row.mode==='material'&&Number.isFinite(row.physicalSpan)&&row.physicalSpan>0&&row.evidence?.assetId===assetId&&row.evidence?.contentHash===contentHash&&row.evidence?.id===row.evidenceId&&row.evidence?.imageHash===row.imageHash&&row.evidence?.mode==='material';
 return valid?{status:row.verdict==='accept'?'accepted':row.verdict==='reject'?'rejected':'unknown',evidenceId:row.evidenceId,note:row.note,physicalSpan:row.physicalSpan}:{status:'invalid',code:'REVIEW_EVIDENCE_REQUIRED'};
}

/** Pure synchronous material readiness. Reviews never imply automatic visual certification. */
export function assessMaterialTask(doc,{contentHash,assetId,reviews,limit=8,offset=0}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>32||!Number.isSafeInteger(offset)||offset<0)throw fail('limit must be 1..32 and offset nonnegative');
 const {leaves}=materialTaskTargets(doc),enabled=doc.meta?.materialTask?.version===1&&doc.meta.materialTask.enabled===true;
 const issues=[],roles=[],unclassified=new Map(),definitions=doc.meta?.materialRoles;
 if(definitions!==undefined&&(!record(definitions)||definitions.version!==1||!record(definitions.roles)||Object.keys(definitions).some(k=>!['version','roles'].includes(k))))issues.push(problem('INVALID_ROLE_TABLE','materialRoles must be the version 1 role table.'));
 const table=record(definitions?.roles)?definitions.roles:{};
 if(Object.keys(table).length>256)throw fail('role table exceeds 256 source roles');
 const byRole=new Map();
 for(const [role,d]of Object.entries(table)){
  const row={role,kind:d?.kind??null,materialId:d?.materialId??null,specHash:d?.specHash??null,ids:[],state:'NEEDS_OBSERVATION',coverage:{validSlots:0,totalSlots:0},requiredChannels:[],fidelityIssues:[],issues:validateRole(role,d,doc),observations:{working:{status:'missing'},close:{status:d?.kind==='uniform'?'not-required':'missing'}},next:[]};
  roles.push(row);byRole.set(role,row);
 }
 const rows=reviewRows(reviews,assetId,contentHash);let visibleSlots=0,classifiedLeaves=0;
 for(const {object}of leaves){
  const {rows:slots,issue}=usedSlots(object);visibleSlots+=slots.length;let allClassified=slots.length>0;
  const classify=(input,slot)=>{let spec,kind='unknown',specHash=null;try{spec=validateMaterialSpec(resolveMaterialSpec(doc,input));specHash=fingerprint(spec);kind=spec.surface||spec.detail||spec.procedural?'process':Object.keys(spec.textures||{}).length?'image':'constant';}catch{}
   const key=kind+':'+specHash,group=unclassified.get(key)||{kind,specHash,ids:[],slots:[]};if(!group.ids.includes(object.id))group.ids.push(object.id);group.slots.push({id:object.id,slot});unclassified.set(key,group);
  };
  for(const {input,slot}of slots){
   let actualHash=null;try{actualHash=fingerprint(resolveMaterialSpec(doc,input));}catch{}
   const tracked=object.meta?.materialIntents;
   const direct=record(tracked)&&own(tracked,'slot:'+slot)?tracked['slot:'+slot]:undefined;
   const featureCandidates=record(tracked)?Object.entries(tracked).filter(([key,v])=>key.startsWith('feature:')&&v?.specHash===actualHash).map(([,v])=>v):[];
   const candidateRoles=new Set(featureCandidates.map(v=>v?.role));
   const intent=direct??(candidateRoles.size===1?featureCandidates[0]:undefined)??object.meta?.materialIntent;
   const role=validMaterialRole(intent?.role)?byRole.get(intent.role):null;
   if(!role){allClassified=false;if(intent!==undefined)issues.push(problem('ORPHAN_MATERIAL_INTENT','Visible used slot intent has no valid role definition.',{id:object.id,slot,role:intent?.role??null}));classify(input,slot);continue;}
   if(!role.ids.includes(object.id))role.ids.push(object.id);role.coverage.totalSlots++;
   if(issue)role.issues.push({...issue,id:object.id});
   const definition=table[intent.role];
   if(intent.version!==1||intent.kind!==definition.kind||intent.materialId!==definition.materialId||intent.specHash!==definition.specHash||intent.sourceHash!==definition.sourceHash||!record(intent.source)||fingerprint(intent.source)!==definition.sourceHash)role.issues.push(problem('OWNER_INTENT_MISMATCH','Owner intent does not match the role spec/source fingerprint.',{id:object.id,slot}));
   try{
    const spec=validateMaterialSpec(resolveMaterialSpec(doc,input));
    if(actualHash!==definition.specHash){role.issues.push(problem('SLOT_SPEC_HASH_MISMATCH','Actual resolved used slot differs from the declared role source.',{id:object.id,slot,actualHash,expectedHash:definition.specHash}));continue;}
    role.coverage.validSlots++;const required=requirements(spec);for(const r of required)if(!role.requiredChannels.includes(r.channel))role.requiredChannels.push(r.channel);
    role.fidelityIssues.push(...fidelityFor(doc,object,slot,spec,definition.kind==='process'?required:[]));
   }catch(error){role.issues.push(problem(error.code||'INVALID_USED_SLOT',error.message,{id:object.id,slot}));}
  }
  if(allClassified)classifiedLeaves++;
 }
 for(const role of roles){
  if(!role.ids.length){role.used=false;role.state='DRAFT';role.issues.push(problem('UNUSED_ROLE','Role has no current visible leaf targets; retained declaration is not active coverage.'));continue;}role.used=true;
  if(!assetId||!HASH.test(contentHash||''))role.issues.push(problem('TASK_IDENTITY_REQUIRED','Current assetId and canonical contentHash are required for observation readiness.'));
  role.observations.working=observation(rows,assetId,contentHash,role.role,'working',role.specHash);
  const definition=table[role.role],hasSpatialSource=role.requiredChannels.length>0||Object.keys(definition?.spec?.textures||{}).length>0||!!definition?.spec?.procedural;role.requiresClose=role.kind==='process'&&hasSpatialSource;role.requiredObservationScopes=role.requiresClose?['working','close']:['working'];const close=observation(rows,assetId,contentHash,role.role,'close',role.specHash);role.observations.close=role.requiresClose||close.status==='rejected'?close:{status:'not-required',reason:'Declared source is spatially uniform; no microscopic structure is required.',...(close.status!=='missing'?{optionalStatus:close.status,...(close.evidenceId?{evidenceId:close.evidenceId}:{})}: {})};
  const observations=Object.values(role.observations);
  role.state=role.issues.length||role.fidelityIssues.length?'NEEDS_REPAIR':observations.some(r=>r.status==='rejected')?'REVIEW_FAILED':observations.every(r=>['accepted','not-required'].includes(r.status))?'READY':'NEEDS_OBSERVATION';
  role.next=role.state==='NEEDS_REPAIR'?[{op:'get',id:role.materialId,role:role.role},{op:'fidelity',id:role.ids[0]??null}]:role.state==='READY'?[]:observations.flatMap((r,i)=>['accepted','not-required'].includes(r.status)?[]:[{op:'inspect_roles',role:role.role,scope:i?'close':'working'}]);
 }
 const activeRoles=roles.filter(r=>r.used),unclassifiedRows=[...unclassified.values()];
 if(contentHash!==undefined&&contentHash!==fingerprint(doc))issues.push(problem('STALE_TASK_HASH','contentHash does not identify the assessed document.'));
 if(assetId!==undefined&&(typeof assetId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(assetId)))issues.push(problem('INVALID_TASK_ASSET','assetId must be an exact stable asset identifier.'));
 const state=!enabled?'DRAFT':issues.length||activeRoles.some(r=>r.state==='NEEDS_REPAIR')?'NEEDS_REPAIR':unclassifiedRows.length||!leaves.length?'NEEDS_MATERIALS':activeRoles.some(r=>r.state==='REVIEW_FAILED')?'REVIEW_FAILED':activeRoles.some(r=>r.state!=='READY')||!activeRoles.length?'NEEDS_OBSERVATION':'READY';
 const page=roles.slice(offset,offset+limit),nextOffset=offset+page.length<roles.length?offset+page.length:null;
 return {version:1,assetId:assetId??null,contentHash:contentHash??null,enabled,state,ready:state==='READY',counts:{visibleLeaves:leaves.length,visibleSlots,classifiedLeaves,unclassifiedLeaves:leaves.length-classifiedLeaves,roles:activeRoles.length,unusedRoles:roles.length-activeRoles.length,processRoles:activeRoles.filter(r=>r.kind==='process').length,uniformRoles:activeRoles.filter(r=>r.kind==='uniform').length,readyRoles:roles.filter(r=>r.state==='READY').length},roles:page,unclassified:unclassifiedRows,issues,total:roles.length,offset,nextOffset,next:unclassifiedRows.length?[{op:'recipes',reason:'Declare process or intentional uniform for every visible leaf.'}]:roles.filter(r=>r.state!=='READY').flatMap(r=>r.next).slice(0,8),note:'Read-only source, delivery and evidence-backed authored review status; no automatic aesthetic certification.'};
}


/** Read-only representative physical face camera. Capture remains the parent's job. */
export function proposeRoleCamera(doc,role,{span}={}){
 if(!validMaterialRole(role))throw fail('role must be a stable 1..64 ASCII identifier');
 if(span!==undefined&&(!Number.isFinite(span)||span<=0||span>1000000))throw fail('span must be positive finite metres');
 const definition=doc.meta?.materialRoles?.roles?.[role];
 if(!definition||validateRole(role,definition,doc).length)throw fail('Role does not have a valid exact compiled source.','invalid_material_role');
 const {leaves}=materialTaskTargets(doc);let best=null,triangles=0;
 for(const entry of leaves){
  const object=entry.object,{rows}=usedSlots(object),allowed=new Set();
  for(const {input,slot}of rows){let hash;try{hash=fingerprint(resolveMaterialSpec(doc,input));}catch{continue;}
   const intents=[object.meta?.materialIntents?.['slot:'+slot],...Object.entries(object.meta?.materialIntents||{}).filter(([key])=>key.startsWith('feature:')).map(([,v])=>v),object.meta?.materialIntent];
   if(hash===definition.specHash&&intents.some(i=>i?.version===1&&i.role===role&&i.specHash===hash&&i.sourceHash===definition.sourceHash&&record(i.source)&&fingerprint(i.source)===definition.sourceHash))allowed.add(slot);
  }
  if(!allowed.size)continue;const mesh=object.recipe?.params?.mesh;
  if(!array(mesh?.vertices)||!array(mesh?.indices)||mesh.indices.length%3)continue;
  const faces=new Map();for(let i=0;i<mesh.indices.length;i+=3){
   if(++triangles>262144)throw fail('Representative face triangle budget exceeded.','material_camera_budget');
   const slot=mesh.triangleMaterialIndices?.[i/3]??0;if(!allowed.has(slot))continue;
   const points=Array.from(mesh.indices.slice(i,i+3)).map(n=>transformPoint(Array.from(mesh.vertices.slice(n*3,n*3+3)),entry.matrix));
   if(points.some(p=>p.length!==3||p.some(n=>!Number.isFinite(n))))throw fail('Representative target geometry is invalid.');
   const a=points[0],u=points[1].map((n,k)=>n-a[k]),v=points[2].map((n,k)=>n-a[k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],area=Math.hypot(...cross)/2;if(!area)continue;
   const face=mesh.faceIds?.[i/3]??i/3,key=String(face),row=faces.get(key)||{id:object.id,face,area:0,triangles:[],normal:[0,0,0]};row.area+=area;row.triangles.push({points,area,index:i/3});for(let k=0;k<3;k++)row.normal[k]+=cross[k];faces.set(key,row);
  }
  for(const row of faces.values())if(!best||row.area>best.area)best=row;
 }
 if(!best)throw fail('No actual visible role face is available.','material_camera_unavailable');
 // The centroid of the largest triangle remains on a nonconvex face, unlike its AABB center.
 const triangle=best.triangles.reduce((a,b)=>b.area>a.area?b:a),target=[0,1,2].map(k=>triangle.points.reduce((s,p)=>s+p[k],0)/3),normal=best.normal,n=Math.hypot(...normal);
 if(!n)throw fail('Representative face normal is unknown.');for(let k=0;k<3;k++)normal[k]/=n;
 const periods=[];for(const req of requirements(definition.spec))for(const signal of req.signals)if(Number.isFinite(signal.wavelength)&&signal.wavelength>0){const mapping=signal.mapping||{},scale=mapping.scale||[1,1,1],stretch=signal.stretch||[1,1,1];periods.push(signal.wavelength*Math.min(...scale.map((x,k)=>x*stretch[k])));}
 const physicalSpan=span??Math.max(.04,Math.min(.2,periods.length?Math.max(...periods)*8:Math.sqrt(best.area)*.6)),distance=Math.max(physicalSpan*2,1e-4),eye=target.map((x,k)=>x+normal[k]*distance),up=Math.abs(normal[1])>.95?[0,0,1]:[0,1,0];
 return {version:1,role,id:best.id,face:best.face,triangle:triangle.index,faceAreaM2:best.area,physicalSpan,spanSource:span===undefined?'source-period-and-face-scale':'authored',camera:{projection:'orthographic',eye,target,up,fov:42,span:physicalSpan},periods:[...new Set(periods)].slice(0,32),note:'Actual visible role face proposal; projected visibility and appearance still require captured PBR evidence.'};
}
