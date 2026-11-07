import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getModelerHelp,quickStart,scriptApi} from '../lib/discovery.js';
import {makeApi,runModelerScript} from '../lib/script.js';
import {evaluateDoc,evaluateObject} from '../lib/kernel.js';
import {createWorkspace} from '../lib/workspace.js';
import {normaliseCapture} from '../lib/evidence.js';
import {resolveCamera} from '../lib/camera.js';
import {diagnoseDoc} from '../lib/diagnostics.js';

const tests=[];
function check(name,fn){try{fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});}}
const plain=v=>JSON.parse(JSON.stringify(v));
const near=(a,b,epsilon=1e-8)=>assert(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
function bounds(positions){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++){const k=i%3;min[k]=Math.min(min[k],positions[i]);max[k]=Math.max(max[k],positions[i]);}return {min,max,size:min.map((v,k)=>max[k]-v)};}
function build(code){const source=runModelerScript(code);const evaluated=evaluateDoc(source);assert(evaluated.objects.length>0);for(const o of evaluated.objects){assert(o.geometryData.positions.length>=9);assert(o.geometryData.positions.every(Number.isFinite));}return {source,evaluated};}
const one=code=>{const r=build(`return m.scene('test',[${code}]);`);return {...r,part:r.source.objects[0],geometry:r.evaluated.objects[0].geometryData.positions};};
function pages(options={}){let offset=0;const items=[],seen=new Set();for(let round=0;round<1000;round++){const r=getModelerHelp({...options,offset});assert.equal(r.ok,true);assert(JSON.stringify(r).length<=12000);assert.equal(r.offset,offset);assert.equal(r.returned,r.items.length);for(const item of r.items){assert(!seen.has(item.id),'duplicate page item '+item.id);seen.add(item.id);items.push(item);}if(r.nextOffset===null){assert.equal(items.length,r.total);assert.equal(r.complete,true);return items;}assert.equal(r.nextOffset,offset+r.items.length);assert(r.nextOffset>offset);assert.equal(r.complete,false);offset=r.nextOffset;}throw new Error('pagination did not terminate');}
const directory=pages({topic:'api'});
const details=directory.map(x=>getModelerHelp({topic:'api',query:x.id}).items[0]);

check('default help and quickStart return the canonical main guide, independent and bounded',()=>{
 const a=getModelerHelp(),b=quickStart();assert.deepEqual(a,b);assert.equal(a.id,'main');assert.equal(a.schema,'dsh-modeler.guide');assert.equal(a.schemaVersion,1);assert(JSON.stringify(a).length<12000);assert.deepEqual(plain(a),a);assert.deepEqual(getModelerHelp(),a);
 a.directory[0].id='mutated';assert.notEqual(getModelerHelp().directory[0].id,'mutated');
 const legacy=getModelerHelp({topic:'legacy_tutorial'});assert.equal(legacy.topic,'start');legacy.items[0].steps[0].action='mutated';assert.equal(getModelerHelp({topic:'legacy_tutorial'}).items[0].steps[0].action,'status');
});
check('all help topics paginate without losing guide entries',()=>{
 for(const topic of ['legacy_tutorial','modeling','edit','observe','relations','source']){const whole=pages({topic,limit:100});assert.deepEqual(pages({topic,limit:1}),whole);}
});
check('API pagination and keyword query preserve exact order at every page size',()=>{
 const queries=['','m.','material','modifier','surface','半径','Part.','sphere','does-not-exist'];
 for(const query of queries){const whole=pages({topic:'api',query,limit:100});for(const limit of [1,2,7,12])assert.deepEqual(pages({topic:'api',query,limit}),whole);}
 assert.equal(new Set(directory.map(x=>x.id)).size,directory.length);
 const last=scriptApi({offset:directory.length,limit:1});assert.deepEqual(last.items,[]);assert.equal(last.nextOffset,null);
});
check('directories defer details and every metadata link retrieves a complete entry',()=>{
 for(const meta of directory){assert.equal('signature' in meta,false);assert.equal('examples' in meta,false);const r=getModelerHelp(meta.detail);assert.equal(r.detail,'entry');assert.equal(r.total,1);assert.equal(r.items[0].id,meta.id);assert(r.items[0].signature);assert(r.items[0].examples.length);assert(JSON.stringify(r).length<=12000);}
});
check('exact names work as topic, query, prefixed names and Part method aliases',()=>{
 for(const name of ['m.sphere','sphere','m.sphere()']){assert.equal(getModelerHelp({topic:name}).items[0].id,'m.sphere');assert.equal(getModelerHelp({query:name}).items[0].id,'m.sphere');}
 assert.equal(scriptApi({query:'mat'}).items[0].id,'m.mat');assert.equal(scriptApi({query:'.mat'}).items[0].id,'Part.mat');assert.equal(scriptApi({query:'part.mods'}).items[0].id,'Part.mods');assert.equal(scriptApi({query:'modifiers.mirror'}).items[0].id,'modifier.mirror');
});
check('unknown topics and names return useful legal choices, not instructions to inspect source',()=>{
 const r=getModelerHelp({topic:'unknown'});assert.equal(r.ok,false);assert.equal(r.code,'unknown_topic');assert.deepEqual(r.topics.map(x=>x.id),['start','modeling','edit','observe','relations','source','api','legacy_tutorial']);assert(r.examples.every(x=>getModelerHelp(x).ok));
 const none=scriptApi({query:'m.spherePatch'});assert.equal(none.total,0);assert(none.suggestions.every(x=>getModelerHelp(x).ok));assert(!JSON.stringify(r).includes('lib/script.js'));
});
check('invalid offsets, counts and text types do not produce silent partial pages',()=>{
 for(const a of [null,[],{offset:-1},{offset:.5},{offset:NaN},{limit:0},{limit:101},{limit:1.5},{query:3},{query:'x'.repeat(257)},{topic:null},{topic:'x'.repeat(101)}]){const r=getModelerHelp(a);assert.equal(r.ok,false);assert.equal(r.code,'invalid_request');assert(JSON.stringify(r).length<=12000);}
});
check('directory matches real public m names and Part methods, without invented m functions',()=>{
 const api=makeApi(),ids=new Set(directory.map(x=>x.id));
 for(const name of Object.keys(api))assert(ids.has('m.'+name),'undocumented m.'+name);
 for(const item of details){if(!item.id.startsWith('m.'))continue;let actual=api;for(const component of item.id.slice(2).split('.'))actual=actual?.[component];assert.notEqual(actual,undefined,'invented '+item.id);}
 for(const name of Object.getOwnPropertyNames(api.Part.prototype).filter(x=>x!=='constructor'))assert(ids.has('Part.'+name),'undocumented Part.'+name);
});
for(const item of details)for(const sample of item.examples)check('executable public example: '+sample.id,()=>{build(sample.code);});
check('every inline code example in guide actions builds real finite geometry',()=>{
 let count=0;const visit=v=>{if(!v||typeof v!=='object')return;for(const [key,item]of Object.entries(v)){if(key==='code'&&typeof item==='string'){build(item);count++;}else visit(item);}};for(const topic of ['legacy_tutorial','modeling','edit','observe','relations','source'])visit(pages({topic}));assert(count>=2);
});
check('omitted primitive arguments match published defaults and produce expected dimensions',()=>{
 const expected={box:[1,1,1],rbox:[1,1,1],sphere:[1,1,1],cylinder:[1,1,1],cone:[1,1,1],torus:[1.5,.3,1.5]};
 for(const [name,size]of Object.entries(expected)){const {geometry,part}=one(`m.${name}()`);const b=bounds(geometry);size.forEach((n,k)=>near(b.size[k],n));const help=details.find(x=>x.id==='m.'+name);for(const field of help.parameters){if(field.name==='name')continue;const storedName=name==='torus'&&field.name==='tube'?'tubeSegments':field.name;const actual=part.recipe.params[storedName];if('default'in field)assert.deepEqual(plain(actual),field.default);else if(field.defaultExpression)near(actual,part.recipe.params[field.defaultExpression]);}}
});
check('cylinder top/bottom order, sphere radii and signature name position affect actual geometry',()=>{
 const {geometry,part}=one("m.cylinder(.2,.5,1,32,'Frustum')");assert.equal(part.name,'Frustum');let top=0,bottom=0;for(let i=0;i<geometry.length;i+=3){const radius=Math.hypot(geometry[i],geometry[i+2]);if(geometry[i+1]>.49)top=Math.max(top,radius);if(geometry[i+1]<-.49)bottom=Math.max(bottom,radius);}near(top,.2);near(bottom,.5);
 const sphere=one("m.sphere(.6,.3,.4,32,16,'Ellipsoid')");assert.equal(sphere.part.name,'Ellipsoid');[1.2,.6,.8].forEach((n,k)=>near(bounds(sphere.geometry).size[k],n));
});
check('torus lies in XZ while partial torusArc lies in XY',()=>{
 const a=bounds(one('m.torus(.6,.1,32,16)').geometry),b=bounds(one('m.torusArc(.6,.1,0,Math.PI,32,16)').geometry);near(a.size[1],.2);near(a.size[2],1.4);near(b.size[2],.2);assert(b.size[1]>.69);
});
check('sectionLoft uses full width and bottom y; legacy loft uses half width',()=>{
 const sections='[{z:-.5,w:.8,h:.4,y:.2},{z:.5,w:.8,h:.4,y:.2}]';const a=bounds(one(`m.sectionLoft(${sections},{profile:[[-1,0],[1,0],[1,1],[-1,1]]})`).geometry);const b=bounds(one(`m.loft(${sections},{segments:32})`).geometry);const c=bounds(one(`m.hull(${sections},{segments:20})`).geometry);near(a.size[0],.8);near(b.size[0],1.6);near(c.size[0],.8);near(a.min[1],.2);near(a.max[1],.6);
});
check('rbox is a fixed planar chamfer and shade does not subdivide geometry',()=>{
 const r=one('m.rbox(1,.4,.6,.04)');assert.equal(evaluateObject(r.part).topology.indices.length/3,44);const flat=one("m.rbox(1,.4,.6,.04).shade('flat')");assert.deepEqual(flat.geometry,r.geometry);near(bounds(r.geometry).size[0],1);
});
check('plate orientation matches all named planes without ad hoc Euler guesses',()=>{
 const base='[[-.6,0],[.6,0],[.6,.8],[-.6,.8]]';for(const [plane,size]of [['xy',[1.2,.8,.2]],['zy',[.2,.8,1.2]],['xz',[1.2,.2,.8]]]){const b=bounds(one(`m.plate(${base},.2,'${plane}')`).geometry);size.forEach((n,k)=>near(b.size[k],n));}
});
check('patch uses ellipsoid angular coordinates and is open with no editable recipe',()=>{
 const r=one('m.patch(.7,.4,.6,0,Math.PI/2,.2,1.3,8,4)');assert.equal(r.part.recipe,undefined);const b=bounds(r.geometry);assert(b.min[0]>=-1e-8);assert(b.min[2]>=-1e-8);near(b.max[1],.4*Math.cos(.2));near(b.min[1],.4*Math.cos(1.3));
 const P=r.geometry;const a=P.slice(0,3),b0=P.slice(3,6),c=P.slice(6,9);const u=b0.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);const N=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert(N.reduce((s,n,i)=>s+n*(a[i]+b0[i]+c[i])/3,0)<0,'current patch is inward wound');
});
check('local modifiers precede scale, Z/Y/X rotations and position',()=>{
 const r=one("m.mesh([0,0,0,1,0,0,0,1,0]).mods([{type:'array',count:2,offset:[1,0,0]}]).scaleTo(2,3,4).rot(Math.PI/2,Math.PI/2,Math.PI/2).at(10,20,30)");
 const P=evaluateObject(r.part,{world:true}).positions;const b=bounds(P);near(b.min[0],10);near(b.max[0],10);near(b.min[1],17);near(b.max[1],20);near(b.min[2],30);near(b.max[2],34);
});
check('align places an origin at target world bounds and does not compensate own thickness',()=>{
 const r=build("const b=m.box(1,.4,.6).at(0,.8,0);const a=m.align(m.box(.2,.2,.2),b,{y:'max'}).key('a');return m.scene('t',[a]);");near(r.source.objects[0].position[1],1);near(bounds(r.evaluated.objects[0].geometryData.positions).min[1],.9);
});
check('repeat callback is relative to original position and duplicate semantic keys are rejected',()=>{
 const r=build("const a=m.box(.1,.1,.1).at(2,.5,1);return m.scene('t',m.repeat(a,3,i=>[i*.3,0,i*.2]));");r.source.objects.forEach((a,i)=>{near(a.position[0],2+i*.3);near(a.position[2],1+i*.2);});
 assert.throws(()=>runModelerScript("return m.scene('t',m.repeat(m.box().key('same'),2,[1,0,0]));"),/重复|semantic/i);
});
check('merge preserves children, per-child materials and explicit materialOverride',()=>{
 const r=build("const a=m.box().key('a').mat('#ff0000');const b=m.box().key('b').mat('#0000ff').at(2,0,0);return m.scene('t',[m.merge([a,b]).key('g')]);");assert.equal(r.source.objects[0].parts.length,2);assert.deepEqual(r.evaluated.objects.map(x=>x.material.color),['#ff0000','#0000ff']);assert(r.source.objects[0].parts.every(x=>x.recipe));
 const r2=build("return m.scene('t',[m.merge([m.box().key('a'),m.box().key('b').at(2,0,0)],'G','#00ff00')]);");assert(r2.evaluated.objects.every(x=>x.material.color==='#00ff00'));
});
check('material preset defaults are verified against actual values',()=>{
 const api=makeApi();for(const item of details.filter(x=>x.category==='material'&&x.defaults)){const actual=api[item.id.slice(2)]();for(const [name,v]of Object.entries(item.defaults))assert.deepEqual(actual[name],v,item.id+'.'+name);}
 const mat=api.mat('#abcdef',{opacity:.4,metalness:2,roughness:-1});assert.equal(mat.opacity,.4);assert.equal(mat.transparent,true);assert.equal(mat.metalness,1);assert.equal(mat.roughness,0);
});
check('wrong argument positions, invalid geometry and unknown m names fail real execution',()=>{
 const wrong=["m.sphere(.5,.5,.5,'Name')","m.cylinder(.2,.3,.7,'Name')","m.torus(.6,.1,'Name')","m.patch(.7,.4,.6,0,Math.PI,.2,1.3,'Name')","m.spherePatch(1,1,1)","m.box().scaleTo(-1,1,1)","m.box().scaleTo(0)","m.sectionLoft([{z:0,w:1,h:1},{z:1,w:1,h:1}])","m.box(0,1,1)"];
 for(const code of wrong)assert.throws(()=>one(code),undefined,code);
});
check('quick start parameter edit runs through real workspace candidate without disk writes',()=>{
 const guide=getModelerHelp({topic:'legacy_tutorial'}).items[0],script=guide.steps.find(s=>s.action==='script').args.code;
 const store=path.join(path.dirname(fileURLToPath(import.meta.url)),`.discovery-unwritten-${process.pid}.json`);assert.equal(fs.existsSync(store),false);
 const w=createWorkspace({storePath:store,initialDoc:runModelerScript(script)}),before=w.snapshot();
 const operations=guide.steps.find(s=>s.action==='edit').args.operations;
 const state=w.candidate({operations,expectedHash:before.contentHash});assert.equal(state.doc.meta.title,'Neutral display stand');const base=state.doc.objects.find(x=>x.id==='sample.base');near(base.recipe.params.w,1.5);near(bounds(evaluateObject(base,{world:true}).positions).size[0],1.5);assert.equal(state.doc.meta.script,script);
 assert.deepEqual(w.snapshot(),before);assert.equal(fs.existsSync(store),false);
 const captures=guide.steps.filter(s=>s.action==='capture');assert.deepEqual(captures[0].args.camera,captures[1].args.camera);for(const step of captures){const spec=normaliseCapture(step.args);assert.equal(spec.source,'isolated');assert.equal(spec.requests.length,1);const cam=resolveCamera({min:[-.75,0,-.4],max:[.75,1.12,.4]},{view:'custom',camera:step.args.camera,aspect:900/700});assert.deepEqual(cam.eye,step.args.camera.eye);assert.deepEqual(cam.target,step.args.camera.target);near(cam.span,1.9);}
});
check('quick start final diagnostic resolves the intended real semantic leaf',()=>{
 const guide=getModelerHelp({topic:'legacy_tutorial'}).items[0],doc=runModelerScript(guide.steps.find(s=>s.action==='script').args.code),step=guide.steps.find(s=>s.action==='diagnose');assert(step);const report=diagnoseDoc(doc,step.args);assert.equal(report.query,'part');assert.equal(report.targets[0].id,'sample.base');assert.equal(report.coverage.complete,true);near(report.result.bounds.size[0],1.2);assert.equal(report.coverage.space,'world');
});
check('tyre defaults and independent rim radius affect actual closed ring dimensions',()=>{
 const r=one('m.tyre()'),defaults=details.find(x=>x.id==='m.tyre').defaults,b=bounds(r.geometry);near(b.size[0],2*defaults.outerRadius);near(b.size[1],defaults.width);near(b.size[2],2*defaults.outerRadius);
 for(const rim of [.2,.35]){const part=one(`m.tyre({outerRadius:.5,rimRadius:${rim},width:.23,segments:32,profileSegments:3})`);let lo=Infinity,hi=0;for(let i=0;i<part.geometry.length;i+=3){const radius=Math.hypot(part.geometry[i],part.geometry[i+2]);lo=Math.min(lo,radius);hi=Math.max(hi,radius);}near(lo,rim);near(hi,.5);near(bounds(part.geometry).size[1],.23);}
});
check('documented surfacePath remains a recipe and follows target parameters and TRS',()=>{
 const help=details.find(x=>x.id==='m.surfacePath'),source=runModelerScript(help.examples[0].code),before=JSON.stringify(source),a=evaluateDoc(source).objects.find(x=>x.editableId==='surface.line');near(bounds(a.geometryData.positions).min[1],.215);
 assert.equal(source.objects[1].geometryData,undefined);assert.equal(source.objects[1].recipe.params.target,'surface.body');assert.equal(JSON.stringify(source),before);
 source.objects[0].recipe.params.h=.8;source.objects[0].position=[1,2,3];const b=evaluateDoc(source).objects.find(x=>x.editableId==='surface.line');near(bounds(b.geometryData.positions).min[1],2.415);near(bounds(b.geometryData.positions).min[0]-bounds(a.geometryData.positions).min[0],1);
});
check('surfaceAttach source origin and half-thickness yield the documented physical gap',()=>{
 const help=details.find(x=>x.id==='m.surfaceAttach'),source=runModelerScript(help.examples[0].code);const draw=evaluateDoc(source),base=bounds(draw.objects.find(x=>x.editableId==='attach.body').geometryData.positions),badge=bounds(draw.objects.find(x=>x.editableId==='attach.badge').geometryData.positions);near(badge.min[1]-base.max[1],.005);
 source.objects[0].recipe.params.h=.8;const next=evaluateDoc(source);near(bounds(next.objects.find(x=>x.editableId==='attach.badge').geometryData.positions).min[1],.405);assert.equal(source.objects[1].recipe.params.source.type,'box');
});
check('clearance example uses a preserved convex source and follows referenced outer radius',()=>{
 const help=details.find(x=>x.id==='m.clearance'),source=runModelerScript(help.examples[0].code);assert.equal(source.objects.length,2);assert.equal(source.objects[0].recipe.params.source.type,'box');assert.equal(source.objects[0].recipe.params.cutters[0].target,'opening.ring');
 const checkEnvelope=radius=>{const P=evaluateDoc(source).objects.find(x=>x.editableId==='opening.body').geometryData.positions;assert(P.length>0);for(let i=0;i<P.length;i+=3)assert(Math.hypot(P[i],P[i+2])>=radius-1e-7);return P;};const a=checkEnvelope(.43);source.objects[1].recipe.params.outerRadius=.5;const b=checkEnvelope(.53);assert.notDeepEqual(b,a);source.objects[1].recipe.params.rimRadius=.28;assert.deepEqual(checkEnvelope(.53),b);
});
check('relation argument and supported-domain failures reject real scripts or evaluation',()=>{
 const bad=["return m.scene('bad',[m.tyre({outerRadius:.3,rimRadius:.4})]);","const b=m.box();return m.scene('bad',[b,m.surfacePath(b,[[0,2,0],[.1,2,0]])]);","const b=m.box().key('b');return m.scene('bad',[b,m.surfacePath('missing',[[0,2,0],[.1,2,0]])]);","const b=m.box().key('b');return m.scene('bad',[b,m.surfacePath(b,[[3,2,0],[4,2,0]])]);","const b=m.box().key('b');return m.scene('bad',[b,m.surfaceAttach(b,m.box().at(0,1,0))]);","return m.scene('bad',[m.clearance({type:'torus',params:{R:.6,r:.1,segments:16,tubeSegments:8}},[{radius:.1,segments:16}])]);","return m.scene('bad',[m.recipe({type:'unknown'})]);"];
 for(const code of bad)assert.throws(()=>build(code),undefined,code);
});
check('all standalone documentation modeler-script examples build real geometry',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const text=fs.readFileSync(path.join(root,'docs','SCRIPT-API.md'),'utf8');const examples=[...text.matchAll(/```modeler-script\r?\n([\s\S]*?)```/g)];assert(examples.length>0);for(const [,code]of examples)build(code);
});
const failed=tests.filter(x=>!x.passed);console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.length-failed.length,failed:failed.length,publicExamples:details.reduce((n,x)=>n+x.examples.length,0)},tests},null,2));process.exitCode=failed.length?1:0;
