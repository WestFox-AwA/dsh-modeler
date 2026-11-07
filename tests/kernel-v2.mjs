import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { buildRecipe, evaluateObject, evaluateDoc, applyMeshModifiers, KERNEL_VERSION } from '../lib/kernel.js';
import { indexMesh, moveVertices, extrudeFaces, meshPositions, meshEdges, WELD_TOLERANCE } from '../lib/topology.js';
import { box, sphere, lathe, torus, loftRings, carRing } from '../lib/generate.js';

// Run directly with Node. The browser bundle is exercised in a separate VM realm
// without Node globals; its result is compared to the native ESM evaluator.
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);
function nearArray(a,b,eps=1e-8){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)near(a[i],b[i],eps);}
function bounds(p){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++) {min[i%3]=Math.min(min[i%3],p[i]);max[i%3]=Math.max(max[i%3],p[i]);}return {min,max};}
function volume(mesh){const p=meshPositions(mesh);let v=0;for(let i=0;i<p.length;i+=9)v+=(p[i]*(p[i+4]*p[i+8]-p[i+5]*p[i+7])+p[i+1]*(p[i+5]*p[i+6]-p[i+3]*p[i+8])+p[i+2]*(p[i+3]*p[i+7]-p[i+4]*p[i+6]))/6;return v;}
function closed(mesh){const edges=meshEdges(mesh);assert.ok(edges.size);for(const edge of edges.values())assert.equal(edge.length,2);assert.ok(volume(mesh)>0);}
function normalizedNormals(result){assert.equal(result.positions.length,result.normals.length);for(let i=0;i<result.normals.length;i+=3)near(Math.hypot(...result.normals.slice(i,i+3)),1,1e-8);}
const quad={vertices:[0,0,0,1,0,0,1,1,0,0,1,0],indices:[0,1,2,0,2,3]};
const profile=[[-1,0],[1,0],[1,.6],[.55,1],[-.55,1],[-1,.6]];
const stations=[{z:-2,w:1.5,h:.7,y:.2},{z:0,w:2,h:.9,y:.15},{z:2,w:1.2,h:.55,y:.3}];

test('box and all legacy generators retain their coordinates',()=>{
  const cases=[
    [{type:'box',params:{w:2,h:3,d:4}},box(2,3,4)],
    [{type:'sphere',params:{rx:1,ry:2,rz:.5,segments:16,rings:10}},sphere(1,2,.5,16,10)],
    [{type:'cylinder',params:{radiusBottom:.7,radiusTop:.4,height:2,segments:16}},lathe([[.7,-1],[.4,1]],16,true)],
    [{type:'cone',params:{radius:.7,height:2,segments:16}},lathe([[.7,-1],[0,1]],16,true)],
    [{type:'torus',params:{R:1,r:.2,segments:16,tube:8}},torus(1,.2,16,8)],
    [{type:'lathe',params:{profile:[[.3,-1],[.6,0],[.2,1]],segments:16}},lathe([[.3,-1],[.6,0],[.2,1]],16,true)],
    [{type:'loft',params:{sections:stations,segments:16}},loftRings(stations.map(s=>carRing(s.w,s.h,s.y,s.z,16,.66,.78)),true,true)],
    [{type:'hull',params:{sections:stations,segments:16}},loftRings(stations.map(s=>carRing(s.w/2,s.h,s.y,s.z,16,.08,.08)),true,true)],
  ];
  for(const [recipe,expected]of cases)nearArray(meshPositions(buildRecipe(recipe)),expected,2e-7);
});
test('box, rbox, sphere, cylinder, cone, torus, lathe, hull and loft are outward closed',()=>{
  for(const recipe of [{type:'box'},{type:'rbox',params:{w:2,h:1,d:3,c:.1}},{type:'sphere',params:{segments:16,rings:12}},{type:'cylinder',params:{segments:16}},{type:'cone',params:{segments:16}},{type:'torus',params:{segments:16,tubeSegments:8}},{type:'lathe',params:{profile:[[.3,-1],[.6,0],[.2,1]],segments:16}},{type:'loft',params:{sections:stations,segments:16}},{type:'hull',params:{sections:stations,segments:16}}])closed(buildRecipe(recipe));
});
test('thin legacy rbox recipes retain the scripted size-relative bevel cap',()=>{
  const large=buildRecipe({type:'rbox',params:{w:.08,h:.02,d:.2,c:.03}}),capped=buildRecipe({type:'rbox',params:{w:.08,h:.02,d:.2,c:.0045}});
  nearArray(meshPositions(large),meshPositions(capped));closed(large);
});
test('base and modifier evaluation share array bounds and leave input intact',()=>{
  const object={id:'array',recipe:{type:'box',params:{w:2,h:1,d:1}},position:[3,0,0],modifiers:[{type:'array',count:3,offset:[4,0,0]}]};
  const before=JSON.stringify(object),local=evaluateObject(object),world=evaluateObject(object,{world:true}),base=evaluateObject(object,{base:true});
  assert.equal(local.positions.length,box(2,1,1).length*3);assert.deepEqual(bounds(local.positions),{min:[-1,-.5,-.5],max:[9,.5,.5]});
  assert.deepEqual(bounds(world.positions),{min:[2,-.5,-.5],max:[12,.5,.5]});assert.deepEqual(bounds(base.positions),{min:[-1,-.5,-.5],max:[1,.5,.5]});assert.equal(JSON.stringify(object),before);
});
test('mirroring and negative TRS reverse winding exactly once',()=>{
  const base=buildRecipe({type:'box'}),mirror=applyMeshModifiers(base,[{type:'mirror',axis:'x',pivot:2}]);
  near(volume(mirror),volume(base)*2);closed(mirror);
  const result=evaluateObject({topology:base,scale:[-2,1,1],shading:'flat'},{world:true});near(volume(result.topology),2);normalizedNormals(result);
  for(let i=0;i<result.positions.length;i+=9){const center=[0,1,2].map(k=>(result.positions[i+k]+result.positions[i+k+3]+result.positions[i+k+6])/3);assert.ok(center.reduce((s,v,k)=>s+v*result.normals[i+k],0)>0);}
});
test('Loop subdivision changes control shape, preserves boundaries and honors crease',()=>{
  const mesh=buildRecipe({type:'box'}),smooth=applyMeshModifiers(mesh,[{type:'subsurf',levels:1}]),crease=applyMeshModifiers(mesh,[{type:'subsurf',levels:1,crease:true}]);
  assert.equal(smooth.indices.length,mesh.indices.length*4);closed(smooth);closed(crease);assert.notDeepEqual(smooth.vertices.slice(0,3),mesh.vertices.slice(0,3));near(bounds(meshPositions(crease)).max[0],.5);
  const open=applyMeshModifiers(quad,[{type:'subsurf',levels:1}]);assert.equal(open.indices.length,24);nearArray(open.vertices.slice(0,3),[.125,.125,0]);
});
test('indexed move updates all incident corners without tearing',()=>{
  const mesh=indexMesh(meshPositions(quad)),id=mesh.indices[0],moved=moveVertices(mesh,{vertices:[id,id],delta:[0,0,2]});
  assert.equal(mesh.vertices.length,12);assert.deepEqual(moved.indices,mesh.indices);assert.deepEqual(mesh.vertices,[0,0,0,1,0,0,1,1,0,0,1,0]);
  const pos=meshPositions(moved),slots=mesh.indices.flatMap((v,i)=>v===id?[i*3]:[]);assert.equal(slots.length,2);for(const i of slots)near(pos[i+2],2);
});
test('welding is Euclidean across hash cell boundaries and exact mode is explicit',()=>{
  const p=[.99,0,0,2,0,0,0,2,0,1.01,0,0,0,2,0,2,0,0];
  assert.equal(indexMesh(p,.1).vertices.length/3,3);assert.equal(indexMesh(p,0).vertices.length/3,4);assert.equal(WELD_TOLERANCE,1e-7);
  const diagonal=[0,0,0,2,0,0,0,2,0,.09,.09,0,0,2,0,2,0,0];assert.equal(indexMesh(diagonal,.1).vertices.length/3,4);
});
test('solidify creates walls only on four boundary edges, never the shared diagonal',()=>{
  const shell=applyMeshModifiers(quad,[{type:'solidify',thickness:.2}]);assert.equal(shell.vertices.length/3,8);assert.equal(shell.indices.length/3,12);closed(shell);near(volume(shell),.2);
  for(let i=12;i<shell.indices.length;i+=3){const ids=shell.indices.slice(i,i+3).map(id=>id%4);assert.ok(!ids.includes(0)||!ids.includes(2),'unexpected diagonal wall');}
  const b=bounds(meshPositions(shell));nearArray(b.min,[0,0,-.1]);nearArray(b.max,[1,1,.1]);
});
test('solidify closed surfaces makes two oriented shells and no extra walls',()=>{
  const cube=buildRecipe({type:'box'}),shell=applyMeshModifiers(cube,[{type:'solidify',thickness:.1}]);assert.equal(shell.indices.length,cube.indices.length*2);meshEdges(shell);
});
test('regional face extrusion shares moved region vertices and skips internal edges',()=>{
  const extruded=extrudeFaces(quad,{faces:[0,1],distance:.5});assert.equal(extruded.vertices.length/3,8);assert.equal(extruded.indices.length/3,10);assert.deepEqual(extruded.indices.slice(0,6),[4,5,6,4,6,7]);
  for(let i=6;i<extruded.indices.length;i+=3){const ids=extruded.indices.slice(i,i+3).map(id=>id%4);assert.ok(!ids.includes(0)||!ids.includes(2),'unexpected region diagonal wall');}
  const cube=buildRecipe({type:'box'}),result=extrudeFaces(cube,{faces:[0,1],distance:.25});closed(result);assert.ok(volume(result)>volume(cube));
});
test('explicit section loft is closed and flat normals point out of caps',()=>{
  const recipe={type:'sectionLoft',params:{sections:stations,profile,steps:3}},mesh=buildRecipe(recipe);closed(mesh);
  assert.equal(mesh.vertices.length/3,7*profile.length);const result=evaluateObject({recipe,shading:'flat'});normalizedNormals(result);
  let front=0,back=0;for(let i=0;i<result.positions.length;i+=9){const z=[result.positions[i+2],result.positions[i+5],result.positions[i+8]];if(z.every(v=>v===-2)){near(result.normals[i+2],-1);front++;}if(z.every(v=>v===2)){near(result.normals[i+2],1);back++;}}
  assert.equal(front,profile.length-2);assert.equal(back,profile.length-2);
});
test('per-station profiles change shoulder shape at identical triangle budget',()=>{
  const recipe={type:'sectionLoft',params:{sections:stations,profile}},baseline=buildRecipe(recipe),changed=structuredClone(recipe);
  changed.params.sections[1].profile=[[-1,0],[1,0],[1,.35],[.8,1],[-.8,1],[-1,.35]];
  const reshaped=buildRecipe(changed);assert.equal(baseline.indices.length,reshaped.indices.length);assert.notDeepEqual(baseline.vertices,reshaped.vertices);near(reshaped.vertices[(profile.length+2)*3+1],.15+.35*.9);closed(reshaped);
});
test('wheel-arch station envelope remains a closed body with an actual raised lower boundary',()=>{
  const arch=[[-1,0],[1,0],[1,1],[-1,1]],sections=[{z:-2,w:2,h:1,y:0},{z:-1,w:2,h:.55,y:.45},{z:0,w:2,h:1,y:0},{z:1,w:2,h:.55,y:.45},{z:2,w:2,h:1,y:0}];
  const mesh=buildRecipe({type:'sectionLoft',params:{sections,profile:arch,steps:2}});closed(mesh);
  const points=[];for(let i=0;i<mesh.vertices.length;i+=3)if(mesh.vertices[i+2]===-1)points.push(mesh.vertices.slice(i,i+3));near(Math.min(...points.map(p=>p[1])),.45);near(Math.max(...points.map(p=>p[1])),1);
  // A concave explicit cross-section is also capped with ear clipping, not a fan.
  const concave=[[-1,0],[1,0],[1,1],[.2,1],[.2,.4],[-.2,.4],[-.2,1],[-1,1]];closed(buildRecipe({type:'sectionLoft',params:{profile:concave,sections:[{z:0,w:2,h:1},{z:2,w:2,h:1}]}}));
});
test('wheel relief edits outer lower profile while the center keel stays fixed',()=>{
  const plain=[[-1,0],[-.55,.1],[-.4,0],[.4,0],[.55,.1],[1,0],[1,1],[-1,1]],relief=[[-1,.5],[-.55,.5],[-.4,0],[.4,0],[.55,.5],[1,.5],[1,1],[-1,1]];
  const mesh=buildRecipe({type:'sectionLoft',params:{profile:plain,sections:[{z:-2,w:2,h:1},{z:0,w:2,h:1,profile:relief},{z:2,w:2,h:1}],steps:2}});closed(mesh);
  const middle=mesh.vertices.slice(2*plain.length*3,3*plain.length*3);near(middle[1],.5);near(middle[2*3+1],0);near(middle[5*3+1],.5);
});
test('full torus arc closes the tube without coincident end caps',()=>{
  const mesh=buildRecipe({type:'torusArc',params:{R:1,r:.2,u0:0,u1:Math.PI*2,segments:16,tubeSegments:8}});closed(mesh);assert.equal(mesh.indices.length/3,16*8*2);
});
test('compound TRS composes in Three XYZ order and preserves leaf materials',()=>{
  const red={color:'#f00',roughness:.2},blue={color:'#00f',roughness:.8},doc={version:2,meta:{title:'compound'},objects:[{id:'root',material:{color:'#0f0'},position:[10,0,0],rotation:[0,0,Math.PI/2],scale:[2,1,1],parts:[{id:'red',recipe:{type:'box'},position:[1,0,0],material:red},{id:'nested',position:[0,3,0],parts:[{id:'blue',recipe:{type:'box'},scale:[1,2,1],material:blue}]}]}]};
  const before=JSON.stringify(doc),out=evaluateDoc(doc);assert.equal(out.objects.length,2);assert.deepEqual(out.objects.map(o=>o.material),[red,blue]);assert.deepEqual(out.objects.map(o=>o.sourceId),['red','blue']);assert.deepEqual(out.objects[1].parentIds,['root','nested']);assert.equal(out.objects[1].groupId,'nested');
  nearArray(bounds(out.objects[0].geometryData.positions).min,[9.5,1,-.5]);nearArray(bounds(out.objects[0].geometryData.positions).max,[10.5,3,.5]);nearArray(bounds(out.objects[1].geometryData.positions).min,[6,-1,-.5]);nearArray(bounds(out.objects[1].geometryData.positions).max,[8,1,.5]);
  const merged=evaluateObject(doc.objects[0],{world:true});nearArray(merged.positions,out.objects.flatMap(o=>o.geometryData.positions));assert.equal(merged.groups.length,2);assert.equal(JSON.stringify(doc),before);
});
test('compound material override is explicit and reversible by input immutability',()=>{
  const object={id:'parent',material:{color:'#0f0'},parts:[{id:'a',kind:'box',material:{color:'#f00'}},{id:'b',kind:'box',material:{color:'#00f'}}]};
  assert.deepEqual(evaluateObject(object).groups.map(g=>g.material.color),['#f00','#00f']);object.materialOverride=true;assert.deepEqual(evaluateObject(object).groups.map(g=>g.material.color),['#0f0','#0f0']);object.materialOverride={color:'#abc',roughness:.1};assert.deepEqual(evaluateObject(object).groups.map(g=>g.material.color),['#abc','#abc']);
});
test('compound modifiers run in parent-local space while keeping distinct draw leaves',()=>{
  const object={id:'p',position:[3,0,0],modifiers:[{type:'array',count:2,offset:[4,0,0]}],parts:[{id:'a',kind:'box',position:[2,0,0],material:{color:'#f00'}},{id:'b',kind:'box',position:[0,2,0],material:{color:'#00f'}}]};
  const out=evaluateDoc({objects:[object]});assert.equal(out.objects.length,2);assert.equal(out.objects[0].geometryData.positions.length,box(1,1,1).length*2);nearArray(bounds(out.objects[0].geometryData.positions).min,[4.5,-.5,-.5]);nearArray(bounds(out.objects[0].geometryData.positions).max,[9.5,.5,.5]);
});
test('evaluated document is a pure v1 derived clone and repeated evaluation is idempotent',()=>{
  const doc={version:2,meta:{tag:'preserved'},objects:[{id:'array',semanticId:'fin',recipe:{type:'box'},position:[2,1,0],modifiers:[{type:'array',count:2,offset:[2,0,0]}]}]},out=evaluateDoc(doc);
  assert.equal(out.version,1);assert.equal(out.meta.evaluatedKernelVersion,KERNEL_VERSION);assert.equal(out.meta.tag,'preserved');const o=out.objects[0];for(const key of ['recipe','topology','parts'])assert.ok(!(key in o));assert.deepEqual(o.modifiers,[]);assert.deepEqual(o.position,[0,0,0]);assert.equal(o.sourceId,'array');assert.equal(o.semanticId,'fin');assert.deepEqual(evaluateDoc(out),out);
});
test('touching arrays retain supplied evaluated normals across repeated evaluation',()=>{
  const first=evaluateDoc({objects:[{id:'touch',kind:'box',position:[2,0,0],scale:[.1,2,3],modifiers:[{type:'array',count:2,offset:[1,0,0]}],shading:'smooth'}]});
  assert.deepEqual(evaluateDoc(first),first);
  const result=evaluateObject(first.objects[0],{world:true});nearArray(result.positions,first.objects[0].geometryData.positions,0);nearArray(result.normals,first.objects[0].geometryData.normals,0);
});
test('input precedence is parts, recipe, topology, then legacy data',()=>{
  const result=evaluateObject({recipe:{type:'box'},topology:quad,geometryData:{positions:[]}});assert.equal(result.positions.length,108);
  const compound=evaluateObject({parts:[{kind:'box'}],recipe:{type:'invalid'},geometryData:{positions:[]}});assert.equal(compound.positions.length,108);
});
test('disabled visibility is inherited and sources retain semantic identity',()=>{
  const doc={objects:[{id:'p',visible:false,parts:[{id:'q',semanticId:'wheel',kind:'box'}]}]},out=evaluateDoc(doc);assert.equal(out.objects[0].visible,false);assert.equal(out.objects[0].semanticId,'wheel');assert.equal(out.objects[0].sourceId,'q');
});
test('unknown operators and illegal numbers name the failing operation',()=>{
  const bad=[()=>buildRecipe({type:'mystery'}),()=>buildRecipe({type:'box',params:{width:NaN}}),()=>buildRecipe({type:'sphere',params:{segments:3.5}}),()=>buildRecipe({type:'lathe',params:{profile:[[1,0],[Infinity,1]]}}),()=>evaluateObject({kind:'box',modifiers:[{type:'unknown'}]}),()=>evaluateObject({kind:'box',modifiers:[{type:'array',count:2.5}]}),()=>evaluateObject({kind:'box',modifiers:[{type:'mirror',axis:'w'}]}),()=>evaluateObject({kind:'box',scale:[0,1,1]}),()=>evaluateObject({kind:'box',position:[Infinity,0,0]}),()=>moveVertices(quad,{vertices:[90],delta:[1,0,0]}),()=>indexMesh([0,0,NaN,1,0,0,0,1,0]),()=>extrudeFaces(quad,{faces:[0],distance:0})];
  for(const fn of bad)assert.throws(fn,/(recipe|modifier|transform|moveVertices|indexMesh|extrudeFaces).*:/);
  assert.throws(()=>evaluateObject({kind:'box',modifiers:[{type:'unknown',enabled:false}]}),/unknown/);
  assert.throws(()=>evaluateObject({kind:'box',modifiers:[{type:'unknown'}]},{base:true}),/unknown/);
  assert.throws(()=>evaluateObject({kind:'box'},{world:'yes'}),/evaluateObject.*world/);
  assert.throws(()=>buildRecipe({type:'loft',params:{sections:[null,null]}}),/recipe loft/);
  assert.throws(()=>buildRecipe({type:'box',params:{w:1e-12,h:1e-12,d:1e-12}}),/recipe box.*precision/);
});
test('invalid profiles and non-manifold operator inputs fail without fallback caps',()=>{
  assert.throws(()=>buildRecipe({type:'sectionLoft',params:{sections:stations}}),/profile/);
  assert.throws(()=>buildRecipe({type:'sectionLoft',params:{sections:[stations[0],stations[0]],profile}}),/distinct/);
  assert.throws(()=>buildRecipe({type:'sectionLoft',params:{sections:stations,profile:[[-1,0],[1,1],[-1,1],[1,0]]}}),/zero area|self-intersect/);
  const nonmanifold={vertices:[...quad.vertices,0,-1,0],indices:[0,1,2,1,0,3,0,1,4]};assert.throws(()=>applyMeshModifiers(nonmanifold,[{type:'solidify'}]),/solidify.*non-manifold/);
});
test('vertex, face, recipe, modifier, document and coordinate budgets are enforced',()=>{
  assert.throws(()=>buildRecipe({type:'sphere',params:{segments:100,rings:100},budget:{maxTriangles:100}}),/budget/);
  assert.throws(()=>evaluateObject({kind:'box',budget:{maxTriangles:12},modifiers:[{type:'array',count:2}]}),/array.*budget/);
  assert.throws(()=>evaluateObject({kind:'box',budget:{maxTriangles:20},modifiers:[{type:'subsurf',levels:1}]}),/subsurf.*budget/);
  assert.throws(()=>indexMesh(meshPositions(quad),0,{budget:{maxVertices:3}}),/budget/);
  assert.throws(()=>moveVertices(quad,{vertices:[0],delta:[1e20,0,0]}),/coordinate/);
  assert.throws(()=>extrudeFaces(quad,{faces:[0,1],distance:1,budget:{maxTriangles:8}}),/budget/);
  assert.throws(()=>evaluateDoc({budget:{maxTriangles:20},objects:[{kind:'box'},{kind:'box'}]}),/evaluateDoc.*budget/);
  assert.throws(()=>evaluateDoc({budget:{maxObjects:1},objects:[{parts:[{kind:'box'},{kind:'box'}]}]}),/object budget/);
});
test('ESM browser bundle evaluates identical recipes, hierarchy, modifiers and normals',async()=>{
  const result=await build({entryPoints:[new URL('../lib/kernel.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,platform:'browser',format:'iife',globalName:'Kernel',write:false,logLevel:'silent'});
  const context=vm.createContext({});vm.runInContext(result.outputFiles[0].text,context,{timeout:10000});
  const input={version:2,objects:[{id:'body',position:[2,1,0],rotation:[.2,.3,-.1],recipe:{type:'sectionLoft',params:{sections:stations,profile,steps:2}},modifiers:[{type:'array',count:2,offset:[3,0,0]},{type:'solidify',thickness:.03}],shading:'smooth'}]};
  context.input=JSON.stringify(input);const browser=vm.runInContext('JSON.stringify(Kernel.evaluateDoc(JSON.parse(input)))',context,{timeout:10000});assert.deepEqual(JSON.parse(browser),JSON.parse(JSON.stringify(evaluateDoc(input))));
  // Source-level guard keeps host-only packages out of the browser kernel.
  for(const path of ['../lib/kernel.js','../lib/topology.js']){const source=await readFile(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(source,/from\s+['"](?:node:|three)/);}
});

let failed=0;
for(const {name,fn}of tests){try{await fn();console.log(`PASS ${name}`);}catch(error){failed++;console.error(`FAIL ${name}\n${error.stack}`);}}
console.log(`kernel-v2: ${tests.length-failed}/${tests.length} passed`);
if(failed)process.exitCode=1;
