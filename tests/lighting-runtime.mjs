import assert from 'node:assert/strict';
import * as T from 'three';
import {studioRadiance,environmentPixels} from '../client.environment.js';
import {reflectedCamera,clipReflectionCamera,PlanarFloor,injectPlanarReflection} from '../client.floor.js';
import {observationCameraClipping} from '../lib/camera.js';
import {createObservationStage} from '../client.observation.js';
import {applyStudioStage} from '../client.render.js';
import {runModelerScript} from '../lib/script.js';
import {evaluateDoc} from '../lib/kernel.js';
const tests=[];
const check=(name,fn)=>{try{fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});}};
const near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
check('radiance is neutral, finite, pole/seam-continuous and north is lit',()=>{
 for(const y of [-1,-.8,0,.8,1])for(const a of [-Math.PI,-1,0,1,Math.PI]){const d=[Math.sqrt(1-y*y)*Math.cos(a),y,Math.sqrt(1-y*y)*Math.sin(a)],c=studioRadiance(d);assert(c.every(v=>Number.isFinite(v)&&v>=0));near(c[0],c[1]);near(c[0],c[2]);}
 near(studioRadiance([-1,.3,1e-8])[0],studioRadiance([-1,.3,-1e-8])[0]);
 assert(studioRadiance([0,1,0])[0]>studioRadiance([0,-1,0])[0]);
 const data=environmentPixels();assert(data.every(Number.isFinite));assert(data[0]<data[data.length-4]);
});
for(const ortho of [false,true])check(`geometric reflection and oblique clipping: ${ortho?'orthographic':'perspective'}`,()=>{
 const camera=ortho?new T.OrthographicCamera(-3,3,2,-2,.01,100):new T.PerspectiveCamera(42,1.5,.01,100);
 camera.position.set(2,2,3);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const vc=reflectedCamera(camera,0);assert.equal(vc.type,camera.type);near(vc.position.y,-2);
 const object=new T.Vector3(-1,.6,0),mirrored=object.clone();mirrored.y*=-1;
 let ground;
 if(ortho){const dir=camera.getWorldDirection(new T.Vector3());ground=mirrored.clone().addScaledVector(dir,-mirrored.y/dir.y);}
 else ground=camera.position.clone().lerp(mirrored,camera.position.y/(camera.position.y-mirrored.y));
 const a=ground.clone().project(vc),b=object.clone().project(vc);near(a.x,b.x);near(a.y,b.y);
 clipReflectionCamera(vc,0);assert(object.clone().project(vc).z>=-1);assert(mirrored.clone().project(vc).z<-1);
 near(ground.clone().project(vc).z,-1,1e-6);
});
check('clip range includes support/reflected geometry without changing pose',()=>{
 const b={min:[-1,0,-1],max:[1,2,1]},c={eye:[3,2,4],near:1,far:6},floor={enabled:true,size:[100,100],position:[0,0,0]};
 const before=JSON.stringify(c),clip=observationCameraClipping(b,c,floor);assert.equal(JSON.stringify(c),before);assert(clip.far>75);assert(clip.near>1);assert(clip.near<3);
});
check('floor default covers ground rays and restores cameras at three scales',()=>{
 for(const scale of [.01,1,1000]){
  const scene=new T.Scene(),renderer={getDrawingBufferSize:v=>v.set(640,480)};
  const floor=new PlanarFloor({scene,renderer}),bounds={min:[-scale,0,-scale],max:[scale,scale,scale]};
  const receipt=floor.update({enabled:true,mirror:true,tint:'#ffffff',roughness:.05,shadow:true,size:null},bounds);
  const camera=new T.PerspectiveCamera(42,4/3,scale*.1,scale*8);camera.position.set(3*scale,2*scale,4*scale);camera.lookAt(0,scale*.5,0);camera.updateMatrixWorld();
  const initial={near:camera.near,far:camera.far};floor.prepare(camera);assert.equal(receipt.coverage.outside,0);assert.equal(scene.children.length,1);assert.equal(floor.group.children.length,1);
  floor.restore();near(camera.near,initial.near);near(camera.far,initial.far);floor.dispose();floor.dispose();assert.equal(scene.children.length,0);
 }
});
check('planar radiance enters before BRDF/tonemapping without double env intensity',()=>{
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 injectPlanarReflection(shader,{mirrorValid:{value:0}});
 assert(shader.fragmentShader.includes('planar.rgb+(1.0-planar.a)*envMapColor.rgb*envMapIntensity'));
 assert(!shader.fragmentShader.includes('planar.rgb * envMapIntensity'));assert(!shader.fragmentShader.includes('blendOverlay'));
 assert(shader.vertexShader.includes('vMirrorUV=mirrorMatrix*vec4(transformed,1.0)'));
});
function studio(){const scene=new T.Scene(),root=new T.Group();scene.add(root);const hemi=new T.HemisphereLight(),key=new T.DirectionalLight(),fill=new T.DirectionalLight(),rim=new T.DirectionalLight();for(const light of [hemi,key,fill,rim])scene.add(light);return {scene,root,renderer:{shadowMap:{enabled:false,type:T.BasicShadowMap},toneMappingExposure:1},lights:{hemisphere:hemi,key,fill,rim},defaultLights:[hemi,key,fill,rim]};}
check('effective environment intensity is absolute and A-B-A restores authored values',()=>{
 const s=studio(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());mesh.material.envMapIntensity=.37;s.root.add(mesh);const observation=createObservationStage(s),options={bounds:{min:[-.5,-.5,-.5],max:[.5,.5,.5]},meshes:[mesh]};
 for(const value of [0,2,1]){const receipt=observation.apply({environment:{intensity:value},floor:{enabled:false}},options);near(mesh.material.envMapIntensity,value);near(receipt.environment.appliedIntensity,value);}
 observation.restore();near(mesh.material.envMapIntensity,.37);observation.dispose();mesh.geometry.dispose();mesh.material.dispose();
});
check('authored empty lights remain empty until an explicit family override',()=>{
 const s=studio(),stage=applyStudioStage(s,{lights:[],hemisphere:{intensity:0}});const observation=createObservationStage(s),options={stage,bounds:{min:[-1,0,-1],max:[1,1,1]}};
 const result=observation.apply({floor:{enabled:false}},options);assert.equal(result.lightOwner,'asset-stage');assert.equal(s.lights.key.visible,false);assert.equal(s.lights.hemisphere.visible,false);
 observation.apply({key:{intensity:2},floor:{enabled:false}},options);assert.equal(s.lights.key.visible,true);observation.dispose();
});
check('legacy material/normals are preserved; flat calibration removes 78-degree error',()=>{
 const source=flat=>runModelerScript(`return m.scene('n',[m.box(1,.5,.8).mat(m.paint('#c0453f'))${flat?".shade('flat')":''}]);`);
 const smooth=source(false),flat=source(true);assert.equal(smooth.objects[0].material.metalness,.55);
 const errors=doc=>{const o=evaluateDoc(doc).objects[0],p=o.geometryData.positions,n=o.geometryData.normals;let max=0;for(let i=0;i<p.length;i+=9){const a=new T.Vector3(...p.slice(i,i+3)),b=new T.Vector3(...p.slice(i+3,i+6)),c=new T.Vector3(...p.slice(i+6,i+9)),normal=b.sub(a).cross(c.sub(a)).normalize();for(let j=0;j<9;j+=3)max=Math.max(max,T.MathUtils.radToDeg(normal.angleTo(new T.Vector3(...n.slice(i+j,i+j+3)))));}return max;};
 assert(errors(smooth)>75);assert(errors(flat)<1e-5);
});
check('failed reflection restores borrowed renderer, background and helper visibility',()=>{
 const scene=new T.Scene(),background=new T.Color('#171c24');scene.background=background;
 let target=null,viewport=new T.Vector4(4,5,320,240),scissor=new T.Vector4(1,2,300,200),clear=new T.Color('#123456'),alpha=.75,scissorTest=true;
 const renderer={autoClear:false,autoClearColor:false,autoClearDepth:false,autoClearStencil:false,xr:{enabled:true},shadowMap:{autoUpdate:false},
 getDrawingBufferSize:v=>v.set(640,480),getPixelRatio:()=>2,getRenderTarget:()=>target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,
 getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,getClearColor:v=>v.copy(clear),getClearAlpha:()=>alpha,
 setRenderTarget:v=>{target=v;},setViewport:(...a)=>{viewport=a[0]?.isVector4?a[0].clone():new T.Vector4(...a);},setScissor:v=>{scissor=v.clone();},setScissorTest:v=>{scissorTest=v;},
 setClearColor:(c,a)=>{clear=new T.Color(c);alpha=a;},clear(){},render(){assert.equal(scene.background,null);assert.equal(helper.visible,false);assert.equal(floor.group.visible,false);throw Error('injected renderer fault');}};
 const floor=new PlanarFloor({scene,renderer}),helper=new T.Group();helper.name='Modeler selection';scene.add(helper);
 floor.update({enabled:true,mirror:true,tint:'#ffffff',roughness:.05,shadow:true,size:[10,10]}, {min:[-1,0,-1],max:[1,1,1]});
 const camera=new T.PerspectiveCamera(42,4/3,.01,100);camera.position.set(3,2,4);camera.lookAt(0,0,0);camera.updateMatrixWorld();floor.prepare(camera);
 assert.throws(()=>floor.renderReflection(camera),/injected renderer fault/);
 assert.equal(scene.background,background);assert.equal(helper.visible,true);assert.equal(floor.group.visible,true);assert.equal(target,null);
 assert.deepEqual(viewport.toArray(),[4,5,320,240]);assert.deepEqual(scissor.toArray(),[1,2,300,200]);assert.equal(scissorTest,true);near(alpha,.75);assert.equal(clear.getHexString(),'123456');
 assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(renderer.autoClear,false);assert.equal(renderer.autoClearColor,false);assert.equal(renderer.autoClearDepth,false);assert.equal(renderer.autoClearStencil,false);
 assert.equal(floor.uniforms.mirrorValid.value,0);floor.dispose();
});
check('authored non-square support plane clipping matches its actual quaternion',()=>{
 const bounds={min:[-1,0,-1],max:[1,2,1]},camera={eye:[4,8,11],near:1,far:3};
 for(const normal of [[0,1,0],[0,0,-1],[1,1,.2],[-.7,.3,.6]]){const n=new T.Vector3(...normal).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),n),floor={enabled:true,size:[8,3],position:[1,2,3],normal:n.toArray()},clip=observationCameraClipping(bounds,camera,floor);let far=0;
 for(const x of [-4,4])for(const y of [-1.5,1.5]){const p=new T.Vector3(x,y,0).applyQuaternion(q).add(new T.Vector3(...floor.position));far=Math.max(far,p.distanceTo(new T.Vector3(...camera.eye)));}
 for(const x of [-1,1])for(const y of [0,2])for(const z of [-1,1]){const p=new T.Vector3(x,y,z),d=p.clone().sub(new T.Vector3(...floor.position)).dot(n);p.addScaledVector(n,-2*d);far=Math.max(far,p.distanceTo(new T.Vector3(...camera.eye)));}
 near(clip.far,far*1.02+2,1e-6);
 }
});
console.log(JSON.stringify({tests:tests.length,passed:tests.filter(t=>t.passed).length,results:tests},null,2));if(tests.some(t=>!t.passed))process.exitCode=1;
