// Convex closed solid minus union of circumscribed cylindrical prisms.
import {validateMesh,meshEdges,faceVector,resolveBudget,checkBudget,geometryError} from './topology.js';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((x,k)=>x-b[k]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],point=(a,i)=>a.slice(i*3,i*3+3);
const finite=x=>typeof x==='number'&&Number.isFinite(x),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const transform=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
function bounds(vertices){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<vertices.length;i++){min[i%3]=Math.min(min[i%3],vertices[i]);max[i%3]=Math.max(max[i%3],vertices[i]);}return {min,max};}
function plane(poly,eps){for(let i=1;i+1<poly.length;i++){const n=cross(sub(poly[i],poly[0]),sub(poly[i+1],poly[0])),l=Math.hypot(...n);if(l>eps*eps){const normal=n.map(x=>x/l);return {normal,w:dot(normal,poly[0])};}}return null;}
function tidy(poly,eps){const out=[];for(const p of poly)if(!out.length||Math.hypot(...sub(p,out.at(-1)))>eps)out.push(p);if(out.length>1&&Math.hypot(...sub(out[0],out.at(-1)))<=eps)out.pop();return out.length>=3&&plane(out,eps)?out:null;}
function split(poly,p,eps,work){
 work(poly.length);const ds=poly.map(v=>dot(p.normal,v)-p.w);
 if(ds.every(d=>d<=eps))return {back:poly,front:null};if(ds.every(d=>d>=-eps))return {back:null,front:poly};const back=[],front=[];
 for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length,a=poly[i],b=poly[j],da=ds[i],db=ds[j];if(da<=eps)back.push(a);if(da>=-eps)front.push(a);if((da>eps&&db< -eps)||(da< -eps&&db>eps)){const t=da/(da-db),v=a.map((x,k)=>x+(b[k]-x)*t);back.push(v);front.push(v);}}
 return {back:tidy(back,eps),front:tidy(front,eps)};
}
function clipInside(poly,planes,eps,work){for(const p of planes){poly=split(poly,p,eps,work).back;if(!poly)return null;}return poly;}
function subtractPolygon(poly,planes,eps,work,keepCoincident=false){
 if(keepCoincident){const normal=plane(poly,eps)?.normal;if(normal&&planes.some(p=>dot(normal,p.normal)>1-1e-8&&poly.every(v=>Math.abs(dot(p.normal,v)-p.w)<=eps)))return [poly];}
 const out=[];for(const p of planes){const parts=split(poly,p,eps,work);if(parts.front)out.push(parts.front);poly=parts.back;if(!poly)break;}return out;
}
export function cylindricalEnvelope(spec,options={}){
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw geometryError('clearance cutter','expected a cylindrical descriptor');
 const op='clearance cutter',budget=resolveBudget(options.budget),axis=spec.axis??'y',ai=['x','y','z'].indexOf(axis);if(ai<0)throw geometryError(op,'axis must be x, y or z');
 const center=spec.center??[0,0,0],radius=spec.radius,depth=spec.depth,segments=spec.segments??48,m=spec.matrix??identity;
 if(!Array.isArray(center)||center.length!==3||!center.every(finite))throw geometryError(op,'center needs three finite numbers');if(!finite(radius)||radius<=0||!finite(depth)||depth<=0)throw geometryError(op,'radius and depth must be positive finite numbers');
 if(!Number.isSafeInteger(segments)||segments<8||segments>256)throw geometryError(op,'segments must be an integer in [8,256]');if(!Array.isArray(m)||m.length!==16||!m.every(finite)||m[3]!==0||m[7]!==0||m[11]!==0||m[15]!==1)throw geometryError(op,'matrix must be affine column-major 4x4');checkBudget(segments*2,segments*4-4,budget,op);
 const radial=[0,1,2].filter(k=>k!==ai),R=radius/Math.cos(Math.PI/segments),vertices=[],polygons=[];
 for(const side of [-1,1])for(let i=0;i<segments;i++){const a=2*Math.PI*(i+.5)/segments,q=center.slice();q[ai]+=side*depth/2;q[radial[0]]+=R*Math.cos(a);q[radial[1]]+=R*Math.sin(a);vertices.push(transform(q,m));}
 polygons.push(vertices.slice(0,segments),vertices.slice(segments));for(let i=0;i<segments;i++){const j=(i+1)%segments;polygons.push([vertices[i],vertices[j],vertices[j+segments],vertices[i+segments]]);}
 const mid=transform(center,m),b=bounds(vertices.flat()),eps=Math.max(1e-12,Math.hypot(...sub(b.max,b.min))*1e-11),planes=[];
 for(const poly of polygons){let p=plane(poly,eps);if(!p)throw geometryError(op,'singular/collapsed cylinder frame');const c=[0,1,2].map(k=>poly.reduce((s,q)=>s+q[k],0)/poly.length);if(dot(p.normal,sub(c,mid))<0){poly.reverse();p=plane(poly,eps);}planes.push(p);}return {polygons,planes,bounds:b};
}
function convexSource(mesh,eps,work){
 const op='clearance source',edges=meshEdges(mesh,op);if(!edges.size||[...edges.values()].some(e=>e.length!==2))throw geometryError(op,'requires a closed outward convex solid; open sources are unsupported');
 const polygons=[],planes=[];let volume=0;const origin=point(mesh.vertices,0);
 for(let i=0;i<mesh.indices.length;i+=3){const poly=mesh.indices.slice(i,i+3).map(id=>point(mesh.vertices,id)),p=plane(poly,eps);if(!p)throw geometryError(op,'degenerate triangle');polygons.push(poly);volume+=dot(sub(poly[0],origin),cross(sub(poly[1],origin),sub(poly[2],origin)))/6;if(!planes.some(q=>{work(1);return dot(p.normal,q.normal)>1-1e-10&&Math.abs(p.w-q.w)<=eps;}))planes.push(p);}
 if(volume<=eps**3)throw geometryError(op,'requires positive outward volume');for(const p of planes)for(let i=0;i<mesh.vertices.length;i+=3){work(1);if(dot(p.normal,mesh.vertices.slice(i,i+3))-p.w>eps*4)throw geometryError(op,'non-convex sources are unsupported; use separate convex parts');}return {polygons,planes,volume};
}
// Edge splitting before fan triangulation removes clipping T-junctions.
function stitch(polygons,eps,budget,work){
 const vertices=[],polys=[],buckets=new Map(),key=(x,y,z)=>`${x}|${y}|${z}`;
 const add=p=>{const cell=p.map(x=>Math.floor(x/eps));let id=-1;if(!cell.every(Number.isSafeInteger))throw geometryError('clearance','coordinate/precision ratio is unsupported');
 search:for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const j of buckets.get(key(cell[0]+x,cell[1]+y,cell[2]+z))||[])if(Math.hypot(...sub(p,point(vertices,j)))<=eps){id=j;break search;}
 if(id>=0)return id;id=vertices.length/3;vertices.push(...p);const k=key(...cell);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(id);checkBudget(vertices.length/3,0,budget,'clearance');return id;};
 for(const raw of polygons){const poly=tidy(raw,eps);if(!poly)continue;const ids=poly.map(add).filter((v,i,a)=>v!==a[(i+a.length-1)%a.length]);if(new Set(ids).size>=3)polys.push(ids);}
 const n=vertices.length/3,indices=[];
 for(const ids of polys){const ring=[];for(let i=0;i<ids.length;i++){
 const a=point(vertices,ids[i]),b=point(vertices,ids[(i+1)%ids.length]),d=sub(b,a),length2=dot(d,d),between=[];if(length2<=eps*eps)continue;ring.push(ids[i]);
 for(let j=0;j<n;j++){if(j===ids[i]||j===ids[(i+1)%ids.length])continue;work(1);const p=point(vertices,j),t=dot(sub(p,a),d)/length2;if(t<=eps/Math.sqrt(length2)||t>=1-eps/Math.sqrt(length2))continue;if(Math.hypot(...p.map((x,k)=>x-a[k]-t*d[k]))<=eps*2)between.push({id:j,t});}
 between.sort((a,b)=>a.t-b.t);for(const q of between)if(ring.at(-1)!==q.id)ring.push(q.id);}
 if(ring.length<3)continue;if(ring.length===3)indices.push(...ring);else{const centre=[0,1,2].map(k=>ids.reduce((s,id)=>s+vertices[id*3+k],0)/ids.length),ci=add(centre);for(let j=0;j<ring.length;j++)indices.push(ci,ring[j],ring[(j+1)%ring.length]);}checkBudget(vertices.length/3,indices.length/3,budget,'clearance');}
 const used=new Map(),out={vertices:[],indices:[]};for(const id of indices){if(!used.has(id)){used.set(id,out.vertices.length/3);out.vertices.push(...point(vertices,id));}out.indices.push(used.get(id));}
 for(let i=0;i<out.indices.length;i+=3)if(Math.hypot(...faceVector(out.vertices,...out.indices.slice(i,i+3)))<=eps*eps)throw geometryError('clearance','precision collapsed a cut triangle');return validateMesh(out,{budget,operator:'clearance'});
}
export function subtractCylinders(input,cutters,options={}){
 const op='clearance',budget=resolveBudget(options.budget),mesh=validateMesh(input,{budget,operator:op});if(!Array.isArray(cutters)||cutters.length>32)throw geometryError(op,'at most 32 cutters supported');if(!mesh.indices.length||!cutters.length)return mesh;
 const box=bounds(mesh.vertices),extent=Math.hypot(...sub(box.max,box.min)),maxAbs=Math.max(...box.min.map(Math.abs),...box.max.map(Math.abs)),eps=Math.max(1e-11,extent*1e-10,maxAbs*Number.EPSILON*8);let amount=0;
 const work=n=>{amount+=n;if(amount>30_000_000)throw geometryError(op,'clipping work budget exceeded; reduce cutters/segments/source complexity');},source=convexSource(mesh,eps,work);
 const active=cutters.filter(c=>{if(!c||!Array.isArray(c.polygons)||!Array.isArray(c.planes)||!c.bounds)throw geometryError(op,'expected cylindricalEnvelope descriptors');return [0,1,2].every(k=>c.bounds.max[k]>=box.min[k]-eps&&c.bounds.min[k]<=box.max[k]+eps)&&!source.planes.some(p=>c.polygons.every(poly=>poly.every(v=>dot(p.normal,v)-p.w>=-eps)));});if(!active.length)return mesh;
 const guard=out=>checkBudget(out.reduce((s,p)=>s+p.length,0),out.reduce((s,p)=>s+p.length-2,0),budget,op);let out=source.polygons;
 for(const c of active){out=out.flatMap(p=>subtractPolygon(p,c.planes,eps,work));guard(out);}
 for(let i=0;i<active.length;i++)for(const original of active[i].polygons){let poly=clipInside(original,source.planes,eps,work);if(!poly)continue;const normal=plane(poly,eps).normal;
 if(source.planes.some(p=>dot(normal,p.normal)>1-1e-8&&poly.every(v=>Math.abs(dot(p.normal,v)-p.w)<=eps)))continue;
 let pieces=[poly];for(let j=0;j<active.length;j++)if(j!==i)pieces=pieces.flatMap(p=>subtractPolygon(p,active[j].planes,eps,work,i<j));for(const p of pieces)out.push(p.slice().reverse());guard(out);}
 const result=stitch(out,eps*4,budget,work);if(!result.indices.length)return result;
 if([...meshEdges(result,op).values()].some(e=>e.length!==2))throw geometryError(op,'cut is not a closed manifold at this precision; adjust tangency/feature spacing');let volume=0;const origin=point(result.vertices,0);
 for(let i=0;i<result.indices.length;i+=3){const [a,b,c]=result.indices.slice(i,i+3).map(id=>sub(point(result.vertices,id),origin));volume+=dot(a,cross(b,c))/6;}
 if(volume<=0||volume>source.volume+eps*extent*extent*16)throw geometryError(op,'invalid oriented volume');return result;
}
