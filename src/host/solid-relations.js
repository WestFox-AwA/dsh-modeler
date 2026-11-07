/** Read-only evaluated-world solids. outside rejects source surfaces/closed
 * source volumes inside target; nonIntersection requires both closed solids.
 * allowTouch defaults true; clearance applies to outside. Open target, partial
 * tests or unresolved contact are unknown. Disjoint surfaces require EVERY
 * connected component classified outside, plus reverse containment for closed
 * source. Contact passes only with an all-vertex separating-plane certificate.
 * maxTests counts topology/component triangles, pair/classification predicates
 * and contact plane scans. Output evidence is bounded; no AABB pass shortcut.
 */
import {assemblyContext} from './assembly-interfaces.js';
import {pairSurfaces,classifyPoint,meshTopology} from './spatial-query.js';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),sub=(a,b)=>a.map((v,k)=>v-b[k]),TOL=1e-7;
const fail=(code,message,path)=>Object.assign(Error(message),{code,...(path?{path}:{})});
function fields(o,allowed,path){if(!obj(o))throw fail('invalid_object',`${path} must be an object`,path);for(const k of Object.keys(o))if(!allowed.includes(k))throw fail('unknown_field',`unknown field ${k}`,`${path}.${k}`);}
function validate(r){fields(r,['id','type','source','target','clearance','tolerance','allowTouch','mode'],'relation');if(!['outside','nonIntersection'].includes(r.type))throw fail('unknown_type',`unknown solid relation type ${r.type}`);for(const k of ['id','source','target'])if(typeof r[k]!=='string'||!r[k])throw fail('invalid_id',`${k} needs exact ID`);if(r.source===r.target)throw fail('self_relation','solid relation needs distinct objects');for(const k of ['clearance','tolerance'])if(own(r,k)&&(!Number.isFinite(r[k])||r[k]<(k==='tolerance'?Number.MIN_VALUE:0)))throw fail('invalid_number',`${k} has invalid value`);if(r.type==='nonIntersection'&&own(r,'clearance'))throw fail('unknown_field','clearance is defined only for outside');if(own(r,'allowTouch')&&typeof r.allowTouch!=='boolean')throw fail('invalid_allowTouch','allowTouch must be boolean');if(own(r,'mode')&&!['enforced','report'].includes(r.mode))throw fail('invalid_mode','mode must be enforced/report');}
const ref=t=>{const r={index:t.index};for(const k of ['id','editableId','semanticId','path'])if(t[k]!==undefined)r[k]=t[k];return r;},center=t=>[0,1,2].map(k=>(t.a[k]+t.b[k]+t.c[k])/3);
function components(tris,tolerance){
 const buckets=new Map(),vertices=[],parent=tris.map((_,i)=>i);const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 function weld(p,face){const cell=p.map(v=>Math.floor(v/tolerance));if(!cell.every(Number.isSafeInteger)){const key=p.join('|');if(buckets.has(key))parent[root(face)]=root(buckets.get(key)[0]);else buckets.set(key,[face]);return;}
  let found;for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const id of buckets.get([cell[0]+x,cell[1]+y,cell[2]+z].join('|'))??[])if(Math.hypot(...sub(vertices[id].point,p))<=tolerance){found=id;break;}
  if(found!==undefined){parent[root(face)]=root(vertices[found].face);return;}const key=cell.join('|'),id=vertices.length;vertices.push({point:p,face});if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);
 }
 tris.forEach((t,i)=>[t.a,t.b,t.c].forEach(p=>weld(p,i)));const groups=new Map();tris.forEach((t,i)=>{const k=root(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);});return [...groups.values()];
}
export function checkSolidRelation(doc,r,options={}){
 let used=0,limit=options?.maxTests??100000;const take=n=>{if(n>limit-used)return false;used+=n;return true;},remaining=()=>limit-used;
 const result=(status,extra={})=>({id:typeof r?.id==='string'?r.id:null,relationId:typeof r?.id==='string'?r.id:null,type:typeof r?.type==='string'?r.type:null,...(typeof r?.source==='string'?{source:r.source}:{}),...(typeof r?.target==='string'?{target:r.target}:{}),path:'relation',status,complete:status!=='unknown',scope:'evaluated-world-solid-relation',...extra,budget:{maxTests:limit,used}}),unknown=(code,reason,data={})=>result('unknown',{code,reason,...data});
 try{fields(options,['maxTests','budget'],'options');if(!Number.isSafeInteger(limit)||limit<0)throw fail('invalid_budget','maxTests needs nonnegative safe integer');validate(r);}catch(e){return result('conflict',{code:e.code??'invalid_relation',reason:e.message,path:e.path??'relation'});}
 if(!remaining())return unknown('test_limit','no remaining solid query tests');
 try{
  const ctx=assemblyContext(doc,options);for(const id of [r.source,r.target])if(!ctx.entries.has(id))return result('conflict',{code:'missing_target',reason:`object ${id} does not exist`,objectId:id});
  const A=ctx.geometry(r.source).triangles,B=ctx.geometry(r.target).triangles,tolerance=r.tolerance??TOL;if(!A.length||!B.length)return unknown('empty_surface','source or target has no evaluated surface');
  if(!take(B.length))return unknown('test_limit','insufficient tests for target topology');const targetTopology=meshTopology(B,{tolerance});if(!targetTopology.closed)return unknown('open_or_invalid_target','target is not a closed consistently wound manifold',{targetTopology});
  if(!take(A.length))return unknown('test_limit','insufficient tests for source topology',{targetTopology});const sourceTopology=meshTopology(A,{tolerance}),topology={source:sourceTopology,target:targetTopology};
  if(!remaining())return unknown('test_limit','no remaining surface-pair tests',{topology});const q=pairSurfaces(A,B,{maxTests:remaining(),tolerance,maxEvidence:8});take(q.tests);
  const closest=q.closest?{worldPoints:[q.closest.a.point,q.closest.b.point],triangles:[q.closest.a.triangle,q.closest.b.triangle],nodeIDs:[r.source,r.target]}:null,data={surfaceDistance:q.minimumDistance,crossing:q.crossing,contact:q.contact,coplanar:q.coplanar,closest,topology};
  const witness=classification=>{const e=q.evidence.find(e=>e.kind==='boundary_crossing')??q.evidence[0];return {worldPoint:e?.point??q.closest?.a.point??null,triangles:e?[e.a,e.b]:closest?.triangles??[],classification,nodeIDs:[r.source,r.target]};};
  if(q.crossing)return result('conflict',{...data,code:'solid_boundary_crossing',reason:'evaluated triangle surfaces cross strictly',witness:witness('boundary_crossing')});
  if(!q.complete)return unknown('test_limit','surface-pair query incomplete',data);if(!Number.isFinite(q.minimumDistance))return unknown('nonfinite_result','surface distance unavailable',data);
  if(!(r.allowTouch??true)&&q.contact)return result('conflict',{...data,code:'solid_contact_forbidden',reason:'surface contact forbidden by allowTouch=false',witness:witness(q.coplanar?'coplanar_contact':'surface_contact')});
  if(r.type==='nonIntersection'&&!sourceTopology.closed)return unknown('open_or_invalid_source','nonIntersection needs a closed source for bidirectional solid proof',data);
  // A plane separating ALL actual vertices certifies external contact. This
  // also bounds every triangle and (for closed meshes) its bounded interior.
  if(q.contact){
   const candidates=[],seen=new Set();for(const tris of [A,B])for(const t of tris){if(!take(1))return unknown('test_limit','contact candidate scan incomplete',data);if(Math.hypot(...t.normal)<1e-12)continue;const key=t.normal.map(v=>Math.round(v*1e9)).join('|');if(!seen.has(key)&&candidates.length<64){seen.add(key);candidates.push({normal:t.normal,point:t.a});}}let separated=null;
   for(const plane of candidates){let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;for(const [tris,isA]of [[A,true],[B,false]])for(const t of tris){if(!take(1))return unknown('test_limit','contact separating-plane scan incomplete',data);for(const p of [t.a,t.b,t.c]){const d=dot(sub(p,plane.point),plane.normal);if(isA){amin=Math.min(amin,d);amax=Math.max(amax,d);}else{bmin=Math.min(bmin,d);bmax=Math.max(bmax,d);}}}if(amax<=bmin+tolerance||bmax<=amin+tolerance){separated={...plane,sourceInterval:[amin,amax],targetInterval:[bmin,bmax]};break;}}
   if(separated){if((r.clearance??0)>q.minimumDistance+tolerance)return result('conflict',{...data,code:'clearance_out_of_range',reason:'surface clearance below declared minimum',witness:witness('clearance_violation')});return result('pass',{...data,proof:'closed-target-and-complete-surface-pair-with-separating-plane',separatingPlane:separated,allowTouch:true});}
  }
  if(!take(A.length+B.length))return unknown('test_limit','insufficient tests to enumerate every connected component',data);const groupsA=components(A,tolerance),groupsB=components(B,tolerance),classifications=[];
  function classify(tris,p){if(!remaining())return null;const c=classifyPoint(tris,p,{maxTests:remaining(),tolerance});take(c.tests);return c;}
  // meshTopology certifies local manifold edges, not nesting between shells.
  // Parity is safe for disjoint shell surfaces with alternating cavity winding.
  function certifyShells(groups,owner){
   if(groups.length<2)return {count:groups.length,nested:0};const containers=groups.map(()=>[]),signs=[];
   for(const g of groups){const anchor=g[0].a;let sixVolume=0;for(const t of g){if(!take(1))return unknown('test_limit','shell winding scan incomplete',data);const a=sub(t.a,anchor),b=sub(t.b,anchor),c=sub(t.c,anchor);sixVolume+=dot(a,[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]]);}if(!Number.isFinite(sixVolume)||Math.abs(sixVolume)<=tolerance**3)return unknown('ambiguous_solid_shells','shell has no reliable signed volume',data);signs.push(Math.sign(sixVolume));}
   for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
    if(!remaining())return unknown('test_limit','shell pair proof has no remaining tests',data);const pair=pairSurfaces(groups[i],groups[j],{maxTests:remaining(),tolerance,maxEvidence:1});take(pair.tests);
    if(pair.crossing||pair.contact){const e=pair.evidence[0];return unknown('ambiguous_solid_shells','intersecting/touching shells do not define a certified parity solid',{...data,witness:{worldPoint:e?.point??pair.closest?.a.point??null,triangles:e?[e.a,e.b]:[],classification:pair.crossing?'shell_boundary_crossing':'shell_contact',nodeIDs:[owner,owner]}});}
    if(!pair.complete)return unknown('test_limit','shell pair proof incomplete',data);
    const ci=classify(groups[j],center(groups[i][0])),cj=classify(groups[i],center(groups[j][0]));if(!ci||!cj)return unknown('test_limit','shell nesting proof incomplete',data);
    if(!ci.complete||!cj.complete||!['inside','outside'].includes(ci.state)||!['inside','outside'].includes(cj.state))return unknown('ambiguous_solid_shells','shell nesting is uncertain',data);
    if(ci.state==='inside'&&cj.state==='inside')return unknown('ambiguous_solid_shells','shell nesting is inconsistent',data);if(ci.state==='inside')containers[i].push(j);if(cj.state==='inside')containers[j].push(i);
   }
   for(let i=0;i<groups.length;i++)if(containers[i].length){const parent=containers[i].find(j=>containers[j].length===containers[i].length-1);if(parent===undefined||signs[parent]===signs[i])return unknown('ambiguous_solid_shells','nested shells need alternating winding to certify a cavity',data);}
   return {count:groups.length,nested:containers.filter(xs=>xs.length).length};
  }
  const targetShells=certifyShells(groupsB,r.target);if(targetShells.status)return targetShells;const sourceShells=sourceTopology.closed?certifyShells(groupsA,r.source):null;if(sourceShells?.status)return sourceShells;data.shells={target:targetShells,...(sourceShells?{source:sourceShells}:{})};
  for(const [groups,other,from,to]of [[groupsA,B,r.source,r.target],...(sourceTopology.closed?[[groupsB,A,r.target,r.source]]:[])])for(let i=0;i<groups.length;i++){
   const tri=groups[i][0],p=center(tri),c=classify(other,p);if(!c)return unknown('test_limit','no remaining component-containment tests',{...data,classifications});data.classificationCount=(data.classificationCount??0)+1;if(classifications.length<16)classifications.push({from,to,component:i,state:c.state,worldPoint:p,triangle:ref(tri)});else data.classificationsOmitted=(data.classificationsOmitted??0)+1;
   if(c.state==='inside')return result('conflict',{...data,classifications,code:'solid_containment',reason:`${from} has a surface component inside ${to}`,witness:{worldPoint:p,triangles:[ref(tri)],classification:'inside',nodeIDs:[from,to],component:i}});
   if(!c.complete||c.state==='unknown')return unknown(c.complete?'containment_uncertain':'test_limit',c.reason??'component side unavailable',{...data,classifications});
   if(c.state==='boundary'){
    // Equality alone cannot distinguish coincident solids from external touch.
    if(sourceTopology.closed)for(const sign of [-1,1]){const probe=p.map((v,k)=>v+sign*tri.normal[k]*tolerance*8),a=classify(A,probe),b=classify(B,probe);if(!a||!b)return unknown('test_limit','boundary interior probe incomplete',{...data,classifications});if(a.state==='inside'&&b.state==='inside')return result('conflict',{...data,classifications,code:'solid_interior_overlap',reason:'a point is inside both closed solids',witness:{worldPoint:probe,triangles:[ref(tri)],classification:'inside_both',nodeIDs:[r.source,r.target]}});if(!a.complete||!b.complete||a.state==='unknown'||b.state==='unknown')return unknown('containment_uncertain','boundary interior probe uncertain',{...data,classifications});}
    return unknown('contact_uncertain','contact has no separating-plane certificate',{...data,classifications,witness:witness('boundary')});
   }
  }
  if(q.contact)return unknown('contact_uncertain','contact has no separating-plane certificate',{...data,classifications,witness:witness(q.coplanar?'coplanar_contact':'surface_contact')});
  if((r.clearance??0)>q.minimumDistance+tolerance)return result('conflict',{...data,classifications,code:'clearance_out_of_range',reason:'surface clearance below declared minimum',witness:witness('clearance_violation')});
  return result('pass',{...data,classifications,proof:'complete-disjoint-surfaces-and-every-connected-component-outside',checkedComponents:{source:groupsA.length,target:sourceTopology.closed?groupsB.length:0},allowTouch:r.allowTouch??true});
 }catch(e){return unknown(e.code??'evaluation_failed',e.message);}
}
