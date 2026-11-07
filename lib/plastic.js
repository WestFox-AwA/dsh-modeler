import {indexMesh,validateMesh,vertexNormals,faceVector} from './topology.js';
const finite=x=>typeof x==='number'&&Number.isFinite(x),vec=(v,label)=>{if(!Array.isArray(v)||v.length!==3||!v.every(finite))throw Error(label+' needs finite XYZ');return [...v];},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),sub=(a,b)=>a.map((v,k)=>v-b[k]),unit=v=>{const l=Math.hypot(...v);if(l<1e-12)throw Error('zero brush direction');return v.map(x=>x/l);};
const integer=(v,d,lo,hi,name)=>{v=v??d;if(!Number.isInteger(v)||v<lo||v>hi)throw Error(name+' outside '+lo+'..'+hi);return v;};
export function buildPlasticBox(p,budget){
 const dims=[p.w??p.width??1,p.h??p.height??1,p.d??p.depth??1];if(dims.some(v=>!finite(v)||v<=0||v>1e6))throw Error('plastic box dimensions must be positive finite');const half=dims.map(x=>x/2),r=p.radius??p.bevel??Math.min(...dims)*.08;if(!finite(r)||r<0||r>=Math.min(...half))throw Error('bevel radius must be >=0 and less than half the smallest size');
 const resolution=integer(p.resolution,20,1,96,'resolution'),segments=integer(p.bevelSegments,6,1,32,'bevelSegments'),core=half.map(x=>x-r),cell=Math.max(...dims)/resolution,n=core.map(x=>Math.max(1,Math.ceil(2*x/cell))),positions=[];
 const emit=(a,b,c,outward)=>{const normal=cross(sub(b,a),sub(c,a));if(Math.hypot(...normal)<1e-14)return;if(dot(normal,outward)<0)[b,c]=[c,b];positions.push(...a,...b,...c);};
 const quad=(a,b,c,d,outward)=>{emit(a,b,c,outward);emit(a,c,d,outward);};
 const point=(axis,value,uAxis,u,vAxis,v)=>{const q=[0,0,0];q[axis]=value;q[uAxis]=u;q[vAxis]=v;return q;};
 // Six planar grids. Every boundary is shared with an edge cylinder or neighbor.
 for(let axis=0;axis<3;axis++){const [u,v]=[0,1,2].filter(k=>k!==axis);for(const sign of [-1,1]){const normal=[0,0,0];normal[axis]=sign;for(let i=0;i<n[u];i++)for(let j=0;j<n[v];j++){const x=-core[u]+2*core[u]*i/n[u],X=-core[u]+2*core[u]*(i+1)/n[u],y=-core[v]+2*core[v]*j/n[v],Y=-core[v]+2*core[v]*(j+1)/n[v];quad(point(axis,sign*half[axis],u,x,v,y),point(axis,sign*half[axis],u,X,v,y),point(axis,sign*half[axis],u,X,v,Y),point(axis,sign*half[axis],u,x,v,Y),normal);}}}
 if(r>0){
  // Twelve quarter cylinders; each quarter has exactly bevelSegments angle steps.
  for(let along=0;along<3;along++){const [a,b]=[0,1,2].filter(k=>k!==along);for(const sa of [-1,1])for(const sb of [-1,1]){const P=(i,j)=>{const t=j*Math.PI/(2*segments),q=[0,0,0];q[along]=-core[along]+2*core[along]*i/n[along];q[a]=sa*(core[a]+r*Math.cos(t));q[b]=sb*(core[b]+r*Math.sin(t));return q;};for(let i=0;i<n[along];i++)for(let j=0;j<segments;j++){const normal=[0,0,0],t=(j+.5)*Math.PI/(2*segments);normal[a]=sa*Math.cos(t);normal[b]=sb*Math.sin(t);quad(P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1),normal);}}}
  // Eight spherical octants. Sine barycentrics match equal-angle edge samples.
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){const signs=[sx,sy,sz],P=(i,j)=>{const q=[Math.sin(i*Math.PI/(2*segments)),Math.sin(j*Math.PI/(2*segments)),Math.sin((segments-i-j)*Math.PI/(2*segments))],l=Math.hypot(...q);return q.map((v,k)=>signs[k]*(core[k]+r*v/l));};for(let i=0;i<segments;i++)for(let j=0;j<segments-i;j++){emit(P(i,j),P(i+1,j),P(i,j+1),signs);if(i+j<segments-1)emit(P(i+1,j),P(i+1,j+1),P(i,j+1),signs);}}
 }
 return indexMesh(positions,Math.max(1e-12,Math.min(...dims)*1e-9),{budget});
}
export function applyPlasticBrush(input,stroke,budget){
 const mesh=validateMesh(input,{budget,operator:'plastic brush'}),center=vec(stroke.center,'brush.center'),normal=unit(vec(stroke.normal??[0,1,0],'brush.normal')),amount=stroke.amount;if(!finite(amount))throw Error('brush amount must be finite');
 const radii=Array.isArray(stroke.radius)?stroke.radius:[stroke.radius??.3,stroke.radius??.3];if(radii.length!==2||radii.some(r=>!finite(r)||r<=0))throw Error('brush radius needs positive scalar or [u,v]');const depth=stroke.depth??Math.min(...radii)*.5,steepness=stroke.steepness??1,hardness=stroke.hardness??0,rotation=stroke.rotation??0,shape=stroke.shape??'ellipse';if(!['circle','ellipse','box'].includes(shape)||!finite(depth)||depth<=0||!finite(steepness)||steepness<.1||steepness>12||!finite(hardness)||hardness<0||hardness>=1||!finite(rotation))throw Error('invalid brush region/falloff');
 if(stroke.mode!==undefined&&!['push','inflate'].includes(stroke.mode)||stroke.normalLimit!==undefined&&(!finite(stroke.normalLimit)||stroke.normalLimit< -1||stroke.normalLimit>1))throw Error('invalid brush mode or normalLimit');
 const up=stroke.up?unit(vec(stroke.up,'brush.up')):Math.abs(normal[1])>.9?[1,0,0]:[0,1,0],u=unit(cross(up,normal)),v=cross(normal,u),c=Math.cos(rotation),s=Math.sin(rotation),normals=vertexNormals(mesh),vertices=mesh.vertices.slice();let affected=0;
 for(let i=0;i<vertices.length;i+=3){const p=mesh.vertices.slice(i,i+3),delta=sub(p,center),z=dot(delta,normal),N=normals.slice(i,i+3);if(Math.abs(z)>depth||dot(N,normal)<(stroke.normalLimit??.05))continue;const a=dot(delta,u),b=dot(delta,v),x=(a*c-b*s)/radii[0],y=(a*s+b*c)/radii[1],d=shape==='box'?Math.max(Math.abs(x),Math.abs(y)):Math.hypot(x,y);if(d>=1)continue;const t=Math.max(0,(d-hardness)/(1-hardness)),weight=Math.pow(1-t*t*(3-2*t),steepness),direction=stroke.mode==='inflate'?N:normal;for(let k=0;k<3;k++)vertices[i+k]+=direction[k]*amount*weight;affected++;}
 if(!affected)throw Error('brush region contains no front-facing vertices; choose a surface anchor or increase mesh resolution');
 return validateMesh({vertices,indices:mesh.indices},{budget,operator:'plastic brush'});
}
