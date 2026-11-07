// Explicit, read-only direction and pair constraints. No name/left/right inference.
import {evaluateDoc} from './kernel.js';
import {identityMatrix,objectMatrix,multiplyMatrix,transformPoint} from './relations.js';
import {preparePath,wheelEnvelope,reflectionMatrix} from './path-system.js';
const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const int=(v,d,min,max,name)=>{v=v??d;if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error(`${name} must be an integer in [${min},${max}]`);return v;};
const tol=v=>{v=v??1e-6;if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw new Error('tolerance must be positive and finite');return v;};
function contextFor(source,draw){
 const entries=new Map();const walk=(objects,matrix=identityMatrix(),ancestors=[])=>{for(const object of objects){if(typeof object.id!=='string'||!object.id)throw new Error('role checks require exact object IDs');if(entries.has(object.id))throw new Error(`duplicate object ID ${object.id}`);const entry={object,matrix:multiplyMatrix(matrix,objectMatrix(object)),ancestors};entries.set(object.id,entry);if(object.parts)walk(object.parts,entry.matrix,[...ancestors,object]);}};walk(source.objects);
 const leafCache=new Map(),referenceCache=new Map();const leaves=id=>{if(!entries.has(id))throw new Error(`target does not exist: ${id}`);if(!leafCache.has(id))leafCache.set(id,draw.objects.filter(o=>o.editableId===id||o.parentIds?.includes(id)));return leafCache.get(id);};
 const target=id=>{if(referenceCache.has(id))return referenceCache.get(id);const entry=entries.get(id);if(!entry)throw new Error(`target does not exist: ${id}`);const result={...entry,ancestorModifiers:entry.ancestors.some(o=>(o.modifiers??[]).some(m=>m.enabled!==false))};referenceCache.set(id,result);return result;};return {entries,leaves,target};
}
function declarations(source,args,query){
 if(query==='path'&&(args.id!==undefined||args.path!==undefined))return [{...args,query,source:'explicit'}];if(query==='symmetry'&&args.pairs!==undefined)return [{...args,query,source:'explicit'}];
 const result=[],constraints=source.meta?.constraints;
 if(Array.isArray(constraints)){for(const spec of constraints)if(spec?.query===query)result.push({...spec,source:'doc.meta.constraints'});}
 else if(constraints&&typeof constraints==='object'){const list=constraints[query];for(const spec of Array.isArray(list)?list:list?[list]:[])result.push({...spec,query,source:'doc.meta.constraints'});}
 const walk=objects=>{for(const o of objects){if(query==='path'&&o.recipe?.type==='pathRepeat')result.push({query,id:o.id,source:'recipe.pathRepeat'});else if(query==='path'&&o.directionRoles?.type==='path'&&(o.directionRoles.path||o.directionRoles.references?.length))result.push({query,id:o.id,...o.directionRoles,source:'object.directionRoles'});if(query==='symmetry'&&o.recipe?.type==='mirrorOf')result.push({query,pairs:[[o.recipe.params.target,o.id]],axis:o.recipe.params.axis??'x',pivot:o.recipe.params.pivot??0,source:'recipe.mirrorOf'});if(o.parts)walk(o.parts);}};walk(source.objects);
 const seen=new Set();return result.filter(s=>{const key=JSON.stringify([s.id,s.path,s.pairs,s.axis,s.pivot,s.references]);if(seen.has(key))return false;seen.add(key);return true;});
}
function unknown(query,spec,reason,extra={}){return {query,status:'unknown',complete:false,reason,constraintSource:spec.source,editableId:spec.id??null,witnesses:[],...extra};}
function pointSet(leaves,maxPoints){const seen=new Set(),points=[];for(const leaf of leaves){const p=leaf.geometryData?.positions??[];for(let i=0;i<p.length;i+=3){const key=`${p[i]}|${p[i+1]}|${p[i+2]}`;if(seen.has(key))continue;seen.add(key);points.push(p.slice(i,i+3));if(points.length>maxPoints)return null;}}return points;}
function symmetryCheck(spec,ctx,limits){
 if(spec.space!==undefined&&spec.space!=='world')return [unknown('symmetry',spec,'symmetry currently compares world space only')];
 if(!Array.isArray(spec.pairs)||!spec.pairs.length)return [unknown('symmetry',spec,'explicit symmetry pairs are required')];if(spec.pairs.length>limits.maxChecks)return [unknown('symmetry',spec,'pair check budget exceeded')];const results=[];const tolerance=tol(spec.tolerance??limits.tolerance),axis=spec.axis??'x',pivot=spec.pivot??0,reflection=reflectionMatrix(axis,pivot);
 for(const pair of spec.pairs){
  if(!Array.isArray(pair)||pair.length!==2||pair.some(id=>typeof id!=='string'||!id)){results.push(unknown('symmetry',spec,'pair needs two exact object IDs'));continue;}
  const [aId,bId]=pair;if(aId===bId){results.push(unknown('symmetry',spec,'pair must contain distinct object IDs',{pair}));continue;}
  let a,b;try{a=pointSet(ctx.leaves(aId),limits.maxPoints);b=pointSet(ctx.leaves(bId),limits.maxPoints);}catch(e){results.push(unknown('symmetry',spec,e.message,{pair}));continue;}
  if(!a||!b){results.push(unknown('symmetry',spec,'point budget exceeded; no partial symmetry pass',{pair}));continue;}if(!a.length||!b.length){results.push(unknown('symmetry',spec,'pair has no evaluated points',{pair}));continue;}
  a=a.map(p=>transformPoint(p,reflection));let comparisons=0,complete=true;const witnesses=[];
  const compare=(left,right,owner,reverse)=>{
   const buckets=new Map(),key=(x,y,z)=>`${x}|${y}|${z}`;for(let i=0;i<right.length;i++){const cell=right[i].map(v=>Math.floor(v/tolerance));if(!cell.every(Number.isSafeInteger)){complete=false;return;}const k=key(...cell);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(i);}
   for(let i=0;i<left.length;i++){
    const p=left[i],cell=p.map(v=>Math.floor(v/tolerance));if(!cell.every(Number.isSafeInteger)){complete=false;return;}let matched=false;
    search:for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const j of buckets.get(key(cell[0]+x,cell[1]+y,cell[2]+z))??[]){if(++comparisons>limits.maxComparisons){complete=false;return;}if(Math.hypot(...sub(p,right[j]))<=tolerance){matched=true;break search;}}
    if(!matched){let nearestDistance=Infinity,nearestPoint=null;for(const q of right){if(++comparisons>limits.maxComparisons){complete=false;return;}const distance=Math.hypot(...sub(p,q));if(distance<nearestDistance){nearestDistance=distance;nearestPoint=q;}}witnesses.push({kind:'symmetry-mismatch',pair,editableId:owner,ownerEditableId:owner,axis,pivot,point:p,nearestPoint,distance:nearestDistance,tolerance,direction:reverse?'b-to-reflected-a':'reflected-a-to-b',pointIndex:i});return;}
   }
  };
  compare(a,b,bId,false);if(complete&&!witnesses.length)compare(b,a,aId,true);
  results.push({query:'symmetry',pair,axis,pivot,tolerance,status:!complete?'unknown':witnesses.length?'fail':'pass',complete,constraintSource:spec.source,method:'bidirectional-transformed-point-set',pointCounts:[a.length,b.length],comparisons,witnesses,...(!complete?{reason:'comparison/precision budget exceeded; partial comparisons are unknown'}:{})});
 }return results;
}
function pathCheck(spec,ctx,limits){
 const id=spec.id??null,entry=id?ctx.entries.get(id):null;if(id&&!entry)return unknown('path',spec,`target does not exist: ${id}`);
 const leaves=id?ctx.leaves(id):[],roles=leaves.length===1?leaves[0].directionRoles:null,recipe=entry?.object.recipe,p=recipe?.type==='pathRepeat'?recipe.params:{};
 if(roles?.space!==undefined&&roles.space!=='world')return unknown('path',spec,'recorded instance frames must declare world space');
 if(roles?.validForGeometry===false)return unknown('path',spec,'modifiers invalidate the recorded path frames; supply an evaluated path explicitly');
 const descriptor=spec.path??p.path??entry?.object.directionRoles?.path;let path=null;if(descriptor)path=preparePath(descriptor,{matrix:entry?.matrix??identityMatrix(),target:ctx.target});
 if(!path&&!roles?.instances?.length)return unknown('path',spec,'no path descriptor or evaluated instance frames; supply path explicitly');
 const references=spec.references??roles?.references??entry?.object.directionRoles?.references??(descriptor?.type==='belt'?descriptor.wheels.map(target=>({target,expectedSide:'outside'})):[]);
 if(!Array.isArray(references)||references.length>32)throw new Error('references must be an array of at most 32 explicit references');const tolerance=tol(spec.tolerance??limits.tolerance),wheels=references.map(r=>{if(!r||typeof r.target!=='string')throw new Error('reference needs an exact target ID');if(!['outside','inside'].includes(r.expectedSide??'outside'))throw new Error('expectedSide must be outside or inside');const clearance=r.clearance??0;if(typeof clearance!=='number'||!Number.isFinite(clearance)||clearance<0)throw new Error('reference clearance must be nonnegative');return {...wheelEnvelope(ctx.target(r.target),ctx.target),expectedSide:r.expectedSide??'outside',clearance};});
 const samples=[],offset=p.offset??0;let totalSamples=0;const addSample=f=>{if(totalSamples<limits.maxSamples)samples.push({...f,sampleIndex:totalSamples});totalSamples++;},at=d=>{const f=path.sample(d);return {...f,position:f.position.map((v,k)=>v+f.outward[k]*offset)};};
 // Actual emitted instances are checked in addition to continuous routing extrema.
 for(const f of roles?.instances??[])addSample(f);
 let analyticComplete=true;
 if(path){
  for(const d of path.knots??[])addSample(at(d));for(let i=0;i<limits.sampleCount;i++)addSample(at((path.closed?i/limits.sampleCount:i/(limits.sampleCount-1))*path.length));
  for(const w of wheels){
   const radial=q=>{const v=sub(q,w.center),a=dot(v,w.axis);return v.map((x,k)=>x-a*w.axis[k]);};
   for(const segment of path.segments??[]){const middle=path.sample(segment.start+segment.length/2),a=segment.a.map((v,k)=>v+middle.outward[k]*offset),b=segment.b.map((v,k)=>v+middle.outward[k]*offset),ra=radial(a),rb=radial(b),d=sub(rb,ra),denom=dot(d,d),t=denom?Math.max(0,Math.min(1,-dot(ra,d)/denom)):0;
    for(const t0 of [0,t,1])addSample({...middle,position:a.map((v,k)=>v+(b[k]-v)*t0),distance:segment.start+t0*segment.length,analyticExtremum:true});
   }
   for(const arc of path.arcs??[]){
    if(Math.abs(Math.abs(dot(w.axis,path.planeNormal))-1)>1e-8){analyticComplete=false;continue;}
    const delta=sub(w.center,arc.center),angle=Math.atan2(dot(delta,arc.v),dot(delta,arc.u));for(const raw of [angle,angle+Math.PI]){const a=((raw%(2*Math.PI))+2*Math.PI)%(2*Math.PI);if(a<=arc.sweep)addSample({...at(arc.start+a*arc.radius),analyticExtremum:true});}
   }
  }
 }
 let complete=analyticComplete&&totalSamples<=limits.maxSamples,checked=0;const witnesses=[];
 const witness=(kind,sample,extra)=>{if(witnesses.length<limits.maxWitnesses)witnesses.push({kind,editableId:id,ownerEditableId:id,sample:sample.position,sampleIndex:sample.sampleIndex,instanceIndex:sample.index??null,distanceAlongPath:sample.distance??null,segmentIndex:sample.segmentIndex??null,tangent:sample.tangent,outward:sample.outward,transverse:sample.transverse,...extra});};
 for(const sample of samples.slice(0,limits.maxSamples)){
  checked++;if(![sample.position,sample.tangent,sample.outward,sample.transverse].every(vec)){witness('invalid-frame',sample,{reason:'non-finite or missing frame vectors'});continue;}
  const t=sample.tangent,o=sample.outward,x=sample.transverse,cross=[o[1]*t[2]-o[2]*t[1],o[2]*t[0]-o[0]*t[2],o[0]*t[1]-o[1]*t[0]],handedness=sample.handedness??1;
  if([t,o,x].some(v=>Math.abs(Math.hypot(...v)-1)>1e-6)||Math.abs(dot(t,o))>1e-6||Math.abs(dot(cross,x)-handedness)>1e-6)witness('invalid-frame',sample,{reason:'frame is not orthonormal with its declared handedness',handedness});
  for(const wheel of wheels){
   const delta=sub(sample.position,wheel.center),axial=dot(delta,wheel.axis),radial=delta.map((v,k)=>v-axial*wheel.axis[k]),distance=Math.hypot(...radial),signedClearance=distance-wheel.radius,side=wheel.expectedSide==='outside'?1:-1,clearance=side*signedClearance,radialDirection=distance?radial.map(v=>v/distance):[0,0,0],outwardDotRadial=dot(o,radialDirection),nearContact=distance<=wheel.radius+Math.max(wheel.radius*.25,wheel.clearance+tolerance);
   if(clearance<wheel.clearance-tolerance)witness('path-side',sample,{target:wheel.target,targetEditableId:wheel.target,expectedSide:wheel.expectedSide,radial,radialDirection,radialDistance:distance,radius:wheel.radius,signedClearance,requiredClearance:wheel.clearance,wheelCenter:wheel.center,wheelAxis:wheel.axis,tolerance});
   else if(wheel.expectedSide==='outside'&&nearContact&&outwardDotRadial< -1e-6)witness('path-outward',sample,{target:wheel.target,targetEditableId:wheel.target,expectedSide:'outside',radial,radialDirection,radialDistance:distance,radius:wheel.radius,signedClearance,outwardDotRadial,wheelCenter:wheel.center,wheelAxis:wheel.axis,tolerance});
  }
 }
 return {query:'path',status:!complete?'unknown':witnesses.length?'fail':'pass',complete,editableId:id,ownerEditableId:id,constraintSource:spec.source,closed:path?.closed??roles?.closed??null,pathType:path?.type??roles?.pathType??null,checkedSamples:checked,totalSamples,referenceCount:wheels.length,coverage:path?'instances-and-analytic-radial-extrema':'all-recorded-instances',witnesses,...(!complete?{reason:!analyticComplete?'analytic radial extrema unsupported for skew-axis/offset arcs; sampled evidence only':'sample budget exceeded; partial coverage is unknown'}:{})};
}

/** Options may carry the caller's invocation-local evaluatedDoc/sourceDoc. */
export function checkRolesDoc(doc,args={},options={}){
 if(!doc||!Array.isArray(doc.objects))throw new Error('checkRolesDoc needs a document');if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('role check arguments must be an object');
 const query=args.query??'all';if(!['path','symmetry','all'].includes(query))throw new Error('role query must be path, symmetry or all');
 const limits={maxChecks:int(args.maxChecks??options.maxChecks,32,1,128,'maxChecks'),maxSamples:int(args.maxSamples??options.maxSamples,4096,1,20000,'maxSamples'),sampleCount:int(args.sampleCount??options.sampleCount,128,2,20000,'sampleCount'),maxPoints:int(args.maxPoints??options.maxPoints,20000,1,100000,'maxPoints'),maxComparisons:int(args.maxComparisons??options.maxComparisons,2000000,1,20000000,'maxComparisons'),maxWitnesses:int(args.maxWitnesses??options.maxWitnesses,8,1,64,'maxWitnesses'),tolerance:tol(args.tolerance??options.tolerance)};
 const source=options.sourceDoc??args.sourceDoc??doc;let ctx;try{ctx=contextFor(source,options.evaluatedDoc??evaluateDoc(source,{budget:options.budget}));}catch(e){return {query,status:'unknown',complete:false,reason:e.message,checks:[],witnesses:[]};}
 const specs=(query==='all'?['path','symmetry']:[query]).flatMap(q=>declarations(source,args,q)),checks=[];
 for(const spec of specs.slice(0,limits.maxChecks)){const q=spec.query;if(checks.length>=limits.maxChecks){checks.push(unknown(query,{source:'budget'},'constraint check budget exceeded'));break;}try{checks.push(...(q==='symmetry'?symmetryCheck(spec,ctx,{...limits,maxChecks:limits.maxChecks-checks.length}):[pathCheck(spec,ctx,limits)]));}catch(e){checks.push(unknown(q,spec,e.message));}}
 if(specs.length>limits.maxChecks)checks.push(unknown(query,{source:'budget'},'constraint check budget exceeded; partial coverage is unknown'));
 const complete=checks.length>0&&checks.every(c=>c.complete),status=!complete?'unknown':checks.some(c=>c.status==='fail')?'fail':'pass',witnesses=checks.flatMap(c=>c.witnesses).slice(0,limits.maxWitnesses);
 return {query,status,complete,checks,witnesses,...(!checks.length?{reason:'no explicit role constraints; supply a path or symmetry pairs'}:{})};
}
