// Bounded polygon BSP CSG. Operates on closed oriented meshes; not a CAD tolerance solver.
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((x,k)=>x-b[k]),add=(a,b)=>a.map((x,k)=>x+b[k]),mul=(a,s)=>a.map(x=>x*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function polygon(v,source){for(let i=1;i+1<v.length;i++){const n=cross(sub(v[i],v[0]),sub(v[i+1],v[0])),l=Math.hypot(...n);if(l>1e-12){const normal=mul(n,1/l);return {v,normal,w:dot(normal,v[0]),source};}}return null;}
const flip=p=>({v:[...p.v].reverse(),normal:mul(p.normal,-1),w:-p.w,source:p.source});
export function booleanMesh(left,right,{operation='union',tolerance=1e-6,maxPolygons=20000,maxSplits=200000}={}){
 if(!['union','subtract','intersect'].includes(operation)||!Number.isFinite(tolerance)||tolerance<=0)throw new Error('invalid solid operation or tolerance');let work=0;
 const tick=()=>{if(++work>maxSplits)throw new Error('solid operation work budget exceeded');};
 function split(plane,p,front,back,cf,cb){tick();const types=p.v.map(v=>{const t=dot(plane.normal,v)-plane.w;return t>tolerance?1:t< -tolerance?2:0;}),kind=types.reduce((a,b)=>a|b,0);if(kind===0){(dot(plane.normal,p.normal)>0?cf:cb).push(p);return;}if(kind===1){front.push(p);return;}if(kind===2){back.push(p);return;}const f=[],b=[];
  for(let i=0;i<p.v.length;i++){const j=(i+1)%p.v.length,a=p.v[i],z=p.v[j],ta=types[i],tb=types[j];if(ta!==2)f.push(a);if(ta!==1)b.push(a);if((ta|tb)===3){const edge=sub(z,a),t=(plane.w-dot(plane.normal,a))/dot(plane.normal,edge),v=add(a,mul(edge,t));f.push(v);b.push(v);}}
  const F=polygon(f,p.source),B=polygon(b,p.source);if(F)front.push(F);if(B)back.push(B);
 }
 class Node{
  constructor(polys=[],depth=0){if(depth>180)throw new Error('solid BSP depth exceeded');this.depth=depth;this.p=[];this.front=null;this.back=null;this.plane=null;if(polys.length)this.build(polys);}
  invert(){this.p=this.p.map(flip);if(this.plane)this.plane={normal:mul(this.plane.normal,-1),w:-this.plane.w};this.front?.invert();this.back?.invert();[this.front,this.back]=[this.back,this.front];}
  clip(polys){if(!this.plane)return polys;let f=[],b=[];for(const p of polys)split(this.plane,p,f,b,f,b);if(this.front)f=this.front.clip(f);if(this.back)b=this.back.clip(b);else b=[];return f.concat(b);}
  clipTo(other){this.p=other.clip(this.p);this.front?.clipTo(other);this.back?.clipTo(other);}
  all(){return this.p.concat(this.front?.all()||[],this.back?.all()||[]);}
  build(polys){if(this.p.length+polys.length>maxPolygons)throw new Error('solid polygon budget exceeded');if(!this.plane)this.plane={normal:polys[0].normal,w:polys[0].w};const f=[],b=[];for(const p of polys)split(this.plane,p,f,b,this.p,this.p);if(f.length){if(!this.front)this.front=new Node([],this.depth+1);this.front.build(f);}if(b.length){if(!this.back)this.back=new Node([],this.depth+1);this.back.build(b);}}
 }
 const from=(mesh,source)=>{if(mesh.indices.length/3>6000)throw new Error('solid input exceeds6000 triangles; use a simpler source');const p=[];for(let i=0;i<mesh.indices.length;i+=3){const q=polygon(mesh.indices.slice(i,i+3).map(id=>mesh.vertices.slice(id*3,id*3+3)),source);if(q)p.push(q);}if(!p.length)throw new Error('solid input has no valid faces');return p;};
 const a=new Node(from(left,0)),b=new Node(from(right,1));
 if(operation==='union'){a.clipTo(b);b.clipTo(a);b.invert();b.clipTo(a);b.invert();a.build(b.all());}
 else if(operation==='subtract'){a.invert();a.clipTo(b);b.clipTo(a);b.invert();b.clipTo(a);b.invert();a.build(b.all());a.invert();}
 else{a.invert();b.clipTo(a);b.invert();a.clipTo(b);b.clipTo(a);a.build(b.all());a.invert();}
 const polygons=a.all();if(!polygons.length)throw new Error('solid result is empty');if(polygons.length>maxPolygons)throw new Error('solid output budget exceeded');
 // Split all shared boundary edges at surviving polygon vertices before fans.
 const unique=new Map(),key=v=>v.map(x=>Math.round(x/tolerance)).join('|');for(const p of polygons)for(const v of p.v)unique.set(key(v),v);const points=[...unique.values()],vertices=[],indices=[],map=new Map();let edgeTests=0;
 const put=v=>{const k=key(v);if(map.has(k))return map.get(k);const id=vertices.length/3;vertices.push(...v);map.set(k,id);return id;};
 for(const p of polygons){const ring=[];for(let i=0;i<p.v.length;i++){const A=p.v[i],B=p.v[(i+1)%p.v.length],D=sub(B,A),den=dot(D,D),cuts=[{t:0,v:A}];if(den<tolerance*tolerance)continue;for(const v of points){if(++edgeTests>4000000)throw new Error('solid boundary stitching budget exceeded');const t=dot(sub(v,A),D)/den;if(t<=1e-8||t>=1-1e-8)continue;const q=add(A,mul(D,t));if(Math.hypot(...sub(q,v))<=tolerance)cuts.push({t,v});}cuts.sort((a,b)=>a.t-b.t);for(const c of cuts)if(!ring.length||key(ring.at(-1))!==key(c.v))ring.push(c.v);}
  const center=mul(ring.reduce((s,v)=>add(s,v),[0,0,0]),1/ring.length),c=put(center);for(let j=0;j<ring.length;j++){const x=put(ring[j]),y=put(ring[(j+1)%ring.length]);if(x!==y&&x!==c&&y!==c)indices.push(c,x,y);}}
 return {vertices,indices,provenance:{operation,inputTriangles:[left.indices.length/3,right.indices.length/3],work,edgeTests,sourcePolicy:'one result material; source objects retained separately'}};
}
