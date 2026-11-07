import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const shared=['src/host/kernel.js','src/host/topology.js','src/host/generate.js','src/host/spec-validation.js','src/host/sdf.js','src/host/relations.js','src/host/mesh-cut.js','src/host/path-system.js','src/host/role-checks.js','src/host/curves.js','src/host/solid-boolean.js','src/host/plastic.js','src/host/control-surface.js','src/host/form-body.js','src/host/isosurface.js','src/host/native-mesh.js'];
const rendering=['src/client.transport.js','src/client.studio.js','src/client.workbench.js','src/client.export.js','src/client.material.js','src/client.environment.js','src/client.floor.js','src/host/material-source.js','src/host/material-surface.js','src/host/material-detail.js','src/client.surface.js','src/client.geometry.js','src/client.selection.js','src/client.shading.js','src/client.observation.js','src/host/observation-stage.js','src/host/observation-purpose.js','src/client.render.js','src/capture.worker.js','src/host/camera.js'];
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sharedKernelHash(root){return sha256(shared.map(file=>file+'\n'+sha256(fs.readFileSync(path.join(root,file)))).join('\n'));}
export function renderingHash(root){return sha256(rendering.map(file=>file+'\n'+sha256(fs.readFileSync(path.join(root,file)))).join('\n'));}
export function readBuildInfo(root){
 const info=JSON.parse(fs.readFileSync(path.join(root,'dist/client-build.json'),'utf8'));
 if(info.kernelBuildId!==sharedKernelHash(root))throw new Error('客户端与主机几何内核不一致：请先 node build.mjs 再重载插件');
 if(info.renderingHash!==renderingHash(root))throw new Error('截图/视口源码与构建回执不一致：请先 node build.mjs');
 if(info.bundleHash!==sha256(fs.readFileSync(path.join(root,'dist','client.js'))))throw new Error('客户端产物与构建回执不一致');
 if(info.captureBundleHash!==sha256(fs.readFileSync(path.join(root,'dist','capture.js'))))throw new Error('截图渲染产物与构建回执不一致');
 return info;
}
