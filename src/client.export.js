import * as THREE from './vendor/three.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createSnapshotMeshes,disposeMeshes} from './client.render.js';
import {KERNEL_VERSION} from './host/kernel.js';

const MAPS=['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','clearcoatMap','clearcoatRoughnessMap'];
function canvasFor(image){
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(image.width,image.height):null;
 if(!canvas)throw new Error('GLB image export requires a browser Canvas implementation');
 canvas.width=image.width;canvas.height=image.height;
 const context=canvas.getContext('2d');if(!context)throw new Error('GLB image export requires a Canvas 2D context');
 const pixels=context.createImageData(image.width,image.height);pixels.data.set(image.data);context.putImageData(pixels,0,0);return canvas;
}
function sameSampling(a,b){return a.channel===b.channel&&a.wrapS===b.wrapS&&a.wrapT===b.wrapT&&a.flipY===b.flipY&&a.repeat.equals(b.repeat)&&a.offset.equals(b.offset)&&a.center.equals(b.center)&&a.rotation===b.rotation;}

/** Export only visible snapshot geometry. The factory is also the display and
 * capture path; source transforms have already been evaluated into world-space
 * vertex and corner-normal buffers. No studio, WebGL context or environment is
 * constructed here. The returned ArrayBuffer remains owned by the caller. */
export async function exportSnapshotGlb(snapshot){
 const {meshes}=createSnapshotMeshes(snapshot,'material',{visibleOnly:true}),group=new THREE.Group(),canvases=[],temporaryTextures=new Set();
 group.name=snapshot.doc.title||'Model';
 group.userData={assetId:snapshot.assetId,revision:snapshot.revision,contentHash:snapshot.contentHash,kernelVersion:KERNEL_VERSION};
 const exporter=new GLTFExporter();
 // r160 creates one temporary metallic/roughness texture while packing G/B.
 // Track that writer-owned resource as well as our material-owned textures.
 exporter.register(writer=>{const build=writer.buildMetalRoughTexture.bind(writer);writer.buildMetalRoughTexture=(metalness,roughness)=>{const packed=build(metalness,roughness);if(packed!==metalness&&packed!==roughness)temporaryTextures.add(packed);return packed;};return {name:'MODELER_owned_texture_cleanup',writeMaterial(material,definition){const mr=definition.pbrMetallicRoughness?.metallicRoughnessTexture;if(mr){mr.texCoord=(material.metalnessMap||material.roughnessMap).channel;delete mr.channel;}const volume=definition.extensions?.KHR_materials_volume;if(volume&&volume.attenuationDistance!==undefined&&!Number.isFinite(volume.attenuationDistance)){if(material.attenuationDistance!==Infinity)throw new Error('GLB attenuationDistance must be a finite positive number or default infinity');delete volume.attenuationDistance;}}};});
 try{
  for(const mesh of meshes){
   const {semanticId,editableId,sourceId,parentIds,nativeIdentity}=mesh.userData;
   mesh.userData={semanticId,editableId,sourceId,parentIds,...(nativeIdentity?{nativeIdentity}:{} )};
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    if(material.isShaderMaterial||material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)throw new Error('GLB export does not support custom shader materials');
    if(material.normalMap&&material.normalScale.x!==material.normalScale.y)throw new Error('GLB normalScale must be uniform for the standard glTF normal texture');
    if(material.roughnessMap&&material.metalnessMap&&!sameSampling(material.roughnessMap,material.metalnessMap))throw new Error('GLB metallic/roughness textures must use matching UV scale and sampling');
    for(const key of MAPS){const texture=material[key];if(!texture?.image?.data)continue;
     // Preserve the exact texture row order. The image descriptor adapter has
     // already converted PNG top-down rows to native UV bottom-up rows. Canvas
     // lets r160 merge metallic/roughness with drawImage; flipY=false ensures
     // GLTFLoader uses precisely these bytes with unchanged UV coordinates.
     const canvas=canvasFor(texture.image);canvases.push(canvas);texture.source=new THREE.Source(canvas);
    }
   }
   group.add(mesh);
  }
  return await exporter.parseAsync(group,{binary:true,onlyVisible:true,maxTextureSize:2048});
 }finally{
  disposeMeshes(meshes);group.clear();for(const texture of temporaryTextures)texture.dispose();
  for(const canvas of canvases){canvas.width=0;canvas.height=0;}
 }
}
