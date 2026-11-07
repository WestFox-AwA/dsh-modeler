import * as THREE from 'three';
import {observationCameraClipping} from './host/camera.js';

const NAME='modeler-observation-floor';
const MAX_SPAN=100000;
const BIAS=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
export const extentOf=b=>Math.max(...b.max.map((v,i)=>v-b.min[i]),1e-9);
const corners=b=>{const out=[];for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]])out.push(new THREE.Vector3(x,y,z));return out;};
export function reflectedCamera(camera,y) {
  camera.updateMatrixWorld();
  const reflected=camera.clone();
  const eye=camera.getWorldPosition(new THREE.Vector3());eye.y=2*y-eye.y;
  const direction=camera.getWorldDirection(new THREE.Vector3());direction.y*=-1;
  const up=new THREE.Vector3(0,1,0).transformDirection(camera.matrixWorld);up.y*=-1;
  reflected.position.copy(eye);reflected.up.copy(up);reflected.lookAt(eye.clone().add(direction));
  reflected.updateMatrixWorld();reflected.projectionMatrix.copy(camera.projectionMatrix);
  reflected.projectionMatrixInverse.copy(camera.projectionMatrix).invert();return reflected;
}
// General inverse-projection form, valid for perspective AND orthographic.
export function clipReflectionCamera(camera,y) {
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-y).applyMatrix4(camera.matrixWorldInverse);
  const clip=new THREE.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  const q=new THREE.Vector4(Math.sign(clip.x)||1,Math.sign(clip.y)||1,1,1).applyMatrix4(camera.projectionMatrix.clone().invert());
  const dot=clip.dot(q);if(Math.abs(dot)<1e-10)throw new Error('Degenerate mirror clipping plane');
  clip.multiplyScalar(2/dot);const m=camera.projectionMatrix.elements;
  m[2]=clip.x-m[3];m[6]=clip.y-m[7];m[10]=clip.z-m[11];m[14]=clip.w-m[15];
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
function rayAt(camera,x,y) {
  // Construct rays from x/y projection coefficients, not near/far unprojection.
  // Re-preparing ground coverage must not drift when its own far plane changes.
  const m=camera.projectionMatrix.elements;
  if(camera.isOrthographicCamera)return {origin:new THREE.Vector3((x-m[12])/m[0],(y-m[13])/m[5],0).applyMatrix4(camera.matrixWorld),direction:camera.getWorldDirection(new THREE.Vector3())};
  const origin=camera.getWorldPosition(new THREE.Vector3());return {origin,direction:new THREE.Vector3((x+m[8])/m[0],(y+m[9])/m[5],-1).transformDirection(camera.matrixWorld)};
}
// Sample actual pixel centres around the horizon: no object-radius cutoff.
export function visibleGround(camera,y,width=640,height=480) {
  camera.updateMatrixWorld();const points=[],forward=camera.getWorldDirection(new THREE.Vector3());
  const right=new THREE.Vector3(1,0,0).transformDirection(camera.matrixWorld),up=new THREE.Vector3(0,1,0).transformDirection(camera.matrixWorld);
  const tv=camera.isPerspectiveCamera?Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()/2)):0,th=tv*(camera.aspect||1);
  const count=Math.max(2,Math.min(width,2400));
  for(let ix=0;ix<count;ix++) {
    const nx=((ix+.5)/count)*2-1,rows=new Set([0,height-1]);
    if(camera.isPerspectiveCamera&&Math.abs(up.y*tv)>1e-12) {
      const horizon=-(forward.y+right.y*nx*th)/(up.y*tv),boundary=(1-horizon)*height*.5-.5;
      for(const row of [Math.floor(boundary),Math.ceil(boundary),Math.ceil(boundary)+1])if(row>=0&&row<height)rows.add(row);
    }
    for(const row of rows){const ny=1-2*(row+.5)/height,{origin,direction}=rayAt(camera,nx,ny);
      if(Math.abs(direction.y)<1e-10)continue;
      const distance=(y-origin.y)/direction.y;if(distance<=0||!Number.isFinite(distance))continue;
      points.push(origin.addScaledVector(direction,distance));
    }
  }
  return points;
}
const VERTEX_DECL='uniform mat4 mirrorMatrix; varying vec4 vMirrorUV;';
const FRAGMENT_DECL=`uniform sampler2D mirrorTexture;
uniform vec2 mirrorTexel;
uniform float mirrorValid;
varying vec4 vMirrorUV;
vec4 samplePlanarRadiance(float roughness) {
  vec2 uv=vMirrorUV.xy/vMirrorUV.w;
  if(vMirrorUV.w<=0.0||any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return vec4(0.0);
  vec2 spread=mirrorTexel*(roughness*roughness*24.0);
  vec4 c=texture2D(mirrorTexture,uv)*0.4;
  c+=texture2D(mirrorTexture,uv+vec2(spread.x,0.0))*0.15;
  c+=texture2D(mirrorTexture,uv-vec2(spread.x,0.0))*0.15;
  c+=texture2D(mirrorTexture,uv+vec2(0.0,spread.y))*0.15;
  c+=texture2D(mirrorTexture,uv-vec2(0.0,spread.y))*0.15;
  return c*mirrorValid;
}`;
export function injectPlanarReflection(shader,uniforms) {
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=VERTEX_DECL+'\n'+shader.vertexShader;
  const marker='#include <worldpos_vertex>';
  if(!shader.vertexShader.includes(marker))throw new Error('Missing Three world position marker');
  shader.vertexShader=shader.vertexShader.replace(marker,marker+'\n vMirrorUV=mirrorMatrix*vec4(transformed,1.0);');
  const chunk=THREE.ShaderChunk.envmap_physical_pars_fragment;
  const radiance='return envMapColor.rgb * envMapIntensity;';
  if(!chunk.includes(radiance))throw new Error('Missing Three IBL radiance marker');
  const replacement=`vec4 planar=samplePlanarRadiance(roughness);
    // RT contains lit, premultiplied linear radiance: never apply env intensity twice.
    return planar.rgb+(1.0-planar.a)*envMapColor.rgb*envMapIntensity;`;
  shader.fragmentShader=FRAGMENT_DECL+'\n'+shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',chunk.replace(radiance,replacement));
}

// Avoid one horizon-sized triangle crossing the model contact area. Core
// cells stay scale-local; distant support remains one continuous physical plane.
export function createGroundGeometry(width,depth,extent) {
  const nodes=span=>{const out=[-.5,.5];for(const step of [-32,-16,-8,-4,-2,-1,-.5,-.25,0,.25,.5,1,2,4,8,16,32]){const v=step*extent/span;if(v>-.5&&v<.5)out.push(v);}return [...new Set(out)].sort((a,b)=>a-b);};
  const xs=nodes(width),ys=nodes(depth),positions=[],normals=[],uvs=[],indices=[];
  for(const y of ys)for(const x of xs){positions.push(x,y,0);normals.push(0,0,1);uvs.push(x+.5,y+.5);}
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){const a=j*xs.length+i,b=a+1,c=a+xs.length,d=c+1;indices.push(a,b,d,a,d,c);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.contactCellScale=extent;return geometry;
}

export class PlanarFloor {
  constructor(studio) {
    this.studio=studio;this.group=new THREE.Group();this.group.name=NAME;
    this.uniforms={mirrorTexture:{value:null},mirrorMatrix:{value:new THREE.Matrix4()},mirrorTexel:{value:new THREE.Vector2(1/512,1/512)},mirrorValid:{value:0}};
    this.material=new THREE.MeshStandardMaterial({color:'#d8dde2',metalness:1,roughness:.045,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:4});
    this.material.onBeforeCompile=shader=>injectPlanarReflection(shader,this.uniforms);
    this.material.customProgramCacheKey=()=> 'modeler-planar-linear-pbr-v1';
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),this.material);this.mesh.rotation.x=-Math.PI/2;
    this.mesh.name='modeler-observation-mirror';this.mesh.castShadow=false;this.mesh.receiveShadow=true;
    this.group.add(this.mesh);this.group.visible=false;this.target=null;this.virtualCamera=null;
    this.floor=null;this.bounds=null;this.spec=null;this.cameraStates=new Map();this.geometryKey=null;this.disposed=false;
  }
  updateGeometry(width,depth,extent) {
    const key=[width,depth,extent].join(':');if(key===this.geometryKey)return;
    const next=createGroundGeometry(width,depth,extent),previous=this.mesh.geometry;this.mesh.geometry=next;this.geometryKey=key;previous.dispose();
  }
  update(spec,bounds) {
    this.detach();this.spec=spec;this.bounds=bounds;
    if(!spec?.enabled||!bounds){this.floor={enabled:false,mirror:!!spec?.mirror,requestedEnabled:spec?.requestedEnabled,forcedOff:spec?.forcedOff,reason:spec?.forcedOff?'diagnostic-mode':!bounds?'no-visible-geometry':'disabled',size:null,position:null};return this.floor;}
    const extent=extentOf(bounds),center=bounds.min.map((v,i)=>(v+bounds.max[i])/2);
    const position=spec.position?[...spec.position]:[center[0],bounds.min[1]-extent*1e-4,center[2]];
    const size=spec.size?[...spec.size]:[Math.min(MAX_SPAN,extent*128),Math.min(MAX_SPAN,extent*128)];
    this.group.position.fromArray(position);this.group.scale.set(size[0],1,size[1]);this.updateGeometry(size[0],size[1],extent);this.group.visible=true;
    this.material.color.set(spec.tint);this.material.metalness=spec.mirror?1:spec.metalness;
    this.material.roughness=spec.roughness;this.mesh.receiveShadow=!!spec.shadow;
    this.mesh.name=spec.mirror?'modeler-observation-mirror':'modeler-observation-matte-floor';
    this.uniforms.mirrorValid.value=0;this.studio.scene.add(this.group);
    this.floor={enabled:true,mirror:!!spec.mirror,requestedEnabled:spec.requestedEnabled,forcedOff:spec.forcedOff,reason:null,
      type:spec.mirror?'planar-pbr':'matte-floor',tint:spec.tint,roughness:spec.roughness,metalness:this.material.metalness,shadow:!!spec.shadow,shadowCatcher:false,
      size,position,finite:!!spec.size,depthSeparation:{method:'view-depth-near-and-local-grid',factor:1,units:4},reflection:{method:'linear-planar-over-IBL',roughness:'bounded-five-tap-screen-space',radialFade:false},coverage:null};
    return this.floor;
  }
  prepare(camera,bounds=this.bounds) {
    if(!this.floor?.enabled)return {prepared:false};
    const extent=extentOf(bounds),size=this.studio.renderer.getDrawingBufferSize?.(new THREE.Vector2())||new THREE.Vector2(640,480);
    camera.updateMatrixWorld();
    const ground=visibleGround(camera,this.floor.position[1],Math.floor(size.x),Math.floor(size.y));
    const [cx,cy,cz]=this.floor.position;
    if(!this.spec.size) {
  
      let hx=extent*64,hz=extent*64;
      for(const p of ground){hx=Math.max(hx,Math.abs(p.x-cx)*1.02+extent);hz=Math.max(hz,Math.abs(p.z-cz)*1.02+extent);}
      const coverageLimit=Math.max(MAX_SPAN,extent*32768);
      this.floor.size=[Math.min(coverageLimit,hx*2),Math.min(coverageLimit,hz*2)];this.group.scale.set(this.floor.size[0],1,this.floor.size[1]);
    }
    const [w,d]=this.floor.size;this.updateGeometry(w,d,extent);
    const eye=camera.getWorldPosition(new THREE.Vector3());let distance=0;
    for(const x of [cx-w/2,cx+w/2])for(const z of [cz-d/2,cz+d/2])distance=Math.max(distance,eye.distanceTo(new THREE.Vector3(x,cy,z)));
    for(const p of corners(bounds)){p.y=2*cy-p.y;distance=Math.max(distance,eye.distanceTo(p));}
    if(!this.cameraStates.has(camera))this.cameraStates.set(camera,{near:camera.near,far:camera.far,lastNear:null,lastFar:null});
    const prior={near:camera.near,far:camera.far};
    const forward=camera.getWorldDirection(new THREE.Vector3()),worldUp=new THREE.Vector3(0,1,0).transformDirection(camera.matrixWorld);
    const clip=observationCameraClipping(bounds,{eye:eye.toArray(),target:eye.clone().add(forward).toArray(),up:worldUp.toArray(),projection:camera.isOrthographicCamera?'orthographic':'perspective',fov:camera.isPerspectiveCamera?camera.getEffectiveFOV():undefined,span:camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom:undefined,aspect:camera.isOrthographicCamera?(camera.right-camera.left)/(camera.top-camera.bottom):camera.aspect,near:camera.near,far:camera.far},this.floor);
    camera.near=clip.near;camera.far=clip.far;this.cameraStates.get(camera).lastNear=clip.near;this.cameraStates.get(camera).lastFar=clip.far;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    this.group.updateMatrixWorld(true);
    let outside=0;for(const p of ground)if(Math.abs(p.x-cx)>w/2||Math.abs(p.z-cz)>d/2)outside++;
    this.floor.coverage={samples:ground.length,outside,clamped:!this.spec.size&&outside>0,size:[w,d],near:camera.near,far:camera.far,resolved:prior};
    return {prepared:true,floor:this.floor,cameraFar:{resolved:prior.far,effective:camera.far}};
  }
  ensureTarget() {
    const size=this.studio.renderer.getDrawingBufferSize(new THREE.Vector2());
    const factor=Math.min(1,1024/Math.max(size.x,size.y));const w=Math.max(64,Math.round(size.x*factor)),h=Math.max(64,Math.round(size.y*factor));
    if(this.target?.width===w&&this.target?.height===h)return;
    this.target?.dispose();this.target=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
    this.target.texture.colorSpace=THREE.NoColorSpace;this.target.texture.name='modeler-linear-planar-radiance';
    this.uniforms.mirrorTexture.value=this.target.texture;this.uniforms.mirrorTexel.value.set(1/w,1/h);
  }
  renderReflection(camera) {
    if(!this.floor?.enabled||!this.floor.mirror)return;
    this.uniforms.mirrorValid.value=0;
    if(camera.getWorldPosition(new THREE.Vector3()).y<=this.floor.position[1])return;
    this.ensureTarget();const renderer=this.studio.renderer,scene=this.studio.scene;
    const virtual=reflectedCamera(camera,this.floor.position[1]);this.virtualCamera=virtual;
    this.uniforms.mirrorMatrix.value.copy(BIAS).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse).multiply(this.mesh.matrixWorld);
    clipReflectionCamera(virtual,this.floor.position[1]);
    const state={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),level:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),auto:renderer.autoClear,autoColor:renderer.autoClearColor,autoDepth:renderer.autoClearDepth,autoStencil:renderer.autoClearStencil,xr:renderer.xr.enabled,shadowAuto:renderer.shadowMap.autoUpdate,background:scene.background};
    const hidden=[];scene.traverse(node=>{if(node===this.group||node.userData?.observationOverlay||node.userData?.modelerSelectionOverlay||node.name==='Modeler selection'||node.isTransformControls||node.isHelper||node.type.endsWith('Helper')||node.type==='TransformControls'||node.type==='Points'){hidden.push([node,node.visible]);node.visible=false;}});
    try {
      scene.background=null;renderer.setClearColor(0,0);renderer.xr.enabled=false;renderer.autoClear=renderer.autoClearColor=renderer.autoClearDepth=renderer.autoClearStencil=true;
      renderer.shadowMap.autoUpdate=true;renderer.setRenderTarget(this.target);
      const gl=renderer.getContext?.();if(gl&&gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error("Planar reflection HDR framebuffer is unavailable");
      const dpr=renderer.getPixelRatio();renderer.setViewport(0,0,this.target.width/dpr,this.target.height/dpr);renderer.setScissorTest(false);
      renderer.clear(true,true,true);renderer.render(scene,virtual);this.uniforms.mirrorValid.value=1;
      this.floor.reflection={...this.floor.reflection,width:this.target.width,height:this.target.height,colorSpace:'linear',cameraType:virtual.type,near:virtual.near,far:virtual.far};
    } finally {
      for(const [node,visible] of hidden)node.visible=visible;
      scene.background=state.background;renderer.setRenderTarget(state.target,state.face,state.level);renderer.setViewport(state.viewport);renderer.setScissor(state.scissor);renderer.setScissorTest(state.scissorTest);renderer.setClearColor(state.clear,state.alpha);renderer.autoClear=state.auto;renderer.autoClearColor=state.autoColor;renderer.autoClearDepth=state.autoDepth;renderer.autoClearStencil=state.autoStencil;renderer.xr.enabled=state.xr;renderer.shadowMap.autoUpdate=state.shadowAuto;
    }
  }
  detach(){this.group.removeFromParent();this.group.visible=false;this.uniforms.mirrorValid.value=0;this.floor=null;}
  restore(){for(const [camera,state]of this.cameraStates){if(camera.near===state.lastNear&&camera.far===state.lastFar){camera.near=state.near;camera.far=state.far;camera.updateProjectionMatrix();}}this.cameraStates.clear();this.detach();}
  dispose(){if(this.disposed)return;this.disposed=true;this.restore();this.target?.dispose();this.target=null;this.mesh.geometry.dispose();this.material.dispose();this.group.clear();}
}
export const createPlanarFloor=studio=>new PlanarFloor(studio);
