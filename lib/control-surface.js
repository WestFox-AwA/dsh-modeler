// Shared low-degree-of-freedom surface. Clamped cubic tensor B-spline, JSON source.
import {validateMesh,resolveBudget,checkBudget} from './topology.js';
const clone=v=>JSON.parse(JSON.stringify(v)),finite=Number.isFinite;
const num=(v,d,label,min=-Infinity,max=Infinity)=>{v=v??d;if(typeof v!=='number'||!finite(v)||v<min||v>max)throw Error(label+' must be finite in ['+min+','+max+']');return v;};
const integer=(v,d,label,min,max)=>{v=num(v,d,label,min,max);if(!Number.isInteger(v))throw Error(label+' must be an integer');return v;};
const sub=(a,b)=>a.map((v,k)=>v-b[k]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const l=Math.hypot(...a);if(l<1e-12)throw Error('surface has a collapsed tangent');return a.map(v=>v/l);};
const edges=['u0','u1','v0','v1'];
function knots(n){return Array.from({length:n+4},(_,i)=>i<4?0:i>=n?1:(i-3)/(n-3));}
function basis(n,t){const k=knots(n);t=Math.max(0,Math.min(1,t));if(t===1){const out=new Array(n).fill(0);out[n-1]=1;return out;}let b=Array.from({length:n+3},(_,i)=>t>=k[i]&&t<k[i+1]?1:0);for(let d=1;d<=3;d++)b=Array.from({length:n+3-d},(_,i)=>{const left=k[i+d]-k[i],right=k[i+d+1]-k[i+1];return (left?(t-k[i])/left*b[i]:0)+(right?(k[i+d+1]-t)/right*b[i+1]:0);});return b;}
function basisDerivative(n,t){const k=knots(n);t=Math.max(0,Math.min(1-1e-12,t));let b=Array.from({length:n+3},(_,i)=>t>=k[i]&&t<k[i+1]?1:0);for(let d=1;d<=2;d++)b=Array.from({length:n+3-d},(_,i)=>{const l=k[i+d]-k[i],r=k[i+d+1]-k[i+1];return (l?(t-k[i])/l*b[i]:0)+(r?(k[i+d+1]-t)/r*b[i+1]:0);});return Array.from({length:n},(_,i)=>{const l=k[i+3]-k[i],r=k[i+4]-k[i+1];return (l?3/l*b[i]:0)-(r?3/r*b[i+1]:0);});}
const greville=n=>{const k=knots(n);return Array.from({length:n},(_,i)=>(k[i+1]+k[i+2]+k[i+3])/3);};
export function normaliseSurface(p={}){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('surface params must be an object');
 const width=num(p.width,1.2,'surface width',.0001,10000),length=num(p.length,1.8,'surface length',.0001,10000),crown=num(p.crown,.15,'surface crown',-10000,10000),thickness=num(p.thickness,0,'surface thickness',0,Math.min(width,length));
 const grid=p.grid??[7,7],resolution=p.resolution??[32,40];if(!Array.isArray(grid)||grid.length!==2||!Array.isArray(resolution)||resolution.length!==2)throw Error('grid/resolution need [u,v] counts');
 const counts=grid.map((v,k)=>integer(v,null,'grid '+k,4,13)),steps=resolution.map((v,k)=>integer(v,null,'resolution '+k,4,128));let controls;
 if(p.controls!==undefined){if(!Array.isArray(p.controls)||p.controls.length!==counts[1]||p.controls.some(row=>!Array.isArray(row)||row.length!==counts[0]||row.some(pt=>!Array.isArray(pt)||pt.length!==3||pt.some(v=>!finite(v)))))throw Error('controls must match grid[v][u][xyz]');controls=clone(p.controls);}
 if(p.features!==undefined&&(!Array.isArray(p.features)||p.features.length>32))throw Error('surface features need at most32 ordered edits');
 return {width,length,crown,thickness,grid:counts,resolution:steps,...(controls?{controls}:{}),features:clone(p.features||[])};
}
function rawPoint(net,u,v){const bu=basis(net[0].length,u),bv=basis(net.length,v),point=[0,0,0];for(let j=0;j<net.length;j++)for(let i=0;i<net[j].length;i++)for(let k=0;k<3;k++)point[k]+=net[j][i][k]*bu[i]*bv[j];return point;}
function pinned(i,j,nu,nv,f){const fixed=f.fixedEdges??(f.keepBoundary===false?[]:edges),collar=f.keepTangents===true?2:1;return fixed.some(e=>e==='u0'&&i<collar||e==='u1'&&i>=nu-collar||e==='v0'&&j<collar||e==='v1'&&j>=nv-collar);}
export function normaliseSurfaceFeature(f={}){
 if(!f||typeof f!=='object'||!['ridge','bulge','narrow','bend','crown'].includes(f.kind))throw Error('surface edit kind needs ridge/bulge/narrow/bend/crown');
 const at=f.at??[.5,.5],radius=f.radius??(f.kind==='ridge'?[.28,.65]:[.45,.45]);if(!Array.isArray(at)||at.length!==2||!Array.isArray(radius)||radius.length!==2)throw Error('surface edit at/radius need [u,v]');
 const fixed=f.fixedEdges??(f.keepBoundary===false?[]:edges);if(!Array.isArray(fixed)||fixed.some(e=>!edges.includes(e))||new Set(fixed).size!==fixed.length)throw Error('fixedEdges need unique u0/u1/v0/v1');
 return {kind:f.kind,at:at.map(v=>num(v,null,'surface UV',0,1)),radius:radius.map(v=>num(v,null,'UV radius',.03,2)),amount:num(f.amount,0,'edit amount',-1000,1000),factor:num(f.factor,1,'width factor',.2,3),fixedEdges:[...fixed],keepTangents:f.keepTangents===true};
}
const smoothSupport=t=>{t=Math.min(1,Math.max(0,t));return 1-t*t*(3-2*t);};
export function surfaceNet(params){
 const p=normaliseSurface(params),[nu,nv]=p.grid,us=greville(nu),vs=greville(nv);let net=p.controls?clone(p.controls):vs.map(v=>us.map(u=>[(u-.5)*p.width,p.crown*(1-(2*u-1)**2)*(1-(2*v-1)**2),(v-.5)*p.length]));
 if(!p.controls&&p.crown){const height=rawPoint(net,.5,.5)[1];for(const row of net)for(const q of row)q[1]*=p.crown/height;}
 for(const feature of p.features){const f=normaliseSurfaceFeature(feature),weights=vs.map((v,j)=>us.map((u,i)=>{if(pinned(i,j,nu,nv,f))return 0;const a=Math.abs(u-f.at[0])/f.radius[0],b=Math.abs(v-f.at[1])/f.radius[1];return smoothSupport(a)*smoothSupport(b);}));
  const weightNet=weights.map((row,j)=>row.map((w,i)=>[net[j][i][0]*w,w,0]));let normalizer=rawPoint(weightNet,...f.at)[1];if(f.kind==='narrow'){const width=rawPoint(net,1,f.at[1])[0]-rawPoint(net,0,f.at[1])[0];normalizer=(rawPoint(weightNet,1,f.at[1])[0]-rawPoint(weightNet,0,f.at[1])[0])/width;}if(normalizer<1e-10)throw Error('surface edit has no movable controls: enlarge radius, move anchor or relax boundary/tangent locks');
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const w=weights[j][i]/normalizer,q=net[j][i];if(!w)continue;if(f.kind==='narrow'){q[0]*=1+(f.factor-1)*w;}else if(f.kind==='bend'){q[0]+=f.amount*w;}else q[1]+=f.amount*w;}
 }
 return {params:p,net};
}
export function surfaceEvaluator(params){
 const {params:p,net}=surfaceNet(params);const point=(u,v)=>rawPoint(net,u,v);
 const frame=(u,v)=>{u=num(u,null,'u',0,1);v=num(v,null,'v',0,1);const bu=basis(net[0].length,u),bv=basis(net.length,v),duBasis=basisDerivative(net[0].length,u),dvBasis=basisDerivative(net.length,v),pos=point(u,v),du=[0,0,0],dv=[0,0,0];for(let j=0;j<net.length;j++)for(let i=0;i<net[j].length;i++)for(let k=0;k<3;k++){du[k]+=net[j][i][k]*duBasis[i]*bv[j];dv[k]+=net[j][i][k]*bu[i]*dvBasis[j];}const normal=unit(cross(dv,du));if(normal[1]<=1e-5)throw Error('surface folds/collapses in its XZ parameter projection; reduce edit or correct the control net');return {point:pos,du,dv,normal};};
 return {params:p,net,point,frame};
}
export function buildControlSurface(params,budget={},options={}){
 const e=surfaceEvaluator(params),p=e.params,bounds=options.uvBounds??[0,0,1,1];if(!Array.isArray(bounds)||bounds.length!==4||bounds.some(v=>!finite(v)||v<0||v>1)||bounds[2]<=bounds[0]||bounds[3]<=bounds[1])throw Error('uvBounds need [u0,v0,u1,v1] in0..1');
 const requested=options.resolution??p.resolution;if(!Array.isArray(requested)||requested.length!==2)throw Error('region resolution needs[u,v]');const [nu,nv]=requested.map(v=>integer(v,null,'region resolution',4,128)),t=num(options.thickness,p.thickness,'surface thickness',0,Math.min(p.width,p.length)),count=(nu+1)*(nv+1),limits=resolveBudget(budget);checkBudget(count*(t?2:1),nu*nv*2*(t?2:1)+(t?4*(nu+nv):0),limits,'controlSurface');
 const vertices=[],indices=[],cornerNormals=[],frames=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=bounds[0]+(bounds[2]-bounds[0])*i/nu,v=bounds[1]+(bounds[3]-bounds[1])*j/nv,f=e.frame(u,v);frames.push(f);vertices.push(...f.point);}
 if(t)for(const f of frames)vertices.push(f.point[0],f.point[1]-t,f.point[2]);
 const add=(a,b,c,normals)=>{indices.push(a,b,c);if(normals)for(const n of normals)cornerNormals.push(...n);else {const A=vertices.slice(a*3,a*3+3),B=vertices.slice(b*3,b*3+3),C=vertices.slice(c*3,c*3+3),n=unit(cross(sub(B,A),sub(C,A)));cornerNormals.push(...n,...n,...n);}};
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+2,d=a+nu+1;add(a,d,c,[frames[a].normal,frames[d].normal,frames[c].normal]);add(a,c,b,[frames[a].normal,frames[c].normal,frames[b].normal]);if(t){add(a+count,c+count,d+count,[a,c,d].map(k=>frames[k].normal.map(x=>-x)));add(a+count,b+count,c+count,[a,b,c].map(k=>frames[k].normal.map(x=>-x)));}}
 if(t){const boundary=[];for(let j=0;j<=nv;j++)boundary.push(j*(nu+1));for(let i=1;i<=nu;i++)boundary.push(nv*(nu+1)+i);for(let j=nv-1;j>=0;j--)boundary.push(j*(nu+1)+nu);for(let i=nu-1;i>0;i--)boundary.push(i);for(let k=0;k<boundary.length;k++){const a=boundary[k],b=boundary[(k+1)%boundary.length],edge=a%(nu+1)===0&&b%(nu+1)===0?'u0':a%(nu+1)===nu&&b%(nu+1)===nu?'u1':a<=nu&&b<=nu?'v0':'v1';if(options.edgeWalls&&!options.edgeWalls.includes(edge))continue;add(a,a+count,b+count);add(a,b+count,b);}}
 const mesh=validateMesh({vertices,indices},{budget:limits,operator:'controlSurface'});mesh.cornerNormals=cornerNormals;return mesh;
}
export function surfaceControlSummary(params){const e=surfaceEvaluator(params);return {representation:'clamped cubic tensor B-spline control net',grid:e.params.grid,resolution:e.params.resolution,features:e.params.features,thickness:e.params.thickness,thicknessDirection:'local negative Y, not constant normal offset',anchors:[[.5,.5],[0,.5],[1,.5],[.5,0],[.5,1]].map(uv=>({uv,...e.frame(...uv)})),boundary:e.net.flatMap((row,j)=>row.flatMap((point,i)=>j===0||i===0||j===e.net.length-1||i===row.length-1?[{i,j,point}]:[])),limits:'Single graph-like surface, positional/tangent locks on its own control net; no arbitrary trimmed NURBS joins or certified global self-intersection test.'};}
