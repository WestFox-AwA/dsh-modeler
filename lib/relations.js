import {formEvaluator,buildFormRegion} from './form-body.js';
import {buildControlSurface,surfaceEvaluator} from './control-surface.js';
import {booleanMesh} from './solid-boolean.js';
import {meshTopology,trianglesFromPositions} from './spatial-query.js';
// Shared JSON relations; all frames are column-major affine 4x4 matrices.
import {geometryError,validateMesh,resolveBudget,checkBudget} from './topology.js';
import {cylindricalEnvelope,subtractCylinders} from './mesh-cut.js';
import {pathDependencies,evaluatePathRepeat,evaluateMirrorOf} from './path-system.js';
export const CONTEXT_RECIPES=Object.freeze(['surfacePath','surfaceAttach','clearance','pathRepeat','mirrorOf','meshBoolean','surfaceRegion','surfacePin','formRim']);
export const isContextRecipe=r=>CONTEXT_RECIPES.includes(r?.type);
const err=(op,s)=>{throw geometryError(op,s);};
const num=(v,d,op,k,min=-Infinity)=>{v=v===undefined?d:v;if(typeof v!=='number'||!Number.isFinite(v)||v<min)err(op,`${k} must be finite and >= ${min}`);return v;};
const vec=(v,d,op,k)=>{v=v===undefined?d:v;if(!Array.isArray(v)||v.length!==3||!v.every(x=>typeof x==='number'&&Number.isFinite(x)))err(op,`${k} needs three finite coordinates`);return v.slice();};
const sub=(a,b)=>a.map((x,k)=>x-b[k]),dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(v,op)=>{const l=Math.hypot(...v);if(!l)err(op,'direction/up cannot be zero');return v.map(x=>x/l);};
export const identityMatrix=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export const transformPoint=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
export const transformDirection=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]);
export function multiplyMatrix(a,b){const c=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c;}
export function inverseMatrix(m){
 const a=[m[0],m[4],m[8]],b=[m[1],m[5],m[9]],c=[m[2],m[6],m[10]],d=dot(a,cross(b,c));
 if(!Number.isFinite(d)||d===0)err('relations','singular/unsupported transform');
 const x=cross(b,c).map(v=>v/d),y=cross(c,a).map(v=>v/d),z=cross(a,b).map(v=>v/d),r=[x[0],x[1],x[2],0,y[0],y[1],y[2],0,z[0],z[1],z[2],0,0,0,0,1];
 const t=transformDirection(m.slice(12,15),r);r[12]=-t[0];r[13]=-t[1];r[14]=-t[2];return r;
}
export function objectMatrix(o){
 const p=o.position??[0,0,0],s=o.scale??[1,1,1],r=o.rotation??[0,0,0],c=r.map(Math.cos),t=r.map(Math.sin);
 const rz=[c[2],t[2],0,0,-t[2],c[2],0,0,0,0,1,0,0,0,0,1],ry=[c[1],0,-t[1],0,0,1,0,0,t[1],0,c[1],0,0,0,0,1],rx=[1,0,0,0,0,c[0],t[0],0,0,-t[0],c[0],0,0,0,0,1];
 const m=multiplyMatrix(rx,multiplyMatrix(ry,rz));for(let j=0;j<3;j++)for(let k=0;k<3;k++)m[j*4+k]*=s[j];m[12]=p[0];m[13]=p[1];m[14]=p[2];return m;
}
export function mapMesh(mesh,m,budget){
 const vertices=[];for(let i=0;i<mesh.vertices.length;i+=3)vertices.push(...transformPoint(mesh.vertices.slice(i,i+3),m));const indices=mesh.indices.slice();
 if(dot([m[0],m[1],m[2]],cross([m[4],m[5],m[6]],[m[8],m[9],m[10]]))<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const out=validateMesh({vertices,indices},{budget,operator:'relation transform'});if(mesh.cornerNormals){const inv=inverseMatrix(m),normals=[];for(let i=0;i<mesh.cornerNormals.length;i+=3){const n=mesh.cornerNormals.slice(i,i+3),mapped=[0,1,2].map(k=>inv[k*4]*n[0]+inv[k*4+1]*n[1]+inv[k*4+2]*n[2]);normals.push(...unit(mapped,'surface normal'));}if(dot([m[0],m[1],m[2]],cross([m[4],m[5],m[6]],[m[8],m[9],m[10]]))<0)for(let i=0;i<normals.length;i+=9)for(let k=0;k<3;k++)[normals[i+3+k],normals[i+6+k]]=[normals[i+6+k],normals[i+3+k]];out.cornerNormals=normals;}return out;
}
export function recipeDependencies(recipe,active=new Set()){
 if(!recipe||typeof recipe!=='object'||typeof recipe.type!=='string')err('relations','source must be a recipe descriptor');
 if(active.has(recipe))err('relations','cyclic recipe source');if(active.size>32)err('relations','recipe nesting budget exceeded');active.add(recipe);
 const p=recipe.params??{},refs=[];
 if(['surfacePath','surfaceAttach','mirrorOf','surfaceRegion','surfacePin','formRim'].includes(recipe.type)){if(typeof p.target!=='string'||!p.target)err(recipe.type,'target must be an exact object ID');refs.push(p.target);}
 if(recipe.type==='pathRepeat')refs.push(...pathDependencies(p.path));
  if(recipe.type==='meshBoolean'){if(!Array.isArray(p.targets)||p.targets.length!==2||p.targets.some(id=>typeof id!=='string'||!id)||p.targets[0]===p.targets[1])err('meshBoolean','two distinct exact targets required');refs.push(...p.targets);}
 if(recipe.type==='clearance'){
 if(!Array.isArray(p.cutters)||p.cutters.length>32)err('clearance','cutters must contain at most 32 descriptors');
 for(const c of p.cutters){if(!c||typeof c!=='object')err('clearance','invalid cutter');if(c.target!==undefined){if(typeof c.target!=='string'||!c.target)err('clearance','target must be an exact object ID');refs.push(c.target);}}}
 if(['surfaceAttach','clearance','pathRepeat','surfacePin'].includes(recipe.type))refs.push(...recipeDependencies(p.source,active));active.delete(recipe);return [...new Set(refs)];
}
export function rayProject(mesh,origin,direction,maxDistance=Infinity){
 const d=unit(direction,'surface projection');let hit=null;
 for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(id=>mesh.vertices.slice(id*3,id*3+3)),e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-13*Math.hypot(...e1)*Math.hypot(...e2))continue;
 const inv=1/det,s=sub(origin,a),u=dot(s,h)*inv;if(u< -1e-9||u>1+1e-9)continue;const q=cross(s,e1),v=dot(d,q)*inv;if(v< -1e-9||u+v>1+1e-9)continue;const distance=dot(e2,q)*inv;
 if(distance< -1e-10||distance>maxDistance||(hit&&distance>=hit.distance))continue;hit={point:origin.map((x,k)=>x+Math.max(0,distance)*d[k]),normal:unit(cross(e1,e2),'surface normal'),distance:Math.max(0,distance),face:i/3};}
 return hit;
}
function tube(points,radius,segments,budget){
 checkBudget(points.length*segments+2,(points.length-1)*segments*2+segments*2,budget,'surfacePath');const vertices=[],indices=[];let previous=null;
 for(let i=0;i<points.length;i++){
 const tangent=unit(sub(points[Math.min(points.length-1,i+1)],points[Math.max(0,i-1)]),'surfacePath'),up=Math.abs(tangent[1])>.9?[1,0,0]:[0,1,0];let radial=previous?previous.map((x,k)=>x-tangent[k]*dot(previous,tangent)):cross(up,tangent);if(Math.hypot(...radial)<1e-8)radial=cross(up,tangent);const u=unit(radial,'surfacePath'),v=cross(tangent,u);previous=u;
 for(let j=0;j<segments;j++){const a=2*Math.PI*j/segments;vertices.push(...points[i].map((x,k)=>x+radius*(u[k]*Math.cos(a)+v[k]*Math.sin(a))));}}
 for(let i=0;i+1<points.length;i++)for(let j=0;j<segments;j++){const a=i*segments+j,b=i*segments+(j+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
 for(const end of [0,points.length-1]){const centre=vertices.length/3;vertices.push(...points[end]);for(let j=0;j<segments;j++){const a=end*segments+j,b=end*segments+(j+1)%segments;indices.push(...(end===0?[centre,b,a]:[centre,a,b]));}}
 return validateMesh({vertices,indices},{budget,operator:'surfacePath'});
}
function rotateBetween(p,a,b){const axis=cross(a,b),c=Math.max(-1,Math.min(1,dot(a,b))),l=Math.hypot(...axis);if(l<1e-12){if(c>0)return p;const u=unit(cross(a,Math.abs(a[0])<.9?[1,0,0]:[0,1,0]),'surfaceAttach');return p.map((x,k)=>2*u[k]*dot(u,p)-x);}const u=axis.map(x=>x/l),q=cross(u,p);return p.map((x,k)=>x*c+q[k]*l+u[k]*dot(u,p)*(1-c));}
function projectSetup(p,ctx,op){
 const target=ctx.target(p.target),space=p.space??'target';if(!['target','world'].includes(space))err(op,'space must be target or world');
 let rayWork=0;const frame=space==='target'?target.matrix:identityMatrix(),direction=unit(transformDirection(vec(p.direction,[0,-1,0],op,'direction'),frame),op),maxDistance=num(p.maxDistance,10,op,'maxDistance',Number.MIN_VALUE),offset=num(p.offset,.003,op,'offset');
 return {target,frame,direction,maxDistance,offset,cast:q=>{rayWork+=target.mesh.indices.length/3;if(rayWork>30000000)err(op,'projection work budget exceeded; increase sampleStep or simplify target');const hit=rayProject(target.mesh,transformPoint(q,frame),direction,maxDistance);if(!hit)err(op,`projection miss on target ${p.target} (maxDistance ${maxDistance})`);return {...hit,position:hit.point.map((x,k)=>x+hit.normal[k]*offset)};}};
}
export function evaluateRelation(recipe,ctx,options={}){
 const op=recipe.type,p=recipe.params??{},budget=resolveBudget(options.budget,recipe.budget,p.budget),inverse=inverseMatrix(ctx.matrix);
 if(op==='formRim'){
   const target=ctx.target(p.target);if(target.object.recipe?.type!=='formBody'||target.ancestorModifiers||(target.object.modifiers||[]).some(m=>m.enabled!==false))err(op,'formRim needs an unmodified formBody source');const e=formEvaluator(target.object.recipe.params),cut=e.params.cuts.find(c=>c.id===p.cut);if(!cut||cut.type!=='cylinder'||cut.axis!=='x')err(op,'rim currently needs a named transverse-X cylinder cut');const side=num(p.side,Math.sign(cut.center[0])||1,op,'side'),rad=cut.radius+num(p.radialOffset,.012,op,'radialOffset',0),steps=num(p.segments,64,op,'segments',8);if(!Number.isInteger(steps)||steps>128||![1,-1].includes(side))err(op,'segments8..128 and side±1');const points=[];
   const angle0=num(p.startAngle,-Math.PI/2,op,'startAngle'),angle1=num(p.endAngle,Math.PI/2,op,'endAngle');if(angle1<=angle0||angle1-angle0>Math.PI*2)err(op,'invalid rim angle range');
   for(let j=0;j<=steps;j++){const a=angle0+(angle1-angle0)*j/steps,y=cut.center[1]+rad*Math.cos(a),z=cut.center[2]+rad*Math.sin(a),q=e.section(z),limit=e.bounds.max[0]-e.bounds.min[0];let outer=q.centerX+side*limit,inner=null;for(let k=1;k<=96;k++){const x=q.centerX+side*limit*(1-k/96);if(e.field([x,y,z])<=0){inner=x;break;}outer=x;}if(inner===null)err(op,'opening rim leaves the body; reduce radial offset or limit angles');for(let k=0;k<22;k++){const mid=(inner+outer)/2;if(e.field([mid,y,z])<=0)inner=mid;else outer=mid;}points.push([(inner+outer)/2+side*num(p.offset,.003,op,'offset'),y,z]);}
   let source;if(p.width!==undefined){const width=num(p.width,.035,op,'width',.00001),thickness=num(p.thickness,.006,op,'thickness',.00001),vertices=[],indices=[];for(let j=0;j<points.length;j++){const angle=angle0+(angle1-angle0)*j/steps,radial=[0,Math.cos(angle),Math.sin(angle)],point=points[j];for(const [r,x]of [[-width/2,thickness/2],[width/2,thickness/2],[width/2,-thickness/2],[-width/2,-thickness/2]])vertices.push(point[0]+side*x,point[1]+r*radial[1],point[2]+r*radial[2]);}for(let j=0;j<steps;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4,c=(j+1)*4+(k+1)%4,d=(j+1)*4+k;indices.push(a,b,c,a,c,d);}indices.push(0,2,1,0,3,2);const last=steps*4;indices.push(last,last+1,last+2,last,last+2,last+3);let volume=0;for(let i=0;i<indices.length;i+=3){const a=vertices.slice(indices[i]*3,indices[i]*3+3),b=vertices.slice(indices[i+1]*3,indices[i+1]*3+3),c=vertices.slice(indices[i+2]*3,indices[i+2]*3+3);volume+=dot(a,cross(b,c));}if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];source=validateMesh({vertices,indices},{budget,operator:op});}else source=ctx.recipe({type:'curveTube',params:{curve:{type:'catmullrom',points,segments:Math.min(256,steps*2)},radius:num(p.radius,.008,op,'radius',.00001),radialSegments:8}},budget);ctx.record({openingRim:{target:p.target,cut:p.cut,source:'exact body-field intersection with named cylinder parameter curve'}});return mapMesh(source,multiplyMatrix(inverse,target.matrix),budget);
  }
  if(op==='surfaceRegion'||op==='surfacePin'){
   const target=ctx.target(p.target);if(target.object.parts||!['controlSurface','formBody'].includes(target.object.recipe?.type)||target.ancestorModifiers||(target.object.modifiers||[]).some(m=>m.enabled!==false))err(op,'target must be an unmodified controlSurface leaf; use its control features for editing');
   if(op==='surfaceRegion'){if(target.object.recipe.type==='formBody')return mapMesh(buildFormRegion(target.object.recipe.params,budget,{uvBounds:p.uvBounds,resolution:p.resolution,offset:p.offset}),multiplyMatrix(inverse,target.matrix),budget);const uv=p.uvBounds||[0,0,1,1],edgeWalls=p.closeCuts===true?['u0','u1','v0','v1']:['u0','v0','u1','v1'].filter((edge,i)=>uv[i]===(i<2?0:1));const mesh=buildControlSurface(target.object.recipe.params,budget,{uvBounds:p.uvBounds,thickness:p.thickness,resolution:p.resolution,edgeWalls});return mapMesh(mesh,multiplyMatrix(inverse,target.matrix),budget);}
   if(!Array.isArray(p.uv)||p.uv.length!==2)err(op,'uv needs [u,v]');const frame=(target.object.recipe.type==='formBody'?formEvaluator:surfaceEvaluator)(target.object.recipe.params).frame(...p.uv),source=ctx.recipe(p.source,budget),n=frame.normal,guide=p.tangent?vec(p.tangent,null,op,'tangent'):frame.du,u=unit(guide.map((x,k)=>x-n[k]*dot(guide,n)),op),v=unit(cross(u,n),op),offset=num(p.offset,0,op,'offset'),angle=num(p.rotation,0,op,'rotation'),c=Math.cos(angle),s=Math.sin(angle),basis=[u.map((x,k)=>x*c+v[k]*s),n,v.map((x,k)=>x*c-u[k]*s)];
   const origin=frame.point.map((x,k)=>x+n[k]*offset),localFrame=[...basis[0],0,...basis[1],0,...basis[2],0,...origin,1];ctx.record({surfaceAnchor:{target:p.target,uv:p.uv,localPoint:frame.point,localNormal:n,offset}});return mapMesh(source,multiplyMatrix(inverse,multiplyMatrix(target.matrix,localFrame)),budget);
  }
  if(op==='pathRepeat')return evaluatePathRepeat(recipe,ctx,{budget});
 if(op==='mirrorOf')return evaluateMirrorOf(recipe,ctx,{budget});
 if(op==='meshBoolean'){
   const targets=p.targets.map(id=>ctx.target(id)),inspect=mesh=>{const positions=[];for(const i of mesh.indices)positions.push(...mesh.vertices.slice(i*3,i*3+3));return meshTopology(trianglesFromPositions(positions));};
   for(const t of targets){if(t.object.parts)err(op,'target must be a closed leaf, not an assembly group');const top=inspect(t.mesh);if(!top.solidSafe)err(op,'input must be a closed connected oriented manifold; repair the selected shell first');}
   const result=booleanMesh(targets[0].mesh,targets[1].mesh,{operation:p.operation||'union',tolerance:p.tolerance??1e-6}),top=inspect(result);
   if(!top.closed||top.nonManifoldEdges||top.nonManifoldVertices||top.windingConflicts||top.degenerateTriangles)err(op,'result topology could not be certified; source assets retained');
   return mapMesh(result,inverse,budget);
  }
  if(op==='surfacePath'){
 const setup=projectSetup(p,ctx,op),step=num(p.sampleStep,.05,op,'sampleStep',Number.MIN_VALUE),radius=num(p.radius,.003,op,'radius',Number.MIN_VALUE),segments=num(p.radialSegments,8,op,'radialSegments',3);
 if(!Number.isSafeInteger(segments)||segments>256)err(op,'radialSegments must be an integer in [3,256]');if(!Array.isArray(p.points)||p.points.length<2||p.points.length>4096)err(op,'points needs 2..4096 points');
 const raw=p.points.map(q=>vec(q,null,op,'point')),points=[];
 for(let i=0;i+1<raw.length;i++){const a=raw[i],b=raw[i+1],length=Math.hypot(...sub(transformPoint(b,setup.frame),transformPoint(a,setup.frame)));if(!length)err(op,'adjacent points must be distinct');const n=Math.max(1,Math.ceil(length/step-1e-12*Math.max(1,length/step)));checkBudget((points.length+n+1)*segments+2,(points.length+n)*segments*2+segments*2,budget,op);for(let j=0;j<n;j++)points.push(setup.cast(a.map((x,k)=>x+(b[k]-x)*j/n)).position);}
 points.push(setup.cast(raw.at(-1)).position);for(let i=1;i<points.length;i++)if(Math.hypot(...sub(points[i],points[i-1]))<1e-12)err(op,'projected path collapses adjacent samples');return mapMesh(tube(points,radius,segments,budget),inverse,budget);
 }
 if(op==='surfaceAttach'){
 const setup=projectSetup(p,ctx,op),hit=setup.cast(vec(p.anchor,[0,1,0],op,'anchor')),source=ctx.recipe(p.source,budget),rawUp=vec(p.up,[0,1,0],op,'up'),fi=inverseMatrix(setup.frame),up=unit([0,1,2].map(k=>fi[k*4]*rawUp[0]+fi[k*4+1]*rawUp[1]+fi[k*4+2]*rawUp[2]),op);
 if(p.alignNormal!==undefined&&typeof p.alignNormal!=='boolean')err(op,'alignNormal must be boolean');const vertices=[];
 for(let i=0;i<source.vertices.length;i+=3){let q=transformDirection(source.vertices.slice(i,i+3),setup.frame);if(p.alignNormal!==false)q=rotateBetween(q,up,hit.normal);vertices.push(...q.map((x,k)=>x+hit.position[k]));}
 return mapMesh({vertices,indices:mapMesh(source,setup.frame,budget).indices},inverse,budget);
 }
 if(op==='clearance'){
 const specs=[];let source=recipe,cutBudget=budget;
 while(source.type==='clearance'){if(specs.length>32)err(op,'cutters budget exceeded');cutBudget=resolveBudget(cutBudget,source.budget,source.params?.budget);specs.push(...source.params.cutters.map(c=>({...c,segments:c.segments??source.params.segments??48})));source=source.params.source;}
 if(specs.length>32)err(op,'cutters budget exceeded');const mesh=ctx.recipe(source,cutBudget),cutters=[];
 for(const c of specs){
 const axis=c.axis??'y',ai=['x','y','z'].indexOf(axis);if(ai<0)err(op,'axis must be x, y or z');let frame=identityMatrix(),reference=null;
 if(c.target!==undefined){reference=ctx.target(c.target);if(reference.ancestorModifiers)err(op,'reference ancestor modifiers are unsupported; reference an individual unmodified frame');frame=multiplyMatrix(inverse,reference.matrix);}
 const local=reference?.local,bb=local?meshBounds(local):null,tyre=reference?.object?.recipe?.type==='tyre'&&axis==='y'&&!(reference.object.modifiers??[]).some(m=>m.enabled!==false),center=vec(c.center,tyre?[0,0,0]:bb?bb.min.map((x,k)=>(x+bb.max[k])/2):[0,0,0],op,'center');let autoRadius=0;
 if(local){for(let i=0;i<local.vertices.length;i+=3)autoRadius=Math.max(autoRadius,Math.hypot(...[0,1,2].filter(k=>k!==ai).map(k=>local.vertices[i+k]-center[k])));}
 if(tyre&&c.center===undefined)autoRadius=reference.object.recipe.params?.outerRadius??.5;
 const radius=num(c.radius,autoRadius||undefined,op,'radius',Number.MIN_VALUE),clearance=num(c.clearance,0,op,'clearance',0);let depth=c.depth;
 if(depth===undefined){const invFrame=inverseMatrix(frame);let reach=0;for(let i=0;i<mesh.vertices.length;i+=3)reach=Math.max(reach,Math.abs(transformPoint(mesh.vertices.slice(i,i+3),invFrame)[ai]-center[ai]));depth=2*(reach+radius+clearance+1);}
 cutters.push(cylindricalEnvelope({axis,center,radius:radius+clearance,depth,segments:c.segments??p.segments??48,matrix:frame},{budget:cutBudget}));
 }
 return subtractCylinders(mesh,cutters,{budget:cutBudget});
 }
 err(op,'unknown contextual recipe');
}
export function meshBounds(mesh){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<mesh.vertices.length;i++){min[i%3]=Math.min(min[i%3],mesh.vertices[i]);max[i%3]=Math.max(max[i%3],mesh.vertices[i]);}return {min,max};}
