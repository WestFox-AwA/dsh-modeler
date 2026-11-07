// Focused checks for the observation-display upgrade. These tests use Three
// objects but no WebGL context, no browser, no Modeler tool, no resource store
// and no production asset. They cover the pure contract, mode/displayMode
// compatibility, single-owner transient lighting, floor caching/disposal and
// the host capture receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {runModelerScript} from '../lib/script.js';
import {KERNEL_VERSION} from '../lib/kernel.js';
import {resolveCamera} from '../lib/camera.js';
import {encodePng} from '../lib/png.js';
import {normaliseCapture,createEvidenceStore} from '../lib/evidence.js';
import {getActionHelp} from '../lib/action-help.js';
import {
  OBSERVATION_MODES,
  DISPLAY_MODES,
  OBSERVATION_LIGHTING_DEFAULTS,
  OBSERVATION_STAGE_LIMITS,
  LEGACY_OBSERVATION_MODES,
  normalizeObservationLighting,
  observationStagePolicy,
  resolveObservationPlan,
} from '../lib/observation-stage.js';
import {
  material,
  createSnapshotMeshes,
  disposeMeshes,
  normalizeObservation,
  OBSERVATION_HELP,
  DISPLAY_MODE_HELP,
  STUDIO_CONFIG,
  applyStudioStage,
  observationDiagnosticInfo,
  renderObservationFrame,
} from '../client.render.js';
import {createObservationStage,applyObservationStage,disposeObservationStage,createOutlineCompositor,outlineColorForIndex,outlineEdgeMask,outlineIdForMesh,outlineAssignments} from '../client.observation.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const temp=fs.mkdtempSync(path.join(here,'.observation-stage-'));
const tests=[];
async function check(name,fn){try{await fn();tests.push({name,passed:true});}catch(error){tests.push({name,passed:false,error:error.stack});}}
const clone=v=>JSON.parse(JSON.stringify(v));
const png=encodePng({width:64,height:64,data:new Uint8Array(64*64*4).fill(190)}).toString('base64');
const identity={assetId:'observation-test',contentHash:'a'.repeat(64),revision:1};
const camera={projection:'perspective',eye:[3,2,4],target:[0,0,0],up:[0,1,0],fov:42};

function snapshot(){
  const doc=runModelerScript("return m.scene('Observation fixture',[m.box(1,1,1).key('a'),m.box(.4,.4,.4).key('b').at(1.2,.2,0)]);");
  return {assetId:identity.assetId,revision:identity.revision,contentHash:identity.contentHash,kernelVersion:KERNEL_VERSION,doc};
}
function fakeStudio(){
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#171c24');
  const root=new THREE.Group();scene.add(root);
  const hemi=new THREE.HemisphereLight('#d7e8ff','#59606c',.75);hemi.name='modeler-hemisphere';hemi.userData.observationRole='hemisphere';scene.add(hemi);
  const key=new THREE.DirectionalLight('#fff1dc',3.2);key.name='modeler-key';key.userData.observationRole='key';key.position.set(4,7,5);scene.add(key);
  const fill=new THREE.DirectionalLight('#b9d6ff',.85);fill.name='modeler-fill';fill.userData.observationRole='fill';fill.position.set(-5,3,2);scene.add(fill);
  const rim=new THREE.DirectionalLight('#e9f0ff',1.6);rim.name='modeler-rim';rim.userData.observationRole='rim';rim.position.set(2,4,-6);scene.add(rim);
  const stage=new THREE.Group();stage.name='modeler-native-stage';stage.userData.modelerStage=true;
  const stageLight=new THREE.DirectionalLight('#ffffff',2);stageLight.name='modeler-stage-directional-0';stage.add(stageLight);scene.add(stage);
  const renderer={shadowMap:{enabled:false,type:THREE.BasicShadowMap},toneMappingExposure:1};
  return {studio:{scene,root,renderer,lights:{hemisphere:hemi,key,fill,rim},defaultLights:[hemi,key,fill,rim]},stage,stageLight,renderer,lights:{hemi,key,fill,rim}};
}

await check('public mode set is unchanged and displayMode is a separate exact axis',()=>{
  assert.deepEqual([...OBSERVATION_MODES],['material','clay','normal','final_normal','wire','id','zebra','orientation','roughness','metalness','albedo']);
  assert.deepEqual([...LEGACY_OBSERVATION_MODES],['material','clay','normal','final_normal','wire','id','zebra','orientation','roughness','metalness','albedo']);
  assert.deepEqual([...DISPLAY_MODES],['normal','surface_wireframe','outline']);
  assert(!OBSERVATION_MODES.includes('surface_wireframe'));
  assert(!OBSERVATION_MODES.includes('outline'));
  assert(!DISPLAY_MODES.includes('material'));
  assert(OBSERVATION_HELP.normal);
  assert(!OBSERVATION_HELP.surface_wireframe);
  assert(!OBSERVATION_HELP.outline);
  assert(DISPLAY_MODE_HELP.surface_wireframe);
  assert(DISPLAY_MODE_HELP.outline);
  assert.equal(observationStagePolicy('normal','normal').floorAllowed,false);
  assert.equal(observationStagePolicy('material','normal').floorAllowed,true);
  assert.equal(observationStagePolicy('material','surface_wireframe').whiteClay,true);
  assert.equal(observationStagePolicy('material','outline').overlay,'hard-edges');
  assert.equal(observationStagePolicy('wire','normal').legacyWireframe,true);
});

await check('studio lighting defaults are bounded, deterministic and match the renderer studio',()=>{
  const a=normalizeObservationLighting(undefined,{mode:'material',displayMode:'normal'});
  const b=normalizeObservationLighting(null,{mode:'material',displayMode:'normal'});
  assert.deepEqual(a,b);
  assert.equal(a.provided,false);
  assert.equal(a.displayMode,'normal');
  assert.equal(a.policy.floorAllowed,true);
  assert.equal(a.policy.overlay,null);
  assert.equal(a.floor.enabled,true);
  assert.equal(a.floor.mirror,true);
  assert.equal(a.floor.requestedEnabled,true);
  assert.equal(a.floor.forcedOff,false);
  assert.deepEqual(a.key.position,[4,7,5]);
  assert.equal(a.key.color,STUDIO_CONFIG.keyColor);
  assert.equal(a.key.intensity,STUDIO_CONFIG.keyIntensity);
  assert.equal(a.hemisphere.sky,STUDIO_CONFIG.hemisphereSky);
  assert.equal(a.hemisphere.ground,STUDIO_CONFIG.hemisphereGround);
  assert.equal(a.hemisphere.intensity,STUDIO_CONFIG.hemisphereIntensity);
  assert.deepEqual(a.shadows,{enabled:true,mapSize:1024,bias:-.0001,normalBias:.01});
  assert.deepEqual(Object.keys(a),['schema','schemaVersion','mode','displayMode','provided','explicit','policy','background','exposure','environment','hemisphere','key','fill','rim','shadows','floor']);
  assert.deepEqual(normalizeObservationLighting(undefined,{mode:'material',displayMode:'normal'}),a);
  assert.deepEqual(normalizeObservationLighting({key:{intensity:1}},{mode:'material',displayMode:'normal'}),normalizeObservationLighting({key:{intensity:1}},{mode:'material',displayMode:'normal'}));
});

await check('mirror uses one PBR surface with linear reflection, no radial mask or shadow overlay',()=>{
 const {studio}=fakeStudio();const stage=createObservationStage(studio);
 try{const actual=stage.apply({}, {bounds:{min:[-1,0,-1],max:[1,2,1]}});const group=studio.scene.getObjectByName('modeler-observation-floor');
 assert.equal(group.children.length,1);assert(group.children[0].material.isMeshStandardMaterial);
 assert.equal(actual.floor.reflection.radialFade,false);assert.equal(actual.floor.shadowCatcher,false);
 assert(actual.floor.size[0]>100);let disposed=0;group.children[0].material.addEventListener('dispose',()=>disposed++);
 stage.dispose();stage.dispose();assert.equal(disposed,1);assert.equal(studio.scene.getObjectByName('modeler-observation-floor'),undefined);
 }finally{stage.dispose();}
});

await check('lighting overrides validate, normalize and never mutate the caller object',()=>{
  const input={background:[.1,.2,.3],exposure:2,environment:{intensity:2.5},hemisphere:{sky:'#fff',ground:[0,1,0],intensity:1.2},key:{color:'#f00',intensity:5,position:[1,2,3],shadows:false},fill:{intensity:0},rim:{shadows:true},shadows:{enabled:false,mapSize:2048,bias:.001,normalBias:.2},floor:{enabled:false,mirror:false,tint:'#123',shadow:false,size:[2,3],position:[1,0,2],roughness:.4,metalness:.6}};
  const before=clone(input);
  const out=normalizeObservationLighting(input,{mode:'material',displayMode:'normal'});
  assert.deepEqual(input,before);
  assert.equal(out.background,'#1a334d');
  assert.equal(out.exposure,2);
  assert.equal(out.environment.intensity,2.5);
  assert.equal(out.hemisphere.sky,'#ffffff');
  assert.equal(out.hemisphere.ground,'#00ff00');
  assert.deepEqual(out.key,{color:'#ff0000',intensity:5,position:[1,2,3],shadows:false});
  assert.equal(out.fill.intensity,0);
  assert.equal(out.fill.color,OBSERVATION_LIGHTING_DEFAULTS.fill.color);
  assert.equal(out.rim.shadows,true);
  assert.deepEqual(out.shadows,{enabled:false,mapSize:2048,bias:.001,normalBias:.2});
  assert.equal(out.floor.enabled,false);
  assert.equal(out.floor.requestedEnabled,false);
  assert.equal(out.floor.forcedOff,false);
  assert.equal(out.floor.mirror,false);
  assert.deepEqual(out.floor.size,[2,3]);
  assert.deepEqual(out.floor.position,[1,0,2]);
  assert.equal(out.floor.roughness,.4);
  assert.equal(out.floor.metalness,.6);
  const independent=normalizeObservationLighting(input,{mode:'material',displayMode:'normal'});
  out.key.position[0]=99;
  assert.equal(independent.key.position[0],1);
});

await check('invalid lighting fields and displayMode values fail explicitly',()=>{
  const invalid=[
    {unknown:true},
    {key:{color:'not-a-color'}},
    {key:{position:[0,0,0]}},
    {key:{position:[1,2]}},
    {key:{intensity:-1}},
    {environment:{intensity:11}},
    {shadows:{mapSize:1000}},
    {shadows:{mapSize:1024.5}},
    {shadows:{bias:.1}},
    {shadows:{normalBias:-.1}},
    {floor:{size:0}},
    {floor:{size:[1,2,3]}},
    {floor:{position:[0,0]}},
    {floor:{roughness:2}},
    {floor:{metalness:-.1}},
    {floor:{extra:true}},
  ];
  for(const value of invalid)assert.throws(()=>normalizeObservationLighting(value,{mode:'material',displayMode:'normal'}),undefined,JSON.stringify(value));
  assert.throws(()=>normalizeObservationLighting(undefined,{mode:'material',displayMode:'fake'}));
  assert.throws(()=>normalizeObservationLighting(undefined,{mode:'surface_wireframe',displayMode:'normal'}));
});

await check('diagnostic displayModes force no floor while retaining identical lights, shadows and camera-independent values',()=>{
  const input={background:'#20242c',exposure:1.4,key:{intensity:2.2},fill:{intensity:.4},rim:{intensity:.9},hemisphere:{intensity:.6},shadows:{enabled:true,mapSize:2048,bias:-.0002,normalBias:.02},floor:{enabled:true,mirror:true,tint:'#ffffff'}};
  const normal=normalizeObservationLighting(input,{mode:'material',displayMode:'normal'});
  const wire=normalizeObservationLighting(input,{mode:'material',displayMode:'surface_wireframe'});
  const outline=normalizeObservationLighting(input,{mode:'material',displayMode:'outline'});
  for(const value of [wire,outline]){
    assert.equal(value.floor.enabled,false);
    assert.equal(value.floor.requestedEnabled,true);
    assert.equal(value.floor.forcedOff,true);
    assert.equal(value.policy.floorAllowed,false);
    assert.equal(value.background,normal.background);
    assert.equal(value.exposure,normal.exposure);
    assert.deepEqual(value.key,normal.key);
    assert.deepEqual(value.fill,normal.fill);
    assert.deepEqual(value.rim,normal.rim);
    assert.deepEqual(value.hemisphere,normal.hemisphere);
    assert.deepEqual(value.shadows,normal.shadows);
  }
  assert.equal(normal.floor.enabled,true);
});

await check('mode semantics stay intact; displayMode only overrides the diagnostic surface',()=>{
  const normalMaterial=material({editableId:'a'},'normal',{},'normal');
  const wireMaterial=material({editableId:'a'},'wire',{},'normal');
  const clayMaterial=material({editableId:'a'},'clay',{},'normal');
  const whiteWire=material({editableId:'a'},'wire',{},'surface_wireframe');
  try{
    assert(normalMaterial.isMeshNormalMaterial);
    assert.equal(wireMaterial.wireframe,true);
    assert.equal(clayMaterial.color.getHexString(),'a6b6c6');
    assert.equal(whiteWire.color.getHexString(),'f4f5f7');
    assert.equal(whiteWire.wireframe,false);
  }finally{for(const m of [normalMaterial,wireMaterial,clayMaterial,whiteWire])m.dispose();}
  const observation=normalizeObservation({mode:'normal',displayMode:'outline'});
  assert.equal(observation.mode,'normal');
  assert.equal(observation.displayMode,'outline');
  assert.equal(observation.lighting.mode,'normal');
  assert.equal(observation.lighting.displayMode,'outline');
  assert.equal(observation.lighting.policy.surfaceMode,'white-clay');
  assert.equal(observation.lighting.policy.modeOverride,true);
});

await check('snapshot meshes honor displayMode without mutating the document',()=>{
  const snap=snapshot();
  snap.doc.meta={...snap.doc.meta,renderStage:{lights:[]}};
  const before=JSON.stringify(snap.doc);
  const normal=createSnapshotMeshes(snap,'normal',{displayMode:'normal'});
  const wire=createSnapshotMeshes(snap,'wire',{displayMode:'normal'});
  const outline=createSnapshotMeshes(snap,'normal',{displayMode:'outline'});
  try{
    assert(normal.meshes[0].material.isMeshNormalMaterial);
    assert.equal(wire.meshes[0].material.wireframe,true);
    assert.equal(outline.meshes[0].material.color.getHexString(),'f4f5f7');
    assert.equal(outline.meshes[0].userData.observationMode,'normal');
    assert.equal(outline.meshes[0].userData.observationDisplayMode,'outline');
    assert.equal(JSON.stringify(snap.doc),before);
    assert.equal(snap.doc.meta.renderStage.lights.length,0);
    for(const key of Object.keys(snap.doc))assert(!['lighting','displayMode','observationStage'].includes(key));
  }finally{for(const value of [normal,wire,outline])disposeMeshes(value.meshes);}
});

await check('normaliseCapture forwards both displayMode and normalized lighting without mutating args',()=>{
  const args={view:'iso',mode:'clay',displayMode:'outline',lighting:{key:{intensity:1.5},floor:{enabled:true}},width:64,height:64};
  const before=clone(args);
  const spec=normaliseCapture(args);
  assert.deepEqual(args,before);
  assert.equal(spec.requests.length,1);
  assert.equal(spec.requests[0].mode,'clay');
  assert.equal(spec.requests[0].displayMode,'outline');
  assert.equal(spec.requests[0].lighting.policy.overlay,'hard-edges');
  assert.equal(spec.requests[0].lighting.floor.enabled,false);
  assert.equal(spec.requests[0].lighting.key.intensity,1.5);
  assert.equal(spec.requests[0].stage,undefined);
  assert.equal(spec.requests[0].renderStage,undefined);
  const d=normaliseCapture({width:64,height:64});
  assert.equal(d.requests[0].mode,'material');
  assert.equal(d.requests[0].displayMode,'normal');
  assert.equal(d.requests[0].lighting.policy.floorAllowed,true);
});

await check('observation lifecycle caches the ground, restores lights/materials and releases once',()=>{
 const {studio,stageLight,renderer,lights}=fakeStudio(),snap=snapshot(),meshes=createSnapshotMeshes(snap,'material').meshes;
 for(const mesh of meshes)studio.root.add(mesh);const options={bounds:{min:[-1,0,-1],max:[1,2,1]},meshes};
 const first=applyObservationStage(studio,undefined,options),floor=studio.scene.getObjectByName('modeler-observation-floor');
 assert.equal(first.lightOwner,'studio-default');assert.equal(first.stage.stageLightsHidden,1);assert.equal(first.floor.mirror,true);
 assert.equal(stageLight.visible,false);assert.equal(meshes[0].material.envMapIntensity,first.environment.effective);
 let released=0;floor.children[0].geometry.addEventListener('dispose',()=>released++);
 const wire=applyObservationStage(studio,undefined,{...options,displayMode:'surface_wireframe'});assert.equal(wire.floor.enabled,false);assert.equal(wire.overlays.lines,2);
 const outline=applyObservationStage(studio,undefined,{...options,displayMode:'outline'});assert.equal(outline.overlays.lines,2);
 applyObservationStage(studio,undefined,options);assert.equal(studio.scene.getObjectByName('modeler-observation-floor').uuid,floor.uuid);
 disposeObservationStage(studio);assert.equal(stageLight.visible,true);assert.equal(renderer.shadowMap.enabled,false);assert.equal(lights.key.castShadow,false);
 assert.equal(meshes[0].children.length,0);assert.equal(released,1);disposeMeshes(meshes);
});

await check('pure merge plan preserves authored stage and overlays only explicit transient fields',()=>{
  const stage={mode:'stage',background:'#334455',exposure:1.8,environmentIntensity:2,shadows:false,hemisphere:{name:'modeler-stage-hemisphere',type:'hemisphere',sky:'#aaaaaa',ground:'#222222',intensity:.7},lights:[{name:'modeler-stage-directional-0',type:'directional',color:'#ffffff',intensity:1.2,position:[1,2,3],shadow:true}],floor:{size:[10,10],position:[0,0,0],normal:[0,1,0],color:'#111111',roughness:.3,metalness:.8,shadow:true}};
  const base=resolveObservationPlan(normalizeObservationLighting(undefined,{mode:'material',displayMode:'normal'}),stage);
  assert.equal(base.stage.active,true);
  assert.equal(base.background.value,'#334455');
  assert.equal(base.background.source,'asset-stage');
  assert.equal(base.exposure,1.8);
  assert.equal(base.shadows.enabled,false);
  assert.equal(base.shadows.source,'asset-stage');
  assert.equal(base.environment.effective,2);
  assert.equal(base.environment.override,null);
  assert.equal(base.lightOwner,'asset-stage');
  assert.equal(base.lights.hemisphere.name,'modeler-stage-hemisphere');
  assert.equal(base.floor.enabled,true);
  assert.equal(base.floor.source,'asset-stage');
  assert.equal(base.floor.spec.color,'#111111');

  const environmentOverride=resolveObservationPlan(normalizeObservationLighting({environment:{intensity:2.5}},{mode:'material',displayMode:'normal'}),stage);
  assert.equal(environmentOverride.environment.base,2);
  assert.equal(environmentOverride.environment.override,2.5);
  assert.equal(environmentOverride.environment.effective,2.5);

  const lightOverride=resolveObservationPlan(normalizeObservationLighting({key:{intensity:2}},{mode:'material',displayMode:'normal'}),stage);
  assert.equal(lightOverride.lightOwner,'observation');
  assert.equal(lightOverride.lights.key.intensity,2);
  assert.equal(lightOverride.floor.source,'asset-stage');
  assert.equal(lightOverride.background.value,'#334455');
  assert.equal(lightOverride.exposure,1.8);
  assert.equal(lightOverride.shadows.enabled,false);

  const floorOverride=resolveObservationPlan(normalizeObservationLighting({floor:{enabled:false}},{mode:'material',displayMode:'normal'}),stage);
  assert.equal(floorOverride.lightOwner,'asset-stage');
  assert.equal(floorOverride.floor.enabled,false);
  assert.equal(floorOverride.floor.source,'observation');

  const diagnostic=resolveObservationPlan(normalizeObservationLighting({background:'#20242c'},{mode:'material',displayMode:'outline'}),stage);
  assert.equal(diagnostic.background.value,'#20242c');
  assert.equal(diagnostic.background.source,'diagnostic-flat');
  assert.equal(diagnostic.floor.enabled,false);
  assert.equal(diagnostic.floor.source,'display-mode');
  assert.equal(diagnostic.lightOwner,'asset-stage');
  assert.equal(diagnostic.exposure,1.8);
  assert.equal(diagnostic.shadows.enabled,false);
  assert.equal(diagnostic.environment.effective,2);

  const blank=resolveObservationPlan(normalizeObservationLighting(undefined,{mode:'material',displayMode:'surface_wireframe'}),stage);
  assert.equal(blank.background.value,'#171c24');
  assert.equal(blank.background.source,'diagnostic-flat');
});

await check('renderer merge keeps stage lights/floor/background unless transient fields override them',()=>{
  const {studio,stage,stageLight,renderer,lights}=fakeStudio();
  const stageFloor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:'#111111'}));stageFloor.name='modeler-stage-floor';stage.add(stageFloor);
  const stageHemisphere=new THREE.HemisphereLight('#aaaaaa','#222222',.7);stageHemisphere.name='modeler-stage-hemisphere';stage.add(stageHemisphere);
  for(const light of [lights.hemi,lights.key,lights.fill,lights.rim])light.visible=false;
  const stageReceipt={mode:'stage',background:'#334455',exposure:1.8,environmentIntensity:2,shadows:false,hemisphere:{name:'modeler-stage-hemisphere',type:'hemisphere',sky:'#aaaaaa',ground:'#222222',intensity:.7},lights:[{name:'modeler-stage-hemisphere',type:'hemisphere',sky:'#aaaaaa',ground:'#222222',intensity:.7},{name:'modeler-stage-directional-0',type:'directional',color:'#ffffff',intensity:1.2,position:[1,2,3],shadow:true}],floor:{size:[10,10],position:[0,0,0],normal:[0,1,0],color:'#111111',roughness:.3,metalness:.8,shadow:true}};
  const snap=snapshot(),meshes=createSnapshotMeshes(snap,'material',{}).meshes;
  for(const mesh of meshes)studio.root.add(mesh);
  meshes[0].material.envMapIntensity=2;
  const bounds={min:[-1,0,-1],max:[1,2,1]};
  const base=applyObservationStage(studio,undefined,{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
  assert.equal(base.lightOwner,'asset-stage');
  assert.equal(base.background,'#334455');
  assert.equal(base.exposure,1.8);
  assert.equal(base.shadows.enabled,false);
  assert.equal(base.floor.source,'asset-stage');
  assert.equal(base.floor.enabled,true);
  assert.equal(base.floor.mirror,false);
  assert.equal(base.floor.tint,'#111111');
  assert.deepEqual(base.floor.size,[10,10]);
  assert.deepEqual(base.floor.position,[0,0,0]);
  assert.equal(base.floor.forcedOff,false);
  assert.equal(base.floor.requestedEnabled,true);
  assert.equal(base.stage.stageLightsHidden,0);
  assert.equal(base.stage.stageFloorHidden,0);
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);
  assert.equal(stageFloor.visible,true);
  assert.equal(lights.key.visible,false);
  assert.equal(studio.scene.getObjectByName('modeler-observation-floor')??null,null);
  assert.equal(meshes[0].material.envMapIntensity,2);

  const envOverride=applyObservationStage(studio,{environment:{intensity:0.6}},{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
  assert.equal(envOverride.environment.base,2);
  assert.equal(envOverride.environment.override,0.6);
  assert.equal(envOverride.environment.effective,0.6);
  assert.equal(meshes[0].material.envMapIntensity,0.6);

  const lightOverride=applyObservationStage(studio,{key:{intensity:2.25}},{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
  assert.equal(lightOverride.lightOwner,'observation');
  assert.equal(lightOverride.background,'#334455');
  assert.equal(lightOverride.exposure,1.8);
  assert.equal(lightOverride.shadows.enabled,false);
  assert.equal(lightOverride.floor.source,'asset-stage');
  assert.equal(stageLight.visible,false);
  assert.equal(stageHemisphere.visible,false);
  assert.equal(stageFloor.visible,true);
  assert.equal(lights.key.visible,true);
  assert.equal(lights.key.intensity,2.25);

  const floorOverride=applyObservationStage(studio,{floor:{enabled:true}},{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
  assert.equal(floorOverride.lightOwner,'asset-stage');
  assert.equal(floorOverride.floor.source,'observation');
  assert.equal(floorOverride.floor.enabled,true);
  assert.equal(stageFloor.visible,false);
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);
  assert.equal(lights.key.visible,false);
  const observationFloor=studio.scene.getObjectByName('modeler-observation-floor');
  assert(observationFloor);
  assert.equal(observationFloor.getObjectByName('modeler-observation-mirror').isMesh,true);

  const diagnostic=applyObservationStage(studio,{background:'#20242c'},{mode:'material',displayMode:'outline',bounds,meshes,stage:stageReceipt});
  assert.equal(diagnostic.background,'#20242c');
  assert.equal(diagnostic.floor.enabled,false);
  assert.equal(diagnostic.floor.source,'display-mode');
  assert.equal(diagnostic.lightOwner,'asset-stage');
  assert.equal(stageFloor.visible,false);
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);

  disposeObservationStage(studio);
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);
  assert.equal(stageFloor.visible,true);
  assert.equal(lights.hemi.visible,false);
  assert.equal(lights.key.visible,false);
  assert.equal(renderer.shadowMap.enabled,false);
  assert.equal(renderer.toneMappingExposure,1);
  assert.equal(meshes[0].material.envMapIntensity,2);
  disposeMeshes(meshes);
});

await check('agent help exposes displayMode and transient lighting as additive contracts',()=>{
  const capture=getActionHelp({query:'capture'}).items[0];
  for(const mode of ['normal','surface_wireframe','outline'])assert(capture.arguments.displayMode.includes(mode));
  assert.match(capture.arguments.purpose,/shape/);assert.match(capture.arguments.purpose,/topology/);assert.match(capture.arguments.purpose,/appearance/);
  assert.match(capture.arguments.lighting,/floor/);
  assert(capture.returns.includes('displayMode'));
  assert(capture.returns.includes('lighting'));
  assert(capture.notes.some(note=>note.includes('renderStage')));
  assert(capture.notes.some(note=>note.includes('diagnostic')||note.includes('诊断')));
  const trial=getActionHelp({query:'trial'}).items[0];
  assert.match(trial.arguments.observe.displayMode,/surface_wireframe/);
  assert.match(trial.arguments.observe.lighting,/capture/);
});

await check('viewport and capture share studio defaults for omitted authored stage fields',()=>{
  const a=fakeStudio(),b=fakeStudio();
  a.stageLight.visible=false;b.stageLight.visible=false;
  const stage={background:'#334455',exposure:1.4,shadows:true,hemisphere:{},lights:[{type:'directional'}],floor:{size:[4,4],position:[0,0,0],color:'#222222',roughness:.5,metalness:.1,shadow:true}};
  const actualA=applyStudioStage(a.studio,stage),actualB=applyStudioStage(b.studio,stage);
  for(const key of ['background','exposure','shadows','hemisphere','lights'])assert.deepEqual(actualA[key],actualB[key],key);
  assert.equal(actualA.hemisphere.intensity,STUDIO_CONFIG.hemisphereIntensity);
  const keyLight=actualA.lights.find(light=>light.name==='modeler-stage-directional-0');
  assert(keyLight);
  assert.equal(keyLight.color,STUDIO_CONFIG.keyColor);
  assert.equal(keyLight.intensity,STUDIO_CONFIG.keyIntensity);
  assert.deepEqual(keyLight.position,[...STUDIO_CONFIG.keyPosition]);
  const workbenchSource=fs.readFileSync(path.join(here,'..','client.workbench.js'),'utf8');
  const renderSource=fs.readFileSync(path.join(here,'..','client.render.js'),'utf8');
  assert(workbenchSource.includes('applyStudioStage(this.studio,snapshot.doc.meta?.renderStage)'));
  assert(!workbenchSource.includes('applyRenderStage(this.studio,snapshot.doc.meta?.renderStage)'));
  assert(renderSource.includes('applyStudioStage(this.studio,this.renderStage)'));
  assert(!renderSource.includes('applyRenderStage(this.studio,this.renderStage,STUDIO_CONFIG)'));
});

await check('capture diagnostics describe white-clay display modes and canonical receipt fields',()=>{
  const outline=observationDiagnosticInfo('material','outline',{policy:{whiteClay:true,overlay:'hard-edges'},floor:{enabled:false}});
  assert.equal(outline.displayMode,'outline');
  assert.match(outline.displayModeDescription,/White clay|白色黏土/);
  assert.equal(outline.surfaceMode,'white-clay');
  assert.equal(outline.overlay,'hard-edges');
  assert.equal(outline.floor,'none');
  const wire=observationDiagnosticInfo('material','surface_wireframe',{policy:{whiteClay:true,overlay:'surface-wireframe'},floor:{enabled:false}});
  assert.equal(wire.displayMode,'surface_wireframe');
  assert.equal(wire.overlay,'surface-wireframe');
  assert.equal(wire.floor,'none');
  assert.equal(observationDiagnosticInfo('material','normal',{policy:{whiteClay:false,overlay:null},floor:{enabled:true}}).displayMode,undefined);
});

await check('already-normalized lighting is accepted directly and preserves explicit/stage semantics',()=>{
  const {studio,stage,stageLight,renderer,lights}=fakeStudio();
  const stageFloor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:'#111111'}));stageFloor.name='modeler-stage-floor';stage.add(stageFloor);
  const stageHemisphere=new THREE.HemisphereLight('#aaaaaa','#222222',.7);stageHemisphere.name='modeler-stage-hemisphere';stage.add(stageHemisphere);
  for(const light of [lights.hemi,lights.key,lights.fill,lights.rim])light.visible=false;
  const stageReceipt={mode:'stage',background:'#334455',exposure:1.8,environmentIntensity:2,shadows:false,hemisphere:{name:'modeler-stage-hemisphere',type:'hemisphere',sky:'#aaaaaa',ground:'#222222',intensity:.7},lights:[{name:'modeler-stage-hemisphere',type:'hemisphere',sky:'#aaaaaa',ground:'#222222',intensity:.7},{name:'modeler-stage-directional-0',type:'directional',color:'#ffffff',intensity:1.2,position:[1,2,3],shadow:true}],floor:{size:[10,10],position:[0,0,0],normal:[0,1,0],color:'#111111',roughness:.3,metalness:.8,shadow:true}};
  const snap=snapshot(),meshes=createSnapshotMeshes(snap,'material',{}).meshes;
  const bounds={min:[-1,0,-1],max:[1,2,1]};
  const normalized=normalizeObservationLighting(undefined,{mode:'material',displayMode:'normal'});
  const base=applyObservationStage(studio,normalized,{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
  assert.equal(base.lightOwner,'asset-stage');
  assert.equal(base.background,'#334455');
  assert.equal(base.exposure,1.8);
  assert.equal(base.shadows.enabled,false);
  assert.equal(base.floor.source,'asset-stage');
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);
  assert.equal(stageFloor.visible,true);
  assert.equal(lights.key.visible,false);

  // Same normalized object, different displayMode: rebase policy, do not
  // re-read normalized policy fields as raw input.
  const diagnostic=applyObservationStage(studio,normalized,{mode:'material',displayMode:'outline',bounds,meshes,stage:stageReceipt});
  assert.equal(diagnostic.background,'#171c24');
  assert.equal(diagnostic.floor.enabled,false);
  assert.equal(diagnostic.floor.source,'display-mode');
  assert.equal(diagnostic.lightOwner,'asset-stage');
  assert.equal(diagnostic.exposure,1.8);
  assert.equal(diagnostic.shadows.enabled,false);
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);
  assert.equal(stageFloor.visible,false);

  const explicitFloor=normalizeObservationLighting({floor:{enabled:false}},{mode:'material',displayMode:'normal'});
  const floorOverride=applyObservationStage(studio,explicitFloor,{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
  assert.equal(floorOverride.floor.enabled,false);
  assert.equal(floorOverride.floor.source,'observation');
  assert.equal(floorOverride.lightOwner,'asset-stage');
  assert.equal(floorOverride.background,'#334455');
  assert.equal(stageLight.visible,true);
  assert.equal(stageFloor.visible,false);

  disposeObservationStage(studio);
  assert.equal(stageLight.visible,true);
  assert.equal(stageHemisphere.visible,true);
  assert.equal(stageFloor.visible,true);
  assert.equal(lights.hemi.visible,false);
  assert.equal(renderer.shadowMap.enabled,false);
  disposeMeshes(meshes);
});

await check('ObservationStage.apply accepts normalized lighting directly and rebases displayMode',()=>{
  const {studio,stage}=fakeStudio();
  const stageReceipt={mode:'stage',background:'#334455',exposure:1.8,environmentIntensity:2,shadows:false,hemisphere:null,lights:[],floor:null};
  const snap=snapshot(),meshes=createSnapshotMeshes(snap,'material',{}).meshes;
  const bounds={min:[-1,0,-1],max:[1,2,1]};
  const normalized=normalizeObservationLighting({key:{intensity:1.9},floor:{enabled:true}},{mode:'material',displayMode:'normal'});
  assert.equal(normalized.floor.requestedEnabled,true);
  assert.equal(normalized.floor.enabled,true);
  assert.equal(normalized.explicit.key,true);
  assert.equal(normalized.explicit.floor,true);
  const observation=createObservationStage(studio);
  try{
    const base=observation.apply(normalized,{mode:'material',displayMode:'normal',bounds,meshes,stage:stageReceipt});
    assert.equal(base.lightOwner,'observation');
    assert.equal(base.floor.source,'observation');
    assert.equal(base.floor.enabled,true);
    assert.equal(base.background,'#334455');
    assert.equal(base.exposure,1.8);
    assert.equal(base.shadows.enabled,false);
    assert.equal(base.plan.explicit.key,true);
    assert.equal(base.plan.explicit.floor,true);

    const diagnostic=observation.apply(normalized,{mode:'material',displayMode:'outline',bounds,meshes,stage:stageReceipt});
    assert.equal(diagnostic.floor.source,'display-mode');
    assert.equal(diagnostic.floor.enabled,false);
    assert.equal(diagnostic.background,'#171c24');
    assert.equal(diagnostic.exposure,1.8);
    assert.equal(diagnostic.shadows.enabled,false);
    assert.equal(diagnostic.lightOwner,'observation');
    assert.equal(diagnostic.plan.explicit.key,true);
    assert.equal(diagnostic.plan.explicit.floor,true);
  }finally{
    observation.dispose();
    disposeMeshes(meshes);
  }
  assert.equal(stage.visible,true);
});

await check('explicit floor size is the physical XZ span with no extra overlay plane',()=>{
 const {studio}=fakeStudio(),stage=createObservationStage(studio);
 try{stage.apply({floor:{size:[8,6],position:[0,1,0]}},{bounds:{min:[-1,0,-1],max:[1,2,1]}});
 const group=studio.scene.getObjectByName('modeler-observation-floor'),size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
 assert(Math.abs(size.x-8)<1e-6);assert(Math.abs(size.z-6)<1e-6);assert.equal(group.children.length,1);
 assert.equal(stage.actual.floor.finite,true);
 }finally{stage.dispose();}
});

await check('bounded surface overlay skips above the triangle budget and does not accumulate floor groups',()=>{
  const {studio}=fakeStudio();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  geometry.index={count:OBSERVATION_STAGE_LIMITS.maxOverlayTriangles*3+3};
  const material=new THREE.MeshStandardMaterial();
  const mesh=new THREE.Mesh(geometry,material);mesh.visible=true;
  const observation=createObservationStage(studio);
  const bounds={min:[-1,0,-1],max:[1,1,1]},options={mode:'material',displayMode:'surface_wireframe',bounds,meshes:[mesh]};
  try{
    const skipped=observation.apply(normalizeObservationLighting(undefined,{mode:'material',displayMode:'surface_wireframe'}),options);
    assert.equal(skipped.overlays.kind,'surface-wireframe');
    assert.equal(skipped.overlays.lines,0);
    assert.equal(skipped.overlays.skipped,'triangle-budget');
    assert(skipped.overlays.triangles>skipped.overlays.limit);
    assert.equal(mesh.children.length,0);
    observation.apply(normalizeObservationLighting(undefined,{mode:'material',displayMode:'outline'}),{...options,displayMode:'outline'});
    const normal=observation.apply(normalizeObservationLighting(undefined,{mode:'material',displayMode:'normal'}),{...options,displayMode:'normal'});
    assert.equal(normal.floor.enabled,true);
    assert.equal(studio.scene.children.filter(object=>object.name==='modeler-observation-floor').length,1);
  }finally{
    observation.dispose();
    geometry.dispose();
    material.dispose();
  }
  assert.equal(studio.scene.getObjectByName('modeler-observation-floor')??null,null);
});

await check('outline semantic IDs, 3x3 edge fixture and compositor disposal are bounded',()=>{
  const meshes=[{userData:{editableId:'source.a'}},{userData:{editableId:'source.a'}},{userData:{editableId:'source.b'}}];
  const assignments=outlineAssignments(meshes);
  assert.equal(assignments.length,3);
  assert.equal(assignments[0].index,assignments[1].index);
  assert.deepEqual(assignments[0].color,assignments[1].color);
  assert.notEqual(assignments[0].index,assignments[2].index);
  assert.deepEqual(outlineColorForIndex(0),{r:0,g:0,b:0});
  assert.equal(outlineIdForMesh({userData:{part:{editableId:'part.x'}}}),'part.x');
  const ids=new Uint32Array([0,0,0,0,0,0, 1,1,2,2,0,0, 1,1,2,2,0,3, 0,0,0,0,0,3]);
  assert.deepEqual([...outlineEdgeMask(ids,6,4)],[0,0,0,0,0,0, 1,1,1,1,0,0, 1,1,1,1,0,1, 0,0,0,0,0,1]);

  const studio={scene:new THREE.Scene(),renderer:{}};
  const compositor=createOutlineCompositor(studio);
  const target=compositor.ensureTarget(64,48);
  assert.equal(target.width,64);assert.equal(target.height,48);
  assert.deepEqual(compositor.stats().target,{width:64,height:48});
  assert.equal(compositor.ensureIdMaterial('source.a'),compositor.ensureIdMaterial('source.a'));
  assert.notEqual(compositor.ensureIdMaterial('source.a'),compositor.ensureIdMaterial('source.b'));
  assert.equal(compositor.stats().ids,2);
  compositor.dispose();
  assert.equal(compositor.stats().disposed,true);
  assert.equal(compositor.stats().target,null);
  assert.equal(compositor.stats().ids,0);
  compositor.dispose();
});

await check('outline uses DPR-correct logical viewport while ID target stays physical',()=>{
  const viewport=new THREE.Vector4(0,0,400,300),scissor=new THREE.Vector4(0,0,400,300),viewportCalls=[],scissorCalls=[];
  const renderer={
    autoClear:true,xr:{enabled:false},
    getDrawingBufferSize(vector){return vector.set(800,600);},
    getPixelRatio(){return 2;},
    getRenderTarget(){return null;},getActiveCubeFace(){return 0;},getActiveMipmapLevel(){return 0;},
    getClearColor(color){return color.setRGB(0,0,0);},getClearAlpha(){return 1;},
    getViewport(target){return target.copy(viewport);},getScissor(target){return target.copy(scissor);},getScissorTest(){return false;},
    setRenderTarget(){},setClearColor(){},setViewport(x,y,width,height){if(x?.isVector4){viewport.copy(x);return;}viewport.set(x,y,width,height);viewportCalls.push([x,y,width,height]);},
    setScissor(x,y,width,height){if(x?.isVector4){scissor.copy(x);return;}scissor.set(x,y,width,height);scissorCalls.push([x,y,width,height]);},setScissorTest(){},clear(){},render(){}
  };
  const compositor=createOutlineCompositor({scene:new THREE.Scene(),renderer});
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  const mesh={isMesh:true,visible:true,uuid:'dpr-mesh',geometry,layers:{mask:1},matrixWorld:new THREE.Matrix4(),userData:{editableId:'dpr-source'}};
  try{
    const result=compositor.render(new THREE.PerspectiveCamera(),[mesh]);
    assert.equal(result.applied,true);
    assert.equal(compositor.target.width,800);assert.equal(compositor.target.height,600);
    assert.deepEqual(compositor.edgeMaterial.uniforms.resolution.value.toArray(),[800,600]);
    assert.deepEqual(viewportCalls,[[0,0,400,300],[0,0,400,300]]);
    assert.deepEqual(scissorCalls,[[0,0,400,300],[0,0,400,300]]);
    assert.deepEqual(viewport.toArray(),[0,0,400,300]);
    assert.deepEqual(scissor.toArray(),[0,0,400,300]);
  }finally{compositor.dispose();geometry.dispose();}
});

await check('outline ID cache prunes prior assets before allocating and reuses indexes',()=>{
  const compositor=createOutlineCompositor({scene:new THREE.Scene(),renderer:{}});
  const geometry=new THREE.BufferGeometry();
  const limit=OBSERVATION_STAGE_LIMITS.maxOutlineIds;
  try{
    for(let i=0;i<limit+5;i++){
      const mesh={isMesh:true,visible:true,uuid:'cache-'+i,geometry,layers:{mask:1},matrixWorld:new THREE.Matrix4(),userData:{editableId:'asset-'+i}};
      compositor.updateWrappers([mesh]);
    }
    assert.equal(compositor.stats().ids,1);
    assert.equal(compositor.stats().wrappers,1);
    assert(compositor.stats().indexCursor<=2,`indexCursor=${compositor.stats().indexCursor}`);
  }finally{
    compositor.dispose();geometry.dispose();
  }
  assert.equal(compositor.stats().ids,0);
  assert.equal(compositor.stats().target,null);
});

await check('renderObservationFrame delegates base rendering and skips ID allocation over pixel budget',()=>{
  let renders=0;
  const baseStudio={scene:new THREE.Scene(),renderer:{render(){renders++;}}};
  const base=renderObservationFrame(baseStudio,new THREE.PerspectiveCamera(),[],'normal');
  assert.equal(base.applied,false);assert.equal(base.reason,'not-outline');assert.equal(renders,1);
  const budgetRenderer={render(){},getDrawingBufferSize(vector){return vector.set(5000,5000);}};
  const compositor=createOutlineCompositor({scene:new THREE.Scene(),renderer:budgetRenderer});
  const geometry=new THREE.BufferGeometry();
  const mesh={isMesh:true,visible:true,uuid:'m',geometry,userData:{editableId:'a'}};
  const skipped=compositor.render(new THREE.PerspectiveCamera(),[mesh]);
  assert.equal(skipped.applied,false);assert.equal(skipped.reason,'pixel-budget');assert.equal(compositor.stats().target,null);
  compositor.dispose();geometry.dispose();
});

await check('capture receipts include displayMode/lighting and reject provider substitutions',async()=>{
  const bounds={min:[-1,0,-1],max:[1,2,1]};
  const frame=(request,overrides={})=>({...identity,kernelVersion:KERNEL_VERSION,clientBuildId:'build-test',renderer:'three-r160',requestId:request.requestId,view:request.view,mode:request.mode,displayMode:request.displayMode,lighting:request.lighting,isolate:request.isolate??null,section:request.section??null,context:request.context??[],camera:resolveCamera(bounds,{view:request.view,camera:request.camera||{},aspect:1}),bounds,renderConfig:{observationStage:{plan:resolveObservationPlan(request.lighting,null)}},data:'data:image/png;base64,'+png,...overrides});
  const store=createEvidenceStore({directory:temp,snapshot:()=>identity,expectedBuildId:'build-test',requestCapture:async request=>{const request0=request.requests[0];return {frames:[frame(request0)]};}});
  const receipt=await store.capture({view:'iso',mode:'clay',displayMode:'surface_wireframe',lighting:{key:{intensity:1.4}},width:64,height:64});
  assert.equal(receipt.mode,'clay');
  assert.equal(receipt.displayMode,'surface_wireframe');
  assert.equal(receipt.displayModeEchoed,true);
  assert.equal(receipt.lightingEchoed,true);
  assert.equal(receipt.effectivePlanVerified,true);
  assert.equal(receipt.lighting.policy.overlay,'surface-wireframe');
  assert.equal(receipt.lighting.floor.enabled,false);
  assert.equal(receipt.proves.includes('诊断'),true);

  const badDisplay=createEvidenceStore({directory:temp,snapshot:()=>identity,expectedBuildId:'build-test',requestCapture:async request=>{const request0=request.requests[0];return {frames:[frame(request0,{displayMode:'outline'})]};}});
  await assert.rejects(()=>badDisplay.capture({view:'iso',width:64,height:64}),error=>error.code==='capture_mismatch');

  const badLighting=createEvidenceStore({directory:temp,snapshot:()=>identity,expectedBuildId:'build-test',requestCapture:async request=>{const request0=request.requests[0];const lighting=clone(request0.lighting);lighting.key.intensity=7;return {frames:[frame(request0,{lighting})]};}});
  await assert.rejects(()=>badLighting.capture({view:'iso',width:64,height:64}),error=>error.code==='capture_mismatch');

  const badPlan=createEvidenceStore({directory:temp,snapshot:()=>identity,expectedBuildId:'build-test',requestCapture:async request=>{const request0=request.requests[0];const plan=resolveObservationPlan(request0.lighting,null);plan.lights.key={...plan.lights.key,intensity:9};return {frames:[frame(request0,{renderConfig:{observationStage:{plan}}})]};}});
  await assert.rejects(()=>badPlan.capture({view:'iso',mode:'clay',displayMode:'surface_wireframe',lighting:{key:{intensity:1.4}},width:64,height:64}),error=>error.code==='capture_mismatch');
});

await check('legacy capture providers without displayMode/lighting remain readable with echoed/effective flags false',async()=>{
  const bounds={min:[-1,0,-1],max:[1,2,1]};
  const store=createEvidenceStore({directory:temp,snapshot:()=>identity,expectedBuildId:'build-test',requestCapture:async request=>{const request0=request.requests[0];return {frames:[{...identity,kernelVersion:KERNEL_VERSION,clientBuildId:'build-test',renderer:'three-r160',requestId:request0.requestId,view:request0.view,mode:request0.mode,isolate:request0.isolate??null,section:request0.section??null,context:request0.context??[],camera:resolveCamera(bounds,{view:request0.view,camera:request0.camera||{},aspect:1}),bounds,data:'data:image/png;base64,'+png}]};}});
  const receipt=await store.capture({view:'iso',mode:'clay',width:64,height:64});
  assert.equal(receipt.displayMode,'normal');
  assert.equal(receipt.displayModeEchoed,false);
  assert.equal(receipt.lightingEchoed,false);
  assert.equal(receipt.effectivePlanVerified,false);
  assert.equal(receipt.lighting.policy.floorAllowed,false);
});

const failed=tests.filter(t=>!t.passed);
try{fs.rmSync(temp,{recursive:true,force:true});}catch{}
console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.length-failed.length,failed:failed.length},tests},null,2));
process.exitCode=failed.length?1:0;
