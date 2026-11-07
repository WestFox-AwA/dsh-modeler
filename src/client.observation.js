import * as THREE from './vendor/three.js';
import {createPlanarFloor} from './client.floor.js';
import {observationCameraClipping} from './host/camera.js';
import {normalizeObservationLighting,rebaseObservationLighting,resolveObservationPlan,OBSERVATION_STAGE_LIMITS} from './host/observation-stage.js';
const ROLE_ORDER=['hemisphere','key','fill','rim'];
const TARGET_ROLES=['key','fill','rim'];
const LINE_COLORS={wireframe:'#26303c',outline:'#16202e'};
function listMaterials(material) {
  return Array.isArray(material) ? material : [material];
}
function plainBounds(bounds) {
  if (!bounds || !Array.isArray(bounds.min) || !Array.isArray(bounds.max) || bounds.min.length !== 3 || bounds.max.length !== 3) return null;
  if (![...bounds.min, ...bounds.max].every(Number.isFinite)) return null;
  return {min: bounds.min.slice(), max: bounds.max.slice()};
}
function boundsExtent(bounds) {
  if (!bounds) return 1;
  return Math.max(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2], 1e-6);
}
function boundsCenter(bounds) {
  if (!bounds) return [0, 1, 0];
  return [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2, (bounds.min[2] + bounds.max[2]) / 2];
}
function lightRoles(studio) {
  if (studio.lights && ROLE_ORDER.some(role => studio.lights[role])) return studio.lights;
  const roles = {hemisphere: null, key: null, fill: null, rim: null}, directional = [];
  for (const light of studio.defaultLights || []) {
    const declared = light.userData?.observationRole;
    if (declared && ROLE_ORDER.includes(declared)) roles[declared] = light;
    else if (light.isHemisphereLight) roles.hemisphere ||= light;
    else if (light.isDirectionalLight) directional.push(light);
  }
  for (const [index, role] of TARGET_ROLES.entries()) roles[role] ||= directional[index] || null;
  return roles;
}
function snapshotLight(light) {
  const shadow = light.shadow;
  return {
    light,
    color: light.color?.clone?.() || null,
    groundColor: light.groundColor?.clone?.() || null,
    intensity: light.intensity,
    visible: light.visible,
    position: light.position?.clone?.() || null,
    castShadow: light.castShadow,
    target: light.target || null,
    shadow: shadow ? {
      mapSize: shadow.mapSize.clone(),
      bias: shadow.bias,
      normalBias: shadow.normalBias,
      camera: {
        near: shadow.camera.near,
        far: shadow.camera.far,
        ...(shadow.camera.isOrthographicCamera ? {left: shadow.camera.left, right: shadow.camera.right, top: shadow.camera.top, bottom: shadow.camera.bottom} : {}),
      },
    } : null,
  };
}
function restoreLight(saved) {
  const {light} = saved;
  if (saved.color) light.color.copy(saved.color);
  if (saved.groundColor && light.groundColor) light.groundColor.copy(saved.groundColor);
  light.intensity = saved.intensity;
  light.visible = saved.visible;
  if (saved.position) light.position.copy(saved.position);
  light.castShadow = saved.castShadow;
  light.target = saved.target;
  if (!light.shadow || !saved.shadow) return;
  const shadow = light.shadow, previous = saved.shadow;
  if (shadow.map && (shadow.mapSize.x !== previous.mapSize.x || shadow.mapSize.y !== previous.mapSize.y)) {
    shadow.map.dispose();
    shadow.map = null;
  }
  shadow.mapSize.copy(previous.mapSize);
  shadow.bias = previous.bias;
  shadow.normalBias = previous.normalBias;
  if (shadow.camera.isOrthographicCamera && previous.camera.left !== undefined) {
    shadow.camera.left = previous.camera.left;
    shadow.camera.right = previous.camera.right;
    shadow.camera.top = previous.camera.top;
    shadow.camera.bottom = previous.camera.bottom;
  }
  shadow.camera.near = previous.camera.near;
  shadow.camera.far = previous.camera.far;
  shadow.camera.updateProjectionMatrix();
  shadow.needsUpdate = true;
}
function setMaterialIntensityAbsolute(object, intensity, saved) {
  object.traverse(item => {
    for (const material of listMaterials(item.material)) {
      if (!material || typeof material.envMapIntensity !== 'number' || !Number.isFinite(material.envMapIntensity)) continue;
      if (!saved.has(material)) saved.set(material, material.envMapIntensity);
      material.envMapIntensity = intensity;
    }
  });
}
function disposeMaterials(materials) {
  for (const material of materials) material?.dispose?.();
}

class ObservationStage {
  constructor(studio){
    this.studio=studio;this.lights=lightRoles(studio);this.planarFloor=createPlanarFloor(studio);
    this.state=null;this.actual=null;this.overlays=[];this.environmentMaterials=new Map();this.hidden=[];this.targets=null;this.cameraStates=new Map();this.disposed=false;
  }
  captureState(){return {background:this.studio.scene.background,exposure:this.studio.renderer.toneMappingExposure,
    shadowEnabled:this.studio.renderer.shadowMap.enabled,shadowType:this.studio.renderer.shadowMap.type,
    lights:(()=>{const out=[];this.studio.scene.traverse(node=>{if(node.isLight)out.push(snapshotLight(node));});return out;})()};}
  clearOverlays(){for(const entry of this.overlays){entry.line.removeFromParent();entry.geometry.dispose();entry.material.dispose();}this.overlays=[];}
  hideWhere(test){this.studio.scene.traverse(object=>{if(test(object)){this.hidden.push([object,object.visible]);object.visible=false;}});}
  restore(){
    if(!this.state)return;
    this.clearOverlays();this.planarFloor.restore();
    for(const [camera,state] of this.cameraStates){camera.near=state.near;camera.far=state.far;camera.updateProjectionMatrix();}this.cameraStates.clear();
    for(const [object,visible] of this.hidden)object.visible=visible;this.hidden=[];
    for(const [material,intensity] of this.environmentMaterials)material.envMapIntensity=intensity;this.environmentMaterials.clear();
    for(const saved of this.state.lights)restoreLight(saved);
    this.studio.scene.background=this.state.background;this.studio.renderer.toneMappingExposure=this.state.exposure;
    this.studio.renderer.shadowMap.enabled=this.state.shadowEnabled;this.studio.renderer.shadowMap.type=this.state.shadowType;
    this.targets?.removeFromParent();this.targets?.clear();this.targets=null;this.state=null;this.actual=null;
  }
  defaultLights(normalized,plan,bounds){
    this.hideWhere(object=>object.isLight&&String(object.name).startsWith('modeler-stage-'));
    const center=boundsCenter(bounds);this.targets=new THREE.Group();this.targets.name='modeler-observation-targets';this.studio.scene.add(this.targets);
    for(const role of TARGET_ROLES){const light=this.lights[role],spec=normalized[role];if(!light)continue;
      light.visible=true;light.color.set(spec.color);light.intensity=spec.intensity;
      light.position.fromArray(center.map((v,i)=>v+spec.position[i]));
      const target=new THREE.Object3D();target.position.fromArray(center);this.targets.add(target);light.target=target;
      light.castShadow=plan.shadows.enabled&&spec.shadows;
    }
    const hemi=this.lights.hemisphere;if(hemi){hemi.visible=true;hemi.color.set(normalized.hemisphere.sky);hemi.groundColor.set(normalized.hemisphere.ground);hemi.intensity=normalized.hemisphere.intensity;}
  }
  fitShadows(plan,bounds){
    if(!bounds)return;const extent=boundsExtent(bounds),points=[];
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z));
    this.studio.scene.updateMatrixWorld(true);
    this.studio.scene.traverseVisible(light=>{
      if(!light.isLight||!light.shadow||!light.castShadow)return;
      const shadow=light.shadow;if(shadow.map&&(shadow.mapSize.x!==plan.shadows.mapSize)){shadow.dispose();shadow.map=null;shadow.mapPass=null;}
      shadow.mapSize.set(plan.shadows.mapSize,plan.shadows.mapSize);shadow.bias=plan.shadows.bias;
      shadow.normalBias=plan.explicit.shadowNormalBias?plan.shadows.normalBias:extent*.001;
      if(light.isDirectionalLight){shadow.updateMatrices(light);const box=new THREE.Box3();for(const p of points)box.expandByPoint(p.clone().applyMatrix4(shadow.camera.matrixWorldInverse));
        const pad=extent*.08,camera=shadow.camera;camera.left=box.min.x-pad;camera.right=box.max.x+pad;camera.bottom=box.min.y-pad;camera.top=box.max.y+pad;
        camera.near=-box.max.z-pad;camera.far=-box.min.z+pad;camera.updateProjectionMatrix();
      }
      shadow.needsUpdate=true;
    });
  }
  buildOverlays(lighting, meshes) {
    const policy = lighting.policy;
    if (!policy.overlay) return {kind: null, lines: 0, triangles: 0, skipped: null};
    let triangles = 0;
    for (const mesh of meshes) {
      if (!mesh?.isMesh || !mesh.visible) continue;
      const position = mesh.geometry?.getAttribute('position');
      if (!position) continue;
      triangles += (mesh.geometry.index?.count ?? position.count) / 3;
    }
    if (triangles > OBSERVATION_STAGE_LIMITS.maxOverlayTriangles) {
      return {kind: policy.overlay, lines: 0, triangles, limit: OBSERVATION_STAGE_LIMITS.maxOverlayTriangles, skipped: 'triangle-budget'};
    }
    let lines = 0;
    for (const mesh of meshes) {
      if (!mesh?.isMesh || !mesh.visible || !mesh.geometry) continue;
      let geometry = null;
      try {
        geometry = policy.overlay === 'surface-wireframe' ? new THREE.WireframeGeometry(mesh.geometry) : new THREE.EdgesGeometry(mesh.geometry, 28);
        if (!geometry.getAttribute('position')?.count) {
          geometry.dispose();
          continue;
        }
        const material = new THREE.LineBasicMaterial({
          color: policy.overlay === 'surface-wireframe' ? LINE_COLORS.wireframe : LINE_COLORS.outline,
          transparent: true,
          opacity: policy.overlay === 'surface-wireframe' ? .55 : .86,
          depthTest: true,
          depthWrite: false,
          toneMapped: false,
        });
        const line = new THREE.LineSegments(geometry, material);
        line.name = 'modeler-observation-' + policy.overlay;
        line.renderOrder = 3;
        line.userData.observationOverlay = policy.overlay;
        line.raycast = () => {};
        mesh.add(line);
        this.overlays.push({mesh, line, geometry, material});
        lines++;
      } catch (error) {
        geometry?.dispose();
        throw error;
      }
    }
    return {kind: policy.overlay, lines, triangles, limit: OBSERVATION_STAGE_LIMITS.maxOverlayTriangles, skipped: null};
  }

  actualLights(plan) {
    const defaults = new Set(ROLE_ORDER.map(role => this.lights[role]).filter(Boolean));
    const out = [];
    this.studio.scene.traverseVisible(object => {
      if (!object.isLight) return;
      const role = ROLE_ORDER.find(item => this.lights[item] === object) || null;
      const source = defaults.has(object) ? (plan?.lightOwner === 'observation' ? 'observation' : 'studio-default') : 'asset-stage';
      const shadow = object.shadow ? {mapSize: object.shadow.mapSize.toArray(), bias: object.shadow.bias, normalBias: object.shadow.normalBias} : null;
      if (object.isHemisphereLight) out.push({role, name: object.name || null, source, type: 'hemisphere', sky: '#' + object.color.getHexString(), ground: '#' + object.groundColor.getHexString(), intensity: object.intensity, visible: object.visible});
      else out.push({role, name: object.name || null, source, type: object.type, color: '#' + object.color.getHexString(), intensity: object.intensity, position: object.position.toArray(), castShadow: object.castShadow, shadow, visible: object.visible});
    });
    return out;
  }

  apply(input,{mode='material',displayMode='normal',bounds=null,meshes=[],stage=null}={}){
    if(this.disposed)throw new Error('Observation stage disposed');this.restore();this.state=this.captureState();
    const normalized=input?.schema==='dsh-modeler.observation-lighting'?rebaseObservationLighting(input,{mode,displayMode}):normalizeObservationLighting(input,{mode,displayMode});
    const plan=resolveObservationPlan(normalized,stage,{mode,displayMode}),studio=this.studio;
    try{
      if(typeof plan.background.value==='string')studio.scene.background=new THREE.Color(plan.background.value);else if(plan.background.value===null)studio.scene.background=null;
      studio.renderer.toneMappingExposure=plan.exposure;studio.renderer.shadowMap.enabled=plan.shadows.enabled;studio.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      if(plan.lightOwner!=='asset-stage')this.defaultLights(normalized,plan,bounds);
      this.fitShadows(plan,bounds);
      let floor,stageFloorObject=null;
      if(plan.floor.source==='asset-stage'){
        stageFloorObject=studio.scene.getObjectByName('modeler-stage-floor');const spec=plan.floor.spec;
        floor={...spec,enabled:true,source:'asset-stage',type:'asset-stage-floor',mirror:false,tint:spec.color,shadow:spec.shadow!==false,forcedOff:false,requestedEnabled:true};
      }else{
        this.hideWhere(object=>object.name==='modeler-stage-floor');
        floor=this.planarFloor.update({...plan.floor.spec||normalized.floor,enabled:plan.floor.enabled},plainBounds(bounds));floor.source=plan.floor.source;
      }
      setMaterialIntensityAbsolute(studio.root,plan.environment.effective,this.environmentMaterials);
      if(this.planarFloor.group.parent)setMaterialIntensityAbsolute(this.planarFloor.group,plan.environment.effective,this.environmentMaterials);
      if(stageFloorObject)setMaterialIntensityAbsolute(stageFloorObject,plan.environment.effective,this.environmentMaterials);
      const lights=this.actualLights(plan),overlays=this.buildOverlays(normalized,meshes),handle=studio.environmentHandle;
      this.actual={schema:'dsh-modeler.observation-stage',schemaVersion:2,mode,displayMode,policy:normalized.policy,plan,
        background:studio.scene.background?.isColor?'#'+studio.scene.background.getHexString():plan.background.value,
        exposure:studio.renderer.toneMappingExposure,lights,shadows:{...plan.shadows,enabled:studio.renderer.shadowMap.enabled,type:'PCFSoftShadowMap',castLights:lights.filter(l=>l.castShadow).map(l=>l.name)},
        environment:{...plan.environment,map:studio.environmentSource,appliedIntensity:plan.environment.effective,adjustedMaterials:this.environmentMaterials.size,actualMaterialIntensities:[...new Set([...this.environmentMaterials.keys()].map(material=>material.envMapIntensity))],
          ...(handle?{radiance:{width:handle.textureWidth,height:handle.textureHeight,estimatedBytes:handle.estimatedBytes,input:handle.input}}:{})},
        floor,overlays,lightOwner:plan.lightOwner,stage:{active:plan.stage.active,lightOwner:plan.lightOwner,stageLightsHidden:this.hidden.filter(([node])=>node.isLight).length,stageFloorHidden:this.hidden.filter(([node])=>node.name==='modeler-stage-floor').length},transient:true};
      return this.actual;
    }catch(error){this.restore();throw error;}
  }
  prepareCamera(camera,bounds){
    if(this.planarFloor.floor?.enabled){const result=this.planarFloor.prepare(camera,bounds);this.planarFloor.renderReflection(camera);return result;}
    if(this.actual?.floor?.enabled&&bounds){if(!this.cameraStates.has(camera))this.cameraStates.set(camera,{near:camera.near,far:camera.far});const eye=camera.getWorldPosition(new THREE.Vector3()),direction=camera.getWorldDirection(new THREE.Vector3()),up=new THREE.Vector3(0,1,0).transformDirection(camera.matrixWorld),clip=observationCameraClipping(bounds,{eye:eye.toArray(),target:eye.clone().add(direction).toArray(),up:up.toArray(),projection:camera.isOrthographicCamera?'orthographic':'perspective',fov:camera.isPerspectiveCamera?camera.getEffectiveFOV():undefined,span:camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom:undefined,aspect:camera.isOrthographicCamera?(camera.right-camera.left)/(camera.top-camera.bottom):camera.aspect,near:camera.near,far:camera.far},this.actual.floor);camera.near=clip.near;camera.far=clip.far;camera.updateProjectionMatrix();}
    return {prepared:false};
  }
  dispose(){if(this.disposed)return;this.restore();this.planarFloor.dispose();this.disposed=true;}
}
export const createObservationStage=studio=>new ObservationStage(studio);
export function applyObservationStage(studio,lighting,options={}){if(!studio.observation)studio.observation=createObservationStage(studio);return studio.observation.apply(lighting,options);}
export function disposeObservationStage(studio){if(!studio?.observation)return;studio.observation.dispose();delete studio.observation;}
const OUTLINE_EDGE_COLOR = Object.freeze({r: 0x16 / 255, g: 0x20 / 255, b: 0x2e / 255});
const OUTLINE_EDGE_OPACITY = .9;
const OUTLINE_ID_VERTEX = `
#include <common>
#include <clipping_planes_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}
`;
const OUTLINE_ID_FRAGMENT = `
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 idColor;
void main() {
  #include <clipping_planes_fragment>
  gl_FragColor = vec4(idColor, 1.0);
}
`;
const OUTLINE_EDGE_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
const OUTLINE_EDGE_FRAGMENT = `
uniform sampler2D tId;
uniform vec2 resolution;
uniform vec3 edgeColor;
uniform float opacity;
varying vec2 vUv;
float idDelta(vec3 a, vec3 b) {
  return max(max(abs(a.r - b.r), abs(a.g - b.g)), abs(a.b - b.b));
}
void main() {
  vec3 center = texture2D(tId, vUv).rgb;
  // Do not paint the empty background side of a silhouette; the lit object
  // side gets a 1px inner outline.
  if (dot(center, center) < 0.000001) discard;
  vec2 stepUv = 1.0 / resolution;
  float edge = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec3 neighbour = texture2D(tId, vUv + vec2(float(x), float(y)) * stepUv).rgb;
      edge = max(edge, step(0.5 / 255.0, idDelta(center, neighbour)));
    }
  }
  if (edge < 0.5) discard;
  gl_FragColor = vec4(edgeColor, opacity);
}
`;

/** Deterministic 24-bit ID color; index 0 is the empty background. */
export function outlineColorForIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 0xffffff) throw new RangeError('outline color index must be 0..16777215');
  return {r: ((index >> 16) & 255) / 255, g: ((index >> 8) & 255) / 255, b: (index & 255) / 255};
}

/** Persistent semantic source identity; shared IDs deliberately share a color. */
export function outlineIdForMesh(mesh) {
  const user = mesh?.userData || {};
  const value = user.editableId ?? user.semanticId ?? user.sourceId ?? user.part?.editableId ?? user.part?.id ?? mesh?.name ?? mesh?.uuid ?? '';
  return String(value || '');
}

/** CPU mirror of the 3x3 ID-edge rule; useful without WebGL. */
export function outlineEdgeMask(ids, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new RangeError('outline mask size must be positive integers');
  if (!ids || ids.length !== width * height) throw new RangeError('outline id buffer length does not match width*height');
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const center = ids[y * width + x];
      if (center === 0) continue;
      let edge = 0;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          const neighbour = nx < 0 || ny < 0 || nx >= width || ny >= height ? 0 : ids[ny * width + nx];
          if (neighbour !== center) { edge = 1; break; }
        }
      }
      out[y * width + x] = edge;
    }
  }
  return out;
}

function isWorldVisible(object) {
  for (let node = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

export function outlineAssignments(meshes = []) {
  const seen = new Map(), out = [];
  for (const mesh of meshes) {
    const key = outlineIdForMesh(mesh);
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, seen.size + 1);
    const index = seen.get(key);
    out.push({id: key, index, color: outlineColorForIndex(index)});
  }
  return out;
}

class OutlineCompositor {
  constructor(studio) {
    if (!studio?.scene?.isScene || !studio.renderer) throw new TypeError('outline studio requires a Three scene and renderer');
    this.studio = studio;
    this.target = null;
    this.disposed = false;
    this.nextIndex = 1;
    this.freeIndices = [];
    this.idEntries = new Map();
    this.wrappers = new Map();
    this.last = null;
    this.idScene = new THREE.Scene();
    this.edgeScene = new THREE.Scene();
    this.edgeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.edgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tId: {value: null},
        resolution: {value: new THREE.Vector2(1, 1)},
        edgeColor: {value: new THREE.Vector3(OUTLINE_EDGE_COLOR.r, OUTLINE_EDGE_COLOR.g, OUTLINE_EDGE_COLOR.b)},
        opacity: {value: OUTLINE_EDGE_OPACITY},
      },
      vertexShader: OUTLINE_EDGE_VERTEX,
      fragmentShader: OUTLINE_EDGE_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.edgeMaterial.name = 'modeler-outline-edge';
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.edgeMaterial);
    this.quad.frustumCulled = false;
    this.quad.renderOrder = 10000;
    this.edgeScene.add(this.quad);
  }

  ensureTarget(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new RangeError('outline target size must be positive integers');
    if (this.target && this.target.width === width && this.target.height === height) return this.target;
    this.target?.dispose();
    this.target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.target.texture.colorSpace = THREE.NoColorSpace;
    this.target.texture.name = 'modeler-outline-id';
    this.edgeMaterial.uniforms.tId.value = this.target.texture;
    this.edgeMaterial.uniforms.resolution.value.set(width, height);
    return this.target;
  }

  ensureIdMaterial(key) {
    let entry = this.idEntries.get(key);
    if (entry) return entry;
    if (this.idEntries.size >= OBSERVATION_STAGE_LIMITS.maxOutlineIds) throw Object.assign(new RangeError('outline semantic id budget exceeded'), {code: 'outline_id_budget'});
    const index = this.freeIndices.length ? this.freeIndices.pop() : this.nextIndex++;
    if (index > 0xffffff) throw Object.assign(new RangeError('outline semantic id space exhausted'), {code: 'outline_id_budget'});
    const color = outlineColorForIndex(index);
    const material = new THREE.ShaderMaterial({
      uniforms: {idColor: {value: new THREE.Vector3(color.r, color.g, color.b)}},
      vertexShader: OUTLINE_ID_VERTEX,
      fragmentShader: OUTLINE_ID_FRAGMENT,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
      toneMapped: false,
      clipping: true,
    });
    material.name = 'modeler-outline-id-' + index;
    entry = {index, color, material};
    this.idEntries.set(key, entry);
    return entry;
  }

  liveKeys(meshes) {
    const keys = new Set();
    for (const source of meshes) {
      if (!source?.isMesh) continue;
      const key = outlineIdForMesh(source);
      if (key) keys.add(key);
    }
    return keys;
  }

  pruneIds(keys) {
    for (const [key, entry] of this.idEntries) {
      if (keys.has(key)) continue;
      entry.material.dispose();
      this.freeIndices.push(entry.index);
      this.idEntries.delete(key);
    }
    for (const [uuid, wrapper] of this.wrappers) {
      if (keys.has(wrapper.userData.outlineKey)) continue;
      wrapper.removeFromParent();
      this.wrappers.delete(uuid);
    }
  }

  updateWrappers(meshes) {
    const keys = this.liveKeys(meshes);
    this.pruneIds(keys);
    const live = new Set();
    for (const source of meshes) {
      if (!source?.isMesh || !isWorldVisible(source) || !source.geometry) continue;
      const key = outlineIdForMesh(source);
      if (!key) continue;
      const entry = this.ensureIdMaterial(key);
      let wrapper = this.wrappers.get(source.uuid);
      if (!wrapper) {
        wrapper = new THREE.Mesh(source.geometry, entry.material);
        wrapper.matrixAutoUpdate = false;
        wrapper.frustumCulled = false;
        wrapper.layers.mask = source.layers.mask;
        this.idScene.add(wrapper);
        this.wrappers.set(source.uuid, wrapper);
      }
      wrapper.geometry = source.geometry;
      wrapper.material = entry.material;
      wrapper.userData.outlineKey = key;
      wrapper.layers.mask = source.layers.mask;
      wrapper.matrix.copy(source.matrixWorld);
      wrapper.matrixWorld.copy(source.matrixWorld);
      wrapper.matrixWorldNeedsUpdate = false;
      wrapper.visible = true;
      live.add(source.uuid);
    }
    for (const [uuid, wrapper] of this.wrappers) {
      if (live.has(uuid)) continue;
      wrapper.removeFromParent();
      this.wrappers.delete(uuid);
    }
    return this.wrappers.size;
  }

  render(camera, meshes = []) {
    if (this.disposed) return {applied: false, reason: 'disposed'};
    const renderer = this.studio.renderer;
    renderer.render(this.studio.scene, camera);
    this.pruneIds(this.liveKeys(meshes));
    if (meshes.every(mesh => !mesh?.isMesh || !isWorldVisible(mesh))) return {applied: false, reason: 'no-visible-meshes'};
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const pixels = Math.max(0, Math.floor(size.x)) * Math.max(0, Math.floor(size.y));
    if (pixels < 1) return {applied: false, reason: 'empty-viewport'};
    if (pixels > OBSERVATION_STAGE_LIMITS.maxOutlinePixels) return {applied: false, reason: 'pixel-budget', pixels: {width: size.x, height: size.y, total: pixels}, limit: OBSERVATION_STAGE_LIMITS.maxOutlinePixels};
    try {
      this.updateWrappers(meshes);
      if (!this.wrappers.size) return {applied: false, reason: 'no-visible-meshes'};
    } catch (error) {
      return {applied: false, reason: error.code === 'outline_id_budget' ? 'id-budget' : 'id-error', error: String(error.message || error).slice(0, 512), limit: OBSERVATION_STAGE_LIMITS.maxOutlineIds};
    }
    const width = Math.floor(size.x), height = Math.floor(size.y);
    const pixelRatio = typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : 1;
    const vw = width / pixelRatio, vh = height / pixelRatio;
    this.ensureTarget(width, height);
    const prevTarget = renderer.getRenderTarget();
    const prevCubeFace = renderer.getActiveCubeFace();
    const prevMipmapLevel = renderer.getActiveMipmapLevel();
    const prevAutoClear = renderer.autoClear;
    const prevXr = renderer.xr.enabled;
    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = renderer.getClearAlpha();
    const prevViewport = renderer.getViewport(new THREE.Vector4());
    const prevScissor = renderer.getScissor(new THREE.Vector4());
    const prevScissorTest = renderer.getScissorTest();
    try {
      renderer.setRenderTarget(this.target);
      renderer.setClearColor(0x000000, 1);
      renderer.autoClear = true;
      renderer.xr.enabled = false;
      renderer.setViewport(0, 0, vw, vh);
      renderer.setScissor(0, 0, vw, vh);
      renderer.setScissorTest(false);
      renderer.clear(true, true, true);
      renderer.render(this.idScene, camera);
      renderer.setRenderTarget(prevTarget);
      renderer.autoClear = false;
      renderer.setViewport(0, 0, vw, vh);
      renderer.setScissor(0, 0, vw, vh);
      renderer.setScissorTest(false);
      renderer.render(this.edgeScene, this.edgeCamera);
      const result = {applied: true, displayMode: 'outline', pixels: {width, height, total: pixels}, ids: this.idEntries.size, wrappers: this.wrappers.size, edge: {method: '3x3-id-depth', width: 1}};
      this.last = result;
      return result;
    } catch (error) {
      const result = {applied: false, reason: 'outline-error', error: String(error.message || error).slice(0, 512)};
      this.last = result;
      return result;
    } finally {
      renderer.setRenderTarget(prevTarget, prevCubeFace, prevMipmapLevel);
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      renderer.autoClear = prevAutoClear;
      renderer.xr.enabled = prevXr;
      renderer.setViewport(prevViewport);
      renderer.setScissor(prevScissor);
      renderer.setScissorTest(prevScissorTest);
    }
  }

  stats() {
    return {
      disposed: this.disposed,
      target: this.target ? {width: this.target.width, height: this.target.height} : null,
      ids: this.idEntries.size,
      wrappers: this.wrappers.size,
      indexCursor: this.nextIndex,
      freeIds: this.freeIndices.length,
      maxPixels: OBSERVATION_STAGE_LIMITS.maxOutlinePixels,
      maxIds: OBSERVATION_STAGE_LIMITS.maxOutlineIds,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.target?.dispose();
    this.target = null;
    for (const entry of this.idEntries.values()) entry.material.dispose();
    this.idEntries.clear();
    this.freeIndices.length = 0;
    this.wrappers.clear();
    this.idScene.clear();
    this.edgeMaterial.uniforms.tId.value = null;
    this.edgeMaterial.dispose();
    this.quad.geometry.dispose();
    this.edgeScene.clear();
  }
}

export function createOutlineCompositor(studio) {
  return new OutlineCompositor(studio);
}

export function renderObservationFrame(studio,camera,meshes=[],displayMode='normal',observation=null,bounds=null){
  if(!studio?.scene?.isScene||!studio.renderer||!camera)throw new TypeError('Studio, renderer and camera required');
  if(studio.observation?.actual)studio.observation.prepareCamera(camera,bounds||studio.observation.planarFloor.bounds);
  if(displayMode!=='outline'){studio.renderer.render(studio.scene,camera);return {applied:false,displayMode,reason:'not-outline'};}
  if(!studio.outline||studio.outline.disposed)studio.outline=createOutlineCompositor(studio);
  return studio.outline.render(camera,meshes);
}
export function disposeObservationOutline(studio){if(!studio?.outline)return;studio.outline.dispose();delete studio.outline;}
