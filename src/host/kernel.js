import {buildNativeMesh} from './native-mesh.js';
import {buildFormBody} from './form-body.js';
import {buildControlSurface} from './control-surface.js';
import {buildPlasticBox,applyPlasticBrush} from './plastic.js';
import {buildCurveSweep,buildCurveTube} from './curves.js';
// One geometry evaluator for the Host, browser viewport, audits and software views.
// Editable recipes/topology are never mutated. Draw documents contain baked leaves.
import { box, sphere, lathe, torus, torusArc, extrude, carRing, loftRings, spherePatch } from './generate.js';
import { isContextRecipe, recipeDependencies, evaluateRelation, identityMatrix, objectMatrix, multiplyMatrix } from './relations.js';
export { isContextRecipe, recipeDependencies } from './relations.js';
import { WELD_TOLERANCE, resolveBudget, checkBudget, geometryError, validateMesh, indexMesh, meshPositions, meshEdges, vertexNormals, faceVector } from './topology.js';

export const KERNEL_VERSION = '2.0.0';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clone = (v) => {
  if (Array.isArray(v) || ArrayBuffer.isView(v)) return Array.from(v, clone);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
};
const append = (a, b) => { for (const x of b) a.push(x); };
function number(value, fallback, operator, field, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const n = value === undefined ? fallback : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n))) throw geometryError(operator, `${field} must be a finite ${integer ? 'integer' : 'number'} in [${min}, ${max}]`);
  return n;
}
const positive = (value, fallback, op, field) => number(value, fallback, op, field, { min: Number.MIN_VALUE });
const segment = (value, fallback, op, field, min = 3) => number(value, fallback, op, field, { min, max: 4096, integer: true });
function boolean(value, fallback, op, field) { if (value === undefined) return fallback; if (typeof value !== 'boolean') throw geometryError(op, `${field} must be boolean`); return value; }
function vector(value, fallback, op, field) {
  const v = value === undefined ? fallback : value;
  if (!(Array.isArray(v) || ArrayBuffer.isView(v)) || v.length !== 3) throw geometryError(op, `${field} must contain three numbers`);
  return Array.from(v, (n) => number(n, undefined, op, field));
}
function paramsOf(recipe) {
  if (!recipe || typeof recipe !== 'object' || typeof recipe.type !== 'string') throw geometryError('recipe', 'expected {type, params}');
  if (recipe.params !== undefined && (!recipe.params || typeof recipe.params !== 'object' || Array.isArray(recipe.params))) throw geometryError(`recipe ${recipe.type}`, 'params must be an object');
  return recipe.params || {};
}
function recipeMesh(positions, budget, tolerance = WELD_TOLERANCE, operator = 'recipe') {
  if(!positions.length)throw geometryError(operator,'geometry collapsed below supported generator precision');
  const mesh=indexMesh(positions,tolerance,{budget});
  for(let i=0;i<mesh.indices.length;i+=3)if(mesh.indices[i]===mesh.indices[i+1]||mesh.indices[i]===mesh.indices[i+2]||mesh.indices[i+1]===mesh.indices[i+2])throw geometryError(operator,'weldTolerance collapses a triangle; decrease the tolerance');
  return mesh;
}
function roundedBox(w, h, d, c) {
  const hw = w / 2, hh = h / 2, hd = d / 2, out = [];
  const p = (sx, sy, sz, axis) => [sx * (hw - (axis === 0 ? 0 : c)), sy * (hh - (axis === 1 ? 0 : c)), sz * (hd - (axis === 2 ? 0 : c))];
  const tri = (a, b, q) => {
    const n = faceVector([...a, ...b, ...q], 0, 1, 2), m = a.map((v, k) => (v + b[k] + q[k]) / 3);
    append(out, a); if (n.reduce((s, v, k) => s + v * m[k], 0) < 0) { append(out, q); append(out, b); } else { append(out, b); append(out, q); }
  };
  const quad = (a, b, q, d0) => { tri(a, b, q); tri(a, q, d0); };
  for (const s of [-1, 1]) {
    quad(p(s,-1,-1,0),p(s,-1,1,0),p(s,1,1,0),p(s,1,-1,0));
    quad(p(-1,s,-1,1),p(1,s,-1,1),p(1,s,1,1),p(-1,s,1,1));
    quad(p(-1,-1,s,2),p(1,-1,s,2),p(1,1,s,2),p(-1,1,s,2));
  }
  for (const y of [-1,1]) for (const z of [-1,1]) quad(p(1,y,z,1),p(-1,y,z,1),p(-1,y,z,2),p(1,y,z,2));
  for (const x of [-1,1]) for (const z of [-1,1]) quad(p(x,1,z,0),p(x,-1,z,0),p(x,-1,z,2),p(x,1,z,2));
  for (const x of [-1,1]) for (const y of [-1,1]) quad(p(x,y,1,0),p(x,y,-1,0),p(x,y,-1,1),p(x,y,1,1));
  for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) tri(p(x,y,z,0),p(x,y,z,1),p(x,y,z,2));
  return out;
}
const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function closedProfile(raw, operator, normalized = true) {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 512) throw geometryError(operator, 'profile needs 3..512 [x,y] points');
  const pts = raw.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) throw geometryError(operator, `profile point ${i} must be [x,y]`);
    return p.map((v, axis) => number(v, undefined, operator, `profile[${i}][${axis}]`, normalized ? { min: axis === 0 ? -1 : 0, max: 1 } : {}));
  });
  if (pts.length > 3 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (a[0] === b[0] && a[1] === b[1]) throw geometryError(operator, 'profile has duplicate adjacent points');
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (Math.abs(area) < 1e-14) throw geometryError(operator, 'profile has zero area');
  const on = (a, b, p) => Math.abs(cross2(a,b,p)) < 1e-12 && p[0] >= Math.min(a[0],b[0])-1e-12 && p[0] <= Math.max(a[0],b[0])+1e-12 && p[1] >= Math.min(a[1],b[1])-1e-12 && p[1] <= Math.max(a[1],b[1])+1e-12;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (j === i + 1 || (i === 0 && j === pts.length - 1)) continue;
    const a = pts[i], b = pts[(i+1)%pts.length], c = pts[j], d = pts[(j+1)%pts.length];
    if ((cross2(a,b,c)*cross2(a,b,d) < 0 && cross2(c,d,a)*cross2(c,d,b) < 0) || on(a,b,c) || on(a,b,d) || on(c,d,a) || on(c,d,b)) throw geometryError(operator, 'profile self-intersects');
  }
  return area < 0 ? [pts[0], ...pts.slice(1).reverse()] : pts;
}
function capTriangles(poly, operator) {
  const ids = poly.map((_, i) => i), triangles = [];
  const inside = (p,a,b,c) => cross2(a,b,p) >= -1e-12 && cross2(b,c,p) >= -1e-12 && cross2(c,a,p) >= -1e-12;
  while (ids.length > 3) {
    let cut = -1;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[(i+ids.length-1)%ids.length], b = ids[i], c = ids[(i+1)%ids.length];
      if (cross2(poly[a],poly[b],poly[c]) <= 1e-14) continue;
      if (ids.some((q) => q !== a && q !== b && q !== c && inside(poly[q],poly[a],poly[b],poly[c]))) continue;
      triangles.push(a,b,c); cut = i; break;
    }
    if (cut < 0) throw geometryError(operator, 'cannot triangulate profile cap; remove redundant or intersecting points');
    ids.splice(cut,1);
  }
  if (cross2(poly[ids[0]],poly[ids[1]],poly[ids[2]]) <= 1e-14) throw geometryError(operator, 'degenerate profile cap');
  triangles.push(...ids);
  return triangles;
}
function sectionLoft(p, budget) {
  const op = 'recipe sectionLoft';
  if (!Array.isArray(p.sections) || p.sections.length < 2) throw geometryError(op, 'sections needs at least two stations');
  const steps = segment(p.steps,1,op,'steps',1), caps = boolean(p.caps,true,op,'caps');
  const global = p.profile === undefined ? null : closedProfile(p.profile,op);
  const sections = p.sections.map((s, i) => {
    if (!s || typeof s !== 'object') throw geometryError(op, `invalid section ${i}`);
    const profile = s.profile === undefined ? global : closedProfile(s.profile,op);
    if (!profile) throw geometryError(op, `section ${i} needs a profile or a shared profile`);
    return { z:number(s.z,undefined,op,`sections[${i}].z`), w:positive(s.w,undefined,op,`sections[${i}].w`), h:positive(s.h,undefined,op,`sections[${i}].h`), y:number(s.y,0,op,`sections[${i}].y`), profile };
  }).sort((a,b)=>a.z-b.z);
  const cols = sections[0].profile.length;
  for (let i=0;i<sections.length;i++) {
    if (sections[i].profile.length !== cols) throw geometryError(op,'all profiles need corresponding point counts');
    if (i && sections[i].z === sections[i-1].z) throw geometryError(op,'station z values must be distinct');
  }
  const count = (sections.length-1)*steps+1;
  checkBudget(count*cols, (count-1)*cols*2 + (caps ? (cols-2)*2 : 0), budget, op);
  const vertices = [], profiles = [];
  for (let i=0;i<count;i++) {
    const interval = Math.min(Math.floor(i/steps),sections.length-2), t=(i-interval*steps)/steps, a=sections[interval], b=sections[interval+1];
    const lerp = (x,y)=>x+(y-x)*t, profile = a.profile.map((q,j)=>q.map((v,k)=>lerp(v,b.profile[j][k])));
    closedProfile(profile,op); // Morphs cannot silently pass through self-intersection.
    profiles.push(profile);
    const w=lerp(a.w,b.w), h=lerp(a.h,b.h), y=lerp(a.y,b.y), z=lerp(a.z,b.z);
    for (const q of profile) vertices.push(q[0]*w/2,y+q[1]*h,z);
  }
  const indices=[];
  for (let i=0;i<count-1;i++) for (let j=0;j<cols;j++) {
    const a=i*cols+j,b=i*cols+(j+1)%cols,c=(i+1)*cols+j,d=(i+1)*cols+(j+1)%cols;
    indices.push(a,b,c,b,d,c);
  }
  if (caps) {
    const start=capTriangles(profiles[0],op),end=capTriangles(profiles.at(-1),op),offset=(count-1)*cols;
    for(let i=0;i<start.length;i+=3) indices.push(start[i],start[i+2],start[i+1]);
    for(const id of end) indices.push(offset+id);
  }
  return validateMesh({vertices,indices},{budget,operator:op});
}

/** Build an editable indexed base mesh; sections use z along the body and y as bottom. */
export function buildRecipe(recipe, options = {}) {
  const p=paramsOf(recipe),type=recipe.type,op=`recipe ${type}`,budget=resolveBudget(options.budget,recipe.budget,p.budget);
  let positions;
  if(isContextRecipe(recipe))throw geometryError(op,'needs document context; use evaluateDoc');
  if(type==='nativeMesh')return buildNativeMesh(p,budget);
  if(type==='sectionLoft') return sectionLoft(p,budget);
  if(type==='controlSurface')return buildControlSurface(p,budget);
  if(type==='formBody')return buildFormBody(p,budget);
  if(type==='clayBox'||type==='bevelBox')return buildPlasticBox({...p,...(type==='bevelBox'?{resolution:p.resolution??1}:{})},budget);
  if(type==='curveSweep'||type==='curveTube')return validateMesh(type==='curveTube'?buildCurveTube(p,budget):buildCurveSweep(p,budget),{budget,operator:op});
  if(type==='tyre') {
    const rim=positive(p.rimRadius,.3,op,'rimRadius'),outer=positive(p.outerRadius,.5,op,'outerRadius'),width=positive(p.width,.25,op,'width');
    if(rim>=outer)throw geometryError(op,'requires 0 < rimRadius < outerRadius');
    const s=segment(p.segments,64,op,'segments',8),n=segment(p.profileSegments,4,op,'profileSegments',1),cr=(outer-rim)*.12,cy=width*.12,profile=[];
    checkBudget(s*4*(n+1),s*8*(n+1),budget,op);
    const centres=[[outer-cr,width/2-cy],[rim+cr,width/2-cy],[rim+cr,-width/2+cy],[outer-cr,-width/2+cy]];
    for(let k=0;k<4;k++)for(let j=0;j<=n;j++){const a=(k+j/n)*Math.PI/2;profile.push([centres[k][0]+cr*Math.cos(a),centres[k][1]+cy*Math.sin(a)]);}
    profile.push(profile[0]);return recipeMesh(lathe(profile,s,false),budget,WELD_TOLERANCE,op);
  }
  if(type==='box'||type==='rbox') {
    const w=positive(p.width??p.w,1,op,'width'),h=positive(p.height??p.h,1,op,'height'),d=positive(p.depth??p.d,1,op,'depth');
    checkBudget(type==='box'?8:24,type==='box'?12:44,budget,op);
    if(type==='rbox') {
      const requested=positive(p.c??p.bevel??p.radius,.03,op,'bevel');
      // Match the existing scripted chamferBox's size-relative bevel cap.
      const c=Math.max(.001,Math.min(requested,w*.225,h*.225,d*.225));
      if(c>=Math.min(w,h,d)/2)throw geometryError(op,'dimensions are too small for the supported minimum bevel');
      positions=roundedBox(w,h,d,c);
    } else positions=box(w,h,d);
  } else if(type==='sphere') {
    const rx=positive(p.rx??p.radius,.5,op,'rx'),ry=positive(p.ry,rx,op,'ry'),rz=positive(p.rz,rx,op,'rz'),s=segment(p.segments??p.widthSegments,40,op,'segments'),r=segment(p.rings??p.heightSegments,24,op,'rings',2);
    checkBudget((s+1)*(r+1),s*r*2,budget,op);positions=sphere(rx,ry,rz,s,r);
  } else if(type==='cylinder'||type==='cone') {
    const rb=number(p.radiusBottom??p.radius,.5,op,'radiusBottom',{min:0}),rt=type==='cone'?0:number(p.radiusTop,rb,op,'radiusTop',{min:0}),h=positive(p.height??p.h,1,op,'height'),s=segment(p.segments??p.radialSegments,40,op,'segments'),caps=boolean(p.caps,true,op,'caps');
    if(rb===0&&rt===0) throw geometryError(op,'at least one radius must be positive');
    checkBudget(s*2+2,s*4,budget,op); positions=lathe([[rb,-h/2],[rt,h/2]],s,caps);
  } else if(type==='torus'||type==='torusArc') {
    const R=positive(p.R??p.radius,.6,op,'radius'),r=positive(p.r??p.tube,.15,op,'tube'),s=segment(p.segments??p.radialSegments,48,op,'segments'),t=segment(p.tubeSegments??p.tubularSegments??(p.r!==undefined?p.tube:undefined),20,op,'tubeSegments');
    if(r>=R) throw geometryError(op,'tube radius must be smaller than major radius');
    checkBudget((s+1)*(t+1),s*t*2+(type==='torusArc'?t*2:0),budget,op);
    if(type==='torus') positions=torus(R,r,s,t);
    else {const u0=number(p.u0,0,op,'u0'),u1=number(p.u1,Math.PI,op,'u1');if(u1<=u0||u1-u0>Math.PI*2)throw geometryError(op,'u1-u0 must be in (0,2π]');positions=torusArc(R,r,u0,u1,s,t);if(Math.abs(u1-u0-Math.PI*2)<1e-12)positions=positions.slice(0,s*t*2*9);}
  } else if(type==='lathe') {
    if(!Array.isArray(p.profile)||p.profile.length<2) throw geometryError(op,'profile needs at least two [radius,y] points');
    const profile=p.profile.map((q,i)=>{if(!Array.isArray(q)||q.length!==2)throw geometryError(op,`invalid profile point ${i}`);return [number(q[0],undefined,op,'profile radius',{min:0}),number(q[1],undefined,op,'profile y')];});
    for(let i=1;i<profile.length;i++)if(profile[i][0]===profile[i-1][0]&&profile[i][1]===profile[i-1][1])throw geometryError(op,'duplicate profile point');
    const s=segment(p.segments,48,op,'segments'),caps=boolean(p.caps,true,op,'caps');
    checkBudget((s+1)*profile.length+2,s*(profile.length-1)*2+(caps?s*2:0),budget,op);positions=lathe(profile,s,caps);
  } else if(type==='loft'||type==='hull') {
    if(!Array.isArray(p.sections)||p.sections.length<2)throw geometryError(op,'sections needs at least two stations');
    const s=segment(p.segments,type==='hull'?20:32,op,'segments'),caps=boolean(p.caps,true,op,'caps');
    for(const q of p.sections)if(!q||typeof q!=='object'||Array.isArray(q))throw geometryError(op,'each section must be an object');
    const sections=p.sections.map((q)=>({w:positive(q.w,.5,op,'section w'),h:positive(q.h,.3,op,'section h'),y:number(q.y,0,op,'section y'),z:number(q.z,undefined,op,'section z'),expX:positive(q.expX??p.expX,type==='hull'?.08:.66,op,'expX'),expY:positive(q.expY??p.expY,type==='hull'?.08:.78,op,'expY')})).sort((a,b)=>a.z-b.z);
    for(let i=1;i<sections.length;i++)if(sections[i].z===sections[i-1].z)throw geometryError(op,'station z values must be distinct');
    checkBudget(sections.length*s+2,(sections.length-1)*s*2+(caps?s*2:0),budget,op);
    positions=loftRings(sections.map(q=>carRing(type==='hull'?q.w/2:q.w,q.h,q.y,q.z,s,q.expX,q.expY)),true,caps);
  } else if(type==='extrude') {
    const poly=closedProfile(p.polygon??p.profile,op,false),depth=positive(p.depth,.1,op,'depth');capTriangles(poly,op);
    checkBudget(poly.length*2,poly.length*4-4,budget,op);positions=extrude(poly,depth);
  } else if(type==='spherePatch'||type==='patch') {
    const rx=positive(p.rx??p.radius,1,op,'rx'),ry=positive(p.ry,rx,op,'ry'),rz=positive(p.rz,rx,op,'rz'),u0=number(p.u0,0,op,'u0'),u1=number(p.u1,Math.PI*2,op,'u1'),v0=number(p.v0,.1,op,'v0',{min:0,max:Math.PI}),v1=number(p.v1,Math.PI-.1,op,'v1',{min:0,max:Math.PI}),s=segment(p.segments,28,op,'segments'),r=segment(p.rings,16,op,'rings',1);
    if(u1<=u0||u1-u0>Math.PI*2||v1<=v0)throw geometryError(op,'invalid angular range');checkBudget((s+1)*(r+1),s*r*2,budget,op);positions=spherePatch(rx,ry,rz,u0,u1,v0,v1,s,r);
  } else if(type==='plane') {
    const w=positive(p.width,1.8,op,'width'),h=positive(p.height,1.8,op,'height');positions=box(w,.002,h);
  } else throw geometryError(op,'unknown recipe operator');
  return recipeMesh(positions,budget,number(p.weldTolerance,WELD_TOLERANCE,op,'weldTolerance',{min:0}),op);
}

function subdivide(mesh, mod, budget) {
  const op='modifier subsurf',levels=number(mod.levels,1,op,'levels',{min:0,max:6,integer:true});
  const crease=boolean(mod.crease,false,op,'crease'),angle=number(mod.creaseAngle,Math.PI/3,op,'creaseAngle',{min:0,max:Math.PI});
  for(let level=0;level<levels;level++) {
    checkBudget(mesh.vertices.length/3,mesh.indices.length/3*4,budget,op);
    const edges=meshEdges(mesh,op),n=mesh.vertices.length/3,neighbors=Array.from({length:n},()=>new Set()),sharp=Array.from({length:n},()=>new Set());
    const normals=[];for(let i=0;i<mesh.indices.length;i+=3){const v=faceVector(mesh.vertices,...mesh.indices.slice(i,i+3)),len=Math.hypot(...v);if(!len)throw geometryError(op,`zero-area face ${i/3}`);normals.push(v.map(x=>x/len));}
    const sharpKeys=new Set();
    for(const [key,list] of edges){const {a,b}=list[0];neighbors[a].add(b);neighbors[b].add(a);if(list.length===1||(crease&&normals[list[0].face].reduce((s,v,k)=>s+v*normals[list[1].face][k],0)<Math.cos(angle))){sharpKeys.add(key);sharp[a].add(b);sharp[b].add(a);}}
    checkBudget(n+edges.size,mesh.indices.length/3*4,budget,op);
    const vertices=new Array(n*3);
    for(let id=0;id<n;id++) {
      const sharpN=[...sharp[id]],nb=[...neighbors[id]];
      for(let k=0;k<3;k++) {
        const p=mesh.vertices[id*3+k];let value=p;
        if(sharpN.length===2)value=.75*p+.125*(mesh.vertices[sharpN[0]*3+k]+mesh.vertices[sharpN[1]*3+k]);
        else if(sharpN.length<2&&nb.length>=3){const beta=nb.length===3?3/16:3/(8*nb.length);value=p*(1-nb.length*beta)+beta*nb.reduce((s,j)=>s+mesh.vertices[j*3+k],0);}
        vertices[id*3+k]=value;
      }
    }
    const midpoint=new Map();
    for(const [key,list]of edges){const {a,b}=list[0];midpoint.set(key,vertices.length/3);for(let k=0;k<3;k++)vertices.push(list.length===2&&!sharpKeys.has(key)?3/8*(mesh.vertices[a*3+k]+mesh.vertices[b*3+k])+1/8*(mesh.vertices[list[0].opposite*3+k]+mesh.vertices[list[1].opposite*3+k]):(mesh.vertices[a*3+k]+mesh.vertices[b*3+k])/2);}
    const get=(a,b)=>midpoint.get(a<b?`${a}|${b}`:`${b}|${a}`),indices=[];
    for(let i=0;i<mesh.indices.length;i+=3){const[a,b,c]=mesh.indices.slice(i,i+3),ab=get(a,b),bc=get(b,c),ca=get(c,a);indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
    mesh=validateMesh({vertices,indices},{budget,operator:op});
  }
  return mesh;
}
function solidify(mesh,mod,budget) {
  const op='modifier solidify',thickness=positive(mod.thickness,.02,op,'thickness'),offset=number(mod.offset,0,op,'offset',{min:-1,max:1});
  const edges=meshEdges(mesh,op),boundary=[...edges.values()].filter(list=>list.length===1).map(list=>list[0]),n=mesh.vertices.length/3;
  checkBudget(n*2,mesh.indices.length/3*2+boundary.length*2,budget,op);
  const normals=vertexNormals(mesh,op,true),vertices=[],indices=[];
  for(const sign of [1,-1])for(let i=0;i<mesh.vertices.length;i++)vertices.push(mesh.vertices[i]+normals[i]*thickness*(sign+offset)/2);
  for(let i=0;i<mesh.indices.length;i+=3){const[a,b,c]=mesh.indices.slice(i,i+3);indices.push(a,b,c,a+n,c+n,b+n);}
  for(const {a,b}of boundary)indices.push(a,a+n,b+n,a,b+n,b);
  return validateMesh({vertices,indices},{budget,operator:op});
}
export function applyMeshModifiers(mesh, modifiers = [], options = {}) {
  const budget=resolveBudget(options.budget);mesh=validateMesh(mesh,{budget,operator:'modifiers'});
  if(!Array.isArray(modifiers)||modifiers.length>32)throw geometryError('modifiers','expected at most 32 modifiers');
  for(const mod of modifiers){
    if(!mod||typeof mod!=='object'||typeof mod.type!=='string')throw geometryError('modifier','expected a named operator');
    const op=`modifier ${mod.type}`;
    if(!['mirror','array','subsurf','solidify','brush'].includes(mod.type))throw geometryError(op,'unknown modifier operator');
    const enabled=boolean(mod.enabled,true,op,'enabled');if(!enabled)continue;
    if(mod.type==='brush'){mesh=applyPlasticBrush(mesh,mod,budget);continue;}
    if(mod.type==='subsurf'){mesh=subdivide(mesh,mod,budget);continue;}
    if(mod.type==='solidify'){mesh=solidify(mesh,mod,budget);continue;}
    if(mod.type==='mirror') {
      const axis=mod.axis??'x';if(!['x','y','z'].includes(axis))throw geometryError(op,'axis must be x, y or z');
      const pivot=number(mod.pivot,0,op,'pivot'),keep=boolean(mod.keepOriginal,true,op,'keepOriginal'),count=keep?2:1;
      checkBudget(mesh.vertices.length/3*count,mesh.indices.length/3*count,budget,op);
      const vertices=keep?mesh.vertices.slice():[],indices=keep?mesh.indices.slice():[],offset=vertices.length/3,ai=['x','y','z'].indexOf(axis);
      for(let i=0;i<mesh.vertices.length;i++)vertices.push(i%3===ai?2*pivot-mesh.vertices[i]:mesh.vertices[i]);
      for(let i=0;i<mesh.indices.length;i+=3)indices.push(mesh.indices[i]+offset,mesh.indices[i+2]+offset,mesh.indices[i+1]+offset);
      mesh=validateMesh({vertices,indices},{budget,operator:op});
    } else {
      const count=number(mod.count,2,op,'count',{min:1,max:10000,integer:true}),offset=vector(mod.offset,[1,0,0],op,'offset');
      checkBudget(mesh.vertices.length/3*count,mesh.indices.length/3*count,budget,op);
      const vertices=[],indices=[],n=mesh.vertices.length/3;
      for(let c=0;c<count;c++){for(let i=0;i<mesh.vertices.length;i++)vertices.push(mesh.vertices[i]+offset[i%3]*c);for(const id of mesh.indices)indices.push(id+c*n);}
      mesh=validateMesh({vertices,indices},{budget,operator:op});
    }
  }
  return mesh;
}
function baseMesh(object,budget,context) {
  if(isContextRecipe(object.recipe)){if(!context)throw geometryError(`recipe ${object.recipe.type}`,'needs document context; use evaluateDoc');return context.base(object,budget);}
  if(object.recipe!==undefined)return buildRecipe(object.recipe,{budget});
  if(object.topology!==undefined)return validateMesh(object.topology,{budget,operator:`topology ${object.name??object.id??''}`});
  if(object.geometryData?.positions!==undefined)return indexMesh(object.geometryData.positions,object.geometryData.evaluatedKernelVersion===KERNEL_VERSION?0:object.weldTolerance??WELD_TOLERANCE,{budget});
  const kind=object.kind;
  const defaults={sphere:{radius:.62,widthSegments:32,heightSegments:20},cylinder:{radiusTop:.42,radiusBottom:.42,height:1.1,radialSegments:32},cone:{radius:.55,height:1.15,radialSegments:32},torus:{radius:.58,tube:.2,radialSegments:20,tubularSegments:40}};
  if(kind===undefined||kind==='custom')return {vertices:[],indices:[]};
  return buildRecipe({type:kind,params:{...defaults[kind],...(object.params||{})}},{budget});
}
function transform(mesh,object,budget) {
  const op=`transform ${object.name??object.id??'object'}`,p=vector(object.position,[0,0,0],op,'position'),r=vector(object.rotation,[0,0,0],op,'rotation'),s=vector(object.scale,[1,1,1],op,'scale');
  if(s.some(v=>v===0))throw geometryError(op,'scale components must be non-zero');
  const vertices=[],indices=mesh.indices.slice(),cz=Math.cos(r[2]),sz=Math.sin(r[2]),cy=Math.cos(r[1]),sy=Math.sin(r[1]),cx=Math.cos(r[0]),sx=Math.sin(r[0]);
  for(let i=0;i<mesh.vertices.length;i+=3){let x=mesh.vertices[i]*s[0],y=mesh.vertices[i+1]*s[1],z=mesh.vertices[i+2]*s[2];[x,y]=[x*cz-y*sz,x*sz+y*cz];[x,z]=[x*cy+z*sy,-x*sy+z*cy];[y,z]=[y*cx-z*sx,y*sx+z*cx];vertices.push(x+p[0],y+p[1],z+p[2]);}
  if(s[0]*s[1]*s[2]<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  return validateMesh({vertices,indices},{budget,operator:op});
}
function normalBuffer(mesh,shading) {
  if(shading!==undefined&&!['flat','smooth'].includes(shading))throw geometryError('shading',`unknown mode ${shading}`);
  if(shading!=='flat')return meshPositions({vertices:vertexNormals(mesh),indices:mesh.indices});
  const normals=[];for(let i=0;i<mesh.indices.length;i+=3){const n=faceVector(mesh.vertices,...mesh.indices.slice(i,i+3)),l=Math.hypot(...n);if(!Number.isFinite(l))throw geometryError('normals','normal overflow');for(let j=0;j<3;j++)for(const v of n)normals.push(l?v/l:0);}return normals;
}
function transformCornerNormals(normals,object) {
  const r=object.rotation??[0,0,0],s=object.scale??[1,1,1];
  if(r.every(v=>v===0)&&s.every(v=>v===1))return normals.slice();
  const out=[],cz=Math.cos(r[2]),sz=Math.sin(r[2]),cy=Math.cos(r[1]),sy=Math.sin(r[1]),cx=Math.cos(r[0]),sx=Math.sin(r[0]);
  for(let i=0;i<normals.length;i+=3){let x=normals[i]/s[0],y=normals[i+1]/s[1],z=normals[i+2]/s[2];[x,y]=[x*cz-y*sz,x*sz+y*cz];[x,z]=[x*cy+z*sy,-x*sy+z*cy];[y,z]=[y*cx-z*sx,y*sx+z*cx];const length=Math.hypot(x,y,z);if(!Number.isFinite(length))throw geometryError('normals','normal transform overflow');out.push(length?x/length:0,length?y/length:0,length?z/length:0);}
  if(s[0]*s[1]*s[2]<0)for(let i=0;i<out.length;i+=9)for(let k=0;k<3;k++)[out[i+3+k],out[i+6+k]]=[out[i+6+k],out[i+3+k]];
  return out;
}
function suppliedNormals(object) {
  if(object.geometryData?.evaluatedKernelVersion!==KERNEL_VERSION||object.recipe!==undefined||object.topology!==undefined)return null;
  const normals=object.geometryData.normals;
  if(!(Array.isArray(normals)||ArrayBuffer.isView(normals))||normals.length!==object.geometryData.positions.length||!Array.from(normals).every(Number.isFinite))throw geometryError('normals','invalid evaluated corner normal buffer');
  return Array.from(normals);
}
function identity(object,index) { return String(object.id??object.semanticId??object.key??object.name??`part_${index}`); }
function collect(object,{world,base,budget,parents=[],index=0,active=new Set(),inheritedVisible=true,context}) {
  if(!object||typeof object!=='object'||Array.isArray(object))throw geometryError('evaluateObject','expected an object');
  if(active.has(object))throw geometryError('evaluateObject','cyclic object.parts');
  if(parents.length>64)throw geometryError('evaluateObject','hierarchy depth budget exceeded');
  active.add(object);budget=resolveBudget(budget,object.budget);
  if(base)applyMeshModifiers({vertices:[],indices:[]},object.modifiers??[],{budget});
  // Local-space requests still validate the object's transform instead of hiding bad inputs.
  transform({vertices:[],indices:[]},object,budget);
  const id=identity(object,index),visible=boolean(object.visible,true,'evaluateObject','visible')&&inheritedVisible;
  let packets;
  if(object.parts!==undefined){
    if(!Array.isArray(object.parts))throw geometryError('evaluateObject','parts must be an array');
    if(object.parts.length>budget.maxObjects)throw geometryError('evaluateObject','object budget exceeded');
    packets=[];let childVertices=0,childTriangles=0;
    for(let i=0;i<object.parts.length;i++){
      const childPackets=collect(object.parts[i],{world:true,base,budget,parents:[...parents,id],index:i,active,inheritedVisible:visible,context});
      for(const packet of childPackets){childVertices+=packet.mesh.vertices.length/3;childTriangles+=packet.mesh.indices.length/3;checkBudget(childVertices,childTriangles,budget,'evaluateObject');packets.push(packet);if(packets.length>budget.maxObjects)throw geometryError('evaluateObject','object budget exceeded');}
    }
    if(object.materialOverride!==undefined&&object.materialOverride!==false){const material=object.materialOverride===true?object.material:object.materialOverride;if(!material||typeof material!=='object'||Array.isArray(material))throw geometryError('materialOverride','expected a material object or true with object.material');for(const packet of packets){packet.material=clone(material);packet.overrideMaterials=true;}}
  }else {
   const mesh=baseMesh(object,budget,context),metadata=context?.metadata(object);
   packets=[{mesh,attributes:{...(mesh.cornerUV?{uvs:mesh.cornerUV}:{}),...(mesh.cornerDetailUV?{detailUvs:mesh.cornerDetailUV}:{}),...(mesh.triangleMaterialIndices?{materialIndices:mesh.triangleMaterialIndices}:{}),...(mesh.triangleFaceIds?{faceIds:mesh.triangleFaceIds}:{}),...(mesh.triangleSourceFaceIds?{sourceFaceIds:mesh.triangleSourceFaceIds}:{}),...(mesh.triangleInstanceIndices?{instanceIndices:mesh.triangleInstanceIndices}:{})},normals:object.shading==='flat'?null:(mesh.cornerNormals||suppliedNormals(object)),object,material:clone(metadata?.material??object.material),shading:metadata?.shading??object.shading,metadata,sourceId:object.sourceId??object.id??id,semanticId:object.semanticId??object.key??object.id??id,parents:parents.length?parents:clone(object.parentIds||[]),id:parents.length?[...parents,id].join('/'):id,visible:visible&&metadata?.visible!==false}];
 }
  if(packets.length>budget.maxObjects)throw geometryError('evaluateObject','object budget exceeded');
  let evaluatedVertices=0,evaluatedTriangles=0;
  for(const packet of packets){
    if(!base){if(packet.object.recipe?.type==='nativeMesh'&&(object.modifiers||[]).some(mod=>mod.enabled!==false))throw geometryError('nativeMesh','use native feature stack; legacy post modifiers would invalidate native attributes/selection');packet.mesh=applyMeshModifiers(packet.mesh,object.modifiers??[],{budget});if((object.modifiers??[]).some(mod=>mod.enabled!==false)){packet.normals=null;packet.attributes={};}}
    if(world){packet.mesh=transform(packet.mesh,object,budget);if(packet.normals)packet.normals=transformCornerNormals(packet.normals,object);if((object.scale||[1,1,1]).reduce((n,x)=>n*x,1)<0)for(const field of ['uvs','detailUvs'])if(packet.attributes?.[field]){const uv=packet.attributes[field].slice();for(let i=0;i<uv.length;i+=6)for(let k=0;k<2;k++)[uv[i+2+k],uv[i+4+k]]=[uv[i+4+k],uv[i+2+k]];packet.attributes={...packet.attributes,[field]:uv};}}
    evaluatedVertices+=packet.mesh.vertices.length/3;evaluatedTriangles+=packet.mesh.indices.length/3;
    checkBudget(evaluatedVertices,evaluatedTriangles,budget,'evaluateObject');
  }
  active.delete(object);
  return packets;
}
/** local excludes this object's own TRS, but includes child TRS. base skips the full modifier hierarchy. */
export function evaluateObject(object,options={}) {
  if(!options||typeof options!=='object'||Array.isArray(options))throw geometryError('evaluateObject','options must be an object');
  const world=boolean(options.world,false,'evaluateObject','world'),base=boolean(options.base,false,'evaluateObject','base');
  const limits=resolveBudget(options.budget),packets=collect(object,{world,base,budget:limits}),vertices=[],indices=[],groups=[],positions=[],normals=[];
  for(const packet of packets){const offset=vertices.length/3,start=indices.length;append(vertices,packet.mesh.vertices);for(const id of packet.mesh.indices)indices.push(id+offset);append(positions,meshPositions(packet.mesh));append(normals,packet.normals??normalBuffer(packet.mesh,packet.shading??packet.object.shading));groups.push({start,count:packet.mesh.indices.length,material:clone(packet.material??{color:'#c0c7d4',metalness:.1,roughness:.5,opacity:1}),sourceId:packet.sourceId,semanticId:packet.semanticId,groupId:packet.parents.at(-1)??null,parentIds:packet.parents.slice()});}
  return {positions,normals,topology:{vertices,indices},groups,evaluatedKernelVersion:KERNEL_VERSION,space:world?'world':'local',base};
}
// Context is invocation-local: no global geometry cache or persisted baked relation.
function documentContext(doc,budget,base) {
  const entries=new Map(),byId=new Map();let contextual=false;
  const walk=(objects,ancestors=[])=>{
    if(ancestors.length>64)throw geometryError('relations','hierarchy depth budget exceeded');
    for(const object of objects){
      if(!object||typeof object!=='object'||Array.isArray(object))throw geometryError('evaluateObject','expected an object');
      if(entries.has(object))throw geometryError('relations','cyclic/shared object hierarchy');
      const parent=ancestors.at(-1),matrix=multiplyMatrix(parent?.matrix??identityMatrix(),objectMatrix(object));
      const entry={object,ancestors:ancestors.slice(),matrix};entries.set(object,entry);
      if(isContextRecipe(object.recipe))contextual=true;
      if(object.id!==undefined){if(byId.has(object.id))entry.duplicate=true;else byId.set(object.id,entry);}
      if(object.parts!==undefined){if(!Array.isArray(object.parts))throw geometryError('relations','parts must be an array');walk(object.parts,[...ancestors,entry]);}
    }
  };
  walk(doc.objects);if(!contextual)return undefined;
  for(const entry of entries.values())if(entry.duplicate)throw geometryError('relations',`duplicate object ID ${entry.object.id}`);
  const refs=entry=>{
    const out=(entry.object.parts??[]).map(o=>entries.get(o));
    if(!entry.object.parts&&isContextRecipe(entry.object.recipe))for(const id of recipeDependencies(entry.object.recipe)){
      if(!byId.has(id))throw geometryError('relations',`target does not exist: ${id}`);out.push(byId.get(id));
    }
    return out;
  };
  const visited=new Set(),active=new Set();
  const visit=(entry,depth=0)=>{if(active.has(entry))throw geometryError('relations',`dependency cycle at ${entry.object.id}`);if(visited.has(entry))return;if(depth>128)throw geometryError('relations','dependency depth budget exceeded');active.add(entry);for(const dep of refs(entry))visit(dep,depth+1);active.delete(entry);visited.add(entry);};
  for(const entry of entries.values())visit(entry);
  const bases=new Map(),targets=new Map(),metadata=new Map(),resolving=new Set();let context;
  const mergePackets=packets=>{const vertices=[],indices=[];for(const packet of packets){const offset=vertices.length/3;append(vertices,packet.mesh.vertices);for(const id of packet.mesh.indices)indices.push(offset+id);checkBudget(vertices.length/3,indices.length/3,budget,'relations target');}return {vertices,indices};};
  const target=id=>{
    if(targets.has(id))return targets.get(id);const entry=byId.get(id);if(!entry)throw geometryError('relations',`target does not exist: ${id}`);
    if(resolving.has(entry))throw geometryError('relations',`dependency cycle at ${id}`);resolving.add(entry);
    const local=mergePackets(collect(entry.object,{world:false,base,budget,context})),packets=collect(entry.object,{world:true,base,budget,context});
    for(let i=entry.ancestors.length-1;i>=0;i--)for(const packet of packets){const o=entry.ancestors[i].object;if(!base)packet.mesh=applyMeshModifiers(packet.mesh,o.modifiers??[],{budget});packet.mesh=transform(packet.mesh,o,budget);packet.visible=packet.visible&&o.visible!==false;if(o.materialOverride!==undefined&&o.materialOverride!==false){packet.material=clone(o.materialOverride===true?o.material:o.materialOverride);packet.overrideMaterials=true;}}
    const result={object:entry.object,local,mesh:mergePackets(packets),matrix:entry.matrix,metadata:metadata.get(entry.object),material:clone(packets[0]?.material),shading:packets[0]?.shading??entry.object.shading,visible:packets.some(p=>p.visible),ancestorModifiers:entry.ancestors.some(e=>(e.object.modifiers??[]).some(m=>m.enabled!==false))};
    resolving.delete(entry);targets.set(id,result);return result;
  };
  context={metadata:object=>metadata.get(object),base:(object,limits)=>{
    if(bases.has(object)){const saved=bases.get(object);return {...validateMesh(saved,{budget:limits,operator:'relations'}),...Object.fromEntries(['cornerNormals','cornerUV','cornerDetailUV','triangleMaterialIndices','triangleFaceIds','vertexIds','vertexSourceIds','vertexInstanceIndices','triangleSourceFaceIds','triangleInstanceIndices'].filter(k=>saved[k]).map(k=>[k,saved[k]]))};}
    const entry=entries.get(object);if(!entry)throw geometryError('relations','object is outside document context');
    let depth=0;
    const record=value=>{if(depth!==1)return;const roles=value.directionRoles,validForGeometry=![entry,...entry.ancestors].some(e=>(e.object.modifiers??[]).some(m=>m.enabled!==false));metadata.set(object,{...value,...(roles?{directionRoles:{...roles,ownerEditableId:String(object.id??''),validForGeometry:roles.validForGeometry!==false&&validForGeometry}}:{})});};
    const recipe=(descriptor,requested=limits)=>{if(++depth>32)throw geometryError('relations','recipe nesting budget exceeded');const mesh=isContextRecipe(descriptor)?evaluateRelation(descriptor,{matrix:entry.matrix,target,recipe,record},{budget:requested}):buildRecipe(descriptor,{budget:requested});depth--;return mesh;};
    const mesh=recipe(object.recipe);bases.set(object,mesh);return mesh;
  }};
  return context;
}
/** A v1 clone whose identity-TRS drawing leaves have already evaluated all modifiers. */
export function evaluateDoc(doc,options={}) {
  if(!doc||typeof doc!=='object'||!Array.isArray(doc.objects))throw geometryError('evaluateDoc','expected a document with objects[]');
  if(!options||typeof options!=='object'||Array.isArray(options))throw geometryError('evaluateDoc','options must be an object');
  const base=boolean(options.base,false,'evaluateDoc','base'),budget=resolveBudget(options.budget,doc.budget),objects=[];let vertices=0,triangles=0;
  if(doc.objects.length>budget.maxObjects)throw geometryError('evaluateDoc','object budget exceeded');
  const context=documentContext(doc,budget,base);
  for(let i=0;i<doc.objects.length;i++){
    const packets=collect(doc.objects[i],{world:true,base,budget,index:i,context});
    for(const packet of packets){
      const leaf=clone(packet.object);for(const field of ['recipe','topology','parts','materialOverride'])delete leaf[field];
      leaf.id=packet.id;leaf.editableId=String(packet.object.id ?? packet.semanticId);leaf.sourceId=packet.sourceId;leaf.semanticId=packet.semanticId;leaf.parentIds=packet.parents.slice();leaf.groupId=packet.parents.at(-1)??leaf.groupId??null;
      leaf.kind='custom';leaf.params={};leaf.position=[0,0,0];leaf.rotation=[0,0,0];leaf.scale=[1,1,1];leaf.modifiers=[];leaf.visible=packet.visible;
      if(packet.overrideMaterials)delete leaf.materialSlots;leaf.material=clone(packet.material??{color:'#c0c7d4',metalness:.1,roughness:.5,opacity:1});if(packet.metadata?.directionRoles)leaf.directionRoles=clone(packet.metadata.directionRoles);if(packet.metadata?.mirror)leaf.mirror=clone(packet.metadata.mirror);leaf.geometryData={positions:meshPositions(packet.mesh),normals:packet.normals??normalBuffer(packet.mesh,packet.shading??packet.object.shading),...packet.attributes,evaluatedKernelVersion:KERNEL_VERSION};
      objects.push(leaf);vertices+=packet.mesh.vertices.length/3;triangles+=packet.mesh.indices.length/3;
      checkBudget(vertices,triangles,budget,'evaluateDoc');if(objects.length>budget.maxObjects)throw geometryError('evaluateDoc','object budget exceeded');
    }
  }
  return {...clone(doc),version:1,meta:{...clone(doc.meta||{}),evaluatedKernelVersion:KERNEL_VERSION},objects};
}
