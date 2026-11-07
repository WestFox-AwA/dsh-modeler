import {SelectionOverlay} from './client.selection.js';
import {materialTextures,applyRenderStage,disposeRenderStage} from './client.shading.js';
import {applyObservationStage,disposeObservationStage,disposeObservationOutline,renderObservationFrame} from './client.observation.js';
import * as THREE from 'three';
import {createStudioEnvironment} from './client.environment.js';
import {evaluateDoc,KERNEL_VERSION} from '../lib/kernel.js';
import {resolveCamera} from '../lib/camera.js';
import {resolveCaptureSelection} from '../lib/observation-purpose.js';
import {renderMaterialSpec} from '../lib/material-source.js';
import {OBSERVATION_MODES,DISPLAY_MODES,OBSERVATION_LIGHTING_DEFAULTS,normalizeObservationLighting,rebaseObservationLighting} from '../lib/observation-stage.js';

export {OBSERVATION_MODES,DISPLAY_MODES};
export {applyObservationStage,disposeObservationStage,disposeObservationOutline,renderObservationFrame};
export const STUDIO_CONFIG=Object.freeze({background:OBSERVATION_LIGHTING_DEFAULTS.background,lighting:'studio-lighting-v3',environment:'studio-radiance-v3',environmentSigma:0,hemisphereSky:OBSERVATION_LIGHTING_DEFAULTS.hemisphere.sky,hemisphereGround:OBSERVATION_LIGHTING_DEFAULTS.hemisphere.ground,hemisphereIntensity:OBSERVATION_LIGHTING_DEFAULTS.hemisphere.intensity,keyColor:OBSERVATION_LIGHTING_DEFAULTS.key.color,keyIntensity:OBSERVATION_LIGHTING_DEFAULTS.key.intensity,keyPosition:Object.freeze([...OBSERVATION_LIGHTING_DEFAULTS.key.position])});
const MODES=new Set(OBSERVATION_MODES);
const DISPLAYS=new Set(DISPLAY_MODES);

export const OBSERVATION_HELP=Object.freeze({
 material:'标准工作室外观：共享PBR材质、环境与灯光；默认显示观察镜面地板与阴影。Standard studio appearance; the default observation view.',
 clay:'既有中性灰黏土（#a6b6c6），不是新的白色诊断模型；无镜面地板。Existing gray clay, not the white diagnostic model.',
 normal:'既有双面 MeshNormalMaterial 显示着色法线；它是法线诊断，不是标准外观，也不是新的normal外观模式。Existing shading-normal diagnostic, not the standard appearance.',
 final_normal:'Actual standard-material geometry and normalMap result; unlit, no tone mapping, displayed in sRGB.',
 orientation:'蓝：相机所见绕序正面；红：绕序背面。双面无光照、忽略透明度；不判定闭合内外，也不显示法线贴图。',
 zebra:'原有相机相对反射条纹，保留双面显示；DoubleSide 不证明面绕序或闭合外向正确。',
 roughness:'实际 roughness 因子 × 贴图 G，复制为灰度；无光照、无色调映射，线性标量经 sRGB 显示编码，忽略透明度。',
 metalness:'实际 metalness 因子 × 贴图 B，复制为灰度；无光照、无色调映射，线性标量经 sRGB 显示编码，忽略透明度。',
 albedo:'实际 baseColor 贴图 × 颜色因子；无光照、无色调映射，以 sRGB 显示，忽略透明度。',
 wire:'既有材质线框（MeshStandardMaterial.wireframe），仅为兼容保留；它隐藏填充面，不是surface_wireframe的深度感知表面线框。Legacy material wireframe, not the display overlay.'
});
export const DISPLAY_MODE_HELP=Object.freeze({
 normal:'标准显示表面：不叠加几何线；由mode决定材质/通道诊断，material时默认显示工作室镜面地板。No geometric overlay; mode still selects the channel appearance.',
 surface_wireframe:'白色黏土实体 + 真实三角面WireframeGeometry叠加线；线做深度测试，保留填充与明暗；无镜面地板、纯背景；与其它显示共用同一灯光/阴影/相机。White clay with a depth-tested real surface wireframe overlay.',
 outline:'白色黏土实体 + 可见语义边界与轮廓：按 mesh.userData.editableId 的可见深度 ID 做 3x3 屏幕空间边缘合成，同一来源共享颜色；相邻共面部件/接缝与光滑轮廓可辨，深度测试使遮挡边不穿透；可选硬折边叠加线。网格三角形边界不是 CAD 拓扑证明；无镜面地板、纯背景。White clay with visible semantic editableId boundaries and silhouettes from a depth-tested 3x3 ID composite, plus optional hard crease edges; not a CAD topology proof.'
});
// Receipt-facing diagnostic description. A new displayMode adds its white-clay,
// overlay and no-floor meaning instead of leaving only the material-mode note.
export function observationDiagnosticInfo(mode,displayMode,plan){
 const modeHelp=OBSERVATION_HELP[mode]||null,displayHelp=displayMode!=='normal'?DISPLAY_MODE_HELP[displayMode]||null:null;
 if(!modeHelp&&!displayHelp)return null;
 return {...(modeHelp?{description:modeHelp}:{}),...(displayHelp?{displayMode,displayModeDescription:displayHelp,surfaceMode:plan?.policy?.whiteClay?'white-clay':'channel',overlay:plan?.policy?.overlay??null,floor:plan?.floor?.enabled?'effective':'none',background:plan?.policy?.floorAllowed?'effective':'flat'}:{})};
}

const buildId=()=>typeof __MODELER_CLIENT_BUILD__==='undefined'?null:__MODELER_CLIENT_BUILD__;

const materialContexts=new WeakMap();
const WHITE_CLAY_COLOR='#f4f5f7';
// New diagnostic display modes are deliberately white, unlike the historical
// gray `clay` mode. Polygon offset keeps the separate overlay lines readable.
function whiteClayMaterial(){return new THREE.MeshStandardMaterial({color:WHITE_CLAY_COLOR,metalness:0,roughness:.58,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});}
const materialColor=value=>Array.isArray(value)?new THREE.Color().setRGB(value[0],value[1],value[2]):value;
function disposeMaterials(materials){const textures=new Set();for(const m of Array.isArray(materials)?materials:[materials]){if(!m)continue;for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}for(const texture of textures)texture.dispose();}
function finalNormalMaterial(spec,textures){
 const normalMap=textures.normalMap||null,allTextures=new Set(Object.values(textures).filter(value=>value?.isTexture));
 const normalScale=spec.normalScale!==undefined?(Array.isArray(spec.normalScale)?new THREE.Vector2(...spec.normalScale):new THREE.Vector2(spec.normalScale,spec.normalScale)):textures.normalScale||new THREE.Vector2(1,1);
 try{
  const out=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:0,roughness:1,normalMap,normalScale,side:spec.doubleSided?THREE.DoubleSide:THREE.FrontSide,toneMapped:false,fog:false,transparent:false,opacity:1});
  out.onBeforeCompile=shader=>{const marker='#include <opaque_fragment>';if(!shader.fragmentShader.includes(marker))throw new Error('Three standard shader is missing opaque_fragment');shader.fragmentShader=shader.fragmentShader.replace(marker,'gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, 1.0 );');};
  out.customProgramCacheKey=()=> 'modeler-final-normal-with-normal-map-v1';
  for(const texture of allTextures)if(texture!==normalMap)texture.dispose();
  return out;
 }catch(error){for(const texture of allTextures)texture.dispose();throw error;}
}

// Diagnostic RGB uses the same resolved material/maps as the appearance path.
// Scalar textures stay linear: Three stores roughness in G and metalness in B.
// Final linear values are displayed with the renderer's sRGB encoding, without
// tone mapping. Opacity is deliberately ignored; source sidedness is retained.
export function derivedMaterial(spec,textures,mode){
 const scalar=mode!=='albedo',channel=mode==='roughness'?'g':'b',map=scalar?textures[mode+'Map']:textures.map,factor=spec[mode]??(mode==='roughness'?.5:.1);
 const out=new THREE.MeshBasicMaterial({color:scalar?new THREE.Color().setRGB(factor,factor,factor):materialColor(spec.color??'#a5b6cc'),map:map||null,side:spec.doubleSided?THREE.DoubleSide:THREE.FrontSide,toneMapped:false,fog:false,transparent:false,opacity:1});
 out.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',scalar?`#ifdef USE_MAP\n diffuseColor.rgb *= vec3(texture2D(map,vMapUv).${channel});\n#endif\n diffuseColor.a = 1.0;`:'#include <map_fragment>\n diffuseColor.a = 1.0;');};
 out.customProgramCacheKey=()=> 'modeler-final-channel-'+mode+'-srgb-v1';
 for(const texture of new Set(Object.values(textures)))if(texture?.isTexture&&texture!==map)texture.dispose();
 return out;
}

// The Viewport, captures and GLB export use this exact material path. Source
// context is private so transient RGBA assets never leak into exported extras.
export function material(o,mode='material',context={},displayMode='normal') {
 if(!MODES.has(mode))throw new Error('Unknown observation mode: '+mode);
 if(!DISPLAYS.has(displayMode))throw new Error('Unknown display mode: '+displayMode);
 if(displayMode==='surface_wireframe'||displayMode==='outline')return whiteClayMaterial();
 if(mode==='orientation'){
  const out=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false,fog:false,transparent:false,opacity:1});
  out.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor = vec4(gl_FrontFacing ? vec3(0.0,0.2,1.0) : vec3(1.0,0.02,0.02),1.0);');};
  out.customProgramCacheKey=()=> 'modeler-camera-facing-winding-v1';return out;
 }
 if(mode==='zebra'){const out=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:0,roughness:.36,side:THREE.DoubleSide});out.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 stripeReflection=reflect(-normalize(vViewPosition),normal); float stripePhase=18.0*atan(stripeReflection.x,stripeReflection.z)+5.0*stripeReflection.y; float stripeWave=sin(stripePhase); float stripeEdge=max(fwidth(stripeWave),.03); diffuseColor.rgb=mix(vec3(.025),vec3(.95),smoothstep(-stripeEdge,stripeEdge,stripeWave));`);};out.customProgramCacheKey=()=> 'modeler-camera-relative-zebra-v1';return out;}
 if(mode==='normal')return new THREE.MeshNormalMaterial({side:THREE.DoubleSide});
 if(mode==='id'){let hash=2166136261;for(const c of String(o.editableId||o.id))hash=Math.imul(hash^c.charCodeAt(0),16777619);return new THREE.MeshBasicMaterial({color:(hash>>>0)&0xffffff});}
 if(mode==='clay'||mode==='wire')return new THREE.MeshStandardMaterial({color:'#a6b6c6',metalness:0,roughness:.62,wireframe:mode==='wire'});
 const m=renderMaterialSpec(context.doc||{},o.material||{},context),pool=context.materialPool,key=pool?mode+':'+JSON.stringify(m):null;if(pool?.has(key))return pool.get(key);const textures=materialTextures(m,context.appearanceAssets||{}),save=value=>{if(pool)pool.set(key,value);return value;};
 if(mode==='final_normal')return save(finalNormalMaterial(m,textures));if(['roughness','metalness','albedo'].includes(mode))try{return save(derivedMaterial(m,textures,mode));}catch(error){for(const texture of new Set(Object.values(textures)))if(texture?.isTexture)texture.dispose();throw error;}
 const opacity=m.opacity??(Array.isArray(m.color)?m.color[3]:undefined)??1;
 const props={...textures,color:materialColor(m.color??'#a5b6cc'),metalness:m.metalness??.1,roughness:m.roughness??.5,opacity,transparent:m.transparent??opacity<1,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide,emissive:materialColor(m.emissive??'#000000'),emissiveIntensity:m.emissiveIntensity??0};
 if(m.normalScale!==undefined)props.normalScale=Array.isArray(m.normalScale)?new THREE.Vector2(...m.normalScale):new THREE.Vector2(m.normalScale,m.normalScale);
 const physical=m.clearcoat||m.transmission||m.ior||m.thickness||textures.clearcoatMap||textures.clearcoatRoughnessMap;
 try{return save(physical?new THREE.MeshPhysicalMaterial({...props,clearcoat:typeof m.clearcoat==='number'?m.clearcoat:m.clearcoat?1:0,clearcoatRoughness:m.clearcoatRoughness??.15,transmission:m.transmission??0,ior:m.ior??1.5,thickness:m.thickness??0,attenuationColor:materialColor(m.attenuationColor??'#ffffff'),attenuationDistance:m.attenuationDistance??Infinity}):new THREE.MeshStandardMaterial(props));}catch(error){for(const value of Object.values(textures))if(value?.isTexture)value.dispose();throw error;}
}
function objectMaterials(object,mode,context,displayMode='normal'){
 if(displayMode!=='normal'||!['material','roughness','metalness','albedo','final_normal'].includes(mode)||!object.materialSlots?.length)return material(object,mode,context,displayMode);
 if(object.materialSlots.length===1)return material({...object,material:object.materialSlots[0]||object.material},mode,context,displayMode);
 const materials=[];try{for(const slot of object.materialSlots)materials.push(material({...object,material:slot||object.material},mode,context,displayMode));return materials;}catch(error){disposeMaterials(materials);throw error;}
}
export function configureStudioRenderer(renderer) {
 if(renderer.debug)renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{throw new Error("WebGL shader failure: "+[gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].join(" | ").slice(0,2400));};
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
}

// Borrowed renderer/environment settings stay unchanged until capture. The scene
// and root are always private; UI-only helpers belong to the Viewport.
export function createStudioRenderer({canvas,width=1,height=1,pixelRatio=1,renderer:borrowedRenderer,environment:borrowedEnvironment}={}) {
 const ownsRenderer=!borrowedRenderer;
 const renderer=borrowedRenderer||new THREE.WebGLRenderer({...(canvas?{canvas}:{}),antialias:true,preserveDrawingBuffer:true});
 const scene=new THREE.Scene(),root=new THREE.Group();scene.background=new THREE.Color(STUDIO_CONFIG.background);scene.add(root);
 let environment=borrowedEnvironment,ownedEnvironment=null;
 try{
  if(ownsRenderer){configureStudioRenderer(renderer);renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height,false);}
  if(!environment){ownedEnvironment=createStudioEnvironment(renderer);environment=ownedEnvironment;}
  scene.environment=environment?.texture||environment;
  const hemisphere=new THREE.HemisphereLight(STUDIO_CONFIG.hemisphereSky,STUDIO_CONFIG.hemisphereGround,STUDIO_CONFIG.hemisphereIntensity);hemisphere.name='modeler-hemisphere';hemisphere.userData.observationRole='hemisphere';scene.add(hemisphere);scene.userData.modelerHemisphere=hemisphere;
  for(const role of ['key','fill','rim']){const spec=OBSERVATION_LIGHTING_DEFAULTS[role],light=new THREE.DirectionalLight(spec.color,spec.intensity);light.name='modeler-'+role;light.userData.observationRole=role;light.position.fromArray(spec.position);light.shadow.mapSize.set(OBSERVATION_LIGHTING_DEFAULTS.shadows.mapSize,OBSERVATION_LIGHTING_DEFAULTS.shadows.mapSize);scene.add(light);scene.userData['modeler'+role[0].toUpperCase()+role.slice(1)]=light;}
  }catch(error){ownedEnvironment?.dispose?.();if(ownsRenderer){renderer.dispose();renderer.forceContextLoss();}throw error;}
 let disposed=false;
 const studio={renderer,scene,root,environment,environmentHandle:ownedEnvironment||borrowedEnvironment,environmentSource:environment?.source||'borrowed',ownsRenderer,lights:{hemisphere:scene.userData.modelerHemisphere,key:scene.userData.modelerKey,fill:scene.userData.modelerFill,rim:scene.userData.modelerRim},defaultLights:[scene.userData.modelerHemisphere,scene.userData.modelerKey,scene.userData.modelerFill,scene.userData.modelerRim],dispose(){if(disposed)return;disposed=true;disposeObservationOutline(studio);disposeObservationStage(studio);disposeRenderStage(studio);disposeMeshes([...root.children]);root.clear();scene.environment=null;scene.clear();ownedEnvironment?.dispose?.();if(ownsRenderer){renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();}}};return studio;
}
export {applyRenderStage};
// The Viewport and CaptureRenderer must resolve omitted stage fields with the
// same studio defaults. This wrapper is their single shared entry point.
export function applyStudioStage(studio,stage){studio.observation?.restore();return {...applyRenderStage(studio,stage,STUDIO_CONFIG),authoredFields:stage?Object.keys(stage):[]};}
export function disposeMeshes(meshes) {
 const materials=new Set();
 for(const mesh of meshes){
  mesh.removeFromParent();
  const children=[];mesh.traverse(object=>{if(object!==mesh)children.push(object);});
  for(const child of children){child.removeFromParent();child.geometry?.dispose();for(const m of Array.isArray(child.material)?child.material:[child.material])materials.add(m);}
  mesh.geometry?.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m);materialContexts.delete(mesh);
 }
 disposeMaterials([...materials]);
}
function visibleSource(object) {
 const result={...object,visible:object.visible!==false&&object.hidden!==true};if(Array.isArray(object.parts))result.parts=object.parts.map(visibleSource);return result;
}
function sourceObjects(doc){const sources=new Map();const walk=objects=>{for(const object of objects){sources.set(String(object.id??object.semanticId),object);if(object.parts)walk(object.parts);}};walk(doc.objects);return sources;}
function nativeIdentity(source){
 const p=source?.recipe?.type==='nativeMesh'?source.recipe.params:null;
 if(!p)return source?.nativeIdentity;
 const identity={...(source.nativeIdentity||{}),sourceHash:p.sourceHash,topologyStamp:p.topologyStamp};
 for(const key of ['vertexIds','vertexSourceIds','vertexInstanceIndices','triangleFaceIds','triangleSourceFaceIds','triangleInstanceIndices'])if(p.mesh?.[key])identity[key]=p.mesh[key].slice();
 return identity;
}

// evaluateDoc supplies world-space corner normals, UVs and face slots, including
// reflections and modifiers. Neither display nor export reapply source TRS.
function needsTangents(materials){return (Array.isArray(materials)?materials:[materials]).some(m=>!!m?.normalMap);}
function computeSnapshotTangents(geometry,materials){
 const position=geometry.getAttribute('position'),base=geometry.getAttribute('uv'),detail=geometry.getAttribute('uv1'),count=position.count;
 const slots=Array.isArray(materials)?materials:[materials],groups=geometry.groups.length?geometry.groups:[{start:0,count,materialIndex:0}],channels=new Uint8Array(count);
 let required=false;
 for(const group of groups){
  const material=slots[group.materialIndex],normalMap=material?.normalMap,channel=normalMap?.channel??0;
  if(channel!==0&&channel!==1)throw new Error('Normal map texCoord must be 0 or 1');
  if(normalMap&&channel===1&&!detail)throw new Error('normalMap texCoord 1 requires geometryData.detailUvs');
  if(normalMap&&channel===0&&!base)throw new Error('normalMap texCoord 0 requires geometryData.uvs');
  if(channel===0&&!base)continue;
  required=true;channels.fill(channel,group.start,group.start+group.count);
 }
 if(!required)return;
 const selectedUvs=new Float32Array(count*2);
 for(let i=0;i<count;i++){const uv=channels[i]===1?detail:base;if(!uv)continue;selectedUvs[i*2]=uv.getX(i);selectedUvs[i*2+1]=uv.getY(i);}
 const savedIndex=geometry.index,index=new Uint32Array(count);for(let i=0;i<count;i++)index[i]=i;
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(selectedUvs,2));geometry.setIndex(new THREE.BufferAttribute(index,1));
 try{geometry.computeTangents();}finally{geometry.setIndex(savedIndex);if(base)geometry.setAttribute('uv',base);else geometry.deleteAttribute('uv');}
 const tangents=geometry.getAttribute('tangent'),normals=geometry.getAttribute('normal'),n=new THREE.Vector3(),t=new THREE.Vector3();
 for(let i=0;i<count;i++)if(t.fromBufferAttribute(tangents,i).lengthSq()<1e-12){
  n.fromBufferAttribute(normals,i).normalize();if(n.lengthSq()<1e-12)n.set(0,0,1);
  t.set(Math.abs(n.x)<.9?1:0,Math.abs(n.x)<.9?0:1,0).cross(n).normalize();tangents.setXYZW(i,t.x,t.y,t.z,1);
 }
}
export function createSnapshotMeshes(snapshot,mode='material',{visibleOnly=false,isolate=null,context:contextIds=[],displayMode='normal'}={}) {
 if(!snapshot?.doc||!Array.isArray(snapshot.doc.objects))throw new Error('Capture requires an immutable model snapshot');
 if(!MODES.has(mode))throw new Error('Unknown observation mode: '+mode);
 if(!DISPLAYS.has(displayMode))throw new Error('Unknown display mode: '+displayMode);
 if(snapshot.kernelVersion!==undefined&&snapshot.kernelVersion!==KERNEL_VERSION)throw new Error('Snapshot geometry kernel version does not match renderer');
 const evaluated=evaluateDoc({...snapshot.doc,objects:snapshot.doc.objects.map(visibleSource)}),sources=sourceObjects(snapshot.doc),meshes=[],materialPool=new Map(),contexts=[];
 try{
  for(const object of evaluated.objects){if(visibleOnly&&(object.visible===false||object.hidden===true))continue;if(isolate&&!matchesPart(object,isolate)&&!contextIds.some(id=>matchesPart(object,id)))continue;const geometry=new THREE.BufferGeometry();let mesh,materials;
   const source=sources.get(object.editableId)||object,p=source.recipe?.params,context={materialPool,doc:snapshot.doc,appearanceAssets:snapshot.appearanceAssets||{},objectId:source.id??object.editableId,sourceHash:p?.sourceHash,topologyStamp:p?.topologyStamp};
   try{
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(object.geometryData.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(object.geometryData.normals,3));
    if(object.geometryData.uvs?.length===object.geometryData.positions.length/3*2)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(object.geometryData.uvs,2));
    if(object.geometryData.detailUvs!==undefined){if(object.geometryData.detailUvs.length!==object.geometryData.positions.length/3*2||!object.geometryData.detailUvs.every(Number.isFinite))throw new Error('Invalid geometryData.detailUvs');geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(object.geometryData.detailUvs,2));}
    materials=objectMaterials(object,mode,context,displayMode);
    if(Array.isArray(object.materialSlots)&&object.materialSlots.length>1){
     const indices=object.geometryData.materialIndices,triangles=object.geometryData.positions.length/9;
     if(!indices||indices.length!==triangles||indices.some(index=>!Number.isInteger(index)||index<0||index>=object.materialSlots.length))throw new Error('Invalid triangle material indices for '+object.editableId);
     let start=0,last=indices[0];for(let i=1;i<=indices.length;i++)if(i===indices.length||indices[i]!==last){geometry.addGroup(start*3,(i-start)*3,last);start=i;last=indices[i];}
    }
    if(needsTangents(materials))computeSnapshotTangents(geometry,materials);
    mesh=new THREE.Mesh(geometry,materials);mesh.castShadow=true;mesh.receiveShadow=true;
   }catch(error){geometry.dispose();if(materials)disposeMaterials(materials);throw error;}
   mesh.name=object.name||object.id;mesh.userData={part:object,observationMode:mode,observationDisplayMode:displayMode,semanticId:object.semanticId,editableId:object.editableId,sourceId:object.sourceId,parentIds:object.parentIds};
   const identity=nativeIdentity(source);if(identity)mesh.userData.nativeIdentity=identity;
   contexts.push(context);materialContexts.set(mesh,context);mesh.visible=object.visible!==false&&object.hidden!==true;meshes.push(mesh);
  }
  for(const context of contexts)delete context.materialPool;return {evaluated,meshes};
 }catch(error){disposeMeshes(meshes);throw error;}
}
export function normalizeObservation(options={}) {
 const observationSelection=resolveCaptureSelection(options),{mode,displayMode}=observationSelection;
 let {isolate=null,context=[],section=null,lighting}=options;
 if(!MODES.has(mode))throw new Error('Unknown observation mode: '+mode);
 if(!DISPLAYS.has(displayMode))throw new Error('Unknown display mode: '+displayMode);
 if(isolate!==null&&(typeof isolate!=='string'||!isolate.trim()))throw new Error('Isolation requires a nonempty part id');
 if(section!==null){if(!section||!['x','y','z'].includes(section.axis)||typeof section.value!=='number'||!Number.isFinite(section.value))throw new Error('Section requires axis x/y/z and a finite value');section={axis:section.axis,value:section.value};}
 if(!Array.isArray(context)||context.length>12||context.some(id=>typeof id!=='string'||!id))throw new Error('Context needs at most12 exact part IDs');
 const normalizedLighting=lighting?.schema==='dsh-modeler.observation-lighting'?rebaseObservationLighting(lighting,{mode,displayMode}):normalizeObservationLighting(lighting,{mode,displayMode});
 return {mode,displayMode,isolate,context:[...new Set(context)].sort(),section,lighting:normalizedLighting,observationSelection};
}
export function matchesPart(object,id) {return object.editableId===id||object.id===id||(object.parentIds||[]).includes(id);}
export function setObservation(renderer,meshes,options={}) {
 const observation=normalizeObservation(options),{mode,displayMode,isolate,context,section}=observation;const retired=new Set();
 for(const id of context)if(!meshes.some(mesh=>{const o=mesh.userData.part;return o.visible!==false&&o.hidden!==true&&matchesPart(o,id);}))throw new Error('Context has no visible part: '+id);
 renderer.clippingPlanes=section?[new THREE.Plane(new THREE.Vector3(section.axis==='x'?1:0,section.axis==='y'?1:0,section.axis==='z'?1:0),-section.value)]:[];
 for(const mesh of meshes){const object=mesh.userData.part;
  const nextVisible=object.visible!==false&&object.hidden!==true&&(isolate===null||matchesPart(object,isolate)||context.some(id=>matchesPart(object,id)));
  if(nextVisible&&(mesh.userData.observationMode!==mode||mesh.userData.observationDisplayMode!==displayMode)){const next=objectMaterials(object,mode,materialContexts.get(mesh),displayMode);try{if(needsTangents(next))computeSnapshotTangents(mesh.geometry,next);}catch(error){disposeMaterials(next);throw error;}for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])retired.add(m);mesh.material=next;mesh.userData.observationMode=mode;mesh.userData.observationDisplayMode=displayMode;}
  mesh.visible=object.visible!==false&&object.hidden!==true&&(isolate===null||matchesPart(object,isolate)||context.some(id=>matchesPart(object,id)));
 }
 const kept=new Set(meshes.flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]));disposeMaterials([...retired].filter(m=>!kept.has(m)));return observation;
}
export function observationBounds(meshes,{isolate=null,required=false}={}) {
 const box=new THREE.Box3();for(const mesh of meshes)if(mesh.visible&&(!isolate||matchesPart(mesh.userData.part,isolate))&&mesh.geometry.getAttribute('position')?.count>=3)box.expandByObject(mesh);
 if(box.isEmpty()){if(required)throw new Error(isolate!==null?'Isolation has no visible geometry: '+isolate:'The snapshot has no visible geometry');return null;}
 return {min:box.min.toArray(),max:box.max.toArray()};
}
export function createResolvedCamera(resolved) {
 const {projection,fov,aspect,span,near,far}=resolved;
 const camera=projection==='orthographic'?new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,near,far):new THREE.PerspectiveCamera(fov,aspect,near,far);
 camera.position.fromArray(resolved.eye);camera.up.fromArray(resolved.up);camera.lookAt(new THREE.Vector3().fromArray(resolved.target));camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;
}
export function captureDimensions({width=1000,height=700}={}) {
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<64||height<64||width>4096||height>4096||width*height>16*1024*1024)throw new Error('Capture dimensions must be integers from 64 to 4096 and at most 16 megapixels');
 return {width,height};
}
function rendererState(renderer) {
 return {size:renderer.getSize(new THREE.Vector2()),pixelRatio:renderer.getPixelRatio(),target:renderer.getRenderTarget(),cubeFace:renderer.getActiveCubeFace(),mipmapLevel:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clearColor:renderer.getClearColor(new THREE.Color()),clearAlpha:renderer.getClearAlpha(),clippingPlanes:renderer.clippingPlanes,localClippingEnabled:renderer.localClippingEnabled,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,colorSpace:renderer.outputColorSpace,autoClear:renderer.autoClear,autoClearColor:renderer.autoClearColor,autoClearDepth:renderer.autoClearDepth,autoClearStencil:renderer.autoClearStencil,xr:renderer.xr.enabled,shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type};
}
function restoreRenderer(renderer,saved) {
 renderer.setPixelRatio(saved.pixelRatio);renderer.setSize(saved.size.x,saved.size.y,false);renderer.setRenderTarget(saved.target,saved.cubeFace,saved.mipmapLevel);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.setClearColor(saved.clearColor,saved.clearAlpha);
 renderer.clippingPlanes=saved.clippingPlanes;renderer.localClippingEnabled=saved.localClippingEnabled;renderer.toneMapping=saved.toneMapping;renderer.toneMappingExposure=saved.exposure;renderer.outputColorSpace=saved.colorSpace;renderer.autoClear=saved.autoClear;renderer.autoClearColor=saved.autoClearColor;renderer.autoClearDepth=saved.autoClearDepth;renderer.autoClearStencil=saved.autoClearStencil;renderer.xr.enabled=saved.xr;renderer.shadowMap.enabled=saved.shadowEnabled;renderer.shadowMap.type=saved.shadowType;
}
function glInformation(renderer) {
 const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
 const info={maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),version:gl.getParameter(gl.VERSION),shadingLanguageVersion:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),unmaskedVendor:extension?gl.getParameter(extension.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,contextAttributes:gl.getContextAttributes(),threeRevision:THREE.REVISION};
 const name=info.unmaskedRenderer||info.renderer||'';info.rendererMode=/swiftshader|llvmpipe|softpipe|software|lavapipe/i.test(name)?'webgl-software':info.unmaskedRenderer?'webgl-hardware':'webgl-unknown';return info;
}

// One instance per immutable worker batch. Viewport captures can borrow its
// renderer/environment briefly, without keeping a second renderer resident.
// capture is synchronous (and may be awaited); data is a PNG base64 data URL.
function observedTextureReceipt(meshes){const rows=[];let total=0;for(const mesh of meshes){if(!mesh.visible)continue;for(const [slot,mat]of (Array.isArray(mesh.material)?mesh.material:[mesh.material]).entries())for(const name of ['map','roughnessMap','metalnessMap','normalMap','clearcoatMap','clearcoatRoughnessMap']){const t=mat?.[name];if(!t)continue;total++;if(rows.length<16)rows.push({id:mesh.userData.editableId,slot,map:name,width:t.image?.width??null,height:t.image?.height??null,texCoord:t.channel,colorSpace:t.colorSpace});}}return {scope:'Source DataTexture image dimensions after rendering; not a GPU mip-level readback.',total,shown:rows.length,complete:rows.length===total,textures:rows};}
export class CaptureRenderer {
 constructor(options={}){this.studio=createStudioRenderer(options);this.renderer=this.studio.renderer;this.scene=this.studio.scene;this.root=this.studio.root;this.environment=this.studio.environment;this.meshes=[];this.actualObservation=null;this.selectionOverlay=new SelectionOverlay(this.scene);this.disposed=false;}
 load(snapshot,mode='material',observation={}){
  if(this.disposed)throw new Error('Capture renderer has been disposed');const observed=normalizeObservation({...observation,mode}),next=createSnapshotMeshes(snapshot,mode,{visibleOnly:true,isolate:observed.isolate,context:observed.context,displayMode:observed.displayMode});
  disposeObservationStage(this.studio);disposeMeshes(this.meshes);this.meshes=next.meshes;this.evaluated=next.evaluated;this.snapshot={assetId:snapshot.assetId,revision:snapshot.revision,contentHash:snapshot.contentHash,kernelVersion:KERNEL_VERSION};for(const mesh of this.meshes)this.root.add(mesh);this.renderStage=snapshot.doc.meta?.renderStage;this.actualStage=applyStudioStage(this.studio,this.renderStage);return this;
 }
 setObservation(options={}){this.observation=setObservation(this.renderer,this.meshes,options);return this.observation;}
 capture(request={}){
  if(this.disposed||!this.snapshot)throw new Error('Load a snapshot before capturing');
  for(const field of ['assetId','revision','contentHash'])if(request[field]!==undefined&&request[field]!==this.snapshot[field])throw new Error('Capture snapshot '+field+' does not match request');
  const {width,height}=captureDimensions(request),observation=normalizeObservation(request);
  const saved=this.studio.ownsRenderer?null:rendererState(this.renderer),renderer=this.renderer;
  try{
   configureStudioRenderer(renderer);renderer.xr.enabled=false;renderer.setRenderTarget(null);renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);renderer.autoClear=renderer.autoClearColor=renderer.autoClearDepth=renderer.autoClearStencil=true;
   this.studio.observation?.restore();this.setObservation(observation);this.actualStage=applyStudioStage(this.studio,this.renderStage);this.selectionOverlay.set(request.overlay||null,this.snapshot);
   const visibleBounds=observationBounds(this.meshes,{required:true}),focusBounds=observationBounds(this.meshes,{isolate:observation.isolate,required:true}),bounds=(request.focusSelection&&request.overlay?this.selectionOverlay.bounds():null)||focusBounds;
   this.actualObservation=applyObservationStage(this.studio,observation.lighting,{mode:observation.mode,displayMode:observation.displayMode,bounds:visibleBounds,meshes:this.meshes,stage:this.actualStage});
   const resolved=resolveCamera(bounds,{view:request.view||'iso',camera:request.camera||{},aspect:width/height,front:this.evaluated.meta?.front||[0,0,1],projectionDefault:'perspective'}),camera=createResolvedCamera(resolved),resolvedFar=resolved.far,resolvedNear=resolved.near;
    if(renderer.getContext().isContextLost())throw new Error('Three WebGL context was lost before capture');
    const screenOutline=renderObservationFrame(this.studio,camera,this.meshes,this.actualObservation?.displayMode||observation.displayMode,this.actualObservation,visibleBounds);
    resolved.near=camera.near;
    resolved.far=camera.far;
    const cameraFar={resolved:resolvedFar,effective:camera.far};
   if(this.actualObservation)this.actualObservation.screenOutline=screenOutline;
   if(renderer.getContext().isContextLost())throw new Error('Three WebGL context was lost during capture');
   const data=renderer.domElement.toDataURL('image/png');if(!data.startsWith('data:image/png;base64,')||data.length<40)throw new Error('Three renderer did not produce a PNG image');const glInfo=glInformation(renderer);
   const observed=this.actualObservation,plan=observed.plan,displayModeDiagnostic=observation.displayMode!=='normal'&&DISPLAY_MODE_HELP[observation.displayMode]?{displayMode:observation.displayMode,description:DISPLAY_MODE_HELP[observation.displayMode],surfaceMode:plan.policy.whiteClay?'white-clay':'channel',overlay:plan.policy.overlay,floor:'none',background:'flat'}:null,observationDiagnostic=observationDiagnosticInfo(observation.mode,observation.displayMode,plan);
   const renderConfig={toneMapping:renderer.toneMapping,exposure:observed.exposure,sceneBounds:visibleBounds,cameraFar,cameraClipping:{policy:'model-and-ground-v2',resolved:{near:resolvedNear,far:resolvedFar},effective:{near:camera.near,far:camera.far}},colorSpace:renderer.outputColorSpace,baseStudio:STUDIO_CONFIG,background:observed.background,lighting:{owner:plan.lightOwner,source:plan.lights.source,effective:plan.lights,actual:observed.lights,shadows:observed.shadows},environment:observed.environment,floor:observed.floor,width,height,pixelRatio:1,antialias:glInfo.contextAttributes?.antialias??null,localClippingEnabled:renderer.localClippingEnabled,textures:observedTextureReceipt(this.meshes),glInfo,...(observationDiagnostic?{observationDiagnostic:{...observationDiagnostic,...( ['orientation','roughness','metalness','albedo','final_normal'].includes(observation.mode)?{lighting:'none',toneMapping:'none',outputEncoding:'srgb',opacity:'ignored'}:{doubleSideCertifiesOrientation:false})}}:{}),...(displayModeDiagnostic?{displayModeDiagnostic}:{}),...(this.renderStage?{declaredSceneSettings:this.actualStage}:{}),observationStage:observed,screenOutline:observed.screenOutline||null};
   return {...this.snapshot,...(request.overlay?{selectionObservation:{id:request.overlay.id,contentHash:request.overlay.contentHash,total:request.overlay.total,shown:request.overlay.shown,complete:request.overlay.complete}}:{}),requestId:request.requestId||null,view:request.view||'iso',bounds,modelFront:this.evaluated.meta?.front||[0,0,1],clientBuildId:buildId(),renderer:'three-r160',rendererMode:glInfo.rendererMode,...observation,camera:resolved,renderConfig,data};
  }finally{if(saved)restoreRenderer(renderer,saved);}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.selectionOverlay.dispose();disposeObservationStage(this.studio);disposeMeshes(this.meshes);this.meshes=[];this.actualObservation=null;this.snapshot=null;this.evaluated=null;this.studio.dispose();}
}
export function renderCapture(snapshot,request,options={}) {const capture=new CaptureRenderer(options);try{capture.load(snapshot,request?.mode||'material',request);return capture.capture(request);}finally{capture.dispose();}}
