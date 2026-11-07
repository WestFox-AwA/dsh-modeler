import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const shared=['lib/kernel.js','lib/topology.js','lib/generate.js','lib/spec-validation.js','lib/sdf.js','lib/relations.js','lib/mesh-cut.js','lib/path-system.js','lib/role-checks.js','lib/curves.js','lib/solid-boolean.js','lib/plastic.js','lib/control-surface.js','lib/form-body.js','lib/isosurface.js','lib/native-mesh.js'];
const rendering=['src/client.transport.js','src/client.studio.js','src/client.workbench.js','src/client.export.js','src/client.material.js','src/client.environment.js','src/client.floor.js','lib/material-source.js','lib/material-surface.js','lib/material-detail.js','src/client.surface.js','src/client.geometry.js','src/client.selection.js','src/client.shading.js','src/client.observation.js','lib/observation-stage.js','lib/observation-purpose.js','src/client.render.js','src/capture.worker.js','lib/camera.js'];
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sharedKernelHash(root){return sha256(shared.map(file=>file+'\n'+sha256(fs.readFileSync(path.join(root,file)))).join('\n'));}
export function renderingHash(root){return sha256(rendering.map(file=>file+'\n'+sha256(fs.readFileSync(path.join(root,file)))).join('\n'));}
export function readBuildInfo(root){
 const info=JSON.parse(fs.readFileSync(path.join(root,'client-build.json'),'utf8'));
 if(info.kernelBuildId!==sharedKernelHash(root))throw new Error('客户端与主机几何内核不一致：请先 node build.mjs 再重载插件');
 if(info.renderingHash!==renderingHash(root))throw new Error('截图/视口源码与构建回执不一致：请先 node build.mjs');
 if(info.bundleHash!==sha256(fs.readFileSync(path.join(root,'client.js'))))throw new Error('客户端产物与构建回执不一致');
 if(info.captureBundleHash!==sha256(fs.readFileSync(path.join(root,'capture.js'))))throw new Error('截图渲染产物与构建回执不一致');
 return info;
}
