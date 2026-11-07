import assert from 'node:assert/strict';
import * as T from 'three';
import {PlanarFloor,createGroundGeometry} from '../src/client.floor.js';
import {observationCameraClipping} from '../lib/camera.js';
const tests=[];const check=(name,fn)=>{try{const detail=fn();tests.push({name,passed:true,detail});}catch(e){tests.push({name,passed:false,error:e.stack});}};
const bits=24,levels=2**bits-1;
check('contact surface and floor stay separated at the same pixel over scaled orbit paths',()=>{
 let cases=0,minSteps=Infinity,minNearFraction=Infinity;
 for(const scale of [.01,1,1000])for(const projection of ['perspective','orthographic'])for(const elevation of [3,10,25,55])for(const distance of [4,12,40])for(const azimuth of [0,.9,2.1]){
  const extent=2*scale,bounds={min:[-scale,0,-scale],max:[scale,scale,scale]},scene=new T.Scene(),renderer={getDrawingBufferSize:v=>v.set(640,480)},floor=new PlanarFloor({scene,renderer});
  floor.update({enabled:true,mirror:true,tint:'#ffffff',roughness:.05,size:null},bounds);
  const e=elevation*Math.PI/180,c=projection==='perspective'?new T.PerspectiveCamera(42,4/3,extent*.001,distance*scale+extent*2):new T.OrthographicCamera(-2*scale,2*scale,1.5*scale,-1.5*scale,extent*.001,distance*scale+extent*2);
  c.position.set(distance*scale*Math.cos(e)*Math.cos(azimuth),distance*scale*Math.sin(e),distance*scale*Math.cos(e)*Math.sin(azimuth));c.lookAt(0,0,0);c.updateMatrixWorld();floor.prepare(c,bounds);
  const contact=new T.Vector3(0,0,0),p=contact.clone().project(c),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(p.x,p.y),c);
  const hit=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-floor.floor.position[1]),new T.Vector3());assert(hit);
  const depth=z=>Math.round((z*.5+.5)*levels),delta=depth(hit.project(c).z)+floor.material.polygonOffsetUnits-depth(p.z);
  assert(delta>=4,`same-pixel depth separation ${delta}: ${scale}/${projection}/${elevation}/${distance}`);
  assert(floor.material.polygonOffset);assert.equal(floor.material.polygonOffsetFactor,1);
  minSteps=Math.min(minSteps,delta);if(projection==='perspective')minNearFraction=Math.min(minNearFraction,c.near/(distance*scale));
  for(const x of [-scale,scale])for(const y of [0,scale])for(const z of [-scale,scale]){const v=new T.Vector3(x,y,z).applyMatrix4(c.matrixWorldInverse);assert(-v.z>c.near);assert(-v.z<c.far);}
  floor.dispose();cases++;
 }
 assert(minNearFraction>.01);return {cases,minDepth24Steps:minSteps,minNearToDistance:minNearFraction};
});
check('preparation is stable across viewport clip refresh and never restores stale orbit planes',()=>{
 const scene=new T.Scene(),floor=new PlanarFloor({scene,renderer:{getDrawingBufferSize:v=>v.set(640,480)}}),b={min:[-1,0,-1],max:[1,1,1]};
 floor.update({enabled:true,mirror:true,tint:'#fff',roughness:0,size:null},b);
 const c=new T.PerspectiveCamera(42,4/3,.002,20);c.position.set(4,2,5);c.lookAt(0,0,0);c.updateMatrixWorld();floor.prepare(c,b);const first={near:c.near,far:c.far};
 floor.prepare(c,b);assert.equal(c.near,first.near);assert.equal(c.far,first.far);
 c.near=.8;c.far=40;floor.restore();assert.equal(c.near,.8);assert.equal(c.far,40);floor.dispose();
});
check('near clipping derives from pose not a caller tiny near or model origin',()=>{
 const b={min:[99,200,299],max:[101,201,301]},floor={enabled:true,size:[500,500],position:[100,200-2e-4,300]},camera={eye:[104,203,306],target:[100,200.5,300],up:[0,1,0],aspect:4/3,fov:42,projection:'perspective',near:2e-9,far:20};
 const translated=observationCameraClipping(b,camera,floor),base=observationCameraClipping({min:[-1,0,-1],max:[1,1,1]},{...camera,eye:[4,3,6],target:[0,.5,0]},{...floor,position:[0,-2e-4,0]});assert(Math.abs(translated.near-base.near)<1e-9);assert(Math.abs(translated.far-base.far)<1e-9);assert(translated.near>1);
});
check('horizon-sized support keeps small triangles at model contacts and caches its topology',()=>{
 const g=createGroundGeometry(100000,200000,1),p=g.getAttribute('position'),indices=g.index.array;let central=0;
 for(let i=0;i<indices.length;i+=3){const a=new T.Vector3().fromBufferAttribute(p,indices[i]),b=new T.Vector3().fromBufferAttribute(p,indices[i+1]),c=new T.Vector3().fromBufferAttribute(p,indices[i+2]);for(const v of [a,b,c]){v.x*=100000;v.y*=200000;}
 const center=a.clone().add(b).add(c).divideScalar(3);if(Math.abs(center.x)<.1&&Math.abs(center.y)<.1){assert(a.distanceTo(b)<.5);assert(b.distanceTo(c)<.5);central++;}}
 assert(central>0);assert(p.count<500);g.dispose();
 const scene=new T.Scene(),floor=new PlanarFloor({scene,renderer:{getDrawingBufferSize:v=>v.set(640,480)}}),bounds={min:[-1,0,-1],max:[1,1,1]};
 floor.update({enabled:true,mirror:true,tint:'#fff',roughness:0,size:[100000,200000]},bounds);const geometry=floor.mesh.geometry;floor.updateGeometry(100000,200000,2);assert.equal(floor.mesh.geometry,geometry);floor.dispose();
});
console.log(JSON.stringify({summary:{tests:tests.length,passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed).length},tests},null,2));if(tests.some(t=>!t.passed))process.exitCode=1;
